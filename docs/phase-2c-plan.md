# Phase 2c Plan — Supabase multi-device sync (audit #12)

## What this is, and deliberately is not

Bug #12: "everything is in `localStorage`; syncing between browsers/phone does
not work." The fix here is **sync**, not a data-model redesign. Every store
(`exams-store`, `schedule-store`, `mistakes-store`, `brain-store`, ...) keeps
its exact current shape, keys, and read/write functions untouched. This is a
generic key-value mirror underneath the existing 14 localStorage keys, not a
rewrite into relational tables.

That is a deliberate scope cut, not a shortcut. The mega-prompt's Phase 2.3
schema (`exams`, `study_sessions`, `mistakes` as real relational tables) is
attractive but conflates two different, separately-risky projects:

1. **Sync** — make existing data visible on a second device.
2. **Normalize** — redesign the data model into proper tables.

Doing (2) now would mean migrating `brain_mastery_v1`'s `examId::topicIdx`
composite keys into relational form while the app still has audit finding #14
open (a topic-list reorder silently corrupts that exact key scheme, with no
way to detect or reverse it). Normalizing on top of a known-corruptible key
scheme is how you ship a migration that faithfully preserves already-wrong
data forever. #14 needs its own detection-and-fix pass first; this phase does
not touch it.

## Design

### Schema — one generic table, not fourteen

```sql
create table public.user_data (
  user_id    uuid not null references auth.users(id) on delete cascade,
  key        text not null,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
```

One row per `(user_id, localStorage key)`. RLS scopes every operation to
`auth.uid()`. This works identically for a real account and for a demo
(anonymous) session — Supabase anonymous sign-in still issues a real
`auth.users` row and a real `auth.uid()`, which is exactly what
`storage_limits`'s `is_anonymous` check already relies on.

`updated_at` is set by the database via `now()` on every upsert, never by the
client. Reconciliation compares two server timestamps, never a client clock —
this is what makes last-write-wins correct across devices with skewed clocks,
which two different phones/laptops absolutely have.

### Client sync layer (`src/lib/data-sync.ts`)

Three pieces, split so the risky part (DOM/network glue) is as thin as
possible around the safe part (pure decision logic):

**1. Pure reconciliation logic — fully unit tested.**
Given a shadow timestamp (the server `updated_at` this device last saw for a
key) and the row currently on the server, decide: adopt remote, push local, or
nothing to do. No DOM, no network — a value-in, value-out function.

**2. The shadow.** One extra localStorage key, `sync_shadow_v1`, mapping each
of the 14 personal-data keys to the server timestamp this device last
confirmed for it. This is what makes "which side is newer" answerable at all —
without it there is no timestamp on a plain localStorage write to compare.

**3. The glue.**
- Patches `localStorage.setItem`/`removeItem` **once**, at the one point every
  store's writes already pass through, rather than editing eight store files.
  A write to a tracked key schedules a debounced (800 ms) push.
- Subscribes to Postgres changes on `user_data` filtered to this user, so a
  write from another device lands here within seconds, without a page reload.
- A re-entrancy guard stops the sync layer's own writes (adopting a pulled
  value into localStorage) from being mistaken for a fresh user edit and
  pushed straight back up.

### First-time migration

The very first time sync runs on a browser profile (no `sync_shadow_v1` at
all — the literal signal "this device has never synced"), every local key
that has data is pushed up as-is, becoming that account's baseline on the
server. Every reconcile after that point uses real timestamp comparison. This
is the one-time "Syncing your data..." step the mega-prompt describes,
without needing a separate script — it is the same reconcile function's first
run.

### What is explicitly out of scope here

- Realtime toast/UI ("synced!") — silent by design; the existing `storage`
  event dispatch already re-renders whatever reads that key.
- Conflict UI for a genuine simultaneous edit on two devices — last-write-wins
  is the documented behavior for this phase, matching the mega-prompt's own
  spec ("reconciles by `updated_at` last-write-wins"). A merge UI is real
  product work, not a bug fix.
- Account deletion / data export — Phase 6.

## Risks and detectors

| # | Risk | Detector |
|---|---|---|
| 1 | Infinite push loop: pulling a remote value writes to localStorage, which the patched `setItem` sees and pushes right back up | Re-entrancy guard (`_writingFromSync` flag) around every sync-originated write, unit tested |
| 2 | Two tabs on the same device both patch `localStorage.setItem` and double-push | The patch is idempotent and guarded by a module-level `_patched` flag — `initDataSync()` is safe to call more than once |
| 3 | A push races a pull for the same key | Both paths funnel through the same debounced-write queue keyed by localStorage key, so the last one scheduled wins the actual network call |
| 4 | Demo (anonymous) session data syncs, then the browser closes and reopens as a *different* new anonymous session, "losing" it | Expected and correct — an anonymous session was never a durable account. Not a regression; the app has never persisted demo data past that boundary |
| 5 | Realtime subscription silently stops (network blip, tab backgrounded) and device never re-syncs | Reconcile also runs on `visibilitychange`/focus, not only once at boot, so a dropped realtime connection self-heals the next time the tab is looked at |

## Test gate

- Pure reconcile logic: full unit coverage, including the first-time-migration
  path, tie-breaking, and missing-row-on-either-side cases.
- Live, two real browser tabs sharing one demo session (Supabase persists the
  anonymous session in localStorage, so two tabs on the same origin share one
  `auth.uid()` automatically): a change in tab A is observed in tab B without
  a manual reload.
- `npm run lint && npm run typecheck && npm test && npm run build` green.

## Not applied without Hlib

`supabase/13_user_data_sync.sql` is written and reviewable but not run — same
process as `12_storage_limits.sql`: he applies DDL, I don't touch the
production database.
