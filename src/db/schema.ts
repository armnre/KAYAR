import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Phase 1 foundation schema (PostgreSQL + Drizzle).
 * Migration strategy: SQL migrations in `src/db/migrations/` are the source of truth —
 * `drizzle-kit push` is intentionally NOT used (Phase 1 §29).
 *
 * Scope is deliberately limited to identity, RBAC, audit and settings.
 * Domain tables (coaches / bodyyar / morshed / campaigns / cms) arrive with their phase.
 */

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** canonical E.164 without "+": 989123456789 */
    phone: text("phone").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    status: text("status").notNull().default("active"), // active | suspended | deleted
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (t) => [uniqueIndex("users_phone_key").on(t.phone), index("users_status_idx").on(t.status)]
);

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** user | coach | admin | moderator | support | sponsor */
    name: text("name").notNull().unique(),
    description: text("description"),
    createdAt,
  },
  () => []
);

export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** e.g. coaches.approve */
    key: text("key").notNull().unique(),
    description: text("description"),
    createdAt,
  },
  () => []
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    createdAt,
  },
  (t) => [uniqueIndex("role_permissions_pk_key").on(t.roleId, t.permissionId)]
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    grantedBy: uuid("granted_by"),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_roles_pk_key").on(t.userId, t.roleId)]
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    absoluteExpiresAt: timestamp("absolute_expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt,
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)]
);

/**
 * OTP challenges. `code_hash` is a one-way hash (bcrypt/argon2) — the raw code is
 * never persisted and never logged.
 */
export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    ip: text("ip"),
    requestId: text("request_id"),
  },
  (t) => [index("otp_phone_idx").on(t.phone), index("otp_expires_idx").on(t.expiresAt)]
);

/** Append-only: INSERT only, no UPDATE/DELETE from application code. */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
    actorRoles: jsonb("actor_roles").$type<string[]>().notNull().default([]),
    action: text("action").notNull(),
    resource: text("resource").notNull(),
    resourceId: text("resource_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ip: text("ip"),
    userAgent: text("user_agent"),
    requestId: text("request_id"),
    result: text("result").notNull().default("success"), // success | denied | error
  },
  (t) => [
    index("audit_action_idx").on(t.action),
    index("audit_actor_idx").on(t.actorId),
    index("audit_at_idx").on(t.at),
  ]
);

/** Typed key/value settings — values are JSON, secrets must never land here. */
export const settings = pgTable(
  "settings",
  {
    key: text("key").primaryKey(),
    value: jsonb("value").$type<unknown>().notNull(),
    scope: text("scope").notNull().default("global"), // global | public | feature
    description: text("description"),
    updatedBy: uuid("updated_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  () => []
);

export const featureFlagsTable = pgTable(
  "feature_flags",
  {
    key: text("key").primaryKey(),
    enabled: boolean("enabled").notNull().default(false),
    rolloutPercent: integer("rollout_percent").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  () => []
);
