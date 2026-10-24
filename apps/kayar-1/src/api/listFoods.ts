import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists the food catalog with per-100g nutrition values and source attribution',
  inputSchema: z.object({}),
  outputSchema: z.object({
    foods: z.array(z.object({
      id: z.string(), name: z.string(), category: z.string(), caloriesPer100g: z.number(), proteinPer100g: z.number(),
      carbsPer100g: z.number(), fatPer100g: z.number(), defaultServingG: z.number(), servingLabel: z.string(), tags: z.array(z.string()), source: z.string(),
    })),
  }),
  execute: async () => {
    const { records } = await zite.foods.findAll({ limit: 2000 });
    return {
      foods: records.map((f) => ({
        id: f.id, name: f.name ?? '', category: f.category ?? '', caloriesPer100g: f.caloriesPer100g ?? 0, proteinPer100g: f.proteinPer100g ?? 0,
        carbsPer100g: f.carbsPer100g ?? 0, fatPer100g: f.fatPer100g ?? 0, defaultServingG: f.defaultServingG ?? 100,
        servingLabel: f.servingLabel ?? '', tags: f.tags ?? [], source: f.source ?? '',
      })),
    };
  },
});
