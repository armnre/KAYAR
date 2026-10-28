/** Source adapters for Persian music sites hosted inside Iran. Each returns metadata only — audio is never copied to disk. */
import { getText, robotsAllows, decodeHtml } from './http';
import type { Lang } from './classify';
import { OPEN_ADAPTERS } from './openSources';

export type Row = {
  title: string; artist: string; album: string; art: string; audioUrl: string; dur: number; bitrate: number;
  style?: string; lang: Lang; text: string; sourceId: string; sourceName: string; sourceUrl: string; license: string;
};

export type Adapter = {
  id: string; name: string; site: string;
  /** false = no explicit licence for the catalogue; admin must accept responsibility before enabling. */
  openLicense: boolean;
  note: string;
  discover: (limit: number, log: (m: string) => void) => Promise<Row[]>;
};

const UNLICENSED = 'بدون مجوز صریح — مسئولیت با ادمین';
const attr = (tag: string, name: string) => decodeHtml(tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? '');
const ogImage = (html: string) => html.match(/property="og:image" content="([^"]+)"/)?.[1] ?? '';

/** Prefers a 128kbps stream (smaller cache) when the site publishes one; rejects 64kbps. */
function pickMp3(urls: string[]): { url: string; bitrate: number } | null {
  const uniq = [...new Set(urls)].filter((u) => !/-64\.mp3$|teaser|tizer|ringtone/i.test(u));
  const m128 = uniq.find((u) => /-128\.mp3$/i.test(u));
  if (m128) return { url: m128, bitrate: 128 };
  const m320 = uniq.find((u) => /-320\.mp3$/i.test(u)) ?? uniq[0];
  return m320 ? { url: m320, bitrate: 320 } : null;
}

