// KAYAR standalone server: serves the built website + every endpoint in apps/kayar/src/api
// at POST /api/<name> (same wire format as Zite), on your own PostgreSQL. No dependency on Zite.
import './env';
import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import { pool, migrate } from './db';
import { importSeedIfEmpty } from './seed';
import { endpoints } from './endpoints.generated';
import { log, installConsole, initOpsTables, recordError, requestLogger, alert } from './log';
import { apiLimiter, tooMany } from './ratelimit';
import { uploadRouter } from './uploads';
import { mediaRouter, mirrorTick } from './media';
import { autoTick, saveMirror } from '../apps/kayar/src/server/music/importer';
import { opsRouter, APP_VERSION } from './ops';
import { shopRouter, initShop } from './shopRoutes';
import { renderHtml, sitemap, robots, invalidateSeoCache } from './seo';
import { sha256 } from '../apps/kayar/src/server/auth';

installConsole();

const PORT = Number(process.env.PORT || 3000);
const STATIC_DIR = path.resolve(process.env.STATIC_DIR || 'public');
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
const API_BODY_LIMIT = process.env.API_BODY_LIMIT || '2mb';
const SW_DISABLED = process.env.SW_DISABLED === '1';
const AI_DAILY = Number(process.env.AI_DAILY_LIMIT || 30);
const AI_TIMEOUT = Number(process.env.AI_TIMEOUT_MS || 120_000);
const AI_ENDPOINTS = new Set(['coachChat', 'generatePlan']);

const STATUS: Record<string, number> = { BAD_REQUEST: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, RATE_LIMITED: 429, INTERNAL_ERROR: 500 };
const REASON: Record<number, string> = { 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict', 413: 'Payload Too Large', 429: 'Too Many Requests', 500: 'Internal Server Error', 504: 'Gateway Timeout' };
const GENERIC = 'یه مشکلی پیش اومد؛ دوباره تلاش کن.';

type Ep = { inputSchema?: { safeParse?: (v: unknown) => { success: boolean; data?: unknown } }; execute: (p: { input: unknown; context: unknown; stream?: unknown }) => Promise<unknown>; stream?: boolean };

/** Client-safe error body: never includes stack traces or internal messages for 5xx. */
function errorBody(e: unknown) {
  const x = e as { code?: string; message?: string; userFacingMessage?: string; status?: number };
  const status = x?.status ?? STATUS[x?.code ?? ''] ?? 500;
  const message = x?.userFacingMessage || (status < 500 ? x?.message : '') || GENERIC;
  return { status, body: { statusCode: status, error: REASON[status] ?? 'Error', ...(x?.code ? { code: x.code } : {}), message } };
}
class Timeout extends Error { status = 504; userFacingMessage = 'پاسخ دستیار هوشمند بیش از حد طول کشید؛ کمی بعد دوباره امتحان کن.'; }
const withTimeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Timeout('timeout')), ms).unref())]);

const app = express();
app.disable('x-powered-by');
// Liara puts exactly one reverse proxy in front of the container; trusting only that hop
// stops clients from spoofing X-Forwarded-For to dodge rate limits. Override with TRUST_PROXY.
const tp = process.env.TRUST_PROXY ?? '1';
app.set('trust proxy', /^\d+$/.test(tp) ? Number(tp) : tp === 'true' ? true : tp);

/* ---------- security headers ---------- */
const CSP = [
  "default-src 'self'", "script-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:", "img-src 'self' data: blob: https:", "media-src 'self' blob: https:",
  "connect-src 'self' https:", "worker-src 'self'", "manifest-src 'self'", "frame-src 'self' https:", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self' https:", "object-src 'none'",
].join('; ');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  // Report-Only first: logs violations in the browser console without breaking anything
  res.setHeader(process.env.CSP_ENFORCE === '1' ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only', CSP);
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  next();
});
app.use(requestLogger);

app.use(opsRouter()); // /healthz?deep=1, /ops/*
app.get('/healthz', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.send('ok'); } catch { alert('db_down', 'healthz: database unreachable'); res.status(503).send('db down'); }
});

app.use(uploadRouter(PUBLIC_URL));
app.use(shopRouter()); // /go/:itemId (click count + safe redirect)
app.use(mediaRouter()); // /media/stream/:id, /media/cover/:id (same-origin proxy + LRU cache)

