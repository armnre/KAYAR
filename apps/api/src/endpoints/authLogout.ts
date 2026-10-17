import { z } from 'zod';
import { createEndpoint } from '../server/backend.js';
import { zite } from '../server/db.js';
import { requireSession, revokeAllSessions } from '../server/rbac.js';
import { audit } from '../server/audit.js';
import { tokenField } from '../server/util.js';

export default createEndpoint({
  description: 'Signs out the current session, or all sessions',
  inputSchema: z.object({ token: tokenField, all: z.boolean().optional() }),
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async ({ input, ctx }) => {
    const { member, sessionId } = await requireSession(ctx, { allowPasswordChange: true });
    if (input.all) await revokeAllSessions(member.id);
    else await zite.sessions.update({ id: sessionId, record: { revokedAt: new Date().toISOString() } });
    await audit(member.id, input.all ? 'auth.logout_all' : 'auth.logout', 'member', member.id);
    return { ok: true };
  },
});
