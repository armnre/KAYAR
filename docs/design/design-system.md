# KAYAR Design System — «More Than A Sports App»

Premium · Sport-Tech · Cinematic · Luxury · Editorial · Minimal · Energetic.

## 1. Colour
| Token | Value | Usage |
| --- | --- | --- |
| `--color-base` | `#0A0C0E` | page background |
| `--color-surface` | `#12151A` | cards, panels |
| `--color-surface-2` | `#191D23` | raised cards, inputs |
| `--color-ink` | `#23272B` | brand base (from brand book) |
| `--color-ink-2` | `#1B1E21` | brand base alt |
| `--color-line` | `#262C33` | 1px borders/dividers |
| `--color-neon` | `#D7FF1F` | CTA / active / highlight |
| `--color-muted` | `#A7ABB6` | secondary text |
| `--color-violet` | `#6A3DFF` | Morshed / audio / creative |
| `--color-gold` | `#F6C667` | sponsorship / campaigns / rewards |
| `--color-cyan` | `#22D3EE` | recovery / data accent |
| semantic | `ok #4ADE80` `warn #FBBF24` `danger #F87171` | states |

Contrast: body text `#E8EAED` on `#0A0C0E` = 15.9:1; `#A7ABB6` on surface = 7.4:1. Neon is
**never** used as text colour on light, only as fill on `#0A0C0E` text or as accent line.

## 2. Typography
* **Vazirmatn** (Persian, 300–900) — all UI copy. Display = Vazirmatn 800 with tight tracking.
* **Sora** (300–800) — Latin wordmark, numbers in dashboards, `MORE THAN A SPORTS APP`.
* Scale (mobile → desktop): 12/13/14/16/18/20/24/30/36/48/60. Persian line-height 1.75 for
  body, 1.25 for display. Persian digits (۰۱۲۳۴۵۶۷۸۹) everywhere in user-facing copy.

## 3. Space, radius, elevation
* Space scale `4/8/12/16/20/24/32/40/56/80`. Section rhythm desktop 80, mobile 48.
* Radius: `sm 8`, `md 12`, `lg 16`, `xl 22`, `pill 999`.
* Elevation: `card` = 1px `line` + `0 18px 40px -24px #000`; `glow` = `0 0 0 1px #D7FF1F33, 0 12px 40px -12px #D7FF1F55`.
* Surfaces: glass = `background: linear-gradient(180deg,#ffffff0d,#ffffff05); backdrop-filter: blur(14px)`.
* Texture: 3–5% film noise overlay + diagonal neon "shards" (masked gradient) for cinematic energy.

## 4. Components
Button (primary neon / ghost / outline / icon 44px), Chip/Filter, Tab (underline neon),
Card (coach, program, content, stat, notification), Input + search, Bottom sheet, Dialog,
Toast, Badge (آنلاین/آفلاین), Skeleton, Empty, Error, Offline, Rating stars, Progress ring,
Sparkline, Donut, Bottom navigation (mobile), Sidebar rail (desktop), Phone frame (showcase).

## 5. States (mandatory)
`default · hover · focus-visible · active · loading · skeleton · empty · error · success ·
offline · permission-denied · unauthorised · expired-session · no-results · disabled · processing`.
Every page ships at least: loading skeleton, empty, error.

## 6. Motion
* Durations 150 (micro) / 240 (surface) / 600 (hero). Easing `cubic-bezier(.22,.61,.36,1)`.
* Scroll reveal: 16px rise + fade, staggered 60ms, IntersectionObserver, **once**.
* Hover: 4px lift + neon border on cards; 1.02 scale on avatars; neon sweep on primary buttons.
* `@media (prefers-reduced-motion: reduce)` disables transforms/transitions (opacity only).

## 7. Layout & responsive
Breakpoints `360 · 480 · 768 · 1024 · 1280 · 1440+`. Mobile-first, RTL (`dir="rtl"`).
App shell: desktop = left rail (256px) + content + right rail (320px, ≥1280 only).
Mobile = top bar + bottom tab bar (5 items, 44px targets, `env(safe-area-inset-bottom)`).
Content rails scroll on X with hidden scrollbars; **no horizontal page overflow ever**.

## 8. Accessibility
Semantic landmarks, skip link, visible `:focus-visible` neon ring, 4.5:1 minimum, aria-labels
on icon buttons, `aria-current` on nav, keyboard operable tabs/menus, reduced-motion support,
RTL-safe logical properties (`ms-*`/`me-*`/`ps-*`/`pe-*`).

