-- AI Exam Coach — tighten RLS (run TWENTY-THIRD).
--
-- user_data UPDATE had USING (user_id = auth.uid()) and no WITH CHECK, so a
-- signed-in client could change user_id on an owned row. ai_question_bank
-- INSERT was WITH CHECK (true): any authenticated user could poison the
-- shared dedup pool as someone else.
--
-- Additive. Client novelty (question-novelty.ts) now stamps created_by.
-- Until this runs, those inserts fail and novelty degrades to "not a
-- duplicate" — same as a missing table.

-- ─── user_data: cannot reassign a row ────────────────────────────────────────

drop policy if exists user_data_update on public.user_data;
create policy user_data_update on public.user_data for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── question bank: author must be the inserter ──────────────────────────────

alter table public.ai_question_bank
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.ai_question_bank
  alter column created_by set default auth.uid();

drop policy if exists ai_question_bank_insert on public.ai_question_bank;
create policy ai_question_bank_insert on public.ai_question_bank for insert
  to authenticated
  with check (created_by = auth.uid());

-- ─── verification ─────────────────────────────────────────────────────────────
--   select polwithcheck from pg_policy
--   where polrelid = 'public.user_data'::regclass and polname = 'user_data_update';
--   -- expect (user_id = auth.uid())
--
--   select column_name from information_schema.columns
--   where table_schema = 'public' and table_name = 'ai_question_bank' and column_name = 'created_by';
--   -- expect created_by
