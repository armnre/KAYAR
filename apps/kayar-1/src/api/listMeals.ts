import { z } from 'zod';
import { memberId } from '../server/rbac';
import { tokenField } from '../server/util';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists meal entries for a day plus the last 14 days of calorie totals for the signed-in user',
  inputSchema: z.object({ token: tokenField, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  outputSchema: z.object({
    entries: z.array(z.object({ id: z.string(), foodId: z.string(), foodName: z.string(), meal: z.string(), grams: z.number(), calories: z.number(), protein: z.number(), carbs: z.number(), fat: z.number() })),
    history: z.array(z.object({ date: z.string(), calories: z.number(), protein: z.number() })),
    recentFoodIds: z.array(z.string()),
  }),
  execute: async ({ input }) => {
    const uid = await memberId(input.token);
    const [{ records }, hist, recent] = await Promise.all([
      zite.mealLogs.findAll({ filters: { memberId: uid, date: input.date }, limit: 500 }),
      zite.sql({
        query: `SELECT to_char("date", 'YYYY-MM-DD') AS d, ROUND(SUM("calories"))::int AS c, ROUND(SUM("protein"))::int AS p
                FROM "MealLogs" WHERE "memberId" = $1 AND "date" > now() - interval '14 days' GROUP BY 1 ORDER BY 1`,
        params: [uid],
      }),
      zite.sql({
        query: `SELECT "foodId", MAX(created_at) AS t FROM "MealLogs" WHERE "memberId" = $1 AND "foodId" IS NOT NULL GROUP BY "foodId" ORDER BY t DESC LIMIT 8`,
        params: [uid],
      }),
    ]);
    return {
      entries: records.map((m) => ({
        id: m.id, foodId: m.foodId ?? '', foodName: m.foodName ?? '', meal: m.meal ?? 'snack', grams: m.grams ?? 0,
        calories: m.calories ?? 0, protein: m.protein ?? 0, carbs: m.carbs ?? 0, fat: m.fat ?? 0,
      })),
      history: hist.rows.map((r) => ({ date: String(r.d), calories: Number(r.c ?? 0), protein: Number(r.p ?? 0) })),
      recentFoodIds: recent.rows.map((r) => String(r.foodId)),
    };
  },
});
