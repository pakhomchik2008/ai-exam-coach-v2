-- Examik — security audit fixes (run TENTH, after 01-09).
--
-- Fixes found auditing the deployed app at https://ai-exam-coach-v2.vercel.app.
-- Every item here is a defect in 07_ai_usage.sql / 08_curriculum_trust.sql, i.e.
-- introduced by the two commits that were supposed to close S1 and S2.
--
--   1. ai_quota_consume() read-then-increment: the daily cap did not hold under
--      concurrency, so an attacker's parallelism set the real limit, not the
--      configured one.
--   2. ai_usage_record() derived the day itself, so a call consumed at 23:59:59
--      UTC and recorded at 00:00:01 UTC updated ZERO rows, silently.
--   3. curriculum.created_by (a user id) was readable by anyone holding the
--      publishable key, which 08 explicitly set out to prevent for the view but
--      not for the base table.
--   4. The anonymous-write block was one fail-open expression with no backstop
--      in the SECURITY DEFINER trigger that does the real work.

begin;

-- ─── 1. quota: increment first, then judge ───────────────────────────────────
-- `SELECT ... FOR UPDATE` that matches zero rows locks NOTHING. On the first
-- request of each UTC day the row does not exist, so `found` was false, the
-- limit check was skipped entirely, and every concurrent request in that window
-- was admitted. The INSERT ... ON CONFLICT DO UPDATE below takes a real row
-- lock, so concurrent callers serialise on it and each observes a distinct
-- incremented counter — that is the only value safe to judge.
--
-- A denied request still increments. Over-counting is the correct direction to
-- fail: it costs an abuser one wasted slot, where under-counting costs the
-- project an unbounded Anthropic bill.

