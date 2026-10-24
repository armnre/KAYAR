import { zite } from 'zitejs/db';
import { syncShow } from './podcasts';

/**
 * Content discovery engine for Morshed.
 * Music: only real songs by well-known Iranian and English-language artists, plus the
 * current Apple Music charts (trending). Uses the official iTunes catalog, which provides
 * licensed 30-second previews + album art. Religious / recitation content is always rejected.
 * Podcasts: public RSS feeds found via the fyyd directory (Apple directory as fallback).
 */

export type Genre = 'workout' | 'running' | 'walking' | 'focus' | 'recovery';
type Lang = 'fa' | 'en';
export type MusicSource = { kind: 'chart'; country: string; lang: Lang } | { kind: 'artist'; name: string; lang: Lang; style: string };

/** Curated style map: every artist is a well-known name, grouped by language and style. */
export const STYLES: { key: string; lang: Lang; title: string; artists: string[] }[] = [
  { key: 'fa-pop', lang: 'fa', title: 'پاپ فارسی', artists: ['Mohsen Yeganeh', 'Mohsen Chavoshi', 'Sirvan Khosravi', 'Xaniar Khosravi', 'Shadmehr Aghili', 'Benyamin Bahadori', 'Mehdi Ahmadvand', 'Hamed Homayoun', 'Babak Jahanbakhsh', 'Reza Bahram', 'Macan Band', 'Ehsan Khajeh Amiri', 'Hojat Ashrafzadeh', 'Ragheb', 'Reza Sadeghi', 'Ali Yasini', 'Mohsen Ebrahimzadeh', 'Hamid Askari', 'Babak Rahnama', 'Alireza Talischi', 'Farzad Farzin', 'Mehdi Yarrahi', 'Shahab Mozaffari', 'Ali Lohrasbi', 'Masoud Sadeghloo', 'Amir Abbas Golab', 'Morteza Pashaei', 'Mohammad Alizadeh', 'Majid Razavi', 'Sami Beigi', 'Hamed Zamani', 'Pouya Bayati', 'Mehrad Jam', 'Aron Afshar', 'Behnam Bani', 'Puzzle Band', 'Shervin Hajipour'] },
  { key: 'fa-rap', lang: 'fa', title: 'رپ فارسی', artists: ['Hichkas', 'Yas', 'Zedbazi', 'Sorena', 'Shayea', 'Hiphopologist', 'Reza Pishro', 'Erfan', 'Bahram Nouraei', 'Ho3ein', 'Sohrab MJ', 'Amir Khalvat', 'Fadaei', 'Gdaal', 'Putak', 'Behzad Leito', 'Tohi', 'Paya', 'Amir Tataloo', 'Mehrad Hidden', 'Sepehr Khalse', 'Ali Sorena', 'Catchybeatz', 'Saman Wilson', 'Arta', 'Koorosh', 'Pooria Putak', 'Dorcci'] },
  { key: 'fa-classic', lang: 'fa', title: 'قدیمی و نوستالژی', artists: ['Googoosh', 'Ebi', 'Dariush', 'Hayedeh', 'Mahasti', 'Viguen', 'Farhad Mehrad', 'Kourosh Yaghmaei', 'Sattar', 'Moein', 'Shahram Shabpareh', 'Siavash Ghomayshi', 'Leila Forouhar', 'Aref', 'Homeyra', 'Hassan Shamaizadeh', 'Faramarz Aslani', 'Fereydoun Foroughi', 'Marzieh', 'Delkash', 'Vigen', 'Afshin', 'Andy', 'Martik', 'Ramesh', 'Pooran', 'Nasser Abdollahi', 'Habib'] },
  { key: 'fa-traditional', lang: 'fa', title: 'سنتی و تلفیقی', artists: ['Homayoun Shajarian', 'Mohammad Reza Shajarian', 'Shahram Nazeri', 'Salar Aghili', 'Alireza Ghorbani', 'Hossein Alizadeh', 'Kayhan Kalhor', 'Mohsen Namjoo', 'Sina Sarlak', 'Hafez Nazeri', 'Rastak', 'Chaartaar', 'Kamancheh', 'Ali Zand Vakili', 'Iraj Bastami', 'Mojgan Shajarian'] },
  { key: 'fa-dance', lang: 'fa', title: 'شاد و پرانرژی', artists: ['Kamran & Hooman', 'Masih & Arash Ap', 'Sasy', 'Arash', 'Shadmehr Aghili', 'Omid Jahan', 'Shahram Solati', 'Mansour', 'Jamshid', 'Siavash Shams', 'Shahin Najafi', 'Black Cats', 'Kamran Tafti', 'Amir Tataloo', 'Navid Zardi', 'Tara Tiba', 'Hamid Hiraad', 'Mehdi Jahani'] },
  { key: 'fa-rock', lang: 'fa', title: 'راک و آلترناتیو', artists: ['Kiosk', 'O-Hum', 'Pallett', 'Bomrani', 'Hypernova', 'Kaveh Afagh', 'Mohsen Namjoo', 'Kasra Saboktakin', 'Arian Band', 'Barad', 'Abjeez', 'The Muckers', 'Pooria Ashkan'] },
  { key: 'en-pop', lang: 'en', title: 'Pop', artists: ['The Weeknd', 'Dua Lipa', 'Ed Sheeran', 'Taylor Swift', 'Billie Eilish', 'Harry Styles', 'Ariana Grande', 'Justin Bieber', 'Olivia Rodrigo', 'Sabrina Carpenter', 'Benson Boone', 'Bruno Mars', 'Lady Gaga', 'Miley Cyrus', 'Shawn Mendes', 'Selena Gomez', 'Charlie Puth', 'Sia', 'Adele', 'Maroon 5', 'OneRepublic', 'Chappell Roan', 'Tate McRae', 'Teddy Swims', 'Lewis Capaldi', 'Katy Perry'] },
  { key: 'en-hiphop', lang: 'en', title: 'Hip-Hop & Rap', artists: ['Eminem', 'Drake', 'Kendrick Lamar', 'Travis Scott', 'Post Malone', 'J. Cole', 'Kanye West', 'Future', '21 Savage', 'Jack Harlow', 'Lil Nas X', 'Doja Cat', 'Nicki Minaj', 'Tyler, The Creator', 'Metro Boomin', 'Juice WRLD', 'NF', 'Macklemore', 'Logic', 'Snoop Dogg', '50 Cent', 'Dr. Dre'] },
  { key: 'en-edm', lang: 'en', title: 'EDM & Dance', artists: ['Calvin Harris', 'David Guetta', 'Avicii', 'Kygo', 'Martin Garrix', 'Marshmello', 'Alan Walker', 'Tiësto', 'Swedish House Mafia', 'Zedd', 'The Chainsmokers', 'Alesso', 'Armin van Buuren', 'Fred again..', 'Fisher', 'Dimitri Vegas & Like Mike', 'Hardwell', 'Afrojack', 'Robin Schulz', 'Galantis'] },
  { key: 'en-rock', lang: 'en', title: 'Rock', artists: ['Imagine Dragons', 'Linkin Park', 'Coldplay', 'Arctic Monkeys', 'Foo Fighters', 'Red Hot Chili Peppers', 'Green Day', 'Muse', 'Twenty One Pilots', 'Fall Out Boy', 'Panic! At The Disco', 'The Killers', 'AC/DC', 'Metallica', 'Bon Jovi', 'Nirvana', 'Thirty Seconds To Mars', 'Måneskin', 'Bring Me The Horizon', 'Queen'] },
  { key: 'en-rnb', lang: 'en', title: 'R&B & Soul', artists: ['SZA', 'Rihanna', 'Beyoncé', 'Usher', 'Chris Brown', 'Frank Ocean', 'Daniel Caesar', 'H.E.R.', 'Khalid', 'John Legend', 'Alicia Keys', 'Giveon', 'Jhené Aiko', 'Miguel'] },
  { key: 'en-classic', lang: 'en', title: 'Classics 80s-00s', artists: ['Michael Jackson', 'Whitney Houston', 'Madonna', 'ABBA', 'a-ha', 'George Michael', 'Prince', 'Eurythmics', 'Backstreet Boys', 'Britney Spears', 'Shakira', 'Celine Dion', 'Phil Collins', 'Tina Turner', 'Elton John', 'Bee Gees', 'Modern Talking', 'Survivor'] },
];
export const STYLE_TITLES: Record<string, string> = Object.fromEntries(STYLES.map((s) => [s.key, s.title]));
export const MUSIC_QUERIES: MusicSource[] = [
  ...['us', 'gb', 'ca', 'de', 'fr', 'au'].map((country) => ({ kind: 'chart' as const, country, lang: 'en' as Lang })),
  ...STYLES.flatMap((s) => s.artists.map((name) => ({ kind: 'artist' as const, name, lang: s.lang, style: s.key }))),
];

