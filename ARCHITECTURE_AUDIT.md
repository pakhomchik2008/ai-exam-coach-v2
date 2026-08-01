# Codebase Assessment — AI Exam Coach (`ai-exam-coach-deploy`)

**Commit:** `4cb4ea1` — "Block 3: DB-driven exam catalog + qualifications table"
**Date:** 2026-08-01
**Scope:** full static audit of every `.jsx`, `api/*.js`, `supabase/*.sql`, `tokens/*.css`, `index.html`.
**Constraint respected:** no build step, no bundler, no npm. Every recommendation below is implementable inside the `window`-globals + `<script type="text/babel">` model unless explicitly flagged as "requires a build step".

---

## 1. Executive Summary

- **Purpose**: A study-planning / AI-tutoring web app. A student declares exams, the app derives a syllabus (courses → topics), generates a time-budgeted study calendar, runs AI-driven study sessions, and tracks per-topic spaced-repetition mastery.
- **Tech Stack**: React 18 UMD + ReactDOM UMD from unpkg, `@babel/standalone` 7.29 in-browser JSX transform, JSZip, Supabase JS v2 UMD, Sentry CDN loader. Backend = Supabase (auth + `curriculum` + `qualifications` tables) and two Vercel serverless functions (`api/complete.js`, `api/fetch-url.js`). All user data is in `localStorage`.
- **Architecture Style**: Global-namespace modular monolith. 43 `.jsx` files, ~18,500 LOC, ~254 distinct `window` globals, no imports/exports, load-order-dependent. Layered by convention: `i18n → stores → AI layer → data → catalogs → components`.
- **Health Score**: **5.5 / 10**
  - **+** Genuinely disciplined store layer: every store has `migrateX()` normalisation on read *and* write, memoised snapshots, and `subscribe`/`notify`. Comments are unusually high quality and explain *why*, not *what*. Cache-bust discipline in the last 4 commits was 100%.
  - **−** Identity model (`examId::topicIdx`) is positional and used in 108 places; one AI-generated topic list in a different order silently rewrites a student's history. Zero automated test coverage outside one manual calendar suite. `api/complete.js` is an unauthenticated open proxy onto a paid Anthropic key. A stale 384 KB `_ds_bundle.js` shadow-defines 25 of the app's own component globals.
- **Top 3 Risks**:
  1. **Positional topic identity** (`examId::topicIdx`) — 108 references across 10 files; `fingerprintForScheduling` (`schedule-store.jsx:440`) deliberately excludes the topics array, so a topic reorder is silent, permanent mastery corruption.
  2. **Open AI proxy** (`api/complete.js:13-50`) — no auth, no origin check, no rate limit, `max_tokens: 8192`. Anyone who finds `ai-exam-coach-v2.vercel.app/api/complete` can bill the owner's Anthropic key indefinitely.
  3. **Silent-fallback shadowing** (`index.html:23`) — `_ds_bundle.js` (dated 2026-06-28) defines `Dashboard`, `Exams`, `Settings`, `Landing`, `AppNav`, `LANGS`, and 19 more. If any `.jsx` 404s or throws a Babel parse error, the June build silently renders instead of the app failing loudly.

---

## 2. Architecture Overview

```
                          index.html  (load order = the build system)
  ┌────────────────────────────────────────────────────────────────────────────┐
  │ CDN: React18 UMD ▸ ReactDOM UMD ▸ @babel/standalone ▸ JSZip ▸ supabase-js   │
  │      Sentry (line 7, first)                                                │
  │ _ds_bundle.js  ── design-system primitives + 25 STALE component globals ⚠   │
  └────────────────────────────────────────────────────────────────────────────┘
        │
        ▼   window.claude.complete()  (index.html:28-41)  →  POST /api/complete
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │ TIER 0  i18n.jsx                       LANGS, EXAM_SYSTEMS                  │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │ TIER 1  PERSISTENCE STORES  (localStorage; migrate-on-read+write; memoised)  │
  │   exams-store ──▶ course-store ──▶ schedule-store ──▶ profile-store         │
  │   auth-store (Supabase) ──▶ mistakes-store ──▶ session-store                │
  │   progress-metrics ──▶ brain-store (composes ALL of the above)              │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │ TIER 2  tier-theme  ▸ ai-enrichment  ▸ ai-brain  ▸ data.jsx                 │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │ TIER 3  CATALOGS                                                            │
  │   onboarding-data (bundled snapshot) ◀── qualifications-store OVERWRITES ⚠   │
  │   curriculum-data (78-row seed)      ◀── curriculum-store merges remote     │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │ TIER 4  tweaks-panel ▸ AppNav ▸ Landing ▸ onboarding-steps ▸ Combobox       │
  │         CurriculumStep ▸ exam-wizard ▸ Onboarding                           │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │ TIER 5  SCREENS  Dashboard ▸ CourseDetail ▸ DayDetail ▸ AIChat(290KB) ▸     │
  │   TodaysMission ▸ StudySession ▸ SessionRecap ▸ AIPlan ▸ BurnoutAlert ▸     │
  │   StudyHub ▸ MistakeJournal ▸ Progress ▸ Schedule ▸ StudyCalendar ▸         │
  │   calendar-tests ▸ Exams ▸ Settings                                         │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │ TIER 6  inline <script> in index.html: TWEAK_DEFAULTS, App(), ErrorBoundary │
  └─────────────────────────────────────────────────────────────────────────────┘

  Backend:  Supabase  ──  curriculum (public read / authenticated community insert)
                      ──  qualifications (public read)
                      ──  auth.users (email+password, OAuth)
            Vercel    ──  /api/complete   → api.anthropic.com  (claude-haiku-4-5)
                      ──  /api/fetch-url  → arbitrary http(s) (SSRF-hardened)
```

### Component table

| Component | Purpose | Key Files | Direct Deps (window globals consumed) |
|---|---|---|---|
| i18n | 68-key × 5-language dictionary + exam-board option groups | `i18n.jsx` (388 L) | none |
| Exams store | Canonical exam list; `migrateExam` normalisation; derives display "courses"; single wizard commit path | `exams-store.jsx` (423 L) | `getCourse`, `getSchedule`, `reconcileSchedule`, `saveSchedule`, `seedSessionsForExam`, `saveProfile`, `getProfile`, `topicIndexFromId`, `examType`, `computePriority` |
| Course store | The *new* central entity: topics (stable ids), knowledge base, shared per-topic mastery | `course-store.jsx` (157 L) | none (leaf) |
| Schedule store | Session entity; hour-budget allocation engine; reconcile; calendar mutations; 5 AI "proposals" | `schedule-store.jsx` (1042 L) | `getExams`, `getProfile`, `daysAway`, `fmtDateKey`, `sessionsNeeded`, `getMastery`, `computePriority` |
| Profile store | Global prefs + study budget; triggers `replanAllSchedules` on budget-field change | `profile-store.jsx` (109 L) | `replanAllSchedules` |
| Auth store | Supabase auth wrapper; sync-readable session cache | `auth-store.jsx` (155 L) | `window.supabase` (CDN), `saveProfile` |
| Mistakes store | Error journal + SRS review queue + badges/trends | `mistakes-store.jsx` (252 L) | none |
| Session store | The *active* study session overlay + mini-timer; recap builder | `session-store.jsx` (220 L) | `getExams`, `topicIndexFromId`, `brainCourses`, `markTopicsStudied`, `recordConfidence`, `recordCompletedSession`, `fmtDateKey` |
| Brain store | Unified learner model: SM-2 mastery, KB, learner memory, XP; `useBrain()` `useSyncExternalStore` | `brain-store.jsx` (724 L) | all Tier-1 stores + `getCourse`/`saveCourse` |
| AI layer | Single choke point for every model call; injects learner context; typed AI ops | `ai-brain.jsx` (329 L), `ai-enrichment.jsx` (211 L) | `getBrain`, `getExamKB`, `claude.complete`, `relabelPendingSessions` |
| Catalogs | Bundled exam-type + 78-row curriculum snapshot; remote merge from Supabase | `onboarding-data.jsx` (293 L), `curriculum-data.jsx` (1793 L), `curriculum-store.jsx` (346 L), `qualifications-store.jsx` (119 L) | `_supabase`, `claude.complete` |
| Wizard | 5-step exam creation; the only writer into `commitExamWizard` | `exam-wizard.jsx` (809 L), `CurriculumStep.jsx` (454 L), `onboarding-steps.jsx` (349 L) | `examType`, `SUBJECT_PRESETS`, `getCurriculum`, `createCourse`, `commitExamWizard` |
| AI Coach | 6 study-mode engines + chat, all in one file | `AIChat.jsx` (3189 L / 294 KB) | `useBrain`, `brainComplete`, `aiTutorReply`, `recordReview`, `addXp`, `logMistake`, `saveCourse` |
| Calendar | Month + week views, drag/resize/create, AI proposals | `StudyCalendar.jsx` (841 L) | schedule-store's full surface |
| Design system | Primitives (`SessionCard`, `GaugeRing`, `Button`, `ProgressBar`, `WeekStrip`) | `_ds_bundle.js` (384 KB) | — |
| Tokens | CSS custom properties (colors 108, typography 30, spacing 30, base 24, tiers 77) | `styles.css` → `tokens/*.css` | — |

---

## 3. Data & Control Flow

### 3.1 Cold boot

1. Sentry loader (`index.html:7`) — first, so it catches Babel/runtime errors from everything below.
2. React/ReactDOM/Babel/JSZip/supabase-js UMD, then `_ds_bundle.js` (`index.html:18-23`).
3. `window.claude.complete` shim installed (`index.html:28-41`) — the *only* client-side AI entry point.
4. 43 `<script type="text/babel" src=...>` tags (`index.html:89-131`). Babel-standalone fetches and executes them **in document order**; each ends by publishing its exports onto `window`.
5. Three files execute network/mutation side effects at load time:
   - `auth-store.jsx:42` — `_supabase.auth.getSession()` (async) + `:55` `onAuthStateChange`.
   - `qualifications-store.jsx:88-90` — replays the cached remote catalog **over** `window.EXAM_TYPES` synchronously; `:118` fires the fetch.
   - `curriculum-store.jsx:346` — fires `refreshRemoteCurriculum()`.
   - `brain-store.jsx:674-687` — monkey-patches `window.logMistake` in place.
6. The inline `<script type="text/babel">` (`index.html:133`) defines `App` and mounts.

### 3.2 Exam creation → schedule

```
ExamWizard (exam-wizard.jsx:108)
  └─ CurriculumStep resolves a syllabus
        getCurriculum()  seed → remote → cache → AI generate (curriculum-store.jsx:139)
        AI rows are pushed BACK to Supabase (_pushCurriculumToRemote :71)
  └─ createCourse(draft)                          course-store.jsx:106  → courses_v1
  └─ commitExamWizard({examDrafts, profilePatch}) exams-store.jsx:335
        1. saveProfile(profilePatch)   ← MUST be first (comment at :336-342)
        2. saveExams([...old, ...new]) exams-store.jsx:129
             └─ reconcileSchedule(old, new, schedule)  schedule-store.jsx:442
                  └─ allocateBudget(exams, profile)    schedule-store.jsx:251
                       weeklyHours × INTENSITY_MULTIPLIERS
                        ÷ urgency(topics/daysLeft × computePriority)
                        ÷ topic weights (difficulty × importance / retention)
                        → sessions stamped with date + startTime + durationMin
             └─ saveSchedule → study_schedule_v1
        3. optional per-subject sessionsPerWeekHint re-seed (exams-store.jsx:371-382)
```

### 3.3 Study session → mastery

```
Dashboard/TodaysMission → startStudySession(s)      session-store.jsx
  → StudyLayer overlay (index.html:344, above the tab router — survives tab switch)
  → StudySession.jsx:56 resolves {examId, topicIdx}
        topicIndexFromId(s.id)  →  else exam.topics.indexOf(s.topic)  →  else 0  ⚠
  → SessionRecap → buildRecapFromSession (session-store.jsx:65)
        recordCompletedSession()  → durationSec on the session
        markTopicsStudied(examId, idxs)      brain-store.jsx:~290
        recordConfidence({examId, topicIdx}) brain-store.jsx:257
        syncCompletionFromCoverage()         → writes exam.completionPct
  → _bump() → useSyncExternalStore → every mounted screen re-renders
```

### 3.4 Cross-tab sync

`index.html:281-294` listens for `storage` and remounts `content` via `key={dataVersion}`. It filters against a 7-entry `SYNCED_KEYS` list (`index.html:282`) — see §5.9 for the 16 keys it misses.

---

## 4. Module Map & the `window` Dependency Graph

### 4.1 Who defines what

254 globals total. Publication is via `Object.assign(window, {...})` at file bottom (stores) or `window.X = X` (components).

