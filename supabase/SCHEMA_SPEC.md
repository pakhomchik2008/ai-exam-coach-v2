# Exam Registry — Data Contract Specification

**Status:** authoritative. Version `1.0`. Supersedes the ad-hoc comments in
`04_qualifications.sql` / `qualifications-store.jsx`.
**Scope:** the "single source of truth" catalog for *what exams exist* (`qualifications`)
and *what is in them* (`curriculum`). Nothing else in the app is in scope.

**The one-sentence goal:** adding IELTS is `INSERT INTO qualifications … ;` plus four
`INSERT INTO curriculum … ;` — zero JS edits, zero deploy. Everything below exists to make
that true *and* keep first paint synchronous, offline-capable, and un-vandalisable.

---

## 0. What this replaces

| # | Hardcoded thing (today) | Replaced by |
|---|---|---|
| 1 | `onboarding-data.jsx:6` `EXAM_TYPES[]` — `{id,label,emoji,blurb,board,boardOptions,educationSystemId,grade}` | `qualifications` rows: `id,label,emoji,blurb,board,board_options,education_system_id,grade_config` |
| 2 | `onboarding-data.jsx:253` `SUBJECT_PRESETS[qualId] → string[]` | `qualifications.subject_presets jsonb` |
| 3 | `onboarding-data.jsx:234` `COUNTRY_TO_EXAM_TYPE {country → qualId}` | `qualifications.default_for_countries jsonb` (**inverted**: one row lists the countries it is the default for) |
| 4 | `exam-wizard.jsx:196` `SECTION_BASED = new Set(["sat","act"])` | `qualifications.section_based boolean` |
| 5 | `exam-wizard.jsx:200` `EN_MEDIUM = new Set([...])` | `qualifications.en_medium boolean` |
| — | subject → topic lists | existing `curriculum` table (unchanged shape; `topics[].module` added inside the jsonb) |

Direction 3 is inverted deliberately. A map keyed by country would need a second table or a
row-per-country; keyed by qualification it stays one row per exam, which is the whole point.
The client rebuilds the country→exam map at load time (§5.4). Collision rule: if two rows
claim the same country, the lower `sort_order` wins; ties broken by `id` ascending. This must
be deterministic because it is applied client-side.

---

## 1. DDL — `public.qualifications`

Canonical definition. `04_qualifications.sql` is the current implementation and is a subset of
this; §7 lists the exact deltas to apply.

