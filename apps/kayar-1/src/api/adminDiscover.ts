import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { requireStaff } from '../server/rbac';
import { tokenField } from '../server/util';
import { importMusic, importPodcasts, MUSIC_QUERIES, PODCAST_TERMS } from '../server/discover';

export default createEndpoint({
  description: 'Admin: discover and import new licensed music or podcast shows',
  inputSchema: z.object({ token: tokenField, kind: z.enum(['music', 'podcasts']) }),
  outputSchema: z.object({ added: z.number(), failed: z.array(z.string()) }),
  execute: async ({ input }) => {
    await requireStaff(input.token, 'morshed.manage');
    if (input.kind === 'music') return { ...(await importMusic(MUSIC_QUERIES, 15)), failed: [] };
    return importPodcasts(PODCAST_TERMS, 4);
  },
});
