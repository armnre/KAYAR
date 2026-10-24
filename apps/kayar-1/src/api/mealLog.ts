import { z } from 'zod';
import { memberId } from '../server/rbac';
import { tokenField } from '../server/util';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const r1 = (n: number) => Math.round(n * 10) / 10;

export default createEndpoint({
  description: 'Logs a catalog food to a meal, or deletes a meal entry, for the signed-in user',
  inputSchema: z.object({
    token: tokenField,
    action: z.enum(['add', 'delete']),
    foodId: z.string().optional(),
    grams: z.number().min(1).max(3000).optional(),
    meal: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    id: z.string().optional(),
  }),
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async ({ input }) => {
    const uid = await memberId(input.token);
    if (input.action === 'delete') {
      if (!input.id) return { ok: false };
      const row = await zite.mealLogs.findOne({ id: input.id });
      if (!row || row.memberId !== uid) throw new ZiteError({ code: 'NOT_FOUND', message: 'not found', userFacingMessage: 'این مورد پیدا نشد.' });
      await zite.mealLogs.delete({ id: input.id });
      return { ok: true };
    }
    if (!input.foodId || !input.grams || !input.meal || !input.date) throw new ZiteError({ code: 'BAD_REQUEST', message: 'missing', userFacingMessage: 'اطلاعات وعده کامل نیست.' });
    // Nutrition is computed on the server from the catalog — never trusted from the client
    const food = await zite.foods.findOne({ id: input.foodId });
    if (!food) throw new ZiteError({ code: 'NOT_FOUND', message: 'food', userFacingMessage: 'این خوراکی پیدا نشد.' });
    const k = input.grams / 100;
    await zite.mealLogs.create({
      record: {
        memberId: uid, foodId: food.id, foodName: food.name ?? '', meal: input.meal, date: input.date, grams: input.grams,
        calories: Math.round((food.caloriesPer100g ?? 0) * k), protein: r1((food.proteinPer100g ?? 0) * k),
        carbs: r1((food.carbsPer100g ?? 0) * k), fat: r1((food.fatPer100g ?? 0) * k),
      },
    });
    return { ok: true };
  },
});
