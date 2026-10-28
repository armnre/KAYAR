// Secure uploads: session required, role-based types/sizes, magic-byte check, per-member daily quota,
// global disk guard, per-user rate limit. Files are served with nosniff (+ sandbox CSP for anything risky).
import express, { type Request, type Response, type Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pool } from './db';
import { hit, tooMany } from './ratelimit';
import { log, alert } from './log';
import { requireSession } from '../apps/kayar/src/server/rbac';
import { isStaff } from '../apps/kayar/src/server/rbac';

export const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';
const num = (v: string | undefined, d: number) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; };
const MB = 1024 * 1024;
function parseSize(s: string | undefined, d: number) {
  const m = /^(\d+(?:\.\d+)?)\s*(kb|mb|gb)?$/i.exec(String(s ?? '').trim());
  if (!m) return d;
  return Math.round(Number(m[1]) * ({ kb: 1024, mb: MB, gb: 1024 * MB } as Record<string, number>)[(m[2] ?? 'mb').toLowerCase()]);
}
const STAFF_MAX = parseSize(process.env.UPLOAD_LIMIT, 50 * MB);
const MEMBER_MAX = num(process.env.UPLOAD_MEMBER_MAX_MB, 2) * MB;
const MEMBER_DAILY_BYTES = num(process.env.UPLOAD_MEMBER_DAILY_MB, 10) * MB;
const MEMBER_DAILY_FILES = num(process.env.UPLOAD_MEMBER_DAILY_FILES, 20);
export const MAX_TOTAL = num(process.env.UPLOAD_MAX_TOTAL_MB, 1800) * MB;
const PER_MIN = num(process.env.RL_UPLOAD_PER_MIN, 10);

