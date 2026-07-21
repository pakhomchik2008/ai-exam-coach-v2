-- AI Exam Coach — exam catalog schema (run FIRST, in Supabase → SQL Editor).
-- Stores the official exam catalog (qualifications × subjects × topics) so new
-- exams (IELTS, TOEFL, Duolingo…) are added by inserting a row — no code change.
-- Row shape mirrors CURRICULUM_SEED in curriculum-data.jsx exactly.

create table if not exists public.curriculum (
  id                  uuid primary key default gen_random_uuid(),
  country_id          text not null,           -- e.g. 'ua', 'gb', 'us'
  education_system_id text not null,           -- e.g. 'k12'
  qualification_id    text not null,           -- e.g. 'nmt', 'gcse', 'ielts'
  board               text,                    -- exam board, or null (wildcard)
  spec_version        text,                    -- syllabus version, e.g. '2024'
  subject             text not null,           -- canonical subject name
  aliases             jsonb not null default '[]'::jsonb,  -- alt names for lookup
  topics              jsonb not null default '[]'::jsonb,  -- [{name,difficulty,importance,subtopics[]}]
  source              text default 'official', -- 'official' | 'ai' | 'community'
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists curriculum_qual_idx    on public.curriculum (qualification_id);
create index if not exists curriculum_subject_idx  on public.curriculum (lower(subject));

-- Keep updated_at fresh on edits.
create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists curriculum_set_updated_at on public.curriculum;
create trigger curriculum_set_updated_at
  before update on public.curriculum
  for each row execute function public.set_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- The catalog is public reference data: anyone (even anonymous) may READ it,
-- nobody may write through the public API. Seeding/edits happen here in the SQL
-- editor (the postgres role bypasses RLS), or later via an admin service role.
alter table public.curriculum enable row level security;

drop policy if exists "curriculum public read" on public.curriculum;
create policy "curriculum public read"
  on public.curriculum for select
  using (true);
