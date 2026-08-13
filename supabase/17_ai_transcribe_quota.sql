-- AI Exam Coach — quota rows for /api/transcribe (run SEVENTEENTH).
--
-- 07_ai_usage.sql only listed complete + fetch-url. Whisper (3.7g) spends
-- ai_quota_consume('transcribe'). No row → fail closed → the UI shows
-- "Daily AI limit reached" even when the user still has complete budget.
-- Same shape as the other keys so one UPDATE still retunes the policy.

insert into public.ai_limits (key, daily_requests, daily_output_tokens) values
  ('transcribe:user',  80, 0),
  ('transcribe:anon',  10, 0)
on conflict (key) do nothing;

-- ─── verification ─────────────────────────────────────────────────────────────
--   select key, daily_requests from public.ai_limits where key like 'transcribe:%';
--   -- expect two rows: user 80, anon 10
