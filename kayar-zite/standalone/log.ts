// Structured JSON logging to stdout (searchable in Liara logs) + a small rotating error table + optional alert webhook.
import util from 'node:util';
import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { pool } from './db';

type Level = 'debug' | 'info' | 'warn' | 'error';
const raw = { log: console.log.bind(console), error: console.error.bind(console) };

export function log(level: Level, msg: string, extra: Record<string, unknown> = {}) {
  const line = JSON.stringify({ level, time: new Date().toISOString(), msg, ...extra });
  (level === 'error' || level === 'warn' ? raw.error : raw.log)(line);
}

/** Routes every console.* call (including endpoint code) through the JSON logger. */
export function installConsole() {
  const fmt = (args: unknown[]) => {
    if (args.length === 1 && typeof args[0] === 'string' && args[0].startsWith('{')) {
      try { return JSON.parse(args[0]) as Record<string, unknown>; } catch { /* plain text */ }
    }
    return { msg: util.format(...args) };
  };
  const wrap = (level: Level) => (...args: unknown[]) => { const { msg, level: _l, time: _t, ...rest } = fmt(args); void _l; void _t; log(level, String(msg ?? ''), rest); };
  console.log = wrap('info');
  console.info = wrap('info');
  console.warn = wrap('warn');
  console.error = wrap('error');
}

/* ---------- recent errors (capped table) ---------- */
const ERR_CAP = Number(process.env.ERROR_LOG_CAP || 500);
export async function initOpsTables() {
  await pool.query(`CREATE TABLE IF NOT EXISTS "_SystemErrors" (id bigserial PRIMARY KEY, at timestamptz NOT NULL DEFAULT now(), level text, route text, status int, message text, request_id text)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS "_SystemMeta" (key text PRIMARY KEY, value text, updated_at timestamptz NOT NULL DEFAULT now())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS "_UploadLog" (id bigserial PRIMARY KEY, at timestamptz NOT NULL DEFAULT now(), member_id text, bytes bigint, file text)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "_UploadLog_member_at" ON "_UploadLog" (member_id, at)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS "_Quota" (key text NOT NULL, day date NOT NULL, n int NOT NULL DEFAULT 0, PRIMARY KEY (key, day))`);
}
let errCount = 0;
export async function recordError(e: { route?: string; status?: number; message: string; requestId?: string; level?: string }) {
  try {
    await pool.query(`INSERT INTO "_SystemErrors" (level, route, status, message, request_id) VALUES ($1,$2,$3,$4,$5)`, [e.level ?? 'error', e.route ?? '', e.status ?? 500, e.message.slice(0, 1000), e.requestId ?? '']);
    if (++errCount % 25 === 0) await pool.query(`DELETE FROM "_SystemErrors" WHERE id <= (SELECT MAX(id) - $1 FROM "_SystemErrors")`, [ERR_CAP]);
  } catch { /* never let error logging throw */ }
}

export async function getMeta(key: string) {
  try { const { rows } = await pool.query(`SELECT value FROM "_SystemMeta" WHERE key = $1`, [key]); return (rows[0]?.value as string) ?? null; } catch { return null; }
}
export async function setMeta(key: string, value: string) {
  await pool.query(`INSERT INTO "_SystemMeta" (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [key, value]);
}

/* ---------- alerts (optional generic webhook, rate limited per kind) ---------- */
const lastAlert = new Map<string, number>();
export function alert(kind: string, text: string) {
  const url = process.env.ALERT_WEBHOOK_URL;
  log('error', `ALERT ${kind}: ${text}`, { alert: kind });
  if (!url) return;
  const now = Date.now();
  if (now - (lastAlert.get(kind) ?? 0) < 15 * 60_000) return;
  lastAlert.set(kind, now);
  fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ app: 'kayar', kind, text, time: new Date().toISOString() }), signal: AbortSignal.timeout(5000) })
    .catch((err) => log('warn', 'alert webhook failed', { error: (err as Error).message }));
}

/* ---------- request logging ---------- */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const id = (typeof req.headers['x-request-id'] === 'string' && /^[\w-]{6,64}$/.test(req.headers['x-request-id']) ? req.headers['x-request-id'] : crypto.randomUUID());
  res.locals.requestId = id;
  res.setHeader('X-Request-Id', id);
  const t0 = process.hrtime.bigint();
  res.on('finish', () => {
    if (req.path === '/healthz' && res.statusCode === 200) return; // keep uptime pings quiet
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    log(res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info', 'request', { requestId: id, method: req.method, path: req.path, status: res.statusCode, ms: Math.round(ms), ip: req.ip });
  });
  next();
}
