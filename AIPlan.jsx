// AI Exam Coach — AI Planning Screen (post-exam-creation experience)
// Two phases: animated "planning" sequence, then full plan reveal with
// stats, calendar, reasoning, and "Start My AI Plan" CTA.

function AIPlan({ examIds, onStart, t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
  const [phase, setPhase] = React.useState("planning");
  const [done, setDone] = React.useState(0);
  const reasonsRef = React.useRef(null);
  const [whyGlow, setWhyGlow] = React.useState(false);
  const scrollToWhy = () => {
    if (!reasonsRef.current) return;
    reasonsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    setWhyGlow(true);
    setTimeout(() => setWhyGlow(false), 1800);
  };

  const STEPS = [
    { icon: "📚", text: L("Analyzing your syllabus…","Аналізую програму…","Анализирую программу…","Analyse du programme…","Lehrplan wird analysiert…") },
    { icon: "⏱️", text: L("Estimating workload per topic…","Оцінюю обсяг по темах…","Оцениваю нагрузку по темам…","Estimation de la charge…","Arbeitsaufwand wird geschätzt…") },
    { icon: "🧠", text: L("Calculating forgetting curves…","Обчислюю криві забування…","Вычисляю кривые забывания…","Calcul des courbes d'oubli…","Vergessenskurven werden berechnet…") },
    { icon: "🔄", text: L("Scheduling spaced repetition…","Планую інтервальне повторення…","Планирую интервальное повторение…","Planification de la répétition espacée…","Verteilte Wiederholung wird geplant…") },
    { icon: "📅", text: L("Fitting sessions to your hours…","Підлаштовую під ваш графік…","Подстраиваю под ваш график…","Adaptation à vos horaires…","Sitzungen werden eingeplant…") },
    { icon: "💤", text: L("Planning rest days…","Планую дні відпочинку…","Планирую дни отдыха…","Planification des jours de repos…","Ruhetage werden eingeplant…") },
    { icon: "📈", text: L("Projecting grade outcomes…","Прогнозую оцінки…","Прогнозирую оценки…","Projection des résultats…","Notenprognose wird erstellt…") },
    { icon: "✨", text: L("Finalizing your AI study plan…","Завершую ваш AI план…","Завершаю ваш AI план…","Finalisation du plan…","KI-Plan wird finalisiert…") },
  ];

  React.useEffect(() => {
    if (phase !== "planning") return;
    let step = 0;
    const iv = setInterval(() => {
      step++;
      if (step > STEPS.length) { clearInterval(iv); setTimeout(() => setPhase("reveal"), 700); return; }
      setDone(step);
    }, 800);
    return () => clearInterval(iv);
  }, [phase]);

  // ── Compute plan data ────────────────────────────────────────────────────
  // Bumped whenever a tier tile is clicked — saveProfile({planIntensity})
  // writes synchronously and triggers replanAllSchedules (profile-store.jsx),
  // but the useMemo calls below have empty/exams-only deps and won't re-read
  // localStorage on their own, so this forces the refetch.
  const [refreshKey, setRefreshKey] = React.useState(0);
  const exams = React.useMemo(() => window.getExams(), [refreshKey]);
  const courses = React.useMemo(() => window.deriveCourses(exams), [exams]);
  const schedule = React.useMemo(() => window.getSchedule(), [refreshKey]);
  const profile = React.useMemo(() => window.getProfile(), [refreshKey]);

  const active = courses.filter(c => c.daysAway >= 0);
  const pending = schedule.sessions.filter(s => s.status === "pending");
  const totalSessions = pending.length;
  // Real planned hours using durationMin from Phase 3 budget engine; old
  // sessions without durationMin fall back to profile.sessionLengthMin ?? 45.
  const sessionMinDefault = profile.sessionLengthMin ?? 45;
  const totalHours = Math.round(pending.reduce((s, sess) => s + (sess.durationMin ?? sessionMinDefault) / 60, 0) * 10) / 10;
  const studyDayCount = new Set(pending.map(s => s.date)).size;
  const lastExamDays = active.length > 0 ? Math.max(...active.map(c => c.daysAway)) : 30;
  const restDayCount = Math.max(0, Math.round(lastExamDays / 7));
  const sessionsPerWeek = lastExamDays > 0 ? Math.round(totalSessions / Math.max(1, lastExamDays / 7)) : totalSessions;
  const lastExamDateStr = active.length > 0
    ? new Date(Date.now() + Math.max(...active.map(c => c.daysAway)) * 86400000).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : "—";

  const overallProb = active.length > 0 ? Math.round(active.reduce((a, c) => a + c.gradeProbability, 0) / active.length) : 0;
  const overallGrade = overallProb >= 80 ? "A" : overallProb >= 60 ? "B" : overallProb >= 40 ? "C" : "D";
  // No course has a single completed session yet — the forecast trio below
  // is a real formula output, but showing "D / 0% / High risk" for a plan
  // nobody has started is discouraging rather than informative. Same promise
  // the review step already makes ("Forecast unlocks after your first
  // sessions") — this just actually keeps it here too.
  const anyStarted = active.some((c) => c.started);

  // Weakest course for reasoning
  const weakest = active.length > 0 ? active.reduce((a, b) => b.gradeProbability < a.gradeProbability ? b : a, active[0]) : null;

  // ── Plan intensity tiers ─────────────────────────────────────────────────
  // Each tile's h/wk and sessions/wk come from actually running the real
  // budget engine (window.allocateBudget) with that tier's multiplier — not
  // a heuristic guess — so what's shown here is exactly what you'll get if
  // you click it. "Balanced" (1x) reflects weeklyHours exactly as entered in
  // Settings; Minimal/Ambitious scale it via INTENSITY_MULTIPLIERS
  // (schedule-store.jsx), same constant the engine itself uses.
  const weeksUntilLast = Math.max(1, lastExamDays / 7);
  const GRADE_STEPS = ["C", "B", "A", "A*"];
  const targetGradeStr = active.length > 0
    ? (active.reduce((a, c) => GRADE_STEPS.indexOf(c.targetGrade) > GRADE_STEPS.indexOf(a) ? c.targetGrade : a, active[0].targetGrade))
    : "A";
  const gi = GRADE_STEPS.indexOf(targetGradeStr);

  const TIERS = React.useMemo(() => {
    const MULT = window.INTENSITY_MULTIPLIERS || { minimal: 0.55, balanced: 1, ambitious: 1.5 };
    const defs = [
      { id: "minimal",   label: L("Minimal","Мінімум","Минимум","Minimal","Minimal"),   gradeIdx: gi - 1, color: "var(--amber-600)",   desc: L("Cover each topic once — just enough","Кожну тему один раз","Каждую тему один раз","Couvrir chaque sujet","Jeden Thema einmal") },
      { id: "balanced",  label: L("Balanced","Збалансовано","Сбалансированно","Équilibré","Ausgewogen"),  gradeIdx: gi,     color: "var(--indigo-600)",  desc: L("Spaced repetition, your budget","Інтервальне повторення","Интервальное повторение","Répétition espacée","Verteilte Wiederholung") },
      { id: "ambitious", label: L("Ambitious","Амбітно","Амбициозно","Ambitieux","Ambitioniert"), gradeIdx: gi + 1, color: "var(--emerald-600)", desc: L("Deep mastery, extra sessions","Глибоке засвоєння","Глубокое освоение","Maîtrise approfondie","Tiefes Lernen") },
    ];
    return defs.map((tier) => {
      let hours = 0, sess = 0;
      if (window.allocateBudget) {
        const plan = window.allocateBudget(exams, { ...profile, planIntensity: tier.id });
        plan.forEach((entry) => {
          sess += entry.sessions.length;
          hours += entry.sessions.reduce((s, x) => s + (x.durationMin ?? sessionMinDefault) / 60, 0);
        });
      }
      return {
        ...tier,
        hpw: Math.round((hours / weeksUntilLast) * 10) / 10,
        spw: Math.max(0, Math.round(sess / weeksUntilLast)),
        grade: GRADE_STEPS[Math.max(0, Math.min(GRADE_STEPS.length - 1, tier.gradeIdx))],
        current: tier.id === profile.planIntensity,
      };
    });
  }, [exams, profile, weeksUntilLast, gi, sessionMinDefault]);

  function selectTier(tierId) {
    if (tierId === profile.planIntensity || !window.saveProfile) return;
    window.saveProfile({ planIntensity: tierId });
    setRefreshKey((k) => k + 1);
  }

  // ── Weekly load bars ─────────────────────────────────────────────────────
  const weeklyLoad = React.useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const buckets = {};
    pending.forEach(s => {
      const d = new Date(s.date + "T00:00:00");
      const dow = (d.getDay() + 6) % 7;
      const mon = new Date(d); mon.setDate(d.getDate() - dow);
      const key = window.fmtDateKey(mon);
      if (!buckets[key]) buckets[key] = { hours: 0, count: 0 };
      buckets[key].hours += (s.durationMin ?? sessionMinDefault) / 60;
      buckets[key].count++;
    });
    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 10)
      .map(([key, data], i) => ({
        key,
        label: i === 0 ? L("This wk","Цей","Эта","Cette","Diese") : i === 1 ? L("Next wk","Наст.","Сл.","Proch.","Nächste") : `${L("Wk","Тиж","Нед","Sem","Wo")} ${i + 1}`,
        hours: Math.round(data.hours * 10) / 10,
        count: data.count,
      }));
  }, [pending, sessionMinDefault]);

  // ── Calendar data (2 weeks) ──────────────────────────────────────────────
  const WEEKDAY_SLOTS = ["17:00", "18:00", "19:00"];
  const WEEKEND_SLOTS = ["10:00", "11:15", "14:00", "15:15"];
  function endTime(start) {
    const [h, m] = start.split(":").map(Number);
    const total = h * 60 + m + 45;
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  }

  const calWeeks = React.useMemo(() => {
    const { sessionsByDay } = window.buildScheduleData();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const mon = new Date(today);
    mon.setDate(mon.getDate() - ((today.getDay() + 6) % 7));
    const weeks = [];
    for (let w = 0; w < 2; w++) {
      const days = [];
      for (let d = 0; d < 7; d++) {
        const dt = new Date(mon); dt.setDate(dt.getDate() + w * 7 + d);
        const key = window.fmtDateKey(dt);
        const raw = (sessionsByDay[key] || []).filter(s => s.status !== "completed");
        const isWE = dt.getDay() === 0 || dt.getDay() === 6;
        const slots = isWE ? WEEKEND_SLOTS : WEEKDAY_SLOTS;
        days.push({
          key, dayName: [t.sun, t.mon, t.tue, t.wed, t.thu, t.fri, t.sat][dt.getDay()],
          dayNum: dt.getDate(), isToday: key === window.fmtDateKey(today),
          isSunday: dt.getDay() === 0,
          sessions: raw.map((s, i) => ({ ...s, time: slots[i % slots.length], end: endTime(slots[i % slots.length]) })),
        });
      }
      weeks.push(days);
    }
    return weeks;
  }, []);

  // ── Reasoning cards ──────────────────────────────────────────────────────
  const reasons = [];
  if (weakest && weakest.started) reasons.push({
    icon: "🎯", title: L("Priority scheduling","Пріоритетне планування","Приоритетное планирование","Planification prioritaire","Prioritätsplanung"),
    text: L(
      `${weakest.name} is scheduled most frequently — it has the lowest success probability at ${weakest.gradeProbability}%. Focusing here gives the biggest grade improvement.`,
      `${weakest.name} заплановано найчастіше — найнижча ймовірність успіху ${weakest.gradeProbability}%.`,
      `${weakest.name} запланирован чаще всего — самая низкая вероятность успеха ${weakest.gradeProbability}%.`,
      `${weakest.name} est programmé le plus souvent — probabilité la plus faible à ${weakest.gradeProbability}%.`,
      `${weakest.name} ist am häufigsten geplant — niedrigste Erfolgswahrscheinlichkeit bei ${weakest.gradeProbability}%.`
    ),
  });
  reasons.push({
    icon: "🧠", title: L("Spaced repetition","Інтервальне повторення","Интервальное повторение","Répétition espacée","Verteilte Wiederholung"),
    text: L(
      "Sessions are distributed across days to maximize long-term retention. Cramming is 40% less effective than spaced practice.",
      "Сесії розподілені по днях для максимального запам'ятовування.",
      "Сессии распределены по дням для максимального запоминания.",
      "Les séances sont réparties pour maximiser la rétention à long terme.",
      "Sitzungen sind verteilt, um die Langzeitretention zu maximieren."
    ),
  });
  reasons.push({
    icon: "💤", title: L("Strategic rest","Стратегічний відпочинок","Стратегический отдых","Repos stratégique","Strategische Erholung"),
    text: L(
      "Rest days are built in to prevent burnout and let your brain consolidate. Overwork hurts performance.",
      "Дні відпочинку заплановані для запобігання вигоранню.",
      "Дни отдыха запланированы для предотвращения выгорания.",
      "Des jours de repos sont intégrés pour éviter l'épuisement.",
      "Ruhetage sind eingeplant, um Burnout zu vermeiden."
    ),
  });
  reasons.push({
    icon: "🔄", title: L("Adaptive planning","Адаптивне планування","Адаптивное планирование","Planification adaptative","Adaptive Planung"),
    text: L(
      "If you skip a session, your plan automatically rebuilds around what's left. No guilt — just a new optimal path forward.",
      "Якщо ви пропустите сесію, план автоматично перебудується.",
      "Если вы пропустите сессию, план автоматически перестроится.",
      "Si vous manquez une séance, le plan se reconstruit automatiquement.",
      "Wenn Sie eine Sitzung verpassen, passt sich der Plan automatisch an."
    ),
  });

  const { Button, GaugeRing, ProgressBar } = window.AIExamCoachDesignSystem_99e467;

  // ═══════════════════════════════════════════════════════════════════════════
  // PLANNING ANIMATION PHASE
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === "planning") {
    const pct = Math.round((done / STEPS.length) * 100);
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "linear-gradient(135deg, var(--ink-900) 0%, var(--indigo-800) 40%, var(--indigo-800) 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)", overflow: "hidden" }}>
        {/* Pulsing coach icon */}
        <div style={{ animation: "pulse 2s ease-in-out infinite", marginBottom: 32 }}>
          {window.CoachIcon ? <window.CoachIcon size={72} /> : <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,var(--indigo-500),var(--indigo-500))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, color: "#fff" }}>🧠</div>}
        </div>

        <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 700, color: "#fff", textAlign: "center" }}>
          {L("Building your study plan…","Створюю ваш план…","Создаю ваш план…","Création de votre plan…","Ihr Lernplan wird erstellt…")}
        </h1>
        <p style={{ margin: "0 0 40px", fontSize: 14, color: "rgba(255,255,255,0.6)", textAlign: "center" }}>
          {L("This usually takes a few seconds","Зазвичай це займає кілька секунд","Обычно это занимает несколько секунд","Cela prend quelques secondes","Das dauert nur wenige Sekunden")}
        </p>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 400, padding: "0 24px" }}>
          {STEPS.map((s, i) => {
            const visible = i < done;
            const checked = i < done - 1 || (i === STEPS.length - 1 && done > STEPS.length);
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12,
                opacity: visible ? 1 : 0, transform: visible ? "translateX(0)" : "translateX(-20px)",
                transition: "opacity 0.4s ease, transform 0.4s ease",
              }}>
                <span style={{ fontSize: 18, width: 28, textAlign: "center", flexShrink: 0 }}>
                  {checked ? <span style={{ color: "var(--emerald-300)", animation: "fadeUp 0.3s ease" }}>✓</span> : s.icon}
                </span>
                <span style={{ fontSize: 14, color: checked ? "rgba(255,255,255,0.5)" : "#fff", transition: "color 0.3s ease" }}>{s.text}</span>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "rgba(255,255,255,0.1)" }}>
          <div style={{ height: "100%", width: "100%", transform: `scaleX(${pct / 100})`, transformOrigin: "left", background: "linear-gradient(90deg, var(--indigo-500), var(--indigo-500))", transition: "transform 0.6s ease", borderRadius: "0 2px 2px 0" }} />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PLAN REVEAL PHASE
  // ═══════════════════════════════════════════════════════════════════════════
  const riskColor = overallProb >= 60 ? "var(--emerald-600)" : overallProb >= 35 ? "var(--amber-600)" : "var(--red-500)";
  const riskLabel = overallProb >= 60 ? L("Low risk","Низький ризик","Низкий риск","Risque faible","Geringes Risiko") : overallProb >= 35 ? L("Medium risk","Середній ризик","Средний риск","Risque moyen","Mittleres Risiko") : L("High risk","Високий ризик","Высокий риск","Risque élevé","Hohes Risiko");

  const StatCard = ({ value, label, sub }) => (
    <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", padding: "16px 12px", textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-strong)", fontFamily: "var(--font-mono)" }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "var(--surface-page)", overflowY: "auto", fontFamily: "var(--font-sans)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: 40, animation: "fadeUp 0.6s ease both" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            {window.CoachIcon ? <window.CoachIcon size={36} /> : null}
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--indigo-600)" }}>
              {L("Your AI Study Plan","Ваш AI план навчання","Ваш AI план обучения","Votre plan d'étude IA","Ihr KI-Lernplan")}
            </span>
            <button onClick={scrollToWhy} aria-label={L("Why this plan?","Чому цей план?","Почему этот план?","Pourquoi ce plan ?","Warum dieser Plan?")}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, border: "1px solid var(--indigo-200, var(--indigo-200))", background: "var(--surface-card)", color: "var(--indigo-600)", borderRadius: "var(--radius-full)", padding: "3px 10px 3px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
              <span style={{ display: "inline-flex", width: 15, height: 15, borderRadius: "50%", background: "var(--indigo-600)", color: "#fff", alignItems: "center", justifyContent: "center", fontSize: 10, fontStyle: "italic", fontWeight: 700 }}>i</span>
              {L("Why this plan?","Чому цей?","Почему?","Pourquoi ?","Warum?")}
            </button>
          </div>
          <h1 style={{ margin: "0 0 24px", fontSize: 36, fontWeight: 800, color: "var(--text-strong)", lineHeight: 1.2 }}>
            {L("Everything is planned.","Все заплановано.","Всё спланировано.","Tout est planifié.","Alles ist geplant.")}
            <br />
            <span style={{ color: "var(--indigo-600)" }}>{L("Just follow the plan.","Просто дотримуйтесь плану.","Просто следуйте плану.","Suivez le plan.","Folgen Sie dem Plan.")}</span>
          </h1>
        </div>

        {/* ── Plan intensity tiers ────────────────────────────── */}
        <div style={{ marginBottom: 24, animation: "fadeUp 0.6s ease 0.08s both" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-strong)" }}>
              {L("Study intensity","Інтенсивність","Интенсивность","Intensité","Intensität")}
            </h2>
            <span style={{ fontSize: 13, color: "var(--text-faint)" }}>
              {L("— based on your availability","— за вашим бюджетом","— по вашему бюджету","— selon vos disponibilités","— basierend auf Ihrer Zeit")}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {TIERS.map(tier => (
              <button key={tier.id} type="button" onClick={() => selectTier(tier.id)} style={{
                borderRadius: "var(--radius-xl)",
                border: tier.current ? `2px solid ${tier.color}` : "1px solid var(--border-default)",
                background: tier.current ? tier.color + "0d" : "var(--surface-card)",
                padding: "16px 14px",
                position: "relative",
                textAlign: "left", cursor: "pointer", fontFamily: "var(--font-sans)",
                transition: "border-color 0.15s ease, background 0.15s ease",
              }}>
                {tier.current && (
                  <div style={{ position: "absolute", top: 8, right: 10, fontSize: 10, fontWeight: 700, color: tier.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    ✓ {L("Your plan","Ваш план","Ваш план","Votre plan","Ihr Plan")}
                  </div>
                )}
                <div style={{ fontSize: 14, fontWeight: 700, color: tier.color, marginBottom: 4 }}>{tier.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text-strong)", fontFamily: "var(--font-mono)", lineHeight: 1 }}>
                  {tier.hpw}
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-muted)" }}>{L("h/wk","год/тижд","ч/нед","h/sem","Std./Wo")}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-body)", margin: "6px 0 4px" }}>
                  {L("Predicted","Прогноз","Прогноз","Prévu","Prognose")} <strong style={{ color: tier.color }}>{tier.grade}</strong>
                  <span style={{ color: "var(--text-faint)" }}> · {tier.spw} {L("sess/wk","сес/тиж","сес/нед","séan/sem","Sit/Wo")}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-faint)", lineHeight: 1.4 }}>{tier.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Overall prediction ───────────────────────────────── */}
        <div style={{ background: "linear-gradient(135deg, var(--indigo-50), var(--indigo-50))", borderRadius: "var(--radius-2xl)", border: "1px solid var(--border-subtle)", padding: 32, marginBottom: 24, animation: "fadeUp 0.6s ease 0.1s both" }}>
          {!anyStarted ? (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <div style={{ fontSize: 32 }}>🌱</div>
              <p style={{ margin: "10px 0 0", fontSize: 15, fontWeight: 600, color: "var(--text-strong)" }}>
                {L("Forecast unlocks after your first session","Прогноз з'явиться після першої сесії","Прогноз появится после первой сессии","La prévision se débloque après votre première séance","Prognose nach der ersten Sitzung verfügbar")}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
                {L("A real grade prediction needs real data — start studying and it'll show up here.","Реальний прогноз потребує реальних даних — почніть навчання, і він з'явиться тут.","Реальному прогнозу нужны реальные данные — начните учиться, и он появится здесь.","Une vraie prévision a besoin de vraies données — commencez à étudier.","Eine echte Prognose braucht echte Daten — fang an zu lernen.")}
              </p>
            </div>
          ) : (<>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 40, flexWrap: "wrap" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 64, fontWeight: 800, color: "var(--indigo-600)", fontFamily: "var(--font-mono)", lineHeight: 1 }}>{overallGrade}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginTop: 4 }}>{L("Predicted grade","Прогнозована оцінка","Прогнозируемая оценка","Note prévue","Prognostizierte Note")}</div>
            </div>
            <div style={{ width: 1, height: 60, background: "var(--border-subtle)" }} />
            <div style={{ textAlign: "center" }}>
              <GaugeRing value={overallProb} size={90} />
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginTop: 4 }}>{L("Success probability","Ймовірність успіху","Вероятность успеха","Probabilité de succès","Erfolgswahrscheinlichkeit")}</div>
            </div>
            <div style={{ width: 1, height: 60, background: "var(--border-subtle)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: riskColor }}>{riskLabel}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginTop: 4 }}>{L("Risk level","Рівень ризику","Уровень риска","Niveau de risque","Risikoniveau")}</div>
            </div>
          </div>

          {/* Per-course breakdown */}
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
            {active.map(c => {
              const pc = c.gradeProbability >= 60 ? "var(--emerald-600)" : c.gradeProbability >= 40 ? "var(--amber-600)" : "var(--red-500)";
              return (
                <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr auto 100px 50px", alignItems: "center", gap: 12 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, color: "var(--text-body)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />{c.name}
                  </span>
                  {c.started ? (<>
                    <span style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      {c.predictedGrade} → <strong style={{ color: "var(--indigo-700)" }}>{c.targetGrade}</strong>
                    </span>
                    <ProgressBar value={c.gradeProbability} autoColor />
                    <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: pc }}>{c.gradeProbability}%</span>
                  </>) : (
                    <span style={{ gridColumn: "2 / -1", textAlign: "right", fontSize: 12, color: "var(--text-faint)" }}>
                      {L("Not started yet","Ще не почато","Ещё не начато","Pas encore commencé","Noch nicht begonnen")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          </>)}
        </div>

        {/* ── Stats grid ──────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24, animation: "fadeUp 0.6s ease 0.2s both" }}>
          <StatCard value={totalSessions} label={L("Sessions","Сесії","Сессии","Séances","Sitzungen")} sub={L("total planned","всього","всего","au total","insgesamt")} />
          <StatCard value={`${totalHours}h`} label={L("Study hours","Годин","Часов","Heures","Stunden")} sub={L("estimated","орієнтовно","примерно","estimé","geschätzt")} />
          <StatCard value={`${sessionsPerWeek}/wk`} label={L("Sessions/week","Сесій/тижд.","Сессий/нед.","Séances/sem.","Sitz./Woche")} sub={L("recommended","рекомендовано","рекомендовано","recommandé","empfohlen")} />
          <StatCard value={`${profile.weeklyHours}h`} label={L("Hours/week","Годин/тижд.","Часов/нед.","Heures/sem.","Std./Woche")} sub={L("your availability","ваш час","ваше время","vos disponibilités","Ihre Verfügbarkeit")} />
          <StatCard value={restDayCount} label={L("Rest days","Дні відп.","Дни отд.","Jours repos","Ruhetage")} sub={L("built in","заплановано","запланировано","intégrés","eingeplant")} />
          <StatCard value={lastExamDateStr} label={L("Last exam","Ост. іспит","Посл. экзамен","Dernier exam","Letzte Prüfung")} sub={`${lastExamDays} ${L("days away","днів","дней","jours","Tage")}`} />
        </div>

        {/* ── Weekly load bars ────────────────────────────────── */}
        {weeklyLoad.length > 0 && (
          <div style={{ marginBottom: 24, animation: "fadeUp 0.6s ease 0.25s both", background: "var(--surface-card)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", padding: "20px 20px 16px" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-strong)" }}>
                {L("Week-by-week load","Навантаження по тижнях","Нагрузка по неделям","Charge hebdomadaire","Wöchentliche Last")}
              </h2>
              <span style={{ fontSize: 12, color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>
                {totalHours}h {L("total","всього","всего","au total","gesamt")}
              </span>
            </div>
            {(() => {
              const maxH = Math.max(...weeklyLoad.map(w => w.hours), 0.1);
              return (
                <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80 }}>
                  {weeklyLoad.map(w => (
                    <div key={w.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                      {w.hours > 0 && (
                        <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)", lineHeight: 1 }}>{w.hours}h</div>
                      )}
                      <div style={{
                        width: "100%",
                        height: "52px",
                        transform: `scaleY(${Math.max(4 / 52, w.hours / maxH)})`,
                        transformOrigin: "bottom",
                        background: w.hours === 0 ? "var(--border-default)" : "linear-gradient(180deg, var(--indigo-500), var(--indigo-600))",
                        borderRadius: "3px 3px 0 0",
                        opacity: w.hours === 0 ? 0.35 : 0.9,
                        transition: "transform 0.4s ease",
                      }} />
                      <div style={{ fontSize: 8, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.03em", textAlign: "center", lineHeight: 1.2, whiteSpace: "nowrap" }}>{w.label}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-faint)" }}>
              {studyDayCount} {L("study days planned","навчальних днів","учебных дней","jours d'étude prévus","Lerntage geplant")} · {sessionsPerWeek} {L("sessions/week avg","сесій/тижд. сер.","сессий/нед. сред.","séances/sem moy.","Sit/Woche Ø")}
            </div>
          </div>
        )}

        {/* ── Weekly Calendar ─────────────────────────────────── */}
        <div style={{ marginBottom: 24, animation: "fadeUp 0.6s ease 0.3s both" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700, color: "var(--text-strong)" }}>
            {L("Your study schedule","Ваш розклад","Ваше расписание","Votre emploi du temps","Ihr Lernplan")}
          </h2>
          {calWeeks.map((week, wi) => (
            <div key={wi} style={{ marginBottom: 16 }}>
              <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-faint)" }}>
                {wi === 0 ? L("This week","Цей тиждень","Эта неделя","Cette semaine","Diese Woche") : L("Next week","Наступний тиждень","Следующая неделя","Semaine prochaine","Nächste Woche")}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                {week.map(day => (
                  <div key={day.key} style={{
                    borderRadius: "var(--radius-lg)", padding: 8, minHeight: 100,
                    background: day.isToday ? "var(--indigo-50)" : day.isSunday ? "var(--surface-sunken)" : "var(--surface-card)",
                    border: day.isToday ? "2px solid var(--indigo-500)" : "1px solid var(--border-default)",
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: day.isToday ? "var(--indigo-600)" : "var(--text-faint)", textTransform: "uppercase", marginBottom: 4 }}>
                      {day.dayName} {day.dayNum}
                    </div>
                    {day.isSunday && day.sessions.length === 0 && (
                      <div style={{ fontSize: 10, color: "var(--text-faint)", fontStyle: "italic", marginTop: 8 }}>
                        {L("Rest day","Відпочинок","Отдых","Repos","Ruhetag")} 😴
                      </div>
                    )}
                    {day.sessions.map((s, si) => (
                      <div key={si} style={{
                        marginBottom: 4, padding: "4px 6px", borderRadius: 6,
                        background: s.color + "18", borderLeft: `3px solid ${s.color}`,
                        fontSize: 10, lineHeight: 1.4,
                      }}>
                        <div style={{ fontWeight: 700, color: "var(--text-strong)" }}>{s.time}–{s.end}</div>
                        <div style={{ color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.subject}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Reasoning cards ─────────────────────────────────── */}
        <div ref={reasonsRef} style={{ marginBottom: 40, scrollMarginTop: 16, animation: "fadeUp 0.6s ease 0.4s both", borderRadius: "var(--radius-2xl)", padding: whyGlow ? 16 : 0, background: whyGlow ? "var(--indigo-50)" : "transparent", transition: "background 0.4s ease" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700, color: "var(--text-strong)" }}>
            💡 {L("Why this plan?","Чому саме цей план?","Почему именно этот план?","Pourquoi ce plan ?","Warum dieser Plan?")}
          </h2>
          {/* Plain-language summary of the exact numbers above, so "why THIS plan"
              is answered concretely, not just with generic principles. */}
          <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-body)", lineHeight: 1.6, background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", padding: 16 }}>
            {L(
              `You told us you can study ${profile.weeklyHours}h a week, and your last exam is ${lastExamDays} days out. So we scheduled ${totalSessions} focused sessions (~${totalHours}h) — about ${sessionsPerWeek} a week — starting this week and spaced out to just before each exam. ${weakest ? `${weakest.name} gets the most slots because it's your lowest predicted grade right now.` : ""} ${restDayCount} rest day${restDayCount === 1 ? "" : "s"} are built in so you don't burn out.`,
              `Ви вказали ${profile.weeklyHours}год/тиждень, а останній іспит через ${lastExamDays} днів. Тож ми запланували ${totalSessions} сесій (~${totalHours}год) — близько ${sessionsPerWeek}/тиждень — починаючи з цього тижня. ${weakest ? `${weakest.name} отримує найбільше сесій — найнижчий прогноз.` : ""}`,
              `Вы указали ${profile.weeklyHours}ч/неделю, а последний экзамен через ${lastExamDays} дней. Поэтому мы запланировали ${totalSessions} сессий (~${totalHours}ч) — около ${sessionsPerWeek}/неделю — начиная с этой недели. ${weakest ? `${weakest.name} получает больше всего сессий — самый низкий прогноз.` : ""}`,
              `Vous étudiez ${profile.weeklyHours}h/semaine, dernier examen dans ${lastExamDays} jours. Nous avons planifié ${totalSessions} séances (~${totalHours}h) — env. ${sessionsPerWeek}/semaine — dès cette semaine. ${weakest ? `${weakest.name} a le plus de séances.` : ""}`,
              `Du lernst ${profile.weeklyHours}h/Woche, letzte Prüfung in ${lastExamDays} Tagen. Wir haben ${totalSessions} Einheiten (~${totalHours}h) geplant — ca. ${sessionsPerWeek}/Woche — ab dieser Woche. ${weakest ? `${weakest.name} bekommt die meisten Einheiten.` : ""}`
            )}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {reasons.map((r, i) => (
              <div key={i} style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{r.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-strong)" }}>{r.title}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{r.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA ─────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", animation: "fadeUp 0.6s ease 0.5s both" }}>
          <button onClick={onStart} style={{
            border: "none", borderRadius: "var(--radius-2xl)", padding: "18px 48px",
            background: "linear-gradient(135deg, var(--indigo-600), var(--indigo-600))",
            color: "#fff", fontSize: 18, fontWeight: 700, cursor: "pointer",
            fontFamily: "var(--font-sans)", boxShadow: "0 8px 30px rgba(34,124,99,0.35)",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(34,124,99,0.45)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(34,124,99,0.35)"; }}
          >
            ✨ {L("Start My AI Plan","Розпочати мій AI план","Начать мой AI план","Démarrer mon plan IA","Meinen KI-Plan starten")} →
          </button>
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--text-faint)" }}>
            {L("Your plan adapts as you study — skip a session and it rebuilds automatically.","Ваш план адаптується — пропустіть сесію і він перебудується.","Ваш план адаптируется — пропустите сессию и он перестроится.","Votre plan s'adapte — manquez une séance et il se reconstruit.","Ihr Plan passt sich an — verpassen Sie eine Sitzung, wird er automatisch angepasst.")}
          </p>
        </div>
      </div>
    </div>
  );
}
window.AIPlan = AIPlan;
