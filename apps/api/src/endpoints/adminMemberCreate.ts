import { z } from 'zod';
import { createEndpoint, ZiteError } from '../server/backend.js';
import { requireStaff, STAFF_ROLES } from '../server/rbac.js';
import { createMember } from '../server/members.js';
import { audit } from '../server/audit.js';
import { publicMember, toPublic, tokenField } from '../server/util.js';

export default createEndpoint({
  description: 'Creates a customer (or staff, superadmin only) account with a one-time temporary password',
  inputSchema: z.object({
    token: tokenField,
    displayName: z.string().min(1).max(80),
    phone: z.string().max(20).optional(),
    username: z.string().max(40).optional(),
    password: z.string().max(128).optional(),
    orderRef: z.string().max(60).optional(),
    note: z.string().max(1000).optional(),
    tags: z.array(z.string().max(30)).max(10).optional(),
    role: z.enum(['member', 'support', 'editor', 'admin', 'superadmin']).default('member'),
  }),
  outputSchema: z.object({ member: publicMember, tempPassword: z.string() }),
  execute: async ({ input, ctx }) => {
    const isStaffRole = STAFF_ROLES.includes(input.role);
    const { member: actor } = await requireStaff(ctx, isStaffRole ? 'staff.manage' : 'customers.write');
    if (isStaffRole && !input.username) throw new ZiteError({ code: 'BAD_REQUEST', message: 'username', userFacingMessage: 'نام کاربری کارمند لازم است.' });
    const { token: _t, password, ...rest } = input;
    void _t;
    const { member, tempPassword } = await createMember({ ...rest, password: password || undefined }, actor.id);
    await audit(actor.id, isStaffRole ? 'staff.create' : 'customer.create', 'member', member.id, { role: input.role, manualPassword: !!password });
    return { member: toPublic(member), tempPassword };
  },
});
