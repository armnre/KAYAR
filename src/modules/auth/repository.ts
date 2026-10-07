import type { Session } from "./session";
import type { Role } from "../rbac/permissions";

/** Repository interfaces — Phase 2 implements these against Drizzle/Postgres. */

export interface UserRecord {
  id: string;
  phone: string; // canonical 989…
  displayName: string | null;
  roles: Role[];
  status: "active" | "suspended" | "deleted";
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRepository {
  findByPhone(phone: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(input: { phone: string; displayName?: string }): Promise<UserRecord>;
  updateRoles(id: string, roles: Role[]): Promise<UserRecord>;
}

export interface OtpChallengeRecord {
  id: string;
  phone: string;
  codeHash: string;
  attempts: number;
  maxAttempts: number;
  issuedAtMs: number;
  expiresAtMs: number;
  consumedAtMs: number | null;
}

export interface OtpChallengeRepository {
  create(input: { phone: string; codeHash: string; ttlSeconds: number; maxAttempts: number }): Promise<OtpChallengeRecord>;
  findById(id: string): Promise<OtpChallengeRecord | null>;
  incrementAttempts(id: string): Promise<OtpChallengeRecord>;
  consume(id: string): Promise<void>;
}

export interface SessionRepository {
  create(input: { userId: string; ttlMs: number; absoluteTtlMs: number; ip?: string; userAgent?: string }): Promise<Session>;
  findById(id: string): Promise<Session | null>;
  touch(id: string, at: Date): Promise<void>;
  revoke(id: string, at: Date): Promise<void>;
  revokeAllForUser(userId: string, at: Date): Promise<number>;
}
