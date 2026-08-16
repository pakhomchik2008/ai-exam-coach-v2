-- Examik — notification send-dedup ledger (run FIFTEENTH).
--
-- Phase 3 §3.5. Deliberately the ONLY new table this feature needs — the
-- five per-user toggles (daily reminder, exam countdown, weekly digest,
-- streak danger, mistake review) and the email address live in the EXISTING
-- `user_data` row keyed 'user_profile_v1' (see profile-store.jsx), synced
-- there already by every signed-in user via data-sync.ts. A second prefs
-- table would just be the same booleans in two places, one client-writable
-- and one not, guaranteed to drift.
--
-- What this table answers instead — "did we already send THIS trigger,
-- to THIS user, for THIS occurrence?" — is something the client-synced blob
-- can't hold: the cron is the only writer, and a user_data row a browser
-- patches on every localStorage write would race it.
--
-- One row per (user, trigger, occurrence). `dedupe_key` is trigger-shaped:
--   daily_reminder / streak_danger / mistake_review  -> "2026-08-12" (a date)
--   exam_countdown                                    -> "<examId>:T7"
--   weekly_digest                                      -> "2026-W33" (ISO week)
-- The unique constraint is what makes the cron idempotent — running it
-- twice in the same window (a retried Lambda, a manual re-trigger) sends
-- nothing twice.

create table if not exists public.notification_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  trigger_key text not null check (trigger_key in (
    'daily_reminder', 'exam_countdown', 'weekly_digest', 'streak_danger', 'mistake_review'
  )),
  dedupe_key  text not null,
  sent_at     timestamptz not null default now(),
  unique (user_id, trigger_key, dedupe_key)
);

create index if not exists notification_log_user_idx
  on public.notification_log (user_id, sent_at desc);

-- RLS on, no policies: only the cron (service-role, which bypasses RLS
-- entirely) ever reads or writes this table. A signed-in user has no
-- legitimate reason to see their own send history through the client, and
-- giving them read access would leak exactly when the cron last ran.
alter table public.notification_log enable row level security;

-- ─── verification ─────────────────────────────────────────────────────────────
-- Run via the Supabase SQL Editor as an admin (service role), NOT as a
-- regular signed-in user — RLS blocks everyone else by design.
--
--   insert into public.notification_log (user_id, trigger_key, dedupe_key)
--   values ('00000000-0000-0000-0000-000000000000', 'daily_reminder', '2026-08-12');
--
--   -- should fail with a unique-violation (dedup working)
--   insert into public.notification_log (user_id, trigger_key, dedupe_key)
--   values ('00000000-0000-0000-0000-000000000000', 'daily_reminder', '2026-08-12');
--
--   delete from public.notification_log where dedupe_key = '2026-08-12';
