# AI Exam Coach — Agent Context

Read this first. It's the shortest path from cold to productive on this repo.

## What this is

Web app that helps students prepare for standardised exams (NMT, SAT,
IELTS, TOEFL, Duolingo, GCSE, A-Level, ЗНО). Targets Sept 1, 2026
launch. Live at https://ai-exam-coach-v2.vercel.app.

Owner: Hlib (single-person team). GitHub: `pakhomchik2008/ai-exam-coach-v2`.

## Stack

- **Frontend**: React 18, Vite 8, TypeScript 5 for new code, legacy `.jsx`
  files kept and gradually migrated. See `src/bootstrap.ts` — every
  legacy module publishes onto `window.*` in a load-bearing order (audit
  §4.3 documents seven silent-fail dependencies between them).
- **Auth + DB**: Supabase. Client: `src/stores/auth-store.jsx`. Sync
  layer: `src/lib/data-sync.ts` patches `localStorage.setItem` so every
  store's writes push to `user_data` without each store knowing about
  Supabase. `PERSONAL_DATA_KEYS` in auth-store.jsx is the source of
  truth for what syncs.
- **AI**: Anthropic Claude via a server proxy (`api/complete`). Client
  helper: `window.brainComplete` in `src/lib/ai-brain.jsx`.
- **Hosting**: Vercel (Hobby plan). Cron in `vercel.json`. Prod URL is
  the canonical alias; per-deploy alias also exists.
- **Notifications**: Resend (email) + OneSignal (web push, Phase 3.5).
  Both best-effort — missing keys → silent no-op, never blocks.
- **Math rendering**: KaTeX (self-hosted fonts). Both the Learn theory
  reader and the AI Coach chat prompt the model to emit LaTeX.
- **Testing**: Vitest, 370+ tests. `npm test` / `npm run typecheck` /
  `npm run lint` / `npm run build` are the gate.

## Standing rules (do not override without asking)

- **Hlib approves every merge.** Never merge without an explicit "мержи" /
  "merge" / equivalent, unless he said "мержи все теперь" (blanket).
- **No DDL to production Supabase from code.** SQL migrations go in
  `supabase/NN_*.sql`; Hlib runs them by hand via the Supabase SQL
  editor. Client code degrades gracefully (`PGRST205` for missing
  tables, `PGRST202` for missing RPCs) until he does.
- **Never touch API keys or secrets.** Ask, don't guess. Anything that
  looks like a real key surfaced in chat needs to be rotated.
- **Each phase gets its own branch + plan doc.** `phase-3/*`,
  `phase-3.7c/*`, etc. Plan docs live in `docs/`.
- **CAVEMAN MODE.** Terse Russian in chat responses. Drop articles,
  filler, hedging. Code / commits / security stay normal English.
- **Grill Hlib.** For any design decision that isn't obvious, use
  `AskUserQuestion` before coding. He asked for this explicitly.
- **When Hlib writes in Russian/Ukrainian**, respond in Russian.

## Repo layout

