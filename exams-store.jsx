// AI Exam Coach — shared exam store. Single source of truth for "what exams
// does the user have", used by Exams.jsx (writer) and Dashboard/Schedule/
// Progress/AIChat (readers). Courses are derived live from real, persisted
// exams — there is no separate static mock dataset anymore.
//
// Shaped to grow into a subscription store (subscribeExams + a future
// React.useSyncExternalStore-based hook) without changing any consumer that
// just calls getExams()/deriveCourses() today: the memo cache below is what
// makes getExams() a valid getSnapshot (stable reference until data really
// changes), and subscribeExams/_notify exist now so that hook is a pure
// addition later, not a rewrite.

const EXAMS_KEY = "exams_list_v2";
const EXAM_SCHEMA_VERSION = 1;
const FALLBACK_COLORS = ["#6366F1", "#F43F5E", "#14B8A6", "#8B5CF6", "#F97316", "#0EA5E9"];
const VALID_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

// ─── validation helpers ─────────────────────────────────────────────────────

function isFiniteNumber(n) { return typeof n === "number" && Number.isFinite(n); }
function clampPct(n, fallback) { return isFiniteNumber(n) ? Math.max(0, Math.min(100, Math.round(n))) : fallback; }
function isValidDateString(s) { return typeof s === "string" && !isNaN(new Date(s).getTime()); }
function addDaysISO(d, days) { const x = new Date(d); x.setDate(x.getDate() + days); return x.toISOString().slice(0, 10); }

// Normalizes a raw stored exam so old/partial/hand-edited localStorage
// records can never crash a downstream read. Runs on every read AND write.
function migrateExam(raw, index) {
  const e = raw && typeof raw === "object" ? raw : {};
  return {
    id: typeof e.id === "string" && e.id ? e.id : "e" + Date.now() + "_" + index,
    name: typeof e.name === "string" && e.name.trim() ? e.name : "Untitled exam",
    color: VALID_COLOR_RE.test(e.color) ? e.color : FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    examDate: isValidDateString(e.examDate) ? e.examDate : addDaysISO(new Date(), 30),
    examBoard: typeof e.examBoard === "string" && e.examBoard ? e.examBoard : "Custom",
    topicCount: isFiniteNumber(e.topicCount) && e.topicCount > 0 ? Math.round(e.topicCount) : 10,
    completionPct: clampPct(e.completionPct, 0),
    confidencePct: clampPct(e.confidencePct, 50), // neutral midpoint, not 0 — "no data yet" shouldn't read as "failing"
    targetGrade: typeof e.targetGrade === "string" && e.targetGrade ? e.targetGrade : "A",
    // Optional, wizard-sourced fields — not yet read by any display component,
    // but must survive migrateExams() round-trips (saveExams re-migrates on
    // every write) instead of being silently dropped.
    currentGrade: typeof e.currentGrade === "string" ? e.currentGrade : "",
    gradingSystem: e.gradingSystem && typeof e.gradingSystem === "object" ? e.gradingSystem : null,
    // Background AI enrichment status (exam-wizard.jsx's review step never
    // blocks on this — see requestAiEnrichment in ai-enrichment.jsx).
    aiPlanStatus: ["idle", "pending", "ready", "failed"].includes(e.aiPlanStatus) ? e.aiPlanStatus : "idle",
    aiPlanSummary: typeof e.aiPlanSummary === "string" ? e.aiPlanSummary : null,
    // AI-generated topic names (replaces generic "Topic review N" labels once
    // ready) — same fire-and-forget shape as aiPlanStatus, see requestTopicNames
    // in ai-enrichment.jsx.
    topics: Array.isArray(e.topics) ? e.topics.filter((t) => typeof t === "string" && t) : null,
    topicsStatus: ["idle", "pending", "ready", "failed"].includes(e.topicsStatus) ? e.topicsStatus : "idle",
    // Per-topic difficulty/importance (1-10 each), keyed by index into `topics`
    // — a sibling field rather than changing `topics` itself to objects, so
    // every existing consumer that reads `exam.topics[i]` as a plain string
    // (Dashboard, brain-store, schedule-store, exam-wizard) keeps working
    // unmodified. Feeds the hour-budget scheduler's per-topic weighting; a
    // missing entry just means "not weighted yet" (engine defaults to 5/5),
    // same graceful-degradation shape as every other optional AI field here.
    topicWeights: e.topicWeights && typeof e.topicWeights === "object" ? e.topicWeights : null,
    // Whole-exam priority (1 low – 10 high), distinct from topicWeights[i]'s
    // per-TOPIC importance. Feeds schedule-store.jsx's allocateBudget urgency
    // formula — a 10 gets proportionally more of the weekly hour budget than
    // a 1, on top of the existing topics/daysLeft factor.
    importance: isFiniteNumber(e.importance) && e.importance >= 1 && e.importance <= 10 ? Math.round(e.importance) : 5,
    // Freeform notes — never read by any scheduling logic, purely for the
    // user's own reference (exam format reminders, what to bring, etc.).
    notes: typeof e.notes === "string" ? e.notes : "",
    // Course-first fields (see course-store.jsx): courseId is null for every
    // legacy exam (topics/topicWeights above stay authoritative for them,
    // unchanged forever). When set, this exam's topics/topicWeights fields
    // are a MIRROR of the shared course's data, kept in sync by whatever
    // writes the course — never edited directly for a course-backed exam,
    // so schedule-store.jsx/brain-store.jsx need zero changes to keep working.
    courseId: typeof e.courseId === "string" && e.courseId ? e.courseId : null,
    kind: ["exam", "midterm", "final", "resit", "mock", "certification"].includes(e.kind) ? e.kind : "exam",
    _v: EXAM_SCHEMA_VERSION,
  };
}

