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
    action: z.enum(['list', 'save', 'setStatus', 'delete', 'resetStats', 'registrations', 'regStatus']),
    regId: z.string().max(64).optional(), regStatus: z.enum(['confirmed', 'waitlist', 'canceled', 'attended']).optional(),
    id: z.string().max(64).optional(),
    status: z.enum(['draft', 'active', 'paused', 'ended']).optional(),
    data: z.object({
      title: z.string().trim().min(1).max(120), subtitle: s(160), body: s(1500),
      kind: z.enum(['campaign', 'product', 'brand', 'offer', 'event']), brand: s(80), imageUrl: s(600), badge: s(30),
      ctaLabel: s(30), link: s(500), price: s(30), oldPrice: s(30), discountCode: s(40),
      theme: z.enum(['lime', 'sunset', 'ocean', 'royal', 'mono']), placements: z.array(z.enum(['home', 'morshed', 'bodyyar'])).default(['home']),
      status: z.enum(['draft', 'active', 'paused', 'ended']), priority: z.number().int().min(0).max(1000).default(0),
      startsAt: z.string().max(40).nullable().default(null), endsAt: z.string().max(40).nullable().default(null),
      gallery: s(4000), features: s(3000), specs: s(3000), terms: s(3000), amount: z.number().int().min(0).max(1_000_000_000).default(0),
      stock: z.number().int().min(0).max(1_000_000).nullable().default(null), purchasable: z.boolean().default(false),
      videoUrl: s(600), location: s(160), sponsorLogo: s(600), sponsorWebsite: s(500),
      actionType: z.enum(['buy', 'register', 'code', 'partner', 'info']).default('info'), partnerName: s(80), partnerApiUrl: s(500), uniqueCodes: z.boolean().default(false),
    }).optional(),
  }),
  outputSchema: z.object({ items: z.array(campaignDto), registrations: z.array(z.object({ id: z.string(), name: z.string(), phone: z.string(), kind: z.string(), status: z.string(), code: z.string(), note: z.string(), created: z.string().nullable() })) }),
  execute: async ({ input }) => {
    const { member } = await requireStaff(input.token, 'shop.manage');
    if (input.action === 'registrations' || input.action === 'regStatus') {
      if (!input.id) throw bad('کمپین مشخص نشده است.');
      if (input.action === 'regStatus' && input.regId && input.regStatus) { await zite.campaignRegistrations.update({ id: input.regId, record: { status: input.regStatus } }); await audit(member.id, 'campaign.registration', 'campaign', input.id, { status: input.regStatus }); }
      const { records } = await zite.campaignRegistrations.findAll({ filters: { campaign: input.id }, limit: 2000 });
      return { items: [], registrations: records.map((r) => ({ id: r.id, name: r.fullName ?? '', phone: r.phone ?? '', kind: r.kind ?? '', status: r.status ?? '', code: r.code ?? '', note: r.note ?? '', created: r.created ?? null })).sort((a, b) => String(b.created).localeCompare(String(a.created))) };
    }
    if (input.action === 'save') {
      const d = input.data;
      if (!d) throw bad('اطلاعات کمپین ارسال نشده است.');
      const startsAt = isoOrNull(d.startsAt); const endsAt = isoOrNull(d.endsAt);
      if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) throw bad('زمان پایان باید بعد از شروع باشد.');
      if (d.imageUrl && !/^https:\/\//.test(d.imageUrl)) throw bad('آدرس تصویر باید با https:// شروع شود.');
      for (const u of [d.videoUrl, d.sponsorLogo, d.sponsorWebsite, ...d.gallery.split('\n').map((x) => x.trim()).filter(Boolean)]) if (u && !/^https:\/\//.test(u)) throw bad('همه آدرس‌ها (گالری، ویدیو، لوگو، سایت) باید با https:// شروع شوند.');
      if (d.partnerApiUrl && !/^https:\/\//.test(d.partnerApiUrl)) throw bad('آدرس API همکار باید با https:// شروع شود.');
      if (d.actionType === 'buy' && d.amount <= 0) throw bad('برای فروش آنلاین، مبلغ (تومان) را وارد کن.');
      if (d.actionType === 'code' && !d.discountCode) throw bad('کد تخفیف را وارد کن.');
      if (d.actionType === 'partner' && !d.partnerApiUrl && !d.discountCode) throw bad('برای همکار، آدرس API یا کد تخفیف لازم است.');
      const record = { ...d, purchasable: d.actionType === 'buy', placements: ['home'], link: safeLink(d.link), startsAt, endsAt };
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
    return { registrations: [], items: records.map(toCampaign).sort((a, b) => b.priority - a.priority || String(b.created).localeCompare(String(a.created))) };
  },
});
