-- Examik — bound ai_question_bank content injection (run TWENTY-SEVENTH).
--
-- strix pentest finding vuln-0009 (MEDIUM, CWE-862): the shared
-- ai_question_bank INSERT policy (14_question_bank.sql, tightened in
-- 23_rls_tighten.sql to created_by = auth.uid()) lets any authenticated
-- session — including a zero-verification anonymous "Try the demo" JWT —
-- insert an arbitrary-length question_text into the shared dedup pool. A
-- crafted entry with high trigram overlap to real questions can cause the
-- novelty engine to misflag genuine new questions as duplicates for every
-- student on that exam taxonomy.
--
-- Not fixed here: moving inserts to a service-role-only server path (strix's
-- suggested fix) would require pulling checkAndRecordQuestion's insert out
-- of the client (src/lib/question-novelty.ts) into a new serverless
-- endpoint — a real architecture change, not a constraint tweak. Matching
-- the same "cheap bound now, redesign later if it's actually exploited"
-- call already made for vuln-0004: cap question_text length so a poisoned
-- row can't be an arbitrarily large trigram-collision payload, and cap
-- topic to a sane label length. This does not stop a short crafted string
-- from being inserted — only bounds how much damage one row can do.

alter table public.ai_question_bank
  drop constraint if exists ai_question_bank_text_len_check;
alter table public.ai_question_bank
  add constraint ai_question_bank_text_len_check
  check (char_length(question_text) between 1 and 4000);

alter table public.ai_question_bank
  drop constraint if exists ai_question_bank_topic_len_check;
alter table public.ai_question_bank
  add constraint ai_question_bank_topic_len_check
  check (topic is null or char_length(topic) <= 200);

-- ─── verification ─────────────────────────────────────────────────────────────
--   select conname, pg_get_constraintdef(oid)
--   from pg_constraint
--   where conrelid = 'public.ai_question_bank'::regclass and contype = 'c';
--   -- expect ai_question_bank_text_len_check and ai_question_bank_topic_len_check
--
--   -- should fail with a check-constraint violation:
--   insert into public.ai_question_bank (exam_taxonomy, question_hash, question_text, created_by)
--   values ('ielts', 'deadbeef', repeat('a', 5000), auth.uid());
