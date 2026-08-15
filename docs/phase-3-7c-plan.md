# Phase 3.7c — Hearts

Branch: `phase-3.7c/hearts`, cut from `main` after #23.

3.7h video is still blocked (ffmpeg will not run on Vercel Hobby).
Hlib picked the next unblocked slice: five Learn hearts, no freeze
token, streak stays as `computeStreak` already works.

## MVP

- 5 hearts. A wrong Drill or Prove answer costs one.
- +1 heart every 30 minutes, capped at 5. Applied on read so a closed
  tab still regenerates.
- 0 hearts: Teach is free. Drill / Prove / Skip-to-Prove wait on the
  countdown.
- Stored in `learn_hearts_v1` (PERSONAL_DATA_KEYS). Same sync blob as
  every other store. No new SQL.

## Deferred

| Item | Why |
|---|---|
| Freeze token | Hlib said not this PR |
| Hearts in Coach Practice / Speed / Speaking | Slice is Learn tree Drill + Prove |
| Refill shop / ads | No billing |
| Streak freeze | Existing daily streak is enough |

## Decision Log

| # | Decision | Why |
|---|---|---|
| 59 | Hearts only on Learn Drill / Prove misses | Teach is reading. Speaking is a different paper. |
| 60 | No freeze token | Extra economy before anyone has felt the 30-min wait. |
| 61 | Regen on read, not a worker | No cron. `getHearts()` catches up from `nextRegenAt`. |

## Reversibility

- New key. Missing key → 5 hearts. Delete the key to reset.
- LearnMain is the only spender. Remove the `spendHeart` calls and the
  wall is gone.

## What could break silently

| Risk | Guard |
|---|---|
| Clock skew / tab in the past | Clamp regen loops at 5. Never go above max. |
| Two tabs spend the same heart | Last write wins, same as every other store. |
| 0 hearts mid-Prove timer | Wall after the current reveal. Unanswered leftover does not cost. |
