# KAYAR Progress

## Phase 1

Start Time: T+00:00 (session clock)
Feature Freeze Time: T+50:00 ✓ REACHED — no new capabilities after this point
Final Stop Time: T+55:00

Status: IN PROGRESS → validation phase

Scope: production structure · DB foundation · auth/OTP/session contracts · RBAC · audit ·
errors · logging · settings · adapters · validation (Zod) · self-hosted typography ·
design-system primitives · app shell · PWA foundation · documentation.

Constraint acknowledged: this environment publishes a static single-file bundle
(`vite-plugin-singlefile`). Per Phase 1 §6, **no server functionality will be faked** —
server-bound capabilities ship as typed contracts, pure domain logic and adapter interfaces
that Phase 2 can implement behind a real runtime.

---

## Phase 0

| Marker | Timestamp |
| --- | --- |
| Start Time | T+00:00 (session clock) |
| Feature Freeze Time | T+50:00 |
| Final Stop Time | T+55:00 |

Status: IN PROGRESS → see final status at bottom.

> Wall-clock timestamps are recorded relative to the agent session clock (T+minutes).
> The 55-minute hard deadline is respected by design: feature work stops at T+50,
> validation + report complete by T+55.

---

## Environment findings (first 10 minutes)

* Repository = **greenfield Vite 7 + React 19 + TypeScript 5.9 + Tailwind v4** starter.
  Only `src/main.tsx`, `src/App.tsx`, `src/index.css`, `index.html` exist → nothing to preserve.
* Package manager: **npm** (no lockfile conflicts). No test runner installed.
* Build: `vite build` with `vite-plugin-singlefile` → output is a single `dist/index.html`.
  ⇒ The deliverable for this environment is a **static, self-contained front-end snapshot**;
  a Node/Next server cannot be hosted here. Server-side architecture is therefore specified
  as contracts (see `docs/architecture/overview.md`) instead of being half-implemented.
* No deployment target credentials/config present (no Plesk/Nginx/SSH info) → **deployment = NOT AVAILABLE**, documented as a risk, not attempted.

## Scope decision for this snapshot

Phase 0 requires (a) the architecture/design foundation documents **and** (b) the visual
product direction. Because the environment can only ship a static bundle, the visual
direction is delivered as a **living, coded design system + reference screens** (RTL,
mobile-first) that Phase 2/3 will reuse verbatim. Server code is intentionally *not* faked.

## Validation chain (actually executed)

```text
type-check : PASS  — tsc via editor/IDE diagnostics on every write (0 errors at final state).
             NOTE: `type-check` npm script does not exist in package.json (documented, not fabricated).
build      : PASS  — `npm run build` → vite v7.3.2, 42 modules, dist/index.html 373.95 kB (gzip 98.7 kB)
tests      : N/A   — no test runner installed in this environment (documented in architecture §14).
deployment : NOT AVAILABLE — no university-server credentials/config/host info present in the repo.
```

## Phase 0 checklist

[x] Product vision · roles · IA · journeys   [x] Coaches / BodyYar / Morshed / Sponsorship architecture
[x] Game positioned as campaign mechanic     [x] Admin + CMS architecture
[x] Auth (OTP) + security principles         [x] DB plan + adapter contracts
[x] Notifications / realtime / jobs / PWA    [x] Analytics + observability
[x] Design system documented AND coded       [x] Mobile-first + states + a11y rules
[x] Testing strategy + perf budgets          [x] Roadmap + DoD
[x] Decision log + risk register             [x] Progress tracking (this file)

## Status: PHASE 0 COMPLETE

---

# Phases 9–12 (PWA, charts, live admin, mobile polish)

* `public/sw.js` — service worker: shell cache, network-first navigation with offline
  fallback, SWR for images/icons, GET-only (mutations never cached). Registered in
  `main.tsx` on https only.
* Manifest + maskable icons + apple meta → installable; `beforeinstallprompt` chip in
  ProductShell; offline banner via online/offline events.
* Charts: `chart.js` + `react-chartjs-2` (`components/charts.tsx`), RTL tooltips, dark
  theme, Persian labels. Admin KPIs, weekly event bars, tag doughnut and audit line are
  **derived from live kernel state**, not canned numbers.
* Admin is RBAC-guarded end-to-end: non-admin sees a denial state, admin approves/rejects
  bookings inline, users table + append-only audit feed render from the device store.
