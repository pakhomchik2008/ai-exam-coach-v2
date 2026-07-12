// AI Exam Coach — persisted study schedule. Sessions are their own entity
// (localStorage["study_schedule_v1"]), seeded from exams but never wholesale
// regenerated: editing one exam's completion % touches zero sessions, and a
// completed session survives reconciliation by stable id no matter what else
// changes. This is what data.jsx's buildScheduleData() now reads instead of
// synthesizing a fresh 90-day plan from scratch on every call.
//
// Must load after exams-store.jsx (uses window.getExams/daysAway/fmtDateKey/
// sessionsNeeded) and before data.jsx.

const SCHEDULE_KEY = "study_schedule_v1";

// ─── session id scheme ──────────────────────────────────────────────────────
// "::" delimited so examIds containing underscores (migrateExam's fallback
// id is "e<timestamp>_<index>") can never be misparsed as the topic index.

function makeSessionId(examId, topicIdx, dedupeSuffix) {
  return `sess::${examId}::${topicIdx}` + (dedupeSuffix ? `::${dedupeSuffix}` : "");
}
function topicIndexFromId(id) {
  const n = Number(String(id).split("::")[2]);
  return Number.isFinite(n) ? n : -1;
}

// ─── validation ─────────────────────────────────────────────────────────────

function isFinitePos(n) { return typeof n === "number" && Number.isFinite(n) && n >= 0; }

function migrateSession(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.id !== "string" || !raw.id) return null;
  if (typeof raw.examId !== "string" || !raw.examId) return null;
  if (typeof raw.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date)) return null;
  const completed = raw.status === "completed";
  return {
    id: raw.id,
    examId: raw.examId,
    date: raw.date,
    topic: typeof raw.topic === "string" && raw.topic ? raw.topic : "Study session",
    status: completed ? "completed" : "pending",
    completedAt: completed && typeof raw.completedAt === "string" ? raw.completedAt : (completed ? new Date().toISOString() : null),
    // Real seconds actually spent studying this session — the honest basis for
    // "hours studied this week" (vs. the profile's planned weekly hours).
    durationSec: isFinitePos(raw.durationSec) ? Math.round(raw.durationSec) : 0,
    // Planned session length in minutes — set by the budget engine from
    // profile.sessionLengthMin; null on pre-Phase-3 sessions (consumers fall
    // back to profile.sessionLengthMin ?? 45).
    durationMin: typeof raw.durationMin === "number" && raw.durationMin > 0 ? Math.round(raw.durationMin) : null,
  };
}

function migrateSchedule(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.sessions)) return { version: 1, sessions: [] };
  return { version: 1, sessions: raw.sessions.map(migrateSession).filter(Boolean) };
}

// ─── seeding ─────────────────────────────────────────────────────────────────

// Generates new pending sessions for one exam. existingForExam is used only
// to avoid id collisions with sessions that already exist for this exam
// (e.g. when topping up after an exam's date/topic count changed).
function seedSessionsForExam(exam, existingForExam, desiredCount) {
  const daysLeft = window.daysAway(exam.examDate);
  if (daysLeft < 0) return [];
  const topicCount = Math.max(1, exam.topicCount || 10);
  const count = desiredCount != null ? Math.max(0, desiredCount) : Math.max(1, window.sessionsNeeded(exam.completionPct || 0, daysLeft));
  if (count === 0) return [];

  const usedTopicIdx = new Set(existingForExam.map((s) => topicIndexFromId(s.id)));
  const usedIds = new Set(existingForExam.map((s) => s.id));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const span = Math.max(1, daysLeft);

  let cursor = 0;
  function nextTopicIdx() {
    for (let n = 0; n < topicCount; n++) {
      const cand = (cursor + n) % topicCount;
      if (!usedTopicIdx.has(cand)) { usedTopicIdx.add(cand); cursor = cand + 1; return cand; }
    }
    const cand = cursor % topicCount; cursor++; return cand; // exhausted unique topics — start repeating
  }
  function uniqueId(examId, topicIdx) {
    let id = makeSessionId(examId, topicIdx);
    let n = 2;
    while (usedIds.has(id)) { id = makeSessionId(examId, topicIdx, n); n++; }
    usedIds.add(id);
    return id;
  }

  const out = [];
  for (let i = 0; i < count; i++) {
    // Start from tomorrow (day 1) and spread evenly to just before exam — the old
    // formula started at span/(count+1) which left the first week empty.
    const dayOffset = Math.max(1, Math.min(span - 1, count <= 1 ? 1 : Math.round(i * (span - 1) / (count - 1))));
    const d = new Date(today); d.setDate(d.getDate() + dayOffset);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1); // nudge off Sundays
    const topicIdx = nextTopicIdx();
    out.push({
      id: uniqueId(exam.id, topicIdx),
      examId: exam.id,
      date: window.fmtDateKey(d),
      topic: (exam.topics && exam.topics[topicIdx]) || `Topic review ${topicIdx + 1}`,
      status: "pending",
      completedAt: null,
    });
  }
  return out;
}

