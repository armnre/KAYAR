/**
 * KAYAR media relay — deploy on Cloudflare Workers (free). Lets the Liara server (in Iran)
 * reach foreign music CDNs (Jamendo, Openverse, ccMixter...). Set on Liara:
 *   MEDIA_RELAY_URL=https://<your-worker>.workers.dev   MEDIA_RELAY_KEY=<same secret as KEY below>
 */
const KEY = 'CHANGE_ME';
export default {
  async fetch(req) {
    const u = new URL(req.url);
    if (u.searchParams.get('key') !== KEY) return new Response('forbidden', { status: 403 });
    const target = u.searchParams.get('url');
    if (!target || !/^https?:\/\//.test(target)) return new Response('bad url', { status: 400 });
    const headers = { 'user-agent': req.headers.get('user-agent') || 'KAYAR-Relay' };
    const range = req.headers.get('range'); if (range) headers.range = range;
    const r = await fetch(target, { headers, redirect: 'follow', cf: { cacheEverything: true, cacheTtl: 86400 } });
    const out = new Headers();
    for (const k of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) { const v = r.headers.get(k); if (v) out.set(k, v); }
    return new Response(r.body, { status: r.status, headers: out });
  },
};
