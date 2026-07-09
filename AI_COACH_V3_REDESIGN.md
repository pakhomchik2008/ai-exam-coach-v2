# AI Coach V3 — Redesign Blueprint

> **Status:** Audit + design only. No code written. Nothing modified.
> **Author:** Claude (repo audit of `ai-exam-coach-deploy/`)
> **Core thesis:** The *data brain* is already excellent. The *experience layer*
> on top of it (AI Coach, Dashboard, Lesson Engine) does not yet do it justice.
> V3 is not a rebuild — it is turning AI Coach into the product and letting the
> Brain drive every screen.

---

## 0. TL;DR for the impatient

- **Biggest asset:** `brain-store.jsx` is a genuine single source of truth
  (`useBrain()` = real `useSyncExternalStore`; readiness → grade → probability →
  pace all derive from ONE number). Do not touch its math. Build V3 *on* it.
- **Biggest bug:** `LessonEngine` (in `AIChat.jsx`) declares React hooks
  **after** conditional `return`s (lines ~397–402, after the `loading`/`error`/
  `done` early returns at 234/243/251). This violates the Rules of Hooks and
  will crash the moment a lesson successfully loads. **Fix this before anything
  else.** (See §14.)
- **Biggest experience gap:** AI Coach's "Chat" mode is exactly the ChatGPT feel
  you want to kill; "Review" and "Practice" are just the Learn engine with a
  different string — they are not distinct experiences.
- **Biggest duplication:** three independent quiz renderers and three
  independent AI-chat implementations across `AIChat.jsx`, `StudySession.jsx`,
  `StudyHub.jsx`.
- **Already done (do NOT rebuild):** AI topic-name generation, KB extraction
  from uploads, adaptive scheduling, session recap with real deltas, the whole
  Brain reactivity layer.

---

## 1. Repository Audit

### 1.1 File inventory (by role)

| Layer | File | Lines | Role | Health |
|---|---|---|---|---|
| **Shell** | `index.html` | 318 | Script load order, `window.claude` proxy, routing (`App`) | ✅ Good |
| **AI proxy** | `api/complete.js` | 58 | Vercel fn → Anthropic; `maxDuration:60`; accepts `messages`\|`prompt` | ✅ Good |
| **Brain** | `brain-store.jsx` | 537 | **Single source of truth**: mastery, retention, readiness, recommend | ✅ Excellent |
| **AI layer** | `ai-brain.jsx` | 282 | `brainComplete` (injects learner ctx), typed ops, coach-session tracker | ✅ Good |
| **AI bg** | `ai-enrichment.jsx` | 164 | Topic names, KB extraction (fire-and-forget) | ✅ Good, underused |
| **Stores** | `exams-store.jsx` | 263 | Exams + legacy `deriveCourse` (superseded) | ⚠️ Has dead path |
| | `schedule-store.jsx` | 356 | Sessions, reconcile, adapt, relabel | ✅ Good |
| | `profile-store.jsx` | 59 | Name, weekly hours, prefs | ✅ Good |
| | `mistakes-store.jsx` | 36 | Wrong-answer log | ✅ Good, underused |
| | `auth-store.jsx` | 155 | Sessions/accounts + Supabase | ✅ Good |
| | `progress-metrics.jsx` | 43 | Streak + achievements (derived) | ✅ Good |
| **Screens** | `Dashboard.jsx` | 489 | Hero + recommendation + 7 more sections | ⚠️ Overloaded |
| | `AIChat.jsx` | 695 | **AI Coach v6**: LessonEngine + ChatMode + lobby | ❌ Bug + monolith |
| | `StudySession.jsx` | 358 | Timer + mid-session quiz + Socratic chat | ⚠️ Dup quiz/chat |
| | `StudyHub.jsx` | 582 | Upload → flashcards/quiz/videos + chat | ⚠️ Dup quiz/chat, monolith |
| | `Progress.jsx` | 179 | Mastery table + achievements (brain-driven) | ✅ Good |
| | `MistakeJournal.jsx` | 73 | Read-only mistake list | ⚠️ No AI insight |
| | `TodaysMission.jsx` | 124 | Pre-session briefing | ✅ Good |
| | `SessionRecap.jsx` | 241 | Coverage + celebration + chat summary | ✅ Good |
| | `Exams.jsx` | 303 | Exam list/detail, wizard entry | ✅ Good |
| | `Schedule.jsx` | 142 | Week/day schedule | ✅ Good |
| | `CourseDetail.jsx` | 253 | Per-exam modal | ✅ Good |
| | `AIPlan.jsx` | 371 | Post-onboarding plan screen | ✅ Good |
| | `Landing/Onboarding/Settings` | — | Auth + setup + settings | ✅ Good |
| **Nav** | `AppNav.jsx` | 92 | 8-tab top nav + lang | ⚠️ Too many tabs |
| **Design** | `_ds_bundle.js` | 11.7k | Design system components | ✅ (vendored) |

### 1.2 Data flow (the important part)

Every write goes through a store → bumps a version → `useBrain()` re-renders every
subscribed screen. There is **no prop-drilling of state** and **no per-screen
recomputation of progress** — this is the architecture's crown jewel.

```
 user action (answer quiz / rate session / mark coverage)
      │
      ▼
 recordReview / recordConfidence / markTopicsStudied / logMistake   (brain-store)
      │  writes localStorage + _bump()
      ▼
 _brainListeners → useSyncExternalStore → every useBrain() screen re-renders
      │
      ▼
 getBrain()  ── memoized snapshot ──►  examViews[] (readiness, grade, prob,
                                        pace, weakest, due), overall*, dueReviews,
                                        weakestTopics, streak
```

### 1.3 The one canonical number

`examReadiness()` → a single 0–100 per exam. From it, **everything** is derived
in ONE place (`brain-store.jsx`):

```
readiness ──► projectedReadiness(daysAway) ──► predictedGrade
          └─► targetProbability            ──► risk
          └─► paceFromReadiness            ──► pace
```

No two screens can disagree because no screen computes these itself. **Preserve
this invariant in V3 at all costs.**

---

## 2. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│  index.html  ·  App()  ·  routing (landing/onboarding/planning/app)   │
└───────────────┬──────────────────────────────────────────────────────┘
                │ renders one tab at a time
   ┌────────────┼───────────────┬──────────────┬───────────────┐
   ▼            ▼               ▼              ▼               ▼
Dashboard    AIChat          StudyHub       Progress        Exams/Schedule
(hero+7)   (Coach v6)       (upload)       (mastery)       (CRUD+plan)
   │            │               │              │               │
   └────────────┴───────┬───────┴──────────────┴───────────────┘
                        │ every screen calls
                        ▼
                 ┌─────────────┐   window.useBrain()  = useSyncExternalStore
                 │  brain-store │◄──────────────────────────────────────┐
                 │  getBrain()  │  memoized snapshot                     │
                 └──────┬───────┘                                        │
                        │ composes                                       │ _bump()
   ┌───────────┬────────┼─────────┬───────────┬──────────┐              │
   ▼           ▼        ▼         ▼           ▼          ▼              │