/* Allowed types (svg removed: it is never uploaded by the app and can carry scripts). */
type Sig = { ext: string[]; mime: string; test: (b: Buffer) => boolean };
const at = (b: Buffer, off: number, s: string) => b.subarray(off, off + s.length).toString('latin1') === s;
const SIGS: Sig[] = [
  { ext: ['.jpg', '.jpeg'], mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: ['.png'], mime: 'image/png', test: (b) => at(b, 0, '\x89PNG\r\n\x1a\n') },
  { ext: ['.webp'], mime: 'image/webp', test: (b) => at(b, 0, 'RIFF') && at(b, 8, 'WEBP') },
  { ext: ['.gif'], mime: 'image/gif', test: (b) => at(b, 0, 'GIF87a') || at(b, 0, 'GIF89a') },
  { ext: ['.mp3'], mime: 'audio/mpeg', test: (b) => at(b, 0, 'ID3') || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  { ext: ['.m4a', '.mp4', '.aac'], mime: 'audio/mp4', test: (b) => at(b, 4, 'ftyp') || (b[0] === 0xff && (b[1] & 0xf6) === 0xf0) },
  { ext: ['.ogg'], mime: 'audio/ogg', test: (b) => at(b, 0, 'OggS') },
  { ext: ['.wav'], mime: 'audio/wav', test: (b) => at(b, 0, 'RIFF') && at(b, 8, 'WAVE') },
  { ext: ['.pdf'], mime: 'application/pdf', test: (b) => at(b, 0, '%PDF-') },
];
const MEMBER_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export function sanitizeName(raw: string) {
  const base = path.basename(String(raw || 'file')).normalize('NFKC');
  const ext = path.extname(base).toLowerCase().replace(/[^.a-z0-9]/g, '');
  const stem = base.slice(0, base.length - path.extname(base).length).replace(/[^\w\-]+/g, '_').replace(/^[_.-]+/, '').slice(0, 60) || 'file';
  return { name: `${stem}${ext}`, ext };
}

/* ---------- disk usage (cached 60s) ---------- */
let usageCache = { bytes: 0, files: 0, at: 0 };
export function diskUsage(force = false) {
  if (!force && Date.now() - usageCache.at < 60_000) return usageCache;
  let bytes = 0, files = 0;
  try {
    for (const f of fs.readdirSync(UPLOAD_DIR, { withFileTypes: true })) if (f.isFile()) { bytes += fs.statSync(path.join(UPLOAD_DIR, f.name)).size; files++; }
  } catch { /* dir missing */ }
  usageCache = { bytes, files, at: Date.now() };
  return usageCache;
}

const err = (res: Response, status: number, message: string, code?: string) => res.status(status).json({ statusCode: status, error: ({ 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 413: 'Payload Too Large', 429: 'Too Many Requests', 507: 'Insufficient Storage' } as Record<number, string>)[status] ?? 'Error', code, message });

function bearer(req: Request) {
  const h = req.headers.authorization ?? '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : '';
}

export function uploadRouter(publicUrl: string): Router {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const r = express.Router();

  r.post('/upload', async (req, res, next) => {
    // 1) rate limit by IP before doing any work
    const ipWait = hit(`up:ip:${req.ip}`, PER_MIN * 2, 60_000);
    if (ipWait) return tooMany(res, ipWait);
    // 2) session
    const token = bearer(req);
    if (!token) return err(res, 401, 'برای آپلود فایل ابتدا وارد حساب خود شوید.', 'UNAUTHORIZED');
    let member: { id: string; role?: string };
    try { member = (await requireSession(token)).member as { id: string; role?: string }; }
    catch (e) { const x = e as { code?: string; userFacingMessage?: string }; return err(res, x.code === 'FORBIDDEN' ? 403 : 401, x.userFacingMessage || 'نشست شما معتبر نیست؛ دوباره وارد شوید.', x.code); }
    const staff = isStaff(member.role);
    const userWait = hit(`up:user:${member.id}`, PER_MIN, 60_000);
    if (userWait) return tooMany(res, userWait, 'تعداد آپلودها زیاد است؛ یک دقیقه صبر کنید.');
    // 3) type/size policy (checked before reading the body)
    const { name, ext } = sanitizeName(String(req.query.name || 'file'));
    const sig = SIGS.find((s) => s.ext.includes(ext));
    if (!sig) return err(res, 400, 'این نوع فایل مجاز نیست.', 'BAD_TYPE');
    if (!staff && !MEMBER_EXT.has(ext)) return err(res, 400, 'فقط تصویر با فرمت JPG، PNG یا WebP مجاز است.', 'BAD_TYPE');
    const max = staff ? STAFF_MAX : MEMBER_MAX;
    const declared = Number(req.headers['content-length'] ?? 0);
    if (declared > max) return err(res, 413, `حجم فایل بیش از حد مجاز است (حداکثر ${Math.round(max / MB)} مگابایت).`, 'TOO_LARGE');
    // 4) disk guard + member daily quota
    const usage = diskUsage();
    if (usage.bytes + declared > MAX_TOTAL) {
      alert('disk_full', `uploads at ${Math.round(usage.bytes / MB)}MB of ${Math.round(MAX_TOTAL / MB)}MB`);
      if (!staff) return err(res, 507, 'فضای ذخیره‌سازی موقتاً پر است؛ بعداً دوباره تلاش کنید.', 'DISK_FULL');
      res.setHeader('X-Upload-Warning', 'disk-near-full');
    }
    if (!staff) {
      const { rows } = await pool.query(`SELECT COUNT(*)::int AS n, COALESCE(SUM(bytes),0)::bigint AS b FROM "_UploadLog" WHERE member_id = $1 AND at > now() - interval '1 day'`, [member.id]);
      if (rows[0].n >= MEMBER_DAILY_FILES || Number(rows[0].b) + declared > MEMBER_DAILY_BYTES)
        return err(res, 429, 'سهمیه‌ی آپلود امروز شما تمام شده است؛ فردا دوباره امتحان کنید.', 'QUOTA_EXCEEDED');
    }
    next();
    void name;
  }, (req, res, next) => express.raw({ type: () => true, limit: STAFF_MAX })(req, res, next), async (req, res) => {
    const token = bearer(req);
    const { member } = await requireSession(token);
    const staff = isStaff(member.role);
    const body = req.body as Buffer;
    const { name, ext } = sanitizeName(String(req.query.name || 'file'));
    const sig = SIGS.find((s) => s.ext.includes(ext))!;
    const max = staff ? STAFF_MAX : MEMBER_MAX;
    if (!Buffer.isBuffer(body) || !body.length) return err(res, 400, 'فایل خالی است.', 'EMPTY');
    if (body.length > max) return err(res, 413, `حجم فایل بیش از حد مجاز است (حداکثر ${Math.round(max / MB)} مگابایت).`, 'TOO_LARGE');
    if (!sig.test(body)) return err(res, 400, 'محتوای فایل با پسوند آن همخوانی ندارد.', 'BAD_CONTENT');
    if (!staff) {
      const { rows } = await pool.query(`SELECT COALESCE(SUM(bytes),0)::bigint AS b FROM "_UploadLog" WHERE member_id = $1 AND at > now() - interval '1 day'`, [member.id]);
      if (Number(rows[0].b) + body.length > MEMBER_DAILY_BYTES) return err(res, 429, 'سهمیه‌ی آپلود امروز شما تمام شده است؛ فردا دوباره امتحان کنید.', 'QUOTA_EXCEEDED');
      if (diskUsage().bytes + body.length > MAX_TOTAL) return err(res, 507, 'فضای ذخیره‌سازی موقتاً پر است؛ بعداً دوباره تلاش کنید.', 'DISK_FULL');
    }
    const file = `${Date.now().toString(36)}-${crypto.randomBytes(5).toString('hex')}-${name}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, file), body, { flag: 'wx' });
    usageCache.bytes += body.length; usageCache.files++;
    await pool.query(`INSERT INTO "_UploadLog" (member_id, bytes, file) VALUES ($1,$2,$3)`, [member.id, body.length, file]);
    log('info', 'upload', { memberId: member.id, staff, bytes: body.length, file });
    const origin = publicUrl || `${req.protocol}://${req.get('host')}`;
    res.json({ url: `${origin}/uploads/${file}` });
  });

  r.use('/uploads', express.static(UPLOAD_DIR, {
    maxAge: '365d', immutable: true, dotfiles: 'deny', index: false,
    setHeaders: (res, p) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      // Legacy files (e.g. old .svg) can never run scripts on our origin
      if (!/\.(jpe?g|png|webp|gif|mp3|m4a|mp4|aac|ogg|wav)$/i.test(p)) {
        res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
        if (!/\.pdf$/i.test(p)) res.setHeader('Content-Disposition', 'attachment');
      }
    },
  }));
  return r;
}

