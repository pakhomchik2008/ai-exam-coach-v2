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

// ─── CHECKPOINT (own component) ──────────────────────────────────────────────
// Its own component so its cpIdx/cpSelected/cpRevealed/cpResults hooks are
// never declared *after* LessonEngine's early returns (loading/error/done) —
// that ordering was a Rules-of-Hooks violation that crashed the engine the
// instant a lesson finished loading. Mounting fresh per checkpoint step also
// gives the per-step state reset for free (no effect needed).
function LessonCheckpoint({ step: s, resolved, onResult, onXp, onAdvance }) {
  const [cpIdx, setCpIdx] = React.useState(0);
  const [cpSelected, setCpSelected] = React.useState(null);
  const [cpRevealed, setCpRevealed] = React.useState(false);
  const [cpResults, setCpResults] = React.useState([]);

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
      React.createElement("div", { style: { marginTop: 16 } }, _btn("Continue →", () => { onXp(cpCorrect === questions.length ? 50 : 20); onAdvance(); }, true, false)));
  }
  const q = questions[cpIdx];
  return React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
    React.createElement("div", { style: { marginBottom: 12, display: "flex", alignItems: "center", gap: 8 } },
      _badge("linear-gradient(135deg,#6366f1,#4f46e5)", "white", `CHECKPOINT ${cpIdx + 1}/${questions.length}`)),
    React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 } },
      React.createElement("p", { style: { fontWeight: 600, fontSize: 16, margin: "0 0 16px", color: "var(--text-strong)", lineHeight: 1.5 }, dangerouslySetInnerHTML: { __html: _md(q.question) } }),
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
              onResult(correct);
              if (resolved && window.recordReview) window.recordReview({ examId: resolved.examId, topicIdx: resolved.topicIdx, topicName: resolved.topicName, correct });
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
}

// ─── LEARN ENGINE ────────────────────────────────────────────────────────────
// First contact with a topic. Rich theory sections with examples, formulas,
// callouts. AI decides how many sections the topic needs. Each section:
// full explanation → quick quiz. Ends with summary + checkpoint.

