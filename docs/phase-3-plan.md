# Phase 3 Plan — new capabilities

## Scope split, and why

Phase 3 as written (mega-prompt §3) bundles six things with very different
dependencies. Same approach as Phase 2: ship what needs no external account
now, defer what does.

| Slice | Blocked on | Doing now? |
|---|---|---|
| **3a — sync correctness + novelty engine (hash-dedup)** | nothing | **yes** |
| **3b — canonical exam specs + Real vs Practice modes** | nothing | **yes** |
| **3c — session recap rebuild** | nothing | **yes**, if 3a/3b stay reviewable |
| **3d — 5-step onboarding rebuild** | nothing (decision made) | plan only this round, build next |
| **3.5 — notifications** | Resend account + OneSignal account, neither exists yet | no |
| **3.6 — sync layer as "Zustand middleware"** | — | **not needed**, see below |

Branch: `phase-3/capabilities`, cut from `main` (Phase 2 fully merged).

### Why 3.6 isn't a task

The mega-prompt describes a Zustand `withSupabaseSync` middleware. This app
has no Zustand — state lives in plain `window`-global modules backed by
`localStorage`. Phase 2c's `src/lib/data-sync.ts` already does what 3.6 asks
for, at a lower level: it patches `localStorage.setItem` once, at the single
point every store's writes already pass through, which covers all 10 stores
without touching any of them — strictly more coverage than a Zustand
middleware would give (that would only catch writes going through Zustand
actions). Introducing Zustand now would be a state-layer migration with no
functional benefit, done purely to match a spec written before this
codebase's actual architecture was known. **Decision: skip.** Logged as
Decision Log #38 below.

What *is* real work from that investigation — folded into 3a:
- **Bug**: `data-sync.ts`'s `_patched` flag never resets on `stopDataSync`, so
  the closure over `userId`/`keys` survives a sign-out→sign-in-as-different-user
  and pushes the new user's writes under the old user's id.
- **Gap**: `removeItem` is a deliberate no-op — deletes never sync across
  devices. Was fine when nothing deleted a tracked key; the novelty engine's
  local seen-cache changes that.
- **Process note**: any new localStorage key Phase 3 introduces must be added
  to `PERSONAL_DATA_KEYS` (`auth-store.jsx`) or it's invisible to sync.

## 3a — sync correctness + novelty engine (hash-dedup only)

### Sync bug fix
`stopDataSync()` resets `_started`/`_channel`/`_pending` but not `_patched`.
Fix: reset `_patched` too, and re-derive `userId`/`keys` inside the
`localStorage.setItem` closure from a mutable ref rather than capturing them
at patch time — so a second `startDataSync()` call for a different user
doesn't need to re-patch at all, it just updates the ref. Simpler and closes
the bug at the root instead of papering over one symptom.

### Delete propagation
`removeItem` gets the same push treatment as `setItem`, upserting a tombstone
row (`value: null`) rather than deleting the Supabase row — deleting the row
would lose the `updated_at` that last-write-wins depends on. `reconcile()`
and `shouldAdoptRealtimeRow()` in `sync-reconcile.ts` already operate on
`RemoteRow.value: unknown`, so `null` flows through as "pull null, remove
locally" with a small addition to `runReconcile`/the realtime handler.

### Novelty engine — hash-dedup, not embeddings

The mega-prompt spec (§3.1) calls for Anthropic embeddings + pgvector
cosine-similarity dedup. **Anthropic doesn't have an embeddings endpoint** —
this is a factual error in the original spec, presumably meant OpenAI's
`text-embedding-3-small`. That would add a new AI vendor to the stack for one
feature. Not doing that without asking; see Decision Log #39.

What ships instead: exact/near-exact dedup via normalized SHA-256 hash — the
first half of the pipeline the spec describes, and the half that catches the
actual failure mode observed today (`AIChat.jsx`'s five generators rely
entirely on in-prompt instructions like "no duplicate concepts", which is a
single LLM call trusting itself, with no memory of anything served in a
*previous* session). Semantic near-dup catching (a reworded version of the
same question) is real but secondary — logged as follow-up, not blocking.

Pipeline:
```
generate → normalize (strip whitespace/case/punctuation from question text)
        → sha256 hash
        → check ai_question_bank unique(exam_taxonomy, question_hash)
        → if dup, retry once at temperature+0.15 (matches existing retry
          patterns already in AIChat.jsx's engines)
        → insert to ai_question_bank + user_seen_questions
```

New table `supabase/14_question_bank.sql` (Hlib runs, same process as 12/13):
```sql
create table public.ai_question_bank (
  id uuid primary key default gen_random_uuid(),
  exam_taxonomy text not null,
  topic text,
  question_hash text not null,
  question_text text not null,
  created_at timestamptz default now(),
  unique (exam_taxonomy, question_hash)
);
create table public.user_seen_questions (
  user_id uuid references auth.users(id) on delete cascade,
  question_id uuid references public.ai_question_bank(id) on delete cascade,
  seen_at timestamptz default now(),
  primary key (user_id, question_id)
);
-- RLS: question_bank readable by any authenticated user (shared pool),
-- insert-only via service role or authenticated insert with exam_taxonomy
-- check; user_seen_questions scoped to auth.uid() as usual.
```