## 9. Voice & tone
Persian, confident, coach-like, never gamer-speak. Numbers formatted with Persian digits.
Example micro-copy: «همراه هوشمند ورزشی شما»، «مربی مناسب خود را پیدا کن».

---

# 10. Phase 1 implementation status (what actually exists in code)

## 10.1 Typography — implemented, self-hosted
* No Google Fonts / no runtime CDN. Fonts ship as npm dependencies:
  `@fontsource-variable/vazirmatn` (weights 100–900, arabic + latin + latin-ext subsets) and
  `@fontsource-variable/sora` (100–800), imported once in `src/main.tsx`, `font-display: swap`,
  inlined into the build (single-file output, no network dependency).
* Tokens: `--font-persian`, `--font-sans` (Vazirmatn Variable), `--font-display` (Sora Variable).
* Semantic roles implemented as classes in `src/index.css`:
  `.t-display .t-hero .t-h1 .t-h2 .t-h3 .t-body .t-body-sm .t-caption .t-label .t-btn .t-num`
  — Persian roles carry `line-height: 1.95–2.05` for comfortable RTL reading.
  **Use these instead of ad-hoc `text-[13px]` values.**

## 10.2 Component inventory (canonical = `src/components/ui/*`)
| File | Exports |
| --- | --- |
| `ui/button.tsx` | `Button` (variant: primary/ghost/outline/outline-neon/text · size sm/md/lg · `loading` · `icon`/`endIcon` · `block` · disabled), `IconButton` (44×44 min, always `label`) |
| `ui/field.tsx` | `FieldLabel`, `FieldError`, `Input`, `SearchInput`, `PhoneInput` (RTL chrome, LTR digits, `+98` prefix), `OtpInput` (6 cells, `dir="ltr"` row, paste/auto-advance/backspace/arrow keys, `autocomplete="one-time-code"`), `Select`, `Checkbox`, `Radio`, `Switch` |
| `ui/feedback.tsx` | `Spinner`, `Skeleton`, `SkeletonCard`, `Divider`, `StateBlock`, `EmptyState`, `ErrorState`, `OfflineState`, `Progress`, `Badge`, `Chip`, `Card`, `Avatar` |
| `ui/overlay.tsx` | `Tabs`, `TabPanel`, `Dialog` (focus-trap + Escape + scroll-lock), `Sheet` (bottom sheet, safe-area aware) |
| `components/ui.tsx` *(legacy kit, to be merged into `ui/` in Phase 2)* | `Stars`, `Rating`, `ToneIcon`, `SectionHead`, `StatusDot`, `Badge`, `Crumbs`, `Sparkline`, `AreaChart`, `Donut`, `Ring`, `PhoneFrame`, `useRevealOnScroll` |
| `components/icons.tsx` | `Icon` (single 24-viewBox, stroke 1.6, round caps — no mixed icon styles), `Logo`, `IconName` |
| `components/cards.tsx` | `CoachCard`, `FeaturedCoach`, `ProgramCard`, `RecoCard`, `ListRow` |
| `components/AppShell.tsx` | desktop rail + mobile drawer + bottom nav (safe-area) + skip link |

## 10.3 Colour tokens as implemented (`@theme` in `src/index.css`)
`base #08090B` (page) · `surface #101317` · `surface-2 #171B21` · `line #242A31` · `line-2 #2E353D`
· `ink #23272B` / `ink-2 #1B1E21` (brand base) · `neon #D7FF1F` · `muted #A7ABB6`
· `violet #6A3DFF` (+ `violet-2 #8F6BFF`) · `gold #F6C667` · `cyan #22D3EE`.
No undocumented colours were introduced.

## 10.4 Motion & interaction as implemented
`--reveal` scroll animation (IntersectionObserver, once, 180ms rise + 700ms fade, stagger 60ms),
button hover lift / press scale / neon sweep, `.card-hover` 4px lift with neon border,
`.shards` diagonal lime field for cinematic surfaces. All motion is disabled under
`@media (prefers-reduced-motion: reduce)`.

## 10.5 States implemented (not just happy path)
`default · hover · focus-visible (neon ring) · active · loading (Spinner + aria-busy) ·
skeleton · empty · error (Persian + retry) · offline · disabled · no-results` plus
`aria-invalid` + inline `role="alert"` error text on every field.

## 10.6 Iconography rule
One system only: `Icon` component, 24×24 viewBox, `stroke-width: 1.6`, round caps/joins.
Icon-only controls must use `IconButton` (≥44×44 + `aria-label`).
