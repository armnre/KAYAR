/**
 * Session contract + rules (pure). The cookie itself is HttpOnly — client JS can only
 * ask the server whether the session is still alive.
 */

export const SESSION_COOKIE_NAME = "kayar_sid";
export const SESSION_TTL_DAYS = 7;
export const SESSION_ABSOLUTE_TTL_DAYS = 30;

export interface Session {
  id: string;
  userId: string;
  issuedAtMs: number;
  expiresAtMs: number;
  absoluteExpiresAtMs: number;
  revokedAtMs: number | null;
  lastSeenAtMs: number;
  ip?: string;
  userAgent?: string;
}

export type SessionState = "active" | "expired" | "revoked" | "not_yet_valid";

export function sessionState(s: Session, nowMs: number): SessionState {
  if (s.revokedAtMs !== null && s.revokedAtMs <= nowMs) return "revoked";
  if (nowMs < s.issuedAtMs) return "not_yet_valid";
  if (nowMs >= s.expiresAtMs || nowMs >= s.absoluteExpiresAtMs) return "expired";
  return "active";
}

export const isSessionActive = (s: Session, nowMs: number): boolean =>
  sessionState(s, nowMs) === "active";

/** Sliding window: rotate the id once the session has been quiet for a day. */
export const shouldRotate = (s: Session, nowMs: number, idleMs = 24 * 60 * 60 * 1000): boolean =>
  nowMs - s.lastSeenAtMs >= idleMs;

/**
 * Documented cookie policy — the transport layer applies this verbatim.
 * Deliberately not readable from client JavaScript.
 */
export const sessionCookiePolicy = {
  name: SESSION_COOKIE_NAME,
  httpOnly: true,
  /** production must be secure; the server layer relaxes it only on local http dev */
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAgeDays: SESSION_TTL_DAYS,
  signed: true,
};

export interface NewSessionInput {
  userId: string;
  issuedAtMs: number;
  nowMs: number;
}

export const computeExpiry = (issuedAtMs: number, nowMs: number) => ({
  expiresAtMs: nowMs + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  absoluteExpiresAtMs: issuedAtMs + SESSION_ABSOLUTE_TTL_DAYS * 24 * 60 * 60 * 1000,
});
