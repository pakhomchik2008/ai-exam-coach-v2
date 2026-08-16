-- Examik — cross-device sync for personal data (run THIRTEENTH).
--
-- Closes audit finding #12: every student's exams, schedule, mistakes, and
-- brain/mastery state lived only in that one browser's localStorage, so
-- nothing carried over between a laptop and a phone, or even between two
-- browsers on the same machine.
--
-- Deliberately a generic key-value mirror of the existing localStorage keys,
-- NOT a redesign into relational tables. See docs/phase-2c-plan.md for why:
-- short version, normalizing brain_mastery_v1's examId::topicIdx keys while
-- audit finding #14 (that exact key scheme can silently corrupt on a topic
-- reorder) is still open would migrate already-fragile data into a permanent
-- schema. Sync first; normalize later, once #14 has its own fix.
--
-- One row per (user, localStorage key). `updated_at` is set by the database on
-- every upsert, never trusted from the client — last-write-wins reconciliation
-- compares two server timestamps, which is what makes it correct across two
-- devices with skewed clocks.

create table if not exists public.user_data (
  user_id    uuid not null references auth.users(id) on delete cascade,
  key        text not null,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Keeps updated_at honest even on a client-crafted UPDATE that tries to set it
-- directly — every write re-stamps to the server's clock, not the payload's.
create or replace function public.touch_user_data_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_user_data_updated_at on public.user_data;
create trigger touch_user_data_updated_at
  before insert or update on public.user_data
  for each row execute function public.touch_user_data_updated_at();

alter table public.user_data enable row level security;

drop policy if exists user_data_select on public.user_data;
create policy user_data_select on public.user_data for select
  using (user_id = auth.uid());

drop policy if exists user_data_insert on public.user_data;
create policy user_data_insert on public.user_data for insert
  with check (user_id = auth.uid());

drop policy if exists user_data_update on public.user_data;
create policy user_data_update on public.user_data for update
  using (user_id = auth.uid());

drop policy if exists user_data_delete on public.user_data;
create policy user_data_delete on public.user_data for delete
  using (user_id = auth.uid());

-- Realtime: lets a second device pick up a change within seconds instead of
-- only on its next page load. Supabase requires the table added to this
-- publication explicitly.
alter publication supabase_realtime add table public.user_data;

-- ─── verification ─────────────────────────────────────────────────────────────
-- Run as a signed-in user after applying:
--
--   -- should succeed and appear only to this user
--   insert into public.user_data (user_id, key, value)
--   values (auth.uid(), 'user_profile_v1', '{"lang":"uk"}');
--
--   -- should return 0 rows for a different user's key (RLS)
--   select * from public.user_data where user_id <> auth.uid();