```sql
create table if not exists public.qualifications (
  -- ── identity ───────────────────────────────────────────────────────────────
  -- Stable, human-authored slug. It is a FOREIGN-KEY-BY-CONVENTION into
  -- curriculum.qualification_id AND it is embedded in user data forever:
  -- mastery keys are `${examId}::${topicIdx}` (brain-store.jsx:56) and exams
  -- persist examType ids. NEVER rename an id; retire and re-add instead (§3.4).
  id                    text primary key
                        check (id ~ '^[a-z0-9][a-z0-9_-]{1,31}$'),

  -- ── replaces #1: EXAM_TYPES scalar fields ──────────────────────────────────
  label                 text not null check (length(btrim(label)) between 1 and 40),
  label_i18n            jsonb not null default '{}'::jsonb,   -- optional overrides, see §2
  emoji                 text,
  blurb                 jsonb not null default '{}'::jsonb,   -- {en,uk,ru,fr,de}, see §2
  board                 text,                                  -- default/awarding body label
  board_options         jsonb,                                 -- ["AQA",…] | null = no board choice
  education_system_id   text,                                  -- 'k12'|'higher-ed'|'language'|null
  grade_config          jsonb not null,                        -- see §1.1

  -- ── replaces #2: SUBJECT_PRESETS[id] ───────────────────────────────────────
  subject_presets       jsonb not null default '[]'::jsonb,    -- string[]

  -- ── replaces #4 / #5: the two Sets in exam-wizard.jsx ──────────────────────
  -- section_based: composite exam sat as ONE paper. Wizard skips the subject
  -- picker and merges every curriculum row for this qualification into a single
  -- course (exam-wizard.jsx:228, curriculumRowsForQualification()).
  section_based         boolean not null default false,
  -- en_medium: exam is sat in English, so the wizard asks whether the AI should
  -- explain in English or in the UI language (exam-wizard.jsx:611).
  en_medium             boolean not null default false,

  -- ── replaces #3: COUNTRY_TO_EXAM_TYPE (inverted) ───────────────────────────
  default_for_countries jsonb not null default '[]'::jsonb,    -- ["gb"] — ids from COUNTRIES

  -- ── presentation / lifecycle ───────────────────────────────────────────────
  sort_order            int  not null default 100,             -- picker order; 'custom' pinned last by the client
  retired_at            timestamptz,                           -- soft delete — see §3.4. NEVER hard-DELETE.
  source                text not null default 'official'
                        check (source in ('official','community','ai')),
  spec_version          text,                                  -- optional, e.g. '2025 syllabus'
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- ── shape guards: the client has no validation layer, so the DB is it ──────
  constraint qualifications_blurb_is_object
    check (jsonb_typeof(blurb) = 'object'),
  constraint qualifications_label_i18n_is_object
    check (jsonb_typeof(label_i18n) = 'object'),
  constraint qualifications_presets_is_array
    check (jsonb_typeof(subject_presets) = 'array'),
  constraint qualifications_countries_is_array
    check (jsonb_typeof(default_for_countries) = 'array'),
  constraint qualifications_board_options_shape
    check (board_options is null or jsonb_typeof(board_options) = 'array'),
  constraint qualifications_blurb_has_en
    check (blurb ? 'en'),                                      -- en is the guaranteed fallback (§2)
  constraint qualifications_grade_config_shape
    check (
      jsonb_typeof(grade_config) = 'object'
      and grade_config->>'kind' in ('scale','score')
      and (
        (grade_config->>'kind' = 'scale'
          and jsonb_typeof(grade_config->'options') = 'array'
          and jsonb_array_length(grade_config->'options') >= 2)
        or
        (grade_config->>'kind' = 'score'
          and jsonb_typeof(grade_config->'min')  = 'number'
          and jsonb_typeof(grade_config->'max')  = 'number'
          and jsonb_typeof(grade_config->'step') = 'number'
          and (grade_config->>'max')::numeric > (grade_config->>'min')::numeric
          and (grade_config->>'step')::numeric > 0)
      )
      and grade_config ? 'current'
      and grade_config ? 'target'
    )
);

comment on table public.qualifications is
  'Single source of truth for exam types. Replaces EXAM_TYPES, SUBJECT_PRESETS, COUNTRY_TO_EXAM_TYPE (onboarding-data.jsx) and SECTION_BASED, EN_MEDIUM (exam-wizard.jsx). Adding an exam = one row here + curriculum rows.';
comment on column public.qualifications.default_for_countries is
  'Inverse of COUNTRY_TO_EXAM_TYPE. Client rebuilds the map; on collision lowest sort_order wins, then id asc.';
comment on column public.qualifications.section_based is
  'was exam-wizard.jsx SECTION_BASED — one composite paper, subject picker skipped, all sections merged into one course.';
comment on column public.qualifications.en_medium is
  'was exam-wizard.jsx EN_MEDIUM — exam sat in English, wizard offers English-vs-UI-language explanations.';
comment on column public.qualifications.retired_at is
  'Soft delete. Hard DELETE is forbidden: the offline snapshot merges additively by id and cannot express removal.';

-- ── indexes ──────────────────────────────────────────────────────────────────
-- The whole table is one small page-set (tens of rows) and is fetched wholesale
-- on boot, so indexes exist for correctness/uniqueness, not for scan avoidance.
create index if not exists qualifications_live_idx
  on public.qualifications (sort_order, id) where retired_at is null;
create unique index if not exists qualifications_label_uidx
  on public.qualifications (lower(btrim(label))) where retired_at is null;
create index if not exists qualifications_countries_gin
  on public.qualifications using gin (default_for_countries jsonb_path_ops);
create index if not exists qualifications_updated_idx
  on public.qualifications (updated_at desc);

drop trigger if exists qualifications_set_updated_at on public.qualifications;
create trigger qualifications_set_updated_at
  before update on public.qualifications
  for each row execute function public.set_updated_at();  -- from 01_curriculum_schema.sql
```

### 1.1 `grade_config` contract

Mirrors the existing `EXAM_TYPES[].grade` object exactly, so `_rowToExamType` can pass it
through untouched.

```jsonc
// kind:"scale" — ordered labels, BEST FIRST. Rendered as segmented buttons.
{ "kind": "scale", "options": ["A*","A","B","C","D","E"], "current": "B", "target": "A" }

// kind:"score" — numeric range, rendered as a slider.
{ "kind": "score", "min": 0, "max": 9, "step": 0.5, "suffix": "%"?, "current": 6, "target": 7.5 }
```

Rules:
- `scale.options[0]` is the best grade. Order is load-bearing (progress arithmetic).
- `current`/`target` must be members of `options` (scale) or within `[min,max]` and on the
  `step` grid (score). Not DB-enforced beyond membership of the keys — enforce in review.
- `step` may be fractional (`0.5` for IELTS bands). Client must format with
  `Number.isInteger(step) ? 0 : 1` decimals rather than assuming integers.
- `suffix` optional, appended to the rendered number (`"%"` for Matura).

### 1.2 `topics[].module` — grouping without breaking indices

`curriculum.topics` stays a **flat jsonb array**. Each element gains an optional `module`:

```jsonc
{ "name": "Differentiation", "module": "Pure Mathematics",
  "difficulty": 5, "importance": 6, "subtopics": ["Chain rule", "…"] }
```

**Invariant (non-negotiable):** the array index of a topic is its permanent identity. Mastery,
scheduling and session records key on `` `${examId}::${topicIdx}` `` (`brain-store.jsx:56`,
`schedule-store.jsx:18,180`, `ai-brain.jsx:208`, ~106 call sites). Therefore:

- **Append only.** New topics go at the end, even if they belong to an earlier module.
- **Never reorder.** Grouping is a *render-time* `groupBy(topics, t => t.module || "")`; the UI
  orders groups by first-appearance index. Sorting the stored array is a data-corruption bug.
- **Never splice.** To remove a topic, set `"retired": true` on it and keep the slot. Clients
  hide retired topics but existing mastery keys stay resolvable.
- `module: ""` or absent ⇒ ungrouped; the UI renders such topics without a group header.
- All topics of one module must carry the **byte-identical** module string (it is the grouping
  key; no normalisation is applied).