Wired into **one** generator first — Practice Engine (`AIChat.jsx:1249`,
highest-traffic, already has a retry path) — as the proof, not all five at
once. The other four get it in a follow-up once this one is verified live
against the real Supabase table. `src/lib/question-novelty.ts` holds the pure
hash/normalize logic, unit tested; the Supabase calls are the thin glue
layer, same split as `sync-reconcile.ts` / `data-sync.ts`.

Graceful degradation: table not yet applied (same `PGRST205` pattern as
Phase 2c) → dedup check no-ops, generator behaves exactly as it does today.
Never blocks question generation on a Supabase round-trip failing.

## 3b — canonical exam specs + Real vs Practice modes

### `src/lib/exam-specs.ts`
Promotes `AIChat.jsx`'s existing `EXAM_MOCK_SPECS` (9-entry map, count only)
into a real module alongside `scales.ts`, adding a duration field per exam
instead of the current blanket "1.5 min/question" heuristic:

```ts
export const EXAM_SPECS: Record<string, { questionCount: number; durationMin: number; note: string }> = {
  nmt:    { questionCount: 20, durationMin: 40, note: "…" },
  sat:    { questionCount: 22, durationMin: 35, note: "…" },
  // … ports the existing 9 entries, adds durationMin to each
};
export function specFor(taxonomy: string, fallbackTopics: number) { /* existing clamp(topics*2,12,24) fallback, unchanged */ }
```

