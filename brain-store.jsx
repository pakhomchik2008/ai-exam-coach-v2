// AI Exam Coach — THE BRAIN.
//
// One unified learner model that every screen reads from and every action
// writes to. Before this file, state lived in six disconnected islands
// (exams / schedule / profile / mistakes / auth / progress-metrics) and no
// screen ever re-rendered when another wrote — App faked it with a
// key={dataVersion} remount hack driven only by cross-tab `storage` events.
//
// This module adds the three things that model was missing and that the whole
// product vision stands on:
//
//   1. PER-TOPIC MASTERY  — a spaced-repetition memory (mastery, confidence,
//      ease, interval, due date, history) keyed by "examId::topicIdx". The old
//      model had exactly two user-set sliders per *exam*; there was nowhere for
//      "how well do you know THIS concept, and when will you forget it" to live.
//
//   2. KNOWLEDGE BASE     — persisted structured extraction from uploaded
//      materials (chapters, objectives, key facts, formulas, glossary). Uploads
//      used to be read once for topic *names* and then thrown away.
//
//   3. LEARNER MEMORY     — durable facts about the student (learning style,
//      strengths, weaknesses, preferred explanations) that the AI layer injects
//      into every call so it actually remembers them.
//
// Plus real reactivity: useBrain() is a genuine React.useSyncExternalStore hook
// that subscribes to all underlying stores at once, so a mastery change in a
// study session live-updates the dashboard, progress page and planner without a
// remount. This is the seam the rest of the rebuild plugs into.
//
// Must load AFTER exams-store / schedule-store / profile-store / mistakes-store
// (it composes their subscribe fns) and BEFORE any screen that calls useBrain().

const MASTERY_KEY = "brain_mastery_v1";
const KB_KEY      = "brain_kb_v1";
const MEMORY_KEY  = "brain_memory_v1";

// ─── low-level persistence (same memoized shape as the other stores) ─────────

