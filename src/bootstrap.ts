/**
 * Loads every legacy module, in order, and verifies they all registered.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE IMPORT ORDER BELOW IS LOAD-BEARING. DO NOT ALPHABETISE OR REORDER IT.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * It reproduces, exactly, the order of the 43 <script type="text/babel"> tags
 * that used to sit at the bottom of index.html. ARCHITECTURE_AUDIT.md §4.3
 * documents seven load-order dependencies between these modules, and six of the
 * seven fail *silently* when violated — e.g. if `mistakes-store` evaluates after
 * `brain-store`, wrong answers stop lowering mastery and nothing errors.
 *
 * ES modules evaluate depth-first in the order their import statements appear,
 * so this list has the same semantics the <script> tags did.
 *
 * This lives apart from `main.tsx` so that the test suite loads the app exactly
 * the way the browser does. Duplicating the list into a test harness would let
 * the two drift, and a drifted order is precisely the failure this file exists
 * to prevent.
 *
 * The modules still communicate through `window` globals rather than exports.
 * That is deliberate: it is what makes the Vite migration behavior-preserving.
 * Bare identifiers inside a module fall through module scope to the global
 * object, so an unconverted file calling `getProfile()` still resolves to
 * `window.getProfile` exactly as it did before.
 */

// ── Runtime shims: must come first. `auth-store` destructures `createClient`
//    off `window.supabase` at module-init, and `_ds_bundle.js` reads `React`.
import "./lib/globals";
import "./lib/platform"; // publishes window.apiUrl — must precede curriculum-store.jsx
import "./lib/widget-bridge"; // publishes window.pushWidgetBrief — must precede DailyBriefCard.jsx
import "./lib/claude-proxy";
import "./lib/ds-bundle";
import "./lib/push"; // OneSignal on prod only; preview drops leftover SW so Safari does not whitescreen
import "./lib/sounds"; // Phase 4 kit — playSound reads getProfile at call time, not init

// ── Tier 0: i18n
import "./i18n/i18n.jsx";

// ── Tier 1: persistence stores (order per index.html)
import "./stores/exams-store.jsx";
import "./stores/course-store.jsx";
import "./stores/schedule-store.jsx";
import "./stores/profile-store.jsx";
import "./stores/auth-store.jsx";
import "./stores/mistakes-store.jsx"; // MUST precede brain-store (audit §4.3 #2)
import "./stores/session-store.jsx";
import "./stores/progress-metrics.jsx";
import "./stores/brain-store.jsx";
import "./stores/learn-store.jsx"; // Phase 3.7 learn progress; independent of other stores

// ── Tier 2: theming + AI layer
import "./lib/tier-theme.jsx"; // MUST follow brain-store (audit §4.3 #7)
import "./lib/ai-enrichment.jsx";
import "./lib/ai-brain.jsx";

// ── Tier 3: catalogs. onboarding-data MUST precede qualifications-store, which
//    overwrites four of its globals from the DB (audit §4.3 #3).
import "./data/data.jsx";
import "./data/onboarding-data.jsx";
import "./stores/qualifications-store.jsx";
import "./data/curriculum-data.jsx";
import "./stores/curriculum-store.jsx";

// ── Tier 4: shared UI
import "./components/tweaks-panel.jsx";
import "./components/AppNav.jsx";
import "./app/landing/Landing.jsx";
import "./features/onboarding/onboarding-steps.jsx";
import "./components/Combobox.jsx";
import "./features/exams/CurriculumStep.jsx";
import "./features/exams/exam-wizard.jsx";

// ── Tier 5: screens
import "./features/dashboard/DailyBriefCard.jsx"; // must precede Dashboard.jsx, which renders it
import "./features/dashboard/Dashboard.jsx";
import "./features/study/CourseDetail.jsx";
import "./features/calendar/DayDetail.jsx";
import "./features/chat/AIChat.jsx";
import "./features/study/TodaysMission.jsx";
import "./features/study/StudySession.jsx";
import "./features/study/SessionRecap.jsx";
import "./features/onboarding/AIPlan.jsx";
import "./features/progress/BurnoutAlert.jsx";
import "./features/study/StudyHub.jsx";
import "./features/learn/LearnMain.jsx";
import "./features/progress/MistakeJournal.jsx";
import "./features/progress/Progress.jsx";
import "./features/calendar/Schedule.jsx";
import "./features/calendar/StudyCalendar.jsx";
import "./features/exams/Exams.jsx";
import "./features/settings/Settings.jsx";

import { assertGlobalsLoaded } from "./lib/legacy";

/**
 * Every global a screen dereferences at render time. Under the old loader a
 * missing one produced either a blank screen or — worse — the stale component
 * from `_ds_bundle.js`. Asserting here turns all of that into one loud error
 * that names the module that failed.
 */
export const REQUIRED_GLOBALS = [
  // design system
  "AIExamCoachDesignSystem_99e467",
  // i18n + catalogs
  "LANGS",
  "EXAM_TYPES",
  "examType",
  // qualifications-store rebuilds `examType` over the DB-merged catalog by
  // calling this, so it must already exist when that module evaluates.
  "resolveExamType",
  "CURRICULUM_SEED",
  // stores
  "getExams",
  "getCourse",
  "getSchedule",
  "getProfile",
  "hasProfile",
  "getSession",
  "clearSession",
  "getMistakes",
  "getBrain",
  "useBrain",
  "getCurriculum",
  // AI layer
  "apiUrl",
  "pushWidgetBrief",
  "brainComplete",
  "brainCompleteJSON",
  "parseJSON",
  "claude",
  // components + screens
  "useTweaks",
  "TweaksPanel",
  "AppNav",
  "playSound",
  "Landing",
  "AIPlan",
  "DailyBriefCard",
  "Dashboard",
  "AIChat",
  "StudyHub",
  "LearnMain",
  "MistakeJournal",
  "CalendarHub",
  "Exams",
  "Progress",
  "Settings",
  "StudyLayer",
] as const;

assertGlobalsLoaded(REQUIRED_GLOBALS);
