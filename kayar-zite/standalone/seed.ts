// One-time import of the data exported from Zite (seed/data.json.gz) into an empty database.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pool, SCHEMA } from './db';

type Seed = { tables: Record<string, Record<string, unknown>[]>; links: Record<string, Record<string, unknown>[]> };
const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
const GENERATED = new Set(['created', 'updated', 'auto']);
const JSONB = (k: unknown) => typeof k === 'object' || k === 'user' || k === 'multi' || k === 'att';

export async function importSeedIfEmpty() {
  const file = process.env.SEED_FILE || path.resolve('seed/data.json.gz');
  if (!fs.existsSync(file)) { console.log('No seed file; starting with an empty database.'); return; }
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM "Exercises"');
  if (rows[0].n > 0) return;
  const seed = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8')) as Seed;
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    let total = 0;
    for (const [tname, recs] of Object.entries(seed.tables)) {
      const def = SCHEMA[tname];
      if (!def) continue;
      const cols = ['id', 'created_at', 'updated_at', ...Object.keys(def.fields).filter((f) => !GENERATED.has(def.fields[f] as string))];
      for (const r of recs) {
        const vals = cols.map((col) => {
          const v = r[col];
          if (v === undefined || v === null) return col === 'created_at' || col === 'updated_at' ? new Date().toISOString() : null;
          return JSONB(def.fields[col]) ? JSON.stringify(Array.isArray(v) ? v : [v]) : typeof v === 'object' ? JSON.stringify(v) : v;
        });
        await c.query(`INSERT INTO ${q(tname)} (${cols.map(q).join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) ON CONFLICT (id) DO NOTHING`, vals);
        total++;
      }
      await c.query(`SELECT setval(pg_get_serial_sequence('${q(tname)}', 'autonumber_id'), GREATEST((SELECT COALESCE(MAX(autonumber_id), 0) FROM ${q(tname)}), 1))`);
    }
    for (const [lname, recs] of Object.entries(seed.links)) {
      for (const r of recs) {
        const cols = Object.keys(r);
        await c.query(`INSERT INTO ${q(lname)} (${cols.map(q).join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) ON CONFLICT DO NOTHING`, cols.map((k) => r[k]));
      }
    }
    await c.query('COMMIT');
    console.log(`Seed imported: ${total} records.`);
  } catch (e) {
    await c.query('ROLLBACK');
    console.error('Seed import failed:', e);
  } finally { c.release(); }
}
