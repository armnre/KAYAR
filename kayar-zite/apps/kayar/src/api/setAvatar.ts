import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireSession } from '../server/rbac';
import { tokenField } from '../server/util';

export default createEndpoint({
  description: 'Saves the signed-in member profile avatar choice',
  inputSchema: z.object({ token: tokenField, avatar: z.string().regex(/^(a\d{1,3})?$/) }),
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async ({ input }) => {
    const { member } = await requireSession(input.token);
    await zite.members.update({ id: member.id, record: { avatar: input.avatar } });
    return { ok: true };
  },
});
