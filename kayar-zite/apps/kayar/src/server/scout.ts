/**
 * Morshed Scout — targeted, on-demand discovery for admins.
 * Podcasts: multi-directory search (fyyd + Apple IR/US) → URL-normalized merge → live feed health scoring.
 * Music: open-licence search (Openverse) → quality gate + dedupe against the library + blocklist → optional live probe.
 * Nothing is published automatically: music lands in the review queue as "pending".
 */
import { zite } from 'zitejs/db';
import { safeFetchText, assertPublicUrl } from './guard';
import { parseFeed } from './rss';
import { syncShow } from './podcasts';
import { acceptableShow } from './discover';
import { openverse, ccmixterSearch, archiveSearch } from './music/openSources';
import { dedupeKey, normFa, rejectReason, isPersian, STYLES } from './music/classify';
import { probeAudio } from './music/http';
import { toRecord, getBlocklist } from './music/importer';
import type { Row } from './music/adapters';

const UA = { 'user-agent': 'KAYAR-Morshed/5.0', accept: 'application/json' };
const normUrl = (u: string) => u.trim().replace(/^http:\/\//i, 'https://').replace(/\/+$/, '').toLowerCase();

async function json<T>(url: string, ms = 12_000): Promise<T | null> {
  for (let a = 0; a < 2; a++) {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
    try { const r = await fetch(url, { headers: UA, signal: c.signal }); if (r.ok) return (await r.json()) as T; if (r.status < 500 && r.status !== 429) return null; }
    catch { /* retry */ } finally { clearTimeout(t); }
    await new Promise((ok) => setTimeout(ok, 800 * (a + 1)));
  }
  return null;
}

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

/* ---------------- Podcasts ---------------- */
export type PodcastHit = {
  feedUrl: string; title: string; author: string; artwork: string | null; sources: string[];
  lang: 'fa' | 'en' | 'other'; episodes: number; lastEpisodeAt: string | null; avgMinutes: number | null;
  score: number; issues: string[]; known: boolean; ok: boolean;
};

type Raw = { feedUrl: string; title: string; author: string; artwork: string | null; source: string };

async function directories(term: string, limit: number): Promise<Raw[]> {
  const q = encodeURIComponent(term);
  const [fyyd, ir, us, gb, gp] = await Promise.all([
    json<{ data?: { xmlURL?: string; title?: string; imgURL?: string; author?: string }[] }>(`https://api.fyyd.de/0.2/search/podcast?term=${q}&count=${limit}`),
    json<{ results?: { feedUrl?: string; collectionName?: string; artworkUrl600?: string; artistName?: string }[] }>(`https://itunes.apple.com/search?media=podcast&entity=podcast&limit=${limit}&country=ir&term=${q}`),
    json<{ results?: { feedUrl?: string; collectionName?: string; artworkUrl600?: string; artistName?: string }[] }>(`https://itunes.apple.com/search?media=podcast&entity=podcast&limit=${limit}&country=us&term=${q}`),
    json<{ results?: { feedUrl?: string; collectionName?: string; artworkUrl600?: string; artistName?: string }[] }>(`https://itunes.apple.com/search?media=podcast&entity=podcast&limit=${limit}&country=gb&term=${q}`),
    json<{ url?: string; title?: string; logo_url?: string; author?: string }[]>(`https://gpodder.net/search.json?q=${q}`),
  ]);
  const out: Raw[] = [];
  for (const d of fyyd?.data ?? []) if (d.xmlURL) out.push({ feedUrl: d.xmlURL, title: d.title ?? '', author: d.author ?? '', artwork: d.imgURL ?? null, source: 'fyyd' });
  for (const g of (gp ?? []).slice(0, limit)) if (g.url) out.push({ feedUrl: g.url, title: g.title ?? '', author: g.author ?? '', artwork: g.logo_url ?? null, source: 'gpodder' });
  for (const [res, src] of [[ir, 'Apple IR'], [us, 'Apple US'], [gb, 'Apple UK']] as const)
    for (const d of res?.results ?? []) if (d.feedUrl) out.push({ feedUrl: d.feedUrl, title: d.collectionName ?? '', author: d.artistName ?? '', artwork: d.artworkUrl600 ?? null, source: src });
  return out;
}

/** Fetches + parses a feed and scores it 0–100 on freshness, depth, metadata and audio reachability. */
async function health(feedUrl: string, probe: boolean) {
  const issues: string[] = [];
  try {
    const { text } = await safeFetchText(feedUrl, { maxBytes: 15_000_000, accept: /xml|rss|atom|text\/plain|octet-stream/i });
    const f = parseFeed(text);
    const eps = f.episodes;
    const dates = eps.map((e) => (e.publishedAt ? Date.parse(e.publishedAt) : 0)).filter(Boolean).sort((a, b) => b - a);
    const last = dates[0] ?? 0;
    const ageDays = last ? (Date.now() - last) / 86_400_000 : 9999;
    const durs = eps.map((e) => e.durationSec ?? 0).filter((d) => d > 0);
    const avg = durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length / 60) : null;
    let score = 0;
    score += ageDays < 30 ? 35 : ageDays < 90 ? 28 : ageDays < 365 ? 15 : 0;
    if (ageDays >= 365) issues.push('بیش از یک سال بدون قسمت جدید');
    score += Math.min(25, eps.length);
    if (eps.length < 3) issues.push('تعداد قسمت‌ها کم است');
    if (f.artwork) score += 10; else issues.push('کاور ندارد');
    if (f.description.length > 40) score += 10; else issues.push('توضیحات ناقص');
    if (avg && avg >= 5 && avg <= 120) score += 5;
    if (probe && eps[0]) {
      const p = await probeAudio(eps[0].audioUrl);
      if (p) score += 15; else issues.push('فایل صوتی آخرین قسمت از سرور در دسترس نیست');
    } else score += 8;
    const sample = `${f.title} ${f.description}`;
    const lang: PodcastHit['lang'] = isPersian(sample) ? 'fa' : /[a-z]{4,}/i.test(sample) ? 'en' : 'other';
    return { ok: eps.length > 0, title: f.title, author: f.author, artwork: f.artwork, episodes: eps.length, lastEpisodeAt: last ? new Date(last).toISOString() : null, avgMinutes: avg, score: Math.min(100, score), issues, lang };
  } catch (e) {
    return { ok: false, title: '', author: '', artwork: null, episodes: 0, lastEpisodeAt: null, avgMinutes: null, score: 0, issues: [`فید خوانده نشد: ${((e as Error).message || '').slice(0, 80)}`], lang: 'other' as const };
  }
}

