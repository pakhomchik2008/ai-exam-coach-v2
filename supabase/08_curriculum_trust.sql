-- AI Exam Coach — curriculum trust model (run EIGHTH, after 01-07).
--
-- Closes the S2 finding in ARCHITECTURE_AUDIT.md: community rows could override
-- the official catalog for every user. 03_curriculum_community_writes.sql opened
-- a deliberately narrow write path ("the catalog grows itself" for the long tail
-- of unseeded subjects) but four things made it wider than intended:
--
--   1. `to authenticated` includes Supabase ANONYMOUS users. That was harmless
--      while anonymous sign-ins were off; 07_ai_usage.sql turns them on for the
--      "Try the demo" button, which would have handed the write path to anyone.
--   2. The unique index is (qualification, board, spec, subject) — so a
--      contributed row with board='AQA' does not collide with the curated
--      board=null row, and curriculum-store's getCurriculum() PREFERS the
--      board-specific row. A contribution could therefore replace the official
--      GCSE Maths syllabus for every AQA student.
--   3. `aliases` was unconstrained: a row called anything could answer lookups
--      for "Mathematics" by listing it as an alias.
--   4. No size cap, no attribution, no rate limit — and the client mirrors the
--      WHOLE table into localStorage on every boot.
--
-- The fix keeps the feature and removes the override:
--   * contributions are forced to source='community', moderation_status='pending'
--   * they may only cover subjects that have NO curated row (that IS the feature)
--   * they carry no aliases, are size-capped, attributed, and rate-limited
--   * the client ranks them BELOW the bundled seed (curriculum-store.jsx)
--
-- Moderation is a plain UPDATE in the SQL editor — see the bottom of this file.

-- ─── columns ──────────────────────────────────────────────────────────────────

alter table public.curriculum
  add column if not exists moderation_status text not null default 'pending';

-- Who contributed the row. Makes "delete everything this account submitted" a
-- one-line query, and is what the rate limit below counts. Nullable: every row
-- that predates this migration, and every row seeded from the SQL editor, has
-- no submitter.
alter table public.curriculum
  add column if not exists created_by uuid references auth.users(id) on delete set null;

-- The seed files all insert source='official' explicitly, so this correctly
-- separates curated rows from everything contributed before this migration.
-- Contributions stay 'pending' until a human promotes them.
update public.curriculum set moderation_status = 'approved' where source = 'official';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'curriculum_moderation_status_chk') then
    alter table public.curriculum add constraint curriculum_moderation_status_chk
      check (moderation_status in ('pending', 'approved', 'rejected'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'curriculum_source_chk') then
    alter table public.curriculum add constraint curriculum_source_chk
      check (source in ('official', 'ai', 'community'));
  end if;
end $$;

create index if not exists curriculum_created_by_idx  on public.curriculum (created_by);
create index if not exists curriculum_moderation_idx  on public.curriculum (moderation_status);

-- ─── contribution guard ───────────────────────────────────────────────────────
-- BEFORE INSERT, so it runs before RLS's WITH CHECK is evaluated (Postgres
-- applies WITH CHECK to the row as the BEFORE triggers left it) — which is why
-- the trigger can safely overwrite `source` and still satisfy the policy.
--
-- SECURITY DEFINER on purpose: the shadowing test below must see EVERY curated
-- row even if the public SELECT policy is ever narrowed. auth.uid() reads the
-- request's JWT claims, not the current role, so it still identifies the caller.

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

  -- ── 1. the caller does not get to pick its own trust level ─────────────────
  new.source            := 'community';
  new.moderation_status := 'pending';
  new.created_by        := v_uid;
  -- An alias is a claim on a DIFFERENT subject's name: getCurriculum() resolves
  -- by subject OR alias, so aliases are the cheapest way to hijack a lookup.
  -- Curated rows keep theirs; contributed rows never get any.
  new.aliases           := '[]'::jsonb;

  -- ── 2. shape and size ──────────────────────────────────────────────────────
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
  -- Whole-payload cap. The client mirrors the entire catalog into localStorage
  -- on every boot, so one oversized row degrades the app for every visitor.
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

  -- ── 3. never shadow curated content ────────────────────────────────────────
  -- This write path exists for the LONG TAIL: subjects nobody seeded. A
  -- contribution for a subject that already has a curated row is not a
  -- contribution, it is an override — and the unique index does not stop it,
  -- because a different `board` is a different key.
  if exists (
    select 1
      from public.curriculum c
     where c.qualification_id = new.qualification_id
       and c.source = 'official'
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

  -- ── 4. per-account rate limit ──────────────────────────────────────────────
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

drop trigger if exists curriculum_guard_contribution on public.curriculum;
create trigger curriculum_guard_contribution
  before insert on public.curriculum
  for each row execute function public.curriculum_guard_contribution();

-- ─── RLS: real accounts only ──────────────────────────────────────────────────
-- `to authenticated` matches anonymous users too — they hold a normal
-- authenticated JWT with is_anonymous=true. The demo account may read the
-- catalog and use AI; it may not write to shared reference data.

drop policy if exists "curriculum community insert" on public.curriculum;
create policy "curriculum community insert"
  on public.curriculum for insert
  to authenticated
  with check (
    coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and source in ('ai', 'community')
  );

-- Still no UPDATE or DELETE policy: RLS denies by default, so a contributed row
-- can never be edited or removed through the public API — only here.

-- ─── moderation ───────────────────────────────────────────────────────────────
-- security_invoker + revoke: created_by is a user id and has no business being
-- readable by every visitor through PostgREST.

create or replace view public.curriculum_pending with (security_invoker = true) as
  select id,
         qualification_id,
         board,
         subject,
         jsonb_array_length(topics) as topic_count,
         created_by,
         created_at
    from public.curriculum
   where source <> 'official'
     and moderation_status = 'pending'
   order by created_at desc;

revoke all on public.curriculum_pending from anon, authenticated;

-- Review queue:
--   select * from public.curriculum_pending;
--   select topics from public.curriculum where id = '<uuid>';
--
-- Promote a good contribution (the client then ranks it as curated, above the
-- bundled seed — the same tier as an official row):
--   update public.curriculum set moderation_status = 'approved' where id = '<uuid>';
--
-- Reject a bad one (the client drops rejected rows entirely):
--   update public.curriculum set moderation_status = 'rejected' where id = '<uuid>';
--
-- Remove everything one account submitted:
--   delete from public.curriculum where created_by = '<user uuid>';

do $$
declare v_pending int;
begin
  select count(*) into v_pending from public.curriculum
   where source <> 'official' and moderation_status = 'pending';
  raise notice 'curriculum: % contributed row(s) now pending review (select * from public.curriculum_pending)', v_pending;
end $$;

notify pgrst, 'reload schema';
