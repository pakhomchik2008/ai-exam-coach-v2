# Phase 3.7j — Playwright smoke

Branch: `phase-3.7j/playwright`, cut from `main` after #23.

The mega-prompt DoD list and `docs/qa-checklist.md` are not in the
repo. This slice installs Playwright and covers the one path that
must not die: landing → demo → Learn tree. Chromium only, in CI.

## MVP

- `@playwright/test` + Chromium. No Firefox / WebKit in this PR.
- `e2e/smoke.spec.ts`: landing CTA, then Demo → IELTS onboarding →
  Learn shows the Listening unit.
- CI job `e2e` after `npm run build`. Preview on :4173.
- No AI calls. Onboarding commit is local.

## Deferred

| Item | Why |
|---|---|
| 60+ QA checklist | File does not exist. Write it, then add cases. |
| Firefox / WebKit / mobile | Cost. Chromium is the Vercel audience. |
| Lighthouse | Separate Phase 4 leftover. |
| Auth / Stripe / Whisper | Need secrets and real accounts. |

## Decision Log

| # | Decision | Why |
|---|---|---|
| 59 | Chromium-only smoke in CI | Catches a blank Learn tree. Not a second test framework. |
| 60 | Preview the production build | `vite` HMR is not what students hit. |
| 61 | No `data-testid` yet | Visible English copy is the contract. Add ids when a label change flakes. |

## Reversibility

- Delete `e2e/`, the CI job, and the npm script. `npm ci` without
  `npx playwright install` still runs unit tests.

## What could break silently

| Risk | Guard |
|---|---|
| Demo needs Supabase anonymous sign-in | startDemo still routes if anon fails. Test waits on onboarding copy, not a JWT. |
| Two "Learn" buttons (desktop + hidden mobile) | Playwright clicks the visible one. Viewport 1280. |
| Preview without a prior build | CI builds first. Local `test:e2e` builds if `dist/` is missing via the webServer command. |
