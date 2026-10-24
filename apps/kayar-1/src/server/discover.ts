import { zite } from 'zitejs/db';
import { syncShow } from './podcasts';

/**
 * Content discovery engine for Morshed.
 * Music: Internet Archive, restricted to Creative Commons / public-domain licensed audio
 * (the app streams these publicly, so only redistributable tracks are imported).
 * Podcasts: public RSS feeds found via the fyyd directory (Apple directory as fallback).
 */

export type Genre = 'workout' | 'running' | 'walking' | 'focus' | 'recovery';
export const MUSIC_QUERIES: { q: string; genre: Genre; tag: string }[] = [
  { q: 'workout OR gym OR training', genre: 'workout', tag: 'en' },
  { q: 'electronic OR edm OR dance', genre: 'workout', tag: 'en' },
  { q: 'hip hop OR rap OR trap', genre: 'workout', tag: 'en' },
  { q: 'rock OR metal', genre: 'workout', tag: 'en' },
  { q: 'running OR cardio OR upbeat', genre: 'running', tag: 'en' },
  { q: 'house OR techno OR drum and bass', genre: 'running', tag: 'en' },
  { q: 'pop OR indie OR funk', genre: 'walking', tag: 'en' },
  { q: 'lofi OR chillhop OR beats', genre: 'focus', tag: 'instrumental' },
  { q: 'instrumental OR piano OR cinematic', genre: 'focus', tag: 'instrumental' },
  { q: 'ambient OR meditation OR relaxing', genre: 'recovery', tag: 'instrumental' },
  { q: 'yoga OR stretching OR sleep', genre: 'recovery', tag: 'instrumental' },
  { q: 'persian OR iranian OR farsi', genre: 'walking', tag: 'fa' },
  { q: 'santur OR setar OR "persian traditional" OR ney', genre: 'recovery', tag: 'fa' },
  { q: 'persian pop OR iranian pop', genre: 'running', tag: 'fa' },
];

const LICENSE = '(licenseurl:*creativecommons.org* OR licenseurl:*publicdomain*)';
type IaDoc = { identifier: string; title?: string | string[]; creator?: string | string[]; licenseurl?: string | string[] };
const one = (v: unknown) => String(Array.isArray(v) ? v[0] ?? '' : v ?? '');

async function iaJson<T>(url: string): Promise<T | null> {
  try { const r = await fetch(url, { headers: { 'user-agent': 'KAYAR-Morshed/1.0' } }); return r.ok ? ((await r.json()) as T) : null; } catch { return null; }
}

/** Finds licensed tracks for one query; returns rows ready for Tracks.bulkCreate. */
export async function discoverMusic(query: { q: string; genre: Genre; tag: string }, rows = 25) {
  const q = `(${query.q}) AND mediatype:audio AND ${LICENSE} AND -subject:(audiobook OR librivox OR sermon OR podcast OR lecture OR radio)`;
  const s = await iaJson<{ response: { docs: IaDoc[] } }>(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=licenseurl&rows=${rows}&sort[]=downloads+desc&output=json`);
  const docs = (s?.response.docs ?? []).map((d) => ({ identifier: d.identifier, title: one(d.title), creator: one(d.creator), licenseurl: one(d.licenseurl) }));
  const out: Record<string, unknown>[] = [];
  await Promise.all(docs.map(async (d) => {
    const m = await iaJson<{ files?: { name: string; format?: string; length?: string; title?: string }[] }>(`https://archive.org/metadata/${d.identifier}`);
    const files = (m?.files ?? []).filter((f) => /\.mp3$/i.test(f.name)).map((f) => ({ ...f, sec: Number(f.length) || (f.length?.includes(':') ? f.length.split(':').reduce((a, x) => a * 60 + Number(x), 0) : 0) }))
      .filter((f) => f.sec >= 90 && f.sec <= 720).slice(0, 3);
    const artist = d.creator;
    for (const f of files) {
      const title = (one(f.title) || f.name.replace(/\.mp3$/i, '').replace(/^\d+[\s._-]*/, '').replace(/[_]+/g, ' ')).slice(0, 140);
      if (/chapter|episode|lecture|sermon|interview|podcast/i.test(title)) continue;
      out.push({
        title, artist: artist.slice(0, 120) || (d.title ?? '').slice(0, 120), album: (d.title ?? '').slice(0, 140),
        artwork: `https://archive.org/services/img/${d.identifier}`, coverUrl: `https://archive.org/services/img/${d.identifier}`,
        audioUrl: `https://archive.org/download/${d.identifier}/${encodeURIComponent(f.name).replace(/%2F/g, '/')}`,
        durationSec: Math.round(f.sec), durationSeconds: Math.round(f.sec), genre: query.genre, categories: query.genre, tags: query.tag,
        license: 'Creative Commons', licenseUrl: d.licenseurl ?? '', rights: `${artist || 'Unknown'} — CC (Internet Archive)`,
        source: 'external', sourceId: `ia:${d.identifier}/${f.name}`, sourceUrl: `https://archive.org/details/${d.identifier}`,
        status: 'published', published: true, downloadable: false,
      });
    }
  }));
  return out;
}

