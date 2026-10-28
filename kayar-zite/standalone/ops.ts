// Admin/ops HTTP routes (Bearer session token): system health, streamed backup download, orphan uploads.
import express, { type Request, type Response, type Router } from 'express';
import crypto from 'node:crypto';
import { pool } from './db';
import { requireStaff, type Permission } from '../apps/kayar/src/server/rbac';
import { diskUsage, findOrphans, deleteFiles, MAX_TOTAL, UPLOAD_DIR } from './uploads';
import { streamBackup } from './backup';
import { getMeta, setMeta, log, alert } from './log';

declare const __APP_VERSION__: string;
export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
const MB = 1024 * 1024;

const bearer = (req: Request) => { const h = req.headers.authorization ?? ''; return h.startsWith('Bearer ') ? h.slice(7).trim() : ''; };
async function staff(req: Request, res: Response, perm: Permission) {
  try { return (await requireStaff(bearer(req), perm)).member; }
  catch (e) { const x = e as { code?: string; userFacingMessage?: string }; const s = x.code === 'FORBIDDEN' ? 403 : 401; res.status(s).json({ statusCode: s, error: s === 403 ? 'Forbidden' : 'Unauthorized', message: x.userFacingMessage || 'دسترسی ندارید.' }); return null; }
}

export async function healthReport() {
  let db = 'ok';
  try { await pool.query('SELECT 1'); } catch { db = 'down'; }
  const u = diskUsage();
  let errors24h = -1;
  try { errors24h = Number((await pool.query(`SELECT COUNT(*)::int AS n FROM "_SystemErrors" WHERE at > now() - interval '24 hours'`)).rows[0].n); } catch { /* db down */ }
  const usedPct = Math.round((u.bytes / MAX_TOTAL) * 100);
  if (usedPct >= 95) alert('disk_full', `uploads ${usedPct}% of limit`);
  return { db, version: APP_VERSION, uptimeSec: Math.round(process.uptime()), disk: { usedMB: Math.round(u.bytes / MB), files: u.files, limitMB: Math.round(MAX_TOTAL / MB), usedPct }, errors24h, lastBackupAt: await getMeta('lastBackupAt') };
}

export function opsRouter(): Router {
  const r = express.Router();
  r.use(express.json({ limit: '64kb' }));

  r.get('/healthz', async (req, res, next) => {
    if (req.query.deep !== '1') return next();
    const tok = process.env.HEALTH_TOKEN;
    const given = String(req.headers['x-health-token'] ?? '');
    const okToken = !!tok && given.length === tok.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(tok));
    if (!okToken && !(await staff(req, res, 'dashboard.read'))) return;
    const h = await healthReport();
    res.status(h.db === 'ok' ? 200 : 503).json(h);
  });

  r.get('/ops/health', async (req, res) => {
    if (!(await staff(req, res, 'dashboard.read'))) return;
    const h = await healthReport();
    const { rows } = await pool.query(`SELECT at, route, status, message FROM "_SystemErrors" ORDER BY id DESC LIMIT 10`).catch(() => ({ rows: [] as unknown[] }));
    res.json({ ...h, recentErrors: rows });
  });

  r.get('/ops/backup', async (req, res) => {
    const m = await staff(req, res, 'settings.manage');
    if (!m) return;
    const name = `kayar-backup-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json.gz`;
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.setHeader('Cache-Control', 'no-store');
    try {
      const counts = await streamBackup(res, { uploadDir: UPLOAD_DIR, manifest: req.query.manifest !== '0' });
      await setMeta('lastBackupAt', new Date().toISOString());
      log('info', 'backup downloaded', { by: m.id, tables: Object.keys(counts).length });
    } catch (e) {
      log('error', 'backup failed', { error: (e as Error).message });
      res.destroy();
    }
  });

  r.post('/ops/orphans', async (req, res) => {
    if (!(await staff(req, res, 'settings.manage'))) return;
    const report = await findOrphans();
    const confirm = req.body?.confirm === 'DELETE';
    if (!confirm) return res.json({ dryRun: true, ...report });
    const deleted = deleteFiles(report.orphans.map((o) => o.file));
    log('warn', 'orphan uploads deleted', { deleted });
    res.json({ dryRun: false, deleted, ...report });
  });
  return r;
}