- A `spec_version` bump is the only sanctioned way to publish a re-ordered topic list: it
  creates a *new* `curriculum` row (the unique key includes `spec_version`), so old courses keep
  pointing at the old row and old indices.

This is why a normalised `modules` table was rejected: it would either force topic rows to have
surrogate ids (a 106-site refactor of the mastery key) or reintroduce ordering ambiguity.

---

## 2. i18n column shape — decision and rationale

**Decision:** one `jsonb` object per translatable field, keyed by BCP-47-ish short language
code, with `en` mandatory (`blurb ? 'en'` CHECK) as the universal fallback.

- `blurb jsonb` — `{"en":"Bands 0–9","uk":"Бали 0–9","ru":"…","fr":"…","de":"…"}`
- `label_i18n jsonb` — **usually `{}`**. `label` stays a plain `text` column.

Why `label` is *not* translated by default: exam names are proper nouns / registered brands.
"IELTS", "Abitur", "Matura", "NMT" are the same string in all five UIs, and translating them
would actively harm recognition. `label_i18n` exists as an escape hatch for the two real cases —
`"uni"` → *University / Університет / Universität* and `"custom"` → *Custom / Власний* — and for
scripts that genuinely differ. Resolution order for a label:
`label_i18n[lang] ?? label_i18n.en ?? label`.

Why a jsonb map and not the alternatives:

| Option | Verdict |
|---|---|
| 5 columns (`blurb_en`, `blurb_uk`, …) | Rejected. Adding a 6th language = migration + client change, i.e. exactly the deploy we are eliminating. |
| Side table `qualification_i18n(qual_id, lang, field, value)` | Rejected. Correct in the abstract, but forces a join or a second fetch, and the client has no ORM — it would hand-pivot rows on every boot. Also multiplies the RLS surface. |
| **jsonb map (chosen)** | One row = one complete exam. Matches the existing shape of `EXAM_TYPES[].blurb`, so `_rowToExamType` is a pass-through. New language = insert a key; no DDL, no code. Supabase Table Editor shows it as one editable JSON cell. |

Cost accepted: no per-language uniqueness/NOT NULL enforcement beyond `en`. Mitigated by the
CHECK on `en` plus the lint in §7.6. Missing translations degrade to `en`, never to blank.

**Client resolution helper (contract, not implementation):**
`t(obj, lang) = obj?.[lang] ?? obj?.en ?? ""`. Applies to `blurb` and `label_i18n`. The five
supported codes are `en, uk, ru, fr, de`; unknown keys are ignored, not an error.

---

## 3. Row Level Security

```sql
alter table public.qualifications enable row level security;

-- READ: catalog is public reference data. Anonymous visitors must see the exam
-- picker before signing in — onboarding IS the pre-auth surface.
drop policy if exists "qualifications public read" on public.qualifications;
create policy "qualifications public read"
  on public.qualifications for select
  using (true);

-- WRITE: no INSERT/UPDATE/DELETE policy exists ⇒ with RLS on, every write from
-- anon and authenticated is denied. Authoring happens in the SQL/Table editor
-- (the postgres role bypasses RLS) or via a service-role admin tool.
```

### 3.1 Rationale

- The `qualifications` table is the **taxonomy**, not the content. There are ~15 rows and they
  change a handful of times a year. There is no product need for user writes, so per the
  least-privilege principle there is no write policy at all — the strongest possible posture,
  and it costs nothing.
- This is deliberately **stricter than `curriculum`**, which does allow authenticated inserts
  (`03_curriculum_community_writes.sql`) because the long tail of subjects must self-populate.
  The asymmetry is the security design: a vandal can at worst add a junk *subject* row (source
  `ai`/`community`, de-duped by `curriculum_combo_uidx`, never overwriting `official`); they can
  **never** add, rename or retire an *exam*, change another exam's grading scale, hijack
  `default_for_countries` to redirect every user in a country, or flip `section_based` /
  `en_medium` on an exam other users depend on.
- `qualifications` has no per-user rows, so there is no "other users' content" to vandalise —
  the risk is purely *shared-reference-data poisoning*, and a no-write policy eliminates it.

### 3.2 If community-authored exams are ever wanted

Do **not** loosen this table. Add a separate `qualification_proposals` table with
`owner = auth.uid()` RLS (insert/select own rows only) and promote reviewed proposals into
`qualifications` with the service role. The public table stays append-only-by-admin.

### 3.3 Anon key exposure

`scripts/pull-catalog.mjs` and the client both use the publishable anon key. That is correct and
safe **only because** the write policy is absent. Any future write policy must be re-reviewed
against "the anon key is public".

### 3.4 Deletion policy

Hard `DELETE` is **forbidden** for any `id` that has ever shipped in a snapshot. The client merge
is additive by `id` (§5.4) — a deleted row simply resurrects from the bundled snapshot, and users
who already picked it would keep a dangling `examType`. Instead:

```sql
update public.qualifications set retired_at = now() where id = 'oldexam';
```

Clients filter `retired_at == null` for the **picker**, but must still resolve a retired id for
users who already own an exam of that type (`examType('oldexam')` must not return `undefined`).
Retired rows are still returned by the API and still written to the snapshot; only the picker
hides them. `truncate table public.qualifications` (present in the current seed files) is
acceptable *only* inside the generated full-snapshot re-seed transaction in §7.

---

