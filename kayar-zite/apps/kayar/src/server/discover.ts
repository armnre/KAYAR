import { zite } from 'zitejs/db';
import { syncShow } from './podcasts';

/**
 * Content discovery engine for Morshed.
 * Music: full-length tracks from Audius, ccMixter and Internet Archive netlabels (see MUSIC_QUERIES).
 * Religious / recitation content is always rejected.
 * Podcasts: public RSS feeds found via the fyyd directory (Apple directory as fallback).
 */

export type Genre = 'workout' | 'running' | 'walking' | 'focus' | 'recovery';
type Lang = 'fa' | 'en';

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

/** Words that mark religious recitation / eulogy / non-music content — never imported. */
export const RELIGIOUS = /quran|qur'an|koran|surah|sura\b|ayat|qari|recit|tilawa|tajweed|azan|adhan|athan|dua\b|du'a|munajat|nasheed|noha|nohe|nowhe|marsiya|madah|maddah|rowze|rawza|sermon|lecture|islamic|allah|muharram|ashura|imam |hussain|hossein|karbala|zikr|dhikr|قرآن|قران|سوره|آیه|تلاوت|قاری|اذان|دعا|مناجات|نوحه|مداحی|مداح|روضه|محرم|عاشورا|امام|حسین|کربلا|ذکر|سخنرانی|موعظه/i;
export const BLOCKED = new RegExp(RELIGIOUS.source + '|audiobook|podcast|interview|karaoke|instrumental version|tribute|cover version', 'i');

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, '');

async function getJson<T>(url: string): Promise<T | null> {
  for (let a = 0; a < 3; a++) {
    try { const r = await fetch(url, { headers: { 'user-agent': 'KAYAR-Morshed/3.0', accept: 'application/json' } }); if (r.ok) return (await r.json()) as T; if (r.status !== 429 && r.status < 500) return null; } catch { /* retry */ }
    await new Promise((res) => setTimeout(res, 1200 * (a + 1)));
  }
  return null;
}

/**
 * FULL-LENGTH music sources (no 30-second previews):
 *  - Audius: open music network — artists publish full tracks for free streaming (global + Persian creators).
 *  - ccMixter: Creative Commons full tracks (mp3).
 *  - Internet Archive netlabels: Creative Commons full albums (mp3).
 * Every track is played in full. Religious / recitation content is always rejected.
 */
export type MusicSource =
  | { kind: 'audius-trending'; genre: string; lang: Lang; style: string }
  | { kind: 'audius-search'; q: string; lang: Lang; style: string }
  | { kind: 'ccmixter'; tag: string; style: string }
  | { kind: 'archive'; subject: string; style: string };

