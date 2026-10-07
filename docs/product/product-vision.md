# KAYAR — Product Vision / کایار

> **کایار — ابر اپلیکیشن ورزشی فارسی، راست‌به‌چپ و پریمیوم**
> Fitness. Coach. Progress. — «همه در یک پلتفرم.»

## 1. Vision
KAYAR is the premium Persian RTL sports-tech **Super App** of the Kapoosh ecosystem.
It replaces the 4–6 disconnected apps an Iranian trainee uses today (coaching, diet,
audio content, gyms, brand offers) with one cinematic, high-trust product.

Positioning statement: *«فناوری، مربی، انگیزه — همه در یک پلتفرم»* — More Than A Sports App.

## 2. Target users
| Persona | Need | Primary modules |
| --- | --- | --- |
| **نوآموز** (18–28, first gym year) | direction, safety, cheap plans | BodyYar, Morshed, campaigns |
| **مربی‌محور** (25–40, buys coaching) | trusted coach, real progress | Coaches, BodyYar, rewards |
| **حرفه‌ای** (athlete/competitor) | periodisation, data, recovery | BodyYar, Coach programs |
| **مربی** (coach, supply side) | students, income, reputation | Coach workspace, campaigns |
| **برند/اسپانسر** (demand side) | engaged, verified sport audience | Sponsorship & campaigns |

## 3. Value propositions
1. **مربی‌ها** — verified coaches with real credentials, specialties, programs, availability.
2. **BodyYar / بدن‌یار** — AI assistant that turns goals into a personalised training/nutrition/recovery plan (provider-agnostic).
3. **Morshed / مرشد** — premium audio: coaching talks, sport psychology, music for training.
4. **Sponsorship & campaigns** — brands fund engagement; users earn real rewards. The **game layer is a campaign mechanic, never a gaming product**.

## 4. Product hierarchy
```
Tier 1 (core experiences)  : Coaches · BodyYar · Morshed
Tier 2 (engagement/biz)    : Sponsorship & Campaigns (+ challenge/mini-game mechanics)
Platform (infrastructure)  : Identity, Personalisation, Notifications, CMS, Admin,
                             Analytics, Realtime, Media, Integrations, Commerce (future)
```

## 5. Roles & permission boundaries
| Role | Can | Cannot |
| --- | --- | --- |
| **user** | auth (OTP), onboarding, profile, BodyYar, coach discovery, Morshed, campaigns, rewards, notification preferences | approve coaches, see others' data, touch CMS |
| **coach** | own profile, services, programs, students, sessions, own analytics | self-approve, read admin analytics, edit platform content |
| **admin** | users, coach approval, Morshed content, campaigns, sponsors, BodyYar config, CMS, notifications, settings, audit logs | bypass audit; edit financial records without dual control |
| future: `moderator`, `sponsor`, `support` | scoped subsets | — |

Every permission is enforced **server-side** (RBAC middleware); UI hiding is cosmetic only.

## 6. Information architecture (user app)
```
KAYAR
├── خانه / Home            (hero, quick modules, rails, campaigns, notifications)
├── مربیان / Coaches       Discover · Search · Filters · Coach Profile · Programs · Services
├── BodyYar                Dashboard · AI Conversation · Goals · Activity · Recommendations · History
├── مرشد / Morshed         Discover · Podcasts · Music · Playlists · Favourites · History · Player
├── کمپین‌ها / Campaigns   Discover · Detail · Challenges · Rewards · My Campaigns
└── پروفایل / Profile      Account · Goals · Activity · Rewards · Notifications · Settings
```
Admin IA: `Dashboard · Users · Coaches · BodyYar · Morshed · Campaigns · Sponsors · CMS · Media · Notifications · Reports · Settings · Audit Logs`.

## 7. Critical journeys
1. **Activate**: install → phone OTP → 3-step onboarding (goal/level/restrictions) → personalised Home.
2. **Find a coach**: filter (specialty/gender/city/price) → profile → program → request booking.
3. **BodyYar**: ask → plan generated → today's session → progress ring + weight log.
4. **Morshed**: discover → play (persistent mini-player) → favourite → history.
5. **Campaign**: brand campaign → join → complete challenge → reward/coupon → retention loop.

## 8. MVP boundary (Phase 1–8)
In: OTP auth, onboarding, Home, coach directory + profile + booking request, BodyYar chat + plan + progress, Morshed discover + player, campaign discovery + join + reward claim, admin CRUD + approval, CMS pages/blocks, notifications (in-app + push adapter).
Out of MVP: payments/checkout, realtime chat, full game engine, advanced analytics, sponsor self-service portal.

## 9. Business capabilities (future)
Subscriptions, coach payouts, marketplace of programs, brand self-service campaign builder, corporate wellness (Kapoosh B2B), white-label clubs.
