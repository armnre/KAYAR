/**
 * Payment gateway layer. Add a gateway by implementing `Gateway` and registering it in GATEWAYS.
 * Activate Zarinpal by adding the secret ZITE_ZARINPAL_MERCHANT_ID (ZITE_ZARINPAL_SANDBOX=1 for testing).
 * Amounts are in Toman throughout the app; Zarinpal is called with currency IRT.
 */
export type PayRequest = { amount: number; description: string; callbackUrl: string; mobile?: string; orderId: string };
export type Gateway = {
  id: string;
  label: string;
  configured(): boolean;
  request(r: PayRequest): Promise<{ authority: string; redirectUrl: string }>;
  verify(authority: string, amount: number): Promise<{ ok: boolean; refId?: string; error?: string }>;
};

const env = (k: string) => (process.env as Record<string, string | undefined>)[k];

const zarinpal: Gateway = {
  id: 'zarinpal',
  label: 'زرین‌پال',
  configured: () => !!env('ZITE_ZARINPAL_MERCHANT_ID'),
  async request(r) {
    const host = env('ZITE_ZARINPAL_SANDBOX') ? 'sandbox.zarinpal.com' : 'payment.zarinpal.com';
    const res = await fetch(`https://${host}/pg/v4/payment/request.json`, {
      method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ merchant_id: env('ZITE_ZARINPAL_MERCHANT_ID'), amount: r.amount, currency: 'IRT', description: r.description, callback_url: r.callbackUrl, metadata: { mobile: r.mobile, order_id: r.orderId } }),
    });
    const j = (await res.json()) as { data?: { code?: number; authority?: string }; errors?: unknown };
    if (j.data?.code !== 100 || !j.data.authority) throw new Error(`zarinpal request failed: ${JSON.stringify(j.errors ?? j.data)}`);
    return { authority: j.data.authority, redirectUrl: `https://${host}/pg/StartPay/${j.data.authority}` };
  },
  async verify(authority, amount) {
    const host = env('ZITE_ZARINPAL_SANDBOX') ? 'sandbox.zarinpal.com' : 'payment.zarinpal.com';
    const res = await fetch(`https://${host}/pg/v4/payment/verify.json`, {
      method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ merchant_id: env('ZITE_ZARINPAL_MERCHANT_ID'), amount, authority }),
    });
    const j = (await res.json()) as { data?: { code?: number; ref_id?: number } };
    const ok = j.data?.code === 100 || j.data?.code === 101;
    return ok ? { ok, refId: String(j.data?.ref_id ?? '') } : { ok, error: `code ${j.data?.code ?? 'unknown'}` };
  },
};

export const GATEWAYS: Gateway[] = [zarinpal];
export const activeGateway = () => GATEWAYS.find((g) => g.configured()) ?? null;
export const gatewayById = (id: string) => GATEWAYS.find((g) => g.id === id) ?? null;
