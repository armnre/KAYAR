import { z } from 'zod';
import { memberId } from '../server/rbac';
import { tokenField } from '../server/util';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { planSchema, profileSchema, nutritionSchema, today, type Plan, type Nutrition } from '../server/schemas';
import { computeTargets } from '../server/macros';

const num = (v: unknown) => (typeof v === 'number' ? v : Number(v ?? 0)) || 0;

export default createEndpoint({
  description: 'Loads the BodyYar dashboard for the signed-in user from their real records',
  inputSchema: z.object({ token: tokenField }),
  outputSchema: z.object({
    profile: profileSchema.nullable(),
    plan: z.object({ id: z.string(), plan: planSchema, created: z.string().nullable() }).nullable(),
    nextDayIndex: z.number(),
    weekSessions: z.number(),
    weekMinutes: z.number(),
    recentSessions: z.array(z.object({ id: z.string(), title: z.string(), startedAt: z.string().nullable(), durationSec: z.number(), totalSets: z.number(), totalVolumeKg: z.number() })),
    weights: z.array(z.object({ date: z.string(), weightKg: z.number() })),
    nutritionPlan: nutritionSchema.nullable(),
    trainedToday: z.boolean(),
    targets: z.object({ calories: z.number(), protein: z.number(), carbs: z.number(), fat: z.number() }).nullable(),
    nutrition: z.object({ calories: z.number(), protein: z.number(), carbs: z.number(), fat: z.number(), entries: z.number() }),
  }),
  execute: async ({ input }) => {
    const uid = await memberId(input.token);
    const [profileRow, plans, sessionsRes, weightsRes, mealsRes] = await Promise.all([
      zite.bodyProfiles.findOne({ filters: { memberId: uid } }),
      zite.workoutPlans.findAll({ filters: { memberId: uid, active: true }, limit: 5 }),
      zite.sql({ query: `SELECT "id","title",to_char("startedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "s","durationSec","totalSets","totalVolumeKg" FROM "WorkoutSessions" WHERE "memberId" = $1 ORDER BY "startedAt" DESC NULLS LAST LIMIT 200`, params: [uid] }),
      zite.sql({ query: `SELECT to_char("date", 'YYYY-MM-DD') AS "d","weightKg" FROM "WeightLogs" WHERE "memberId" = $1 ORDER BY "date" ASC LIMIT 400`, params: [uid] }),
      zite.mealLogs.findAll({ filters: { memberId: uid, date: today() }, limit: 200 }),
    ]);
    const profile = profileRow?.goal ? {
      goal: profileRow.goal, level: profileRow.level ?? '', daysPerWeek: profileRow.daysPerWeek ?? 3, place: profileRow.place ?? '',
      equipment: profileRow.equipment ?? '', sessionMinutes: profileRow.sessionMinutes ?? 45, diet: profileRow.diet ?? '',
      limitations: profileRow.limitations ?? '', age: profileRow.age ?? null, heightCm: profileRow.heightCm ?? null, weightKg: profileRow.weightKg ?? null,
      sex: (profileRow.sex === 'female' || profileRow.sex === 'male') ? (profileRow.sex as 'male' | 'female') : null,
    } : null;
    const latest = plans.records.sort((a, b) => (b.created ?? '').localeCompare(a.created ?? ''))[0];
    let plan: { id: string; plan: Plan; created: string | null } | null = null;
    if (latest?.planJson) {
      const parsed = planSchema.safeParse(JSON.parse(latest.planJson));
      if (parsed.success) plan = { id: latest.id, plan: parsed.data, created: latest.created ?? null };
    }
    let nutritionPlan: Nutrition | null = null;
    if (latest?.nutritionJson) { const r = nutritionSchema.safeParse(JSON.parse(latest.nutritionJson)); if (r.success) nutritionPlan = r.data; }
    const sessions = sessionsRes.rows.map((r) => ({
      id: String(r.id), title: String(r.title ?? ''), startedAt: r.s ? String(r.s) : null,
      durationSec: num(r.durationSec), totalSets: num(r.totalSets), totalVolumeKg: num(r.totalVolumeKg),
    }));
    const weekAgo = Date.now() - 7 * 864e5;
    const week = sessions.filter((s) => s.startedAt && new Date(s.startedAt).getTime() > weekAgo);
    const planCreated = plan?.created ? new Date(plan.created).getTime() : 0;
    const sincePlan = sessions.filter((s) => s.startedAt && new Date(s.startedAt).getTime() >= planCreated).length;
    const meals = mealsRes.records;
    const todayStr = today();
    const trainedToday = sessions.some((x) => x.startedAt?.slice(0, 10) === todayStr);
    const t = profile ? computeTargets(profile) : null;
    return {
      profile,
      plan,
      nutritionPlan,
      trainedToday,
      targets: nutritionPlan ? (trainedToday ? nutritionPlan.targets.training : nutritionPlan.targets.rest) : t ? t.training : null,
      nextDayIndex: plan ? sincePlan % plan.plan.days.length : 0,
      weekSessions: week.length,
      weekMinutes: Math.round(week.reduce((a, s) => a + s.durationSec, 0) / 60),
      recentSessions: sessions.slice(0, 5),
      weights: weightsRes.rows.map((r) => ({ date: String(r.d), weightKg: num(r.weightKg) })),
      nutrition: {
        calories: Math.round(meals.reduce((a, m) => a + (m.calories ?? 0), 0)),
        protein: Math.round(meals.reduce((a, m) => a + (m.protein ?? 0), 0)),
        carbs: Math.round(meals.reduce((a, m) => a + (m.carbs ?? 0), 0)),
        fat: Math.round(meals.reduce((a, m) => a + (m.fat ?? 0), 0)),
        entries: meals.length,
      },
    };
  },
});
