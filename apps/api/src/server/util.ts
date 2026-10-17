import { z } from 'zod';
import { publicMember, toCsv as sharedToCsv, type PublicMember } from '@kayar/shared';

export const tokenField = z.string().max(200).optional();
export const pageInput = { page: z.number().int().min(1).max(10_000).default(1), pageSize: z.number().int().min(5).max(100).default(20) };

export { publicMember };
export type { PublicMember };

/** Strips the password hash — never send it to the client. */
export function toPublic(m: Record<string, any>): PublicMember {
  return {
    id: m.id, username: m.username ?? '', phone: m.phone ?? '', displayName: m.displayName ?? '', role: m.role ?? 'member', status: m.status ?? 'active',
    mustChangePassword: !!m.mustChangePassword, lastLoginAt: m.lastLoginAt ?? null, createdAt: m.createdAt ?? null,
    orderRef: m.orderRef ?? '', note: m.note ?? '', tags: Array.isArray(m.tags) ? m.tags : [],
  };
}

export const csvCell = (v: unknown) => {
  const s = String(v ?? '');
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s; // CSV injection guard
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
export const toCsv = sharedToCsv;
