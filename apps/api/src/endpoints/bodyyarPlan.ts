import { z } from 'zod';
import { createEndpoint } from '../server/backend.js';
import { zite } from '../server/db.js';
import { requireSession } from '../server/rbac.js';
import { tokenField } from '../server/util.js';
import { bodyyarPlanSchema, bodyyarProfileSchema } from '@kayar/shared';
import { assertPlanQuota, generatePlan, plansUsedToday, savePlan } from '../server/bodyyar.js';

const planOut = bodyyarPlanSchema.extend({ id: z.string(), createdAt: z.string().nullable(), version: z.number() });

export default createEndpoint({
  description: 'Returns the latest bodyyar plan or generates a new one (quota limited)',
  inputSchema: z.object({
    token: tokenField,
    action: z.enum(['get', 'create']).default('get'),
    profile: bodyyarProfileSchema.optional(),
  }),
  outputSchema: z.object({ plan: planOut.nullable(), plans: z.array(z.object({ id: z.string(), title: z.string(), createdAt: z.string().nullable(), version: z.number() })) }),
  execute: async ({ input, ctx }) => {
    const { member } = await requireSession(ctx);
    const { records } = await zite.bodyyarPlans.findAll({ filters: { memberId: member.id }, limit: 100 });
    const sorted = records.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    if (input.action === 'create') {
      const used = await plansUsedToday(member.id);
      assertPlanQuota(used);
      let profile = input.profile;
      if (!profile) {
        const row = await zite.bodyyarProfiles.findOne({ filters: { memberId: member.id } });
        if (!row) throw new Error('PROFILE_REQUIRED');
        profile = bodyyarProfileSchema.parse({
          goal: row.goal ?? '', gender: row.gender ?? '', level: row.level ?? '', daysPerWeek: row.daysPerWeek ?? 3,
          place: row.place ?? '', diet: row.diet ?? '', age: row.age ?? null, heightCm: row.heightCm ?? null,
          weightKg: row.weightKg ?? null, limitations: row.limitations ?? '',
        });
      }
      const { plan } = await generatePlan(profile);
      const row = await savePlan(member.id, profile, plan);
      // keep the profile in sync with the plan that was just built
      const cur = await zite.bodyyarProfiles.findOne({ filters: { memberId: member.id } });
      if (cur) await zite.bodyyarProfiles.update({ id: cur.id, record: { ...profile, updatedAt: new Date().toISOString() } });
      else await zite.bodyyarProfiles.create({ record: { memberId: member.id, ...profile } });
      return {
        plan: { ...plan, id: row.id, createdAt: row.createdAt ?? null, version: row.version ?? 1 },
        plans: [{ id: row.id, title: plan.title, createdAt: row.createdAt ?? null, version: row.version ?? 1 }],
      };
    }

    const latest = sorted[0];
    return {
      plan: latest
        ? { ...bodyyarPlanSchema.parse(latest.plan), id: latest.id, createdAt: latest.createdAt ?? null, version: latest.version ?? 1 }
        : null,
      plans: sorted.map((r) => ({ id: r.id, title: r.title ?? '', createdAt: r.createdAt ?? null, version: r.version ?? 1 })),
    };
  },
});
