// AI Exam Coach — Dashboard: plan-centric design with "Today's AI Plan" hero,
// adaptive scheduling, TodaysMission briefing, and projected outcomes.
function Dashboard({ onOpenCourse, onGoToChat, onGoToExams, onGoToSchedule, t }) {
  const { StreakBanner, SessionCard, CourseCard, WeekStrip, GaugeRing, Button, ProgressBar } = window.AIExamCoachDesignSystem_99e467;
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t.code] || en);
  const today = new Date().toLocaleDateString(t.code === "uk" ? "uk-UA" : t.code === "ru" ? "ru-RU" : t.code === "fr" ? "fr-FR" : t.code === "de" ? "de-DE" : "en-GB", { weekday: "long", day: "numeric", month: "long" });

  const [courses, setCourses] = React.useState(() => window.deriveCourses(window.getExams()));
  const [todaySessions, setTodaySessions] = React.useState(() => {
    const { sessionsByDay } = window.buildScheduleData();
    const todays = sessionsByDay[window.fmtDateKey(new Date())] || [];
    return todays.map((s) => ({ id: s.id, subject: s.subject, color: s.color, topic: s.topic, difficulty: 2, review: 1, est: 45 }));
  });
  const [detail, setDetail] = React.useState(null);
  const [dayDetail, setDayDetail] = React.useState(null);
  const [activeSession, setActiveSession] = React.useState(null);
  const [missionSession, setMissionSession] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [adaptMsg, setAdaptMsg] = React.useState(null);

  React.useEffect(() => {
    const refresh = () => {
      setCourses(window.deriveCourses(window.getExams()));
      const { sessionsByDay } = window.buildScheduleData();
      const todays = sessionsByDay[window.fmtDateKey(new Date())] || [];
      setTodaySessions(todays.map((s) => ({ id: s.id, subject: s.subject, color: s.color, topic: s.topic, difficulty: 2, review: 1, est: 45 })));
    };
    const unsubExams = window.subscribeExams ? window.subscribeExams(refresh) : null;
    const unsubSchedule = window.subscribeSchedule ? window.subscribeSchedule(refresh) : null;
    return () => { if (unsubExams) unsubExams(); if (unsubSchedule) unsubSchedule(); };
  }, []);

  // Adaptive scheduling — check for overdue sessions on mount
  React.useEffect(() => {
    if (!window.adaptSchedule) return;
    const result = window.adaptSchedule();
    if (result.adapted) {
      setAdaptMsg(L(
        `Your plan adapted: ${result.changes.length} ${result.changes.length === 1 ? "session" : "sessions"} rescheduled automatically.`,
        `План адаптовано: ${result.changes.length} ${result.changes.length === 1 ? "сесію" : "сесій"} перенесено.`,
        `План адаптирован: ${result.changes.length} ${result.changes.length === 1 ? "сессия" : "сессий"} перенесено.`,
        `Plan adapté : ${result.changes.length} ${result.changes.length === 1 ? "séance" : "séances"} reprogrammée(s).`,
        `Plan angepasst: ${result.changes.length} ${result.changes.length === 1 ? "Sitzung" : "Sitzungen"} neu geplant.`
      ));
      setTimeout(() => setAdaptMsg(null), 6000);
    }
  }, []);

  const openCourse = (course, focus) => setDetail({ course, focus });
  const saveCourse = (updated) => {
    const next = window.getExams().map((e) => e.id === updated.id
      ? { ...e, confidencePct: updated.confidencePct, targetGrade: updated.targetGrade }
      : e);
    window.saveExams(next);
    setCourses(window.deriveCourses(next));
  };
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };
  const startMission = (s) => setMissionSession(s);
  const startSession = (s) => { setMissionSession(null); setActiveSession(s); };

  const RATING_BUMP = { 1: -1, 2: 1, 3: 2, 4: 4 };
  const RATING_RETENTION = { 1: -5, 2: 5, 3: 12, 4: 20 };
  const handleSessionDone = (rating) => {
    const s = activeSession;
    if (s) {
      if (window.markSessionCompleted) window.markSessionCompleted(s.id, true);
      setTodaySessions((ts) => ts.map((row) => row.id === s.id
        ? { ...row, lastReviewed: "Just now", retention: Math.max(0, Math.min(100, (row.retention || 50) + (RATING_RETENTION[rating] ?? 10))) }
        : row));
      const exams = window.getExams();
      const matched = exams.find((e) => e.name === s.subject);
      if (matched) {
        const nextConfidence = Math.max(0, Math.min(100, (matched.confidencePct ?? 50) + (RATING_BUMP[rating] ?? 2)));
        window.saveExams(exams.map((e) => e.id === matched.id ? { ...e, confidencePct: nextConfidence } : e));
      }
      setCourses(window.deriveCourses(window.getExams()));
      showToast(L("Session saved — readiness updated ✓","Сесію збережено ✓","Сессия сохранена ✓","Séance enregistrée ✓","Sitzung gespeichert ✓"));
    }
    setActiveSession(null);
  };

  // Active study session — timer view
  if (activeSession) {
    return <window.StudySession session={activeSession} onDone={handleSessionDone} onCancel={() => setActiveSession(null)} t={t} />;
  }

  // Mission briefing — shown before timer
  if (missionSession) {
    const course = courses.find(c => c.name === missionSession.subject) || null;
    return <window.TodaysMission
      session={missionSession} course={course} t={t}
      onBegin={() => startSession(missionSession)}
      onSkip={() => { setMissionSession(null); showToast(L("Session skipped — plan will adapt","Сесію пропущено","Сессия пропущена","Séance passée","Sitzung übersprungen")); }}
    />;
  }

  const activeCourses = courses.filter((c) => c.daysAway >= 0);
  const hasCourses = activeCourses.length > 0;
  const overall = hasCourses ? Math.round(activeCourses.reduce((a, c) => a + c.readinessPct, 0) / activeCourses.length) : 0;
  const overallProb = hasCourses ? Math.round(activeCourses.reduce((a, c) => a + c.gradeProbability, 0) / activeCourses.length) : 0;
  const overallGrade = overallProb >= 80 ? "A" : overallProb >= 60 ? "B" : overallProb >= 40 ? "C" : "D";
  const focus = hasCourses ? activeCourses.reduce((a, b) => (b.gradeProbability < a.gradeProbability ? b : a), activeCourses[0]) : null;
  const focusSession = hasCourses ? (todaySessions.find((s) => s.subject === focus.name) || todaySessions[0] || null) : null;

  // Look ahead if nothing today
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

  // Weekly progress
  const weekData = window.deriveWeek([t.mon,t.tue,t.wed,t.thu,t.fri,t.sat,t.sun]);
  const weekScheduled = weekData.reduce((a, d) => a + d.scheduled, 0);
  const weekCompleted = weekData.reduce((a, d) => a + d.completed, 0);
  const weekPct = weekScheduled > 0 ? Math.round((weekCompleted / weekScheduled) * 100) : 0;

  // Total remaining
  const schedule = window.getSchedule();
  const totalPending = schedule.sessions.filter(s => s.status === "pending").length;
  const totalHours = Math.round(totalPending * 0.75 * 10) / 10;
  const streak = window.computeStreak ? window.computeStreak() : 0;

  const H2 = ({ children, size }) => (
    <h2 style={{ margin: 0, fontSize: size || "var(--text-lg)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)", fontFamily: "var(--font-sans)" }}>{children}</h2>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>

      {/* ── Adaptive scheduling notification ─────────────── */}
      {adaptMsg && (
        <div style={{ borderRadius: "var(--radius-xl)", background: "var(--indigo-50)", border: "1px solid var(--indigo-100)", padding: "12px var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", animation: "fadeUp 0.4s ease" }}>
          <span style={{ fontSize: 18 }}>🔄</span>
          <span style={{ color: "var(--indigo-700)", fontWeight: "var(--weight-medium)", flex: 1 }}>{adaptMsg}</span>
          <button onClick={() => setAdaptMsg(null)} style={{ border: "none", background: "transparent", color: "var(--indigo-400)", cursor: "pointer", fontSize: 16, padding: 0 }}>✕</button>
        </div>
      )}

      {/* ── Today's AI Plan — hero section ────────────────── */}
      <section style={{ borderRadius: "var(--radius-2xl)", background: "linear-gradient(135deg, var(--indigo-50), #FAF5FF)", border: "1px solid var(--border-subtle)", padding: "var(--space-6)", position: "relative", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          {window.CoachIcon ? <window.CoachIcon size={40} /> : null}
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 2px", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--indigo-600)" }}>
              {L("Today's AI Plan","AI план на сьогодні","AI план на сегодня","Plan IA du jour","Heutiger KI-Plan")}
            </p>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{today}</p>
          </div>
        </div>

        {/* Mission card — the primary CTA */}
        {focusSession ? (
          <div style={{ borderRadius: "var(--radius-xl)", background: "#fff", border: "1px solid var(--border-subtle)", padding: "var(--space-4)", boxShadow: "var(--shadow-sm)", marginBottom: "var(--space-4)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: focusSession.color, flexShrink: 0 }} />
              <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>
                {L("Next up","Далі","Далее","À suivre","Als nächstes")}
              </span>
            </div>
            <h3 style={{ margin: "0 0 4px", fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>{focusSession.topic}</h3>
            <p style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              {focusSession.subject} · ~{focusSession.est || 45}{L("min","хв","мин","min","Min")}
            </p>
            {focus && (
              <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-xs)", color: "var(--indigo-600)", fontStyle: "italic" }}>
                💡 {focus.riskLevel === "high"
                  ? L(`Prioritized — ${focus.name} needs the most attention right now.`,`Пріоритет — ${focus.name} потребує найбільшої уваги.`,`Приоритет — ${focus.name} требует наибольшего внимания.`,`Priorité — ${focus.name} nécessite le plus d'attention.`,`Priorität — ${focus.name} braucht am meisten Aufmerksamkeit.`)
                  : L(`Scheduled by spaced repetition to strengthen long-term retention.`,`Заплановано інтервальним повторенням.`,`Запланировано интервальным повторением.`,`Programmé par répétition espacée.`,`Durch verteilte Wiederholung geplant.`)}
              </p>
            )}
            <button onClick={() => startMission(focusSession)} style={{
              width: "100%", padding: "14px", borderRadius: "var(--radius-xl)", border: "none",
              background: "linear-gradient(135deg, var(--indigo-600), #7c3aed)", color: "#fff",
              fontSize: "var(--text-base)", fontWeight: "var(--weight-bold)", cursor: "pointer",
              fontFamily: "var(--font-sans)", boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.02)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              ✨ {L("Start My AI Plan","Розпочати AI план","Начать AI план","Démarrer mon plan IA","Meinen KI-Plan starten")} →
            </button>
          </div>
        ) : nextSession ? (
          <div style={{ borderRadius: "var(--radius-xl)", background: "#fff", border: "1px solid var(--border-subtle)", padding: "var(--space-4)", boxShadow: "var(--shadow-sm)", marginBottom: "var(--space-4)" }}>
            <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>
              {L("No sessions today","Сьогодні немає сесій","Сегодня нет сессий","Pas de séance aujourd'hui","Heute keine Sitzung")} — {L("next one","наступна","следующая","prochaine","nächste")}:
            </p>
            <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-base)", color: "var(--text-body)" }}>
              {nextSession.topic} · {nextSession.subject} · {nextSession.date.toLocaleDateString(t.code === "uk" ? "uk-UA" : "en-GB", { weekday: "short", day: "numeric", month: "short" })}
            </p>
            <Button variant="accent" size="md" onClick={() => onGoToSchedule && onGoToSchedule()}>{L("View schedule","Розклад","Расписание","Calendrier","Zeitplan")} →</Button>
          </div>
        ) : hasCourses ? (
          <div style={{ borderRadius: "var(--radius-xl)", background: "#fff", border: "1px solid var(--border-subtle)", padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              {L("No sessions today — enjoy the rest day 🎉","Сьогодні відпочинок 🎉","Сегодня отдых 🎉","Jour de repos 🎉","Ruhetag 🎉")}
            </p>
          </div>
        ) : (
          <div style={{ borderRadius: "var(--radius-xl)", background: "#fff", border: "1px solid var(--border-subtle)", padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              {L("Add an exam to get your personalized AI study plan.","Додай іспит для AI плану.","Добавь экзамен для AI плана.","Ajoute un examen pour ton plan IA.","Füge eine Prüfung hinzu für deinen KI-Plan.")}
            </p>
            <Button variant="accent" size="md" onClick={() => onGoToExams && onGoToExams()}>{L("Add an exam","Додати іспит","Добавить экзамен","Ajouter un examen","Prüfung hinzufügen")} →</Button>
          </div>
        )}

        {/* Today's remaining sessions */}
        {todaySessions.length > 1 && (
          <div>
            <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>
              {L("Also today","Також сьогодні","Также сегодня","Aussi aujourd'hui","Auch heute")} ({todaySessions.length - 1} {L("more","ще","ещё","de plus","weitere")})
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {todaySessions.filter(s => s.id !== (focusSession && focusSession.id)).map(s => (
                <div key={s.id} onClick={() => startMission(s)} style={{
                  display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "8px 12px",
                  borderRadius: "var(--radius-lg)", background: "rgba(255,255,255,0.7)", border: "1px solid var(--border-subtle)",
                  cursor: "pointer", transition: "background 0.15s ease",
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--text-body)", flex: 1 }}>{s.topic} · {s.subject}</span>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>~{s.est || 45}m</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Stats row ─────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-3)" }}>
        {[
          { value: overallGrade, label: L("Predicted","Прогноз","Прогноз","Prévu","Prognose"), sub: `${overallProb}% ${L("probability","ймовірність","вероятность","probabilité","Wahrscheinl.")}`, color: overallProb >= 60 ? "var(--emerald-600)" : overallProb >= 40 ? "var(--amber-600)" : "var(--red-500)" },
          { value: `${weekCompleted}/${weekScheduled}`, label: L("This week","Цей тиждень","Эта неделя","Cette sem.","Diese Woche"), sub: `${weekPct}% ${L("done","готово","готово","fait","erledigt")}`, color: "var(--indigo-600)" },
          { value: `${totalHours}h`, label: L("Remaining","Залишилось","Осталось","Restant","Verbleibend"), sub: `${totalPending} ${L("sessions","сесій","сессий","séances","Sitzungen")}`, color: "var(--text-strong)" },
          { value: `${streak}🔥`, label: L("Streak","Серія","Серия","Série","Serie"), sub: streak > 0 ? L("days","днів","дней","jours","Tage") : L("start today!","почніть!","начните!","commencez !","jetzt starten!"), color: streak > 0 ? "var(--amber-600)" : "var(--text-faint)" },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: "center", padding: "var(--space-3)", borderRadius: "var(--radius-xl)", background: "var(--surface-card)", border: "1px solid var(--border-default)" }}>
            <div style={{ fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", color: stat.color, fontFamily: "var(--font-mono)" }}>{stat.value}</div>
            <div style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", marginTop: 2 }}>{stat.label}</div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", marginTop: 1 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Weekly progress bar ───────────────────────────── */}
      <section style={{ borderRadius: "var(--radius-xl)", background: "var(--surface-card)", border: "1px solid var(--border-default)", padding: "var(--space-4)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>{L("Weekly progress","Тижневий прогрес","Недельный прогресс","Progrès de la semaine","Wochenfortschritt")}</span>
          <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)", color: weekPct >= 80 ? "var(--emerald-600)" : weekPct >= 40 ? "var(--amber-600)" : "var(--text-faint)", fontFamily: "var(--font-mono)" }}>{weekPct}%</span>
        </div>
        <div style={{ height: 10, background: "var(--surface-sunken)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${weekPct}%`, background: weekPct >= 80 ? "var(--emerald-500)" : weekPct >= 40 ? "var(--amber-500)" : "var(--indigo-500)", borderRadius: "var(--radius-full)", transition: "width 0.5s ease" }} />
        </div>
        <div style={{ marginTop: "var(--space-2)" }}>
          <WeekStrip
            days={weekData}
            onDayClick={(d, i) => setDayDetail({ day: d, dayIndex: i })}
          />
        </div>
      </section>

      <StreakBanner days={streak} message={t.streak_keep} />
      <window.BurnoutAlert t={t} />

      {/* ── Per-course readiness ──────────────────────────── */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
          <H2>{L("Exam readiness","Готовність до іспитів","Готовность к экзаменам","Préparation aux examens","Prüfungsbereitschaft")}</H2>
          <button onClick={() => onGoToChat && onGoToChat("Based on my study data, what should I focus on this week?")}
            style={{ border: "none", background: "transparent", color: "var(--indigo-600)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0 }}>
            {L("Ask AI Coach","Запитати AI","Спросить AI","Demander à l'IA","KI-Coach fragen")} →
          </button>
        </div>
        {!hasCourses && (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            {L("No exams yet — add one to see predicted vs target grades.","Поки немає іспитів.","Пока нет экзаменов.","Pas encore d'examens.","Noch keine Prüfungen.")}
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {activeCourses.map((c) => {
            const pc = c.gradeProbability >= 60 ? "var(--emerald-600)" : c.gradeProbability >= 40 ? "var(--amber-600)" : "var(--red-500)";
            const riskBadge = c.riskLevel === "high" ? { bg: "var(--red-100)", fg: "var(--red-700)", text: "⚠" } : c.riskLevel === "medium" ? { bg: "var(--amber-100)", fg: "var(--amber-700)", text: "◐" } : { bg: "var(--emerald-100)", fg: "var(--emerald-700)", text: "✓" };
            return (
              <div key={c.id} onClick={() => openCourse(c)} style={{
                display: "grid", gridTemplateColumns: "1fr auto auto 110px 48px", alignItems: "center", gap: "var(--space-3)",
                padding: "var(--space-3)", borderRadius: "var(--radius-xl)", background: "var(--surface-card)",
                border: "1px solid var(--border-default)", cursor: "pointer", transition: "box-shadow 0.15s ease",
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-body)", minWidth: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.subject}</span>
                </span>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                  {c.predictedGrade} <span style={{ color: "var(--text-faint)" }}>→</span> <strong style={{ color: "var(--indigo-700)" }}>{c.targetGrade}</strong>
                </span>
                <span style={{ padding: "2px 8px", borderRadius: "var(--radius-full)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", background: riskBadge.bg, color: riskBadge.fg }}>{riskBadge.text}</span>
                <ProgressBar value={c.gradeProbability} autoColor />
                <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-bold)", color: pc }}>{c.gradeProbability}%</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Upcoming exams (compact) ─────────────────────── */}
      {hasCourses && (
        <section>
          <H2>{t.dash_upcoming_exams}</H2>
          <div style={{ marginTop: "var(--space-3)", display: "grid", gap: "var(--space-4)", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
            {activeCourses.map((c) => (
              <CourseCard key={c.id} {...c} onClick={() => openCourse(c)} onStatClick={(stat) => openCourse(c, stat)} />
            ))}
          </div>
        </section>
      )}

      {dayDetail && (
        <window.DayDetail
          day={dayDetail.day} dayIndex={dayDetail.dayIndex} t={t}
          onClose={() => setDayDetail(null)}
          onStart={(s) => { setDayDetail(null); startMission(s); }}
        />
      )}

      {detail && (
        <window.CourseDetail
          course={detail.course} focus={detail.focus} t={t}
          onClose={() => setDetail(null)}
          onStart={(s) => { setDetail(null); startMission(s); }}
          onSave={saveCourse} onGoToChat={onGoToChat}
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