/** Words that mark religious recitation / eulogy / non-music content — never imported. */
export const RELIGIOUS = /quran|qur'an|koran|surah|sura\b|ayat|qari|recit|tilawa|tajweed|azan|adhan|athan|dua\b|du'a|munajat|nasheed|noha|nohe|nowhe|marsiya|madah|maddah|rowze|rawza|sermon|lecture|islamic|allah|muharram|ashura|imam |hussain|hossein|karbala|zikr|dhikr|قرآن|قران|سوره|آیه|تلاوت|قاری|اذان|دعا|مناجات|نوحه|مداحی|مداح|روضه|محرم|عاشورا|امام|حسین|کربلا|ذکر|سخنرانی|موعظه/i;
export const BLOCKED = new RegExp(RELIGIOUS.source + '|audiobook|podcast|interview|karaoke|instrumental version|tribute|cover version', 'i');

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, '');
type It = { trackId: number; trackName: string; artistName: string; collectionName?: string; previewUrl?: string; artworkUrl100?: string;
  trackViewUrl?: string; primaryGenreName?: string; trackTimeMillis?: number; kind?: string; trackExplicitness?: string };

async function getJson<T>(url: string): Promise<T | null> {
  for (let a = 0; a < 3; a++) {
    try { const r = await fetch(url, { headers: { 'user-agent': 'KAYAR-Morshed/2.0' } }); if (r.ok) return (await r.json()) as T; if (r.status !== 429 && r.status < 500) return null; } catch { /* retry */ }
    await new Promise((res) => setTimeout(res, 1500 * (a + 1)));
  }
  return null;
}

