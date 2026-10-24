# Implementation Plan

## Phase 1 — Audit & design foundation — COMPLETED
Audit, baseline, brand token reconciliation, first test suite.

## Phase 2 — BodyYar (highest impact)
1. DB migration: `exercises` (catalog), `workout_sessions` + `workout_sets`, `foods`, `meal_logs`, `favorite_foods`.
2. Seeded exercise catalog (documented source, asset map `src/lib/exerciseAssets.ts`).
3. Routes: `/app/bodyyar` dashboard, `/onboarding`, `/plan`, `/workout/:id`, `/session`, `/exercises`, `/exercises/:slug`, `/nutrition`, `/foods/:id`, `/progress`, `/coach`.
4. Plan generation validated against catalog ids; reject unknown exercises.
5. Session persistence with idempotency key; saved only after server confirmation.
6. Food catalog: USDA FoodData Central (public domain) seed with attribution — needs `FDC_API_KEY` for live search.

## Phase 3 — Morshed
1. Global `AudioProvider` mounted once in `AppShell` (single `HTMLAudioElement`), mini + expanded player, Media Session.
2. Tables: `podcast_shows`, `podcast_episodes`, `user_favorites`, `listening_history`, `playback_progress`.
3. RSS ingestion job with SSRF guard (https only, DNS private-range block, size/time limits, redirect cap), dedupe by GUID/enclosure URL.
4. Keep Jamendo adapter; only stream, never offer download unless license allows.

## Phase 4 — Polish & QA
Asset inventory completion, code-splitting, reduced motion, responsive checks at 360–1440 px, security review, final report.

## External dependencies
- `NARAROUTER_API_KEY` (+ verified docs) — AI features BLOCKED without it.
- `JAMENDO_CLIENT_ID` — music search.
- Postgres for running migrations / integration tests.