exams-store schedule  profile  mistakes   mastery      KB            (writes)
                        -store   -store    (in-brain)  (in-brain)      │
                                                                        │
                 ┌──────────────┐                                       │
                 │  ai-brain.jsx │  brainComplete() injects learner ctx │
                 │  (AI layer)   │  into EVERY AI call ─────────────────┘
                 └──────┬────────┘
                        ▼
                 api/complete.js ──► Anthropic (claude-haiku-4-5)
                        ▲
                 ai-enrichment.jsx (bg: topic names, KB extraction)
```

**Read this as:** screens are thin views over the Brain; the Brain composes six
stores; the AI layer is a single choke point that always knows who the student
is. V3 adds an *experience layer* (Lesson Engine sub-components) — it does not
add a parallel data path.

---

## 3. Learning Flow

### 3.1 Current flow (two parallel, overlapping paths)

```
PATH A — "scheduled study" (Dashboard-driven)
  Dashboard hero ──► TodaysMission (briefing) ──► StudySession
     (recommendNextAction)      (why today)        (timer + quiz + Socratic chat)
                                                          │
                                                          ▼
                                                    SessionRecap
                                                (coverage → celebration → brain write)

PATH B — "AI Coach" (AIChat-driven)
  AI Coach lobby ──► Learn: topic picker ──► LessonEngine (teach→q→checkpoint)
                 ├─► Review: LessonEngine("Review: X")     │
                 ├─► Practice: LessonEngine("Practice: Y") ▼
                 └─► Chat: free-text ChatMode         celebration (XP lost on exit)
```

**Problem:** two engines that both "teach with AI + quiz," neither aware of the
other. StudySession has a Socratic chat + timer; LessonEngine has structured
steps. They should be **one** engine.

### 3.2 Target flow (single Lesson Engine, Brain-closed loop)

```
  ANY entry (Dashboard "Start now" / Coach mode / Review nudge)
        │
        ▼
   Mission  ──►  Concept  ──►  Worked Example  ──►  Mini-Quiz (varied)
   (why now,     (≤120 w,      (reveal steps)       (mcq/tf/fill/order/
   from Brain)   1 idea)                              match/predict/slider)
        │                                                   │
        │                                          Adaptive Feedback
        │                                       (never just the answer;
        │                                        references prior mistakes)
        ▼                                                   │
   Reflection  ◄──────────────────────────────────────────┘
   ("explain in your own words" — one free-text moment, optional)
        │
        ▼
   Challenge (harder) ──► Summary ──► Brain Update (mastery+XP PERSISTED)
        │
        ▼
   Next Recommendation  ──► back to recommendNextAction() (closes the loop)
```

The key structural change vs today: **the celebration hands back to
`recommendNextAction()`** instead of dead-ending, and **XP is persisted to the
Brain** instead of living in `LessonEngine` local state.

---

## 4. UX Problems

| # | Problem | Where | Severity |
|---|---|---|---|
| U1 | Lesson crash on successful load (hooks order) | `AIChat.jsx` LessonEngine | 🔴 Critical |
| U2 | "Chat" mode = ChatGPT feel; free text, no structure | `AIChat.jsx` ChatMode | 🔴 High |
| U3 | Review/Practice are Learn-with-a-string, not distinct | `AIChat.jsx` router | 🔴 High |
| U4 | Dashboard shows 8 competing sections | `Dashboard.jsx` | 🟠 High |
| U5 | Same course data rendered 3× (stat row, readiness list, CourseCard grid) | `Dashboard.jsx` | 🟠 Med |
| U6 | Streak shown 3× (stat, StreakBanner, implied in hero) | `Dashboard.jsx` | 🟠 Med |
| U7 | 8 top-level nav tabs; Study vs AI Coach overlap confuses | `AppNav.jsx` | 🟠 Med |
| U8 | XP shown in celebration but never persisted (evaporates) | `AIChat.jsx` | 🟠 Med |
| U9 | Loading a lesson = one slow blocking call, no partial render | `AIChat.jsx` | 🟡 Med |
| U10 | Interaction variety limited to mcq/tf/fill (fill needs typing) | `AIChat.jsx` | 🟡 Med |
| U11 | Mistake Journal is a passive list — no "you did this 4×" insight | `MistakeJournal.jsx` | 🟡 Low |
| U12 | No confidence slider / ordering / matching / prediction anywhere | multiple | 🟡 Low |

---

## 5. AI Problems

| # | Problem | Detail |
|---|---|---|
| A1 | **Lesson prompt ignores the Brain's richest signals** | `brainComplete` injects learner context, but the lesson-generation prompt (`AIChat.jsx` ~85–124) doesn't ask the model to *reference* specific prior mistakes or mastery ("you confused u and dv last time"). The data is right there in `getBrain().mistakes` + topic history. |
| A2 | **No memory-grounded openers** | The vision ("I noticed you've made this mistake 4 times") is fully supported by `mistakes-store` + `recordReview` history but never surfaced in a lesson. |
| A3 | **Three system prompts for "be a tutor"** | `StudySession` Socratic prompt, `AIChat` LessonEngine prompt, `ai-brain.aiTutorReply` — divergent voices. Should be one prompt library. |
| A4 | **Big-paragraph risk** | ChatMode caps at 80 words (good) but the Socratic tutor and lesson `teach.body` have no hard "end with interaction" enforcement beyond instruction. |
| A5 | **Practice ≠ exam questions** | "Practice" should generate exam-style/past-paper questions (grounded in `examBoard` + KB), not a generic lesson. The plumbing (`aiGenerateQuiz`, KB) exists; it's just not wired to a distinct Practice flow. |
| A6 | **Review ignores `dueReviews`** | The Brain already computes `dueReviews` (topics actively forgetting). Review mode should quiz *those*, spaced-repetition style, not run a fresh lesson. |

**Good news:** none of A1–A6 need new data. Every signal already exists in the
Brain. These are prompt + wiring changes.

---

## 6. Dashboard Problems

Current sections, top to bottom:

1. Adaptive-schedule toast
2. **Today's AI Plan hero** (recommendation + Start now) ← *this is the whole point*
3. 4-stat row (predicted grade, this week, remaining, streak)
4. Weekly progress bar + WeekStrip
5. StreakBanner
6. BurnoutAlert
7. Exam-readiness list (per course)
8. Upcoming-exams CourseCard grid

**The hero (2) already answers "what should I study right now?" perfectly.**
Sections 3–8 dilute it. Recommended V3 Dashboard:

- **Keep & enlarge:** the hero (make it 60% of first viewport).
- **Collapse** 3+4+5 into one slim "today strip" (streak · hours today · next exam countdown) — one line, not three cards.
- **Move** 7+8 (per-course readiness, CourseCards) **below the fold** or into the
  Exams tab. They answer "how am I doing overall," a different question.
- **Keep** BurnoutAlert (conditional, rarely shown — fine).
- Result: first screen = hero + one strip. Everything else is scroll-to-see.

Cards audit (would a student care *right now*?):

| Card | Verdict |
|---|---|
| Today's recommendation | **KEEP** (hero) |
| Streak | Merge into strip |
| This week h/goal | Merge into strip |
| Remaining sessions | Cut from Dashboard (lives in Schedule) |
| Predicted grade | Merge into strip (single value) |
| Weekly bar + WeekStrip | Below fold |
| Per-course readiness list | Move to Exams |
| CourseCard grid | Move to Exams (duplicate of the list) |

---

## 7. Brain Improvements

The Brain is the strength. It needs **additions, not surgery.**

| # | Add | Why | Risk |
|---|---|---|---|
| B1 | **Persist XP + level** (`brain_xp_v1`) | XP currently lives in `LessonEngine` state and dies on exit (U8). Add `recordXp(amount, reason)` + `getXp()` + a level curve. | Low — new key, additive |
| B2 | **`mistakeFrequency(topicIdx)`** helper | Powers "you've made this mistake N times." Data already in `mistakes-store`; just aggregate. | Low |
| B3 | **`dueReviewQueue()`** ordered for Review mode | `dueReviews` exists; expose an ordered, dedup'd queue the Review flow consumes. | Low |
| B4 | **Remove legacy `deriveCourse`/`deriveCourses`** from the read path | `brainCourses()` supersedes it (comment in brain-store admits "no longer read by any pixel"). Confirm zero consumers, then delete to kill the duplicate readiness formula. | Med — must grep every caller first |
| B5 | **`recordLessonResult()`** one-call commit | Today `LessonEngine` calls `markTopicsStudied` + `recordConfidence` + `commitCoachSession` separately. One method = one write, fewer bugs. | Low |

**Do NOT** change: `examReadiness`, `projectedReadiness`, `targetProbability`,
`applyReview`, or the memo in `getBrain()`. These are correct and load-bearing.

---

## 8. Lesson Engine Design

### 8.1 Current shape (the problem)

`LessonEngine` is **one ~440-line component** with **19 `useState` hooks**, mixing:
lesson generation, step routing, 6 step renderers, checkpoint sub-state, XP,
mastery, celebration — plus the Rules-of-Hooks violation (§14).

### 8.2 Target shape (composition)

```
<LessonEngine topic|mode>            ← orchestrator only: owns plan + step index
  ├─ useLessonPlan(topic, mode)      ← hook: generation, loading, error, retry
  ├─ useLessonProgress()             ← hook: step index, results, XP, adaptation
  ├─ <LessonProgressBar/>            ← presentational
  └─ <StepRenderer step>             ← switch → one component per step type
        ├─ <TeachStep/>
        ├─ <QuizStep kind="mcq|tf|fill|order|match|predict"/>   ← ONE shared quiz
        ├─ <WorkedExampleStep/>
        ├─ <ConfidenceStep/>         ← NEW: slider
        ├─ <ReflectionStep/>         ← NEW: "explain in your own words"
        └─ <CheckpointStep/>         ← its OWN component → its hooks are legal
  └─ <LessonComplete/>               ← celebration + Next Recommendation handoff
