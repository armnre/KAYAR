import { zite } from 'zitejs/db';
import { syncShow } from './podcasts';
import { RELIGIOUS } from './music/classify';

/**
 * Podcast discovery for Morshed: public RSS feeds found via the fyyd directory (Apple directory as fallback).
 * Music import lives in ./music (source adapters + review queue).
 */
export { STYLES, STYLE_TITLES, RELIGIOUS, UNSUITABLE, type Genre } from './music/classify';

async function getJson<T>(url: string): Promise<T | null> {
  for (let a = 0; a < 3; a++) {
    try { const r = await fetch(url, { headers: { 'user-agent': 'KAYAR-Morshed/4.0', accept: 'application/json' } }); if (r.ok) return (await r.json()) as T; if (r.status !== 429 && r.status < 500) return null; } catch { /* retry */ }
    await new Promise((res) => setTimeout(res, 1200 * (a + 1)));
  }
  return null;
}

export const PODCAST_TERMS: { term: string; country: string; category: 'fitness' | 'running' | 'focus' | 'recovery' | 'nutrition' }[] = [
  { term: 'fitness', country: 'us', category: 'fitness' }, { term: 'bodybuilding', country: 'us', category: 'fitness' },
  { term: 'running', country: 'us', category: 'running' }, { term: 'nutrition', country: 'us', category: 'nutrition' },
  { term: 'meditation', country: 'us', category: 'recovery' }, { term: 'motivation', country: 'us', category: 'focus' },
  { term: 'ورزش', country: 'ir', category: 'fitness' }, { term: 'سلامت', country: 'ir', category: 'nutrition' },
  { term: 'تغذیه', country: 'ir', category: 'nutrition' }, { term: 'انگیزشی', country: 'ir', category: 'focus' },
  { term: 'مدیتیشن', country: 'ir', category: 'recovery' }, { term: 'روانشناسی', country: 'ir', category: 'focus' },
  { term: 'پادکست فارسی', country: 'ir', category: 'focus' }, { term: 'رادیو', country: 'ir', category: 'focus' },
  { term: 'بدنسازی', country: 'ir', category: 'fitness' }, { term: 'تناسب اندام', country: 'ir', category: 'fitness' },
  { term: 'رژیم غذایی', country: 'ir', category: 'nutrition' }, { term: 'خواب', country: 'ir', category: 'recovery' },
  { term: 'موفقیت', country: 'ir', category: 'focus' }, { term: 'خودشناسی', country: 'ir', category: 'focus' },
  { term: 'کتاب صوتی انگیزشی', country: 'ir', category: 'focus' }, { term: 'دویدن', country: 'ir', category: 'running' },
  { term: 'strength training', country: 'us', category: 'fitness' }, { term: 'marathon training', country: 'us', category: 'running' },
  { term: 'sports science', country: 'us', category: 'fitness' }, { term: 'sleep science', country: 'us', category: 'recovery' },
  { term: 'healthy habits', country: 'us', category: 'nutrition' }, { term: 'mental toughness', country: 'us', category: 'focus' },
  { term: 'yoga', country: 'us', category: 'recovery' }, { term: 'triathlon', country: 'us', category: 'running' },
];

/** Rejects Arabic-only, German, explicit and kids' shows that the directories return for Persian/English terms. */
export function acceptableShow(title: string, lang: 'fa' | 'en') {
  if (/سکس|\+18|explicit|kids|کودک|children|bedtime/i.test(title) || RELIGIOUS.test(title)) return false;
  if (lang === 'fa') return /[پچژگکی]/.test(title) && !/[ةىأإؤ]/.test(title);
  return !/[\u0600-\u06FF]/.test(title) && !/\b(der|die|das|und|deine?|mit|für|laufen)\b/i.test(title);
}

/** Finds public podcast RSS feeds via the Apple directory and adds + syncs new ones. */
export async function importPodcasts(terms = PODCAST_TERMS, perTerm = 6) {
  const { rows } = await zite.sql({ query: `SELECT "feedUrl" FROM "PodcastShows"` });
  const known = new Set(rows.map((r) => String(r.feedUrl)));
  let added = 0; const failed: string[] = [];
  for (const t of terms) {
    const f = await getJson<{ data?: { xmlURL?: string; title?: string; imgURL?: string; author?: string }[] }>(
      `https://api.fyyd.de/0.2/search/podcast?term=${encodeURIComponent(t.term)}&count=${perTerm * 2}`);
    type Hit = { feedUrl?: string; collectionName?: string; artworkUrl600?: string; artistName?: string };
    let results: Hit[] = (f?.data ?? []).map((d) => ({ feedUrl: d.xmlURL, collectionName: d.title, artworkUrl600: d.imgURL, artistName: d.author }));
    if (!results.length) {
      const r = await getJson<{ results: { feedUrl?: string; collectionName?: string; artworkUrl600?: string; artistName?: string }[] }>(
        `https://itunes.apple.com/search?media=podcast&limit=${perTerm}&country=${t.country}&term=${encodeURIComponent(t.term)}`);
      results = r?.results ?? [];
    }
    let n = 0;
    for (const p of results) {
      if (n >= perTerm) break;
      if (!p.feedUrl || known.has(p.feedUrl) || !acceptableShow(p.collectionName ?? '', t.country === 'ir' ? 'fa' : 'en')) continue;
      known.add(p.feedUrl);
      const show = await zite.podcastShows.create({ record: { title: p.collectionName ?? 'پادکست', feedUrl: p.feedUrl, artwork: p.artworkUrl600 ?? null, author: p.artistName ?? '', category: t.category, language: t.country === 'ir' ? 'fa' : 'en' } as never });
      const res = await syncShow(show.id);
      if (res.error || res.added === 0) { failed.push(p.collectionName ?? p.feedUrl); await zite.podcastShows.delete({ id: show.id }); } else { added++; n++; }
    }
    await new Promise((ok) => setTimeout(ok, 500)); // be polite to the directory API
  }
  return { added, failed };
}
