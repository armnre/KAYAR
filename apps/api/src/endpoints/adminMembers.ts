import { z } from 'zod';
import { createEndpoint } from '../server/backend.js';
import { zite } from '../server/db.js';
import { requireStaff, STAFF_ROLES } from '../server/rbac.js';
import { publicMember, tokenField, pageInput, toCsv } from '../server/util.js';
import { latinDigits } from '../server/auth.js';

export default createEndpoint({
  description: 'Lists customers or staff with search, filters, sorting and pagination (optionally as CSV)',
  inputSchema: z.object({
    token: tokenField,
    kind: z.enum(['customer', 'staff']),
    q: z.string().max(80).optional(),
    status: z.enum(['all', 'active', 'suspended']).default('all'),
    flag: z.enum(['none', 'neverLoggedIn', 'mustChange']).default('none'),
    createdFrom: z.string().max(30).optional(),
    sort: z.enum(['newest', 'oldest', 'name', 'lastLogin']).default('newest'),
    csv: z.boolean().optional(),
    ...pageInput,
  }),
  outputSchema: z.object({ rows: z.array(publicMember), total: z.number(), csv: z.string().optional() }),
  execute: async ({ input, ctx }) => {
    await requireStaff(ctx, input.kind === 'staff' ? 'staff.manage' : 'customers.read');
    const params: unknown[] = [];
    const where = [`"status" <> 'deleted'`];
    if (input.kind === 'customer') where.push(`"role" = 'member'`);
    else { params.push(STAFF_ROLES); where.push(`"role" = ANY($${params.length})`); }
    if (input.status !== 'all') { params.push(input.status); where.push(`"status" = $${params.length}`); }
    if (input.flag === 'neverLoggedIn') where.push(`"last_login_at" IS NULL`);
    if (input.flag === 'mustChange') where.push(`"must_change_password" = true`);
    if (input.createdFrom) { params.push(input.createdFrom); where.push(`created_at >= $${params.length}::timestamptz`); }
    if (input.q?.trim()) {
      params.push(`%${latinDigits(input.q.trim()).toLowerCase()}%`);
      const p = `$${params.length}`;
      where.push(`(LOWER("username") LIKE ${p} OR "phone" LIKE ${p} OR LOWER("display_name") LIKE ${p} OR LOWER(COALESCE("order_ref",'')) LIKE ${p} OR "display_name" LIKE $${params.push(`%${input.q.trim()}%`)})`);
    }
    const order = { newest: 'created_at DESC', oldest: 'created_at ASC', name: '"display_name" ASC', lastLogin: '"last_login_at" DESC NULLS LAST' }[input.sort];
    const w = where.join(' AND ');
    const cols = `id, "username", "phone", "display_name", "role", "status", "must_change_password", "last_login_at", created_at AS "createdAt", "order_ref", "note", "tags"`;
    const limit = input.csv ? 2000 : input.pageSize;
    const offset = input.csv ? 0 : (input.page - 1) * input.pageSize;
    const [rowsRes, countRes] = await Promise.all([
      zite.sql({ query: `SELECT ${cols} FROM "members" WHERE ${w} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`, params }),
      zite.sql({ query: `SELECT COUNT(*) AS n FROM "members" WHERE ${w}`, params }),
    ]);
    const rows = rowsRes.rows.map((r) => ({
      id: String(r.id), username: String(r.username ?? ''), phone: String(r.phone ?? ''), displayName: String(r.displayName ?? ''), role: String(r.role ?? 'member'), status: String(r.status ?? 'active'),
      mustChangePassword: !!r.mustChangePassword, lastLoginAt: r.lastLoginAt ? String(r.lastLoginAt) : null, createdAt: r.createdAt ? String(r.createdAt) : null,
      orderRef: String(r.orderRef ?? ''), note: String(r.note ?? ''), tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
    }));
    const csv = input.csv
      ? toCsv([['name', 'username', 'phone', 'orderRef', 'status', 'mustChangePassword', 'lastLoginAt', 'createdAt'], ...rows.map((r) => [r.displayName, r.username, r.phone, r.orderRef, r.status, r.mustChangePassword, r.lastLoginAt ?? '', r.createdAt ?? ''])])
      : undefined;
    return { rows, total: Number(countRes.rows[0]?.n ?? 0), csv };
  },
});
