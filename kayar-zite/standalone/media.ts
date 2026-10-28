// Same-origin media proxy for Morshed: GET /media/stream/:id (Range-aware) and /media/cover/:id.
// Browsers only ever talk to KAYAR's own domain; the real source URL stays server-side.
// A small LRU disk cache (MEDIA_CACHE_MB, default 500 MB, inside UPLOAD_DIR/.media-cache) keeps hot tracks local
// while respecting Liara's 2 GB disk: the cap shrinks automatically when uploads grow.
import express, { type Router, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { pool } from './db';
import { UPLOAD_DIR, diskUsage } from './uploads';
import { log } from './log';
import { USER_AGENT, smartFetch } from '../apps/kayar/src/server/music/http';

const MB = 1024 * 1024;
const CACHE_DIR = path.join(UPLOAD_DIR, '.media-cache');
/** Permanent mirror of published tracks (never LRU-evicted). Budget: MEDIA_LIBRARY_MB (default 1200). */
const LIB_DIR = path.join(UPLOAD_DIR, '.media-library');
const LIB_MAX = () => Number(process.env.MEDIA_LIBRARY_MB || 1200) * MB;
const DISK_TOTAL = Number(process.env.DISK_TOTAL_MB || 2048) * MB;
const CACHE_MAX = () => Math.max(0, Math.min(Number(process.env.MEDIA_CACHE_MB || 500) * MB, DISK_TOTAL - diskUsage().bytes - dirSize(LIB_DIR).total - 300 * MB));
const MAX_FILE = 25 * MB;
const inflight = new Map<string, Promise<string | null>>();

async function sourceOf(id: string, kind: 'audio' | 'cover') {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { rows } = await pool.query(`SELECT "audioUrl","coverUrl","status" FROM "Tracks" WHERE id::text = $1 LIMIT 1`, [id]);
  const r = rows[0];
  if (!r || r.status === 'deleted' || r.status === 'rejected') return null;
  const u = String(kind === 'audio' ? r.audioUrl ?? '' : r.coverUrl ?? '');
  return /^https?:\/\//.test(u) ? u : null;
}

function cacheSize() { return dirSize(CACHE_DIR); }
function dirSize(dir: string) {
  let total = 0; const files: { p: string; size: number; at: number }[] = [];
  try { for (const f of fs.readdirSync(dir)) { if (f.endsWith('.part')) continue; const p = path.join(dir, f); const s = fs.statSync(p); total += s.size; files.push({ p, size: s.size, at: s.atimeMs }); } } catch { /* empty */ }
  return { total, files };
}
function evict(incoming: number) {
  const max = CACHE_MAX();
  const { total, files } = cacheSize();
  let used = total;
  for (const f of files.sort((a, b) => a.at - b.at)) { if (used + incoming <= max) break; try { fs.unlinkSync(f.p); used -= f.size; } catch { /* gone */ } }
  return used + incoming <= max;
}

/** Downloads one file into the cache (once, even with concurrent requests). Returns the local path or null. */
function fill(url: string, key: string): Promise<string | null> {
  const dest = path.join(CACHE_DIR, key);
  if (fs.existsSync(dest)) { const now = new Date(); try { fs.utimesSync(dest, now, fs.statSync(dest).mtime); } catch { /* ignore */ } return Promise.resolve(dest); }
  const running = inflight.get(key); if (running) return running;
  const p = (async () => {
    try {
      const r = await smartFetch(url, { headers: { 'user-agent': USER_AGENT }, redirect: 'follow' });
      const len = Number(r.headers.get('content-length') || 0);
      if (!r.ok || !r.body || (len && len > MAX_FILE) || !evict(len || 10 * MB)) return null;
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      const tmp = `${dest}.${crypto.randomBytes(4).toString('hex')}.part`;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > MAX_FILE) return null;
      fs.writeFileSync(tmp, buf); fs.renameSync(tmp, dest);
      return dest;
    } catch (e) { log('warn', 'media cache fill failed', { error: (e as Error).message }); return null; }
    finally { inflight.delete(key); }
  })();
  inflight.set(key, p);
  return p;
}

function sendLocal(req: Request, res: Response, file: string, type: string) {
  const size = fs.statSync(file).size;
  res.setHeader('Accept-Ranges', 'bytes'); res.setHeader('Content-Type', type); res.setHeader('Cache-Control', 'private, max-age=86400');
  const m = /bytes=(\d*)-(\d*)/.exec(String(req.headers.range ?? ''));
  if (!m) { res.setHeader('Content-Length', size); return fs.createReadStream(file).pipe(res); }
  const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
  const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  if (start >= size || start > end) { res.status(416).setHeader('Content-Range', `bytes */${size}`); return res.end(); }
  res.status(206).setHeader('Content-Range', `bytes ${start}-${end}/${size}`); res.setHeader('Content-Length', end - start + 1);
  fs.createReadStream(file, { start, end }).pipe(res);
}

/** Streams straight from the source when it can't be cached (Range is forwarded). */
async function passThrough(req: Request, res: Response, url: string) {
  const r = await smartFetch(url, { headers: { 'user-agent': USER_AGENT, ...(req.headers.range ? { range: String(req.headers.range) } : {}) }, redirect: 'follow' });
  if (!r.ok && r.status !== 206) return res.status(502).end();
  res.status(r.status);
  for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges']) { const v = r.headers.get(h); if (v) res.setHeader(h, v); }
  res.setHeader('Cache-Control', 'private, max-age=3600');
  if (r.body) Readable.fromWeb(r.body as never).pipe(res); else res.end();
}

