// AI Exam Coach — AI Coach v6: Lesson Engine
//
// The AI generates a structured lesson plan upfront. The UI renders each step
// as its own full-screen phase — not chat bubbles. Progress is always visible.
// Brain write-back happens after every quiz interaction. Celebration at the end.

const COACH_MODES = [
  { id: "learn", emoji: "🧠", label: "Learn", desc: "Structured lesson" },
  { id: "review", emoji: "⚡", label: "Review", desc: "Spaced repetition" },
  { id: "practice", emoji: "🎯", label: "Practice", desc: "Exam questions" },
  { id: "chat", emoji: "💬", label: "Chat", desc: "Ask anything" },
];

// ─── Shared ──────────────────────────────────────────────────────────────────

function CoachIcon({ size = 32 }) {
  return React.createElement("div", {
    style: { width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }
  }, React.createElement("svg", { width: size * 0.54, height: size * 0.54, viewBox: "0 0 20 20", fill: "none" },
    React.createElement("path", { d: "M10 2C7.24 2 5 4.24 5 7c0 1.9 1.05 3.55 2.6 4.4L7.3 12h5.4l-.3-.6C14.05 10.55 15 8.9 15 7c0-2.76-2.24-5-5-5z", fill: "white", opacity: "0.95" }),
    React.createElement("rect", { x: "7.5", y: "13", width: "5", height: "1.5", rx: "0.75", fill: "white", opacity: "0.75" }),
    React.createElement("rect", { x: "8.5", y: "15", width: "3", height: "1.2", rx: "0.6", fill: "white", opacity: "0.55" })));
}

const _md = (text) => {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+?)\*/g, "<em>$1</em>")
    .replace(/`([^`\n]+?)`/g, "<code style='background:#f1f5f9;padding:2px 5px;border-radius:4px;font-size:0.92em'>$1</code>");
};

const _badge = (bg, fg, text) => React.createElement("span", {
  style: { display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 12, background: bg, color: fg }
}, text);

const _btn = (label, onClick, primary, disabled) => React.createElement("button", {
  onClick: disabled ? undefined : onClick, disabled,
  style: {
    padding: "12px 20px", background: primary ? (disabled ? "#c7d2fe" : "#4f46e5") : "var(--surface-card)",
    color: primary ? "white" : "var(--text-strong)", border: primary ? "none" : "1.5px solid var(--border-default)",
    borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: disabled ? "default" : "pointer",
    fontFamily: "var(--font-sans)", width: "100%", transition: "all 0.15s", opacity: disabled ? 0.6 : 1,
  }
}, label);

// ─── LESSON ENGINE ───────────────────────────────────────────────────────────

function LessonEngine({ topic, onExit }) {
  const [plan, setPlan] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [step, setStep] = React.useState(0);
  const [results, setResults] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [revealed, setRevealed] = React.useState(false);
  const [fillInput, setFillInput] = React.useState("");
  const [stepsRevealed, setStepsRevealed] = React.useState(0);
  const [done, setDone] = React.useState(false);
  const [masteryBefore, setMasteryBefore] = React.useState(null);
  const [consecutiveCorrect, setConsecutiveCorrect] = React.useState(0);
  const [xp, setXp] = React.useState(0);

  const resolved = React.useMemo(() => window.resolveTopicForBrain ? window.resolveTopicForBrain(topic) : null, [topic]);
  const brain = window.getBrain ? window.getBrain() : {};

  React.useEffect(() => {
    if (resolved) {
      const ev = (brain.examViews || []).find((e) => e.id === resolved.examId);
      const tp = ev && (ev.topics || []).find((t) => t.topicIdx === resolved.topicIdx);
      setMasteryBefore(tp ? Math.round(tp.retention * 100) : 0);
    } else {
      setMasteryBefore(0);
    }
  }, []);

  // Generate lesson plan
  React.useEffect(() => {
    (async () => {
      try {
        const complete = window.brainComplete || ((a) => window.claude.complete(a));
        const topicContext = resolved ? { examId: resolved.examId, topicName: resolved.topicName } : undefined;

        const system = `You are generating a structured lesson plan for a personal tutoring session.

OUTPUT ONLY valid JSON — no markdown, no fences, no text before or after. Start with { end with }.

Generate a lesson with 8-12 steps following this pattern for each concept:
  teach → question → (worked_example if complex) → question
Include 2-3 concepts per lesson. After all concepts, end with a checkpoint quiz.

STEP TYPES AND THEIR EXACT JSON SHAPES:

"teach" — explain ONE concept:
{"type":"teach","title":"Short Title","body":"2-4 sentences. **Bold** key terms. Use analogies. Be concrete, not abstract.","keyTakeaway":"One sentence summary","example":"A concrete example or formula"}

"mcq" — multiple choice question:
{"type":"mcq","question":"Clear, specific question","options":["A","B","C","D"],"correct":1,"explanation":"Why the answer is correct and why others aren't. 1-2 sentences.","difficulty":"easy|medium|hard"}

"tf" — true or false:
{"type":"tf","statement":"A clear statement that is either true or false","correct":true,"explanation":"Why it's true/false. 1 sentence."}

"fill" — fill in the blank (ONE word or short phrase):
{"type":"fill","sentence":"The ___ is the powerhouse of the cell.","answer":"mitochondria","accept":["mitochondria","mitochondrion"],"explanation":"Brief explanation."}

"worked_example" — step-by-step solution:
{"type":"worked_example","title":"Example: ...","steps":[{"label":"Step 1 name","content":"What to do"},{"label":"Step 2 name","content":"What to do"}],"challenge":"Now try: a similar problem for the student"}