function LearnEngine({ topic, onExit }) {
  const [plan, setPlan] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const [phase, setPhase] = React.useState("roadmap");
  const [secIdx, setSecIdx] = React.useState(0);
  const [quizIdx, setQuizIdx] = React.useState(0);
  const [selected, setSelected] = React.useState(null);
  const [revealed, setRevealed] = React.useState(false);
  const [results, setResults] = React.useState([]);
  const [xp, setXp] = React.useState(0);
  const [masteryBefore, setMasteryBefore] = React.useState(null);
  const xpCommittedRef = React.useRef(false);
  const scrollRef = React.useRef(null);

  const resolved = React.useMemo(() => window.resolveTopicForBrain ? window.resolveTopicForBrain(topic) : null, [topic]);
  const brain = window.getBrain ? window.getBrain() : {};

  React.useEffect(() => {
    if (phase === "done" && !xpCommittedRef.current) {
      xpCommittedRef.current = true;
      if (window.addXp) window.addXp(xp + 100);
    }
  }, [phase]);

  React.useEffect(() => {
    if (resolved) {
      const ev = (brain.examViews || []).find((e) => e.id === resolved.examId);
      const tp = ev && (ev.topics || []).find((t) => t.topicIdx === resolved.topicIdx);
      setMasteryBefore(tp ? Math.round(tp.retention * 100) : 0);
    } else setMasteryBefore(0);
  }, []);

  const masteryNow = React.useMemo(() => {
    if (!resolved || !window.getBrain) return masteryBefore || 0;
    const b = window.getBrain();
    const ev = (b.examViews || []).find((e) => e.id === resolved.examId);
    const tp = ev && (ev.topics || []).find((t) => t.topicIdx === resolved.topicIdx);
    return tp ? Math.round(tp.retention * 100) : masteryBefore || 0;
  }, [results]);

  // ─── Generate study guide ─────────────────────────────────────────────────
  React.useEffect(() => {
    setLoading(true); setError(null); setPlan(null); setPhase("roadmap"); setSecIdx(0); setResults([]);
    (async () => {
      try {
        const complete = window.brainComplete || ((a) => window.claude.complete(a));
        const topicContext = resolved ? { examId: resolved.examId, topicName: resolved.topicName } : undefined;

        const system = `You are an expert teacher creating a focused study guide. The student is learning this topic for the FIRST TIME.

OUTPUT ONLY valid JSON — no markdown fences, no text before or after. Start with { end with }.

CRITICAL CONSTRAINT: The ENTIRE JSON response must stay under 6000 tokens. Be concise — quality over quantity.

VOICE: Clear, warm, direct. **Bold** key terms. Use concrete examples and analogies.

STRUCTURE — exactly 3 to 4 sections (no more, no fewer):
- Break the topic into its 3-4 most important sub-topics. Choose the most essential ones.
- Each section covers ONE clear idea with explanation + example.

SECTION FIELDS (each section object):
- "title": string — section name
- "content": string — 3-5 sentences of clear explanation. **Bold** key terms. Include ONE concrete analogy or example inline. Separate ideas with \\n\\n if needed.
- "keyPoints": string[] — exactly 2-3 short memorable takeaways
- "formula": string | null — the key formula, rule, or code snippet. null if not applicable.
- "example": {"problem":"one specific problem","solution":"2-4 step solution","answer":"final answer"} | null — null for purely conceptual sections
- "proTip": string | null — one practical shortcut (1 sentence). null if nothing important.
- "commonMistake": string | null — the #1 thing students get wrong (1 sentence). null if not applicable.
- "quiz": array of exactly 1 object: {"type":"mcq","question":"...","options":["A","B","C","D"],"correct":0,"explanation":"1-2 sentences."}

TOP-LEVEL FIELDS:
- "title": string
- "estimatedMinutes": number (5-15)
- "sections": array of exactly 3-4 section objects
- "summary": string[] — exactly 4-5 key points covering the whole topic
- "checkpoint": {"questions": array of exactly 3 MCQ objects: {"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."}}

RULES:
- EXACTLY 3-4 sections. Not 5, not 6. Choose the most essential sub-topics.
- Content is 3-5 sentences per section — not essays, not bullet points.
- Every field that says "null if not applicable" MUST be null (not omitted) when not relevant.
- Adapt to subject: math → formulas + worked numbers; history → key dates + causation; programming → code; science → mechanisms.`;

        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("Taking too long — try again.")), 55000));
        const raw = await Promise.race([
          complete({ system, messages: [{ role: "user", content: `Create a comprehensive study guide on: ${topic}` }], topicContext }),
          timeout,
        ]);
        const parsed = window.parseJSON ? window.parseJSON(raw) : JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
        if (!parsed || !Array.isArray(parsed.sections) || parsed.sections.length === 0) throw new Error("Invalid study guide");
        setPlan(parsed); setLoading(false);
      } catch (e) {
        console.error("Learn generation failed:", e);
        setError(e.message || "Failed to generate"); setLoading(false);
      }
    })();
  }, [topic, retryCount]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const sections = plan ? plan.sections : [];
  const sec = sections[secIdx] || {};
  const totalSections = sections.length;
  const correctCount = results.filter((r) => r.correct).length;
  const totalAnswered = results.length;
  const scrollTop = () => { if (scrollRef.current) scrollRef.current.scrollTop = 0; };

  const commitResults = () => {
    if (resolved) {
      if (window.markTopicsStudied) window.markTopicsStudied(resolved.examId, [resolved.topicIdx], [resolved.topicName]);
      if (window.recordConfidence) {
        const conf = totalAnswered === 0 ? 0.5 : correctCount / totalAnswered >= 0.8 ? 1 : correctCount / totalAnswered >= 0.5 ? 0.6 : 0.2;
        window.recordConfidence({ examId: resolved.examId, topicIdx: resolved.topicIdx, topicName: resolved.topicName, rating: conf });
      }
    }
    if (window.commitCoachSession) {
      const sess = { startedAt: Date.now() - 600000, topicsCovered: resolved ? [resolved] : [], quizResults: results.map((r) => ({ correct: r.correct, topicName: topic })), conceptsTaught: sections.length, diagnosedWeaknesses: [], diagnosedStrengths: [] };
      if (correctCount / Math.max(1, totalAnswered) >= 0.7) sess.diagnosedStrengths.push(topic);
      else sess.diagnosedWeaknesses.push(topic);
      window.commitCoachSession(sess);
    }
  };

  const answerQuiz = (idx, correct) => {
    if (selected !== null) return;
    const isCorrect = idx === correct;
    setSelected(idx); setRevealed(true);
    setResults((r) => [...r, { correct: isCorrect }]);
    setXp((x) => x + (isCorrect ? 20 : 5));
    if (resolved && window.recordReview) window.recordReview({ examId: resolved.examId, topicIdx: resolved.topicIdx, topicName: resolved.topicName, correct: isCorrect });
  };

  const nextAfterQuiz = () => {
    const quizzes = sec.quiz || [];
    if (quizIdx + 1 < quizzes.length) {
      setQuizIdx(quizIdx + 1); setSelected(null); setRevealed(false);
    } else if (secIdx + 1 < totalSections) {
      setSecIdx(secIdx + 1); setPhase("section"); setQuizIdx(0); setSelected(null); setRevealed(false); scrollTop();
    } else {
      setPhase("summary"); scrollTop();
    }
  };

  const goFromSection = () => {
    if (sec.quiz && sec.quiz.length > 0) {
      setPhase("quiz"); setQuizIdx(0); setSelected(null); setRevealed(false);
    } else if (secIdx + 1 < totalSections) {
      setSecIdx(secIdx + 1); scrollTop();
    } else {
      setPhase("summary"); scrollTop();
    }
  };

  const progressPct = phase === "roadmap" ? 0 : phase === "done" ? 100 :
    phase === "summary" ? 90 : phase === "checkpoint" ? 95 :
    Math.round(((secIdx + (phase === "quiz" ? 0.5 : 0)) / totalSections) * 85);

  const renderContent = (text) => {
    if (!text) return [];
    return text.split(/\n\n+/).map((para, i) =>
      React.createElement("p", {
        key: i,
        style: { margin: "0 0 14px", lineHeight: 1.8, fontSize: 15, color: "var(--text-body)" },
        dangerouslySetInnerHTML: { __html: _md(para.replace(/\n/g, "<br/>")) }
      }));
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", gap: 16 } },
      React.createElement(CoachIcon, { size: 56 }),
      React.createElement("p", { style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)" } }, "Building your study guide..."),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)" } }, `Topic: ${topic}`),
      React.createElement("p", { style: { fontSize: 12, color: "var(--text-faint)" } }, "This takes a moment — lots of material to prepare"),
      React.createElement("div", { style: { display: "flex", gap: 6 } },
        ...[0, 1, 2].map((d) => React.createElement("span", { key: d, style: { width: 8, height: 8, borderRadius: "50%", background: "#6366f1", animation: "aiTyping 1.2s ease-in-out infinite", animationDelay: d * 0.2 + "s" } }))));
  }

  if (error) {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", gap: 16, padding: "0 24px" } },
      React.createElement("span", { style: { fontSize: 40 } }, "⚠️"),
      React.createElement("p", { style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)", margin: 0 } }, "Couldn't generate study guide"),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", margin: 0, textAlign: "center" } }, error),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 } },
        _btn("↺ Try again", () => setRetryCount((n) => n + 1), true, false),
        _btn("← Back", onExit, false, false)));
  }

  // ─── Progress header ──────────────────────────────────────────────────────
  const header = React.createElement("div", { style: { padding: "12px 20px 0", flexShrink: 0 } },
    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } },
      React.createElement("span", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)" } },
        phase === "roadmap" ? "Overview" : phase === "summary" ? "Summary" : phase === "checkpoint" ? "Final Check" : phase === "done" ? "Complete!" : `Section ${secIdx + 1} of ${totalSections}`),
      React.createElement("div", { style: { display: "flex", gap: 12, fontSize: 12, color: "var(--text-muted)" } },
        totalAnswered > 0 && React.createElement("span", null, `${correctCount}/${totalAnswered} ✓`),
        React.createElement("button", { onClick: () => { if (phase !== "roadmap") commitResults(); onExit(); }, style: { fontSize: 11, color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", textDecoration: "underline" } }, "Exit"))),
    React.createElement("div", { style: { height: 4, background: "var(--surface-muted)", borderRadius: 2, overflow: "hidden" } },
      React.createElement("div", { style: { height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg,#6366f1,#7c3aed)", borderRadius: 2, transition: "width 0.4s ease" } })),
    React.createElement("span", { style: { fontSize: 11, color: "var(--text-faint)", marginTop: 4, display: "block" } }, plan.title));

  // ─── ROADMAP ──────────────────────────────────────────────────────────────
  if (phase === "roadmap") {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)" } },
      header,
      React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "24px 20px" } },
        React.createElement("div", { style: { textAlign: "center", marginBottom: 28 } },
          React.createElement("span", { style: { fontSize: 48 } }, "📘"),
          React.createElement("h1", { style: { fontSize: 22, fontWeight: 700, color: "var(--text-strong)", margin: "12px 0 6px" } }, plan.title),
          React.createElement("p", { style: { fontSize: 14, color: "var(--text-muted)", margin: 0 } }, `${totalSections} sections · ~${plan.estimatedMinutes || 15} min`)),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 } },
          ...sections.map((s, i) => React.createElement("div", {
            key: i,
            style: { display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14 }
          },
            React.createElement("div", { style: { width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 } }, i + 1),
            React.createElement("div", { style: { flex: 1 } },
              React.createElement("span", { style: { fontSize: 15, fontWeight: 600, color: "var(--text-strong)" } }, s.title),
              s.quiz && s.quiz.length > 0 && React.createElement("span", { style: { fontSize: 11, color: "var(--text-muted)", marginLeft: 8 } }, `+ ${s.quiz.length} quiz`))))),
        _btn("Let's start →", () => { setPhase("section"); scrollTop(); }, true, false)));
  }

  // ─── SECTION (rich theory) ────────────────────────────────────────────────
  if (phase === "section") {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)" } },
      header,
      React.createElement("div", { ref: scrollRef, style: { flex: 1, overflowY: "auto", padding: "20px 20px 24px" } },
        React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
          React.createElement("div", { style: { marginBottom: 12 } },
            _badge("linear-gradient(135deg,#6366f1,#4f46e5)", "white", `📖 SECTION ${secIdx + 1} of ${totalSections}`)),
          React.createElement("h2", { style: { fontSize: 20, fontWeight: 700, color: "var(--text-strong)", margin: "0 0 20px" } }, sec.title),

          // Main content
          React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24, marginBottom: 16 } },
            ...renderContent(sec.content)),

          // Formula
          sec.formula && React.createElement("div", { style: { background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 12, padding: "16px 20px", marginBottom: 16, textAlign: "center" } },
            React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 } }, "📐 KEY FORMULA / RULE"),
            React.createElement("div", { style: { fontFamily: "var(--font-mono)", fontSize: 16, color: "#0f172a", lineHeight: 1.6, whiteSpace: "pre-wrap" } }, sec.formula)),

          // Example
          sec.example && React.createElement("div", { style: { background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 14, padding: 20, marginBottom: 16 } },
            React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 } }, "📝 WORKED EXAMPLE"),
            sec.example.problem && React.createElement("p", { style: { fontWeight: 600, fontSize: 14, color: "#581c87", margin: "0 0 12px", lineHeight: 1.5 } }, sec.example.problem),
            sec.example.solution && React.createElement("div", { style: { fontSize: 14, color: "#6b21a8", lineHeight: 1.75, marginBottom: 10 }, dangerouslySetInnerHTML: { __html: _md(String(sec.example.solution).replace(/\n/g, "<br/>")) } }),
            sec.example.answer && React.createElement("div", { style: { fontWeight: 700, fontSize: 15, color: "#581c87", borderTop: "1px solid #e9d5ff", paddingTop: 10, marginTop: 4 } }, "→ Answer: ", sec.example.answer)),

          // Pro tip
          sec.proTip && React.createElement("div", { style: { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 14, color: "#15803d", lineHeight: 1.6 } },
            "💡 ", React.createElement("strong", null, "Pro tip: "), sec.proTip),

          // Common mistake
          sec.commonMistake && React.createElement("div", { style: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 14, color: "#b91c1c", lineHeight: 1.6 } },
            "⚠️ ", React.createElement("strong", null, "Common mistake: "), sec.commonMistake),

          // Key points
          sec.keyPoints && sec.keyPoints.length > 0 && React.createElement("div", { style: { background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "14px 18px", marginBottom: 20 } },
            React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 } }, "🔑 KEY POINTS"),
            ...sec.keyPoints.map((kp, i) => React.createElement("div", { key: i, style: { display: "flex", gap: 8, fontSize: 14, color: "#78350f", lineHeight: 1.5, marginBottom: 4 } },
              React.createElement("span", null, "•"), React.createElement("span", { dangerouslySetInnerHTML: { __html: _md(kp) } })))),

          // Continue button
          _btn(sec.quiz && sec.quiz.length > 0 ? "Got it — quiz me →" : (secIdx + 1 < totalSections ? "Got it, next section →" : "See summary →"), goFromSection, true, false))));
  }

  // ─── QUIZ (after each section) ────────────────────────────────────────────
  if (phase === "quiz") {
    const quizzes = sec.quiz || [];
    const q = quizzes[quizIdx];
    if (!q) return React.createElement("div", { style: { padding: 40, textAlign: "center" } }, _btn("Continue →", nextAfterQuiz, true, false));

    return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)" } },
      header,
      React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "20px 20px 24px" } },
        React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
          React.createElement("div", { style: { marginBottom: 12, display: "flex", gap: 8 } },
            _badge("#eef2ff", "#4f46e5", `📝 QUICK CHECK ${quizIdx + 1}/${quizzes.length}`),
            _badge("#f0fdf4", "#15803d", sec.title)),
          React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 } },
            React.createElement("p", { style: { fontWeight: 600, fontSize: 16, margin: "0 0 16px", color: "var(--text-strong)", lineHeight: 1.5 }, dangerouslySetInnerHTML: { __html: _md(q.question) } }),
            React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
              ...(q.options || []).map((opt, i) => {
                const isCor = i === q.correct, isSel = i === selected;
                let bg = "var(--surface-card)", bc = "var(--border-default)", col = "var(--text-body)", lbg = "#f3f4f6", lcol = "#9ca3af";
                if (revealed) {
                  if (isCor) { bg = "#f0fdf4"; bc = "#22c55e"; col = "#15803d"; lbg = "#22c55e"; lcol = "white"; }
                  else if (isSel) { bg = "#fef2f2"; bc = "#ef4444"; col = "#b91c1c"; lbg = "#ef4444"; lcol = "white"; }
                  else { col = "#d1d5db"; bc = "#f3f4f6"; }
                }
                return React.createElement("button", {
                  key: i, disabled: revealed, onClick: () => answerQuiz(i, q.correct),
                  style: { display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: bg, border: `1.5px solid ${bc}`, borderRadius: 14, color: col, fontSize: 14, textAlign: "left", cursor: revealed ? "default" : "pointer", width: "100%", fontFamily: "var(--font-sans)", transition: "all 0.15s" }
                },
                  React.createElement("span", { style: { width: 28, height: 28, borderRadius: 8, background: lbg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: lcol, flexShrink: 0 } }, ["A", "B", "C", "D"][i]),
                  React.createElement("span", { style: { lineHeight: 1.45, fontWeight: 500 } }, opt));
              })),
            revealed && q.explanation && React.createElement("div", {
              style: { marginTop: 14, padding: "12px 16px", background: selected === q.correct ? "#f0fdf4" : "#fffbeb", border: `1px solid ${selected === q.correct ? "#bbf7d0" : "#fde68a"}`, borderRadius: 12, fontSize: 14, color: selected === q.correct ? "#15803d" : "#92400e", lineHeight: 1.6 }
            }, selected === q.correct ? "✅ " : "💡 ", q.explanation)),
          revealed && React.createElement("div", { style: { marginTop: 16 } },
            _btn(quizIdx + 1 < quizzes.length ? "Next question →" : secIdx + 1 < totalSections ? "Next section →" : "See summary →", nextAfterQuiz, true, false)))));
  }

  // ─── SUMMARY (cheat sheet) ────────────────────────────────────────────────
  if (phase === "summary") {
    const summaryPoints = plan.summary || [];
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)" } },
      header,
      React.createElement("div", { ref: scrollRef, style: { flex: 1, overflowY: "auto", padding: "20px 20px 24px" } },
        React.createElement("div", { style: { textAlign: "center", marginBottom: 20 } },
          React.createElement("span", { style: { fontSize: 40 } }, "📋"),
          React.createElement("h2", { style: { fontSize: 20, fontWeight: 700, color: "var(--text-strong)", margin: "8px 0 4px" } }, "Key Takeaways"),
          React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", margin: 0 } }, "Copy these into your notes!")),
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24, marginBottom: 20 } },
          ...summaryPoints.map((point, i) => React.createElement("div", {
            key: i,
            style: { display: "flex", gap: 10, padding: "10px 0", borderBottom: i < summaryPoints.length - 1 ? "1px solid var(--border-subtle)" : "none" }
          },
            React.createElement("span", { style: { fontSize: 16, flexShrink: 0, color: "#6366f1" } }, "✦"),
            React.createElement("span", { style: { fontSize: 14, color: "var(--text-body)", lineHeight: 1.6 }, dangerouslySetInnerHTML: { __html: _md(point) } })))),
        _btn("Ready — test me! →", () => { setPhase("checkpoint"); scrollTop(); }, true, false)));
  }

  // ─── CHECKPOINT ───────────────────────────────────────────────────────────
  if (phase === "checkpoint" && plan.checkpoint) {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)" } },
      header,
      React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "20px 20px 24px" } },
        React.createElement(LessonCheckpoint, {
          step: plan.checkpoint,
          resolved,
          onResult: (correct) => setResults((r) => [...r, { correct }]),
          onXp: (amount) => setXp((x) => x + amount),
          onAdvance: () => { commitResults(); setPhase("done"); },
        })));
  }

  // ─── DONE (celebration) ───────────────────────────────────────────────────
  if (phase === "done") {
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    const finalXp = xp + 100;
    const totalXpAfter = (window.getXp ? window.getXp() : 0) + finalXp;
    const xpLevelAfter = window.xpLevel ? window.xpLevel(totalXpAfter) : null;
    const xpPctAfter = xpLevelAfter ? Math.round((xpLevelAfter.into / xpLevelAfter.need) * 100) : 0;
    const masteryDelta = (masteryNow || 0) - (masteryBefore || 0);
    const grade = accuracy >= 90 ? "A" : accuracy >= 75 ? "B" : accuracy >= 60 ? "C" : "D";
    const gradeEmoji = { A: "🌟", B: "✨", C: "👍", D: "💪" };

    return React.createElement("div", {
      style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", gap: 0, padding: "0 20px", animation: "fadeUp 0.5s ease-out" }
    },
      React.createElement("div", { style: { fontSize: 56, marginBottom: 8, animation: "pulse 0.6s ease-in-out" } }, gradeEmoji[grade]),
      React.createElement("h1", { style: { fontSize: 24, fontWeight: 700, color: "var(--text-strong)", margin: "0 0 4px", textAlign: "center" } }, "Study Guide Complete!"),
      React.createElement("p", { style: { fontSize: 14, color: "var(--text-muted)", margin: "0 0 24px" } }, plan.title),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%", maxWidth: 360, marginBottom: 24 } },
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "16px", textAlign: "center" } },
          React.createElement("p", { style: { fontSize: 28, fontWeight: 700, color: accuracy >= 70 ? "#15803d" : "#b45309", margin: 0 } }, `${accuracy}%`),
          React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" } }, "Accuracy")),
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "16px", textAlign: "center" } },
          React.createElement("p", { style: { fontSize: 28, fontWeight: 700, color: "var(--indigo-600)", margin: 0 } }, `+${finalXp}`),
          React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" } }, "XP Earned")),
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "16px", textAlign: "center" } },
          React.createElement("p", { style: { fontSize: 14, fontWeight: 600, color: "var(--text-muted)", margin: 0 } }, `${masteryBefore || 0}%`),
          React.createElement("p", { style: { fontSize: 20, fontWeight: 700, color: masteryDelta > 0 ? "#15803d" : "var(--text-strong)", margin: "2px 0 0" } }, `→ ${masteryNow || 0}%`),
          React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" } }, "Mastery")),
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "16px", textAlign: "center" } },
          React.createElement("p", { style: { fontSize: 28, fontWeight: 700, color: "var(--text-strong)", margin: 0 } }, `${totalSections}📖`),
          React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" } }, "Sections"))),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" } }, `${correctCount} of ${totalAnswered} questions correct`),
      xpLevelAfter && React.createElement("div", { style: { width: "100%", maxWidth: 360, marginBottom: 16, background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "14px 16px" } },
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } },
          React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "var(--indigo-600)" } }, `⭐ Level ${xpLevelAfter.level}`),
          React.createElement("span", { style: { fontSize: 11, color: "var(--text-muted)" } }, `${xpLevelAfter.into} / ${xpLevelAfter.need} XP`)),
        React.createElement("div", { style: { height: 8, background: "var(--border-subtle)", borderRadius: 4, overflow: "hidden" } },
          React.createElement("div", { style: { height: "100%", width: `${xpPctAfter}%`, background: "linear-gradient(90deg,#6366f1,#7c3aed)", borderRadius: 4 } }))),
      _btn("Done →", onExit, true, false));
  }

  return null;
}

