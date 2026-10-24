import { z } from 'zod';
import { memberId } from '../server/rbac';
import { tokenField } from '../server/util';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists weight entries for the signed-in user',
  inputSchema: z.object({ token: tokenField }),
  outputSchema: z.object({ entries: z.array(z.object({ id: z.string(), date: z.string(), weightKg: z.number() })) }),
  execute: async ({ input }) => {
    const uid = await memberId(input.token);
    const { rows } = await zite.sql({ query: `SELECT "id",to_char("date", 'YYYY-MM-DD') AS "d","weightKg" FROM "WeightLogs" WHERE "memberId" = $1 ORDER BY "date" DESC LIMIT 500`, params: [uid] });
    return { entries: rows.map((r) => ({ id: String(r.id), date: String(r.d), weightKg: Number(r.weightKg) })) };
  },
});
