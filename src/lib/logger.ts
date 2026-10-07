/**
 * Structured logging foundation.
 * - one JSON object per line (server-side transports can ingest as-is)
 * - request ids propagate through a call scope
 * - redaction is enforced at the sink, so secrets CANNOT be logged by accident
 *
 * NEVER log: otp / code / password / token / cookie / secret / apiKey / authorization.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

const FORBIDDEN_KEYS = new Set([
  "otp",
  "code",
  "password",
  "passwd",
  "token",
  "access_token",
  "refresh_token",
  "session",
  "sessionid",
  "cookie",
  "authorization",
  "secret",
  "apikey",
  "api_key",
  "privatekey",
  "private_key",
]);

const REDACTED = "[redacted]";

/** Partially masks a phone number: 09123456789 → 0912***6789 */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7) return REDACTED;
  return `${digits.slice(0, 4)}${"*".repeat(Math.max(1, digits.length - 6))}${digits.slice(-2)}`;
}

function redactValue(key: string, value: unknown): unknown {
  if (FORBIDDEN_KEYS.has(key.toLowerCase())) return REDACTED;
  if (typeof value === "string" && /phone|mobile|msisdn/i.test(key)) return maskPhone(value);
  if (Array.isArray(value)) return value.map((v) => redactValue("", v));
  if (value && typeof value === "object") return redact(value as LogFields);
  return value;
}

export function redact(fields: LogFields): LogFields {
  const out: LogFields = {};
  for (const [k, v] of Object.entries(fields)) out[k] = redactValue(k, v);
  return out;
}

export interface Logger {
  readonly requestId?: string;
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(bindings: LogFields): Logger;
}

export interface LoggerOptions {
  service: string;
  requestId?: string;
  level?: LogLevel;
  bindings?: LogFields;
  /** injection point for tests / alternative transports */
  sink?: (line: Record<string, unknown>) => void;
}

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function defaultSink(line: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(line));
}

export function createLogger(options: LoggerOptions): Logger {
  const { service, requestId, level = "debug", bindings = {}, sink = defaultSink } = options;

  const write = (lvl: LogLevel, message: string, fields?: LogFields) => {
    if (ORDER[lvl] < ORDER[level]) return;
    sink({
      ts: new Date().toISOString(),
      level: lvl,
      service,
      ...(requestId ? { requestId } : {}),
      ...redact(bindings),
      message,
      ...(fields ? redact(fields) : {}),
    });
  };

  return {
    requestId,
    debug: (m, f) => write("debug", m, f),
    info: (m, f) => write("info", m, f),
    warn: (m, f) => write("warn", m, f),
    error: (m, f) => write("error", m, f),
    child: (extra) =>
      createLogger({
        ...options,
        bindings: { ...bindings, ...extra },
      }),
  };
}
