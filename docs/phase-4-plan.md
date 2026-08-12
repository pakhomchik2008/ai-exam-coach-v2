# Phase 4 Plan — Design system, logo, sounds, landing

Branch: `phase-4/brand-landing`, cut from `main`.

Mega-prompt Days 16–19. This PR ships the marketing surface + brand kit.
Billing, Capacitor, and App Store stay in Phases 5–6.

## Scene (why it looks like this)

A student at a desk at 1am, exam in 40 days, wants a number not a pep talk.
Light: lamp, cool night, teal from a score graph on screen.
Voice words: clinical, predictive, night-desk.
Color strategy: **Committed** — Deep Teal `#1B4D4A` carries the hero.
Paper `#FAFAF9` / ink `#0E0F10` for reading. Amber `#F3D062` only on the
logo diamond and dark-section sparks. Not cream-SaaS, not Duolingo-loud.

## What ships

### 4.1 Logo
- Mark: one upward line-graph that reads as a quiet "e", amber diamond at
  the peak. Wordmark `exam.coach` in JetBrains Mono.
- Delivered under `brand/` (source) and `public/brand/` (built).
- Web favicon + apple-touch-icon. iOS `AppIcon.appiconset` ready for Phase 5
  Capacitor (folder exists now so Xcode has something to copy).

### 4.2 Sound kit
- Six cues, WAV+MP3, mixed near -18 LUFS. Default **off**.
- Toggle in Settings. `src/lib/sounds.ts` is the only play path.
- Haptics: no-op on web; calls Capacitor if Phase 5 added it.

### 4.3 Landing (`src/app/landing/` + `src/features/landing/`)
Sections in order: Hero → Demo theater → Features → Social proof →
Pricing → FAQ → About → Footer (legal + social).

Copy lives in `src/i18n/landing.ts` (UK written first, then EN/RU/FR/DE).
Missing-key CI: `src/i18n/i18n-keys.test.ts`.

Auth (Sign up / Log in / Demo) stays on this page as overlays/views.
CTA "3 days free" goes to existing signup. Stripe is Phase 6 — pricing
page is honest about that.

### Legal stubs
In-app views for Privacy, Terms, EULA, Refund, Cookies, Children.
Full GDPR/CCPA counsel pass is Phase 6. These exist so the footer is not
dead and crawlers have a page.

## Deferred (not this PR)

| Item | Why |
|---|---|
| Real 30s demo video | Needs a capture of the live product after this lands |
| Real beta testimonials | No cohort yet — founder note + exam list instead of fake quotes |
| Stripe / 3-day trial enforcement | Phase 6 billing |
| Custom domain exam.coach | Buy during Phase 5 |
| Inter Display | Spec said Inter as MVP; product already ships Gabarito. Identity stays. Wordmark uses JetBrains Mono as the spec's later option |
| Playwright Lighthouse in CI | Playwright still not installed. Manual Lighthouse before merge |
| Sound wiring inside AIChat | Kit + Settings + landing CTAs this PR. Coach/Learn hooks are one-liners later |

## Decision Log

| # | Decision | Why |
|---|---|---|
| 47 | Landing scoped under `.land` with Phase-4 teal/ink tokens. App chrome keeps existing emerald/paper tokens | A marketing drench must not retheme Learn/Coach mid-session |
| 48 | No fake testimonials or fake "10k students" metrics | Stop-slop + we have no beta cohort. Social proof is the live predictor chart + exam list + Hlib's story |
| 49 | Demo is a CSS product theater, not a muted `<video>` | We don't have a 30s capture. A fake video poster is worse than an honest live mock |
| 50 | Sounds default off | Spec. Also autoplay policies. Preview buttons in Settings so the kit is audible without hunting |
| 51 | Legal pages are stubs with a Phase-6 banner | Footer must not 404. Counsel-grade policy is a later pass |

## Reversibility

- Landing is one view. AuthForm is unchanged in contract (`signUp` / `logIn` / `startDemo`).
- `soundsEnabled` defaults false — existing profiles stay silent.
- Favicon swap is a file replace.
- New folders are additive.

## What could break silently

| Risk | Guard |
|---|---|
| i18n key missing in one language → blank headline | `i18n-keys.test.ts` |
| Sound files 404 → console noise | `playSound` swallows play() rejection |
| Google font for Mono blocks first paint | `display=swap`, wordmark falls back to `ui-monospace` |
| Lighthouse < 92 from grain/blur | Grain is SVG filter, no WebGL, `prefers-reduced-motion` kills draw animation |
| Auth form lost in the redesign | Same `AuthForm` component, same window auth API |
