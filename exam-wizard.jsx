// AI Exam Coach — the one exam wizard. Onboarding and "Add Exam" both render
// this component with a different config object; neither branches on a mode
// string internally (see EXAM_WIZARD_PRESETS below, the only place that
// knows what "onboarding" vs "add exam" means). commitExamWizard() in
// exams-store.jsx is the only place that writes a new exam to localStorage;
// requestAiEnrichment() in ai-enrichment.jsx runs in the background and
// never blocks reaching the Dashboard.

// One config object per entry point — this is the only place "onboarding"
// and "addExam" exist as concepts; everything else reads named flags.
const EXAM_WIZARD_PRESETS = {
  onboarding: { showWelcome: true, globalSettings: "ask", aiEnrichment: true, finishLabelKey: "accept" },
  addExam: { showWelcome: false, globalSettings: "collapsed", aiEnrichment: true, finishLabelKey: "finish_add" },
};

// Weekly-hours slider + materials/preferences chip grids — exactly the same
// controls used in "ask" (full, always expanded) and "collapsed" (prefilled,
// starts collapsed with an Edit toggle) modes. One component, used both
// ways: improving it improves both flows.
function GlobalSettingsSection({ c, lang, collapsedByDefault, weeklyHours, setWeeklyHours, materials, setMaterials, prefs, setPrefs, toggle, onAiEstimate, daysPerWeek, setDaysPerWeek, sessionLengthMin, setSessionLengthMin, blackoutSlots, setBlackoutSlots }) {
  const [expanded, setExpanded] = React.useState(!collapsedByDefault);
  const accent = "var(--indigo-600)";

  if (!expanded) {
    const materialLabels = window.MATERIALS.filter((m) => materials.has(m.id)).map((m) => m[lang] || m.en);
    const prefLabels = window.PREFERENCES.filter((p) => prefs.has(p.id)).map((p) => p[lang] || p.en);
    const summary = [`${weeklyHours} ${c.s3_hours}`, `${daysPerWeek}d/wk`, `${sessionLengthMin}m`, materialLabels.join(", "), prefLabels.join(", ")].filter(Boolean).join(" · ");
    return (
      <div style={{ borderRadius: "var(--radius-2xl)", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", padding: "var(--space-4)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>{c.settings_title}</p>
          <p style={{ margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--text-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{summary}</p>
        </div>
        <button type="button" onClick={() => setExpanded(true)}
          style={{ flexShrink: 0, border: "1px solid var(--border-default)", background: "var(--surface-page)", color: "var(--indigo-600)", borderRadius: "var(--radius-lg)", padding: "8px 14px", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
          {c.settings_edit}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {collapsedByDefault && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>{c.settings_title}</p>
          <button type="button" onClick={() => setExpanded(false)}
            style={{ border: "none", background: "transparent", color: "var(--indigo-600)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            {c.settings_done}
          </button>
        </div>
      )}
      <div>
        <div style={{ textAlign: "center", marginBottom: "var(--space-3)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-6xl)", fontWeight: "var(--weight-bold)", color: accent, lineHeight: 1 }}>{weeklyHours}</span>
          <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{c.s3_hours}</p>
        </div>
        <input type="range" min={2} max={40} step={1} value={weeklyHours} onChange={(e) => setWeeklyHours(Number(e.target.value))} style={{ width: "100%", accentColor: accent, height: 28 }} />
        <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
          {[5, 10, 15, 20, 30].map((h) => (
            <button key={h} type="button" onClick={() => setWeeklyHours(h)}
              style={{ flex: 1, minHeight: 44, borderRadius: "var(--radius-lg)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", cursor: "pointer", fontFamily: "var(--font-sans)",
                border: weeklyHours === h ? "2px solid var(--indigo-500)" : "1.5px solid var(--border-default)",
                background: weeklyHours === h ? "var(--indigo-50)" : "var(--surface-card)",
                color: weeklyHours === h ? "var(--indigo-700)" : "var(--text-muted)" }}>{h}h</button>
          ))}
        </div>
        {onAiEstimate && (
          <button type="button" onClick={onAiEstimate}
            style={{ display: "block", margin: "var(--space-4) auto 0", border: "none", background: "transparent", color: "var(--indigo-600)", fontWeight: "var(--weight-medium)", fontSize: "var(--text-sm)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            ✨ Let AI estimate this for me
          </button>
        )}
      </div>
      <window.AvailabilityGrid
        daysPerWeek={daysPerWeek} setDaysPerWeek={setDaysPerWeek}
        sessionLengthMin={sessionLengthMin} setSessionLengthMin={setSessionLengthMin}
        blackoutSlots={blackoutSlots} setBlackoutSlots={setBlackoutSlots} />
      <div>
        <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>{c.s4_materials}</p>
        <window.ChipGrid items={window.MATERIALS} selected={materials} onToggle={toggle(setMaterials)} lang={lang} />
      </div>
      <div>
        <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>{c.s4_prefs}</p>
        <window.ChipGrid items={window.PREFERENCES} selected={prefs} onToggle={toggle(setPrefs)} lang={lang} />
      </div>
    </div>
  );
}

function ExamWizard({ config, initialExam, lang, onLangChange, onFinish, onCancel }) {
  const cfg = config || EXAM_WIZARD_PRESETS.addExam;
  const { Button } = window.AIExamCoachDesignSystem_99e467;
  const c = window.ONB[lang] || window.ONB.en;
  const langs = Object.values(window.LANGS || {});
  const profile = React.useMemo(() => window.getProfile(), []);

  // ── step list, built from config — no mode checks, just named flags ──────
  const stepKeys = React.useMemo(() => {
    const ks = ["type", "subject"];
    if (cfg.globalSettings !== "hidden") ks.push("settings");
    ks.push("review");
    return ks;
  }, [cfg.globalSettings]);
  const [stepIdx, setStepIdx] = React.useState(() => cfg.showWelcome ? -1 : 0); // index into stepKeys; -1 = welcome
  const step = stepIdx === -1 ? "welcome" : stepKeys[stepIdx];
  const stepNum = (cfg.showWelcome ? 1 : 0) + stepIdx + 1;
  const totalSteps = (cfg.showWelcome ? 1 : 0) + stepKeys.length;

  // ── exam type + grading system ────────────────────────────────────────────
  const [examId, setExamId] = React.useState(initialExam?.gradingSystem ? "custom" : "alevel");
  const [customGradeType, setCustomGradeType] = React.useState(null);
  const CUSTOM_PRESETS = {
    percentage: { min: 0, max: 100, suffix: "%", passMark: 60 },
    gpa: { min: 0, max: 4, suffix: "", passMark: 2 },
    points: { min: "", max: "", suffix: "", passMark: "" },
    custom: { min: "", max: "", suffix: "", passMark: "" },
  };
  const [customMin, setCustomMin] = React.useState("");
  const [customMax, setCustomMax] = React.useState("");
  const [customSuffix, setCustomSuffix] = React.useState("");
  const [customPassMark, setCustomPassMark] = React.useState("");
  const [customLetterText, setCustomLetterText] = React.useState("A*, A, B, C, D, E");
  const [customLetterPass, setCustomLetterPass] = React.useState("D");
  const pickCustomGradeType = (type) => {
    setCustomGradeType(type);
    if (type !== "letter") {
      const preset = CUSTOM_PRESETS[type];
      setCustomMin(preset.min); setCustomMax(preset.max); setCustomSuffix(preset.suffix); setCustomPassMark(preset.passMark);
    }
  };
  const customLetterOptions = customLetterText.split(",").map((s) => s.trim()).filter(Boolean);
  const customGradeDef = customGradeType === "letter"
    ? { kind: "scale", options: customLetterOptions, passMark: customLetterPass }
    : { kind: "score", min: Number(customMin) || 0, max: Number(customMax) || 100, step: customGradeType === "gpa" ? 0.1 : 1, suffix: customSuffix, passMark: customPassMark === "" ? undefined : Number(customPassMark) };
  const customCurrent = customGradeDef.kind === "scale" ? (customGradeDef.options[1] ?? customGradeDef.options[0] ?? "") : Math.round(((Number(customMin) || 0) + (Number(customMax) || 100)) / 2);
  const customTarget = customGradeDef.kind === "scale" ? (customGradeDef.options[0] ?? "") : (Number(customMax) || 100);
  const customPassHelper = (() => {
    if (customGradeDef.kind === "scale") return customLetterPass ? `Pass mark = ${customLetterPass} or above` : null;
    const { min, max, passMark } = customGradeDef;
    if (passMark === undefined || max === min) return null;
    return `Pass mark = ${Math.round(((passMark - min) / (max - min)) * 100)}%`;
  })();
  const exam = examId === "custom"
    ? { ...window.examType("custom"), grade: { ...customGradeDef, current: customCurrent, target: customTarget } }
    : window.examType(examId);
  const applyCustomGrading = () => {
    setSubjects((subs) => subs.map((s) => ({ ...s, current: customCurrent, target: customTarget })));
  };

  // ── subjects (one per exam created this run) ──────────────────────────────
  const todayISO = new Date().toISOString().slice(0, 10);
  const defaultExamDate = (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); })();
  const blankSubject = () => ({
    id: "s" + Date.now(), name: "", color: "var(--subject-indigo)",
    current: exam.grade.current, target: exam.grade.target,
    examDate: defaultExamDate, topicCount: 10, examBoard: exam.board,
    topicsText: "",
  });
  const [subjects, setSubjects] = React.useState(() => initialExam ? [{
    id: initialExam.id, name: initialExam.name, color: initialExam.color,
    current: initialExam.currentGrade || exam.grade.current, target: initialExam.targetGrade || exam.grade.target,
    examDate: initialExam.examDate, topicCount: initialExam.topicCount, examBoard: initialExam.examBoard,
    topicsText: (initialExam.topics || []).join("\n"),
  }] : [blankSubject()]);
  const loadDemoData = () => setSubjects(window.DEFAULT_SUBJECTS.map((s) => ({ ...s, current: exam.grade.current, target: exam.grade.target, examDate: defaultExamDate, topicCount: 10, examBoard: exam.board })));
  const pickExam = (id) => {
    const e = window.examType(id);
    setExamId(id);
    setSubjects((subs) => subs.map((s) => ({ ...s, current: e.grade.current, target: e.grade.target, examBoard: s.examBoard || e.board })));
  };
  const COLORS = ["indigo", "rose", "teal", "violet", "orange", "cyan", "pink", "emerald"];
  const addSubject = () => setSubjects((subs) => [...subs, {
    id: "s" + Date.now(), name: "", color: `var(--subject-${COLORS[subs.length % COLORS.length]})`,
    current: exam.grade.current, target: exam.grade.target, examDate: defaultExamDate, topicCount: 10, examBoard: exam.board,
  }]);
  const removeSubject = (id) => setSubjects((subs) => subs.filter((s) => s.id !== id));
  const setSubject = (id, patch) => setSubjects((subs) => subs.map((s) => s.id === id ? { ...s, ...patch } : s));

  // ── global settings (prefilled from profile; only persisted if touched) ──
  const [weeklyHours, setWeeklyHours] = React.useState(profile.weeklyHours);
  const [daysPerWeek, setDaysPerWeek] = React.useState(profile.daysPerWeek);
  const [sessionLengthMin, setSessionLengthMin] = React.useState(profile.sessionLengthMin);
  const [blackoutSlots, setBlackoutSlots] = React.useState(() => profile.blackoutSlots);
  const [materials, setMaterials] = React.useState(() => new Set(profile.materials));
  const [prefs, setPrefs] = React.useState(() => new Set(profile.prefs));
  const toggle = (setFn) => (id) => setFn((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── files (only relevant when AI enrichment is on) ────────────────────────
  const [files, setFiles] = React.useState([]);
  const [aiModalOpen, setAiModalOpen] = React.useState(false);
  const [sessionsBySubject, setSessionsBySubject] = React.useState({});

  const accent = "var(--indigo-600)";
  const subjectsValid = subjects.length > 0 && subjects.every((s) =>
    !s.name.trim() || (s.name.trim() && s.examDate >= todayISO && Number(s.topicCount) >= 1));
  const canNext = step !== "subject" || (subjects.some((s) => s.name.trim()) && subjectsValid);

  function goNext() { setStepIdx((i) => Math.min(stepKeys.length - 1, i + 1)); }
  function goBack() { setStepIdx((i) => (i === 0 && cfg.showWelcome ? -1 : Math.max(0, i - 1))); }

  function handleFinish() {
    const named = subjects.filter((s) => s.name.trim());
    const rows = named.length ? named : subjects;
    const examDrafts = rows.map((s) => ({
      name: s.name.trim() || "My subject",
      color: null, // resolved by commitExamWizard's FALLBACK_COLORS rotation
      examDate: s.examDate,
      examBoard: s.examBoard,
      topicCount: Number(s.topicCount) || 10,
      targetGrade: String(s.target),
      currentGrade: String(s.current),
      gradingSystem: exam.grade,
      sessionsPerWeekHint: sessionsBySubject[s.id] ?? null,
    }));
    const profilePatch = cfg.globalSettings !== "hidden"
      ? { weeklyHours, daysPerWeek, sessionLengthMin, blackoutSlots, materials: [...materials], prefs: [...prefs] }
      : null;

    const newExams = window.commitExamWizard({ examDrafts, profilePatch });

    if (cfg.aiEnrichment && window.requestAiEnrichment) {
      // Fire-and-forget — deliberately not awaited, runs at module scope so it
      // survives this component unmounting the instant onFinish() navigates away.
      window.requestAiEnrichment(newExams.map((e) => e.id), {
        files, subjects: rows, weeklyHours, materials: [...materials], prefs: [...prefs], examLabel: exam.label,
      });
    }

    if (cfg.aiEnrichment) {
      const extract = window.requestCourseExtraction || window.requestTopicNames;
      newExams.forEach((newExam, i) => {
        const s = rows[i];
        const manualTopics = (s.topicsText || "").split("\n").map((t) => t.trim()).filter(Boolean);
        if (manualTopics.length) {
          // User typed their own topics — apply immediately, skip AI call entirely.
          if (window.patchExamAi) window.patchExamAi(newExam.id, { topics: manualTopics, topicsStatus: "ready", topicCount: manualTopics.length });
          if (window.relabelPendingSessions) window.relabelPendingSessions(newExam.id, manualTopics);
        } else if (extract) {
          extract(newExam.id, newExam, files);
        }
      });
    }

    onFinish(newExams);
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(to bottom, var(--indigo-50), #FAF5FF)", display: "flex", justifyContent: "center", fontFamily: "var(--font-sans)" }}>
      <style>{`@keyframes onb-spin{to{transform:rotate(360deg)}}@keyframes onb-rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
      <div style={{ width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", minHeight: "100vh" }}>

        <div style={{ padding: "var(--space-5) var(--space-5) var(--space-3)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: "var(--weight-bold)", color: "var(--text-strong)", fontSize: "var(--text-base)" }}>
              <span aria-hidden="true">🤖</span><span>AI Exam Coach</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {onLangChange && langs.map((l) => (
                <button key={l.code} onClick={() => onLangChange(l.code)} title={l.label}
                  style={{ border: lang === l.code ? "2px solid var(--indigo-500)" : "2px solid transparent", borderRadius: "var(--radius-full)", background: "transparent", cursor: "pointer", fontSize: "var(--text-lg)", padding: "2px", lineHeight: 1 }}>
                  {l.flag}
                </button>
              ))}
              {onCancel && (
                <button onClick={onCancel} aria-label="Close" style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-faint)", fontSize: "var(--text-lg)", padding: "2px", lineHeight: 1 }}>✕</button>
              )}
            </div>
          </div>
          {step !== "welcome" && (
            <>
              <div style={{ display: "flex", gap: 6 }}>
                {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => (
                  <div key={n} style={{ flex: 1, height: 5, borderRadius: "var(--radius-full)", background: n <= stepNum ? "var(--indigo-500)" : "var(--slate-200)", transition: "background var(--dur-normal) ease" }} />
                ))}
              </div>
              <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)", fontWeight: "var(--weight-medium)" }}>{c.step_of(stepNum, totalSteps)}</p>
            </>
          )}
        </div>

        <div style={{ flex: 1, padding: "var(--space-3) var(--space-5) var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

          {step === "welcome" && <window.CoachBubble advisor={c.advisor}>{c.greeting}</window.CoachBubble>}

          {step === "type" && (<>
            <div>
              <h2 style={{ margin: "0 0 4px", fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>{c.s1_title}</h2>
              <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{c.s1_sub}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                {window.EXAM_TYPES.map((e) => {
                  const sel = examId === e.id;
                  return (
                    <button key={e.id} type="button" onClick={() => pickExam(e.id)}
                      style={{ display: "flex", flexDirection: "column", gap: 2, minHeight: 76, padding: "var(--space-3)", borderRadius: "var(--radius-xl)", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)",
                        border: sel ? "2px solid var(--indigo-500)" : "1.5px solid var(--border-default)",
                        background: sel ? "var(--indigo-50)" : "var(--surface-card)",
                        boxShadow: sel ? "var(--shadow-sm)" : "none", transition: "all var(--dur-fast) ease" }}>
                      <span aria-hidden="true" style={{ fontSize: 20 }}>{e.emoji}</span>
                      <span style={{ fontSize: "var(--text-base)", fontWeight: "var(--weight-bold)", color: sel ? "var(--indigo-700)" : "var(--text-strong)" }}>{e.label}</span>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{e.blurb}</span>
                    </button>
                  );
                })}
              </div>
              {examId === "custom" && (
                <div style={{ marginTop: "var(--space-4)", borderRadius: "var(--radius-2xl)", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  <p style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>How are your exams graded?</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                    {[
                      { id: "percentage", emoji: "💯", label: "Percentage", blurb: "0–100" },
                      { id: "letter", emoji: "🔤", label: "Letter grades", blurb: "A, B, C…" },
                      { id: "gpa", emoji: "🎓", label: "GPA", blurb: "0–4.0" },
                      { id: "points", emoji: "🔢", label: "Points", blurb: "your own range" },
                      { id: "custom", emoji: "✏️", label: "Custom", blurb: "fully freeform" },
                    ].map((opt) => {
                      const sel = customGradeType === opt.id;
                      return (
                        <button key={opt.id} type="button" onClick={() => pickCustomGradeType(opt.id)}
                          style={{ display: "flex", flexDirection: "column", gap: 2, minHeight: 64, padding: "var(--space-3)", borderRadius: "var(--radius-xl)", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)",
                            border: sel ? "2px solid var(--indigo-500)" : "1.5px solid var(--border-default)",
                            background: sel ? "var(--indigo-50)" : "var(--surface-page)",
                            boxShadow: sel ? "var(--shadow-sm)" : "none", transition: "all var(--dur-fast) ease" }}>
                          <span aria-hidden="true" style={{ fontSize: 18 }}>{opt.emoji}</span>
                          <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-bold)", color: sel ? "var(--indigo-700)" : "var(--text-strong)" }}>{opt.label}</span>
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{opt.blurb}</span>
                        </button>
                      );
                    })}
                  </div>
                  {customGradeType && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", animation: "onb-rise var(--dur-normal) var(--ease-out)" }}>
                      {customGradeType === "letter" ? (
                        <>
                          <div>
                            <label style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 4 }}>Grade labels, best to worst, comma-separated</label>
                            <input value={customLetterText} onChange={(e) => setCustomLetterText(e.target.value)} placeholder="A*, A, B, C, D, E"
                              style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", color: "var(--text-strong)", background: "var(--surface-page)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", outline: "none" }} />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 4 }}>Which grade is the pass mark?</label>
                            <select value={customLetterPass} onChange={(e) => setCustomLetterPass(e.target.value)}
                              style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", color: "var(--text-strong)", background: "var(--surface-page)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", appearance: "none" }}>
                              {customLetterOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </div>
                        </>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)" }}>
                          <div>
                            <label style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 4 }}>Lowest score</label>
                            <input type="number" value={customMin} onChange={(e) => setCustomMin(e.target.value)} placeholder="0"
                              style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", color: "var(--text-strong)", background: "var(--surface-page)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", outline: "none" }} />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 4 }}>Highest score</label>
                            <input type="number" value={customMax} onChange={(e) => setCustomMax(e.target.value)} placeholder={customGradeType === "points" ? "e.g. 20" : "100"}
                              style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", color: "var(--text-strong)", background: "var(--surface-page)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", outline: "none" }} />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 4 }}>Pass mark</label>
                            <input type="number" value={customPassMark} onChange={(e) => setCustomPassMark(e.target.value)} placeholder="60"
                              style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", color: "var(--text-strong)", background: "var(--surface-page)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", outline: "none" }} />
                          </div>
                        </div>
                      )}
                      {customPassHelper && <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{customPassHelper}</p>}
                      <button type="button" onClick={applyCustomGrading}
                        style={{ alignSelf: "flex-start", border: "none", background: "var(--indigo-600)", color: "#fff", borderRadius: "var(--radius-lg)", padding: "12px 22px", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                        Continue
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>)}

          {step === "subject" && (<>
            <div>
              <h2 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>{c.s2_title}</h2>
              <p style={{ margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{c.s2_sub}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {subjects.map((s) => (
                <div key={s.id} style={{ borderRadius: "var(--radius-2xl)", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderLeft: `5px solid ${s.color}`, boxShadow: "var(--shadow-sm)", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <input value={s.name} onChange={(e) => setSubject(s.id, { name: e.target.value })} placeholder={c.s2_name_ph}
                      style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "var(--text-base)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)", fontFamily: "var(--font-sans)" }} />
                    {subjects.length > 1 && (
                      <button type="button" onClick={() => removeSubject(s.id)} aria-label="Remove" style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-faint)", fontSize: 16, padding: 4 }}>✕</button>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-faint)", marginBottom: 4 }}>{c.s2_examdate}</label>
                      <input type="date" value={s.examDate} min={todayISO} onChange={(e) => setSubject(s.id, { examDate: e.target.value })}
                        style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", color: "var(--text-strong)", background: "var(--surface-page)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-faint)", marginBottom: 4 }}>{c.s2_topics}</label>
                      <input type="number" min={1} value={s.topicCount} onChange={(e) => setSubject(s.id, { topicCount: e.target.value })}
                        style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", color: "var(--text-strong)", background: "var(--surface-page)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", outline: "none" }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-faint)", marginBottom: 4 }}>{c.s2_board}</label>
                    <input value={s.examBoard} onChange={(e) => setSubject(s.id, { examBoard: e.target.value })}
                      style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", color: "var(--text-strong)", background: "var(--surface-page)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-faint)", marginBottom: 4 }}>
                      Your topics <span style={{ color: "var(--text-faint)", fontWeight: "normal" }}>(one per line — or leave blank and AI will suggest)</span>
                    </label>
                    <textarea
                      value={s.topicsText}
                      onChange={(e) => setSubject(s.id, { topicsText: e.target.value })}
                      rows={4}
                      placeholder={"e.g.\nForces & Motion\nEnergy\nWaves\nElectricity"}
                      style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", color: "var(--text-strong)", background: "var(--surface-page)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", outline: "none", resize: "vertical", lineHeight: 1.6 }}
                    />
                  </div>
                  <div>
                    <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>{c.s2_current}</p>
                    <window.GradePicker grade={exam.grade} value={s.current} onChange={(v) => setSubject(s.id, { current: v })} accent="var(--text-muted)" />
                  </div>
                  <div>
                    <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--indigo-600)" }}>{c.s2_target}</p>
                    <window.GradePicker grade={exam.grade} value={s.target} onChange={(v) => setSubject(s.id, { target: v })} accent="var(--indigo-600)" />
                  </div>
                </div>
              ))}
              <button type="button" onClick={addSubject}
                style={{ minHeight: 48, borderRadius: "var(--radius-xl)", border: "1.5px dashed var(--border-default)", background: "transparent", color: "var(--indigo-600)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                {c.s2_add}
              </button>
              {cfg.showWelcome && (
                <button type="button" onClick={loadDemoData}
                  style={{ border: "none", background: "transparent", color: "var(--text-faint)", fontWeight: "var(--weight-medium)", fontSize: "var(--text-xs)", cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "center" }}>
                  Just exploring? Load demo data
                </button>
              )}
            </div>
          </>)}

          {step === "settings" && (<>
            <div>
              <h2 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>{c.settings_title}</h2>
              <p style={{ margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{c.settings_sub}</p>
            </div>
            <GlobalSettingsSection c={c} lang={lang} collapsedByDefault={cfg.globalSettings === "collapsed"}
              weeklyHours={weeklyHours} setWeeklyHours={setWeeklyHours}
              daysPerWeek={daysPerWeek} setDaysPerWeek={setDaysPerWeek}
              sessionLengthMin={sessionLengthMin} setSessionLengthMin={setSessionLengthMin}
              blackoutSlots={blackoutSlots} setBlackoutSlots={setBlackoutSlots}
              materials={materials} setMaterials={setMaterials}
              prefs={prefs} setPrefs={setPrefs} toggle={toggle}
              onAiEstimate={cfg.aiEnrichment ? () => setAiModalOpen(true) : null} />
            {cfg.aiEnrichment && (
              <window.UploadZone files={files} copy={c}
                onAdd={(fs) => setFiles((prev) => [...prev, ...fs])}
                onRemove={(i) => setFiles((prev) => prev.filter((_, j) => j !== i))} />
            )}
          </>)}

          {step === "review" && (<>
            <div>
              <h2 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>{c.s5_title}</h2>
              <p style={{ margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{c.s5_sub}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {(() => {
                const named = subjects.filter((s) => s.name.trim());
                const rows = named.length ? named : subjects;
                return rows.map((s) => {
                  const defaultSessions = Math.max(1, Math.round(weeklyHours / rows.length));
                  const sessions = sessionsBySubject[s.id] ?? defaultSessions;
                  return (
                    <window.PlanRow key={s.id} noHistory copy={c}
                      row={{ id: s.id, name: s.name.trim() || "My subject", color: s.color, examDate: s.examDate, current: s.current, target: s.target, probability: 0, sessions }}
                      onSessions={(v) => setSessionsBySubject((m) => ({ ...m, [s.id]: v }))} />
                  );
                });
              })()}
            </div>
          </>)}
        </div>

        <div style={{ position: "sticky", bottom: 0, padding: "var(--space-4) var(--space-5)", background: "linear-gradient(to top, #FAF5FF 70%, transparent)", display: "flex", gap: "var(--space-3)" }}>
          {step !== "welcome" && !(stepIdx === 0 && !cfg.showWelcome) && <Button variant="secondary" size="lg" onClick={goBack}>{c.back}</Button>}
          {step === "welcome"
            ? <Button variant="accent" size="lg" fullWidth onClick={goNext}>{c.next}</Button>
            : step !== "review"
              ? <Button variant="accent" size="lg" fullWidth disabled={!canNext} onClick={goNext}>{c.next}</Button>
              : <Button variant="primary" size="lg" fullWidth onClick={handleFinish}>{c[cfg.finishLabelKey] || c.accept}</Button>}
        </div>
      </div>

      {aiModalOpen && (
        <window.AiHoursModal subjects={subjects} examLabel={exam.label}
          onApply={(h) => { setWeeklyHours(h); setAiModalOpen(false); }}
          onClose={() => setAiModalOpen(false)} />
      )}
    </div>
  );
}

Object.assign(window, { ExamWizard, EXAM_WIZARD_PRESETS });
