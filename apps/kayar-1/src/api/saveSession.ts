import { z } from 'zod';
import { memberId } from '../server/rbac';
import { tokenField } from '../server/util';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { setLogSchema } from '../server/schemas';

export default createEndpoint({
  description: 'Saves a completed workout session (idempotent by client key)',
  inputSchema: z.object({
    token: tokenField,
    clientKey: z.string().min(8).max(80),
    title: z.string().min(1).max(140),
    startedAt: z.string(),
    durationSec: z.number().int().min(0).max(6 * 3600),
    sets: z.array(setLogSchema).max(200),
  }),
  outputSchema: z.object({ id: z.string(), duplicate: z.boolean() }),
  execute: async ({ input }) => {
    const uid = await memberId(input.token);
    const existing = await zite.workoutSessions.findOne({ filters: { memberId: uid, clientKey: input.clientKey } });
    if (existing) return { id: existing.id, duplicate: true };
    const sets = input.sets.map((s) => setLogSchema.parse(s));
    const volume = sets.reduce((a, s) => a + s.reps * (s.weightKg ?? 0), 0);
    const created = await zite.workoutSessions.create({
      record: {
        memberId: uid, clientKey: input.clientKey, title: input.title, startedAt: input.startedAt,
        durationSec: input.durationSec, totalSets: sets.length, totalVolumeKg: Math.round(volume), setsJson: JSON.stringify(sets),
      },
    });
    return { id: created.id, duplicate: false };
  },
});
