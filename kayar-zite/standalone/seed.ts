// Imports data in the seed/backup format ({ tables, links }) — used for the first-run seed and for restore.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pool, SCHEMA } from './db';

export type Seed = { tables: Record<string, Record<string, unknown>[]>; links: Record<string, Record<string, unknown>[]> };
const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
const GENERATED = new Set(['created', 'updated', 'auto']);
const JSONB = (k: unknown) => typeof k === 'object' || k === 'user' || k === 'multi' || k === 'att';

export function readSeedFile(file: string): Seed {
  return JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8')) as Seed;
}

/** Inserts every record in one transaction. `truncate` empties the known tables first (restore --force). */
export async function importData(seed: Seed, opts: { truncate?: boolean } = {}) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    if (opts.truncate) {
      const names = [...Object.keys(SCHEMA), ...Object.keys(seed.links ?? {})];
      for (const n of names) await c.query(`TRUNCATE ${q(n)}`).catch(() => {});
    }
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
    for (const [lname, recs] of Object.entries(seed.links ?? {})) {
      for (const r of recs) {
        const cols = Object.keys(r);
        await c.query(`INSERT INTO ${q(lname)} (${cols.map(q).join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) ON CONFLICT DO NOTHING`, cols.map((k) => r[k]));
      }
    }
    await c.query('COMMIT');
    return total;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally { c.release(); }
}

/** One-time import of seed/data.json.gz into an empty database. */
export async function importSeedIfEmpty() {
  const file = process.env.SEED_FILE || path.resolve('seed/data.json.gz');
  if (!fs.existsSync(file)) { console.log('No seed file; starting with an empty database.'); return; }
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM "Exercises"');
  if (rows[0].n > 0) return;
  try {
    const total = await importData(readSeedFile(file));
    console.log(`Seed imported: ${total} records.`);
  } catch (e) {
    console.error('Seed import failed:', (e as Error).message);
  }
}