function _read(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function _write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function clamp01(n) { return Math.max(0, Math.min(1, n)); }
function nowISO() { return new Date().toISOString(); }
function daysBetween(aISO, bMs) { return (bMs - new Date(aISO).getTime()) / 86400000; }

// ─── topic identity ──────────────────────────────────────────────────────────
// Sessions already key topics as examId::topicIdx (schedule-store). We reuse
// that exact identity so mastery, the schedule and any AI-extracted topic list
// all line up on the same key with no translation layer.

function topicKey(examId, topicIdx) { return `${examId}::${topicIdx}`; }

// ─── mastery model ─────────────────────────────────────────────────────────

// A blank topic reads as "seen a little, unsure" rather than "known" or
// "failing" — mastery 0 with confidence 0 so the forgetting curve and readiness
// both treat it as work-to-do without pretending we have signal we don't.
function blankTopic(examId, topicIdx, topicName) {
  return {
    examId, topicIdx, topicName: topicName || `Topic ${topicIdx + 1}`,
    mastery: 0,        // 0..1 — best estimate of current knowledge
    confidence: 0,     // 0..1 — how sure the *student* feels (self-report)
    reps: 0,           // successful reviews in a row (SM-2 style)
    ease: 2.5,         // SM-2 ease factor
    intervalDays: 0,   // scheduling interval after last review
    stability: 1,      // forgetting-curve stability (days); grows with mastery
    lastSeen: null,    // ISO of last review
    dueDate: null,     // ISO date this topic wants review again
    history: [],       // [{ at, event, delta }] — capped
    quickCheckStreak: 0,     // consecutive 100% Quick Checks on this topic
    quickCheckDifficulty: 1, // 1..5 — rises as the streak proves mastery
  };
}

// Raw legacy flat map only — internal use, never exported directly. All the
// write functions below use this (not the merged getMastery()) so a
// course-backed exam's reconstructed entries never get accidentally
// persisted back into the legacy store.
function _legacyGetMastery() { return _read(MASTERY_KEY, {}); }

function _findExam(examId) {
  const exams = window.getExams ? window.getExams() : [];
  return exams.find((e) => e.id === examId) || null;
}

// Course-first adapter (see course-store.jsx): for an exam with a courseId,
// mastery for that exam's topics actually lives on the shared Course, keyed
// by the topic's STABLE id (not array index) — this is what makes progress
// genuinely shared across every exam (midterm/final/resit/mock) that points
// at the same course. Reconstructs a legacy-shaped entry so every existing
// reader keeps working unmodified.
function _courseTopicToLegacyEntry(exam, course, topicIdx) {
  const topic = course.topics[topicIdx];
  if (!topic) return null;
  const stored = course.progress.topicMastery[topic.id];
  const base = stored || blankTopic(exam.id, topicIdx, topic.name);
  return { ...base, examId: exam.id, topicIdx, topicName: topic.name };
}

// PUBLIC getMastery(): the legacy flat map, PLUS reconstructed entries for
// every course-backed exam's topics — one consistent "examId::topicIdx"
// shape regardless of whether an exam is legacy or course-backed, so
// schedule-store/AIChat/Dashboard/StudySession need zero changes.
function getMastery() {
  const legacy = _legacyGetMastery();
  const exams = window.getExams ? window.getExams() : [];
  const courseBacked = exams.filter((e) => e.courseId);
  if (!courseBacked.length) return legacy;
  const merged = { ...legacy };
  courseBacked.forEach((exam) => {
    const course = window.getCourse ? window.getCourse(exam.courseId) : null;
    if (!course) return;
    course.topics.forEach((topic, i) => {
      const entry = _courseTopicToLegacyEntry(exam, course, i);
      if (entry) merged[topicKey(exam.id, i)] = entry;
    });
  });
  return merged;
}

// Retention right now under an exponential forgetting curve. A topic never
// reviewed (no lastSeen) returns its raw mastery so it doesn't spuriously read
// as "forgotten" before it was ever learned.
function retention(topic, atMs = Date.now()) {
  if (!topic || !topic.lastSeen) return topic ? topic.mastery : 0;
  const elapsed = Math.max(0, daysBetween(topic.lastSeen, atMs));
  const stability = Math.max(0.5, topic.stability || 1);
  return clamp01(topic.mastery * Math.exp(-elapsed / stability));
}

// Pure mastery update — given a topic and an answer, return the NEXT topic.
// No persistence, no side effects, so it's reusable for both the real write
// path (recordReview) and hypothetical projections (simulateReadinessGain).
function applyReview(topic, correct, quality) {
  const t = { ...topic };
  const q = typeof quality === "number" ? clamp01(quality) : (correct ? 1 : 0);
  const before = t.mastery;

  if (correct) {
    t.mastery = clamp01(t.mastery + (1 - t.mastery) * (0.28 + 0.22 * q));
    t.reps += 1;
    t.ease = clamp(1.3, 2.8, t.ease + 0.06 - (1 - q) * 0.14);
    t.intervalDays = t.reps <= 1 ? 1 : t.reps === 2 ? 3 : Math.round(t.intervalDays * t.ease) || 3;
    t.stability = Math.max(1, t.stability * (1 + 0.9 * t.mastery));
  } else {
    t.mastery = clamp01(t.mastery * 0.55);
    t.reps = 0;
    t.ease = clamp(1.3, 2.8, t.ease - 0.2);
    t.intervalDays = 1;               // see it again tomorrow
    t.stability = Math.max(0.8, t.stability * 0.6);
  }

  t.lastSeen = nowISO();
  const due = new Date(); due.setDate(due.getDate() + Math.max(1, Math.round(t.intervalDays)));
  t.dueDate = due.toISOString().slice(0, 10);
  t.history = [{ at: t.lastSeen, event: correct ? "correct" : "wrong", delta: +(t.mastery - before).toFixed(3) }, ...t.history].slice(0, 40);
  return t;
}

// The single write path for "the student answered / reviewed this topic".
// correct: boolean. quality (0..1, optional) lets a graded free answer nudge
// more finely than a binary right/wrong. Returns the updated topic.
function recordReview({ examId, topicIdx, topicName, correct, quality }) {
  const exam = _findExam(examId);
  if (exam && exam.courseId && window.getCourse) {
    const course = window.getCourse(exam.courseId);
    const topic = course && course.topics[topicIdx];
    if (course && topic) {
      const base = course.progress.topicMastery[topic.id] || blankTopic(examId, topicIdx, topic.name);
      const t = applyReview(base, correct, quality);
      window.saveCourseTopicMastery(exam.courseId, topic.id, t);
      _bump();
      return { ...t, examId, topicIdx, topicName: topic.name };
    }
  }
  const map = _legacyGetMastery();
  const key = topicKey(examId, topicIdx);
  const base = { ...(map[key] || blankTopic(examId, topicIdx, topicName)) };
  if (topicName) base.topicName = topicName;
  const t = applyReview(base, correct, quality);
  map[key] = t;
  _write(MASTERY_KEY, map);
  _bump();
  return t;
}

// Self-reported confidence after a study session (1..4 rating from SessionRecap
// or a 0..1 value). Kept separate from mastery: how sure you *feel* and how
// well you actually *did* are different signals, and readiness blends both.
function recordConfidence({ examId, topicIdx, topicName, rating }) {
  const conf = rating > 1 ? clamp01((rating - 1) / 3) : clamp01(rating); // accept 1..4 or 0..1
  const exam = _findExam(examId);
  if (exam && exam.courseId && window.getCourse) {
    const course = window.getCourse(exam.courseId);
    const topic = course && course.topics[topicIdx];
    if (course && topic) {
      const base = course.progress.topicMastery[topic.id] || blankTopic(examId, topicIdx, topic.name);
      const t = { ...base, confidence: conf, lastSeen: base.lastSeen || nowISO() };
      window.saveCourseTopicMastery(exam.courseId, topic.id, t);
      _bump();
      return { ...t, examId, topicIdx, topicName: topic.name };
    }
  }
  const map = _legacyGetMastery();
  const key = topicKey(examId, topicIdx);
  const t = { ...(map[key] || blankTopic(examId, topicIdx, topicName)) };
  if (topicName) t.topicName = topicName;
  t.confidence = conf;
  t.lastSeen = t.lastSeen || nowISO();
  map[key] = t;
  _write(MASTERY_KEY, map);
  _bump();
  return t;
}

function clamp(min, max, n) { return Math.max(min, Math.min(max, n)); }

// Adaptive Quick Check difficulty. A perfect (100%) Quick Check extends the
// topic's streak; every 5th consecutive perfect result bumps difficulty up
// one notch (capped at 5). Any non-perfect result resets the streak but never
// lowers difficulty already earned — matches how the rest of this store never
// "un-learns" progress on a single bad review (mastery decays instead of
// resetting to 0). Returns { topic, leveledUp } so the caller can celebrate.
function _applyQuickCheck(t, perfect) {
  let leveledUp = false;
  if (perfect) {
    t.quickCheckStreak = (t.quickCheckStreak || 0) + 1;
    if (t.quickCheckStreak % 5 === 0 && (t.quickCheckDifficulty || 1) < 5) {
      t.quickCheckDifficulty = (t.quickCheckDifficulty || 1) + 1;
      leveledUp = true;
    }
  } else {
    t.quickCheckStreak = 0;
  }
  return leveledUp;
}

function recordQuickCheckResult({ examId, topicIdx, topicName, perfect }) {
  const exam = _findExam(examId);
  if (exam && exam.courseId && window.getCourse) {
    const course = window.getCourse(exam.courseId);
    const topic = course && course.topics[topicIdx];
    if (course && topic) {
      const t = { ...(course.progress.topicMastery[topic.id] || blankTopic(examId, topicIdx, topic.name)) };
      const leveledUp = _applyQuickCheck(t, perfect);
      window.saveCourseTopicMastery(exam.courseId, topic.id, t);
      _bump();
      return { topic: { ...t, examId, topicIdx, topicName: topic.name }, leveledUp };
    }
  }
  const map = _legacyGetMastery();
  const key = topicKey(examId, topicIdx);
  const t = { ...(map[key] || blankTopic(examId, topicIdx, topicName)) };
  if (topicName) t.topicName = topicName;
  const leveledUp = _applyQuickCheck(t, perfect);
  map[key] = t;
  _write(MASTERY_KEY, map);
  _bump();
  return { topic: t, leveledUp };
}

function getQuickCheckDifficulty(examId, topicIdx) {
  const t = getMastery()[topicKey(examId, topicIdx)];
  return t && t.quickCheckDifficulty ? t.quickCheckDifficulty : 1;
}

// Marks a set of this exam's topics as "studied this session" — the explicit
// coverage signal the user gives on the recap screen ("which of my 10 topics
// did I cover?"). Studying a topic is recorded as a solid (not perfect) review
// so mastery/readiness rise honestly, and the exam's completionPct is
// re-derived from real coverage (topics ever studied / total) — replacing the
// old manual "topics covered" slider that granted progress for zero work.
function markTopicsStudied(examId, topicIdxs, topicNames) {
  if (!examId || !Array.isArray(topicIdxs) || topicIdxs.length === 0) return;
  const exam = _findExam(examId);
  if (exam && exam.courseId && window.getCourse) {
    const course = window.getCourse(exam.courseId);
    if (course) {
      topicIdxs.forEach((idx, i) => {
        const topic = course.topics[idx];
        if (!topic) return;
        const base = course.progress.topicMastery[topic.id] || blankTopic(examId, idx, (topicNames && topicNames[i]) || topic.name);
        window.saveCourseTopicMastery(exam.courseId, topic.id, applyReview(base, true, 0.6));
      });
      syncCompletionFromCoverage(examId, getMastery());
      _bump();
      return;
    }
  }
  const map = _legacyGetMastery();
  topicIdxs.forEach((idx, i) => {
    const key = topicKey(examId, idx);
    const base = { ...(map[key] || blankTopic(examId, idx, topicNames && topicNames[i])) };
    if (topicNames && topicNames[i]) base.topicName = topicNames[i];
    map[key] = applyReview(base, true, 0.6);
  });
  _write(MASTERY_KEY, map);
  syncCompletionFromCoverage(examId, map);
  _bump();
}

// completionPct = share of an exam's topics that have ever been studied.
function coverageForExam(examId, masteryMap) {
  const exams = window.getExams ? window.getExams() : [];
  const exam = exams.find((e) => e.id === examId);
  if (!exam) return 0;
  const count = Math.max(1, exam.topicCount || (exam.topics ? exam.topics.length : 10));
  const map = masteryMap || getMastery();
  let covered = 0;
  for (let i = 0; i < count; i++) {
    const t = map[topicKey(examId, i)];
    if (t && t.lastSeen) covered++;
  }
  return Math.round((covered / count) * 100);
}

// Writes the derived coverage back onto the exam so every legacy consumer of
// completionPct (Exams screen bar, sessionsNeeded, pace) stays consistent.
function syncCompletionFromCoverage(examId, masteryMap) {
  if (!window.getExams || !window.saveExams) return;
  const pct = coverageForExam(examId, masteryMap);
  const exams = window.getExams();
  const exam = exams.find((e) => e.id === examId);
  if (!exam || exam.completionPct === pct) return;
  window.saveExams(exams.map((e) => e.id === examId ? { ...e, completionPct: pct } : e));
}

// ─── knowledge base (from uploads) ───────────────────────────────────────────

function getKnowledgeBase() { return _read(KB_KEY, {}); }

// Course-first adapter: a course-backed exam's KB lives on course.knowledgeBase
// (shape-identical: {status, chapters, glossary, sourceFiles, extractedAt,
// updatedAt}) so it's shared across every exam pointing at that course —
// legacy (no-courseId) exams keep reading/writing the old per-exam flat map.
function getExamKB(examId) {
  const exam = _findExam(examId);
  if (exam && exam.courseId && window.getCourse) {
    const course = window.getCourse(exam.courseId);
    if (course) return course.knowledgeBase;
  }
  return getKnowledgeBase()[examId] || null;
}
function saveExamKB(examId, kb) {
  const exam = _findExam(examId);
  if (exam && exam.courseId && window.getCourse && window.saveCourse) {
    const course = window.getCourse(exam.courseId);
    const nextKb = { ...(course ? course.knowledgeBase : {}), ...kb, updatedAt: nowISO() };
    const saved = window.saveCourse(exam.courseId, { knowledgeBase: nextKb });
    _bump();
    return saved ? saved.knowledgeBase : nextKb;
  }
  const all = getKnowledgeBase();
  all[examId] = { ...(all[examId] || {}), ...kb, updatedAt: nowISO() };
  _write(KB_KEY, all);
  _bump();
  return all[examId];
}

// ─── learner memory ──────────────────────────────────────────────────────────

function getMemory() {
  return _read(MEMORY_KEY, {
    learningStyle: null,          // e.g. "examples-first", "visual", "formal"
    strengths: [], weaknesses: [], preferredExplanations: [], notes: [],
  });
}
function updateMemory(patch) {
  const next = { ...getMemory(), ...patch };
  _write(MEMORY_KEY, next);
  _bump();
  return next;
}
// Append a durable note the AI should remember (deduped, capped).
function rememberNote(note) {
  if (!note || typeof note !== "string") return;
  const m = getMemory();
  const notes = [note, ...m.notes.filter((n) => n !== note)].slice(0, 40);
  return updateMemory({ notes });
}

// ─── derived learner snapshot ─────────────────────────────────────────────────
// This is what screens actually consume. Everything here is COMPUTED from the
// real persisted stores — no fabricated numbers. A learner with no history gets
// honest zeros, not placeholder figures.

function enrichExamTopics(exam, masteryMap) {
  const count = Math.max(1, exam.topicCount || (exam.topics ? exam.topics.length : 10));
  const out = [];
  for (let i = 0; i < count; i++) {
    const key = topicKey(exam.id, i);
    const stored = masteryMap[key];
    const name = (exam.topics && exam.topics[i]) || (stored && stored.topicName) || `Topic ${i + 1}`;
    const t = stored ? { ...stored, topicName: name } : blankTopic(exam.id, i, name);
    out.push({ ...t, key, retention: retention(t) });
  }
  return out;
}

// Readiness that actually uses topic mastery when we have it, and degrades
// gracefully to the legacy completion/confidence blend when we don't — so this
// is a strict superset of the old deriveCourse readiness, never a regression.
function examReadiness(exam, topics) {
  const seen = topics.filter((t) => t.lastSeen);
  if (seen.length === 0) {
    const completion = exam.completionPct || 0;
    const conf = exam.confidencePct ?? 50;
    return Math.round(completion * 0.7 + conf * 0.3);
  }
  const avgRet = topics.reduce((s, t) => s + t.retention, 0) / topics.length;
  const avgConf = topics.reduce((s, t) => s + t.confidence, 0) / topics.length;
  const coverage = seen.length / topics.length;
  return Math.round(clamp01(avgRet * 0.6 + avgConf * 0.2 + coverage * 0.2) * 100);
}

// Honest "+X% readiness" projection: how much would this exam's readiness rise
// if the student reviewed this one topic correctly right now? Computed by
// running the pure mastery update on a CLONE and re-deriving — never persisted.
function simulateReadinessGain(examId, topicIdx, correct = true) {
  const exams = window.getExams ? window.getExams() : [];
  const exam = exams.find((e) => e.id === examId);
  if (!exam) return 0;
  const map = getMastery();
  const before = examReadiness(exam, enrichExamTopics(exam, map));
  const key = topicKey(examId, topicIdx);
  const current = map[key] || blankTopic(examId, topicIdx, exam.topics && exam.topics[topicIdx]);
  const map2 = { ...map, [key]: applyReview(current, correct, correct ? 1 : 0) };
  const after = examReadiness(exam, enrichExamTopics(exam, map2));
  return Math.max(0, after - before);
}

// ─── canonical grade / probability / pace ─────────────────────────────────────
// One grade scale, used everywhere. predictedGrade, target thresholds, the
// probability of hitting the target and pace are ALL derived from the single
// readiness number — so no two places can ever disagree.

const GRADE_THRESHOLDS = [["A*", 90], ["A", 80], ["B", 65], ["C", 50], ["D", 35], ["E", 0]];
function gradeFromReadiness(r) {
  for (const [g, min] of GRADE_THRESHOLDS) if (r >= min) return g;
  return "E";
}
function readinessForGrade(g) {
  const f = GRADE_THRESHOLDS.find((x) => x[0] === g);
  return f ? f[1] : 80;
}
// Optimistic-but-bounded FORECAST of exam-day readiness if the student keeps
// following the plan. This is the fix for the honest-but-harsh problem: raw
// readiness answers "how ready am I right now" (legitimately low on a blank
// slate), but "predicted grade" and "probability" are forecasts for exam DAY —
// so they must credit the runway still ahead. Far from the exam there's room to
// close most of the gap; as it nears, the forecast converges back to what's
// actually been learned, so the numbers stop flattering and start warning.
function projectedReadiness(readiness, daysAway) {
  if (daysAway == null || daysAway < 0) return readiness;
  const runway = clamp01(daysAway / 45);              // ~full runway 6.5 weeks out
  const headroom = 100 - readiness;
  const recover = headroom * (0.10 + 0.5 * runway);   // closes 10%..60% of the gap
  return Math.round(clamp(readiness, 98, readiness + recover));
}

// Probability of reaching the *target* grade by exam day. Fed the PROJECTED
// (forecast) readiness, so a standing start with weeks to go isn't punished as
// if the exam were today. Centred so sitting exactly at the target forecasts
// ~55%, scaled gently by the gap, floored at 3% (never a demoralising 1%).
function targetProbability(readiness, targetGrade, daysAway) {
  const need = readinessForGrade(targetGrade);
  const gap = readiness - need;
  return clamp(3, 99, Math.round(55 + gap * 0.9));
}
function paceFromReadiness(readiness, targetGrade, daysAway) {
  if (daysAway != null && daysAway < 0) return "exam_passed";
  const need = readinessForGrade(targetGrade);
  const expectedByNow = Math.max(0, need * (1 - (daysAway || 0) / 90));
  const delta = readiness - expectedByNow;
  return delta >= 0 ? "on_track" : delta >= -20 ? "slightly_behind" : "very_behind";
}
function riskFromProbability(p) { return p >= 60 ? "low" : p >= 35 ? "medium" : "high"; }

let _snapArgs = null, _snapCache = null;
function getBrain() {
  const exams = window.getExams ? window.getExams() : [];
  const schedule = window.getSchedule ? window.getSchedule() : { sessions: [] };
  const profile = window.getProfile ? window.getProfile() : {};
  const mistakes = window.getMistakes ? window.getMistakes() : [];
  const masteryMap = getMastery();
  const memory = getMemory();
  const kb = getKnowledgeBase();

  // Cheap identity memo: rebuild only when a store's version/size changed.
  const argSig = JSON.stringify({ v: _v, ex: exams.length, se: schedule.sessions.length, mi: mistakes.length });
  if (_snapArgs === argSig && _snapCache) return _snapCache;

  const todayMs = Date.now();
  const examViews = exams.map((exam) => {
    const topics = enrichExamTopics(exam, masteryMap);
    const readiness = examReadiness(exam, topics);
    const weakest = topics.slice().sort((a, b) => a.retention - b.retention).slice(0, 5);
    const due = topics.filter((t) => t.lastSeen && t.retention < 0.7);
    const seenTopics = topics.filter((t) => t.lastSeen);
    const daysAway = window.daysAway ? window.daysAway(exam.examDate) : null;

    // Canonical derived metrics — the ONLY place these are computed.
    const confidence = seenTopics.length
      ? Math.round((seenTopics.reduce((s, t) => s + t.confidence, 0) / seenTopics.length) * 100)
      : (exam.confidencePct ?? 50);
    const coverage = Math.round((seenTopics.length / Math.max(1, topics.length)) * 100);
    // Predicted grade + probability are forecasts for exam DAY, so they read off
    // the projected (runway-aware) readiness — not the raw "right now" number.
    const projReadiness = projectedReadiness(readiness, daysAway);
    const predictedGrade = gradeFromReadiness(projReadiness);
    const probability = targetProbability(projReadiness, exam.targetGrade, daysAway);
    const risk = riskFromProbability(probability);
    const pace = paceFromReadiness(readiness, exam.targetGrade, daysAway);

    return {
      id: exam.id, name: exam.name, color: exam.color, examBoard: exam.examBoard,
      targetGrade: exam.targetGrade, examDate: exam.examDate, daysAway,
      topics, readiness, projReadiness, confidence, coverage, predictedGrade, probability, risk, pace,
      weakestTopics: weakest, dueTopics: due,
      kb: kb[exam.id] || null,
      hasMaterials: !!(kb[exam.id] && kb[exam.id].chapters && kb[exam.id].chapters.length),
    };
  });

  const active = examViews.filter((e) => e.daysAway == null || e.daysAway >= 0);
  const avg = (arr, f) => (arr.length ? Math.round(arr.reduce((s, e) => s + f(e), 0) / arr.length) : 0);
  const overallReadiness = avg(active, (e) => e.readiness);
  const overallProbability = avg(active, (e) => e.probability);
  const overallConfidence = avg(active, (e) => e.confidence);
  // Overall predicted grade forecasts exam day too — averages the per-exam
  // projected readiness, so it agrees with the per-exam predicted grades.
  const overallPredictedGrade = gradeFromReadiness(avg(active, (e) => e.projReadiness));
  const allDue = examViews.flatMap((e) => e.dueTopics.map((t) => ({ ...t, examName: e.name, examColor: e.color })));
  const allWeak = examViews.flatMap((e) => e.weakestTopics.map((t) => ({ ...t, examName: e.name, examColor: e.color })))
    .sort((a, b) => a.retention - b.retention);

  _snapCache = {
    profile, exams, schedule, mistakes, memory, kb,
    examViews, overallReadiness, overallProbability, overallConfidence, overallPredictedGrade,
    dueReviews: allDue.sort((a, b) => a.retention - b.retention),
    weakestTopics: allWeak.slice(0, 8),
    streak: window.computeStreak ? window.computeStreak() : 0,
    generatedAt: todayMs,
  };
  _snapArgs = argSig;
  return _snapCache;
}

// Drop-in replacement for exams-store's deriveCourses(): returns the SAME
// course shape existing components (CourseCard, CourseDetail, the readiness
// list) already consume, but every number is sourced from the brain. Repointing
// the Dashboard at this — instead of window.deriveCourses — is what makes the
// whole screen speak one language. The legacy deriveCourse formulas are no
// longer read by any pixel once this is wired.
function brainCourses() {
  const b = getBrain();
  return b.examViews.map((e) => ({
    id: e.id, name: e.name, subject: e.name, examBoard: e.examBoard, color: e.color,
    daysAway: e.daysAway, topicCount: e.topics.length,
    completionPct: e.coverage,
    confidencePct: e.confidence,
    readinessPct: e.readiness,
    targetGrade: e.targetGrade,
    predictedGrade: e.predictedGrade,
    gradeProbability: e.probability,
    riskLevel: e.risk,
    paceStatus: e.pace,
    todayCount: 0,
    recommendedSessions: e.dueTopics.length,
    weakTopics: e.weakestTopics.map((t) => t.topicName).slice(0, 5),
    forecastOnTrack: e.predictedGrade,
    forecastMissed: (({ "A*": "A", A: "B", B: "C", C: "D", D: "E", E: "E" })[e.predictedGrade] || e.predictedGrade),
    remainingWork: { sessions: e.dueTopics.length, papers: 0, hours: Math.round(e.dueTopics.length * 0.75 * 10) / 10 },
    // Persisted knowledge base from the student's uploads (null until they add
    // materials) — lets CourseDetail show that an upload produced something real.
    kb: e.kb, hasMaterials: e.hasMaterials,
  }));
}

// ─── the recommendation engine ───────────────────────────────────────────────
// "What should I do RIGHT NOW?" — one answer, chosen across every topic of
// every exam, with the reasons that produced it. This is the intelligence the
// Dashboard hero renders. Nothing here is fabricated: score, retention, days
// and the projected gain are all read from the real learner model.

function recommendNextAction() {
  const b = getBrain();
  if (!b.examViews.length) return { kind: "add_exam" };

  const cands = [];
  b.examViews.forEach((e) => {
    const days = e.daysAway == null ? 999 : e.daysAway;
    if (days < 0) return; // exam already passed
    const proximity = clamp01(1 - days / 120); // sooner exam ⇒ more urgent
    e.topics.forEach((t) => {
      const gap = 1 - t.retention;                                   // room to improve
      const dueBoost = t.lastSeen && t.retention < 0.7 ? 0.25 : 0;   // actively forgetting
      const unseenBoost = !t.lastSeen ? 0.1 : 0;                     // never studied
      const score = gap * (0.6 + 0.4 * proximity) + dueBoost + unseenBoost;
      cands.push({ e, t, days, score });
    });
  });
  if (!cands.length) return { kind: "rest" };
  cands.sort((a, b) => b.score - a.score);

  const { e, t, days } = cands[0];
  const reasons = [];
  if (t.lastSeen && t.retention < 0.7) reasons.push(`Due for review — memory faded to ${Math.round(t.retention * 100)}%`);
  else if (!t.lastSeen) reasons.push(`Biggest untouched gap in ${e.name}`);
  else reasons.push(`Lowest retention in ${e.name} (${Math.round(t.retention * 100)}%)`);
  if (days <= 14) reasons.push(`${e.name} exam in ${days} day${days === 1 ? "" : "s"}`);
  if (e.readiness < 65) reasons.push(`${e.name} is ${e.readiness}% ready vs your ${e.targetGrade} target`);

  const gain = simulateReadinessGain(e.id, t.topicIdx, true);
  const sched = window.getSchedule ? window.getSchedule() : { sessions: [] };
  const match =
    sched.sessions.find((s) => s.status === "pending" && s.examId === e.id && window.topicIndexFromId(s.id) === t.topicIdx) ||
    sched.sessions.find((s) => s.status === "pending" && s.examId === e.id);

  return {
    kind: !t.lastSeen ? "learn" : "review",
    examId: e.id, topicIdx: t.topicIdx, topicName: t.topicName,
    examName: e.name, color: e.color,
    reasons, estMinutes: 45,
    readinessGain: gain, readinessNow: e.readiness,
    readinessProjected: Math.min(100, e.readiness + gain),
    sessionId: match ? match.id : null,
  };
}

// ─── reactivity: one hook, all stores ────────────────────────────────────────

let _v = 0;
const _brainListeners = new Set();
function _bump() { _v++; _brainListeners.forEach((f) => f()); }
function _subscribeInternal(fn) { _brainListeners.add(fn); return () => _brainListeners.delete(fn); }

// A single subscription that fans out to every underlying store. Any write
// anywhere bumps the shared version so useSyncExternalStore re-renders.
function subscribeBrain(reactCb) {
  const onChange = () => { _v++; reactCb(); };
  const unsubs = [
    window.subscribeExams && window.subscribeExams(onChange),
    window.subscribeSchedule && window.subscribeSchedule(onChange),
    window.subscribeProfile && window.subscribeProfile(onChange),
    _subscribeInternal(reactCb), // _bump already incremented _v
  ].filter(Boolean);
  window.addEventListener("storage", onChange);
  return () => { unsubs.forEach((u) => u()); window.removeEventListener("storage", onChange); };
}
function getVersion() { return _v; }

function useBrain() {
  // Version number is the external snapshot; the derived object is rebuilt on
  // render. getBrain() is memoized so this stays cheap.
  React.useSyncExternalStore(subscribeBrain, getVersion, getVersion);
  return getBrain();
}

// ─── bridge the un-reactive stores into the brain ─────────────────────────────
// mistakes-store has no listeners and saveMistakes doesn't notify. Wrap
// logMistake so a wrong answer both (a) lowers that topic's mastery and (b)
// wakes every subscribed screen — without touching the many existing callsites.
(function bridgeMistakes() {
  if (!window.logMistake || window.__brainWrappedMistakes) return;
  window.__brainWrappedMistakes = true;
  const original = window.logMistake;
  window.logMistake = function (entry) {
    original(entry);
    if (entry && entry.examId != null && entry.topicIdx != null) {
      recordReview({ examId: entry.examId, topicIdx: entry.topicIdx, topicName: entry.topic, correct: false });
    } else {
      _bump(); // still wake screens even if we can't attribute the topic
    }
  };
})();

// ─── XP + level (persisted lifetime progress) ────────────────────────────────
// XP used to live only in LessonEngine's local state and evaporated the moment
// the student left the celebration screen. Persisting it here makes it durable
// and readable by any screen via the same reactive path (getBrain surfaces it
// too), so a lesson's XP actually accrues to a lifetime total + level.
const XP_KEY = "brain_xp_v1";
function getXp() { return _read(XP_KEY, 0); }
function addXp(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return getXp();
  const next = getXp() + Math.round(n);
  _write(XP_KEY, next);
  _bump();
  return next;
}
// One satisfying curve, defined once so no two screens disagree on "level":
// level N starts at (N-1)²·100 XP  →  L1@0, L2@100, L3@400, L4@900, L5@1600…
function xpLevel(xp) {
  const x = typeof xp === "number" ? xp : getXp();
  const level = Math.floor(Math.sqrt(Math.max(0, x) / 100)) + 1;
  const curFloor = (level - 1) * (level - 1) * 100;
  const nextFloor = level * level * 100;
  return { level, xp: x, into: x - curFloor, need: nextFloor - curFloor, nextFloor };
}

Object.assign(window, {
  MASTERY_KEY, KB_KEY, MEMORY_KEY, XP_KEY,
  getXp, addXp, xpLevel,
  topicKey, getMastery, applyReview, recordReview, recordConfidence, retention,
  recordQuickCheckResult, getQuickCheckDifficulty,
  markTopicsStudied, coverageForExam, syncCompletionFromCoverage,
  simulateReadinessGain, recommendNextAction, brainCourses,
  gradeFromReadiness, readinessForGrade,
  getKnowledgeBase, getExamKB, saveExamKB,
  getMemory, updateMemory, rememberNote,
  getBrain, useBrain, subscribeBrain,
});
