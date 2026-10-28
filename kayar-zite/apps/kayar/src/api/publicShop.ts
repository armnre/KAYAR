import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { isLive, destination, SHOP_CATEGORIES } from '../server/shop';
import { splitTags } from '../server/content';

const item = z.object({ id: z.string(), title: z.string(), description: z.string(), image: z.string(), price: z.number().nullable(), currency: z.string(), badge: z.string(), category: z.string(), categoryLabel: z.string(), tags: z.array(z.string()), kind: z.enum(['own', 'partner', 'sponsor']), partnerName: z.string(), linkable: z.boolean(), featured: z.boolean() });

export default createEndpoint({
  description: 'Public list of active Kapoosh shop items and partner offers',
  inputSchema: z.object({ placement: z.enum(['landing', 'shop', 'app']).default('shop') }),
  outputSchema: z.object({ items: z.array(item), categories: z.array(z.object({ key: z.string(), label: z.string() })), appShelf: z.boolean() }),
  execute: async ({ input }) => {
    const [items, partners, shelf] = await Promise.all([
      zite.shopItems.findAll({ filters: { active: true }, limit: 1000 }),
      zite.shopPartners.findAll({ limit: 500 }),
      zite.siteSettings.findOne({ filters: { key: 'shop.appShelf' } }),
    ]);
    const pm = new Map(partners.records.map((p) => [p.id, p]));
    const appShelf = shelf?.value !== 'false';
    let list = items.records.filter((i) => isLive(i)).filter((i) => { const p = pm.get(i.partnerId ?? ''); return !p || p.active !== false; });
    if (input.placement === 'landing') list = list.filter((i) => i.showInLanding);
    if (input.placement === 'app') list = appShelf ? list.filter((i) => i.showInApp) : [];
    list.sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || (a.sort ?? 0) - (b.sort ?? 0));
    if (input.placement === 'landing') list = list.slice(0, 8);
    if (input.placement === 'app') list = list.slice(0, 6);
    const out = list.map((i) => {
      const p = pm.get(i.partnerId ?? '');
      const kind = (['own', 'partner', 'sponsor'].includes(p?.type ?? '') ? p!.type : 'own') as 'own' | 'partner' | 'sponsor';
      return { id: i.id, title: i.title ?? '', description: i.description ?? '', image: i.image ?? '', price: typeof i.price === 'number' && i.price > 0 ? i.price : null, currency: i.currency || 'IRT', badge: i.badge ?? '', category: i.category ?? 'other', categoryLabel: SHOP_CATEGORIES[i.category ?? ''] ?? 'سایر', tags: splitTags(i.tags), kind, partnerName: p?.name ?? 'کاپوش', linkable: !!destination(i, p), featured: !!i.featured };
    });
    const cats = Array.from(new Set(out.map((i) => i.category))).map((key) => ({ key, label: SHOP_CATEGORIES[key] ?? 'سایر' }));
    return { items: out, categories: cats, appShelf };
  },
});