```
api/                             Vercel serverless functions
  complete.js                    AI proxy (server-side key)
  notifications-cron.js          Daily cron for 5 email triggers
  unsubscribe.js                 Unauthenticated GET unsubscribe
docs/                            Plan docs — READ THESE
  phase-1-plan.md ... phase-3-7-plan.md
src/
  bootstrap.ts                   Ordered load of every legacy module — DO NOT REORDER
  main.tsx                       React entry
  app/App.tsx                    Route switch (case "study" → LearnMain, etc.)
  components/AppNav.jsx          Nav — id must match App.tsx case
  features/
    chat/AIChat.jsx              THE big one. AI Coach modes, Practice Engine, Speed Round, Exam Sim, Learn (theory reader + flashcards)
    dashboard/                   Home
    learn/                       Phase 3.7a Learn tree (skill-tree UI)
      tree/nmt-math.ts           47-node NMT syllabus (AI-drafted, Hlib edits)
      tree/ielts.ts              40-node IELTS syllabus
      tree/schema.ts + index.ts
      LearnMain.jsx              Vertical unit list + node runner (Teach/Drill/Prove)
    onboarding/QuickOnboarding.tsx  5-step wizard (Phase 3d)
    study/                       StudyHub (Tools tab), ExamRecap, SessionRecap
    settings/Settings.jsx        Notification toggles, profile budget
  i18n/i18n.jsx                  5 languages (en/uk/ru/fr/de). nav_* keys drive AppNav labels
  lib/
    data-sync.ts                 The one place localStorage syncs to Supabase
    exam-attempts.ts             attempt history for ExamRecap
    exam-specs.ts                canonical exam formats
    math-render.ts               KaTeX + prose escape (used by _md in AIChat)
    push.ts                      OneSignal web push
    question-novelty.ts          Hash + pg_trgm dedup for AI questions
    scales.ts                    Real exam score scales
    speech.ts                    SpeechSynthesis for Learn narration
    svg-sanitize.ts              DOMPurify wrapper for AI SVG diagrams
    sync-reconcile.ts            Last-write-wins reconciler
  stores/                        Legacy jsx stores, all publish on window
    auth-store.jsx               THE PERSONAL_DATA_KEYS list lives here
    brain-store.jsx              Mastery / XP
    exams-store.jsx              Exam definitions
    learn-store.jsx              Node mastery (Phase 3.7a)
    mistakes-store.jsx           Journal
    profile-store.jsx            User settings + notify* toggles
    schedule-store.jsx           Study plan (Phase 3g: weekly window)
supabase/
  01..17_*.sql                   Ordered migrations. Hlib runs by hand.
vercel.json                      Cron + rewrites
```

## Architecture patterns

- **Legacy stores** publish `getFoo` / `saveFoo` / `subscribeFoo` /
  `migrateFoo` on `window`. Migration function handles version bumps
  and invalid data by resetting to defaults — never throws.
- **New TS modules** import normally, but if they need to reach the
  legacy layer they call `window.*` too. Bootstrap order matters.
- **Sync**: patch `localStorage.setItem` in `data-sync.ts` once. Every
  store gets sync for free. `PERSONAL_DATA_KEYS` in auth-store.jsx is
  the allowlist for what pushes.
- **Graceful degradation**: table/function missing → feature no-ops,
  never blocks. Same pattern for OneSignal, Resend, pg_trgm RPC.
- **`window.brainComplete`** for AI calls — never call
  `window.claude.complete` directly, `brainComplete` injects
  `buildLearnerContext()` + language directive.

## External services & environment variables

Vercel → Settings → Environment Variables. All server-side keys are
Sensitive. Client-visible values start with `VITE_`.

| Env var | Where | Purpose |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | server | RLS bypass for cron / unsubscribe |
| `RESEND_API_KEY` | server | Email send |
| `RESEND_FROM` | server (opt) | Sender address (default: sandbox) |
| `APP_URL` | server (opt) | Base URL for unsubscribe links |
| `CRON_SECRET` | server | Vercel auto-sets; validated in cron handler |
| `ONESIGNAL_APP_ID` | server | Push send target |
| `ONESIGNAL_REST_API_KEY` | server | Push send auth |
| `VITE_ONESIGNAL_APP_ID` | client build | Baked into bundle at build time — needs a new deploy to take effect |

Supabase project: `cyftpdiabopydwytyudt`. Migration files 01–17 in
`supabase/`. **Any new migration must include a `-- verification` block
at the bottom that Hlib can copy-paste to check.**

## Phase status (as of Aug 2026)

Deployed to prod:
- **Phase 1**: Vite + TS migration, tests, CI
- **Phase 2**: bug fixes from audit, calendar verification, data-sync
- **Phase 3a-3d**: sync correctness, novelty engine (hash-dedup),
  canonical exam specs, ExamRecap, 5-step onboarding
- **Phase 3e**: studyDays picker, per-day cap
- **Phase 3f**: weekly plan window, rollover prompt, IELTS sections,
  confidence step removed
- **Phase 3.5**: email notifications via Resend + Vercel Cron; web push
  via OneSignal (second channel on same 5 triggers)
- **Phase 3.7a**: Learn section MVP — skill tree + Teach → Drill →
  Prove → Bronze mastery
- **Phase 3.7b**: LessonEngine → pure theory reader with KaTeX;
  Study Tools tab (StudyHub restored to nav); math-aware chat
- **Phase 3.7c**: Learn method picker + flashcards slide reader
  (6-10 cards, AI decides count)
