// AI Exam Coach — persisted log of real quiz mistakes, plus the derived
// analytics MistakeJournal.jsx's dashboard runs on. Entries only ever come
// from an actual wrong answer a user actually picked in an AI-generated
// quiz (StudyHub.jsx, AIChat.jsx, StudySession.jsx) — never fabricated, so
// an empty list means "no mistakes yet," not "feature not wired up." Same
// rule for every derived stat below: each one is computed from real logged
// attempts, never a placeholder number.
const MISTAKES_KEY = "mistakes_v1";
const REVIEW_LOG_KEY = "mistake_review_log_v1";
const DAY_MS = 86400000;

// ─── schema ─────────────────────────────────────────────────────────────────

function migrateMistake(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.id !== "string" || !raw.id) return null;
  if (typeof raw.question !== "string" || !raw.question) return null;
  const recovered = raw.status === "recovered";
  return {
    id: raw.id,
    topic: typeof raw.topic === "string" && raw.topic ? raw.topic : "General",
    question: raw.question,
    options: Array.isArray(raw.options) ? raw.options : [],
    correctIndex: typeof raw.correctIndex === "number" ? raw.correctIndex : 0,
    selectedIndex: typeof raw.selectedIndex === "number" ? raw.selectedIndex : null,
    explanation: typeof raw.explanation === "string" ? raw.explanation : "",
    // Optional linkage to the brain's topic model — enables clustering mistakes
    // by exam/topic and tying them to mastery. Absent for legacy entries.
    examId: raw.examId != null ? raw.examId : null,
    topicIdx: typeof raw.topicIdx === "number" ? raw.topicIdx : null,
    at: typeof raw.at === "number" ? raw.at : Date.now(),
    // "pending" (still needs review) or "recovered" (got it right on a retry).
    // Nothing else marks a mistake recovered — never set from a bulk action,
    // so this stays an honest signal of actual understanding, not busywork.
    status: recovered ? "recovered" : "pending",
    recoveredAt: recovered && typeof raw.recoveredAt === "number" ? raw.recoveredAt : null,
    // How many times a retry came back wrong again — the basis for "repeated
    // mistake" warnings. Starts at 1 (the original wrong answer counts).
    wrongCount: typeof raw.wrongCount === "number" && raw.wrongCount >= 1 ? Math.round(raw.wrongCount) : 1,
    retryCount: typeof raw.retryCount === "number" && raw.retryCount >= 0 ? Math.round(raw.retryCount) : 0,
    // Spaced-repetition due date (ms) — when this should resurface in the
    // review queue. Defaults to the day after it was first logged.
    nextReviewAt: typeof raw.nextReviewAt === "number" ? raw.nextReviewAt : (typeof raw.at === "number" ? raw.at : Date.now()) + DAY_MS,
    // Self-reported 1-5, set after a correct retry via the confidence slider.
    confidence: typeof raw.confidence === "number" && raw.confidence >= 1 && raw.confidence <= 5 ? Math.round(raw.confidence) : null,
  };
}

function getMistakes() {
  let raw;
  try { raw = JSON.parse(localStorage.getItem(MISTAKES_KEY)) || []; } catch { raw = []; }
  return Array.isArray(raw) ? raw.map(migrateMistake).filter(Boolean) : [];
}
function saveMistakes(list) {
  try { localStorage.setItem(MISTAKES_KEY, JSON.stringify(list)); } catch {}
}

function logMistake({ topic, question, options, correctIndex, selectedIndex, explanation, examId, topicIdx }) {
  const list = getMistakes();
  const entry = migrateMistake({
    id: "m" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    topic, question, options, correctIndex, selectedIndex, explanation,
    examId, topicIdx, at: Date.now(),
  });
  if (!entry) return;
  list.unshift(entry);
  saveMistakes(list.slice(0, 200));
}
function clearMistake(id) {
  saveMistakes(getMistakes().filter((m) => m.id !== id));
}
function clearAllMistakes() {
  saveMistakes([]);
}