create or replace function public.ai_quota_consume(
  p_user      uuid,
  p_endpoint  text,
  p_anonymous boolean
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := p_endpoint || (case when p_anonymous then ':anon' else ':user' end);
  v_lim public.ai_limits%rowtype;
  v_day date := (now() at time zone 'utc')::date;
  v_row public.ai_usage%rowtype;
begin
  select * into v_lim from public.ai_limits where key = v_key;
  if not found then
    -- Fail closed: an endpoint with no configured limit is not a free-for-all.
    return jsonb_build_object('allowed', false, 'reason', 'no_limit_configured', 'key', v_key);
  end if;

  insert into public.ai_usage (user_id, day, endpoint, requests)
       values (p_user, v_day, p_endpoint, 1)
  on conflict (user_id, day, endpoint)
    do update set requests = public.ai_usage.requests + 1, updated_at = now()
  returning * into v_row;

  if v_row.requests > v_lim.daily_requests
     or (v_lim.daily_output_tokens > 0 and v_row.output_tokens >= v_lim.daily_output_tokens) then
    return jsonb_build_object(
      'allowed', false, 'reason', 'quota_exceeded',
      'requests', v_row.requests, 'request_limit', v_lim.daily_requests,
      'output_tokens', v_row.output_tokens, 'token_limit', v_lim.daily_output_tokens);
  end if;

  return jsonb_build_object(
    'allowed', true, 'day', v_day,
    'requests', v_row.requests, 'request_limit', v_lim.daily_requests,
    'output_tokens', v_row.output_tokens, 'token_limit', v_lim.daily_output_tokens);
end;
$$;

-- ─── 2. token recording: bill the day the slot was actually spent ────────────
-- The old signature re-derived "today" at record time. Across UTC midnight that
-- targeted a row that did not exist yet, the UPDATE matched nothing, and the
-- whole daily_output_tokens budget quietly never accumulated. p_day is now
-- passed in from the consume call. The old 4-arg version is dropped so a stale
-- deployment cannot keep calling it and silently lose tokens.

drop function if exists public.ai_usage_record(uuid, text, bigint, bigint);

create or replace function public.ai_usage_record(
  p_user     uuid,
  p_endpoint text,
  p_input    bigint,
  p_output   bigint,
  p_day      date default null
) returns void
language sql
security definer
set search_path = public
as $$
  update public.ai_usage
     set input_tokens  = input_tokens  + greatest(coalesce(p_input, 0), 0),
         output_tokens = output_tokens + greatest(coalesce(p_output, 0), 0),
         updated_at    = now()
   where user_id  = p_user
     and endpoint = p_endpoint
     and day      = coalesce(p_day, (now() at time zone 'utc')::date);
$$;

revoke all on function public.ai_quota_consume(uuid, text, boolean)             from public, anon, authenticated;
revoke all on function public.ai_usage_record(uuid, text, bigint, bigint, date) from public, anon, authenticated;
grant execute on function public.ai_quota_consume(uuid, text, boolean)             to service_role;
grant execute on function public.ai_usage_record(uuid, text, bigint, bigint, date) to service_role;

-- ─── 3. stop publishing contributor user ids ─────────────────────────────────
-- RLS is row-level, so the `using (true)` public read policy exposed every
-- column including created_by. PostgREST honours column privileges, so a
-- column-level revoke is the fix. curriculum-store.jsx must stop sending
-- select("*") for this to work — it now sends an explicit column list.

revoke select (created_by) on public.curriculum from anon, authenticated;

-- ─── 4. anonymous writes: check the source of truth, not a claim ─────────────
-- The RLS predicate reads `auth.jwt() ->> 'is_anonymous'` and coalesces a
-- missing claim to false, which then satisfies `= false` and ADMITS the write —
-- fail-open on exactly the control 08 exists to provide. The trigger below runs
-- SECURITY DEFINER and can read auth.users directly, so it no longer has to
-- trust the token's contents. The RLS predicate stays as a second line.

create or replace function public.curriculum_guard_contribution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_subj   text := lower(trim(coalesce(new.subject, '')));
  v_topics int;
  v_today  int;
  v_topic  jsonb;
begin
  -- The SQL editor and the service role carry no JWT, so auth.uid() is null.
  -- That is the ADMIN path — seeding and moderation — and is left unconstrained
  -- on purpose. Every insert arriving through the public REST API has a uid.
  if v_uid is null then
    return new;
  end if;

  -- Demo accounts may read the catalog and use AI; they may not write to shared
  -- reference data. Checked against auth.users rather than the JWT claim.
  if exists (select 1 from auth.users u where u.id = v_uid and u.is_anonymous) then
    raise exception 'curriculum: demo accounts cannot contribute';
  end if;

  -- ── the caller does not get to pick its own trust level ────────────────────
  new.source            := 'community';
  new.moderation_status := 'pending';
  new.created_by        := v_uid;
  -- An alias is a claim on a DIFFERENT subject's name: getCurriculum() resolves
  -- by subject OR alias, so aliases are the cheapest way to hijack a lookup.
  new.aliases           := '[]'::jsonb;

  -- ── shape and size ─────────────────────────────────────────────────────────
  if v_subj = '' then
    raise exception 'curriculum: subject is required';
  end if;
  if length(new.subject) > 120 then
    raise exception 'curriculum: subject is too long (max 120 chars)';
  end if;
  if jsonb_typeof(new.topics) <> 'array' then
    raise exception 'curriculum: topics must be a JSON array';
  end if;

  v_topics := jsonb_array_length(new.topics);
  if v_topics = 0 then
    raise exception 'curriculum: topics is empty';
  end if;
  if v_topics > 200 then
    raise exception 'curriculum: too many topics (% > 200)', v_topics;
  end if;
  if pg_column_size(new.topics) > 262144 then
    raise exception 'curriculum: topics payload too large (max 256 KB)';
  end if;

  for v_topic in select * from jsonb_array_elements(new.topics) loop
    if jsonb_typeof(v_topic) <> 'object' or coalesce(v_topic ->> 'name', '') = '' then
      raise exception 'curriculum: every topic needs a name';
    end if;
    if length(v_topic ->> 'name') > 200 then
      raise exception 'curriculum: topic name too long (max 200 chars)';
    end if;
  end loop;

  -- ── never shadow curated content ───────────────────────────────────────────
  -- Now also covers admin-APPROVED community rows: the client treats those as
  -- curated, so leaving them unshielded set a trap for the first moderator.
  if exists (
    select 1
      from public.curriculum c
     where c.qualification_id = new.qualification_id
       and (c.source = 'official' or c.moderation_status = 'approved')
       and (
         lower(c.subject) = v_subj
         or exists (
           select 1
             from jsonb_array_elements_text(
                    case when jsonb_typeof(c.aliases) = 'array' then c.aliases else '[]'::jsonb end
                  ) a
            where lower(a) = v_subj
         )
       )
  ) then
    raise exception 'curriculum: % already has a curated syllabus for "%"',
      new.qualification_id, new.subject;
  end if;

  -- ── per-account rate limit ─────────────────────────────────────────────────
  select count(*) into v_today
    from public.curriculum
   where created_by = v_uid
     and created_at > now() - interval '24 hours';
  if v_today >= 20 then
    raise exception 'curriculum: daily contribution limit reached (20 per account)';
  end if;

  return new;
end;
$$;

commit;

notify pgrst, 'reload schema';

-- ─── verify ──────────────────────────────────────────────────────────────────
-- Quota now holds under concurrency (should return exactly one allowed=false
-- once the 40th anon slot is spent):
--   select public.ai_quota_consume('<uuid>', 'complete', true);
--
-- created_by must now be rejected for the public roles:
--   set role anon; select created_by from public.curriculum limit 1;  -- expect: permission denied
--   reset role;
