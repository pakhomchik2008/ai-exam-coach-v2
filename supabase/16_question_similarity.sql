-- Examik — semantic (paraphrase) dedup for ai_question_bank (run SIXTEENTH).
--
-- Phase 3 §3a follow-up. The hash-dedup already in question-novelty.ts catches
-- exact repeats (same text, punctuation-different, case-different) but NOT
-- paraphrased ones — a generator that writes "Solve for x: 3x + 5 = 20" one
-- day and "Find x when 3x + 5 = 20" the next produces two different SHA-256
-- hashes and both land in the bank.
--
-- Decision Log #39 (docs/phase-3-plan.md) originally deferred this because
-- the spec called for OpenAI text-embedding-3-small + pgvector, which would
-- add a second AI vendor for one feature. Hlib picked pg_trgm — Postgres's
-- built-in trigram similarity — instead: no new vendor, no per-generation
-- cost, no embeddings inference at insert time. Trades semantic depth for
-- textual similarity (catches word-order changes, small phrasings, synonym
-- swaps in shared substrings; misses "same concept, completely different
-- words"). For a proof point on top of exact hash-dedup, that trade is fine.
--
-- Threshold 0.7 chosen empirically against the shape of these questions —
-- pg_trgm's similarity() function returns 0..1, defaults to 0.3 which is way
-- too lax (would flag questions on the same topic as duplicates). 0.7 in
-- testing catches obvious rephrases while leaving room for real variety.
-- Tunable at call time via the threshold arg on match_similar_question so
-- individual generators could raise it if they hit false positives without
-- a migration write.

create extension if not exists pg_trgm;

-- GIN-trgm index makes the similarity search a real index scan rather than
-- a table scan — without this, every insert would grow the check's cost
-- linearly with bank size, breaking the "never blocks generation" contract.
create index if not exists ai_question_bank_text_trgm_idx
  on public.ai_question_bank using gin (question_text gin_trgm_ops);

-- Returns at most one row — the closest match above the threshold, or nothing.
-- Called from src/lib/question-novelty.ts as an RPC through the standard
-- supabase-js client. Marked `stable` (reads only, no writes), `security
-- definer` NOT set (runs as the caller — same RLS boundary the bank table
-- already enforces, no privilege escalation for a similarity check).
create or replace function public.match_similar_question(
  p_exam_taxonomy text,
  p_text text,
  p_threshold real default 0.7
) returns table (id uuid, similarity real)
language sql
stable
as $$
  select b.id, similarity(b.question_text, p_text) as similarity
  from public.ai_question_bank b
  where b.exam_taxonomy = p_exam_taxonomy
    and similarity(b.question_text, p_text) >= p_threshold
  order by similarity desc
  limit 1;
$$;

-- Grant RPC access to the roles supabase-js uses. Bank rows themselves are
-- already scoped by RLS (see 14_question_bank.sql); this just exposes the
-- function.
grant execute on function public.match_similar_question(text, text, real)
  to anon, authenticated, service_role;

-- ─── verification ─────────────────────────────────────────────────────────────
-- Run in the Supabase SQL Editor. First insert should return no match, second
-- (paraphrased) should return the first row with similarity >= 0.7.
--
--   insert into public.ai_question_bank (exam_taxonomy, topic, question_hash, question_text)
--     values ('test-exam', 'algebra', 'hash-1', 'Solve for x: 3x + 5 = 20');
--
--   select * from public.match_similar_question('test-exam', 'Find x when 3x + 5 = 20');
--   -- expect: one row, similarity > 0.7
--
--   select * from public.match_similar_question('test-exam', 'What is the capital of France');
--   -- expect: no rows (below threshold)
--
--   delete from public.ai_question_bank where exam_taxonomy = 'test-exam';
