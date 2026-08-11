/**
 * The design-system bundle, and the fix for audit finding #13.
 *
 * `_ds_bundle.js` is required — nine screens destructure their primitives out of
 * `window.AIExamCoachDesignSystem_99e467`. But the same file ALSO assigns 25
 * component globals of its own, built 2026-06-28, which shadow the app's real
 * components. Under the old <script> loader a single 404 or Babel parse error in
 * any screen meant that stale June build rendered instead — plausible-looking,
 * wrong, and invisible to the error boundary.
 *
 * Bundling already removes most of that risk (a missing module is now a build
 * failure, not a silent fallback), but the shadow definitions are deleted here
 * anyway so there is exactly one definition of each component in the app.
 *
 * Import order matters: `_ds_bundle.js` reads `React` off the global object, so
 * `globals.ts` must be imported before this module.
 */
import "./_ds_bundle.js";

/** Components and dictionaries the bundle defines that the app defines properly itself. */
const SHADOWED = [
  "AppNav",
  "BurnoutAlert",
  "CourseDetail",
  "Dashboard",
  "DayDetail",
  "EXAM_SYSTEMS",
  "Exams",
  "LANGS",
  "Landing",
  "MistakeJournal",
  "Onboarding",
  "Progress",
  "Schedule",
  "Settings",
  "StudyHub",
  "StudySession",
] as const;

/** Dead components that exist only in the bundle and are referenced nowhere in the app. */
const DEAD = [
  "Achievements",
  "FlashcardMode",
  "MockExam",
  "MonthlyInsights",
  "QuizMode",
  "ShareProgress",
  "SuccessSimulation",
  "UploadFlow",
  "WeeklyReview",
] as const;

const w = window as unknown as Record<string, unknown>;
for (const name of [...SHADOWED, ...DEAD]) delete w[name];

export {};
