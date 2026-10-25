import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireStaff } from '../server/rbac';
import { audit } from '../server/audit';
import { tokenField } from '../server/util';
import { SEED_EXERCISES, SEED_FOODS } from '../server/seedData';

const counts = async () => {
  const { rows } = await zite.sql({ query: 'SELECT (SELECT COUNT(*) FROM "Exercises")::int AS e, (SELECT COUNT(*) FROM "Foods")::int AS f' });
  return { exercises: Number(rows[0]?.e ?? 0), foods: Number(rows[0]?.f ?? 0) };
};

export default createEndpoint({
  description: 'Shows base-content counts and loads/refreshes the built-in exercise library and food database',
  inputSchema: z.object({ token: tokenField, run: z.boolean().optional() }),
  outputSchema: z.object({ exercises: z.number(), foods: z.number(), seed: z.object({ exercises: z.number(), foods: z.number() }) }),
  execute: async ({ input }) => {
    const { member } = await requireStaff(input.token, 'settings.manage');
    if (input.run) {
      await zite.exercises.bulkCreate({ matchOn: ['slug'], records: SEED_EXERCISES.map((e) => ({ ...e })) });
      for (let i = 0; i < SEED_FOODS.length; i += 100)
        await zite.foods.bulkCreate({ matchOn: ['name'], records: SEED_FOODS.slice(i, i + 100).map((f) => ({ ...f })) });
      await audit(member.id, 'system.seed', 'settings', 'seed', { exercises: SEED_EXERCISES.length, foods: SEED_FOODS.length });
    }
    return { ...(await counts()), seed: { exercises: SEED_EXERCISES.length, foods: SEED_FOODS.length } };
  },
});