function migrateExams(list) {
  return Array.isArray(list) ? list.map((e, i) => migrateExam(e, i)) : [];
}

// ─── memoized read/write ────────────────────────────────────────────────────

let _examsRaw = null;   // last-seen raw JSON string from localStorage
let _examsCache = null; // parsed + migrated array, stable reference while _examsRaw is unchanged
const _listeners = new Set();

function subscribeExams(fn) { _listeners.add(fn); return () => _listeners.delete(fn); }
function _notify() { _listeners.forEach((fn) => fn()); }

function getExams() {
  let raw;
  try { raw = localStorage.getItem(EXAMS_KEY); } catch { raw = null; }
  if (raw === _examsRaw && _examsCache) return _examsCache; // nothing changed — same reference, no rework
  _examsRaw = raw;
  try { _examsCache = migrateExams(raw ? JSON.parse(raw) : []); }
  catch { _examsCache = []; }
  return _examsCache;
}

// Alias kept distinct from getExams for semantic clarity at future
// React.useSyncExternalStore(subscribeExams, getExamsSnapshot) call sites.
function getExamsSnapshot() { return getExams(); }

function saveExams(list) {
  const oldExams = getExams(); // pre-write snapshot
  const validated = migrateExams(list);
  try { localStorage.setItem(EXAMS_KEY, JSON.stringify(validated)); } catch {}
  _examsRaw = JSON.stringify(validated);
  _examsCache = validated;

  // Schedule reconciliation lives in schedule-store.jsx (loaded after this
  // file) — this is the one call site with both old and new exam lists, so
  // it's the natural trigger point. Guarded so this file still works if
  // schedule-store.jsx isn't loaded (e.g. isolated tests).
  if (window.getSchedule && window.reconcileSchedule && window.saveSchedule) {
    const schedule = window.getSchedule();
    window.saveSchedule(window.reconcileSchedule(oldExams, validated, schedule));
  }

  _notify();
  return validated;
}

function daysAway(examDate) {
  return Math.ceil((new Date(examDate) - new Date()) / 86400000);
}

function fmtDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ~6% syllabus covered per study session.
function sessionsNeeded(completionPct, daysLeft) {
  if (daysLeft <= 0) return 0;
  const remaining = 100 - completionPct;
  const totalSessions = Math.ceil(remaining / 6);
  const weeksLeft = Math.max(1, daysLeft / 7);
  return Math.ceil(totalSessions / weeksLeft);
}

// What % of the syllabus *should* be done by now, given a fixed prep window.
function requiredPct(completionPct, daysLeft, totalDays) {
  if (totalDays <= 0) return 100;
  const elapsed = totalDays - daysLeft;
  return Math.round((elapsed / totalDays) * 100);
}

function letterBand(pct) {
  if (pct >= 80) return "A";
  if (pct >= 60) return "B";
  if (pct >= 40) return "C";
  return "D";
}
const LETTER_STEP_DOWN = { "A": "B", "B": "C", "C": "D", "D": "E" };
function clamp(min, max, n) { return Math.max(min, Math.min(max, n)); }

