// In-memory fixed-window rate limiter (no extra infrastructure). Per-process; resets on restart.
import type { Request, Response, NextFunction } from 'express';

type Bucket = { n: number; reset: number };
const buckets = new Map<string, Bucket>();
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k); }, 60_000).unref();

const num = (v: string | undefined, d: number) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; };
export const RL_DISABLED = process.env.RATE_LIMIT_DISABLED === '1';

/** Returns seconds to wait if over the limit, else 0. */
export function hit(key: string, max: number, windowMs: number): number {
  if (RL_DISABLED) return 0;
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset < now) { b = { n: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.n++;
  return b.n > max ? Math.ceil((b.reset - now) / 1000) : 0;
}

export const RATE_MSG = 'تعداد درخواست‌ها بیش از حد مجاز است؛ لطفاً کمی صبر کنید و دوباره تلاش کنید.';
export function tooMany(res: Response, retryAfter: number, message = RATE_MSG) {
  res.setHeader('Retry-After', String(retryAfter));
  res.status(429).json({ statusCode: 429, error: 'Too Many Requests', code: 'RATE_LIMITED', message });
}

/* Per-endpoint rules for POST /api/:name — [max, windowMs, scope] */
const M = 60_000;
type Rule = { max: number; win: number; msg?: string };
const AUTH_MSG = 'تلاش‌های ورود زیاد بود؛ چند دقیقه صبر کنید و دوباره امتحان کنید.';
export const RULES: Record<string, Rule[]> = {
  authLogin: [{ max: num(process.env.RL_LOGIN_PER_MIN, 10), win: M, msg: AUTH_MSG }, { max: num(process.env.RL_LOGIN_PER_15MIN, 30), win: 15 * M, msg: AUTH_MSG }],
  authChangePassword: [{ max: 5, win: 10 * M, msg: AUTH_MSG }],
  adminMemberAction: [{ max: 60, win: 10 * M }], // includes password resets (may send SMS)
  adminMemberCreate: [{ max: 60, win: 10 * M }],
  adminMemberBulk: [{ max: 20, win: 10 * M }],
  adminSms: [{ max: num(process.env.RL_SMS_PER_HOUR, 30), win: 60 * M, msg: 'سقف ارسال پیامک در این ساعت پر شده است.' }],
  coachChat: [{ max: 10, win: M }],
  generatePlan: [{ max: 3, win: M }],
};
/** appCampaigns actions that send SMS / start payments get a tight limit; reads stay generous. */
export const CAMPAIGN_COSTLY = new Set(['register', 'checkout', 'verify', 'claim']);
export const PUBLIC_READ = new Set(['publicCms', 'publicSettings', 'publicPosts']);
const GENERAL = num(process.env.RL_API_PER_MIN, 120);
const PUBLIC = num(process.env.RL_PUBLIC_PER_MIN, 600);

export function apiLimiter(req: Request, res: Response, next: NextFunction) {
  const name = req.params.name;
  const ip = req.ip ?? 'unknown';
  // general bucket (public read endpoints use their own, looser bucket)
  const pub = PUBLIC_READ.has(name);
  let wait = hit(pub ? `pub:${ip}` : `api:${ip}`, pub ? PUBLIC : GENERAL, M);
  if (wait) return tooMany(res, wait);
  for (const [i, r] of (Object.hasOwn(RULES, name) ? RULES[name] : []).entries()) {
    wait = hit(`ep:${name}:${i}:${ip}`, r.max, r.win);
    if (wait) return tooMany(res, wait, r.msg);
  }
  if (name === 'appCampaigns' && CAMPAIGN_COSTLY.has(String(req.body?.inputs?.action))) {
    wait = hit(`camp:${ip}`, num(process.env.RL_CAMPAIGN_ACTIONS_PER_HOUR, 20), 60 * M);
    if (wait) return tooMany(res, wait);
  }
  next();
}
