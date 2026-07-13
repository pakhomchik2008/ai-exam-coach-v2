// AI Exam Coach — global user preferences, separate from exam data. One
// profile, shared by every exam the user creates: weekly study hours,
// materials they have, how they like to learn. Captured once (onboarding)
// and reused (Add Exam prefills + lets the user tweak it) instead of asking
// the same questions again per exam. Same get/save/subscribe/migrate shape
// as exams-store.jsx/schedule-store.jsx.

const PROFILE_KEY = "user_profile_v1";
const PROFILE_SCHEMA_VERSION = 2;

// Study-plan availability constraints — the actual inputs the hour-budget
// engine (schedule-store.jsx) needs to turn "N hours/week" into real
// sessions on real days. Before this, weeklyHours was the only availability
// signal in the whole app; days/week, session length and blackout times
// didn't exist anywhere, so the scheduler had no way to pack hours into a
// realistic calendar and fell back to a fixed syllabus-coverage formula that
// never reconciled with what the user actually said they could do.
const WEEK_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_PERIODS = ["morning", "afternoon", "evening"];

function isFiniteNumber(n) { return typeof n === "number" && Number.isFinite(n); }

// { day: one of WEEK_DAYS, period: one of DAY_PERIODS or "all" for the whole day }
function isValidBlackoutSlot(s) {
  return s && typeof s === "object" && WEEK_DAYS.includes(s.day) && (s.period === "all" || DAY_PERIODS.includes(s.period));
}

function migrateProfile(raw) {
  const p = raw && typeof raw === "object" ? raw : {};
  return {
    weeklyHours: isFiniteNumber(p.weeklyHours) && p.weeklyHours > 0 ? Math.round(p.weeklyHours) : 12,
    // How many distinct days/week those hours should be spread across —
    // without this the scheduler can't tell "9h in 2 sessions" from "9h in 6".
    daysPerWeek: isFiniteNumber(p.daysPerWeek) && p.daysPerWeek >= 1 && p.daysPerWeek <= 7 ? Math.round(p.daysPerWeek) : 5,
    // Preferred single-session length, minutes — replaces the hardcoded 45min
    // assumption baked into Dashboard/CourseDetail/TodaysMission/AIPlan.
    sessionLengthMin: isFiniteNumber(p.sessionLengthMin) && p.sessionLengthMin >= 15 && p.sessionLengthMin <= 180 ? Math.round(p.sessionLengthMin) : 45,
    // Recurring weekly no-study windows (e.g. Friday evening, all Sunday).
    blackoutSlots: Array.isArray(p.blackoutSlots) ? p.blackoutSlots.filter(isValidBlackoutSlot) : [],
    // Which of the 3 AIPlan.jsx intensity tiers is actually driving the
    // scheduler right now — see INTENSITY_MULTIPLIERS in schedule-store.jsx.
    // "balanced" (1x) means weeklyHours is used exactly as entered.
    planIntensity: ["minimal", "balanced", "ambitious"].includes(p.planIntensity) ? p.planIntensity : "balanced",
    materials: Array.isArray(p.materials) ? p.materials.filter((x) => typeof x === "string") : ["notes", "papers"],
    prefs: Array.isArray(p.prefs) ? p.prefs.filter((x) => typeof x === "string") : ["chat", "recall", "spaced"],
    lang: typeof p.lang === "string" && p.lang ? p.lang : "en",
    timezone: typeof p.timezone === "string" ? p.timezone : null, // null = not yet set; UI can call detectTimezone()
    fullName: typeof p.fullName === "string" ? p.fullName : "",
    email: typeof p.email === "string" ? p.email : "",
    reminderEnabled: typeof p.reminderEnabled === "boolean" ? p.reminderEnabled : true,
    reminderHour: isFiniteNumber(p.reminderHour) && p.reminderHour >= 0 && p.reminderHour <= 23 ? Math.round(p.reminderHour) : 9,
    hasSeenLearnTooltip: typeof p.hasSeenLearnTooltip === "boolean" ? p.hasSeenLearnTooltip : false,
    country: typeof p.country === "string" ? p.country : "",
    educationLevel: typeof p.educationLevel === "string" ? p.educationLevel : "",
    currentYear: typeof p.currentYear === "string" ? p.currentYear : "",
    _v: PROFILE_SCHEMA_VERSION,
  };
}

let _profileRaw = null;
let _profileCache = null;
const _profileListeners = new Set();

function subscribeProfile(fn) { _profileListeners.add(fn); return () => _profileListeners.delete(fn); }
function _notifyProfile() { _profileListeners.forEach((fn) => fn()); }

function hasProfile() {
  try { return localStorage.getItem(PROFILE_KEY) !== null; } catch { return false; }
}

function getProfile() {
  let raw;
  try { raw = localStorage.getItem(PROFILE_KEY); } catch { raw = null; }
  if (raw === _profileRaw && _profileCache) return _profileCache; // nothing changed — stable reference
  _profileRaw = raw;
  try { _profileCache = migrateProfile(raw ? JSON.parse(raw) : null); }
  catch { _profileCache = migrateProfile(null); }
  return _profileCache;
}

// Fields that feed schedule-store.jsx's allocateBudget — changing any of
// these invalidates every active exam's session plan, unlike materials/prefs/
// lang/etc, which are cosmetic to the scheduler.
const BUDGET_FIELDS = ["weeklyHours", "daysPerWeek", "sessionLengthMin", "blackoutSlots", "planIntensity"];

function _budgetFieldsChanged(before, after) {
  return BUDGET_FIELDS.some((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
}

function saveProfile(patch) {
  const before = getProfile();
  const next = migrateProfile({ ...before, ...patch });
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); } catch {}
  _profileRaw = JSON.stringify(next);
  _profileCache = next;

  // Replan every active exam's pending sessions if the user's study budget
  // itself changed (weekly hours, days/week, session length, blackout
  // times) — same "recompute what depends on this" principle as
  // exams-store.jsx's saveExams triggering reconcileSchedule.
  if (_budgetFieldsChanged(before, next) && window.replanAllSchedules) {
    window.replanAllSchedules();
  }

  _notifyProfile();
  return next;
}

Object.assign(window, { PROFILE_KEY, getProfile, saveProfile, subscribeProfile, migrateProfile, hasProfile, WEEK_DAYS, DAY_PERIODS });