/** "دانلود آهنگ X از Y" / "Y – X" → { title, artist } */
function splitTitle(raw: string): { title: string; artist: string } {
  const s = decodeHtml(raw).replace(/^دانلود\s+(آهنگ|موزیک|ترانه)\s+(جدید\s+)?/, '').replace(/\s+(با\s+)?(کیفیت|متن|لینک).*$/, '').trim();
  const az = s.match(/^(.+?)\s+از\s+(.+)$/);
  if (az) return { title: az[1].replace(/[A-Za-z][A-Za-z\s']+$/, '').trim() || az[1].trim(), artist: az[2].trim() };
  const dash = s.match(/^(.+?)\s+[-–]\s+(.+)$/);
  if (dash) return { artist: dash[1].trim(), title: dash[2].trim() };
  return { title: s, artist: '' };
}

/** Item links from an RSS feed (respecting robots.txt). */
async function rssLinks(feed: string, log: (m: string) => void) {
  if (!(await robotsAllows(feed))) { log(`robots.txt اجازه‌ی خواندن ${feed} را نمی‌دهد`); return []; }
  const xml = await getText(feed);
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => ({
    link: decodeHtml(m[1].match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? ''),
    title: decodeHtml(m[1].match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''),
    cats: [...m[1].matchAll(/<category>([\s\S]*?)<\/category>/g)].map((c) => decodeHtml(c[1])).join(' '),
  })).filter((x) => x.link.startsWith('https://'));
}

/** Newest post URLs from a WordPress-style sitemap index. */
async function sitemapLinks(index: string, log: (m: string) => void, max: number) {
  if (!(await robotsAllows(index))) { log(`robots.txt اجازه‌ی خواندن ${index} را نمی‌دهد`); return []; }
  const idx = await getText(index);
  const maps = [...idx.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decodeHtml(m[1])).filter((u) => /post-sitemap|posts?[-_]?\d*\.xml|sitemap-posts/i.test(u));
  const newest = maps.sort((a, b) => Number(b.match(/(\d+)\.xml$/)?.[1] ?? 0) - Number(a.match(/(\d+)\.xml$/)?.[1] ?? 0))[0];
  if (!newest) return [];
  const sm = await getText(newest);
  return [...sm.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g)]
    .map((m) => ({ link: decodeHtml(m[1]), at: m[2] ?? '' })).sort((a, b) => b.at.localeCompare(a.at)).slice(0, max)
    .map((x) => ({ link: x.link, title: '', cats: '' }));
}

/** Reads one single-track page and turns it into a Row. */
async function readPage(site: string, sourceName: string, it: { link: string; title: string; cats: string }): Promise<Row | null> {
  if (!(await robotsAllows(it.link))) return null;
  const html = await getText(it.link);
  // Structured player attributes (Nex1Music & similar themes)
  const tag = html.match(/<[^>]+data-track-url="[^"]+\.mp3"[^>]*>/)?.[0];
  let title = '', artist = '', art = '', audio: { url: string; bitrate: number } | null = null;
  if (tag) {
    title = attr(tag, 'data-track-title'); artist = attr(tag, 'data-track-artist'); art = attr(tag, 'data-track-cover');
    audio = pickMp3([attr(tag, 'data-track-url'), ...[...html.matchAll(/https:\/\/dl\.[^"'<> ]+\.mp3/g)].map((m) => m[0])]);
  } else {
    audio = pickMp3([...html.matchAll(/https:\/\/[^"'<> ]+\.mp3/g)].map((m) => m[0]).filter((u) => new URL(u).host.endsWith(site)));
    const h = splitTitle(it.title || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] || html.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '');
    title = h.title; artist = h.artist; art = ogImage(html);
  }
  if (!audio || !title) return null;
  const cats = it.cats || [...html.matchAll(/rel="(?:category )?tag"[^>]*>([^<]+)</g)].map((m) => decodeHtml(m[1])).join(' ');
  return {
    title: title.slice(0, 140), artist: artist.slice(0, 120), album: '', art: art.startsWith('https://') ? art : '', audioUrl: audio.url, dur: 0, bitrate: audio.bitrate,
    lang: 'fa', text: `${cats} ${it.title}`, sourceId: `${sourceName.toLowerCase()}:${it.link.replace(/^https:\/\/[^/]+/, '').slice(0, 200)}`,
    sourceName, sourceUrl: it.link, license: UNLICENSED,
  };
}

async function crawl(site: string, name: string, items: { link: string; title: string; cats: string }[], limit: number, log: (m: string) => void) {
  const out: Row[] = [];
  for (const it of items) {
    if (out.length >= limit) break;
    if (/آلبوم|album|پلی.?لیست|playlist|ویدیو|video/i.test(`${it.title} ${it.link}`)) continue;
    try { const r = await readPage(site, name, it); if (r) out.push(r); } catch (e) { log(`خطا در ${it.link}: ${(e as Error).message}`); }
  }
  return out;
}

export const ADAPTERS: Adapter[] = [
  ...OPEN_ADAPTERS,
  {
    id: 'musicdel', name: 'Musicdel', site: 'musicdel.ir', openLicense: false,
    note: 'فید RSS عمومی ریشه‌ی سایت (مجاز در robots.txt) + صفحه‌ی تک‌ترک. فایل‌ها روی dl.musicdel.ir (داخل ایران).',
    discover: async (limit, log) => {
      const items = await rssLinks('https://musicdel.ir/feed/', log); // paged feeds are disallowed by robots.txt (/*?*)
      return crawl('musicdel.ir', 'Musicdel', items, limit, log);
    },
  },
  {
    id: 'nex1music', name: 'Nex1Music', site: 'nex1music.com', openLicense: false,
    note: 'sitemap_index.xml (صریحاً مجاز در robots.txt) + ویژگی‌های ساختاریافته‌ی پلیر (data-track-*). فایل‌ها روی dl.nex1music.com.',
    discover: async (limit, log) => crawl('nex1music.com', 'Nex1Music', await sitemapLinks('https://nex1music.com/sitemap_index.xml', log, limit * 3), limit, log),
  },
  {
    id: 'musicsfa', name: 'Musics-Fa', site: 'musics-fa.com', openLicense: false,
    note: 'robots.txt خواندن فید را ممنوع کرده؛ فقط از sitemap استفاده می‌شود (اگر در دسترس باشد).',
    discover: async (limit, log) => crawl('musics-fa.com', 'Musics-Fa', await sitemapLinks('https://musics-fa.com/sitemap_index.xml', log, limit * 3), limit, log),
  },
];

/** Sites reviewed and deliberately NOT implemented (shown to admins + in the report). */
export const EXCLUDED: { name: string; reason: string }[] = [
  { name: 'Ganja2Music', reason: 'پشت چالش Cloudflare؛ فید و robots.txt بدون اجرای جاوااسکریپت در دسترس نیست.' },
  { name: 'Melovaz', reason: 'محتوا عمدتاً پلی‌لیست‌های خارجی قدیمی (۲۰۱۹–۲۰۲۳) بدون فایل تک‌ترک در صفحه است.' },
  { name: 'Radio Javan', reason: 'از داخل ایران فیلتر است.' },
  { name: 'Audius / Internet Archive', reason: 'API ناپایدار؛ Jamendo و ccMixter از طریق Openverse و API رسمی پوشش داده می‌شوند و بعد از تأیید روی سرور خود کایار ذخیره می‌شوند.' },
];
