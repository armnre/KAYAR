/**
 * Infrastructure adapter contracts (Phase 1 §32).
 * Domain code depends on these interfaces only — never on a vendor SDK.
 * Selection happens in `createAdapters()` from validated env configuration.
 */

import { AppError } from "../lib/errors";

export interface AiProvider {
  readonly name: string;
  complete(input: { system?: string; prompt: string; userId?: string }): Promise<{ text: string; usage?: { prompt: number; completion: number } }>;
}

export interface SmsProvider {
  readonly name: string;
  send(input: { to: string; template: "otp"; variables: Record<string, string> }): Promise<{ messageId: string }>;
}

export interface PushProvider {
  readonly name: string;
  send(input: { subscription: unknown; title: string; body: string; data?: Record<string, string> }): Promise<{ messageId: string }>;
}

export interface StorageProvider {
  readonly name: string;
  put(input: { key: string; bytes: Uint8Array; contentType: string; ownerId: string }): Promise<{ url: string; size: number }>;
  signedUrl(key: string, ttlSeconds: number): Promise<string>;
}

export interface PaymentProvider {
  readonly name: string;
  createIntent(input: { amountRials: number; userId: string; idempotencyKey: string }): Promise<{ intentId: string; payUrl: string }>;
  verify(input: { intentId: string; authority: string; status: string }): Promise<{ ok: boolean; refId?: string }>;
}

export interface RealtimeBus {
  readonly name: string;
  publish(channel: string, payload: unknown): Promise<void>;
  subscribe(channel: string, handler: (payload: unknown) => void): Promise<() => void>;
}

export interface QueueProvider {
  readonly name: string;
  enqueue(job: string, payload: unknown, opts?: { idempotencyKey?: string; runAtMs?: number }): Promise<{ jobId: string }>;
}

export interface AnalyticsProvider {
  readonly name: string;
  track(event: string, props: Record<string, unknown>, userId?: string): Promise<void>;
}

export interface Adapters {
  ai: AiProvider;
  sms: SmsProvider;
  push: PushProvider;
  storage: StorageProvider;
  payment: PaymentProvider;
  realtime: RealtimeBus;
  queue: QueueProvider;
  analytics: AnalyticsProvider;
}

/** Returns a provider that fails loudly and honestly when the integration is not configured. */
function unavailable(kind: string): never {
  throw new AppError("PROVIDER_UNAVAILABLE", `ارائه‌دهنده «${kind}» پیکربندی نشده است.`, { kind });
}

export const createUnavailableAdapters = (): Adapters => ({
  ai: {
    name: "none",
    complete: async () => unavailable("ai"),
  },
  sms: {
    name: "none",
    send: async () => unavailable("sms"),
  },
  push: {
    name: "none",
    send: async () => unavailable("push"),
  },
  storage: {
    name: "none",
    put: async () => unavailable("storage"),
    signedUrl: async () => unavailable("storage"),
  },
  payment: {
    name: "none",
    createIntent: async () => unavailable("payment"),
    verify: async () => unavailable("payment"),
  },
  realtime: {
    name: "none",
    publish: async () => unavailable("realtime"),
    subscribe: async () => unavailable("realtime"),
  },
  queue: {
    name: "none",
    enqueue: async () => unavailable("queue"),
  },
  analytics: {
    name: "none",
    track: async () => Promise.resolve(),
  },
});

export interface AdapterConfig {
  ai: "openai" | "local" | "none";
  sms: "kavenegar" | "smsir" | "none";
  push: "webpush" | "none";
  storage: "s3" | "local" | "none";
  payment: "zarinpal" | "zibal" | "none";
  queue: "postgres" | "none";
}

/**
 * Factory. Phase 2 swaps the bodies for real implementations (S3, Kavenegar, …).
 * A configured provider that is not implemented yet still fails honestly rather
 * than returning fake data.
 */
export function createAdapters(config: AdapterConfig): Adapters {
  const base = createUnavailableAdapters();
  // Phase 2: switch on `config.*` and construct the real provider implementations here.
  return {
    ...base,
    ai: { name: config.ai, complete: async () => unavailable("ai") },
    sms: { name: config.sms, send: async () => unavailable("sms") },
    push: { name: config.push, send: async () => unavailable("push") },
    storage: { name: config.storage, put: async () => unavailable("storage"), signedUrl: async () => unavailable("storage") },
    payment: { name: config.payment, createIntent: async () => unavailable("payment"), verify: async () => unavailable("payment") },
    queue: { name: config.queue, enqueue: async () => unavailable("queue") },
  };
}
