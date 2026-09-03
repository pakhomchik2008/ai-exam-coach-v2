-- Examik — subscription renewal reminder email trigger (run TWENTY-NINTH).
--
-- api/notifications-cron.js now writes trigger_key 'subscription_renewal' —
-- fires 3 days before a paying subscriber's current_period_end, source-
-- agnostic (Stripe web or RevenueCat native IAP both write the same
-- subscriptions.status/current_period_end columns, see api/_stripe.js and
-- api/revenuecat-webhook.js). Same failure mode 18_subscriptions.sql's
-- comment already describes for 'trial_end' if this isn't added.

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
    'trial_end',
    'subscription_renewal'
  ));

-- ─── verification ─────────────────────────────────────────────────────────────
--   select pg_get_constraintdef(oid)
--   from pg_constraint
--   where conrelid = 'public.notification_log'::regclass
--     and contype = 'c'
--     and pg_get_constraintdef(oid) like '%trigger_key%';
--   -- expect subscription_renewal in the list
