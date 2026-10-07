# KAYAR — Technical Architecture

## 0. Context
Phase 0 runs in an environment that can only publish a **static bundle** (`vite build` +
`vite-plugin-singlefile`). Therefore Phase 0 ships (a) the coded design foundation and
(b) **executable architecture contracts**. Target stack for Phase 1+:

```
Next.js 15 (App Router, RSC) · TypeScript strict · PostgreSQL 16 · Drizzle ORM
Zod · Tailwind v4 · custom OTP session auth · PWA
```

## 1. Layering (strict)
```
UI layer          src/app (routes) + src/components   — no business rules
Application       src/modules/<domain>/service.ts     — use-cases, validation, authz
Domain            src/modules/<domain>/domain.ts      — entities, invariants, pure fns
Infrastructure    src/server, src/db, src/adapters    — drizzle, providers, queues
```
Dependency rule: UI → Application → Domain ← Infrastructure. Adapters implement domain
interfaces; the domain never imports a provider SDK.

## 2. Module boundaries
```
src/
├── app/                      route segments (user app, admin, api)
├── components/               design-system + layout (presentational, typed props)
├── modules/                  auth · users · coaches · bodyyar · morshed ·
│                             sponsorship · campaigns · notifications · cms · media · analytics
├── server/                   rbac.ts · session.ts · rate-limit.ts · http.ts · audit.ts
├── db/                       schema.ts · seed/ · migrations
├── lib/                      zod schemas · persian-number · format · fetcher
├── adapters/                 ai/ sms/ push/ storage/ payment/ realtime/ queue/ content/ analytics/
└── infrastructure/           env.ts · logger.ts · errors.ts
```
Cross-module calls go through service interfaces, never direct table access.

## 3. Adapter contracts (interfaces only in Phase 0)
```ts
interface AIProvider      { complete(req: AIRequest, ctx: AIContext): Promise<AIResponse>;
                            stream?(req: AIRequest): AsyncIterable<AIChunk> }
interface SMSProvider     { send(to: string, t: TemplateId, vars: Record<string,string>): Promise<{id:string}> }
interface PushProvider    { send(sub: PushSub, payload: PushPayload): Promise<DeliveryReceipt> }
interface Storage         { put(key: string, file: File, meta: Meta): Promise<StoredFile>;
                            signedUrl(key: string, ttl: number): Promise<string> }
interface PaymentGateway  { createIntent(a: IntentInput): Promise<Intent>;
                            verify(a: VerifyInput): Promise<Verification> }
interface RealtimeBus     { publish(ch: string, payload: unknown): Promise<void>;
                            subscribe(ch: string, fn: Fn): Unsubscribe }
interface Queue           { enqueue(name: string, payload: unknown, o?: JobOpts): Promise<JobId> }
interface ContentSource   { list(q: Query): Promise<ContentRef[]>; import(ref: ContentRef): Promise<Content> }
interface AnalyticsSink   { track(userId: string, event: string, props: Props): Promise<void> }
```
Default adapters: OpenAI / local LLM, Kavenegar–SMS.ir, Web-Push, S3-compatible storage,
Zibal / Zarinpal, SSE + `LISTEN/NOTIFY`, Postgres-backed queue, crawler, first-party event store.
Provider selection through `env` (`AI_PROVIDER`, `SMS_PROVIDER`, …) + factory in `adapters/index.ts`.

## 4. Authentication (no passwords)
```
phone (normalised fa→en digits, E.164 +98…) → OTP (6 digits, CSPRNG, bcrypt-12, 120s TTL,
5 attempts, 3/10min per phone + 20/10min per IP) → verify → session row → httpOnly, Secure,
SameSite=Lax cookie (7d sliding / 30d absolute) → RBAC on every request.
```
Rotation on login, server-side revocation, device/session manager, audit log on
request/verify/fail/login/logout. OTP values are never logged.

## 5. Realtime (Phase 10, documented now)
SSE at `/api/realtime?channels=…`, cookie-authenticated, channels authorised server-side,
Postgres `LISTEN/NOTIFY` fan-out, 25s heartbeat, `Last-Event-ID` replay from the `events`
table (30-day retention), exponential-backoff reconnect, polling fallback after 2 failures.

