-- KAYAR — Phase 1 foundation migration (PostgreSQL 16)
-- Source of truth: SQL migrations. Never `drizzle-kit push` in production.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone              TEXT NOT NULL,
  display_name       TEXT,
  avatar_url         TEXT,
  status             TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deleted')),
  phone_verified_at  TIMESTAMPTZ,
  last_login_at      TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_key ON users (phone);
CREATE INDEX IF NOT EXISTS users_status_idx ON users (status);

CREATE TABLE IF NOT EXISTS roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  granted_by UUID,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issued_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at          TIMESTAMPTZ NOT NULL,
  absolute_expires_at TIMESTAMPTZ NOT NULL,
  revoked_at          TIMESTAMPTZ,
  last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip                  TEXT,
  user_agent          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);

-- OTP challenges: code_hash only — raw codes are never stored or logged.
CREATE TABLE IF NOT EXISTS otp_codes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone        TEXT NOT NULL,
  code_hash    TEXT NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  issued_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ,
  ip           TEXT,
  request_id   TEXT
);
CREATE INDEX IF NOT EXISTS otp_phone_idx ON otp_codes (phone);
CREATE INDEX IF NOT EXISTS otp_expires_idx ON otp_codes (expires_at);

-- Append-only audit trail.
CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id     UUID,
  actor_roles  JSONB NOT NULL DEFAULT '[]'::jsonb,
  action       TEXT NOT NULL,
  resource     TEXT NOT NULL,
  resource_id  TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip           TEXT,
  user_agent   TEXT,
  request_id   TEXT,
  result       TEXT NOT NULL DEFAULT 'success' CHECK (result IN ('success','denied','error'))
);
CREATE INDEX IF NOT EXISTS audit_action_idx ON audit_logs (action);
CREATE INDEX IF NOT EXISTS audit_actor_idx ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS audit_at_idx ON audit_logs (at);

CREATE TABLE IF NOT EXISTS settings (
  key          TEXT PRIMARY KEY,
  value        JSONB NOT NULL,
  scope        TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global','public','feature')),
  description  TEXT,
  updated_by   UUID,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feature_flags (
  key             TEXT PRIMARY KEY,
  enabled         BOOLEAN NOT NULL DEFAULT false,
  rollout_percent INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed: roles (development / staging only)
INSERT INTO roles (name, description) VALUES
  ('user', 'کاربر عادی سامانه'),
  ('coach', 'مربی تاییدشده'),
  ('admin', 'مدیر سامانه'),
  ('moderator', 'ناظر محتوا'),
  ('support', 'پشتیبانی'),
  ('sponsor', 'اسپانسر / برند')
ON CONFLICT (name) DO NOTHING;