// ─── hour-budget allocation engine ──────────────────────────────────────────
// Phase 3: replaces the sessionsNeeded-based approach for generating new
// pending sessions. Converts the user's real study budget (weeklyHours,
// daysPerWeek, sessionLengthMin, blackoutSlots from profile) into a concrete
// session plan:
//
//   total weekly budget
//     → split proportionally across active exams by urgency (topics / daysLeft)
//     → split within each exam across topics by (difficulty × importance / retention)
//     → pack into sessions of sessionLengthMin stamped on allowed calendar days
//
// Returns Map<examId, { sessions: Session[], budgetWarning: string|null }>.
// reconcileSchedule decides which exam IDs to actually replace; this just
// computes the plan. sessionsNeeded stays in place for display-side estimates
// (deriveCourse → recommendedSessions / remainingWork) — they're a different
// concern from the scheduler.

// Days per week that are NOT completely blocked (period !== "all").
// Used to cap effectiveDaysPerWeek against the user's blackout constraints.
function availableStudyDaysPerWeek(blackoutSlots) {
  const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const fullyBlocked = new Set(
    (blackoutSlots || []).filter((s) => s && s.period === "all").map((s) => s.day)
  );
  return DAYS.filter((d) => !fullyBlocked.has(d)).length;
}

// SM-2 retention from brain-store mastery, falling back to 0.3 ("needs review").
// A lower retention value → higher study weight for that topic.
function _topicRetention(examId, topicIdx) {
  try {
    const mastery = window.getMastery ? window.getMastery() : {};
    const entry = mastery[`${examId}::${topicIdx}`];
    if (entry && typeof entry.retention === "number") return Math.max(0.05, entry.retention);
  } catch {}
  return 0.3;
}

