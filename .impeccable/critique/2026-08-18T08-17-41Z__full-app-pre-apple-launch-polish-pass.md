---
target: full app pre-Apple-launch polish pass
total_score: 30
p0_count: 1
p1_count: 2
timestamp: 2026-08-18T08-17-41Z
slug: full-app-pre-apple-launch-polish-pass
---
**Method: dual-agent (A: a9181de05cd66a7cd · B: a9e2913170f2fc41f)**

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | AI-thinking dots (loadDot) and grade-reveal (pulse) reference keyframes that don't exist |
| 2 | Match System/Real World | 4 | Exam-native language throughout |
| 3 | User Control and Freedom | 3 | No visible quit mid-attempt in Exam Sim |
| 4 | Consistency and Standards | 2 | Four parallel motion vocabularies (ux-, learn-, settings-, energy-) |
| 5 | Error Prevention | 3 | Inline validation, race-timeout convention |
| 6 | Recognition Rather Than Recall | 4 | Dashboard surfaces reasons, weak-spot list |
| 7 | Flexibility and Efficiency | 3 | No keyboard-nav evidence in Coach |
| 8 | Aesthetic and Minimalist Design | 3 | Clean on screen; Dashboard.jsx 640 lines inlined |
| 9 | Error Recovery | 3 | Plain-language inline errors |
| 10 | Help and Documentation | 2 | No contextual help/tooltip layer |
| Total | | 30/40 | Good — address consistency gap before launch |

## Anti-Patterns Verdict

LLM read: not slop, real token discipline, but four separately-invented motion vocabularies, stray duplicate settings 2.css, two dead keyframe refs.

Deterministic scan (detect.mjs --json src, exit 2, 37 findings, all warning):
- layout-transition (16): AIChat.jsx:3793,4601, tweaks-panel.jsx:115, energy.css:245,305,351, 10x in _ds_bundle.js
- side-tab (11): Schedule.jsx:130, StudyCalendar.jsx:347, Exams.jsx:44, exam-wizard.jsx:657, LearnMain.jsx:971, landing.css:558-559, 4x _ds_bundle.js
- bounce-easing (10): energy.css:6,217,286,356,391,439,454,617, motion.ts:8, _ds_bundle.js:7159

Detector's side-tab hits land on exact files Assessment A flagged for inconsistent motion/component vocabulary — strong agreement.

Browser evidence: Dashboard desktop+mobile clean — zero console errors, zero failed requests, zero a11y violations, correct Gabarito/Hanken Grotesk typography.

## What's Working
- Token architecture (typography/spacing/motion.css) coherent and self-documenting
- Dashboard recommendation card: reason + readiness delta + single CTA
- Global prefers-reduced-motion kill-switch in base.css, blanket and correct

## Priority Issues

[P0] Side-tab borders — #1 AI-slop tell, 11 places in production (Schedule, Calendar, Exams, Learn tree, landing). Fix: full borders/tints/icons instead. Command: /impeccable quieter or /impeccable layout

[P1] Dead loading/reveal animations at highest-attention moments — AIChat.jsx:684,925,1240,3481 reference pulse/loadDot keyframes that don't exist in src/styles/. Fix: add missing @keyframes to motion.css. Command: /impeccable animate

[P1] Four parallel uncoordinated motion/component vocabularies (motion.css, learn.css, settings.css, energy.css 1035 lines). Fix: consolidate onto motion.css primitives. Command: /impeccable layout then /impeccable typeset

[P2] 16 layout-thrashing transitions (width/height/padding) + 10 bounce/elastic easing sites. Fix: animate transform/opacity; swap elastic for exponential ease-out. Command: /impeccable optimize

[P2] 42+ hardcoded transition timings bypass motion tokens + stray duplicate settings 2.css (11.7KB, unimported). Fix: mechanical sweep-replace; diff-then-delete stray file. Command: /impeccable harden

## Persona Red Flags

Alex (power user): mixed 150/300/400/600/1000ms timings across Practice Engine/Speed Round/Exam Sim read as twitchy on daily use.

Sam (accessibility-dependent): reduced-motion kill-switch solid, but dead pulse/loadDot mean Sam gets static UI by accident not design — re-verify reduced-motion behavior once keyframes are fixed.

## Minor Observations
- Dashboard.jsx:625 and Settings.jsx:922 hardcode cubic-bezier(0.16,1,0.3,1) instead of var(--ease-out)
- energy.css hardcodes "JetBrains Mono" ~9x instead of var(--font-mono)
- Live browser check on Dashboard clean end to end — polish gap is structural/consistency, not visible breakage

## Questions to Consider
- Worth a consolidation pass now vs. after the App Store push?
- Was border-left ever a deliberate brand choice, or pure convergent habit across features built at different times?
