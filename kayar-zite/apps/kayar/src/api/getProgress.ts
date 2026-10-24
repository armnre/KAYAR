import { z } from 'zod';
import { memberId } from '../server/rbac';
import { tokenField } from '../server/util';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Returns workout session history and per-exercise strength progression for the signed-in user',
  inputSchema: z.object({ token: tokenField, days: z.number().int().min(7).max(365) }),
  outputSchema: z.object({
    sessions: z.array(z.object({ id: z.string(), title: z.string(), startedAt: z.string(), durationSec: z.number(), totalSets: z.number(), totalVolumeKg: z.number() })),
    strength: z.array(z.object({ slug: z.string(), name: z.string(), points: z.array(z.object({ date: z.string(), maxKg: z.number() })) })),
  }),
  execute: async ({ input }) => {
    const uid = await memberId(input.token);
    const { rows } = await zite.sql({
      query: `SELECT "id","title",to_char("startedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "s","durationSec","totalSets","totalVolumeKg","setsJson" FROM "WorkoutSessions"
              WHERE "memberId" = $1 AND "startedAt" > now() - ($2 || ' days')::interval ORDER BY "startedAt" ASC LIMIT 1000`,
      params: [uid, String(input.days)],
    });
    const strength = new Map<string, { name: string; points: { date: string; maxKg: number }[] }>();
    for (const r of rows) {
      let sets: { slug: string; name: string; weightKg: number | null }[] = [];
      try { sets = JSON.parse(String(r.setsJson ?? '[]')); } catch { /* skip malformed */ }
      const date = String(r.s).slice(0, 10);
      const best = new Map<string, { name: string; kg: number }>();
      for (const s of sets) if (s.weightKg && s.weightKg > (best.get(s.slug)?.kg ?? 0)) best.set(s.slug, { name: s.name, kg: s.weightKg });
      for (const [slug, b] of best) {
        const entry = strength.get(slug) ?? { name: b.name, points: [] };
        entry.points.push({ date, maxKg: b.kg });
        strength.set(slug, entry);
      }
    }
    return {
      sessions: rows.map((r) => ({
        id: String(r.id), title: String(r.title ?? ''), startedAt: String(r.s ?? ''), durationSec: Number(r.durationSec ?? 0),
        totalSets: Number(r.totalSets ?? 0), totalVolumeKg: Number(r.totalVolumeKg ?? 0),
      })).reverse(),
      strength: [...strength.entries()].map(([slug, v]) => ({ slug, ...v })).filter((s) => s.points.length > 0),
    };
  },
});
