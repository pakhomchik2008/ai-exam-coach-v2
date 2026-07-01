// AI Exam Coach — Study session screen (timer + mid-session active-recall
// quizzes + SM-2 rating). Quizzes are an engagement layer only — they never
// feed into the confidence/retention bump, which stays driven purely by the
// rating buttons (see Dashboard.jsx's handleSessionDone).
function StudySession({ session, onDone, onCancel }) {
  const { RatingButtons, Button } = window.AIExamCoachDesignSystem_99e467;
  const [seconds, setSeconds] = React.useState(0);
  const [showRating, setShowRating] = React.useState(false);

  // null = AI call still pending/not started; [] = call finished but
  // produced nothing usable (or failed). Kept distinct from `quizAnswers`
  // so the threshold effect can tell "not ready yet" from "nothing to show".
  const [quizzes, setQuizzes] = React.useState(null);
  const [activeQuizIdx, setActiveQuizIdx] = React.useState(null); // null | 0 | 1
  const [quizAnswers, setQuizAnswers] = React.useState({}); // { [quizIdx]: selectedOptionIndex }
  const [shownQuizIdx, setShownQuizIdx] = React.useState({}); // { [quizIdx]: true } — already-surfaced tracker

  const s = session;

  // Background, non-blocking: fetch 2 quiz questions tailored to this
  // session's subject/topic. Never blocks the timer or the finish flow.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const exam = (window.getExams ? window.getExams() : []).find((e) => e.name === s.subject);
        const examBoard = exam && exam.examBoard ? exam.examBoard : null;
        const system = `You are a quiz generator for exam revision. Output ONLY valid JSON — no markdown, no fences, nothing else before { or after }.

Schema:
{"quiz":[{"question":"string","options":["A","B","C","D"],"correct":0,"explanation":"<=18 word explanation"}]}

Rules: EXACTLY 2 quiz questions. 4 options each, "correct" is the index of the right one. Tailor difficulty and content tightly to the given topic.`;
        const userPrompt = `Generate 2 active-recall quiz questions for:
Subject: ${s.subject}
Topic: ${s.topic}
${examBoard ? `Exam board: ${examBoard}\n` : ""}Difficulty (1=easy,3=hard): ${s.difficulty || 2}`;

        const raw = await window.claude.complete({ system, messages: [{ role: "user", content: userPrompt }] });
        if (cancelled) return;
        const j = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
        const parsed = JSON.parse(j);
        const list = (parsed.quiz || []).slice(0, 2).map((q) => ({
          question: q.question || "",
          options: Array.isArray(q.options) ? q.options : [],
          correct: typeof q.correct === "number" ? q.correct : 0,
          explanation: q.explanation || "",
        })).filter((q) => q.question && q.options.length === 4);
        if (!cancelled) setQuizzes(list);
      } catch (err) {
        console.error("StudySession quiz generation failed:", err);
        if (!cancelled) setQuizzes([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Timer pauses during the rating screen AND while a quiz is actively
  // showing — `seconds` is "active study time", so quiz thresholds below
  // are measured against time actually spent studying, not wall clock.
  React.useEffect(() => {
    if (showRating || activeQuizIdx !== null) return;
    const i = setInterval(() => setSeconds((sec) => sec + 1), 1000);
    return () => clearInterval(i);
  }, [showRating, activeQuizIdx]);

  // Surface quiz 1 at ~1/3 of estimated session length, quiz 2 at ~2/3.
  const estSeconds = Math.max(1, s.est || 25) * 60;
  const THRESH_1 = Math.max(75, Math.round(estSeconds / 3));
  const THRESH_2 = Math.max(THRESH_1 + 60, Math.round((estSeconds * 2) / 3));

  React.useEffect(() => {
    if (showRating || activeQuizIdx !== null) return;
    if (!quizzes || quizzes.length === 0) return;
    if (!shownQuizIdx[0] && quizzes[0] && seconds >= THRESH_1) {
      setActiveQuizIdx(0);
      setShownQuizIdx((m) => ({ ...m, 0: true }));
      return;
    }
    if (!shownQuizIdx[1] && quizzes[1] && seconds >= THRESH_2) {
      setActiveQuizIdx(1);
      setShownQuizIdx((m) => ({ ...m, 1: true }));
    }
  }, [seconds, quizzes, shownQuizIdx, showRating, activeQuizIdx]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const activeQuiz = activeQuizIdx !== null && quizzes ? quizzes[activeQuizIdx] : null;
  const quizAnswered = activeQuizIdx !== null && quizAnswers[activeQuizIdx] !== undefined;
  const quizSelected = activeQuizIdx !== null ? quizAnswers[activeQuizIdx] : undefined;
  const OPT_LABELS = ["A", "B", "C", "D"];

  const answerQuiz = (optionIdx) => {
    if (!activeQuiz || quizAnswered) return;
    if (optionIdx !== activeQuiz.correct && window.logMistake) {
      window.logMistake({
        topic: s.topic,
        question: activeQuiz.question,
        options: activeQuiz.options,
        correctIndex: activeQuiz.correct,
        selectedIndex: optionIdx,
        explanation: activeQuiz.explanation,
      });
    }
    setQuizAnswers((m) => ({ ...m, [activeQuizIdx]: optionIdx }));
  };

  return (
    <div style={{ maxWidth: "var(--container-read)", margin: "0 auto" }}>
      <div style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", borderLeft: `var(--border-accent-width) solid ${s.color}`, background: "var(--surface-card)", boxShadow: "var(--shadow-sm)", padding: "var(--space-6)" }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: s.color, fontWeight: "var(--weight-medium)" }}>{s.subject}</p>
        <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Review {s.review}</p>
      </div>

      <div style={{ marginTop: "var(--space-6)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)", padding: "var(--space-8)", textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: "var(--text-3xl)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>{s.topic}</h1>
        <p style={{ marginTop: "var(--space-8)", fontFamily: "var(--font-mono)", fontSize: "var(--text-4xl)", color: "var(--text-body)" }}>{mm}:{ss}</p>
        <p style={{ marginTop: "var(--space-1)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Auto-stops at 60 minutes</p>
      </div>

      {activeQuiz && (
        <div style={{ marginTop: "var(--space-6)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)", padding: "var(--space-6)", animation: "revealUp 0.4s ease-out" }}>
          <span style={{ display: "inline-block", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 20, letterSpacing: "0.06em" }}>⚡ QUICK CHECK</span>
          <p style={{ fontWeight: 700, fontSize: 14, margin: "var(--space-3) 0 11px", color: "var(--text-strong)", lineHeight: 1.45 }}>{activeQuiz.question}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activeQuiz.options.map((opt, oi) => {
              const isCorrect = oi === activeQuiz.correct;
              const isSelected = oi === quizSelected;
              let bg = "var(--surface-card)", bc = "var(--border-default)", col = "var(--text-body)", lbg = "#f3f4f6", lcol = "#9ca3af";
              if (quizAnswered) {
                if (isCorrect) { bg = "#f0fdf4"; bc = "#22c55e"; col = "#15803d"; lbg = "#22c55e"; lcol = "white"; }
                else if (isSelected) { bg = "#fef2f2"; bc = "#ef4444"; col = "#b91c1c"; lbg = "#ef4444"; lcol = "white"; }
                else { col = "#d1d5db"; bc = "#f3f4f6"; }
              }
              return (
                <button
                  key={oi}
                  disabled={quizAnswered}
                  onClick={quizAnswered ? undefined : () => answerQuiz(oi)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: bg, border: `1.5px solid ${bc}`, borderRadius: 12, color: col, fontSize: 13, textAlign: "left", cursor: quizAnswered ? "default" : "pointer", width: "100%", fontFamily: "var(--font-sans)" }}
                >
                  <span style={{ width: 26, height: 26, borderRadius: 8, background: lbg, color: lcol, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{OPT_LABELS[oi]}</span>
                  <span style={{ lineHeight: 1.45, fontWeight: 500 }}>{opt}</span>
                </button>
              );
            })}
          </div>
          {quizAnswered && (
            <div style={{ marginTop: 10, padding: "11px 14px", background: quizSelected === activeQuiz.correct ? "#f0fdf4" : "#fffbeb", border: `1px solid ${quizSelected === activeQuiz.correct ? "#bbf7d0" : "#fde68a"}`, borderRadius: 12, fontSize: 12, color: quizSelected === activeQuiz.correct ? "#15803d" : "#92400e", lineHeight: 1.6 }}>
              {(quizSelected === activeQuiz.correct ? "✅ " : "💡 ") + activeQuiz.explanation}
            </div>
          )}
          {quizAnswered && (
            <Button variant="secondary" size="md" fullWidth onClick={() => setActiveQuizIdx(null)} style={{ marginTop: "var(--space-4)" }}>Continue studying</Button>
          )}
        </div>
      )}

      {!showRating && activeQuizIdx === null ? (
        <div style={{ marginTop: "var(--space-6)", display: "flex", gap: "var(--space-3)" }}>
          <Button variant="primary" size="lg" fullWidth onClick={() => setShowRating(true)}>I've finished studying this</Button>
          <Button variant="secondary" size="lg" onClick={onCancel}>Cancel</Button>
        </div>
      ) : activeQuizIdx !== null ? (
        // Quiz active: hide "I've finished studying this" (ambiguous mid-quiz)
        // but keep Cancel reachable — abandoning the session is unambiguous
        // regardless of quiz state, and the original screen always offered it.
        <div style={{ marginTop: "var(--space-6)" }}>
          <Button variant="secondary" size="lg" onClick={onCancel}>Cancel</Button>
        </div>
      ) : showRating ? (
        <div style={{ marginTop: "var(--space-6)" }}>
          <p style={{ textAlign: "center", color: "var(--text-body)", marginBottom: "var(--space-3)" }}>How well did you know it?</p>
          <RatingButtons onRate={(rating) => {
            const answeredIdx = Object.keys(quizAnswers).map(Number);
            const quizCorrect = answeredIdx.filter((i) => quizzes && quizzes[i] && quizAnswers[i] === quizzes[i].correct).length;
            onDone({ rating, seconds, quizCorrect, quizTotal: answeredIdx.length });
          }} />
        </div>
      ) : null}
    </div>
  );
}
window.StudySession = StudySession;