```

Moving `CheckpointStep` into its own component **structurally fixes** the hooks
bug (its `cpIdx`/`cpSelected` state lives where it's always called).

### 8.3 Step-type contract (extend the existing JSON schema)

Today's schema (`teach`, `mcq`, `tf`, `fill`, `worked_example`, `checkpoint`) is
good. Add:

| New type | Interaction | Maps to user's vision |
|---|---|---|
| `order` | drag/tap to sequence steps | "Ordering" |
| `match` | tap-pair two columns | "Matching" |
| `predict` | "what happens next?" buttons | "Prediction" |
| `confidence` | 1–5 slider, writes `recordConfidence` | "Confidence slider" |
| `reflect` | free text, AI grades leniently | "Explain in your own words" |

Goal: **80% of steps are button/tap interactions, ≤20% typing** (matches the
vision doc's "80% interactions by buttons").

### 8.4 One shared quiz component (kills triplicate)

`QuizStep` replaces the near-identical option-button + green/red-reveal logic in
`AIChat` (renderMcq/renderCheckpoint), `StudySession` (mid-session quiz), and
`StudyHub` (buildQuizEl). One component, three callers.

---

## 9. Wireframes (ASCII)

### 9.1 Dashboard (V3) — answers ONE question

```
┌───────────────────────────────────────────────┐
│ 🔥 4    ·   1.5h today   ·   Maths in 12 days  │  ← slim strip (was 3 cards)
├───────────────────────────────────────────────┤
│                                                 │
│   ⚡ REVIEW NOW                        ~18 min   │
│   Integration by Parts                          │  ← HERO (60% of viewport)
│   Maths · retention faded to 41%                │
│                                                 │
│   › You got this wrong twice last week          │  ← memory-grounded reason
│   › Maths is 41% ready vs your A target         │
│                                                 │
│   Readiness  41% ▓▓▓▓░░░░░░  → 48%              │
│                                                 │
│   [  ✨ Start now  →  ]                          │
│                                                 │
├───────────────────────────────────────────────┤
│  ▼ also today (2)   ·   this week ▓▓▓░ 62%      │  ← everything else, below fold
└───────────────────────────────────────────────┘
```

### 9.2 Lesson Engine step (mostly buttons)

```
┌───────────────────────────────────────────────┐
│ Step 3 / 8   Mastery 41%   2/2 ✓   ~6 min left │
│ ▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░              │
├───────────────────────────────────────────────┤
│  ⚡ QUESTION                            medium   │
│  ∫ x·eˣ dx — which is the right choice of u?    │
│                                                 │
│   [ A ]  u = eˣ                                 │
│   [ B ]  u = x            ← tap                  │
│   [ C ]  u = x·eˣ                               │
│   [ D ]  dv = x                                 │
│                                                 │
│  ── after answer ──                             │
│  💡 Not quite — you're mixing up u and dv.      │
│     You did the same on Tue. Rule: pick u as    │  ← references prior mistake
│     the part that gets simpler when differentiated.
│                                    [ Continue → ]│
└───────────────────────────────────────────────┘
```

### 9.3 Lesson complete → closes the loop

```
┌───────────────────────────────────────────────┐
│                 🌟  Lesson Complete             │
│        Integration by Parts · 87% · Grade A     │
│                                                 │
│   Accuracy 87%   +145 XP   41%→52%   🔥 5       │  ← XP now PERSISTED
│                                                 │
│   Next up (from your Brain):                    │
│   ┌─────────────────────────────────────────┐  │
│   │ ⚡ Definite Integrals — never studied    │  │  ← recommendNextAction()
│   │                          [ Start next → ]│  │
│   └─────────────────────────────────────────┘  │
│                                   [ Done ]      │
└───────────────────────────────────────────────┘
```

### 9.4 Simplified nav (beginner vs advanced)

```
PRIMARY (always):   [ Learn ]   [ Today ]   [ Progress ]
                        │           │            │
                    AI Coach    Dashboard    mastery+exams
