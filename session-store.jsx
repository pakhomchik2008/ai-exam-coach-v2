// AI Exam Coach — global active-study-session store + overlay renderer.
//
// WHY: the running session used to live in Dashboard's local state, so
// switching to any other tab unmounted the timer and silently lost the
// session. Now the session is app-level state, persisted to localStorage —
// it survives tab switches AND full page reloads, and is always visible
// either fullscreen or as a floating mini-timer. The timer itself is
// derived from a startedAt timestamp, never from an in-memory counter, so
// no remount can reset it.
//
// window.StudyLayer is rendered once by App (index.html) above tab content.
// Dashboard (and anything else) starts a session via window.startStudySession.

const ACTIVE_SESSION_KEY = "active_session_v1";

let _activeCache = undefined; // undefined = not read yet; null = none
const _sessionListeners = new Set();

function _readActive() {
  if (_activeCache !== undefined) return _activeCache;
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    _activeCache = raw ? JSON.parse(raw) : null;
  } catch { _activeCache = null; }
  return _activeCache;
}
function _writeActive(next) {
  _activeCache = next;
  try {
    if (next) localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {}
  _sessionListeners.forEach((fn) => fn());
}

function getActiveSession() { return _readActive(); }
function subscribeActiveSession(fn) { _sessionListeners.add(fn); return () => _sessionListeners.delete(fn); }

function startStudySession(session) {
  _writeActive({ session, startedAt: Date.now(), minimized: false });
}
function setSessionMinimized(min) {
  const cur = _readActive();
  if (cur) _writeActive({ ...cur, minimized: !!min });
}
function endStudySession() { _writeActive(null); }

// ─── Session completion → recap data (moved verbatim from Dashboard.jsx,
//     which can no longer own it since it may be unmounted when the user
//     finishes a session from another tab) ────────────────────────────────
const XP_BASE = { 1: 5, 2: 10, 3: 20, 4: 30 };

function _findNextPendingSession() {
  const { sessionsByDay } = window.buildScheduleData();
  const start = new Date();
  for (let i = 1; i <= 30; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i);
    const items = sessionsByDay[window.fmtDateKey(d)] || [];
    const pending = items.find((it) => it.status !== "completed");
    if (pending) return { ...pending, date: d };
  }
  return null;
}

function buildRecapFromSession(s, { rating, seconds, quizCorrect, quizTotal, chatMessages }) {
  const examId = s.examId || (typeof s.id === "string" && s.id.includes("::") ? s.id.split("::")[1] : null);
  const exam = examId && window.getExams ? window.getExams().find((e) => e.id === examId) : null;
  let sessionTopicIdx = window.topicIndexFromId ? window.topicIndexFromId(s.id) : -1;
  if (sessionTopicIdx < 0 && exam && Array.isArray(exam.topics)) {
    const i = exam.topics.indexOf(s.topic);
    if (i >= 0) sessionTopicIdx = i;
  }
  const topicCount = exam ? Math.max(1, exam.topicCount || (exam.topics ? exam.topics.length : 10)) : 0;
  const topics = Array.from({ length: topicCount }, (_, i) => ({
    idx: i,
    name: (exam && exam.topics && exam.topics[i]) || (i === sessionTopicIdx ? s.topic : `Topic ${i + 1}`),
  }));

  if (window.recordCompletedSession) {
    window.recordCompletedSession({ id: s.id, examId, topic: s.topic, durationSec: seconds || 0 });
  }

  const beforeCourse = window.brainCourses().find((c) => c.name === s.subject);
  const gradeBefore = beforeCourse ? beforeCourse.gradeProbability : 0;
  const readinessBefore = beforeCourse ? beforeCourse.readinessPct : 0;
  const achievementsBefore = window.computeAchievements ? window.computeAchievements() : [];
  const streakBefore = window.computeStreak ? window.computeStreak() : 0;

  const commitCoverage = (selectedIdxs) => {
    if (examId && selectedIdxs.length && window.markTopicsStudied) {
      window.markTopicsStudied(examId, selectedIdxs, selectedIdxs.map((i) => topics[i] && topics[i].name));
    }
    if (examId && sessionTopicIdx >= 0 && window.recordConfidence) {
      window.recordConfidence({ examId, topicIdx: sessionTopicIdx, topicName: s.topic, rating });
    }
    const afterCourse = window.brainCourses().find((c) => c.name === s.subject);
    const achievementsAfter = window.computeAchievements ? window.computeAchievements() : [];
    const streakAfter = window.computeStreak ? window.computeStreak() : streakBefore;
    return {
      gradeDelta: (afterCourse ? afterCourse.gradeProbability : gradeBefore) - gradeBefore,
      readinessBefore,
      readinessAfter: afterCourse ? afterCourse.readinessPct : readinessBefore,
      streakBefore, streakAfter,
      coveragePct: afterCourse ? afterCourse.readinessPct : 0,
      newAchievements: achievementsAfter.filter((a) =>
        a.unlocked && !(achievementsBefore.find((b) => b.id === a.id) || {}).unlocked),
      xp: (XP_BASE[rating] ?? 10) + (quizCorrect || 0) * 5 + selectedIdxs.length * 3,
    };
  };

  return {
    examId,
    subject: s.subject,
    topic: s.topic,
    color: s.color,
    seconds: seconds || 0,
    quizCorrect: quizCorrect || 0,
    quizTotal: quizTotal || 0,
    topics,
    sessionTopicIdx,
    commitCoverage,
    nextFocus: _findNextPendingSession(),
    chatMessages: chatMessages || [],
  };
}

