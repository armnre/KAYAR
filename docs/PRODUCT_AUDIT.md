# KAYAR — Product Audit (Phase 1)

Baseline: branch `main`, commit `0d8065e` ("fix on local"). Work branch: `kayar-upgrade`.

## Architecture (verified)
| Layer | Implementation |
|---|---|
| Monorepo | npm workspaces: `apps/*`, `packages/*` |
| Web app | `apps/kayar-1` — React 18 + Vite + Tailwind 3, RTL Persian (Vazirmatn / Sora) |
| API | `apps/api` — Fastify 5, Drizzle ORM, Postgres, argon2, rate-limit, helmet |
| Shared contracts | `packages/shared` — zod schemas (`bodyyar`, `tracks`, `cms`, `endpoints`) |
| UI kit | `packages/components` — shadcn/ui primitives |
| Root | Next 16 (`next.config.ts`) used for `start:web` |
| Migrations | `apps/api/drizzle/0000_famous_plazm.sql` |

## Feature matrix
| Area | Exists | Gaps |
|---|---|---|
| Auth (login, sessions, forced password change, RBAC) | Yes | — |
| Admin / CMS / members / audit | Yes | Block ordering, announcements UI |
| BodyYar profile / plan / chat / weight log / workout log | API + single page `/app/bodyyar` | Dashboard, exercise library, active workout session, nutrition, food catalog, progress charts |
| AI (NaraRouter) | `server/ai.ts`: server-side key, timeout, model fallback, JSON validate + repair, daily/minute quotas | No automated tests against provider; base URL/models need verification against official docs |
| Morshed | `server/jamendo.ts`, `morshedTracks`, admin tracks, `Morshed.tsx`, `Podcasts.tsx` | Global persistent player, queue, favorites/history persistence, RSS podcast ingestion, Media Session |
| PWA | — | Not started (per `apps/kayar-1/docs/progress.md`) |
| Tests | `vitest` configured, **0 test files** | — |

## Baseline validation (before changes)
| Command | Result |
|---|---|
| `npm ci --ignore-scripts` | OK |
| `npm run build:shared` | OK |
| `npm run typecheck -w @kayar/api` | OK |
| `npm run typecheck -w @project/kayar-1` | OK |
| `npm test` | **FAIL (pre-existing)** — vitest finds no test files |
| `npm run build -w @project/kayar-1` | OK, warning: main chunk > 500 kB |

## Known issues
- No code-splitting: single >500 kB chunk (performance).
- Brand tokens used `#0A0C0E` as background instead of KAPOUSH `#1B1E21`.
- Several screens rely on `src/data/sample.ts` sample data (must be labeled or replaced).
