// node scripts/backup.mjs [out.json.gz] [--no-manifest]
// Writes every table (seed format, sessions excluded) + an uploads manifest to a gzip JSON file (or stdout with "-").
import '../env';
import fs from 'node:fs';
import { pool } from '../db';
import { streamBackup } from '../backup';
import { setMeta, initOpsTables } from '../log';

(async () => {
  if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set.'); process.exit(2); }
  const out = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? `kayar-backup-${new Date().toISOString().slice(0, 10)}.json.gz`;
  const dest = out === '-' ? process.stdout : fs.createWriteStream(out);
  const counts = await streamBackup(dest, { uploadDir: process.env.UPLOAD_DIR || '/data/uploads', manifest: !process.argv.includes('--no-manifest') });
  await initOpsTables();
  await setMeta('lastBackupAt', new Date().toISOString());
  if (out !== '-') console.error(`Backup written to ${out}: ${Object.values(counts).reduce((a, b) => a + b, 0)} rows`);
  await pool.end();
})().catch(async (e) => { console.error((e as Error).message); await pool.end().catch(() => {}); process.exit(1); });
