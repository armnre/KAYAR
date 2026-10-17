import { z } from 'zod';
import { createEndpoint } from '../server/backend.js';
import { zite } from '../server/db.js';
import { requireSession } from '../server/rbac.js';
import { tokenField } from '../server/util.js';

export default createEndpoint({
  description: 'Ticks (or unticks) an exercise of a bodyyar plan for the signed-in member',
  inputSchema: z.object({
    token: tokenField,
    planId: z.string().max(64).optional(),
    dayIndex: z.number().int().min(0).max(13),
    exerciseIndex: z.number().int().min(0).max(50),
    done: z.boolean(),
  }),
  outputSchema: z.object({ ok: z.boolean(), done: z.array(z.object({ dayIndex: z.number(), exerciseIndex: z.number(), done: z.boolean() })) }),
  execute: async ({ input, ctx }) => {
    const { member } = await requireSession(ctx);
    const { records } = await zite.bodyyarPlans.findAll({ filters: { memberId: member.id }, limit: 100 });
    const sorted = records.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const plan = input.planId ? sorted.find((p) => p.id === input.planId) : sorted[0];
    if (!plan) throw new Error('PLAN_NOT_FOUND');
    const existing = await zite.bodyyarWorkoutLogs.findOne({ filters: { planId: plan.id, memberId: member.id, dayIndex: input.dayIndex, exerciseIndex: input.exerciseIndex } });
    if (existing) await zite.bodyyarWorkoutLogs.update({ id: existing.id, record: { done: input.done, updatedAt: new Date().toISOString() } });
    else await zite.bodyyarWorkoutLogs.create({ record: { planId: plan.id, memberId: member.id, dayIndex: input.dayIndex, exerciseIndex: input.exerciseIndex, done: input.done } });
    const logs = (await zite.bodyyarWorkoutLogs.findAll({ filters: { planId: plan.id, memberId: member.id }, limit: 500 })).records;
    return { ok: true, done: logs.map((l) => ({ dayIndex: l.dayIndex ?? 0, exerciseIndex: l.exerciseIndex ?? 0, done: !!l.done })) };
  },
});