export async function searchPodcasts(term: string, opts: { lang?: 'fa' | 'en' | 'any'; probe?: boolean; max?: number; minEpisodes?: number; activeOnly?: boolean } = {}): Promise<PodcastHit[]> {
  const raw = await directories(term, 25);
  const merged = new Map<string, Raw & { sources: string[] }>();
  for (const r of raw) {
    const k = normUrl(r.feedUrl);
    const m = merged.get(k);
    if (m) { if (!m.sources.includes(r.source)) m.sources.push(r.source); if (!m.artwork && r.artwork) m.artwork = r.artwork; }
    else merged.set(k, { ...r, sources: [r.source] });
  }
  // Same show listed under different feed URLs → keep one per normalized title
  const byTitle = new Map<string, Raw & { sources: string[] }>();
  for (const v of merged.values()) { const k = normFa(v.title) || normUrl(v.feedUrl); const p = byTitle.get(k); if (!p || v.sources.length > p.sources.length) byTitle.set(k, v); }
  const cands = [...byTitle.values()]
    .filter((c) => !/سکس|\+18|explicit/i.test(c.title))
    .sort((a, b) => b.sources.length - a.sources.length)
    .slice(0, opts.max ?? 20);
  const { rows } = await zite.sql({ query: `SELECT "feedUrl" FROM "PodcastShows"` });
  const known = new Set(rows.map((r) => normUrl(String(r.feedUrl ?? ''))));
  const hits = await pool(cands, 4, async (c): Promise<PodcastHit> => {
    const h = await health(c.feedUrl, !!opts.probe);
    const title = h.title || c.title;
    const issues = [...h.issues];
    if (title && !acceptableShow(title, h.lang === 'fa' ? 'fa' : 'en')) issues.push('ممکن است برای کایار مناسب نباشد');
    return { feedUrl: c.feedUrl, title, author: h.author || c.author, artwork: h.artwork || c.artwork, sources: c.sources, lang: h.lang, episodes: h.episodes, lastEpisodeAt: h.lastEpisodeAt, avgMinutes: h.avgMinutes, score: h.score + Math.min(6, (c.sources.length - 1) * 3), issues, known: known.has(normUrl(c.feedUrl)), ok: h.ok };
  });
  return hits
    .filter((h) => !opts.lang || opts.lang === 'any' || h.lang === opts.lang)
    .filter((h) => !opts.minEpisodes || h.episodes >= opts.minEpisodes)
    .filter((h) => !opts.activeOnly || (h.lastEpisodeAt && Date.now() - Date.parse(h.lastEpisodeAt) < 180 * 86_400_000))
    .sort((a, b) => Number(b.ok) - Number(a.ok) || b.score - a.score);
}