// ─── retry / recovery ───────────────────────────────────────────────────────
// The one write path for "the student tried this again." A correct retry is
// the only thing that can ever set status:"recovered" — there is no bulk
// "mark reviewed" that fakes mastery; see snoozeOverdueMistakes() below for
// the honest version of that ("I looked at these, stop nagging today") which
// only pushes the review date, never the recovered flag.
function recordMistakeRetry(id, { correct, confidence } = {}) {
  const list = getMistakes();
  const idx = list.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  const m = list[idx];
  const updated = { ...m, retryCount: m.retryCount + 1 };
  if (correct) {
    updated.status = "recovered";
    updated.recoveredAt = Date.now();
    if (typeof confidence === "number") updated.confidence = Math.max(1, Math.min(5, Math.round(confidence)));
    if (window.addXp) window.addXp(10); // same XP system AIChat's quiz/lesson flows already award from
  } else {
    updated.wrongCount = m.wrongCount + 1;
    updated.nextReviewAt = Date.now() + DAY_MS; // still shaky — resurface tomorrow, not further out
  }
  list[idx] = updated;
  saveMistakes(list);
  _logReviewActivity();
  return updated;
}

// Honest version of "mark all reviewed": snoozes every overdue pending
// mistake to tomorrow instead of lying about recovery. Useful when the pile
// got stale and the student wants a clean slate to work from today.
function snoozeOverdueMistakes() {
  const todayKey = window.fmtDateKey(new Date());
  const list = getMistakes();
  const tomorrow = Date.now() + DAY_MS;
  let changed = 0;
  const next = list.map((m) => {
    if (m.status === "recovered") return m;
    if (window.fmtDateKey(new Date(m.nextReviewAt)) >= todayKey) return m;
    changed++;
    return { ...m, nextReviewAt: tomorrow };
  });
  if (changed) saveMistakes(next);
  return changed;
}

// ─── review-activity streak ─────────────────────────────────────────────────
// Separate from computeStreak() (progress-metrics.jsx, which tracks STUDY
// SESSION days) — this tracks days the student actually retried a mistake,
// a different real signal worth its own streak.
function _logReviewActivity() {
  let days;
  try { days = JSON.parse(localStorage.getItem(REVIEW_LOG_KEY)) || []; } catch { days = []; }
  const today = window.fmtDateKey(new Date());
  if (!days.includes(today)) days.push(today);
  try { localStorage.setItem(REVIEW_LOG_KEY, JSON.stringify(days.slice(-400))); } catch {}
}
function computeMistakeReviewStreak() {
  let days;
  try { days = new Set(JSON.parse(localStorage.getItem(REVIEW_LOG_KEY)) || []); } catch { days = new Set(); }
  if (!days.size) return 0;
  let cursor = new Date();
  if (!days.has(window.fmtDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(window.fmtDateKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}

// ─── derived analytics (all pure, all real) ────────────────────────────────

// Buckets pending mistakes by local-date comparison — same fmtDateKey
// string-compare approach used everywhere else in this app (schedule-store,
// progress-metrics), which sidesteps the classic ms-based DST/timezone traps.
function computeReviewQueue() {
  const todayKey = window.fmtDateKey(new Date());
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = window.fmtDateKey(tomorrow);
  const pending = getMistakes().filter((m) => m.status !== "recovered");
  const keyOf = (m) => window.fmtDateKey(new Date(m.nextReviewAt));
  return {
    overdue: pending.filter((m) => keyOf(m) < todayKey),
    dueToday: pending.filter((m) => keyOf(m) === todayKey),
    dueTomorrow: pending.filter((m) => keyOf(m) === tomorrowKey),
    later: pending.filter((m) => keyOf(m) > tomorrowKey),
  };
}

function computeAvgRecoveryMs() {
  const recovered = getMistakes().filter((m) => m.status === "recovered" && m.recoveredAt);
  if (!recovered.length) return null;
  return recovered.reduce((s, m) => s + (m.recoveredAt - m.at), 0) / recovered.length;
}

function computeMistakeSummary() {
  const list = getMistakes();
  const pending = list.filter((m) => m.status !== "recovered");
  const recovered = list.filter((m) => m.status === "recovered");
  const { overdue, dueToday } = computeReviewQueue();
  return {
    total: list.length,
    pendingCount: pending.length,
    recoveredCount: recovered.length,
    // "Recovery rate," not "accuracy" — this app has no record of every
    // question ever answered correctly, only the ones logged as wrong, so
    // the only honest percentage here is "of your logged mistakes, how many
    // have you since fixed."
    recoveryRate: list.length ? Math.round((recovered.length / list.length) * 100) : null,
    overdueCount: overdue.length,
    dueTodayCount: dueToday.length,
    avgRecoveryMs: computeAvgRecoveryMs(),
    streak: computeMistakeReviewStreak(),
  };
}

// Groups by topic NAME (a plain string every mistake always has, unlike
// examId/topicIdx which are only populated when the quiz that logged the
// mistake resolved a real exam/topic link) — see mistakes-store.jsx's
// migrateMistake for why examId is frequently null in practice.
function computeTopicBreakdown() {
  const list = getMistakes();
  const byTopic = {};
  list.forEach((m) => {
    const key = m.topic || "General";
    if (!byTopic[key]) byTopic[key] = { topic: key, mistakes: 0, recovered: 0, examId: m.examId, topicIdx: m.topicIdx };
    byTopic[key].mistakes++;
    if (m.status === "recovered") byTopic[key].recovered++;
  });
  return Object.values(byTopic)
    .map((t) => {
      const masteryPct = Math.round((t.recovered / t.mistakes) * 100);
      const pendingHere = t.mistakes - t.recovered;
      const priority = pendingHere >= 6 || masteryPct < 50 ? "high" : pendingHere >= 2 || masteryPct < 75 ? "medium" : "low";
      // ~90s/pending mistake is a rough, transparent estimate — not a
      // measured time (this app doesn't time retries), just enough to give
      // the student a sense of scale, labeled as an estimate everywhere it's shown.
      const estReviewMin = Math.max(1, Math.round(pendingHere * 1.5));
      return { ...t, masteryPct, pendingHere, priority, estReviewMin };
    })
    .sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 };
      return rank[a.priority] - rank[b.priority] || b.mistakes - a.mistakes;
    });
}