/* ---------- AI daily quota (per member) ---------- */
async function aiQuota(req: Request, res: Response) {
  const token = String(req.body?.inputs?.token ?? '');
  if (!token || token.length > 100) return true; // endpoint itself rejects missing/invalid sessions
  const { rows } = await pool.query(`SELECT "memberId" AS m FROM "Sessions" WHERE "tokenHash" = $1 AND "revokedAt" IS NULL LIMIT 1`, [await sha256(token)]);
  if (!rows[0]?.m) return true;
  const day = new Date(Date.now() + 3.5 * 3600_000).toISOString().slice(0, 10); // Tehran day
  const r = await pool.query(`INSERT INTO "_Quota" (key, day, n) VALUES ($1, $2, 1) ON CONFLICT (key, day) DO UPDATE SET n = "_Quota".n + 1 RETURNING n`, [`ai:${rows[0].m}`, day]);
  if (r.rows[0].n > AI_DAILY) { tooMany(res, 3600, `سهمیه‌ی امروز دستیار هوشمند (${AI_DAILY.toLocaleString('fa-IR')} درخواست) تمام شده؛ فردا دوباره امتحان کن.`); return false; }
  return true;
}

app.post('/api/:name', express.json({ limit: API_BODY_LIMIT }), apiLimiter, async (req, res) => {
  const name = req.params.name;
  const ep = Object.prototype.hasOwnProperty.call(endpoints, name) ? (endpoints as Record<string, Ep>)[name] : undefined;
  if (!ep) return res.status(404).json({ statusCode: 404, error: 'Not Found', message: 'Endpoint not found' });
  if (AI_ENDPOINTS.has(name) && !(await aiQuota(req, res))) return;
  const raw = req.body?.inputs ?? {};
  const parsed = ep.inputSchema?.safeParse?.(raw);
  const input = parsed?.success ? parsed.data : raw; // fill defaults like Zite does
  const context = { user: undefined, request: { ip: req.ip, headers: req.headers } };
  const rid = res.locals.requestId as string;
  const t0 = Date.now();
  const fail = (e: unknown) => {
    const out = errorBody(e);
    if (out.status >= 500) { log('error', `[${name}] ${(e as Error)?.message ?? e}`, { requestId: rid, stack: (e as Error)?.stack?.split('\n').slice(0, 6).join(' | ') }); void recordError({ route: `/api/${name}`, status: out.status, message: String((e as Error)?.message ?? e), requestId: rid }); }
    return out;
  };
  if (ep.stream || req.body?.stream) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    const send = (event: string, data: unknown) => { if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); };
    const stream = {
      write: async (chunk: unknown) => { send('data', chunk); },
      forward: async (it: AsyncIterable<string>) => { let all = ''; for await (const c of it) { all += c; send('data', c); } return all; },
    };
    try { const p = ep.execute({ input, context, stream }); send('result', AI_ENDPOINTS.has(name) ? await withTimeout(p, AI_TIMEOUT) : await p); }
    catch (e) { send('error', fail(e).body); }
    return res.end();
  }
  try {
    const p = ep.execute({ input, context });
    const out = AI_ENDPOINTS.has(name) ? await withTimeout(p, AI_TIMEOUT) : await p;
    if (name.startsWith('admin')) invalidateSeoCache();
    res.json(out ?? null);
  } catch (e) {
    const { status, body } = fail(e);
    res.status(status).json(body);
  } finally {
    if (Date.now() - t0 > 3000) log('warn', 'slow endpoint', { endpoint: name, ms: Date.now() - t0, requestId: rid });
  }
});
app.all('/api/*', (_req, res) => res.status(405).json({ statusCode: 405, error: 'Method Not Allowed', message: 'فقط درخواست POST پشتیبانی می‌شود.' }));

/* ---------- SEO + PWA endpoints ---------- */
app.get('/sitemap.xml', sitemap);
app.get('/robots.txt', robots);
const KILL_SW = `self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())await caches.delete(k);await self.registration.unregister();})()));`;
app.get('/sw.js', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Service-Worker-Allowed', '/');
  if (SW_DISABLED) return res.type('application/javascript').send(KILL_SW);
  res.sendFile(path.join(STATIC_DIR, 'sw.js'), (err) => { if (err) res.type('application/javascript').send(KILL_SW); });
});

/* ---------- website (built SPA) ---------- */
app.use('/assets', express.static(path.join(STATIC_DIR, 'assets'), { maxAge: '365d', immutable: true }));
app.use('/media', express.static(path.join(STATIC_DIR, 'media'), { maxAge: '365d', immutable: true }));
app.use(express.static(STATIC_DIR, { maxAge: '1d', index: false, setHeaders: (res, p) => { if (/manifest\.webmanifest$|offline\.html$/.test(p)) res.setHeader('Cache-Control', 'no-cache'); } }));
const INJECT = `<script>window.__KAYAR__=${JSON.stringify({ swDisabled: SW_DISABLED, version: APP_VERSION })}</script>`;
app.get('*', async (req, res) => {
  if (path.extname(req.path) && !req.path.endsWith('.html')) return res.status(404).type('text/plain').send('Not found');
  const { html, status } = await renderHtml(req, STATIC_DIR, INJECT);
  res.status(status).setHeader('Cache-Control', 'no-cache');
  res.type('html').send(html);
});

