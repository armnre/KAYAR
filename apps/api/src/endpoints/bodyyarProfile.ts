import { z } from 'zod';
import { createEndpoint } from '../server/backend.js';
import { zite } from '../server/db.js';
import { requireSession } from '../server/rbac.js';
import { tokenField } from '../server/util.js';
import { bodyyarProfileSchema } from '@kayar/shared';

export default createEndpoint({
  description: 'Reads or updates the bodyyar profile of the signed-in member',
  inputSchema: z.object({ token: tokenField, save: bodyyarProfileSchema.partial().optional() }),
  outputSchema: z.object({ profile: bodyyarProfileSchema.nullable() }),
  execute: async ({ input, ctx }) => {
    const { member } = await requireSession(ctx);
    if (input.save) {
      const cur = await zite.bodyyarProfiles.findOne({ filters: { memberId: member.id } });
      const merged = bodyyarProfileSchema.parse({
        goal: '', gender: '', level: '', daysPerWeek: 3, place: '', diet: '', age: null, heightCm: null, weightKg: null, limitations: '',
        ...(cur ?? {}), ...input.save,
      });
      if (cur) await zite.bodyyarProfiles.update({ id: cur.id, record: { ...merged, updatedAt: new Date().toISOString() } });
      else await zite.bodyyarProfiles.create({ record: { memberId: member.id, ...merged } });
    }
    const row = await zite.bodyyarProfiles.findOne({ filters: { memberId: member.id } });
    if (!row) return { profile: null };
    return {
      profile: bodyyarProfileSchema.parse({
        goal: row.goal ?? '', gender: row.gender ?? '', level: row.level ?? '', daysPerWeek: row.daysPerWeek ?? 3,
        place: row.place ?? '', diet: row.diet ?? '', age: row.age ?? null, heightCm: row.heightCm ?? null,
        weightKg: row.weightKg ?? null, limitations: row.limitations ?? '',
      }),
    };
  },
});