function allocateBudget(exams, profile) {
  const {
    weeklyHours = 12,
    daysPerWeek = 5,
    sessionLengthMin = 45,
    blackoutSlots = [],
  } = profile || {};

  // ── 1. Compute real weekly session capacity ─────────────────────────────
  const totalAvailDays = availableStudyDaysPerWeek(blackoutSlots);
  // Can't study more days than non-blacked-out days; also can't exceed budget
  const effectiveDaysPerWeek = Math.max(1, Math.min(daysPerWeek, totalAvailDays));
  const sessionLengthHours = sessionLengthMin / 60;
  const maxByHours = Math.max(1, Math.floor(weeklyHours / sessionLengthHours));
  const sessionsPerWeek = Math.min(effectiveDaysPerWeek, maxByHours);

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const activeExams = (exams || []).filter((e) => new Date(e.examDate) > today);
  const result = new Map();
  if (!activeExams.length) return result;

  // ── 2. Urgency = topics / daysLeft — split budget proportionally ────────
  function daysLeftFor(exam) {
    return Math.max(1, Math.ceil((new Date(exam.examDate) - today) / 86400000));
  }
  function urgency(exam) { return (exam.topicCount || 10) / daysLeftFor(exam); }
  const totalUrgency = activeExams.reduce((s, e) => s + urgency(e), 0) || 1;

  // Day names that are fully blacked out (JS: 0=Sun,1=Mon,...,6=Sat)
  const fullyBlockedDayNames = new Set(
    (blackoutSlots || []).filter((s) => s && s.period === "all").map((s) => s.day)
  );
  const JS_DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

  for (const exam of activeExams) {
    const dl = daysLeftFor(exam);
    const weeksLeft = Math.max(1, dl / 7);

    // Sessions/week for this exam, proportional to urgency
    const urgencyFraction = urgency(exam) / totalUrgency;
    const sessionsPerWeekForExam = Math.max(1, Math.round(sessionsPerWeek * urgencyFraction));

    // Total sessions across the full remaining prep window
    const totalSessions = Math.max(1, Math.round(sessionsPerWeekForExam * weeksLeft));

    const topicCount = Math.max(1, exam.topicCount || 10);
    const budgetWarning = totalSessions < topicCount
      ? `Budget allows ${totalSessions} sessions before the exam, but there are ${topicCount} topics — increase weekly hours or study days to cover everything.`
      : null;

    // ── 3. Weight topics by difficulty × importance / retention ──────────
    const rawWeights = [];
    for (let i = 0; i < topicCount; i++) {
      const w = (exam.topicWeights || {})[i] || {};
      const d = typeof w.difficulty === "number" ? w.difficulty : 5;
      const imp = typeof w.importance === "number" ? w.importance : 5;
      rawWeights.push((d * imp) / _topicRetention(exam.id, i));
    }
    const totalWeight = rawWeights.reduce((s, w) => s + w, 0) || 1;

    // Each topic gets at least 1 session, then additional sessions by weight
    const sessionsPerTopic = rawWeights.map((w) =>
      Math.max(1, Math.round((w / totalWeight) * totalSessions))
    );

    // ── 4. Round-robin interleave: each pass covers each topic once ───────
    // Result: if topic 0 gets 5 sessions and topic 1 gets 2, the plan is
    // [0,1,0,1,0,0,0] — spaced so both are revisited throughout the timeline.
    const sessionPlan = [];
    const remaining = [...sessionsPerTopic];
    let anyLeft = true;
    while (anyLeft) {
      anyLeft = false;
      for (let i = 0; i < topicCount; i++) {
        if (remaining[i] > 0) { sessionPlan.push(i); remaining[i]--; anyLeft = true; }
      }
    }

    // ── 5. Build list of available calendar dates ─────────────────────────
    const availableDates = [];
    const examDate = new Date(exam.examDate);
    const cur = new Date(today); cur.setDate(cur.getDate() + 1);
    while (cur < examDate) {
      if (!fullyBlockedDayNames.has(JS_DAY_NAMES[cur.getDay()])) {
        availableDates.push(window.fmtDateKey(new Date(cur)));
      }
      cur.setDate(cur.getDate() + 1);
    }

    if (!availableDates.length) {
      result.set(exam.id, { sessions: [], budgetWarning: "No available study days before this exam." });
      continue;
    }

    // ── 6. Spread session plan evenly across available dates ──────────────
    const count = Math.min(sessionPlan.length, availableDates.length);
    const usedIds = new Set();
    const sessions = [];

    for (let k = 0; k < count; k++) {
      const topicIdx = sessionPlan[k];
      // Evenly-spaced index into availableDates
      const dateIdx = count <= 1
        ? 0
        : Math.min(availableDates.length - 1, Math.round(k * (availableDates.length - 1) / (count - 1)));

      // Deduplicate within this exam's session set
      let id = makeSessionId(exam.id, topicIdx);
      let n = 2;
      while (usedIds.has(id)) { id = makeSessionId(exam.id, topicIdx, n); n++; }
      usedIds.add(id);

      sessions.push({
        id,
        examId: exam.id,
        date: availableDates[dateIdx],
        topic: (exam.topics && exam.topics[topicIdx]) || `Topic review ${topicIdx + 1}`,
        status: "pending",
        completedAt: null,
        durationSec: 0,
        durationMin: sessionLengthMin, // ← first time sessions carry a real planned duration
      });
    }

    result.set(exam.id, { sessions, budgetWarning });
  }

  return result;
}

// ─── reconciliation ─────────────────────────────────────────────────────────

// Only examDate/topicCount affect scheduling — completionPct, confidencePct,
// targetGrade, color, examBoard, name are deliberately excluded so editing
// them never touches a single persisted session.
function fingerprintForScheduling(exam) {
  return exam.examDate + "|" + exam.topicCount;
}