export const MUSIC_QUERIES: MusicSource[] = [
  ...([['Electronic', 'en-edm'], ['Hip-Hop/Rap', 'en-hiphop'], ['Pop', 'en-pop'], ['Rock', 'en-rock'], ['R&B/Soul', 'en-rnb'], ['House', 'en-edm'], ['Techno', 'en-edm'], ['Dance & EDM', 'en-edm'], ['Trap', 'en-hiphop'], ['Drum & Bass', 'en-edm'], ['Alternative', 'en-rock'], ['Lo-Fi', 'en-pop'], ['Ambient', 'en-pop'], ['Latin', 'en-pop'], ['Dubstep', 'en-edm'], ['Funk', 'en-rnb']] as const)
    .map(([genre, style]) => ({ kind: 'audius-trending' as const, genre, lang: 'en' as Lang, style })),
  ...([['persian pop', 'fa-pop'], ['farsi', 'fa-pop'], ['iranian', 'fa-pop'], ['persian', 'fa-pop'], ['آهنگ', 'fa-pop'], ['موزیک', 'fa-pop'], ['عاشقانه', 'fa-pop'], ['persian rap', 'fa-rap'], ['farsi rap', 'fa-rap'], ['رپ فارسی', 'fa-rap'], ['رپ', 'fa-rap'], ['iranian hip hop', 'fa-rap'], ['tehran', 'fa-rap'], ['persian classic', 'fa-classic'], ['persian traditional', 'fa-traditional'], ['santoor', 'fa-traditional'], ['setar', 'fa-traditional'], ['tar persian', 'fa-traditional'], ['persian dance', 'fa-dance'], ['bandari', 'fa-dance'], ['شاد', 'fa-dance'], ['persian remix', 'fa-dance'], ['persian rock', 'fa-rock'], ['iranian rock', 'fa-rock']] as const)
    .map(([q, style]) => ({ kind: 'audius-search' as const, q, lang: 'fa' as Lang, style })),
  ...([['workout', 'en-edm'], ['gym', 'en-hiphop'], ['running', 'en-edm'], ['motivation', 'en-hiphop'], ['pop', 'en-pop'], ['rock', 'en-rock']] as const)
    .map(([q, style]) => ({ kind: 'audius-search' as const, q, lang: 'en' as Lang, style })),
  ...([['dance', 'en-edm'], ['hip_hop', 'en-hiphop'], ['electronica', 'en-edm'], ['rock', 'en-rock'], ['pop', 'en-pop'], ['funky', 'en-rnb'], ['trance', 'en-edm'], ['ambient', 'en-pop']] as const)
    .map(([tag, style]) => ({ kind: 'ccmixter' as const, tag, style })),
  ...([['electronic', 'en-edm'], ['hip hop', 'en-hiphop'], ['rock', 'en-rock'], ['pop', 'en-pop']] as const)
    .map(([subject, style]) => ({ kind: 'archive' as const, subject, style })),
];

type Row = Record<string, unknown> & { title: string; artist: string; audioUrl: string; sourceId: string };
export const UNSUITABLE = /\b(sex|sexy|nsfw|porn|nude|naked|fuck|f\*ck|shit|bitch|nigg|hoe|thot|xxx|drug|weed|cocaine|kill|murder|suicide|satan|devil|horny|onlyfans|explicit|18\+)\b|سکس|لخت|مستهجن|فحش|مواد/i;
const PERSIAN = /[\u0600-\u06FF]|persian|farsi|iran|tehran|shiraz/i;

function genreOf(style: string, g = ''): Genre {
  if (/edm|hiphop|rock|rap|dance/.test(style) || /electronic|hip|rap|rock|metal|house|techno|trap|dubstep|drum/i.test(g)) return 'workout';
  if (/traditional|classic/.test(style) || /ambient|lo-?fi|classical|new age/i.test(g)) return 'focus';
  if (/pop|rnb/.test(style)) return 'running';
  return 'walking';
}

function row(o: { title: string; artist: string; album?: string; art?: string; audioUrl: string; dur: number; style: string; lang: Lang; g?: string; trending?: boolean; license: string; licenseUrl?: string; sourceId: string; sourceUrl: string; source: string }): Row | null {
  const text = `${o.title} ${o.artist} ${o.album ?? ''} ${o.g ?? ''}`;
  if (!o.audioUrl.startsWith('https://') || o.dur < 90 || o.dur > 900 || BLOCKED.test(text) || UNSUITABLE.test(text) || /religious|spoken|christian|gospel|devotional|meditation guide/i.test(o.g ?? '')) return null;
  const lang = o.lang;
  const g = genreOf(o.style, o.g);
  return {
    title: o.title.slice(0, 140), artist: o.artist.slice(0, 120), album: (o.album ?? '').slice(0, 140), artwork: o.art ?? '', coverUrl: o.art ?? '',
    audioUrl: o.audioUrl, durationSec: Math.round(o.dur), durationSeconds: Math.round(o.dur), genre: g, categories: g,
    tags: [lang, o.style, o.trending ? 'trending' : '', 'full', o.source, o.g ?? ''].filter(Boolean).join(','),
    license: o.license, licenseUrl: o.licenseUrl ?? '', rights: `${o.artist} — ${o.license}`, source: 'external', sourceId: o.sourceId, sourceUrl: o.sourceUrl,
    status: 'published', published: true, downloadable: false, featured: !!o.trending, isFeatured: !!o.trending,
  };
}

