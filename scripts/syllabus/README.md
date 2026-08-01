# Syllabus pipeline

Turns **real, official** exam syllabi into database rows. No topics are hardcoded
in the app and none are AI-invented — every node traces to a cited source. See
`docs/SYLLABUS_ARCHITECTURE.md` for the schema and the reuse surface.

```
research-agent ──▶ <exam>.raw.json ──▶ normalize ──▶ <exam>.normalized.json ──▶ seed ──▶ 07_syllabus_<exam>.sql
   (fetch + extract)     (review)        (slug/dedupe/tree)     (review)         (SQL)      (run in Supabase)
```

## One-time
Run `supabase/06_syllabus_schema.sql` in the Supabase SQL editor (creates the
tables + `get_exam_syllabus` RPC). Needs a `qualifications` row for the exam
(migrations 04/05).

## Per exam

### 1. Curate sources — `syllabus-data/<exam>.sources.json`
List official/trusted URLs in priority order (official org → official spec →
publisher → large public repo):
```json
{ "exam": "toefl", "name": "TOEFL iBT",
  "sources": [
    { "key": "ets_format", "name": "ETS — TOEFL iBT test content",
      "type": "official_org", "url": "https://www.ets.org/toefl/...",
      "retrieved_at": "2026-08-01" }
  ] }
```

### 2. Research — extract only what the sources say
```
ANTHROPIC_API_KEY=sk-... node scripts/syllabus/research-agent.mjs toefl
# or point at your deployed proxy: COMPLETE_URL=https://<app>/api/complete node ...
```
→ `syllabus-data/toefl.raw.json`. **The agent may only extract text present in the
source.** If a source has no real topic breakdown, it says so — point it at a more
detailed trusted source. Then **read the raw JSON** and fix anything wrong; this
is the human checkpoint that guarantees "no invented topics".

### 3. Normalize + build hierarchy
```
node scripts/syllabus/normalize.mjs syllabus-data/toefl.raw.json
```
→ `toefl.normalized.json` (slugs, sort order, deduped, validated). It warns on
duplicate/colliding slugs and unknown skill/prerequisite references.

> **Slug rule:** keep topic slugs unique **within an exam** (prerequisites
> reference topics by slug). If two sections share a topic name (e.g. "Multiple
> choice" in both Listening and Reading), that's fine as long as no prerequisite
> points at the shared slug; otherwise rename one (e.g. "Listening: Multiple
> choice"). The normalizer prints a warning when this happens.

### 4. Seed
```
node scripts/syllabus/seed.mjs syllabus-data/toefl.normalized.json
```
→ `supabase/seed/07_syllabus_toefl.sql`. Run it in the Supabase SQL editor.
Idempotent (deterministic UUIDv5 ids + delete-then-insert), so re-running after an
edit converges instead of duplicating.

### 5. Verify
```
select jsonb_pretty(get_exam_syllabus('toefl'));
```

## Files
- `lib.mjs` — slugify, deterministic UUIDv5, SQL literal helpers, id derivation
- `research-agent.mjs` — fetch sources + LLM extraction (steps 1-3)
- `normalize.mjs` — normalization + hierarchy (steps 4-5)
- `seed.mjs` — normalized JSON → idempotent SQL migration (step 7)
- `../../syllabus-data/` — per-exam `.sources.json`, `.raw.json`, `.normalized.json`
- `../../supabase/seed/` — generated `07_syllabus_<exam>.sql`
