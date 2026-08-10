# Phase 2 Plan — bug fixes + data migration

## Scope split, and why

Phase 2 as written bundles three things with very different dependencies:

| Slice | Blocked on | Doing now? |
|---|---|---|
| **2a — client-side bug fixes** (bugs 2, 4, 5, 6, 7, 8, 10, 11) | nothing | **yes** |
| **2b — auth rebuild** (2.2) | a Resend account + verified sending domain, which only Hlib can create | no |
| **2c — Supabase migration** (2.3, bugs 1, 3, 12) | running DDL against the production database | partially — SQL is written and reviewable, but not executed |

Splitting this way means the work that needs no credentials ships and gets reviewed now, instead of sitting behind an account signup. 2b/2c open as their own PRs once the accounts exist.

Branch is cut from `phase-1/vite`, not `main`, because Phase 1 is still unmerged. Merge order is #1 → #2 → this.

## 2a — fixes in this slice

### Bug 10 — three inconsistent grade scales (the root-cause one, do first)
`exams-store.letterBand` uses 80/60/40. `AIChat.jsx:535` and `:2169` use 90/75/60. `AIPlan.jsx:67` uses 80/60/40. The same 82% therefore renders as a different letter depending on which screen you are looking at.

Fix is `src/lib/scales.ts`: one canonical, per-exam **numeric** scale (IELTS 0–9 by 0.5, NMT 100–200, SAT 400–1600, GCSE 1–9), and a formatter. Letter grades stop being generated at all, which is also the Phase 2 requirement ("never render letter grades"). New module is written in strict TS with full unit tests — it is new code, so there is no reason for it not to be.

Ordering matters: this lands before any predictor UI work, so the predictor is built against one scale rather than being retrofitted off three.

### Bug 11 — only 1 of 5 tiers themes the background
`theme: true` on all five, plus the four missing palettes in `tiers.css`.

**Design decision.** The spec asks for Bronze/Silver/Gold/Platinum/Diamond. `legend` is already a fully built dark "night + gold" theme and is the reward at level 12 — replacing it with a "Diamond" palette would throw away working, good work for a rename. So: legend keeps its night theme, and the four lower tiers get *subtle* light-mode treatments (ambient wash + accent tint only, not a full re-skin).

This is deliberate and worth flagging: `novice` is level 1, so theming it changes the default appearance for **every new user**. Keeping the lower tiers subtle is what stops that from being a visual regression, and is what "premium minimalist, not Duolingo-loud" means in practice.

It also happens to be the only version that works today: audit finding #17 (246 hardcoded colour literals, 128 of them raw white) means a *dark* tier has holes wherever a component hardcodes white. Light tiers are unaffected by that bug. Full dark-mode tiers have to wait for the token cleanup.

### Bugs 4, 7, 8 — exam wizard
- **8:** delete `AvailabilityGrid` (the "when are you available" blackout-slot picker) from the wizard, replace with a single hours-per-day input.
- **4:** gate the Subject step on taxonomy, so IELTS/TOEFL/PTE/Duolingo skip it. Currently gated on a hardcoded `SECTION_BASED_FALLBACK` Set.
- **7:** audit finding said "contradicted" — the date field *does* exist at `exam-wizard.jsx:649`. Needs a live repro to find which path Hlib saw it missing on before changing anything.

### Bugs 2, 5, 6 — uploads, practice drill, chat attachments
Larger UI work; taken after the above land, and only if this slice stays reviewable.

## Reversibility

2a touches no persisted data shape. `localStorage` keys are untouched, so rollback is `git revert` with no user-data consequence — same property Phase 1 had. That stops being true in 2c, which gets its own reversibility plan.

## What could break silently

| # | Risk | Detector |
|---|---|---|
| 1 | Theming `novice` changes the look for every existing level-1 user, and nobody notices it is wrong until a screenshot | Visual check of each tier via the Settings preview panel before commit |
| 2 | A tier theme leaves some text below contrast minimums (the legend theme already has to fight 128 hardcoded whites) | Check computed contrast on body/card text per tier, not just eyeball it |
| 3 | Removing `AvailabilityGrid` orphans `blackoutSlots`, which the scheduler still reads (`schedule-store.jsx` free-time windows) | `migrateProfile` keeps the field; existing saved slots stay honoured. Covered by the profile-store tests already written in 1b |
| 4 | Replacing `letterBand` call sites changes displayed numbers subtly | `scales.ts` gets unit tests first; existing `letterBand` stays until every call site is migrated, then is deleted in one step |
| 5 | The tier-theme test from Phase 1b asserts the *broken* state and will now fail | Intended — that is the point of it. Updated in the same commit that fixes the bug |

## Test gate

- `npm run lint && npm run typecheck && npm test && npm run test:trust && npm run build` all green
- New: full unit coverage on `src/lib/scales.ts`
- Updated: `tier-theme.test.ts` asserts all five tiers theme
- Manual: each of the five tiers previewed and screenshotted
