# KAYAR — Security Foundation

## 1. Principles
1. **Server-side authorization everywhere** — the client only hides UI; the server decides.
2. **Validate at the boundary** — every input parsed by Zod; unknown keys stripped.
3. **Least privilege** — role → permission → ownership predicate (`owner_id`).
4. **Fail closed** — errors deny, sessions expire by default, uploads reject by default.
5. **No secrets in code, no sensitive data in logs.**

## 2. Authorization model
`RBAC` (role → permission) **+** ownership. Example: `coach.programs.update` requires
`role = coach` **and** `program.coach_id = session.userId`. Destructive admin actions require a
reason string that is persisted to the audit log.

## 3. OTP hardening
* Phone normalisation (Persian/Arabic digits → EN), E.164 `+98…`.
* 6-digit CSPRNG code, bcrypt cost 12, 120s TTL, single use, max 5 attempts.
* Rate limits: 3 / 10 min / phone · 20 / 10 min / IP · captcha after 3 failures.
* Session: `httpOnly; Secure; SameSite=Lax`, 7-day sliding / 30-day absolute, id rotation,
  revocation list, device list with "sign out everywhere".
* Audit `auth.otp_requested / auth.otp_failed / auth.login / auth.logout` — never the code.

## 4. Transport & headers
HSTS, strict `Content-Security-Policy` (self + explicit media/font hosts), `nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, minimal `Permissions-Policy`,
`X-Frame-Options: DENY`, TLS 1.2+.

## 5. CSRF / XSS
Double-submit CSRF token on all mutations (cookie auth), `SameSite=Lax`. React escaping by
default; **no `dangerouslySetInnerHTML` with CMS content** — sanitise block HTML server-side
against an allow-list. Strict redirect allow-lists.

## 6. Uploads & media
Extension allow-list **and** magic-byte sniff, size caps, mandatory re-encode (neutralises
polyglot payloads), EXIF/GPS strip, private bucket + signed short-lived URLs, UUID filenames,
per-user quota, scan hook.

## 7. Data protection
PII inventory: phone, name, **body metrics (sensitive → encrypted at rest, owner + consented
coach only)**. Retention: analytics raw 90d · audit 1y · sessions 30d · OTP rows 24h.
Deletion job anonymises the user record.

## 8. Integrity of business actions
Idempotency keys on campaign join, reward claim, coupon redeem, payment verify, program
purchase. Engagement is **server-verified** (never client counters). Reward issuance runs as a
retryable, auditable job. Money-adjacent tables are append-only and reconcilable.

## 9. Abuse & moderation
Report action on UGC, admin moderation queue, coach application state machine
(`pending → under_review → approved | rejected`), spam heuristics, per-user daily caps on AI
calls and campaign events.

## 9b. Implemented in Phase 1 (code, not just intent)
* `lib/errors.ts` — typed `AppError` (code/status/meta) + Persian user copy; internal detail never reaches the UI (`toUserMessage` / `toErrorPayload`).
* `lib/logger.ts` — structured JSON logger with **enforced redaction** (otp, code, password, token, cookie, secret, apiKey… are replaced with `[redacted]` at the sink) and automatic phone masking.
* `modules/auth/phone.ts` — digit normalisation (Persian/Arabic/ASCII) + canonical E.164 validation.
* `modules/auth/otp.ts` — TTL 120s · max 5 attempts · 6 digits · resend cooldown 45s (pure, testable).
* `modules/auth/session.ts` — expiry/revocation/rotation rules + documented HttpOnly/Secure/SameSite cookie policy (never readable by client JS).
* `modules/rbac/permissions.ts` — explicit permission catalogue, role grants, `can()` / `assertCan()` (throws `FORBIDDEN`).
* `server/rate-limit.ts` — rule set (per-phone / per-IP / per-verify) + fixed-window implementation for the server; the browser countdown is documented as **UX only**.
* `server/audit.ts` — append-only audit contract (`AuditSink`, `AuditLogger`, admin-only reader behind `audit.read`).
* `db/schema.ts` + `migrations/0001_foundation.sql` — users, roles, permissions, role_permissions, user_roles, sessions, otp_codes (hash only), audit_logs, settings, feature_flags.

Still server-only and **not** claimed as done: password-less OTP issuing, real cookie issuance, Redis/Postgres rate limiter, request-level authorization middleware.

## 10. Pre-production checklist
- [ ] Zod on every endpoint; 401/403/422 mapped
- [ ] RBAC + ownership allow/deny tests in CI
- [ ] Rate limit + captcha on OTP
- [ ] CSP + security headers verified
- [ ] Upload validation + EXIF strip verified
- [ ] Idempotency on money/reward paths
- [ ] Audit log on auth + admin actions
- [ ] Secrets only in env; `.env` ignored; `.env.example` documented
- [ ] Backup + restore drill documented
- [ ] `npm audit` clean, lockfile committed
