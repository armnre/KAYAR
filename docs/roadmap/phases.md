# KAYAR — Roadmap & Definition of Done

## Phases
| # | Phase | Outcome | Gate |
| --- | --- | --- | --- |
| **0** | **Product + architecture + design foundation** | docs, tokens, coded reference screens, contracts | type-check + build pass |
| 1 | Foundation: env, DB schema, OTP auth, RBAC, audit | sign-up + session works | auth/rbac tests |
| 2 | Design system + app shell + core UI kit | every component with all states | a11y pass |
| 3 | Premium homepage + brand experience | CMS-driven home, mobile rails | LCP budget met |
| 4 | User app: onboarding, profile, goals, notification prefs | activated user | E2E onboarding |
| 5 | Coaches: directory, profile, services, programs, booking request | coach funnel live | integration tests |
| 6 | BodyYar: profile, conversation, plans, progress | AI plan via provider adapter | usage caps + tests |
| 7 | Morshed: content, persistent player, playlists, favourites, history | audio ecosystem live | E2E playback |
| 8 | Sponsorship + campaigns + rewards (+ challenge mechanics) | brand→engagement→reward loop | fraud controls |
| 9 | Admin + CMS + media + moderation + coach approval | ops can run the product | RBAC matrix tests |
| 10 | Realtime, jobs, push/SMS, integrations, analytics rollups | platform services live | queue health |
| 11 | QA, security review, performance, accessibility | DoD enforced | Lighthouse a11y ≥ 95 |
| 12 | Production hardening + deployment + observability | live on university server | health + rollback drill |

## Definition of Done
A feature is **not** done because a button exists or a page renders.
```
UI + Persian RTL copy          +  responsive QA (320 → 1440)
+ Zod validation               +  business logic in the domain layer
+ authorization (role+owner)   +  persistence + migrations
+ error handling               +  loading / skeleton / empty states
+ tests                        +  analytics event
+ accessibility                +  security review (no PII in logs)
+ decision-log entry
```

## Working agreements
* Trunk-based, small PRs, conventional commits; CI gates `type-check → build → test`.
* Time-box every phase. Unfinished work is written to `docs/progress.md` as `NEXT TASK` with the
  exact continuation point — never silently dropped.
* Priority when time runs out:
  `stable state > validation > build > deployment > documentation > new features`.