| File | Publishes (line) |
|---|---|
| `i18n.jsx` | `LANGS`, `EXAM_SYSTEMS` (:387-388) |
| `exams-store.jsx` | `EXAMS_KEY, getExams, getExamsSnapshot, saveExams, subscribeExams, daysAway, fmtDateKey, sessionsNeeded, requiredPct, migrateExam, deriveCourse, deriveCourses, commitExamWizard, computePriority, examDisplayName` (:418) |
| `course-store.jsx` | `COURSES_KEY, getCourses, getCourse, saveCourses, createCourse, saveCourse, subscribeCourses, blankCourseTopicMastery, getCourseTopicMastery, saveCourseTopicMastery` (:152) |
| `schedule-store.jsx` | 30 globals incl. `SCHEDULE_KEY, getSchedule, saveSchedule, reconcileSchedule, buildScheduleView, seedSessionsForExam, allocateBudget, topicIndexFromId, replanAllSchedules, INTENSITY_MULTIPLIERS, PERSONAL_EVENT_ID, propose*` (:1032) |
| `profile-store.jsx` | `PROFILE_KEY, getProfile, saveProfile, subscribeProfile, migrateProfile, hasProfile, WEEK_DAYS, DAY_PERIODS` (:109) |
| `auth-store.jsx` | `ACCOUNTS_KEY, SESSION_KEY, _supabase, hashPassword, getAccounts, saveAccounts, getSession, setSession, clearSession, signUp, logIn, startDemo, signInWithOAuth` (:150) |
| `mistakes-store.jsx` | `MISTAKES_KEY, getMistakes, logMistake, clearMistake, clearAllMistakes, migrateMistake, recordMistakeRetry, snoozeOverdueMistakes, computeReviewQueue, computeMistakeSummary, computeTopicBreakdown, computeMistakeTrends, computeMistakeBadges, computeMistakeReviewStreak` (:252) |
| `session-store.jsx` | `ACTIVE_SESSION_KEY, getActiveSession, subscribeActiveSession, startStudySession, setSessionMinimized, endStudySession, StudyLayer` (:220) |
| `progress-metrics.jsx` | `computeStreak, computeAchievements` (:48) |
| `brain-store.jsx` | 27 globals incl. `MASTERY_KEY, KB_KEY, MEMORY_KEY, XP_KEY, topicKey, getMastery, applyReview, recordReview, recordConfidence, retention, markTopicsStudied, coverageForExam, syncCompletionFromCoverage, recommendNextAction, brainCourses, getExamKB, saveExamKB, getMemory, updateMemory, getBrain, useBrain, subscribeBrain, getXp, addXp, xpLevel` (:713) |
| `tier-theme.jsx` | `XP_TIERS, xpTier, tierForLevel, tierTitle, applyTierTheme, previewTier` (:117, inside an IIFE) |
| `ai-enrichment.jsx` | `requestAiEnrichment, requestTopicNames, requestCourseExtraction, fileToClaudeContent, patchExamAi, validateManualTopics` (:211) |
| `ai-brain.jsx` | `parseJSON, buildLearnerContext, brainComplete, brainCompleteJSON, aiLangDirective, aiTutorReply, aiGenerateQuiz, aiExplainDifferently, aiExtractCourse, createCoachSession, coachSessionSummary, commitCoachSession, resolveTopicForBrain` (:325) |
| `data.jsx` | `MASTERY, WEAKNESS_ALERTS, buildScheduleData, deriveWeek` (:50) |
| `onboarding-data.jsx` | `EXAM_TYPES, examType, MATERIALS, PREFERENCES, TIMEZONES, detectTimezone, DEFAULT_SUBJECTS, ONB, COUNTRIES, COUNTRY_TO_EXAM_TYPE, EDUCATION_LEVELS, SUBJECT_PRESETS, UNIVERSITY_YEARS, INTENSITY_PRESETS` (:293) |
| `qualifications-store.jsx` | `QUALIFICATIONS_REMOTE_KEY, getQualifications, refreshRemoteQualifications, _mergeQuals, _rowToExamType` (:112) — **plus it re-assigns 4 of onboarding-data's globals** (`:68, :69, :77, :78`) |
| `curriculum-data.jsx` | `CURRICULUM_SEED, KNOWN_SUBJECTS` (:1793) |
| `curriculum-store.jsx` | `CURRICULUM_CACHE_KEY, getCurriculumCache, getCurriculum, curriculumRowsForQualification, searchCurriculumSubjects, fetchAndCacheCurriculum, markCurriculumVerified, fetchUrlText, extractTopicsFromText, getRemoteCurriculum, refreshRemoteCurriculum` (:337) |
| `tweaks-panel.jsx` | `useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider, TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton` (:537) |
| `onboarding-steps.jsx` | `CoachBubble, GradePicker, ChipGrid, UploadZone, AnalysisAnimation, PlanRow, AiHoursModal, AvailabilityGrid` (:349) |
| `exam-wizard.jsx` | `ExamWizard, EXAM_WIZARD_PRESETS` (:809) |
| `AIChat.jsx` | `AIChat, CoachIcon, LearnEngine` (:3189) |
| `StudyCalendar.jsx` | `StudyCalendar, calFmtDate, calMondayOf, calMinutesOf, calHHMM, calSnap, calDayIndexFromOffset` (:792), `CalendarHub` (:841) |
| `calendar-tests.jsx` | `runCalendarTests` (:156) |
| `_ds_bundle.js` | `AIExamCoachDesignSystem_99e467` **plus 25 stale duplicates** (see §5.1) |
| one-liner screens | `AppNav.jsx:16 NavLogoMark`, `:170 AppNav`; `Landing.jsx:322`; `Combobox.jsx:88`; `CurriculumStep.jsx:454`; `Onboarding.jsx:15`; `Dashboard.jsx:472`; `CourseDetail.jsx:282`; `DayDetail.jsx:155`; `TodaysMission.jsx:127`; `StudySession.jsx:409`; `SessionRecap.jsx:241`; `AIPlan.jsx:569`; `BurnoutAlert.jsx:64`; `StudyHub.jsx:625`; `MistakeJournal.jsx:638`; `Progress.jsx:182`; `Schedule.jsx:148`; `Exams.jsx:510`; `Settings.jsx:321` |

### 4.2 Most-consumed globals (fan-in)

| Global | Owner | Consumer files |
|---|---|---|
| `getProfile` | profile-store | **20** |
| `getExams` | exams-store | **16** |
| `fmtDateKey` | exams-store | 9 |
| `getSchedule` | schedule-store | 8 |
| `saveProfile` | profile-store | 7 |
| `buildScheduleData` | data.jsx | 6 |
| `computeStreak` | progress-metrics | 6 |
| `LANGS` | i18n | 5 |
| `aiLangDirective` | ai-brain | 5 |
| `saveExams` | exams-store | 5 |
| `examType` / `topicIndexFromId` / `deriveCourses` / `CoachIcon` | mixed | 4 each |

`getProfile` and `getExams` are the two true hub dependencies. Both are memoised on the raw localStorage string, so the fan-in is cheap — that is the single best design decision in the codebase.

### 4.3 Required load order and what breaks if it is wrong

The order in `index.html:89-131` is **load-bearing for exactly seven edges**. Everything else resolves lazily at call time via `window.X`, so ordering it wrong only breaks things that execute at module-init.

| # | Constraint | Enforced at | Failure if violated |
|---|---|---|---|
| 1 | `_ds_bundle.js` **before** every screen | `index.html:23` | `Dashboard.jsx:4` destructures `window.AIExamCoachDesignSystem_99e467` at render, so a *missing* bundle throws inside the render → error boundary. But loading it **after** the screens means its 25 stale component globals *win*, silently rendering the June 2026 UI. |
| 2 | `mistakes-store` **before** `brain-store` | `:95` before `:98` | `brain-store.jsx:675` `if (!window.logMistake ... ) return;` — the bridge silently no-ops. Wrong answers would no longer lower mastery and no screen would refresh on a mistake. **Fails silently, no error.** |
| 3 | `onboarding-data` **before** `qualifications-store` | `:103` before `:104` | `qualifications-store.jsx:89` merges into `window.EXAM_TYPES || []`. If reversed, the cached remote catalog is merged into an empty array, then `onboarding-data.jsx:293` overwrites the result with the bundled snapshot. Every DB-only exam (IELTS/TOEFL/Duolingo) disappears. **Fails silently.** |
| 4 | `auth-store` **before** `qualifications-store` and `curriculum-store` | `:94` before `:104`, `:106` | `qualifications-store.jsx:98` and `curriculum-store.jsx:80` both bail on `if (!sb) return`. Remote catalogs never load; app falls back to the bundled seed forever. **Fails silently.** |
| 5 | `curriculum-data` **before** `curriculum-store` | `:105` before `:106` | `_allCurriculumRows()` (`curriculum-store.jsx:101`) reads `window.CURRICULUM_SEED \|\| []`. Because it reads at *call* time, this one is actually tolerant — but `refreshRemoteCurriculum()` fires at `:346` and the CustomEvent may land before the seed exists. |
| 6 | `exams-store` **before** `course-store` **before** `brain-store`, and `exams-store` **before** `schedule-store` **before** `data.jsx` | `:90-98`, `:102` | Documented in the file headers (`course-store.jsx:14-15`, `schedule-store.jsx:8-9`, `brain-store.jsx:30-31`). These are call-time reads, so mis-ordering is tolerated at load but produces subtly wrong first-render data. |
| 7 | `tier-theme` **after** `brain-store` | `:99` after `:98` | `tier-theme.jsx:38` reads `window.xpLevel` and `subscribeBrain`. |

**Systemic weakness:** six of the seven order dependencies fail *silently*. There is no assertion anywhere that a required global exists. A single `console.assert` block or a `REQUIRES = [...]` manifest per file, checked at load, would convert every one of these into a loud, one-line diagnosis.

### 4.4 Duplicate global definitions (last writer wins)

| Global | Defined in | Effect |
|---|---|---|
| `EXAM_TYPES` | `onboarding-data.jsx:293`, `qualifications-store.jsx:68` | Intentional (documented at `qualifications-store.jsx:11-16`), but it makes `window.EXAM_TYPES` mutable at runtime — any component that captured it into a `useMemo`/`useState` at mount will hold a stale list. `qualifications-store.jsx:107` dispatches `qualifications-updated` to compensate; grep shows **zero listeners for that event outside exam-wizard**. |
| `examType` | same pair (`:69`) | Same. |
| `SUBJECT_PRESETS` | same pair (`:77`) | Same. |
| `COUNTRY_TO_EXAM_TYPE` | same pair (`:78`) | Same. |
| `logMistake` | `mistakes-store.jsx:252` then wrapped by `brain-store.jsx:678` | Monkey-patch, guarded by `window.__brainWrappedMistakes`. Works, but the wrapped function is now invisible to any static reasoning. |
| `AppNav`, `Dashboard`, `Exams`, `Settings`, `Landing`, `Progress`, `Schedule`, `StudyHub`, `StudySession`, `MistakeJournal`, `CourseDetail`, `DayDetail`, `BurnoutAlert`, `Onboarding`, `LANGS`, `EXAM_SYSTEMS`, + 9 dead ones | `_ds_bundle.js` **and** the corresponding `.jsx` | **25 shadowed globals.** See §5.1. |

---

## 5. Hidden Coupling & Fragility (the core of this report)

### 5.1 `_ds_bundle.js` shadow-defines 25 of the app's own globals — CRITICAL

`_ds_bundle.js` is 384 KB, dated **2026-06-28** (five weeks stale), loaded at `index.html:23`. It assigns:

```
AppNav, BurnoutAlert, CourseDetail, Dashboard, DayDetail, EXAM_SYSTEMS, Exams,
LANGS, Landing, MistakeJournal, Onboarding, Progress, Schedule, Settings,
StudyHub, StudySession
```
…plus nine components that exist **only** there and are referenced nowhere in the current app (verified by grep): `Achievements, FlashcardMode, MockExam, MonthlyInsights, QuizMode, ShareProgress, SuccessSimulation, UploadFlow, WeeklyReview`.

The bundle **is** required — nine files destructure design primitives from it (`Dashboard.jsx:4`, `AIPlan.jsx`, `CourseDetail.jsx`, `Exams.jsx`, `Progress.jsx`, `DayDetail.jsx`, `Settings.jsx`, `TodaysMission.jsx`, `SessionRecap.jsx`).

**Failure scenario:** `AIChat.jsx?v=fx8` returns 404 after a partial deploy, or a Babel syntax error is introduced in `Dashboard.jsx`. Babel-standalone logs to console and continues. `window.Dashboard` is now the June 2026 component. The user sees a plausible-but-wrong Dashboard, the error boundary never fires, and Sentry records only a console error. This is the highest-cost-per-hour-of-debugging defect in the repo.

