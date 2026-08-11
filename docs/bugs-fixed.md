# Bugs fixed

Running log for the Phase 2 work. Numbering continues `docs/audit.md` on the
`phase-0/audit` branch: 1–12 are Hlib's reported list, 13–27 came from
`ARCHITECTURE_AUDIT.md`, and 28+ are found while working.

| # | Bug | Commit | Notes |
|---|---|---|---|
| 10 | Three mutually inconsistent grade scales (80/60/40 vs 90/75/60), so the same 82% showed as a different letter on different screens | `a7666c5` | Replaced by `src/lib/scales.ts` — one canonical **numeric** scale per exam (IELTS 0–9 by 0.5, НМТ 100–200, SAT 400–1600/200–800, GCSE 1–9). Nothing returns a letter now. 36 unit tests |
| 11 | Only `legend` (level 12) themed the background, so levelling through the first four tiers changed nothing visible | `a7666c5` | All five tiers themed. Lower four are subtle light-mode ambient washes; `legend` keeps its dark night theme. See `src/styles/tokens/tiers.css` for why the lower tiers must not override the accent tokens |
| 8 | Onboarding "when are you available" step — a 21-toggle blackout grid | `5c09c8c` | Removed from the wizard, replaced with a single hours-per-day input. `blackoutSlots` is still honoured by the scheduler for students who already saved some |
| 29 | **Logout left personal data on the device.** Found while working — clearing the session did not clear exams, schedule, mistakes, brain state or XP, so the next person to open the browser on a shared/library machine saw the previous student's data | `ce49d24` | Logout now clears the app's own `localStorage` keys |
| 30 | **`examType()` resolved any unknown exam id to A-Level.** A misspelt, DB-renamed, or not-yet-loaded exam id silently inherited A-Level's A*–E grade scale and AQA board list, with nothing logged | pending | Unknown ids now resolve to `custom` — the entry that exists for exams we do not model — and are reported once to Sentry/console. Fixed in both the bundled catalog and the DB-merged one, sharing a single implementation. 19 unit tests |

## Found, not yet fixed

| # | Bug | Where | Why deferred |
|---|---|---|---|
| 28 | Cross-tab sync never remounts the screen it claims to — the old code carried a comment describing a `key={dataVersion}` remount that was never applied to any element, so child screens keep serving what they read on first mount | `src/app/App.tsx` | The remount has real side effects on in-progress form state and needs a test first. Belongs with the Phase 2 Supabase sync layer |
| 17 | 246 hardcoded colour literals bypass the design tokens; 128 are raw white | app-wide, worst in `AIChat.jsx` (38) and `StudyHub.jsx` (27) | Blocks real dark mode and puts holes in the `legend` tier theme. Needs its own pass — mechanical but large |
| 14 | Positional topic identity (`examId::topicIdx`) in 108 places; a topic-list reorder silently reattributes mastery history to the wrong topic, irreversibly | `brain-store.jsx`, `schedule-store.jsx`, others | The highest-severity data-integrity issue in the codebase. Needs the detection step first (log when a completed session's stored topic name no longer matches its decoded index) before any migration |
