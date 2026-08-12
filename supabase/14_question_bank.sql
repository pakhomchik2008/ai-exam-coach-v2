-- AI Exam Coach — AI question novelty engine (run FOURTEENTH).
--
-- Closes the "never-repeating AI questions" product promise. Today all five
-- question generators in AIChat.jsx rely entirely on in-prompt instructions
-- ("no duplicate concepts") — a single LLM call trusting itself, with zero
-- memory of anything served in a PREVIOUS session. A student drilling one
-- topic across several days sees the same questions again.
--
-- Two tables, deliberately different in scope:
--
--   ai_question_bank    — SHARED across all users. A question is a question;
--                         two students studying IELTS Reading benefit from
--                         one pooled dedup set, and pooling is what makes
--                         the bank dense enough to be useful early on.
--                         Contains no personal data.
--
--   user_seen_questions — PER user. Which questions this student has already
--                         been served, so a future "don't repeat for THIS
--                         student" filter (and the negative-example prompt
--                         guard) has the history it needs.
--
-- Dedup is by normalized-text SHA-256 hash, not embeddings. The original spec
-- called for Anthropic embeddings + pgvector cosine similarity; Anthropic has
-- no embeddings endpoint, and adding a second AI vendor for one feature is a
-- decision for Hlib, not an autonomous pick. See docs/phase-3-plan.md,
-- Decision Log #39. Semantic near-duplicate catching is a documented follow-up;
-- this closes the exact/near-exact case, which is the observed failure.

create table if not exists public.ai_question_bank (
  id            uuid primary key default gen_random_uuid(),
  exam_taxonomy text not null,
  topic         text,
  question_hash text not null,
  question_text text not null,
  created_at    timestamptz not null default now(),
  -- Scoped per exam, not global: "What is 2+2?" being asked in both a SAT
  -- Math and a GCSE Maths paper is legitimate, not a duplicate.
  unique (exam_taxonomy, question_hash)
);

create table if not exists public.user_seen_questions (
  user_id     uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.ai_question_bank(id) on delete cascade,
  seen_at     timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index if not exists user_seen_questions_user_idx
  on public.user_seen_questions (user_id, seen_at desc);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

alter table public.ai_question_bank enable row level security;

-- The bank is a shared pool: any signed-in user may read it (that's what makes
-- dedup work across students) and may contribute to it. There is no update or
-- delete policy at all — a question, once banked, is immutable and permanent,
-- which is exactly what a dedup ledger needs. No policy means no grant.
drop policy if exists ai_question_bank_select on public.ai_question_bank;
create policy ai_question_bank_select on public.ai_question_bank for select
  to authenticated using (true);

drop policy if exists ai_question_bank_insert on public.ai_question_bank;
create policy ai_question_bank_insert on public.ai_question_bank for insert
  to authenticated with check (true);

alter table public.user_seen_questions enable row level security;

-- Personal: scoped to the owner, same shape as every other user-scoped table.
drop policy if exists user_seen_questions_select on public.user_seen_questions;
create policy user_seen_questions_select on public.user_seen_questions for select
  using (user_id = auth.uid());

drop policy if exists user_seen_questions_insert on public.user_seen_questions;
create policy user_seen_questions_insert on public.user_seen_questions for insert
  with check (user_id = auth.uid());

drop policy if exists user_seen_questions_delete on public.user_seen_questions;
create policy user_seen_questions_delete on public.user_seen_questions for delete
  using (user_id = auth.uid());

-- ─── verification ─────────────────────────────────────────────────────────────
-- Run as a signed-in user after applying:
--
--   -- should succeed
--   insert into public.ai_question_bank (exam_taxonomy, topic, question_hash, question_text)
--   values ('ielts', 'Reading', 'deadbeef', 'Test question?');
--
--   -- should fail with a unique-violation (this is the dedup working)
--   insert into public.ai_question_bank (exam_taxonomy, topic, question_hash, question_text)
--   values ('ielts', 'Reading', 'deadbeef', 'Test question again?');
--
--   -- should return 0 rows for another user's seen-history (RLS)
--   select * from public.user_seen_questions where user_id <> auth.uid();
--
--   -- cleanup
--   delete from public.ai_question_bank where question_hash = 'deadbeef';
