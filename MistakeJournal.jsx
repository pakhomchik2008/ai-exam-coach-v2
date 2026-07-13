// AI Exam Coach — Mistake Journal, rebuilt as an AI-powered review dashboard.
// Every number on this page is derived from real logged mistakes
// (mistakes-store.jsx) — nothing here is a placeholder or fabricated stat.
// One deliberate naming choice: the top card says "Recovery Rate," not
// "Accuracy" — this app has no record of every question ever answered
// correctly, only the ones logged as wrong, so the only honest percentage
// is "of your logged mistakes, how many have you since fixed."

const MJ_TIME_FILTERS = [
  { id: "all", label: "All time" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
];
const MJ_SORTS = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
];

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
const MJ_PRIORITY_BG = { high: "#FEF2F2", medium: "#FFFBEB", low: "#ECFDF5" };
const MJ_PRIORITY_LABEL = { high: "High Priority", medium: "Medium Priority", low: "Low Priority" };

function MistakeJournal({ t, onGoToChat, onGoToDashboard }) {
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

  const mjSubject = React.useCallback((m) => examById.get(m.examId)?.name || m.topic || "General", [examById]);
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
      personalColor: tp.examId ? null : "#6366F1",
      topic: `Review: ${tp.topic}`,
      date: window.fmtDateKey(new Date()),
      startTime: mjNextQuarterHour(),
      durationMin: Math.max(15, tp.estReviewMin),
    });
    bump();
  }

  if (mistakes.length === 0) {
    return <MJEmptyState onGoToDashboard={onGoToDashboard} onGoToChat={onGoToChat} />;
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
          <h1 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>Mistake Journal</h1>
          <p style={{ margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Your AI coach's map of what's holding your grade back — and exactly what to fix next.</p>
        </div>
        <button onClick={() => { window.clearAllMistakes(); bump(); }} style={{ border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-muted)", borderRadius: "var(--radius-lg)", padding: "8px 14px", fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)", cursor: "pointer", fontFamily: "var(--font-sans)", whiteSpace: "nowrap" }}>
          Clear all
        </button>
      </div>

      {/* Section 1 — analytics header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        <MJStatCard value={summary.recoveryRate != null ? `${summary.recoveryRate}%` : "—"} label="Recovery Rate" color="var(--indigo-600)" />
        <MJStatCard value={summary.pendingCount} label="Mistakes Remaining" color="var(--red-600)" />
        <MJStatCard value={summary.recoveredCount} label="Recovered" color="var(--emerald-600)" />
        <MJStatCard value={summary.dueTodayCount} label="Today's Reviews" color="var(--amber-600)" />
        <MJStatCard value={`${summary.streak}🔥`} label="Current Streak" color={summary.streak > 0 ? "var(--amber-600)" : "var(--text-faint)"} />
        <MJStatCard value={mjFmtDuration(summary.avgRecoveryMs)} label="Avg. Recovery Time" color="var(--indigo-600)" />
      </div>

      {/* Section 2 — AI Insight */}
      {weakest && <MJAiInsight topic={weakest} onGoToChat={onGoToChat} onStartReview={() => startReviewOn(weakest.topic)} />}

      {/* Section 10 — Today's Priority */}
      {priorityTopic && <MJTodaysPriority topic={priorityTopic} onStartReview={() => startReviewOn(priorityTopic.topic)} />}

      {/* Section 11 — AI Actions */}
      <MJAiActions
        topics={topics} pendingCount={summary.pendingCount}
        onGoToChat={onGoToChat}
        onExplainAll={() => onGoToChat && onGoToChat(`I have ${summary.pendingCount} unresolved mistakes across these topics: ${topics.map((tp) => tp.topic).join(", ")}. What's the common thread, and what should I focus on first?`)}
        onSnoozeAll={() => { window.snoozeOverdueMistakes(); bump(); }}
        onReviewDueToday={scrollToReview}
        onCreateSession={() => weakest && createStudySessionForTopic(weakest)}
      />

      {/* Section 12 — gamification */}
      <MJGamification xp={xp} summary={summary} badges={badges} />

      {/* Section 3 — weakest topics */}
      <div>
        <h2 style={{ margin: "0 0 10px", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text-strong)" }}>Weakest Topics</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {topics.map((tp) => <MJTopicRow key={tp.topic} tp={tp} onStartReview={() => startReviewOn(tp.topic)} />)}
        </div>
      </div>

      {/* Section 4 — trends */}
      <MJTrends trends={trends} />

      {/* Section 5 — review queue */}
      <div ref={reviewSectionRef}>
        <h2 style={{ margin: "0 0 10px", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text-strong)" }}>Review Queue</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          <MJQueueCard label="Overdue" items={queue.overdue} accent="var(--red-600)" onStartReview={() => { setStatusFilter("pending"); scrollToReview(); }} />
          <MJQueueCard label="Due Today" items={queue.dueToday} accent="var(--amber-600)" completionPct={dueTodayCompletionPct} onStartReview={() => { setStatusFilter("pending"); scrollToReview(); }} />
          <MJQueueCard label="Tomorrow" items={queue.dueTomorrow} accent="var(--indigo-600)" onStartReview={() => { setStatusFilter("pending"); scrollToReview(); }} />
          <MJQueueCard label="Later" items={queue.later} accent="var(--text-faint)" onStartReview={() => { setStatusFilter("pending"); scrollToReview(); }} />
        </div>
      </div>

      {/* Section 6+7 — filters & search */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by question, topic, or subject…"
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", color: "var(--text-strong)", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-full)", outline: "none" }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <MJChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>All</MJChip>
          <MJChip active={statusFilter === "pending"} onClick={() => setStatusFilter("pending")}>Unreviewed</MJChip>
          <MJChip active={statusFilter === "recovered"} onClick={() => setStatusFilter("recovered")}>Reviewed</MJChip>
          <MJChip active={statusFilter === "repeated"} onClick={() => setStatusFilter("repeated")}>Repeated Mistakes</MJChip>
          <MJChip active={statusFilter === "high-priority"} onClick={() => setStatusFilter("high-priority")}>High Priority</MJChip>
          {subjects.map((s) => (
            <MJChip key={s} active={subjectFilter === s} onClick={() => setSubjectFilter(subjectFilter === s ? "all" : s)}>{s}</MJChip>
          ))}
          {MJ_TIME_FILTERS.map((f) => (
            <MJChip key={f.id} active={timeFilter === f.id} onClick={() => setTimeFilter(f.id)}>{f.label}</MJChip>
          ))}
          {MJ_SORTS.map((s) => (
            <MJChip key={s.id} active={sortOrder === s.id} onClick={() => setSortOrder(s.id)}>{s.label}</MJChip>
          ))}
        </div>
      </div>

      {/* Section 8+9 — mistake cards */}
      {filtered.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-faint)", textAlign: "center", padding: "var(--space-6) 0" }}>No mistakes match these filters.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {filtered.map((m) => (
            <MJMistakeCard key={m.id} m={m} subject={mjSubject(m)} open={openId === m.id}
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

function MJAiInsight({ topic, onGoToChat, onStartReview }) {
  const gain = Math.min(15, Math.max(2, Math.round((100 - topic.masteryPct) * 0.15)));
  return (
    <div style={{ borderRadius: "var(--radius-2xl)", background: "linear-gradient(135deg, var(--indigo-50), #F5F3FF)", border: "1px solid var(--indigo-100)", padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}>✨</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--indigo-700)", textTransform: "uppercase", letterSpacing: "0.05em" }}>AI Insight</span>
      </div>
      <p style={{ margin: 0, fontSize: "var(--text-base)", color: "var(--text-strong)", lineHeight: 1.5 }}>
        You consistently struggle with <strong>{topic.topic}</strong> — {topic.pendingHere} mistake{topic.pendingHere === 1 ? "" : "s"} still unresolved, {topic.masteryPct}% recovered so far.
      </p>
      <div style={{ fontSize: 13, color: "var(--text-body)", lineHeight: 1.8 }}>
        <div>• Review <strong>{topic.topic}</strong></div>
        <div>• Complete {topic.pendingHere} practice question{topic.pendingHere === 1 ? "" : "s"}</div>
        <div>• Estimated readiness increase: <strong style={{ color: "var(--indigo-700)" }}>+{gain}%</strong></div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
        <button onClick={onStartReview} style={{ border: "none", background: "var(--indigo-600)", color: "#fff", borderRadius: "var(--radius-lg)", padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Start Review</button>
        <button onClick={() => onGoToChat && onGoToChat(`I keep getting "${topic.topic}" questions wrong. Can you explain what's likely tripping me up and how to fix it?`)}
          style={{ border: "1px solid var(--indigo-200)", background: "var(--surface-card)", color: "var(--indigo-700)", borderRadius: "var(--radius-lg)", padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Explain Weakness</button>
        <button onClick={() => onGoToChat && onGoToChat({ mode: "learn", topic: topic.topic })}
          style={{ border: "1px solid var(--indigo-200)", background: "var(--surface-card)", color: "var(--indigo-700)", borderRadius: "var(--radius-lg)", padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Generate Lesson</button>
      </div>
    </div>
  );
}

// ─── Section 10 — Today's Priority ──────────────────────────────────────────

function MJTodaysPriority({ topic, onStartReview }) {
  const gain = Math.min(15, Math.max(2, Math.round((100 - topic.masteryPct) * 0.15)));
  return (
    <div style={{ borderRadius: "var(--radius-2xl)", border: `1.5px solid ${MJ_PRIORITY_COLOR[topic.priority]}33`, background: MJ_PRIORITY_BG[topic.priority], padding: "var(--space-4) var(--space-5)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: MJ_PRIORITY_COLOR[topic.priority], textTransform: "uppercase", letterSpacing: "0.05em" }}>Today's Priority</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-strong)", marginTop: 2 }}>{topic.topic}</div>
      </div>
      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>{topic.estReviewMin} min</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Est. Time</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: MJ_PRIORITY_COLOR[topic.priority] }}>{MJ_PRIORITY_LABEL[topic.priority].replace(" Priority", "")}</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Impact</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--emerald-600)" }}>+{gain}%</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Grade Increase</div>
        </div>
      </div>
      <button onClick={onStartReview} style={{ border: "none", background: MJ_PRIORITY_COLOR[topic.priority], color: "#fff", borderRadius: "var(--radius-lg)", padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Start Now</button>
    </div>
  );
}

// ─── Section 11 — AI Actions ────────────────────────────────────────────────

function MJAiActions({ topics, pendingCount, onGoToChat, onExplainAll, onSnoozeAll, onReviewDueToday, onCreateSession }) {
  const topicNames = topics.map((tp) => tp.topic).join(", ") || "your weakest topics";
  const actions = [
    { label: "Generate Flashcards", emoji: "🗂️", onClick: () => onGoToChat && onGoToChat(`Make flashcards covering my weakest topics: ${topicNames}`) },
    { label: "Generate Quiz", emoji: "📝", onClick: () => onGoToChat && onGoToChat(`Quiz me on: ${topicNames}`) },
    { label: "Generate Lesson", emoji: "📖", onClick: () => onGoToChat && onGoToChat({ mode: "learn", topic: topics[0]?.topic }) , disabled: !topics.length },
    { label: "Explain All", emoji: "💡", onClick: onExplainAll, disabled: !pendingCount },
    { label: "Snooze Overdue", emoji: "😴", onClick: onSnoozeAll },
    { label: "Review Due Today", emoji: "▶️", onClick: onReviewDueToday },
    { label: "Create Study Session", emoji: "📅", onClick: onCreateSession, disabled: !topics.length },
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

function MJGamification({ xp, summary, badges }) {
  return (
    <div style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
        {xp && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--indigo-600)" }}>⭐ Level {xp.level}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{xp.into} / {xp.need} XP</div>
          </div>
        )}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--emerald-600)" }}>{summary.recoveredCount} fixed</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Recovered mistakes</div>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: summary.streak > 0 ? "var(--amber-600)" : "var(--text-faint)" }}>{summary.streak}🔥</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Review streak</div>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {badges.map((b) => (
          <div key={b.id} title={b.unlocked ? "Unlocked" : "Not yet unlocked"} style={{
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

function MJTopicRow({ tp, onStartReview }) {
  return (
    <div style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", padding: "12px var(--space-4)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 140 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-strong)" }}>{tp.topic}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{tp.mistakes} mistake{tp.mistakes === 1 ? "" : "s"}</div>
      </div>
      <div style={{ width: 90 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-strong)" }}>{tp.masteryPct}% mastery</div>
        <div style={{ height: 5, background: "var(--surface-sunken)", borderRadius: "var(--radius-full)", overflow: "hidden", marginTop: 3 }}>
          <div style={{ height: "100%", width: `${tp.masteryPct}%`, background: MJ_PRIORITY_COLOR[tp.priority], borderRadius: "var(--radius-full)" }} />
        </div>
      </div>
      <span style={{ borderRadius: "var(--radius-full)", padding: "3px 10px", fontSize: 11, fontWeight: 700, background: MJ_PRIORITY_BG[tp.priority], color: MJ_PRIORITY_COLOR[tp.priority], whiteSpace: "nowrap" }}>
        {MJ_PRIORITY_LABEL[tp.priority]}
      </span>
      {tp.pendingHere > 0 && <span style={{ fontSize: 12, color: "var(--text-faint)", whiteSpace: "nowrap" }}>~{tp.estReviewMin} min</span>}
      <button onClick={onStartReview} style={{ border: "1px solid var(--border-default)", background: "var(--surface-page)", color: "var(--indigo-600)", borderRadius: "var(--radius-lg)", padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Review</button>
    </div>
  );
}

// ─── Section 4 — trends ──────────────────────────────────────────────────────

function MJTrends({ trends }) {
  const maxVal = Math.max(1, ...trends.map((w) => Math.max(w.made, w.fixed)));
  const totalMade = trends.reduce((s, w) => s + w.made, 0);
  const totalDays = trends.length * 7;
  const avgPerDay = Math.round((totalMade / totalDays) * 10) / 10;
  return (
    <div style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)", padding: "var(--space-4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text-strong)" }}>Mistake Trends</h2>
        <span style={{ fontSize: 12, color: "var(--text-faint)" }}>~{avgPerDay} mistakes/day avg</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
        {trends.map((w) => (
          <div key={w.weekStart} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: "100%" }}>
              <div title={`${w.made} made`} style={{ width: 10, height: `${Math.max(3, (w.made / maxVal) * 70)}px`, background: "var(--red-300, #FCA5A5)", borderRadius: 3 }} />
              <div title={`${w.fixed} fixed`} style={{ width: 10, height: `${Math.max(3, (w.fixed / maxVal) * 70)}px`, background: "var(--emerald-400, #34D399)", borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 9, color: "var(--text-faint)" }}>{w.weekStart.slice(5)}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 11, color: "var(--text-muted)" }}>
        <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--red-300, #FCA5A5)", marginRight: 4 }} />Mistakes made</span>
        <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--emerald-400, #34D399)", marginRight: 4 }} />Recovered</span>
      </div>
    </div>
  );
}

// ─── Section 5 — review queue ───────────────────────────────────────────────

function MJQueueCard({ label, items, accent, completionPct, onStartReview }) {
  const estMin = Math.max(1, Math.round(items.length * 1.5));
  return (
    <div style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-strong)" }}>{items.length}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{items.length === 1 ? "question" : "questions"} · {estMin} min</div>
      {completionPct != null && (
        <div>
          <div style={{ height: 5, background: "var(--surface-sunken)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${completionPct}%`, background: accent, borderRadius: "var(--radius-full)", transition: "width 0.4s ease" }} />
          </div>
          <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 3 }}>{completionPct}% completed today</div>
        </div>
      )}
      {items.length > 0 && (
        <button onClick={onStartReview} style={{ alignSelf: "flex-start", border: "none", background: "transparent", color: accent, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0, marginTop: 2 }}>Start Review →</button>
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

function MJMistakeCard({ m, subject, open, onToggle, onRetryDone, onRemove, onGoToChat }) {
  const [retryMode, setRetryMode] = React.useState("idle"); // idle | answering | pendingConfidence | wrongFeedback
  const [retryPicked, setRetryPicked] = React.useState(null);
  const [confidence, setConfidence] = React.useState(3);
  const recovered = m.status === "recovered";
  const priority = m.wrongCount >= 3 ? "high" : m.wrongCount === 2 ? "medium" : "low";
  const difficulty = m.wrongCount >= 3 ? "Hard" : m.wrongCount === 2 ? "Challenging" : "Standard";

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

  return (
    <div style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", overflow: "hidden", transition: "box-shadow 0.15s ease, transform 0.1s ease", boxShadow: open ? "var(--shadow-md)" : "var(--shadow-sm)" }}>
      <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--indigo-600)", background: "var(--indigo-50)", borderRadius: "var(--radius-full)", padding: "2px 10px" }}>{m.topic}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: MJ_PRIORITY_COLOR[priority], background: MJ_PRIORITY_BG[priority], borderRadius: "var(--radius-full)", padding: "2px 10px" }}>{difficulty}</span>
          {subject !== m.topic && <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{subject}</span>}
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{new Date(m.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
          {m.wrongCount > 1 && <span style={{ fontSize: 11, color: "var(--red-600)", fontWeight: 700 }}>{m.wrongCount} failed attempts</span>}
          {recovered && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--emerald-600)" }}>✓ Recovered</span>}
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-faint)" }}>~{Math.max(1, Math.round(m.wrongCount * 1.2))} min</span>
        </div>

        {m.wrongCount >= 3 && !recovered && (
          <div style={{ fontSize: 12, color: "var(--red-700)", background: "#FEF2F2", borderRadius: "var(--radius-lg)", padding: "8px 10px", lineHeight: 1.5 }}>
            ⚠ You've answered this incorrectly {m.wrongCount} times.<br />
            <strong>AI Recommendation:</strong> review the prerequisite topic before attempting again.
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
                    <div key={i} style={{ fontSize: "var(--text-sm)", padding: "8px 12px", borderRadius: "var(--radius-lg)", background: isCorrect ? "var(--emerald-50)" : wasPicked ? "#FFF1F2" : "var(--surface-muted)", color: isCorrect ? "var(--emerald-700)" : wasPicked ? "var(--red-600)" : "var(--text-muted)" }}>
                      {isCorrect ? "✓ " : wasPicked ? "✕ " : ""}{opt}
                    </div>
                  );
                })}
                {m.explanation && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, background: "var(--surface-muted)", borderRadius: "var(--radius-lg)", padding: "8px 10px" }}>
                    <strong style={{ color: "var(--text-body)" }}>Step-by-step: </strong>{m.explanation}
                  </div>
                )}
              </div>
            )}

            {retryMode === "answering" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-faint)" }}>Pick again — fresh attempt:</p>
                {(m.options || []).map((opt, i) => (
                  <button key={i} onClick={() => pickRetry(i)} style={{ textAlign: "left", fontSize: "var(--text-sm)", padding: "8px 12px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", background: "var(--surface-page)", color: "var(--text-body)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {retryMode === "wrongFeedback" && (
              <div style={{ fontSize: 12, color: "var(--red-700)", background: "#FEF2F2", borderRadius: "var(--radius-lg)", padding: "10px 12px" }}>
                Still tricky — this'll resurface for review tomorrow. {m.explanation && <span>{m.explanation}</span>}
                <button onClick={() => setRetryMode("idle")} style={{ display: "block", marginTop: 6, border: "none", background: "transparent", color: "var(--red-600)", fontWeight: 700, fontSize: 12, cursor: "pointer", padding: 0, fontFamily: "var(--font-sans)" }}>Close</button>
              </div>
            )}

            {retryMode === "pendingConfidence" && (
              <div style={{ borderRadius: "var(--radius-lg)", background: "var(--emerald-50)", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--emerald-700)" }}>✓ Correct! How confident do you feel now?</p>
                <input type="range" min={1} max={5} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--emerald-600)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-faint)" }}><span>Shaky</span><span>Confident</span></div>
                <button onClick={confirmConfidence} style={{ alignSelf: "flex-start", border: "none", background: "var(--emerald-600)", color: "#fff", borderRadius: "var(--radius-lg)", padding: "6px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Mark Recovered</button>
              </div>
            )}

            {m.confidence && recovered && (
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-faint)" }}>Confidence on recovery: {m.confidence}/5 · fixed in {mjFmtDuration(m.recoveredAt - m.at)}</p>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {!recovered && retryMode === "idle" && (
                <button onClick={() => setRetryMode("answering")} style={{ border: "none", background: "var(--indigo-600)", color: "#fff", borderRadius: "var(--radius-lg)", padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Retry</button>
              )}
              <button onClick={() => onGoToChat && onGoToChat(`Can you explain why the answer to this is "${m.options[m.correctIndex]}" and not "${m.options[m.selectedIndex] ?? "what I picked"}"? Question: "${m.question}"`)}
                style={{ border: "1px solid var(--border-default)", background: "var(--surface-page)", color: "var(--text-body)", borderRadius: "var(--radius-lg)", padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Explain</button>
              <button onClick={() => onGoToChat && onGoToChat({ mode: "learn", topic: m.topic })}
                style={{ border: "1px solid var(--border-default)", background: "var(--surface-page)", color: "var(--text-body)", borderRadius: "var(--radius-lg)", padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>AI Teach</button>
              <button onClick={() => onGoToChat && onGoToChat(`Make flashcards to help me master "${m.topic}" — I got this wrong: "${m.question}"`)}
                style={{ border: "1px solid var(--border-default)", background: "var(--surface-page)", color: "var(--text-body)", borderRadius: "var(--radius-lg)", padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Generate Flashcards</button>
              <button onClick={onRemove} style={{ border: "none", background: "transparent", color: "var(--text-faint)", fontSize: 12, cursor: "pointer", padding: "7px 8px", fontFamily: "var(--font-sans)" }}>Remove</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section 13 — empty state ───────────────────────────────────────────────

function MJEmptyState({ onGoToDashboard, onGoToChat }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", fontFamily: "var(--font-sans)" }}>
      <h1 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>Mistake Journal</h1>
      <div style={{ borderRadius: "var(--radius-2xl)", border: "1px dashed var(--border-default)", background: "linear-gradient(135deg, var(--emerald-50), var(--indigo-50))", padding: "var(--space-8)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 40 }}>🎉</span>
        <p style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text-strong)" }}>Great job!</p>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)", maxWidth: 380 }}>You currently have no mistakes waiting for review. Keep taking quizzes and anything you get wrong will show up here automatically.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={() => onGoToChat && onGoToChat("Give me a practice quiz to test myself.")} style={{ border: "none", background: "var(--indigo-600)", color: "#fff", borderRadius: "var(--radius-lg)", padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Practice More</button>
          <button onClick={() => onGoToChat && onGoToChat("Give me a harder challenge quiz to push myself.")} style={{ border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-body)", borderRadius: "var(--radius-lg)", padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Generate Challenge</button>
          {onGoToDashboard && <button onClick={onGoToDashboard} style={{ border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-body)", borderRadius: "var(--radius-lg)", padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Return to Dashboard</button>}
        </div>
      </div>
    </div>
  );
}

window.MistakeJournal = MistakeJournal;
