// AI Exam Coach — Exams screen (i18n-aware)
function Exams({ t, onPlanReady }) {
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

  const nearestExam = React.useMemo(() => {
    if (upcoming.length === 0) return null;
    return upcoming.reduce((a, b) => daysAway(a.examDate) <= daysAway(b.examDate) ? a : b);
  }, [exams]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", fontFamily: "var(--font-sans)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>{t.exams_title}</h1>
        <Button variant="primary" size="md" onClick={() => setShowAdd(true)}>{t.exams_add}</Button>
      </div>
      {nearestExam && (
        <div style={{ borderRadius: "var(--radius-xl)", background: daysAway(nearestExam.examDate) <= 7 ? "var(--amber-50)" : "var(--indigo-50)", border: `1px solid ${daysAway(nearestExam.examDate) <= 7 ? "var(--amber-100)" : "var(--indigo-100)"}`, padding: "12px var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)" }}>
          <span style={{ color: daysAway(nearestExam.examDate) <= 7 ? "var(--amber-700)" : "var(--indigo-600)", fontWeight: "var(--weight-semibold)" }}>
            {daysAway(nearestExam.examDate) <= 7 ? "Coming up:" : "Next exam:"}
          </span>
          <span style={{ color: "var(--text-body)" }}>{nearestExam.name} in {daysAway(nearestExam.examDate)} days</span>
        </div>
      )}
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

      {showAdd && (exams.length === 0 ? (
        <window.ExamWizard
          config={window.EXAM_WIZARD_PRESETS.addExam}
          lang={t.code || "en"}
          onFinish={(newExams) => { setExams(window.getExams()); setShowAdd(false); if (onPlanReady) onPlanReady(newExams); }}
          onCancel={() => setShowAdd(false)}
        />
      ) : (
        <QuickAddModal
          lastExam={exams[exams.length - 1]}
          onClose={() => setShowAdd(false)}
          onSave={(newExams) => { setExams(window.getExams()); setShowAdd(false); if (onPlanReady && newExams) onPlanReady(newExams); }}
          onFullWizard={() => {}}
        />
      ))}
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

  function QuickAddModal({ lastExam, onClose, onSave, onFullWizard }) {
    const defaultDate = (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); })();
    const todayISO = new Date().toISOString().slice(0, 10);
    const [name, setName] = React.useState("");
    const [examDate, setExamDate] = React.useState(defaultDate);
    const [examBoard, setExamBoard] = React.useState(lastExam.examBoard || "");
    const [topicCount, setTopicCount] = React.useState(lastExam.topicCount || 10);
    const [useFullWizard, setUseFullWizard] = React.useState(false);
    const canSave = name.trim() && examDate >= todayISO && Number(topicCount) >= 1;

    React.useEffect(() => {
      const fn = (e) => { if (e.key === "Escape") onClose(); };
      document.addEventListener("keydown", fn);
      return () => document.removeEventListener("keydown", fn);
    }, []);

    if (useFullWizard) {
      return (
        <window.ExamWizard
          config={window.EXAM_WIZARD_PRESETS.addExam}
          lang={t.code || "en"}
          onFinish={(newExams) => onSave(newExams)}
          onCancel={onClose}
        />
      );
    }

    function save() {
      const newExams = window.commitExamWizard({
        examDrafts: [{
          name: name.trim(),
          color: null,
          examDate,
          examBoard,
          topicCount: Number(topicCount) || 10,
          targetGrade: lastExam.targetGrade || "A",
          currentGrade: lastExam.currentGrade || "C",
          gradingSystem: lastExam.gradingSystem || null,
        }],
        profilePatch: null,
      });
      if (window.requestTopicNames) newExams.forEach((e) => window.requestTopicNames(e.id, e, []));
      onSave(newExams);
    }

    const inputStyle = { width: "100%", boxSizing: "border-box", padding: "12px 16px", fontSize: "var(--text-base)", fontFamily: "var(--font-sans)", color: "var(--text-strong)", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", outline: "none" };

    return (
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, background: "var(--surface-page)", borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-lg)", padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>{t.exams_add}</h2>
          <div>
            <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-body)", marginBottom: "var(--space-1)" }}>Subject name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chemistry" autoFocus style={inputStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
            <div>
              <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-body)", marginBottom: "var(--space-1)" }}>Exam date</label>
              <input type="date" value={examDate} min={todayISO} onChange={(e) => setExamDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-body)", marginBottom: "var(--space-1)" }}>Topics</label>
              <input type="number" min={1} value={topicCount} onChange={(e) => setTopicCount(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-body)", marginBottom: "var(--space-1)" }}>Exam board</label>
            <input value={examBoard} onChange={(e) => setExamBoard(e.target.value)} placeholder="e.g. AQA" style={inputStyle} />
          </div>
          <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>Grading defaulted from your last exam. <button type="button" onClick={() => setUseFullWizard(true)} style={{ border: "none", background: "transparent", color: "var(--indigo-600)", fontWeight: "var(--weight-semibold)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", padding: 0 }}>Need different grading? Use full wizard</button></p>
          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
            <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-muted)", fontWeight: "var(--weight-semibold)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Cancel</button>
            <button onClick={save} disabled={!canSave} style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-lg)", border: "none", background: canSave ? "var(--indigo-600)" : "var(--slate-200)", color: canSave ? "#fff" : "var(--text-faint)", fontWeight: "var(--weight-semibold)", cursor: canSave ? "pointer" : "default", fontFamily: "var(--font-sans)" }}>Add exam</button>
          </div>
        </div>
      </div>
    );
  }

  function ExamDetailModal({ exam, onClose, onSave, onDelete }) {
    const [confirmDelete, setConfirmDelete] = React.useState(false);
    // Coverage is DERIVED from the topics you've actually studied (marked on the
    // session recap), not hand-set. A manual slider here used to grant readiness
    // for zero real work — the exact thing that felt fake.
    const covered = window.coverageForExam ? window.coverageForExam(exam.id) : (exam.completionPct || 0);
    const topicCount = Math.max(1, exam.topicCount || 10);
    const coveredTopics = Math.round((covered / 100) * topicCount);
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
              <span>Topics covered</span><strong style={{ color: "var(--text-strong)" }}>{coveredTopics}/{topicCount} · {covered}%</strong>
            </div>
            <div style={{ height: 8, background: "var(--surface-sunken)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${covered}%`, background: exam.color, borderRadius: "var(--radius-full)", transition: "width 0.4s ease" }} />
            </div>
            <p style={{ margin: "8px 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)", lineHeight: 1.5 }}>
              Updates automatically as you study — mark topics as covered on the session recap. It never rises without real study time behind it.
            </p>
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
            <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-muted)", fontWeight: "var(--weight-semibold)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Close</button>
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
