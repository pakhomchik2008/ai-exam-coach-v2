// Examik — Today is one CTA from recommendNextAction.
// Widgets (stats, week strip, plan slab, adapt toast) are not the loop.

import { EmptyState, PageHeader, PrimaryButton } from "../../components/PageHeader";

function Dashboard({ onGoToExams, onGoToLearn, t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t.code] || en);
  const today = new Date().toLocaleDateString(
    t.code === "uk" ? "uk-UA" : t.code === "ru" ? "ru-RU" : t.code === "fr" ? "fr-FR" : t.code === "de" ? "de-DE" : "en-GB",
    { weekday: "long", day: "numeric", month: "long" },
  );

  const [missionSession, setMissionSession] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const brain = window.useBrain();
  const rec = React.useMemo(
    () => (window.recommendNextAction ? window.recommendNextAction() : null),
    [brain],
  );
  const courses = React.useMemo(() => window.brainCourses(), [brain]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };
  const startSession = (s) => { setMissionSession(null); window.startStudySession(s); };

  const startRecommended = () => {
    if (!rec) return;
    if (rec.kind === "add_exam") { onGoToExams && onGoToExams(); return; }
    if (onGoToLearn && rec.examId && rec.topicName) {
      onGoToLearn({ examId: rec.examId, examName: rec.examName, topicName: rec.topicName, kind: rec.kind });
      return;
    }
    const schedData = window.getSchedule ? window.getSchedule() : {};
    const sched = Array.isArray(schedData) ? schedData : (schedData.sessions || []);
    const matched = rec.sessionId && sched.find((s) => s.id === rec.sessionId);
    if (matched) { setMissionSession(matched); return; }
    setMissionSession({
      id: rec.sessionId || `rec::${rec.examId}::${rec.topicIdx}`,
      examId: rec.examId,
      subject: rec.examName,
      topic: rec.topicName,
      color: rec.color || "var(--chrome-ink)",
      difficulty: 2,
      review: 1,
      est: rec.estMinutes || 45,
    });
  };

  if (missionSession) {
    const course = courses.find((c) => c.name === missionSession.subject) || null;
    return (
      <window.TodaysMission
        session={missionSession}
        course={course}
        t={t}
        onBegin={() => startSession(missionSession)}
        onSkip={() => { setMissionSession(null); showToast(L("Skipped", "Пропущено", "Пропущено", "Passé", "Übersprungen")); }}
      />
    );
  }

  if (!rec || rec.kind === "add_exam") {
    return (
      <EmptyState
        title={t.nav_today}
        body={L(
          "Add an exam — More → Exams. Start shows up here after that.",
          "Додай іспит — Ще → Іспити. Потім тут з’явиться Start.",
          "Добавь экзамен — Ещё → Экзамены. Потом здесь появится Start.",
          "Ajoute un examen — Plus → Examens. Start apparaît ensuite ici.",
          "Prüfung hinzufügen — Mehr → Prüfungen. Danach steht Start hier.",
        )}
        actionLabel={L("Add an exam", "Додати іспит", "Добавить экзамен", "Ajouter un examen", "Prüfung hinzufügen")}
        onAction={() => onGoToExams && onGoToExams()}
      />
    );
  }

  if (rec.kind === "rest") {
    return (
      <EmptyState
        title={t.nav_today}
        body={L(
          "Nothing due. The next miss lands on the calendar.",
          "Нічого на сьогодні. Наступний промах ляже в календар.",
          "Нечего на сегодня. Следующий промах ляжет в календарь.",
          "Rien aujourd'hui. La prochaine erreur ira au calendrier.",
          "Nichts fällig. Der nächste Fehler landet im Kalender.",
        )}
      />
    );
  }

  const days = rec.daysAway;
  const dayLine = days == null
    ? rec.examName
    : days === 0
      ? L(`${rec.examName} · today`, `${rec.examName} · сьогодні`, `${rec.examName} · сегодня`, `${rec.examName} · aujourd'hui`, `${rec.examName} · heute`)
      : days === 1
        ? L(`${rec.examName} · tomorrow`, `${rec.examName} · завтра`, `${rec.examName} · завтра`, `${rec.examName} · demain`, `${rec.examName} · morgen`)
        : L(`${rec.examName} · ${days} days`, `${rec.examName} · ${days} дн.`, `${rec.examName} · ${days} дн.`, `${rec.examName} · ${days} j`, `${rec.examName} · ${days} T.`);
  const why = rec.kind === "learn"
    ? L("Not opened yet.", "Ще не відкрито.", "Ещё не открыто.", "Pas encore ouvert.", "Noch nicht geöffnet.")
    : L("This miss comes back.", "Цей промах повертається.", "Этот промах возвращается.", "Cette erreur revient.", "Dieser Fehler kommt zurück.");

  return (
    <div>
      <PageHeader
        title={t.nav_today}
        kicker={today}
        action={<PrimaryButton onClick={startRecommended}>{L("Start", "Почати", "Начать", "Commencer", "Starten")}</PrimaryButton>}
      />
      <p className="app-page-kicker" style={{ margin: "0 0 6px" }}>{dayLine}</p>
      <h2 className="app-page-title" style={{ fontSize: "var(--text-xl)", margin: "0 0 8px" }}>{rec.topicName}</h2>
      <p className="app-empty-body">{why}</p>
      {toast && (
        <div role="status" style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 40,
          background: "var(--chrome-ink)", color: "var(--chrome-paper)",
          borderRadius: 14, padding: "12px 16px", fontSize: "var(--text-sm)",
        }}>{toast}</div>
      )}
    </div>
  );
}

window.Dashboard = Dashboard;
export {};