Durations are still "official-ish mock shapes", not licensed real-paper
timings (per Decision Log #37 — no paid licensing on launch). Framed as such
in the UI copy, not claimed as the actual NMT/SAT clock.

### Real vs Practice, made explicit
Today `ExamSimEngine` (Real-equivalent) and `PracticeEngine` already differ
correctly on most axes (no-pause vs pausable, full-reveal-at-end vs
per-question, feeds predictor unconditionally vs not) — the actual gap is
just that Real's timer is the ad-hoc 1.5×count heuristic instead of
`EXAM_SPECS`, and there's no user-facing signal that Real mode uses the
*official* shape while Practice is student-configured. Fix: `ExamSimEngine`
reads `specFor()` instead of computing its own timer; add a one-line badge
("Official NMT format — 20Q / 40 min") sourced from the same spec so the
distinction is visible, not just internal.

## 3c — session recap rebuild

Current `SessionRecap.jsx` is a *study-session* recap (coverage + readiness
delta + XP), not the *exam-attempt* recap the spec wants (score in exam
scale + delta vs last attempt + sparkline + top-3 mistakes + AI comment +
"Drill weak topics" CTA). These are different moments — finishing a study
session vs finishing an exam sim/practice round — and conflating them would
regress the working study recap.

Plan: new `src/features/study/ExamRecap.jsx`, sharing only the AI-comment
prompt pattern with the existing file. Needs:
- **Score history** — doesn't exist yet. New localStorage key
  `exam_attempts_v1` (added to `PERSONAL_DATA_KEYS` per the sync note above):
  `{examId, mode: "real"|"practice", scorePct, scaledScore, at}[]`, capped at
  last 20 like `brain-store.jsx`'s topic history pattern. Sparkline reads the
  last 10 for the current exam.
- **Top-3 mistakes** — reads `mistakes_v1` filtered to this session's
  `examId`, sorted by recency, needs the `logMistake` payload bug fixed first
  (currently drops `options`/`correctIndex`/`explanation` — see novelty
  engine investigation, item 1) or the journal entries are unusable for a
  "here's what you got wrong" card.
- **"Drill weak topics" CTA** — routes into `PracticeEngine` pre-filtered to
  the topics scored worst this attempt, reusing the topic-picker plumbing
  Phase 2's #5 fix already built.

This is the largest slice in 3a–3c. Does last, after the data it depends on
(fixed mistake payloads, attempt history) exists from earlier slices.

## 3d — 5-step onboarding (plan only this round; build follows 3a–3c)

The Explore pass found this is not a trim — it's a fork. The current
6-step wizard is shared between onboarding and "Add Exam" (`Exams.jsx`), and
multi-subject support (`subjects[]`, `durationBySubject`) is load-bearing
for both.

**Decision (Hlib): separate component.** A new, lightweight, single-exam
5-step wizard for onboarding only; `exam-wizard.jsx` stays untouched for
"Add Exam". More total code than threading an onboarding mode through the
existing wizard, but zero shared-bug-surface risk — a future change to the
multi-subject "Add Exam" flow can never regress onboarding by accident, and
vice versa. Logged as Decision Log #40.

New file `src/features/onboarding/QuickOnboarding.tsx` (real TS, not another
legacy `.jsx` — this is new code with no behavior-freeze constraint), five
steps: exam type → date → target score (per `scales.ts`) → hours/day →
email/signup, then straight into a real-time-generated plan preview.

Real behavior changes to account for, not just UI:
- **"hours/day" is a unit change**, not just a step split. `profile.weeklyHours`
  is read directly by `schedule-store.jsx`'s session-count math and by
  `AIPlan.jsx`. `QuickOnboarding` collects hours/day and multiplies by 7 at
  commit time — `weeklyHours` stays the stored unit everywhere downstream,
  so nothing outside the new component needs to change.
- **Email/signup as a wizard step, not a pre-condition.** Today auth happens
  on Landing, before onboarding ever starts (`App.tsx:135`, `goAfterAuth`).
  The 5-step spec wants the exam/date/target/hours steps to work for an
  anonymous visitor and only wall on email at the end — closer to the
  existing "Try demo" anonymous-Supabase-session path than to a hard
  pre-auth gate. `QuickOnboarding` starts unauthenticated, calls
  `startDemo()` under the hood if the visitor arrived without a session, and
  the final step upgrades that anonymous session to a real account
  (Supabase `linkIdentity`-style upgrade, not a fresh signup that would
  orphan the just-built plan).
- **Plan preview under 5 seconds.** `AIPlan.jsx`'s current ~7s is a
  hardcoded animation timer, not real generation latency — the plan itself
  is computed locally from the scheduler, not from a live Claude call. Reuse
  that: `QuickOnboarding`'s preview step calls the same local scheduler
  synchronously and only *displays* a brief (under 2s) progress animation
  rather than the current 6.4s fixed sequence, since there's no real
  network wait to mask.

Not building this in the same PR as 3a–3c — those land first since 3c's
attempt-history and mistake-payload fixes are lower-risk, then 3d gets its
own branch/plan-doc-refresh/PR given its size and the auth-flow change.

## Reversibility

3a: the hash-dedup table is additive and optional — exactly Phase 2c's
degrade-to-`PGRST205` pattern, so shipping the client code before Hlib runs
the SQL is safe. The sync bug fix and delete-propagation are `git revert`-safe,
same as every other `data-sync.ts` change.

3b: `EXAM_SPECS` replaces a heuristic with data; if a duration value is wrong
for some exam, it's a one-line constant edit, not a migration.

3c: net-new file, doesn't touch `SessionRecap.jsx`, zero risk to the existing
study-recap flow.

## What could break silently

| # | Risk | Detector |
|---|---|---|
| 1 | Hash-dedup retry burns the 45s Practice-engine timeout on repeated collisions in a thin question pool (e.g. a rare exam type with few possible questions) | Cap retries at 1, same as spec; if it still collides, serve the "duplicate" anyway rather than fail the round — a repeated question beats a broken one |
| 2 | Sync bug fix changes `data-sync.ts`'s internal contract (ref vs closure capture) — could reintroduce the original push-to-wrong-user bug in a new shape if the ref update isn't ordered before the next debounced push fires | Unit test: start→stop→start-as-different-user→write→assert push targets new `userId`, not old |
| 3 | Delete-tombstone (`value: null`) could be misread by `reconcile()` as "no data, do nothing" instead of "delete" if the pull branch doesn't special-case null | Unit test in `sync-reconcile.test.ts`: remote row with `value: null` newer than shadow → pull action removes the local key, not writes literal `null` |
| 4 | `EXAM_SPECS` duration swap changes Real-mode timers for exams currently using the 1.5×count heuristic — a student mid-exam-sim across a deploy could see the clock jump | Low-stakes (in-progress exam sim state isn't persisted across reload today anyway — confirmed no-op risk, not silently breaking a real session) |
| 5 | `exam_attempts_v1` capped-at-20 history silently drops old attempts once a student has done 21+ — sparkline still shows "last 10" so this is invisible until someone specifically wants attempt #1 | Documented cap, same pattern as `brain-store.jsx` topic history; not a bug, but worth a comment so a future "show all-time history" feature doesn't assume unlimited retention |

## Test gate

- `npm run lint && npm run typecheck && npx vitest run` all green
- New: full unit coverage on `src/lib/question-novelty.ts` (hash/normalize,
  pure) and the sync-bug-fix regression test above
- Updated: `sync-reconcile.test.ts` covers the null-tombstone pull case
- Manual, live in browser: seed two "duplicate" Practice-engine questions,
  confirm second one retries; verify `ExamSimEngine` badge shows the right
  spec per exam type

## Decision Log additions (continuing mega-prompt §8's numbering)

| # | Decision | Answer |
|---|---|---|
| 38 | Sync implementation | Keep the Phase 2c localStorage-patch approach; do not introduce Zustand — no functional gap, would be a pure architecture migration for spec-matching's sake |
| 39 | Novelty engine embeddings | Hash-based exact/near-dup dedup only for Phase 3. Anthropic has no embeddings endpoint (spec error); adding OpenAI as a second AI vendor for one feature needs Hlib's call, not an autonomous pick |
| 40 | Onboarding rewrite | Separate component (`QuickOnboarding.tsx`), not a mode inside `exam-wizard.jsx` — zero shared-bug-surface risk between onboarding and "Add Exam" |
