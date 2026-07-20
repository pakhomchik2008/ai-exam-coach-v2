// AI Exam Coach — Mistake Journal, rebuilt as an AI-powered review dashboard.
// Every number on this page is derived from real logged mistakes
// (mistakes-store.jsx) — nothing here is a placeholder or fabricated stat.
// One deliberate naming choice: the top card says "Recovery Rate," not
// "Accuracy" — this app has no record of every question ever answered
// correctly, only the ones logged as wrong, so the only honest percentage
// is "of your logged mistakes, how many have you since fixed."

function mjL(t, en, uk, ru, fr, de) { return { en, uk, ru, fr, de }[(t && t.code) || "en"] || en; }

function mjTimeFilters(t) {
  return [
    { id: "all", label: mjL(t, "All time", "Весь час", "Всё время", "Tout le temps", "Gesamte Zeit") },
    { id: "7d", label: mjL(t, "Last 7 days", "Останні 7 днів", "Последние 7 дней", "7 derniers jours", "Letzte 7 Tage") },
    { id: "30d", label: mjL(t, "Last 30 days", "Останні 30 днів", "Последние 30 дней", "30 derniers jours", "Letzte 30 Tage") },
  ];
}
function mjSorts(t) {
  return [
    { id: "newest", label: mjL(t, "Newest", "Спочатку нові", "Сначала новые", "Plus récent", "Neueste") },
    { id: "oldest", label: mjL(t, "Oldest", "Спочатку старі", "Сначала старые", "Plus ancien", "Älteste") },
  ];
}

