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
            {c.ai_estimate_link}
          </button>
        )}
      </div>
      <window.AvailabilityGrid
        daysPerWeek={daysPerWeek} setDaysPerWeek={setDaysPerWeek}
        sessionLengthMin={sessionLengthMin} setSessionLengthMin={setSessionLengthMin}
        blackoutSlots={blackoutSlots} setBlackoutSlots={setBlackoutSlots} copy={c} />
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

// Own footer buttons — no dependency on the legacy _ds_bundle design system.
function WizardButton({ variant = "primary", fullWidth, disabled, onClick, children }) {
  const styles = {
    primary:   { background: disabled ? "var(--slate-300)" : "var(--ink-900)", color: "#fff", border: "none", boxShadow: disabled ? "none" : "var(--shadow-md)" },
    accent:    { background: disabled ? "var(--slate-300)" : "var(--indigo-600)", color: "#fff", border: "none", boxShadow: disabled ? "none" : "var(--shadow-sm)" },
    secondary: { background: "var(--surface-card)", color: "var(--text-strong)", border: "1px solid var(--border-strong)", boxShadow: "var(--shadow-sm)" },
  }[variant];
  return (
    <button type="button" disabled={disabled} onClick={onClick} style={{
      ...styles, flex: fullWidth ? 1 : "none", minHeight: 52, padding: "14px 26px",
      borderRadius: "var(--radius-full)", fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)",
      cursor: disabled ? "default" : "pointer", fontFamily: "var(--font-sans)",
      transition: "transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
    }}>{children}</button>
  );
}

