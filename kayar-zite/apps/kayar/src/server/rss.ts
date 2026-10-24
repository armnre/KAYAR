/** Dependency-free RSS 2.0 / Atom parser (Workers have no DOMParser). Never executes remote content. */
export type FeedEpisode = { guid: string; title: string; audioUrl: string; description: string; publishedAt: string | null; durationSec: number | null; artwork: string | null; link: string | null };
export type ParsedFeed = { title: string; description: string; author: string; artwork: string | null; episodes: FeedEpisode[] };

const decode = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, '&');
const strip = (s: string) => decode(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1]).trim() : '';
};
const attr = (xml: string, name: string, a: string) => {
  const m = xml.match(new RegExp(`<${name}\\s[^>]*${a}=["']([^"']+)["']`, 'i'));
  return m ? decode(m[1]) : '';
};

export function parseDuration(v: string): number | null {
  if (!v) return null;
  if (/^\d+$/.test(v)) return Number(v);
  const parts = v.split(':').map(Number);
  if (parts.some(isNaN)) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

const httpUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : '');

export function parseFeed(xml: string): ParsedFeed {
  if (!/<(rss|feed)[\s>]/i.test(xml)) throw new Error('NOT_A_FEED');
  const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
  const itemRe = isAtom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi;
  const head = xml.split(isAtom ? /<entry[\s>]/i : /<item[\s>]/i)[0];
  const showArt = httpUrl(attr(head, 'itunes:image', 'href') || tag(tag(head, 'image'), 'url'));
  const seen = new Set<string>();
  const episodes: FeedEpisode[] = [];
  for (const item of xml.match(itemRe) ?? []) {
    const audioUrl = httpUrl(isAtom
      ? (item.match(/<link[^>]*rel=["']enclosure["'][^>]*href=["']([^"']+)/i)?.[1] ?? '')
      : attr(item, 'enclosure', 'url'));
    if (!audioUrl) continue;
    const guid = tag(item, isAtom ? 'id' : 'guid') || audioUrl;
    if (seen.has(guid)) continue;
    seen.add(guid);
    const date = tag(item, isAtom ? 'updated' : 'pubDate') || tag(item, 'published');
    const d = date ? new Date(date) : null;
    episodes.push({
      guid: guid.slice(0, 500),
      title: strip(tag(item, 'title')).slice(0, 300) || 'بدون عنوان',
      audioUrl: decode(audioUrl),
      description: strip(tag(item, 'description') || tag(item, 'summary') || tag(item, 'itunes:summary')).slice(0, 2000),
      publishedAt: d && !isNaN(d.getTime()) ? d.toISOString() : null,
      durationSec: parseDuration(tag(item, 'itunes:duration')),
      artwork: httpUrl(attr(item, 'itunes:image', 'href')) || null,
      link: httpUrl(isAtom ? attr(item, 'link', 'href') : tag(item, 'link')) || null,
    });
  }
  return {
    title: strip(tag(head, 'title')).slice(0, 300),
    description: strip(tag(head, 'description') || tag(head, 'subtitle')).slice(0, 2000),
    author: strip(tag(head, 'itunes:author') || tag(tag(head, 'author'), 'name')).slice(0, 200),
    artwork: showArt || null,
    episodes,
  };
}
