/**
 * Rate limiting (Phase 1 §35).
 *
 * The interface is the contract. `FixedWindowRateLimiter` is a real, correct
 * implementation usable in-process for development and tests; production MUST plug in
 * a shared backend (Redis / Postgres) behind the same interface.
 *
 * IMPORTANT: a browser-side countdown is NOT rate limiting — it is UX cooldown only
 * (`UX_COOLDOWN` below). The authoritative check happens server side.
 */

export interface RateLimitRule {
  /** e.g. "otp:request:98912…", "otp:verify:203.0.113.9" */
  key: string;
  max: number;
  windowMs: number;
}

export type RateLimitDecision =
  | { allowed: true; remaining: number; resetAtMs: number }
  | { allowed: false; remaining: 0; resetAtMs: number; retryAfterMs: number };

export interface RateLimiter {
  consume(rule: RateLimitRule, nowMs?: number): Promise<RateLimitDecision>;
  reset(key: string): Promise<void>;
}

/** Reference rules — the auth service applies these verbatim. */
export const RATE_LIMITS: Record<
  "otpRequestByPhone" | "otpRequestByIp" | "otpVerifyByPhone" | "loginByPhone" | "adminActionByUser",
  { max: number; windowMs: number }
> = {
  otpRequestByPhone: { max: 3, windowMs: 10 * 60 * 1000 },
  otpRequestByIp: { max: 20, windowMs: 10 * 60 * 1000 },
  otpVerifyByPhone: { max: 5, windowMs: 10 * 60 * 1000 },
  loginByPhone: { max: 10, windowMs: 15 * 60 * 1000 },
  adminActionByUser: { max: 30, windowMs: 60 * 1000 },
};

/** Correct in-memory fixed window (single process only). */
export class FixedWindowRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, { count: number; resetAtMs: number }>();

  async consume(rule: RateLimitRule, nowMs = Date.now()): Promise<RateLimitDecision> {
    const bucket = this.buckets.get(rule.key);
    if (!bucket || bucket.resetAtMs <= nowMs) {
      const resetAtMs = nowMs + rule.windowMs;
      this.buckets.set(rule.key, { count: 1, resetAtMs });
      return { allowed: true, remaining: Math.max(0, rule.max - 1), resetAtMs };
    }
    bucket.count += 1;
    if (bucket.count > rule.max) {
      return {
        allowed: false,
        remaining: 0,
        resetAtMs: bucket.resetAtMs,
        retryAfterMs: bucket.resetAtMs - nowMs,
      };
    }
    return { allowed: true, remaining: rule.max - bucket.count, resetAtMs: bucket.resetAtMs };
  }

  async reset(key: string): Promise<void> {
    this.buckets.delete(key);
  }
}

/** UX-only resend countdown. Never presented as a security control. */
export const UX_COOLDOWN = 45;
export const uxCooldownRemaining = (lastAtMs: number | null, nowMs = Date.now(), seconds = UX_COOLDOWN) =>
  lastAtMs === null ? 0 : Math.max(0, Math.ceil(seconds - (nowMs - lastAtMs) / 1000));
