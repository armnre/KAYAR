import { z } from 'zod';
import { createEndpoint } from '../server/backend.js';
import { aiChat, aiConfigured, BODYYAR_SYSTEM_PROMPT } from '../server/ai.js';
import { bodyyarProfileSchema, bodyyarPlanSchema } from '@kayar/shared';
import { generatePlan } from '../server/bodyyar.js';

/**
 * Legacy entry point kept for compatibility: it now delegates to the real
 * bodyyar service (plan generation with Zod validation).
 */
export default createEndpoint({
  description: 'Generates a personal workout/nutrition plan or answers a coaching question with AI (when configured)',
  inputSchema: z.object({
    mode: z.enum(['status', 'plan', 'chat']),
    profile: z.object({
      goal: z.string(), level: z.string(), daysPerWeek: z.number(),
      equipment: z.string().optional(), limitations: z.string().optional(),
      age: z.number().optional(), weightKg: z.number().optional(), heightCm: z.number().optional(),
    }).optional(),
    messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).optional(),
  }),
  outputSchema: z.object({ enabled: z.boolean(), text: z.string().optional(), plan: z.any().optional() }),
  execute: async ({ input }) => {
    if (input.mode === 'status' || !aiConfigured()) return { enabled: aiConfigured() };
    if (input.mode === 'plan' && input.profile) {
      const p = input.profile;
      const profile = bodyyarProfileSchema.parse({
        goal: p.goal, gender: '', level: p.level, daysPerWeek: p.daysPerWeek,
        place: p.equipment ?? '', diet: '', age: p.age ?? null, heightCm: p.heightCm ?? null,
        weightKg: p.weightKg ?? null, limitations: p.limitations ?? '',
      });
      const { plan } = await generatePlan(profile);
      return { enabled: true, plan: bodyyarPlanSchema.parse(plan) };
    }
    const last = (input.messages ?? []).filter((m) => m.role === 'user').slice(-1)[0];
    if (!last) return { enabled: true, text: '' };
    const { text } = await aiChat([{ role: 'system', content: BODYYAR_SYSTEM_PROMPT }, { role: 'user', content: last.content }]);
    return { enabled: true, text };
  },
});
