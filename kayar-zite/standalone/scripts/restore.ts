// node scripts/restore.mjs <backup.json.gz> [--force --yes-i-understand]
// Restores a backup made by backup.mjs / the admin "download backup" button.
// Default: only into an EMPTY database. --force --yes-i-understand wipes the existing tables first.
import '../env';
import { pool, migrate } from '../db';
import { importData, readSeedFile } from '../seed';
import { isEmptyDb, countAll } from '../backup';

(async () => {
  if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set.'); process.exit(2); }
  const file = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!file) { console.error('Usage: node scripts/restore.mjs <backup.json.gz> [--force --yes-i-understand]'); process.exit(2); }
  const force = process.argv.includes('--force') && process.argv.includes('--yes-i-understand');
  await migrate();
  if (!(await isEmptyDb()) && !force) {
    console.error('Database is not empty. Refusing to restore. Use --force --yes-i-understand to wipe it first (make a backup before!).');
    process.exit(3);
  }
  const data = readSeedFile(file) as Parameters<typeof importData>[0] & { counts?: Record<string, number> };
  const total = await importData(data, { truncate: force });
  const now = await countAll();
  const mismatches = Object.entries(data.counts ?? {}).filter(([t, n]) => !t.startsWith('link:') && now[t] !== undefined && now[t] !== n);
  console.log(JSON.stringify({ restoredRows: total, counts: now, mismatches }, null, 2));
  console.log('Note: sessions are not part of backups — everyone signs in again. Passwords only work with the same ZITE_AUTH_PEPPER.');
  await pool.end();
  process.exit(mismatches.length ? 4 : 0);
})().catch(async (e) => { console.error((e as Error).message); await pool.end().catch(() => {}); process.exit(1); });
