# Phase 3.7 Plan — Learn Section (Hybrid Skill Tree + AI Coach + Video)

## Scope reality check

The full 3.7 spec (see mega-prompt §3.7) is a ~200-hour, multi-week
build with new infrastructure dependencies (OpenAI, ffmpeg on edge,
Playwright, billing/paywall). Not one PR.

Same slicing pattern Phase 3 used: ship what needs no external account
or new infra first, defer what does.

| Slice | What's in it | Blocked on | Doing now? |
|---|---|---|---|
| **3.7a — MVP skill tree** | Tree schema + JSON for 1 exam, tree UI (list), Teach + Drill(MCQ+fill) + Prove + Bronze mastery, learn_progress store, existing dedup pipeline | nothing | **yes** |
| **3.7b — Full exercise mix** | match / order / drag_drop / explain (with Sonnet rubric) types | nothing beyond MVP shipping first | next |
| **3.7c — Hearts + streak polish** | 5 hearts, 30-min regen, freeze token, streak accounting | nothing | after 3.7b |
| **3.7d — SM-2 spaced repetition** | Silver/Gold/Legendary transitions, "Review today (N)" | 3.7a mastery in production first | after 3.7c |
| **3.7e — Boss levels + prereqs + SVG tree** | Unit-end mini exam, prerequisite locks, SVG lines between nodes | 3.7a-b live | after 3.7d |
| **3.7f — AI Coach overlay** | Half-sheet chat with node context | prompt system design | separate PR |
| **3.7g — IELTS Speaking (audio in/out)** | Mic capture, TTS listening prompts, Whisper transcript, band scoring | **OpenAI account + Whisper API** (Decision Log #39: no autonomous add) | blocked, ask Hlib |
| **3.7h — Video-narrated Teach** | OpenAI TTS + slide render + ffmpeg concat + Supabase Storage cache | **OpenAI account + ffmpeg infra** (Vercel/Supabase edge can't run ffmpeg binary — needs Docker container or Vercel Functions Pro >250MB) | blocked, real infra decision |
| **3.7i — Free/Pro paywall** | 1 unit free, rest gated, hearts/video/coach tiering | **Real billing** (Stripe not integrated; same reason Trial-end email was deferred) | blocked |
| **3.7j — Playwright E2E** | The DoD scenarios from the spec | Playwright not installed; adds dev-tooling burden | after main tree is done |

Branch: `phase-3/learn-mvp`, cut from `main`.

## 3.7a — MVP (this PR)

### What ships

1. **Tree schema** — `src/features/learn/tree/schema.ts`:
   ```ts
   export interface LearnNode {
     id: string;
     title: I18nString;
     complexity: 1 | 2 | 3 | 4 | 5;
     estimatedMinutes: number;
     prerequisites: readonly string[]; // stored but not enforced yet (3.7e)
   }
   export interface LearnUnit {
     id: string;
     title: I18nString;
     nodes: readonly LearnNode[];
   }
   export interface LearnTree {
     examTaxonomy: string;
     units: readonly LearnUnit[];
   }
   ```
2. **Two trees**:
   - `tree/nmt-math.ts` — ~47 nodes, 6 units (Numbers → Algebra → Functions →
     Geometry → Stereometry → Stochastics). Hlib approved AI-drafted syllabus;
     he'll edit later against the real one.
   - `tree/ielts.ts` — 4 units (Listening / Reading / Writing / Speaking),
     ~10 nodes each; sub-skills lifted from `LANGUAGE_SECTIONS` +
     the standard IELTS band descriptors' skill list.
3. **learn-store** — `src/stores/learn-store.jsx`:
   - Shape: `{ [examTaxonomy]: { [nodeId]: { mastery: "locked"|"unlocked"|"bronze"|"silver"|"gold"|"legendary", attempts: number, lastReviewedAt: number|null } } }`
   - Localstorage key `learn_progress_v1` added to `PERSONAL_DATA_KEYS` (auth-store.jsx) — synced across devices via the same pipeline every other store already uses. No new Supabase table needed for MVP; the user_data blob is enough.
4. **Teach** — Sonnet-generated concept card. Reuses `window.brainComplete`. No KaTeX/SVG diagram (v2 in 3.7b or its own slice).
5. **Drill** — 5 exercises. MCQ (existing shape from QuickCheck) + `fill_in` with case-insensitive whitespace-collapsed string match. `math.js`/KaTeX equivalence: v2. Wrong answer never costs anything (no hearts yet), just shows the explanation.
6. **Prove** — 3 exam-style questions, timer. ≥2/3 correct → node.mastery = "bronze". Prove questions go through `dedupeAgainstQuestionBank` (existing pipeline from §3a).
7. **LearnMain** — vertical list of units, each rendering its nodes as a row (mastery icon + title + estimated time). Tap → bottom sheet (title/complexity/estimated) with Start / Skip-to-Prove. No SVG lines / locks (v2).
8. **Route** — `App.tsx` case `"study"` swaps `StudyHub` → `LearnMain`. StudyHub component stays in the bundle for one release as a rollback path (behind a dev flag), then removed.

### What deliberately does NOT ship in 3.7a

Everything above the MVP row in the table. Including:

- Skill-tree SVG lines / prerequisite locks (v2 — 3.7e)
- Match / order / drag_drop / explain / audio / speaking exercise types (3.7b, 3.7g)
- Hearts, energy, streak-freeze (3.7c)
- Silver / Gold / Legendary transitions + SM-2 (3.7d)
- Boss levels (3.7e)
- AI Coach overlay (3.7f)
- Free/Pro gating (3.7i — no billing yet)
- Playwright E2E (3.7j)
- Video-narrated Teach (3.7h — real infra needed)

## Decision Log additions

| # | Decision | Answer |
|---|---|---|
| 41 | Full 3.7 in one PR? | No. 200+ hours, multiple external-account blockers. MVP 3.7a first, everything else queued behind it. |
| 42 | Syllabus source for NMT Math | Hlib approved AI-drafted approximation for MVP; he'll edit against the real syllabus post-ship. Not a launch blocker — the tree structure is right, node titles/order can be edited without a schema change. |
| 43 | learn_progress table vs user_data blob | Blob for MVP — matches every other store, one sync pipeline. Separate table only when we need cross-user queries (leaderboards, analytics) — not this slice. |
| 44 | OpenAI as second AI vendor for TTS / Whisper | Still not autonomous. 3.7g (Speaking) and 3.7h (Video Teach) both blocked pending Hlib's call, matching Decision Log #39. |
| 45 | ffmpeg on edge functions | Not possible on Vercel/Supabase edge as-is. Video generation (3.7h) needs a Docker container path or Vercel Functions Pro at 250MB+. Decide alongside the OpenAI-TTS call. |
| 46 | Free/Pro gating without billing | Deferred. Same reason Trial-end email was deferred (Phase 3.5) — building a paywall against a non-existent billing system is dead code. |

## Reversibility

- 3.7a is behavior-additive: `StudyHub` component stays in the bundle for the first release, so if `LearnMain` regresses something we didn't anticipate, one-line revert of the `case "study"` swap in `App.tsx` gets the old screen back.
- `learn-store` uses its own localStorage key, so nothing existing depends on its data yet.
- Tree JSON is data, not code — errors in node titles are hot-fixable without a migration.

## What could break silently

| # | Risk | Detector |
|---|---|---|
| 1 | AI-drafted NMT tree has topic titles that don't match the real syllabus → questions Sonnet generates in Teach/Prove are subtly off-topic | Hlib manually reviews the tree, files a follow-up per bad node — the schema separates title from id so a rename doesn't affect stored progress |
| 2 | learn-store's mastery state syncs but the tree schema evolves later, breaking foreign-key-like references to nodeId → user loses progress on renamed nodes | migrateProfile-style pattern in learn-store filters out unknown nodeIds silently; a shrunk store is better than a crash |
| 3 | Prove uses dedupe pipeline but its questions are shorter / more schematic than Practice's → hash collisions between Prove questions and Practice questions get treated as duplicates cross-mode | acceptable — one taxonomy per exam, hash-collision means someone's already seen the concept; the retry pipeline swaps to a fresh one |
| 4 | Route swap breaks users mid-way through a StudyHub flow in production (unlikely — StudyHub is stateless) | rollback path documented above |
