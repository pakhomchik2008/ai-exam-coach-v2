-- Examik — close the storage-quota TOCTOU race (run TWENTY-SIXTH).
--
-- strix pentest finding vuln-0005 (MEDIUM, CWE-362): enforce_user_upload_quota
-- (12_storage_limits.sql) reads the current file count/bytes with a plain
-- SELECT and no lock, then checks it against the limit. Two concurrent
-- uploads both read the same committed state before either commits, so both
-- can pass an identical check — a user firing N parallel uploads when one
-- slot below the limit ends up with up to 2N-1 files instead of N.
--
-- Fix: take a transaction-scoped advisory lock keyed to the uploading user's
-- id before the SELECT. Concurrent inserts for the SAME user now serialize
-- (each waits for the previous one's transaction to commit before reading
-- the count); different users never contend, since the lock key is per-uuid.
-- pg_advisory_xact_lock releases automatically when the transaction ends —
-- no matching unlock call needed, and no risk of a stuck lock on error.

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

  if v_max_files is null then
    raise exception 'storage limits not configured for %', v_limit_key
      using errcode = 'P0002';
  end if;

  -- Serialize concurrent uploads for this user so the count below reflects
  -- every upload that started before this one, not just the ones that had
  -- already committed at the moment this SELECT ran.
  perform pg_advisory_xact_lock(hashtext(v_owner::text));

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

-- ─── verification ─────────────────────────────────────────────────────────────
--   select prosrc from pg_proc where proname = 'enforce_user_upload_quota';
--   -- expect the body to contain 'pg_advisory_xact_lock'
--
-- Manual race test (optional, needs a real user JWT):
--   fire ~20 concurrent POSTs to
--   /storage/v1/object/user-uploads/<user_id>/race_N.txt from a user already
--   at 19/20 files, then list objects — expect exactly 1 success, not 20.