## 4. Worked example — adding IELTS end to end

Composite/section-based, English-medium is **false** (the *subject matter* is English, so
explanations should follow the UI language — see note), bands 0–9 in 0.5 steps, four sections.

> **`en_medium` note.** The flag means "the paper is written in English, so ask the learner
> whether the AI should explain in English or in their UI language". For IELTS the learner is
> *learning* English and typically wants explanations in their own language, so the shipped row
> uses `false`. This is a product judgement, recorded here so it is not silently flipped.

```sql
begin;

-- Re-runnable: retire-and-replace by id rather than blind insert.
delete from public.qualifications where id = 'ielts';
delete from public.curriculum     where qualification_id = 'ielts';

-- ── 1. the exam itself (replaces all five hardcoded places at once) ──────────
insert into public.qualifications (
  id, label, label_i18n, emoji, blurb,
  board, board_options, education_system_id,
  grade_config, subject_presets,
  section_based, en_medium, default_for_countries, sort_order, source
) values (
  'ielts',
  'IELTS',
  '{}'::jsonb,                                   -- brand name, identical in all 5 UIs
  '🌐',
  '{"en":"Bands 0–9","uk":"Бали 0–9","ru":"Баллы 0–9","fr":"Bandes 0–9","de":"Bänder 0–9"}'::jsonb,
  null,                                          -- no single awarding body shown
  null,                                          -- null ⇒ wizard shows no board picker
  'language',
  '{"kind":"score","min":0,"max":9,"step":0.5,"current":6,"target":7.5}'::jsonb,
  '["Listening","Reading","Writing","Speaking"]'::jsonb,   -- = SUBJECT_PRESETS['ielts']
  true,                                          -- section_based: one paper, no subject picker
  false,                                         -- en_medium: explain in the UI language
  '[]'::jsonb,                                   -- not a country default
  20,
  'official'
);

-- ── 2. its four sections (one curriculum row each; section_based merges them) ─
-- country_id '' = worldwide; board null = wildcard (matches any/no board).
insert into public.curriculum
  (country_id, education_system_id, qualification_id, board, spec_version, subject, aliases, topics, source)
values
('', 'language', 'ielts', null, 'standard', 'Listening',
 '["Listening","IELTS Listening","Аудіювання"]'::jsonb,
 '[{"name":"Section 1: Everyday conversation","module":"Listening","difficulty":4,"importance":7,"subtopics":["Form completion","Note completion","Multiple choice"]},
   {"name":"Section 2: Monologue","module":"Listening","difficulty":5,"importance":6,"subtopics":["Map/plan labelling","Matching","Sentence completion"]},
   {"name":"Section 3: Academic discussion","module":"Listening","difficulty":6,"importance":7,"subtopics":["Multiple choice","Matching","Flow-chart completion"]},
   {"name":"Section 4: Academic lecture","module":"Listening","difficulty":7,"importance":8,"subtopics":["Note completion","Summary completion","Table completion"]}]'::jsonb,
 'official'),

('', 'language', 'ielts', null, 'standard', 'Reading',
 '["Reading","IELTS Reading"]'::jsonb,
 '[{"name":"Skimming and scanning","module":"Reading","difficulty":4,"importance":7,"subtopics":["Locating information","Reading for gist"]},
   {"name":"True / False / Not Given","module":"Reading","difficulty":7,"importance":8,"subtopics":["Fact vs claim","Distractors"]},
   {"name":"Matching headings","module":"Reading","difficulty":6,"importance":7,"subtopics":["Paragraph main idea","Summarising"]},
   {"name":"Sentence and summary completion","module":"Reading","difficulty":5,"importance":7,"subtopics":["Keyword spotting","Paraphrase"]},
   {"name":"Multiple choice","module":"Reading","difficulty":5,"importance":6,"subtopics":["Detail questions","Inference"]}]'::jsonb,
 'official'),

('', 'language', 'ielts', null, 'standard', 'Writing',
 '["Writing","IELTS Writing"]'::jsonb,
 '[{"name":"Task 1: Report from visual data","module":"Writing","difficulty":6,"importance":8,"subtopics":["Describing trends","Comparing data","Overview sentence"]},
   {"name":"Task 2: Opinion / argument essay","module":"Writing","difficulty":7,"importance":9,"subtopics":["Thesis and structure","Developing arguments","Conclusion"]},
   {"name":"Coherence and cohesion","module":"Writing","difficulty":5,"importance":7,"subtopics":["Linking devices","Paragraphing"]},
   {"name":"Lexical resource","module":"Writing","difficulty":5,"importance":7,"subtopics":["Topic vocabulary","Collocations"]},
   {"name":"Grammatical range and accuracy","module":"Writing","difficulty":6,"importance":7,"subtopics":["Complex sentences","Tense control"]}]'::jsonb,
 'official'),

('', 'language', 'ielts', null, 'standard', 'Speaking',
 '["Speaking","IELTS Speaking"]'::jsonb,
 '[{"name":"Part 1: Introduction and interview","module":"Speaking","difficulty":3,"importance":6,"subtopics":["Familiar topics","Short answers"]},
   {"name":"Part 2: Long turn (cue card)","module":"Speaking","difficulty":6,"importance":8,"subtopics":["Structuring 2 minutes","Note-making"]},
   {"name":"Part 3: Two-way discussion","module":"Speaking","difficulty":7,"importance":8,"subtopics":["Abstract ideas","Justifying opinions"]},
   {"name":"Fluency and coherence","module":"Speaking","difficulty":5,"importance":7,"subtopics":["Reducing hesitation","Discourse markers"]},
   {"name":"Pronunciation","module":"Speaking","difficulty":5,"importance":6,"subtopics":["Stress and intonation","Individual sounds"]}]'::jsonb,
 'official');

commit;
```

