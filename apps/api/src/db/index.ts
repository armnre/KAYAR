import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  console.error(JSON.stringify({ level: 'error', msg: 'postgres pool error', error: err.message }));
});

export const db = drizzle(pool, { schema });

export type Db = typeof db;
export { schema };