/* ---------- orphan finder (used by script + admin endpoint) ---------- */
export async function findOrphans() {
  const files = fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR, { withFileTypes: true }).filter((f) => f.isFile()).map((f) => f.name) : [];
  // Every text/json column of every table is scanned for "/uploads/<file>" references.
  const { rows: cols } = await pool.query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND data_type IN ('text','jsonb','character varying') AND table_name NOT LIKE '\\_%'`);
  const referenced = new Set<string>();
  const re = /\/uploads\/([^"'\s)?#]+)/g;
  for (const c of cols) {
    const { rows } = await pool.query(`SELECT "${c.column_name}"::text AS v FROM "${c.table_name}" WHERE "${c.column_name}"::text LIKE '%/uploads/%'`);
    for (const r of rows) for (const m of String(r.v).matchAll(re)) referenced.add(decodeURIComponent(m[1]));
  }
  const orphans = files.filter((f) => !referenced.has(f)).map((f) => ({ file: f, bytes: fs.statSync(path.join(UPLOAD_DIR, f)).size }));
  return { totalFiles: files.length, referenced: referenced.size, orphans, orphanBytes: orphans.reduce((s, o) => s + o.bytes, 0) };
}
export function deleteFiles(names: string[]) {
  let deleted = 0;
  for (const n of names) {
    if (n !== path.basename(n) || n.startsWith('.')) continue;
    try { fs.unlinkSync(path.join(UPLOAD_DIR, n)); deleted++; } catch { /* already gone */ }
  }
  diskUsage(true);
  return deleted;
}
