-- AI Exam Coach — actually hide curriculum.created_by (run ELEVENTH, after 10).
--
-- 10_audit_fixes.sql tried:
--     revoke select (created_by) on public.curriculum from anon, authenticated;
-- and it silently did nothing. Verified against production: a plain
--     GET /rest/v1/curriculum?select=created_by
-- with the publishable key still returns 200.
--
-- Postgres reason: a TABLE-level SELECT grant is equivalent to SELECT on every
-- column, and a column-level REVOKE cannot subtract from it. The only way to
-- restrict columns is to drop the table-level grant and re-grant per column.
--
-- Consequence, and why the client changes in commit eab59c2 had to land first:
-- `select=*` now FAILS for anon/authenticated. Both readers already send an
-- explicit column list (curriculum-store.jsx refreshRemoteCurriculum and
-- scripts/pull-catalog.mjs). Anything else that reads this table with "*" must
-- be updated before running this.

begin;

revoke select on public.curriculum from anon, authenticated;

grant select (
  id,
  country_id,
  education_system_id,
  qualification_id,
  board,
  spec_version,
  subject,
  aliases,
  topics,
  source,
  moderation_status,
  created_at,
  updated_at
) on public.curriculum to anon, authenticated;

commit;

notify pgrst, 'reload schema';

-- ─── verify ──────────────────────────────────────────────────────────────────
-- Expect: first denied, second returns rows.
--   set role anon;
--   select created_by from public.curriculum limit 1;   -- permission denied
--   select subject    from public.curriculum limit 1;   -- ok
--   reset role;
--
-- Or from a shell, against the deployed project:
--   curl -s -o /dev/null -w '%{http_code}\n' \
--     "$SUPABASE_URL/rest/v1/curriculum?select=created_by&limit=1" \
--     -H "apikey: $PUBLISHABLE_KEY"        # expect 403, not 200