// Last N Mon-Sun weeks of "mistakes made" vs "mistakes recovered," for the
// trends sparkline. Weeks with zero of either are real zeros, not gaps.
function computeMistakeTrends(weeks) {
  const n = weeks || 6;
  const list = getMistakes();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monday = new Date(today); monday.setDate(monday.getDate() - ((today.getDay() + 6) % 7));
  const buckets = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(monday); start.setDate(start.getDate() - i * 7);
    const end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999);
    const made = list.filter((m) => m.at >= start.getTime() && m.at <= end.getTime()).length;
    const fixed = list.filter((m) => m.recoveredAt && m.recoveredAt >= start.getTime() && m.recoveredAt <= end.getTime()).length;
    buckets.push({ weekStart: window.fmtDateKey(start), made, fixed });
  }
  return buckets;
}

// Live-computed, not persisted "unlocked" flags — same principle as
// progress-metrics.jsx's computeAchievements(): recomputed from real data on
// every read, so a badge can never be stale or fake.
function computeMistakeBadges() {
  const summary = computeMistakeSummary();
  const topics = computeTopicBreakdown();
  const masterTopic = topics.find((t) => t.masteryPct >= 90 && t.mistakes >= 3);
  return [
    { id: "fixed10", emoji: "🏅", label: "10 Mistakes Fixed", unlocked: summary.recoveredCount >= 10 },
    { id: "streak7", emoji: "🔥", label: "7-Day Review Streak", unlocked: summary.streak >= 7 },
    { id: "no-overdue", emoji: "✅", label: "No Overdue Reviews", unlocked: summary.pendingCount > 0 && summary.overdueCount === 0 },
    { id: "master", emoji: "👑", label: masterTopic ? `Master of ${masterTopic.topic}` : "Master of a Topic", unlocked: !!masterTopic },
  ];
}

Object.assign(window, {
  MISTAKES_KEY, getMistakes, logMistake, clearMistake, clearAllMistakes, migrateMistake,
  recordMistakeRetry, snoozeOverdueMistakes,
  computeReviewQueue, computeMistakeSummary, computeTopicBreakdown, computeMistakeTrends,
  computeMistakeBadges, computeMistakeReviewStreak,
});