// ─── LESSON ENGINE ───────────────────────────────────────────────────────────

// ─── Difficulty vote helpers ─────────────────────────────────────────────────
const DIFF_KEY = "brain_difficulty_v1";
function getDiffVote(topicKey) {
  try { const d = JSON.parse(localStorage.getItem(DIFF_KEY) || "{}"); return d[topicKey] ?? null; } catch { return null; }
}
function saveDiffVote(topicKey, vote) {
  try { const d = JSON.parse(localStorage.getItem(DIFF_KEY) || "{}"); d[topicKey] = vote; localStorage.setItem(DIFF_KEY, JSON.stringify(d)); } catch {}
}

function LessonEngine({ topic, mode, onExit }) {
  const [plan, setPlan] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [retryCount, setRetryCount] = React.useState(0);
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
  const [showDiffPanel, setShowDiffPanel] = React.useState(false);
  const [diffVoted, setDiffVoted] = React.useState(false);
  // Guards the once-per-lesson XP commit so it can't double-count across
  // re-renders. Only a genuine completion (done → true) banks XP; exiting early
  // never sets done, so partial-lesson XP is deliberately not awarded.
  const xpCommittedRef = React.useRef(false);

  const resolved = React.useMemo(() => window.resolveTopicForBrain ? window.resolveTopicForBrain(topic) : null, [topic]);
  const brain = window.getBrain ? window.getBrain() : {};

  // Persist this lesson's XP to the Brain exactly once, when it completes. By
  // this point every per-answer setXp has flushed, so `xp` is the final tally;
  // +100 matches the completion bonus the celebration screen shows.
  React.useEffect(() => {
    if (done && !xpCommittedRef.current) {
      xpCommittedRef.current = true;
      if (window.addXp) window.addXp(xp + 100);
    }
  }, [done]);

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
    setLoading(true);
    setError(null);
    setPlan(null);
    setStep(0);
    setResults([]);
    setDone(false);
    (async () => {
      try {
        const complete = window.brainComplete || ((a) => window.claude.complete(a));
        const topicContext = resolved ? { examId: resolved.examId, topicName: resolved.topicName } : undefined;

        const topicKey = `${topic}::${resolved?.examId || "any"}`;
        const priorVote = getDiffVote(topicKey);
        const DIFF_NOTE = priorVote == null || priorVote === 0 ? "" :
          priorVote >= 2  ? "\n\n⚠️ DIFFICULTY FEEDBACK (important): The student said this topic was WAY too easy last time. Skip basics entirely. Use only hard questions, complex applications, tricky edge cases. Assume solid prior knowledge." :
          priorVote === 1 ? "\n\n⚠️ DIFFICULTY FEEDBACK: The student found this slightly too easy. Use harder questions, less hand-holding, assume more background knowledge." :
          priorVote === -1 ? "\n\n⚠️ DIFFICULTY FEEDBACK: The student found this slightly too hard. Use more scaffolding, clearer analogies, and start with easier questions." :
          "\n\n⚠️ DIFFICULTY FEEDBACK (important): The student found this topic WAY too hard last time. Simplify significantly: very concrete examples, no jargon without explanation, easy questions first, heavy scaffolding throughout.";

        const VOICE = `VOICE — applies to every "body", "explanation" and "keyTakeaway":
- Energetic, warm, a little cheeky. Talk TO the student, not AT them.
- Praise is specific and earned — name the exact thing they did right. NEVER "Great job", "Correct!", "Well done", or praise that fits any answer.
- 1-3 short sentences per text field. No walls of text.
- Turn wrong answers into insight ("Ooh — that's the classic trap, here's the tell…"), never a flat "the answer is B".
- When the student's history above is relevant, reference it naturally. NEVER invent history you weren't given.`;

        const STEP_TYPES = `STEP TYPES AND THEIR EXACT JSON SHAPES:

"teach" — explain ONE concept:
{"type":"teach","title":"Short Title","body":"1-3 sentences. **Bold** key terms. Concrete analogy, not abstract.","keyTakeaway":"One punchy sentence","example":"A concrete example or formula"}

"mcq" — multiple choice:
{"type":"mcq","question":"Clear, specific question","options":["A","B","C","D"],"correct":1,"explanation":"Why the right answer is right; why others are traps. 1-2 sentences.","difficulty":"easy|medium|hard"}

"tf" — true or false:
{"type":"tf","statement":"A clear statement","correct":true,"explanation":"Why it's true/false. 1 sentence."}

"fill" — fill in the blank (ONE word or short phrase):
{"type":"fill","sentence":"The ___ is the powerhouse of the cell.","answer":"mitochondria","accept":["mitochondria","mitochondrion"],"explanation":"Brief explanation."}

"worked_example" — step-by-step solution:
{"type":"worked_example","title":"Example: ...","steps":[{"label":"Step 1","content":"What to do"}],"challenge":"A similar problem for the student to try"}

"checkpoint" — 3 rapid-fire questions:
{"type":"checkpoint","questions":[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."},{"question":"...","options":["A","B","C","D"],"correct":2,"explanation":"..."},{"question":"...","options":["A","B","C","D"],"correct":1,"explanation":"..."}]}

OUTPUT FORMAT: {"title":"Lesson title","estimatedMinutes":10,"steps":[...]}`;

        // Two completely different lesson shapes depending on whether the student
        // is seeing this topic for the first time (learn) or revisiting it (review/practice).
        const system = (mode === "learn") ? `You are an expert teacher building ONE clear first-lesson — the student is encountering this topic for the first time. Priority is understanding, not speed. Anything known about the student appears above; use it.${DIFF_NOTE}

OUTPUT ONLY valid JSON — no markdown, no fences, no text before or after. Start with { end with }.

${VOICE}

STRUCTURE — 8-12 steps, always concept-first:
1. Step 1 is ALWAYS a "teach" step. Open with the clearest, most concrete explanation of the first concept — an analogy, a real-world anchor, not a definition dump.
2. Every "teach" is immediately followed by ONE quiz (mcq, tf, or fill) that tests exactly what was just taught — nothing the student hasn't seen yet.
3. Pattern: teach → quiz → teach → quiz → (worked_example →) teach → quiz → checkpoint.
4. 2-3 core concepts total. Each gets its own teach + quiz pair.
5. End with a "checkpoint" of exactly 3 questions covering all concepts taught.

RULES:
- Step 1 MUST be "teach" — NEVER mcq or tf as the first step.
- Never two "teach" steps in a row. Every teach is followed by a quiz.
- Quiz questions test ONLY what was explicitly taught earlier in this lesson.
- Difficulty rises gradually — first quiz is easy, last quiz before checkpoint is hard.
- Total steps: 8-12 (checkpoint counts as 1 step).

${STEP_TYPES}` : (mode === "practice") ? `You are a tough exam examiner. Build a PRACTICE TEST — rapid-fire exam-style questions, no teaching. The student already knows this material; make them prove it. Anything known about the student appears above; target their weak spots.${DIFF_NOTE}

OUTPUT ONLY valid JSON — no markdown, no fences, no text before or after. Start with { end with }.

${VOICE}

STRUCTURE — 8-10 steps, all questions:
1. Open with a medium-difficulty mcq or tf question. No warmup.
2. Mix mcq, tf, AND fill throughout. Never the same type twice in a row.
3. No "teach" steps — ONLY quiz questions and one final "checkpoint".
4. Questions span the full topic: definitions, applications, tricky edge cases.
5. End with a "checkpoint" of exactly 3 hard exam-style questions.

RULES:
- Step 1 MUST be mcq or tf — never a teach.
- Zero "teach" steps allowed anywhere in the lesson.
- Difficulty is medium-to-hard throughout. No softballs.
- Total steps: 8-10.

${STEP_TYPES}` : `You are an AI tutor running a SPACED REPETITION session — the student has seen this before, this is retrieval practice. Make them recall, not re-read. Anything known about the student appears above; reference their past mistakes naturally.${DIFF_NOTE}

OUTPUT ONLY valid JSON — no markdown, no fences, no text before or after. Start with { end with }.

${VOICE}

STRUCTURE — 8-10 steps, quiz-heavy:
1. COLD OPEN FIRST. Step 1 is an "mcq" or "tf" that tests recall immediately — a surprising question, a trap, a "what's the rule here?". Its "explanation" should be the mini-reveal. Step 1 is NEVER a teach.
2. After each question, if the answer exposed a gap, add ONE short "teach" to re-explain just that point (1-2 sentences, not a re-teach from scratch). Otherwise go straight to the next question.
3. Mix mcq, tf, AND fill. Never the same type twice in a row.
4. At least 5 quiz questions before the checkpoint.
5. End with a "checkpoint" of exactly 3 questions.

RULES:
- Step 1 MUST be mcq or tf — NEVER a teach.
- "teach" steps here are SHORT reminders (1-2 sentences) — not full explanations.
- Difficulty starts medium and rises to hard.
- Total steps: 8-10.

${STEP_TYPES}`;

        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Taking too long — please try again.")), 45000));
        const raw = await Promise.race([
          complete({ system, messages: [{ role: "user", content: `Generate a structured lesson on: ${topic}` }], topicContext }),
          timeout,
        ]);

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
  }, [topic, retryCount]);

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
      setStep(step + 1);
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
    if (resolved && window.recordReview) window.recordReview({ examId: resolved.examId, topicIdx: resolved.topicIdx, topicName: resolved.topicName, correct: isCorrect });
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
    if (resolved && window.recordReview) window.recordReview({ examId: resolved.examId, topicIdx: resolved.topicIdx, topicName: resolved.topicName, correct: isCorrect });
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
    if (resolved && window.recordReview) window.recordReview({ examId: resolved.examId, topicIdx: resolved.topicIdx, topicName: resolved.topicName, correct: isCorrect });
  };

  const commitResults = () => {
    const correct = results.filter((r) => r.correct).length;
    const total = results.length;
    if (resolved) {
      if (window.markTopicsStudied) window.markTopicsStudied(resolved.examId, [resolved.topicIdx], [resolved.topicName]);
      if (window.recordConfidence) {
        // 0..1 confidence derived from accuracy — recordConfidence accepts a
        // 0..1 value directly, so no 1..4 rating remap needed.
        const conf = total === 0 ? 0.5 : correct / total >= 0.8 ? 1 : correct / total >= 0.5 ? 0.6 : 0.2;
        window.recordConfidence({ examId: resolved.examId, topicIdx: resolved.topicIdx, topicName: resolved.topicName, rating: conf });
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
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", gap: 16, padding: "0 24px" } },
      React.createElement("span", { style: { fontSize: 40 } }, "⚠️"),
      React.createElement("p", { style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)", margin: 0 } }, "Couldn't generate lesson"),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", margin: 0, textAlign: "center" } }, error),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 } },
        _btn("↺ Try again", () => setRetryCount((n) => n + 1), true, false),
        _btn("← Back", onExit, false, false)));
  }

  // ─── Celebration Screen ────────────────────────────────────────────────────
  if (done) {
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    const finalXp = xp + 100; // completion bonus
    const totalXpAfter = (window.getXp ? window.getXp() : 0) + finalXp;
    const xpLevelAfter = window.xpLevel ? window.xpLevel(totalXpAfter) : null;
    const xpPctAfter = xpLevelAfter ? Math.round((xpLevelAfter.into / xpLevelAfter.need) * 100) : 0;
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
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" } }, `${correctCount} of ${totalAnswered} questions correct`),
      xpLevelAfter && React.createElement("div", { style: { width: "100%", maxWidth: 360, marginBottom: 16, background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "14px 16px" } },
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } },
          React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "var(--indigo-600)" } }, `⭐ Level ${xpLevelAfter.level}`),
          React.createElement("span", { style: { fontSize: 11, color: "var(--text-muted)" } }, `${xpLevelAfter.into} / ${xpLevelAfter.need} XP`)),
        React.createElement("div", { style: { height: 8, background: "var(--border-subtle)", borderRadius: 4, overflow: "hidden" } },
          React.createElement("div", { style: { height: "100%", width: `${xpPctAfter}%`, background: "linear-gradient(90deg,#6366f1,#7c3aed)", borderRadius: 4 } }))),
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

  const renderMcq = (question, options, correct, explanation, diff, isHook) => React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
    isHook && React.createElement("div", { style: { marginBottom: 12, padding: "10px 16px", background: "linear-gradient(135deg,#fef3c7,#fde68a)", border: "1px solid #f59e0b", borderRadius: 12, fontSize: 13, color: "#92400e", fontWeight: 600 } },
      "🔥 Before we explain anything — take a guess:"),
    React.createElement("div", { style: { background: "var(--surface-card)", border: isHook ? "2px solid #f59e0b" : "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 } },
      React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 14 } },
        isHook
          ? _badge("linear-gradient(135deg,#f59e0b,#d97706)", "white", "🔥 HOOK QUESTION")
          : _badge("linear-gradient(135deg,#6366f1,#4f46e5)", "white", "⚡ QUESTION"),
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

  const renderTf = (isHook) => React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
    isHook && React.createElement("div", { style: { marginBottom: 12, padding: "10px 16px", background: "linear-gradient(135deg,#fef3c7,#fde68a)", border: "1px solid #f59e0b", borderRadius: 12, fontSize: 13, color: "#92400e", fontWeight: 600 } },
      "🔥 Before we explain anything — take a guess:"),
    React.createElement("div", { style: { background: "var(--surface-card)", border: isHook ? "2px solid #f59e0b" : "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 } },
      React.createElement("div", { style: { marginBottom: 14 } }, isHook ? _badge("linear-gradient(135deg,#f59e0b,#d97706)", "white", "🔥 HOOK QUESTION") : _badge("#f5f3ff", "#7c3aed", "✋ TRUE OR FALSE")),
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
      React.createElement("p", { style: { fontWeight: 600, fontSize: 16, margin: "0 0 20px", color: "var(--text-strong)", lineHeight: 1.5 }, dangerouslySetInnerHTML: { __html: _md(s.sentence).replace("___", "<u style='border-bottom:2px dashed #6366f1;padding:0 8px;color:#6366f1'>___</u>") } }),
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

  // ─── Render current step ───────────────────────────────────────────────────
  const renderStep = () => {
    if (!s) return null;
    switch (s.type) {
      case "teach": return renderTeach();
      case "mcq": return renderMcq(s.question, s.options, s.correct, s.explanation, s.difficulty, step === 0);
      case "tf": return renderTf(step === 0);
      case "fill": return renderFill();
      case "worked_example": return renderWorkedExample();
      case "checkpoint": return React.createElement(LessonCheckpoint, {
        step: s,
        resolved,
        onResult: (correct) => setResults((r) => [...r, { type: "checkpoint", correct }]),
        onXp: (amount) => setXp((x) => x + amount),
        onAdvance: advance,
      });
      default: return React.createElement("p", null, `Unknown step: ${s.type}`);
    }
  };

  // ─── Progress header ──────────────────────────────────────────────────────
  const pct = Math.round(((step + 1) / totalSteps) * 100);
  const estMinsLeft = plan.estimatedMinutes ? Math.max(1, Math.round(plan.estimatedMinutes * (1 - step / totalSteps))) : null;

  // ─── Difficulty panel ──────────────────────────────────────────────────────
  const topicKey = `${topic}::${resolved?.examId || "any"}`;
  const currentVote = getDiffVote(topicKey);
  const DIFF_OPTIONS = [
    { v: -2, emoji: "😵", label: "Way too hard" },
    { v: -1, emoji: "😬", label: "A bit hard" },
    { v:  0, emoji: "👍", label: "Just right" },
    { v:  1, emoji: "😌", label: "A bit easy" },
    { v:  2, emoji: "🥱", label: "Way too easy" },
  ];

  const renderDiffButton = () => React.createElement("div", { style: { position: "relative", display: "inline-block" } },
    // Floating chip
    React.createElement("button", {
      onClick: () => setShowDiffPanel((v) => !v),
      title: "Rate difficulty",
      style: {
        display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
        background: diffVoted ? "#f0fdf4" : "var(--surface-card)",
        border: `1px solid ${diffVoted ? "#86efac" : "var(--border-default)"}`,
        borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
        color: diffVoted ? "#15803d" : "var(--text-muted)", fontFamily: "var(--font-sans)",
        transition: "all 0.15s",
      }
    },
      React.createElement("span", null, diffVoted ? "✓ Rated" : "🎚️ Difficulty")),

    // Dropdown panel (opens upward)
    showDiffPanel && React.createElement("div", {
      style: {
        position: "absolute", bottom: "calc(100% + 8px)", right: 0,
        background: "var(--surface-card)", border: "1px solid var(--border-default)",
        borderRadius: 14, padding: "8px 6px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        display: "flex", flexDirection: "column", gap: 2, minWidth: 170, zIndex: 50,
        animation: "fadeUp 0.15s ease-out",
      }
    },
      React.createElement("p", { style: { fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", margin: "2px 8px 6px" } }, "How difficult was this?"),
      ...DIFF_OPTIONS.map(({ v, emoji, label }) =>
        React.createElement("button", {
          key: v,
          onClick: () => {
            saveDiffVote(topicKey, v);
            setDiffVoted(true);
            setShowDiffPanel(false);
          },
          style: {
            display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
            background: currentVote === v ? "#eef2ff" : "none",
            border: "none", borderRadius: 10, fontSize: 13, cursor: "pointer",
            color: currentVote === v ? "#4f46e5" : "var(--text-body)",
            fontFamily: "var(--font-sans)", fontWeight: currentVote === v ? 600 : 400,
            textAlign: "left", width: "100%",
          }
        }, React.createElement("span", { style: { fontSize: 16 } }, emoji), label))));

  return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)" } },
    // Progress bar
    React.createElement("div", { style: { padding: "12px 20px 0" } },
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } },
        React.createElement("span", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)" } }, `Step ${step + 1} of ${totalSteps}`),
        React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center", fontSize: 12, color: "var(--text-muted)" } },
          masteryBefore != null && React.createElement("span", null, `Mastery: ${masteryNow}%`),
          totalAnswered > 0 && React.createElement("span", null, `${correctCount}/${totalAnswered} ✓`),
          estMinsLeft && React.createElement("span", null, `~${estMinsLeft} min left`),
          renderDiffButton()),
      ),
      React.createElement("div", { style: { height: 4, background: "var(--surface-muted)", borderRadius: 2, overflow: "hidden" } },
        React.createElement("div", { style: { height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#6366f1,#7c3aed)", borderRadius: 2, transition: "width 0.4s ease" } })),
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginTop: 4 } },
        React.createElement("span", { style: { fontSize: 11, color: "var(--text-faint)" } }, plan.title),
        React.createElement("button", { onClick: () => { commitResults(); onExit(); }, style: { fontSize: 11, color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", textDecoration: "underline" } }, "Exit lesson"))),

    // Step content — clicking outside diff panel closes it
    React.createElement("div", {
      style: { flex: 1, overflowY: "auto", padding: "20px 20px 20px" },
      onClick: () => { if (showDiffPanel) setShowDiffPanel(false); }
    }, renderStep()));
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
  const [reviewTopic, setReviewTopic] = React.useState(null);

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

  const exitToLobby = () => { setMode(null); setTopic(null); setTopicPicker(false); setReviewTopic(null); };
  // Finishing one review returns to the QUEUE (not the lobby) so "clear the
  // stack" is one continuous flow — the queue re-derives from the brain, so
  // the topic just reviewed drops out or shows its new retention.
  const exitToQueue = () => setReviewTopic(null);

  // Active mode screens
  if (mode === "learn" && topic) return React.createElement(LearnEngine, { topic, onExit: exitToLobby });
  if (mode === "chat") return React.createElement(ChatMode, { onExit: exitToLobby, initialQuery });

  // Review mode — a session launched from the queue below
  if (mode === "review" && reviewTopic) {
    return React.createElement(LessonEngine, { topic: reviewTopic, mode: "review", onExit: exitToQueue });
  }

  // ─── REVIEW QUEUE ──────────────────────────────────────────────────────────
  // The real spaced-repetition surface: every topic the forgetting curve says
  // is fading, weakest first. Read fresh (not from the mount-time memo) so the
  // queue updates the moment a finished review writes back to the brain.
  if (mode === "review") {
    const freshBrain = window.getBrain ? window.getBrain() : {};
    const queue = freshBrain.dueReviews || [];
    const weakFallback = (freshBrain.weakestTopics || []).filter((t) => t.lastSeen).slice(0, 4);
    const daysAgo = (iso) => {
      if (!iso) return null;
      const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
      return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
    };
    const retColor = (r) => r < 0.3 ? { fg: "#b91c1c", bg: "#fef2f2", bar: "#ef4444" } : r < 0.5 ? { fg: "#b45309", bg: "#fffbeb", bar: "#f59e0b" } : { fg: "#a16207", bg: "#fefce8", bar: "#eab308" };
    const rowFor = (tp, i) => {
      const c = retColor(tp.retention);
      const pct = Math.round(tp.retention * 100);
      return React.createElement("button", {
        key: tp.key || i, onClick: () => setReviewTopic(tp.topicName),
        style: { display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--surface-card)", border: "1.5px solid var(--border-default)", borderRadius: 14, cursor: "pointer", fontFamily: "var(--font-sans)", width: "100%", textAlign: "left" }
      },
        React.createElement("div", { style: { width: 44, flexShrink: 0, textAlign: "center" } },
          React.createElement("p", { style: { margin: 0, fontSize: 16, fontWeight: 700, color: c.fg } }, `${pct}%`),
          React.createElement("div", { style: { height: 4, background: "var(--border-subtle)", borderRadius: 2, overflow: "hidden", marginTop: 3 } },
            React.createElement("div", { style: { height: "100%", width: `${pct}%`, background: c.bar } }))),
        React.createElement("div", { style: { flex: 1, minWidth: 0 } },
          React.createElement("p", { style: { margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, tp.topicName),
          React.createElement("p", { style: { margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" } },
            `${tp.examName}${tp.lastSeen ? ` · last seen ${daysAgo(tp.lastSeen)}` : ""}`)),
        React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: "var(--indigo-600)", flexShrink: 0 } }, "Review →"));
    };

    return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)", padding: "24px 20px", overflowY: "auto" } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 } },
        React.createElement("button", { onClick: exitToLobby, style: { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted)", padding: 0 } }, "←"),
        React.createElement("h2", { style: { margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-strong)" } }, "⚡ Review queue")),
      React.createElement("p", { style: { margin: "0 0 18px 28px", fontSize: 13, color: "var(--text-muted)" } },
        queue.length > 0
          ? `${queue.length} ${queue.length === 1 ? "topic is" : "topics are"} fading — weakest first. Clear the stack!`
          : "Nothing is due right now."),

      queue.length > 0 && React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
        ...queue.map(rowFor)),

      queue.length === 0 && React.createElement("div", { style: { textAlign: "center", padding: "32px 0" } },
        React.createElement("span", { style: { fontSize: 44 } }, "🌱"),
        React.createElement("p", { style: { margin: "12px 0 4px", fontSize: 16, fontWeight: 700, color: "var(--text-strong)" } }, "All memories fresh!"),
        React.createElement("p", { style: { margin: "0 0 20px", fontSize: 13, color: "var(--text-muted)" } }, "Come back later — or sharpen your weakest topics now.")),
      queue.length === 0 && weakFallback.length > 0 && React.createElement("div", null,
        React.createElement("p", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" } }, "Weakest topics"),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
          ...weakFallback.map(rowFor))));
  }

  // Practice mode — exam simulation, pure questions, no teaching
  if (mode === "practice") {
    const practiceTopic = examViews.length > 0 ? examViews[0].name : "General exam practice";
    return React.createElement(LessonEngine, { topic: practiceTopic, mode: "practice", onExit: exitToLobby });
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
  const xpData = window.xpLevel ? window.xpLevel() : null;
  const xpPct = xpData ? Math.round((xpData.into / xpData.need) * 100) : 0;

  return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)" } },
    // Hero
    React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "36px 20px 20px" } },
      React.createElement(CoachIcon, { size: 56 }),
      React.createElement("h1", { style: { margin: "16px 0 4px", fontSize: 22, fontWeight: 700, color: "var(--text-strong)" } }, `${greeting} What do you want to do?`),
      React.createElement("p", { style: { margin: 0, fontSize: 14, color: "var(--text-muted)" } }, "Your AI Coach is ready."),
      xpData && React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, margin: "14px auto 0", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: "10px 16px", maxWidth: 240 } },
        React.createElement("span", { style: { fontSize: 11, fontWeight: 700, color: "var(--indigo-600)", background: "var(--indigo-50)", padding: "4px 8px", borderRadius: 8, letterSpacing: "0.04em", whiteSpace: "nowrap" } }, `LV ${xpData.level}`),
        React.createElement("div", { style: { flex: 1 } },
          React.createElement("div", { style: { height: 6, background: "var(--border-subtle)", borderRadius: 3, overflow: "hidden" } },
            React.createElement("div", { style: { height: "100%", width: `${xpPct}%`, background: "linear-gradient(90deg,#6366f1,#7c3aed)", borderRadius: 3 } })),
          React.createElement("p", { style: { fontSize: 10, color: "var(--text-muted)", margin: "3px 0 0", textAlign: "right" } }, `${xpData.into}/${xpData.need} XP`)))),

    // Urgent review nudge
    urgentReview && React.createElement("div", {
      onClick: () => { setReviewTopic(urgentReview.topicName); setMode("review"); },
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

Object.assign(window, { AIChat, CoachIcon, LearnEngine });