MORE ▾ (advanced):  Study tool · Mistakes · Schedule · Exams · Settings
```

---

## 10. Component Tree (target)

```
App
├── AppNav (3 primary + "More" menu)
├── Dashboard
│   ├── TodayStrip            (streak · hours · countdown)   ← new, replaces 3 cards
│   ├── RecommendationHero    (recommendNextAction)          ← existing, enlarged
│   └── BelowFold  (weekly bar, per-course → link to Exams)
├── AICoach (was AIChat)
│   ├── CoachLobby            (Learn / Review / Practice)     ← Chat demoted to "More"
│   ├── LessonEngine          (orchestrator)                  ← SPLIT
│   │   ├── useLessonPlan
│   │   ├── useLessonProgress
│   │   ├── LessonProgressBar
│   │   ├── StepRenderer
│   │   │   ├── TeachStep / WorkedExampleStep
│   │   │   ├── QuizStep (shared)   ◄── also used by StudySession, StudyHub
│   │   │   ├── ConfidenceStep / ReflectionStep   (new)
│   │   │   └── CheckpointStep       (own hooks — fixes bug)
│   │   └── LessonComplete   (celebration + NextRecommendation)
│   ├── ReviewFlow            (consumes dueReviewQueue)        ← new, distinct
│   └── PracticeFlow          (exam-style, KB-grounded)        ← new, distinct
├── StudyHub (upload)         ← reuse QuizStep
├── Progress / Exams / Schedule / MistakeJournal / Settings
└── shared: brain-store, ai-brain, ai-enrichment, all stores  (unchanged)
```

---

## 11. Implementation Roadmap

**Rule (yours):** one subsystem per implementation, verify before the next.

| Phase | Deliverable | Subsystem | Depends on |
|---|---|---|---|
| **0** | Fix LessonEngine hooks crash (extract `CheckpointStep`) | AIChat | — |
| **1** | Persist XP + level in Brain (`recordXp`/`getXp`) | brain-store | — |
| **2** | Split LessonEngine into orchestrator + hooks + StepRenderer | AIChat | 0 |
| **3** | Extract shared `QuizStep`; repoint StudySession + StudyHub | shared | 2 |
| **4** | Memory-grounded lesson prompts (reference mistakes/mastery) | ai-brain | 1 |
| **5** | Real Review flow (consume `dueReviewQueue`) | AICoach | 2,4 |
| **6** | Real Practice flow (exam-style, KB-grounded) | AICoach | 2,4 |
| **7** | New step types: confidence, reflect, order, match, predict | AICoach | 2 |
| **8** | Dashboard slim-down (TodayStrip + enlarged hero) | Dashboard | 1 |
| **9** | Nav simplification (3 primary + More) | AppNav | 8 |
| **10** | Mistake Journal AI insight ("you did this N×") | MistakeJournal | 4 |
| **11** | Demote Chat to "More"; lesson-complete → NextRecommendation | AICoach | 5,6 |

---

## 12. Priority

### 🔴 Critical (do first, in order)
- **P0** — Fix hooks-order crash in `LessonEngine` (Phase 0). Without this, AI
  Coach lessons crash on success in production.
- **P1** — Persist XP/level (Phase 1). Gamification is currently a lie (XP
  evaporates).

### 🟠 High
- Split LessonEngine (Phase 2) — unblocks everything else.
- Shared QuizStep (Phase 3) — kills triplicate maintenance burden.
- Memory-grounded prompts (Phase 4) — the "real tutor" feeling you called the
  "самое крутое."
- Real Review + Practice (Phases 5–6) — makes three modes actually three things.

### 🟡 Medium
- New interaction step types (Phase 7).
- Dashboard slim-down (Phase 8).
- Nav simplification (Phase 9).

### ⚪ Low
- Mistake Journal insight (Phase 10).
- Demote Chat / close the loop (Phase 11).

---

## 13. Exact Files That Need Changing

| File | Phases | Nature of change |
|---|---|---|
| `AIChat.jsx` | 0,2,3,5,6,7,11 | Split into components; fix hooks; add flows/steps. **Biggest.** |
| `brain-store.jsx` | 1,7,10 | Additive: `recordXp`, `getXp`, `mistakeFrequency`, `dueReviewQueue`, `recordLessonResult`. **No math changes.** |
| `ai-brain.jsx` | 4,5,6 | New prompt library; memory-grounded system prompts; Practice/Review generators. |
| `StudySession.jsx` | 3 | Replace inline quiz with shared `QuizStep`. |
| `StudyHub.jsx` | 3 | Replace `buildQuizEl` with shared `QuizStep`. |
| `Dashboard.jsx` | 8 | Remove sections 3–8; add `TodayStrip`; enlarge hero. |
| `AppNav.jsx` | 9 | 3 primary tabs + "More" menu. |
| `MistakeJournal.jsx` | 10 | Add AI insight banner using `mistakeFrequency`. |
| `exams-store.jsx` | (B4) | Remove legacy `deriveCourse` **only after** grep proves zero consumers. |
| `index.html` | each | Bump `?v=` cache-buster per changed file. |

Files that should **not** change: `schedule-store.jsx`, `profile-store.jsx`,
`auth-store.jsx`, `progress-metrics.jsx`, `ai-enrichment.jsx`, `SessionRecap.jsx`,
`TodaysMission.jsx`, `Exams.jsx`, `Schedule.jsx`, `CourseDetail.jsx`, `AIPlan.jsx`.

---

## 14. Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **🔴 Hooks-order crash is real and already shipping** | High | High | Phase 0 first. `LessonEngine` calls `useState`/`useEffect` (checkpoint state, ~lines 397–402) *after* the `loading`/`error`/`done` early returns (234/251). On the render where `loading` flips false, React sees more hooks than before → "Rendered more hooks than during the previous render." **Verify by loading a real lesson against a working API**, then fix by extracting `CheckpointStep`. |
| Deleting `deriveCourse` breaks a hidden caller | Med | Med | Grep `deriveCourse`/`deriveCourses` across all `.jsx` before removing; keep as deprecated shim one release if unsure. |
| Splitting LessonEngine changes behavior subtly | Med | Med | Do Phase 2 as pure refactor (no feature change); diff before/after screenshots of each step type. |
| Shared QuizStep regresses one of the 3 callers | Med | Med | Migrate one caller at a time; keep old renderer until the new one is verified in that screen. |
| Persisted XP double-counts on re-render | Med | Low | `recordXp` must be idempotent per lesson (commit once in `LessonComplete`, not per render). |
| Memory-grounded prompts leak wrong attributions | Low | Med | Only cite a prior mistake when `mistakeFrequency` ≥ 2 and topic matches; never fabricate counts. |
| Babel-standalone cache serves stale split files | High | Low | Bump `?v=` for every touched file (existing convention). |
| No build step = no type safety across the split | High | Low | Keep components in the same file initially; split files only once stable. |

---

## 15. Migration Plan

**Principle:** the app must work after *every* phase. No long-lived branch.

1. **Snapshot first.** `git tag pre-v3` before Phase 0 so any phase can roll back.
2. **Phase 0 (crash fix) ships alone** and is verified against a live lesson
   before anything cosmetic. This is a correctness fix, not a redesign — treat it
   as a hotfix.
3. **Additive-before-subtractive.** Phases 1 (XP), 4 (prompts), 7 (steps) add
   capability without removing anything. Ship them before the subtractive
   Dashboard/nav phases (8–9) so users never lose a feature mid-migration.
4. **Refactors are behavior-neutral.** Phases 2–3 (split + shared quiz) must
   produce pixel-identical output. Verify each step type renders the same before
   moving on (the `double-check` habit: run it, don't just read it).
5. **Feature flags via mode, not branches.** New Review/Practice flows (5–6) can
   live behind the existing mode router — if a flow misbehaves, point the mode
   back at the old `LessonEngine` string-topic path in one line.
6. **Data is forward-compatible.** New Brain keys (`brain_xp_v1`) are read with
   safe fallbacks (same pattern as every existing store) — an old client that
   never wrote XP reads 0, not a crash.
7. **Verify order every phase:** (a) run the flow against a live API, (b) check
   console for the hooks error specifically, (c) confirm the Brain wrote what you
   expect in `localStorage`, (d) screenshot proof, (e) bump `?v=`, (f) deploy.

---

## Appendix — What's already built (do NOT rebuild)

These were confirmed present and wired during the audit:

- ✅ **AI topic-name generation** — `requestTopicNames` + `requestCourseExtraction`
  (`ai-enrichment.jsx`), schema fields (`exams-store.jsx` migrateExam), call site
  (`exam-wizard.jsx` handleFinish), `relabelPendingSessions` (`schedule-store.jsx`).
- ✅ **KB extraction from uploads** — `aiExtractCourse` (`ai-brain.jsx`) →
  `saveExamKB` (brain), consumed by StudySession quiz grounding + CourseDetail.
- ✅ **Single source of truth** — `useBrain()` / `getBrain()` / `brainCourses()`.
- ✅ **Adaptive scheduling** — `adaptSchedule` (`schedule-store.jsx`).
- ✅ **Session recap with real deltas** — `SessionRecap.jsx` + `commitCoverage`.
- ✅ **Streak + achievements from real data** — `progress-metrics.jsx`.

The V3 work is almost entirely in the **experience layer** (AI Coach + Lesson
Engine + Dashboard presentation), plus small **additive** Brain methods. The hard
data foundation is done.

---
---

# PART II — The Experience Layer

> Written from the seat of a Head of Product + learning scientist, not an
> engineer. Part I makes the app *correct*. Part II makes it *addictive in a way
> the student is grateful for.* Every idea below answers one question:
> **"Would this make a student excited to continue?"** If a screen can't answer
> yes, it doesn't ship.

## 16. The feeling we're selling

We are not selling "AI-generated study material." Every competitor sells that.
We are selling **the feeling of having a brilliant private tutor who is
delighted by you specifically** — one who remembers your last mistake, gets
visibly excited when you nail something, and always leaves you on a cliffhanger.

The emotional target, in order of session:

```
curious ──► "wait, I want to know" ──► small win ──► "I'm good at this" ──►
surprise ──► "no way" ──► mastery ──► "I've got this" ──► cliffhanger ──►
"one more."
```

If any 40-second stretch is emotionally flat, we have failed that stretch.

**The single sentence that should describe the product:** *"It doesn't feel like
studying — it feels like a game I happen to be winning at my hardest subject."*

## 17. The Cold Open — curiosity before explanation (non-negotiable)

**Rule: a lesson may NEVER open with a definition.** The first thing on screen is
always a hook the student can *react to* in under 7 seconds. The concept gets
named only *after* they feel they need it.

Five cold-open patterns (the AI picks one per concept):

| Pattern | Mechanic | Why it works |
|---|---|---|
| **The Trap** | Ask a question 90% get wrong | Being wrong *with everyone* is safe + the surprise burns the correction into memory |
| **The Bet** | A real-world decision with stakes | Forces a stance before teaching; they now *care* about the answer |
| **The Impossible Fact** | A true statement that shouldn't be true | Curiosity gap — the brain demands resolution |
| **The Prediction** | "What happens if…? [A][B][C]" | Commitment → they're emotionally invested in being right |
| **The Detective** | "Here's a wrong answer. Find the bug." | Analysing beats reading; feels like a puzzle, not a lecture |

### Concrete cold opens (these are the actual first screens)

**Integration by Parts** — *The Trap*
```
   ∫ x · eˣ dx

   Quick gut check — how would you crack this?

   [ u-substitution ]   [ Product rule backwards ]   [ No clue yet ]
