# Syllabus Architecture

Goal: the syllabus (Exam → Sections → Topics → Subtopics → Skills, with
prerequisites, difficulty, sources, tags, estimated study time) lives in the
database and is the **single reusable source** for the AI Coach, Diagnostic,
Flashcards, Quiz, Study Plan, Knowledge Graph, and recommendations. **No topics
are hardcoded and none are AI-invented** — every topic traces to an official or
trusted public source.

This builds directly on Block 3 (the DB-driven `qualifications` catalog). An exam
is a row in `qualifications`; its syllabus is rows in the tables below.

---

## 1. Data model

```
qualifications (existing) ── the exam registry ('ielts','toefl','ib','nmt',…)
      │ 1:N
      ▼
syllabus_sections     Reading · Writing · Listening · Speaking · Paper 1 …
      │ 1:N
      ▼
syllabus_topics       Matching Headings · True/False/Not Given · Inferencing …
      │ 1:N
      ▼
syllabus_subtopics    leaf detail under a topic

syllabus_skills           cross-cutting, reusable ('inferencing','skimming')
syllabus_topic_skills           topic ⇄ skill   (M:N)
syllabus_topic_prerequisites    topic → prerequisite topic (DAG → knowledge graph)
syllabus_topic_aliases          raw scraped name → canonical topic (normalization)
syllabus_sources                provenance: official org / spec / publisher / repo
```

Every section/topic carries: `difficulty` (1–10), `est_study_minutes`, `tags[]`,
and a `source_id` pointing at the exact official/public source it came from.

Why normalized (not one JSONB blob like the legacy `curriculum` table): the
Diagnostic needs to score per-topic; Flashcards/Quiz select by skill; the Study
Plan orders by prerequisite; the Knowledge Graph traverses `topic_prerequisites`.
All of that needs real rows and relationships, not a blob.

The legacy `curriculum` table stays for the current course flow; the syllabus
tables are the new reusable substrate. A later migration can retire `curriculum`
once every consumer reads syllabus.

---

## 2. Reuse surface (who reads this data)

| Consumer          | Reads                                                        |
|-------------------|-------------------------------------------------------------|
| AI Coach          | topic name/description/skills for grounded explanations      |
| Diagnostic        | topics per section → probe mastery, weight by `difficulty`   |
| Flashcards / Quiz | subtopics + skills → item selection                          |
| Study Plan        | topics ordered by `topic_prerequisites` + `est_study_minutes`|
| Knowledge Graph   | `topic_prerequisites` edges + `topic_skills`                 |
| Recommendations   | "what to improve?" → skill/section → recommended topics      |

One read path serves all of them: the `get_exam_syllabus(exam_id)` RPC returns
the whole nested tree as JSON in a single call (§5), so the frontend never
assembles the hierarchy itself.

---

## 3. Pipeline (research → database)

Real data only. The flow is deliberately human-checkpointed — the extraction
LLM only *reads* fetched official text, it never invents topics.

```
 1. RESEARCH   find the official source(s) for an exam (official org → official
               spec → trusted publisher → large public repo, in that priority)
 2. FETCH      pull the spec/format page text (WebFetch / saved PDF text)
 3. EXTRACT    LLM turns fetched TEXT into a raw hierarchy — strictly "what is on
               the page", refusing to add anything not present
 4. NORMALIZE  slugify, dedupe, map variants to a canonical name via aliases
 5. HIERARCHY  assemble Exam→Section→Topic→Subtopic, attach skills/prereqs
 6. REVIEW     a human eyeballs the normalized JSON (checked into the repo)
 7. SEED       generate a SQL migration; run it in Supabase → data is live
```

Artifacts (all under `scripts/syllabus/`, output under `syllabus-data/`):
- `research-agent` — orchestrates 1–3, emits `syllabus-data/<exam>.raw.json`
- `normalize` — steps 4–5, emits `syllabus-data/<exam>.normalized.json`
- `seed` — step 7, emits `supabase/seed/07_syllabus_<exam>.sql`

Writes go through generated SQL (run in the Supabase SQL editor), matching the
existing 01–05 migration convention — no service-role key ships in the client.

---

## 4. Source priority (§3 of the brief)

1. Official organizations (IELTS.org, ETS/TOEFL, IBO, UCEQA/NMT, MOE Gaokao, NTA JEE/NEET)
2. Official specifications (spec PDFs, subject guides, blueprints)
3. Trusted educational publishers (Cambridge, Oxford, Kaplan, official prep)
4. Large public repositures (Khan Academy course outlines, well-maintained syllabi)

Every row records which tier it came from in `syllabus_sources.type` +
`source_url`, so provenance is auditable and the "no invented topics" rule is
enforceable by review.

---

## 5. API

Supabase auto-exposes REST for every table (public read via RLS). On top of that,
one RPC assembles the tree so clients do a single call:

```
select * from get_exam_syllabus('ielts');   -- returns jsonb:
{ "exam":"ielts", "sections":[ { "slug":"reading","name":"Reading",
    "topics":[ { "slug":"matching-headings","name":"Matching Headings",
      "difficulty":6,"skills":["skimming","inferencing"],
      "subtopics":[...], "prerequisites":[...] } ] } ] }
```

Client store (`syllabus-store.jsx`) mirrors the `qualifications-store` pattern:
fetch once, cache in localStorage, expose `getSyllabus(examId)` synchronously.

---

## 6. Frontend flow (replaces the Subject step)

```
Exam ─▶ "What do you want to improve?" ─▶ recommended Topics ─▶ Diagnostic ─▶ Study Plan
        (Grammar/Speaking/Writing/Reading/               (from syllabus, not a
         Listening/Vocabulary/Everything)                 full syllabus dump)
```

The user never picks a "subject". Sections/topics come entirely from the DB, so
the same three screens render any exam without frontend changes.

---

## 7. Adding a new exam (the future-proof contract)

1. Insert one row in `qualifications` (id, label, grade config, section flag…).
2. Run its generated `07_syllabus_<exam>.sql` seed.

No frontend code changes. The picker, the "what to improve" step, topics,
diagnostic and plan all read from the DB.

---

## 8. Deliverable map

| # | Deliverable            | Where                                             |
|---|------------------------|---------------------------------------------------|
| 1 | Architecture plan      | this file                                         |
| 2 | Database schema        | `supabase/06_syllabus_schema.sql`                 |
| 3 | Supabase migration     | `supabase/06_syllabus_schema.sql`                 |
| 4 | Research agent         | `scripts/syllabus/research-agent.mjs`             |
| 5 | Import pipeline        | `scripts/syllabus/seed.mjs`                        |
| 6 | Topic normalization    | `scripts/syllabus/normalize.mjs`                  |
| 7 | Topic hierarchy        | `scripts/syllabus/normalize.mjs` (tree assembly)  |
| 8 | Seeder                 | `supabase/seed/07_syllabus_<exam>.sql` (generated)|
| 9 | API endpoints          | `get_exam_syllabus` RPC + `syllabus-store.jsx`    |
| 10| Frontend integration   | onboarding flow (Exam→improve→Topics→Diagnostic)  |
| 11| Documentation          | this file + `scripts/syllabus/README.md`          |
```
