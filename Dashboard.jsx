// AI Exam Coach — Dashboard: plan-centric design with "Today's AI Plan" hero,
// adaptive scheduling, TodaysMission briefing, and projected outcomes.
function Dashboard({ onOpenCourse, onGoToChat, onGoToExams, onGoToSchedule, t }) {
  const { SessionCard, WeekStrip, GaugeRing, Button, ProgressBar } = window.AIExamCoachDesignSystem_99e467;
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t.code] || en);
  const today = new Date().toLocaleDateString(t.code === "uk" ? "uk-UA" : t.code === "ru" ? "ru-RU" : t.code === "fr" ? "fr-FR" : t.code === "de" ? "de-DE" : "en-GB", { weekday: "long", day: "numeric", month: "long" });

  const [detail, setDetail] = React.useState(null);
  const [dayDetail, setDayDetail] = React.useState(null);
  const [missionSession, setMissionSession] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [adaptMsg, setAdaptMsg] = React.useState(null);

  // THE BRAIN. Subscribing here makes the whole dashboard re-render the moment
  // any mastery / confidence / exam / schedule value changes anywhere in the
  // app — no remount, no manual refresh. `rec` is the single "what should I do
  // right now" answer, recomputed live from the learner model.
  const brain = window.useBrain();
  const rec = React.useMemo(
    () => (window.recommendNextAction ? window.recommendNextAction() : null),
    [brain]
  );
  // Courses and today's sessions are now DERIVED from the brain, not stored in
  // local state — so they can never drift out of sync with the hero. useBrain()
  // above already re-renders this component on any change, so a plain useMemo
  // keyed on `brain` is all the reactivity we need (no subscribe effect).
  const courses = React.useMemo(() => window.brainCourses(), [brain]);
  const todaySessions = React.useMemo(() => {
    const { sessionsByDay } = window.buildScheduleData();
    const todays = sessionsByDay[window.fmtDateKey(new Date())] || [];
    return todays.map((s) => ({ id: s.id, subject: s.subject, color: s.color, topic: s.topic, difficulty: 2, review: 1, est: 45 }));
  }, [brain]);

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
    // No local setState — useBrain() re-derives `courses` from the new data.
  };
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };
  const startMission = (s) => setMissionSession(s);
  // The session itself lives in session-store (app-level) — it survives tab
  // switches, minimizes to a floating timer, and persists across reloads.
  const startSession = (s) => { setMissionSession(null); window.startStudySession(s); };

  // Turn the brain's recommendation into a real study session. If a matching
  // pending schedule session exists we reuse its id (so completing it marks the
  // plan done); otherwise we synthesise one that still carries examId+topicIdx,
  // which is all handleSessionDone needs to record the review against the brain.
  const startRecommended = () => {
    if (!rec) return;
    if (rec.kind === "add_exam") { onGoToExams && onGoToExams(); return; }
    if (focusSession) { startMission(focusSession); return; }
    const schedData = window.getSchedule ? window.getSchedule() : {};
    const sched = Array.isArray(schedData) ? schedData : (schedData.sessions || []);
    const matched = rec.sessionId && sched.find((s) => s.id === rec.sessionId);
    if (matched) { startMission(matched); return; }
    // Synthesize a session from the brain's recommendation so the button
    // always launches StudySession regardless of whether today has a
    // scheduled slot.
    startMission({
      id: rec.sessionId || `rec::${rec.examId}::${rec.topicIdx}`,
      examId: rec.examId,
      subject: rec.examName,
      topic: rec.topicName,
      color: rec.color || "var(--indigo-600)",
      difficulty: 2,
      review: 1,
      est: rec.estMinutes || 45,
    });
  };

  // Reused both for the dashboard hero's "look ahead" card and for the
  // session recap's "tomorrow's focus" — same lookahead, two callers.
  const findNextPendingSession = () => {
    const { sessionsByDay } = window.buildScheduleData();
    const start = new Date();
    for (let i = 1; i <= 30; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i);
      const items = sessionsByDay[window.fmtDateKey(d)] || [];
      const pending = items.find((it) => it.status !== "completed");
      if (pending) return { ...pending, date: d };
    }
    return null;
  };

  // Session completion + recap now live in session-store.jsx (StudyLayer) —
  // the session must outlive this component, which unmounts on tab switch.

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
  // All overall figures come straight from the brain's canonical aggregates —
  // the predicted grade uses the same grade scale (gradeFromReadiness) as every
  // per-course card, so the summary can never disagree with the detail.
  const overallProb = brain.overallProbability;
  const overallGrade = brain.overallPredictedGrade;
  // brain.overallProbability/overallPredictedGrade average in every active
  // course's placeholder forecast even when nobody has studied anything yet —
  // gate the stat tile on at least one course actually having a review.
  const anyCourseStarted = activeCourses.some((c) => c.started);
  const focus = hasCourses ? activeCourses.reduce((a, b) => (b.gradeProbability < a.gradeProbability ? b : a), activeCourses[0]) : null;
  const focusSession = hasCourses ? (todaySessions.find((s) => s.subject === focus.name) || todaySessions[0] || null) : null;

  // Look ahead if nothing today
  const nextSession = hasCourses && !focusSession ? findNextPendingSession() : null;

  // Weekly progress is now measured in REAL HOURS studied vs your stated weekly
  // availability — study your full 19h and you're at 100%, more overshoots,
  // less falls short. (The old "sessions completed / scheduled" ratio let a
  // week read 100% without a single real minute behind it.)
  const weekData = window.deriveWeek([t.mon,t.tue,t.wed,t.thu,t.fri,t.sat,t.sun]);
  const profile = window.getProfile ? window.getProfile() : { weeklyHours: 12 };
  const weeklyGoalH = profile.weeklyHours || 12;
  const secStudied = window.secondsStudiedThisWeek ? window.secondsStudiedThisWeek() : 0;
  const hoursStudied = Math.round((secStudied / 3600) * 10) / 10;
  const weekPct = weeklyGoalH > 0 ? Math.round((hoursStudied / weeklyGoalH) * 100) : 0;

  // Total remaining
  const schedule = window.getSchedule();
  const totalPending = schedule.sessions.filter(s => s.status === "pending").length;
  const totalHours = Math.round(totalPending * 0.75 * 10) / 10;
  const streak = window.computeStreak ? window.computeStreak() : 0;

  const H2 = ({ children, size }) => (
    <h2 style={{ margin: 0, fontSize: size || "var(--text-lg)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)", fontFamily: "var(--font-display)", letterSpacing: "var(--tracking-tight)" }}>{children}</h2>
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

      {/* ── Phase 4: Exam Countdown Banner (< 7 days) ─────── */}
      {(() => {
        const urgent = activeCourses.filter((c) => c.daysAway >= 0 && c.daysAway <= 7).sort((a, b) => a.daysAway - b.daysAway);
        if (urgent.length === 0) return null;
        const nearest = urgent[0];
        const isToday = nearest.daysAway === 0;
        const isTomorrow = nearest.daysAway === 1;
        const dayLabel = isToday ? L("TODAY","СЬОГОДНІ","СЕГОДНЯ","AUJOURD'HUI","HEUTE")
          : isTomorrow ? L("TOMORROW","ЗАВТРА","ЗАВТРА","DEMAIN","MORGEN")
          : `${nearest.daysAway} ${L("DAYS LEFT","ДНІВ","ДНЕЙ","JOURS","TAGE")}`;
        const bgGrad = isToday ? "linear-gradient(135deg, var(--red-50), var(--red-100))" : nearest.daysAway <= 3 ? "linear-gradient(135deg, var(--amber-50), var(--amber-100))" : "linear-gradient(135deg, var(--sky-50), var(--sky-100))";
        const borderC = isToday ? "var(--red-200)" : nearest.daysAway <= 3 ? "var(--amber-200)" : "var(--sky-100)";
        const textC = isToday ? "var(--red-700)" : nearest.daysAway <= 3 ? "var(--amber-700)" : "var(--sky-700)";
        const emoji = isToday ? "🚨" : nearest.daysAway <= 3 ? "⏰" : "📅";
        return (
          <div style={{ borderRadius: "var(--radius-xl)", background: bgGrad, border: `1.5px solid ${borderC}`, padding: "14px var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-3)", animation: "fadeUp 0.4s ease" }}>
            <span style={{ fontSize: 28 }}>{emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: 800, letterSpacing: "0.08em", color: textC, background: isToday ? "#fee2e2" : "rgba(255,255,255,0.6)", padding: "2px 8px", borderRadius: 6 }}>{dayLabel}</span>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-bold)", color: textC }}>{nearest.subject}</span>
              </div>
              <p style={{ margin: 0, fontSize: "var(--text-xs)", color: textC, opacity: 0.8 }}>
                {nearest.started
                  ? `${nearest.readinessPct}% ${L("ready","готовність","готовность","prêt","bereit")}`
                  : L("Not started yet","Ще не почато","Ещё не начато","Pas encore commencé","Noch nicht begonnen")}
                {" · "}{L("target","ціль","цель","objectif","Ziel")}: {nearest.targetGrade}
              </p>
            </div>
            {urgent.length > 1 && (
              <span style={{ fontSize: "var(--text-xs)", color: textC, opacity: 0.7, whiteSpace: "nowrap" }}>+{urgent.length - 1} {L("more","ще","ещё","autre","weitere")}</span>
            )}
          </div>
        );
      })()}

      {/* ── Today's AI Plan — hero section ────────────────── */}
      <section style={{ borderRadius: "var(--radius-2xl)", background: "linear-gradient(160deg, var(--indigo-50), #FFFFFF 70%)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-sm)", padding: "var(--space-6)", position: "relative", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          {window.CoachIcon ? <window.CoachIcon size={40} /> : null}
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 2px", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--indigo-600)" }}>
              {L("Today's AI Plan","AI план на сьогодні","AI план на сегодня","Plan IA du jour","Heutiger KI-Plan")}
            </p>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{today}</p>
          </div>
        </div>

        {/* Recommendation card — the primary CTA, chosen by the brain */}
        {rec && (rec.kind === "review" || rec.kind === "learn") ? (
          <div style={{ borderRadius: "var(--radius-xl)", background: "#fff", border: "1px solid var(--border-subtle)", padding: "var(--space-4)", boxShadow: "var(--shadow-sm)", marginBottom: "var(--space-4)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: rec.color, flexShrink: 0 }} />
              <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--indigo-600)" }}>
                {rec.kind === "learn"
                  ? L("Learn next","Вивчити далі","Изучить далее","Apprendre ensuite","Als Nächstes lernen")
                  : L("Review now","Повторити зараз","Повторить сейчас","Réviser maintenant","Jetzt wiederholen")}
              </span>
              <span style={{ marginLeft: "auto", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>~{rec.estMinutes}{L("min","хв","мин","min","Min")}</span>
            </div>
            <h3 style={{ margin: "0 0 2px", fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", fontFamily: "var(--font-display)", letterSpacing: "var(--tracking-tight)", color: "var(--text-strong)" }}>{rec.topicName}</h3>
            <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{rec.examName}</p>

            {/* Why this — the AI justifies its choice */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: "var(--space-3)" }}>
              {rec.reasons.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "var(--text-xs)", color: "var(--text-body)" }}>
                  <span style={{ color: "var(--indigo-500)", lineHeight: 1.4 }}>›</span>
                  <span style={{ lineHeight: 1.4 }}>{r}</span>
                </div>
              ))}
            </div>

            {/* Projected readiness gain — an honest number from the model */}
            <div style={{ background: "var(--indigo-50)", borderRadius: "var(--radius-lg)", padding: "10px 12px", marginBottom: "var(--space-3)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--indigo-700)" }}>
                  {rec.examName} {L("readiness","готовність","готовность","préparation","Bereitschaft")}
                </span>
                <span style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-mono)", fontWeight: "var(--weight-bold)", color: "var(--indigo-700)" }}>
                  {rec.readinessNow}%{rec.readinessGain > 0 && <span style={{ color: "var(--emerald-600)" }}> → {rec.readinessProjected}%</span>}
                </span>
              </div>
              <div style={{ height: 8, background: "var(--indigo-100)", borderRadius: "var(--radius-full)", overflow: "hidden", position: "relative" }}>
                {rec.readinessGain > 0 && (
                  <div style={{ position: "absolute", inset: 0, width: `${rec.readinessProjected}%`, background: "repeating-linear-gradient(45deg, var(--emerald-300), var(--emerald-300) 4px, transparent 4px, transparent 8px)", borderRadius: "var(--radius-full)" }} />
                )}
                <div style={{ position: "absolute", inset: 0, transform: `scaleX(${rec.readinessNow / 100})`, transformOrigin: "left", background: "var(--indigo-500)", borderRadius: "var(--radius-full)", transition: "transform 0.5s ease" }} />
              </div>
              {rec.readinessGain > 0 && (
                <p style={{ margin: "6px 0 0", fontSize: "var(--text-xs)", color: "var(--emerald-700)", fontWeight: "var(--weight-semibold)" }}>
                  ✨ {L("Completing this lifts you","Ця сесія підніме","Эта сессия поднимет","Cette séance augmente","Das hebt dich")} +{rec.readinessGain}%
                </p>
              )}
            </div>

            <button onClick={startRecommended} style={{
              width: "100%", padding: "15px", borderRadius: "var(--radius-full)", border: "none",
              background: "var(--ink-900)", color: "#fff",
              fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", cursor: "pointer",
              fontFamily: "var(--font-sans)", boxShadow: "var(--shadow-md)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.02)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              {L("Start now","Почати зараз","Начать сейчас","Commencer","Jetzt starten")} →
            </button>
          </div>
        ) : rec && rec.kind === "rest" ? (
          <div style={{ borderRadius: "var(--radius-xl)", background: "#fff", border: "1px solid var(--border-subtle)", padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              {L("Everything's fresh — enjoy the rest day 🎉","Все свіже — відпочинь 🎉","Всё свежо — отдохни 🎉","Tout est frais — repos 🎉","Alles frisch — Ruhetag 🎉")}
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "var(--space-3)" }}>
        {[
          anyCourseStarted
            ? { value: overallGrade, label: L("Predicted","Прогноз","Прогноз","Prévu","Prognose"), sub: `${overallProb}% ${L("probability","ймовірність","вероятность","probabilité","Wahrscheinl.")}`, color: overallProb >= 60 ? "var(--emerald-600)" : overallProb >= 40 ? "var(--amber-600)" : "var(--red-500)" }
            : { value: "–", label: L("Predicted","Прогноз","Прогноз","Prévu","Prognose"), sub: L("not started yet","ще не почато","ещё не начато","pas commencé","noch nicht begonnen"), color: "var(--text-faint)" },
          { value: `${hoursStudied}/${weeklyGoalH}h`, label: L("This week","Цей тиждень","Эта неделя","Cette sem.","Diese Woche"), sub: `${weekPct}% ${L("of goal","цілі","цели","de l'objectif","des Ziels")}`, color: weekPct >= 100 ? "var(--emerald-600)" : "var(--indigo-600)" },
          { value: `${totalHours}h`, label: L("Remaining","Залишилось","Осталось","Restant","Verbleibend"), sub: `${totalPending} ${L("sessions","сесій","сессий","séances","Sitzungen")}`, color: "var(--text-strong)" },
          { value: `${streak}🔥`, label: L("Streak","Серія","Серия","Série","Serie"), sub: streak > 0 ? L("days","днів","дней","jours","Tage") : L("start today!","почніть!","начните!","commencez !","jetzt starten!"), color: streak > 0 ? "var(--amber-600)" : "var(--text-faint)" },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: "center", padding: "var(--space-4) var(--space-3)", borderRadius: "var(--radius-xl)", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--weight-bold)", color: stat.color, fontFamily: "var(--font-display)", letterSpacing: "var(--tracking-tight)" }}>{stat.value}</div>
            <div style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", marginTop: 4 }}>{stat.label}</div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", marginTop: 1 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Week strip — hours/goal numbers already live in the stats row,
              so this is just the tappable day-by-day view, no duplicate bar */}
      <section style={{ borderRadius: "var(--radius-xl)", background: "var(--surface-card)", border: "1px solid var(--border-default)", padding: "var(--space-3) var(--space-4)", overflowX: "auto" }}>
        <WeekStrip
          days={weekData}
          onDayClick={(d, i) => setDayDetail({ day: d, dayIndex: i })}
        />
      </section>

      <window.BurnoutAlert t={t} />

      {/* ── Phase 6: Weak Spot Digest ────────────────────── */}
      {(() => {
        const weakSpots = activeCourses.flatMap((c) => {
          const ev = (brain.examViews || []).find((e) => e.id === c.id);
          if (!ev) return [];
          return (ev.topics || [])
            .filter((tp) => tp.lastSeen && tp.retention < 0.5)
            .map((tp) => ({ name: tp.topicName || tp.name, exam: c.subject, retention: Math.round(tp.retention * 100), color: c.color, topicIdx: tp.topicIdx, examId: c.id }));
        }).sort((a, b) => a.retention - b.retention).slice(0, 3);
        if (weakSpots.length === 0) return null;
        return (
          <section style={{ borderRadius: "var(--radius-xl)", background: "var(--surface-card)", border: "1px solid var(--border-default)", padding: "var(--space-4)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span style={{ fontSize: 18 }}>🎯</span>
                <H2 size="var(--text-base)">{L("Weak spots","Слабкі місця","Слабые места","Points faibles","Schwachstellen")}</H2>
              </div>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{L("Topics where you struggle","Теми зі складнощами","Темы, где сложности","Sujets difficiles","Schwierige Themen")}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {weakSpots.map((ws, i) => (
                <div key={i} onClick={() => onGoToChat && onGoToChat({ mode: "learn", topic: ws.name })}
                  style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "12px 14px", borderRadius: "var(--radius-lg)", background: ws.retention < 20 ? "var(--red-50)" : ws.retention < 35 ? "var(--amber-50)" : "var(--surface-muted)", border: `1px solid ${ws.retention < 20 ? "var(--red-200)" : ws.retention < 35 ? "var(--amber-200)" : "var(--border-subtle)"}`, cursor: "pointer", transition: "transform 0.1s ease" }}>
                  <div style={{ width: 40, textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: "var(--text-base)", fontWeight: "var(--weight-bold)", color: ws.retention < 20 ? "var(--red-600)" : ws.retention < 35 ? "var(--amber-600)" : "var(--text-body)", fontFamily: "var(--font-mono)" }}>{ws.retention}%</div>
                    <div style={{ height: 3, background: "var(--border-subtle)", borderRadius: 2, overflow: "hidden", marginTop: 3 }}>
                      <div style={{ height: "100%", width: `${ws.retention}%`, background: ws.retention < 20 ? "var(--red-500)" : ws.retention < 35 ? "var(--amber-500)" : "var(--indigo-500)" }} />
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ws.name}</div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{ws.exam}</div>
                  </div>
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)", color: "var(--indigo-600)", flexShrink: 0 }}>{L("Study","Вчити","Учить","Étudier","Lernen")} →</span>
                </div>
              ))}
            </div>
          </section>
        );
      })()}

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
                {c.started ? (<>
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                    {c.predictedGrade} <span style={{ color: "var(--text-faint)" }}>→</span> <strong style={{ color: "var(--indigo-700)" }}>{c.targetGrade}</strong>
                  </span>
                  <span style={{ padding: "2px 8px", borderRadius: "var(--radius-full)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", background: riskBadge.bg, color: riskBadge.fg }}>{riskBadge.text}</span>
                  <ProgressBar value={c.gradeProbability} autoColor />
                  <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-bold)", color: pc }}>{c.gradeProbability}%</span>
                </>) : (
                  <span style={{ gridColumn: "2 / -1", textAlign: "right", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
                    {L("Not started yet","Ще не почато","Ещё не начато","Pas encore commencé","Noch nicht begonnen")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

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
        background: "rgba(15, 23, 42, 0.82)", backdropFilter: "blur(14px) saturate(160%)", WebkitBackdropFilter: "blur(14px) saturate(160%)",
        border: "1px solid rgba(255, 255, 255, 0.08)", color: "#fff",
        borderRadius: "var(--radius-xl)", padding: "12px 20px",
        fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)",
        display: "flex", alignItems: "center", gap: 10,
        boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
        transform: toast ? "translateY(0)" : "translateY(80px)",
        opacity: toast ? 1 : 0,
        transition: "transform 0.25s cubic-bezier(0.16,1,0.3,1), opacity 0.2s ease",
        pointerEvents: "none",
      }}>
        <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--emerald-500)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>✓</span>
        {toast}
      </div>
    </div>
  );
}
window.Dashboard = Dashboard;
