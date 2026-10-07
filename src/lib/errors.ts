/**
 * KAYAR error model — every failure crosses layer/module boundaries as an AppError.
 * Users never see stack traces: `toUserMessage()` is the only thing the UI may render.
 */

export const ERROR_CODES = [
  "VALIDATION_FAILED",
  "UNAUTHENTICATED",
  "SESSION_EXPIRED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "OTP_INVALID",
  "OTP_EXPIRED",
  "OTP_ATTEMPTS_EXCEEDED",
  "PROVIDER_UNAVAILABLE",
  "NETWORK",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 422,
  UNAUTHENTICATED: 401,
  SESSION_EXPIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  OTP_INVALID: 422,
  OTP_EXPIRED: 410,
  OTP_ATTEMPTS_EXCEEDED: 429,
  PROVIDER_UNAVAILABLE: 503,
  NETWORK: 502,
  INTERNAL: 500,
};

/** Persian, user-facing copy. Keep short, calm and non-technical. */
const MESSAGE: Record<ErrorCode, string> = {
  VALIDATION_FAILED: "اطلاعات واردشده معتبر نیست. لطفاً بررسی کنید.",
  UNAUTHENTICATED: "برای ادامه وارد حساب خود شوید.",
  SESSION_EXPIRED: "نشست شما منقضی شده است. دوباره وارد شوید.",
  FORBIDDEN: "شما دسترسی لازم برای این عملیات را ندارید.",
  NOT_FOUND: "مورد درخواستی پیدا نشد.",
  CONFLICT: "این عملیات با داده‌های موجود تداخل دارد.",
  RATE_LIMITED: "تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.",
  OTP_INVALID: "کد تایید اشتباه است.",
  OTP_EXPIRED: "کد تایید منقضی شده است. کد جدید دریافت کنید.",
  OTP_ATTEMPTS_EXCEEDED: "تعداد تلاش‌های مجاز تمام شد. کد جدید دریافت کنید.",
  PROVIDER_UNAVAILABLE: "سرویس موردنظر در حال حاضر در دسترس نیست.",
  NETWORK: "اتصال به شبکه برقرار نیست. اینترنت خود را بررسی کنید.",
  INTERNAL: "خطایی رخ داد. دوباره تلاش کنید.",
};

export type ErrorMeta = Record<string, unknown>;

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
  status: number;
  requestId?: string;
  meta?: ErrorMeta;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly meta?: ErrorMeta;
  readonly requestId?: string;

  constructor(code: ErrorCode, message?: string, meta?: ErrorMeta) {
    super(message ?? code);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS[code];
    this.meta = meta;
  }

  toPayload(requestId?: string): ErrorPayload {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      requestId: requestId ?? this.requestId,
      meta: this.meta,
    };
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}

/** The only message the UI is allowed to show. */
export function toUserMessage(e: unknown): string {
  if (isAppError(e)) return e.message;
  if (e instanceof Error && e.message) return MESSAGE.INTERNAL;
  return MESSAGE.INTERNAL;
}

/** Map any thrown value to a transport-safe payload (never leaks internals). */
export function toErrorPayload(e: unknown, requestId?: string): ErrorPayload {
  if (isAppError(e)) return e.toPayload(requestId);
  return { code: "INTERNAL", message: MESSAGE.INTERNAL, status: 500, requestId };
}
