# Phase 0 Audit — AI Exam Coach v3

Date: 2026-08-09. Scope: user bug list + code-level verification + delta against `ARCHITECTURE_AUDIT.md` (2026-08-01, commit `4cb4ea1`, still current — no code changes since).

## Calendar history

Working Google-Calendar-style grid built across:
- `d8cc200` feat(calendar): Google-Calendar-style weekly study calendar
- `2b0fe38` fix(calendar): critical drag-to-wrong-day bug + regression suite
- `260df35` feat(calendar): sidebar, floating +, personal events, recurring sessions
- `39c5fef` feat(calendar): AI Actions with preview/accept/reject

Then `3f996d9` "FintechX redesign" rewrote `StudyCalendar.jsx` wholesale (+792/-128 vs `d8cc200`). File is still 841 lines and defines `StudyCalendar`, `CalendarHub` — not deleted. Bug is a **regression inside the redesign**, not a missing file. Needs a live click-through in Phase 1 to isolate which specific interaction (drag/resize/create/sidebar) broke; not diagnosable from diff alone at this budget.

## User-reported bugs — verified against code

| # | Bug | Status | Evidence |
|---|---|---|---|
| 1 | Study → PDF browse doesn't accept files | Needs live repro | `StudyHub.jsx:269,554` has `onDrop`/`onClick` handlers wired; input element not found by name in `StudyHub.jsx` grep — likely the drop handler, not an `<input type=file>`, backs the "browse" click target. Rebuild with `react-dropzone` per plan. |
| 2 | PDF upload cap unclear | Confirmed | `onboarding-steps.jsx:102` accepts `.pdf,.png,.jpg,.jpeg,.ppt,.pptx,.doc,.docx,.txt`, no `maxFiles`/`maxSize` constant found anywhere in that file. No enforced cap client or server side. |
| 3 | Calendar broken | **Not reproducible — closed** (Phase 2, `phase-2/calendar-fix`) | The live click-through this finding asked for: seeded a real exam + 70 generated sessions, then in the actual running app — Month view day-selection, Week view click-empty-slot-to-create (`onGridClick` → `QuickCreateModal`, confirmed opens with the correct clicked date/time), and drag-to-move (confirmed via `window.getSchedule()` — a dragged session's `startTime` updated and `manual` flipped to `true`) all work correctly. Sidebar (AI Actions, upcoming exams, weekly goal, filters, upcoming events, study stats) and the floating "+" all render. No code change was needed. Likely already fixed in-between the `3f996d9` redesign and Phase 0's `2026-08-09` snapshot — this finding was explicitly hedged ("not diagnosable from diff alone") pending the live check that's now done. |
| 4 | Add Exam wizard shows Subject step for IELTS/TOEFL/PTE/Duolingo | **Not reproducible** — closed | Verified live in the running app (Phase 2a): `window.examType(id).sectionBased` returns `true` for `ielts`, `toefl`, and `duolingo`, so the Subject step is already correctly skipped for all three. The flag comes from the `qualifications` DB table via `_rowToExamType` (`qualifications-store.jsx:36`), which does preserve it, and the remote catalog is cached in `localStorage` and replayed synchronously at boot — so there is no race window either. **PTE is a non-issue for a different reason: it is not in the `qualifications` table at all and therefore never appears in the picker** (verified: `EXAM_TYPES` contains gcse, alevel, sat, act, ap, ib, nmt, matura, abitur, uni, ielts, toefl, duolingo, custom). Adding PTE is a content/DB decision, not a code fix. Chasing this one did surface a real bug — see #30. |
| 5 | Practice tab has no per-topic drill | Partially confirmed | Only two AI-driven modes exist in `AIChat.jsx`: a 5-topic "speed round" (`:873`) and a full "Practice mode — full exam simulator" (`:3021`). No section→subtopic→length(5/10/20/50) picker as specced in Phase 2.1 item 5. |
| 6 | AI Chat has no file-attach button | Confirmed | Zero matches for `attach`/`paperclip`/file-input pattern in `AIChat.jsx`. Chat is text-only today. |
| 7 | Exam creation has no exam-date field | **Contradicted** | `exam-wizard.jsx:649` already has `<input type="date" value={s.examDate} min={todayISO}...>` per subject, plus `examDate` threaded through commit path (`:183,189,232,243,331,781`). Field exists per-subject; if user saw it missing, likely a specific exam-type path (e.g. english_proficiency, no-subject flow) skips it — needs live repro to find which. |
| 8 | Onboarding "when u are available" step | Confirmed | `onboarding-steps.jsx:225` `AvailabilityGrid` (blackout-slot picker) still wired into `exam-wizard.jsx:75`. Per Phase 2.1 #8, delete and replace with single numeric hours/day input (`AiHoursModal` at `:extracting` already exists as an AI-estimate variant — check for reuse before deleting). |
| 9 | Google login has no email verification / password backup path | Confirmed | Zero matches for `verify`/`verification` in `auth-store.jsx`. No Resend-based verification flow exists; matches Phase 2.2 spec gap. |
| 10 | Predictor uses letter grades in places | Confirmed, and worse than reported | `exams-store.jsx` has canonical `letterBand` (80/60/40). `AIChat.jsx:535` and `:2169` use a **different** scale (90/75/60) for post-quiz grading. `AIPlan.jsx:67` uses yet another (80/60/40, matches exams-store). **Three inconsistent grade scales**, not just stray letter-grade UI — same 82% shows as different letters in different screens. Root-cause fix is Phase 2's numeric `scales.ts`, which removes all three. |
| 11 | Level → background doesn't reflect all tiers | Confirmed | `tier-theme.jsx:17-21`: only `legend` (level 12) has `theme: true`; `novice`, `scholar`, `adept`, `master` all `theme: false`. One-line-per-tier fix. |
| 12 | Multi-device sync doesn't work | Confirmed, systemic | All app data in `localStorage`. 23 distinct keys in use; cross-tab sync (`index.html` `SYNCED_KEYS`) covers only 7 — `courses_v1`, `brain_mastery_v1`, `brain_kb_v1`, `brain_memory_v1`, `brain_xp_v1` (16 keys total) are unmonitored even within the *same browser's tabs*, let alone across devices. Phase 2's Supabase migration is required, not optional polish. |

## Architecture-level findings (from `ARCHITECTURE_AUDIT.md`, still valid — no commits since)

13. `_ds_bundle.js` (384 KB, stale, dated 2026-06-28) shadow-defines 25 of the app's live component globals — a partial deploy or Babel parse error silently serves five-week-old UI with no error. `index.html:23`.
14. Positional topic identity (`examId::topicIdx`) used in 108 places across 10 files; `fingerprintForScheduling` (`schedule-store.jsx:437-441`) excludes the topics array from its hash, so an AI topic-list reorder silently corrupts mastery history with no way to detect or reverse it after the fact.
15. `sessionLengthMin || 45` fallback duplicated in 14 places across 10 files instead of one canonical constant.
16. `topicCount || 10` duplicated across 8 call sites; `weeklyHours || 12` across 4; risk thresholds (`>=60/>=35`) duplicated across 8 sites with two different threshold sets in use simultaneously.
17. 246 hardcoded color literals bypass the 269-property design-token system; 128 are raw white — concentrated in `AIChat.jsx` (38) and `StudyHub.jsx` (27). Blocks dark mode entirely and undermines the tier-theming feature (finding #11) even after that gets fixed.
18. Adding a new exam type still touches 3+ places (`onboarding-data.jsx` × 3 locations, `exam-wizard.jsx` × 2 fallback Sets, `curriculum-data.jsx`) despite the DB-catalog migration meant to reduce this to 1.
19. Navigation tabs defined independently in 3 places (`AppNav.jsx`, `index.html` router, `i18n.jsx` keys) and already drifted — `nav_schedule` / `"schedule"` route are dead/unreachable.
20. 906 call sites use a positional `L(en, uk, ru, fr, de)` translation helper, redefined 40 separate times across 20 files (11 copies inside `AIChat.jsx` alone). Adding a 6th language (needed for Phase 4: German + French are already required) means editing the arity of 40 functions and all 906 call sites unless refactored to `L5(t, {en,uk,...})` first.
21. `subscribeCourses` (`course-store.jsx:149`) has zero listeners anywhere in the app — `saveCourse` mutations (e.g. `AIChat.jsx:3063` mid-chat topic add) silently fail to trigger any re-render.
22. `mistakes-store.jsx` never calls its own notify/bump function on `clearMistake`, `clearAllMistakes`, `recordMistakeRetry`, or `snoozeOverdueMistakes` — only `logMistake` wakes any subscriber, and only because `brain-store.jsx` monkey-patches it.
23. 4 script tags (`data.jsx`, `onboarding-data.jsx`, `tweaks-panel.jsx`, `calendar-tests.jsx`) load with no `?v=` cache-bust query — `onboarding-data.jsx` is precisely the highest-churn config file (edited whenever an exam type is added), so a shipped fix there can serve stale from CDN cache indefinitely.
24. Three asset paths (`styles.css`, `favicon.svg`, `_ds_bundle.js`) use `../../` relative paths that only resolve because the app happens to be served from `/` — breaks under any subpath deploy (embed, path-prefixed preview alias).
25. `allocateBudget()` (the core scheduling engine) calls unmemoized `getMastery()` inside a nested loop — for 5 exams × 30 topics it triggers ~750 full JSON-parse-and-migrate passes over `courses_v1`, which can carry 100 KB–1 MB of embedded PDF-extracted knowledge-base content per course. Runs on every `saveExams` and every budget-field change.
26. Six sites resolve exam/course by display **name** instead of id (`StudySession.jsx:60,82`, `session-store.jsx:83,96`, `Dashboard.jsx:114`) — the product explicitly supports multiple exams sharing a name (midterm + final of the same subject), so these resolve to whichever is first in the array, misattributing study data to the wrong exam.
27. `StudySession.jsx:66` falls back to `topicIdx = 0` when a session can't be resolved — a silent write of real mastery data onto the wrong topic, not a no-op.
28. **Cross-tab sync never remounts the screen it claims to.** The old inline `<script>` in `index.html` carried a detailed comment stating that `key={dataVersion}` forces the current screen to remount and re-read `localStorage` when another tab writes — but no such `key` was ever applied to any element. `setDataVersion` only re-renders `App`; child screens read `localStorage` in `useState` initialisers and on mount, so they keep serving stale data. Combined with finding #12 (only 7 of 23 keys are even watched), cross-tab sync is substantially non-functional. Found while porting the inline script to `src/app/App.tsx` in Phase 1; deliberately **not** fixed there (Phase 1 is behavior-frozen) — the remount has real side effects on in-progress form state and needs a test before it is switched on. Fix belongs with the Phase 2 Supabase sync layer.
29. **Logging out left every personal `localStorage` key in place — two separate bugs, the header button worse than the Settings one.** `Settings.jsx`'s own `logOut()` called `window.clearSession()`, but that function only ever removed the auth session key (`auth_session_v1`), never the student's exams, mastery, mistakes, or chat caches. Worse: the header "Log out" button (`AppNav`, wired in `App.tsx`) called `setRoute("landing")` directly and never invoked `clearSession()` at all — the most commonly used logout path left the Supabase session itself intact too. On a shared device (school computer, family laptop), the next person to open the app saw the previous student's full history. Fixed in Phase 2a: `clearSession()` now clears every personal-data key (`PERSONAL_DATA_KEYS` in `auth-store.jsx`) while explicitly preserving the shared, non-personal catalog caches; the header button now calls `clearSession()` before switching route. Regression-tested in `auth-store.test.ts`, and verified live against the dev server (seeded data → logout → confirmed only shared/non-personal keys survive).
30. **An unknown qualification id silently resolves to A-Level.** `examType()` is `EXAM_TYPES.find((e) => e.id === id) || EXAM_TYPES[1]` (`onboarding-data.jsx:33`), and the DB-merged override is the same shape (`qualifications-store.jsx:69`). `EXAM_TYPES[1]` is **A-Level**. So any id not in the catalog — a saved exam whose qualification was later removed from the `qualifications` table, a typo, an exam created on a build that offered an id this build does not (e.g. `pte`) — does not fail, does not warn, and does not fall back to `custom`. It silently becomes A-Level, and the student inherits A-Level's grade scale (A*–E), its 21 subject presets, its exam boards (AQA/Edexcel/OCR/WJEC), and its `enMedium: true`. A НМТ student hitting this path would be shown British A-Level grading for their Ukrainian exam. Found while investigating bug #4 in Phase 2a. The right fallback is `custom` (which exists precisely for "an exam we do not model"), plus a Sentry breadcrumb so the unknown id is observable rather than silent — but changing it affects every consumer of `examType`, so it needs its own change with tests, not a drive-by edit inside an unrelated bug fix.

## Secrets — rotated

- `ANTHROPIC_API_KEY` — rotated, new key in Vercel env
- `SUPABASE_SERVICE_ROLE_KEY` — rotated, new key in Vercel env

No secrets found committed into tracked `.jsx`/`.ts` files (`.env.local` correctly gitignored).

**Phase 0 close gate:** PASS ✓

## Repo hygiene set up this phase

- `.editorconfig`, `.nvmrc` (Node 20 LTS), `.gitattributes` — pending, next commit in this branch.
- Branch protection on `main` — **requires GitHub web UI or `gh api`, needs your confirmation before I touch repo settings** (this is a shared/irreversible-ish setting, not a code change).

## Not yet done (explicitly out of scope for this pass)

- Full 60+ scenario manual QA checklist (`docs/qa-checklist.md`) — belongs to Phase 2+ once Playwright exists; doing it by hand pre-migration would be thrown away.
- Live-browser repro of items marked "Needs live repro" above — worth a short session once local dev server is up (Phase 1), cheaper than screenshotting the current no-build app tab-by-tab now.
