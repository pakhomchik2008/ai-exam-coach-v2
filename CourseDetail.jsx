// AI Exam Coach — CourseDetail: deep-dive modal for an exam coach card.
// Investigate readiness/risk, and change target grade, confidence & study
// intensity with the success probability recomputing live.
function CourseDetail({ course, onClose, onStart, onSave, onGoToChat, focus, t }) {
  const { Button, GaugeRing, Badge } = window.AIExamCoachDesignSystem_99e467;
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[(t && t.code) || "en"] || en);
  const grade = (window.examType ? window.examType(course.examTypeId) : null);
  const opts = grade ? grade.grade.options : ["A*", "A", "B", "C", "D", "E"];

  const [target, setTarget] = React.useState(course.targetGrade);
  const [confidence, setConfidence] = React.useState(course.confidencePct);
  const [sessions, setSessions] = React.useState(course.recommendedSessions || 3);
  const [savedFlash, setSavedFlash] = React.useState(false);

  // live success-probability model
  const prob = React.useMemo(() => {
    const origIdx = opts.indexOf(String(course.targetGrade));
    const newIdx = opts.indexOf(String(target));
    const harder = origIdx >= 0 && newIdx >= 0 ? origIdx - newIdx : 0;
    let p = course.gradeProbability
      + (sessions - (course.recommendedSessions || 3)) * 6
      + (confidence - course.confidencePct) * 0.4
      - harder * 14;
    return Math.max(3, Math.min(97, Math.round(p)));
  }, [target, confidence, sessions]);

  const readiness = Math.max(3, Math.min(99, Math.round(
    course.readinessPct + (confidence - course.confidencePct) * 0.5 + (sessions - (course.recommendedSessions || 3)) * 4
  )));
  const risk = prob >= 60 ? { id: "low", tone: "easy", label: L("Low", "Низький", "Низкий", "Faible", "Niedrig"), color: "var(--emerald-600)" }
    : prob >= 40 ? { id: "medium", tone: "medium", label: L("Medium", "Середній", "Средний", "Moyen", "Mittel"), color: "var(--amber-600)" }
    : { id: "high", tone: "hard", label: L("High", "Високий", "Высокий", "Élevé", "Hoch"), color: "var(--red-500)" };
  const probColor = prob >= 60 ? "var(--emerald-600)" : prob >= 40 ? "var(--amber-600)" : "var(--red-500)";

  const coachLine = prob >= 75 ? L("You're comfortably on track for this target. Hold the pace.", "Ви впевнено йдете до цілі. Тримайте темп.", "Вы уверенно идёте к цели. Держите темп.", "Vous êtes en bonne voie. Gardez le rythme.", "Du bist klar auf Kurs. Halte das Tempo.")
    : prob >= 50 ? L("Within reach — a couple more sessions a week would lock it in.", "У межах досяжності — ще кілька сесій на тиждень закріплять результат.", "В пределах досягаемости — пара дополнительных сессий закрепит результат.", "À portée — quelques séances de plus par semaine suffiraient.", "In Reichweite — ein paar Einheiten mehr pro Woche sichern es.")
    : L("This target is a stretch right now. Add sessions or revisit your weak topics.", "Ця ціль зараз амбітна. Додайте сесій або поверніться до слабких тем.", "Эта цель сейчас амбициозна. Добавьте сессий или вернитесь к слабым темам.", "Cet objectif est ambitieux. Ajoutez des séances ou revoyez vos points faibles.", "Dieses Ziel ist ambitioniert. Mehr Einheiten oder Schwachstellen wiederholen.");

  const bodyRef = React.useRef(null);
  const secRefs = { target: React.useRef(null), confidence: React.useRef(null), risk: React.useRef(null), probability: React.useRef(null) };
  const [glow, setGlow] = React.useState(focus || null);
  React.useEffect(() => {
    if (focus && secRefs[focus] && secRefs[focus].current && bodyRef.current) {
      bodyRef.current.scrollTop = Math.max(0, secRefs[focus].current.offsetTop - 12);
      const id = setTimeout(() => setGlow(null), 1600);
      return () => clearTimeout(id);
    }
  }, []);
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const examDate = new Date(Date.now() + course.daysAway * 864e5).toLocaleDateString(
    t && t.code === "uk" ? "uk-UA" : t && t.code === "ru" ? "ru-RU" : t && t.code === "fr" ? "fr-FR" : t && t.code === "de" ? "de-DE" : "en-GB",
    { day: "numeric", month: "short" });

  const sec = (id) => ({
    borderRadius: "var(--radius-xl)", border: glow === id ? `2px solid ${course.color}` : "1px solid var(--border-subtle)",
    background: "var(--surface-card)", padding: "var(--space-4)", transition: "border-color var(--dur-normal) ease",
    boxShadow: glow === id ? "var(--shadow-sm)" : "none",
  });
  const segBtn = (selected) => ({
    minWidth: 46, minHeight: 44, padding: "0 var(--space-3)", borderRadius: "var(--radius-lg)", fontSize: "var(--text-base)",
    fontWeight: "var(--weight-semibold)", cursor: "pointer", fontFamily: "var(--font-sans)",
    border: selected ? "2px solid var(--indigo-600)" : "1.5px solid var(--border-default)",
    background: selected ? "var(--indigo-50)" : "var(--surface-card)", color: selected ? "var(--indigo-700)" : "var(--text-muted)",
  });
  const eyebrow = { margin: "0 0 var(--space-3)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" };

  const dirty = target !== course.targetGrade || confidence !== course.confidencePct || sessions !== (course.recommendedSessions || 3);
  const save = () => {
    onSave && onSave({ ...course, targetGrade: target, confidencePct: confidence, recommendedSessions: sessions, gradeProbability: prob, readinessPct: readiness, riskLevel: risk.id });
    setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1600);
  };
  const startSession = () => {
    const today = (window.buildScheduleData().sessionsByDay[window.fmtDateKey(new Date())] || []).find((x) => x.subject === course.name);
    const s = today
      ? { id: course.id + "-s", subject: today.subject, color: today.color, topic: today.topic, difficulty: 2, review: 1, est: 30 }
      : { id: course.id + "-s", subject: course.name, color: course.color, topic: course.weakTopics[0] || "General review", difficulty: 3, review: 1, est: 45 };
    onStart && onStart(s);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0", fontFamily: "var(--font-sans)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 600, maxHeight: "94vh", display: "flex", flexDirection: "column", background: "var(--surface-page)", borderTopLeftRadius: "var(--radius-2xl)", borderTopRightRadius: "var(--radius-2xl)", borderTop: `5px solid ${course.color}`, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-3)", padding: "var(--space-5) var(--space-5) var(--space-4)", background: "var(--surface-card)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>{course.name}</h2>
            <p style={{ margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              {L("Exam", "Іспит", "Экзамен", "Examen", "Prüfung")} {examDate} · {course.daysAway} {L("days away", "дн. лишилось", "дн. осталось", "j restants", "Tage")}{course.examBoard ? ` · ${course.examBoard}` : ""}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "var(--surface-muted)", width: 36, height: 36, borderRadius: "var(--radius-full)", cursor: "pointer", fontSize: 18, color: "var(--text-muted)", lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>

        {/* Scrollable body */}
        <div ref={bodyRef} style={{ flex: 1, overflowY: "auto", padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

          {/* Hero: readiness + probability + risk */}
          <div ref={secRefs.probability} style={{ ...sec("probability"), display: "grid", gridTemplateColumns: "auto 1fr", gap: "var(--space-5)", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <GaugeRing value={readiness} size={92} />
              <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)" }}>{L("Readiness", "Готовність", "Готовность", "Préparation", "Bereitschaft")}</span>
            </div>
            <div>
              <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: "var(--text-5xl)", fontWeight: "var(--weight-bold)", color: probColor, lineHeight: 1 }}>{prob}%</p>
              <p style={{ margin: "2px 0 var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{L("chance of hitting", "шанс досягти", "шанс достичь", "chance d'atteindre", "Chance auf")} <strong style={{ color: "var(--indigo-700)" }}>{target}</strong></p>
              <span ref={secRefs.risk} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                {L("Risk", "Ризик", "Риск", "Risque", "Risiko")}: <Badge tone={risk.tone}>{risk.label}</Badge>
              </span>
            </div>
          </div>

          {/* Coach interpretation */}
          <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start", padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-xl)", background: "var(--indigo-50)" }}>
            <span aria-hidden="true" style={{ fontSize: 20 }}>🤖</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-body)", lineHeight: 1.5 }}>{coachLine}</p>
              {onGoToChat && (
                <button onClick={() => { onClose(); onGoToChat(L(`How can I improve in ${course.name}?`, `Як мені покращити ${course.name}?`, `Как мне улучшить ${course.name}?`, `Comment puis-je progresser en ${course.name} ?`, `Wie kann ich mich in ${course.name} verbessern?`)); }}
                  style={{ marginTop: 6, border: "none", background: "transparent", color: "var(--indigo-600)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-xs)", cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0 }}>
                  {L("Ask AI Coach about this", "Запитати AI-коуча", "Спросить AI-коуча", "Demander au coach IA", "KI-Coach fragen")} →
                </button>
              )}
            </div>
          </div>

          {/* Target grade */}
          <div ref={secRefs.target} style={sec("target")}>
            <p style={eyebrow}>{L("Target grade", "Цільова оцінка", "Целевая оценка", "Note visée", "Zielnote")} · {grade ? grade.label : "A-Level"}</p>
            <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{L("Predicted now", "Прогноз зараз", "Прогноз сейчас", "Prédit", "Aktuell prognostiziert")}: <strong style={{ color: "var(--text-body)" }}>{course.predictedGrade}</strong></p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
              {opts.map((g) => (
                <button key={g} type="button" onClick={() => setTarget(g)} style={segBtn(String(target) === String(g))}>{g}</button>
              ))}
            </div>
          </div>

          {/* Confidence */}
          <div ref={secRefs.confidence} style={sec("confidence")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "var(--space-2)" }}>
              <p style={{ ...eyebrow, margin: 0 }}>{L("Your confidence", "Ваша впевненість", "Ваша уверенность", "Votre confiance", "Deine Sicherheit")}</p>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", color: "var(--indigo-600)" }}>{confidence}%</span>
            </div>
            <input type="range" min={0} max={100} step={5} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--indigo-600)", height: 28 }} />
          </div>

          {/* Study intensity */}
          <div style={sec("intensity")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "var(--space-2)" }}>
              <p style={{ ...eyebrow, margin: 0 }}>{L("Sessions per week", "Сесій на тиждень", "Сессий в неделю", "Séances / semaine", "Einheiten / Woche")}</p>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", color: "var(--indigo-600)" }}>{sessions}×</span>
            </div>
            <input type="range" min={1} max={7} value={sessions} onChange={(e) => setSessions(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--indigo-600)", height: 28 }} />
            <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{L("Coach recommends", "Коуч радить", "Коуч советует", "Le coach recommande", "Coach empfiehlt")} {course.recommendedSessions}×</p>
          </div>

          {/* Weak topics */}
          <div style={sec("topics")}>
            <p style={eyebrow}>🎯 {L("Focus topics", "Слабкі теми", "Слабые темы", "Sujets à travailler", "Schwerpunktthemen")} · {course.topicCount} {L("total", "усього", "всего", "au total", "gesamt")}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {course.weakTopics.length === 0 && (
                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                  {L("Not enough study history yet to flag weak topics.", "Поки недостатньо історії навчання, щоб визначити слабкі теми.", "Пока недостаточно истории учёбы, чтобы определить слабые темы.", "Pas encore assez d'historique pour identifier les sujets faibles.", "Noch nicht genug Lernverlauf, um Schwachstellen zu erkennen.")}
                </p>
              )}
              {course.weakTopics.map((tp, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-lg)", background: "var(--surface-muted)" }}>
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--text-body)" }}>{tp}</span>
                  <button onClick={() => onStart && onStart({ id: course.id + "-" + i, subject: course.name, color: course.color, topic: tp, difficulty: 3, review: 1, est: 45 })}
                    style={{ border: "none", background: "transparent", color: "var(--indigo-600)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-xs)", cursor: "pointer", fontFamily: "var(--font-sans)", flexShrink: 0 }}>
                    {L("Study", "Вчити", "Учить", "Étudier", "Lernen")} →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div style={{ display: "flex", gap: "var(--space-3)", padding: "var(--space-4) var(--space-5)", borderTop: "1px solid var(--border-subtle)", background: "var(--surface-card)" }}>
          <Button variant="secondary" size="lg" onClick={save} disabled={!dirty && !savedFlash}>
            {savedFlash ? L("Saved ✓", "Збережено ✓", "Сохранено ✓", "Enregistré ✓", "Gespeichert ✓") : L("Save changes", "Зберегти", "Сохранить", "Enregistrer", "Speichern")}
          </Button>
          <Button variant="primary" size="lg" fullWidth onClick={startSession}>{L("Start studying", "Почати навчання", "Начать занятие", "Commencer", "Lernen starten")} →</Button>
        </div>
      </div>
    </div>
  );
}
window.CourseDetail = CourseDetail;
