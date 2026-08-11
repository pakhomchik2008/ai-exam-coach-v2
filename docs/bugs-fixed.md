# Bugs fixed

Running log for the Phase 2 work. Numbering continues `docs/audit.md` on the
`phase-0/audit` branch: 1–12 are Hlib's reported list, 13–27 came from
`ARCHITECTURE_AUDIT.md`, and 28+ were found while working.

| # | Bug | Commit | Notes |
|---|---|---|---|
| 10 | Three mutually inconsistent grade scales (80/60/40 vs 90/75/60), so the same 82% showed as a different letter on different screens | `a7666c5` | Replaced by `src/lib/scales.ts` — one canonical **numeric** scale per exam (IELTS 0–9 by 0.5, НМТ 100–200, SAT 400–1600/200–800, GCSE 1–9). Nothing returns a letter now. 36 unit tests |
| 11 | Only `legend` (level 12) themed the background, so levelling through the first four tiers changed nothing visible | `a7666c5` | All five tiers themed. Lower four are subtle light-mode ambient washes; `legend` keeps its dark night theme. See `src/styles/tokens/tiers.css` for why the lower tiers must not override the accent tokens |
| 8 | Onboarding "when are you available" step — a 21-toggle blackout grid | `5c09c8c` | Removed from the wizard, replaced with a single hours-per-day input. `blackoutSlots` is still honoured by the scheduler for students who already saved some |
| 29 | **Logout left personal data on the device.** Clearing the session did not clear exams, schedule, mistakes, brain state or XP, so the next person to open the browser on a shared or library machine saw the previous student's data | `ce49d24` | Logout now clears the app's own `localStorage` keys |
| 30 | **`examType()` resolved any unknown exam id to A-Level.** A misspelt, DB-renamed, or not-yet-loaded id silently inherited A-Level's A*–E grade scale and AQA board list, with nothing logged | `a88e640` | Unknown ids now resolve to `custom` — the entry that exists for exams we do not model — and are reported once to Sentry/console. Fixed in both the bundled catalog and the DB-merged one, sharing one implementation. 19 unit tests |
| 2 | Upload caps were undocumented and unenforced — the onboarding UploadZone took unlimited files of unlimited size | `42fea7e` | `src/lib/upload-limits.ts` is the single source of truth (20 files, 25 MB each, 200 MB total) with named, translated rejection messages. Checks run type → per-file size → count → running total, so a 40 MB `.exe` is reported as the wrong *kind* of file rather than as an oversized one. 40 unit tests |
| 2a | The Study tab took **one** file per drop — `handleDrop` read `files[0]` and the input had no `multiple`, so a multi-file drop silently discarded everything after the first | `1686429` | State model reworked from three mutually exclusive slots (`imageFile`/`pdfFile`/`docFile`) to one `files` array. All attachments go into a single multimodal message, so the study set covers the whole batch. Per-file extraction failures are collected rather than aborting the drop |
| 6 | AI Chat had no way to attach a file — it was text-only, so a photo of a textbook problem could not be sent at all | pending | Paperclip button, removable chips above the input, and multimodal send. Images go to Claude as vision blocks and PDFs as document blocks, so a photographed problem works as intended. Uses `CHAT_LIMITS` (5 files / 10 MB) rather than the study caps, because attachments are re-sent with the whole thread on every turn — a generous cap there multiplies token cost by thread length. An attachment with no text is a valid message |
| 5 | Practice had no per-topic drill — every exam's topics were flattened into one list and then **truncated to the first 12**, so a student with three subjects could not reach most of their own topics at all. Question count was derived from difficulty, so wanting 5 quick questions meant picking "Easy" | pending | Setup screen now has a subject picker (shown when there is more than one exam), an explicit 5/10/20/50 length, an optional countdown timer, and the full topic list in a scroll area instead of the first 12. Changing subject clears the topic selection, since the old picks belong to a different syllabus |
| 2b | Upload limits were client-side only — a cap in JavaScript the user is running is a UX affordance, not a control, and a signed-in student could fill the billed storage quota from a terminal | pending | `supabase/12_storage_limits.sql`. **Written but not applied — needs Hlib to run it** (see below) |
| 12 | Multi-device sync didn't exist — every exam, mistake, and mastery record lived only in one browser's `localStorage`, so nothing carried over between a laptop and a phone | pending | `supabase/13_user_data_sync.sql` mirrors the 14 personal-data localStorage keys into one generic per-user table, RLS-scoped, with Realtime enabled. `src/lib/sync-reconcile.ts` is the pure last-write-wins decision logic (compares server timestamps only, never a client clock) — full unit coverage. `src/lib/data-sync.ts` patches `localStorage.setItem` once at the single point every store's writes already pass through, so no store file changed. Deliberately does **not** redesign the data model into relational tables — see `docs/phase-2c-plan.md` for why that's a separate, riskier project blocked on audit #14. **SQL written but not applied — needs Hlib to run it** (see below). Verified locally that the app degrades silently without the table (clear `PGRST205` warning, no crash) and that a real store write (`saveProfile`) correctly triggers a push attempt — full realtime cross-device behavior can't be verified until the table exists |

## Needs Hlib to run

Two migrations have not been executed. Applying DDL to the production database
is not something I do without being asked, and I have no DB credentials locally
in any case. Both apply the same way: Supabase dashboard → SQL Editor → paste
the file → Run. Both are idempotent, so re-running either is safe.

**`supabase/12_storage_limits.sql`** — adds three layers, because each catches
what the others cannot:
1. bucket `file_size_limit` — per-object cap, enforced by Storage itself
2. bucket `allowed_mime_types` — per-object type, enforced by Storage itself
3. RLS policies + a trigger — per-user file count and total bytes, which Storage
   has no native concept of

Until it is applied, the client-side limits are the only thing standing between
a signed-in user and the storage bill.

**`supabase/13_user_data_sync.sql`** — the cross-device sync table (audit
#12). Until it is applied, the sync code degrades silently: every push/pull
fails with a clear `PGRST205` (table not found), logged as a console warning,
and the app keeps working exactly as it does today, purely off `localStorage`.
Nothing breaks by leaving this unapplied for a while; nothing syncs either.

## Found, not yet fixed

| # | Bug | Where | Why deferred |
|---|---|---|---|
| 28 | Cross-tab sync never remounts the screen it claims to — the old code carried a comment describing a `key={dataVersion}` remount that was never applied to any element, so child screens keep serving what they read on first mount | `src/app/App.tsx` | The remount has real side effects on in-progress form state and needs a test first. Belongs with the Supabase sync layer |
| 17 | 246 hardcoded colour literals bypass the design tokens; 128 are raw white | app-wide, worst in `AIChat.jsx` (38) and `StudyHub.jsx` (27) | Blocks real dark mode and puts holes in the `legend` tier theme. Mechanical but large — needs its own pass |
| 14 | Positional topic identity (`examId::topicIdx`) in 108 places; a topic-list reorder silently reattributes mastery history to the wrong topic, irreversibly | `brain-store.jsx`, `schedule-store.jsx`, others | The highest-severity data-integrity issue in the codebase. Needs a detection step first — log when a completed session's stored topic name no longer matches its decoded index — before any migration |
