import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const exercise = z.object({
  id: z.string(), name: z.string(), slug: z.string(), englishName: z.string(), category: z.string(), muscles: z.string(),
  equipment: z.string(), difficulty: z.string(), location: z.string(), bodyweight: z.boolean(),
  instructions: z.string(), mistakes: z.string(), safety: z.string(), alternatives: z.array(z.string()), frames: z.array(z.string()),
});

export default createEndpoint({
  description: 'Lists the exercise library catalog',
  inputSchema: z.object({}),
  outputSchema: z.object({ exercises: z.array(exercise) }),
  execute: async () => {
    const { records } = await zite.exercises.findAll({ limit: 1000 });
    return {
      exercises: records.map((e) => ({
        id: e.id, name: e.name ?? '', slug: e.slug ?? '', englishName: e.englishName ?? '', category: e.category ?? '',
        muscles: e.muscles ?? '', equipment: e.equipment ?? '', difficulty: e.difficulty ?? '', location: e.location ?? '',
        bodyweight: Boolean(e.bodyweight), instructions: e.instructions ?? '', mistakes: e.mistakes ?? '', safety: e.safety ?? '',
        alternatives: (e.alternatives ?? '').split(',').map((s) => s.trim()).filter(Boolean),
        frames: (e.mediaFrames ?? '').split('\n').map((s) => s.trim()).filter(Boolean),
      })).sort((a, b) => a.category.localeCompare(b.category)),
    };
  },
});
