-- Examik — fail-closed the curriculum anonymous-write RLS check (run
-- TWENTY-EIGHTH).
--
-- strix pentest finding vuln-0010 (LOW, CWE-287). The INSERT policy added in
-- 08_curriculum_trust.sql reads:
--   coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
-- If the JWT is missing the `is_anonymous` claim entirely (valid for some
-- GoTrue versions or a custom-minted token against the same project
-- secret), coalesce(NULL, false) = false, so the check evaluates to
-- `false = false` -> true and ADMITS the write — fail-open on exactly the
-- control this policy exists to provide. 10_audit_fixes.sql already
-- documented this exact failure mode and hardened the SECURITY DEFINER
-- trigger (curriculum_guard_contribution) to check auth.users.is_anonymous
-- directly instead of trusting the JWT claim, but left the RLS policy
-- itself unchanged — so RLS, the formal authorization boundary, still
-- fails open if the trigger is ever skipped, altered, or bypassed.
--
-- Fix: replace the coalesce-to-false pattern with `IS DISTINCT FROM 'true'`,
-- which treats a missing claim as NOT admitted (NULL IS DISTINCT FROM
-- 'true' is true only in the sense of "not equal", but combined with the
-- explicit auth.uid() IS NOT NULL check below it does not create a new
-- fail-open path) — actually admits only when the claim is present and
-- literally 'false', matching the trigger's own auth.users-backed check.

drop policy if exists "curriculum community insert" on public.curriculum;
create policy "curriculum community insert"
  on public.curriculum for insert
  to authenticated
  with check (
    -- Explicitly require the claim to read 'false' — a missing claim no
    -- longer coalesces into an admit. auth.uid() IS NOT NULL keeps the
    -- policy's original intent (only a real signed-in principal, not a
    -- callerless service-role bypass, is affected by this check at all).
    auth.uid() is not null
    and (auth.jwt() ->> 'is_anonymous') = 'false'
    and source in ('ai', 'community')
  );

-- ─── verification ─────────────────────────────────────────────────────────────
--   select pg_get_expr(polqual, polrelid) as using_expr,
--          pg_get_expr(polwithcheck, polrelid) as with_check_expr
--   from pg_policy
--   where polname = 'curriculum community insert';
--   -- expect with_check_expr to contain "= 'false'::text", not "coalesce(...)"
--
-- Manual check (needs a real anonymous session + a JWT edited to drop the
-- is_anonymous claim, or just confirm behaviorally):
--   1. sign in anonymously via startDemo(), attempt an insert into
--      public.curriculum with source='community' -> expect denial (trigger
--      already blocks this; RLS now also blocks it independently)
--   2. sign in as a real (non-anonymous) user, attempt the same insert with
--      valid data -> expect success (regression check — this migration
--      must not break the legitimate community-contribution path)
