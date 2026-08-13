# Phase 3.7f — Socratic Learn method

Adds a third Learn intake next to theory and flashcards. The coach
asks, the student generates the idea. Teach → Drill → Prove on the
skill-tree node is unchanged. Mastery rules are unchanged.

## MVP

- Third card on `LearnMethodPicker`: «Пояснити разом»
- Turn-based Sonnet dialog via `window.brainComplete`
- One hint per concept, one surrender (full explain, no mastery bump)
- +50 XP on “Got it”, same as flashcards
- No Whisper, no on-the-fly SVG, no SymPy, no Silver/Gold rewrite

## Deferred

- Worked-example fading (Mode D)
- Feynman teach-back (needs Decision Log #39)
- Coach auto-recommend which method to open
- Half-sheet overlay on the skill-tree node

## Decision Log

| # | Decision | Answer |
|---|---|---|
| 47 | Replace Teach → Drill → Prove with 4 modes? | No. Add Socratic as a Learn method. Mastery stays Prove-gated. |
