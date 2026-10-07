import { z } from "zod";

/**
 * Typed settings registry (Phase 1 §31).
 * - keys are declared, not free-form
 * - public vs secret scopes: secrets are referenced by NAME and resolved server-side
 *   (they must never be written into this table, the repo, or the client bundle)
 */

export const settingsSchema = z.object({
  "app.name": z.string().min(1).default("کایار"),
  "app.defaultLocale": z.enum(["fa"]).default("fa"),
  "auth.otp.ttlSeconds": z.number().int().positive().max(600).default(120),
  "auth.otp.maxAttempts": z.number().int().positive().max(10).default(5),
  "auth.otp.resendCooldownSeconds": z.number().int().positive().max(300).default(45),
  "auth.rateLimit.enabled": z.boolean().default(true),
  "ai.dailyUsageCapPerUser": z.number().int().positive().default(40),
  "notifications.push.enabled": z.boolean().default(true),
  "notifications.sms.enabled": z.boolean().default(false),
  "campaigns.defaultJoinLimitPerDay": z.number().int().positive().default(10),
});

export type SettingsKey = keyof z.infer<typeof settingsSchema>;

export const SETTING_DEFINITIONS: { key: SettingsKey; scope: "public" | "global"; description: string }[] = [
  { key: "app.name", scope: "public", description: "نام نمایشی محصول" },
  { key: "app.defaultLocale", scope: "public", description: "زبان پیش‌فرض" },
  { key: "auth.otp.ttlSeconds", scope: "global", description: "طول عمر کد یک‌بارمصرف" },
  { key: "auth.otp.maxAttempts", scope: "global", description: "حداکثر تلاش تایید هر کد" },
  { key: "auth.otp.resendCooldownSeconds", scope: "global", description: "کول‌داون درخواست مجدد کد" },
  { key: "auth.rateLimit.enabled", scope: "global", description: "فعال بودن محدودیت نرخ" },
  { key: "ai.dailyUsageCapPerUser", scope: "global", description: "سقف مصرف روزانه هوش مصنوعی" },
  { key: "notifications.push.enabled", scope: "global", description: "فعال بودن نوتیفیکیشن پوش" },
  { key: "notifications.sms.enabled", scope: "global", description: "فعال بودن نوتیفیکیشن پیامکی" },
  { key: "campaigns.defaultJoinLimitPerDay", scope: "global", description: "سقف روزانه عضویت در کمپین" },
];

/** Secret settings live only as environment variable NAMES. */
export const SECRET_SETTING_REFS = [
  "DATABASE_URL",
  "SESSION_COOKIE_SECRET",
  "SMS_API_KEY",
  "AI_API_KEY",
  "PAYMENT_MERCHANT_ID",
] as const;

export type SecretRef = (typeof SECRET_SETTING_REFS)[number];

export function defaults(): z.infer<typeof settingsSchema> {
  return settingsSchema.parse({});
}

/** Settings may never carry secrets — enforced structurally. */
export function assertNoSecret(key: string): void {
  if (/key|secret|password|token/i.test(key)) {
    throw new Error(`Setting "${key}" looks like a secret — use an environment reference instead.`);
  }
}
