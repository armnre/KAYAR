import { z } from 'zod';
import { memberId } from '../server/rbac';
import { tokenField } from '../server/util';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { profileSchema } from '../server/schemas';

export default createEndpoint({
  description: 'Saves the signed-in user\'s BodyYar fitness profile',
  inputSchema: profileSchema.extend({ token: tokenField }),
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async ({ input }) => {
    const uid = await memberId(input.token);
    const p = profileSchema.parse(input);
    await zite.bodyProfiles.bulkCreate({ records: [{ ...p, memberId: uid }], matchOn: ['memberId'] });
    if (p.weightKg) {
      const date = new Date().toISOString().slice(0, 10);
      const { records } = await zite.weightLogs.findAll({ filters: { memberId: uid, date }, limit: 1 });
      if (!records.length) await zite.weightLogs.create({ record: { memberId: uid, date, weightKg: p.weightKg } });
    }
    return { ok: true };
  },
});