/** Accepts an RSS URL, an Apple Podcasts link, or a website that advertises its feed. Returns the feed URL. */
export async function resolveFeed(input: string): Promise<string> {
  const u = assertPublicUrl(input.trim());
  const apple = u.host.includes('podcasts.apple.com') || u.host.includes('itunes.apple.com') ? u.pathname.match(/id(\d+)/)?.[1] : null;
  if (apple) {
    const r = await json<{ results?: { feedUrl?: string }[] }>(`https://itunes.apple.com/lookup?id=${apple}&entity=podcast`);
    const f = r?.results?.find((x) => x.feedUrl)?.feedUrl;
    if (!f) throw new Error('فید این پادکست در اپل پیدا نشد.');
    return f;
  }
  const { text, finalUrl } = await safeFetchText(u.toString(), { maxBytes: 15_000_000, accept: /xml|rss|atom|html|text\/plain|octet-stream/i });
  if (/<(rss|feed)[\s>]/i.test(text.slice(0, 3000))) return finalUrl;
  const alt = text.match(/<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*>/i)?.[0]?.match(/href=["']([^"']+)["']/i)?.[1];
  if (alt) return new URL(alt.replace(/&amp;/g, '&'), finalUrl).toString();
  throw new Error('در این آدرس فید RSS پیدا نشد.');
}

export async function addPodcast(input: string, category: string) {
  const feedUrl = await resolveFeed(input);
  const { rows } = await zite.sql({ query: `SELECT id, "feedUrl" FROM "PodcastShows"` });
  if (rows.some((r) => normUrl(String(r.feedUrl ?? '')) === normUrl(feedUrl))) return { added: false, message: 'این پادکست قبلاً اضافه شده است.' };
  const h = await health(feedUrl, false);
  if (!h.ok) return { added: false, message: h.issues[0] ?? 'فید معتبر نیست.' };
  const show = await zite.podcastShows.create({ record: { title: h.title || feedUrl, feedUrl, artwork: h.artwork, author: h.author, category, language: h.lang === 'fa' ? 'fa' : 'en' } as never });
  const s = await syncShow(show.id);
  return { added: true, message: s.error ? `اضافه شد ولی همگام‌سازی خطا داد: ${s.error}` : `«${h.title}» اضافه شد — ${s.added} قسمت.` };
}

/** Latest episodes of a feed, for previewing before adding. */
export async function previewPodcast(input: string) {
  const feedUrl = await resolveFeed(input);
  const { text } = await safeFetchText(feedUrl, { maxBytes: 15_000_000, accept: /xml|rss|atom|text\/plain|octet-stream/i });
  const f = parseFeed(text);
  return {
    feedUrl, title: f.title, description: f.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600),
    episodes: f.episodes.slice(0, 8).map((e) => ({ title: e.title.slice(0, 200), audioUrl: e.audioUrl, publishedAt: e.publishedAt, durationSec: e.durationSec })),
  };
}

export async function addPodcasts(urls: string[], category: string) {
  const res = await pool(urls.slice(0, 20), 2, async (u) => { try { return await addPodcast(u, category); } catch (e) { return { added: false, message: (e as Error).message }; } });
  const ok = res.filter((r) => r.added).length;
  return { added: ok, message: `${ok} از ${res.length} پادکست اضافه شد.${res.some((r) => !r.added) ? ' ' + res.filter((r) => !r.added).map((r) => r.message).slice(0, 3).join(' · ') : ''}` };
}

export async function syncAllShows() {
  const { records } = await zite.podcastShows.findAll({ limit: 500, fields: ['title'] });
  const res = await pool(records, 3, async (s) => ({ title: s.title ?? '', ...(await syncShow(s.id)) }));
  return { shows: res.length, newEpisodes: res.reduce((a, r) => a + r.added, 0), failed: res.filter((r) => r.error).map((r) => `${r.title}: ${r.error}`) };
}

/* ---------------- Music ---------------- */
export type MusicSource = 'openverse' | 'ccmixter' | 'archive';
export type MusicHit = { id: string; title: string; artist: string; art: string; audioUrl: string; durationSec: number; license: string; sourceName: string; sourceUrl: string; status: 'ok' | 'duplicate' | 'rejected' | 'unreachable'; reason: string; quality: number; row: Row };

/** 0–100: licence openness, bitrate, duration fit, cover art, metadata completeness. */
function quality(r: Row, minSec?: number, maxSec?: number) {
  let q = 30;
  if (/cc0|مالکیت عمومی|publicdomain/i.test(r.license)) q += 15; else if (/by-sa/i.test(r.license)) q += 8; else q += 12;
  q += r.bitrate >= 256 ? 20 : r.bitrate >= 160 ? 15 : r.bitrate >= 128 ? 10 : r.bitrate ? 2 : 6;
  if (r.dur) { const lo = minSec ?? 90, hi = maxSec ?? 420; q += r.dur >= lo && r.dur <= hi ? 20 : 5; } else q += 4;
  if (r.art) q += 8;
  if (r.artist && !/unknown|ناشناس/i.test(r.artist)) q += 4;
  if (r.title.length > 3 && !/^track\s*\d+$|^\d+$/i.test(r.title)) q += 3;
  return Math.min(100, q);
}

