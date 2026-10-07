import { z } from "zod";

/**
 * Typed environment configuration.
 * - validated once, at boot
 * - secrets are NEVER readable from the client bundle: only VITE_ prefixed vars
 *   are exposed by the bundler, and none of them may hold a secret.
 */

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1).optional(),
  SESSION_COOKIE_NAME: z.string().default("kayar_sid"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  SESSION_ABSOLUTE_TTL_DAYS: z.coerce.number().int().positive().default(30),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(120),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(45),
  AI_PROVIDER: z.enum(["openai", "local", "none"]).default("none"),
  SMS_PROVIDER: z.enum(["kavenegar", "smsir", "none"]).default("none"),
  PUSH_PROVIDER: z.enum(["webpush", "none"]).default("none"),
  STORAGE_PROVIDER: z.enum(["s3", "local", "none"]).default("none"),
  PAYMENT_PROVIDER: z.enum(["zarinpal", "zibal", "none"]).default("none"),
  QUEUE_PROVIDER: z.enum(["postgres", "none"]).default("none"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export const clientEnvSchema = z.object({
  APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  API_BASE_URL: z.string().url().default("http://localhost:3000"),
  /** UX-only resend cooldown shown in the OTP form (server still enforces the real limit). */
  AUTH_UX_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(45),
  /** Explicit, opt-in only. The UI always labels it as a development environment. */
  AUTH_GATEWAY: z.enum(["server", "unavailable"]).default("unavailable"),
  VITE_APP_NAME: z.string().default("KAYAR"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

export function loadClientEnv(raw: Record<string, unknown>): ClientEnv {
  return clientEnvSchema.parse(raw);
}

export function loadServerEnv(raw: Record<string, unknown>): ServerEnv {
  return serverEnvSchema.parse(raw);
}

/** Reads Vite's import.meta.env safely (never throws). */
export function getClientEnv(): ClientEnv {
  const meta = import.meta as unknown as { env?: Record<string, unknown> };
  return loadClientEnv({ ...(meta.env ?? {}) });
}

export const featureFlags = {
  bodyyar: true,
  morshed: true,
  campaigns: true,
  coaches: true,
  cms: false,
} as const;

export type FeatureFlag = keyof typeof featureFlags;
export const isFeatureEnabled = (flag: FeatureFlag): boolean => featureFlags[flag];
