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
    const dayOffset = Math.min(span, Math.max(1, Math.round(((i + 1) * span) / (count + 1))));
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

// ─── reconciliation ─────────────────────────────────────────────────────────

// Only examDate/topicCount affect scheduling — completionPct, confidencePct,
// targetGrade, color, examBoard, name are deliberately excluded so editing
// them never touches a single persisted session.
function fingerprintForScheduling(exam) {
  return exam.examDate + "|" + exam.topicCount;
}

function reconcileSchedule(oldExams, newExams, schedule) {
  const oldById = new Map(oldExams.map((e) => [e.id, e]));
  const newById = new Map(newExams.map((e) => [e.id, e]));
  const today = window.fmtDateKey(new Date());
  let sessions = schedule.sessions.slice();

  // 1. Removed exams: drop pending sessions, keep completed ones as history.
  for (const oldExam of oldExams) {
    if (!newById.has(oldExam.id)) {
      sessions = sessions.filter((s) => !(s.examId === oldExam.id && s.status !== "completed"));
    }
  }

  // 2. New exams: seed from scratch.
  for (const newExam of newExams) {
    if (!oldById.has(newExam.id)) {
      sessions = sessions.concat(seedSessionsForExam(newExam, []));
    }
  }

  // 3. Existing exams: only touch scheduling if examDate/topicCount changed.
  for (const newExam of newExams) {
    const oldExam = oldById.get(newExam.id);
    if (!oldExam) continue; // handled in step 2
    if (fingerprintForScheduling(oldExam) === fingerprintForScheduling(newExam)) continue;

    const examSessions = sessions.filter((s) => s.examId === newExam.id);
    const others = sessions.filter((s) => s.examId !== newExam.id);
    const completed = examSessions.filter((s) => s.status === "completed");
    const daysLeft = window.daysAway(newExam.examDate);
    const topicCount = Math.max(1, newExam.topicCount || 10);
    const stillValidPending = examSessions.filter((s) =>
      s.status !== "completed" && s.date >= today && s.date <= newExam.examDate && topicIndexFromId(s.id) < topicCount
    );

    const desired = daysLeft >= 0 ? Math.max(1, window.sessionsNeeded(newExam.completionPct || 0, daysLeft)) : 0;
    let finalPending = stillValidPending;
    if (stillValidPending.length < desired) {
      finalPending = stillValidPending.concat(
        seedSessionsForExam(newExam, completed.concat(stillValidPending), desired - stillValidPending.length)
      );
    } else if (stillValidPending.length > desired) {
      // Trim furthest-out first — simple, deterministic; the seam for future
      // spaced-repetition/AI-rescheduling logic to replace, not a smart policy today.
      finalPending = stillValidPending.slice().sort((a, b) => a.date.localeCompare(b.date)).slice(0, desired);
    }

    sessions = others.concat(completed, finalPending);
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

function markSessionCompleted(id, completed = true) {
  const schedule = getSchedule();
  return saveSchedule({
    version: 1,
    sessions: schedule.sessions.map((s) => s.id === id
      ? { ...s, status: completed ? "completed" : "pending", completedAt: completed ? new Date().toISOString() : null }
      : s),
  });
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
  reconcileSchedule, buildScheduleView, seedSessionsForExam, migrateSchedule, migrateSession,
  adaptSchedule, relabelPendingSessions, topicIndexFromId,
});