## 6. Database plan
**Foundation** `users · roles · permissions · role_permissions · user_roles · sessions ·
otp_codes · settings · audit_logs · notifications · notification_preferences · files`
**Coaches** `coaches · coach_specialties · coach_services · coach_programs · coach_reviews · coach_availability · coach_students`
**BodyYar** `bodyyar_profiles · bodyyar_conversations · bodyyar_messages · bodyyar_recommendations · bodyyar_plans · ai_usage`
**Morshed** `morshed_content · morshed_categories · morshed_playlists · morshed_playlist_items · morshed_favorites · morshed_history · morshed_progress`
**Sponsorship/Campaigns** `sponsors · campaigns · campaign_mechanics · challenges · missions · rewards · coupons · campaign_participations · campaign_events`
**CMS** `cms_pages · cms_blocks · cms_block_versions · cms_menus · cms_menu_items`

Rules: `id uuid pk` + `created_at/updated_at` everywhere; explicit `ON DELETE`; index every FK
and list-ordering column; `owner_id` on all user-generated rows; soft delete only where legally
required; **no table without a query that needs it**.

## 7. Notifications
`NotificationService` → channels `[in-app, push, sms, email(future)]`, Persian template registry,
per-user preference matrix, delivery machine `queued→sent→delivered→failed`, 3× backoff retries,
idempotency by `(template, entity, user)` digest, logs without PII.

## 8. Jobs / queue
Postgres `jobs` table + worker using `FOR UPDATE SKIP LOCKED`; columns `attempts, max_attempts,
run_at, locked_by, locked_at, status[queued|running|done|failed|dead_letter], idempotency_key`.
Jobs: notification dispatch, media processing (thumb/EXIF/transcode), AI summarise, analytics
rollup, campaign event aggregation, reward issuance, retention cleanup.

## 9. Media
Caps (image 8MB, audio 100MB), extension allow-list **+** magic-byte sniff, sharp re-encode
(320/640/1280 webp), EXIF/GPS strip, `files.owner_id`, public vs private buckets with signed
short-lived URLs, scan hook, UUID filenames, per-user quota.

## 10. PWA
`manifest.webmanifest` (maskable 512 icon, `theme_color #0A0C0E`, `dir: rtl`), service worker:
precache app shell, SWR for static assets, network-first pages + offline fallback, **never cache
authenticated mutations**, background-sync retry for "join campaign", install prompt UI.

## 11. Analytics (privacy-aware)
Events: `user_registered, onboarding_completed, coach_viewed, coach_followed, booking_requested,
bodyyar_session_started, bodyyar_recommendation_generated, morshed_play_started,
morshed_completed, campaign_viewed, campaign_joined, challenge_completed, reward_claimed,
coupon_redeemed`. Consent flag, truncated IP, no PII in props, 90-day raw retention + rollups.

## 12. Observability
Structured JSON logs with `request_id`, error-tracking adapter, `/api/health` (db, queue lag,
disk), audit-log UI, slow-query log >200ms, deploy artefact log. Never log OTP, passwords,
tokens, cookies, precise geo.

## 13. Environments & deployment
`development → staging → production`, `.env.example` per env, dev seed never in prod.
University-server inspection checklist before deploy: OS/CPU/RAM/disk, Node LTS + pm2/systemd,
PostgreSQL 16, Nginx/Plesk vhost, TLS + domain, firewall/ports, env store, backup cron.
Deploy = build artefact → `migrations up` → health check → tag for rollback.
**Not executed in Phase 0 — no credentials or server details were available.**

## 14. Testing strategy
Unit (OTP TTL, RBAC matrix, reward rules, campaign eligibility, persian-number utils) with
Vitest; integration (API + db) for auth, coach approval, campaign join; E2E (Playwright) for the
11 critical journeys. CI gates: `type-check → build → test`.

## 15. Performance budgets
Mobile 4G first load ≤ 180KB JS gz · LCP ≤ 2.5s · CLS < 0.05 · INP < 200ms · AVIF/WebP with
explicit dimensions · subset woff2 + `font-display: swap` · streamed/RSC content so critical
copy renders before hydration (page must not be blank without JS) · indexed queries, cursor
pagination, no N+1.

