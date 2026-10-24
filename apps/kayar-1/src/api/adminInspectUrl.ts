import { z } from 'zod';
import { requireStaff } from '../server/rbac';
import { tokenField } from '../server/util';
import { createEndpoint } from 'zitejs/backend';
import { safeFetchText } from '../server/guard';
import { parseFeed } from '../server/rss';

/**
 * Admin ingestion helper. Reads a public page or feed (SSRF-guarded, size/time-capped) and extracts
 * openly published audio links + metadata. It never executes remote scripts, never follows
 * auth/paywalls and only returns direct public links — the admin must confirm the license before saving.
 */
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const meta = (html: string, prop: string) =>
  decode(html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1]
    ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'))?.[1] ?? '');

export default createEndpoint({
  description: 'Admin: inspects a public page or feed URL and extracts openly published audio links and metadata',
  inputSchema: z.object({ token: tokenField, url: z.string().max(2000) }),
  outputSchema: z.object({
    kind: z.enum(['feed', 'page']),
    title: z.string(),
    artwork: z.string().nullable(),
    candidates: z.array(z.object({ title: z.string(), audioUrl: z.string(), artwork: z.string().nullable(), durationSec: z.number().nullable() })),
    robotsNote: z.string(),
  }),
  execute: async ({ input }) => {
    await requireStaff(input.token, 'morshed.manage');
    const { text, finalUrl } = await safeFetchText(input.url, { maxBytes: 8_000_000, accept: /html|xml|rss|atom|text\/plain/i });
    const origin = new URL(finalUrl).origin;
    let robotsNote = 'robots.txt بررسی نشد.';
    try {
      const robots = (await safeFetchText(`${origin}/robots.txt`, { maxBytes: 200_000 })).text;
      robotsNote = /Disallow:\s*\/\s*$/im.test(robots) ? 'هشدار: robots.txt دسترسی خودکار به کل سایت را منع کرده است.' : 'robots.txt مانعی گزارش نکرد.';
    } catch { robotsNote = 'robots.txt در دسترس نبود.'; }

    if (/<(rss|feed)[\s>]/i.test(text.slice(0, 2000))) {
      const feed = parseFeed(text);
      return {
        kind: 'feed' as const, title: feed.title, artwork: feed.artwork, robotsNote,
        candidates: feed.episodes.slice(0, 30).map((e) => ({ title: e.title, audioUrl: e.audioUrl, artwork: e.artwork ?? feed.artwork, durationSec: e.durationSec })),
      };
    }
    const title = meta(text, 'og:title') || decode(text.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '').trim();
    const artwork = meta(text, 'og:image') || null;
    const urls = new Set<string>();
    const add = (u: string) => { try { const abs = new URL(decode(u), finalUrl); if (/^https?:$/.test(abs.protocol) && /\.(mp3|m4a|aac|ogg|oga|opus|wav)(\?|$)/i.test(abs.pathname + abs.search)) urls.add(abs.toString()); } catch { /* ignore */ } };
    const og = meta(text, 'og:audio') || meta(text, 'og:audio:url') || meta(text, 'og:audio:secure_url');
    if (og) { try { urls.add(new URL(og, finalUrl).toString()); } catch { /* ignore */ } }
    for (const m of text.matchAll(/<(?:audio|source)[^>]+src=["']([^"']+)["']/gi)) add(m[1]);
    for (const m of text.matchAll(/href=["']([^"']+\.(?:mp3|m4a|aac|ogg|oga|opus|wav)(?:\?[^"']*)?)["']/gi)) add(m[1]);
    return {
      kind: 'page' as const, title: title.slice(0, 300), artwork, robotsNote,
      candidates: [...urls].slice(0, 30).map((u) => ({ title: decodeURIComponent(u.split('/').pop()?.split('?')[0] ?? title).replace(/\.\w+$/, '') || title, audioUrl: u, artwork, durationSec: null })),
    };
  },
});
