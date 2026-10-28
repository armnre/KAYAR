/** Polite HTTP for source adapters: transparent User-Agent, ≤1 req/s per host, retry with backoff, robots.txt respect. */
const UA = `KAYAR-Morshed/4.0 (+${(process.env.PUBLIC_URL || 'https://kayar.kapoosh.ir').replace(/\/$/, '')})`;
export const USER_AGENT = UA;
const nextSlot = new Map<string, number>();
const MIN_GAP = 1100;

async function slot(host: string) {
  const now = Date.now();
  const at = Math.max(now, nextSlot.get(host) ?? 0);
  nextSlot.set(host, at + MIN_GAP);
  if (at > now) await new Promise((r) => setTimeout(r, at - now));
}

export async function politeFetch(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const host = new URL(url).host;
  let last: unknown;
  for (let a = 0; a < 3; a++) {
    await slot(host);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 15_000);
    try {
      const r = await fetch(url, { ...init, redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': UA, 'accept-language': 'fa,en;q=0.5', ...(init.headers ?? {}) } });
      if (r.status === 429 || r.status >= 500) { last = new Error(`HTTP ${r.status}`); await new Promise((ok) => setTimeout(ok, 2000 * (a + 1) ** 2)); continue; }
      return r;
    } catch (e) { last = e; await new Promise((ok) => setTimeout(ok, 1500 * (a + 1) ** 2)); } finally { clearTimeout(t); }
  }
  throw last instanceof Error ? last : new Error('fetch failed');
}

export async function getText(url: string, max = 3_000_000) {
  const r = await politeFetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  const text = await r.text();
  return text.slice(0, max);
}

/* ---------- robots.txt (cached 6h per origin; rules for "*" only) ---------- */
const robotsCache = new Map<string, { at: number; disallow: RegExp[]; allow: RegExp[] }>();
const toRe = (p: string) => new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));

export async function robotsAllows(url: string) {
  const u = new URL(url);
  let rules = robotsCache.get(u.origin);
  if (!rules || Date.now() - rules.at > 6 * 3600_000) {
    rules = { at: Date.now(), disallow: [], allow: [] };
    try {
      const txt = await getText(`${u.origin}/robots.txt`, 200_000);
      let mine = false;
      for (const line of txt.split(/\r?\n/)) {
        const [k, ...rest] = line.split(':'); const v = rest.join(':').trim(); const key = k.trim().toLowerCase();
        if (key === 'user-agent') mine = v === '*' || /kayar/i.test(v);
        else if (mine && key === 'disallow' && v) rules.disallow.push(toRe(v));
        else if (mine && key === 'allow' && v) rules.allow.push(toRe(v));
      }
    } catch { /* no robots → allowed */ }
    robotsCache.set(u.origin, rules);
  }
  const p = u.pathname + u.search;
  const longest = (a: RegExp[]) => Math.max(-1, ...a.filter((r) => r.test(p)).map((r) => r.source.length));
  return longest(rules.allow) >= longest(rules.disallow);
}

/** Checks from THIS server (in Iran on Liara) that an audio URL answers with audio. Returns size/type, or null. */
export async function probeAudio(url: string): Promise<{ bytes: number; type: string } | null> {
  try {
    const r = await politeFetch(url, { headers: { range: 'bytes=0-1' }, timeoutMs: 12_000 });
    const type = r.headers.get('content-type') ?? '';
    const total = Number(r.headers.get('content-range')?.split('/')[1] ?? r.headers.get('content-length') ?? 0);
    try { await r.body?.cancel(); } catch { /* ignore */ }
    if (!(r.status === 206 || r.status === 200)) return null;
    if (!/audio|mpeg|octet-stream/i.test(type)) return null;
    return { bytes: total, type };
  } catch { return null; }
}

export const decodeHtml = (s: string) => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&#8211;|&#8212;/g, '-').replace(/&#8217;|&#039;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
