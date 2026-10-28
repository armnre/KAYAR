import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireStaff } from '../server/rbac';
import { audit } from '../server/audit';
import { tokenField } from '../server/util';
import { bad, isoOrNull } from '../server/content';
import { seedShop, destination, storeUrl } from '../server/shop';

const url = z.string().trim().max(1000);
const partnerIn = z.object({ name: z.string().trim().min(1).max(120), type: z.enum(['own', 'partner', 'sponsor']), logo: url, url, description: z.string().trim().max(500), active: z.boolean() });
const itemIn = z.object({
  title: z.string().trim().min(1).max(160), partnerId: z.string().max(64), description: z.string().trim().max(500), image: url, price: z.number().min(0).max(1e12).nullable(), currency: z.enum(['IRT', 'IRR']),
  badge: z.enum(['', 'new', 'bestseller', 'sponsor']), category: z.string().max(40), tags: z.string().max(400), targetUrl: url, active: z.boolean(), featured: z.boolean(), showInLanding: z.boolean(), showInApp: z.boolean(),
  startsAt: z.string().max(40).nullable(), endsAt: z.string().max(40).nullable(),
});
const partnerOut = partnerIn.extend({ id: z.string() });
const itemOut = itemIn.extend({ id: z.string(), sort: z.number(), clicks30: z.number(), linkable: z.boolean() });

const httpOk = (v: string) => !v || /^https?:\/\//i.test(v);
const imgOk = (v: string) => !v || /^\/brand\//.test(v) || /^https:\/\//.test(v);

