-- Examik — user upload bucket + server-side enforcement (run TWELFTH).
--
-- Closes the server half of audit finding #2. `src/lib/upload-limits.ts` caps
-- uploads at 20 files / 25 MB each / 200 MB total, but a client-side cap is a
-- UX affordance, not a control: the limits live in JavaScript the user is
-- running, and anyone can POST straight at the storage endpoint with a valid
-- JWT. Without this file, a signed-in student can fill the project's storage
-- quota — which is billed — from a terminal.
--
-- Three layers here, because each catches something the others cannot:
--   1. bucket `file_size_limit`   — per-object cap, enforced by Storage itself
--   2. bucket `allowed_mime_types`— per-object type, enforced by Storage itself
--   3. RLS policies + a trigger   — per-user file count and total bytes, which
--                                   Storage has no native concept of
--
-- Same philosophy as 04_qualifications.sql and 07_ai_usage.sql: the numbers live
-- in a table, so tuning them is one UPDATE with no code change and no redeploy.

-- ─── the bucket ───────────────────────────────────────────────────────────────
-- Private. Objects are reachable only through a signed URL or the owner's JWT;
-- study material is a student's own uploaded coursework and is not public.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-uploads',
  'user-uploads',
  false,
  26214400, -- 25 MB, matching MAX_FILE_BYTES in src/lib/upload-limits.ts
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'text/plain',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update
  set file_size_limit   = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public             = false;

-- ─── tunable quota ────────────────────────────────────────────────────────────

create table if not exists public.storage_limits (
  key            text primary key,
  max_files      integer not null,
  max_total_bytes bigint not null,
  updated_at     timestamptz not null default now()
);

insert into public.storage_limits (key, max_files, max_total_bytes) values
  ('user-uploads:anon', 5,  52428800),   -- demo sessions: 5 files / 50 MB
  ('user-uploads:user', 20, 209715200)   -- real accounts: 20 files / 200 MB
on conflict (key) do nothing;

alter table public.storage_limits enable row level security;
-- Readable so the UI can show the real remaining allowance rather than a
-- hardcoded guess; writable only with the service role.
drop policy if exists storage_limits_read on public.storage_limits;
create policy storage_limits_read on public.storage_limits for select using (true);

-- ─── per-user count + total enforcement ───────────────────────────────────────
-- Storage caps a single object but has no notion of "this user's 21st file" or
-- "this user's 201st megabyte". This trigger adds both.
--
-- Objects are laid out as `<user_id>/<filename>`, so ownership is the first path
-- segment. That is also what the RLS policies below key on.
--
-- The function lives in `public`, not `storage`. The `storage` schema is owned
-- by Supabase's own roles (supabase_storage_admin) — even the project's
-- postgres/service-role user cannot CREATE FUNCTION inside it over the SQL
-- editor ("permission denied for schema storage"). A trigger can still be
-- attached to storage.objects from a function defined elsewhere; only the
-- function's home schema mattered.

create or replace function public.enforce_user_upload_quota()
returns trigger
language plpgsql
security definer
set search_path = storage, public
as $$
declare
  v_owner      uuid;
  v_is_anon    boolean;
  v_limit_key  text;
  v_max_files  integer;
  v_max_bytes  bigint;
  v_files      integer;
  v_bytes      bigint;
  v_incoming   bigint;
begin
  if new.bucket_id <> 'user-uploads' then
    return new;
  end if;

  v_owner := nullif(split_part(new.name, '/', 1), '')::uuid;

  -- An object that does not declare an owner path cannot be quota-checked, so
  -- it is refused outright rather than allowed through unmetered.
  if v_owner is null then
    raise exception 'user-uploads objects must be stored under <user_id>/'
      using errcode = '42501';
  end if;

  if v_owner <> auth.uid() then
    raise exception 'cannot upload into another user''s folder'
      using errcode = '42501';
  end if;

  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) into v_is_anon;
  v_limit_key := case when v_is_anon then 'user-uploads:anon' else 'user-uploads:user' end;

  select max_files, max_total_bytes into v_max_files, v_max_bytes
  from public.storage_limits where key = v_limit_key;

  -- No row means the limits table was not seeded; fail closed.
  if v_max_files is null then
    raise exception 'storage limits not configured for %', v_limit_key
      using errcode = 'P0002';
  end if;

  select count(*), coalesce(sum((metadata ->> 'size')::bigint), 0)
    into v_files, v_bytes
  from storage.objects
  where bucket_id = 'user-uploads'
    and split_part(name, '/', 1) = v_owner::text
    and id <> new.id;

  v_incoming := coalesce((new.metadata ->> 'size')::bigint, 0);

  if v_files + 1 > v_max_files then
    raise exception 'upload limit reached: % files', v_max_files
      using errcode = '53400';
  end if;

  if v_bytes + v_incoming > v_max_bytes then
    raise exception 'storage limit reached: % bytes', v_max_bytes
      using errcode = '53400';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_user_upload_quota on storage.objects;
create trigger enforce_user_upload_quota
  before insert or update on storage.objects
  for each row execute function public.enforce_user_upload_quota();

-- ─── RLS: a user sees and touches only their own folder ───────────────────────

drop policy if exists user_uploads_select on storage.objects;
create policy user_uploads_select on storage.objects for select
  using (bucket_id = 'user-uploads' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists user_uploads_insert on storage.objects;
create policy user_uploads_insert on storage.objects for insert
  with check (bucket_id = 'user-uploads' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists user_uploads_update on storage.objects;
create policy user_uploads_update on storage.objects for update
  using (bucket_id = 'user-uploads' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists user_uploads_delete on storage.objects;
create policy user_uploads_delete on storage.objects for delete
  using (bucket_id = 'user-uploads' and split_part(name, '/', 1) = auth.uid()::text);

-- ─── verification ─────────────────────────────────────────────────────────────
-- Run these after applying, as a signed-in user, to confirm enforcement:
--
--   -- should fail with 42501 (wrong folder)
--   insert into storage.objects (bucket_id, name, metadata)
--   values ('user-uploads', 'someone-elses-id/x.pdf', '{"size": 10}');
--
--   -- should fail with 53400 once 20 objects exist for this user
--   -- (upload 21 small files through the client and watch the last one reject)
