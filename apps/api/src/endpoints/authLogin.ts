import { z } from 'zod';
import { createEndpoint, ZiteError } from '../server/backend.js';
import { zite } from '../server/db.js';
import { normalizeUsername, verifyPassword, hashPassword, assertNotLocked, recordFailure, clearAttempts, newToken, sha256, isLegacyHash, MEMBER_TTL, STAFF_TTL } from '../server/auth.js';
import { isStaff, MATRIX, type Role } from '../server/rbac.js';
import { audit } from '../server/audit.js';
import { publicMember, toPublic } from '../server/util.js';

const BAD = 'نام کاربری یا رمز عبور اشتباه است.';

/** Creates the first superadmin from the environment, once. */
async function bootstrap() {
  const u = process.env.ADMIN_BOOTSTRAP_USERNAME, p = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!u || !p) return;
  const existing = await zite.members.findOne({ filters: { role: 'superadmin' } });
  if (existing) return;
  const m = await zite.members.create({ record: { username: normalizeUsername(u), displayName: 'مدیر ارشد', role: 'superadmin', status: 'active', passwordHash: await hashPassword(p), mustChangePassword: false, createdBy: 'bootstrap' } });
  await audit(null, 'bootstrap.superadmin', 'member', m.id);
}

export default createEndpoint({
  description: 'Signs a customer or staff member in with username/phone and password',
  inputSchema: z.object({ username: z.string().min(1).max(64), password: z.string().min(1).max(128), scope: z.enum(['app', 'admin']), userAgent: z.string().max(300).optional() }),
  outputSchema: z.object({ token: z.string(), expiresAt: z.string(), member: publicMember, permissions: z.array(z.string()) }),
  execute: async ({ input, ctx }) => {
    if (input.scope === 'admin') await bootstrap();
    const username = normalizeUsername(input.username);
    const key = `${input.scope}:${username}`;
    const ipKey = `ip:${ctx.ip}`;
    // locked by username *and* by IP
    const attempt = await assertNotLocked(key);
    const ipAttempt = await assertNotLocked(ipKey);
    const m = (await zite.members.findOne({ filters: { username } })) ?? (await zite.members.findOne({ filters: { phone: username } }));
    const ok = await verifyPassword(input.password, m?.passwordHash);
    const scopeOk = m && (input.scope === 'admin' ? isStaff(m.role) : true);
    if (!m || !ok || !scopeOk || m.status === 'deleted') {
      await recordFailure(key, attempt);
      await recordFailure(ipKey, ipAttempt);
      await audit(m?.id ?? null, 'auth.login_failed', 'member', m?.id ?? '', { scope: input.scope });
      throw new ZiteError({ code: 'UNAUTHORIZED', message: 'bad credentials', userFacingMessage: BAD });
    }
    if (m.status === 'suspended') throw new ZiteError({ code: 'FORBIDDEN', message: 'ACCOUNT_SUSPENDED', userFacingMessage: 'حساب شما تعلیق شده است. با پشتیبانی تماس بگیرید.' });
    await clearAttempts(attempt);
    await clearAttempts(ipAttempt);
    // legacy pbkdf2 hashes are upgraded to argon2id right after a successful login
    if (isLegacyHash(m.passwordHash)) {
      const upgraded = await hashPassword(input.password);
      await zite.members.update({ id: m.id, record: { passwordHash: upgraded, passwordChangedAt: new Date().toISOString() } });
    }
    const token = newToken();
    const csrf = newToken();
    const expiresAt = new Date(Date.now() + (isStaff(m.role) ? STAFF_TTL : MEMBER_TTL)).toISOString();
    await zite.sessions.create({ record: { tokenHash: await sha256(token), memberId: m.id, userAgent: input.userAgent?.slice(0, 300) ?? ctx.userAgent.slice(0, 300), csrfToken: csrf, lastSeenAt: new Date().toISOString(), expiresAt } });
    await zite.members.update({ id: m.id, record: { lastLoginAt: new Date().toISOString() } });
    await audit(m.id, 'auth.login', 'member', m.id, { scope: input.scope });
    // the transport moves the session into an httpOnly cookie and returns the CSRF token
    ctx.setSession?.(token, csrf, expiresAt);
    return { token: csrf, expiresAt, member: toPublic(m), permissions: MATRIX[(m.role ?? 'member') as Role] ?? [] };
  },
});
