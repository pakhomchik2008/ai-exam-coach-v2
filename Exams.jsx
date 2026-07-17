// AI Exam Coach — Exams screen: brain-driven, reactive via useBrain().
function Exams({ t, onPlanReady }) {
  const { Button } = window.AIExamCoachDesignSystem_99e467;
  const brain = window.useBrain();
  const [exams, setExams] = React.useState(() => window.getExams());
  const [showAdd, setShowAdd] = React.useState(false);
  const [editing, setEditing] = React.useState(null);

  // Re-sync when brain changes (another screen marked topics, etc.)
  React.useEffect(() => { setExams(window.getExams()); }, [brain]);

  const persist = (next) => { setExams(next); window.saveExams(next); };
  const updateExam = (id, patch) => persist(exams.map((e) => e.id === id ? { ...e, ...patch } : e));
  const deleteExam = (id) => persist(exams.filter((e) => e.id !== id));

  const { daysAway } = window;
  function fmtDate(s) { return new Date(s).toLocaleDateString(t.code === "uk" ? "uk-UA" : t.code === "fr" ? "fr-FR" : t.code === "de" ? "de-DE" : "en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }); }

  // Brain exam views keyed by id for easy lookup
  const evMap = React.useMemo(() => {
    const m = {};
    for (const ev of (brain.examViews || [])) m[ev.id] = ev;
    return m;
  }, [brain]);

  function ExamCard({ exam }) {
    const ev = evMap[exam.id];
    const days = daysAway(exam.examDate);
    const past = days < 0;
    const soon = days >= 0 && days <= 7;
    const readiness = ev ? ev.readiness : 0;
    const started = ev ? ev.started : false;
    const coverage = ev ? ev.coverage : 0;
    const pace = ev ? ev.pace : "on_track";
    const priority = window.computePriority ? window.computePriority(exam) : 5;
    const [hover, setHover] = React.useState(false);
    return (
      <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={() => setEditing(exam)}
        style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", borderLeft: `6px solid ${exam.color}`, background: "var(--surface-card)", boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-sm)", padding: "var(--space-4)", cursor: "pointer", opacity: past ? 0.6 : 1, transition: "box-shadow var(--dur-fast) ease", fontFamily: "var(--font-sans)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-2)" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3 style={{ margin: 0, fontWeight: "var(--weight-semibold)", color: "var(--text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exam.name}</h3>
            <p style={{ margin: "2px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{fmtDate(exam.examDate)}</p>
            <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
              {exam.examBoard}
              {!past && priority >= 8 && <span style={{ marginLeft: 6, color: "var(--red-600)", fontWeight: "var(--weight-semibold)" }}>● High priority</span>}
            </p>
          </div>
          <span style={{ flexShrink: 0, borderRadius: "var(--radius-full)", padding: "2px 8px", fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)", background: past ? "var(--slate-100)" : soon ? "var(--amber-100)" : "var(--emerald-100)", color: past ? "var(--slate-500)" : soon ? "var(--amber-700)" : "var(--emerald-700)" }}>
            {past ? t.exams_past_label : `${days}${t.exams_days_away}`}
          </span>
        </div>
        {!past && (
          <div style={{ margin: "var(--space-2) 0", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "var(--text-xs)", color: !started ? "var(--text-faint)" : (pace === "very_behind" || pace === "behind") ? "var(--red-500)" : "var(--emerald-600)", fontWeight: "var(--weight-medium)" }}>
              {!started ? "Not started yet" : (pace === "very_behind" || pace === "behind") ? `⚠️ Behind — ${readiness}% readiness` : `✓ ${readiness}% readiness`}
            </span>
          </div>
        )}
        <p style={{ margin: "var(--space-2) 0", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{exam.topicCount} {t.exams_topics} · {coverage}% covered</p>
        <div style={{ height: 8, background: "var(--surface-sunken)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: "100%", transform: `scaleX(${coverage / 100})`, transformOrigin: "left", background: "var(--action-primary)", borderRadius: "var(--radius-full)", transition: "transform var(--dur-slow) var(--ease-out)" }} />
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
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{t.exams_empty_upcoming}</p>
        ) : (
          <div style={{ display: "grid", gap: "var(--space-4)", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {upcoming.map((e) => <ExamCard key={e.id} exam={e} />)}
          </div>
        )}
      </section>
      <section>
        <p style={{ margin: "0 0 12px", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)" }}>{t.exams_past}</p>
        {pastExams.length === 0 ? (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{t.exams_empty_past}</p>
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
        <AddExamModal
          lastExam={exams[exams.length - 1]}
          lang={t.code || "en"}
          onClose={() => setShowAdd(false)}
          onSave={(newExams) => { setExams(window.getExams()); setShowAdd(false); if (onPlanReady && newExams) onPlanReady(newExams); }}
        />
      ))}
      {editing && (
        <ExamDetailModal
          exam={editing}
          ev={evMap[editing.id]}
          onClose={() => setEditing(null)}
          onSave={(patch) => { updateExam(editing.id, patch); setEditing(null); }}
          onDelete={() => { deleteExam(editing.id); setEditing(null); }}
        />
      )}
    </div>
  );

  function AddExamModal({ lastExam, lang, onClose, onSave }) {
    const defaultDate = (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); })();
    const todayISO = new Date().toISOString().slice(0, 10);
    const profile = React.useMemo(() => window.getProfile ? window.getProfile() : {}, []);
    const suggestedQualId = (window.COUNTRY_TO_EXAM_TYPE && profile.country && window.COUNTRY_TO_EXAM_TYPE[profile.country]) || "gcse";

    // "Same course as X" attaches a second Exam (resit/mock/final...) to an
    // EXISTING courseId — no curriculum lookup, no new Course, shared mastery
    // with lastExam. This is the actual payoff of Course-first (plan §9).
    const [sameCourse, setSameCourse] = React.useState(false);
    const [qualificationId, setQualificationId] = React.useState(suggestedQualId);
    const qual = window.examType(qualificationId);

    const [name, setName] = React.useState("");
    const [examDate, setExamDate] = React.useState(defaultDate);
    const [examBoard, setExamBoard] = React.useState(qual.board || "");
    const [kind, setKind] = React.useState("exam");
    const [notes, setNotes] = React.useState("");
    const [current, setCurrent] = React.useState(qual.grade.current);
    const [target, setTarget] = React.useState(qual.grade.target);

    // CurriculumStep-controlled draft — nothing persists until Add exam is clicked.
    const [courseDraft, setCourseDraft] = React.useState(null);
    const [noTopicList, setNoTopicList] = React.useState(false);
    const [files, setFiles] = React.useState([]);
    const [curriculumValid, setCurriculumValid] = React.useState(false);

    React.useEffect(() => {
      if (sameCourse) {
        setName(lastExam.name);
        setKind("resit");
        return;
      }
      setName("");
      setExamBoard(qual.board || "");
      setCurrent(qual.grade.current);
      setTarget(qual.grade.target);
      setKind("exam");
    }, [sameCourse, qualificationId]);

    const canSave = sameCourse
      ? name.trim() && examDate >= todayISO
      : name.trim() && examDate >= todayISO && curriculumValid;

    React.useEffect(() => {
      const fn = (e) => { if (e.key === "Escape") onClose(); };
      document.addEventListener("keydown", fn);
      return () => document.removeEventListener("keydown", fn);
    }, []);

    function save() {
      let course = null;
      if (!sameCourse && courseDraft && courseDraft.topics && courseDraft.topics.length && window.createCourse) {
        course = window.createCourse(courseDraft);
      }
      const courseId = sameCourse ? lastExam.courseId : (course ? course.id : null);
      const newExams = window.commitExamWizard({
        examDrafts: [{
          name: name.trim(),
          color: null,
          examDate,
          examBoard: sameCourse ? lastExam.examBoard : examBoard,
          topicCount: sameCourse ? lastExam.topicCount : (course ? course.topics.length : 10),
          targetGrade: sameCourse ? (lastExam.targetGrade || "A") : String(target),
          currentGrade: sameCourse ? (lastExam.currentGrade || "C") : String(current),
          gradingSystem: sameCourse ? (lastExam.gradingSystem || null) : qual.grade,
          notes: notes.trim(),
          courseId,
          kind,
        }],
        profilePatch: null,
      });
      if (!sameCourse && !course) {
        // No course resolved ("I don't have a topic list") — same background
        // AI-enrichment fallback the wizard uses.
        const extract = window.requestCourseExtraction || window.requestTopicNames;
        newExams.forEach((e) => { if (extract) extract(e.id, e, files); });
      }
      onSave(newExams);
    }

    const inputStyle = { width: "100%", boxSizing: "border-box", padding: "12px 16px", fontSize: "var(--text-base)", fontFamily: "var(--font-sans)", color: "var(--text-strong)", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", outline: "none" };
    const labelStyle = { display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-body)", marginBottom: "var(--space-1)" };
    const KIND_OPTIONS = [
      { id: "exam", label: t.exams_kind_exam }, { id: "midterm", label: t.exams_kind_midterm }, { id: "final", label: t.exams_kind_final },
      { id: "resit", label: t.exams_kind_resit }, { id: "mock", label: t.exams_kind_mock }, { id: "certification", label: t.exams_kind_cert },
    ];

    return (
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, background: "var(--surface-page)", borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-lg)", padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-3)", maxHeight: "90vh", overflowY: "auto" }}>
          <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>{t.exams_add}</h2>

          {lastExam.courseId && (
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={() => setSameCourse(false)}
                style={{ flex: 1, padding: "10px 12px", borderRadius: "var(--radius-lg)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", cursor: "pointer", fontFamily: "var(--font-sans)",
                  border: !sameCourse ? "2px solid var(--indigo-500)" : "1.5px solid var(--border-default)",
                  background: !sameCourse ? "var(--indigo-50)" : "var(--surface-card)", color: !sameCourse ? "var(--indigo-700)" : "var(--text-body)" }}>
                {t.exams_new_subject}
              </button>
              <button type="button" onClick={() => setSameCourse(true)}
                style={{ flex: 1, padding: "10px 12px", borderRadius: "var(--radius-lg)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", cursor: "pointer", fontFamily: "var(--font-sans)",
                  border: sameCourse ? "2px solid var(--indigo-500)" : "1.5px solid var(--border-default)",
                  background: sameCourse ? "var(--indigo-50)" : "var(--surface-card)", color: sameCourse ? "var(--indigo-700)" : "var(--text-body)" }}>
                {t.exams_same_course(lastExam.name)}
              </button>
            </div>
          )}

          {sameCourse ? (
            <div>
              <label style={labelStyle}>{t.exams_name}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.exams_resit_ph(lastExam.name)} autoFocus style={inputStyle} />
            </div>
          ) : (<>
            <div>
              <label style={labelStyle}>{t.exams_qualification}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {window.EXAM_TYPES.map((e) => {
                  const sel = qualificationId === e.id;
                  return (
                    <button key={e.id} type="button" onClick={() => setQualificationId(e.id)}
                      style={{ padding: "6px 12px", borderRadius: "var(--radius-full)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)", cursor: "pointer", fontFamily: "var(--font-sans)",
                        border: sel ? "2px solid var(--indigo-500)" : "1px solid var(--border-default)",
                        background: sel ? "var(--indigo-50)" : "var(--surface-card)", color: sel ? "var(--indigo-700)" : "var(--text-body)" }}>
                      {e.emoji} {e.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {qual.boardOptions && (
              <div>
                <label style={labelStyle}>{t.exams_board}</label>
                <select value={examBoard} onChange={(e) => setExamBoard(e.target.value)} style={{ ...inputStyle, appearance: "auto" }}>
                  {qual.boardOptions.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            )}
          </>)}

          <div>
            <label style={labelStyle}>{t.exams_date}</label>
            <input type="date" value={examDate} min={todayISO} onChange={(e) => setExamDate(e.target.value)} style={inputStyle} />
          </div>

          {!sameCourse && (
            <window.CurriculumStep
              countryId={profile.country || null}
              qualificationId={qualificationId}
              board={qual.boardOptions ? examBoard : null}
              specVersion={null}
              lang={lang}
              subject={name}
              onSubjectChange={setName}
              course={courseDraft}
              onCourseChange={setCourseDraft}
              noTopicList={noTopicList}
              onNoTopicListChange={setNoTopicList}
              files={files}
              onFilesChange={setFiles}
              compact
              onValidationChange={setCurriculumValid}
            />
          )}

          {!sameCourse && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>{t.exams_current}</p>
                <window.GradePicker grade={qual.grade} value={current} onChange={setCurrent} accent="var(--text-muted)" />
              </div>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--indigo-600)" }}>{t.exams_target}</p>
                <window.GradePicker grade={qual.grade} value={target} onChange={setTarget} accent="var(--indigo-600)" />
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>{t.exams_kind}</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {KIND_OPTIONS.map((k) => {
                const sel = kind === k.id;
                return (
                  <button key={k.id} type="button" onClick={() => setKind(k.id)}
                    style={{ padding: "6px 12px", borderRadius: "var(--radius-full)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)", cursor: "pointer", fontFamily: "var(--font-sans)",
                      border: sel ? "2px solid var(--indigo-500)" : "1px solid var(--border-default)",
                      background: sel ? "var(--indigo-50)" : "var(--surface-card)", color: sel ? "var(--indigo-700)" : "var(--text-body)" }}>
                    {k.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={labelStyle}>
              {t.exams_notes} <span style={{ color: "var(--text-faint)", fontWeight: "normal", fontSize: "var(--text-xs)" }}>{t.exams_optional}</span>
            </label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder={t.exams_notes_ph} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
            <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-muted)", fontWeight: "var(--weight-semibold)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>{t.exams_cancel}</button>
            <button onClick={save} disabled={!canSave} style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-lg)", border: "none", background: canSave ? "var(--indigo-600)" : "var(--slate-200)", color: canSave ? "#fff" : "var(--text-faint)", fontWeight: "var(--weight-semibold)", cursor: canSave ? "pointer" : "default", fontFamily: "var(--font-sans)" }}>{t.exams_add_submit}</button>
          </div>
        </div>
      </div>
    );
  }

  function ExamDetailModal({ exam, ev, onClose, onSave, onDelete }) {
    const [confirmDelete, setConfirmDelete] = React.useState(false);
    const [editing, setEditingMode] = React.useState(false);
    const todayISO = new Date().toISOString().slice(0, 10);
    const [examDate, setExamDate] = React.useState(exam.examDate);
    const [topicCount, setTopicCount] = React.useState(exam.topicCount);
    const [targetGrade, setTargetGrade] = React.useState(exam.targetGrade);
    const [notes, setNotes] = React.useState(exam.notes || "");

    const coverage = ev ? ev.coverage : (exam.completionPct || 0);
    const readiness = ev ? ev.readiness : 0;
    const started = ev ? ev.started : false;
    const topicCountDisplay = Math.max(1, exam.topicCount || 10);
    const coveredTopics = Math.round((coverage / 100) * topicCountDisplay);
    const predictedGrade = ev ? ev.predictedGrade : "–";
    const probability = ev ? ev.probability : 0;
    const canSaveEdit = examDate >= todayISO && Number(topicCount) >= 1 && String(targetGrade).trim();

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

    function saveEdit() {
      onSave({ examDate, topicCount: Number(topicCount), targetGrade: String(targetGrade).trim(), notes: notes.trim() });
    }

    const editInputStyle = { width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", color: "var(--text-strong)", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", outline: "none" };

    return (
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, background: "var(--surface-page)", borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-lg)", padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: exam.color, flexShrink: 0 }} />
            <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)", flex: 1 }}>{exam.name}</h2>
            {!editing && (
              <button onClick={() => setEditingMode(true)} style={{ border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--indigo-600)", borderRadius: "var(--radius-lg)", padding: "6px 12px", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Edit</button>
            )}
          </div>

          {editing ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                <div>
                  <label style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-faint)", marginBottom: 4 }}>Exam date</label>
                  <input type="date" value={examDate} min={todayISO} onChange={(e) => setExamDate(e.target.value)} style={editInputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-faint)", marginBottom: 4 }}>Topics</label>
                  <input type="number" min={1} value={topicCount} onChange={(e) => setTopicCount(e.target.value)} style={editInputStyle} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-faint)", marginBottom: 4 }}>Target grade</label>
                <input value={targetGrade} onChange={(e) => setTargetGrade(e.target.value)} style={editInputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-faint)", marginBottom: 4 }}>Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...editInputStyle, resize: "vertical", lineHeight: 1.6 }} />
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
                <button onClick={() => setEditingMode(false)} style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-muted)", fontWeight: "var(--weight-semibold)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Cancel</button>
                <button onClick={saveEdit} disabled={!canSaveEdit} style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-lg)", border: "none", background: canSaveEdit ? "var(--indigo-600)" : "var(--slate-200)", color: canSaveEdit ? "#fff" : "var(--text-faint)", fontWeight: "var(--weight-semibold)", cursor: canSaveEdit ? "pointer" : "default", fontFamily: "var(--font-sans)" }}>Save changes</button>
              </div>
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{fmtDate(exam.examDate)} · {exam.examBoard} · {exam.topicCount} topics</p>
              {(() => {
                const priority = window.computePriority ? window.computePriority(exam) : 5;
                return (
                  <p style={{ margin: 0, fontSize: "var(--text-xs)", color: priority >= 8 ? "var(--red-600)" : "var(--text-faint)", fontWeight: priority >= 8 ? "var(--weight-semibold)" : "normal" }}>
                    {"★".repeat(Math.ceil(priority / 2))}{"☆".repeat(5 - Math.ceil(priority / 2))} Priority {priority}/10
                  </p>
                );
              })()}
              {exam.notes && (
                <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)", background: "var(--surface-muted)", borderRadius: "var(--radius-lg)", padding: "8px 10px", lineHeight: 1.5 }}>{exam.notes}</p>
              )}

              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)" }}>
                <div style={{ textAlign: "center", padding: "var(--space-3)", borderRadius: "var(--radius-lg)", background: "var(--surface-muted)" }}>
                  <div style={{ fontSize: started ? "var(--text-lg)" : "var(--text-xs)", fontWeight: "var(--weight-bold)", color: started ? "var(--text-strong)" : "var(--text-faint)" }}>{started ? `${readiness}%` : "Not started"}</div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Readiness</div>
                </div>
                <div style={{ textAlign: "center", padding: "var(--space-3)", borderRadius: "var(--radius-lg)", background: "var(--surface-muted)" }}>
                  <div style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>{started ? predictedGrade : "–"}</div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Predicted</div>
                </div>
                <div style={{ textAlign: "center", padding: "var(--space-3)", borderRadius: "var(--radius-lg)", background: "var(--surface-muted)" }}>
                  <div style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>{started ? `${probability}%` : "–"}</div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Target chance</div>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 6 }}>
                  <span>Topics covered</span><strong style={{ color: "var(--text-strong)" }}>{coveredTopics}/{topicCountDisplay} · {coverage}%</strong>
                </div>
                <div style={{ height: 8, background: "var(--surface-sunken)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "100%", transform: `scaleX(${coverage / 100})`, transformOrigin: "left", background: exam.color, borderRadius: "var(--radius-full)", transition: "transform 0.4s ease" }} />
                </div>
                <p style={{ margin: "8px 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)", lineHeight: 1.5 }}>
                  Updates automatically as you study — mark topics as covered on the session recap.
                </p>
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
                <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-muted)", fontWeight: "var(--weight-semibold)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Close</button>
              </div>
            </>
          )}
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