**What the app does with this, with no code change:**

1. `refreshRemoteQualifications()` fetches the row; `_rowToExamType` maps it to
   `{id:"ielts", grade:{kind:"score",min:0,max:9,step:0.5,…}, sectionBased:true, enMedium:false,
   subjectPresets:[…]}` and `_mergeQuals` inserts it **before** `custom` in `window.EXAM_TYPES`.
2. The picker shows `🌐 IELTS — Bands 0–9` (localised via `blurb[lang]`).
3. `isSectionBasedQual("ielts")` reads `e.sectionBased === true` ⇒ subject step is skipped
   (`exam-wizard.jsx:228,661,705`).
4. `curriculumRowsForQualification("ielts", null)` returns the four rows from the *remote*
   catalog and merges their topics into one 19-topic course, indices `0…18`, grouped in the UI
   by `module` = Listening / Reading / Writing / Speaking.
5. Grade slider renders `0 – 9` in `0.5` steps, defaulting current `6.0` → target `7.5`.
6. `isEnMediumQual("ielts")` is `false` ⇒ the English-vs-UI-language question is not shown.

**Adding TOEFL or Duolingo is the same five statements with different literals** — see
`05_language_exams.sql`, which is exactly this pattern applied three times.

---

## 5. The snapshot contract

### 5.1 The problem, stated precisely

`window.EXAM_TYPES` is read **synchronously during first render** (`examType(id)` at
`onboarding-data.jsx:33`, the step-1 picker, `exam-wizard.jsx` module scope). A Supabase read is
a promise. There is no build step and no import graph, so there is no place to `await` before
first paint. Blocking the first paint on a network round-trip is not acceptable (it is the
onboarding screen, and it must work offline).

**Resolution: three tiers, each strictly faster and staler than the next.**

| Tier | Source | Availability | Freshness |
|---|---|---|---|
| **T0 Snapshot** | `catalog-snapshot.js`, generated, committed, `<script>`-tagged before `onboarding-data.jsx` | Synchronous, always, offline | As of last `pull-catalog` run |
| **T1 Mirror** | `localStorage["qualifications_remote_v1"]` | Synchronous on 2nd+ boot, offline | As of this device's last successful fetch |
| **T2 Live** | `supabase.from('qualifications').select('*')` | Async, online only | Authoritative |

**The database is the authoring source of truth. T0 and T1 are caches.** The repo never authors
catalog data again; `pull-catalog.mjs` only mirrors the DB into the repo.

### 5.2 The generated snapshot file

Path: `/catalog-snapshot.js` (plain `.js`, **not** `.jsx` — no Babel transform needed, so it can
load first and cheaply).

```js
// AUTO-GENERATED by scripts/pull-catalog.mjs — DO NOT EDIT.
// Mirror of the live Supabase catalog. Regenerate after any DB catalog change.
window.__CATALOG_SNAPSHOT = {
  schema: 1,                                  // bump only on a breaking shape change
  generatedAt: "2026-08-01T09:14:22.031Z",    // ISO-8601 UTC, from the generator machine
  contentHash: "sha256:9f2c…",                // over the canonicalised row arrays
  qualifications: [ /* raw DB rows, snake_case, ordered by sort_order, id */ ],
  curriculum:     [ /* raw DB rows, snake_case, ordered by qualification_id, subject */ ]
};
```

Contract rules:

- **Raw DB rows, snake_case, verbatim.** No camelCase conversion in the file. The exact same
  `_rowToExamType` / `_remoteRowToSeed` mappers are used for T0, T1 and T2, so all three tiers
  are guaranteed shape-identical. One mapper, one bug surface.
- **Deterministic serialisation.** Rows sorted by the keys above; object keys emitted in column
  order; `JSON.stringify` with 0-space indent per row. A DB with unchanged content must produce a
  byte-identical file, so `git diff` is a real review of what changed in the catalog.
- **Retired rows are included** (with `retired_at` set) so offline clients can still resolve
  historical ids.
- `contentHash` is `sha256` over `JSON.stringify({qualifications, curriculum})` after the
  canonical sort — used for staleness comparison and CI drift detection.
- Loaded in `index.html` **before** `onboarding-data.jsx`:
  ```html
  <script src="catalog-snapshot.js?v=<hash>"></script>
  <script type="text/babel" src="onboarding-data.jsx"></script>
  <script type="text/babel" src="qualifications-store.jsx?v=q2"></script>
  <script type="text/babel" src="curriculum-store.jsx?v=sb5"></script>
  ```

The literal `EXAM_TYPES` array in `onboarding-data.jsx` becomes **tier T-1: last-resort defaults**,
used only if `window.__CATALOG_SNAPSHOT` is absent (snapshot file failed to load). It is frozen —
it must keep the 11 original exams, and it is never again the place to add one.

### 5.3 When the snapshot is regenerated

