import { zite } from 'zitejs/db';

/**
 * SMS layer. Set secrets ZITE_SMS_PROVIDER (kavenegar | smsir) + ZITE_SMS_API_KEY (+ ZITE_SMS_SENDER line number).
 * Without them every message is logged as "simulated" so flows can be built and tested now.
 */
type Provider = { id: string; label: string; send(to: string, body: string): Promise<void> };
const env = (k: string) => (process.env as Record<string, string | undefined>)[k];

const PROVIDERS: Record<string, Provider> = {
  kavenegar: {
    id: 'kavenegar', label: 'کاوه‌نگار',
    async send(to, body) {
      const u = new URL(`https://api.kavenegar.com/v1/${env('ZITE_SMS_API_KEY')}/sms/send.json`);
      u.searchParams.set('receptor', to); u.searchParams.set('message', body);
      if (env('ZITE_SMS_SENDER')) u.searchParams.set('sender', env('ZITE_SMS_SENDER')!);
      const r = await fetch(u); if (!r.ok) throw new Error(`kavenegar ${r.status}`);
    },
  },
  smsir: {
    id: 'smsir', label: 'SMS.ir',
    async send(to, body) {
      const r = await fetch('https://api.sms.ir/v1/send/bulk', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': env('ZITE_SMS_API_KEY') ?? '' },
        body: JSON.stringify({ lineNumber: Number(env('ZITE_SMS_SENDER') ?? 0), messageText: body, mobiles: [to] }),
      });
      if (!r.ok) throw new Error(`smsir ${r.status}`);
    },
  },
};

export function smsProvider(): Provider | null {
  const p = PROVIDERS[env('ZITE_SMS_PROVIDER') ?? ''];
  return p && env('ZITE_SMS_API_KEY') ? p : null;
}
export const normalizePhone = (p: string) => {
  const d = p.replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/\D/g, '');
  const m = d.match(/^(?:0098|98|0)?(9\d{9})$/);
  return m ? `0${m[1]}` : null;
};

/** Sends (or simulates) one SMS and records it in the Sms Messages log. */
export async function sendSms(to: string, body: string, purpose = 'manual') {
  const phone = normalizePhone(to);
  const p = smsProvider();
  let status: 'sent' | 'failed' | 'simulated' = p ? 'sent' : 'simulated';
  let error = '';
  if (!phone) { status = 'failed'; error = 'شماره نامعتبر'; }
  else if (p) { try { await p.send(phone, body); } catch (e) { status = 'failed'; error = (e as Error).message.slice(0, 200); } }
  await zite.smsMessages.create({ record: { to: phone ?? to, body, status, provider: p?.id ?? 'none', purpose, error } });
  return { status, error };
}
