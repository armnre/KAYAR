// Self-hosted replacement for `zitejs/db`: same API (findAll/findOne/create/update/delete/bulkCreate/sql)
// on top of PostgreSQL. Tables/columns use the exact SDK names, so the app's raw SQL runs unchanged.
import pg from 'pg';
import schemaJson from './schema.json';

type Kind = string | { link: true; table: string; inverse: boolean };
type TableDef = { key: string; fields: Record<string, Kind> };
export const SCHEMA = schemaJson as unknown as Record<string, TableDef>;

// Return timestamps/dates/bigints the way Zite does (ISO strings, numbers)
pg.types.setTypeParser(1184, (v) => (v === null ? null : new Date(v).toISOString())); // timestamptz
pg.types.setTypeParser(1114, (v) => (v === null ? null : new Date(v + 'Z').toISOString())); // timestamp
pg.types.setTypeParser(1082, (v) => v); // date
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v))); // int8
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v))); // numeric

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_SIZE || 10),
  ssl: process.env.DATABASE_SSL === '1' ? { rejectUnauthorized: false } : undefined,
});

const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
const pascal = (k: string) => k[0].toUpperCase() + k.slice(1);
const isLink = (k: Kind): k is { link: true; table: string; inverse: boolean } => typeof k === 'object';
const JSONB_KINDS = new Set(['user', 'multi', 'att']);
const READONLY = new Set(['created', 'updated', 'auto']);

export function linkTableName(a: string, b: string) {
  const [x, y] = [pascal(a), pascal(b)].sort();
  return { name: x + y, colA: a + 'Id', colB: b + 'Id' };
}

function colType(k: Kind) {
  if (isLink(k)) return 'jsonb';
  return ({ number: 'double precision', bool: 'boolean', ts: 'timestamptz', date: 'date', user: 'jsonb', multi: 'jsonb', att: 'jsonb' } as Record<string, string>)[k] ?? 'text';
}

/** Creates any missing tables/columns (idempotent; safe to run on every start). */
export async function migrate() {
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  for (const [tname, def] of Object.entries(SCHEMA)) {
    await pool.query(`CREATE TABLE IF NOT EXISTS ${q(tname)} (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      autonumber_id bigserial)`);
    for (const [f, k] of Object.entries(def.fields)) {
      const ddl = k === 'created' ? 'timestamptz GENERATED ALWAYS AS (created_at) STORED'
        : k === 'updated' ? 'timestamptz GENERATED ALWAYS AS (updated_at) STORED'
        : k === 'auto' ? 'bigint GENERATED ALWAYS AS (autonumber_id) STORED'
        : colType(k);
      await pool.query(`ALTER TABLE ${q(tname)} ADD COLUMN IF NOT EXISTS ${q(f)} ${ddl}`);
      if (isLink(k)) {
        const lt = linkTableName(def.key, k.table);
        await pool.query(`CREATE TABLE IF NOT EXISTS ${q(lt.name)} (${q(lt.colA)} uuid NOT NULL, ${q(lt.colB)} uuid NOT NULL, PRIMARY KEY (${q(lt.colA)}, ${q(lt.colB)}))`);
      }
    }
  }
}

const tableByKey = (key: string) => Object.entries(SCHEMA).find(([, d]) => d.key === key)!;

function toDb(k: Kind, v: unknown) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (isLink(k) || k === 'user' || k === 'multi') return JSON.stringify(Array.isArray(v) ? v : v === '' ? [] : [v]);
  if (k === 'att') return JSON.stringify((Array.isArray(v) ? v : [v]).map((a) => (typeof a === 'string' ? { url: a, filename: a.split('/').pop() } : a)));
  if (k === 'number') { if (v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; }
  if (k === 'bool') return Boolean(v);
  if (k === 'ts' || k === 'date') { if (v === '') return null; const d = new Date(v as string); return Number.isNaN(d.getTime()) ? null : k === 'date' ? d.toISOString().slice(0, 10) : d.toISOString(); }
  return typeof v === 'string' ? v : JSON.stringify(v);
}

function fromDb(def: TableDef, row: Record<string, unknown>) {
  const out: Record<string, unknown> = { id: row.id };
  for (const [f, k] of Object.entries(def.fields)) {
    const v = row[f];
    if (v === null || v === undefined) continue;
    if (k === 'user') { const a = v as string[]; if (a.length) out[f] = a.length === 1 ? a[0] : a; continue; }
    if ((isLink(k) || k === 'multi' || k === 'att') && Array.isArray(v) && !v.length) continue;
    out[f] = v;
  }
  return out;
}