// ─── Floating mini-timer (session minimized) ──────────────────────────────
function FloatingTimer({ active, t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
  const [, tick] = React.useReducer((n) => n + 1, 0);
  React.useEffect(() => {
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);
  const secs = Math.max(0, Math.floor((Date.now() - active.startedAt) / 1000));
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return (
    <button onClick={() => setSessionMinimized(false)}
      title={L("Return to your study session", "Повернутися до сесії", "Вернуться к сессии", "Revenir à la séance", "Zur Sitzung zurückkehren")}
      style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 300,
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 18px 12px 14px", border: "none", cursor: "pointer",
        borderRadius: "var(--radius-full)", background: "var(--ink-900)", color: "#fff",
        boxShadow: "var(--shadow-lg)", fontFamily: "var(--font-sans)",
        animation: "fadeUp 0.25s var(--ease-out)",
      }}>
      <span aria-hidden="true" style={{ position: "relative", width: 10, height: 10 }}>
        <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--emerald-500)" }} />
        <span style={{ position: "absolute", inset: -3, borderRadius: "50%", border: "2px solid rgba(22,160,110,0.5)", animation: "pulse 2s ease-in-out infinite" }} />
      </span>
      <span style={{ textAlign: "left" }}>
        <span style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-on-ink-muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {active.session.topic || active.session.subject}
        </span>
        <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: "var(--weight-bold)", lineHeight: 1.2 }}>{mm}:{ss}</span>
      </span>
      <span aria-hidden="true" style={{ fontSize: 14, color: "var(--text-on-ink-muted)" }}>⤢</span>
    </button>
  );
}

// ─── The one overlay App renders above tab content ────────────────────────
function StudyLayer({ t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
  const [, force] = React.useReducer((n) => n + 1, 0);
  React.useEffect(() => subscribeActiveSession(force), []);
  const [recap, setRecap] = React.useState(null);

  const active = getActiveSession();

  const handleDone = (result) => {
    const cur = getActiveSession();
    if (!cur) return;
    const data = buildRecapFromSession(cur.session, result);
    endStudySession();
    setRecap(data);
  };

  if (recap) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "var(--surface-page)", overflowY: "auto" }}>
        <div style={{ maxWidth: "var(--container-read)", margin: "0 auto", padding: "var(--space-8) var(--space-4)" }}>
          <window.SessionRecap data={recap} onClose={() => setRecap(null)} t={t} />
        </div>
      </div>
    );
  }

  if (!active) return null;
  if (active.minimized) return <FloatingTimer active={active} t={t} />;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "var(--surface-page)", overflowY: "auto" }}>
      <div style={{ maxWidth: "var(--container-read)", margin: "0 auto", padding: "var(--space-6) var(--space-4) var(--space-8)" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "var(--space-2)" }}>
          <button onClick={() => setSessionMinimized(true)} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            border: "1px solid var(--border-default)", background: "var(--surface-card)",
            color: "var(--text-body)", borderRadius: "var(--radius-full)", padding: "8px 16px",
            fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", cursor: "pointer",
            fontFamily: "var(--font-sans)", boxShadow: "var(--shadow-sm)",
          }}>
            ⌄ {L("Minimize — keep studying in background", "Згорнути — сесія триває", "Свернуть — сессия продолжается", "Réduire — la séance continue", "Minimieren — Sitzung läuft weiter")}
          </button>
        </div>
        <window.StudySession
          session={active.session}
          startedAt={active.startedAt}
          onDone={handleDone}
          onCancel={endStudySession}
          t={t}
        />
      </div>
    </div>
  );
}

Object.assign(window, {
  ACTIVE_SESSION_KEY,
  getActiveSession, subscribeActiveSession,
  startStudySession, setSessionMinimized, endStudySession,
  StudyLayer,
});