```
→ Whatever they tap: *"Let's actually try u-substitution together and watch it
fall apart — that failure is the whole reason this technique exists."* The
student now *wants* the tool before it has a name.

**Probability / Expected Value** — *The Bet*
```
   3 boxes left:   💰 £250,000     💷 £5     🪙 £1
   The banker offers you £40,000 to walk away.

   [ Take the £40k ]        [ Gamble ]
```
→ *"Hold that thought. By the end of this lesson you'll know — mathematically —
whether you just made a genius move or a £210k mistake."*

**Photosynthesis** — *The Impossible Fact*
```
   A tiny seed weighs 5 grams.
   It grows into a tree weighing 500 kilograms.

   Where did the other 499,995 grams come from?

   [ The soil ]   [ The water ]   [ The air ]
```
→ 95% pick soil. They're wrong. *"You just made the same guess Aristotle did for
2,000 years. The real answer is genuinely wild — it came from thin air. Let me
prove it."*

**Newton's Third Law** — *The Prediction*
```
   A truck and a fly collide head-on. 🚚 💥 🪰

   Which one feels the bigger FORCE?

   [ The truck ]   [ The fly ]   [ Exactly equal ]
```

**Any topic, fallback** — *The Detective*
```
   A student wrote this on their exam and lost 3 marks.

   "  d/dx (x²) = x  "

   Can you spot what they did wrong?   [ I see it ]   [ Show me a hint ]
