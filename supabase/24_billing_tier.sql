-- Examik — Phase 5 slice A: `tier` on subscriptions (run TWENTY-FOURTH).
--
-- api/complete.js currently hardcodes claude-haiku-4-5-20251001 for every
-- caller — no way to route Ultra subscribers to Sonnet. `subscriptions.status`
-- (none/trialing/active/past_due/canceled/...) says whether someone is paying,
-- not which product they bought, so it can't tell Pro from Ultra once a
-- second Stripe Price exists.
--
-- Additive, backward compatible: existing rows backfill to 'pro' if their
-- status already counts as Pro (see isProStatus in api/_stripe.js), else
-- 'free'. Nothing reads this column until Phase 5 slice A's app code ships
-- in the same PR, so running this early is harmless.

alter table public.subscriptions
  add column if not exists tier text not null default 'free';

alter table public.subscriptions
  drop constraint if exists subscriptions_tier_check;

alter table public.subscriptions
  add constraint subscriptions_tier_check
  check (tier in ('free', 'sprint', 'pro', 'ultra'));

-- Backfill: anyone currently counted as Pro by isProStatus() was buying the
-- only Price that has ever existed (STRIPE_PRICE_ID, Pro monthly $5.99), so
-- 'pro' is the only correct backfill value — there is no Ultra Price yet for
-- any of these rows to have paid for.
update public.subscriptions
set tier = 'pro'
where status in ('trialing', 'active', 'past_due')
  and tier = 'free';

-- ─── verification ─────────────────────────────────────────────────────────
-- Run after applying. Expect: column exists, constraint rejects garbage,
-- every currently-Pro row backfilled to 'pro', nothing silently at 'free'.
--
-- select column_name, data_type, column_default
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'tier';
--
-- select tier, status, count(*) from public.subscriptions group by tier, status order by tier, status;
--
-- -- should error with a check-constraint violation:
-- -- update public.subscriptions set tier = 'bogus' where false;
