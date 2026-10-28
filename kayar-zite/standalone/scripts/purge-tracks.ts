// One-time, idempotent: deletes ALL music tracks (and their collection items / favorites / history),
// then removes orphaned upload files and stale media-cache entries. Podcasts are not touched.
// Run inside the container:  node scripts/purge-tracks.mjs --yes
import '../env';
import { pool, migrate } from '../db';
import { findOrphans, deleteFiles } from '../uploads';
import { pruneMediaCache } from '../media';

(async () => {
  if (!process.argv.includes('--yes')) { console.log('Dry run. Add --yes to delete all tracks.'); }
  await migrate();
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM "Tracks"`);
  console.log(`tracks: ${rows[0].n}`);
  if (process.argv.includes('--yes')) {
    await pool.query(`DELETE FROM "CollectionItems"`);
    await pool.query(`DELETE FROM "Favorites" WHERE "itemKey" LIKE 'lib:%' OR "trackId" IS NOT NULL`);
    await pool.query(`DELETE FROM "ListeningHistory" WHERE "itemKey" LIKE 'lib:%' OR "trackId" IS NOT NULL`);
    await pool.query(`DELETE FROM "Tracks"`);
    console.log('tracks deleted');
  }
  const o = await findOrphans();
  const audio = o.orphans.filter((f) => /\.(mp3|m4a|aac|ogg|wav)$/i.test(f.file));
  console.log(`orphan audio files: ${audio.length} (${Math.round(audio.reduce((s, f) => s + f.bytes, 0) / 1048576)} MB)`);
  if (process.argv.includes('--yes')) { console.log(`deleted files: ${deleteFiles(audio.map((f) => f.file))}`); console.log(`media cache pruned: ${await pruneMediaCache()}`); }
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
