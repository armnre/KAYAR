/**
 * OTP domain — policy + pure helpers.
 *
 * Server responsibilities (implemented by the Phase 2 auth service):
 *  1. generate with CSPRNG
 *  2. store HASHED (bcrypt/argon2), never raw
 *  3. TTL 120s, single use, max 5 verification attempts
 *  4. per-phone and per-IP rate limits
 *  5. audit every request/verify/failure WITHOUT the code
 *
 * The UI only needs the policy and safe formatting helpers, all exported below.
 */

export const OTP_LENGTH = 6;
export const OTP_TTL_SECONDS = 120;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 45;

export const OTP_POLICY = {
  length: OTP_LENGTH,
  ttlSeconds: OTP_TTL_SECONDS,
  maxAttempts: OTP_MAX_ATTEMPTS,
  resendCooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
} as const;

/** Digits only, clipped to 6 — safe to call on every keystroke or paste. */
export function sanitizeOtpInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export function isValidOtpFormat(value: string): boolean {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(value);
}

export function splitOtpDigits(value: string, length = OTP_LENGTH): string[] {
  const clean = sanitizeOtpInput(value);
  return Array.from({ length }, (_, i) => clean[i] ?? "");
}

export function otpRemainingSeconds(issuedAtMs: number, nowMs: number): number {
  const left = Math.ceil((issuedAtMs + OTP_TTL_SECONDS * 1000 - nowMs) / 1000);
  return Math.max(0, Math.min(OTP_TTL_SECONDS, left));
}

export function isOtpExpired(issuedAtMs: number, nowMs: number): boolean {
  return otpRemainingSeconds(issuedAtMs, nowMs) === 0;
}

/** Cooldown gate for the "resend" button (UX only — the server enforces the real limit). */
export function canResend(lastRequestedAtMs: number | null, nowMs: number, cooldownSeconds = OTP_RESEND_COOLDOWN_SECONDS): boolean {
  if (lastRequestedAtMs === null) return true;
  return nowMs - lastRequestedAtMs >= cooldownSeconds * 1000;
}

export function resendWaitSeconds(lastRequestedAtMs: number, nowMs: number, cooldownSeconds = OTP_RESEND_COOLDOWN_SECONDS): number {
  if (lastRequestedAtMs === null) return 0;
  return Math.max(0, Math.ceil(cooldownSeconds - (nowMs - lastRequestedAtMs) / 1000));
}