```

**Design note:** the cold open is generated by asking the model for a hook of a
specific *pattern type*, grounded in the student's exam board and — crucially —
their history (see §23). It is one short screen, always interactive, never a
paragraph.

## 18. Anatomy of a great lesson (beat-by-beat, with timing)

A lesson is a **rhythm**, not a document. Target: an interaction every **20–40
seconds**, no text block longer than ~3 lines, total 6–9 minutes.

```
 0:00  COLD OPEN          tap a hook (curiosity/bet/trap)         ← react
 0:20  THE REVEAL         "here's why your gut was right/wrong"   ← tap to reveal
 0:45  NAME IT            the concept, now that they want it (≤2 lines)
 1:05  MICRO-CHECK        one tap question, easy, guaranteed win  ← react + WIN
 1:30  BUILD              worked example, revealed step-by-step   ← tap each step
 2:20  YOUR TURN          they drive; AI coaches                  ← react
 3:00  THE TWIST          a harder case / common trap             ← react
 3:40  RECOVERY OR FLEX   wrong→learning moment / right→level up  ← react + emotion
 4:30  CALLBACK           tie to a past lesson ("like Tuesday")   ← memory beat
 5:10  BOSS QUESTION      exam-style, they feel it's hard, win it ← react + BIG WIN
 6:00  REFLECT            "explain it back in one line"           ← 1 free text
 6:30  CELEBRATE          XP, mastery bump, personal record
 6:45  CLIFFHANGER        tease the next lesson's twist           ← "one more?"
```

Every beat labelled "react" is a tap/drag/slide — not reading. The two free-text
moments (Your Turn optional, Reflect) are the *only* typing in the whole lesson.

## 19. The showpiece — a full scripted lesson

This is what "the best AI tutor ever built" sounds like. Coach voice in **bold**,
UI in `code`, student taps in `[brackets]`.

**Lesson: Integration by Parts · Maths · Student: Gleb · 3rd exposure**

```
COLD OPEN (0:00)
Coach:  Gleb — back for round 3 with these. 👀
        ∫ x · eˣ dx. Gut call: what tool?
UI:     [ u-substitution ]  [ Product rule backwards ]  [ No clue ]
Gleb:   [ u-substitution ]

REVEAL (0:20)
Coach:  Bold. Let's TRY it and watch it betray us.
UI:     tap ▸ to reveal each line
        u = x²/... wait. du won't cancel the eˣ. Dead end. 💀
Coach:  Feel that wall? u-sub can't touch a product like this.
        THAT's the gap this technique fills.

NAME IT (0:45)
Coach:  Integration by Parts. One line to memorise:
        ∫u·dv  =  u·v − ∫v·du
        That's it. That's the whole weapon.

MICRO-CHECK — guaranteed win (1:05)
Coach:  In ∫ x·eˣ dx — which part gets SIMPLER when you differentiate it?
UI:     [ x ]   [ eˣ ]
Gleb:   [ x ]
Coach:  Instant. 'x' → 1, clean. eˣ never simplifies — it's immortal. ✅
        So x is our u. You just made the only decision that matters.
        +15 XP

BUILD (1:30)
Coach:  Watch it assemble. Tap through — don't just read.
UI:     ▸ u = x        dv = eˣ dx
        ▸ du = dx      v = eˣ
        ▸ plug in:     x·eˣ − ∫eˣ dx
        ▸ finish:      x·eˣ − eˣ + C
Coach:  Done. That ∫eˣ dx at the end? Trivial. The hard part was the SETUP —
        and you picked u correctly on your own.

YOUR TURN (2:20)
Coach:  Your rep. ∫ x·cos(x) dx. Pick u.
UI:     [ x ]   [ cos(x) ]
Gleb:   [ cos(x) ]        ← WRONG

RECOVERY — the money moment (2:40)
Coach:  Ooh — that's the exact trap examiners LOVE. 60% of students pick cos(x).
        Here's the tell: does cos(x) get simpler when you differentiate it?
UI:     [ Yes ]   [ No — it just becomes −sin(x) ]
Gleb:   [ No — it just becomes −sin(x) ]
Coach:  Exactly. It goes in circles forever. 'x' is the one that dies to 1.
        Try again — pick u:
UI:     [ x ]   [ cos(x) ]
Gleb:   [ x ]
Coach:  THERE it is. And now you'll never fall for that one again. 🔒
        +10 XP (comeback bonus)

CALLBACK — memory magic (3:40)
Coach:  Same instinct you used on logarithms last Tuesday, by the way —
        "which piece simplifies?" You've now used it 3 lessons running.
        That's not luck anymore. That's a pattern you own.

BOSS QUESTION (4:20)
Coach:  Real 2023 paper. Worth 5 marks. I think you're ready — prove me right.
        ∫ x² · ln(x) dx — what's u?
UI:     [ x² ]   [ ln(x) ]
Gleb:   [ ln(x) ]
Coach:  🎯 A*-level call. ln(x) is a nightmare to integrate but easy to
        differentiate — so it HAS to be u. Most students get this wrong.
        You didn't. +40 XP

REFLECT (5:20)
Coach:  One line, your words: how do you pick u every time?
UI:     [ free text ]
Gleb:   "pick the part that gets simpler when you differentiate it"
Coach:  That's the whole game in 11 words. Screenshot that. 📌

CELEBRATE (6:00)
UI:     🌟 Integration by Parts
        87% · +80 XP · Mastery 41% → 63% · 🔥 5-day streak
        ⚡ Personal best: fastest lesson this week

CLIFFHANGER (6:40)
Coach:  Here's the thing nobody tells you: sometimes you apply this rule and
        the SAME integral reappears on both sides. Looks like a disaster.
        It's actually a secret shortcut. Wanna see the trick?
