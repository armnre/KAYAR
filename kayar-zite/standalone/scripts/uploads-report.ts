// node scripts/uploads-report.mjs [--delete-orphans --yes]
// Disk usage of UPLOAD_DIR and files no database record references. Dry-run unless both flags are given.
import '../env';
import { pool } from '../db';
import { diskUsage, findOrphans, deleteFiles, MAX_TOTAL } from '../uploads';

(async () => {
  const u = diskUsage(true);
  const r = await findOrphans();
  const MB = 1024 * 1024;
  console.log(JSON.stringify({ usedMB: +(u.bytes / MB).toFixed(1), limitMB: MAX_TOTAL / MB, files: u.files, referenced: r.referenced, orphanCount: r.orphans.length, orphanMB: +(r.orphanBytes / MB).toFixed(1), orphans: r.orphans.slice(0, 200) }, null, 2));
  if (process.argv.includes('--delete-orphans') && process.argv.includes('--yes')) console.log(`Deleted ${deleteFiles(r.orphans.map((o) => o.file))} orphan files.`);
  else if (r.orphans.length) console.log('Dry run. Re-run with --delete-orphans --yes to delete them.');
  await pool.end();
})().catch(async (e) => { console.error((e as Error).message); await pool.end().catch(() => {}); process.exit(1); });