* Mobile: CountUp stats (reduced-motion aware), profile-driven "today plan" on Home,
  Morshed favourites filter + continue-listening rail, PlayerBar over bottom nav.

Known trade-off: singlefile build inlines chart.js (~+160KB gz). Route-level splitting
returns in the Next.js phase.

# Phases 2–8 (product surfaces on the device kernel)

Status: IMPLEMENTED as a working client product. Persistence is the device store
(`localStorage`, key `kayar.device.v1`) because this deployment has no Postgres.
OTP is real (CSPRNG + SHA-256 + TTL + attempt cap + rate limit). SMS vendor is the
dev port (code shown on the login screen). RBAC gates booking approval. Campaign
join / daily check-in / reward claim are idempotent. BodyYar replies come from the
local rules engine using the saved profile — not an echo bot.

Routes: `#/login` `#/onboarding` `#/app` `#/coaches` `#/coach/:id` `#/bodyyar`
`#/morshed` `#/campaigns` `#/profile` `#/admin`

Demo phones: admin `09121111111` · coach `09122222222` · any other valid mobile is a user.

# Phase 1

Start Time: T+00:00 · Feature Freeze Time: T+50:00 · Final Stop Time: T+55:00
55-minute limit respected: **YES**
Status: PHASE 1 COMPLETE (snapshot validated)

## Validation chain (actually executed — nothing claimed that was not run)

```text
type-check : RUN AS DIAGNOSTICS — `npm run type-check` does NOT exist in package.json and
             package.json is out of scope to edit under this environment's rules (install
             only via tooling). TypeScript diagnostics surfaced on every file write during
             the session; final state reports 0 errors. Not executed as a standalone command.
build      : PASS — `npm run build` → vite 7.3.2, 149 modules transformed,
             dist/index.html 682.58 kB (gzip 282.91 kB). Single-file output.
tests      : NOT RUN — no test runner installed and no `test` script exists (see below).
deployment : NOT AVAILABLE — no server credentials, host, DB or deployment tooling in repo.
```

## Phase 1 deliverables

**Architecture / structure**
* Real boundaries added: `src/modules/{auth,rbac,settings}`, `src/server`, `src/adapters`,
  `src/db`, `src/config`, `src/lib`, `src/components/ui`. Existing files were NOT moved
  purely for tree cosmetics (Phase 1 §7).

**Database**
* `src/db/schema.ts` (Drizzle/Postgres): users · roles · permissions · role_permissions ·
  user_roles · sessions · otp_codes (hash only) · audit_logs · settings · feature_flags,
  with FKs, unique/index constraints and timestamps.
* `src/db/migrations/0001_foundation.sql` — SQL migration as source of truth (no `push`).

**Authentication foundation (contracts, no simulation)**
* `phone.ts` — Persian/Arabic/ASCII digit normalisation, Iranian-mobile validation, canonical
  E.164 (`989…`), masked/grouped Persian display.
* `otp.ts` — 6 digits · TTL 120s · max 5 attempts · 45s resend cooldown, pure helpers.
* `session.ts` — expiry/revocation/rotation rules + HttpOnly/Secure/SameSite cookie policy.
* `contracts.ts` — `AuthGateway` interface + Zod DTO schemas + `UnavailableAuthGateway`
  (returns `PROVIDER_UNAVAILABLE`; never fabricates a login).
* `repository.ts` — `UserRepository` / `OtpChallengeRepository` / `SessionRepository`.
* `AuthScreen.tsx` — real phone → OTP UX: normalisation, consent, `aria-invalid`, paste /
  auto-advance / backspace OTP cells, resend countdown, expiry countdown, Persian error state,
  honest static-environment notice.

**RBAC + audit + rate limit + settings + errors + logging**
* `rbac/permissions.ts` — 19 explicit permissions, 6 roles (user/coach/admin/moderator/support/
  sponsor), `can()` / `assertCan()` pure evaluation.
* `server/audit.ts` — append-only contract with actor/action/resource/metadata/requestId/result.
* `server/rate-limit.ts` — rule set + fixed-window implementation; browser countdown explicitly
  labelled UX-only.
* `settings/settings.ts` — typed, declared keys, secret references by env name only.
* `lib/errors.ts` — `AppError` code/status/meta + Persian user messages, safe payload mapping.
* `lib/logger.ts` — structured JSON logging with enforced redaction + phone masking.
* `lib/validation.ts` — `parseOrThrow` (single Zod boundary), `config/env.ts` validated env.

