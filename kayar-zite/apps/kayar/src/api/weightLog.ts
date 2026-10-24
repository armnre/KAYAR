import { z } from 'zod';
import { memberId } from '../server/rbac';
import { tokenField } from '../server/util';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Logs or deletes a body-weight entry for the signed-in user',
  inputSchema: z.object({
    token: tokenField,
    action: z.enum(['add', 'delete']),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    weightKg: z.number().min(25).max(300).optional(),
    id: z.string().optional(),
  }),
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async ({ input }) => {
    const uid = await memberId(input.token);
    if (input.action === 'delete' && input.id) {
      const row = await zite.weightLogs.findOne({ id: input.id });
            if (row && row.memberId === uid) await zite.weightLogs.delete({ id: input.id });
      return { ok: true };
    }
    if (!input.date || !input.weightKg) return { ok: false };
    const { records } = await zite.weightLogs.findAll({ filters: { memberId: uid, date: input.date }, limit: 1 });
    if (records[0]) await zite.weightLogs.update({ id: records[0].id, record: { weightKg: input.weightKg } });
    else await zite.weightLogs.create({ record: { memberId: uid, date: input.date, weightKg: input.weightKg } });
    await zite.bodyProfiles.bulkCreate({ records: [{ memberId: uid, weightKg: input.weightKg }], matchOn: ['memberId'] }).catch(() => undefined);
    return { ok: true };
  },
});
