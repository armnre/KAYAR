import { z } from 'zod';
import { createEndpoint } from '../server/backend.js';
import { zite } from '../server/db.js';
import { requireSession } from '../server/rbac.js';
import { tokenField } from '../server/util.js';
import { bodyyarWeightSchema } from '@kayar/shared';

export default createEndpoint({
  description: 'Stores a weight measurement and returns the weight history of the signed-in member',
  inputSchema: z.object({
    token: tokenField,
    action: z.enum(['list', 'add']).default('add'),
    weightKg: z.number().min(25).max(300).optional(),
    date: z.string().max(30).optional(),
  }),
  outputSchema: z.object({ ok: z.boolean(), logs: z.array(bodyyarWeightSchema) }),
  execute: async ({ input, ctx }) => {
    const { member } = await requireSession(ctx);
    if (input.action !== 'add' || input.weightKg === undefined) {
      const { records } = await zite.bodyyarWeightLogs.findAll({ filters: { memberId: member.id }, limit: 400 });
      const logs = records
        .map((r) => ({ date: r.date ?? '', weightKg: Number(r.weightKg ?? 0) }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-60);
      return { ok: true, logs };
    }
    const date = (input.date ? new Date(input.date) : new Date()).toISOString().slice(0, 10);
    const existing = await zite.bodyyarWeightLogs.findOne({ filters: { memberId: member.id, date } });
    if (existing) await zite.bodyyarWeightLogs.update({ id: existing.id, record: { weightKg: input.weightKg } });
    else await zite.bodyyarWeightLogs.create({ record: { memberId: member.id, date, weightKg: input.weightKg } });
    const { records } = await zite.bodyyarWeightLogs.findAll({ filters: { memberId: member.id }, limit: 400 });
    const logs = records
      .map((r) => ({ date: r.date ?? '', weightKg: Number(r.weightKg ?? 0) }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-60);
    return { ok: true, logs };
  },
});
