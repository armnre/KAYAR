import { z } from 'zod';

/**
 * All configuration comes from the environment and is validated once at boot.
 * A missing required value stops the process with a readable message.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required (postgresql://user:pass@host:5432/db)'),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  PUBLIC_BASE_URL: z.string().default(''),
  ALLOWED_ORIGINS: z.string().default(''),
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  AUTH_PEPPER: z.string().optional(),
  ADMIN_BOOTSTRAP_USERNAME: z.string().optional(),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().optional(),
  JAMENDO_CLIENT_ID: z.string().optional(),
  NARAROUTER_API_KEY: z.string().optional(),
  NARAROUTER_BASE_URL: z.string().default('https://router.bynara.id/v1'),
  NARAROUTER_MODELS: z.string().default('agnes-2.5-flash,laguna-s-2.1,nemotron-3.5-lightning-free'),
  NARAROUTER_TIMEOUT_MS: z.coerce.number().int().min(5000).max(180000).default(60000),
  BODYYAR_PLAN_DAILY_LIMIT: z.coerce.number().int().min(0).max(200).default(5),
  BODYYAR_CHAT_DAILY_LIMIT: z.coerce.number().int().min(0).max(1000).default(40),
  BODYYAR_CHAT_RATE_PER_MINUTE: z.coerce.number().int().min(1).max(120).default(12),
  MEDIA_STORAGE: z.enum(['local', 's3']).default('local'),
  MEDIA_DIR: z.string().default('./storage/uploads'),
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BASE_PATH: z.string().default(''),
  S3_PUBLIC_URL: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Config = z.infer<typeof envSchema>;

let cached: Config | null = null;

export function loadConfig(): Config {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}\n\nCopy .env.example to .env and fill in the required values.`);
  }
  cached = parsed.data;
  return cached;
}

export const allowedOrigins = (cfg: Config) =>
  cfg.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);

export const isProduction = (cfg: Config) => cfg.NODE_ENV === 'production';

export function secureCookies(cfg: Config, hostname?: string) {
  if (cfg.COOKIE_SECURE) return cfg.COOKIE_SECURE === 'true';
  if (cfg.NODE_ENV !== 'production') return false;
  const host = (hostname ?? '').toLowerCase();
  return !['localhost', '127.0.0.1', ''].includes(host);
}