| Trigger | Action | Enforcement |
|---|---|---|
| Any `INSERT`/`UPDATE` to `qualifications` or `curriculum` in the DB | run `node scripts/pull-catalog.mjs`, commit the diff | manual, documented in the exam-authoring runbook |
| Every CI run on `main` | run the generator against prod and `git diff --exit-code` | **fails the build on drift** — this is the real enforcement |
| Nightly scheduled job | regenerate; open a PR if the diff is non-empty | catches DB-only edits made in the Table Editor |
| Before every release/deploy | regenerate as a release step | guarantees a fresh first paint for new visitors |

The generator also keeps writing the SQL mirrors it writes today
(`02_curriculum_seed.sql`, `_qualifications_seed.generated.sql`) so a DB can be rebuilt from the
repo. Those files are for disaster recovery and review; `catalog-snapshot.js` is for runtime.

**Drift is expected and safe.** A snapshot up to N days stale is fine — T2 corrects it within
one boot for online users. The build gate exists to keep the staleness bounded, not because
staleness breaks anything.

### 5.4 How the client resolves the three tiers

Deterministic, in this exact order. `qualifications-store.jsx` owns all of it.

**Step 0 — synchronous baseline (before any await).**
```
base = __CATALOG_SNAPSHOT.qualifications        // T0
     ?? EXAM_TYPES_LITERAL_AS_ROWS              // T-1, only if the snapshot file is missing
```
`window.EXAM_TYPES = base.map(_rowToExamType)` is set *before* first render. First paint is
never blocked, never empty.

**Step 1 — synchronous mirror overlay (still before any await).**
Read `localStorage["qualifications_remote_v1"]`, which stores
`{ fetchedAt, schema, contentHash, rows }`. Apply it over T0 **only if all** hold:
1. `mirror.schema === __CATALOG_SNAPSHOT.schema` — otherwise discard (shape changed).
2. `mirror.fetchedAt > __CATALOG_SNAPSHOT.generatedAt` — **the newer artifact wins.** A freshly
   deployed snapshot is newer than a mirror captured before the deploy, so the mirror is dropped.
   This is the fix for the naive "mirror always overrides bundle" rule, which would resurrect
   pre-deploy data after a release.
3. `now - mirror.fetchedAt < MIRROR_TTL` (**30 days**). Older ⇒ discard and delete the key. A
   device that has been offline for a month should trust the shipped snapshot.

**Step 2 — async live fetch (T2), non-blocking, fired on boot.**
`select('*').order('sort_order')`. On success: write the mirror
(`{fetchedAt: Date.now(), schema, contentHash, rows: data}`), apply, dispatch
`qualifications-updated`. On **any** failure (offline, RLS, table missing, malformed) do nothing
— keep whatever Step 0/1 produced. Failures are never surfaced to the user.

**Merge rules (identical at every tier, `_mergeQuals`):**
- Match on `id`. Higher tier **replaces the whole row**, field-by-field — not a deep merge.
  A DB row is complete by construction (NOT NULL + defaults), so partial merge could only
  resurrect stale fields.
- `id` present only in the higher tier ⇒ **inserted**, positioned by `sort_order`, always
  **before** `custom`.
- `id` present only in the lower tier ⇒ **kept** (it may be a row the fetch didn't cover, or an
  exam the current user already owns). Removal is expressed by `retired_at`, never by absence
  (§3.4).
- `retired_at != null` ⇒ excluded from the picker list, still resolvable by `examType(id)`.
- Ordering: `sort_order` asc, then `id` asc, with `custom` force-pinned last.
- `default_for_countries` is re-derived from the merged list on every apply (never
  incrementally patched), so a removed country mapping actually disappears.

**Conflict rules, stated as invariants:**
- Freshness order is absolute: `T2 > max(T0, T1)`, and between T0 and T1 the newer timestamp wins.
- Ties impossible: every tier carries a monotonic timestamp.
- Any tier's data is individually sufficient to render the app. No tier is a partial fragment of
  another.
- Re-applying the same tier twice is idempotent (globals are rewritten, not accumulated).

**Consumer contract.** Consumers must read `window.EXAM_TYPES` / call `window.examType(id)` **at
call time**, not capture them at module scope, and should re-render on the
`qualifications-updated` / `curriculum-updated` events. Module-scope capture is the one pattern
that breaks the upgrade path — `exam-wizard.jsx:205-206` already does this correctly by calling
`window.examType(id)` inside the predicate.

**Unknown-id safety.** `examType(id)` for an id absent from all tiers must return a synthetic
`custom`-shaped object with the requested `id`, never `undefined` — a user whose device fell back
to an old snapshot must not crash on an exam they created against the live DB.

---

## 6. Seed rows for the 11 existing exam types

The behaviour-preserving migration. Field-for-field these must reproduce today's constants:

| id | grade_config | section_based | en_medium | default_for_countries | sort |
|---|---|---|---|---|---|
| gcse | scale `9…3`, cur 6, tgt 8 | false | **true** | `[]` | 0 |
| alevel | scale `A*…E`, cur B, tgt A | false | **true** | `["gb"]` | 1 |
| sat | score 400–1600 step 10 | **true** | **true** | `["us"]` | 2 |
| act | score 1–36 step 1 | **true** | **true** | `[]` | 3 |
| ap | scale `5…1`, cur 3, tgt 5 | false | **true** | `[]` | 4 |
| ib | scale `7…2`, cur 4, tgt 6 | false | **true** | `["fr"]` | 5 |
| nmt | score 100–200 step 1 | false | false | `["ua"]` | 6 |
| matura | score 0–100 step 1, suffix `%` | false | false | `["pl"]` | 7 |
| abitur | scale `1.0…3.0`, cur 2.3, tgt 1.3 | false | false | `["de"]` | 8 |
| uni | scale `1st…Pass` | false | false | `[]` | 9 |
| custom | scale `A…Pass` | false | false | `["other"]` | 10 |