**Fix (no build step):** delete the 25 component assignments from `_ds_bundle.js`, leaving only `window.AIExamCoachDesignSystem_99e467`. Effort: 30 min. Then add a boot assertion in the inline script:
```js
["Dashboard","Exams","AIChat","Settings","StudyHub","MistakeJournal","Progress","CalendarHub","Landing","Onboarding","AIPlan","AppNav","StudyLayer"]
  .forEach(n => { if (!window[n]) throw new Error("Module failed to load: " + n); });
```

### 5.2 `topicIdx` — positional identity in 108 places across 10 files

| File | refs |
|---|---|
| `brain-store.jsx` | 42 |
| `AIChat.jsx` | 25 |
| `schedule-store.jsx` | 16 |
| `StudySession.jsx` | 7 |
| `ai-brain.jsx` | 7 |
| `mistakes-store.jsx` | 5 |
| `Dashboard.jsx` | 3 |
| `CurriculumStep.jsx`, `course-store.jsx`, `session-store.jsx` | 1 each |

Two derived key schemes:
- **Mastery key** — `brain-store.jsx:56` `topicKey(examId, topicIdx) => \`${examId}::${topicIdx}\`` → keys of `brain_mastery_v1`.
- **Session id** — `schedule-store.jsx:17` `makeSessionId(examId, topicIdx, dedupe) => \`sess::${examId}::${topicIdx}[::n]\``, parsed back at `:20` `topicIndexFromId`.

**The specific corruption vector.** `fingerprintForScheduling` (`schedule-store.jsx:437-441`) is:
```js
return exam.examDate + "|" + exam.topicCount + "|" + (exam.sessionLengthMin || "");
```
The topics **array** is not in the fingerprint. So:
- `ai-enrichment.jsx:138` / `:172` call `relabelPendingSessions(examId, topics)` after an AI topic-name generation. That only relabels **pending** sessions (`schedule-store.jsx:774` guards on `status !== "pending"`).
- Completed sessions keep their old `topic` string but their **id still encodes the old index**. `brain_mastery_v1["e123::4"]` now describes a topic that is no longer at index 4.
- Nothing re-keys `brain_mastery_v1`, `mistakes_v1.topicIdx` (`mistakes-store.jsx:29`), or the session ids.

Concretely: a student studies "Integration" (index 9). A later `requestTopicNames` run (or a `curriculum` DB row update, or a course-topic append at `AIChat.jsx:3063` if it ever became an insert) returns the list with two extra topics prepended. Index 9 is now "Trigonometry". The student's 12 completed reviews, SM-2 ease factor, and forgetting curve for Integration are now silently attributed to Trigonometry. `getBrain()` will tell the AI tutor the student is solid on Trigonometry and has never seen Integration. **There is no way to detect or reverse this after the fact.**

**Partial mitigations already in place** (credit where due):
- `course-store.jsx:37-62` gives every `Topic` a stable `id` (`t_<base36>`), and `course.progress.topicMastery` is keyed by `topic.id` (`:139-145`).
- `brain-store.jsx:96-127` reconstructs the legacy `examId::topicIdx` shape *from* the stable-id store for course-backed exams.
- `CurriculumStep.jsx:19-22` explicitly documents that module grouping must never reorder the flat array, and `_groupTopicsByModule` (`:23-32`) is order-preserving.

**But the mitigation is incomplete:**
- Legacy (no `courseId`) exams still write directly to `brain_mastery_v1` keyed by index — `brain-store.jsx:182, 210, 257, 268, 297, 316, 396, 430`.
- Session **ids** are still index-based even for course-backed exams (`schedule-store.jsx:136` `uniqueId(exam.id, topicIdx)`).
- `mistakes_v1.topicIdx` (`mistakes-store.jsx:29`) is index-based unconditionally.
- Nothing prevents a reorder; the safety rests entirely on nobody writing code that reorders.

**Recommended concrete fix (no build step, incremental):**
1. Add `topicId` alongside `topicIdx` in `makeSessionId` (`schedule-store.jsx:17`) as a 4th `::` segment, and add `topicIdFromId`. Old ids keep working; new ones carry both.
2. Add `topicId` to `migrateMistake` (`mistakes-store.jsx:29`).
3. Add a startup integrity check: for each course-backed exam, if a completed session's decoded `topicIdx` names a topic whose name ≠ the session's stored `topic` string, log to Sentry. This converts silent corruption into an observable event before you write the migration.
4. Only then add topics to `fingerprintForScheduling` — do **not** do this first, or every existing user's pending schedule regenerates on next load.

### 5.3 Duplicated magic defaults — the `|| 45` class, quantified

The session-duration fix (`4f525ca`) correctly stamped `durationMin` onto each session at creation (`schedule-store.jsx:123-125, 142`). It did **not** remove the fallback chains. `sessionLengthMin || 45` / `?? 45` still appears in **14 places across 10 files**:

| File:line | Expression |
|---|---|
| `AIPlan.jsx:56` | `profile.sessionLengthMin ?? 45` |
| `Dashboard.jsx:91` | `rec.estMinutes \|\| getProfile().sessionLengthMin \|\| 45` |
| `CourseDetail.jsx:7` | `getProfile().sessionLengthMin \|\| 45` |
| `Exams.jsx:166` | `getProfile().sessionLengthMin \|\| 45` |
| `StudyCalendar.jsx:63` | `profile.sessionLengthMin \|\| 45` |
| `StudyCalendar.jsx:430` | `s.durationMin \|\| profile.sessionLengthMin \|\| 45` |
| `StudySession.jsx:197` | `s.est \|\| getProfile().sessionLengthMin \|\| 45` |
| `TodaysMission.jsx:12` | `session.est \|\| getProfile().sessionLengthMin \|\| 45` |
| `onboarding-steps.jsx:202` | `(sessionLengthMin \|\| 45) === m` |
| `schedule-store.jsx:125, 255, 525, 871, 902, 935, 990` | 7 more |
| `profile-store.jsx:37` | the **actual** canonical default |

`profile-store.jsx:37` already guarantees `sessionLengthMin` is a number in `[15,180]` on every read, so 13 of these 14 are dead code that can only fire if `getProfile` itself is missing — but they are exactly the shape that caused the original bug and will cause the next one. **Fix:** publish `window.DEFAULT_SESSION_MIN = 45` from `profile-store.jsx` and replace all 14.

**Same class, other constants — all still duplicated:**

| Constant | Canonical home | Duplicated at |
|---|---|---|
| `topicCount \|\| 10` | `exams-store.jsx:48` | `Exams.jsx:395`, `ai-enrichment.jsx:102`, `:156`, `exams-store.jsx:240`, `schedule-store.jsx:91`, `:292`, `:329`, `:944` — **8 sites** |
| `weeklyHours \|\| 12` | `profile-store.jsx:31` | `Progress.jsx:11`, `StudyCalendar.jsx:433`, `Dashboard.jsx:145`, `schedule-store.jsx:253` — **4 sites** |
| `daysPerWeek \|\| 5` | `profile-store.jsx:34` | `schedule-store.jsx:254`, `:849` — 2 sites |
| Risk thresholds `>=60 / >=35` | `exams-store.jsx:214` | `brain-store.jsx:482`, `AIPlan.jsx:291-292`, `CourseDetail.jsx:45-48`, `Dashboard.jsx:323`, `:405`, `AIPlan.jsx:400`, `TodaysMission.jsx:80` — **8 sites, 2 different threshold sets** (`60/40` vs `60/35`) |
| Grade bands `80/60/40` | `exams-store.jsx:173-177` `letterBand` | `AIPlan.jsx:67` (`80/60/40`), `AIChat.jsx:535` (`90/75/60`), `AIChat.jsx:2169` (`90/75/60`) — **three mutually inconsistent grade scales** |
| XP awards | none | `AIChat.jsx:1075` (`correct*10 + 50/25`), `:1523` (`correct*15 + 100/40`), `:1642` (duplicate of 1523) |
| `PREP_WINDOW_DAYS = 90` | `exams-store.jsx:189` (function-local) | not duplicated, but not exported either |
| Free-time window `06:00–22:00` / `15:00–22:00` | `schedule-store.jsx:207` | `:237` (`17:00` fallback), `:246` (`"17:00"` default), `:955` (`22*60`), `StudyCalendar.jsx:438` (`"17:00"`) — **5 sites** |
| `INTENSITY_MULTIPLIERS` | `schedule-store.jsx:190` | correctly single-sourced ✅ |

The grade-band divergence is a live product bug, not just debt: `AIChat`'s post-quiz "grade" uses a 90/75/60 scale while the Dashboard's predicted grade uses 80/60/40. The same 82% shows as **B** in one place and **A** in another.

### 5.4 Hardcoded colours bypassing the token system

`tokens/*.css` defines 269 custom properties (colors 108, tiers 77, spacing 30, typography 30, base 24), imported via `styles.css`. Against that:

- **246 literal colour values** across 25 `.jsx` files (hex, `'white'`, `rgb(`/`rgba(` with numeric args).
- **128 of them are white** (`#fff`, `#ffffff`, `'white'`, `rgba(255,255,255,…)`).

| File | literal colours | of which white |
|---|---|---|
| `tweaks-panel.jsx` | 68 | 11 |
| `StudyHub.jsx` | 43 | 27 |
| `AIChat.jsx` | 42 | 38 |
| `StudySession.jsx` | 13 | 11 |
| `AIPlan.jsx` | 11 | 8 |
| `StudyCalendar.jsx` | 8 | 4 |
| `tier-theme.jsx` | 7 | 0 |
| `Landing.jsx` | 7 | 3 |
| `Dashboard.jsx` | 7 | 4 |
| `exams-store.jsx` | 6 | 0 |
| `SessionRecap.jsx` / `MistakeJournal.jsx` | 5 each | 5 each |
| 14 others | 1-4 each | — |

**Legitimate exceptions (leave alone, they are documented):**
- `exams-store.jsx:15-18` `FALLBACK_COLORS` — `VALID_COLOR_RE` rejects `var()` by design, and the values are persisted into `exams_list_v2`. Correctly commented.
- `index.html:145-182` `ACCENT_PALETTES` and `:226-231` `DEPTH_VARS` — these *define* tokens.
- `tokens/*.css` themselves.
- `tweaks-panel.jsx` — a dev tool with its own visual identity, injected as a raw `<style>` string.

**Real debt: ~155 sites**, concentrated in `AIChat.jsx` (38 whites) and `StudyHub.jsx` (27 whites). `tokens/colors.css` already has `--surface-card` / `--text-invert`; these 155 are why a dark theme is currently impossible. Note that `tokens/tiers.css` (77 props) exists specifically to re-theme by XP tier — every hardcoded `#fff` is a hole in that feature *today*, not hypothetically.

### 5.5 Registry scatter — the "add a new X requires editing N files" family

**a) New exam type — now 2 places + 1 DB table (improved, still not 1).**
The original 5-place problem is genuinely half-fixed. `qualifications-store.jsx` now rewrites `EXAM_TYPES` / `examType` / `SUBJECT_PRESETS` / `COUNTRY_TO_EXAM_TYPE` from the `qualifications` table (`:67-79`), and `exam-wizard.jsx:205-206` reads `e.sectionBased` / `e.enMedium` from the merged object. But:
- The bundled `EXAM_TYPES` objects (`onboarding-data.jsx:6-31`) carry **no** `sectionBased`/`enMedium` field, so `typeof e.sectionBased === "boolean"` is always false until the DB fetch lands. Until then `SECTION_BASED_FALLBACK` (`exam-wizard.jsx:201`) and `EN_MEDIUM_FALLBACK` (`:204`) govern. **A new section-based exam added only to `onboarding-data.jsx` still needs the wizard edited.**
- Adding an exam offline-capable still means: `onboarding-data.jsx:6` (EXAM_TYPES), `:234` (COUNTRY_TO_EXAM_TYPE), `:253` (SUBJECT_PRESETS), `exam-wizard.jsx:201/204` (the two fallback Sets), and `curriculum-data.jsx` (topics). **Still 5.**
- **Fix:** add `sectionBased: false, enMedium: false` explicitly to every entry in `onboarding-data.jsx:6-31`. That single change deletes both fallback Sets and drops the count from 5 to 3.

**b) Navigation tabs — 3 places, already drifted.**
`AppNav.jsx:38-46` lists 8 tab ids; `index.html:318-326` routes 9 (`schedule` **and** `calendar`, both → `CalendarHub`); `i18n.jsx` has 10 `nav_*` keys × 5 languages. `nav_schedule` and the `"schedule"` route (`index.html:321`) are unreachable dead code — `AppNav` never emits that id.

**c) Language codes — 40+ helper definitions and 906 call sites.**
`i18n.jsx` holds a clean 68-key × 5-language dictionary (verified: **zero missing keys** in `uk`/`fr`/`de`/`ru`). But there are **906 `L(...)` call sites** using per-file positional helpers:
```js
const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
```
defined **40 times** across 20 files (`AIChat.jsx` alone: 11 copies at `:127, 188, 574, 840, 1173, 1475, 1800, 1939, 2566, 2898`; `MistakeJournal.jsx`: 10 via `mjL`; `Settings.jsx:31` uses a different signature `L(lang, en, uk, ru, fr, de)`; `StudyHub.jsx:396` shadows `L` with `['A','B','C','D']` inside a nested scope).