**Design system / typography / shell**
* Self-hosted Vazirmatn Variable (100–900) + Sora Variable via npm — **no CDN**.
* `--font-persian` / `--font-display` tokens + semantic roles `.t-display … .t-num`.
* Primitives: Button, IconButton, Input, SearchInput, PhoneInput, OtpInput, Select, Checkbox,
  Radio, Switch, Tabs, Badge, Chip, Card, Avatar, Dialog, Sheet, Skeleton, Spinner,
  EmptyState, ErrorState, OfflineState, Progress, Divider.
* AppShell: skip link, desktop rail, mobile drawer, bottom nav (خانه/مربی‌ها/بدن‌یار/مرشد/پروفایل)
  with safe-area, `guest` mode showing the real sign-in entry.
* PWA foundation: `manifest.webmanifest` (rtl, maskable icon, shortcuts), SVG icons,
  theme-color, apple-touch-icon, viewport-fit, noscript fallback.

**Placeholder routes**
* `#/morshed`, `#/campaigns`, `#/profile` now render an honest **architectural shell**
  (domain tables, planned routes, decisions, phase) explicitly marked «پیاده‌سازی نشده» —
  no fake functionality. `#/login` is a real flow against the gateway contract.

## Visual QA (code-level review; no headless browser available in this environment)
```text
320px : fixed — OTP cells were 6×44px + gaps (overflow) → flex-1 min-w-0 cells;
        coaches filter row wrapped + whitespace-nowrap/truncate chips; auth panel padding checked.
390px : OTP row ~34px cells, chips single-row, hero clamps at 1.85rem min.
430px : rails and 2-up grids unchanged, no horizontal page overflow (body overflow-x hidden).
768px : grids switch sm:2-col; drawer nav replaces rail below lg.
1280px: xl two-column layouts (rail + main) engage; tables scroll inside container.
1440px: max-w-[1560px] centred, xl 3-col card grids, sidebar 248px.
RTL    : logical properties throughout (ms/me/ps/pe/start/end), OTP row forced dir="ltr",
        arrows use chevronLeft/Right accordingly.
```

## NEXT TASK
```md
Item 1: Automated tests for pure domain logic
Current state: phone/otp/session/permissions/rate-limit are pure and testable; no runner installed.
Continuation point: install vitest + @testing-library/react, add "test" and "type-check"
  scripts to package.json (currently out of scope for this agent), then write
  src/modules/auth/__tests__/phone.spec.ts (۰۱۲۳۴۵۶۷۸۹ / ٠١٢٣٤٥٦٧٨٩ / 0-9 / +98 / 0098 / invalid),
  otp.spec.ts (paste, backspace, TTL, attempts), rbac.spec.ts (can/assertCan matrix).
Why deferred: package.json may not be edited by this agent and no test script exists.

Item 2: Real auth server (Phase 2)
Current state: AuthGateway + repositories + schema + migration exist; gateway is unavailable.
Continuation point: implement `ServerAuthGateway` in a Node runtime using
  src/modules/auth/repository.ts + src/server/rate-limit.ts, issue the HttpOnly cookie from
  src/modules/auth/session.ts policy, then inject it into <AuthScreen gateway={...} />.

Item 3: Static/SSR critical content
Current state: SPA — content requires JS; <noscript> fallback text is rendered.
Continuation point: migrate to Next.js (Phase 1 §6 decision) so hero + navigation render
  before hydration.
```

## Status: PHASE 1 COMPLETE



* Design tokens (colour, type, radius, shadow, motion) in `src/index.css` + `docs/design/design-system.md`.
* Product / IA / roles / journeys docs.
* Technical architecture, domain model, DB plan, adapter contracts, auth, security, jobs, realtime, PWA, analytics, observability, deployment, testing, decisions, risks.
* Coded reference screens (RTL, responsive): public landing, coaches directory, coach profile, BodyYar dashboard, admin dashboard, mobile screen gallery.
* Roadmap + Definition of Done.

## NEXT TASK

```md
Item: Phase 1 — Foundation + Database + Auth (OTP/RBAC)
Current state: Contracts documented, no server code exists.
Exact continuation point: docs/architecture/overview.md §7 "Database plan" → create
  drizzle schema for users/roles/sessions/otp_codes/audit_logs, then OTP service.
Why deferred: Environment cannot host a Node/Postgres server; time budget spent on
  architecture + coded design foundation.
```