export async function searchMusic(query: string, opts: { limit?: number; probe?: boolean; minSec?: number; maxSec?: number; sources?: MusicSource[] } = {}): Promise<{ hits: MusicHit[]; log: string[] }> {
  const log: string[] = [];
  const terms = query.split(/[,،]/).map((s) => s.trim()).filter(Boolean).slice(0, 5);
  const src = opts.sources?.length ? opts.sources : (['openverse', 'ccmixter', 'archive'] as MusicSource[]);
  const per = Math.max(10, Math.round((opts.limit ?? 60) / src.length));
  const batches = await Promise.all(src.map(async (s) => {
    const t0 = Date.now();
    const rows = s === 'openverse' ? await openverse(terms.length ? terms : [query], per, (m) => log.push(m), query)
      : s === 'ccmixter' ? await ccmixterSearch(query, per, (m) => log.push(m))
      : await archiveSearch(query, per, (m) => log.push(m));
    log.push(`${s}: ${rows.length} نتیجه در ${((Date.now() - t0) / 1000).toFixed(1)} ثانیه`);
    return rows;
  }));
  // Cross-source dedupe: same artist+title from two sources → keep the richer one
  const uniq = new Map<string, Row>();
  for (const r of batches.flat()) { const k = dedupeKey(r.artist, r.title); const p = uniq.get(k); if (!p || quality(r) > quality(p)) uniq.set(k, r); }
  const rows = [...uniq.values()];
  const { rows: lib } = await zite.sql({ query: `SELECT "sourceId","audioUrl","dedupeKey","artist","title" FROM "Tracks"` });
  const seen = new Set(lib.flatMap((r) => [String(r.sourceId ?? ''), String(r.audioUrl ?? ''), String(r.dedupeKey || dedupeKey(String(r.artist ?? ''), String(r.title ?? '')))]).filter(Boolean));
  const block = await getBlocklist();
  const hits = await pool(rows, 8, async (r): Promise<MusicHit> => {
    const key = dedupeKey(r.artist, r.title);
    const base = { id: r.sourceId, title: r.title, artist: r.artist, art: r.art, audioUrl: r.audioUrl, durationSec: r.dur, license: r.license, sourceName: r.sourceName, sourceUrl: r.sourceUrl, quality: quality(r, opts.minSec, opts.maxSec), row: r };
    if (seen.has(r.sourceId) || seen.has(r.audioUrl) || seen.has(key)) return { ...base, status: 'duplicate', reason: 'در کتابخانه هست' };
    if (block.tracks.includes(key) || block.artists.includes(normFa(r.artist))) return { ...base, status: 'rejected', reason: 'در فهرست سیاه' };
    const why = rejectReason({ title: r.title, artist: r.artist, text: r.text, dur: r.dur || undefined, bitrate: r.bitrate, lang: r.lang });
    if (why) return { ...base, status: 'rejected', reason: why };
    if (r.dur && ((opts.minSec && r.dur < opts.minSec) || (opts.maxSec && r.dur > opts.maxSec))) return { ...base, status: 'rejected', reason: 'خارج از بازه‌ی مدت انتخاب‌شده' };
    if (opts.probe && !(await probeAudio(r.audioUrl))) return { ...base, status: 'unreachable', reason: 'فایل از سرور در دسترس نیست' };
    return { ...base, status: 'ok', reason: '' };
  });
  const order = { ok: 0, unreachable: 1, duplicate: 2, rejected: 3 } as const;
  return { hits: hits.sort((a, b) => order[a.status] - order[b.status] || b.quality - a.quality), log };
}

export async function queueMusic(rows: Row[], publish: boolean, style?: string) {
  const { rows: lib } = await zite.sql({ query: `SELECT "sourceId","dedupeKey" FROM "Tracks"` });
  const seen = new Set(lib.flatMap((r) => [String(r.sourceId ?? ''), String(r.dedupeKey ?? '')]).filter(Boolean));
  const fresh = rows.filter((r) => !seen.has(r.sourceId) && !seen.has(dedupeKey(r.artist, r.title)));
  const st = STYLES.find((x) => x.key === style);
  for (let i = 0; i < fresh.length; i += 100)
    await zite.tracks.bulkCreate({ records: fresh.slice(i, i + 100).map((r) => { const rec = toRecord(r, dedupeKey(r.artist, r.title), r.dur, publish); return st ? { ...rec, style: st.key, genre: st.genre, categories: st.genre, lang: st.lang } : rec; }) as never });
  return fresh.length;
}
