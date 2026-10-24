import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireStaff } from '../server/rbac';
import { audit } from '../server/audit';
import { tokenField } from '../server/util';
import { activeGateway } from '../server/payments';

const productIn = z.object({
  name: z.string().min(1).max(160), description: z.string().max(4000), price: z.number().min(0), compareAtPrice: z.number().min(0).nullable(),
  image: z.string().max(1000), gallery: z.array(z.string()).max(12), category: z.string().max(60), badge: z.string().max(30),
  stock: z.number().int().min(0).nullable(), externalLink: z.string().max(1000), active: z.boolean(), featured: z.boolean(), sortOrder: z.number().int(),
});
const productOut = productIn.extend({ id: z.string() });
const orderOut = z.object({ id: z.string(), number: z.number(), amount: z.number(), status: z.string(), customerName: z.string(), phone: z.string(), address: z.string(), items: z.string(), refId: z.string(), created: z.string() });

export default createEndpoint({
  description: 'Admin: manage Kapoosh shop products and view orders',
  inputSchema: z.object({
    token: tokenField,
    action: z.enum(['list', 'save', 'delete', 'reorder', 'orders', 'orderStatus']),
    id: z.string().optional(), data: productIn.optional(), ids: z.array(z.string()).optional(),
    status: z.enum(['pending', 'paid', 'failed', 'canceled', 'shipped']).optional(),
  }),
  outputSchema: z.object({ products: z.array(productOut), orders: z.array(orderOut), gateway: z.string() }),
  execute: async ({ input }) => {
    const { member } = await requireStaff(input.token, 'shop.manage');
    if (input.action === 'save' && input.data) {
      const { gallery, ...d } = input.data;
      const record = { ...d, gallery: JSON.stringify(gallery), image: d.image || null, externalLink: d.externalLink || null } as never;
      if (input.id) await zite.products.update({ id: input.id, record }); else await zite.products.create({ record });
      await audit(member.id, input.id ? 'product.update' : 'product.create', 'product', input.id ?? '', { name: d.name });
    }
    if (input.action === 'delete' && input.id) { await zite.products.delete({ id: input.id }); await audit(member.id, 'product.delete', 'product', input.id); }
    if (input.action === 'reorder' && input.ids) await Promise.all(input.ids.map((id, i) => zite.products.update({ id, record: { sortOrder: i } })));
    if (input.action === 'orderStatus' && input.id && input.status) { await zite.orders.update({ id: input.id, record: { status: input.status } }); await audit(member.id, 'order.status', 'order', input.id, { status: input.status }); }

    const gateway = activeGateway()?.label ?? '';
    if (input.action === 'orders' || input.action === 'orderStatus') {
      const { records } = await zite.orders.findAll({ limit: 500 });
      return {
        products: [] as z.infer<typeof productOut>[], gateway,
        orders: records.sort((a, b) => (b.orderNumber ?? 0) - (a.orderNumber ?? 0)).map((o) => ({ id: o.id, number: o.orderNumber ?? 0, amount: o.amount ?? 0, status: o.status ?? 'pending', customerName: o.customerName ?? '', phone: o.phone ?? '', address: o.address ?? '', items: o.itemsJson ?? '[]', refId: o.refId ?? '', created: o.created ?? '' })),
      };
    }
    const { records } = await zite.products.findAll({ limit: 1000 });
    return {
      orders: [] as z.infer<typeof orderOut>[], gateway,
      products: records.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((p) => ({
        id: p.id, name: p.name ?? '', description: p.description ?? '', price: p.price ?? 0, compareAtPrice: p.compareAtPrice ?? null, image: p.image ?? '',
        gallery: (() => { try { return JSON.parse(p.gallery ?? '[]') as string[]; } catch { return []; } })(), category: p.category ?? '', badge: p.badge ?? '',
        stock: p.stock ?? null, externalLink: p.externalLink ?? '', active: !!p.active, featured: !!p.featured, sortOrder: p.sortOrder ?? 0,
      })),
    };
  },
});