Derivation, verbatim from the current code — this is the correctness argument:
- `section_based = SECTION_BASED.has(id)` where `SECTION_BASED = {sat, act}` (`exam-wizard.jsx:196`).
- `en_medium = EN_MEDIUM.has(id)` where `EN_MEDIUM = {sat, act, ap, alevel, gcse, ib}` (`:200`).
- `default_for_countries` = inversion of `COUNTRY_TO_EXAM_TYPE` (`onboarding-data.jsx:234`):
  `gb→alevel, us→sat, ua→nmt, pl→matura, de→abitur, fr→ib, other→custom`. Every other exam gets
  `[]`. Round-trip check: re-deriving the map from the 11 rows must yield exactly those 7 pairs.
- `subject_presets` = `SUBJECT_PRESETS[id]` verbatim (`:253`), including `custom: []`.
- `sort_order` = array index in `EXAM_TYPES`.
- `label/emoji/blurb/board/board_options/education_system_id/grade_config` = the object literals
  at `onboarding-data.jsx:7-30`. Only `gcse` and `alevel` have `board_options`
  (`["AQA","Edexcel","OCR","WJEC"]`); all others are `null`.

**The concrete INSERT statements already exist and are correct** in
`supabase/04_qualifications.sql` lines 44–54. Two deltas are required for full conformance to
this spec (§7.2):
1. add `label_i18n` (`'{}'` for all 11 except `uni`/`custom`, which may carry real translations),
2. `education_system_id` for `custom` stays `null`; note that `04` writes `null` for `board` on
   `custom` while the JS literal has `board:"Any exam"` — **`04` is wrong here.** `custom`,
   `sat`, `act`, `ap`, `ib`, `nmt`, `matura`, `abitur`, `uni` all have a `board` string in JS
   (`"Any exam"`, `"College Board"`, `"ACT, Inc."`, `"College Board"`, `"Int. Baccalaureate"`,
   `"UCEQA"`, `"CKE"`, `"KMK"`, `"Custom modules"`). Check each row: `04` does carry these
   correctly for all but must be re-verified against the literal before the parity test in §7.6
   is declared green.

**Behaviour-parity acceptance test (must pass before the JS constants are demoted):**
for each of the 11 ids, `deepEqual(_rowToExamType(dbRow), EXAM_TYPES_LITERAL[i])` on the keys
`{id,label,emoji,blurb,board,boardOptions,educationSystemId,grade}`, plus
`sectionBased === SECTION_BASED.has(id)` and `enMedium === EN_MEDIUM.has(id)`.
Absent vs `null` matters: `boardOptions` must be **absent** (not `null`) when there is no board
choice — `_rowToExamType` already handles this (`qualifications-store.jsx:43`).

---

## 7. Migration and rollout plan

Ordered so that every step is independently safe and reversible, and the app is fully working
after each one. Nothing is deleted until the last step.

### Step 1 — Create the table (additive, no client change)
Run `04_qualifications.sql` (with the §7.2 amendments). RLS on, read-only.
*Verify:* `select count(*) from public.qualifications;` = 11.
Anonymous read works: `curl "$URL/rest/v1/qualifications?select=id" -H "apikey: $ANON"` returns 11 ids.
Anonymous write is denied: `curl -X POST … -d '{"id":"x",…}'` returns `401/403`.
*Rollback:* `drop table public.qualifications;` — the app has not been told about it yet.

### Step 2 — Amend the DDL to this spec
Apply as `06_qualifications_hardening.sql`:
```sql
alter table public.qualifications add column if not exists label_i18n  jsonb not null default '{}'::jsonb;
alter table public.qualifications add column if not exists retired_at  timestamptz;
alter table public.qualifications add column if not exists spec_version text;
alter table public.qualifications add column if not exists source text not null default 'official';
-- then the CHECK constraints and indexes from §1, each guarded by
-- `do $$ begin … exception when duplicate_object then null; end $$;`
```
Add constraints **after** the seed exists, so a violation surfaces immediately on real data.
*Verify:* every CHECK adds without error (proves the 11 seeded rows are already conformant);
`\d+ public.qualifications` matches §1.
*Rollback:* `alter table … drop constraint …` — columns are nullable/defaulted, harmless if left.

### Step 3 — Ship the read path behind a fallback (client, additive)
Deploy `qualifications-store.jsx` (already written) loaded **after** `onboarding-data.jsx`, and
the `isSectionBasedQual` / `isEnMediumQual` predicates in `exam-wizard.jsx` (already written) that
prefer `e.sectionBased`/`e.enMedium` and fall back to the hardcoded Sets when the field is
`undefined`. **Both paths live simultaneously.** If the table is missing or the fetch fails, the
app behaves exactly as before.
*Verify:* with DevTools offline, onboarding renders 11 exams from the literal. Online, reload and
confirm `window.EXAM_TYPES.length` and that each entry has a boolean `sectionBased`. Diff the
picker screenshot before/after — must be pixel-identical.