UI:     [ Not now ]        [ Show me → ]
```

Notice: **zero paragraphs, ~14 interactions in ~7 minutes, the wrong answer was
the best moment, memory was referenced naturally, and it ends mid-story.** That
is the standard. Every generated lesson is scored against this script.

## 20. The Coach's personality

The AI needs to be a *someone*, not a *something*. A flat, corporate "Great job!"
voice is a ChatGPT wrapper. A character is a product.

**Voice charter:**

| Trait | Sounds like | Never sounds like |
|---|---|---|
| **Energetic** | "Oh this one's fun." "Watch this." | "Let us now consider…" |
| **Specific praise** | "You dodged the exact trap examiners set." | "Good job!" "Correct!" |
| **Warm, a little cheeky** | "Bold. Let's watch it betray us." | "That is incorrect." |
| **On your side** | "We're gonna crush this together." | "You should study more." |
| **Confident, brief** | 1–2 lines, then hands the mic back | Walls of hedging text |
| **Emotionally reactive** | "🎯 A*-level call." "Ooh." "THERE it is." | Neutral acknowledgement |

**Banned phrases (hard list):** "Great job", "Well done", "Correct!", "As an AI",
"Let's dive in", "In this lesson we will", "It is important to note", any praise
that would fit *any* answer to *any* question.

**Praise must be earned and specific.** The formula: *name the exact thing they
did + why it's impressive + a tiny status reward.* "Most students get this wrong.
You didn't." beats "Correct!" every time because it tells them *who they are*.

**Should the Coach have a name?** Recommend yes — a soft, non-childish one (not a
mascot). Test 2–3 in onboarding ("Your coach — call them ___?"). A name makes the
callbacks in §23 land harder ("— Ada noticed you always rush the last step").
Duolingo has Duo; premium tutoring has a *person*. We want the second.

## 21. The interaction menu (the 20–40s engine)

Reading is passive; tapping is active; *predicting* is emotional. We maximise the
third. Full catalogue of micro-interactions the Lesson Engine can call — the AI
picks the one that best fits each beat, and **must rotate** (never the same
mechanic twice in a row):

| Interaction | Feels like | Best for |
|---|---|---|
| **Tap-to-choose** | a decision | cold opens, checks |
| **Tap-to-reveal** (▸ steps) | pulling back a curtain | worked examples |
| **Predict-then-see** | placing a bet | building intuition |
| **Confidence slider** | being asked your opinion | before hard reveals |
| **Spot-the-error** | detective work | exam-trap training |
| **Drag-to-order** | solving a puzzle | processes, proofs, timelines |
| **Tap-to-match** | connecting dots | terms↔definitions, causes↔effects |
| **Swipe true/false** | rapid-fire, fun | retention warm-ups |
| **"Teach it back"** | being trusted | reflection, mastery check |
| **Fill-one-word** | a light challenge | key term recall (sparingly — it's typing) |

**Rule:** if two consecutive beats would use the same mechanic, the generator
must swap one. Variety *is* the entertainment.

## 22. Wrong answers as gold (the recovery loop)

A wrong answer is the **highest-value moment in the entire product** — it's the
one time the student is emotionally open and paying full attention. Wasting it on
"Incorrect. The answer is B." is malpractice.

**The recovery loop (never skip a step):**

```
1. NORMALISE   "Ooh — 60% of students pick that." (you're not dumb, it's a trap)
2. NAME THE TRAP  "Here's the tell you missed…" (turn it into a rule)
3. HINT, DON'T TELL  a question that leads them to it
4. LET THEM RE-ANSWER  they get to WIN it themselves
5. SEAL IT  "Now you'll never fall for that again. 🔒" + comeback XP
6. REMEMBER IT  (Brain logs the mistake; §23 will call it back later)
```

Dialogue contrast:

> ❌ *"Incorrect. u should be x."*
>
> ✅ *"Ooh — that's the exact trap examiners love. Quick tell: does cos(x) get
> simpler when you differentiate it? …No, right? It loops forever. So it can't be
> u. Try again."* → they fix it themselves → *"THERE it is. Locked in. 🔒"*

A student who *recovers* from a wrong answer feels smarter than one who was right
first try. **We engineer the comeback.** Getting something wrong, then nailing
it, should feel *better* than getting it right immediately — and the comeback XP
bonus makes that literally true.

## 23. Memory as magic (the moat)

This is the "самое крутое" — the thing no ChatGPT wrapper can fake. The Brain
already stores every mistake, mastery level, streak, and session. V3's job is to
make the Coach **reference it out loud, naturally, mid-lesson** — the way a real
tutor who's known you for months would.

**Callback types (the AI weaves these in unprompted):**

| Trigger (from Brain) | Coach says |
|---|---|
| Repeated mistake (`mistakeFrequency ≥ 2`) | "This is the 3rd time this exact trap's come up — let's kill it for good today." |
| Recently mastered nearby topic | "You crushed logarithms last week. This is their cousin — you've basically already met it." |
| Faster than last time | "You solved that in half the time you did on Tuesday. That's real progress, not luck." |
| Long streak | "Day 5. You've shown up 5 days straight — that's the top 10% of students, full stop." |
| Returning after a gap | "Been a few days — no guilt. Let's do a quick 2-minute warm-up to shake off the rust." |
| Confidence rising over sessions | "Remember when you rated this topic a 2? Look at you now." |
| A concept they once got wrong, now right | "The old you got this wrong in March. Watch the new you crush it." |

**Design rule:** every lesson must contain **at least one** genuine, specific
callback. Not "you're doing great" — that's generic. "You always rush the final
sign — watch it here" is memory. The difference between those two sentences is
the difference between a $200/hour tutor and a chatbot.

**Onboarding seeds memory early.** The very first lesson ends with the Coach
"noticing" something ("You think fast but skip the check step — I'll keep an eye
on that"). By lesson 3, the callbacks feel earned. This is the relationship
compounding.

## 24. Dopamine architecture (ethical, not manipulative)

We want the *good* kind of dopamine loop — the one that rewards genuine learning,
so the habit the student builds is actually good for them. Levers:

| Lever | Mechanic | Why it fires |
|---|---|---|
| **Small wins, constantly** | first check-question after any teach is *guaranteed-winnable* | competence is the #1 driver of intrinsic motivation (self-determination theory) |
| **Variable reward** | XP per action varies (12–45, not flat) | unpredictable reward > fixed reward (dopamine responds to surprise) |
| **The combo** | consecutive-correct builds a visible multiplier | loss-aversion keeps them careful + engaged |
| **The comeback bonus** | recovering from wrong pays *extra* | makes the best learning moment also the best-feeling one |
| **Mastery bar that MOVES** | see 41%→63% animate at lesson end | progress must be *visible* to be motivating |
| **Streak with stakes** | streak + one "freeze" they can earn | a streak you can protect is one you defend |
| **Level-up moments** | crossing a level = full-screen beat, rare | scarcity makes it matter |
| **Personal records** | "fastest this week," "longest combo" | competing with *yourself* never demoralises |

**Restraint clause:** rewards celebrate *learning*, never *time spent*. No "you've
been here 2 hours!" No dark patterns. No guilt for leaving. A student who studies
6 focused minutes and leaves happy is a win — they'll come back tomorrow.

## 25. The "one more" engine

The most important 10 seconds of a lesson are the **last** ones. A lesson that
ends with "Lesson complete. ✓" is a full stop. We end with a **comma.**

Tactics, strongest first:

1. **The cliffhanger** — end mid-story (see §19). "Sometimes the integral
   reappears on both sides — looks like a disaster, it's secretly a shortcut.
   Wanna see?" `[Not now] [Show me →]`
2. **The unlock** — "You just unlocked Definite Integrals" (framed as earned
   access, not another task).
3. **The near-miss streak** — "One more lesson and you hit a 6-day streak — your
   longest ever."
4. **The tease of *their* weak spot** — "Next up is the one topic your Brain says
   is your weakest. Wanna go fix that while you're hot?"
5. **The double-or-nothing** — occasionally offer a fast 60-second "lightning
   round" for bonus XP right after a win, while dopamine is high.

**The default next-CTA is never "Done."** It's the next recommendation, pre-loaded
and one tap away (this is why Part I Phase 11 wires lesson-complete →
`recommendNextAction()`). Leaving requires a small deliberate act; continuing is
frictionless.

## 26. Memorable moments & delight

Habits are built on *peaks* (peak-end rule: people remember the best moment and
the last moment). We deliberately engineer peaks:

- **The first "aha."** The photosynthesis "it came from the air" reveal — give it
  a beat of silence, a small animation, let it land. Don't rush past a mind-blow.
- **First lesson finale.** Oversized celebration for lesson #1 — it sets the
  emotional baseline for the relationship.
- **Milestone theatre.** 7-day streak, first topic to 100% mastery, 1000 XP —
  full-screen, rare, earned. Not every lesson; that cheapens it.
- **The Coach breaking character (warmly).** Occasionally: "…okay that was a
  genuinely elegant answer, I have to say." Feels human because it's not on every
  screen.
- **Easter eggs.** Get a boss question right in record time → a rare "🔥 that was
  ridiculous" reaction the student hasn't seen before. Collectible surprise.
- **The comeback story.** End-of-week: "You got Integration by Parts wrong 4 times
  in March. This week you're 9/10. That's the whole point." Show them their own
  growth arc — nothing is more motivating than *evidence you're becoming capable.*

## 27. Premium feel

Premium is mostly **restraint + responsiveness + one or two moments of magic.**

- **Motion with intent.** Every reveal, every correct answer, every XP tick has a
  spring animation — fast (150–250ms), never janky. The mastery bar *animates*
  filling, it doesn't jump.
- **Sound (opt-in, tasteful).** A soft, satisfying tick on correct; a warm chord
  on level-up. Duolingo's sound design is 30% of its addictiveness. Off by
  default, one tap to enable, never annoying.
- **Haptics (mobile).** A gentle tap on correct, a distinct one on level-up. Felt,
  not heard.
- **Typographic calm.** One idea per screen, generous whitespace, big confident
  numbers. The opposite of a cluttered dashboard. Premium = confident emptiness.
- **The Coach's "thinking" beat.** A brief, characterful typing shimmer before a
  reply (not a spinner) — makes it feel present and alive, not loading.
- **No dead ends, ever.** Every error state has a warm line + a forward action.
  A crash or a raw "undefined" instantly destroys premium feel. (This is why
  Part I §14's hooks crash is a *product* emergency, not just a bug.)

## 28. The energy curve of a session

A session should have a *shape*, like a good piece of music — not a flat line.

```
 energy
   ▲                              ⭐ boss win
   │                 twist  ╱╲   ╱
   │   cold open ╱╲   ╱╲   ╱  ╲ ╱ 
   │   ╱╲  win  ╱  ╲ ╱  ╲ ╱    V        ╭─ cliffhanger (leave on a rise)
   │  ╱  ╲    ╱    V    V              ╱
   │ ╱    ╲  ╱  (dip = recovery moment, then bigger rise)
   └────────────────────────────────────────────► time
     hook  win  build  YOUR turn  twist  boss  reflect  tease