// Maps a raw stored exam into the fuller shape CourseCard/CourseDetail/
// Dashboard expect. completionPct and confidencePct are the only two
// independently user-set numbers; everything else below is a genuine
// computed blend of them (plus pace), not a renamed copy of either —
// readiness ("how much is done + how you feel") and gradeProbability
// ("is that enough, on this clock") are deliberately different formulas.
function deriveCourse(exam) {
  const PREP_WINDOW_DAYS = 90; // assumed total prep window when no start date is known
  const daysLeft = daysAway(exam.examDate);
  const totalDays = Math.max(daysLeft, PREP_WINDOW_DAYS);
  const completionPct = exam.completionPct || 0;
  const confidencePct = exam.confidencePct ?? 50;
  const required = requiredPct(completionPct, daysLeft, totalDays);
  const paceDelta = completionPct - required; // +ve = ahead of schedule, -ve = behind

  const gradeProbability = clamp(0, 99, Math.round(
    completionPct * 0.6 + confidencePct * 0.25 + paceDelta * 0.3
  ));
  const readinessPct = clamp(0, 100, Math.round(
    completionPct * 0.7 + confidencePct * 0.3
  ));

  const predictedGrade = letterBand(gradeProbability);
  const targetGrade = exam.targetGrade || "A";
  const riskLevel = gradeProbability >= 60 ? "low" : gradeProbability >= 35 ? "medium" : "high";
  // An exam with daysLeft < 0 has already happened — that's "passed," not
  // "on track" (which previously claimed the opposite of reality).
  const paceStatus = daysLeft < 0 ? "exam_passed" : paceDelta >= 0 ? "on_track" : paceDelta >= -20 ? "slightly_behind" : "very_behind";
  const recommendedSessions = daysLeft >= 0 ? sessionsNeeded(completionPct, daysLeft) : 0;

  // Real topic names not yet covered by a completed session — empty until
  // requestTopicNames (ai-enrichment.jsx) has populated exam.topics, same
  // graceful "nothing yet" shape as every other optional AI field here.
  let weakTopics = [];
  if (exam.topics && exam.topics.length && window.getSchedule && window.topicIndexFromId) {
    const completedIdx = new Set(
      window.getSchedule().sessions
        .filter((s) => s.examId === exam.id && s.status === "completed")
        .map((s) => window.topicIndexFromId(s.id))
    );
    weakTopics = exam.topics.filter((_, i) => !completedIdx.has(i)).slice(0, 5);
  }

  return {
    id: exam.id,
    name: exam.name,
    subject: exam.name,
    examBoard: exam.examBoard,
    color: exam.color,
    daysAway: daysLeft,
    topicCount: exam.topicCount || 10,
    completionPct,
    confidencePct,
    readinessPct,
    targetGrade,
    predictedGrade,
    gradeProbability,
    riskLevel,
    paceStatus,
    todayCount: 0, // filled in by callers once today's sessions are known
    recommendedSessions,
    weakTopics,
    forecastOnTrack: predictedGrade,
    forecastMissed: LETTER_STEP_DOWN[predictedGrade] || predictedGrade,
    remainingWork: { sessions: recommendedSessions, papers: 0, hours: recommendedSessions * 0.75 },
  };
}

let _coursesForExams = null; // the exams array reference last derived from
let _coursesCache = null;
function deriveCourses(exams) {
  if (exams === _coursesForExams) return _coursesCache; // same reference, nothing changed
  _coursesForExams = exams;
  _coursesCache = exams.map(deriveCourse);
  return _coursesCache;
}

// ─── single commit path for exam-wizard.jsx ────────────────────────────────
// Both onboarding and Add Exam build exam objects exclusively through this
// function — there is exactly one place that resolves a final color, assigns
// an id, and writes to EXAMS_KEY. examDrafts is an array so one wizard run
// (which may collect more than one subject) commits in a single saveExams
// call, and the schedule reconciles against the real "before" snapshot once.
function commitExamWizard({ examDrafts, profilePatch }) {
  const exams = getExams();
  const newExams = (examDrafts || []).map((d, i) => migrateExam({
    id: "e" + Date.now() + "_" + i,
    name: d.name,
    color: d.color, // migrateExam falls back to FALLBACK_COLORS rotation if invalid
    examDate: d.examDate,
    examBoard: d.examBoard,
    topicCount: d.topicCount,
    completionPct: 0,
    confidencePct: 50,
    targetGrade: d.targetGrade,
    currentGrade: d.currentGrade,
    gradingSystem: d.gradingSystem,
    importance: d.importance,
    notes: d.notes,
  }, exams.length + i));

  saveExams([...exams, ...newExams]); // triggers reconcileSchedule automatically

  // Honor each draft's chosen sessions/week, overriding reconcileSchedule's
  // default formula-seed for these brand-new exams only — avoids changing
  // schedule-store.jsx's reconcileSchedule signature for a one-off hint.
  const withHints = (examDrafts || []).some((d) => d.sessionsPerWeekHint != null);
  if (withHints && window.getSchedule && window.seedSessionsForExam && window.saveSchedule) {
    const schedule = window.getSchedule();
    let sessions = schedule.sessions;
    newExams.forEach((exam, i) => {
      const hint = examDrafts[i].sessionsPerWeekHint;
      if (hint == null) return;
      sessions = sessions.filter((s) => s.examId !== exam.id); // drop the auto-seed
      sessions = sessions.concat(window.seedSessionsForExam(exam, [], hint));
    });
    window.saveSchedule({ version: 1, sessions });
  }

  if (profilePatch && window.saveProfile) window.saveProfile(profilePatch);

  return newExams;
}

Object.assign(window, {
  EXAMS_KEY, getExams, getExamsSnapshot, saveExams, subscribeExams,
  daysAway, fmtDateKey, sessionsNeeded, requiredPct, migrateExam,
  deriveCourse, deriveCourses, commitExamWizard,
});
