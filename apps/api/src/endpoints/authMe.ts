import { z } from 'zod';
import { createEndpoint } from '../server/backend.js';
import { requireSession, MATRIX, type Role } from '../server/rbac.js';
import { publicMember, toPublic, tokenField } from '../server/util.js';

export default createEndpoint({
  description: 'Returns the signed-in member for a session token',
  inputSchema: z.object({ token: tokenField }),
  outputSchema: z.object({ member: publicMember, permissions: z.array(z.string()) }),
  execute: async ({ input, ctx }) => {
    const { member } = await requireSession(ctx, { allowPasswordChange: true });
    return { member: toPublic(member), permissions: MATRIX[(member.role ?? 'member') as Role] ?? [] };
  },
});
