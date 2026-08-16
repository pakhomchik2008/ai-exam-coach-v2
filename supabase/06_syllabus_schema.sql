-- Examik — normalized syllabus schema (run SIXTH, after 01-05).
--
-- The reusable substrate for AI Coach / Diagnostic / Flashcards / Quiz / Study
-- Plan / Knowledge Graph / recommendations. Exam → Sections → Topics → Subtopics,
-- with cross-cutting Skills, a prerequisite DAG, per-node difficulty / tags /
-- estimated study time, and a provenance row for EVERY node (no invented topics).
--
-- An exam is a row in `qualifications` (Block 3); this hangs its syllabus off it.
-- See docs/SYLLABUS_ARCHITECTURE.md.

-- Self-contained: (re)define the shared updated_at trigger fn so 06 runs even if
-- 01 hasn't in a fresh project.
create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- ─── provenance ───────────────────────────────────────────────────────────────
create table if not exists public.syllabus_sources (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,                       -- 'IELTS.org — Test format'
  type         text not null check (type in ('official_org','official_spec','publisher','public_repo')),
  url          text,
  retrieved_at timestamptz not null default now(),
  notes        text,
  created_at   timestamptz not null default now()
);

-- ─── sections (top level under an exam) ───────────────────────────────────────
create table if not exists public.syllabus_sections (
  id                uuid primary key default gen_random_uuid(),
  exam_id           text not null references public.qualifications(id) on delete cascade,
  slug              text not null,                  -- 'reading'
  name              text not null,                  -- 'Reading'
  description       text,
  sort_order        int  not null default 0,
  source_id         uuid references public.syllabus_sources(id) on delete set null,
  tags              text[] not null default '{}',
  est_study_minutes int,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (exam_id, slug)
);

-- ─── topics (under a section) ─────────────────────────────────────────────────
create table if not exists public.syllabus_topics (
  id                uuid primary key default gen_random_uuid(),
  section_id        uuid not null references public.syllabus_sections(id) on delete cascade,
  slug              text not null,                  -- 'matching-headings'
  name              text not null,                  -- canonical/normalized name
  description       text,
  difficulty        int check (difficulty between 1 and 10),
  sort_order        int  not null default 0,
  source_id         uuid references public.syllabus_sources(id) on delete set null,
  tags              text[] not null default '{}',
  est_study_minutes int,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (section_id, slug)
);

-- ─── subtopics (leaf under a topic) ───────────────────────────────────────────
create table if not exists public.syllabus_subtopics (
  id          uuid primary key default gen_random_uuid(),
  topic_id    uuid not null references public.syllabus_topics(id) on delete cascade,
  slug        text not null,
  name        text not null,
  difficulty  int check (difficulty between 1 and 10),
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (topic_id, slug)
);

-- ─── skills (cross-cutting, reusable across topics AND exams) ──────────────────
create table if not exists public.syllabus_skills (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,                 -- 'inferencing'
  name        text not null,                        -- 'Inferencing'
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- topic ⇄ skill (M:N)
create table if not exists public.syllabus_topic_skills (
  topic_id uuid not null references public.syllabus_topics(id) on delete cascade,
  skill_id uuid not null references public.syllabus_skills(id) on delete cascade,
  primary key (topic_id, skill_id)
);

-- prerequisite DAG (feeds the Study Plan ordering + Knowledge Graph)
create table if not exists public.syllabus_topic_prerequisites (
  topic_id              uuid not null references public.syllabus_topics(id) on delete cascade,
  prerequisite_topic_id uuid not null references public.syllabus_topics(id) on delete cascade,
  primary key (topic_id, prerequisite_topic_id),
  check (topic_id <> prerequisite_topic_id)
);

-- normalization: raw scraped variant → canonical topic (dedupe/aliasing)
create table if not exists public.syllabus_topic_aliases (
  id       uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.syllabus_topics(id) on delete cascade,
  alias    text not null,
  unique (topic_id, alias)
);

-- ─── indexes ──────────────────────────────────────────────────────────────────
create index if not exists syllabus_sections_exam_idx   on public.syllabus_sections (exam_id);
create index if not exists syllabus_topics_section_idx   on public.syllabus_topics (section_id);
create index if not exists syllabus_subtopics_topic_idx  on public.syllabus_subtopics (topic_id);
create index if not exists syllabus_topic_skills_skill_idx on public.syllabus_topic_skills (skill_id);
create index if not exists syllabus_prereq_prereq_idx    on public.syllabus_topic_prerequisites (prerequisite_topic_id);
create index if not exists syllabus_topic_aliases_alias_idx on public.syllabus_topic_aliases (lower(alias));

-- ─── updated_at triggers ──────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['syllabus_sections','syllabus_topics','syllabus_subtopics','syllabus_skills']
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I;', t, t);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;

-- ─── Row Level Security: public reference data (read-only via public API) ──────
do $$
declare t text;
begin
  foreach t in array array['syllabus_sources','syllabus_sections','syllabus_topics','syllabus_subtopics','syllabus_skills','syllabus_topic_skills','syllabus_topic_prerequisites','syllabus_topic_aliases']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "%s public read" on public.%I;', t, t);
    execute format('create policy "%s public read" on public.%I for select using (true);', t, t);
  end loop;
end $$;

-- ─── single-call API: the whole nested tree for one exam ──────────────────────
-- select * from get_exam_syllabus('ielts');
create or replace function public.get_exam_syllabus(p_exam_id text)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'exam', p_exam_id,
    'sections', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'slug', sec.slug,
          'name', sec.name,
          'description', sec.description,
          'sort_order', sec.sort_order,
          'tags', sec.tags,
          'est_study_minutes', sec.est_study_minutes,
          'topics', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'slug', t.slug,
                'name', t.name,
                'description', t.description,
                'difficulty', t.difficulty,
                'sort_order', t.sort_order,
                'tags', t.tags,
                'est_study_minutes', t.est_study_minutes,
                'skills', coalesce((
                  select jsonb_agg(sk.slug order by sk.slug)
                  from public.syllabus_topic_skills ts
                  join public.syllabus_skills sk on sk.id = ts.skill_id
                  where ts.topic_id = t.id
                ), '[]'::jsonb),
                'prerequisites', coalesce((
                  select jsonb_agg(pt.slug order by pt.slug)
                  from public.syllabus_topic_prerequisites tp
                  join public.syllabus_topics pt on pt.id = tp.prerequisite_topic_id
                  where tp.topic_id = t.id
                ), '[]'::jsonb),
                'subtopics', coalesce((
                  select jsonb_agg(jsonb_build_object('slug', st.slug, 'name', st.name, 'difficulty', st.difficulty) order by st.sort_order)
                  from public.syllabus_subtopics st
                  where st.topic_id = t.id
                ), '[]'::jsonb)
              ) order by t.sort_order
            )
            from public.syllabus_topics t
            where t.section_id = sec.id
          ), '[]'::jsonb)
        ) order by sec.sort_order
      )
      from public.syllabus_sections sec
      where sec.exam_id = p_exam_id
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.get_exam_syllabus(text) to anon, authenticated;