```

Deliberate dips (a wrong answer, a hard twist) make the subsequent wins feel
bigger. A session that's all "easy wins" is boring; one that's all "hard" is
demoralising. The Coach reads the student's live accuracy and **adapts the curve**
— on a roll → raise difficulty and tease a boss question early; struggling →
insert a guaranteed win to rebuild confidence before pushing again. The Brain
already tracks `consecutiveCorrect`; this is where it earns its keep.

## 29. The kill list — what would make a student quit

Assumptions from Part I that Part II *challenges and overrides*:

| Old assumption | Why it fails the "would this excite a student?" test | Replace with |
|---|---|---|
| Lesson opens with "teach" step | A definition is the least exciting possible first screen | **Cold open** (§17) — never a definition first |
| Feedback = show the explanation | Wastes the highest-attention moment | **Recovery loop** (§22) — hint → re-answer → win |
| Praise = "Correct!" | Generic praise is emotionally worthless | **Specific, earned praise** (§20) |
| Chat mode as a core pillar | Free-text = ChatGPT = the thing we're escaping | **Demote Chat**; make guided lessons the hero |
| XP as a number on a screen | A number with no stakes is wallpaper | **Variable XP + combos + comeback bonus** (§24) |
| Lesson ends with "Complete ✓" | A full stop kills momentum | **Cliffhanger + unlock** (§25) |
| Same interaction repeated | Repetition is boredom | **Forced mechanic rotation** (§21) |
| Memory used only for scheduling | The Brain's best asset stays invisible | **Spoken callbacks every lesson** (§23) |
| "Reflection" as an optional step | The most valuable metacognition, made skippable | **"Teach it back" as a celebrated moment** |

**The meta-rule for every future decision:** *if a screen could appear, unchanged,
inside any generic AI study app, it is wrong.* Our screens should be
un-copyable — because they know *this* student.

## 30. How we'll know it worked

Product metrics that actually track "excited to continue," not vanity:

| Metric | Target signal | Why it matters |
|---|---|---|
| **"One more" rate** | % of lessons where student starts another within 30s | the single truest measure of delight |
| **Recovery win rate** | % of wrong answers that end in a self-corrected right answer | proves the recovery loop teaches, not just corrects |
| **Callback resonance** | do sessions with a memory-callback have higher completion? | validates the moat |
| **Time-to-first-interaction** | seconds from lesson start to first tap | must be <10s (cold open working) |
| **Interactions per minute** | target ≥ 2 | proves the 20–40s rule is real |
| **D1 / D7 return** | do they come back tomorrow, next week | the habit is forming |
| **Voluntary difficulty** | % who tap "give me a harder one" | intrinsic motivation, the holy grail |
| **Session-end sentiment** | occasional 1-tap "how'd that feel?" 😐🙂🤩 | direct read on the feeling in §16 |

If "one more" rate and recovery-win rate are high, the product works — everything
else follows. If they're low, no amount of content or polish will save it, and we
redesign the loop, not the lessons.

---

### One-paragraph brief for whoever builds this

Never explain first — hook first. Make them tap every 20–40 seconds. Turn every
wrong answer into a comeback they win themselves. Have the Coach remember them out
loud, by name, every single lesson. Celebrate specifically, never generically.
End every lesson mid-story so leaving feels like stopping a good show. And measure
one number above all: *did they immediately want another?* Build for that, and
we're not a study app — we're the tutor students actually look forward to.
```
