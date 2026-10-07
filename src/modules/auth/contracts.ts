import { z } from "zod";
import { AppError } from "../../lib/errors";
import { isValidIranMobile, maskPhoneDisplay, normalizePhone } from "./phone";
import { isValidOtpFormat, OTP_MAX_ATTEMPTS, OTP_TTL_SECONDS } from "./otp";
import type { Session } from "./session";

/* ------------------------------------------------------------------ */
/* Validation schemas — the single source of truth at the auth boundary */
/* ------------------------------------------------------------------ */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v)
  .refine((v) => isValidIranMobile(v), { message: "شماره موبایل معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹)" })
  .transform((v) => normalizePhone(v) as string);

export const otpCodeSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => isValidOtpFormat(v), { message: "کد شش‌رقمی را کامل وارد کنید" });

/* ------------------------------------------------------------------ */
/* DTOs                                                                */
/* ------------------------------------------------------------------ */
export interface PublicUser {
  id: string;
  displayName: string;
  phoneMasked: string;
  roles: string[];
}

export interface RequestOtpInput {
  phone: string;
  ip?: string;
}

export interface RequestOtpResult {
  challengeId: string;
  maskedPhone: string;
  expiresAtMs: number;
  resendAfterSeconds: number;
  ttlSeconds: number;
}

export interface VerifyOtpInput {
  challengeId: string;
  code: string;
  ip?: string;
}

export interface VerifyOtpResult {
  user: PublicUser;
  session: Pick<Session, "id" | "issuedAtMs" | "expiresAtMs">;
}

export interface AuthGateway {
  requestOtp(input: RequestOtpInput): Promise<RequestOtpResult>;
  verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResult>;
  resendOtp(challengeId: string, ip?: string): Promise<RequestOtpResult>;
  session(): Promise<PublicUser | null>;
  logout(): Promise<void>;
  revokeAllSessions(): Promise<number>;
}

/**
 * Honest development adapter: the environment has no auth server.
 * It never pretends a login succeeded — it returns the typed provider error,
 * which the UI renders as the real "service unavailable" state.
 */
export class UnavailableAuthGateway implements AuthGateway {
  private readonly fail = (): never => {
    throw new AppError("PROVIDER_UNAVAILABLE", "سرویس احراز هویت در این بیلد متصل نیست.", {
      gateway: "unavailable",
    });
  };

  requestOtp(): Promise<RequestOtpResult> {
    return Promise.reject(this.fail());
  }
  verifyOtp(): Promise<VerifyOtpResult> {
    return Promise.reject(this.fail());
  }
  resendOtp(): Promise<RequestOtpResult> {
    return Promise.reject(this.fail());
  }
  session(): Promise<PublicUser | null> {
    return Promise.resolve(null);
  }
  logout(): Promise<void> {
    return Promise.resolve();
  }
  revokeAllSessions(): Promise<number> {
    return Promise.resolve(0);
  }
}

export const policy = {
  ttlSeconds: OTP_TTL_SECONDS,
  maxAttempts: OTP_MAX_ATTEMPTS,
} as const;

export { maskPhoneDisplay };
