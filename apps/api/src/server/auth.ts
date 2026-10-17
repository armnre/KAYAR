import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import argon2 from 'argon2';
import { ApiError } from './backend.js';
import { zite } from './db.js';

/* ---------- normalisation ---------- */
const FA = '۰۱۲۳۴۵۶۷۸۹';
const AR = '٠١٢٣٤٥٦٧٨٩';
export function latinDigits(s: string) {
  return s.replace(/[۰-۹٠-٩]/g, (d) => String(FA.indexOf(d) >= 0 ? FA.indexOf(d) : AR.indexOf(d)));
}
/** Returns 09xxxxxxxxx or null. */
export function normalizePhone(raw: string): string | null {
  let s = latinDigits(raw).replace(/[\s\-()]/g, '');
  if (s.startsWith('+98')) s = '0' + s.slice(3);
  else if (s.startsWith('0098')) s = '0' + s.slice(4);
  else if (/^98\d{10}$/.test(s)) s = '0' + s.slice(2);
  else if (/^9\d{9}$/.test(s)) s = '0' + s;
  return /^09\d{9}$/.test(s) ? s : null;
}
export function normalizeUsername(raw: string): string {
  const s = latinDigits(raw).trim().replace(/\s+/g, '').toLowerCase();
  return normalizePhone(s) ?? s;
}

/* ---------- passwords ---------- */
// New hashes use argon2id. Legacy `pbkdf2$<iter>$<salt>$<hash>` hashes are still
// accepted at login and transparently upgraded to argon2id afterwards.
const ARGON_OPTS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

const pepper = () => process.env.AUTH_PEPPER ?? '';

function withPepper(password: string) {
  return password + pepper();
}

export async function hashPassword(password: string) {
  return argon2.hash(withPepper(password), ARGON_OPTS);
}

export function isLegacyHash(stored?: string | null) {
  return !!stored && stored.startsWith('pbkdf2$');
}

/** Verifies a legacy PBKDF2 hash (SHA-256, base64 salt/hash). */
function verifyPbkdf2(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iter = Number(parts[1]);
  const salt = Buffer.from(parts[2], 'base64');
  const expected = Buffer.from(parts[3], 'base64');
  if (!Number.isFinite(iter) || iter <= 0 || salt.length === 0 || expected.length === 0) return false;
  const candidates = pepper() ? [withPepper(password), password] : [password];
  for (const candidate of candidates) {
    const got = pbkdf2Sync(candidate, salt, iter, expected.length, 'sha256');
    if (got.length === expected.length && timingSafeEqual(got, expected)) return true;
  }
  return false;
}

/** Always runs a full derivation (even for unknown users) to avoid timing leaks. */
export async function verifyPassword(password: string, stored?: string | null): Promise<boolean> {
  if (!stored) {
    // Dummy verification so a missing account costs the same as a wrong password.
    try { await argon2.verify('$argon2id$v=19$m=19456,t=2,p=1$Y2FudmFyaXVt$0000000000000000000000000000000000000000000', 'dummy'); } catch { /* ignore */ }
    return false;
  }
  if (isLegacyHash(stored)) return verifyPbkdf2(password, stored);
  try {
    return await argon2.verify(stored, withPepper(password));
  } catch {
    return false;
  }
}

const COMMON = ['12345678', '123456789', '1234567890', 'password', 'password1', 'qwerty123', '11111111', '00000000', '87654321', 'iloveyou', 'kapoosh', 'kayar123', 'abcd1234', 'qwertyui'];
export function passwordPolicyError(pw: string, ctx: { username?: string; phone?: string; name?: string }) {
  if (pw.length < 8) return 'رمز باید حداقل ۸ نویسه باشد.';
  if (pw.length > 128) return 'رمز بیش از حد طولانی است.';
  const low = latinDigits(pw).toLowerCase();
  if (COMMON.includes(low) || /^(\d)\1+$/.test(low)) return 'این رمز خیلی رایج است؛ رمز دیگری انتخاب کن.';
  for (const v of [ctx.username, ctx.phone, ctx.name]) if (v && low === latinDigits(v).toLowerCase().replace(/\s+/g, '')) return 'رمز نباید با نام کاربری، شماره یا نام یکی باشد.';
  return null;
}
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; // no O0Il1
export function generateTempPassword(len = 10) {
  const out: string[] = [];
  while (out.length < len) {
    const b = randomBytes(32);
    for (const x of b) if (x < 256 - (256 % ALPHA.length) && out.length < len) out.push(ALPHA[x % ALPHA.length]);
  }
  return out.join('');
}

/* ---------- session tokens ---------- */
export function newToken() {
  return randomBytes(32).toString('base64url');
}
export function sha256(s: string) {
  return createHash('sha256').update(s).digest('hex');
}

export const MEMBER_TTL = 30 * 24 * 3600_000;
export const STAFF_TTL = 12 * 3600_000;

/* ---------- rate limit ---------- */
const WINDOW = 15 * 60_000;
const MAX = 5;

export async function assertNotLocked(key: string) {
  const rec = await zite.loginAttempts.findOne({ filters: { key } });
  if (rec?.lockedUntil && new Date(rec.lockedUntil).getTime() > Date.now()) {
    const min = Math.ceil((new Date(rec.lockedUntil).getTime() - Date.now()) / 60_000);
    throw new ApiError({ code: 'RATE_LIMITED', message: 'locked', userFacingMessage: `به دلیل تلاش‌های ناموفق، ورود تا ${min.toLocaleString('fa-IR')} دقیقه‌ی دیگر قفل است.` });
  }
  return rec;
}

export async function recordFailure(key: string, rec?: { id: string; count?: number; windowStart?: string }) {
  const now = Date.now();
  const fresh = !rec?.windowStart || now - new Date(rec.windowStart).getTime() > WINDOW;
  const count = fresh ? 1 : (rec?.count ?? 0) + 1;
  const record = { key, count, windowStart: fresh ? new Date(now).toISOString() : rec!.windowStart!, lockedUntil: count >= MAX ? new Date(now + WINDOW).toISOString() : null };
  if (rec) await zite.loginAttempts.update({ id: rec.id, record });
  else await zite.loginAttempts.create({ record });
}

export async function clearAttempts(rec?: { id: string }) {
  if (rec) await zite.loginAttempts.delete({ id: rec.id });
}
