import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireStaff } from '../server/rbac';
import { audit } from '../server/audit';
import { tokenField } from '../server/util';
import { bad, safeLink, isoOrNull } from '../server/content';
import { campaignDto, toCampaign } from '../server/campaigns';

const s = (n: number) => z.string().trim().max(n).default('');

export default createEndpoint({
  description: 'Admin: manage KAYAR suggestion campaigns, ads and promoted products with stats',
  inputSchema: z.object({
    token: tokenField,
    action: z.enum(['list', 'save', 'setStatus', 'delete', 'resetStats']),
    id: z.string().max(64).optional(),
    status: z.enum(['draft', 'active', 'paused', 'ended']).optional(),
    data: z.object({
      title: z.string().trim().min(1).max(120), subtitle: s(160), body: s(1500),
      kind: z.enum(['campaign', 'product', 'brand', 'offer', 'event']), brand: s(80), imageUrl: s(600), badge: s(30),
      ctaLabel: s(30), link: s(500), price: s(30), oldPrice: s(30), discountCode: s(40),
      theme: z.enum(['lime', 'sunset', 'ocean', 'royal', 'mono']), placements: z.array(z.enum(['home', 'morshed', 'bodyyar'])).min(1),
      status: z.enum(['draft', 'active', 'paused', 'ended']), priority: z.number().int().min(0).max(1000).default(0),
      startsAt: z.string().max(40).nullable().default(null), endsAt: z.string().max(40).nullable().default(null),
    }).optional(),
  }),
  outputSchema: z.object({ items: z.array(campaignDto) }),
  execute: async ({ input }) => {
    const { member } = await requireStaff(input.token, 'shop.manage');
    if (input.action === 'save') {
      const d = input.data;
      if (!d) throw bad('اطلاعات کمپین ارسال نشده است.');
      const startsAt = isoOrNull(d.startsAt); const endsAt = isoOrNull(d.endsAt);
      if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) throw bad('زمان پایان باید بعد از شروع باشد.');
      if (d.imageUrl && !/^https:\/\//.test(d.imageUrl)) throw bad('آدرس تصویر باید با https:// شروع شود.');
      const record = { ...d, link: safeLink(d.link), startsAt, endsAt };
      if (input.id) {
        await zite.campaigns.update({ id: input.id, record: record as never });
        await audit(member.id, 'campaign.update', 'campaign', input.id, { status: d.status });
      } else {
        const c = await zite.campaigns.create({ record: { ...record, impressions: 0, clicks: 0 } as never });
        await audit(member.id, 'campaign.create', 'campaign', c.id, { status: d.status });
      }
    } else if (input.action !== 'list') {
      if (!input.id) throw bad('کمپین مشخص نشده است.');
      if (input.action === 'delete') { await zite.campaigns.delete({ id: input.id }); await audit(member.id, 'campaign.delete', 'campaign', input.id); }
      else if (input.action === 'resetStats') await zite.campaigns.update({ id: input.id, record: { impressions: 0, clicks: 0 } });
      else {
        if (!input.status) throw bad('وضعیت مشخص نشده است.');
        await zite.campaigns.update({ id: input.id, record: { status: input.status } });
        await audit(member.id, 'campaign.status', 'campaign', input.id, { status: input.status });
      }
    }
    const { records } = await zite.campaigns.findAll({ limit: 1000 });
    return { items: records.map(toCampaign).sort((a, b) => b.priority - a.priority || String(b.created).localeCompare(String(a.created))) };
  },
});