function mjFmtDuration(ms) {
  if (ms == null) return "—";
  const mins = ms / 60000;
  if (mins < 60) return `${Math.round(mins)}m`;
  const hours = mins / 60;
  if (hours < 24) return `${Math.round(hours * 10) / 10}h`;
  return `${Math.round(hours / 24 * 10) / 10}d`;
}
function mjNextQuarterHour() {
  const d = new Date();
  const mins = Math.ceil((d.getHours() * 60 + d.getMinutes() + 1) / 15) * 15;
  const h = Math.floor(mins / 60) % 24, m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
const MJ_PRIORITY_COLOR = { high: "var(--red-600)", medium: "var(--amber-600)", low: "var(--emerald-600)" };
const MJ_PRIORITY_BG = { high: "var(--red-50)", medium: "var(--amber-50)", low: "var(--emerald-50)" };
function mjPriorityLabel(t, tone) {
  return {
    high: mjL(t, "High Priority", "Високий пріоритет", "Высокий приоритет", "Priorité élevée", "Hohe Priorität"),
    medium: mjL(t, "Medium Priority", "Середній пріоритет", "Средний приоритет", "Priorité moyenne", "Mittlere Priorität"),
    low: mjL(t, "Low Priority", "Низький пріоритет", "Низкий приоритет", "Priorité faible", "Niedrige Priorität"),
  }[tone];
}
function mjPriorityShort(t, tone) {
  return {
    high: mjL(t, "High", "Високий", "Высокий", "Élevé", "Hoch"),
    medium: mjL(t, "Medium", "Середній", "Средний", "Moyen", "Mittel"),
    low: mjL(t, "Low", "Низький", "Низкий", "Faible", "Niedrig"),
  }[tone];
}

function MistakeJournal({ t, onGoToChat, onGoToDashboard }) {
  const L = (en, uk, ru, fr, de) => mjL(t, en, uk, ru, fr, de);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const bump = () => setRefreshKey((k) => k + 1);

  const mistakes = React.useMemo(() => window.getMistakes(), [refreshKey]);
  const exams = React.useMemo(() => window.getExams ? window.getExams() : [], [refreshKey]);
  const examById = React.useMemo(() => new Map(exams.map((e) => [e.id, e])), [exams]);
  const summary = React.useMemo(() => window.computeMistakeSummary(), [refreshKey]);
  const topics = React.useMemo(() => window.computeTopicBreakdown(), [refreshKey]);
  const queue = React.useMemo(() => window.computeReviewQueue(), [refreshKey]);
  const trends = React.useMemo(() => window.computeMistakeTrends(6), [refreshKey]);
  const badges = React.useMemo(() => window.computeMistakeBadges(), [refreshKey]);
  const xp = React.useMemo(() => window.xpLevel ? window.xpLevel() : null, [refreshKey]);

  const mjSubject = React.useCallback((m) => examById.get(m.examId)?.name || m.topic || L("General", "Загальне", "Общее", "Général", "Allgemein"), [examById, t]);
  const subjects = React.useMemo(() => [...new Set(mistakes.map(mjSubject))].sort(), [mistakes, mjSubject]);

  const [statusFilter, setStatusFilter] = React.useState("all"); // all | pending | recovered | repeated | high-priority
  const [subjectFilter, setSubjectFilter] = React.useState("all");
  const [timeFilter, setTimeFilter] = React.useState("all");
  const [sortOrder, setSortOrder] = React.useState("newest");
  const [search, setSearch] = React.useState("");
  const [openId, setOpenId] = React.useState(null);
  const reviewSectionRef = React.useRef(null);

  const priorityByTopic = React.useMemo(() => new Map(topics.map((tp) => [tp.topic, tp.priority])), [topics]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    let list = mistakes.filter((m) => {
      if (statusFilter === "pending" && m.status !== "pending") return false;
      if (statusFilter === "recovered" && m.status !== "recovered") return false;
      if (statusFilter === "repeated" && m.wrongCount < 2) return false;
      if (statusFilter === "high-priority" && priorityByTopic.get(m.topic) !== "high") return false;
      if (subjectFilter !== "all" && mjSubject(m) !== subjectFilter) return false;
      if (timeFilter === "7d" && now - m.at > 7 * DAY_MS_MJ) return false;
      if (timeFilter === "30d" && now - m.at > 30 * DAY_MS_MJ) return false;
      if (q) {
        const hay = `${m.question} ${m.topic} ${mjSubject(m)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = list.slice().sort((a, b) => sortOrder === "oldest" ? a.at - b.at : b.at - a.at);
    return list;
  }, [mistakes, statusFilter, subjectFilter, timeFilter, sortOrder, search, priorityByTopic, mjSubject]);

  function scrollToReview() {
    if (reviewSectionRef.current) reviewSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function startReviewOn(topicName) {
    setStatusFilter("pending");
    setSubjectFilter("all");
    const first = mistakes.find((m) => m.topic === topicName && m.status !== "recovered");
    if (first) setOpenId(first.id);
    scrollToReview();
  }
  function createStudySessionForTopic(tp) {
    if (!window.addManualSession) return;
    window.addManualSession({
      examId: tp.examId || null,
      type: tp.examId ? "study" : "personal",
      category: tp.examId ? null : "custom",
      personalColor: tp.examId ? null : "var(--indigo-500)",
      topic: `${L("Review", "Повторення", "Повторение", "Révision", "Wiederholung")}: ${tp.topic}`,
      date: window.fmtDateKey(new Date()),
      startTime: mjNextQuarterHour(),
      durationMin: Math.max(15, tp.estReviewMin),
    });
    bump();
  }

  if (mistakes.length === 0) {
    return <MJEmptyState t={t} onGoToDashboard={onGoToDashboard} onGoToChat={onGoToChat} />;
  }

  const weakest = topics[0] || null;
  const priorityTopicName = (queue.overdue[0] || queue.dueToday[0])?.topic;
  const priorityTopic = topics.find((tp) => tp.topic === priorityTopicName) || weakest;
  const recoveredToday = mistakes.filter((m) => m.status === "recovered" && m.recoveredAt && window.fmtDateKey(new Date(m.recoveredAt)) === window.fmtDateKey(new Date()));
  const dueTodayTotal = queue.dueToday.length + recoveredToday.length;
  const dueTodayCompletionPct = dueTodayTotal ? Math.round((recoveredToday.length / dueTodayTotal) * 100) : (queue.dueToday.length ? 0 : 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", fontFamily: "var(--font-sans)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>{L("Mistake Journal", "Журнал помилок", "Журнал ошибок", "Journal des erreurs", "Fehlerjournal")}</h1>
          <p style={{ margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{L("Your AI coach's map of what's holding your grade back — and exactly what to fix next.", "Карта вашого AI-коуча: що стримує вашу оцінку — і що виправити далі.", "Карта вашего AI-коуча: что сдерживает вашу оценку — и что исправить дальше.", "La carte de votre coach IA : ce qui freine votre note — et quoi corriger ensuite.", "Die Karte deines KI-Coaches: was deine Note bremst — und was als Nächstes zu tun ist.")}</p>
        </div>
        <button onClick={() => { window.clearAllMistakes(); bump(); }} style={{ border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-muted)", borderRadius: "var(--radius-lg)", padding: "8px 14px", fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)", cursor: "pointer", fontFamily: "var(--font-sans)", whiteSpace: "nowrap" }}>
          {L("Clear all", "Очистити все", "Очистить всё", "Tout effacer", "Alles löschen")}
        </button>
      </div>

      {/* Section 1 — analytics header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        <MJStatCard value={summary.recoveryRate != null ? `${summary.recoveryRate}%` : "—"} label={L("Recovery Rate", "Рівень відновлення", "Уровень восстановления", "Taux de récupération", "Erholungsrate")} color="var(--indigo-600)" />
        <MJStatCard value={summary.pendingCount} label={L("Mistakes Remaining", "Залишилось помилок", "Осталось ошибок", "Erreurs restantes", "Verbleibende Fehler")} color="var(--red-600)" />
        <MJStatCard value={summary.recoveredCount} label={L("Recovered", "Виправлено", "Исправлено", "Récupérées", "Behoben")} color="var(--emerald-600)" />
        <MJStatCard value={summary.dueTodayCount} label={L("Today's Reviews", "Повторення сьогодні", "Повторения сегодня", "Révisions du jour", "Heutige Wiederholungen")} color="var(--amber-600)" />
        <MJStatCard value={`${summary.streak}🔥`} label={L("Current Streak", "Поточна серія", "Текущая серия", "Série actuelle", "Aktuelle Serie")} color={summary.streak > 0 ? "var(--amber-600)" : "var(--text-faint)"} />
        <MJStatCard value={mjFmtDuration(summary.avgRecoveryMs)} label={L("Avg. Recovery Time", "Сер. час відновлення", "Сред. время восстановления", "Temps moyen de récupération", "Ø Erholungszeit")} color="var(--indigo-600)" />
      </div>

      {/* Section 2 — AI Insight */}
      {weakest && <MJAiInsight t={t} topic={weakest} onGoToChat={onGoToChat} onStartReview={() => startReviewOn(weakest.topic)} />}

      {/* Section 10 — Today's Priority */}
      {priorityTopic && <MJTodaysPriority t={t} topic={priorityTopic} onStartReview={() => startReviewOn(priorityTopic.topic)} />}

      {/* Section 11 — AI Actions */}
      <MJAiActions
        t={t} topics={topics} pendingCount={summary.pendingCount}
        onGoToChat={onGoToChat}
        onExplainAll={() => onGoToChat && onGoToChat(`I have ${summary.pendingCount} unresolved mistakes across these topics: ${topics.map((tp) => tp.topic).join(", ")}. What's the common thread, and what should I focus on first?`)}
        onSnoozeAll={() => { window.snoozeOverdueMistakes(); bump(); }}
        onReviewDueToday={scrollToReview}
        onCreateSession={() => weakest && createStudySessionForTopic(weakest)}
      />

      {/* Section 12 — gamification */}
      <MJGamification t={t} xp={xp} summary={summary} badges={badges} />

      {/* Section 3 — weakest topics */}
      <div>
        <h2 style={{ margin: "0 0 10px", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text-strong)" }}>{L("Weakest Topics", "Найслабші теми", "Самые слабые темы", "Sujets les plus faibles", "Schwächste Themen")}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {topics.map((tp) => <MJTopicRow key={tp.topic} t={t} tp={tp} onStartReview={() => startReviewOn(tp.topic)} />)}
        </div>
      </div>

      {/* Section 4 — trends */}
      <MJTrends t={t} trends={trends} />

      {/* Section 5 — review queue */}
      <div ref={reviewSectionRef}>
        <h2 style={{ margin: "0 0 10px", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text-strong)" }}>{L("Review Queue", "Черга повторення", "Очередь повторения", "File de révision", "Wiederholungswarteschlange")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          <MJQueueCard t={t} label={L("Overdue", "Прострочено", "Просрочено", "En retard", "Überfällig")} items={queue.overdue} accent="var(--red-600)" onStartReview={() => { setStatusFilter("pending"); scrollToReview(); }} />
          <MJQueueCard t={t} label={L("Due Today", "На сьогодні", "На сегодня", "Aujourd'hui", "Heute fällig")} items={queue.dueToday} accent="var(--amber-600)" completionPct={dueTodayCompletionPct} onStartReview={() => { setStatusFilter("pending"); scrollToReview(); }} />
          <MJQueueCard t={t} label={L("Tomorrow", "Завтра", "Завтра", "Demain", "Morgen")} items={queue.dueTomorrow} accent="var(--indigo-600)" onStartReview={() => { setStatusFilter("pending"); scrollToReview(); }} />
          <MJQueueCard t={t} label={L("Later", "Пізніше", "Позже", "Plus tard", "Später")} items={queue.later} accent="var(--text-faint)" onStartReview={() => { setStatusFilter("pending"); scrollToReview(); }} />
        </div>
      </div>

      {/* Section 6+7 — filters & search */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={L("Search by question, topic, or subject…", "Пошук за питанням, темою або предметом…", "Поиск по вопросу, теме или предмету…", "Rechercher par question, sujet ou matière…", "Suche nach Frage, Thema oder Fach…")}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", color: "var(--text-strong)", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-full)", outline: "none" }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <MJChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>{L("All", "Усі", "Все", "Tous", "Alle")}</MJChip>
          <MJChip active={statusFilter === "pending"} onClick={() => setStatusFilter("pending")}>{L("Unreviewed", "Не переглянуто", "Не просмотрено", "Non révisées", "Nicht wiederholt")}</MJChip>
          <MJChip active={statusFilter === "recovered"} onClick={() => setStatusFilter("recovered")}>{L("Reviewed", "Переглянуто", "Просмотрено", "Révisées", "Wiederholt")}</MJChip>
          <MJChip active={statusFilter === "repeated"} onClick={() => setStatusFilter("repeated")}>{L("Repeated Mistakes", "Повторні помилки", "Повторные ошибки", "Erreurs répétées", "Wiederholte Fehler")}</MJChip>
          <MJChip active={statusFilter === "high-priority"} onClick={() => setStatusFilter("high-priority")}>{L("High Priority", "Високий пріоритет", "Высокий приоритет", "Priorité élevée", "Hohe Priorität")}</MJChip>
          {subjects.map((s) => (
            <MJChip key={s} active={subjectFilter === s} onClick={() => setSubjectFilter(subjectFilter === s ? "all" : s)}>{s}</MJChip>
          ))}
          {mjTimeFilters(t).map((f) => (
            <MJChip key={f.id} active={timeFilter === f.id} onClick={() => setTimeFilter(f.id)}>{f.label}</MJChip>
          ))}
          {mjSorts(t).map((s) => (
            <MJChip key={s.id} active={sortOrder === s.id} onClick={() => setSortOrder(s.id)}>{s.label}</MJChip>
          ))}
        </div>
      </div>

      {/* Section 8+9 — mistake cards */}
      {filtered.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-faint)", textAlign: "center", padding: "var(--space-6) 0" }}>{L("No mistakes match these filters.", "Жодна помилка не відповідає цим фільтрам.", "Ни одна ошибка не соответствует этим фильтрам.", "Aucune erreur ne correspond à ces filtres.", "Keine Fehler entsprechen diesen Filtern.")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {filtered.map((m) => (
            <MJMistakeCard key={m.id} t={t} m={m} subject={mjSubject(m)} open={openId === m.id}
              onToggle={() => setOpenId(openId === m.id ? null : m.id)}
              onRetryDone={bump}
              onRemove={() => { window.clearMistake(m.id); bump(); }}
              onGoToChat={onGoToChat} />
          ))}
        </div>
      )}
    </div>
  );
}

const DAY_MS_MJ = 86400000;

// ─── Section 1 — stat card ──────────────────────────────────────────────────

function MJStatCard({ value, label, color }) {
  return (
    <div style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)", padding: "14px 12px", textAlign: "center", transition: "transform 0.15s ease, box-shadow 0.15s ease" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "var(--font-mono)", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ─── Section 2 — AI Insight ─────────────────────────────────────────────────

function MJAiInsight({ t, topic, onGoToChat, onStartReview }) {
  const L = (en, uk, ru, fr, de) => mjL(t, en, uk, ru, fr, de);
  const gain = Math.min(15, Math.max(2, Math.round((100 - topic.masteryPct) * 0.15)));
  return (
    <div style={{ borderRadius: "var(--radius-2xl)", background: "linear-gradient(135deg, var(--indigo-50), var(--indigo-50))", border: "1px solid var(--indigo-100)", padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}>✨</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--indigo-700)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{L("AI Insight", "AI-інсайт", "AI-инсайт", "Analyse IA", "KI-Einblick")}</span>
      </div>
      <p style={{ margin: 0, fontSize: "var(--text-base)", color: "var(--text-strong)", lineHeight: 1.5 }}>
        {L(
          `You consistently struggle with ${topic.topic} — ${topic.pendingHere} mistake${topic.pendingHere === 1 ? "" : "s"} still unresolved, ${topic.masteryPct}% recovered so far.`,
          `Ви постійно маєте труднощі з темою «${topic.topic}» — ще ${topic.pendingHere} помилок не виправлено, ${topic.masteryPct}% вже відновлено.`,
          `Вы постоянно испытываете трудности с темой «${topic.topic}» — ещё ${topic.pendingHere} ошибок не исправлено, ${topic.masteryPct}% уже восстановлено.`,
          `Vous avez régulièrement des difficultés avec « ${topic.topic} » — ${topic.pendingHere} erreur(s) encore non résolue(s), ${topic.masteryPct}% récupéré jusqu'ici.`,
          `Du hast wiederholt Schwierigkeiten mit „${topic.topic}" — noch ${topic.pendingHere} ungelöste Fehler, bisher ${topic.masteryPct}% behoben.`
        )}
      </p>
      <div style={{ fontSize: 13, color: "var(--text-body)", lineHeight: 1.8 }}>
        <div>• {L("Review", "Повторити", "Повторить", "Réviser", "Wiederholen")} <strong>{topic.topic}</strong></div>
        <div>• {L(`Complete ${topic.pendingHere} practice question${topic.pendingHere === 1 ? "" : "s"}`, `Виконати ${topic.pendingHere} практичних питань`, `Выполнить ${topic.pendingHere} практических вопросов`, `Terminer ${topic.pendingHere} question(s) d'entraînement`, `${topic.pendingHere} Übungsfragen abschließen`)}</div>
        <div>• {L("Estimated readiness increase:", "Очікуване зростання готовності:", "Ожидаемый рост готовности:", "Augmentation de préparation estimée :", "Geschätzte Steigerung der Bereitschaft:")} <strong style={{ color: "var(--indigo-700)" }}>+{gain}%</strong></div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
        <button onClick={onStartReview} style={{ border: "none", background: "var(--indigo-600)", color: "#fff", borderRadius: "var(--radius-lg)", padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>{L("Start Review", "Почати повторення", "Начать повторение", "Commencer la révision", "Wiederholung starten")}</button>
        <button onClick={() => onGoToChat && onGoToChat(`I keep getting "${topic.topic}" questions wrong. Can you explain what's likely tripping me up and how to fix it?`)}
          style={{ border: "1px solid var(--indigo-200)", background: "var(--surface-card)", color: "var(--indigo-700)", borderRadius: "var(--radius-lg)", padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>{L("Explain Weakness", "Пояснити слабкість", "Объяснить слабость", "Expliquer la faiblesse", "Schwäche erklären")}</button>
        <button onClick={() => onGoToChat && onGoToChat({ mode: "learn", topic: topic.topic })}
          style={{ border: "1px solid var(--indigo-200)", background: "var(--surface-card)", color: "var(--indigo-700)", borderRadius: "var(--radius-lg)", padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>{L("Generate Lesson", "Створити урок", "Создать урок", "Générer une leçon", "Lektion erstellen")}</button>
      </div>
    </div>
  );
}

// ─── Section 10 — Today's Priority ──────────────────────────────────────────

function MJTodaysPriority({ t, topic, onStartReview }) {
  const L = (en, uk, ru, fr, de) => mjL(t, en, uk, ru, fr, de);
  const gain = Math.min(15, Math.max(2, Math.round((100 - topic.masteryPct) * 0.15)));
  return (
    <div style={{ borderRadius: "var(--radius-2xl)", border: `1.5px solid ${MJ_PRIORITY_COLOR[topic.priority]}33`, background: MJ_PRIORITY_BG[topic.priority], padding: "var(--space-4) var(--space-5)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: MJ_PRIORITY_COLOR[topic.priority], textTransform: "uppercase", letterSpacing: "0.05em" }}>{L("Today's Priority", "Пріоритет на сьогодні", "Приоритет на сегодня", "Priorité du jour", "Heutige Priorität")}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-strong)", marginTop: 2 }}>{topic.topic}</div>
      </div>
      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>{topic.estReviewMin} {L("min", "хв", "мин", "min", "Min")}</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{L("Est. Time", "Оцін. час", "Оцен. время", "Temps estimé", "Geschätzte Zeit")}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: MJ_PRIORITY_COLOR[topic.priority] }}>{mjPriorityShort(t, topic.priority)}</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{L("Impact", "Вплив", "Влияние", "Impact", "Auswirkung")}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--emerald-600)" }}>+{gain}%</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{L("Grade Increase", "Зростання оцінки", "Рост оценки", "Hausse de note", "Notensteigerung")}</div>
        </div>
      </div>
      <button onClick={onStartReview} style={{ border: "none", background: MJ_PRIORITY_COLOR[topic.priority], color: "#fff", borderRadius: "var(--radius-lg)", padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>{L("Start Now", "Почати зараз", "Начать сейчас", "Commencer maintenant", "Jetzt starten")}</button>
    </div>
  );
}

// ─── Section 11 — AI Actions ────────────────────────────────────────────────

function MJAiActions({ t, topics, pendingCount, onGoToChat, onExplainAll, onSnoozeAll, onReviewDueToday, onCreateSession }) {
  const L = (en, uk, ru, fr, de) => mjL(t, en, uk, ru, fr, de);
  const topicNames = topics.map((tp) => tp.topic).join(", ") || L("your weakest topics", "ваші найслабші теми", "ваши самые слабые темы", "vos sujets les plus faibles", "deine schwächsten Themen");
  const actions = [
    { label: L("Generate Flashcards", "Створити картки", "Создать карточки", "Générer des cartes", "Karteikarten erstellen"), emoji: "🗂️", onClick: () => onGoToChat && onGoToChat(`Make flashcards covering my weakest topics: ${topicNames}`) },
    { label: L("Generate Quiz", "Створити тест", "Создать тест", "Générer un quiz", "Quiz erstellen"), emoji: "📝", onClick: () => onGoToChat && onGoToChat(`Quiz me on: ${topicNames}`) },
    { label: L("Generate Lesson", "Створити урок", "Создать урок", "Générer une leçon", "Lektion erstellen"), emoji: "📖", onClick: () => onGoToChat && onGoToChat({ mode: "learn", topic: topics[0]?.topic }) , disabled: !topics.length },
    { label: L("Explain All", "Пояснити все", "Объяснить всё", "Tout expliquer", "Alles erklären"), emoji: "💡", onClick: onExplainAll, disabled: !pendingCount },
    { label: L("Snooze Overdue", "Відкласти прострочені", "Отложить просроченные", "Reporter les retards", "Überfällige verschieben"), emoji: "😴", onClick: onSnoozeAll },
    { label: L("Review Due Today", "Повторити на сьогодні", "Повторить на сегодня", "Réviser aujourd'hui", "Heute wiederholen"), emoji: "▶️", onClick: onReviewDueToday },
    { label: L("Create Study Session", "Створити сесію навчання", "Создать сессию учёбы", "Créer une séance d'étude", "Lernsitzung erstellen"), emoji: "📅", onClick: onCreateSession, disabled: !topics.length },
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {actions.map((a) => (
        <button key={a.label} onClick={a.onClick} disabled={a.disabled} style={{
          border: "1px solid var(--border-default)", background: "var(--surface-card)", borderRadius: "var(--radius-lg)",
          padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: a.disabled ? "default" : "pointer",
          opacity: a.disabled ? 0.4 : 1, fontFamily: "var(--font-sans)", color: "var(--text-body)", display: "flex", alignItems: "center", gap: 6,
        }}>
          <span>{a.emoji}</span>{a.label}
        </button>
      ))}
    </div>
  );
}

// ─── Section 12 — gamification ──────────────────────────────────────────────

function MJGamification({ t, xp, summary, badges }) {
  const L = (en, uk, ru, fr, de) => mjL(t, en, uk, ru, fr, de);
  return (
    <div style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
        {xp && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--indigo-600)" }}>⭐ {L("Level", "Рівень", "Уровень", "Niveau", "Level")} {xp.level}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{xp.into} / {xp.need} XP</div>
          </div>
        )}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--emerald-600)" }}>{L(`${summary.recoveredCount} fixed`, `${summary.recoveredCount} виправлено`, `${summary.recoveredCount} исправлено`, `${summary.recoveredCount} corrigées`, `${summary.recoveredCount} behoben`)}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{L("Recovered mistakes", "Виправлені помилки", "Исправленные ошибки", "Erreurs récupérées", "Behobene Fehler")}</div>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: summary.streak > 0 ? "var(--amber-600)" : "var(--text-faint)" }}>{summary.streak}🔥</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{L("Review streak", "Серія повторень", "Серия повторений", "Série de révisions", "Wiederholungsserie")}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {badges.map((b) => (
          <div key={b.id} title={b.unlocked ? L("Unlocked", "Розблоковано", "Разблокировано", "Débloqué", "Freigeschaltet") : L("Not yet unlocked", "Ще не розблоковано", "Ещё не разблокировано", "Pas encore débloqué", "Noch nicht freigeschaltet")} style={{
            display: "flex", alignItems: "center", gap: 6, borderRadius: "var(--radius-full)", padding: "5px 12px",
            background: b.unlocked ? "var(--amber-50)" : "var(--surface-muted)", border: `1px solid ${b.unlocked ? "var(--amber-200)" : "var(--border-subtle)"}`,
            fontSize: 11, fontWeight: 700, color: b.unlocked ? "var(--amber-700)" : "var(--text-faint)",
            opacity: b.unlocked ? 1 : 0.6,
          }}>
            <span>{b.emoji}</span>{b.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section 3 — weakest topics ─────────────────────────────────────────────

function MJTopicRow({ t, tp, onStartReview }) {
  const L = (en, uk, ru, fr, de) => mjL(t, en, uk, ru, fr, de);
  return (
    <div style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", padding: "12px var(--space-4)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 140 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-strong)" }}>{tp.topic}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{L(`${tp.mistakes} mistake${tp.mistakes === 1 ? "" : "s"}`, `${tp.mistakes} помилок`, `${tp.mistakes} ошибок`, `${tp.mistakes} erreur(s)`, `${tp.mistakes} Fehler`)}</div>
      </div>
      <div style={{ width: 90 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-strong)" }}>{L(`${tp.masteryPct}% mastery`, `${tp.masteryPct}% засвоєння`, `${tp.masteryPct}% усвоения`, `${tp.masteryPct}% maîtrisé`, `${tp.masteryPct}% beherrscht`)}</div>
        <div style={{ height: 5, background: "var(--surface-sunken)", borderRadius: "var(--radius-full)", overflow: "hidden", marginTop: 3 }}>
          <div style={{ height: "100%", width: `${tp.masteryPct}%`, background: MJ_PRIORITY_COLOR[tp.priority], borderRadius: "var(--radius-full)" }} />
        </div>
      </div>
      <span style={{ borderRadius: "var(--radius-full)", padding: "3px 10px", fontSize: 11, fontWeight: 700, background: MJ_PRIORITY_BG[tp.priority], color: MJ_PRIORITY_COLOR[tp.priority], whiteSpace: "nowrap" }}>
        {mjPriorityLabel(t, tp.priority)}
      </span>
      {tp.pendingHere > 0 && <span style={{ fontSize: 12, color: "var(--text-faint)", whiteSpace: "nowrap" }}>~{tp.estReviewMin} {L("min", "хв", "мин", "min", "Min")}</span>}
      <button onClick={onStartReview} style={{ border: "1px solid var(--border-default)", background: "var(--surface-page)", color: "var(--indigo-600)", borderRadius: "var(--radius-lg)", padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>{L("Review", "Повторити", "Повторить", "Réviser", "Wiederholen")}</button>
    </div>
  );
}

// ─── Section 4 — trends ──────────────────────────────────────────────────────

function MJTrends({ t, trends }) {
  const L = (en, uk, ru, fr, de) => mjL(t, en, uk, ru, fr, de);
  const maxVal = Math.max(1, ...trends.map((w) => Math.max(w.made, w.fixed)));
  const totalMade = trends.reduce((s, w) => s + w.made, 0);
  const totalDays = trends.length * 7;
  const avgPerDay = Math.round((totalMade / totalDays) * 10) / 10;
  return (
    <div style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)", padding: "var(--space-4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text-strong)" }}>{L("Mistake Trends", "Динаміка помилок", "Динамика ошибок", "Tendances des erreurs", "Fehlertrends")}</h2>
        <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{L(`~${avgPerDay} mistakes/day avg`, `~${avgPerDay} помилок/день у середньому`, `~${avgPerDay} ошибок/день в среднем`, `~${avgPerDay} erreurs/jour en moyenne`, `~${avgPerDay} Fehler/Tag im Ø`)}</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
        {trends.map((w) => (
          <div key={w.weekStart} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: "100%" }}>
              <div title={L(`${w.made} made`, `${w.made} зроблено`, `${w.made} сделано`, `${w.made} commises`, `${w.made} gemacht`)} style={{ width: 10, height: `${Math.max(3, (w.made / maxVal) * 70)}px`, background: "var(--red-300, var(--red-400))", borderRadius: 3 }} />
              <div title={L(`${w.fixed} fixed`, `${w.fixed} виправлено`, `${w.fixed} исправлено`, `${w.fixed} corrigées`, `${w.fixed} behoben`)} style={{ width: 10, height: `${Math.max(3, (w.fixed / maxVal) * 70)}px`, background: "var(--emerald-400, var(--emerald-300))", borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 9, color: "var(--text-faint)" }}>{w.weekStart.slice(5)}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 11, color: "var(--text-muted)" }}>
        <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--red-300, var(--red-400))", marginRight: 4 }} />{L("Mistakes made", "Зроблено помилок", "Сделано ошибок", "Erreurs commises", "Fehler gemacht")}</span>
        <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--emerald-400, var(--emerald-300))", marginRight: 4 }} />{L("Recovered", "Виправлено", "Исправлено", "Récupérées", "Behoben")}</span>
      </div>
    </div>
  );
}

// ─── Section 5 — review queue ───────────────────────────────────────────────

function MJQueueCard({ t, label, items, accent, completionPct, onStartReview }) {
  const L = (en, uk, ru, fr, de) => mjL(t, en, uk, ru, fr, de);
  const estMin = Math.max(1, Math.round(items.length * 1.5));
  return (
    <div style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-strong)" }}>{items.length}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{items.length === 1 ? L("question", "питання", "вопрос", "question", "Frage") : L("questions", "питань", "вопросов", "questions", "Fragen")} · {estMin} {L("min", "хв", "мин", "min", "Min")}</div>
      {completionPct != null && (
        <div>
          <div style={{ height: 5, background: "var(--surface-sunken)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: "100%", transform: `scaleX(${completionPct / 100})`, transformOrigin: "left", background: accent, borderRadius: "var(--radius-full)", transition: "transform 0.4s ease" }} />
          </div>
          <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 3 }}>{L(`${completionPct}% completed today`, `${completionPct}% виконано сьогодні`, `${completionPct}% выполнено сегодня`, `${completionPct}% terminé aujourd'hui`, `${completionPct}% heute erledigt`)}</div>
        </div>
      )}
      {items.length > 0 && (
        <button onClick={onStartReview} style={{ alignSelf: "flex-start", border: "none", background: "transparent", color: accent, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0, marginTop: 2 }}>{L("Start Review →", "Почати повторення →", "Начать повторение →", "Commencer la révision →", "Wiederholung starten →")}</button>
      )}
    </div>
  );
}

// ─── Section 6 — filter chip ─────────────────────────────────────────────────

function MJChip({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      border: active ? "1.5px solid var(--indigo-500)" : "1px solid var(--border-default)",
      background: active ? "var(--indigo-50)" : "var(--surface-card)",
      color: active ? "var(--indigo-700)" : "var(--text-muted)",
      borderRadius: "var(--radius-full)", padding: "5px 12px", fontSize: 12, fontWeight: 600,
      cursor: "pointer", fontFamily: "var(--font-sans)", whiteSpace: "nowrap",
    }}>{children}</button>
  );
}

// ─── Section 8+9 — mistake card ─────────────────────────────────────────────

function MJMistakeCard({ t, m, subject, open, onToggle, onRetryDone, onRemove, onGoToChat }) {
  const L = (en, uk, ru, fr, de) => mjL(t, en, uk, ru, fr, de);
  const [retryMode, setRetryMode] = React.useState("idle"); // idle | answering | pendingConfidence | wrongFeedback
  const [retryPicked, setRetryPicked] = React.useState(null);
  const [confidence, setConfidence] = React.useState(3);
  const recovered = m.status === "recovered";
  const priority = m.wrongCount >= 3 ? "high" : m.wrongCount === 2 ? "medium" : "low";
  const difficulty = m.wrongCount >= 3
    ? L("Hard", "Складно", "Сложно", "Difficile", "Schwer")
    : m.wrongCount === 2
    ? L("Challenging", "Непросто", "Непросто", "Corsé", "Anspruchsvoll")
    : L("Standard", "Стандарт", "Стандарт", "Standard", "Standard");

  function pickRetry(i) {
    setRetryPicked(i);
    const correct = i === m.correctIndex;
    if (correct) {
      setRetryMode("pendingConfidence");
    } else {
      window.recordMistakeRetry(m.id, { correct: false });
      setRetryMode("wrongFeedback");
      onRetryDone(); // refreshes wrongCount/queue counts elsewhere on the page immediately
    }
  }
  function confirmConfidence() {
    window.recordMistakeRetry(m.id, { correct: true, confidence });
    setRetryMode("idle");
    onRetryDone();
  }

  const dateLocale = (t && t.code) === "uk" ? "uk-UA" : (t && t.code) === "ru" ? "ru-RU" : (t && t.code) === "fr" ? "fr-FR" : (t && t.code) === "de" ? "de-DE" : "en-GB";

  return (
    <div style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", overflow: "hidden", transition: "box-shadow 0.15s ease, transform 0.1s ease", boxShadow: open ? "var(--shadow-md)" : "var(--shadow-sm)" }}>
      <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--indigo-600)", background: "var(--indigo-50)", borderRadius: "var(--radius-full)", padding: "2px 10px" }}>{m.topic}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: MJ_PRIORITY_COLOR[priority], background: MJ_PRIORITY_BG[priority], borderRadius: "var(--radius-full)", padding: "2px 10px" }}>{difficulty}</span>
          {subject !== m.topic && <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{subject}</span>}
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{new Date(m.at).toLocaleDateString(dateLocale, { day: "numeric", month: "short" })}</span>
          {m.wrongCount > 1 && <span style={{ fontSize: 11, color: "var(--red-600)", fontWeight: 700 }}>{L(`${m.wrongCount} failed attempts`, `${m.wrongCount} невдалих спроб`, `${m.wrongCount} неудачных попыток`, `${m.wrongCount} tentatives échouées`, `${m.wrongCount} fehlgeschlagene Versuche`)}</span>}
          {recovered && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--emerald-600)" }}>✓ {L("Recovered", "Виправлено", "Исправлено", "Récupérée", "Behoben")}</span>}
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-faint)" }}>~{Math.max(1, Math.round(m.wrongCount * 1.2))} {L("min", "хв", "мин", "min", "Min")}</span>
        </div>

        {m.wrongCount >= 3 && !recovered && (
          <div style={{ fontSize: 12, color: "var(--red-700)", background: "var(--red-50)", borderRadius: "var(--radius-lg)", padding: "8px 10px", lineHeight: 1.5 }}>
            ⚠ {L(`You've answered this incorrectly ${m.wrongCount} times.`, `Ви відповіли неправильно ${m.wrongCount} разів.`, `Вы ответили неправильно ${m.wrongCount} раз.`, `Vous avez répondu incorrectement ${m.wrongCount} fois.`, `Du hast dies ${m.wrongCount} Mal falsch beantwortet.`)}<br />
            <strong>{L("AI Recommendation:", "Рекомендація AI:", "Рекомендация AI:", "Recommandation IA :", "KI-Empfehlung:")}</strong> {L("review the prerequisite topic before attempting again.", "повторіть попередню тему, перш ніж спробувати знову.", "повторите предыдущую тему, прежде чем пробовать снова.", "révisez le sujet préalable avant de réessayer.", "wiederhole das Grundlagenthema, bevor du es erneut versuchst.")}
          </div>
        )}

        <button onClick={onToggle} style={{ textAlign: "left", border: "none", background: "transparent", cursor: "pointer", padding: 0, fontFamily: "var(--font-sans)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-strong)", lineHeight: 1.5 }}>{m.question}</p>
          <span style={{ color: "var(--text-faint)", fontSize: 12, flexShrink: 0, marginTop: 2 }}>{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {retryMode === "idle" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(m.options || []).map((opt, i) => {
                  const isCorrect = i === m.correctIndex;
                  const wasPicked = i === m.selectedIndex;
                  return (
                    <div key={i} style={{ fontSize: "var(--text-sm)", padding: "8px 12px", borderRadius: "var(--radius-lg)", background: isCorrect ? "var(--emerald-50)" : wasPicked ? "var(--rose-50)" : "var(--surface-muted)", color: isCorrect ? "var(--emerald-700)" : wasPicked ? "var(--red-600)" : "var(--text-muted)" }}>
                      {isCorrect ? "✓ " : wasPicked ? "✕ " : ""}{opt}
                    </div>
                  );
                })}
                {m.explanation && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, background: "var(--surface-muted)", borderRadius: "var(--radius-lg)", padding: "8px 10px" }}>
                    <strong style={{ color: "var(--text-body)" }}>{L("Step-by-step:", "Крок за кроком:", "Шаг за шагом:", "Étape par étape :", "Schritt für Schritt:")} </strong>{m.explanation}
                  </div>
                )}
              </div>
            )}

            {retryMode === "answering" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-faint)" }}>{L("Pick again — fresh attempt:", "Оберіть знову — нова спроба:", "Выберите снова — новая попытка:", "Choisissez à nouveau — nouvel essai :", "Wähle erneut — neuer Versuch:")}</p>
                {(m.options || []).map((opt, i) => (
                  <button key={i} onClick={() => pickRetry(i)} style={{ textAlign: "left", fontSize: "var(--text-sm)", padding: "8px 12px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", background: "var(--surface-page)", color: "var(--text-body)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {retryMode === "wrongFeedback" && (
              <div style={{ fontSize: 12, color: "var(--red-700)", background: "var(--red-50)", borderRadius: "var(--radius-lg)", padding: "10px 12px" }}>
                {L("Still tricky — this'll resurface for review tomorrow.", "Все ще складно — це знову з'явиться для повторення завтра.", "Всё ещё сложно — это снова появится для повторения завтра.", "Toujours difficile — cela réapparaîtra pour révision demain.", "Immer noch knifflig — das taucht morgen wieder zur Wiederholung auf.")} {m.explanation && <span>{m.explanation}</span>}
                <button onClick={() => setRetryMode("idle")} style={{ display: "block", marginTop: 6, border: "none", background: "transparent", color: "var(--red-600)", fontWeight: 700, fontSize: 12, cursor: "pointer", padding: 0, fontFamily: "var(--font-sans)" }}>{L("Close", "Закрити", "Закрыть", "Fermer", "Schließen")}</button>
              </div>
            )}

            {retryMode === "pendingConfidence" && (
              <div style={{ borderRadius: "var(--radius-lg)", background: "var(--emerald-50)", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--emerald-700)" }}>✓ {L("Correct! How confident do you feel now?", "Правильно! Наскільки ви впевнені зараз?", "Правильно! Насколько вы уверены сейчас?", "Correct ! Quel est votre niveau de confiance maintenant ?", "Richtig! Wie sicher fühlst du dich jetzt?")}</p>
                <input type="range" min={1} max={5} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--emerald-600)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-faint)" }}><span>{L("Shaky", "Невпевнено", "Неуверенно", "Incertain", "Unsicher")}</span><span>{L("Confident", "Впевнено", "Уверенно", "Confiant", "Sicher")}</span></div>
                <button onClick={confirmConfidence} style={{ alignSelf: "flex-start", border: "none", background: "var(--emerald-600)", color: "#fff", borderRadius: "var(--radius-lg)", padding: "6px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>{L("Mark Recovered", "Позначити виправленим", "Отметить исправленным", "Marquer comme récupérée", "Als behoben markieren")}</button>
              </div>
            )}

            {m.confidence && recovered && (
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-faint)" }}>{L(`Confidence on recovery: ${m.confidence}/5 · fixed in ${mjFmtDuration(m.recoveredAt - m.at)}`, `Впевненість при виправленні: ${m.confidence}/5 · виправлено за ${mjFmtDuration(m.recoveredAt - m.at)}`, `Уверенность при исправлении: ${m.confidence}/5 · исправлено за ${mjFmtDuration(m.recoveredAt - m.at)}`, `Confiance à la récupération : ${m.confidence}/5 · corrigée en ${mjFmtDuration(m.recoveredAt - m.at)}`, `Sicherheit bei Behebung: ${m.confidence}/5 · behoben in ${mjFmtDuration(m.recoveredAt - m.at)}`)}</p>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {!recovered && retryMode === "idle" && (
                <button onClick={() => setRetryMode("answering")} style={{ border: "none", background: "var(--indigo-600)", color: "#fff", borderRadius: "var(--radius-lg)", padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>{L("Retry", "Спробувати знову", "Повторить попытку", "Réessayer", "Erneut versuchen")}</button>
              )}
              <button onClick={() => onGoToChat && onGoToChat(`Can you explain why the answer to this is "${m.options[m.correctIndex]}" and not "${m.options[m.selectedIndex] ?? "what I picked"}"? Question: "${m.question}"`)}
                style={{ border: "1px solid var(--border-default)", background: "var(--surface-page)", color: "var(--text-body)", borderRadius: "var(--radius-lg)", padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>{L("Explain", "Пояснити", "Объяснить", "Expliquer", "Erklären")}</button>
              <button onClick={() => onGoToChat && onGoToChat({ mode: "learn", topic: m.topic })}
                style={{ border: "1px solid var(--border-default)", background: "var(--surface-page)", color: "var(--text-body)", borderRadius: "var(--radius-lg)", padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>{L("AI Teach", "AI навчання", "AI обучение", "Cours IA", "KI-Unterricht")}</button>
              <button onClick={() => onGoToChat && onGoToChat(`Make flashcards to help me master "${m.topic}" — I got this wrong: "${m.question}"`)}
                style={{ border: "1px solid var(--border-default)", background: "var(--surface-page)", color: "var(--text-body)", borderRadius: "var(--radius-lg)", padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>{L("Generate Flashcards", "Створити картки", "Создать карточки", "Générer des cartes", "Karteikarten erstellen")}</button>
              <button onClick={onRemove} style={{ border: "none", background: "transparent", color: "var(--text-faint)", fontSize: 12, cursor: "pointer", padding: "7px 8px", fontFamily: "var(--font-sans)" }}>{L("Remove", "Видалити", "Удалить", "Supprimer", "Entfernen")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section 13 — empty state ───────────────────────────────────────────────

function MJEmptyState({ t, onGoToDashboard, onGoToChat }) {
  const L = (en, uk, ru, fr, de) => mjL(t, en, uk, ru, fr, de);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", fontFamily: "var(--font-sans)" }}>
      <h1 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>{L("Mistake Journal", "Журнал помилок", "Журнал ошибок", "Journal des erreurs", "Fehlerjournal")}</h1>
      <div style={{ borderRadius: "var(--radius-2xl)", border: "1px dashed var(--border-default)", background: "linear-gradient(135deg, var(--emerald-50), var(--indigo-50))", padding: "var(--space-8)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 40 }}>🎉</span>
        <p style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text-strong)" }}>{L("Great job!", "Чудова робота!", "Отличная работа!", "Excellent travail !", "Großartige Arbeit!")}</p>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)", maxWidth: 380 }}>{L("You currently have no mistakes waiting for review. Keep taking quizzes and anything you get wrong will show up here automatically.", "Наразі у вас немає помилок, що очікують на повторення. Продовжуйте проходити тести — все, що ви зробите неправильно, автоматично з'явиться тут.", "Сейчас у вас нет ошибок, ожидающих повторения. Продолжайте проходить тесты — всё, что вы сделаете неправильно, автоматически появится здесь.", "Vous n'avez actuellement aucune erreur en attente de révision. Continuez à faire des quiz — tout ce que vous répondrez de travers apparaîtra ici automatiquement.", "Du hast aktuell keine Fehler, die auf Wiederholung warten. Mach weiter Quizze — alles, was du falsch beantwortest, erscheint hier automatisch.")}</p>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={() => onGoToChat && onGoToChat("Give me a practice quiz to test myself.")} style={{ border: "none", background: "var(--indigo-600)", color: "#fff", borderRadius: "var(--radius-lg)", padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>{L("Practice More", "Більше практики", "Больше практики", "Plus d'entraînement", "Mehr üben")}</button>
          <button onClick={() => onGoToChat && onGoToChat("Give me a harder challenge quiz to push myself.")} style={{ border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-body)", borderRadius: "var(--radius-lg)", padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>{L("Generate Challenge", "Створити виклик", "Создать вызов", "Générer un défi", "Herausforderung erstellen")}</button>
          {onGoToDashboard && <button onClick={onGoToDashboard} style={{ border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-body)", borderRadius: "var(--radius-lg)", padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>{L("Return to Dashboard", "Повернутися на головну", "Вернуться на главную", "Retour au tableau de bord", "Zurück zum Dashboard")}</button>}
        </div>
      </div>
    </div>
  );
}

window.MistakeJournal = MistakeJournal;