- **Phase 3.7d**: Learn enrichments — AI SVG diagrams, YouTube search
  button, related concepts pills, voice narration

Not yet built (planned):
- Semantic near-dup via pg_trgm — code shipped, SQL migration
  `supabase/16_question_similarity.sql` needs to be run
- 3.7e Boss levels + prereq locks + SVG tree lines
- 3.7f AI Coach overlay (streaming context-aware chat)
- 3.7c-follow SM-2 spaced repetition (Silver / Gold / Legendary
  transitions)
- 3.7 hearts + streak polish
- 3.7 match / order / drag_drop / explain exercise types
- Native iOS via Capacitor + APNs (blocks OneSignal switch to native)
- Trial-end email (blocked: real Stripe billing missing)
- Video-narrated Teach (blocked: OpenAI TTS + ffmpeg on edge)
- IELTS Speaking mic input (blocked: OpenAI Whisper)
- Free / Pro paywall (blocked: no billing yet)
- Playwright E2E (blocked: no Playwright installed)

See `docs/phase-3-plan.md` and `docs/phase-3-7-plan.md` for the honest
slice map + Decision Log (currently at entry #46).

## Coding style

- **Don't add features, refactoring, or abstractions beyond what the
  task requires.** A bug fix doesn't need surrounding cleanup.
- **Comments explain WHY, not WHAT.** Every file should open with a
  header that says why the file exists and what it does that isn't
  obvious. Inline comments only for non-obvious constraints, workarounds,
  or surprising behavior. No "// increment counter" comments.
- **Prefer editing existing files over creating new ones.** New file
  needs a real reason.
- **Never invent English abbreviations** (`cfg`, `impl`, `req`) — they
  tokenize the same as the full word and cost readability.
- **Test files** live next to their target: `foo.ts` → `foo.test.ts`.
- **When migrating a legacy jsx to tsx**, keep the same window-global
  contract, just add types. Don't restructure at the same time.

## Common workflows

### Adding a new phase feature

1. Create branch: `phase-3.7X/short-slug`
2. If it needs a plan, write `docs/phase-3-7X-plan.md` first with
   MVP scope + deferred items + Decision Log entries + reversibility
   notes + "what could break silently" table
3. Add SQL migration if needed (`supabase/NN_*.sql` with verification
   block); note it in the PR body so Hlib runs it manually
4. Write tests before or during
5. `npm run typecheck && npm run lint && npx vitest run && npm run build`
6. Commit with a body that explains WHY, not what
7. Push, open PR, wait for Hlib to say "мержи"

### Adding a new window global

1. Publish via `Object.assign(window, { fooBar })` at module bottom
2. Add to `REQUIRED_GLOBALS` in `src/bootstrap.ts` so a missing publish
   errors loudly rather than silently blanking a screen
3. If the store owns synced data, add its localStorage key to
   `PERSONAL_DATA_KEYS` in auth-store.jsx

### Debugging sync

- Check `PERSONAL_DATA_KEYS` includes the localStorage key
- Check `data-sync.ts` patch is active (it patches once at module init)
- Reconciler is `sync-reconcile.ts`; realtime handler in `data-sync.ts`

### Working with AI-generated content

- Always `window.brainComplete`, never `window.claude.complete` directly
- Structured JSON responses: use `window.parseJSON` or the fenceless
  slice pattern (`.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)`)
- Set a race timeout (30-45s) so a hung generation doesn't wedge the UI
- If the content becomes part of the shared question bank, run it
  through `checkAndRecordQuestion` (question-novelty.ts) for dedup

## Do NOT

- Never mock the database in tests — integration tests hit real
  Supabase or use faked clients matching the same surface (see
  `question-novelty.test.ts`)
- Never `git push --force` to main
- Never skip pre-commit hooks with `--no-verify`
- Never guess a syllabus — either ask Hlib or clearly note it's AI-drafted
- Never `import` from another store; use `window.getFoo()` — the load
  order in bootstrap.ts is the only serialization guarantee
- Never add a new AI vendor (OpenAI, Google, etc.) autonomously —
  Decision Log #39 requires an explicit call

## When in doubt

Read the plan doc for the current phase. Then ask Hlib.