type AudiusT = { id: string; title: string; duration: number; genre?: string; mood?: string; tags?: string | null; permalink?: string; is_streamable?: boolean; stream_conditions?: unknown; is_delete?: boolean; artwork?: Record<string, string> | null; user: { name: string; handle: string }; play_count?: number };
const AUDIUS = 'https://api.audius.co/v1';
// Audius artwork is community-uploaded and unmoderated, so it is never stored; the app draws a clean generated cover.
const audiusRow = (t: AudiusT, lang: Lang, style: string, trending: boolean) =>
  t.is_streamable === false || t.stream_conditions || t.is_delete ? null : row({
    title: t.title, artist: t.user.name, art: '', audioUrl: `${AUDIUS}/tracks/${t.id}/stream?app_name=KAYAR`,
    dur: t.duration, style, lang, g: `${t.genre ?? ''} ${t.tags ?? ''}`.trim(), trending, license: 'Audius — full track (artist-published)', licenseUrl: 'https://audius.co/legal/terms-of-use',
    sourceId: `audius:${t.id}`, sourceUrl: `https://audius.co${t.permalink ?? ''}`, source: 'audius',
  });

type CcT = { upload_id: number; upload_name: string; user_name: string; user_real_name?: string; upload_tags?: string; license_name?: string; license_url?: string; file_page_url: string; files: { download_url: string; file_format_info?: { ps?: string; 'mime_type'?: string } }[] };
const secs = (ps = '') => ps.split(':').reduce((a, x) => a * 60 + Number(x || 0), 0);

