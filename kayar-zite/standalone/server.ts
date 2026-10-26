// KAYAR standalone server: serves the built website + every endpoint in apps/kayar/src/api
// at POST /api/<name> (same wire format as Zite), on your own PostgreSQL. No dependency on Zite.
import './env';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { pool, migrate } from './db';
import { importSeedIfEmpty } from './seed';
import { endpoints } from './endpoints.generated';

const PORT = Number(process.env.PORT || 3000);
const STATIC_DIR = path.resolve(process.env.STATIC_DIR || 'public');
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '');

const STATUS: Record<string, number> = { BAD_REQUEST: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, RATE_LIMITED: 429, INTERNAL_ERROR: 500 };
const REASON: Record<number, string> = { 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict', 429: 'Too Many Requests', 500: 'Internal Server Error' };

type Ep = { inputSchema?: { safeParse?: (v: unknown) => { success: boolean; data?: unknown } }; execute: (p: { input: unknown; context: unknown; stream?: unknown }) => Promise<unknown>; stream?: boolean };

function errorBody(e: unknown) {
  const x = e as { code?: string; message?: string; userFacingMessage?: string; status?: number };
  const status = x?.status ?? STATUS[x?.code ?? ''] ?? 500;
  const message = x?.userFacingMessage || (status < 500 ? x?.message : '') || 'یه مشکلی پیش اومد؛ دوباره تلاش کن.';
  return { status, body: { statusCode: status, error: REASON[status] ?? 'Error', message } };
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

app.get('/healthz', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.send('ok'); } catch { res.status(503).send('db down'); }
});

// File uploads (replaces Zite storage): POST raw bytes to /upload?name=file.jpg → { url }
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.post('/upload', express.raw({ type: '*/*', limit: process.env.UPLOAD_LIMIT || '50mb' }), (req, res) => {
  const name = String(req.query.name || 'file').replace(/[^\w.\-]+/g, '_').slice(-80);
  const ext = path.extname(name).toLowerCase();
  if (!/^\.(jpe?g|png|webp|gif|svg|mp3|m4a|aac|ogg|wav|mp4|pdf)$/.test(ext)) return res.status(400).json({ message: 'نوع فایل مجاز نیست.' });
  const file = `${Date.now().toString(36)}-${crypto.randomBytes(5).toString('hex')}-${name}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, file), req.body as Buffer);
  const origin = PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  res.json({ url: `${origin}/uploads/${file}` });
});
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '365d', immutable: true }));

app.post('/api/:name', express.json({ limit: '10mb' }), async (req, res) => {
  const ep = (endpoints as Record<string, Ep>)[req.params.name];
  if (!ep) return res.status(404).json({ statusCode: 404, error: 'Not Found', message: 'Endpoint not found' });
  const raw = req.body?.inputs ?? {};
  const parsed = ep.inputSchema?.safeParse?.(raw);
  const input = parsed?.success ? parsed.data : raw; // fill defaults like Zite does
  const context = { user: undefined, request: { ip: req.ip, headers: req.headers } };
  const t0 = Date.now();
  if (ep.stream || req.body?.stream) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    const stream = {
      write: async (chunk: unknown) => { send('data', chunk); },
      forward: async (it: AsyncIterable<string>) => { let all = ''; for await (const c of it) { all += c; send('data', c); } return all; },
    };
    try { send('result', await ep.execute({ input, context, stream })); }
    catch (e) { console.error(`[${req.params.name}]`, e); send('error', errorBody(e).body); }
    return res.end();
  }
  try {
    const out = await ep.execute({ input, context });
    res.json(out ?? null);
  } catch (e) {
    const { status, body } = errorBody(e);
    if (status >= 500) console.error(`[${req.params.name}]`, e);
    res.status(status).json(body);
  } finally {
    if (Date.now() - t0 > 3000) console.warn(`[slow] ${req.params.name} ${Date.now() - t0}ms`);
  }
});

// Website (built SPA)
app.use('/assets', express.static(path.join(STATIC_DIR, 'assets'), { maxAge: '365d', immutable: true }));
app.use('/media', express.static(path.join(STATIC_DIR, 'media'), { maxAge: '365d', immutable: true }));
app.use(express.static(STATIC_DIR, { maxAge: '1d', index: false }));
app.get('*', (_req, res) => { res.setHeader('Cache-Control', 'no-cache'); res.sendFile(path.join(STATIC_DIR, 'index.html')); });

(async () => {
  for (let i = 1; ; i++) {
    try { await migrate(); break; } catch (e) {
      console.error(`DB not ready (try ${i}):`, (e as Error).message);
      if (i >= 30) process.exit(1);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  await importSeedIfEmpty();
  app.listen(PORT, () => console.log(`KAYAR standalone listening on :${PORT} (${Object.keys(endpoints).length} endpoints)`));
})();