So **93% of the UI's user-visible strings never touch the dictionary.** Adding a 6th language (Spanish, Polish) means changing the arity of 40 helper definitions **and** adding a positional argument to all 906 call sites. This is the single largest mechanical-change cost in the repo.
**Fix (no build step):** publish one `window.L5(t, {en,uk,ru,fr,de})` from `i18n.jsx` taking an **object**, then convert incrementally. Object keys make a 6th language additive rather than arity-breaking.

**d) localStorage key registry — 3 places, already drifted.** See §5.9.

**e) Personal event categories** — `StudyCalendar.jsx:27-34` defines 7 categories inline with hand-written 5-language `label5` objects. Single-sourced, but outside i18n.

**f) AI study modes** — `AIChat.jsx:8-26` defines 6 modes with inline translations, and each has its own engine function. Single-sourced.

### 5.6 Session id / exam id parsing duplicated outside its owner

`schedule-store.jsx` owns the `sess::examId::topicIdx` scheme (`:17-23`), but two other places re-parse it by hand:
- `session-store.jsx:66` — `s.id.split("::")[1]` to recover examId.
- `schedule-store.jsx:732` — same expression, inside its own file.

There is `topicIndexFromId` exported but **no `examIdFromId`**. Any change to the id scheme (e.g. adding the `topicId` segment recommended in §5.2) must be made in three places, one of which is in a different file.

### 5.7 Matching exams and courses by **name** instead of id

Six sites resolve an entity by display name:

| Site | Expression |
|---|---|
| `StudySession.jsx:60` | `exams.find(e => e.name === s.subject)` |
| `StudySession.jsx:82` | `exams.find(e => e.name === s.subject)` |
| `session-store.jsx:83` | `brainCourses().find(c => c.name === s.subject)` |
| `session-store.jsx:96` | same |
| `Dashboard.jsx:114` | `courses.find(c => c.name === missionSession.subject)` |

The product explicitly supports **multiple exams per course** — `exams-store.jsx:92` allows `kind: "exam" \| "midterm" \| "final" \| "resit" \| "mock" \| "certification"`, and `course-store.jsx:5-7` says "multiple exams … can point at the same course". A student with an A-Level Maths **midterm** and **final** will very plausibly have two exams named "A-Level Mathematics". Every one of these five lookups then resolves to whichever is first in the array. The recap will attribute the study session, the confidence rating and the readiness delta to the wrong exam.

Compounding it, `StudySession.jsx:66` falls back to `topicIdx = 0` when unresolvable — a silent write of real mastery data onto the wrong topic rather than a no-op.

### 5.8 Reactivity holes

`brain-store.jsx:650-661` `subscribeBrain` fans out to `subscribeExams`, `subscribeSchedule`, `subscribeProfile`, an internal bus, and a raw `storage` listener. It does **not** subscribe to `subscribeCourses`.

- **`subscribeCourses` (`course-store.jsx:149`) has zero consumers anywhere in the repo.** It is published, notified on every `saveCourses`, and nobody listens.
- Consequence: `AIChat.jsx:3063` (`window.saveCourse(course.id, { topics: [...] })` — adding a topic mid-chat) writes to `courses_v1` and notifies an empty listener set. No screen re-renders.
- `getBrain`'s memo key (`brain-store.jsx:494`) is `JSON.stringify({v: _v, ex: exams.length, se: schedule.sessions.length, mi: mistakes.length})`. Courses are absent entirely, and *counts* rather than content are used for the rest. A mistake going `pending → recovered` (same array length, no `_bump`) leaves `_snapCache` stale.
- `mistakes-store.jsx` never calls `_bump`/`_notify` — verified by grep. Only `logMistake` wakes anything, via `brain-store.jsx:678`'s wrapper. `clearMistake`, `clearAllMistakes`, `recordMistakeRetry`, `snoozeOverdueMistakes` are all silent. `MistakeJournal.jsx` compensates with a local `refreshKey`; nothing else does.

### 5.9 Cross-tab sync covers 7 of 23 localStorage keys

`index.html:282` defines `SYNCED_KEYS = [EXAMS_KEY, SCHEDULE_KEY, PROFILE_KEY, ACCOUNTS_KEY, SESSION_KEY, MISTAKES_KEY, ACTIVE_SESSION_KEY]`.

