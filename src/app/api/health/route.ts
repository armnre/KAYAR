import { sql } from 'drizzle-orm';
import { db } from '@/db';

export const dynamic = 'force-dynamic';

const apiUrl = () => process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000';

/** Liveness + readiness of the whole stack (database and API). */
export async function GET() {
  let dbOk = false;
  try {
    await db.execute(sql`select 1`);
    dbOk = true;
  } catch {
    dbOk = false;
  }
  let apiOk = false;
  try {
    const res = await fetch(`${apiUrl()}/healthz`, { signal: AbortSignal.timeout(3000) });
    apiOk = res.ok;
  } catch {
    apiOk = false;
  }
  const ok = dbOk && apiOk;
  return Response.json(
    { ok, service: 'kayar', database: dbOk ? 'up' : 'down', api: apiOk ? 'up' : 'down', time: new Date().toISOString() },
    { status: ok ? 200 : 503 },
  );
}
