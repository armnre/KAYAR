import { ZiteError } from 'zitejs/backend';

/** Bounded, SSRF-guarded fetch for ingestion. Blocks private/internal hosts, caps size, time and redirects. */
const PRIVATE = [/^localhost$/i, /\.local$/i, /\.internal$/i, /^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^169\.254\./, /^0\./, /^\[?::1\]?$/, /^\[?f[cd]/i, /^\[?fe80/i, /^metadata/i];

export function assertPublicUrl(raw: string): URL {
  let u: URL;
  try { u = new URL(raw); } catch { throw bad('آدرس نامعتبر است.'); }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw bad('فقط آدرس‌های http/https مجازند.');
  if (u.username || u.password) throw bad('آدرس نباید شامل نام کاربری باشد.');
  if (PRIVATE.some((r) => r.test(u.hostname))) throw bad('این میزبان مجاز نیست.');
  return u;
}

function bad(msg: string) {
  return new ZiteError({ code: 'BAD_REQUEST', message: msg, userFacingMessage: msg });
}

export async function safeFetchText(raw: string, opts: { maxBytes?: number; accept?: RegExp } = {}): Promise<{ text: string; finalUrl: string; contentType: string }> {
  const maxBytes = opts.maxBytes ?? 5_000_000;
  let url = assertPublicUrl(raw);
  for (let hop = 0; hop < 4; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(url.toString(), { redirect: 'manual', signal: controller.signal, headers: { 'user-agent': 'KAYAR-Ingest/1.0 (+feeds only)' } });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) throw bad('ریدایرکت نامعتبر.');
        url = assertPublicUrl(new URL(loc, url).toString());
        continue;
      }
      if (!res.ok) throw bad(`منبع پاسخ ${res.status} داد.`);
      const contentType = res.headers.get('content-type') ?? '';
      if (opts.accept && !opts.accept.test(contentType)) throw bad(`نوع محتوا پشتیبانی نمی‌شود (${contentType || 'نامشخص'}).`);
      const len = Number(res.headers.get('content-length') ?? 0);
      if (len > maxBytes) throw bad('حجم پاسخ بیش از حد مجاز است.');
      const buf = await res.arrayBuffer();
      if (buf.byteLength > maxBytes) throw bad('حجم پاسخ بیش از حد مجاز است.');
      return { text: new TextDecoder().decode(buf), finalUrl: url.toString(), contentType };
    } catch (e) {
      if (e instanceof ZiteError) throw e;
      throw bad('دریافت منبع ناموفق بود (زمان یا شبکه).');
    } finally {
      clearTimeout(timer);
    }
  }
  throw bad('تعداد ریدایرکت‌ها زیاد است.');
}