/* ---------- last-resort error handler (body too large, bad JSON, …) ---------- */
app.use((e: unknown, req: Request, res: Response, _next: NextFunction) => {
  const x = e as { status?: number; type?: string; message?: string };
  const status = x.status && x.status < 500 ? x.status : 500;
  const message = status === 413 ? 'حجم درخواست بیش از حد مجاز است.' : status === 400 ? 'درخواست نامعتبر است.' : GENERIC;
  if (status >= 500) { log('error', 'unhandled route error', { path: req.path, error: x.message, requestId: res.locals.requestId }); void recordError({ route: req.path, status, message: String(x.message), requestId: res.locals.requestId }); }
  if (res.headersSent) return res.end();
  res.status(status).json({ statusCode: status, error: REASON[status] ?? 'Error', message });
});

/* ---------- process lifecycle ---------- */
process.on('unhandledRejection', (r) => { log('error', 'unhandledRejection', { error: String((r as Error)?.stack ?? r).slice(0, 2000) }); void recordError({ route: 'process', message: `unhandledRejection: ${String((r as Error)?.message ?? r)}` }); });
process.on('uncaughtException', (e) => { log('error', 'uncaughtException', { error: String(e?.stack ?? e).slice(0, 2000) }); alert('crash', `uncaughtException: ${e?.message}`); setTimeout(() => process.exit(1), 500).unref(); });

(async () => {
  for (let i = 1; ; i++) {
    try { await migrate(); break; } catch (e) {
      log('error', `DB not ready (try ${i})`, { error: (e as Error).message });
      if (i >= 30) { alert('db_down', 'database unreachable at startup'); process.exit(1); }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  await initOpsTables();
  await importSeedIfEmpty();
  await initShop().catch((e) => log('error', 'shop init failed', { error: (e as Error).message }));
  await migrateMorshedV4().catch((e) => log('error', 'morshed v4 migration failed', { error: (e as Error).message }));
  const server = app.listen(PORT, () => log('info', `KAYAR standalone listening on :${PORT}`, { endpoints: Object.keys(endpoints).length, version: APP_VERSION }));
  server.requestTimeout = 10 * 60_000; // large admin uploads on slow links
  // Morshed background work: nightly auto-import + permanent mirroring of published tracks onto our own disk.
  let mirroring = false;
  const morshedTick = async () => {
    await autoTick().catch((e) => log('warn', 'morshed auto-import tick failed', { error: (e as Error).message }));
    if (mirroring) return; mirroring = true;
    try { await saveMirror(await mirrorTick()); } catch (e) { log('warn', 'morshed mirror tick failed', { error: (e as Error).message }); } finally { mirroring = false; }
  };
  setTimeout(() => void morshedTick(), 60_000).unref();
  setInterval(() => void morshedTick(), 5 * 60_000).unref();
  let closing = false;
  const shutdown = (sig: string) => {
    if (closing) return; closing = true;
    log('info', `${sig} received, shutting down gracefully`);
    server.close(() => { pool.end().finally(() => process.exit(0)); });
    setTimeout(() => process.exit(0), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
})();
void crypto;

/** One-time + idempotent: removes legacy scraped tracks (Audius/ccMixter/Archive/Jamendo — no sourceName) and their references. Uploaded tracks stay. */
async function migrateMorshedV4() {
  const done = await pool.query(`SELECT 1 FROM "SiteSettings" WHERE key = 'migration.morshed-v4' LIMIT 1`);
  if (done.rowCount) return;
  const { rows } = await pool.query(`SELECT id::text AS id FROM "Tracks" WHERE COALESCE("source",'') <> 'upload' AND COALESCE("sourceName",'') = ''`);
  const ids = rows.map((r) => r.id);
  if (ids.length) {
    const keys = ids.map((id) => `lib:${id}`);
    await pool.query(`DELETE FROM "CollectionItems" WHERE "trackId" = ANY($1)`, [ids]);
    await pool.query(`DELETE FROM "Favorites" WHERE "itemKey" = ANY($1) OR "trackId" = ANY($2)`, [keys, ids]);
    await pool.query(`DELETE FROM "ListeningHistory" WHERE "itemKey" = ANY($1) OR "trackId" = ANY($2)`, [keys, ids]);
    await pool.query(`DELETE FROM "Tracks" WHERE id::text = ANY($1)`, [ids]);
  }
  await pool.query(`INSERT INTO "SiteSettings" (key, value) VALUES ('migration.morshed-v4', $1)`, [JSON.stringify({ removed: ids.length, at: new Date().toISOString() })]);
  log('info', 'morshed v4 migration done', { removed: ids.length });
}
