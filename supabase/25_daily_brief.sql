-- Examik — daily brief email trigger (run TWENTY-FIFTH).
--
-- api/notifications-cron.js now writes trigger_key 'daily_brief' (a broader
-- morning summary — today's plan/rest day, streak, exam countdown — sent
-- unconditionally once a day, distinct from 'daily_reminder' which only
-- fires when a session is actually pending). The existing check constraint
-- from 18_subscriptions.sql doesn't list it, so that insert would fail and
-- markSent()'s dedupe record would silently never be written — same failure
-- mode 18_subscriptions.sql's comment already describes for 'trial_end'.

do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.notification_log'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%trigger_key%';
  if cname is not null then
    execute format('alter table public.notification_log drop constraint %I', cname);
  end if;
end $$;

alter table public.notification_log
  add constraint notification_log_trigger_key_check
  check (trigger_key in (
    'daily_brief',
    'daily_reminder',
    'exam_countdown',
    'weekly_digest',
    'streak_danger',
    'mistake_review',
    'trial_end'
  ));

-- ─── verification ─────────────────────────────────────────────────────────────
--   select pg_get_constraintdef(oid)
--   from pg_constraint
--   where conrelid = 'public.notification_log'::regclass
--     and contype = 'c'
--     and pg_get_constraintdef(oid) like '%trigger_key%';
--   -- expect daily_brief in the list