"checkpoint" — 3 rapid-fire questions to test retention:
{"type":"checkpoint","questions":[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."},{"question":"...","options":["A","B","C","D"],"correct":2,"explanation":"..."},{"question":"...","options":["A","B","C","D"],"correct":1,"explanation":"..."}]}

RULES:
- Start with a "teach" step, not a diagnostic question
- After EVERY "teach" step, immediately follow with a question (mcq, tf, or fill)
- Never put two "teach" steps in a row
- Mix question types: use mcq, tf, AND fill — variety keeps the student engaged
- Questions should test the concept JUST taught, not something new
- Difficulty should increase as the lesson progresses
- End with a "checkpoint" containing exactly 3 questions that cover all concepts taught
- Total steps: 8-12 (not counting checkpoint sub-questions)

OUTPUT FORMAT:
{"title":"Lesson title","estimatedMinutes":12,"steps":[...]}`;

        const raw = await complete({
          system,
          prompt: `Generate a structured lesson on: ${topic}`,
          topicContext,
        });

        const parsed = window.parseJSON ? window.parseJSON(raw) : JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
        if (!parsed || !Array.isArray(parsed.steps) || parsed.steps.length === 0) throw new Error("Invalid lesson plan");
        setPlan(parsed);
        setLoading(false);
      } catch (e) {
        console.error("Lesson generation failed:", e);
        setError(e.message || "Failed to generate lesson");
        setLoading(false);
      }
    })();
  }, [topic]);

  // ─── Step interaction handlers ─────────────────────────────────────────────
  const advance = () => {
    setSelected(null);
    setRevealed(false);
    setFillInput("");
    setStepsRevealed(0);
    if (step + 1 >= (plan?.steps?.length || 0)) {
      commitResults();
      setDone(true);
    } else {
      // Difficulty adaptation: skip teach if 3+ consecutive correct
      let next = step + 1;
      if (consecutiveCorrect >= 3 && plan.steps[next]?.type === "teach" && next + 1 < plan.steps.length) {
        next++; // skip to the question
      }
      setStep(next);
    }
  };

  const answerMcq = (idx, correct, explanation) => {
    if (selected !== null) return;
    const isCorrect = idx === correct;
    setSelected(idx);
    setRevealed(true);
    setResults((r) => [...r, { type: "mcq", correct: isCorrect }]);
    setXp((x) => x + (isCorrect ? 20 : 5));
    setConsecutiveCorrect((c) => isCorrect ? c + 1 : 0);
    if (resolved && window.recordReview) window.recordReview(resolved.examId, resolved.topicIdx, isCorrect);
    if (!isCorrect && resolved && window.logMistake) {
      const s = plan.steps[step];
      const q = s.type === "checkpoint" ? "checkpoint" : (s.question || "");
      window.logMistake({ topic: resolved.topicName, question: q, examId: resolved.examId, topicIdx: resolved.topicIdx });
    }
  };

  const answerTf = (answer, correct) => {
    if (selected !== null) return;
    const isCorrect = answer === correct;
    setSelected(answer);
    setRevealed(true);
    setResults((r) => [...r, { type: "tf", correct: isCorrect }]);
    setXp((x) => x + (isCorrect ? 20 : 5));
    setConsecutiveCorrect((c) => isCorrect ? c + 1 : 0);
    if (resolved && window.recordReview) window.recordReview(resolved.examId, resolved.topicIdx, isCorrect);
  };

  const answerFill = () => {
    const userAns = fillInput.trim().toLowerCase();
    const accepts = [s.answer, ...(s.accept || [])].map((a) => a.toLowerCase().trim());
    const isCorrect = accepts.some((a) => a === userAns || a.includes(userAns) || userAns.includes(a));
    setRevealed(true);
    setSelected(isCorrect ? "correct" : "wrong");
    setResults((r) => [...r, { type: "fill", correct: isCorrect }]);
    setXp((x) => x + (isCorrect ? 25 : 5));
    setConsecutiveCorrect((c) => isCorrect ? c + 1 : 0);
    if (resolved && window.recordReview) window.recordReview(resolved.examId, resolved.topicIdx, isCorrect);
  };

  const commitResults = () => {
    const correct = results.filter((r) => r.correct).length;
    const total = results.length;
    if (resolved) {
      if (window.markTopicsStudied) window.markTopicsStudied(resolved.examId, [resolved.topicIdx], [resolved.topicName]);
      if (window.recordConfidence) {
        const conf = total === 0 ? 3 : correct / total >= 0.8 ? 5 : correct / total >= 0.5 ? 3 : 1;
        window.recordConfidence(resolved.examId, resolved.topicIdx, conf);
      }
    }
    if (window.commitCoachSession) {
      const sess = { startedAt: Date.now() - 600000, topicsCovered: resolved ? [resolved] : [], quizResults: results.map((r) => ({ correct: r.correct, topicName: topic })), conceptsTaught: plan.steps.filter((s) => s.type === "teach").length, diagnosedWeaknesses: [], diagnosedStrengths: [] };
      if (results.filter((r) => r.correct).length / Math.max(1, results.length) >= 0.7) sess.diagnosedStrengths.push(topic);
      else sess.diagnosedWeaknesses.push(topic);
      window.commitCoachSession(sess);
    }
  };

  // ─── Current step ──────────────────────────────────────────────────────────
  const s = plan ? plan.steps[step] : null;
  const totalSteps = plan ? plan.steps.length : 0;
  const correctCount = results.filter((r) => r.correct).length;
  const totalAnswered = results.length;
  const masteryNow = React.useMemo(() => {
    if (!resolved || !window.getBrain) return masteryBefore || 0;
    const b = window.getBrain();
    const ev = (b.examViews || []).find((e) => e.id === resolved.examId);
    const tp = ev && (ev.topics || []).find((t) => t.topicIdx === resolved.topicIdx);
    return tp ? Math.round(tp.retention * 100) : masteryBefore || 0;
  }, [results]);

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", gap: 16 } },
      React.createElement(CoachIcon, { size: 56 }),
      React.createElement("p", { style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)" } }, "Building your lesson..."),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)" } }, `Topic: ${topic}`),
      React.createElement("div", { style: { display: "flex", gap: 6 } },
        ...[0, 1, 2].map((d) => React.createElement("span", { key: d, style: { width: 8, height: 8, borderRadius: "50%", background: "#6366f1", animation: "aiTyping 1.2s ease-in-out infinite", animationDelay: d * 0.2 + "s" } }))));
  }

  if (error) {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", gap: 16 } },
      React.createElement("p", { style: { fontSize: 16, color: "var(--red-600)" } }, "Couldn't generate lesson"),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)" } }, error),
      _btn("← Back", onExit, false, false));
  }

  // ─── Celebration Screen ────────────────────────────────────────────────────
  if (done) {
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    const finalXp = xp + 100; // completion bonus
    const masteryDelta = (masteryNow || 0) - (masteryBefore || 0);
    const streak = window.computeStreak ? window.computeStreak() : 0;
    const grade = accuracy >= 90 ? "A" : accuracy >= 75 ? "B" : accuracy >= 60 ? "C" : "D";
    const gradeEmoji = { A: "🌟", B: "✨", C: "👍", D: "💪" };

    return React.createElement("div", {
      style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", gap: 0, padding: "0 20px", animation: "fadeUp 0.5s ease-out" }
    },
      React.createElement("div", { style: { fontSize: 56, marginBottom: 8, animation: "pulse 0.6s ease-in-out" } }, gradeEmoji[grade]),
      React.createElement("h1", { style: { fontSize: 24, fontWeight: 700, color: "var(--text-strong)", margin: "0 0 4px", textAlign: "center" } }, "Lesson Complete!"),
      React.createElement("p", { style: { fontSize: 14, color: "var(--text-muted)", margin: "0 0 24px" } }, plan.title),

      // Stats grid
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%", maxWidth: 360, marginBottom: 24 } },
        // Accuracy
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "16px", textAlign: "center" } },
          React.createElement("p", { style: { fontSize: 28, fontWeight: 700, color: accuracy >= 70 ? "#15803d" : "#b45309", margin: 0 } }, `${accuracy}%`),
          React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" } }, "Accuracy")),
        // XP
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "16px", textAlign: "center" } },
          React.createElement("p", { style: { fontSize: 28, fontWeight: 700, color: "var(--indigo-600)", margin: 0 } }, `+${finalXp}`),
          React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" } }, "XP Earned")),
        // Mastery
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "16px", textAlign: "center" } },
          React.createElement("p", { style: { fontSize: 14, fontWeight: 600, color: "var(--text-muted)", margin: 0 } }, `${masteryBefore || 0}%`),
          React.createElement("p", { style: { fontSize: 20, fontWeight: 700, color: masteryDelta > 0 ? "#15803d" : "var(--text-strong)", margin: "2px 0 0" } }, `→ ${masteryNow || 0}%`),
          React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" } }, "Mastery")),
        // Streak
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "16px", textAlign: "center" } },
          React.createElement("p", { style: { fontSize: 28, fontWeight: 700, color: "var(--text-strong)", margin: 0 } }, `${streak}🔥`),
          React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" } }, "Streak")),
      ),

      // Score detail
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", margin: "0 0 20px" } }, `${correctCount} of ${totalAnswered} questions correct`),

      _btn("Done →", onExit, true, false));
  }

  // ─── Step renderers ────────────────────────────────────────────────────────
  const renderTeach = () => React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
    React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24, borderLeft: "4px solid var(--indigo-500)" } },
      React.createElement("div", { style: { marginBottom: 14 } }, _badge("var(--indigo-50)", "var(--indigo-600)", "📖 CONCEPT")),
      s.title && React.createElement("h2", { style: { margin: "0 0 12px", fontSize: 18, fontWeight: 700, color: "var(--text-strong)" } }, s.title),
      React.createElement("div", { style: { fontSize: 15, lineHeight: 1.75, color: "var(--text-body)", marginBottom: 16 }, dangerouslySetInnerHTML: { __html: _md(s.body) } }),
      s.keyTakeaway && React.createElement("div", { style: { background: "#fefce8", border: "1px solid #fde68a", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#92400e", marginBottom: s.example ? 14 : 0 } },
        "💡 ", React.createElement("strong", null, s.keyTakeaway)),
      s.example && React.createElement("div", { style: { background: "var(--surface-muted)", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "var(--text-body)", fontFamily: "var(--font-mono)" } }, s.example)),
    React.createElement("div", { style: { marginTop: 16 } }, _btn("Got it, continue →", advance, true, false)));

  const renderMcq = (question, options, correct, explanation, diff) => React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
    React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 } },
      React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 14 } },
        _badge("linear-gradient(135deg,#6366f1,#4f46e5)", "white", "⚡ QUESTION"),
        diff && _badge(diff === "hard" ? "#fef2f2" : diff === "easy" ? "#f0fdf4" : "#fefce8", diff === "hard" ? "#b91c1c" : diff === "easy" ? "#15803d" : "#92400e", diff)),
      React.createElement("p", { style: { fontWeight: 600, fontSize: 16, margin: "0 0 16px", color: "var(--text-strong)", lineHeight: 1.5 } }, question),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
        ...options.map((opt, i) => {
          const isCor = i === correct, isSel = i === selected;
          let bg = "var(--surface-card)", bc = "var(--border-default)", col = "var(--text-body)", lbg = "#f3f4f6", lcol = "#9ca3af";
          if (revealed) {
            if (isCor) { bg = "#f0fdf4"; bc = "#22c55e"; col = "#15803d"; lbg = "#22c55e"; lcol = "white"; }
            else if (isSel) { bg = "#fef2f2"; bc = "#ef4444"; col = "#b91c1c"; lbg = "#ef4444"; lcol = "white"; }
            else { col = "#d1d5db"; bc = "#f3f4f6"; }
          }
          return React.createElement("button", {
            key: i, disabled: revealed, onClick: () => answerMcq(i, correct, explanation),
            style: { display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: bg, border: `1.5px solid ${bc}`, borderRadius: 14, color: col, fontSize: 14, textAlign: "left", cursor: revealed ? "default" : "pointer", width: "100%", fontFamily: "var(--font-sans)", transition: "all 0.15s" }
          },
            React.createElement("span", { style: { width: 28, height: 28, borderRadius: 8, background: lbg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: lcol, flexShrink: 0 } }, ["A", "B", "C", "D"][i]),
            React.createElement("span", { style: { lineHeight: 1.45, fontWeight: 500 } }, opt));
        })),
      revealed && React.createElement("div", {
        style: { marginTop: 14, padding: "12px 16px", background: selected === correct ? "#f0fdf4" : "#fffbeb", border: `1px solid ${selected === correct ? "#bbf7d0" : "#fde68a"}`, borderRadius: 12, fontSize: 14, color: selected === correct ? "#15803d" : "#92400e", lineHeight: 1.6 }
      }, selected === correct ? "✅ " : "💡 ", explanation)),
    revealed && React.createElement("div", { style: { marginTop: 16 } }, _btn("Continue →", advance, true, false)));

  const renderTf = () => React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
    React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 } },
      React.createElement("div", { style: { marginBottom: 14 } }, _badge("#f5f3ff", "#7c3aed", "✋ TRUE OR FALSE")),
      React.createElement("p", { style: { fontWeight: 600, fontSize: 16, margin: "0 0 20px", color: "var(--text-strong)", lineHeight: 1.5 } }, s.statement),
      React.createElement("div", { style: { display: "flex", gap: 12 } },
        ...[true, false].map((val) => {
          let bg = "var(--surface-card)", bc = "var(--border-default)", col = "var(--text-body)";
          if (revealed) {
            if (val === s.correct) { bg = "#f0fdf4"; bc = "#22c55e"; col = "#15803d"; }
            else if (val === selected) { bg = "#fef2f2"; bc = "#ef4444"; col = "#b91c1c"; }
            else { col = "#d1d5db"; }
          }
          return React.createElement("button", {
            key: String(val), disabled: revealed, onClick: () => answerTf(val, s.correct),
            style: { flex: 1, padding: "16px", background: bg, border: `2px solid ${bc}`, borderRadius: 14, fontSize: 16, fontWeight: 700, color: col, cursor: revealed ? "default" : "pointer", fontFamily: "var(--font-sans)", transition: "all 0.15s" }
          }, val ? "✅ True" : "❌ False");
        })),
      revealed && React.createElement("div", {
        style: { marginTop: 14, padding: "12px 16px", background: selected === s.correct ? "#f0fdf4" : "#fffbeb", border: `1px solid ${selected === s.correct ? "#bbf7d0" : "#fde68a"}`, borderRadius: 12, fontSize: 14, color: selected === s.correct ? "#15803d" : "#92400e", lineHeight: 1.6 }
      }, selected === s.correct ? "✅ " : "💡 ", s.explanation)),
    revealed && React.createElement("div", { style: { marginTop: 16 } }, _btn("Continue →", advance, true, false)));

  const renderFill = () => React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
    React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 } },
      React.createElement("div", { style: { marginBottom: 14 } }, _badge("#fefce8", "#92400e", "✍️ FILL IN THE BLANK")),
      React.createElement("p", { style: { fontWeight: 600, fontSize: 16, margin: "0 0 20px", color: "var(--text-strong)", lineHeight: 1.5 }, dangerouslySetInnerHTML: { __html: _md(s.sentence.replace("___", "<u style='border-bottom:2px dashed #6366f1;padding:0 8px;color:#6366f1'>___</u>")) } }),
      !revealed && React.createElement("div", { style: { display: "flex", gap: 10 } },
        React.createElement("input", {
          value: fillInput, onChange: (e) => setFillInput(e.target.value),
          onKeyDown: (e) => { if (e.key === "Enter" && fillInput.trim()) answerFill(); },
          placeholder: "Type your answer…", autoFocus: true,
          style: { flex: 1, border: "1.5px solid var(--border-default)", borderRadius: 12, padding: "12px 16px", fontSize: 15, fontFamily: "var(--font-sans)", color: "var(--text-body)", background: "var(--surface-page)", outline: "none" }
        }),
        React.createElement("button", {
          onClick: fillInput.trim() ? answerFill : undefined, disabled: !fillInput.trim(),
          style: { padding: "12px 20px", background: fillInput.trim() ? "#4f46e5" : "#c7d2fe", color: "white", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: fillInput.trim() ? "pointer" : "default", fontFamily: "var(--font-sans)" }
        }, "Check")),
      revealed && React.createElement("div", {
        style: { marginTop: 0, padding: "12px 16px", background: selected === "correct" ? "#f0fdf4" : "#fffbeb", border: `1px solid ${selected === "correct" ? "#bbf7d0" : "#fde68a"}`, borderRadius: 12, fontSize: 14, color: selected === "correct" ? "#15803d" : "#92400e", lineHeight: 1.6 }
      }, selected === "correct" ? `✅ Correct! "${s.answer}"` : `💡 The answer is "${s.answer}". ${s.explanation || ""}`)),
    revealed && React.createElement("div", { style: { marginTop: 16 } }, _btn("Continue →", advance, true, false)));

  const renderWorkedExample = () => {
    const steps = s.steps || [];
    const allVisible = stepsRevealed >= steps.length;
    return React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
      React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24, borderLeft: "4px solid #8b5cf6" } },
        React.createElement("div", { style: { marginBottom: 14 } }, _badge("#f5f3ff", "#7c3aed", "📝 WORKED EXAMPLE")),
        s.title && React.createElement("h3", { style: { margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "var(--text-strong)" } }, s.title),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 0 } },
          ...steps.map((st, i) => {
            const vis = i < stepsRevealed;
            return React.createElement("div", { key: i, style: { display: "flex", gap: 12, padding: "12px 0", borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none", opacity: vis ? 1 : 0.25, transition: "opacity 0.4s" } },
              React.createElement("div", { style: { width: 28, height: 28, borderRadius: "50%", background: vis ? "#7c3aed" : "var(--surface-muted)", color: vis ? "white" : "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 } }, i + 1),
              React.createElement("div", { style: { flex: 1 } },
                React.createElement("div", { style: { fontSize: 12, fontWeight: 600, color: vis ? "var(--text-muted)" : "var(--text-faint)", marginBottom: 2 } }, st.label),
                vis && React.createElement("div", { style: { fontSize: 14, color: "var(--text-body)", lineHeight: 1.6 }, dangerouslySetInnerHTML: { __html: _md(st.content) } })));
          })),
        !allVisible && React.createElement("div", { style: { marginTop: 14 } },
          _btn(stepsRevealed === 0 ? "Show first step →" : "Show next step →", () => setStepsRevealed((n) => n + 1), false, false)),
        allVisible && s.challenge && React.createElement("div", { style: { marginTop: 14, background: "#fefce8", border: "1px solid #fde68a", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#92400e" } }, "🎯 Now you try: ", React.createElement("strong", null, s.challenge))),
      allVisible && React.createElement("div", { style: { marginTop: 16 } },
        _btn("Continue →", () => { setXp((x) => x + 15); advance(); }, true, false)));
  };

  // Checkpoint: cycle through sub-questions
  const [cpIdx, setCpIdx] = React.useState(0);
  const [cpSelected, setCpSelected] = React.useState(null);
  const [cpRevealed, setCpRevealed] = React.useState(false);
  const [cpResults, setCpResults] = React.useState([]);

  React.useEffect(() => { setCpIdx(0); setCpSelected(null); setCpRevealed(false); setCpResults([]); }, [step]);

  const renderCheckpoint = () => {
    const questions = s.questions || [];
    if (cpIdx >= questions.length) {
      // Checkpoint complete — show mini summary
      const cpCorrect = cpResults.filter(Boolean).length;
      return React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
        React.createElement("div", { style: { background: "linear-gradient(135deg, #f0fdf4 0%, var(--surface-card) 100%)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24, borderLeft: "4px solid #22c55e", textAlign: "center" } },
          React.createElement("div", { style: { marginBottom: 14 } }, _badge("#f0fdf4", "#15803d", "📊 CHECKPOINT RESULTS")),
          React.createElement("p", { style: { fontSize: 36, fontWeight: 700, color: cpCorrect === questions.length ? "#15803d" : "#b45309", margin: "8px 0" } }, `${cpCorrect}/${questions.length}`),
          React.createElement("p", { style: { fontSize: 14, color: "var(--text-muted)", margin: "0 0 16px" } },
            cpCorrect === questions.length ? "Perfect score! 🌟" : cpCorrect >= questions.length * 0.6 ? "Good work! Keep going." : "Let's review — you'll get there.")),
        React.createElement("div", { style: { marginTop: 16 } }, _btn("Continue →", () => { setXp((x) => x + (cpCorrect === questions.length ? 50 : 20)); advance(); }, true, false)));
    }
    const q = questions[cpIdx];
    return React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
      React.createElement("div", { style: { marginBottom: 12, display: "flex", alignItems: "center", gap: 8 } },
        _badge("linear-gradient(135deg,#6366f1,#4f46e5)", "white", `CHECKPOINT ${cpIdx + 1}/${questions.length}`)),
      React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 } },
        React.createElement("p", { style: { fontWeight: 600, fontSize: 16, margin: "0 0 16px", color: "var(--text-strong)", lineHeight: 1.5 } }, q.question),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
          ...(q.options || []).map((opt, i) => {
            const isCor = i === q.correct, isSel = i === cpSelected;
            let bg = "var(--surface-card)", bc = "var(--border-default)", col = "var(--text-body)", lbg = "#f3f4f6", lcol = "#9ca3af";
            if (cpRevealed) {
              if (isCor) { bg = "#f0fdf4"; bc = "#22c55e"; col = "#15803d"; lbg = "#22c55e"; lcol = "white"; }
              else if (isSel) { bg = "#fef2f2"; bc = "#ef4444"; col = "#b91c1c"; lbg = "#ef4444"; lcol = "white"; }
              else { col = "#d1d5db"; bc = "#f3f4f6"; }
            }
            return React.createElement("button", {
              key: i, disabled: cpRevealed,
              onClick: () => {
                if (cpRevealed) return;
                const correct = i === q.correct;
                setCpSelected(i); setCpRevealed(true);
                setCpResults((r) => [...r, correct]);
                setResults((r) => [...r, { type: "checkpoint", correct }]);
                if (resolved && window.recordReview) window.recordReview(resolved.examId, resolved.topicIdx, correct);
              },
              style: { display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: bg, border: `1.5px solid ${bc}`, borderRadius: 14, color: col, fontSize: 14, textAlign: "left", cursor: cpRevealed ? "default" : "pointer", width: "100%", fontFamily: "var(--font-sans)", transition: "all 0.15s" }
            },
              React.createElement("span", { style: { width: 28, height: 28, borderRadius: 8, background: lbg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: lcol, flexShrink: 0 } }, ["A", "B", "C", "D"][i]),
              React.createElement("span", { style: { lineHeight: 1.45, fontWeight: 500 } }, opt));
          })),
        cpRevealed && q.explanation && React.createElement("div", {
          style: { marginTop: 14, padding: "12px 16px", background: cpSelected === q.correct ? "#f0fdf4" : "#fffbeb", border: `1px solid ${cpSelected === q.correct ? "#bbf7d0" : "#fde68a"}`, borderRadius: 12, fontSize: 14, color: cpSelected === q.correct ? "#15803d" : "#92400e", lineHeight: 1.6 }
        }, cpSelected === q.correct ? "✅ " : "💡 ", q.explanation)),
      cpRevealed && React.createElement("div", { style: { marginTop: 16 } },
        _btn(cpIdx + 1 < questions.length ? "Next question →" : "See results →", () => { setCpIdx((n) => n + 1); setCpSelected(null); setCpRevealed(false); }, true, false)));
  };

  // ─── Render current step ───────────────────────────────────────────────────
  const renderStep = () => {
    if (!s) return null;
    switch (s.type) {
      case "teach": return renderTeach();
      case "mcq": return renderMcq(s.question, s.options, s.correct, s.explanation, s.difficulty);
      case "tf": return renderTf();
      case "fill": return renderFill();
      case "worked_example": return renderWorkedExample();
      case "checkpoint": return renderCheckpoint();
      default: return React.createElement("p", null, `Unknown step: ${s.type}`);
    }
  };

  // ─── Progress header ──────────────────────────────────────────────────────
  const pct = Math.round(((step + 1) / totalSteps) * 100);
  const estMinsLeft = plan.estimatedMinutes ? Math.max(1, Math.round(plan.estimatedMinutes * (1 - step / totalSteps))) : null;

  return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)" } },
    // Progress bar
    React.createElement("div", { style: { padding: "12px 20px 0" } },
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } },
        React.createElement("span", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)" } }, `Step ${step + 1} of ${totalSteps}`),
        React.createElement("div", { style: { display: "flex", gap: 12, fontSize: 12, color: "var(--text-muted)" } },
          masteryBefore != null && React.createElement("span", null, `Mastery: ${masteryNow}%`),
          totalAnswered > 0 && React.createElement("span", null, `${correctCount}/${totalAnswered} ✓`),
          estMinsLeft && React.createElement("span", null, `~${estMinsLeft} min left`)),
      ),
      React.createElement("div", { style: { height: 4, background: "var(--surface-muted)", borderRadius: 2, overflow: "hidden" } },
        React.createElement("div", { style: { height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#6366f1,#7c3aed)", borderRadius: 2, transition: "width 0.4s ease" } })),
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginTop: 4 } },
        React.createElement("span", { style: { fontSize: 11, color: "var(--text-faint)" } }, plan.title),
        React.createElement("button", { onClick: () => { commitResults(); onExit(); }, style: { fontSize: 11, color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", textDecoration: "underline" } }, "Exit lesson"))),

    // Step content
    React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "20px 20px 20px" } }, renderStep()));
}

// ─── CHAT MODE (freeform) ────────────────────────────────────────────────────

function ChatMode({ onExit, initialQuery }) {
  const STORAGE_KEY = "aicoach_chat_msgs";
  const HISTORY_KEY = "aicoach_chat_hist";
  const [messages, setMessages] = React.useState(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } });
  const [input, setInput] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const bodyRef = React.useRef(null);
  const historyRef = React.useRef((() => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; } })());
  const handled = React.useRef(false);

  React.useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); localStorage.setItem(HISTORY_KEY, JSON.stringify(historyRef.current)); } catch {} }, [messages]);
  React.useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [messages, typing]);
  React.useEffect(() => { if (initialQuery && !handled.current) { handled.current = true; setTimeout(() => send(initialQuery), 100); } }, [initialQuery]);

  React.useEffect(() => {
    if (messages.length === 0) {
      const brain = window.getBrain ? window.getBrain() : {};
      const name = brain.profile?.fullName ? brain.profile.fullName.split(" ")[0] : "";
      setTimeout(() => pushAI(`Hey${name ? ` ${name}` : ""}! Ask me anything — I can explain concepts, solve problems, or quiz you on whatever you need.`), 300);
    }
  }, []);

  const pushAI = (text) => {
    historyRef.current = [...historyRef.current, { role: "assistant", content: text }];
    setMessages((m) => [...m, { id: Date.now() + Math.random(), role: "ai", text }]);
  };

  const send = async (raw) => {
    const text = (raw || "").trim();
    if (!text || typing) return;
    historyRef.current = [...historyRef.current, { role: "user", content: text }];
    setMessages((m) => [...m, { id: Date.now() + Math.random(), role: "user", text }]);
    setInput("");
    setTyping(true);
    try {
      const complete = window.brainComplete || ((a) => window.claude.complete(a));
      const reply = await complete({
        system: "You are a brilliant, warm personal tutor. Answer clearly and concisely. Use **bold** for key terms. Always end with a follow-up question. Keep responses under 80 words. Do NOT output JSON — just write natural text.",
        messages: historyRef.current,
      });
      setTyping(false);
      pushAI(reply);
    } catch (e) {
      setTyping(false);
      pushAI("Connection hiccup — try again in a moment.");
    }
  };

  return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)" } },
    React.createElement("div", { style: { padding: "10px 20px", borderBottom: "1px solid var(--border-subtle)", background: "var(--surface-card)", borderRadius: "var(--radius-2xl) var(--radius-2xl) 0 0", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 48 } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
        React.createElement(CoachIcon, { size: 28 }),
        React.createElement("span", { style: { fontSize: 13, fontWeight: 600, color: "var(--text-strong)" } }, "💬 Chat"),
        React.createElement("span", { style: { fontSize: 11, color: "#059669" } }, "● Online")),
      React.createElement("button", { onClick: () => { try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(HISTORY_KEY); } catch {} onExit(); }, style: { background: "transparent", border: "1px solid var(--border-default)", color: "var(--text-muted)", borderRadius: 8, padding: "3px 10px", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-sans)" } }, "End chat")),
    React.createElement("div", { ref: bodyRef, style: { flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12, background: "var(--surface-page)" } },
      ...messages.map((m) =>
        React.createElement("div", { key: m.id, style: { display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 10, alignItems: "flex-start" } },
          m.role === "ai" && React.createElement(CoachIcon, { size: 28 }),
          React.createElement("div", {
            style: { maxWidth: "80%", background: m.role === "user" ? "#4f46e5" : "var(--surface-card)", color: m.role === "user" ? "white" : "var(--text-body)", border: m.role === "user" ? "none" : "1px solid var(--border-subtle)", padding: "10px 14px", borderRadius: 16, borderTopRightRadius: m.role === "user" ? 4 : 16, borderTopLeftRadius: m.role === "ai" ? 4 : 16, fontSize: 13, lineHeight: 1.65 },
            dangerouslySetInnerHTML: { __html: _md(m.text) }
          }))),
      typing && React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "flex-start" } },
        React.createElement(CoachIcon, { size: 28 }),
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, borderTopLeftRadius: 4, padding: "14px 18px", display: "flex", gap: 5 } },
          ...[0, 1, 2].map((d) => React.createElement("span", { key: d, style: { width: 7, height: 7, borderRadius: "50%", background: "#6366f1", animation: "aiTyping 1.2s ease-in-out infinite", animationDelay: d * 0.2 + "s" } }))))),
    React.createElement("div", { style: { padding: "12px 16px", borderTop: "1px solid var(--border-subtle)", background: "var(--surface-card)", display: "flex", gap: 8, alignItems: "flex-end" } },
      React.createElement("textarea", { value: input, onChange: (e) => setInput(e.target.value), onKeyDown: (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }, placeholder: "Ask anything…", rows: 1, style: { flex: 1, border: "1px solid var(--border-default)", borderRadius: 12, padding: "10px 14px", fontSize: 13, fontFamily: "var(--font-sans)", color: "var(--text-body)", background: "var(--surface-page)", resize: "none", outline: "none", lineHeight: 1.5, maxHeight: 100, overflowY: "auto" } }),
      React.createElement("button", { onClick: () => send(input), disabled: !input.trim() || typing, style: { background: input.trim() && !typing ? "#4f46e5" : "#c7d2fe", color: "white", border: "none", borderRadius: 12, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: input.trim() && !typing ? "pointer" : "default", fontFamily: "var(--font-sans)" } }, "Send")));
}

// ─── MAIN ROUTER ─────────────────────────────────────────────────────────────

function AIChat({ t, initialQuery, onConsumeQuery }) {
  const [mode, setMode] = React.useState(null);
  const [topic, setTopic] = React.useState(null);
  const [topicPicker, setTopicPicker] = React.useState(false);

  const brain = React.useMemo(() => window.getBrain ? window.getBrain() : {}, []);
  const examViews = brain.examViews || [];
  const dueReviews = brain.dueReviews || [];
  const weakest = brain.weakestTopics || [];
  const profile = brain.profile || {};
  const name = profile.fullName ? profile.fullName.split(" ")[0] : null;

  React.useEffect(() => {
    if (initialQuery && onConsumeQuery) {
      onConsumeQuery();
      if (typeof initialQuery === "object" && initialQuery.mode === "learn" && initialQuery.topic) {
        setTopic(initialQuery.topic);
        setMode("learn");
      } else {
        setMode("chat");
      }
    }
  }, [initialQuery]);

  const exitToLobby = () => { setMode(null); setTopic(null); setTopicPicker(false); };

  // Active mode screens
  if (mode === "learn" && topic) return React.createElement(LessonEngine, { topic, onExit: exitToLobby });
  if (mode === "chat") return React.createElement(ChatMode, { onExit: exitToLobby, initialQuery });

  // Review mode — generate review lesson for due topics
  if (mode === "review") {
    const reviewTopic = dueReviews.length > 0 ? dueReviews[0].topicName : (weakest.length > 0 ? weakest[0].topicName : "General review");
    return React.createElement(LessonEngine, { topic: `Review: ${reviewTopic}`, onExit: exitToLobby });
  }

  // Practice mode — generate practice questions
  if (mode === "practice") {
    const practiceTopic = examViews.length > 0 ? `Exam practice: ${examViews[0].name}` : "Practice questions";
    return React.createElement(LessonEngine, { topic: practiceTopic, onExit: exitToLobby });
  }

  // Topic picker for Learn mode
  if (topicPicker) {
    const topics = examViews.flatMap((e) => (e.topics || []).map((tp) => ({
      name: tp.topicName || tp.name, exam: e.name, retention: tp.lastSeen ? Math.round(tp.retention * 100) : null, unseen: !tp.lastSeen,
    }))).sort((a, b) => (a.retention ?? -1) - (b.retention ?? -1));
    const suggested = topics.filter((t) => t.unseen || (t.retention != null && t.retention < 60)).slice(0, 6);
    const allTopics = topics.length > 6 ? topics : [];

    return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)", padding: "24px 20px" } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 20 } },
        React.createElement("button", { onClick: () => setTopicPicker(false), style: { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted)", padding: 0 } }, "←"),
        React.createElement("h2", { style: { margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-strong)" } }, "What do you want to learn?")),

      suggested.length > 0 && React.createElement("div", { style: { marginBottom: 20 } },
        React.createElement("p", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" } }, "Recommended for you"),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
          ...suggested.map((tp, i) => React.createElement("button", {
            key: i, onClick: () => { setTopic(tp.name); setTopicPicker(false); setMode("learn"); },
            style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "var(--surface-card)", border: "1.5px solid var(--border-default)", borderRadius: 14, cursor: "pointer", fontFamily: "var(--font-sans)", width: "100%", textAlign: "left" }
          },
            React.createElement("div", null,
              React.createElement("span", { style: { fontSize: 14, fontWeight: 600, color: "var(--text-strong)" } }, tp.name),
              React.createElement("span", { style: { fontSize: 12, color: "var(--text-muted)", marginLeft: 8 } }, tp.exam)),
            React.createElement("span", { style: { fontSize: 12, fontWeight: 600, color: tp.unseen ? "var(--indigo-600)" : tp.retention < 30 ? "#b91c1c" : "#b45309" } },
              tp.unseen ? "New" : `${tp.retention}%`))))),

      allTopics.length > 0 && React.createElement("div", null,
        React.createElement("p", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" } }, "All topics"),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" } },
          ...allTopics.map((tp, i) => React.createElement("button", {
            key: i, onClick: () => { setTopic(tp.name); setTopicPicker(false); setMode("learn"); },
            style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "transparent", border: "none", borderBottom: "1px solid var(--border-subtle)", cursor: "pointer", fontFamily: "var(--font-sans)", width: "100%", textAlign: "left" }
          },
            React.createElement("span", { style: { fontSize: 13, color: "var(--text-body)" } }, `${tp.name} · ${tp.exam}`),
            React.createElement("span", { style: { fontSize: 11, color: tp.unseen ? "var(--indigo-600)" : "var(--text-muted)" } }, tp.unseen ? "New" : `${tp.retention}%`))))));
  }

  // ─── LOBBY ─────────────────────────────────────────────────────────────────
  const greeting = name ? `Hey ${name}!` : "Hey!";
  const urgentReview = dueReviews.length > 0 ? dueReviews[0] : null;

  return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)" } },
    // Hero
    React.createElement("div", { style: { textAlign: "center", padding: "36px 20px 20px" } },
      React.createElement(CoachIcon, { size: 56 }),
      React.createElement("h1", { style: { margin: "16px 0 4px", fontSize: 22, fontWeight: 700, color: "var(--text-strong)" } }, `${greeting} What do you want to do?`),
      React.createElement("p", { style: { margin: 0, fontSize: 14, color: "var(--text-muted)" } }, "Your AI Coach is ready.")),

    // Urgent review nudge
    urgentReview && React.createElement("div", {
      onClick: () => setMode("review"),
      style: { margin: "0 20px 16px", padding: "12px 16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }
    },
      React.createElement("span", { style: { fontSize: 20 } }, "⚡"),
      React.createElement("div", { style: { flex: 1 } },
        React.createElement("p", { style: { margin: 0, fontSize: 13, fontWeight: 600, color: "#92400e" } }, `${urgentReview.topicName} is fading`),
        React.createElement("p", { style: { margin: 0, fontSize: 12, color: "#b45309" } }, `${Math.round(urgentReview.retention * 100)}% retention — review now`)),
      React.createElement("span", { style: { fontSize: 12, color: "#92400e", fontWeight: 600 } }, "→")),

    // Mode cards
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "0 20px", flex: 1 } },
      ...COACH_MODES.map((m) => React.createElement("button", {
        key: m.id,
        onClick: () => {
          if (m.id === "learn") { setTopicPicker(true); }
          else { setMode(m.id); }
        },
        style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "28px 16px", background: "var(--surface-card)", border: "1.5px solid var(--border-default)", borderRadius: 16, cursor: "pointer", fontFamily: "var(--font-sans)", transition: "border-color 0.15s" }
      },
        React.createElement("span", { style: { fontSize: 32 } }, m.emoji),
        React.createElement("span", { style: { fontSize: 15, fontWeight: 700, color: "var(--text-strong)" } }, m.label),
        React.createElement("span", { style: { fontSize: 12, color: "var(--text-muted)" } }, m.desc)))));
}

Object.assign(window, { AIChat, CoachIcon });