### Step 4 — Prove "exam without code"
Run `05_language_exams.sql` (IELTS/TOEFL/Duolingo). Deploy **nothing**.
*Verify:* hard-reload an existing client. The picker gains 3 exams before `Custom`. Pick IELTS:
the subject step is skipped, the slider reads 0–9 in 0.5 steps, and the built course has 19
topics across 4 modules. This is the acceptance test for the entire project.
*Rollback:* `delete from public.qualifications where id in ('ielts','toefl','duolingo');` plus the
matching `curriculum` deletes, then clear `localStorage.qualifications_remote_v1`. (Acceptable
here only because these ids have never been in a shipped snapshot — see §3.4.)

### Step 5 — Ship the snapshot generator and file
Extend `scripts/pull-catalog.mjs` to also emit `catalog-snapshot.js` per §5.2. Add the
`<script>` tag. Add the CI drift gate (`generate && git diff --exit-code catalog-snapshot.js`).
Update `qualifications-store.jsx` to read T0 from `window.__CATALOG_SNAPSHOT` (falling back to the
literal) and to apply the §5.4 staleness rules to the localStorage mirror.
*Verify:* delete the DB fetch (block the host in DevTools) with a cleared localStorage — a
first-time visitor still sees all 14 exams, including IELTS, purely from the snapshot. Then set
`localStorage.qualifications_remote_v1` with a `fetchedAt` older than `generatedAt` and confirm
the mirror is discarded, not applied.

### Step 6 — Flip the source of truth for authoring
Update the runbook: **exams are added in Supabase, never in JS.** `pull-catalog.mjs` runs after
every catalog change. The nightly drift PR job goes live.
*Verify:* add a throwaway exam in the Table Editor; the nightly job opens a PR whose only diff is
that row in `catalog-snapshot.js` and `_qualifications_seed.generated.sql`. Then retire it.

### Step 7 — Demote the hardcoded constants (last, only after 2 green weeks)
- `onboarding-data.jsx`: keep `EXAM_TYPES` as the frozen T-1 last-resort default, with a comment
  pointing here. Delete `SUBJECT_PRESETS` and `COUNTRY_TO_EXAM_TYPE` literals **only** once the
  snapshot provably populates them (they are derived in `_applyToGlobals`); if in doubt, keep
  them — they cost nothing and are the deepest safety net.
- `exam-wizard.jsx`: delete `SECTION_BASED_FALLBACK` / `EN_MEDIUM_FALLBACK` once every shipped
  snapshot row carries both booleans (they are NOT NULL, so this is true from Step 5 onward).
*Verify:* run the §6 parity test in CI against the generated snapshot; it must stay green with
the fallbacks removed.
*Rollback:* revert the commit. Data is unaffected — this step touches only dead code.

### 7.6 Standing CI checks (added at Step 5, run forever)
1. **Snapshot drift** — regenerate against prod, `git diff --exit-code`.
2. **Parity** — §6 test, snapshot rows vs the frozen literal, for the original 11 ids.
3. **i18n coverage** — every live row has all of `en,uk,ru,fr,de` in `blurb`; warn (don't fail)
   on missing non-`en` keys, fail on missing `en`.
4. **Referential sanity** — every `qualifications.id` with `section_based = true` has ≥ 1
   `curriculum` row; every `curriculum.qualification_id` exists in `qualifications`.
5. **Country map determinism** — no two live rows claim the same country in
   `default_for_countries` (query below).
6. **Topic index stability** — for each `(qualification_id, subject, spec_version)`, the topic
   names at indices `0..min(len_old,len_new)-1` are unchanged between the previous snapshot and
   the new one. **This is the guard that protects the ~106 `examId::topicIdx` call sites.** A
   violation fails the build; the fix is to bump `spec_version` instead.

```sql
-- check 5
select c, count(*) from public.qualifications q,
  lateral jsonb_array_elements_text(q.default_for_countries) c
where q.retired_at is null group by c having count(*) > 1;
```

---

## 8. Open questions

1. **`en_medium` for IELTS/TOEFL/Duolingo.** Shipped as `false` (explain in the learner's
   language). If user testing says advanced candidates want English-only explanations, this
   becomes a per-user preference rather than a per-exam flag — in which case the column stays
   but only seeds the default.
2. **`education_system_id = 'language'`** is a new value introduced by `05_language_exams.sql`.
   It is currently free text. If any client logic ever branches on it, it should become an
   enum/lookup table.
3. **Board-scoped presets.** `subject_presets` is per-qualification, not per-board. AQA and OCR
   offer slightly different A-Level subject sets. Deferred: model as
   `subject_presets: {"_default": [...], "AQA": [...]}` if it ever matters.
4. **`sort_order` collisions across authors** — currently manual. If exam authoring is ever
   delegated, switch to a sparse ordering (multiples of 10) or a fractional index.
5. **Snapshot size.** `catalog-snapshot.js` embeds the full `curriculum` table. At ~200 rows with
   full topic trees this is already a few hundred KB. Threshold to revisit: **500 KB gzipped**, at
   which point split into `catalog-snapshot.qualifications.js` (always loaded, tiny) and
   `catalog-snapshot.curriculum.js` (deferred, loaded after first paint).