/** Runs music discovery and inserts only new tracks (dedupe by sourceId + audioUrl). */
export async function importMusic(queries = MUSIC_QUERIES, perQuery = 20) {
  const { rows } = await zite.sql({ query: `SELECT "sourceId","audioUrl" FROM "Tracks"` });
  const seen = new Set(rows.flatMap((r) => [String(r.sourceId ?? ''), String(r.audioUrl ?? '')]));
  const fresh: Record<string, unknown>[] = [];
  for (const q of queries) {
    for (const t of await discoverMusic(q, perQuery)) {
      if (seen.has(String(t.sourceId)) || seen.has(String(t.audioUrl))) continue;
      seen.add(String(t.sourceId)); seen.add(String(t.audioUrl)); fresh.push(t);
    }
  }
  for (let i = 0; i < fresh.length; i += 100) await zite.tracks.bulkCreate({ records: fresh.slice(i, i + 100) as never });
  return { added: fresh.length };
}

export const PODCAST_TERMS: { term: string; country: string; category: 'fitness' | 'running' | 'focus' | 'recovery' | 'nutrition' }[] = [
  { term: 'fitness', country: 'us', category: 'fitness' }, { term: 'bodybuilding', country: 'us', category: 'fitness' },
  { term: 'running', country: 'us', category: 'running' }, { term: 'nutrition', country: 'us', category: 'nutrition' },
  { term: 'meditation', country: 'us', category: 'recovery' }, { term: 'motivation', country: 'us', category: 'focus' },
  { term: 'ورزش', country: 'ir', category: 'fitness' }, { term: 'سلامت', country: 'ir', category: 'nutrition' },
  { term: 'تغذیه', country: 'ir', category: 'nutrition' }, { term: 'انگیزشی', country: 'ir', category: 'focus' },
  { term: 'مدیتیشن', country: 'ir', category: 'recovery' }, { term: 'روانشناسی', country: 'ir', category: 'focus' },
  { term: 'پادکست فارسی', country: 'ir', category: 'focus' }, { term: 'رادیو', country: 'ir', category: 'focus' },
];

/** Finds public podcast RSS feeds via the Apple directory and adds + syncs new ones. */
export async function importPodcasts(terms = PODCAST_TERMS, perTerm = 6) {
  const { rows } = await zite.sql({ query: `SELECT "feedUrl" FROM "PodcastShows"` });
  const known = new Set(rows.map((r) => String(r.feedUrl)));
  let added = 0; const failed: string[] = [];
  for (const t of terms) {
    const f = await iaJson<{ data?: { xmlURL?: string; title?: string; imgURL?: string; author?: string }[] }>(
      `https://api.fyyd.de/0.2/search/podcast?term=${encodeURIComponent(t.term)}&count=${perTerm * 2}`);
    type Hit = { feedUrl?: string; collectionName?: string; artworkUrl600?: string; artistName?: string };
    let results: Hit[] = (f?.data ?? []).map((d) => ({ feedUrl: d.xmlURL, collectionName: d.title, artworkUrl600: d.imgURL, artistName: d.author }));
    if (!results.length) {
      const r = await iaJson<{ results: { feedUrl?: string; collectionName?: string; artworkUrl600?: string; artistName?: string }[] }>(
        `https://itunes.apple.com/search?media=podcast&limit=${perTerm}&country=${t.country}&term=${encodeURIComponent(t.term)}`);
      results = r?.results ?? [];
    }
    let n = 0;
    for (const p of results) {
      if (n >= perTerm) break;
      if (!p.feedUrl || known.has(p.feedUrl)) continue;
      known.add(p.feedUrl);
      const show = await zite.podcastShows.create({ record: { title: p.collectionName ?? 'پادکست', feedUrl: p.feedUrl, artwork: p.artworkUrl600 ?? null, author: p.artistName ?? '', category: t.category } as never });
      const res = await syncShow(show.id);
      if (res.error || res.added === 0) { failed.push(p.collectionName ?? p.feedUrl); await zite.podcastShows.delete({ id: show.id }); } else { added++; n++; }
    }
    await new Promise((ok) => setTimeout(ok, 500)); // be polite to the directory API
  }
  return { added, failed };
}
