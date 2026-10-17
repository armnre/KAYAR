import { z } from 'zod';

/**
 * Session token field. The real session secret lives in an httpOnly cookie, so the
 * body field is optional and only kept for backwards compatibility with the
 * previous (Zite) transport.
 */
export const tokenField = z.string().max(200).optional();
export const pageInput = { page: z.number().int().min(1).max(10_000).default(1), pageSize: z.number().int().min(5).max(100).default(20) };

export const publicMember = z.object({
  id: z.string(), username: z.string(), phone: z.string(), displayName: z.string(), role: z.string(), status: z.string(),
  mustChangePassword: z.boolean(), lastLoginAt: z.string().nullable(), createdAt: z.string().nullable(),
  orderRef: z.string(), note: z.string(), tags: z.array(z.string()),
});
export type PublicMember = z.infer<typeof publicMember>;

export const csvCell = (v: unknown) => {
  const s = String(v ?? '');
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s; // CSV injection guard
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
export const toCsv = (rows: unknown[][]) => '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\n');
