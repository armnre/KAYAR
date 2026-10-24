import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { campaignDto, toCampaign, isLive } from '../server/campaigns';
import { activeGateway, gatewayById } from '../server/payments';
import { normalizePhone, sendSms } from '../server/sms';
import { requireSession } from '../server/rbac';
import { assertPublicUrl } from '../server/guard';

const fail = (code: 'BAD_REQUEST' | 'NOT_FOUND', msg: string) => new ZiteError({ code, message: msg, userFacingMessage: msg });

export default createEndpoint({
  description: 'KAYAR Picks: list live campaigns/products, show one, track views/clicks, buy through the payment gateway and verify payment',
  inputSchema: z.object({
    action: z.enum(['list', 'get', 'track', 'checkout', 'verify', 'register', 'claim', 'mine']),
    token: z.string().max(100).optional(),
    placement: z.enum(['home', 'morshed', 'bodyyar']).default('home'),
    id: z.string().max(64).optional(),
    event: z.enum(['view', 'click']).optional(),
    qty: z.number().int().min(1).max(20).optional(),
    customer: z.object({ name: z.string().trim().min(2).max(80), phone: z.string().max(20), address: z.string().trim().max(500) }).optional(),
    orderId: z.string().optional(), authority: z.string().optional(), gatewayStatus: z.string().optional(),
  }),
  outputSchema: z.object({
    items: z.array(campaignDto), gatewayReady: z.boolean(),
    redirectUrl: z.string().nullable(), orderNumber: z.number().nullable(), paid: z.boolean().nullable(), refId: z.string().nullable(), itemTitle: z.string().nullable(),
    mine: z.object({ registered: z.boolean(), status: z.string(), code: z.string(), registrations: z.number() }).nullable(),
  }),
  execute: async ({ input }) => {
    const base = { items: [] as z.infer<typeof campaignDto>[], gatewayReady: !!activeGateway(), redirectUrl: null as string | null, orderNumber: null as number | null, paid: null as boolean | null, refId: null as string | null, itemTitle: null as string | null, mine: null as null | { registered: boolean; status: string; code: string; registrations: number } };
    const pub = (c: z.infer<typeof campaignDto>) => ({ ...c, impressions: 0, clicks: 0, partnerApiUrl: '' });

    if (input.action === 'track') {
      if (!input.id || !input.event) return base;
      const c = await zite.campaigns.findOne({ id: input.id });
      if (c) await zite.campaigns.update({ id: c.id, record: input.event === 'view' ? { impressions: (c.impressions ?? 0) + 1 } : { clicks: (c.clicks ?? 0) + 1 } });
      return base;
    }
    if (input.action === 'list') {
      const { records } = await zite.campaigns.findAll({ filters: { status: 'active' }, limit: 200 });
      const items = records.map(toCampaign).filter((c) => isLive(c) && c.placements.includes(input.placement)).sort((a, b) => b.priority - a.priority).map(pub);
      return { ...base, items };
    }
    if (input.action === 'get') {
      const r = input.id ? await zite.campaigns.findOne({ id: input.id }) : null;
      const c = r ? toCampaign(r) : null;
      if (!c || !isLive(c)) throw fail('NOT_FOUND', 'این پیشنهاد دیگر در دسترس نیست.');
      return { ...base, items: [pub(c)] };
    }
    if (input.action === 'register' || input.action === 'claim' || input.action === 'mine') {
      const { member } = await requireSession(input.token ?? '');
      const r = input.id ? await zite.campaigns.findOne({ id: input.id }) : null;
      const c = r ? toCampaign(r) : null;
      if (!c || !isLive(c)) throw fail('NOT_FOUND', 'این پیشنهاد دیگر در دسترس نیست.');
      const kind = input.action === 'register' ? 'register' : 'code';
      const { records: all } = await zite.campaignRegistrations.findAll({ filters: { campaign: c.id }, limit: 2000 });
      const active = all.filter((x) => x.status !== 'canceled' && x.kind === 'register');
      const own = all.find((x) => x.memberId === member.id && x.status !== 'canceled' && (input.action === 'mine' || x.kind === kind));
      const mine = (x?: typeof own) => ({ registered: !!x, status: x?.status ?? '', code: x?.code ?? '', registrations: active.length });
      if (input.action === 'mine' || own) return { ...base, mine: mine(own) };
      const name = input.customer?.name || member.displayName || '';
      const phone = normalizePhone(input.customer?.phone || member.phone || '') ?? '';
      if (kind === 'register') {
        if (name.length < 2 || !phone) throw fail('BAD_REQUEST', 'نام و شماره موبایل معتبر لازم است.');
        const full = c.stock != null && active.length >= c.stock;
        const rec = await zite.campaignRegistrations.create({ record: { fullName: name, phone, campaign: c.id, memberId: member.id, kind, status: full ? 'waitlist' : 'confirmed', code: `KR-${Math.random().toString(36).slice(2, 7).toUpperCase()}`, note: input.customer?.address ?? '' } });
        if (phone) await sendSms(phone, `کایار: ثبت‌نام شما در «${c.title}» ${full ? 'در لیست انتظار' : 'تأیید'} شد. کد: ${rec.code}`, 'order').catch(() => null);
        return { ...base, mine: { ...mine(rec), registrations: active.length + (full ? 0 : 1) } };
      }
      // claim a discount code: partner API → unique generated code → shared code
      let code = c.discountCode;
      if (c.partnerApiUrl) {
        const url = assertPublicUrl(c.partnerApiUrl);
        const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ campaignId: c.id, memberId: member.id, phone, name, source: 'kayar' }) }).catch(() => null);
        const j = res?.ok ? ((await res.json().catch(() => ({}))) as { code?: string }) : {};
        if (!j.code) throw fail('BAD_REQUEST', `دریافت کد از ${c.partnerName || 'فروشگاه همکار'} فعلاً ممکن نیست. کمی بعد دوباره امتحان کن.`);
        code = String(j.code).slice(0, 60);
      } else if (c.uniqueCodes) code = `${c.discountCode || 'KAYAR'}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      if (!code) throw fail('BAD_REQUEST', 'کدی برای این پیشنهاد تعریف نشده است.');
      const rec = await zite.campaignRegistrations.create({ record: { fullName: name, phone, campaign: c.id, memberId: member.id, kind, status: 'confirmed', code, note: '' } });
      return { ...base, mine: mine(rec) };
    }
    if (input.action === 'checkout') {
      const gw = activeGateway();
      if (!gw) throw fail('BAD_REQUEST', 'پرداخت آنلاین به‌زودی فعال می‌شود.');
      const r = input.id ? await zite.campaigns.findOne({ id: input.id }) : null;
      const c = r ? toCampaign(r) : null;
      if (!c || !isLive(c) || !c.purchasable || c.amount <= 0) throw fail('BAD_REQUEST', 'این مورد قابل خرید نیست.');
      const qty = input.qty ?? 1;
      if (c.stock != null && c.stock - c.sold < qty) throw fail('BAD_REQUEST', 'موجودی کافی نیست.');
      const phone = normalizePhone(input.customer?.phone ?? '');
      if (!input.customer || !phone) throw fail('BAD_REQUEST', 'نام و شماره موبایل معتبر لازم است.');
      if (c.kind === 'product' && input.customer.address.length < 10) throw fail('BAD_REQUEST', 'آدرس کامل برای ارسال لازم است.');
      const amount = c.amount * qty;
      const order = await zite.orders.create({ record: { itemsJson: JSON.stringify([{ campaignId: c.id, name: c.title, price: c.amount, qty }]), amount, status: 'pending', gateway: gw.id, customerName: input.customer.name, phone, address: input.customer.address } });
      const { authority, redirectUrl } = await gw.request({ amount, description: `کایار — ${c.title}`.slice(0, 200), callbackUrl: `${process.env.ZITE_APP_URL}/shop/callback?order=${order.id}`, mobile: phone, orderId: order.id });
      await zite.orders.update({ id: order.id, record: { authority } });
      return { ...base, redirectUrl, orderNumber: order.orderNumber ?? null };
    }
    // verify
    const order = input.orderId ? await zite.orders.findOne({ id: input.orderId }) : null;
    if (!order) throw fail('NOT_FOUND', 'سفارش پیدا نشد.');
    const line = (JSON.parse(order.itemsJson || '[]') as { campaignId?: string; name?: string; qty?: number }[])[0] ?? {};
    const out = { ...base, orderNumber: order.orderNumber ?? null, itemTitle: line.name ?? null };
    if (order.status === 'paid') return { ...out, paid: true, refId: order.refId ?? null };
    const gw = gatewayById(order.gateway ?? '');
    const ok = input.gatewayStatus === 'OK' && gw && input.authority === order.authority ? await gw.verify(order.authority!, order.amount ?? 0) : { ok: false, refId: undefined };
    await zite.orders.update({ id: order.id, record: ok.ok ? { status: 'paid', refId: ok.refId ?? '' } : { status: 'failed' } });
    if (ok.ok && line.campaignId) {
      const c = await zite.campaigns.findOne({ id: line.campaignId });
      if (c) await zite.campaigns.update({ id: c.id, record: { sold: (c.sold ?? 0) + (line.qty ?? 1) } });
    }
    if (ok.ok && order.phone) await sendSms(order.phone, `کایار: سفارش #${order.orderNumber} پرداخت شد. کد پیگیری: ${ok.refId}`, 'order').catch(() => null);
    return { ...out, paid: ok.ok, refId: ok.ok ? ok.refId ?? null : null };
  },
});