## 16. Decision log
| Decision | Why | Alternative rejected |
| --- | --- | --- |
| Modular monolith (Next.js) | one team, fastest correct path | microservices — ops cost > benefit |
| Drizzle + Postgres | typed SQL, simple migrations, JSONB where needed | Prisma (heavier), Mongo (no relational integrity) |
| OTP-only auth | Iranian market norm, mobile-first, fewer breach vectors | passwords (reuse + support cost) |
| Adapter layer for every 3rd party | provider lock-in is the top lifecycle risk | direct SDK calls |
| Coded design system in Phase 0 | environment ships a static bundle; visual quality is a hard requirement | docs-only design (unverifiable) |
| Campaign-first, game-second | business goal is brand engagement + retention | gaming-first positioning |

## 17b. Phase 1 decisions

| Decision | Why | Rejected |
| --- | --- | --- |
| Ship **contracts + pure domain logic**, no simulated backend | §4 forbids faking DB/auth/OTP/RBAC; a static bundle cannot host a runtime | localStorage/mock "login" — would be a lie in the product |
| Self-host fonts via npm (`@fontsource-variable/*`) | §9 forbids CDN dependence; npm is version-controlled and bundles into the artefact | Google Fonts link; hand-downloaded binaries (not reproducible) |
| Drizzle schema + SQL migration as the source of truth | §29 forbids `drizzle-kit push` for production | push-based schema sync |
| Zod at every boundary (`parseOrThrow`) | one validation language, typed errors | per-page ad-hoc checks |
| RBAC as a pure function `can(actor, permission)` | unit-testable, no I/O, reusable by API layer | UI-conditional permissions |
| Rate limiter behind an interface; browser countdown labelled UX-only | client timers are not a security control | pretending a countdown is rate limiting |
| `AuthGateway` injected, default `UnavailableAuthGateway` | honest "service not connected" instead of fake success | silent mock gateway |

### Structure added in Phase 1
```
src/
├── components/
│   ├── AppShell.tsx · cards.tsx · icons.tsx        (layout / feature)
│   ├── ui.tsx                                      (legacy kit — merge in Phase 2)
│   └── ui/                                         (canonical primitives)
│       ├── button.tsx · field.tsx · feedback.tsx · overlay.tsx
├── modules/
│   ├── auth/    phone.ts · otp.ts · session.ts · contracts.ts · repository.ts · AuthScreen.tsx
│   ├── rbac/    permissions.ts
│   └── settings/settings.ts
├── server/      audit.ts · rate-limit.ts
├── adapters/    types.ts   (AI · SMS · Push · Storage · Payment · Realtime · Queue · Analytics)
├── db/          schema.ts  · migrations/0001_foundation.sql
├── config/      env.ts     (zod-validated env + feature flags)
└── lib/         errors.ts · logger.ts · validation.ts
```

### Auth flow (implemented as contracts, executed by Phase 2 server)
```
phone → toLatinDigits/normalizePhone (۰-۹ · ٠-٩ · 0-9) → phoneSchema → RATE_LIMITS
     → gateway.requestOtp → challenge(id, maskedPhone, expiresAt, resendAfter)
     → OtpInput (6 cells, ltr row) → otpCodeSchema → gateway.verifyOtp
     → session (HttpOnly, Secure, SameSite=Lax, 7d sliding / 30d absolute) → audit
```
Implemented today: normalisation/validation, OTP policy + countdown/retry rules, session
expiry/rotation rules, cookie policy, RBAC evaluation, audit contract, rate-limit rules,
typed errors + Persian messages, redacting logger, Zod env parsing, DB schema/migration.

## 17. Risk register
| Risk | Sev | Mitigation |
| --- | --- | --- |
| OTP abuse / spam | high | per-phone + per-IP limits, captcha after 3 fails, audit |
| AI provider dependency & cost | high | adapter, response cache, per-user daily caps, local fallback |
| Campaign fraud / fake engagement | high | server-verified events, device fingerprint, reward review queue, caps |
| Media storage growth | med | quotas, lifecycle rules, compression |
| UGC moderation | med | draft→review workflow, report action, admin queue |
| Mobile perf on slow networks | med | budgets, code-splitting, image pipeline |
| Unknown deployment target | med | inspection checklist, staging first, rollback tag |
| Analytics/event table growth | med | partitioning, rollups, archival |
| Notification reliability | med | queue + retry + provider fallback + status log |
| Privacy | med | consent, minimal PII, retention, no PII in logs |
| Scope creep (game engine, payments) | high | phase gates + Definition of Done |
