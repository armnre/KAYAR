// Backup/restore in the seed format ({ tables, links } → data.json.gz). Streams; never buffers the whole DB.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import type { Writable } from 'node:stream';
import { pool, SCHEMA, linkTableName } from './db';

const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
/** Session/attempt rows are never exported (they are secrets-equivalent and useless after restore). */
export const SKIP_TABLES = new Set(['Sessions', 'LoginAttempts']);
const GENERATED = new Set(['created', 'updated', 'auto']);

function linkTables() {
  const out = new Set<string>();
  for (const def of Object.values(SCHEMA)) for (const k of Object.values(def.fields)) if (typeof k === 'object') out.add(linkTableName(def.key, k.table).name);
  return [...out];
}

function write(out: Writable, s: string) {
  return out.write(s) ? Promise.resolve() : new Promise<void>((r) => out.once('drain', () => r()));
}

export async function uploadsManifest(dir: string) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir, { withFileTypes: true }).filter((f) => f.isFile());
  const out: { name: string; size: number; sha256: string }[] = [];
  for (const f of files) {
    const p = path.join(dir, f.name);
    const h = crypto.createHash('sha256');
    await new Promise<void>((res, rej) => fs.createReadStream(p).on('data', (c) => h.update(c)).on('end', () => res()).on('error', rej));
    out.push({ name: f.name, size: fs.statSync(p).size, sha256: h.digest('hex') });
  }
  return out;
}

/** Writes gzip(JSON) to `dest`. Returns record counts per table. */
export async function streamBackup(dest: Writable, opts: { uploadDir?: string; manifest?: boolean } = {}) {
  const gz = zlib.createGzip({ level: 6 });
  gz.pipe(dest);
  const counts: Record<string, number> = {};
  await write(gz, `{"format":"kayar-backup-1","createdAt":${JSON.stringify(new Date().toISOString())},"tables":{`);
  let firstT = true;
  for (const [tname, def] of Object.entries(SCHEMA)) {
    const cols = ['id', 'created_at', 'updated_at', ...Object.keys(def.fields).filter((f) => !GENERATED.has(def.fields[f] as string))];
    await write(gz, `${firstT ? '' : ','}${JSON.stringify(tname)}:[`);
    firstT = false;
    counts[tname] = 0;
    if (!SKIP_TABLES.has(tname)) {
      let last = 0;
      for (;;) {
        const { rows } = await pool.query(`SELECT autonumber_id AS __n, ${cols.map(q).join(',')} FROM ${q(tname)} WHERE autonumber_id > $1 ORDER BY autonumber_id LIMIT 500`, [last]);
        for (const r of rows) {
          last = Number(r.__n); delete r.__n;
          for (const k of Object.keys(r)) if (r[k] === null) delete r[k];
          await write(gz, `${counts[tname] ? ',' : ''}${JSON.stringify(r)}`);
          counts[tname]++;
        }
        if (rows.length < 500) break;
      }
    }
    await write(gz, ']');
  }
  await write(gz, '},"links":{');
  let firstL = true;
  for (const l of linkTables()) {
    const exists = await pool.query(`SELECT to_regclass($1) AS t`, [`public.${q(l)}`]);
    if (!exists.rows[0].t) continue;
    const { rows } = await pool.query(`SELECT * FROM ${q(l)}`);
    await write(gz, `${firstL ? '' : ','}${JSON.stringify(l)}:${JSON.stringify(rows)}`);
    firstL = false;
    counts[`link:${l}`] = rows.length;
  }
  await write(gz, '}');
  if (opts.manifest !== false && opts.uploadDir) await write(gz, `,"uploadsManifest":${JSON.stringify(await uploadsManifest(opts.uploadDir))}`);
  await write(gz, `,"counts":${JSON.stringify(counts)}}`);
  await new Promise<void>((res) => { dest.once('finish', () => res()); dest.once('close', () => res()); gz.end(); });
  return counts;
}

export async function countAll() {
  const out: Record<string, number> = {};
  for (const t of Object.keys(SCHEMA)) out[t] = Number((await pool.query(`SELECT COUNT(*)::int AS n FROM ${q(t)}`)).rows[0].n);
  return out;
}

export async function isEmptyDb() {
  const c = await countAll();
  return Object.entries(c).every(([t, n]) => SKIP_TABLES.has(t) || n === 0);
}