function reconcileSchedule(oldExams, newExams, schedule) {
  const profile = window.getProfile ? window.getProfile() : {};
  const oldById = new Map(oldExams.map((e) => [e.id, e]));
  const newById = new Map(newExams.map((e) => [e.id, e]));
  let sessions = schedule.sessions.slice();

  // 1. Removed exams: drop pending sessions, keep completed ones as history.
  for (const oldExam of oldExams) {
    if (!newById.has(oldExam.id)) {
      sessions = sessions.filter((s) => !(s.examId === oldExam.id && s.status !== "completed"));
    }
  }

  // 2+3. Identify exams that need a new session plan: brand-new exams, or
  //      existing ones whose examDate or topicCount changed.
  const needsReplanning = new Set();
  for (const newExam of newExams) {
    if (!oldById.has(newExam.id)) {
      needsReplanning.add(newExam.id); // new exam
    } else {
      const oldExam = oldById.get(newExam.id);
      if (fingerprintForScheduling(oldExam) !== fingerprintForScheduling(newExam)) {
        needsReplanning.add(newExam.id); // changed date or topicCount
      }
    }
  }

  if (needsReplanning.size > 0) {
    // Budget is shared across ALL active exams (urgency fractions sum to 1) —
    // run the engine once on the full portfolio so splits are correct.
    // Only the exams in needsReplanning actually get their pending sessions
    // replaced; unchanged exams keep whatever they have.
    const budgetPlan = allocateBudget(newExams, profile);

    for (const examId of needsReplanning) {
      const plan = budgetPlan.get(examId);
      const completed = sessions.filter((s) => s.examId === examId && s.status === "completed");
      const others = sessions.filter((s) => s.examId !== examId);
      sessions = others.concat(completed, plan ? plan.sessions : []);
    }
  }

  return { version: 1, sessions };
}

// ─── view (pure, cheap, derived — not persisted) ───────────────────────────

let _viewArgs = null;
let _viewCache = null;
function buildScheduleView(schedule, courses) {
  if (_viewArgs && _viewArgs[0] === schedule && _viewArgs[1] === courses) return _viewCache;
  _viewArgs = [schedule, courses];

  const courseById = new Map(courses.map((c) => [c.id, c]));
  const sessionsByDay = {};
  const examDates = {};

  schedule.sessions.forEach((s) => {
    const c = courseById.get(s.examId);
    if (!c) return; // exam fully deleted (incl. its completed history)
    (sessionsByDay[s.date] = sessionsByDay[s.date] || []).push({
      id: s.id, subject: c.name, color: c.color, topic: s.topic, status: s.status,
    });
  });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  courses.forEach((c) => {
    if (c.daysAway < 0) return;
    const d = new Date(today); d.setDate(d.getDate() + c.daysAway);
    const key = window.fmtDateKey(d);
    (examDates[key] = examDates[key] || []).push({ subject: c.name, color: c.color });
  });

  _viewCache = { sessionsByDay, examDates };
  return _viewCache;
}

// ─── memoized read/write + first-run seed ──────────────────────────────────

let _scheduleRaw = null;
let _scheduleCache = null;
const _scheduleListeners = new Set();
function subscribeSchedule(fn) { _scheduleListeners.add(fn); return () => _scheduleListeners.delete(fn); }
function _notifySchedule() { _scheduleListeners.forEach((fn) => fn()); }

function getSchedule() {
  let raw;
  try { raw = localStorage.getItem(SCHEDULE_KEY); } catch { raw = null; }
  if (raw === _scheduleRaw && _scheduleCache) return _scheduleCache;

  if (raw === null) {
    // First run (or migrating from a session that only ever had exams_list_v2):
    // seed once from whatever exams already exist, same logic as adding a new exam.
    const seeded = { version: 1, sessions: window.getExams().flatMap((e) => seedSessionsForExam(e, [])) };
    try { localStorage.setItem(SCHEDULE_KEY, JSON.stringify(seeded)); } catch {}
    _scheduleRaw = JSON.stringify(seeded);
    _scheduleCache = seeded;
    return seeded;
  }

  _scheduleRaw = raw;
  try { _scheduleCache = migrateSchedule(JSON.parse(raw)); }
  catch { _scheduleCache = { version: 1, sessions: [] }; }
  return _scheduleCache;
}

function saveSchedule(state) {
  const validated = migrateSchedule(state);
  try { localStorage.setItem(SCHEDULE_KEY, JSON.stringify(validated)); } catch {}
  _scheduleRaw = JSON.stringify(validated);
  _scheduleCache = validated;
  _notifySchedule();
  return validated;
}

function markSessionCompleted(id, completed = true, durationSec = null) {
  const schedule = getSchedule();
  return saveSchedule({
    version: 1,
    sessions: schedule.sessions.map((s) => s.id === id
      ? { ...s, status: completed ? "completed" : "pending",
          completedAt: completed ? new Date().toISOString() : null,
          durationSec: completed ? (isFinitePos(durationSec) ? Math.round(durationSec) : (s.durationSec || 0)) : 0 }
      : s),
  });
}

