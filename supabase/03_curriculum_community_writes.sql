-- AI Exam Coach — curriculum catalog: community auto-population (run THIRD).
--
-- Plan 2.2: the "long tail" of subjects nobody seeded (e.g. AP Music Theory) is
-- generated once by the first student who asks for it and then SAVED BACK to the
-- catalog so every later student loads it instantly — the catalog grows itself.
--
-- Two things are needed for that, both here:
--   1. a de-dup key so the same subject is only stored once, and
--   2. an INSERT policy — but a tightly scoped one, because this table is public
--      reference data and a wide-open write policy would let anyone poison it.
--
-- Safety rails on the write path:
--   * only AUTHENTICATED users may insert (anonymous visitors still read-only),
--   * only rows marked source in ('ai','community') — the trusted 'official'
--     seed can never be created or overwritten through the public API,
--   * inserts de-dup against the unique index below (client uses ignoreDuplicates),
--     so an existing official/community row is never clobbered by a new generation.

-- Topics JSONB now also carries an optional "module" per topic (module → topic →
-- subtopic), e.g. A-Level Maths → "Pure Mathematics"/"Statistics"/"Mechanics".
-- Shape: [{name, module?, difficulty, importance, subtopics:[]}]. No column change
-- needed — module lives inside the existing topics jsonb.

-- ─── de-dup key ───────────────────────────────────────────────────────────────
-- One canonical row per qualification × board × spec × subject (case-insensitive
-- subject). country is intentionally NOT part of the key: lookups (getCurriculum)
-- already ignore country, so keying on it would allow near-duplicate rows.
create unique index if not exists curriculum_combo_uidx on public.curriculum (
  qualification_id,
  coalesce(board, ''),
  coalesce(spec_version, ''),
  lower(subject)
);

-- ─── scoped INSERT policy ─────────────────────────────────────────────────────
drop policy if exists "curriculum community insert" on public.curriculum;
create policy "curriculum community insert"
  on public.curriculum for insert
  to authenticated
  with check (source in ('ai', 'community'));
