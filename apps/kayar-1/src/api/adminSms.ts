import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireStaff } from '../server/rbac';
import { audit } from '../server/audit';
import { tokenField } from '../server/util';
import { sendSms, smsProvider } from '../server/sms';

const msg = z.object({ id: z.string(), to: z.string(), body: z.string(), status: z.string(), provider: z.string(), purpose: z.string(), error: z.string(), created: z.string() });

export default createEndpoint({
  description: 'Admin: SMS panel — provider status, send to one number or all members, message log',
  inputSchema: z.object({
    token: tokenField,
    action: z.enum(['status', 'send', 'broadcast']),
    to: z.string().max(20).optional(),
    body: z.string().max(600).optional(),
  }),
  outputSchema: z.object({ provider: z.string(), configured: z.boolean(), messages: z.array(msg), result: z.object({ sent: z.number(), failed: z.number(), simulated: z.number() }).nullable(), reachable: z.number() }),
  execute: async ({ input }) => {
    const { member } = await requireStaff(input.token, 'sms.manage');
    let result: { sent: number; failed: number; simulated: number } | null = null;
    const members = (await zite.members.findAll({ filters: { role: 'member' }, limit: 2000, fields: ['phone', 'status'] })).records.filter((m) => m.phone && m.status !== 'suspended');
    if (input.action !== 'status') {
      const body = input.body?.trim();
      if (!body) throw new ZiteError({ code: 'BAD_REQUEST', message: 'body', userFacingMessage: 'متن پیامک خالی است.' });
      const targets = input.action === 'send' ? [input.to ?? ''] : members.map((m) => m.phone!);
      result = { sent: 0, failed: 0, simulated: 0 };
      for (let i = 0; i < targets.length; i += 10) {
        const rs = await Promise.all(targets.slice(i, i + 10).map((t) => sendSms(t, body, input.action)));
        rs.forEach((r) => result![r.status]++);
      }
      await audit(member.id, `sms.${input.action}`, 'sms', '', { count: targets.length });
    }
    const p = smsProvider();
    const { records } = await zite.smsMessages.findAll({ limit: 2000 });
    return {
      provider: p?.label ?? '', configured: !!p, result, reachable: members.length,
      messages: records.sort((a, b) => (b.created ?? '').localeCompare(a.created ?? '')).slice(0, 100).map((m) => ({ id: m.id, to: m.to ?? '', body: m.body ?? '', status: m.status ?? '', provider: m.provider ?? '', purpose: m.purpose ?? '', error: m.error ?? '', created: m.created ?? '' })),
    };
  },
});
