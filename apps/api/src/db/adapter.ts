import { and, asc, desc, eq, getTableColumns, gt, gte, ilike, inArray, isNull, lt, lte, ne } from 'drizzle-orm';
import { db, pool } from './index.js';

/**
 * Small repository layer that mimics the record API the Kayar endpoints were
 * written against, but backed by real Drizzle/PostgreSQL queries.
 * Only whitelisted operators are supported â€” nothing is interpolated into SQL.
 */

export type Filters = Record<string, unknown>;

type AnyTable = Parameters<typeof getTableColumns>[0];

function buildWhere(table: AnyTable, filters?: Filters) {
  const cols = getTableColumns(table) as Record<string, any>;
  const conds: unknown[] = [];
  for (const [key, value] of Object.entries(filters ?? {})) {
    const col = cols[key];
    if (!col) continue;
    if (value === null) { conds.push(isNull(col)); continue; }
    if (value instanceof Date) { conds.push(eq(col, value)); continue; }
    if (typeof value === 'object' && !Array.isArray(value)) {
      const ops = value as Record<string, unknown>;
      if ('in' in ops) { const list = (ops.in as unknown[]) ?? []; conds.push(list.length ? inArray(col, list as any[]) : eq(col, null)); continue; }
      if ('not' in ops) { conds.push(ne(col, ops.not as any)); continue; }
      if ('like' in ops) { conds.push(ilike(col, ops.like as string)); continue; }
      if ('gt' in ops) { conds.push(gt(col, ops.gt as any)); continue; }
      if ('gte' in ops) { conds.push(gte(col, ops.gte as any)); continue; }
      if ('lt' in ops) { conds.push(lt(col, ops.lt as any)); continue; }
      if ('lte' in ops) { conds.push(lte(col, ops.lte as any)); continue; }
      if ('isNull' in ops) { conds.push(isNull(col)); continue; }
      continue;
    }
    conds.push(eq(col, value as any));
  }
  return conds.length ? and(...(conds as any[])) : undefined;
}

function pickFields(row: Record<string, unknown>, fields?: string[]) {
  if (!fields?.length) return row;
  const out: Record<string, unknown> = {};
  for (const f of fields) if (f in row) out[f] = row[f];
  return out;
}

function stripUndefined(record: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) if (v !== undefined) out[k] = v;
  return out;
}

export type Repo = {
  findOne: (q: { id?: string; filters?: Filters; fields?: string[] }) => Promise<any>;
  findAll: (q?: { filters?: Filters; limit?: number; fields?: string[]; order?: 'asc' | 'desc' }) => Promise<{ records: any[] }>;
  create: (q: { record: Record<string, unknown> }) => Promise<any>;
  update: (q: { id: string; record: Record<string, unknown> }) => Promise<any>;
  delete: (q: { id: string }) => Promise<void>;
};

export function repo(table: AnyTable, executor: any = db): Repo {
  return {
    async findOne({ id, filters, fields }) {
      const where = id ? eq((getTableColumns(table) as any).id, id) : buildWhere(table, filters);
      const rows = await executor.select().from(table).where(where).limit(1);
      const row = rows[0];
      return row ? pickFields(row as Record<string, unknown>, fields) : undefined;
    },
    async findAll({ filters, limit = 1000, fields, order = 'asc' } = {}) {
      const where = buildWhere(table, filters);
      const columns = getTableColumns(table) as Record<string, any>;
      let q = executor.select().from(table);

      if (where) q = q.where(where);

      q = q.limit(Math.max(0, Math.min(Number.isFinite(limit) ? limit : 1000, 5000)));

      // Only order by a column that actually exists on this table.
      const sortColumn = columns.createdAt ?? columns.updatedAt ?? columns.id;
      if (sortColumn) {
        q = order === 'desc'
          ? q.orderBy(desc(sortColumn))
          : q.orderBy(asc(sortColumn));
      }

      const rows = await q;
      return { records: rows.map((r) => pickFields(r as Record<string, unknown>, fields)) };
    },
    async create({ record }) {
      const values = stripUndefined(record);
      const rows = await executor.insert(table).values(values as any).returning();
      return rows[0];
    },
    async update({ id, record }) {
      const values = stripUndefined(record);
      if (!Object.keys(values).length) return undefined;
      const rows = await executor.update(table).set(values as any).where(eq((getTableColumns(table) as any).id, id)).returning();
      return rows[0];
    },
    async delete({ id }) {
      await executor.delete(table).where(eq((getTableColumns(table) as any).id, id));
    },
  };
}

/** Raw SQL passthrough (parameterised). */
export async function rawSql(q: { query: string; params?: unknown[] }): Promise<{ rows: any[] }> {
  const res = await pool.query(q.query, (q.params ?? []) as any[]);
  return { rows: res.rows };
}

/** Runs `fn` inside a real database transaction. */
export async function tx<T>(fn: (t: any) => Promise<T>): Promise<T> {
  return db.transaction(async (trx) => fn(trx));
}

