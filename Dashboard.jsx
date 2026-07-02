// AI Exam Coach — Dashboard: plan-centric design with "Today's AI Plan" hero,
// adaptive scheduling, TodaysMission briefing, and projected outcomes.
function Dashboard({ onOpenCourse, onGoToChat, onGoToExams, onGoToSchedule, t }) {
  const { StreakBanner, SessionCard, CourseCard, WeekStrip, GaugeRing, Button, ProgressBar } = window.AIExamCoachDesignSystem_99e467;
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t.code] || en);
  const today = new Date().toLocaleDateString(t.code === "uk" ? "uk-UA" : t.code === "ru" ? "ru-RU" : t.code === "fr" ? "fr-FR" : t.code === "de" ? "de-DE" : "en-GB", { weekday: "long", day: "numeric", month: "long" });

  const [detail, setDetail] = React.useState(null);
  const [dayDetail, setDayDetail] = React.useState(null);
  const [activeSession, setActiveSession] = React.useState(null);
  const [missionSession, setMissionSession] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [adaptMsg, setAdaptMsg] = React.useState(null);
  const [recap, setRecap] = React.useState(null);

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
  const startSession = (s) => { setMissionSession(null); setActiveSession(s); };

  // Turn the brain's recommendation into a real study session. If a matching
  // pending schedule session exists we reuse its id (so completing it marks the
  // plan done); otherwise we synthesise one that still carries examId+topicIdx,
  // which is all handleSessionDone needs to record the review against the brain.
  const startRecommended = () => {
    if (!rec) return;
    if (rec.kind === "add_exam") { onGoToExams && onGoToExams(); return; }
    if (onGoToChat) {
      onGoToChat({ mode: "learn", topic: rec.topicName });
    }
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

  const XP_BASE = { 1: 5, 2: 10, 3: 20, 4: 30 };
  const handleSessionDone = ({ rating, seconds, quizCorrect, quizTotal, chatMessages }) => {
    const s = activeSession;
    if (s) {
      // examId + this session's topic are encoded in the id ("sess::examId::idx"
      // or synthetic "rec::examId::idx"); s.examId is present on recommended ones.
      const examId = s.examId || (typeof s.id === "string" && s.id.includes("::") ? s.id.split("::")[1] : null);
      const exam = examId && window.getExams ? window.getExams().find((e) => e.id === examId) : null;
      // topicIdx comes from the id's "::idx" when present; otherwise match the
      // session's topic name to its position in the exam's topic list (ad-hoc /
      // CourseDetail sessions don't encode an index).
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

      // Log the real study TIME now (planned session marked done, or an ad-hoc
      // one inserted as history) so "hours studied this week" is honest — even
      // before the user tells us which topics they covered.
      if (window.recordCompletedSession) {
        window.recordCompletedSession({ id: s.id, examId, topic: s.topic, durationSec: seconds || 0 });
      }

      // Snapshot BEFORE coverage is applied — the recap's "coverage step" is what
      // actually moves mastery/readiness, so the before/after delta is measured
      // across the user's own topic selection, not fabricated here.
      const beforeCourse = window.brainCourses().find((c) => c.name === s.subject);
      const gradeBefore = beforeCourse ? beforeCourse.gradeProbability : 0;
      const readinessBefore = beforeCourse ? beforeCourse.readinessPct : 0;
      const achievementsBefore = window.computeAchievements ? window.computeAchievements() : [];
      const streakBefore = window.computeStreak ? window.computeStreak() : 0;

      // The recap collects "which of my N topics did I cover?" and calls this to
      // commit. Returns the freshly-derived after-state so the recap can reveal
      // the real delta + any achievements the coverage unlocked.
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

      setRecap({
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
        nextFocus: findNextPendingSession(),
        chatMessages: chatMessages || [],
      });
    }
    setActiveSession(null);
  };

  // Session recap — shown the instant a session is rated, replacing the
  // old flat "Session saved" toast with a real before/after summary.
  if (recap) {
    return <window.SessionRecap data={recap} onClose={() => setRecap(null)} t={t} />;
  }

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
  // All overall figures come straight from the brain's canonical aggregates —
  // the predicted grade uses the same grade scale (gradeFromReadiness) as every
  // per-course card, so the summary can never disagree with the detail.
  const overallProb = brain.overallProbability;
  const overallGrade = brain.overallPredictedGrade;
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
  const weekBarPct = Math.min(100, weekPct);

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
            <h3 style={{ margin: "0 0 2px", fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>{rec.topicName}</h3>
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
              <div style={{ height: 8, background: "rgba(99,102,241,0.15)", borderRadius: "var(--radius-full)", overflow: "hidden", position: "relative" }}>
                {rec.readinessGain > 0 && (
                  <div style={{ position: "absolute", inset: 0, width: `${rec.readinessProjected}%`, background: "repeating-linear-gradient(45deg, var(--emerald-300), var(--emerald-300) 4px, transparent 4px, transparent 8px)", borderRadius: "var(--radius-full)" }} />
                )}
                <div style={{ position: "absolute", inset: 0, width: `${rec.readinessNow}%`, background: "var(--indigo-500)", borderRadius: "var(--radius-full)", transition: "width 0.5s ease" }} />
              </div>
              {rec.readinessGain > 0 && (
                <p style={{ margin: "6px 0 0", fontSize: "var(--text-xs)", color: "var(--emerald-700)", fontWeight: "var(--weight-semibold)" }}>
                  ✨ {L("Completing this lifts you","Ця сесія підніме","Эта сессия поднимет","Cette séance augmente","Das hebt dich")} +{rec.readinessGain}%
                </p>
              )}
            </div>

            <button onClick={startRecommended} style={{
              width: "100%", padding: "14px", borderRadius: "var(--radius-xl)", border: "none",
              background: "linear-gradient(135deg, var(--indigo-600), #7c3aed)", color: "#fff",
              fontSize: "var(--text-base)", fontWeight: "var(--weight-bold)", cursor: "pointer",
              fontFamily: "var(--font-sans)", boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.02)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              ✨ {L("Start now","Почати зараз","Начать сейчас","Commencer","Jetzt starten")} →
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-3)" }}>
        {[
          { value: overallGrade, label: L("Predicted","Прогноз","Прогноз","Prévu","Prognose"), sub: `${overallProb}% ${L("probability","ймовірність","вероятность","probabilité","Wahrscheinl.")}`, color: overallProb >= 60 ? "var(--emerald-600)" : overallProb >= 40 ? "var(--amber-600)" : "var(--red-500)" },
          { value: `${hoursStudied}/${weeklyGoalH}h`, label: L("This week","Цей тиждень","Эта неделя","Cette sem.","Diese Woche"), sub: `${weekPct}% ${L("of goal","цілі","цели","de l'objectif","des Ziels")}`, color: weekPct >= 100 ? "var(--emerald-600)" : "var(--indigo-600)" },
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
          <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)", color: weekPct >= 80 ? "var(--emerald-600)" : weekPct >= 40 ? "var(--amber-600)" : "var(--text-faint)", fontFamily: "var(--font-mono)" }}>{hoursStudied}h / {weeklyGoalH}h · {weekPct}%</span>
        </div>
        <div style={{ height: 10, background: "var(--surface-sunken)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${weekBarPct}%`, background: weekPct >= 80 ? "var(--emerald-500)" : weekPct >= 40 ? "var(--amber-500)" : "var(--indigo-500)", borderRadius: "var(--radius-full)", transition: "width 0.5s ease" }} />
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
