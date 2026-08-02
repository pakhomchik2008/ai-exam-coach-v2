-- AI Exam Coach — per-user AI quota (run SEVENTH, after 01-06).
--
-- Closes the S1 finding in ARCHITECTURE_AUDIT.md: `api/complete.js` was an
-- unauthenticated open proxy onto a paid Anthropic key. The serverless function
-- now (a) requires a Supabase JWT and (b) spends quota from this table before
-- it forwards anything upstream.
--
-- Shape follows the same philosophy as 04_qualifications.sql: the *policy*
-- (how many requests/tokens a user gets per day) lives in a table, so tuning it
-- is one UPDATE in the SQL editor — no code change, no redeploy.
--
-- Both functions are SECURITY DEFINER and are callable ONLY with the service
-- role key (execute is revoked from anon/authenticated below). The client never
-- touches them; it just gets a 429 from the serverless function.

-- ─── limits ───────────────────────────────────────────────────────────────────
-- key = '<endpoint>:<tier>' where tier is 'anon' (Supabase anonymous sign-in,
-- i.e. the "Try the demo" button) or 'user' (a real signed-up account).

create table if not exists public.ai_limits (
  key                 text primary key,
  daily_requests      int    not null,
  daily_output_tokens bigint not null,
  updated_at          timestamptz not null default now()
);

insert into public.ai_limits (key, daily_requests, daily_output_tokens) values
  ('complete:user',   400, 1500000),
  ('complete:anon',    40,  120000),
  ('fetch-url:user',  100,       0),
  ('fetch-url:anon',   15,       0)
on conflict (key) do nothing;

-- fetch-url spends no Anthropic tokens, so its token budget is unused. 0 would
-- read as "instantly exhausted", so the consume function skips the token check
-- when the limit is 0. Documented here because it is the one non-obvious rule.

alter table public.ai_limits enable row level security;
drop policy if exists "ai_limits public read" on public.ai_limits;
create policy "ai_limits public read"
  on public.ai_limits for select using (true);

-- ─── usage ────────────────────────────────────────────────────────────────────
-- One row per (user, UTC day, endpoint). Days are UTC, not local: the serverless
-- function has no reliable notion of the user's timezone and a per-user local
-- midnight would let a client pick its own reset time by lying about it.

create table if not exists public.ai_usage (
  user_id       uuid   not null references auth.users(id) on delete cascade,
  day           date   not null,
  endpoint      text   not null,
  requests      int    not null default 0,
  input_tokens  bigint not null default 0,
  output_tokens bigint not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, day, endpoint)
);

create index if not exists ai_usage_day_idx on public.ai_usage (day);

alter table public.ai_usage enable row level security;
-- A user may read their own consumption (so the UI can show "12 of 400 left").
-- Nobody writes through the public API — only the service role, via the
-- functions below, which bypass RLS.
drop policy if exists "ai_usage own read" on public.ai_usage;
create policy "ai_usage own read"
  on public.ai_usage for select using (auth.uid() = user_id);

-- ─── consume ──────────────────────────────────────────────────────────────────
-- Atomic check-and-increment. Returns jsonb so the serverless function can put
-- real numbers in the 429 body. Deliberately reads BEFORE it increments: a
-- caller who is already over budget must not keep pushing the counter up.

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

  select * into v_row from public.ai_usage
   where user_id = p_user and day = v_day and endpoint = p_endpoint
   for update;

  if found and (
       v_row.requests >= v_lim.daily_requests
       or (v_lim.daily_output_tokens > 0 and v_row.output_tokens >= v_lim.daily_output_tokens)
     ) then
    return jsonb_build_object(
      'allowed', false, 'reason', 'quota_exceeded',
      'requests', v_row.requests, 'request_limit', v_lim.daily_requests,
      'output_tokens', v_row.output_tokens, 'token_limit', v_lim.daily_output_tokens);
  end if;

  insert into public.ai_usage (user_id, day, endpoint, requests)
       values (p_user, v_day, p_endpoint, 1)
  on conflict (user_id, day, endpoint)
    do update set requests = public.ai_usage.requests + 1, updated_at = now()
  returning * into v_row;

  return jsonb_build_object(
    'allowed', true,
    'requests', v_row.requests, 'request_limit', v_lim.daily_requests,
    'output_tokens', v_row.output_tokens, 'token_limit', v_lim.daily_output_tokens);
end;
$$;

-- ─── record ───────────────────────────────────────────────────────────────────
-- Called after the upstream reply lands, with Anthropic's own usage numbers.
-- Separate from consume() because token counts do not exist until the model has
-- answered; the request slot is spent up-front so an abusive caller cannot fire
-- 10k concurrent requests before any of them report back.

create or replace function public.ai_usage_record(
  p_user     uuid,
  p_endpoint text,
  p_input    bigint,
  p_output   bigint
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
     and day      = (now() at time zone 'utc')::date
     and endpoint = p_endpoint;
$$;

-- Service role only. Without these revokes any logged-in browser could call
-- ai_quota_consume() through PostgREST and burn its own quota to nothing, or
-- (worse) call ai_usage_record() to zero out what it has already spent.
-- The grants are explicit rather than relying on Supabase's default privileges,
-- so the endpoints keep working even if those defaults are ever tightened.
revoke all on function public.ai_quota_consume(uuid, text, boolean)       from public, anon, authenticated;
revoke all on function public.ai_usage_record(uuid, text, bigint, bigint) from public, anon, authenticated;
grant execute on function public.ai_quota_consume(uuid, text, boolean)       to service_role;
grant execute on function public.ai_usage_record(uuid, text, bigint, bigint) to service_role;

-- PostgREST caches the schema; without this the first /rest/v1/rpc/... call can
-- 404 until it reloads on its own.
notify pgrst, 'reload schema';