// Records that a study session actually happened. If the id already exists in
// the schedule (a planned session) it's marked complete in place; if it doesn't
// (a recommended / ad-hoc "rec::…" or CourseDetail session) it's inserted as a
// completed history entry. Either way the real study time lands in the schedule
// so "hours studied this week" counts EVERY session, planned or not.
function recordCompletedSession({ id, examId, topic, durationSec }) {
  const schedule = getSchedule();
  const exists = schedule.sessions.some((s) => s.id === id);
  if (exists) return markSessionCompleted(id, true, durationSec);
  const eid = examId || (typeof id === "string" && id.includes("::") ? id.split("::")[1] : null);
  if (!eid) return schedule;
  return saveSchedule({
    version: 1,
    sessions: schedule.sessions.concat([{
      id, examId: eid,
      date: window.fmtDateKey(new Date()),
      topic: topic || "Study session",
      status: "completed",
      completedAt: new Date().toISOString(),
      durationSec: isFinitePos(durationSec) ? Math.round(durationSec) : 0,
    }]),
  });
}

// Total seconds of real study logged in the current (Mon–Sun) week, across ALL
// completed sessions regardless of which exam or whether they were planned.
function secondsStudiedThisWeek() {
  const schedule = getSchedule();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(monday.getDate() - ((today.getDay() + 6) % 7));
  const monKey = window.fmtDateKey(monday);
  return schedule.sessions.reduce((sum, s) => {
    if (s.status !== "completed") return sum;
    // Prefer completedAt's date; fall back to the session date.
    const day = s.completedAt ? window.fmtDateKey(new Date(s.completedAt)) : s.date;
    return day >= monKey ? sum + (s.durationSec || 0) : sum;
  }, 0);
}

// Retroactively renames already-seeded sessions once AI topic names arrive
// (requestTopicNames in ai-enrichment.jsx runs after the exam — and its first
// sessions — already exist). Only touches pending sessions: a completed
// session's topic label is part of its history and stays exactly as it was
// when the user actually studied it, same principle as everywhere else in
// this file.
function relabelPendingSessions(examId, topics) {
  if (!examId || !Array.isArray(topics) || !topics.length) return;
  const schedule = getSchedule();
  let changed = false;
  const sessions = schedule.sessions.map((s) => {
    if (s.examId !== examId || s.status !== "pending") return s;
    const name = topics[topicIndexFromId(s.id)];
    if (!name || s.topic === name) return s;
    changed = true;
    return { ...s, topic: name };
  });
  if (changed) saveSchedule({ version: 1, sessions });
}

// ─── adaptive rescheduling ──────────────────────────────────────────────
// When sessions are overdue (date < today, still pending), redistribute
// them into the remaining prep window. Returns { adapted: boolean,
// changes: string[] } describing what moved and why.
function adaptSchedule() {
  const schedule = getSchedule();
  const today = window.fmtDateKey(new Date());
  const exams = window.getExams();
  const examById = new Map(exams.map(e => [e.id, e]));

  const overdue = schedule.sessions.filter(s => s.status === "pending" && s.date < today);
  if (overdue.length === 0) return { adapted: false, changes: [] };

  const changes = [];
  let sessions = schedule.sessions.slice();

  overdue.forEach(s => {
    const exam = examById.get(s.examId);
    if (!exam) return;
    const daysLeft = window.daysAway(exam.examDate);
    if (daysLeft <= 0) {
      sessions = sessions.filter(x => x.id !== s.id);
      changes.push(`Removed "${s.topic}" for ${exam.name} (exam already passed)`);
      return;
    }
    const futureCount = sessions.filter(x => x.examId === s.examId && x.status === "pending" && x.date >= today).length;
    const spread = Math.max(1, Math.round(daysLeft / Math.max(1, futureCount + 1)));
    const offset = Math.min(spread, Math.max(1, Math.ceil(Math.random() * Math.min(7, daysLeft))));
    const d = new Date(); d.setDate(d.getDate() + offset);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    const newDate = window.fmtDateKey(d);
    sessions = sessions.map(x => x.id === s.id ? { ...x, date: newDate } : x);
    changes.push(`Moved "${s.topic}" (${exam.name}) to ${newDate}`);
  });

  if (changes.length > 0) {
    saveSchedule({ version: 1, sessions });
  }
  return { adapted: changes.length > 0, changes };
}

Object.assign(window, {
  SCHEDULE_KEY, getSchedule, saveSchedule, subscribeSchedule, markSessionCompleted,
  recordCompletedSession, secondsStudiedThisWeek,
  reconcileSchedule, buildScheduleView, seedSessionsForExam, migrateSchedule, migrateSession,
  adaptSchedule, relabelPendingSessions, topicIndexFromId,
  allocateBudget, availableStudyDaysPerWeek,
});