export default createEndpoint({
  description: 'Admin CRUD for Kapoosh shop partners, items, ordering, app-shelf switch and click stats',
  inputSchema: z.object({
    token: tokenField,
    action: z.enum(['list', 'savePartner', 'deletePartner', 'saveItem', 'deleteItem', 'reorder', 'seed', 'setShelf', 'stats']),
    id: z.string().max(64).optional(), ids: z.array(z.string().max(64)).max(1000).optional(),
    partner: partnerIn.optional(), item: itemIn.optional(), shelf: z.boolean().optional(),
  }),
  outputSchema: z.object({
    partners: z.array(partnerOut), items: z.array(itemOut), appShelf: z.boolean(), storeConfigured: z.boolean(),
    daily: z.array(z.object({ day: z.string(), n: z.number() })), seeded: z.number(),
  }),
  execute: async ({ input }) => {
    const { member } = await requireStaff(input.token, 'shop.manage');
    let seeded = 0;
    if (input.action === 'savePartner') {
      const p = input.partner; if (!p) throw bad('اطلاعات شریک ارسال نشده است.');
      if (!httpOk(p.url)) throw bad('آدرس سایت باید با http یا https شروع شود.');
      if (!imgOk(p.logo)) throw bad('لوگو باید از کتابخانه‌ی رسانه انتخاب شود.');
      if (input.id) { await zite.shopPartners.update({ id: input.id, record: p }); await audit(member.id, 'shop.partner.update', 'shopPartner', input.id); }
      else { const r = await zite.shopPartners.create({ record: p }); await audit(member.id, 'shop.partner.create', 'shopPartner', r.id); }
    } else if (input.action === 'deletePartner') {
      if (!input.id) throw bad('شناسه لازم است.');
      const used = await zite.shopItems.findOne({ filters: { partnerId: input.id } });
      if (used) throw bad('این شریک آیتم فعال دارد؛ اول آیتم‌هایش را حذف یا منتقل کن.');
      await zite.shopPartners.delete({ id: input.id }); await audit(member.id, 'shop.partner.delete', 'shopPartner', input.id);
    } else if (input.action === 'saveItem') {
      const it = input.item; if (!it) throw bad('اطلاعات آیتم ارسال نشده است.');
      if (!httpOk(it.targetUrl)) throw bad('لینک خرید باید با http یا https شروع شود.');
      if (!imgOk(it.image)) throw bad('تصویر باید از کتابخانه‌ی رسانه انتخاب شود.');
      if (!(await zite.shopPartners.findOne({ id: it.partnerId }))) throw bad('شریک/فروشنده را انتخاب کن.');
      const rec = { ...it, startsAt: isoOrNull(it.startsAt), endsAt: isoOrNull(it.endsAt) };
      if (rec.startsAt && rec.endsAt && rec.startsAt > rec.endsAt) throw bad('تاریخ پایان باید بعد از تاریخ شروع باشد.');
      if (input.id) { await zite.shopItems.update({ id: input.id, record: rec }); await audit(member.id, 'shop.item.update', 'shopItem', input.id); }
      else { const max = Math.max(0, ...(await zite.shopItems.findAll({ limit: 1000 })).records.map((r) => r.sort ?? 0)); const r = await zite.shopItems.create({ record: { ...rec, sort: max + 1 } }); await audit(member.id, 'shop.item.create', 'shopItem', r.id); }
    } else if (input.action === 'deleteItem') {
      if (!input.id) throw bad('شناسه لازم است.');
      await zite.shopItems.delete({ id: input.id }); await audit(member.id, 'shop.item.delete', 'shopItem', input.id);
    } else if (input.action === 'reorder') {
      await Promise.all((input.ids ?? []).map((id, i) => zite.shopItems.update({ id, record: { sort: i + 1 } })));
    } else if (input.action === 'seed') {
      seeded = await seedShop(); await audit(member.id, 'shop.seed', 'shopItem', '', { added: seeded });
    } else if (input.action === 'setShelf') {
      await zite.siteSettings.bulkCreate({ records: [{ key: 'shop.appShelf', value: input.shelf ? 'true' : 'false' }], matchOn: ['key'] });
      await audit(member.id, 'shop.shelf', 'setting', 'shop.appShelf', { on: !!input.shelf });
    }
    const [partners, items, shelf, clicks, daily] = await Promise.all([
      zite.shopPartners.findAll({ limit: 500 }), zite.shopItems.findAll({ limit: 1000 }), zite.siteSettings.findOne({ filters: { key: 'shop.appShelf' } }),
      zite.sql({ query: `SELECT "itemId" AS i, SUM("n") AS n FROM "ShopClicks" WHERE "day" >= (now() - interval '30 days')::date GROUP BY 1` }),
      zite.sql({ query: `SELECT "day"::text AS d, SUM("n") AS n FROM "ShopClicks" ${input.id && input.action === 'stats' ? `WHERE "itemId" = $1 AND` : 'WHERE'} "day" >= (now() - interval '30 days')::date GROUP BY 1 ORDER BY 1`, params: input.id && input.action === 'stats' ? [input.id] : [] }),
    ]);
    const cm = new Map(clicks.rows.map((r) => [String(r.i), Number(r.n)] as [string, number]));
    const pm = new Map(partners.records.map((p) => [p.id, p]));
    return {
      partners: partners.records.map((p) => ({ id: p.id, name: p.name ?? '', type: (p.type ?? 'partner') as 'own' | 'partner' | 'sponsor', logo: p.logo ?? '', url: p.url ?? '', description: p.description ?? '', active: p.active !== false })),
      items: items.records.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)).map((i) => ({
        id: i.id, title: i.title ?? '', partnerId: i.partnerId ?? '', description: i.description ?? '', image: i.image ?? '', price: typeof i.price === 'number' ? i.price : null, currency: (i.currency === 'IRR' ? 'IRR' : 'IRT') as 'IRT' | 'IRR',
        badge: (['new', 'bestseller', 'sponsor'].includes(i.badge ?? '') ? i.badge : '') as '' | 'new' | 'bestseller' | 'sponsor', category: i.category ?? 'other', tags: i.tags ?? '', targetUrl: i.targetUrl ?? '',
        active: !!i.active, featured: !!i.featured, showInLanding: !!i.showInLanding, showInApp: !!i.showInApp, startsAt: i.startsAt ?? null, endsAt: i.endsAt ?? null,
        sort: i.sort ?? 0, clicks30: cm.get(i.id) ?? 0, linkable: !!destination(i, pm.get(i.partnerId ?? '')),
      })),
      appShelf: shelf?.value !== 'false', storeConfigured: !!storeUrl(),
      daily: daily.rows.map((r) => ({ day: String(r.d), n: Number(r.n) })), seeded,
    };
  },
});
