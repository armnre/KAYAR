import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { activeGateway, gatewayById } from '../server/payments';
import { normalizePhone, sendSms } from '../server/sms';

const product = z.object({ id: z.string(), name: z.string(), description: z.string(), price: z.number(), compareAtPrice: z.number().nullable(), image: z.string(), category: z.string(), badge: z.string(), inStock: z.boolean(), link: z.string(), featured: z.boolean() });

export default createEndpoint({
  description: 'Kapoosh shop: list products, start checkout through the payment gateway, verify payment callback',
  inputSchema: z.object({
    action: z.enum(['list', 'checkout', 'verify']),
    items: z.array(z.object({ id: z.string(), qty: z.number().int().min(1).max(20) })).max(30).optional(),
    customer: z.object({ name: z.string().min(2).max(80), phone: z.string().max(20), address: z.string().min(10).max(500) }).optional(),
    orderId: z.string().optional(), authority: z.string().optional(), gatewayStatus: z.string().optional(),
  }),
  outputSchema: z.object({
    products: z.array(product), gatewayReady: z.boolean(),
    redirectUrl: z.string().nullable(), orderNumber: z.number().nullable(), paid: z.boolean().nullable(), refId: z.string().nullable(),
  }),
  execute: async ({ input }) => {
    const base = { products: [] as z.infer<typeof product>[], gatewayReady: !!activeGateway(), redirectUrl: null as string | null, orderNumber: null as number | null, paid: null as boolean | null, refId: null as string | null };
    if (input.action === 'list') {
      const { records } = await zite.products.findAll({ filters: { active: true }, limit: 500 });
      return {
        ...base,
        products: records.sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((p) => ({
          id: p.id, name: p.name ?? '', description: p.description ?? '', price: p.price ?? 0, compareAtPrice: p.compareAtPrice ?? null, image: p.image ?? '',
          category: p.category ?? '', badge: p.badge ?? '', inStock: p.stock == null || p.stock > 0, link: p.externalLink ?? '', featured: !!p.featured,
        })),
      };
    }
    if (input.action === 'checkout') {
      const gw = activeGateway();
      if (!gw) throw new ZiteError({ code: 'BAD_REQUEST', message: 'no gateway', userFacingMessage: 'پرداخت آنلاین هنوز فعال نشده است.' });
      const phone = normalizePhone(input.customer?.phone ?? '');
      if (!input.customer || !phone || !input.items?.length) throw new ZiteError({ code: 'BAD_REQUEST', message: 'invalid', userFacingMessage: 'اطلاعات سفارش کامل نیست.' });
      const { records } = await zite.products.findAll({ filters: { id: { in: input.items.map((i) => i.id) }, active: true }, limit: 100 });
      const lines = input.items.map((i) => { const p = records.find((r) => r.id === i.id); if (!p) throw new ZiteError({ code: 'BAD_REQUEST', message: 'product', userFacingMessage: 'یکی از محصولات دیگر موجود نیست.' }); return { id: p.id, name: p.name, price: p.price ?? 0, qty: i.qty }; });
      const amount = lines.reduce((s, l) => s + l.price * l.qty, 0);
      const order = await zite.orders.create({ record: { itemsJson: JSON.stringify(lines), amount, status: 'pending', gateway: gw.id, customerName: input.customer.name, phone, address: input.customer.address } });
      const { authority, redirectUrl } = await gw.request({ amount, description: `سفارش کاپوش #${order.orderNumber}`, callbackUrl: `${process.env.ZITE_APP_URL}/shop/callback?order=${order.id}`, mobile: phone, orderId: order.id });
      await zite.orders.update({ id: order.id, record: { authority } });
      return { ...base, redirectUrl, orderNumber: order.orderNumber ?? null };
    }
    // verify
    const order = input.orderId ? await zite.orders.findOne({ id: input.orderId }) : null;
    if (!order) throw new ZiteError({ code: 'NOT_FOUND', message: 'order', userFacingMessage: 'سفارش پیدا نشد.' });
    if (order.status === 'paid') return { ...base, paid: true, refId: order.refId ?? null, orderNumber: order.orderNumber ?? null };
    const gw = gatewayById(order.gateway ?? '');
    const ok = input.gatewayStatus === 'OK' && gw && input.authority === order.authority ? await gw.verify(order.authority!, order.amount ?? 0) : { ok: false };
    await zite.orders.update({ id: order.id, record: ok.ok ? { status: 'paid', refId: ok.refId ?? '' } : { status: 'failed' } });
    if (ok.ok && order.phone) await sendSms(order.phone, `کاپوش: سفارش #${order.orderNumber} پرداخت شد. کد پیگیری: ${ok.refId}`, 'order').catch(() => null);
    return { ...base, paid: ok.ok, refId: ok.ok ? ok.refId ?? null : null, orderNumber: order.orderNumber ?? null };
  },
});