function ExamWizard({ config, initialExam, lang, onLangChange, onFinish, onCancel }) {
  const cfg = config || EXAM_WIZARD_PRESETS.addExam;
  const Button = ({ variant, size, fullWidth, disabled, onClick, children }) =>
    <WizardButton variant={variant} fullWidth={fullWidth} disabled={disabled} onClick={onClick}>{children}</WizardButton>;
  const c = window.ONB[lang] || window.ONB.en;
  const langs = Object.values(window.LANGS || {});
  const profile = React.useMemo(() => window.getProfile(), []);

  // ── education profile (Phase 1) ─────────────────────────────────────────
  const [country, setCountry] = React.useState(profile.country || "");
  const [educationLevel, setEducationLevel] = React.useState(profile.educationLevel || "");
  const [currentYear, setCurrentYear] = React.useState(profile.currentYear || "");
  const needsProfile = cfg.showWelcome && !profile.country;

  // ── step list, built from config — no mode checks, just named flags ──────
  const stepKeys = React.useMemo(() => {
    const ks = [];
    if (needsProfile) ks.push("profile");
    ks.push("type", "subject");
    if (cfg.globalSettings !== "hidden") ks.push("settings");
    ks.push("review");
    return ks;
  }, [cfg.globalSettings, needsProfile]);
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
    courseDraft: null, noTopicList: false, syllabusFiles: [], curriculumValid: false,
  });
  const [subjects, setSubjects] = React.useState(() => initialExam ? [{
    id: initialExam.id, name: initialExam.name, color: initialExam.color,
    current: initialExam.currentGrade || exam.grade.current, target: initialExam.targetGrade || exam.grade.target,
    examDate: initialExam.examDate, topicCount: initialExam.topicCount, examBoard: initialExam.examBoard,
    topicsText: (initialExam.topics || []).join("\n"),
  }] : [blankSubject()]);
  const loadDemoData = () => setSubjects(window.DEFAULT_SUBJECTS.map((s) => ({ ...s, current: exam.grade.current, target: exam.grade.target, examDate: defaultExamDate, topicCount: 10, examBoard: exam.board })));
  const pickExam = (id) => {
    if (id === examId) return;
    const e = window.examType(id);
    setExamId(id);
    // Switching qualification INVALIDATES everything derived from the old
    // one — syllabus draft, topic validation, uploaded specs, board, even the
    // subject name (a "Mathematics" picked from the AQA list is not the same
    // entity as НМТ математика). Only the exam date survives: it's the
    // user's own deadline, not exam-type data.
    setSubjects((subs) => subs.map((s) => ({
      ...blankSubject(),
      id: s.id, examDate: s.examDate,
      current: e.grade.current, target: e.grade.target, examBoard: e.board,
    })));
  };
  const COLORS = ["indigo", "rose", "teal", "violet", "orange", "cyan", "pink", "emerald"];
  const addSubject = () => setSubjects((subs) => [...subs, {
    id: "s" + Date.now(), name: "", color: `var(--subject-${COLORS[subs.length % COLORS.length]})`,
    current: exam.grade.current, target: exam.grade.target, examDate: defaultExamDate, topicCount: 10, examBoard: exam.board,
    courseDraft: null, noTopicList: false, syllabusFiles: [], curriculumValid: false,
  }]);
  const removeSubject = (id) => setSubjects((subs) => subs.filter((s) => s.id !== id));
  const setSubject = (id, patch) => setSubjects((subs) => subs.map((s) => s.id === id ? { ...s, ...patch } : s));

  // ── intensity (single-apply) ─────────────────────────────────────────────
  // The multiplier is applied ONCE, inside allocateBudget (schedule-store's
  // INTENSITY_MULTIPLIERS). The old code ALSO rewrote weeklyHours here, so
  // the multiplier hit twice and the user's own hours setting was silently
  // destroyed — the "modes barely change anything / weirdly change my hours"
  // bug. Now the tier is just saved; hours stay whatever the user set.
  const [intensity, setIntensity] = React.useState(profile.planIntensity || "balanced");
  const applyIntensity = (id) => setIntensity(id);

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
    !s.name.trim() || (s.name.trim() && s.examDate >= todayISO));
  const topicsProvided = subjects.every((s) => !s.name.trim() || s.curriculumValid);
  const canNext = step === "profile" ? (country && educationLevel)
    : step === "subject" ? (subjects.some((s) => s.name.trim()) && subjectsValid && topicsProvided)
    : true;

  function goNext() { setStepIdx((i) => Math.min(stepKeys.length - 1, i + 1)); }
  function goBack() { setStepIdx((i) => (i === 0 && cfg.showWelcome ? -1 : Math.max(0, i - 1))); }

  function handleFinish() {
    const named = subjects.filter((s) => s.name.trim());
    const rows = named.length ? named : subjects;

    // Course-backed rows (curriculum hit, AI-confirmed, or manually validated
    // via CurriculumStep) get their Course persisted now — from here on it's
    // the source of truth for topics/topicWeights, mirrored onto the exam by
    // migrateExam() (exams-store.jsx) on every read/write. Rows still pending
    // ("I don't have a topic list") get no course — AI enrichment fills the
    // legacy exam.topics fields the same way it always has.
    const createdCourses = {}; // subject.id -> real, persisted Course
    rows.forEach((s) => {
      if (s.courseDraft && s.courseDraft.topics && s.courseDraft.topics.length && window.createCourse) {
        createdCourses[s.id] = window.createCourse(s.courseDraft);
      }
    });

    const examDrafts = rows.map((s) => {
      const course = createdCourses[s.id];
      return {
        name: s.name.trim() || "My subject",
        color: null, // resolved by commitExamWizard's FALLBACK_COLORS rotation
        examDate: s.examDate,
        examBoard: s.examBoard,
        topicCount: course ? course.topics.length : (Number(s.topicCount) || 10),
        targetGrade: String(s.target),
        currentGrade: String(s.current),
        gradingSystem: exam.grade,
        sessionsPerWeekHint: sessionsBySubject[s.id] ?? null,
        courseId: course ? course.id : null,
        kind: "exam",
      };
    });
    const educationPatch = (country || educationLevel || currentYear) ? { country, educationLevel, currentYear } : {};
    const profilePatch = cfg.globalSettings !== "hidden"
      ? { weeklyHours, daysPerWeek, sessionLengthMin, blackoutSlots, materials: [...materials], prefs: [...prefs], planIntensity: intensity, ...educationPatch }
      : (Object.keys(educationPatch).length ? { planIntensity: intensity, ...educationPatch } : null);

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
        if (createdCourses[s.id]) return; // topics already resolved via Course — no AI call needed
        if (extract) extract(newExam.id, newExam, (s.syllabusFiles && s.syllabusFiles.length) ? s.syllabusFiles : files);
      });
    }

    onFinish(newExams);
  }

  return (
    <div style={{ minHeight: "100vh", background: "transparent", display: "flex", justifyContent: "center", fontFamily: "var(--font-sans)" }}>
      <style>{`
        @keyframes onb-spin{to{transform:rotate(360deg)}}
        @keyframes onb-rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        /* Step entrance — spring-like ease-out (Apple response ~0.44s, critically
           damped so no distracting overshoot on a screen that just appeared). */
        @keyframes onb-step-in{from{opacity:0;transform:translateY(14px) scale(0.985)}to{opacity:1;transform:none}}
        .onb-step{animation:onb-step-in .44s cubic-bezier(.16,1,.3,1) both}
        /* Staggered reveal: each direct block of the step settles a beat after
           the previous, so the eye is led down the page instead of hit all at once. */
        .onb-step>*{animation:onb-rise .4s cubic-bezier(.16,1,.3,1) both}
        .onb-step>*:nth-child(1){animation-delay:.03s}
        .onb-step>*:nth-child(2){animation-delay:.08s}
        .onb-step>*:nth-child(3){animation-delay:.13s}
        .onb-step>*:nth-child(4){animation-delay:.18s}
        .onb-step>*:nth-child(5){animation-delay:.22s}
        /* Press feedback lives on pointer-down and is instant — directness. */
        .onb-step button{transition:transform .12s cubic-bezier(.16,1,.3,1)}
        .onb-step button:active:not(:disabled){transform:scale(.97)}
        @media (prefers-reduced-motion: reduce){
          .onb-step,.onb-step>*{animation:onb-fade .2s ease both}
          .onb-step button:active:not(:disabled){transform:none}
        }
        @keyframes onb-fade{from{opacity:0}to{opacity:1}}
      `}</style>
      <div style={{ width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", minHeight: "100vh" }}>

        <div style={{ padding: "var(--space-5) var(--space-5) var(--space-3)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: "var(--weight-bold)", color: "var(--text-strong)", fontFamily: "var(--font-display)", letterSpacing: "var(--tracking-tight)", fontSize: "var(--text-base)" }}>
              {window.NavLogoMark ? <window.NavLogoMark size={24} /> : <span aria-hidden="true">🤖</span>}<span>AI Exam Coach</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {onLangChange && langs.map((l) => (
                <button key={l.code} onClick={() => onLangChange(l.code)} title={l.label} aria-label={l.label}
                  style={{ border: lang === l.code ? "2px solid var(--indigo-500)" : "2px solid transparent", borderRadius: "var(--radius-full)", background: "transparent", cursor: "pointer", fontSize: "var(--text-lg)", minWidth: 40, minHeight: 40, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1 }}>
                  {l.flag}
                </button>
              ))}
              {onCancel && (
                <button onClick={onCancel} aria-label={c.close} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-faint)", fontSize: "var(--text-lg)", padding: "2px", lineHeight: 1 }}>✕</button>
              )}
            </div>
          </div>
          {step !== "welcome" && (
            <>
              <div style={{ display: "flex", gap: 6 }}>
                {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => (
                  <div key={n} style={{ flex: 1, height: 6, borderRadius: "var(--radius-full)", background: n <= stepNum ? "var(--ink-900)" : "var(--slate-200)", transition: "background var(--dur-normal) ease" }} />
                ))}
              </div>
              <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)", fontWeight: "var(--weight-medium)" }}>{c.step_of(stepNum, totalSteps)}</p>
            </>
          )}
        </div>

        <div key={step} className="onb-step" style={{ flex: 1, padding: "var(--space-3) var(--space-5) var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

          {step === "welcome" && <window.CoachBubble advisor={c.advisor}>{c.greeting}</window.CoachBubble>}

          {step === "profile" && (<>
            <div>
              <h2 style={{ margin: "0 0 4px", fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", fontFamily: "var(--font-display)", letterSpacing: "var(--tracking-tight)", color: "var(--text-strong)" }}>
                {lang === "uk" ? "Розкажіть про себе" : lang === "ru" ? "Расскажите о себе" : lang === "fr" ? "Parlez-nous de vous" : lang === "de" ? "Erzähl uns von dir" : "Tell us about yourself"}
              </h2>
              <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                {lang === "uk" ? "Це допоможе AI підлаштувати складність" : lang === "ru" ? "Это поможет AI подстроить сложность" : lang === "fr" ? "Cela aide l'IA à ajuster la difficulté" : lang === "de" ? "Das hilft der KI, den Schwierigkeitsgrad anzupassen" : "This helps AI adjust difficulty to your level"}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div>
                <label style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)", marginBottom: "var(--space-2)" }}>
                  {lang === "uk" ? "Країна" : lang === "ru" ? "Страна" : lang === "fr" ? "Pays" : lang === "de" ? "Land" : "Country"}
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                  {window.COUNTRIES.map((co) => {
                    const sel = country === co.id;
                    return (
                      <button key={co.id} type="button" onClick={() => { setCountry(co.id); const suggested = window.COUNTRY_TO_EXAM_TYPE[co.id]; if (suggested) pickExam(suggested); }}
                        style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 48, padding: "var(--space-3)", borderRadius: "var(--radius-xl)", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)",
                          border: sel ? "2px solid var(--indigo-500)" : "1.5px solid var(--border-default)",
                          background: sel ? "var(--indigo-50)" : "var(--surface-card)", transition: "all var(--dur-fast) ease" }}>
                        <span style={{ fontSize: 20 }}>{co.flag}</span>
                        <span style={{ fontSize: "var(--text-sm)", fontWeight: sel ? "var(--weight-bold)" : "var(--weight-medium)", color: sel ? "var(--indigo-700)" : "var(--text-strong)" }}>{co[lang] || co.en}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)", marginBottom: "var(--space-2)" }}>
                  {lang === "uk" ? "Рівень освіти" : lang === "ru" ? "Уровень образования" : lang === "fr" ? "Niveau d'études" : lang === "de" ? "Bildungsstufe" : "Education level"}
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {window.EDUCATION_LEVELS.map((lv) => {
                    const sel = educationLevel === lv.id;
                    const label = lv[lang] || lv.en;
                    return (
                      <button key={lv.id} type="button" onClick={() => setEducationLevel(lv.id)}
                        style={{ minHeight: 44, padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-xl)", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)",
                          border: sel ? "2px solid var(--indigo-500)" : "1.5px solid var(--border-default)",
                          background: sel ? "var(--indigo-50)" : "var(--surface-card)",
                          fontWeight: sel ? "var(--weight-bold)" : "var(--weight-medium)",
                          color: sel ? "var(--indigo-700)" : "var(--text-strong)", transition: "all var(--dur-fast) ease" }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)", marginBottom: "var(--space-2)" }}>
                  {lang === "uk" ? "Клас / курс (необов'язково)" : lang === "ru" ? "Класс / курс (необязательно)" : lang === "fr" ? "Année (optionnel)" : lang === "de" ? "Jahrgang (optional)" : "Year / grade (optional)"}
                </label>
                {(educationLevel === "university" || educationLevel === "postgrad") ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                    {(window.UNIVERSITY_YEARS || []).map((yr) => {
                      const sel = currentYear === yr.en;
                      const suggested = yr.suggested && !currentYear;
                      return (
                        <button key={yr.id} type="button" onClick={() => setCurrentYear(yr.en)}
                          style={{ padding: "8px 14px", borderRadius: "var(--radius-full)", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", cursor: "pointer",
                            border: sel ? "2px solid var(--indigo-500)" : suggested ? "1.5px solid var(--emerald-500)" : "1.5px solid var(--border-default)",
                            background: sel ? "var(--indigo-50)" : suggested ? "var(--emerald-50)" : "var(--surface-card)",
                            color: sel ? "var(--indigo-700)" : suggested ? "var(--emerald-700)" : "var(--text-body)",
                            fontWeight: (sel || suggested) ? "var(--weight-semibold)" : "var(--weight-normal)" }}>
                          {yr[lang] || yr.en}{suggested ? " ✓" : ""}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input value={currentYear} onChange={(e) => setCurrentYear(e.target.value)} placeholder={lang === "uk" ? "напр. 11 клас" : lang === "ru" ? "напр. 11 класс" : lang === "fr" ? "ex. Terminale" : lang === "de" ? "z.B. 12. Klasse" : "e.g. Year 12"}
                    style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", color: "var(--text-strong)", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", outline: "none" }} />
                )}
              </div>
            </div>
          </>)}

          {step === "type" && (<>
            <div>
              <h2 style={{ margin: "0 0 4px", fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", fontFamily: "var(--font-display)", letterSpacing: "var(--tracking-tight)", color: "var(--text-strong)" }}>{c.s1_title}</h2>
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
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{e.blurb[lang] || e.blurb.en}</span>
                    </button>
                  );
                })}
              </div>
              {examId === "custom" && (
                <div style={{ marginTop: "var(--space-4)", borderRadius: "var(--radius-2xl)", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  <p style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>
                    {lang === "uk" ? "Як оцінюються ваші іспити?" : lang === "ru" ? "Как оцениваются ваши экзамены?" : lang === "fr" ? "Comment vos examens sont-ils notés ?" : lang === "de" ? "Wie werden deine Prüfungen benotet?" : "How are your exams graded?"}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                    {[
                      { id: "percentage", emoji: "💯", label: { en: "Percentage", uk: "Відсотки", ru: "Проценты", fr: "Pourcentage", de: "Prozent" }, blurb: { en: "0–100", uk: "0–100", ru: "0–100", fr: "0–100", de: "0–100" } },
                      { id: "letter", emoji: "🔤", label: { en: "Letter grades", uk: "Літерні оцінки", ru: "Буквенные оценки", fr: "Notes en lettres", de: "Buchstabennoten" }, blurb: { en: "A, B, C…", uk: "A, B, C…", ru: "A, B, C…", fr: "A, B, C…", de: "A, B, C…" } },
                      { id: "gpa", emoji: "🎓", label: { en: "GPA", uk: "GPA", ru: "GPA", fr: "GPA", de: "GPA" }, blurb: { en: "0–4.0", uk: "0–4.0", ru: "0–4.0", fr: "0–4.0", de: "0–4.0" } },
                      { id: "points", emoji: "🔢", label: { en: "Points", uk: "Бали", ru: "Баллы", fr: "Points", de: "Punkte" }, blurb: { en: "your own range", uk: "власний діапазон", ru: "свой диапазон", fr: "votre propre échelle", de: "eigener Bereich" } },
                      { id: "custom", emoji: "✏️", label: { en: "Custom", uk: "Власний", ru: "Свой", fr: "Personnalisé", de: "Eigene" }, blurb: { en: "fully freeform", uk: "повністю довільний", ru: "полностью произвольный", fr: "entièrement libre", de: "völlig frei" } },
                    ].map((opt) => {
                      const sel = customGradeType === opt.id;
                      return (
                        <button key={opt.id} type="button" onClick={() => pickCustomGradeType(opt.id)}
                          style={{ display: "flex", flexDirection: "column", gap: 2, minHeight: 64, padding: "var(--space-3)", borderRadius: "var(--radius-xl)", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)",
                            border: sel ? "2px solid var(--indigo-500)" : "1.5px solid var(--border-default)",
                            background: sel ? "var(--indigo-50)" : "var(--surface-page)",
                            boxShadow: sel ? "var(--shadow-sm)" : "none", transition: "all var(--dur-fast) ease" }}>
                          <span aria-hidden="true" style={{ fontSize: 18 }}>{opt.emoji}</span>
                          <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-bold)", color: sel ? "var(--indigo-700)" : "var(--text-strong)" }}>{opt.label[lang] || opt.label.en}</span>
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{opt.blurb[lang] || opt.blurb.en}</span>
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
                        style={{ alignSelf: "flex-start", border: "none", background: "var(--indigo-600)", color: "#fff", borderRadius: "var(--radius-full)", padding: "12px 22px", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                        {lang === "uk" ? "Продовжити" : lang === "ru" ? "Продолжить" : lang === "fr" ? "Continuer" : lang === "de" ? "Weiter" : "Continue"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>)}

          {step === "subject" && (<>
            <div>
              <h2 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", fontFamily: "var(--font-display)", letterSpacing: "var(--tracking-tight)", color: "var(--text-strong)" }}>{c.s2_title}</h2>
              <p style={{ margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{c.s2_sub}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {subjects.map((s) => (
                <div key={s.id} style={{ borderRadius: "var(--radius-2xl)", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderLeft: `5px solid ${s.color}`, boxShadow: "var(--shadow-sm)", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  {subjects.length > 1 && (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button type="button" onClick={() => removeSubject(s.id)} aria-label="Remove" style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-faint)", fontSize: 16, padding: 4 }}>✕</button>
                    </div>
                  )}
                  {/* Topic count used to live here as a manual guess the student typed
                      before seeing any real syllabus — CurriculumStep below now owns
                      topic count end to end (resolved, typed-in, or "no list" opt-out),
                      so asking for a second, contradictory number up front is gone. */}
                  <div>
                    <label style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-faint)", marginBottom: 4 }}>{c.s2_examdate}</label>
                    <input type="date" value={s.examDate} min={todayISO} onChange={(e) => setSubject(s.id, { examDate: e.target.value })}
                      style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", color: "var(--text-strong)", background: "var(--surface-page)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", outline: "none" }} />
                  </div>
                  {exam.boardOptions && (
                  <div>
                    <label style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-faint)", marginBottom: 4 }}>{c.s2_board}</label>
                    <select value={s.examBoard} onChange={(e) => setSubject(s.id, { examBoard: e.target.value })}
                      style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", color: "var(--text-strong)", background: "var(--surface-page)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", outline: "none", appearance: "auto" }}>
                      {exam.boardOptions.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  )}
                  <window.CurriculumStep
                    countryId={country || null}
                    qualificationId={examId}
                    board={exam.boardOptions ? s.examBoard : null}
                    specVersion={null}
                    lang={lang}
                    subject={s.name}
                    onSubjectChange={(name) => setSubject(s.id, { name })}
                    course={s.courseDraft}
                    onCourseChange={(draft) => setSubject(s.id, { courseDraft: draft })}
                    noTopicList={s.noTopicList}
                    onNoTopicListChange={(v) => setSubject(s.id, { noTopicList: v })}
                    files={s.syllabusFiles}
                    onFilesChange={(fs) => setSubject(s.id, { syllabusFiles: fs })}
                    compact={false}
                    onValidationChange={(ok) => setSubject(s.id, { curriculumValid: ok })}
                  />
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
                  {lang === "uk" ? "Просто дивитесь? Завантажити демо-дані" : lang === "ru" ? "Просто смотрите? Загрузить демо-данные" : lang === "fr" ? "Juste curieux ? Charger les données démo" : lang === "de" ? "Nur am Schauen? Demodaten laden" : "Just exploring? Load demo data"}
                </button>
              )}
            </div>
          </>)}

          {step === "settings" && (<>
            <div>
              <h2 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", fontFamily: "var(--font-display)", letterSpacing: "var(--tracking-tight)", color: "var(--text-strong)" }}>{c.settings_title}</h2>
              <p style={{ margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{c.settings_sub}</p>
            </div>
            <div>
              <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>
                {lang === "uk" ? "Режим навчання" : lang === "ru" ? "Режим учёбы" : lang === "fr" ? "Intensité" : lang === "de" ? "Lernintensität" : "Study intensity"}
              </p>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                {(window.INTENSITY_PRESETS || []).map((preset) => {
                  const sel = intensity === preset.id;
                  return (
                    <button key={preset.id} type="button" onClick={() => applyIntensity(preset.id)}
                      style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "var(--space-3) var(--space-2)", borderRadius: "var(--radius-xl)", cursor: "pointer", fontFamily: "var(--font-sans)",
                        border: sel ? "2px solid var(--indigo-500)" : "1.5px solid var(--border-default)",
                        background: sel ? "var(--indigo-50)" : "var(--surface-card)", transition: "all var(--dur-fast) ease" }}>
                      <span style={{ fontSize: 20 }}>{preset.emoji}</span>
                      <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-bold)", color: sel ? "var(--indigo-700)" : "var(--text-strong)" }}>{preset.label[lang] || preset.label.en}</span>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", textAlign: "center", lineHeight: 1.3 }}>{preset.blurb[lang] || preset.blurb.en}</span>
                    </button>
                  );
                })}
              </div>
              <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
                📅 {lang === "uk" ? "У розділі Calendar можна змінити кожне заняття вручну" : lang === "ru" ? "В разделе Calendar можно изменить каждое занятие вручную" : lang === "fr" ? "Dans Calendar, vous pouvez ajuster chaque session" : lang === "de" ? "Im Kalender können Sie jede Einheit manuell anpassen" : "Fine-tune individual sessions anytime in Calendar view"}
              </p>
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
              <h2 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", fontFamily: "var(--font-display)", letterSpacing: "var(--tracking-tight)", color: "var(--text-strong)" }}>{c.s5_title}</h2>
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

        <div style={{ position: "sticky", bottom: 0, padding: "var(--space-4) var(--space-5)", background: "linear-gradient(to top, var(--indigo-50) 70%, transparent)", display: "flex", gap: "var(--space-3)" }}>
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
          onClose={() => setAiModalOpen(false)} copy={c} />
      )}
    </div>
  );
}

Object.assign(window, { ExamWizard, EXAM_WIZARD_PRESETS });
