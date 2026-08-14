-- AI Exam Coach — Stripe subscriptions (run EIGHTEENTH).
--
-- Phase 3.7i. Checkout + webhook need a row they can look up by
-- Stripe customer id; the cron needs trial_end for the 6th email.
-- Putting that in user_profile_v1 would race every client saveProfile.
-- Service role writes (webhook / checkout). Signed-in users may SELECT
-- their own row so the app can refresh Pro without a second API.

create table if not exists public.subscriptions (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id     text unique,
  stripe_subscription_id text,
  status                 text not null default 'none',
  trial_end              timestamptz,
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);

create index if not exists subscriptions_customer_idx
  on public.subscriptions (stripe_customer_id);

alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_select on public.subscriptions;
create policy subscriptions_select on public.subscriptions for select
  using (user_id = auth.uid());

-- Billing notices are not study reminders. The cron writes trigger_key
-- 'trial_end'; the original check constraint would reject that insert.
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
    'daily_reminder',
    'exam_countdown',
    'weekly_digest',
    'streak_danger',
    'mistake_review',
    'trial_end'
  ));

-- ─── verification ─────────────────────────────────────────────────────────────
--   select to_regclass('public.subscriptions');
--   -- expect public.subscriptions
--
--   select pg_get_constraintdef(oid)
--   from pg_constraint
--   where conrelid = 'public.notification_log'::regclass
--     and contype = 'c'
--     and pg_get_constraintdef(oid) like '%trigger_key%';
--   -- expect trial_end in the list