- `ACCOUNTS_KEY` (`auth_accounts_v1`) is **dead** — declared at `auth-store.jsx:7` with the comment "kept for compat", never written by any code path. It occupies a slot in the sync list.
- **16 keys are unmonitored**, including `courses_v1`, `brain_mastery_v1`, `brain_kb_v1`, `brain_memory_v1`, `brain_xp_v1`. Two tabs open on Dashboard + AI Coach: XP earned in one does not appear in the other until an unrelated write to a synced key happens. (`subscribeBrain` does add an unfiltered `storage` listener, so `useBrain()`-consuming screens *do* recover — but `index.html`'s remount gate, and any screen not using `useBrain`, does not.)

### 5.10 Cache-busting: 4 files have no `?v=` at all

Bump discipline in the last four commits was **100%** (verified against `git diff` for `4f525ca`, `e47c550`, `6149b3b`, `4cb4ea1`). But four script tags carry no version query at all:

| `index.html` line | File |
|---|---|
| `:102` | `data.jsx` |
| `:103` | **`onboarding-data.jsx`** |
| `:107` | `tweaks-panel.jsx` |
| `:129` | `calendar-tests.jsx` |

`onboarding-data.jsx` is precisely the file a developer edits to add an exam type. An edit to it will be served from browser/CDN cache indefinitely. `vercel.json` sets no `Cache-Control` headers, so Vercel's static defaults apply. This is a latent "I deployed the fix and nothing changed" incident waiting to happen, on the highest-churn config file in the repo.

### 5.11 Asset paths escape the deploy root

`index.html:16` `href="../../styles.css?v=tier2"`, `:17` `href="../../assets/favicon.svg"`, `:23` `src="../../_ds_bundle.js"`.

These resolve correctly **only** because RFC 3986 dot-segment removal clamps `..` at the origin root, and the app is served from `/`. `vercel.json` rewrites only `/ → /index.html`. The moment the app is served from any subpath (a preview alias with a path prefix, a reverse proxy, an embed, GitHub Pages under a repo name), the design system and every token silently 404 — and per §5.1 a missing `_ds_bundle.js` means a thrown error in every screen's first line.

Note the inconsistency: these three use `../../`, but the 43 `.jsx` tags at `:89-131` use bare relative paths. **Fix:** change all three to `/styles.css`, `/assets/favicon.svg`, `/_ds_bundle.js`. Effort: 2 minutes.

### 5.12 `getMastery()` is called inside a loop, and it re-parses the entire course store each time

The hot path:

```
allocateBudget()                schedule-store.jsx:251
 └─ for each exam:
     └─ for i in 0..topicCount:                        :337
         └─ _topicRetention(exam.id, i)                :340
             └─ window.getMastery()                    :179   ← unmemoised
                 └─ window.getExams()                  brain-store.jsx:98  (memoised ✅)
                 └─ for each course-backed exam:
                     └─ window.getCourse(courseId)     brain-store.jsx:105
                         └─ getCourses()               course-store.jsx:94
                             └─ JSON.parse(localStorage['courses_v1'])   ← full parse
                             └─ .map(migrateCourse)    ← full re-migration of every course
```

`getMastery` (`brain-store.jsx:96`) has **no memo**. `getCourse` (`course-store.jsx:94`) does a full `getCourses()` — parse + migrate the entire array — to find one item.

For 5 exams × 30 topics × 5 courses, `allocateBudget` performs **750 full JSON parses + migrations of `courses_v1`**. Courses embed `knowledgeBase.chapters` extracted from uploaded PDFs, so that blob is realistically 100 KB – 1 MB. `allocateBudget` runs on every `saveExams` (`exams-store.jsx:142`) and every budget-field `saveProfile` (`profile-store.jsx:101`).

Additionally, `getBrain()` calls `getMastery()` at `brain-store.jsx:490` — **before** the memo check at `:495` — so the memo saves nothing on the most expensive line.

Also note `urgency(exam)` (`schedule-store.jsx:292`) calls `computePriority` → `studyProgressScores` (`exams-store.jsx:302`) → `window.getCourse` again, and `urgency` is evaluated twice per exam (once in the `totalUrgency` reduce at `:293`, once at `:321`).

**Fix:** memoise `getCourses()` on the raw string exactly like `getExams`/`getProfile` already do (`exams-store.jsx:115-123` is the template — copy it verbatim). Then hoist `const mastery = window.getMastery()` out of the loop and pass it into `_topicRetention`. Effort: 1-2 h. Expected improvement: 750 parses → 1.

### 5.13 Unbounded remote catalog fetch, mirrored into localStorage

`curriculum-store.jsx:82`:
```js
const { data, error } = await sb.from("curriculum").select("*");
```
No `.limit()`, no column projection, no `.eq()` filter — the **entire** curriculum table, every row, every `topics` jsonb blob, on **every page load** (`:346`). Then `:84` mirrors the whole thing into `localStorage['curriculum_remote_v1']`.

The bundled seed alone is 78 rows / 275 KB of JS. `supabase/02_curriculum_seed.sql` is 251 KB. Community auto-population (`_pushCurriculumToRemote`, `:71-77`) means the table **grows without bound** as users generate syllabi. Two failure modes:
1. **Silent truncation** — PostgREST defaults to a 1000-row cap. Past 1000 rows the catalog silently loses subjects with no error surfaced (`:81` swallows everything).
2. **Quota exhaustion** — `localStorage` is ~5 MB per origin. `curriculum_remote_v1` + `qualifications_remote_v1` + `courses_v1` (with KB) + `brain_lessoncache_v1` + `aicoach_chat_msgs_v2` (unbounded, `AIChat.jsx:2627` writes the full array every render) will hit it. Every write is wrapped in `try {} catch {}` (39 such swallows repo-wide), so the first symptom will be "my exams disappeared" with nothing in the console.

`AIChat.jsx:1786` caps the lesson cache. Nothing caps `aicoach_chat_msgs_v2`, `curriculum_remote_v1`, `brain_kb_v1`, or `courses_v1`.

### 5.14 Auth and data are decoupled — logout leaks data to the next user

`auth-store.jsx` authenticates against Supabase. **No study data is ever written to Supabase.** `README.md` documents this, but the UX does not:

- `Settings.jsx:91-94` `logOut()` calls `clearSession()` then `onLogout()`. `clearSession` (`auth-store.jsx:83-87`) removes only `auth_session_v1`. All 22 other keys remain.
- Log out, hand the laptop to a sibling, they log in with their own account → they see the first student's exams, mistakes, chat history, uploaded-material knowledge base, and full name (which `ai-brain.jsx:34` injects into every AI prompt).
- Conversely, the same account on a second device is a blank slate. A student who signs up on their phone and later on a laptop will believe the app lost their data.
- `eraseAllData` (`Settings.jsx:95-98`) does `localStorage.clear()` — correct, but it is a destructive "Erase all data" button, not the logout path.

Also: `index.html:255` initialises `route` from `window.getSession()` **synchronously**, but `_cachedSession` is only populated by the async `_supabase.auth.getSession()` at `auth-store.jsx:42`. A logged-in (non-demo) user therefore always sees the Landing page for one frame, recovering only when `_persistSession` (`:37`) dispatches a synthetic `StorageEvent`. That synthetic event races the `useEffect` that registers the listener (`index.html:292`). If auth resolves from cache before mount, the user is stranded on Landing until they click.

### 5.15 Community curriculum writes can override the official seed

`supabase/03_curriculum_community_writes.sql:37-40`:
```sql
create policy "curriculum community insert"
  on public.curriculum for insert to authenticated
  with check (source in ('ai', 'community'));
```
The unique index at `:28-33` prevents overwriting an **existing** row. But `curriculum-store.jsx:106-108`:
```js
const base = remote.length
  ? seed.filter((s) => !remote.some((r) => _sameCombo(r, s))).concat(remote)
  : seed;
```
**Remote unconditionally wins over the bundled seed**, regardless of `source`. Any authenticated user (signup is open) can `insert` a `source:'community'` row for a `(qualification_id, board, spec_version, lower(subject))` combo that exists in the bundled seed but has not yet been mirrored into the DB — and that row then replaces the official syllabus **for every user of the app**. The topics jsonb is free-form and is fed straight into AI prompts and rendered into the UI.

Cost of exploitation: one free account, one `POST`. Blast radius: every user, globally, persisted into their `curriculum_remote_v1` cache.

**Fix:** in `_allCurriculumRows`, only let a remote row override a seed row when `r.source === 'official'`; otherwise append community rows as lower-priority alternatives. Two lines.

### 5.16 Miscellaneous coupling notes

- **`data.jsx`** (50 lines, no `?v=`) exports `MASTERY` and `WEAKNESS_ALERTS` — static mock data — alongside the live `buildScheduleData`/`deriveWeek` used by 6 files. Mixing mock fixtures into a production module is a trap.
- **29 defensive `window.X && window.X(...)` guards** across the codebase. Each is a place where a load-order mistake degrades silently instead of throwing. They are individually reasonable, collectively they are the reason §4.3's failures are invisible.
- **39 empty `catch {}` blocks.** Every localStorage write, every remote fetch, every Supabase call. Sentry is installed (`index.html:7`) but nothing routes these to it.
- **`brain-store.jsx:674` `bridgeMistakes` monkey-patch** — works, but `window.logMistake` after boot is not the function `mistakes-store.jsx` defines. Any future reader of `mistakes-store.jsx` will not know that calling `logMistake` also mutates mastery.
- **`tweaks-panel.jsx:180`** — `window.parent.postMessage({...}, '*')` with wildcard target origin, shipped to production. Panel stays closed unless the host activates it (`:206`), so impact is low, but a design-tool artifact in the production bundle is 24 KB of unnecessary attack surface.
- **`_ds_bundle.js` is 384 KB unminified-ish and unversioned in the URL** (`index.html:23` has no `?v=`). Same staleness risk as §5.10.

---

## 6. Dependency Graph

### Third-party (all CDN, all runtime)

| Library | Version | Pinned | SRI | Notes |
|---|---|---|---|---|
| React | 18.3.1 | ✅ | ✅ | **`react.development.js`** — dev build in production. ~2× size, dev warnings, slower. `index.html:18` |
| ReactDOM | 18.3.1 | ✅ | ✅ | Same — `react-dom.development.js`. `index.html:19` |
| @babel/standalone | 7.29.0 | ✅ | ✅ | ~2.8 MB, transforms 18,500 LOC on every cold load. `index.html:20` |
| JSZip | 3.10.1 | ✅ | ❌ **no SRI** | `index.html:21`, cdnjs. Used by `StudyHub.jsx:182` and `ai-enrichment.jsx:34` for pptx/docx extraction. |
| @supabase/supabase-js | **`@2`** — floating major | ❌ | ❌ **no SRI** | `index.html:22`, jsdelivr. **Any breaking 2.x change ships to production without a deploy.** Highest-risk dependency line in the file. |
| Sentry loader | unpinned hash-named bundle | n/a | ❌ | `index.html:7` |
| Google Fonts | Gabarito, Hanken Grotesk | n/a | n/a | `index.html:15` |

React 18.3.1 is current-stable and fine. The two actionable items are **(a)** switch to `react.production.min.js` / `react-dom.production.min.js` and **(b)** pin supabase-js to an exact version with an SRI hash.

Note the inconsistency: three of six scripts have SRI, three do not. A compromised cdnjs or jsdelivr path executes arbitrary code with full access to `_supabase`, the session, and every localStorage key.

### Internal module dependencies (who imports whom, summarised)

```
i18n ──────────────────────────────────────────────── (leaf, 5 consumers)

exams-store ◀──────┬── course-store   (getCourse — bidirectional! see below)
    │              └── schedule-store, brain-store, data, 13 screens
    ├─▶ getCourse       (exams-store.jsx:36, :302, :396)
    ├─▶ getSchedule/reconcileSchedule/saveSchedule  (:140-143)
    ├─▶ seedSessionsForExam (:379)
    ├─▶ saveProfile     (:343)
    └─▶ topicIndexFromId, examType, getProfile, computePriority

course-store ────── (leaf: consumes nothing)

schedule-store ─▶ getExams, getProfile, daysAway, fmtDateKey,
                  sessionsNeeded, getMastery, computePriority

profile-store ─▶ replanAllSchedules   (schedule-store)

brain-store ─▶ getExams, getSchedule, getProfile, getMistakes,
               getCourse, saveCourse, saveExams, computeStreak,
               daysAway, examDisplayName, topicIndexFromId
             (+ monkey-patches window.logMistake)

ai-brain ─▶ getBrain, getExamKB, getProfile, getMastery, topicKey, claude.complete
ai-enrichment ─▶ claude.complete, relabelPendingSessions, aiLangDirective, saveExams

qualifications-store ─▶ _supabase; MUTATES onboarding-data's 4 globals
curriculum-store ─▶ _supabase, CURRICULUM_SEED, claude.complete

screens ─▶ everything above + AIExamCoachDesignSystem_99e467
```

**Cycles.** There is one genuine cycle: `exams-store → course-store` (`exams-store.jsx:36` calls `getCourse` inside `migrateExam`) while `course-store`'s header (`:14`) declares it depends on `exams-store`. In practice `course-store.jsx` consumes nothing at runtime, so the cycle is latent rather than active — but the header comment is now wrong, and `migrateExam` calling `getCourse` on **every read of every exam** is the root of the §5.12 performance problem.

`exams-store ⇄ schedule-store` is a second latent cycle, deliberately guarded at `exams-store.jsx:140` (`if (window.getSchedule && ...)`).

---

## 7. Data Model

### 7.1 Entity relationships

```
                 ┌─────────────────────────────────────┐
                 │ Course  (courses_v1)                │  ← the "new central entity"
                 │  id: "course_<b36>"                 │
                 │  title, subject                     │
                 │  curriculumRef {countryId,          │
                 │     qualificationId, board,         │
                 │     specVersion, subject}           │
                 │  topics: [ Topic ]  ── ORDER IS     │
                 │      { id:"t_<b36>"  ← STABLE       │
                 │        name, module,                │
                 │        difficulty 1-10,             │
                 │        importance 1-10,             │
                 │        subtopics[{id,name}],        │
                 │        learningObjectives[{id,text}]│
                 │        resources[] }                │
                 │  knowledgeBase {status, chapters[], │
                 │      glossary[], sourceFiles[]}     │
                 │  progress.topicMastery              │
                 │      { [topic.id]: TopicMastery }   │  ← keyed by STABLE id ✅
                 │  source, verifiedByUser             │
                 └───────────────▲─────────────────────┘
                                 │ exam.courseId (nullable)
                                 │ 1 course : N exams (midterm/final/resit/mock)
                 ┌───────────────┴─────────────────────┐
                 │ Exam  (exams_list_v2)   _v = 1      │
                 │  id: "e<ms>_<i>"                    │
                 │  name, color(#rrggbb), examDate,    │
                 │  examBoard, kind, notes             │
                 │  topicCount, completionPct 0-100,   │
                 │    confidencePct 0-100 (default 50) │
                 │  targetGrade, currentGrade,         │
                 │    gradingSystem {kind:"scale"|     │
                 │      "score", options[]|min,max}    │
                 │  importance 1-10                    │
                 │  sessionLengthMin 15-180 | null     │
                 │  explainLang "en" | null            │
                 │  aiPlanStatus/Summary,topicsStatus  │
                 │  topics: string[]      ┐ MIRRORED   │
                 │  topicWeights {[i]:{}} ├ from Course│
                 │  topicCount            ┘ each read  │
                 └───────────────┬─────────────────────┘
                                 │ session.examId
                 ┌───────────────▼─────────────────────┐
                 │ Session  (study_schedule_v1)        │
                 │  id: "sess::<examId>::<topicIdx>"   │  ← POSITIONAL ⚠
                 │       [::<n> for dedupe]            │
                 │  examId | "__personal__"            │
                 │  date "YYYY-MM-DD", startTime "HH:MM"│
                 │  topic (denormalised label)         │
                 │  status pending|completed           │
                 │  completedAt, durationSec (actual)  │
                 │  durationMin (planned)              │
                 │  manual: bool  ← survives replanning│
                 │  type study|personal, category,     │
                 │  personalColor, notes, seriesId     │
                 └─────────────────────────────────────┘

  TopicMastery  (SM-2; two homes, one shape)
    legacy  → brain_mastery_v1 [ "examId::topicIdx" ]   ⚠ positional
    course  → course.progress.topicMastery[ topic.id ]  ✅ stable
    { examId, topicIdx, topicName, mastery 0-1, confidence 0-1,
      reps, ease 2.5, intervalDays, stability, lastSeen, dueDate,
      history[{at,event,delta}], quickCheckStreak, quickCheckDifficulty }
    Read path: getMastery() (brain-store.jsx:96) merges both into
               one flat "examId::topicIdx" map for all consumers.
```

### 7.2 Every localStorage key

| # | Key | Declared at | Shape | Written by | Cross-tab synced? |
|---|---|---|---|---|---|
| 1 | `exams_list_v2` | `exams-store.jsx:13` | `Exam[]` (see above) | `saveExams` `:129` | ✅ |
| 2 | `study_schedule_v1` | `schedule-store.jsx:11` | `{version:1, sessions: Session[]}` | `saveSchedule` | ✅ |
| 3 | `courses_v1` | `course-store.jsx:17` | `Course[]` | `saveCourses` `:96` | ❌ |
| 4 | `user_profile_v1` | `profile-store.jsx:8` | `{weeklyHours 12, daysPerWeek 5, sessionLengthMin 45, blackoutSlots[{day,period}], planIntensity, materials[], prefs[], lang, timezone, fullName, email, reminderEnabled, reminderHour 9, hasSeenLearnTooltip, country, educationLevel, currentYear, _v:2}` | `saveProfile` `:90` | ✅ |
| 5 | `auth_session_v1` | `auth-store.jsx:8` | `{id, email, name, mode:"account"\|"demo"}` | `_persistSession` `:33`, `setSession` `:77` | ✅ |
| 6 | `auth_accounts_v1` | `auth-store.jsx:7` | — | **never written (dead)** | ✅ (wasted slot) |
| 7 | `mistakes_v1` | `mistakes-store.jsx:8` | `Mistake[]` `{id, topic, question, options[], correctIndex, selectedIndex, explanation, examId, topicIdx, at, status pending\|recovered, recoveredAt, wrongCount, retryCount, nextReviewAt, confidence 1-5}` | `saveMistakes` `:52` | ✅ |
| 8 | `mistake_review_log_v1` | `mistakes-store.jsx:9` | `string[]` of day keys, `.slice(-400)` | — | ❌ |
| 9 | `active_session_v1` | `session-store.jsx:14` | `{...Session, minimized, startedAt}` | `startStudySession` | ✅ |
| 10 | `brain_mastery_v1` | `brain-store.jsx:33` | `{ "examId::topicIdx": TopicMastery }` | `recordReview` etc. | ❌ |
| 11 | `brain_kb_v1` | `brain-store.jsx:34` | `{ [examId]: {status, chapters[], glossary[], sourceFiles[], extractedAt, updatedAt} }` — legacy exams only | `saveExamKB` `:351` | ❌ |
| 12 | `brain_memory_v1` | `brain-store.jsx:35` | `{learningStyle, strengths[], weaknesses[], preferredExplanations[], notes[]}` | `updateMemory` | ❌ |
| 13 | `brain_xp_v1` | `brain-store.jsx:693` | `number` (lifetime XP; level = `floor(sqrt(xp/100))+1`) | `addXp` `:696` | ❌ |
| 14 | `brain_difficulty_v1` | `AIChat.jsx:1756` | `{ "<topicName>::<examId>": vote }` — **a third topic key scheme** | `saveDiffVote` `:1760` | ❌ |
| 15 | `brain_lessoncache_v1` | `AIChat.jsx:1771` | `{ [lessonCacheKey]: {plan, ts} }`, LRU-capped at `LESSON_CACHE_MAX` (`:1786`) | `saveCachedLesson` | ❌ |
| 16 | `aicoach_chat_msgs_v2` | `AIChat.jsx:2570` | `Message[]` — **unbounded** | `:2627` on every message | ❌ |
| 17 | `aicoach_chat_hist_v2` | `AIChat.jsx:2571` | Anthropic message array — **unbounded** | `:2627` | ❌ |
| 18 | `curriculum_cache_v1` | `curriculum-store.jsx:10` | seed-shaped rows, `source:"ai"`, + `cachedAt`, `verifiedByUser` | `_writeCurriculumCache` `:20` | ❌ |
| 19 | `curriculum_remote_v1` | `curriculum-store.jsx:31` | full remote catalog mirror — **unbounded** | `:84` | ❌ |
| 20 | `qualifications_remote_v1` | `qualifications-store.jsx:21` | raw `qualifications` rows | `:104` | ❌ |
| 21 | `tier_seen_v1` | `tier-theme.jsx:42` | tier id string | `:44`-ish | ❌ |
| 22 | `study_result_v1` | `StudyHub.jsx:26` | last upload-analysis result | `:74` | ❌ |
| 23 | `calendar_view_v1` | `StudyCalendar.jsx:808` | `"month"` \| `"week"` | `:810` | ❌ |

**Three independent topic-key schemes coexist:** `examId::topicIdx` (mastery + sessions), `topic.id` (course mastery), and `topicName::examId` (`AIChat.jsx:1803`, difficulty votes). The third is name-based and will orphan itself the moment a topic is renamed by `requestTopicNames`.

**Schema versioning:** only `exams_list_v2` (`_v:1`), `user_profile_v1` (`_v:2`), `courses_v1` (`_v:1`) and `study_schedule_v1` (`version:1`) carry a version field. The brain keys, mistakes, and all AIChat keys do not — they rely on the key name's `_v1` suffix, which means the only migration strategy is "bump the key name and silently discard everything".

---

## 8. Quality Metrics

| Metric | Value | Notes |
|---|---|---|
| Lines of code (hand-written `.jsx`) | **18,464** | across 43 files |
| Non-blank, non-comment lines | 15,298 | comment ratio ~17%, unusually high and unusually *good* — most explain rationale |
| Generated / vendored | `_ds_bundle.js` 384 KB, `curriculum-data.jsx` 275 KB (1,793 L, 78 seed rows), `supabase/02_curriculum_seed.sql` 251 KB | ~910 KB of the ~2.3 MB repo is data/bundle |
| Largest file | `AIChat.jsx` — **294 KB, 3,189 lines, 16 top-level functions** | contains 6 study engines + chat + XP HUD |
| Largest functions | `ExamWizard` 700 L (`exam-wizard.jsx:108`); `LessonEngine` 624 L (`AIChat.jsx:1938`); `StudyHub` 596 L (`StudyHub.jsx:28`); `AIPlan` 564 L (`AIPlan.jsx:5`); `Exams` 508 L (`Exams.jsx:2`); `Dashboard` 469 L (`Dashboard.jsx:3`) | **six functions over 450 lines** |
| Automated test coverage | **~0%** | `calendar-tests.jsx` (156 L, ~13 assertions) is the only suite; it is **never invoked** — `window.runCalendarTests` must be called manually from the console (`:4-6`). No store has a test. |
| Branch density (proxy for cyclomatic complexity) | `AIChat.jsx` 1,145 branch tokens / 3,189 L (**0.36/line**); `exam-wizard.jsx` 290/809; `schedule-store.jsx` 247/1042; `StudyHub.jsx` 205/625; `StudyCalendar.jsx` 203/841 | `AIChat.jsx` is ~3× the density of the store layer |
| Exact-text duplication | **0.6%** of lines begin a repeated ≥6-line block (86 windows) | Low. Worst: `AIChat.jsx:363/689/1057/1290/2146` (×5, the XP-celebration card); `Exams.jsx:343,362` ↔ `exam-wizard.jsx:456,477` (×4) |
| **Structural** duplication | High and not captured by the above: 40 `L()` helper definitions; 6 near-parallel AIChat engines (`LearnEngine`, `QuickCheckEngine`, `SpeedRoundEngine`, `PracticeEngine`, `ExamSimEngine`, `LessonEngine` — all ~260-620 L with the same generate→answer→score→XP→celebrate shape); 14 `\|\| 45` chains; 8 `\|\| 10` chains | |
| Inline style objects | **1,989** `style={{...}}` / `style: {...}` | every value re-allocated per render; 155 of them contain hardcoded colours |
| `React.createElement` (non-JSX) calls | **873** — 710 in `AIChat.jsx`, 163 in `StudyHub.jsx` | these two files are written entirely without JSX; every other file uses JSX. Inconsistent and materially harder to read. |
| Silent `catch {}` | **39** | zero route to Sentry |
| Defensive `window.X && window.X()` guards | 29 | each one a silent-degradation site |
| Dead code | `subscribeCourses` (0 consumers); `auth_accounts_v1` + `getAccounts`/`saveAccounts`/`hashPassword` (`auth-store.jsx:145-148`); `nav_schedule` + the `"schedule"` route (`index.html:321`); 9 `_ds_bundle` components; `MASTERY`/`WEAKNESS_ALERTS` mock fixtures (`data.jsx:50`) | |
| i18n dictionary completeness | **68/68 keys in all 5 languages** ✅ | but only ~7% of user-visible strings go through it (906 inline `L()` calls) |
| Cache-bust discipline | 39/43 files versioned; **100% bump rate** in the last 4 commits ✅ | 4 files permanently unversioned (§5.10) |

---

## 9. Security Assessment

| # | Issue | Location | Severity | Recommendation |
|---|---|---|---|---|
| S1 | **Unauthenticated AI proxy.** No auth, no origin check, no rate limit, no size cap. `max_tokens: 8192`, `maxDuration: 60`. Anyone can POST arbitrary `system` + `messages` and bill the owner's Anthropic key. `index.html:25-27` explicitly documents that the daily cap was **removed**. | `api/complete.js:13-50` | **Critical** | Require a Supabase JWT (`Authorization: Bearer`) and verify it with the service role; add per-user daily token budget in a Supabase table; add an `Origin`/`Referer` allowlist; cap `messages` payload length. |
| S2 | **Community curriculum rows override the official seed for all users.** RLS allows any authenticated user to insert `source in ('ai','community')`; `_allCurriculumRows` gives remote unconditional priority over the bundled seed. | `supabase/03_curriculum_community_writes.sql:37-40` + `curriculum-store.jsx:106-108` | **High** | Change the merge so only `source === 'official'` remote rows override seed rows. Add a `moderation_status` column. Two-line client fix. |
| S3 | **Stored XSS: AI/document-derived text rendered as raw HTML.** `renderChatText` does no escaping before `dangerouslySetInnerHTML`. Input is model output, which is derived from user-uploaded PDFs/pptx and from `api/fetch-url` scrapes of arbitrary third-party pages. | `StudyHub.jsx:441-444` (rendered at `:451`) | **High** | Escape `&<>` before the `**bold**` substitution, exactly as `AIChat.jsx:51-62` `_md` already does correctly. One-line fix — copy `_md`. |
| S4 | **Logout does not clear user data.** Next person to use the browser sees the previous student's exams, mistakes, chat transcripts, uploaded-material knowledge base, and full name. | `Settings.jsx:91-94`, `auth-store.jsx:83-87` | **High** | On logout, remove all 22 app keys (keep only `calendar_view_v1`/tweaks). Reuse the `eraseAllData` key list. |
| S5 | **Floating-version CDN dependency without SRI.** `@supabase/supabase-js@2` — any 2.x publish executes in production immediately. `jszip` also lacks SRI. Three of six script tags have SRI, three do not. | `index.html:21-22` | **High** | Pin exact versions and add `integrity` + `crossorigin` to both, matching lines 18-20. |
| S6 | **Dev builds of React in production.** `react.development.js` / `react-dom.development.js`. | `index.html:18-19` | Medium | Switch to `.production.min.js` and regenerate the SRI hashes. Halves payload, removes dev-only warnings. |
| S7 | **PII sent to a third-party model.** `buildLearnerContext` injects the student's first name (`ai-brain.jsx:34`), study hours, every exam, per-topic mastery, and verbatim excerpts of their uploaded materials into every prompt. Users are minors by design (GCSE/NMT). No consent flow, no privacy notice found. | `ai-brain.jsx:27-110` | Medium | Add a privacy disclosure; make name injection opt-in; document data flow. For under-16 EU/UK users this is a GDPR/UK-GDPR obligation, not a nicety. |
| S8 | **Every storage/network failure is silently swallowed.** 39 empty `catch {}`. Sentry is installed but receives none of them. A quota-exceeded write looks identical to success. | repo-wide; e.g. `exams-store.jsx:132`, `curriculum-store.jsx:88`, `qualifications-store.jsx:108` | Medium | Route catches to `window.Sentry?.captureException`. |
| S9 | **Design-tool panel in production** with `postMessage(..., '*')`. | `tweaks-panel.jsx:180` (24 KB, loaded at `index.html:107` unversioned) | Low | Remove from the production `index.html`, or gate on a query param. |
| S10 | **Asset paths escape the deploy root** (`../../`). Works only because browsers clamp `..` at origin root. | `index.html:16, 17, 23` | Low (Medium if ever sub-pathed) | Use absolute `/styles.css`, `/assets/…`, `/_ds_bundle.js`. |
| S11 | Supabase publishable key hardcoded. | `auth-store.jsx:13-16` | Informational | Correct by design — that key is public. RLS is the boundary. No action. |
| — | **`api/fetch-url.js` SSRF hardening** | `api/fetch-url.js:26-67` | — | **Well done.** http/https only, literal-IP *and* DNS-resolved-IP checks against all private ranges, manual redirect following with re-validation at each hop, 2 MB cap, 10 s timeout, `metadata.google.internal` blocked. This is a model implementation. Only gap: no rate limit, so it can be used as an open scraping relay. |

---

## 10. Performance Assessment

| # | Bottleneck | Evidence | Impact | Suggested Fix |
|---|---|---|---|---|
| P1 | **`getCourses()` is unmemoised and does a full parse+migrate to fetch one course.** Called transitively from `getMastery` inside a per-topic loop. | `course-store.jsx:93-94` → `_readCourses` `:19` → `JSON.parse` + `.map(migrateCourse)`; called from `brain-store.jsx:105` inside `getMastery`, called from `schedule-store.jsx:179` inside `_topicRetention`, called at `:340` inside `for i in 0..topicCount` | 5 exams × 30 topics ⇒ ~750 full parses+migrations of `courses_v1` (which embeds PDF-derived knowledge bases, realistically 100 KB–1 MB) **per `saveExams`/`saveProfile`**. Multi-second main-thread block on "Add exam". | Copy the memo pattern from `exams-store.jsx:115-123` verbatim into `getCourses`. **~1 h, biggest single win.** |
| P2 | **`getMastery()` recomputed per topic instead of hoisted.** | `schedule-store.jsx:177-184` `_topicRetention` calls `window.getMastery()` on every invocation; caller loop at `:337-341` | Multiplies P1 by `topicCount`. | Hoist: `const mastery = window.getMastery()` before the exam loop in `allocateBudget`, pass it down. **30 min.** |
| P3 | **`getBrain()`'s expensive call sits above its own memo check.** | `brain-store.jsx:490` `const masteryMap = getMastery()` executes before the `_snapArgs` comparison at `:495` | The memo saves the cheap derivation and none of the expensive read. `useBrain()` runs on every render of every subscribing screen. | Move `getMastery()` below the memo check; add `courses.length` + a mastery-version counter to `argSig`. **1 h.** |
| P4 | **`urgency(exam)` evaluated twice per exam**, each call running `computePriority` → `studyProgressScores` → `getCourse`. | `schedule-store.jsx:293` (reduce) and `:321` (loop) | 2× P1's cost. | Precompute `const urgencies = new Map(activeExams.map(e => [e.id, urgency(e)]))`. **20 min.** |
| P5 | **`migrateExam` calls `getCourse` on every exam on every read.** | `exams-store.jsx:36` | Mitigated by `getExams`'s raw-string memo, but the first read after *any* exam write pays N_exams × full-course-parse. Combines with P1. | Fixed for free by P1. |
| P6 | **`AIChat.jsx` is 294 KB / 3,189 lines transformed by Babel on every cold load.** | `index.html:118` | Babel-standalone parses+transforms 18,500 LOC synchronously on the main thread at boot. `AIChat` is 17% of it and is only needed on one tab. | Split into `AIChat-core.jsx` + `AIChat-engines.jsx` (6 engines), and load the engines lazily by injecting the `<script type="text/babel">` tag on first navigation to the chat tab. Babel-standalone picks up dynamically inserted tags via `Babel.transformScriptTags()`. **1-2 days, no build step.** |
| P7 | **Dev builds of React.** | `index.html:18-19` | ~2× parse/eval cost + per-render dev checks. | One-line swap + SRI. **15 min.** |
| P8 | **Full curriculum table fetched and mirrored on every page load.** | `curriculum-store.jsx:82` `select("*")` with no limit/filter; `:346` fires unconditionally at boot | Grows without bound via community writes. PostgREST silently truncates at 1000 rows. Mirrored into a ~5 MB localStorage budget shared with all other keys. | `.select("qualification_id,board,spec_version,subject,aliases,source")` for search, fetch `topics` on demand; add `.limit()`; only refresh when a version/etag changes. **1 day.** |
| P9 | **1,989 inline style objects** re-allocated per render. | repo-wide | Every child re-renders because `style` is a fresh object identity. Compounds P6 on large lists (StudyCalendar week grid, MistakeJournal). | Hoist static style objects to module scope. Incremental, start with `StudyCalendar.jsx` and `MistakeJournal.jsx`. |
| P10 | **`_allCurriculumRows()` re-parses `curriculum_cache_v1` on every call**, and is called once per keystroke via `searchCurriculumSubjects`. | `curriculum-store.jsx:100-110`, consumed at `CurriculumStep.jsx:95-97` (memoised on `query`, so once per keystroke) | Scans 78 seed rows + remote + cache and JSON-parses the cache each time. Noticeable typing lag once the cache grows. | Memoise `_readCurriculumCache` on the raw string; debounce the Combobox. **2 h.** |
| P11 | **Unbounded chat history written to localStorage on every message.** | `AIChat.jsx:2627` writes both `messages` and `historyRef.current` in full | O(n) write per message; eventual quota exhaustion (silently swallowed). | Cap at the last ~100 messages, mirroring `AIChat.jsx:1786`'s lesson-cache LRU. **1 h.** |

---

## 11. Technical Debt & Code Smells

- **`AIChat.jsx` — 294 KB, 3,189 lines, 16 top-level functions, 710 `React.createElement` calls, 1,145 branch tokens, 38 hardcoded whites, 11 duplicate `L()` helpers.** It contains six near-parallel engines (`LearnEngine:187`, `QuickCheckEngine:573`, `SpeedRoundEngine:839`, `PracticeEngine:1172`, `ExamSimEngine:1474`, `LessonEngine:1938`) all following generate → answer → score → award XP → celebrate. The celebration card alone is duplicated 5× (`:363, 689, 1057, 1290, 2146`). *Impact:* every change here risks five other modes; the file is the boot-time bottleneck; it is effectively unreviewable in a diff.
- **Two files written entirely without JSX** (`AIChat.jsx`, `StudyHub.jsx` — 873 `createElement` calls between them) while the other 41 use JSX. No stated reason. *Impact:* doubles the cognitive cost of the two most complex files.
- **Six functions over 450 lines** (`exam-wizard.jsx:108` 700 L; `AIChat.jsx:1938` 624 L; `StudyHub.jsx:28` 596 L; `AIPlan.jsx:5` 564 L; `Exams.jsx:2` 508 L; `Dashboard.jsx:3` 469 L). Each is a single React component holding all of its own state, effects, sub-render helpers and inline styles.
- **Three mutually inconsistent grade scales** — `exams-store.jsx:173-177` (80/60/40), `AIPlan.jsx:67` (80/60/40), `AIChat.jsx:535` and `:2169` (90/75/60). *Impact:* the same performance reports as a different letter grade depending on the screen. This is a live product bug.
- **Two inconsistent risk-threshold sets** — `60/35` (`exams-store.jsx:214`, `brain-store.jsx:482`, `AIPlan.jsx:291`) vs `60/40` (`Dashboard.jsx:323`, `:405`, `CourseDetail.jsx:45-48`, `AIPlan.jsx:400`).
- **Three XP formulas** — `AIChat.jsx:1075` (`correct*10 + 50/25`), `:1523` and `:1642` (`correct*15 + 100/40`).
- **Mock fixtures shipped in a production module** — `data.jsx:50` exports `MASTERY` and `WEAKNESS_ALERTS` alongside the live `buildScheduleData`/`deriveWeek` used by 6 files.
- **Dead code**: `subscribeCourses` (`course-store.jsx:149`, 0 consumers); `auth_accounts_v1` + `getAccounts`/`saveAccounts`/`hashPassword` (`auth-store.jsx:145-148`); `nav_schedule` i18n key + the `"schedule"` route (`index.html:321`, unreachable from `AppNav.jsx:38-46`); 9 orphan components in `_ds_bundle.js`; `progress-metrics.jsx` is 48 lines that arguably belong in `brain-store`.
- **`brain-store.jsx:674-687` monkey-patches `window.logMistake`.** Correct and guarded, but it means the function named in `mistakes-store.jsx:252` is not the function that runs.
- **39 empty `catch {}`** and **29 `window.X && window.X()` guards** — together these guarantee that every failure mode in §4.3 is invisible.
- **No linting, no formatting config, no CI.** No `package.json`, no `.eslintrc`, no GitHub Actions. Nothing mechanically prevents a typo'd global name (which, in this architecture, is `undefined` at call time rather than a load-time error).
- **`AI_COACH_V3_REDESIGN.md` (57 KB)** and `.agents/`, `.impeccable/`, `.claude/` directories are committed to the deploy package and shipped to production.
- **`.DS_Store` (10 KB)** is present in the working tree (gitignored as of `88269ba`, but still on disk and therefore in any drag-and-drop Vercel deploy).

---

## 12. Risk Register (ranked)

| # | Risk | Failure scenario | Blast radius | Likelihood | Severity |
|---|---|---|---|---|---|
| **R1** | Topic reorder corrupts mastery, sessions and mistakes | `requestTopicNames` (`ai-enrichment.jsx:98`) or a `curriculum` DB update returns topics in a different order, or a future "edit syllabus" UI supports drag-reorder. `fingerprintForScheduling` (`schedule-store.jsx:440`) omits topics, so no replan fires. Every `brain_mastery_v1["examId::N"]`, every completed `sess::examId::N`, and every `mistakes_v1.topicIdx` now names a different topic. | Every affected user's entire learning history, silently and irreversibly. The AI tutor then confidently teaches the wrong things. **No detection, no recovery.** | Medium (rises to High the day a reorder UI ships) | **Critical** |
| **R2** | Unauthenticated AI proxy drains the Anthropic key | A scraper or a curious user finds `/api/complete`. No auth, no rate limit, `max_tokens: 8192`. `index.html:25-27` documents that the cap was intentionally removed. | Unbounded financial loss; then a hard 429/402 that breaks every AI feature for every real user. | **High** | **Critical** |
| **R3** | `_ds_bundle.js` silently renders the June 2026 app | One `.jsx` 404s (partial deploy, CDN hiccup) or throws a Babel parse error. Babel logs and continues. `window.Dashboard` falls back to the stale bundle. Error boundary never fires. | Users see a plausible-but-wrong UI operating on current data. Debugging cost measured in days because nothing errors. | Medium | **Critical** |
| **R4** | Logout leaks a student's full record to the next browser user | `Settings.jsx:92` clears only `auth_session_v1`. Shared family laptop / school computer. | Full disclosure of another student's exams, grades, mistakes, chat transcripts, uploaded materials and real name. Minors. | **High** | **High** |
| **R5** | Community curriculum poisoning | One free signup + one `POST` inserts a `source:'community'` row for a combo not yet mirrored to the DB; `curriculum-store.jsx:107` gives it priority over the bundled official seed, globally, and it is then cached in every user's `curriculum_remote_v1`. | Every user of the app. Content flows straight into AI prompts. | Medium | **High** |
| **R6** | `localStorage` quota exhaustion | `curriculum_remote_v1` (unbounded, grown by community writes) + `courses_v1` (PDF-derived KBs) + `aicoach_chat_msgs_v2` (unbounded) exceed ~5 MB. Every write is in a `catch {}`. | Silent, permanent data loss. Symptom presents as "my exams vanished" with a clean console. | Medium | **High** |
| **R7** | Editing `onboarding-data.jsx` has no effect after deploy | `index.html:103` has no `?v=`; `vercel.json` sets no cache headers. This is *the* file you edit to add an exam type. | Team wastes hours; a shipped fix appears broken; may be "fixed" by shipping a second, wrong change. | **High** | Medium |
| **R8** | Wrong exam resolved by name collision | Student has "A-Level Mathematics" as both a midterm and a final (explicitly supported: `exams-store.jsx:92`). `StudySession.jsx:60`, `session-store.jsx:83/96`, `Dashboard.jsx:114` all match on `.name`. | Study session credit, confidence rating and readiness delta land on the wrong exam. `StudySession.jsx:66` additionally defaults `topicIdx = 0`. | Medium | **High** |
| **R9** | Load-order regression fails silently | Someone reorders `index.html:89-131` while adding a file. Six of the seven real order constraints (§4.3) degrade silently: mistakes stop affecting mastery, DB-only exams vanish, remote catalogs never load. | Whole feature areas quietly stop working; no console error, no Sentry event. | Medium | **High** |
| **R10** | `supabase-js@2` floating major breaks production | jsdelivr serves a new 2.x with a behaviour change. No SRI, no pin, no deploy required. | Auth and both catalogs break simultaneously for all users, with no correlating commit. | Low-Medium | **High** |
| **R11** | Stored XSS via AI/document content | A malicious PDF or a URL-imported page steers model output to emit `<img onerror=…>`; `StudyHub.jsx:442` renders it unescaped. Session token + all localStorage exfiltrated. | Account + full data compromise, persisted. | Low-Medium | **High** |
| **R12** | `allocateBudget` blocks the main thread | 750+ full parses of a course store containing PDF-derived knowledge bases, on "Add exam". | Multi-second freeze at the single most important moment in onboarding. Users assume the app crashed. | Medium | Medium |
| **R13** | Adding a 6th language is a 906-call-site change | Positional `L(en, uk, ru, fr, de)` in 40 helper definitions. | Feature becomes economically unviable; likely shipped half-done, producing an app that is 7% translated. | Medium | Medium |
| **R14** | Grade/risk/XP inconsistency erodes trust | Same 82% shows as A on the Dashboard and B in the AI Coach (§11). | Users stop believing the predictions — which are the product's core value proposition. | **High** (already occurring) | Medium |
| **R15** | Zero regression safety net | `calendar-tests.jsx` exists but is never run (`:4-6`, manual only). No test touches any store. | Every refactor in this document is unverifiable. This risk multiplies all others. | Certain | Medium |
| **R16** | Sub-path deploy breaks the design system | `index.html:16-23` uses `../../`. Any preview alias with a path prefix, embed, or reverse proxy. | Total visual failure + thrown errors in every screen (§5.1). | Low | Medium |

---

## 13. Prioritised Action Plan

### P0 — this week (stop the bleeding)

| Action | Files | Effort | Why first |
|---|---|---|---|
| **1. Authenticate `/api/complete`** — require a Supabase JWT, verify server-side, add a per-user daily token budget, add an Origin allowlist. | `api/complete.js`, `index.html:28-41` | 4-6 h | R2. Unbounded, ongoing financial exposure on a live URL. Nothing else matters if the key dies. |
| **2. Strip the 25 stale component globals from `_ds_bundle.js`** and add a boot assertion that every expected component global exists. | `_ds_bundle.js`, `index.html` inline script | 1 h | R3, R9. Converts the two worst *silent* failure classes into loud ones. Prerequisite for trusting any later change. |
| **3. Add `?v=` to the four unversioned script tags** and set explicit `Cache-Control` in `vercel.json`. | `index.html:102,103,107,129`, `vercel.json` | 15 min | R7. Otherwise every subsequent fix in this plan may not reach users. |
| **4. Clear all app localStorage keys on logout.** | `Settings.jsx:91-94` | 30 min | R4. Minors' personal data leaking between browser users. |
| **5. Escape HTML in `StudyHub.renderChatText`** — copy `_md` from `AIChat.jsx:51-62`. | `StudyHub.jsx:441` | 15 min | R11. One line, removes a stored-XSS sink. |
| **6. Restrict remote-over-seed override to `source === 'official'`.** | `curriculum-store.jsx:106-108` | 15 min | R5. Two lines, closes a global content-poisoning vector. |
| **7. Pin `supabase-js` to an exact version + SRI; add SRI to `jszip`.** | `index.html:21-22` | 30 min | R10. Removes an un-deployed-code-execution path. |
| **8. Absolute asset paths.** | `index.html:16,17,23` | 5 min | R16. |
| **9. Route the 39 `catch {}` blocks to Sentry.** | repo-wide | 2-3 h | Makes R6 and R9 observable. Sentry is already installed and unused for this. |

**P0 total: ~2 days.**

### P1 — next two weeks (make change safe)

| Action | Files | Effort | Why |
|---|---|---|---|
| **10. Topic-identity integrity check.** For each course-backed exam, compare each completed session's decoded `topicIdx` against `course.topics[idx].name` and the session's stored `topic` string. Report mismatches to Sentry. **Measure before migrating.** | new `integrity-check.jsx`, loaded last | 1 day | R1. You cannot safely fix the topic-index problem until you know how many users are already corrupted. |
| **11. Add `topicId` as a 4th segment of the session id** (`sess::examId::topicIdx::topicId`) and a `topicId` field to `Mistake`. Add `examIdFromId` + `topicIdFromId` to `schedule-store`; replace the two ad-hoc `split("::")` sites. | `schedule-store.jsx:17-23,732`, `session-store.jsx:66`, `mistakes-store.jsx:29` | 2 days | R1. Backward-compatible: old ids keep parsing. Makes the eventual re-key mechanical. |
| **12. Memoise `getCourses()`** on the raw localStorage string (copy `exams-store.jsx:115-123`); hoist `getMastery()` out of `_topicRetention`'s loop; precompute `urgency` per exam; move `getMastery()` below `getBrain`'s memo check. | `course-store.jsx:93`, `schedule-store.jsx:177,293,340`, `brain-store.jsx:490` | 1 day | P1-P4. ~750 parses → 1. Biggest UX win per line changed. |
| **13. Match exams by id, never by name.** Replace the 5 `.name ===` lookups; when a session cannot be resolved, **surface an error instead of defaulting `topicIdx = 0`**. | `StudySession.jsx:60,66,82`, `session-store.jsx:83,96`, `Dashboard.jsx:114` | 4 h | R8. |
| **14. Single-source the thresholds.** Publish `GRADE_BANDS`, `RISK_THRESHOLDS`, `XP_RULES`, `DEFAULT_SESSION_MIN`, `DEFAULT_TOPIC_COUNT`, `DEFAULT_WEEKLY_HOURS` from their owning stores; replace all 14 `\|\| 45`, 8 `\|\| 10`, 8 risk sites, 4 grade-band sites, 3 XP sites. | `exams-store`, `profile-store`, `brain-store` + 14 consumers | 1 day | R14. Fixes a live, user-visible inconsistency and closes the entire bug class that produced the session-duration incident. |
| **15. Add `sectionBased`/`enMedium` explicitly to every `onboarding-data.jsx:6-31` entry**; delete `SECTION_BASED_FALLBACK` and `EN_MEDIUM_FALLBACK`. | `onboarding-data.jsx:6-31`, `exam-wizard.jsx:201-206` | 2 h | Drops "add an exam" from 5 places to 3. |
| **16. Wire `subscribeCourses` into `subscribeBrain`**; add `courses` to `getBrain`'s memo signature; add `_bump()`/notify to the four silent mistakes-store mutators. | `brain-store.jsx:494,650-661`, `mistakes-store.jsx` | 4 h | §5.8. Fixes stale-UI bugs that currently present as "the app didn't save it". |
| **17. Extend `SYNCED_KEYS` to all 22 live keys; delete the dead `ACCOUNTS_KEY`.** | `index.html:282`, `auth-store.jsx:7,145-148` | 30 min | §5.9. |
| **18. Bound the unbounded stores** — LRU-cap `aicoach_chat_msgs_v2`/`aicoach_chat_hist_v2`; add `.limit()` + column projection to the curriculum fetch; surface quota-exceeded to Sentry. | `AIChat.jsx:2627`, `curriculum-store.jsx:82` | 1 day | R6. |
| **19. Switch to production React builds.** | `index.html:18-19` | 15 min | P7. |

**P1 total: ~8-9 days.**

### P2 — next quarter (structural)

| Action | Effort | Why |
|---|---|---|
| **20. Store test harness.** Extend the `calendar-tests.jsx` pattern (dependency-free `window.runXTests()`) to `exams-store`, `schedule-store`, `brain-store`, `course-store`, `mistakes-store`. Add a `?selftest=1` query param to `index.html` that runs all suites and renders a pass/fail panel. | 1 week | R15. This is the enabler for everything below. Works with zero build tooling. |
| **21. Split `AIChat.jsx`.** Extract the 6 engines into `AIChat-engines.jsx`, the shared XP-celebration card into one component, and lazy-load the engines via a dynamically injected `<script type="text/babel">` + `Babel.transformScriptTags()` on first chat navigation. | 1-2 weeks | P6, and the file is currently unreviewable. |
| **22. Object-keyed i18n.** Publish `window.L5(t, {en,uk,ru,fr,de})` from `i18n.jsx`; migrate the 40 helper definitions; convert call sites file by file (start with the 68 strings already in the dictionary). | 2-3 weeks | R13. Makes a 6th language additive. |
| **23. Complete the topic-id migration.** Once #10's telemetry confirms the corruption rate: write a one-time `brain_mastery_v2` migration keyed by `topicId`, backfilled via the name-match from #10, and add topics to `fingerprintForScheduling`. | 1 week | R1, final resolution. |
| **24. Colour-token sweep.** Replace ~155 hardcoded colours (excluding the documented exceptions in `exams-store.jsx:15-18`, `index.html:145-231`, `tokens/`, `tweaks-panel.jsx`). Start with `AIChat.jsx` (38) and `StudyHub.jsx` (27). | 3-4 days | Unblocks dark mode and the `tokens/tiers.css` XP-tier re-theming that is already built but partially broken. |
| **25. Persist study data to Supabase** behind the existing auth. Tables mirroring `exams_list_v2`, `courses_v1`, `study_schedule_v1`, `brain_mastery_v1`, with RLS `user_id = auth.uid()`. Keep localStorage as an offline cache. | 3-4 weeks | Resolves R4 and R6 structurally, and removes the "logged in on my laptop, everything is gone" experience that will otherwise cap retention. |
| **26. Remove production dev artifacts** — `tweaks-panel.jsx`, `AI_COACH_V3_REDESIGN.md`, `.agents/`, `.impeccable/`, `.claude/`, `.DS_Store` from the deploy package. | 1 h | |
| **27. Load-order manifest.** Give each file a `window.__REQUIRES_<name> = [...]` list checked by the boot assertion from #2. | 4 h | Turns all seven §4.3 constraints into loud startup errors. |

### Suggested sub-agent handoffs

| Priority | Action | Owner sub-agent |
|---|---|---|
| P0 | Authenticate `/api/complete`; SRI + version pinning; XSS escape; logout data clearing; community-write override | `security-guardian` |
| P0 | Strip stale `_ds_bundle` globals; cache-bust the 4 unversioned tags | `code-archaeologist` / build owner |
| P1 | `getCourses` memo, `getMastery` hoisting, `getBrain` memo ordering, urgency precompute | `performance-optimizer` |
| P1 | Topic-identity integrity check + `topicId` session-id extension | `code-archaeologist` |
| P2 | Store test harness (`?selftest=1`) | `testing-specialist` |
| P2 | `AIChat.jsx` split + lazy engine loading | `performance-optimizer` |
| P2 | Object-keyed i18n migration | `documentation-specialist` / i18n owner |
| P2 | Supabase data persistence + RLS | `security-guardian` + backend owner |

---

## 14. Open Questions / Unknowns

1. **Is `ai-exam-coach.vercel.app` (the stale deployment lacking `/api/complete`) still publicly reachable?** If so, users landing there get an app whose every AI feature 404s. Should it be deleted or redirected to `-v2`? *(Not verifiable from the repo.)*
2. **Has any real user's `brain_mastery_v1` already been corrupted by a topic reorder?** Answering this is the entire purpose of P1 action #10. Do you have any production Sentry data or a user report matching "the app thinks I studied something I didn't"?
3. **Is `_ds_bundle.js` regenerable from source, or is it an opaque artifact?** If regenerable, #2 (strip the stale globals) is trivial. If not, the 25 assignments must be hand-edited in a 384 KB file.
4. **What is the intended relationship between the `qualifications` table and `onboarding-data.jsx`?** The header comment (`qualifications-store.jsx:3-8`) says the DB is the single source, but the bundled snapshot is still hand-maintained and there is no sync script (`scripts/pull-catalog.mjs` exists — does it regenerate `onboarding-data.jsx`, or only `curriculum-data.jsx`?).
5. **Is the demo mode (`auth-store.jsx:141`) expected to persist data across sessions?** It writes to the same localStorage keys as a real account, so a demo user's data becomes a real user's data on signup, and vice versa.
6. **`data.jsx` exports `MASTERY` and `WEAKNESS_ALERTS` (static mocks) alongside live functions.** Are the mocks still rendered anywhere, or is this pure dead weight?
7. **What is the intended lifecycle of `curriculum_cache_v1` vs `curriculum_remote_v1`?** A row that a user AI-generated locally, then pushed to the DB, will exist in both. `_allCurriculumRows` (`:109`) appends the cache **after** remote, so `getCurriculum`'s `matches[0]` prefers remote — but `searchCurriculumSubjects` dedups by lowercase subject in iteration order, so the two can disagree about which row wins.
8. **Is there a privacy policy / parental-consent flow anywhere?** The target users are secondary-school students and their first names, grades, and uploaded coursework are sent to a third-party model on every request.
9. **`nav_schedule` and the `"schedule"` route** — was a separate Schedule tab intentionally merged into `CalendarHub`, and is `Schedule.jsx` (148 L, still loaded at `index.html:127`) now dead?
10. **Who is the intended audience for `.agents/`, `.impeccable/`, `.claude/` and `AI_COACH_V3_REDESIGN.md`?** They add 80 KB to every deploy.

---

## 15. Appendix

### A. `index.html` load order (authoritative, `:89-131`)

```
 89 i18n.jsx?v=cal3                 110 onboarding-steps.jsx?v=fx3
 90 exams-store.jsx?v=fx4           111 Combobox.jsx?v=fx2
 91 course-store.jsx?v=c2           112 CurriculumStep.jsx?v=fx3
 92 schedule-store.jsx?v=budget14   113 exam-wizard.jsx?v=fx10
 93 profile-store.jsx?v=onb1        114 Onboarding.jsx?v=fx1
 94 auth-store.jsx?v=sb1            115 Dashboard.jsx?v=fx5
 95 mistakes-store.jsx?v=dash1      116 CourseDetail.jsx?v=fx2
 96 session-store.jsx?v=fx1         117 DayDetail.jsx?v=fx2
 97 progress-metrics.jsx?v=fix1     118 AIChat.jsx?v=fx8
 98 brain-store.jsx?v=fix10         119 TodaysMission.jsx?v=fx2
 99 tier-theme.jsx?v=tier1          120 StudySession.jsx?v=fx4
100 ai-enrichment.jsx?v=onb2        121 SessionRecap.jsx?v=fx2
101 ai-brain.jsx?v=coach4           122 AIPlan.jsx?v=fx3
102 data.jsx                    ⚠   123 BurnoutAlert.jsx?v=fx2
103 onboarding-data.jsx         ⚠   124 StudyHub.jsx?v=fx2
104 qualifications-store.jsx?v=q1   125 MistakeJournal.jsx?v=fx1
105 curriculum-data.jsx?v=nmt4      126 Progress.jsx?v=fx2
106 curriculum-store.jsx?v=sb4      127 Schedule.jsx?v=fx4
107 tweaks-panel.jsx            ⚠   128 StudyCalendar.jsx?v=fx4
108 AppNav.jsx?v=fx4                129 calendar-tests.jsx          ⚠
109 Landing.jsx?v=fx2               130 Exams.jsx?v=fx3
                                    131 Settings.jsx?v=fx3
   ⚠ = no ?v= cache-buster
```

### B. Quick greps for future audits

```bash
# every window global publication
grep -n "Object.assign(window" -A 15 *.jsx
grep -nE "^\s*window\.[A-Za-z_]+ *=" *.jsx

# positional topic identity
grep -rn "topicIdx" *.jsx | wc -l          # 108
grep -rn 'split("::")' *.jsx               # id-scheme parsing outside its owner

# duplicated magic defaults
grep -rn "sessionLengthMin" *.jsx | grep -E "\|\||\?\?"
grep -rn "topicCount || 10" *.jsx
grep -rn ">= 80\|>= 60\|>= 40\|>= 35" *.jsx

# hardcoded colours
grep -ohiE "#fff\b|#ffffff\b|'white'|\"white\"|rgba\(255, ?255, ?255" *.jsx | wc -l   # 128

# unversioned scripts
grep -oE 'src="[^"]+\.jsx[^"]*"' index.html | grep -v "?v="

# stale bundle shadowing
grep -oE "window\.[A-Za-z_$][A-Za-z0-9_$]* *=" _ds_bundle.js | sort -u

# i18n scatter
grep -rn "const L = " *.jsx | wc -l        # 40 helper definitions
grep -ohE "\bL\(" *.jsx | wc -l            # 906 call sites
```

### C. Things this codebase does notably well (preserve these)

- **`migrateX()` on read *and* write** in all six persistence stores. Hand-edited or partial localStorage can never crash a downstream read. This is a stronger guarantee than most TypeScript codebases achieve.
- **Raw-string memoisation** in `getExams` (`exams-store.jsx:115`) and `getProfile` (`profile-store.jsx:71`) — a valid `getSnapshot` for `useSyncExternalStore` with a stable reference. `getCourses` should copy this exactly.
- **`api/fetch-url.js` SSRF hardening** (`:26-67`) — literal-IP *and* resolved-IP checks, manual redirect following with per-hop revalidation, byte and time caps. Textbook.
- **Explicit invariants in comments**: `exams-store.jsx:336-342` (why the profile patch must precede `saveExams`), `schedule-store.jsx:14-15` (why `::` and not `_`), `CurriculumStep.jsx:19-22` (why module grouping must not reorder), `schedule-store.jsx:59-64` (why `__personal__` needs no special-casing). These comments are the reason this audit was tractable.
- **"Completed history and manual placements always survive replanning"** — a single principle applied consistently at `schedule-store.jsx:449, 480, 511, 774`.
- **`StudyLayer` rendered above the tab router** (`index.html:344`) so switching tabs can never lose a running session.
- **`calendar-tests.jsx`** — the right shape for testing in a no-build environment. It should be the template for #20, not an orphan.
- **i18n dictionary is 100% complete** across all 5 languages — the discipline exists, it just needs to cover the other 93% of strings.
