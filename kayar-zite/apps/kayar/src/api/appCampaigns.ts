import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { campaignDto, toCampaign, isLive } from '../server/campaigns';

export default createEndpoint({
  description: 'Live KAYAR suggestions for a placement, plus impression/click tracking',
  inputSchema: z.object({
    action: z.enum(['list', 'track']),
    placement: z.enum(['home', 'morshed', 'bodyyar']).default('home'),
    id: z.string().max(64).optional(),
    event: z.enum(['view', 'click']).optional(),
  }),
  outputSchema: z.object({ items: z.array(campaignDto) }),
  execute: async ({ input }) => {
    if (input.action === 'track') {
      if (!input.id || !input.event) return { items: [] };
      const c = await zite.campaigns.findOne({ id: input.id });
      if (c) await zite.campaigns.update({ id: c.id, record: input.event === 'view' ? { impressions: (c.impressions ?? 0) + 1 } : { clicks: (c.clicks ?? 0) + 1 } });
      return { items: [] };
    }
    const { records } = await zite.campaigns.findAll({ filters: { status: 'active' }, limit: 200 });
    const items = records.map(toCampaign).filter((c) => isLive(c) && c.placements.includes(input.placement))
      .sort((a, b) => b.priority - a.priority)
      .map((c) => ({ ...c, impressions: 0, clicks: 0, discountCode: c.discountCode }));
    return { items };
  },
});
