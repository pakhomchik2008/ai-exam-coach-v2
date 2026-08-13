# Phase 3.7b — Full exercise mix

Branch: `phase-3.7b/exercise-mix`, cut from `phase-4.5/ai-chat`.

Learn Drill is still 3 MCQ + 2 fill. Mega-prompt §3.7 and
`docs/phase-3-7-plan.md` queued match / order / drag_drop / explain
as the next unblocked slice. Teach → Prove and mastery stay the same.

## MVP

- Five Drill items. Prompt asks for one of each: mcq, match, order,
  drag_drop, explain. fill still scores if the model sends it.
- Tap-to-place on match / order / drag_drop. No HTML5 drag, no new dep.
  Phone is the real client.
- explain: student writes, Sonnet grades against a rubric (same
  `brainComplete` path as Feynman). Pass at score ≥ 6 / 10.
- Scoring lives in `drill-exercises.ts` so Vitest can hit it without React.

## Deferred

| Item | Why |
|---|---|
| HTML5 / pointer drag | Tap-to-place works on iOS. Drag is polish. |
| math.js / SymPy fill equivalence | Still a string match. Same deferral as 3.7a. |
| Hearts cost on a miss | 3.7c |
| Coach Practice engine mix | This slice is Learn Drill only. |

## Decision Log

| # | Decision | Why |
|---|---|---|
| 56 | Tap-to-place, not drag | One interaction for phone and desktop. No extra library. |
| 57 | explain reuses the Feynman salvage parser shape | Model still emits broken LaTeX JSON. Student must see a grade. |
| 58 | Pass explain at 6/10 | Same bar as "mostly understood". Not Feynman-for-Gold. |

## Reversibility

- Prompt + UI only. `learn_progress_v1` shape unchanged.
- Unknown Drill `type` is dropped at normalize. Old 3+2 MCQ/fill
  payloads still render.

## What could break silently

| Risk | Guard |
|---|---|
| Model returns 5 MCQ | Normalize keeps them. Mix is a prompt rule, not a hard fail. |
| match pairs as a `{left: right}` object | Accept that shape. |
| `___` count ≠ answers.length | Drop the item. |
| explain JSON dies on `\\frac` | Repair slashes, then salvage raw prose. |
| Empty bank after a bad drag_drop | Drop the item; Drill still runs on the rest. |