/** Finds full-length tracks for one source; returns rows ready for Tracks.bulkCreate. */
export async function discoverMusic(src: MusicSource, rows = 20): Promise<Row[]> {
  const keep = (x: (Row | null)[]) => x.filter((r): r is Row => !!r).slice(0, rows);
  if (src.kind === 'audius-trending') {
    const r = await getJson<{ data: AudiusT[] }>(`${AUDIUS}/tracks/trending?app_name=KAYAR&time=month&genre=${encodeURIComponent(src.genre)}&limit=${rows * 2}`);
    return keep((r?.data ?? []).map((t) => audiusRow(t, src.lang, src.style, true)));
  }
  if (src.kind === 'audius-search') {
    const r = await getJson<{ data: AudiusT[] }>(`${AUDIUS}/tracks/search?app_name=KAYAR&query=${encodeURIComponent(src.q)}&limit=${rows * 2}`);
    const list = (r?.data ?? []).filter((t) => src.lang !== 'fa' || (/[\u0600-\u06FF]/.test(`${t.title} ${t.user.name}`) || /persian|farsi|iran/i.test(`${t.title} ${t.user.name} ${t.tags ?? ''}`)));
    return keep(list.sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0)).map((t) => audiusRow(t, src.lang, src.style, false)));
  }
  if (src.kind === 'ccmixter') {
    const r = await getJson<CcT[]>(`https://ccmixter.org/api/query?f=json&tags=${encodeURIComponent(src.tag)}&sort=rank&limit=${rows * 2}`);
    return keep((r ?? []).map((t) => { const f = t.files.find((x) => x.download_url.endsWith('.mp3')); return f ? row({
      title: t.upload_name, artist: t.user_real_name || t.user_name, audioUrl: f.download_url.replace(/^http:/, 'https:'), dur: secs(f.file_format_info?.ps), style: src.style, lang: 'en',
      g: t.upload_tags, license: t.license_name ? `CC — ${t.license_name.trim()}` : 'Creative Commons', licenseUrl: t.license_url, sourceId: `ccmixter:${t.upload_id}`, sourceUrl: t.file_page_url, source: 'ccmixter',
    }) : null; }));
  }
  // Internet Archive netlabels (Creative Commons albums)
  const s = await getJson<{ response: { docs: { identifier: string }[] } }>(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(`collection:netlabels AND mediatype:audio AND subject:(${src.subject})`)}&fl[]=identifier&rows=8&sort[]=downloads+desc&output=json`);
  const out: (Row | null)[] = [];
  for (const d of s?.response.docs ?? []) {
    if (out.length >= rows) break;
    const m = await getJson<{ metadata?: { title?: string; creator?: string | string[]; licenseurl?: string; subject?: string | string[] }; files?: { name: string; format?: string; title?: string; length?: string; creator?: string }[] }>(`https://archive.org/metadata/${d.identifier}`);
    const meta = m?.metadata ?? {}; const creator = Array.isArray(meta.creator) ? meta.creator[0] : meta.creator ?? 'Unknown';
    for (const f of (m?.files ?? []).filter((x) => /mp3/i.test(x.format ?? '') && x.name.endsWith('.mp3')).slice(0, 4)) {
      const len = f.length?.includes(':') ? secs(f.length) : Number(f.length ?? 0);
      out.push(row({ title: f.title || f.name.replace(/\.mp3$/, '').replace(/[_-]+/g, ' '), artist: f.creator || creator, album: meta.title, art: `https://archive.org/services/img/${d.identifier}`,
        audioUrl: `https://archive.org/download/${d.identifier}/${encodeURIComponent(f.name)}`, dur: len, style: src.style, lang: 'en', g: [meta.subject].flat().join(' '),
        license: 'Creative Commons (netlabel)', licenseUrl: meta.licenseurl, sourceId: `archive:${d.identifier}/${f.name}`.slice(0, 250), sourceUrl: `https://archive.org/details/${d.identifier}`, source: 'archive' }));
    }
  }
  return keep(out);
}

/** Runs full-length discovery, inserts only new tracks, and removes old 30-second previews. */
export async function importMusic(queries = MUSIC_QUERIES, perQuery = 15) {
  const { rows } = await zite.sql({ query: `SELECT "sourceId","audioUrl","artist","title" FROM "Tracks"` });
  const seen = new Set(rows.flatMap((r) => [String(r.sourceId ?? ''), String(r.audioUrl ?? ''), norm(`${r.artist}${r.title}`)]));
  const fresh: Row[] = [];
  for (let i = 0; i < queries.length; i += 6) {
    const batch = await Promise.all(queries.slice(i, i + 6).map((q) => discoverMusic(q, perQuery).catch(() => [] as Row[])));
    for (const t of batch.flat()) {
      const key = norm(`${t.artist}${t.title}`);
      if (seen.has(t.sourceId) || seen.has(t.audioUrl) || seen.has(key)) continue;
      seen.add(t.sourceId); seen.add(t.audioUrl); seen.add(key); fresh.push(t);
    }
  }
  for (let i = 0; i < fresh.length; i += 100) await zite.tracks.bulkCreate({ records: fresh.slice(i, i + 100) as never });
  const removed = await purgePreviews();
  return { added: fresh.length, removed };
}

/** Deletes 30-second preview tracks (old iTunes imports) so only full songs remain. */
export async function purgePreviews() {
  const { rows } = await zite.sql({ query: `SELECT id FROM "Tracks" WHERE "sourceId" LIKE 'itunes:%' OR ("durationSec" IS NOT NULL AND "durationSec" <= 35 AND "source" = 'external')` });
  const ids = rows.map((r) => String(r.id));
  for (let i = 0; i < ids.length; i += 10) await Promise.all(ids.slice(i, i + 10).map((id) => zite.tracks.delete({ id })));
  return ids.length;
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
