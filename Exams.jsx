// AI Exam Coach — Exams screen (i18n-aware)
function Exams({ t }) {
  const { Button } = window.AIExamCoachDesignSystem_99e467;
  const [exams, setExams] = React.useState(() => window.getExams());
  const [showAdd, setShowAdd] = React.useState(false);
  const [editing, setEditing] = React.useState(null);

  const persist = (next) => { setExams(next); window.saveExams(next); };
  const updateExam = (id, patch) => persist(exams.map((e) => e.id === id ? { ...e, ...patch } : e));
  const deleteExam = (id) => persist(exams.filter((e) => e.id !== id));

  const { daysAway, sessionsNeeded, requiredPct } = window;
  function fmtDate(s) { return new Date(s).toLocaleDateString(t.code === "uk" ? "uk-UA" : t.code === "fr" ? "fr-FR" : t.code === "de" ? "de-DE" : "en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }); }

  function ExamCard({ exam }) {
    const days = daysAway(exam.examDate);
    const past = days < 0;
    const soon = days >= 0 && days <= 7;
    // Same assumed prep window as deriveCourse() in exams-store.jsx (90 days
    // when no real start date is known) — this used to anchor against a
    // hardcoded literal date instead, which silently drifted wrong as soon
    // as "today" moved past that fixed point.
    const totalDays = Math.max(days, 90);
    const needed = !past ? sessionsNeeded(exam.completionPct, days) : 0;
    const required = !past ? requiredPct(exam.completionPct, days, totalDays) : 100;
    const behind = !past && exam.completionPct < required;
    const [hover, setHover] = React.useState(false);
    return (
      <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={() => setEditing(exam)}
        style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", borderLeft: `6px solid ${exam.color}`, background: "var(--surface-card)", boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-sm)", padding: "var(--space-4)", cursor: "pointer", opacity: past ? 0.6 : 1, transition: "box-shadow var(--dur-fast) ease", fontFamily: "var(--font-sans)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-2)" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3 style={{ margin: 0, fontWeight: "var(--weight-semibold)", color: "var(--text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exam.name}</h3>
            <p style={{ margin: "2px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{fmtDate(exam.examDate)}</p>
            <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{exam.examBoard}</p>
          </div>
          <span style={{ flexShrink: 0, borderRadius: "var(--radius-full)", padding: "2px 8px", fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)", background: past ? "var(--slate-100)" : soon ? "var(--amber-100)" : "var(--emerald-100)", color: past ? "var(--slate-500)" : soon ? "var(--amber-700)" : "var(--emerald-700)" }}>
            {past ? t.exams_past_label : `${days}${t.exams_days_away}`}
          </span>
        </div>
        {!past && (
          <div style={{ margin: "var(--space-2) 0", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "var(--text-xs)", color: behind ? "var(--red-500)" : "var(--emerald-600)", fontWeight: "var(--weight-medium)" }}>
              {behind ? `⚠️ Behind — needs ${needed} sessions/week` : `✓ On track — ${needed} sessions/week`}
            </span>
          </div>
        )}
        <p style={{ margin: "var(--space-2) 0", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{exam.topicCount} {t.exams_topics}</p>
        <div style={{ height: 8, background: "var(--surface-sunken)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${exam.completionPct}%`, background: "var(--action-primary)", borderRadius: "var(--radius-full)", transition: "width var(--dur-slow) var(--ease-out)" }} />
        </div>
      </div>
    );
  }

  const upcoming = exams.filter((e) => daysAway(e.examDate) >= 0);
  const pastExams = exams.filter((e) => daysAway(e.examDate) < 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", fontFamily: "var(--font-sans)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>{t.exams_title}</h1>
        <Button variant="primary" size="md" onClick={() => setShowAdd(true)}>{t.exams_add}</Button>
      </div>
      <section>
        <p style={{ margin: "0 0 12px", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)" }}>{t.exams_upcoming}</p>
        {upcoming.length === 0 ? (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No exams yet — add one to get started.</p>
        ) : (
          <div style={{ display: "grid", gap: "var(--space-4)", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {upcoming.map((e) => <ExamCard key={e.id} exam={e} />)}
          </div>
        )}
      </section>
      <section>
        <p style={{ margin: "0 0 12px", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)" }}>{t.exams_past}</p>
        {pastExams.length === 0 ? (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No past exams yet — they'll show up here once a date passes.</p>
        ) : (
          <div style={{ display: "grid", gap: "var(--space-4)", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {pastExams.map((e) => <ExamCard key={e.id} exam={e} />)}
          </div>
        )}
      </section>

      {showAdd && (
        <window.ExamWizard
          config={window.EXAM_WIZARD_PRESETS.addExam}
          lang={t.code || "en"}
          onFinish={() => { setExams(window.getExams()); setShowAdd(false); }}
          onCancel={() => setShowAdd(false)}
        />
      )}
      {editing && (
        <ExamDetailModal
          exam={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => { updateExam(editing.id, patch); setEditing(null); }}
          onDelete={() => { deleteExam(editing.id); setEditing(null); }}
        />
      )}
    </div>
  );

  function ExamDetailModal({ exam, onClose, onSave, onDelete }) {
    const [completionPct, setCompletionPct] = React.useState(exam.completionPct);
    const [confirmDelete, setConfirmDelete] = React.useState(false);
    React.useEffect(() => {
      if (!confirmDelete) return;
      const id = setTimeout(() => setConfirmDelete(false), 3000);
      return () => clearTimeout(id);
    }, [confirmDelete]);
    React.useEffect(() => {
      const fn = (e) => { if (e.key === "Escape") onClose(); };
      document.addEventListener("keydown", fn);
      return () => document.removeEventListener("keydown", fn);
    }, []);
    return (
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, background: "var(--surface-page)", borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-lg)", padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: exam.color, flexShrink: 0 }} />
            <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>{exam.name}</h2>
          </div>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{fmtDate(exam.examDate)} · {exam.examBoard} · {exam.topicCount} topics</p>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 6 }}>
              <span>Topics covered</span><strong style={{ color: "var(--text-strong)" }}>{completionPct}%</strong>
            </div>
            <input type="range" min={0} max={100} value={completionPct} onChange={(e) => setCompletionPct(Number(e.target.value))} style={{ width: "100%", accentColor: exam.color }} />
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
            <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-muted)", fontWeight: "var(--weight-semibold)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Close</button>
            <button onClick={() => onSave({ completionPct })} style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--indigo-600)", color: "#fff", fontWeight: "var(--weight-semibold)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Save</button>
          </div>
          <button onClick={() => confirmDelete ? onDelete() : setConfirmDelete(true)}
            style={{ border: "none", background: "transparent", color: confirmDelete ? "var(--red-600)" : "var(--text-faint)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-xs)", cursor: "pointer", fontFamily: "var(--font-sans)", padding: "4px 0", textAlign: "center" }}>
            {confirmDelete ? "Click again to confirm delete" : "Delete exam"}
          </button>
        </div>
      </div>
    );
  }
}
window.Exams = Exams;