function styleOf(g = '') { return /hip|rap/i.test(g) ? 'en-hiphop' : /dance|electronic|house/i.test(g) ? 'en-edm' : /rock|metal|alternative/i.test(g) ? 'en-rock' : /r&b|soul/i.test(g) ? 'en-rnb' : 'en-pop'; }

function genreOf(g = '', lang: Lang): Genre {
  if (/dance|electronic|hip|rap|rock|metal|house|edm/i.test(g)) return 'workout';
  if (/pop|r&b|latin|reggae/i.test(g)) return lang === 'fa' ? 'running' : 'running';
  if (/classical|traditional|ambient|new age|soundtrack/i.test(g)) return 'focus';
  return 'walking';
}

function toRow(t: It, lang: Lang, trending: boolean, style = '') {
  const art = (t.artworkUrl100 ?? '').replace('100x100bb', '600x600bb');
  return {
    title: t.trackName.slice(0, 140), artist: t.artistName.slice(0, 120), album: (t.collectionName ?? '').slice(0, 140),
    artwork: art, coverUrl: art, audioUrl: t.previewUrl!, durationSec: 30, durationSeconds: 30,
    genre: genreOf(t.primaryGenreName, lang), categories: genreOf(t.primaryGenreName, lang),
    tags: [lang, style || (lang === 'en' ? styleOf(t.primaryGenreName) : ''), trending ? 'trending' : 'top-artist', t.primaryGenreName ?? ''].filter(Boolean).join(','),
    license: 'Official preview (Apple Music)', licenseUrl: 'https://www.apple.com/legal/internet-services/itunes/',
    rights: `${t.artistName} — official preview`, source: 'external', sourceId: `itunes:${t.trackId}`, sourceUrl: t.trackViewUrl ?? '',
    status: 'published', published: true, downloadable: false, featured: trending, isFeatured: trending,
  };
}

const okTrack = (t: It) => t.kind === 'song' && !!t.previewUrl?.startsWith('https://') && t.trackExplicitness !== 'explicit'
  && !BLOCKED.test(`${t.trackName} ${t.artistName} ${t.collectionName ?? ''} ${t.primaryGenreName ?? ''}`)
  && !/religious|spoken|christian|gospel|devotional/i.test(t.primaryGenreName ?? '');

/** Finds tracks for one source; returns rows ready for Tracks.bulkCreate. */
export async function discoverMusic(src: MusicSource, rows = 20) {
  if (src.kind === 'chart') {
    const feed = await getJson<{ feed: { results: { id: string }[] } }>(`https://rss.applemarketingtools.com/api/v2/${src.country}/music/most-played/${Math.min(rows * 2, 100)}/songs.json`);
    const ids = (feed?.feed.results ?? []).map((r) => r.id);
    if (!ids.length) return [];
    const res = await getJson<{ results: It[] }>(`https://itunes.apple.com/lookup?id=${ids.join(',')}&country=${src.country}`);
    return (res?.results ?? []).filter(okTrack).slice(0, rows).map((t) => toRow(t, src.lang, true));
  }
  const res = await getJson<{ results: It[] }>(`https://itunes.apple.com/search?media=music&entity=song&attribute=artistTerm&limit=${Math.min(rows * 3, 120)}&country=us&term=${encodeURIComponent(src.name)}`);
  const want = norm(src.name);
  const seenTitle = new Set<string>();
  return (res?.results ?? []).filter((t) => okTrack(t) && norm(t.artistName).includes(want))
    .filter((t) => { const k = norm(t.trackName.replace(/\(.*?\)|\[.*?\]/g, '')); if (seenTitle.has(k)) return false; seenTitle.add(k); return true; })
    .slice(0, rows).map((t) => toRow(t, src.lang, false, src.style));
}

/** Runs music discovery and inserts only new tracks (dedupe by sourceId, audioUrl and artist+title). */
export async function importMusic(queries = MUSIC_QUERIES, perQuery = 15) {
  const { rows } = await zite.sql({ query: `SELECT "sourceId","audioUrl","artist","title" FROM "Tracks"` });
  const seen = new Set(rows.flatMap((r) => [String(r.sourceId ?? ''), String(r.audioUrl ?? ''), norm(`${r.artist}${r.title}`)]));
  const fresh: Record<string, unknown>[] = [];
  for (let i = 0; i < queries.length; i += 8) {
    const batch = await Promise.all(queries.slice(i, i + 8).map((q) => discoverMusic(q, perQuery)));
    for (const t of batch.flat()) {
      const key = norm(`${t.artist}${t.title}`);
      if (seen.has(t.sourceId) || seen.has(t.audioUrl) || seen.has(key)) continue;
      seen.add(t.sourceId); seen.add(t.audioUrl); seen.add(key); fresh.push(t);
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
