# Phase 3.7f — Learn methods (Socratic + fading + Feynman)

Adds Learn intake cards next to theory and flashcards. Teach → Drill →
Prove on the skill-tree node is unchanged. Mastery rules are unchanged.
Bronze stays Prove-gated. Do not rewrite Silver / Gold / Legendary here
(21-day Legendary would make Gold unreachable).

## Shipped

- Socratic («Пояснити разом») — coach asks, student generates the idea
- Fading worked examples («Крок за кроком») — Level 1 full solution,
  then hide one more step from the end. Local accept-list scoring, no
  SymPy. ≥80% first-try to unlock the next level. +50 XP on Got it
- Feynman teach-back («Поясни мені») — 60–90s explain-to-novice.
  Browser `SpeechRecognition` only. No Whisper / no new AI vendor
  (Decision Log #39). Sonnet grades clarity / completeness / gaps. +50 XP
- Coach recommend badge on the picker (`recommendLearnMethod`)
- NMT (and `nmt-*` tree slugs) force Ukrainian on every AI call —
  chat, theory, cards, Socratic, fading, Feynman. UI language loses

## Deferred

- Whisper / OpenAI TTS (blocked: Decision Log #39)
- Half-sheet overlay on the skill-tree node
- Silver / Gold / Legendary rewrite

## Decision Log

| # | Decision | Answer |
|---|---|---|
| 47 | Replace Teach → Drill → Prove with 4 modes? | No. Add Learn methods. Mastery stays Prove-gated. |
| 39 | New AI vendor for Feynman voice? | No. Browser SpeechRecognition only. |