type Filter = Record<string, unknown>;
function where(def: TableDef, filters: Filter | undefined, params: unknown[]) {
  const parts: string[] = [];
  const P = (v: unknown) => { params.push(v); return `$${params.length}`; };
  for (const [f, raw] of Object.entries(filters ?? {})) {
    if (raw === undefined) throw new Error(`Filter "${f}" is undefined`);
    const k: Kind = f === 'id' ? 'text' : def.fields[f];
    if (k === undefined) throw new Error(`Unknown field "${f}"`);
    const col = f === 'id' ? 'id::text' : q(f);
    const arr = isLink(k) || k === 'user' || k === 'multi';
    const eq = (v: unknown) => (v === null ? `${col} IS NULL` : arr ? `${col} @> ${P(JSON.stringify([v]))}::jsonb` : `${col} = ${P(toDb(k, v) ?? v)}`);
    const isOps = raw !== null && typeof raw === 'object' && !Array.isArray(raw) && !(raw instanceof Date);
    if (!isOps) { parts.push(eq(raw)); continue; }
    for (const [op, v] of Object.entries(raw as Record<string, unknown>)) {
      if (op === 'not') parts.push(v === null ? (arr ? `(${col} IS NOT NULL AND ${col} <> '[]'::jsonb)` : `${col} IS NOT NULL`) : arr ? `NOT (COALESCE(${col},'[]'::jsonb) @> ${P(JSON.stringify([v]))}::jsonb)` : `${col} IS DISTINCT FROM ${P(toDb(k, v))}`);
      else if (op === 'in') { const a = v as unknown[]; parts.push(!a.length ? 'false' : arr ? `${col} ?| ${P(a.map(String))}::text[]` : `${col} = ANY(${P(a.map((x) => toDb(k, x)))})`); }
      else if (op === 'notIn') { const a = v as unknown[]; if (a.length) parts.push(arr ? `NOT (COALESCE(${col},'[]'::jsonb) ?| ${P(a.map(String))}::text[])` : `(${col} IS NULL OR NOT (${col} = ANY(${P(a.map((x) => toDb(k, x)))})))`); }
      else if (op === 'contains') parts.push(arr ? `${col}::text ILIKE ${P(`%${v}%`)}` : `${col} ILIKE ${P(`%${v}%`)}`);
      else { const o = ({ lt: '<', lte: '<=', gt: '>', gte: '>=' } as Record<string, string>)[op]; if (!o) throw new Error(`Unknown operator ${op}`); parts.push(`${col} ${o} ${P(toDb(k, v))}`); }
    }
  }
  return parts.length ? `WHERE ${parts.join(' AND ')}` : '';
}

