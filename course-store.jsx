// AI Exam Coach — Course: the new central entity.
//
// A Course holds the syllabus (topics/subtopics/learning objectives), the
// extracted Knowledge Base (chapters/facts/formulas/glossary), and shared
// progress (per-topic mastery) for every Exam that references it via
// exam.courseId. Multiple exams (midterm, final, resit, mock) can point at
// the same course and share this one progress model — no duplicated data.
//
// This file also gives brain-store.jsx (mastery/KB storage) the primitives
// it needs to redirect course-backed exams to Course storage while leaving
// legacy (no-courseId) exams completely untouched — see brain-store.jsx's
// getMastery/recordReview/getExamKB/saveExamKB for the adapter itself.
//
// Must load AFTER exams-store.jsx (topic-count fallback reads window.getExams)
// and BEFORE brain-store.jsx (which calls into this file's exports).

const COURSES_KEY = "courses_v1";

function _readCourses() {
  try {
    const raw = JSON.parse(localStorage.getItem(COURSES_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}
function _writeCourses(list) {
  try { localStorage.setItem(COURSES_KEY, JSON.stringify(list)); } catch {}
}

function _clampInt(v, min, max, fallback) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}
function _uid(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function migrateTopic(raw, i) {
  const r = raw && typeof raw === "object" ? raw : { name: String(raw || `Topic ${i + 1}`) };
  return {
    id: typeof r.id === "string" && r.id ? r.id : _uid("t_"),
    name: typeof r.name === "string" && r.name.trim() ? r.name.trim() : `Topic ${i + 1}`,
    difficulty: _clampInt(r.difficulty, 1, 10, 5),
    importance: _clampInt(r.importance, 1, 10, 5),
    subtopics: Array.isArray(r.subtopics)
      ? r.subtopics.map((s, j) => (typeof s === "object" && s
          ? { id: s.id || _uid("st_"), name: s.name || "" }
          : { id: _uid("st_"), name: String(s || "") })).filter((s) => s.name)
      : [],
    learningObjectives: Array.isArray(r.learningObjectives)
      ? r.learningObjectives.map((o, j) => (typeof o === "object" && o
          ? { id: o.id || _uid("lo_"), text: o.text || "" }
          : { id: _uid("lo_"), text: String(o || "") })).filter((o) => o.text)
      : [],
    resources: Array.isArray(r.resources) ? r.resources : [], // schema-ready, unpopulated by design
  };
}

function migrateCourse(raw) {
  const r = raw || {};
  const kb = r.knowledgeBase && typeof r.knowledgeBase === "object" ? r.knowledgeBase : {};
  return {
    id: r.id,
    title: typeof r.title === "string" && r.title.trim() ? r.title.trim() : (r.subject || "Untitled course"),
    subject: typeof r.subject === "string" && r.subject.trim() ? r.subject.trim() : (r.title || ""),
    curriculumRef: r.curriculumRef && typeof r.curriculumRef === "object" ? r.curriculumRef : null,
    topics: Array.isArray(r.topics) ? r.topics.map(migrateTopic) : [],
    knowledgeBase: {
      status: ["empty", "extracting", "ready", "not_study_material"].includes(kb.status) ? kb.status : "empty",
      chapters: Array.isArray(kb.chapters) ? kb.chapters : [],
      glossary: Array.isArray(kb.glossary) ? kb.glossary : [],
      sourceFiles: Array.isArray(kb.sourceFiles) ? kb.sourceFiles : [],
      extractedAt: kb.extractedAt || null,
      updatedAt: kb.updatedAt || null,
    },
    progress: {
      topicMastery: r.progress && r.progress.topicMastery && typeof r.progress.topicMastery === "object"
        ? r.progress.topicMastery : {},
    },
    source: r.source === "ai" ? "ai" : "official",
    verifiedByUser: !!r.verifiedByUser,
    createdAt: r.createdAt || new Date().toISOString(),
    updatedAt: r.updatedAt || new Date().toISOString(),
    _v: 1,
  };
}

function getCourses() { return _readCourses().map(migrateCourse); }
function getCourse(courseId) { return courseId ? (getCourses().find((c) => c.id === courseId) || null) : null; }

function saveCourses(list) {
  const migrated = (list || []).map(migrateCourse);
  _writeCourses(migrated);
  _notifyCourses();
  return migrated;
}

// Creates a new Course from a draft ({title, subject, curriculumRef, topics,
// knowledgeBase?, source, verifiedByUser}) and persists it. Returns the full
// migrated Course (with stable topic ids assigned).
function createCourse(draft) {
  const course = migrateCourse({ ...draft, id: _uid("course_"), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  saveCourses([...getCourses(), course]);
  return getCourse(course.id);
}

function saveCourse(courseId, patch) {
  const all = getCourses();
  const idx = all.findIndex((c) => c.id === courseId);
  if (idx < 0) return null;
  const merged = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
  const list = all.slice();
  list[idx] = merged;
  saveCourses(list);
  return getCourse(courseId);
}

// ─── per-topic mastery bridging (used by brain-store.jsx's adapter) ─────────
// Course.progress.topicMastery is keyed by the STABLE topic.id, not array
// index — this is the actual fix for index-based fragility, scoped to new
// course-backed exams only (see plan §3/§8).

function blankCourseTopicMastery() {
  return {
    mastery: 0, confidence: 0, reps: 0, ease: 2.5, intervalDays: 0, stability: 1,
    lastSeen: null, dueDate: null, history: [], quickCheckStreak: 0, quickCheckDifficulty: 1,
  };
}
function getCourseTopicMastery(courseId, topicId) {
  const c = getCourse(courseId);
  if (!c || !topicId) return null;
  return c.progress.topicMastery[topicId] || null;
}
function saveCourseTopicMastery(courseId, topicId, topicMasteryObj) {
  const c = getCourse(courseId);
  if (!c || !topicId) return null;
  const nextMastery = { ...c.progress.topicMastery, [topicId]: topicMasteryObj };
  saveCourse(courseId, { progress: { topicMastery: nextMastery } });
  return topicMasteryObj;
}

// ─── reactivity — same subscribe/notify pattern as exams-store.jsx ──────────
const _listeners = new Set();
function subscribeCourses(fn) { _listeners.add(fn); return () => _listeners.delete(fn); }
function _notifyCourses() { _listeners.forEach((fn) => fn()); }

Object.assign(window, {
  COURSES_KEY,
  getCourses, getCourse, saveCourses, createCourse, saveCourse, subscribeCourses,
  blankCourseTopicMastery, getCourseTopicMastery, saveCourseTopicMastery,
});
