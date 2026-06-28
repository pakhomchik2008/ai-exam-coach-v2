// AI Exam Coach — Dashboard: AI-advisor view (readiness, predicted/target, impact task)
function Dashboard({ onOpenCourse, onGoToChat, onGoToExams, onGoToSchedule, t }) {
  const { StreakBanner, SessionCard, CourseCard, WeekStrip, GaugeRing, Button, ProgressBar } = window.AIExamCoachDesignSystem_99e467;
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t.code] || en);
  const today = new Date().toLocaleDateString(t.code === "uk" ? "uk-UA" : t.code === "ru" ? "ru-RU" : t.code === "fr" ? "fr-FR" : t.code === "de" ? "de-DE" : "en-GB", { weekday: "long", day: "numeric", month: "long" });

  const [courses, setCourses] = React.useState(() => window.deriveCourses(window.getExams()));
  const [todaySessions, setTodaySessions] = React.useState(() => {
    const { sessionsByDay } = window.buildScheduleData();
    const todays = sessionsByDay[window.fmtDateKey(new Date())] || [];
    return todays.map((s) => ({ id: s.id, subject: s.subject, color: s.color, topic: s.topic, difficulty: 2, review: 1, est: 30 }));
  });
  const [weakness, setWeakness] = React.useState(() => (window.WEAKNESS_ALERTS || [])[0] || null);
  const [detail, setDetail] = React.useState(null);
  const [dayDetail, setDayDetail] = React.useState(null);
  const [activeSession, setActiveSession] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const openCourse = (course, focus) => setDetail({ course, focus });
  const saveCourse = (updated) => {
    // Only confidencePct/targetGrade are genuine exam-record fields — persist
    // those back through the shared store so they survive a tab switch and
    // propagate to Schedule/Progress/AIChat. gradeProbability/readinessPct/
    // riskLevel stay derived-only (never written back) so they can't drift
    // from deriveCourse()'s formula.
    const next = window.getExams().map((e) => e.id === updated.id
      ? { ...e, confidencePct: updated.confidencePct, targetGrade: updated.targetGrade }
      : e);
    window.saveExams(next);
    setCourses(window.deriveCourses(next));
  };
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };
  const startSession = (s) => setActiveSession(s);

  const RATING_BUMP = { 1: -1, 2: 1, 3: 2, 4: 4 }; // Blackout, Hard, Good, Easy → confidence delta
  const RATING_RETENTION = { 1: -5, 2: 5, 3: 12, 4: 20 };
  const handleSessionDone = (rating) => {
    const s = activeSession;
    if (s) {
      if (window.markSessionCompleted) window.markSessionCompleted(s.id, true);
      setTodaySessions((ts) => ts.map((row) => row.id === s.id
        ? { ...row, lastReviewed: "Just now", retention: Math.max(0, Math.min(100, (row.retention || 50) + (RATING_RETENTION[rating] ?? 10))) }
        : row));
      // Persist the rating as a real confidencePct change on the exam record
      // (not just local state) — readinessPct/gradeProbability are pure
      // functions of confidencePct in deriveCourse(), so this is what makes
      // "adapts to how well you know each topic" actually true instead of a
      // bump that vanishes the next time this screen mounts.
      const exams = window.getExams();
      const matched = exams.find((e) => e.name === s.subject);
      if (matched) {
        const nextConfidence = Math.max(0, Math.min(100, (matched.confidencePct ?? 50) + (RATING_BUMP[rating] ?? 2)));
        window.saveExams(exams.map((e) => e.id === matched.id ? { ...e, confidencePct: nextConfidence } : e));
      }
      setCourses(window.deriveCourses(window.getExams()));
      if (weakness && weakness.sessionRef && weakness.sessionRef.id === s.id) setWeakness(null);
      showToast("Session saved — readiness updated ✓");
    }
    setActiveSession(null);
  };
  if (activeSession) {
    return <window.StudySession session={activeSession} onDone={handleSessionDone} onCancel={() => setActiveSession(null)} t={t} />;
  }

  // Overdue exams stay manageable in the Exams tab's "Past" section, but
  // shouldn't render here — CourseCard has no overdue styling and a negative
  // daysAway would just show as "-3 days".
  const activeCourses = courses.filter((c) => c.daysAway >= 0);
  const hasCourses = activeCourses.length > 0;
  const overall = hasCourses ? Math.round(activeCourses.reduce((a, c) => a + c.readinessPct, 0) / activeCourses.length) : 0;
  const onTrack = activeCourses.filter((c) => c.gradeProbability >= 55).length;
  // highest-impact = lowest probability course (biggest grade lever)
  const focus = hasCourses ? activeCourses.reduce((a, b) => (b.gradeProbability < a.gradeProbability ? b : a), activeCourses[0]) : null;
  const focusSession = hasCourses ? (todaySessions.find((s) => s.subject === focus.name) || todaySessions[0] || null) : null;

  // Hero never depends solely on "today" having a session: if nothing's
  // scheduled today, look ahead for the next one; if nothing's scheduled at
  // all, fall back to the nearest exam. Dashboard should never look empty
  // once an exam exists.
  let nextSession = null;
  if (hasCourses && !focusSession) {
    const { sessionsByDay } = window.buildScheduleData();
    const start = new Date();
    for (let i = 1; i <= 30 && !nextSession; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i);
      const items = sessionsByDay[window.fmtDateKey(d)] || [];
      const pending = items.find((it) => it.status !== "completed");
      if (pending) nextSession = { ...pending, date: d };
    }
  }
  const nearestExam = hasCourses ? activeCourses.reduce((a, b) => (b.daysAway < a.daysAway ? b : a), activeCourses[0]) : null;

  const H2 = ({ children, size }) => (
    <h2 style={{ margin: 0, fontSize: size || "var(--text-lg)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)", fontFamily: "var(--font-sans)" }}>{children}</h2>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>

      {/* ── Advisor hero ──────────────────────────────────────── */}
      <section style={{ borderRadius: "var(--radius-2xl)", background: "linear-gradient(135deg, var(--indigo-50), #FAF5FF)", border: "1px solid var(--border-subtle)", padding: "var(--space-6)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
          <div aria-hidden="true" style={{ flexShrink: 0, width: 40, height: 40, borderRadius: "var(--radius-full)", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "var(--shadow-sm)" }}>🤖</div>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--indigo-600)" }}>{L("Your AI Coach", "Ваш AI-коуч", "Ваш AI-коуч", "Ton coach IA", "Dein KI-Coach")}</p>
            <p style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)", lineHeight: 1.4, textWrap: "pretty" }}>
              {hasCourses
                ? (onTrack >= activeCourses.length
                    ? L(
                        `You're on track for all ${activeCourses.length} of your targets. Keep it up.`,
                        `Ти на шляху до всіх ${activeCourses.length} цілей. Так тримати.`,
                        `Ты на пути ко всем ${activeCourses.length} целям. Так держать.`,
                        `Tu es en bonne voie pour tes ${activeCourses.length} objectifs. Continue.`,
                        `Du bist auf Kurs für alle ${activeCourses.length} Ziele. Weiter so.`
                      )
                    : L(
                        `You're on track for ${onTrack} of ${activeCourses.length} targets. ${focus.name} is the one to fight for.`,
                        `Ти на шляху до ${onTrack} з ${activeCourses.length} цілей. За ${focus.name} варто поборотися.`,
                        `Ты на пути к ${onTrack} из ${activeCourses.length} целей. За ${focus.name} стоит побороться.`,
                        `Tu es en bonne voie pour ${onTrack} objectifs sur ${activeCourses.length}. ${focus.name} reste à conquérir.`,
                        `Du bist auf Kurs für ${onTrack} von ${activeCourses.length} Zielen. ${focus.name} ist die Herausforderung.`
                      ))
                : L(
                    "Add an exam and I'll start tracking your readiness and giving you advice.",
                    "Додай іспит — і я почну стежити за готовністю та давати поради.",
                    "Добавь экзамен — и я начну следить за готовностью и давать советы.",
                    "Ajoute un examen et je commencerai à suivre ta préparation et te conseiller.",
                    "Füge eine Prüfung hinzu, und ich beginne, deine Bereitschaft zu verfolgen und dich zu beraten."
                  )}
            </p>
            <button onClick={() => onGoToChat && onGoToChat("Based on my study data, what should I focus on this week?")}
              style={{ marginTop: 6, border: "none", background: "transparent", color: "var(--indigo-600)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0 }}>
              {L("Get personalised advice", "Отримати пораду", "Получить совет", "Obtenir un conseil", "Persönlichen Rat erhalten")} →
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "var(--space-5)", alignItems: "center" }}>
          {/* readiness gauge */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-1)" }}>
            <GaugeRing value={overall} size={104} />
            <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)" }}>{L("Exam readiness", "Готовність", "Готовность", "Préparation", "Bereitschaft")}</span>
          </div>

          {/* highest-impact task */}
          <div style={{ borderRadius: "var(--radius-xl)", background: "#fff", border: "1px solid var(--border-subtle)", padding: "var(--space-4)", boxShadow: "var(--shadow-sm)" }}>
            <p style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>🎯 {L("Highest-impact task", "Найважливіше завдання", "Самая важная задача", "Tâche prioritaire", "Wichtigste Aufgabe")}</p>
            {focusSession ? (
              <>
                <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>{focusSession.topic} · <span style={{ color: "var(--text-muted)", fontWeight: "var(--weight-normal)" }}>{focus.subject}</span></p>
                <Button variant="accent" size="md" onClick={() => startSession(focusSession)}>{L("Start studying", "Почати навчання", "Начать занятие", "Commencer", "Lernen starten")} →</Button>
              </>
            ) : nextSession ? (
              <>
                <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>
                  {L("Next", "Наступне", "Следующее", "Prochain", "Nächstes")}: {nextSession.topic} · <span style={{ color: "var(--text-muted)", fontWeight: "var(--weight-normal)" }}>{nextSession.subject}</span>
                  <span style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-faint)", fontWeight: "var(--weight-normal)", marginTop: 2 }}>
                    {nextSession.date.toLocaleDateString(t.code === "uk" ? "uk-UA" : t.code === "ru" ? "ru-RU" : t.code === "fr" ? "fr-FR" : t.code === "de" ? "de-DE" : "en-GB", { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                </p>
                <Button variant="accent" size="md" onClick={() => onGoToSchedule && onGoToSchedule()}>{L("View schedule", "Переглянути розклад", "Смотреть расписание", "Voir le calendrier", "Zeitplan ansehen")} →</Button>
              </>
            ) : hasCourses ? (
              <>
                <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>
                  {nearestExam.subject} {L("in", "через", "через", "dans", "in")} {nearestExam.daysAway} {L("days", "дн.", "дн.", "j", "Tagen")} · <span style={{ color: "var(--text-muted)", fontWeight: "var(--weight-normal)" }}>{nearestExam.readinessPct}% {L("ready", "готово", "готово", "prêt", "bereit")}</span>
                </p>
                <Button variant="accent" size="md" onClick={() => onGoToSchedule && onGoToSchedule()}>{L("View schedule", "Переглянути розклад", "Смотреть расписание", "Voir le calendrier", "Zeitplan ansehen")} →</Button>
              </>
            ) : (
              <>
                <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{L("No exams yet", "Поки немає іспитів", "Пока нет экзаменов", "Pas encore d'examens", "Noch keine Prüfungen")}</p>
                <Button variant="accent" size="md" onClick={() => onGoToExams && onGoToExams()}>{L("Add an exam", "Додати іспит", "Добавить экзамен", "Ajouter un examen", "Prüfung hinzufügen")} →</Button>
              </>
            )}
          </div>
        </div>

        {/* predicted → target per subject */}
        <div style={{ marginTop: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {!hasCourses && (
            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{L("No exams yet — add one to see predicted vs target grades.", "Поки немає іспитів — додай, щоб побачити прогноз і ціль.", "Пока нет экзаменов — добавь, чтобы увидеть прогноз и цель.", "Pas encore d'examens — ajoute-en un pour voir prévision et objectif.", "Noch keine Prüfungen — füge eine hinzu, um Prognose und Ziel zu sehen.")}</p>
          )}
          {activeCourses.map((c) => {
            const pc = c.gradeProbability >= 60 ? "var(--emerald-600)" : c.gradeProbability >= 40 ? "var(--amber-600)" : "var(--red-500)";
            return (
              <div key={c.id} onClick={() => openCourse(c, "probability")} style={{ display: "grid", gridTemplateColumns: "1fr auto 120px 48px", alignItems: "center", gap: "var(--space-3)", cursor: "pointer" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-body)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "var(--radius-full)", background: c.color, flexShrink: 0 }} />{c.subject}
                </span>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                  {c.predictedGrade} <span aria-hidden="true" style={{ color: "var(--text-faint)" }}>→</span> <span style={{ color: "var(--indigo-700)", fontWeight: "var(--weight-bold)" }}>{c.targetGrade}</span>
                </span>
                <ProgressBar value={c.gradeProbability} autoColor />
                <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-bold)", color: pc }}>{c.gradeProbability}%</span>
              </div>
            );
          })}
        </div>
      </section>

      <StreakBanner days={window.computeStreak ? window.computeStreak() : 0} message={t.streak_keep} />

      {/* ── Burnout / consistency alert ────────────────────── */}
      <window.BurnoutAlert t={t} />

      {/* ── Weakness alert ──────────────────────────────────── */}
      {weakness && (
        <div style={{ borderRadius: "var(--radius-xl)", border: "1.5px solid var(--red-200)", background: "#FFF1F2", padding: "var(--space-4)", display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 2px", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--red-700)" }}>
              {L("High-risk topic","Тема високого ризику","Тема высокого риска","Sujet à haut risque","Hochrisiko-Thema")}: <strong>{weakness.topic}</strong>
            </p>
            <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-xs)", color: "var(--red-600)" }}>
              {weakness.reasons.join(" · ")} · {L("Review within","Повторіть протягом","Повторите в течение","À réviser dans","Wiederholen innerhalb")} {weakness.reviewWithin}
            </p>
            <Button variant="secondary" size="sm" onClick={() => startSession(weakness.sessionRef)}>
              {L("Start studying","Почати навчання","Начать занятие","Commencer","Lernen starten")} →
            </Button>
          </div>
        </div>
      )}

      {/* ── Forecast ──────────────────────────────────────── */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)", flexWrap: "wrap", gap: "var(--space-2)" }}>
          <H2>{L("Exam forecast","Прогноз іспитів","Прогноз экзаменов","Prévision des examens","Prüfungsprognose")}</H2>
        </div>
        <div style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-subtle)", background: "var(--surface-card)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ padding: "var(--space-3) var(--space-4)", background: "var(--emerald-50)" }}>
              <p style={{ margin: 0, fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--emerald-700)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)" }}>✓ {L("If current pace continues","Якщо темп збережеться","Если темп сохранится","Si le rythme continue","Bei aktuellem Tempo")}</p>
            </div>
            <div style={{ padding: "var(--space-3) var(--space-4)", background: "#FFF8F0", borderLeft: "1px solid var(--border-subtle)" }}>
              <p style={{ margin: 0, fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--amber-700)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)" }}>✗ {L("If sessions are missed","Якщо сесії пропустити","Если сессии пропустить","Si des séances sont manquées","Bei verpassten Einheiten")}</p>
            </div>
          </div>
          {!hasCourses && (
            <div style={{ padding: "var(--space-4)" }}>
              <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{L("No exams yet.", "Поки немає іспитів.", "Пока нет экзаменов.", "Pas encore d'examens.", "Noch keine Prüfungen.")}</p>
            </div>
          )}
          {activeCourses.map((c, i) => (
            <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: i < activeCourses.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
              <div style={{ padding: "var(--space-3) var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", flex: 1 }}>{c.subject}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: "var(--weight-bold)", color: "var(--emerald-700)" }}>{c.forecastOnTrack}</span>
              </div>
              <div style={{ padding: "var(--space-3) var(--space-4)", display: "flex", alignItems: "center", justifyContent: "flex-end", borderLeft: "1px solid var(--border-subtle)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: "var(--weight-bold)", color: "var(--amber-600)" }}>{c.forecastMissed}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Today's sessions with reasoning ──────────────── */}
      <section>
        <H2 size="var(--text-2xl)">{t.dash_today} — {today}</H2>
        <div style={{ marginTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {todaySessions.length === 0 && (
            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              {!hasCourses
                ? L("No sessions yet — add an exam to get a study plan.", "Поки немає сесій — додай іспит, щоб отримати план.", "Пока нет сессий — добавь экзамен, чтобы получить план.", "Pas encore de séances — ajoute un examen pour obtenir un plan.", "Noch keine Einheiten — füge eine Prüfung hinzu, um einen Plan zu erhalten.")
                : nextSession
                ? L(`No sessions today — next one is ${nextSession.date.toLocaleDateString()}.`, `Сьогодні немає сесій — наступна ${nextSession.date.toLocaleDateString()}.`, `Сегодня нет сессий — следующая ${nextSession.date.toLocaleDateString()}.`, `Pas de séance aujourd'hui — la prochaine est le ${nextSession.date.toLocaleDateString()}.`, `Heute keine Einheit — die nächste ist am ${nextSession.date.toLocaleDateString()}.`)
                : L("No sessions today — enjoy the rest day 🎉", "Сьогодні немає сесій — відпочивай 🎉", "Сегодня нет сессий — отдыхай 🎉", "Pas de séance aujourd'hui — profite du repos 🎉", "Heute keine Einheit — genieße den Ruhetag 🎉")}
            </p>
          )}
          {todaySessions.map((s) => (
            <div key={s.id}>
              <SessionCard subject={s.subject} subjectColor={s.color}
                topicName={s.topic} difficulty={s.difficulty} reviewNumber={s.review} estMinutes={s.est}
                onStart={() => startSession(s)} />
              {s.retention && (
                <div style={{ marginTop: 4, padding: "var(--space-2) var(--space-4)", borderRadius: "0 0 var(--radius-lg) var(--radius-lg)", background: "var(--surface-muted)", display: "flex", flexWrap: "wrap", gap: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
                  <span>🧠 {L("Retention","Ретенція","Ретенция","Rétention","Retention")}: <strong style={{ color: s.retention < 60 ? "var(--red-500)" : "var(--text-muted)" }}>{s.retention}%</strong></span>
                  <span>🕐 {L("Last reviewed","Останній перегляд","Последний повтор","Dernière révision","Letzte Wiederholung")}: {s.lastReviewed}</span>
                  {s.expectedOutcome && <span>📈 {s.expectedOutcome}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <H2>{t.dash_upcoming_exams}</H2>
        <div style={{ marginTop: "var(--space-3)", display: "grid", gap: "var(--space-4)", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {!hasCourses && (
            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              {L("No exams yet.", "Поки немає іспитів.", "Пока нет экзаменов.", "Pas encore d'examens.", "Noch keine Prüfungen.")}{" "}
              <button onClick={() => onGoToExams && onGoToExams()} style={{ border: "none", background: "transparent", color: "var(--indigo-600)", fontWeight: "var(--weight-semibold)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", padding: 0 }}>
                {L("Add one", "Додати", "Добавить", "Ajouter", "Hinzufügen")} →
              </button>
            </p>
          )}
          {activeCourses.map((c) => (
            <CourseCard key={c.id} {...c} onClick={() => openCourse(c)} onStatClick={(stat) => openCourse(c, stat)} />
          ))}
        </div>
      </section>

      {/* ── This week's plan ─────────────────────────────── */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)", flexWrap: "wrap", gap: "var(--space-2)" }}>
          <H2>{t.dash_this_week}</H2>
        </div>
        <div style={{ marginTop: "var(--space-1)" }}>
          <WeekStrip
            days={window.deriveWeek([t.mon,t.tue,t.wed,t.thu,t.fri,t.sat,t.sun])}
            onDayClick={(d, i) => setDayDetail({ day: d, dayIndex: i })}
          />
        </div>
      </section>

      {dayDetail && (
        <window.DayDetail
          day={dayDetail.day}
          dayIndex={dayDetail.dayIndex}
          t={t}
          onClose={() => setDayDetail(null)}
          onStart={(s) => { setDayDetail(null); startSession(s); }}
        />
      )}

      {detail && (
        <window.CourseDetail
          course={detail.course}
          focus={detail.focus}
          t={t}
          onClose={() => setDetail(null)}
          onStart={(s) => { setDetail(null); startSession(s); }}
          onSave={saveCourse}
          onGoToChat={onGoToChat}
        />
      )}

      {/* Toast */}
      <div style={{
        position: "fixed", bottom: 28, right: 28, zIndex: 9999,
        background: "var(--slate-900)", color: "#fff",
        borderRadius: "var(--radius-xl)", padding: "12px 20px",
        fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)",
        display: "flex", alignItems: "center", gap: 10,
        boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
        transform: toast ? "translateY(0)" : "translateY(80px)",
        opacity: toast ? 1 : 0,
        transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease",
        pointerEvents: "none",
      }}>
        <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--emerald-500)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>✓</span>
        {toast}
      </div>
    </div>
  );
}
window.Dashboard = Dashboard;