async function syncLinks(def: TableDef, id: string, record: Record<string, unknown>, c: pg.PoolClient | pg.Pool) {
  for (const [f, k] of Object.entries(def.fields)) {
    if (!isLink(k) || record[f] === undefined) continue;
    const ids = (record[f] === null ? [] : Array.isArray(record[f]) ? record[f] : [record[f]]) as string[];
    const lt = linkTableName(def.key, k.table);
    const mine = def.key + 'Id', other = k.table + 'Id';
    void lt.colA;
    await c.query(`DELETE FROM ${q(lt.name)} WHERE ${q(mine)} = $1`, [id]);
    for (const o of ids) await c.query(`INSERT INTO ${q(lt.name)} (${q(mine)}, ${q(other)}) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [id, o]);
    // keep the inverse column on the other table in step
    const [otherTable, otherDef] = tableByKey(k.table);
    const inv = Object.entries(otherDef.fields).find(([, ok]) => isLink(ok) && ok.table === def.key)?.[0];
    if (inv) await c.query(`UPDATE ${q(otherTable)} t SET ${q(inv)} = COALESCE((SELECT jsonb_agg(l.${q(mine)}::text) FROM ${q(lt.name)} l WHERE l.${q(other)} = t.id), '[]'::jsonb) WHERE t.id::text = ANY($1) OR t.${q(inv)} ? $2`, [ids, id]);
  }
}

function createTableClient(tname: string) {
  const def = SCHEMA[tname];
  const writable = (rec: Record<string, unknown>) => Object.entries(rec).filter(([f, v]) => v !== undefined && def.fields[f] !== undefined && !READONLY.has(def.fields[f] as string));

  async function insert(rec: Record<string, unknown>) {
    const cols = writable(rec);
    const params = cols.map(([f, v]) => toDb(def.fields[f], v));
    const sql = cols.length
      ? `INSERT INTO ${q(tname)} (${cols.map(([f]) => q(f)).join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) RETURNING *`
      : `INSERT INTO ${q(tname)} DEFAULT VALUES RETURNING *`;
    const { rows } = await pool.query(sql, params);
    await syncLinks(def, rows[0].id, rec, pool);
    return fromDb(def, rows[0]);
  }
  async function patch(id: string, rec: Record<string, unknown>) {
    const cols = writable(rec);
    const params: unknown[] = [id, ...cols.map(([f, v]) => toDb(def.fields[f], v))];
    const set = [...cols.map(([f], i) => `${q(f)} = $${i + 2}`), 'updated_at = now()'].join(', ');
    const { rows } = await pool.query(`UPDATE ${q(tname)} SET ${set} WHERE id::text = $1 RETURNING *`, params);
    if (!rows[0]) throw Object.assign(new Error('Record not found'), { status: 404 });
    await syncLinks(def, id, rec, pool);
    return fromDb(def, rows[0]);
  }

  return {
    async findAll(p: { filters?: Filter; limit?: number; offset?: number } = {}) {
      const params: unknown[] = [];
      const limit = Math.min(p.limit ?? 500, 2000);
      const { rows } = await pool.query(`SELECT * FROM ${q(tname)} ${where(def, p.filters, params)} ORDER BY autonumber_id LIMIT ${limit + 1} OFFSET ${Number(p.offset ?? 0)}`, params);
      return { records: rows.slice(0, limit).map((r) => fromDb(def, r)), hasMore: rows.length > limit };
    },
    async findOne(p: { id?: string; filters?: Filter }) {
      const params: unknown[] = [];
      const filters = { ...(p.filters ?? {}), ...(p.id ? { id: p.id } : {}) };
      const { rows } = await pool.query(`SELECT * FROM ${q(tname)} ${where(def, filters, params)} ORDER BY autonumber_id LIMIT 1`, params);
      return rows[0] ? fromDb(def, rows[0]) : undefined;
    },
    create: async ({ record }: { record: Record<string, unknown> }) => {
      if (!record) throw new Error('Create requires record data');
      return insert(record);
    },
    async update({ id, record }: { id: string; record: Record<string, unknown> }) {
      if (!id || !record) throw new Error('Update requires id and record data');
      const r = await patch(id, record);
      return { id, fields: r };
    },
    async delete({ id }: { id: string }) {
      await pool.query(`DELETE FROM ${q(tname)} WHERE id::text = $1`, [id]);
      for (const [f, k] of Object.entries(def.fields)) {
        if (!isLink(k)) continue;
        const lt = linkTableName(def.key, k.table);
        await pool.query(`DELETE FROM ${q(lt.name)} WHERE ${q(def.key + 'Id')} = $1`, [id]).catch(() => {});
        void f;
      }
      return { success: true as const, id };
    },
    async bulkCreate({ records, matchOn }: { records: Record<string, unknown>[]; matchOn?: string[] }) {
      if (records.length > 100) throw Object.assign(new Error('bulkCreate accepts at most 100 records'), { status: 400 });
      const out: Record<string, unknown>[] = [];
      for (const rec of records) {
        if (matchOn?.length) {
          const filters = Object.fromEntries(matchOn.map((f) => [f, rec[f] ?? null]));
          const params: unknown[] = [];
          const { rows } = await pool.query(`SELECT id FROM ${q(tname)} ${where(def, filters, params)} LIMIT 1`, params);
          if (rows[0]) { out.push(await patch(rows[0].id, rec)); continue; }
        }
        out.push(await insert(rec));
      }
      return { success: true, records: out };
    },
  };
}

async function sql({ query, params }: { query: string; params?: unknown[] }) {
  if (!/^\s*(with|select)\b/i.test(query) || /;\s*\S/.test(query)) throw new Error('Only single SELECT statements are allowed');
  const r = await pool.query({ text: query, values: params ?? [] });
  const rows = r.rows.slice(0, 2000);
  return { rows, columns: r.fields.map((f) => ({ name: f.name, originalName: f.name })), rowCount: rows.length, truncated: r.rows.length > 2000 };
}

const auth = {
  async findAllUsers() { return { records: [], total: 0, hasMore: false }; },
  async updateUserProfile() { return {}; },
};

export const zite: Record<string, any> = { sql, auth }; // eslint-disable-line @typescript-eslint/no-explicit-any
for (const [tname, def] of Object.entries(SCHEMA)) zite[def.key] = createTableClient(tname);