export function mediaRouter(): Router {
  const r = express.Router();
  r.get('/media/stream/:id', async (req, res) => {
    try {
      const url = await sourceOf(req.params.id, 'audio');
      if (!url) return res.status(404).end();
      const pinned = path.join(LIB_DIR, `a-${req.params.id}.mp3`);
      if (fs.existsSync(pinned)) return sendLocal(req, res, pinned, 'audio/mpeg');
      const file = await fill(url, `a-${req.params.id}.mp3`);
      if (file) return sendLocal(req, res, file, 'audio/mpeg');
      await passThrough(req, res, url);
    } catch (e) { log('warn', 'media stream failed', { error: (e as Error).message }); if (!res.headersSent) res.status(502).end(); }
  });
  r.get('/media/cover/:id', async (req, res) => {
    try {
      const url = await sourceOf(req.params.id, 'cover');
      if (!url) return res.status(404).end();
      const pinnedCover = path.join(LIB_DIR, `c-${req.params.id}`);
      const file = fs.existsSync(pinnedCover) ? pinnedCover : await fill(url, `c-${req.params.id}`);
      if (!file) return res.status(404).end();
      const head = fs.readFileSync(file).subarray(0, 12);
      const type = head[0] === 0xff ? 'image/jpeg' : head.toString('latin1', 8, 12) === 'WEBP' ? 'image/webp' : head[1] === 0x50 ? 'image/png' : 'application/octet-stream';
      if (type === 'application/octet-stream') return res.status(404).end();
      res.setHeader('X-Content-Type-Options', 'nosniff');
      sendLocal(req, res, file, type);
    } catch { if (!res.headersSent) res.status(404).end(); }
  });
  return r;
}

/** Removes cached files whose track no longer exists (called after purge/takedown via script). */
export async function pruneMediaCache() {
  const files = [...cacheSize().files, ...dirSize(LIB_DIR).files];
  const { rows } = await pool.query(`SELECT id::text AS id FROM "Tracks" WHERE status NOT IN ('deleted','rejected')`);
  const live = new Set(rows.map((x) => x.id));
  let removed = 0;
  for (const f of files) { const id = path.basename(f.p).replace(/^[ac]-/, '').replace(/\.mp3$/, ''); if (!live.has(id)) { try { fs.unlinkSync(f.p); removed++; } catch { /* gone */ } } }
  return removed;
}

/* ---------- Permanent mirror worker ---------- */
const failedAt = new Map<string, number>();
async function download(url: string, dest: string, max: number) {
  const r = await smartFetch(url, { headers: { 'user-agent': USER_AGENT }, redirect: 'follow', signal: AbortSignal.timeout(120_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (!buf.length || buf.length > max) throw new Error('size');
  const tmp = `${dest}.${crypto.randomBytes(4).toString('hex')}.part`;
  fs.writeFileSync(tmp, buf); fs.renameSync(tmp, dest);
  return buf.length;
}

/**
 * Copies published external tracks (audio + cover) into the permanent library, newest first, within the budget.
 * Once mirrored, playback is served from KAYAR's own disk — no dependency on the source host or on filtering.
 */
export async function mirrorTick(batch = 6): Promise<{ files: number; mb: number; budgetMb: number; pending: number; failed: number; at: string }> {
  fs.mkdirSync(LIB_DIR, { recursive: true });
  const { rows } = await pool.query(`SELECT id::text AS id, "audioUrl", "coverUrl" FROM "Tracks" WHERE status = 'published' AND source = 'external' AND "audioUrl" ~ '^https?://' ORDER BY "importedAt" DESC NULLS LAST LIMIT 5000`);
  const missing = rows.filter((r) => !fs.existsSync(path.join(LIB_DIR, `a-${r.id}.mp3`)));
  const free = () => Math.min(LIB_MAX() - dirSize(LIB_DIR).total, DISK_TOTAL - diskUsage().bytes - dirSize(LIB_DIR).total - dirSize(CACHE_DIR).total - 300 * MB);
  let done = 0;
  for (const r of missing) {
    if (done >= batch || free() < 30 * MB) break;
    if (Date.now() - (failedAt.get(r.id) ?? 0) < 6 * 3600_000) continue;
    const cached = path.join(CACHE_DIR, `a-${r.id}.mp3`);
    const dest = path.join(LIB_DIR, `a-${r.id}.mp3`);
    try {
      if (fs.existsSync(cached)) fs.renameSync(cached, dest); else await download(String(r.audioUrl), dest, MAX_FILE);
      if (/^https?:\/\//.test(String(r.coverUrl ?? ''))) await download(String(r.coverUrl), path.join(LIB_DIR, `c-${r.id}`), 3 * MB).catch(() => {});
      done++;
    } catch (e) { failedAt.set(r.id, Date.now()); log('warn', 'mirror failed', { id: r.id, error: (e as Error).message }); }
  }
  const lib = dirSize(LIB_DIR);
  const audioFiles = lib.files.filter((f) => path.basename(f.p).startsWith('a-')).length;
  return { files: audioFiles, mb: Math.round(lib.total / MB), budgetMb: Math.round(LIB_MAX() / MB), pending: Math.max(0, missing.length - done), failed: failedAt.size, at: new Date().toISOString() };
}
