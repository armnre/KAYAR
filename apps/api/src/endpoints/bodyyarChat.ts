import { z } from 'zod';
import { createEndpoint } from '../server/backend.js';
import { requireSession } from '../server/rbac.js';
import { tokenField } from '../server/util.js';
import { assertChatQuota, chat, chatHistory, messagesUsedToday } from '../server/bodyyar.js';

export default createEndpoint({
  description: 'Bodyyar coach chat (non streaming; the transport can upgrade it to SSE)',
  inputSchema: z.object({ token: tokenField, message: z.string().trim().min(1).max(2000) }),
  outputSchema: z.object({ ok: z.boolean(), reply: z.string(), history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })) }),
  execute: async ({ input, ctx }) => {
    const { member } = await requireSession(ctx);
    const used = await messagesUsedToday(member.id);
    assertChatQuota(used);
    const { reply } = await chat(member.id, input.message);
    const history = await chatHistory(member.id, 12);
    return { ok: true, reply, history };
  },
});
