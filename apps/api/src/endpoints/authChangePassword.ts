import { z } from 'zod';
import { createEndpoint, ZiteError } from '../server/backend.js';
import { zite } from '../server/db.js';
import { requireSession, revokeAllSessions } from '../server/rbac.js';
import { verifyPassword, hashPassword, passwordPolicyError } from '../server/auth.js';
import { audit } from '../server/audit.js';
import { tokenField } from '../server/util.js';

export default createEndpoint({
  description: 'Changes the signed-in member password and signs out other sessions',
  inputSchema: z.object({ token: tokenField, current: z.string().min(1).max(128), next: z.string().min(1).max(128) }),
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async ({ input, ctx }) => {
    const { member, sessionId } = await requireSession(ctx, { allowPasswordChange: true });
    if (!(await verifyPassword(input.current, member.passwordHash)))
      throw new ZiteError({ code: 'BAD_REQUEST', message: 'bad current', userFacingMessage: 'رمز فعلی درست نیست.' });
    if (input.current === input.next) throw new ZiteError({ code: 'BAD_REQUEST', message: 'same', userFacingMessage: 'رمز جدید نباید با رمز فعلی یکی باشد.' });
    const err = passwordPolicyError(input.next, { username: member.username, phone: member.phone, name: member.displayName });
    if (err) throw new ZiteError({ code: 'BAD_REQUEST', message: 'policy', userFacingMessage: err });
    await zite.members.update({ id: member.id, record: { passwordHash: await hashPassword(input.next), mustChangePassword: false, passwordChangedAt: new Date().toISOString() } });
    await revokeAllSessions(member.id, sessionId);
    await audit(member.id, 'auth.password_changed', 'member', member.id);
    return { ok: true };
  },
});
