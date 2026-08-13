-- Reset today's AI spend and raise the signed-in cap so Hlib can
-- actually finish testing Learn methods. Policy lives in ai_limits —
-- this is an UPDATE, not a function rewrite.
--
-- Run in the Supabase SQL editor. Client degrades until you do.

-- 1. Wipe UTC-today complete usage (the 429 you just hit).
delete from public.ai_usage
 where day = (now() at time zone 'utc')::date
   and endpoint = 'complete';

-- 2. Learn (theory / cards / Socratic / fade / Feynman) is token-heavy.
--    1.5M output was the real ceiling, not the 400-request cap.
update public.ai_limits
   set daily_requests = 800,
       daily_output_tokens = 8000000,
       updated_at = now()
 where key = 'complete:user';

-- verification
select key, daily_requests, daily_output_tokens, updated_at
  from public.ai_limits
 where key like 'complete:%';

select user_id, day, endpoint, requests, output_tokens
  from public.ai_usage
 where day = (now() at time zone 'utc')::date
   and endpoint = 'complete';
