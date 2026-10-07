/**
 * Append-only audit trail contract (Phase 1 §30).
 * Rows are never updated or deleted by application code; readers are admin-only
 * behind the `audit.read` permission.
 */

import type { Permission } from "../modules/rbac/permissions";

export const AUDIT_ACTIONS = [
  "auth.otp_requested",
  "auth.otp_verify_success",
  "auth.otp_verify_failed",
  "auth.login",
  "auth.logout",
  "auth.session_revoked",
  "rbac.granted",
  "rbac.revoked",
  "coaches.approved",
  "coaches.rejected",
  "settings.updated",
  "cms.published",
  "campaign.created",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditRecord {
  id: string;
  at: Date;
  actorId: string | null;
  actorRoles: string[];
  action: AuditAction;
  resource: string;
  resourceId: string | null;
  /** Never contains secrets/OTP/PII beyond a masked phone (see logger.redact). */
  metadata: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  result: "success" | "denied" | "error";
}

export interface AuditSink {
  append(record: Omit<AuditRecord, "id" | "at">): Promise<void>;
}

export interface AuditQuery {
  actorId?: string;
  action?: AuditAction;
  resource?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditReader {
  list(query: AuditQuery): Promise<AuditRecord[]>;
}

/** Guarded writer: appends always, never mutates. */
export class AuditLogger {
  constructor(private readonly sink: AuditSink) {}

  record(entry: Omit<AuditRecord, "id" | "at">): Promise<void> {
    return this.sink.append({ ...entry });
  }
}

export const REQUIRED_PERMISSION: Permission = "audit.read";
