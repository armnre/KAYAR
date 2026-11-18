// Free Cloudflare Worker relay: Groq and OpenRouter reject requests from Iranian servers (403).
// Deploy at dash.cloudflare.com > Workers > Create > paste this file. Set a secret PROXY_TOKEN
// in the worker and the same value as ZITE_AI_PROXY_TOKEN is NOT needed: the worker only forwards
// to these two hosts, and callers must already hold a valid Groq/OpenRouter key.
const HOSTS = { groq: 'https://api.groq.com', openrouter: 'https://openrouter.ai' };
export default {
  async fetch(req) {
    const url = new URL(req.url);
    const [, name, ...rest] = url.pathname.split('/');
    const host = HOSTS[name];
    if (!host || req.method !== 'POST') return new Response('not found', { status: 404 });
    const headers = new Headers(req.headers);
    for (const k of ['host', 'cf-connecting-ip', 'x-forwarded-for', 'x-real-ip']) headers.delete(k);
    return fetch(host + '/' + rest.join('/') + url.search, { method: 'POST', headers, body: req.body });
  },
};
