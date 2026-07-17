// AI Exam Coach — AI Coach v6: Lesson Engine
//
// The AI generates a structured lesson plan upfront. The UI renders each step
// as its own full-screen phase — not chat bubbles. Progress is always visible.
// Brain write-back happens after every quiz interaction. Celebration at the end.

const COACH_MODES = [
  { id: "learn", emoji: "🧠", label: "Learn", desc: "Structured lesson" },
  { id: "review", emoji: "⚡", label: "Quick Check", desc: "5 questions · 2 min" },
  { id: "practice", emoji: "🎯", label: "Practice", desc: "Exam questions" },
  { id: "speed", emoji: "🏎️", label: "Speed Round", desc: "20 Qs × 30 sec" },
  { id: "exam_sim", emoji: "📝", label: "Exam Simulation", desc: "Full mock exam · timed" },
  { id: "chat", emoji: "💬", label: "Chat", desc: "Ask anything" },
];

// ChatMode's Quick Actions — query(topicName) is filled in only after the
// student has actually picked an exam+topic via the picker flow (see
// startPicker in ChatMode), never guessed.
const QUICK_ACTIONS = [
  { id: "explain", text: "Explain a topic", icon: "📖", query: (topicName) => `Explain ${topicName}` },
  { id: "quiz", text: "Generate quiz", icon: "📝", query: (topicName) => `Quiz me on ${topicName}` },
  { id: "notes", text: "Summarize notes", icon: "📄", query: (topicName) => `Summarize my notes on ${topicName}` },
  { id: "solve", text: "Solve a problem", icon: "🧮", query: (topicName) => `Give me a problem to solve in ${topicName} and walk me through it` },
  { id: "test", text: "Test my knowledge", icon: "🎯", query: (topicName) => `Test my knowledge on ${topicName}` },
  { id: "flashcards", text: "Make flashcards", icon: "🗂", query: (topicName) => `Create flashcards for ${topicName}` },
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
  let t = text
    .replace(/<br\s*\/?>/gi, "\n");
  t = t
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+?)\*/g, "<em>$1</em>")
    .replace(/`([^`\n]+?)`/g, "<code style='background:#f1f5f9;padding:2px 5px;border-radius:4px;font-size:0.92em'>$1</code>")
    .replace(/\n/g, "<br/>");
  return t;
};

const _isMath = (text) => /[=°²³√×÷±∑∫πΔ∞≠≤≥∈∩∪]/.test(text) || /\d\s*[\+\-\*\/]\s*\d/.test(text);

const _sfx = (() => {
  const ctx = () => { try { return new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } };
  let _ctx = null;
  const getCtx = () => { if (!_ctx) _ctx = ctx(); return _ctx; };
  return {
    correct() {
      const c = getCtx(); if (!c) return;
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = "sine"; o.frequency.setValueAtTime(523, c.currentTime);
      o.frequency.setValueAtTime(659, c.currentTime + 0.08);
      o.frequency.setValueAtTime(784, c.currentTime + 0.16);
      g.gain.setValueAtTime(0.12, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
      o.start(c.currentTime); o.stop(c.currentTime + 0.35);
    },
    wrong() {
      const c = getCtx(); if (!c) return;
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = "sine"; o.frequency.setValueAtTime(330, c.currentTime);
      o.frequency.setValueAtTime(277, c.currentTime + 0.12);
      g.gain.setValueAtTime(0.1, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
      o.start(c.currentTime); o.stop(c.currentTime + 0.25);
    },
    complete() {
      const c = getCtx(); if (!c) return;
      [523, 659, 784, 1047].forEach((freq, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.connect(g); g.connect(c.destination);
        o.type = "sine"; o.frequency.value = freq;
        g.gain.setValueAtTime(0.1, c.currentTime + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.12 + 0.3);
        o.start(c.currentTime + i * 0.12); o.stop(c.currentTime + i * 0.12 + 0.3);
      });
    },
  };
})();

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
      React.createElement("div", { style: { background: "linear-gradient(135deg, #f0fdf4 0%, var(--surface-card) 100%)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24, borderLeft: "var(--border-accent-width) solid #22c55e", textAlign: "center" } },
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
        ...[0, 1, 2].map((d) => React.createElement("span", { key: d, style: { width: 8, height: 8, borderRadius: "50%", background: "#6366f1", animation: "loadDot 1.2s ease-in-out infinite", animationDelay: d * 0.2 + "s" } }))));
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
      React.createElement("div", { style: { height: "100%", width: "100%", transform: `scaleX(${progressPct / 100})`, transformOrigin: "left", background: "linear-gradient(90deg,#6366f1,#7c3aed)", borderRadius: 2, transition: "transform 0.4s ease" } })),
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

// ─── FLASHCARD ENGINE (Review mode) ──────────────────────────────────────────

function QuickCheckEngine({ topic, onExit }) {
  const [questions, setQuestions] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [idx, setIdx] = React.useState(0);
  const [selected, setSelected] = React.useState(null);
  const [revealed, setRevealed] = React.useState(false);
  const [fillInput, setFillInput] = React.useState("");
  const [results, setResults] = React.useState([]);
  const [done, setDone] = React.useState(false);
  const [levelUp, setLevelUp] = React.useState(false);
  const startTime = React.useRef(Date.now());
  const recordedRef = React.useRef(false);

  const resolved = React.useMemo(() => window.resolveTopicForBrain ? window.resolveTopicForBrain(topic) : null, [topic]);
  // Adaptive difficulty: rises as this topic racks up perfect Quick Checks
  // (see recordQuickCheckResult in brain-store.jsx) — read once per topic so
  // it stays stable for the duration of this session.
  const difficulty = React.useMemo(() => (resolved && window.getQuickCheckDifficulty) ? window.getQuickCheckDifficulty(resolved.examId, resolved.topicIdx) : 1, [resolved]);
  const DIFFICULTY_LABELS = ["Beginner", "Standard", "Challenging", "Advanced", "Expert"];
  const DIFFICULTY_MIXES = [
    "3 easy, 2 medium — keep it approachable.",
    "1 easy, 3 medium, 1 hard. Order easy→hard.",
    "3 medium, 2 hard — this student has been acing recent checks.",
    "1 medium, 4 hard — push them, they've mastered the basics.",
    "5 hard, exam-level questions — no easy warm-ups, this student is highly proficient.",
  ];

  React.useEffect(() => {
    setLoading(true); setError(null); setQuestions(null); setIdx(0); setSelected(null); setRevealed(false); setResults([]); setDone(false); setFillInput(""); setLevelUp(false);
    recordedRef.current = false;
    startTime.current = Date.now();
    (async () => {
      try {
        const complete = window.brainComplete || ((a) => window.claude.complete(a));
        const topicContext = resolved ? { examId: resolved.examId, topicName: resolved.topicName } : undefined;
        const system = `You are building a QUICK CHECK — 5 rapid retrieval questions for a student who has studied this topic before. This is NOT a flashcard deck. Each question has ONE correct answer and immediate feedback.

OUTPUT ONLY valid JSON — no markdown, no fences. Start with { end with }.

QUESTION TYPES — mix at least 2 types:
"mcq": {"type":"mcq","question":"...","options":["A","B","C","D"],"correct":0,"explanation":"1 sentence why this is right.","topic":"subtopic name"}
"fill": {"type":"fill","question":"Complete: The ___ is...","answer":"mitochondria","accept":["mitochondria","mitochondrion"],"explanation":"1 sentence.","topic":"subtopic name"}

FORMAT: {"questions":[...5 items...],"sessionTitle":"Short title for this check"}

RULES:
- Exactly 5 questions. Mix MCQ and fill-in-blank (at least 1 fill).
- Questions test RECALL of key facts, formulas, definitions — not obscure trivia.
- Difficulty: ${DIFFICULTY_MIXES[difficulty - 1]}
- Explanations are 1 sentence max — concise, helpful if wrong.
- Each question covers a DIFFERENT subtopic/concept.
- "topic" field = the specific concept being tested (e.g. "Pythagorean theorem" not "Geometry").`;

        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("Took too long — try again.")), 40000));
        const raw = await Promise.race([
          complete({ system, messages: [{ role: "user", content: `Generate a Quick Check on: ${topic}` }], topicContext }),
          timeout,
        ]);
        const parsed = window.parseJSON ? window.parseJSON(raw) : JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
        if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) throw new Error("Invalid questions");
        setQuestions(parsed);
        setLoading(false);
      } catch (e) {
        console.error("Quick Check generation failed:", e);
        setError(e.message || "Failed to generate questions");
        setLoading(false);
      }
    })();
  }, [topic]);

  const answerMcq = (optIdx) => {
    if (selected !== null) return;
    const q = questions.questions[idx];
    const isCorrect = optIdx === q.correct;
    setSelected(optIdx);
    setRevealed(true);
    setResults((r) => [...r, { correct: isCorrect, topic: q.topic || topic }]);
    isCorrect ? _sfx.correct() : _sfx.wrong();
    if (resolved && window.recordReview) window.recordReview({ examId: resolved.examId, topicIdx: resolved.topicIdx, topicName: resolved.topicName, correct: isCorrect });
  };

  const answerFill = () => {
    const q = questions.questions[idx];
    const userAns = fillInput.trim().toLowerCase();
    const accepts = [q.answer, ...(q.accept || [])].map((a) => a.toLowerCase().trim());
    const isCorrect = accepts.some((a) => a === userAns || a.includes(userAns) || userAns.includes(a));
    setRevealed(true);
    setSelected(isCorrect ? "correct" : "wrong");
    setResults((r) => [...r, { correct: isCorrect, topic: q.topic || topic }]);
    isCorrect ? _sfx.correct() : _sfx.wrong();
    if (resolved && window.recordReview) window.recordReview({ examId: resolved.examId, topicIdx: resolved.topicIdx, topicName: resolved.topicName, correct: isCorrect });
  };

  const advance = () => {
    setSelected(null); setRevealed(false); setFillInput("");
    if (idx + 1 >= questions.questions.length) {
      setDone(true);
      _sfx.complete();
    } else {
      setIdx(idx + 1);
    }
  };

  if (loading) {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", gap: 16 } },
      React.createElement(CoachIcon, { size: 56 }),
      React.createElement("p", { style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)" } }, "Preparing Quick Check..."),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)" } }, `Topic: ${topic}`),
      React.createElement("div", { style: { display: "flex", gap: 6 } },
        ...[0, 1, 2].map((d) => React.createElement("span", { key: d, style: { width: 8, height: 8, borderRadius: "50%", background: "#6366f1", animation: "loadDot 1.2s ease-in-out infinite", animationDelay: d * 0.2 + "s" } }))));
  }

  if (error) {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", gap: 16, padding: "0 24px" } },
      React.createElement("span", { style: { fontSize: 40 } }, "⚠️"),
      React.createElement("p", { style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)", margin: 0 } }, "Couldn't generate questions"),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", margin: 0, textAlign: "center" } }, error),
      _btn("← Back", onExit, false, false));
  }

  if (done) {
    const total = results.length;
    const correct = results.filter((r) => r.correct).length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const xpEarned = correct * 20 + (pct === 100 ? 50 : 0);
    const elapsed = Math.round((Date.now() - startTime.current) / 1000);
    const wrongTopics = results.filter((r) => !r.correct).map((r) => r.topic);
    if (!recordedRef.current && total > 0) {
      recordedRef.current = true;
      if (window.addXp) window.addXp(xpEarned);
      if (resolved && window.recordQuickCheckResult) {
        const { leveledUp } = window.recordQuickCheckResult({ examId: resolved.examId, topicIdx: resolved.topicIdx, topicName: resolved.topicName, perfect: pct === 100 });
        if (leveledUp) { setLevelUp(true); _sfx.complete(); }
      }
    }

    const emoji = pct === 100 ? "🔥" : pct >= 80 ? "🧠" : pct >= 60 ? "💪" : "📖";
    const message = pct === 100 ? `${topic} locked in!` : pct >= 80 ? "Almost perfect!" : pct >= 60 ? "Good, but room to grow" : "Let's review this topic";

    return React.createElement("div", {
      style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", padding: "0 24px", animation: "fadeUp 0.5s ease-out" }
    },
      React.createElement("span", { style: { fontSize: 56, marginBottom: 8, animation: "pulse 0.6s ease-in-out" } }, emoji),
      React.createElement("h1", { style: { fontSize: 24, fontWeight: 700, color: "var(--text-strong)", margin: "0 0 4px", textAlign: "center" } },
        `${correct}/${total} ✓`),
      React.createElement("p", { style: { fontSize: 15, color: "var(--text-muted)", margin: "0 0 24px", textAlign: "center" } }, message),

      levelUp && React.createElement("div", {
        style: { width: "100%", maxWidth: 340, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", borderRadius: 14, padding: "14px 18px", marginBottom: 20, textAlign: "center", animation: "fadeUp 0.4s ease-out" }
      },
        React.createElement("p", { style: { margin: 0, fontSize: 15, fontWeight: 700, color: "white" } }, `🎉 Difficulty up — ${DIFFICULTY_LABELS[Math.min(4, difficulty)]}!`),
        React.createElement("p", { style: { margin: "3px 0 0", fontSize: 12, color: "rgba(255,255,255,0.85)" } }, `5 perfect Quick Checks in a row on ${topic}`)),

      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, width: "100%", maxWidth: 340, marginBottom: 24 } },
        ...[
          { val: `${pct}%`, label: "Score", color: pct >= 80 ? "#15803d" : pct >= 60 ? "#b45309" : "#b91c1c" },
          { val: `${elapsed}s`, label: "Time", color: "var(--indigo-600)" },
          { val: `+${xpEarned}`, label: "XP", color: "#7c3aed" },
        ].map((s, i) => React.createElement("div", { key: i, style: { textAlign: "center", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: "12px 8px" } },
          React.createElement("p", { style: { margin: 0, fontSize: 22, fontWeight: 700, color: s.color } }, s.val),
          React.createElement("p", { style: { margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" } }, s.label)))),

      wrongTopics.length > 0 && React.createElement("div", { style: { width: "100%", maxWidth: 340, background: "linear-gradient(135deg, #fffbeb, #fef3c7)", border: "1px solid #fde68a", borderRadius: 12, padding: "12px 16px", marginBottom: 16 } },
        React.createElement("p", { style: { margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.05em" } }, "Review these:"),
        ...wrongTopics.map((t, i) => React.createElement("p", { key: i, style: { margin: "3px 0", fontSize: 13, color: "#b45309" } }, `→ ${t}`))),

      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 } },
        _btn("Done →", onExit, true, false)));
  }

  // ── Question view ──
  const q = questions.questions[idx];
  const total = questions.questions.length;
  const pct = Math.round(((idx + 1) / total) * 100);

  const renderQuestion = () => {
    if (q.type === "fill") {
      return React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 } },
          React.createElement("div", { style: { marginBottom: 14 } }, _badge("#fefce8", "#92400e", "✍️ FILL IN")),
          React.createElement("p", { style: { fontWeight: 600, fontSize: 16, margin: "0 0 20px", color: "var(--text-strong)", lineHeight: 1.5 }, dangerouslySetInnerHTML: { __html: _md(q.question).replace("___", "<u style='border-bottom:2px dashed #6366f1;padding:0 8px;color:#6366f1'>___</u>") } }),
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
            style: { padding: "12px 16px", background: selected === "correct" ? "linear-gradient(135deg, #f0fdf4, #ecfdf5)" : "linear-gradient(135deg, #fffbeb, #fef3c7)", border: `1px solid ${selected === "correct" ? "#bbf7d0" : "#fde68a"}`, borderRadius: 12, fontSize: 14, color: selected === "correct" ? "#15803d" : "#92400e", lineHeight: 1.6 }
          }, selected === "correct" ? `✅ Correct! "${q.answer}"` : `💡 The answer is "${q.answer}". ${q.explanation || ""}`)));
    }

    // MCQ
    return React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
      React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 } },
        React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 14 } },
          _badge("linear-gradient(135deg,#6366f1,#4f46e5)", "white", "⚡ QUESTION"),
          q.topic && _badge("var(--surface-muted)", "var(--text-muted)", q.topic)),
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
              key: i, disabled: revealed, onClick: () => answerMcq(i),
              style: { display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: bg, border: `1.5px solid ${bc}`, borderRadius: 14, color: col, fontSize: 14, textAlign: "left", cursor: revealed ? "default" : "pointer", width: "100%", fontFamily: "var(--font-sans)", transition: "all 0.15s" }
            },
              React.createElement("span", { style: { width: 28, height: 28, borderRadius: 8, background: lbg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: lcol, flexShrink: 0 } }, ["A", "B", "C", "D"][i]),
              React.createElement("span", { style: { lineHeight: 1.45, fontWeight: 500 } }, opt));
          })),
        revealed && React.createElement("div", {
          style: { marginTop: 14, padding: "12px 16px", background: selected === q.correct ? "linear-gradient(135deg, #f0fdf4, #ecfdf5)" : "linear-gradient(135deg, #fffbeb, #fef3c7)", border: `1px solid ${selected === q.correct ? "#bbf7d0" : "#fde68a"}`, borderRadius: 12, fontSize: 14, color: selected === q.correct ? "#15803d" : "#92400e", lineHeight: 1.6 }
        }, selected === q.correct ? "✅ " : "💡 ", q.explanation)));
  };

  return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)" } },
    // Progress header
    React.createElement("div", { style: { padding: "12px 20px 0" } },
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } },
        React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } },
          React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "var(--text-strong)" } }, `${idx + 1} of ${total}`),
          difficulty > 1 && React.createElement("span", { style: { background: "#ede9fe", color: "#6d28d9", padding: "2px 8px", borderRadius: 10, fontWeight: 600, fontSize: 11 } }, DIFFICULTY_LABELS[difficulty - 1])),
        React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } },
          results.length > 0 && React.createElement("span", { style: { background: "#f0fdf4", color: "#15803d", padding: "2px 8px", borderRadius: 10, fontWeight: 600, fontSize: 11 } }, `${results.filter((r) => r.correct).length}/${results.length} ✓`),
          React.createElement("button", { onClick: () => { setDone(true); _sfx.complete(); },
            style: { fontSize: 11, color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", textDecoration: "underline" } }, "End"))),
      // Step dots
      React.createElement("div", { style: { display: "flex", gap: 4, marginBottom: 4 } },
        ...questions.questions.map((_, i) => {
          const r = results[i];
          const bg = i === idx ? "#6366f1" : r ? (r.correct ? "#22c55e" : "#ef4444") : "var(--border-subtle)";
          return React.createElement("div", { key: i, style: { flex: 1, height: 5, borderRadius: 3, background: bg, transition: "background 0.3s" } });
        })),
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginTop: 4 } },
        React.createElement("span", { style: { fontSize: 12, color: "var(--text-faint)", fontWeight: 500 } }, questions.sessionTitle || `Quick Check: ${topic}`),
        React.createElement("button", { onClick: onExit, style: { fontSize: 11, color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", textDecoration: "underline" } }, "Exit"))),

    // Question content
    React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "20px 20px 80px" } }, renderQuestion()),

    // Continue button at bottom
    revealed && React.createElement("div", { style: { padding: "12px 20px 20px" } },
      _btn(idx + 1 >= total ? "See results →" : "Next →", advance, true, false)));
}

// ─── SPEED ROUND ENGINE ─────────────────────────────────────────────────────
// Pre-session setup → 20 rapid-fire questions, 30 sec each, summary at end.

function SpeedRoundEngine({ examViews, onExit }) {
  const [phase, setPhase] = React.useState("setup"); // setup | loading | session | summary
  const [questions, setQuestions] = React.useState([]);
  const [idx, setIdx] = React.useState(0);
  const [selected, setSelected] = React.useState(null);
  const [results, setResults] = React.useState([]);
  const [timer, setTimer] = React.useState(30);
  const [error, setError] = React.useState(null);
  const [pickMode, setPickMode] = React.useState("ai"); // "ai" | "manual"
  const [chosenTopics, setChosenTopics] = React.useState([]);
  const [aiTopics, setAiTopics] = React.useState(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const timerRef = React.useRef(null);
  const summaryXpRef = React.useRef(false);
  const totalQ = 20;
  const perQ = 30;

  const allTopics = React.useMemo(() => {
    return examViews.flatMap((e) => (e.topics || []).map((tp) => ({
      name: tp.topicName || tp.name, examId: e.id, examName: e.name,
      topicIdx: tp.topicIdx, retention: tp.retention,
    })));
  }, [examViews]);

  const exams = React.useMemo(() => examViews.map((e) => ({ id: e.id, name: e.name })), [examViews]);

  // AI topic selection
  const pickAiTopics = async () => {
    if (allTopics.length === 0) return;
    setAiLoading(true);
    try {
      const weak = [...allTopics].sort((a, b) => (a.retention || 0) - (b.retention || 0)).slice(0, 12);
      const complete = window.brainComplete || ((a) => window.claude.complete(a));
      const system = `You are a study coach. Pick the 5 BEST topics for a speed round drill from this list. Prioritise topics the student is weakest at. Return ONLY a JSON array of topic names — no explanation, no markdown.\n\nTopics (name → retention%):\n${weak.map((t) => `- ${t.name} (${Math.round((t.retention || 0) * 100)}%)`).join("\n")}`;
      const raw = await complete({ system, messages: [{ role: "user", content: "Pick 5 topics for my speed round" }] });
      const parsed = window.parseJSON ? window.parseJSON(raw) : JSON.parse(raw);
      const names = Array.isArray(parsed) ? parsed : (parsed.topics || []);
      setAiTopics(names.slice(0, 5).map(String));
    } catch {
      setAiTopics(allTopics.sort((a, b) => (a.retention || 0) - (b.retention || 0)).slice(0, 5).map((t) => t.name));
    }
    setAiLoading(false);
  };

  React.useEffect(() => {
    if (phase === "setup" && pickMode === "ai" && !aiTopics && !aiLoading && allTopics.length > 0) {
      pickAiTopics();
    }
  }, [phase, pickMode]);

  // Generate questions when entering loading phase
  React.useEffect(() => {
    if (phase !== "loading") return;
    (async () => {
      try {
        const complete = window.brainComplete || ((a) => window.claude.complete(a));
        const topicList = chosenTopics.length > 0 ? chosenTopics.join(", ") : (allTopics.length > 0 ? allTopics.sort(() => Math.random() - 0.5).slice(0, 6).map((t) => t.name).join(", ") : "general knowledge");
        const system = `Generate exactly ${totalQ} rapid-fire multiple-choice questions for a SPEED ROUND exam drill. Focus on these topics: ${topicList}. Each question must be answerable in under 30 seconds — no complex calculations.

OUTPUT ONLY valid JSON — no markdown, no fences. Start with { end with }.

FORMAT: {"questions":[{"q":"Question text","options":["A","B","C","D"],"correct":0,"topic":"topic name","explanation":"One sentence why"}]}

RULES:
- 4 options each, exactly one correct, "correct" is 0-based index
- Questions should be clear and direct — no ambiguity
- Mix easy (40%), medium (40%), hard (20%)
- Spread questions across the given topics evenly`;

        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("Took too long.")), 50000));
        const raw = await Promise.race([
          complete({ system, messages: [{ role: "user", content: `Generate ${totalQ} speed round questions` }] }),
          timeout,
        ]);
        const parsed = window.parseJSON ? window.parseJSON(raw) : JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
        if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) throw new Error("Invalid questions");
        setQuestions(parsed.questions.slice(0, totalQ));
        setPhase("session");
      } catch (e) {
        setError(e.message || "Failed to generate questions");
      }
    })();
  }, [phase]);

  // Per-question countdown
  React.useEffect(() => {
    if (phase !== "session") return;
    setTimer(perQ);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          _sfx.wrong();
          setResults((r) => [...r, { qIdx: idx, correct: false, timedOut: true }]);
          if (idx + 1 >= questions.length) { _sfx.complete(); setPhase("summary"); }
          else { setIdx((i) => i + 1); setSelected(null); }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, idx, questions.length]);

  const answer = (optIdx) => {
    if (selected !== null) return;
    clearInterval(timerRef.current);
    const q = questions[idx];
    const isCorrect = optIdx === q.correct;
    isCorrect ? _sfx.correct() : _sfx.wrong();
    setSelected(optIdx);
    setResults((r) => [...r, { qIdx: idx, correct: isCorrect, chosen: optIdx, time: perQ - timer }]);
    const match = allTopics.find((t) => t.name.toLowerCase().includes((q.topic || "").toLowerCase()));
    if (match && window.recordReview) {
      window.recordReview({ examId: match.examId, topicIdx: match.topicIdx, topicName: match.name, correct: isCorrect, quality: isCorrect ? 0.7 : 0.1 });
    }
    setTimeout(() => {
      if (idx + 1 >= questions.length) { _sfx.complete(); setPhase("summary"); }
      else { setIdx((i) => i + 1); setSelected(null); }
    }, 400);
  };

  const toggleManualTopic = (name) => {
    setChosenTopics((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : prev.length < 8 ? [...prev, name] : prev);
  };

  const startRound = () => {
    const topics = pickMode === "ai" ? (aiTopics || []) : chosenTopics;
    setChosenTopics(topics);
    setPhase("loading");
  };

  // ── Setup screen ──
  if (phase === "setup") {
    const activeTopics = pickMode === "ai" ? (aiTopics || []) : chosenTopics;
    const canStart = pickMode === "ai" ? (aiTopics && aiTopics.length > 0) : chosenTopics.length >= 2;
    const groupedByExam = {};
    allTopics.forEach((t) => { (groupedByExam[t.examName] = groupedByExam[t.examName] || []).push(t); });

    return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)", padding: "24px 20px", overflowY: "auto" } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 } },
        React.createElement("button", { onClick: onExit, style: { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted)", padding: 0 } }, "←"),
        React.createElement("h2", { style: { margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-strong)" } }, "🏎️ Speed Round")),
      React.createElement("p", { style: { margin: "0 0 20px 28px", fontSize: 13, color: "var(--text-muted)" } }, `${totalQ} questions · ${perQ}s each · exam warmup`),

      // Mode toggle
      React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 20 } },
        ...[["ai", "🤖 AI picks"], ["manual", "✋ I'll choose"]].map(([key, label]) =>
          React.createElement("button", {
            key, onClick: () => setPickMode(key),
            style: { flex: 1, padding: "12px", borderRadius: 12, border: `1.5px solid ${pickMode === key ? "var(--indigo-500)" : "var(--border-default)"}`, background: pickMode === key ? "var(--indigo-50)" : "var(--surface-card)", fontSize: 14, fontWeight: 600, color: pickMode === key ? "var(--indigo-700)" : "var(--text-body)", cursor: "pointer", fontFamily: "var(--font-sans)" }
          }, label))),

      // AI picks view
      pickMode === "ai" && React.createElement("div", { style: { marginBottom: 20 } },
        aiLoading && React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "16px", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14 } },
          React.createElement("div", { style: { display: "flex", gap: 4 } },
            ...[0, 1, 2].map((d) => React.createElement("span", { key: d, style: { width: 6, height: 6, borderRadius: "50%", background: "#6366f1", animation: "loadDot 1.2s ease-in-out infinite", animationDelay: d * 0.15 + "s" } }))),
          React.createElement("span", { style: { fontSize: 13, color: "var(--text-muted)" } }, "AI is picking your weakest topics...")),
        !aiLoading && aiTopics && React.createElement("div", null,
          React.createElement("p", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" } }, "AI selected these topics for you"),
          React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 } },
            ...aiTopics.map((name, i) => React.createElement("span", {
              key: i,
              style: { padding: "8px 14px", background: "linear-gradient(135deg,#eef2ff,#e0e7ff)", border: "1.5px solid var(--indigo-500)", borderRadius: 20, fontSize: 13, fontWeight: 600, color: "var(--indigo-700)" }
            }, name))),
          React.createElement("button", {
            onClick: () => { setAiTopics(null); pickAiTopics(); },
            style: { marginTop: 12, background: "none", border: "none", fontSize: 12, color: "var(--indigo-600)", cursor: "pointer", fontFamily: "var(--font-sans)", fontWeight: 600, padding: 0 }
          }, "🔄 Reshuffle"))),

      // Manual picks view
      pickMode === "manual" && React.createElement("div", { style: { marginBottom: 20 } },
        React.createElement("p", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" } }, `Pick 2-8 topics (${chosenTopics.length} selected)`),
        ...Object.entries(groupedByExam).map(([examName, topics]) =>
          React.createElement("div", { key: examName, style: { marginBottom: 12 } },
            React.createElement("p", { style: { fontSize: 12, fontWeight: 700, color: "var(--text-strong)", margin: "0 0 6px" } }, examName),
            React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 } },
              ...topics.map((tp, i) => {
                const on = chosenTopics.includes(tp.name);
                return React.createElement("button", {
                  key: i, onClick: () => toggleManualTopic(tp.name),
                  style: { padding: "7px 12px", borderRadius: 20, border: `1.5px solid ${on ? "var(--indigo-500)" : "var(--border-default)"}`, background: on ? "var(--indigo-50)" : "var(--surface-card)", fontSize: 12, fontWeight: on ? 600 : 400, color: on ? "var(--indigo-700)" : "var(--text-body)", cursor: "pointer", fontFamily: "var(--font-sans)" }
                }, tp.name);
              }))))),

      // Selected topics preview
      activeTopics.length > 0 && React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "16px", marginBottom: 20 } },
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } },
          React.createElement("span", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" } }, "Your drill"),
          React.createElement("span", { style: { fontSize: 11, color: "var(--text-muted)" } }, `~${Math.ceil(totalQ * perQ / 60)} min`)),
        React.createElement("div", { style: { display: "flex", gap: 20 } },
          React.createElement("div", null,
            React.createElement("p", { style: { fontSize: 22, fontWeight: 700, color: "var(--text-strong)", margin: 0 } }, totalQ),
            React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: 0 } }, "questions")),
          React.createElement("div", null,
            React.createElement("p", { style: { fontSize: 22, fontWeight: 700, color: "var(--text-strong)", margin: 0 } }, `${perQ}s`),
            React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: 0 } }, "per question")),
          React.createElement("div", null,
            React.createElement("p", { style: { fontSize: 22, fontWeight: 700, color: "var(--text-strong)", margin: 0 } }, activeTopics.length),
            React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: 0 } }, "topics")))),

      // Start button
      React.createElement("button", {
        onClick: startRound, disabled: !canStart,
        style: { width: "100%", padding: "16px", borderRadius: 14, border: "none", background: canStart ? "linear-gradient(135deg,#6366f1,#7c3aed)" : "#c7d2fe", color: "white", fontSize: 16, fontWeight: 700, cursor: canStart ? "pointer" : "default", fontFamily: "var(--font-sans)", marginTop: "auto" }
      }, "Start Speed Round →"));
  }

  // ── Loading ──
  if (phase === "loading" && !error) {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", gap: 16 } },
      React.createElement(CoachIcon, { size: 56 }),
      React.createElement("p", { style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)" } }, "Preparing Speed Round..."),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)" } }, `${totalQ} questions × ${perQ} seconds each`),
      chosenTopics.length > 0 && React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", maxWidth: 340 } },
        ...chosenTopics.map((n, i) => React.createElement("span", { key: i, style: { padding: "4px 10px", background: "var(--indigo-50)", borderRadius: 12, fontSize: 11, color: "var(--indigo-700)", fontWeight: 600 } }, n))),
      React.createElement("div", { style: { display: "flex", gap: 6 } },
        ...[0, 1, 2].map((d) => React.createElement("span", { key: d, style: { width: 8, height: 8, borderRadius: "50%", background: "#6366f1", animation: "loadDot 1.2s ease-in-out infinite", animationDelay: d * 0.2 + "s" } }))));
  }

  if (error) {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", gap: 16, padding: "0 24px" } },
      React.createElement("span", { style: { fontSize: 40 } }, "⚠️"),
      React.createElement("p", { style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)" } }, "Couldn't generate questions"),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", textAlign: "center" } }, error),
      _btn("← Back", onExit, false, false));
  }

  // ── Summary ──
  if (phase === "summary") {
    const correct = results.filter((r) => r.correct).length;
    const timedOut = results.filter((r) => r.timedOut).length;
    const avgTime = results.length > 0 ? (results.filter((r) => !r.timedOut).reduce((a, r) => a + (r.time || 0), 0) / Math.max(1, results.filter((r) => !r.timedOut).length)).toFixed(1) : 0;
    const accuracy = results.length > 0 ? Math.round((correct / results.length) * 100) : 0;
    const earnedXp = correct * 10 + (accuracy >= 80 ? 50 : accuracy >= 60 ? 25 : 0);
    if (!summaryXpRef.current) { summaryXpRef.current = true; if (window.addXp) window.addXp(earnedXp); }

    // Post-session insight: find topics missed 2+ times
    const topicErrors = {};
    results.forEach((r) => {
      if (!r.correct) { const q = questions[r.qIdx]; if (q && q.topic) topicErrors[q.topic] = (topicErrors[q.topic] || 0) + 1; }
    });
    const repeatedMiss = Object.entries(topicErrors).filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]);

    return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", gap: 0, padding: "0 20px", animation: "fadeUp 0.5s ease-out" } },
      React.createElement("div", { style: { fontSize: 56, marginBottom: 8 } }, accuracy >= 80 ? "🏆" : accuracy >= 60 ? "⚡" : "💪"),
      React.createElement("h1", { style: { fontSize: 24, fontWeight: 700, color: "var(--text-strong)", margin: "0 0 4px" } }, "Speed Round Complete!"),
      React.createElement("p", { style: { fontSize: 14, color: "var(--text-muted)", margin: "0 0 24px" } }, `${results.length} questions in ${Math.round(results.reduce((a, r) => a + (r.time || perQ), 0))}s`),

      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, width: "100%", maxWidth: 380, marginBottom: 24 } },
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "16px", textAlign: "center" } },
          React.createElement("p", { style: { fontSize: 28, fontWeight: 700, color: accuracy >= 70 ? "#15803d" : "#b45309", margin: 0 } }, `${accuracy}%`),
          React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" } }, "Accuracy")),
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "16px", textAlign: "center" } },
          React.createElement("p", { style: { fontSize: 28, fontWeight: 700, color: "var(--text-strong)", margin: 0 } }, `${avgTime}s`),
          React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" } }, "Avg time")),
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "16px", textAlign: "center" } },
          React.createElement("p", { style: { fontSize: 28, fontWeight: 700, color: "var(--indigo-600)", margin: 0 } }, `+${earnedXp}`),
          React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" } }, "XP"))),

      timedOut > 0 && React.createElement("p", { style: { fontSize: 13, color: "#b45309", margin: "0 0 12px" } }, `⏰ ${timedOut} ${timedOut === 1 ? "question" : "questions"} timed out`),

      // Post-session insight — repeated misses
      repeatedMiss.length > 0 && React.createElement("div", { style: { width: "100%", maxWidth: 380, marginBottom: 16, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 14, padding: "14px 16px" } },
        React.createElement("p", { style: { margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "#92400e" } }, "💡 Insight"),
        ...repeatedMiss.map(([topic, count], i) =>
          React.createElement("p", { key: i, style: { margin: "0 0 2px", fontSize: 13, color: "#b45309" } }, `You missed "${topic}" ${count}x — consider a Learn session on it.`))),

      // Wrong answers review
      results.filter((r) => !r.correct).length > 0 && React.createElement("div", { style: { width: "100%", maxWidth: 380, marginBottom: 16 } },
        React.createElement("p", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" } }, "Review mistakes"),
        React.createElement("div", { style: { maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 } },
          ...results.filter((r) => !r.correct).map((r, i) => {
            const q = questions[r.qIdx];
            return q && React.createElement("div", { key: i, style: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", fontSize: 13 } },
              React.createElement("p", { style: { margin: "0 0 4px", fontWeight: 600, color: "#991b1b" } }, q.q),
              React.createElement("p", { style: { margin: 0, color: "#b91c1c", fontSize: 12 } }, `✓ ${q.options[q.correct]}${q.explanation ? ` — ${q.explanation}` : ""}`));
          }))),

      _btn("Done →", onExit, true, false));
  }

  // ── Session ──
  const q = questions[idx];
  if (!q) return null;
  const timerPct = (timer / perQ) * 100;
  const timerColor = timer <= 5 ? "#ef4444" : timer <= 10 ? "#f59e0b" : "#6366f1";

  return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)" } },
    // Top bar: timer + progress
    React.createElement("div", { style: { padding: "12px 20px 0" } },
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } },
        React.createElement("span", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)" } }, `Question ${idx + 1}/${questions.length}`),
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } },
          React.createElement("span", { style: { fontSize: 24, fontWeight: 700, color: timerColor, fontFamily: "var(--font-mono)", minWidth: 36, textAlign: "right" } }, timer),
          React.createElement("span", { style: { fontSize: 11, color: "var(--text-muted)" } }, "sec")),
        React.createElement("span", { style: { fontSize: 12, color: "var(--text-muted)" } }, `${results.filter((r) => r.correct).length}✓ ${results.filter((r) => !r.correct).length}✗`)),
      // Timer bar
      React.createElement("div", { style: { height: 4, background: "var(--surface-muted)", borderRadius: 2, overflow: "hidden" } },
        React.createElement("div", { style: { height: "100%", width: "100%", transform: `scaleX(${timerPct / 100})`, transformOrigin: "left", background: timerColor, borderRadius: 2, transition: "transform 1s linear, background 0.3s" } })),
      // Progress dots
      React.createElement("div", { style: { display: "flex", gap: 3, marginTop: 6, justifyContent: "center" } },
        ...questions.map((_, i) => {
          const r = results[i];
          const bg = i === idx ? timerColor : r ? (r.correct ? "#22c55e" : "#ef4444") : "var(--border-subtle)";
          return React.createElement("div", { key: i, style: { width: i === idx ? 18 : 8, height: 6, borderRadius: 3, background: bg, transition: "all 0.2s" } });
        }))),
    // Question card
    React.createElement("div", { style: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "20px" } },
      q.topic && React.createElement("p", { style: { fontSize: 11, fontWeight: 600, color: "var(--indigo-600)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" } }, q.topic),
      React.createElement("p", { style: { fontWeight: 600, fontSize: 17, margin: "0 0 20px", color: "var(--text-strong)", lineHeight: 1.5 } }, q.q),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
        ...(q.options || []).map((opt, i) => {
          let bg = "var(--surface-card)", bc = "var(--border-default)", col = "var(--text-body)";
          if (selected !== null) {
            if (i === q.correct) { bg = "#f0fdf4"; bc = "#22c55e"; col = "#15803d"; }
            else if (i === selected) { bg = "#fef2f2"; bc = "#ef4444"; col = "#b91c1c"; }
            else { col = "#d1d5db"; bc = "#f3f4f6"; }
          }
          return React.createElement("button", {
            key: i, disabled: selected !== null,
            onClick: () => answer(i),
            style: { display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: bg, border: `1.5px solid ${bc}`, borderRadius: 14, color: col, fontSize: 14, textAlign: "left", cursor: selected !== null ? "default" : "pointer", width: "100%", fontFamily: "var(--font-sans)", fontWeight: 500, transition: "all 0.15s" }
          },
            React.createElement("span", { style: { width: 28, height: 28, borderRadius: 8, background: selected !== null && i === q.correct ? "#22c55e" : selected === i ? "#ef4444" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: selected !== null && (i === q.correct || i === selected) ? "white" : "#9ca3af", flexShrink: 0 } }, ["A", "B", "C", "D"][i]),
            opt);
        }))));
}

// ─── PRACTICE ENGINE (Exam simulation) ───────────────────────────────────────

function PracticeEngine({ examViews, onExit }) {
  const [phase, setPhase] = React.useState("setup"); // setup | session | summary
  const [config, setConfig] = React.useState({ difficulty: "adaptive", topics: [], estMinutes: 20 });
  const [questions, setQuestions] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [qIdx, setQIdx] = React.useState(0);
  const [selected, setSelected] = React.useState(null);
  const [confidence, setConfidence] = React.useState(null);
  const [showWhy, setShowWhy] = React.useState(false);
  const [whyInput, setWhyInput] = React.useState("");
  const [revealed, setRevealed] = React.useState(false);
  const [results, setResults] = React.useState([]);
  const [patternAlert, setPatternAlert] = React.useState(null);

  const allTopics = examViews.flatMap((e) => (e.topics || []).map((t) => ({ name: t.topicName || t.name, exam: e.name, examId: e.id, topicIdx: t.topicIdx, retention: t.retention })));

  // Pattern detection must be declared here — hooks cannot come after conditional returns
  React.useEffect(() => {
    if (results.length < 3) return;
    const topicErrors = {};
    results.forEach((r) => { if (!r.correct && r.topic) { topicErrors[r.topic] = (topicErrors[r.topic] || 0) + 1; } });
    const worst = Object.entries(topicErrors).find(([, c]) => c >= 3);
    if (worst && (!patternAlert || patternAlert.topic !== worst[0])) {
      setPatternAlert({ topic: worst[0], count: worst[1] });
    }
  }, [results.length]);

  // ── Setup screen ──
  if (phase === "setup") {
    const DIFFS = [
      { key: "easy", label: "Easy", emoji: "😊", desc: "Basics & definitions" },
      { key: "medium", label: "Medium", emoji: "🎯", desc: "Standard exam level" },
      { key: "hard", label: "Hard", emoji: "🔥", desc: "Tricky edge cases" },
      { key: "adaptive", label: "Adaptive", emoji: "🤖", desc: "AI adjusts in real-time" },
    ];
    const selectedTopics = config.topics.length > 0 ? config.topics : allTopics.slice(0, 3).map((t) => t.name);

    const startPractice = async () => {
      setPhase("session"); setLoading(true); setError(null);
      try {
        const complete = window.brainComplete || ((a) => window.claude.complete(a));
        const topicList = selectedTopics.join(", ");
        const n = config.difficulty === "easy" ? 10 : config.difficulty === "hard" ? 15 : 12;
        const diffNote = config.difficulty === "adaptive"
          ? "Start at medium difficulty. If 2+ correct in a row, increase. If wrong, decrease. Mix difficulties."
          : `All questions should be ${config.difficulty} difficulty.`;
        const system = `You are an exam paper generator. Create exactly ${n} exam-style questions covering: ${topicList}.

${diffNote}

OUTPUT ONLY valid JSON — no markdown, no fences. Start with { end with }.

FORMAT: {"questions":[{"question":"...", "options":["A","B","C","D"], "correct":0, "explanation":"1-2 sentences", "topic":"which topic this tests", "difficulty":"easy|medium|hard"}]}

RULES:
- Mix question types: conceptual, calculation, application, edge-case traps
- Each question has exactly 4 options, "correct" is 0-based index
- explanation should teach WHY the right answer is right AND why the chosen wrong one is wrong
- Spread questions evenly across the listed topics
- No duplicate concepts`;

        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("Took too long.")), 45000));
        const raw = await Promise.race([
          complete({ system, messages: [{ role: "user", content: `Generate a ${config.difficulty} practice exam on: ${topicList}` }] }),
          timeout,
        ]);
        const parsed = window.parseJSON ? window.parseJSON(raw) : JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
        if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) throw new Error("Invalid questions");
        setQuestions(parsed.questions);
        setLoading(false);
      } catch (e) {
        console.error("Practice generation failed:", e);
        setError(e.message); setLoading(false);
      }
    };

    return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", padding: "24px 20px", overflowY: "auto" } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 20 } },
        React.createElement("button", { onClick: onExit, style: { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted)", padding: 0 } }, "←"),
        React.createElement("h2", { style: { margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-strong)" } }, "🎯 Practice Exam")),

      // Difficulty
      React.createElement("p", { style: { fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" } }, "Difficulty"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 } },
        ...DIFFS.map((d) => React.createElement("button", {
          key: d.key, onClick: () => setConfig((c) => ({ ...c, difficulty: d.key })),
          style: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: config.difficulty === d.key ? "#eef2ff" : "var(--surface-card)", border: `1.5px solid ${config.difficulty === d.key ? "var(--indigo-500)" : "var(--border-default)"}`, borderRadius: 12, cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left" }
        },
          React.createElement("span", { style: { fontSize: 20 } }, d.emoji),
          React.createElement("div", null,
            React.createElement("p", { style: { margin: 0, fontSize: 13, fontWeight: 600, color: config.difficulty === d.key ? "var(--indigo-700)" : "var(--text-strong)" } }, d.label),
            React.createElement("p", { style: { margin: 0, fontSize: 11, color: "var(--text-muted)" } }, d.desc))))),

      // Topics
      React.createElement("p", { style: { fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" } }, "Topics"),
      React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 } },
        ...allTopics.slice(0, 12).map((tp) => {
          const on = selectedTopics.includes(tp.name);
          return React.createElement("button", {
            key: tp.name, onClick: () => setConfig((c) => {
              const cur = c.topics.length > 0 ? c.topics : allTopics.slice(0, 3).map((t) => t.name);
              return { ...c, topics: on ? cur.filter((n) => n !== tp.name) : [...cur, tp.name] };
            }),
            style: { padding: "6px 12px", fontSize: 12, fontWeight: 600, borderRadius: 20, border: `1px solid ${on ? "var(--indigo-500)" : "var(--border-default)"}`, background: on ? "#eef2ff" : "var(--surface-card)", color: on ? "var(--indigo-700)" : "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font-sans)" }
          }, tp.name);
        })),

      // Start button
      _btn("Start Practice →", startPractice, true, false));
  }

  // ── Loading ──
  if (loading) {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", gap: 16 } },
      React.createElement(CoachIcon, { size: 56 }),
      React.createElement("p", { style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)" } }, "Generating your exam..."),
      React.createElement("div", { style: { display: "flex", gap: 6 } },
        ...[0, 1, 2].map((d) => React.createElement("span", { key: d, style: { width: 8, height: 8, borderRadius: "50%", background: "#6366f1", animation: "loadDot 1.2s ease-in-out infinite", animationDelay: d * 0.2 + "s" } }))));
  }

  if (error) {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", gap: 16, padding: "0 24px" } },
      React.createElement("span", { style: { fontSize: 40 } }, "⚠️"),
      React.createElement("p", { style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)", margin: 0 } }, "Couldn't generate exam"),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", margin: 0 } }, error),
      _btn("← Back", () => { setPhase("setup"); setError(null); }, false, false));
  }

  // ── Summary ──
  if (phase === "summary" || (questions && qIdx >= questions.length)) {
    const total = results.length;
    const correct = results.filter((r) => r.correct).length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const xpEarned = correct * 20 + 50;
    if (window.addXp && total > 0) window.addXp(xpEarned);
    const byTopic = {};
    results.forEach((r) => {
      const t = r.topic || "Unknown";
      if (!byTopic[t]) byTopic[t] = { correct: 0, total: 0 };
      byTopic[t].total++;
      if (r.correct) byTopic[t].correct++;
    });
    const weakTopics = Object.entries(byTopic).filter(([, v]) => v.correct / v.total < 0.5).map(([k]) => k);

    return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", padding: "0 24px", animation: "fadeUp 0.5s ease-out", gap: 4 } },
      React.createElement("span", { style: { fontSize: 56, marginBottom: 8 } }, pct >= 80 ? "🏆" : pct >= 60 ? "✨" : "💪"),
      React.createElement("h1", { style: { fontSize: 24, fontWeight: 700, color: "var(--text-strong)", margin: "0 0 4px" } }, "Practice Complete!"),
      React.createElement("p", { style: { fontSize: 14, color: "var(--text-muted)", margin: "0 0 24px" } }, `${correct}/${total} correct · ${pct}%`),

      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, width: "100%", maxWidth: 340, marginBottom: 20 } },
        ...[
          { val: `${pct}%`, label: "Score", color: pct >= 70 ? "#15803d" : "#b91c1c" },
          { val: `${total}`, label: "Questions", color: "var(--indigo-600)" },
          { val: `+${xpEarned}`, label: "XP", color: "#7c3aed" },
        ].map((s, i) => React.createElement("div", { key: i, style: { textAlign: "center", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: "12px 8px" } },
          React.createElement("p", { style: { margin: 0, fontSize: 22, fontWeight: 700, color: s.color } }, s.val),
          React.createElement("p", { style: { margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" } }, s.label)))),

      weakTopics.length > 0 && React.createElement("div", { style: { width: "100%", maxWidth: 340, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "12px 16px", marginBottom: 16 } },
        React.createElement("p", { style: { margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#92400e", textTransform: "uppercase" } }, "🎯 Pattern detected — focus on:"),
        ...weakTopics.map((t, i) => React.createElement("p", { key: i, style: { margin: "3px 0", fontSize: 13, color: "#b45309" } }, `• ${t}`))),

      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 } },
        _btn("Done →", onExit, true, false)));
  }

  // ── Question view ──
  if (!questions) return null;
  const q = questions[qIdx];
  const totalQ = questions.length;
  const pctDone = Math.round(((qIdx + 1) / totalQ) * 100);

  const submitAnswer = () => {
    if (selected === null || confidence === null) return;
    const isCorrect = selected === q.correct;
    const resolved = window.resolveTopicForBrain ? window.resolveTopicForBrain(q.topic) : null;
    if (resolved && window.recordReview) {
      window.recordReview({ examId: resolved.examId, topicIdx: resolved.topicIdx, topicName: resolved.topicName, correct: isCorrect });
    }
    if (!isCorrect && resolved && window.logMistake) {
      window.logMistake({ topic: resolved?.topicName || q.topic, question: q.question, examId: resolved?.examId, topicIdx: resolved?.topicIdx });
    }
    setResults((r) => [...r, { correct: isCorrect, topic: q.topic, confidence, selected }]);
    if (!isCorrect) { setShowWhy(true); } else { setRevealed(true); }
  };

  const advance = () => {
    setSelected(null); setConfidence(null); setRevealed(false); setShowWhy(false); setWhyInput(""); setPatternAlert(null);
    if (qIdx + 1 >= totalQ) { setPhase("summary"); } else { setQIdx(qIdx + 1); }
  };

  const CONF_OPTS = [
    { key: "guessing", emoji: "🤔", label: "Guessing" },
    { key: "okay", emoji: "🤨", label: "Okay" },
    { key: "easy", emoji: "😎", label: "Easy" },
  ];

  return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)" } },
    // Progress header
    React.createElement("div", { style: { padding: "12px 20px 0" } },
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } },
        React.createElement("span", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)" } }, `Question ${qIdx + 1} / ${totalQ}`),
        React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", fontSize: 12 } },
          q.difficulty && _badge(q.difficulty === "hard" ? "#fef2f2" : q.difficulty === "easy" ? "#f0fdf4" : "#fefce8",
            q.difficulty === "hard" ? "#b91c1c" : q.difficulty === "easy" ? "#15803d" : "#92400e", q.difficulty),
          React.createElement("button", { onClick: () => setPhase("summary"),
            style: { fontSize: 11, color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", textDecoration: "underline" } }, "End exam"))),
      React.createElement("div", { style: { height: 4, background: "var(--surface-muted)", borderRadius: 2, overflow: "hidden" } },
        React.createElement("div", { style: { height: "100%", width: "100%", transform: `scaleX(${pctDone / 100})`, transformOrigin: "left", background: "linear-gradient(90deg,#6366f1,#7c3aed)", borderRadius: 2, transition: "transform 0.4s" } }))),

    // Content
    React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "20px" } },
      // Pattern alert
      patternAlert && !revealed && !showWhy && React.createElement("div", {
        style: { marginBottom: 16, padding: "12px 16px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, animation: "fadeUp 0.3s" }
      },
        React.createElement("p", { style: { margin: 0, fontSize: 13, fontWeight: 700, color: "#b91c1c" } }, "🎯 Pattern detected"),
        React.createElement("p", { style: { margin: "4px 0 0", fontSize: 12, color: "#dc2626" } }, `You've struggled with ${patternAlert.topic} ${patternAlert.count} times. Consider a refresher after this exam.`)),

      // Question card
      React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24, animation: "fadeUp 0.3s ease-out" } },
        q.topic && React.createElement("div", { style: { marginBottom: 10 } }, _badge("#f5f3ff", "#7c3aed", q.topic)),
        React.createElement("p", { style: { fontWeight: 600, fontSize: 16, margin: "0 0 16px", color: "var(--text-strong)", lineHeight: 1.5 }, dangerouslySetInnerHTML: { __html: _md(q.question) } }),

        // Options
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
          ...(q.options || []).map((opt, i) => {
            const isCorrect = i === q.correct;
            const isSel = i === selected;
            let bg = "var(--surface-card)", bc = "var(--border-default)", col = "var(--text-body)", lbg = "#f3f4f6", lcol = "#9ca3af";
            if (revealed || showWhy) {
              if (isCorrect) { bg = "#f0fdf4"; bc = "#22c55e"; col = "#15803d"; lbg = "#22c55e"; lcol = "white"; }
              else if (isSel) { bg = "#fef2f2"; bc = "#ef4444"; col = "#b91c1c"; lbg = "#ef4444"; lcol = "white"; }
              else { col = "#d1d5db"; bc = "#f3f4f6"; }
            } else if (isSel) { bg = "#eef2ff"; bc = "var(--indigo-500)"; col = "var(--indigo-700)"; lbg = "var(--indigo-500)"; lcol = "white"; }
            return React.createElement("button", {
              key: i, disabled: revealed || showWhy,
              onClick: () => setSelected(i),
              style: { display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: bg, border: `1.5px solid ${bc}`, borderRadius: 14, color: col, fontSize: 14, textAlign: "left", cursor: (revealed || showWhy) ? "default" : "pointer", width: "100%", fontFamily: "var(--font-sans)", transition: "all 0.15s" }
            },
              React.createElement("span", { style: { width: 28, height: 28, borderRadius: 8, background: lbg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: lcol, flexShrink: 0 } }, ["A", "B", "C", "D"][i]),
              React.createElement("span", { style: { lineHeight: 1.45, fontWeight: 500 } }, opt));
          })),

        // Confidence selector (before submitting)
        selected !== null && !revealed && !showWhy && React.createElement("div", { style: { marginTop: 16 } },
          React.createElement("p", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", margin: "0 0 8px" } }, "How confident are you?"),
          React.createElement("div", { style: { display: "flex", gap: 8 } },
            ...CONF_OPTS.map((c) => React.createElement("button", {
              key: c.key, onClick: () => setConfidence(c.key),
              style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 8px", background: confidence === c.key ? "#eef2ff" : "var(--surface-card)", border: `1.5px solid ${confidence === c.key ? "var(--indigo-500)" : "var(--border-default)"}`, borderRadius: 10, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, color: confidence === c.key ? "var(--indigo-700)" : "var(--text-muted)" }
            }, React.createElement("span", null, c.emoji), c.label)))),

        // Submit button
        selected !== null && confidence !== null && !revealed && !showWhy && React.createElement("div", { style: { marginTop: 12 } },
          _btn("Submit →", submitAnswer, true, false)),

        // "Why did you choose?" (wrong answer)
        showWhy && React.createElement("div", { style: { marginTop: 16, animation: "fadeUp 0.3s" } },
          React.createElement("div", { style: { padding: "12px 16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, marginBottom: 12 } },
            React.createElement("p", { style: { margin: 0, fontSize: 14, fontWeight: 600, color: "#92400e" } }, `Why did you choose ${["A", "B", "C", "D"][selected]}?`),
            React.createElement("p", { style: { margin: "4px 0 0", fontSize: 12, color: "#b45309" } }, "Explain your reasoning — this helps you learn from mistakes.")),
          React.createElement("textarea", {
            value: whyInput, onChange: (e) => setWhyInput(e.target.value), autoFocus: true,
            placeholder: "I thought this because...", rows: 2,
            style: { width: "100%", border: "1px solid var(--border-default)", borderRadius: 12, padding: "10px 14px", fontSize: 13, fontFamily: "var(--font-sans)", color: "var(--text-body)", background: "var(--surface-page)", resize: "none", outline: "none", boxSizing: "border-box" }
          }),
          React.createElement("div", { style: { marginTop: 8 } },
            _btn(whyInput.trim() ? "See explanation →" : "Skip →", () => { setShowWhy(false); setRevealed(true); }, true, false))),

        // Explanation (after reveal)
        revealed && React.createElement("div", { style: { marginTop: 14, padding: "12px 16px", background: results[results.length - 1]?.correct ? "#f0fdf4" : "#fffbeb", border: `1px solid ${results[results.length - 1]?.correct ? "#bbf7d0" : "#fde68a"}`, borderRadius: 12, fontSize: 14, color: results[results.length - 1]?.correct ? "#15803d" : "#92400e", lineHeight: 1.6 } },
          results[results.length - 1]?.correct ? "✅ " : "💡 ", q.explanation)),

      // Continue button
      revealed && React.createElement("div", { style: { marginTop: 16 } }, _btn("Continue →", advance, true, false))));
}

// ─── EXAM SIMULATION ─────────────────────────────────────────────────────────
// A full timed mock exam for ONE subject, covering ALL of its topics (not just
// weak ones) — distinct from Practice (untimed, topic-picked, reveals per
// question) and Speed Round (per-question 30s clock, weak-topics only). Here
// the clock is a single exam-wide countdown and nothing is revealed until the
// whole paper is submitted, matching how a real exam actually works.
function ExamSimEngine({ examViews, onExit }) {
  const [phase, setPhase] = React.useState("setup"); // setup | loading | session | summary
  const [examId, setExamId] = React.useState(examViews[0]?.id || null);
  const [questions, setQuestions] = React.useState(null);
  const [answers, setAnswers] = React.useState([]);
  const [idx, setIdx] = React.useState(0);
  const [error, setError] = React.useState(null);
  const [timeLeft, setTimeLeft] = React.useState(0);
  const [timeLimitSec, setTimeLimitSec] = React.useState(0);
  const [showFinishConfirm, setShowFinishConfirm] = React.useState(false);
  const [autoSubmitted, setAutoSubmitted] = React.useState(false);
  const finishedRef = React.useRef(false);

  const selectedExam = examViews.find((e) => e.id === examId) || examViews[0] || null;
  const examTopics = selectedExam ? (selectedExam.topics || []).map((t) => t.topicName || t.name).filter(Boolean) : [];
  const questionCount = Math.max(12, Math.min(24, examTopics.length > 0 ? examTopics.length * 2 : 16));
  const estMinutes = Math.round(questionCount * 1.5);

  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const finishExam = (auto) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setAutoSubmitted(!!auto);
    let correctCount = 0;
    questions.forEach((q, i) => {
      const sel = answers[i];
      if (sel === null || sel === undefined) return; // unanswered — no signal to record, but still counts wrong in the score below
      const isCorrect = sel === q.correct;
      if (isCorrect) correctCount++;
      const resolved = window.resolveTopicForBrain ? window.resolveTopicForBrain(q.topic) : null;
      if (resolved && window.recordReview) {
        window.recordReview({ examId: resolved.examId, topicIdx: resolved.topicIdx, topicName: resolved.topicName, correct: isCorrect });
      }
      if (!isCorrect && resolved && window.logMistake) {
        window.logMistake({ topic: resolved?.topicName || q.topic, question: q.question, examId: resolved?.examId, topicIdx: resolved?.topicIdx });
      }
    });
    const pct = Math.round((correctCount / questions.length) * 100);
    const xpEarned = correctCount * 15 + (pct >= 80 ? 100 : pct >= 50 ? 40 : 0);
    if (window.addXp) window.addXp(xpEarned);
    _sfx.complete();
    setPhase("summary");
  };

  // Exam-wide countdown — runs only during the session, independent of which
  // question is on screen (unlike Speed Round's per-question timer).
  React.useEffect(() => {
    if (phase !== "session") return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) { clearInterval(t); finishExam(true); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  // ── Setup screen ──
  if (phase === "setup" || (phase === "loading" && error)) {
    const startExam = async () => {
      if (!selectedExam) return;
      setPhase("loading"); setError(null); finishedRef.current = false; setAutoSubmitted(false);
      try {
        const complete = window.brainComplete || ((a) => window.claude.complete(a));
        const topicList = examTopics.length > 0 ? examTopics.join(", ") : selectedExam.name;
        const system = `You are an exam board setting a real mock exam paper for "${selectedExam.name}". Create exactly ${questionCount} exam-style multiple-choice questions covering ALL of these topics, spread as evenly as possible: ${topicList}.

OUTPUT ONLY valid JSON — no markdown, no fences. Start with { end with }.

FORMAT: {"questions":[{"question":"...", "options":["A","B","C","D"], "correct":0, "explanation":"1-2 sentences", "topic":"which topic this tests"}]}

RULES:
- Exactly 4 options per question, "correct" is a 0-based index.
- Cover every topic in the list at least once before repeating any.
- Mix conceptual, calculation and applied questions at genuine exam difficulty — this is a real paper, not a warm-up.
- explanation teaches WHY the right answer is right.
- No duplicate concepts.`;

        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("Took too long — try again.")), 60000));
        const raw = await Promise.race([
          complete({ system, messages: [{ role: "user", content: `Generate a full mock exam on: ${topicList}` }] }),
          timeout,
        ]);
        const parsed = window.parseJSON ? window.parseJSON(raw) : JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
        if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) throw new Error("Invalid questions");
        const secs = Math.round(parsed.questions.length * 1.5) * 60;
        setQuestions(parsed.questions);
        setAnswers(new Array(parsed.questions.length).fill(null));
        setIdx(0);
        setTimeLeft(secs);
        setTimeLimitSec(secs);
        setPhase("session");
      } catch (e) {
        console.error("Exam simulation generation failed:", e);
        setError(e.message || "Failed to generate exam");
        setPhase("setup");
      }
    };

    return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", padding: "24px 20px", overflowY: "auto" } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 20 } },
        React.createElement("button", { onClick: onExit, style: { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted)", padding: 0 } }, "←"),
        React.createElement("h2", { style: { margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-strong)" } }, "📝 Exam Simulation")),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", margin: "0 0 20px" } }, "A full timed mock exam covering every topic in one subject — no answers revealed until you submit, just like the real thing."),

      error && React.createElement("div", { style: { padding: "12px 16px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, marginBottom: 16 } },
        React.createElement("p", { style: { margin: 0, fontSize: 13, color: "#b91c1c" } }, error)),

      React.createElement("p", { style: { fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" } }, "Subject"),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 } },
        ...examViews.map((e) => React.createElement("button", {
          key: e.id, onClick: () => setExamId(e.id),
          style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", background: examId === e.id ? "#eef2ff" : "var(--surface-card)", border: `1.5px solid ${examId === e.id ? "var(--indigo-500)" : "var(--border-default)"}`, borderRadius: 12, cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left" }
        },
          React.createElement("span", { style: { fontSize: 14, fontWeight: 600, color: examId === e.id ? "var(--indigo-700)" : "var(--text-strong)" } }, e.name),
          React.createElement("span", { style: { fontSize: 12, color: "var(--text-muted)" } }, `${(e.topics || []).length || "?"} topics`)))),

      selectedExam && React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24, background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: "14px 8px" } },
        ...[
          { val: questionCount, label: "Questions" },
          { val: `~${estMinutes}m`, label: "Time limit" },
          { val: examTopics.length || "All", label: "Topics" },
        ].map((s, i) => React.createElement("div", { key: i, style: { textAlign: "center" } },
          React.createElement("p", { style: { margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-strong)" } }, s.val),
          React.createElement("p", { style: { margin: "2px 0 0", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" } }, s.label)))),

      _btn(selectedExam ? "Start exam →" : "Add a subject first", startExam, true, !selectedExam));
  }

  // ── Loading ──
  if (phase === "loading") {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", gap: 16 } },
      React.createElement(CoachIcon, { size: 56 }),
      React.createElement("p", { style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)" } }, "Assembling your mock exam..."),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)" } }, selectedExam?.name),
      React.createElement("div", { style: { display: "flex", gap: 6 } },
        ...[0, 1, 2].map((d) => React.createElement("span", { key: d, style: { width: 8, height: 8, borderRadius: "50%", background: "#6366f1", animation: "loadDot 1.2s ease-in-out infinite", animationDelay: d * 0.2 + "s" } }))));
  }

  // ── Summary ──
  if (phase === "summary") {
    const total = questions.length;
    const answeredCount = answers.filter((a) => a !== null && a !== undefined).length;
    const correctCount = questions.filter((q, i) => answers[i] === q.correct).length;
    const pct = Math.round((correctCount / total) * 100);
    const xpEarned = correctCount * 15 + (pct >= 80 ? 100 : pct >= 50 ? 40 : 0); // display only — actually awarded once in finishExam()
    const predictedGrade = window.gradeFromReadiness ? window.gradeFromReadiness(pct) : null;
    const timeUsed = timeLimitSec - timeLeft;

    const byTopic = {};
    questions.forEach((q, i) => {
      const t = q.topic || "Unknown";
      if (!byTopic[t]) byTopic[t] = { correct: 0, total: 0 };
      byTopic[t].total++;
      if (answers[i] === q.correct) byTopic[t].correct++;
    });
    const weakTopics = Object.entries(byTopic).filter(([, v]) => v.correct / v.total < 0.5).map(([k]) => k);

    return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", padding: "0 20px 24px", overflowY: "auto" } },
      React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "28px 4px 20px", animation: "fadeUp 0.5s ease-out" } },
        React.createElement("span", { style: { fontSize: 52, marginBottom: 6 } }, pct >= 80 ? "🏆" : pct >= 60 ? "✨" : pct >= 40 ? "💪" : "📖"),
        React.createElement("h1", { style: { fontSize: 22, fontWeight: 700, color: "var(--text-strong)", margin: "0 0 4px" } }, autoSubmitted ? "Time's up!" : "Exam Submitted"),
        React.createElement("p", { style: { fontSize: 14, color: "var(--text-muted)", margin: 0 } }, `${correctCount}/${total} correct · ${pct}% · ${selectedExam?.name}`),
        predictedGrade && React.createElement("div", { style: { marginTop: 10 } }, _badge("#ede9fe", "#6d28d9", `Predicted grade: ${predictedGrade}`))),

      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 20 } },
        ...[
          { val: `${pct}%`, label: "Score", color: pct >= 70 ? "#15803d" : "#b91c1c" },
          { val: `${answeredCount}/${total}`, label: "Answered", color: "var(--indigo-600)" },
          { val: mmss(timeUsed), label: "Time used", color: "var(--text-strong)" },
          { val: `+${xpEarned}`, label: "XP", color: "#7c3aed" },
        ].map((s, i) => React.createElement("div", { key: i, style: { textAlign: "center", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: "10px 4px" } },
          React.createElement("p", { style: { margin: 0, fontSize: 16, fontWeight: 700, color: s.color } }, s.val),
          React.createElement("p", { style: { margin: "2px 0 0", fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase" } }, s.label)))),

      weakTopics.length > 0 && React.createElement("div", { style: { background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "12px 16px", marginBottom: 20 } },
        React.createElement("p", { style: { margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#92400e", textTransform: "uppercase" } }, "Focus on:"),
        ...weakTopics.map((t, i) => React.createElement("p", { key: i, style: { margin: "3px 0", fontSize: 13, color: "#b45309" } }, `• ${t}`))),

      React.createElement("p", { style: { fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" } }, "Full review"),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 } },
        ...questions.map((q, i) => {
          const sel = answers[i];
          const answered = sel !== null && sel !== undefined;
          const isCorrect = answered && sel === q.correct;
          return React.createElement("div", { key: i, style: { background: "var(--surface-card)", border: `1px solid ${answered ? (isCorrect ? "#bbf7d0" : "#fecaca") : "var(--border-subtle)"}`, borderRadius: 12, padding: "12px 14px" } },
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 } },
              React.createElement("p", { style: { margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text-strong)", lineHeight: 1.5 } }, `${i + 1}. ${q.question}`),
              React.createElement("span", { style: { fontSize: 15, flexShrink: 0 } }, !answered ? "⬜" : isCorrect ? "✅" : "❌")),
            React.createElement("p", { style: { margin: "0 0 2px", fontSize: 12, color: "var(--text-muted)" } },
              answered ? `Your answer: ${(q.options || [])[sel]}` : "Not answered"),
            !isCorrect && React.createElement("p", { style: { margin: "0 0 6px", fontSize: 12, color: "#15803d", fontWeight: 600 } }, `Correct: ${(q.options || [])[q.correct]}`),
            React.createElement("p", { style: { margin: 0, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 } }, q.explanation));
        })),

      _btn("Done →", onExit, true, false));
  }

  // ── Session (question) view ──
  if (!questions) return null;
  const q = questions[idx];
  const total = questions.length;
  const answeredCount = answers.filter((a) => a !== null && a !== undefined).length;
  const unansweredCount = total - answeredCount;

  return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)" } },
    // Header — exam-wide timer, not per-question
    React.createElement("div", { style: { padding: "12px 20px 0" } },
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } },
        React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "var(--text-strong)" } }, `Question ${idx + 1} of ${total}`),
        React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center" } },
          React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: timeLeft <= 120 ? "#b91c1c" : "var(--text-strong)" } }, `⏱ ${mmss(timeLeft)}`),
          React.createElement("button", { onClick: () => setShowFinishConfirm(true),
            style: { fontSize: 11, color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", textDecoration: "underline" } }, "Finish exam"))),
      // Progress dots — filled once answered, outlined if not, current is wider
      React.createElement("div", { style: { display: "flex", gap: 4, marginBottom: 8 } },
        ...questions.map((_, i) => {
          const answered = answers[i] !== null && answers[i] !== undefined;
          return React.createElement("div", {
            key: i, onClick: () => setIdx(i),
            style: { flex: i === idx ? 2 : 1, height: 5, borderRadius: 3, cursor: "pointer", background: i === idx ? "#6366f1" : answered ? "#c7d2fe" : "var(--border-subtle)", transition: "background 0.3s" }
          });
        }))),

    // Finish confirmation banner
    showFinishConfirm && React.createElement("div", { style: { margin: "0 20px 12px", padding: "12px 16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12 } },
      React.createElement("p", { style: { margin: "0 0 8px", fontSize: 13, color: "#92400e" } },
        unansweredCount > 0 ? `${unansweredCount} question${unansweredCount > 1 ? "s" : ""} left unanswered — submit anyway?` : "Submit your exam now?"),
      React.createElement("div", { style: { display: "flex", gap: 8 } },
        _btn("Cancel", () => setShowFinishConfirm(false), false, false),
        _btn("Submit →", () => finishExam(false), true, false))),

    // Question content
    React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "0 20px 80px" } },
      React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24, animation: "fadeUp 0.3s ease-out" } },
        q.topic && React.createElement("div", { style: { marginBottom: 10 } }, _badge("#f5f3ff", "#7c3aed", q.topic)),
        React.createElement("p", { style: { fontWeight: 600, fontSize: 16, margin: "0 0 16px", color: "var(--text-strong)", lineHeight: 1.5 }, dangerouslySetInnerHTML: { __html: _md(q.question) } }),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
          ...(q.options || []).map((opt, i) => {
            const isSel = answers[idx] === i;
            return React.createElement("button", {
              key: i, onClick: () => setAnswers((a) => { const next = [...a]; next[idx] = i; return next; }),
              style: { display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: isSel ? "#eef2ff" : "var(--surface-card)", border: `1.5px solid ${isSel ? "var(--indigo-500)" : "var(--border-default)"}`, borderRadius: 14, color: isSel ? "var(--indigo-700)" : "var(--text-body)", fontSize: 14, textAlign: "left", cursor: "pointer", width: "100%", fontFamily: "var(--font-sans)", transition: "all 0.15s" }
            },
              React.createElement("span", { style: { width: 28, height: 28, borderRadius: 8, background: isSel ? "var(--indigo-500)" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: isSel ? "white" : "#9ca3af", flexShrink: 0 } }, ["A", "B", "C", "D"][i]),
              React.createElement("span", { style: { lineHeight: 1.45, fontWeight: 500 } }, opt));
          })))),

    // Prev / Next navigation
    React.createElement("div", { style: { padding: "12px 20px 20px", display: "flex", gap: 10 } },
      idx > 0 && _btn("← Prev", () => setIdx(idx - 1), false, false),
      idx + 1 < total
        ? _btn("Next →", () => setIdx(idx + 1), true, false)
        : _btn("Review & submit →", () => setShowFinishConfirm(true), true, false)));
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
  const [explainInput, setExplainInput] = React.useState("");
  const [explainFeedback, setExplainFeedback] = React.useState(null);
  const [explainLoading, setExplainLoading] = React.useState(false);
  const [askOpen, setAskOpen] = React.useState(false);
  const [askInput, setAskInput] = React.useState("");
  const [askReply, setAskReply] = React.useState(null);
  const [askLoading, setAskLoading] = React.useState(false);
  // Guards the once-per-lesson XP commit so it can't double-count across
  // re-renders. Only a genuine completion (done → true) banks XP; exiting early
  // never sets done, so partial-lesson XP is deliberately not awarded.
  const xpCommittedRef = React.useRef(false);
  // One-time coachmark explaining Learn mode, shown only the very first time
  // this student opens it (profile-store.jsx persists the dismissal so it
  // never reappears once seen — same shape as every other "seen it" flag
  // would use in this app, there just wasn't one yet).
  const [showLearnTooltip, setShowLearnTooltip] = React.useState(
    () => mode === "learn" && !!window.getProfile && !window.getProfile().hasSeenLearnTooltip
  );
  const dismissLearnTooltip = () => {
    setShowLearnTooltip(false);
    if (window.saveProfile) window.saveProfile({ hasSeenLearnTooltip: true });
  };

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

"explain_back" — student explains the concept in their own words, AI checks:
{"type":"explain_back","prompt":"Explain [concept] in your own words, as if teaching a friend.","ideal":"The key points a good explanation should cover.","concept":"The concept name"}

"checkpoint" — 3 rapid-fire questions:
{"type":"checkpoint","questions":[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."},{"question":"...","options":["A","B","C","D"],"correct":2,"explanation":"..."},{"question":"...","options":["A","B","C","D"],"correct":1,"explanation":"..."}]}

OUTPUT FORMAT: {"title":"Lesson title","estimatedMinutes":10,"steps":[...]}`;

        // Two completely different lesson shapes depending on whether the student
        // is seeing this topic for the first time (learn) or revisiting it (review/practice).
        const system = (mode === "learn") ? `You are an expert teacher building ONE clear first-lesson — the student is encountering this topic for the first time. Priority is understanding, not speed. Anything known about the student appears above; use it.${DIFF_NOTE}

OUTPUT ONLY valid JSON — no markdown, no fences, no text before or after. Start with { end with }.

${VOICE}

STRUCTURE — 9-14 steps, always concept-first:
1. Step 1 is ALWAYS a "teach" step. Open with the clearest, most concrete explanation of the first concept — an analogy, a real-world anchor, not a definition dump.
2. Every "teach" is immediately followed by ONE quiz (mcq, tf, or fill) that tests exactly what was just taught — nothing the student hasn't seen yet.
3. After the SECOND concept's quiz, add ONE "explain_back" step where the student explains what they've learned so far in their own words. This is the most powerful learning moment.
4. Pattern: teach → quiz → teach → quiz → explain_back → (worked_example →) teach → quiz → checkpoint.
5. 2-3 core concepts total. Each gets its own teach + quiz pair.
6. End with a "checkpoint" of exactly 3 questions covering all concepts taught.

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
    setExplainInput(""); setExplainFeedback(null); setExplainLoading(false);
    setAskOpen(false); setAskInput(""); setAskReply(null); setAskLoading(false);
    if (step + 1 >= (plan?.steps?.length || 0)) {
      commitResults();
      setDone(true);
      _sfx.complete();
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
    isCorrect ? _sfx.correct() : _sfx.wrong();
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
    isCorrect ? _sfx.correct() : _sfx.wrong();
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
    isCorrect ? _sfx.correct() : _sfx.wrong();
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
        ...[0, 1, 2].map((d) => React.createElement("span", { key: d, style: { width: 8, height: 8, borderRadius: "50%", background: "#6366f1", animation: "loadDot 1.2s ease-in-out infinite", animationDelay: d * 0.2 + "s" } }))));
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
    React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24, borderLeft: "var(--border-accent-width) solid var(--indigo-500)" } },
      React.createElement("div", { style: { marginBottom: 14 } }, _badge("var(--indigo-50)", "var(--indigo-600)", "📖 CONCEPT")),
      s.title && React.createElement("h2", { style: { margin: "0 0 12px", fontSize: 18, fontWeight: 700, color: "var(--text-strong)" } }, s.title),
      React.createElement("div", { style: { fontSize: 15, lineHeight: 1.75, color: "var(--text-body)", marginBottom: 16 }, dangerouslySetInnerHTML: { __html: _md(s.body) } }),
      s.keyTakeaway && React.createElement("div", { style: { background: "linear-gradient(135deg, #fefce8, #fef9c3)", border: "1px solid #fde68a", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#92400e", marginBottom: s.example ? 14 : 0 } },
        "💡 ", React.createElement("strong", null, s.keyTakeaway)),
      s.example && (_isMath(s.example)
        ? React.createElement("div", { style: { background: "linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%)", borderRadius: 12, padding: "14px 20px", textAlign: "center", fontSize: 18, fontWeight: 600, fontFamily: "var(--font-mono, monospace)", color: "#4338ca", letterSpacing: "0.02em" } }, s.example)
        : React.createElement("div", { style: { background: "var(--surface-muted)", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "var(--text-body)", fontFamily: "var(--font-mono)", lineHeight: 1.7 }, dangerouslySetInnerHTML: { __html: _md(s.example) } }))),
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
        style: { marginTop: 14, padding: "12px 16px", background: selected === correct ? "linear-gradient(135deg, #f0fdf4, #ecfdf5)" : "linear-gradient(135deg, #fffbeb, #fef3c7)", border: `1px solid ${selected === correct ? "#bbf7d0" : "#fde68a"}`, borderRadius: 12, fontSize: 14, color: selected === correct ? "#15803d" : "#92400e", lineHeight: 1.6 }
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

  const renderExplainBack = () => {
    const submitExplanation = async () => {
      if (!explainInput.trim() || explainLoading) return;
      setExplainLoading(true);
      try {
        const complete = window.brainComplete || ((a) => window.claude.complete(a));
        const reply = await complete({
          system: `You are grading a student's explanation. They were asked: "${s.prompt}". The ideal answer covers: ${s.ideal}. Grade their attempt — be encouraging but honest. If they missed key points, name them specifically. If they nailed it, tell them what was good. 2-3 sentences max. End with a score: ⭐ (weak), ⭐⭐ (okay), ⭐⭐⭐ (great).`,
          messages: [{ role: "user", content: explainInput }],
        });
        setExplainFeedback(reply);
        const stars = (reply.match(/⭐/g) || []).length;
        setXp((x) => x + (stars >= 3 ? 30 : stars >= 2 ? 20 : 10));
      } catch {
        setExplainFeedback("Couldn't check your answer right now — but writing it out is the learning! Keep going.");
      }
      setExplainLoading(false);
    };

    return React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
      React.createElement("div", { style: { background: "var(--surface-card)", border: "2px solid #7c3aed", borderRadius: 16, padding: 24 } },
        React.createElement("div", { style: { marginBottom: 14 } }, _badge("linear-gradient(135deg,#7c3aed,#6366f1)", "white", "🧠 EXPLAIN IT BACK")),
        React.createElement("p", { style: { fontWeight: 600, fontSize: 16, margin: "0 0 6px", color: "var(--text-strong)", lineHeight: 1.5 } }, s.prompt),
        React.createElement("p", { style: { fontSize: 12, color: "var(--text-muted)", margin: "0 0 16px" } }, "Explain in your own words — as if teaching a friend."),

        !explainFeedback && React.createElement("div", null,
          React.createElement("textarea", {
            value: explainInput, onChange: (e) => setExplainInput(e.target.value), autoFocus: true,
            placeholder: "In my own words...", rows: 4,
            style: { width: "100%", border: "1.5px solid var(--border-default)", borderRadius: 12, padding: "12px 16px", fontSize: 14, fontFamily: "var(--font-sans)", color: "var(--text-body)", background: "var(--surface-page)", resize: "none", outline: "none", boxSizing: "border-box", lineHeight: 1.5 }
          }),
          React.createElement("div", { style: { marginTop: 10 } },
            _btn(explainLoading ? "Checking..." : "Check my explanation →", submitExplanation, true, !explainInput.trim() || explainLoading))),

        explainFeedback && React.createElement("div", {
          style: { padding: "14px 16px", background: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 12, fontSize: 14, color: "#5b21b6", lineHeight: 1.6 },
          dangerouslySetInnerHTML: { __html: _md(explainFeedback) }
        })),
      explainFeedback && React.createElement("div", { style: { marginTop: 16 } }, _btn("Continue →", advance, true, false)));
  };

  const renderMathLine = (text) => {
    if (_isMath(text)) {
      return React.createElement("div", {
        style: { background: "linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%)", borderRadius: 10, padding: "10px 16px", margin: "6px 0", textAlign: "center", fontSize: 17, fontWeight: 600, fontFamily: "var(--font-mono, monospace)", color: "#4338ca", letterSpacing: "0.02em" }
      }, text);
    }
    return React.createElement("div", { style: { fontSize: 14, color: "var(--text-body)", lineHeight: 1.6 }, dangerouslySetInnerHTML: { __html: _md(text) } });
  };

  const renderWorkedExample = () => {
    const steps = s.steps || [];
    const allVisible = stepsRevealed >= steps.length;
    return React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
      React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24, borderLeft: "var(--border-accent-width) solid #8b5cf6" } },
        React.createElement("div", { style: { marginBottom: 14 } }, _badge("#f5f3ff", "#7c3aed", "📝 WORKED EXAMPLE")),
        s.title && React.createElement("h3", { style: { margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "var(--text-strong)" } }, s.title),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 0 } },
          ...steps.map((st, i) => {
            const vis = i < stepsRevealed;
            return React.createElement("div", {
              key: i,
              style: { display: "flex", gap: 12, padding: "14px 0", borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none", opacity: vis ? 1 : 0.25, transform: vis ? "translateY(0)" : "translateY(4px)", transition: "opacity 0.4s, transform 0.4s" }
            },
              React.createElement("div", { style: { width: 28, height: 28, borderRadius: "50%", background: vis ? "linear-gradient(135deg,#7c3aed,#6366f1)" : "var(--surface-muted)", color: vis ? "white" : "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, transition: "background 0.3s" } }, i + 1),
              React.createElement("div", { style: { flex: 1 } },
                React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: vis ? "#7c3aed" : "var(--text-faint)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" } }, st.label),
                vis && renderMathLine(st.content)));
          })),
        !allVisible && React.createElement("div", { style: { marginTop: 14 } },
          React.createElement("button", {
            onClick: () => setStepsRevealed((n) => n + 1),
            style: { width: "100%", padding: "12px 20px", background: "none", border: "1.5px dashed #c4b5fd", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "#7c3aed", cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all 0.15s" }
          }, stepsRevealed === 0 ? "Reveal first step →" : `Reveal step ${stepsRevealed + 1} →`)),
        allVisible && s.challenge && React.createElement("div", { style: { marginTop: 14, background: "linear-gradient(135deg, #fefce8, #fef9c3)", border: "1px solid #fde68a", borderRadius: 12, padding: "14px 16px", fontSize: 14, color: "#92400e" } }, "🎯 Now you try: ", React.createElement("strong", null, s.challenge))),
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
      case "explain_back": return renderExplainBack();
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

  // ─── Difficulty panel (compact pills) ───────────────────────────────────────
  const topicKey = `${topic}::${resolved?.examId || "any"}`;
  const currentVote = getDiffVote(topicKey);
  const DIFF_OPTIONS = [
    { v: -2, emoji: "😵", label: "Hard" },
    { v:  0, emoji: "👍", label: "OK" },
    { v:  2, emoji: "🥱", label: "Easy" },
  ];

  const renderDiffPills = () => React.createElement("div", {
    style: { display: "flex", gap: 6, alignItems: "center" }
  },
    React.createElement("span", { style: { fontSize: 11, color: "var(--text-faint)", fontWeight: 600 } }, "Difficulty:"),
    ...DIFF_OPTIONS.map(({ v, emoji, label }) =>
      React.createElement("button", {
        key: v,
        onClick: () => { saveDiffVote(topicKey, v); setDiffVoted(true); },
        style: {
          display: "flex", alignItems: "center", gap: 3, padding: "3px 8px",
          background: currentVote === v ? "#eef2ff" : "transparent",
          border: currentVote === v ? "1px solid #c7d2fe" : "1px solid var(--border-subtle)",
          borderRadius: 12, fontSize: 11, cursor: "pointer",
          color: currentVote === v ? "#4f46e5" : "var(--text-muted)",
          fontFamily: "var(--font-sans)", fontWeight: currentVote === v ? 600 : 400,
        }
      }, emoji, " ", label)));

  // Meta-strip info
  const examName = resolved ? ((window.getBrain ? window.getBrain() : {}).examViews || []).find((e) => e.id === resolved.examId)?.name || "" : "";
  const estTotalMin = plan.estimatedMinutes || Math.max(2, Math.round(totalSteps * 0.5));

  return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)" } },
    // First-time Learn coachmark — dismissible, never reappears once seen
    showLearnTooltip && React.createElement("div", {
      style: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
      onClick: dismissLearnTooltip,
    },
      React.createElement("div", {
        style: { background: "var(--surface-card)", borderRadius: 20, padding: "28px 26px", maxWidth: 360, boxShadow: "0 24px 60px rgba(0,0,0,0.3)", animation: "fadeUp 0.3s ease-out" },
        onClick: (e) => e.stopPropagation(),
      },
        React.createElement("span", { style: { fontSize: 36 } }, "🧠"),
        React.createElement("h2", { style: { fontSize: 18, fontWeight: 700, color: "var(--text-strong)", margin: "12px 0 8px" } }, "Welcome to Learn"),
        React.createElement("p", { style: { fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 10px" } },
          "This is a structured lesson — a few short steps that teach a concept, then check you understood it right away."),
        React.createElement("p", { style: { fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 20px" } },
          "Rate each step's difficulty as you go, or tap ", React.createElement("strong", null, "Ask AI"), " (bottom-right) any time you want something explained differently."),
        React.createElement("button", {
          onClick: dismissLearnTooltip,
          style: { width: "100%", padding: "12px 0", background: "#4f46e5", color: "white", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }
        }, "Got it →"))),
    // Progress header
    React.createElement("div", { style: { padding: "12px 20px 0" } },
      // Meta-strip
      step === 0 && React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10, alignItems: "center" } },
        React.createElement("span", { style: { fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 } }, "⏱ ~", estTotalMin, " min"),
        examName && React.createElement("span", { style: { fontSize: 12, color: "var(--text-muted)" } }, "·"),
        examName && React.createElement("span", { style: { fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 } }, "📚 ", examName),
        React.createElement("span", { style: { fontSize: 12, color: "var(--text-muted)" } }, "·"),
        React.createElement("span", { style: { fontSize: 12, color: "var(--text-muted)" } }, totalSteps, " steps")),
      // Step counter + stats row
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } },
        React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "var(--text-strong)" } }, `Step ${step + 1} of ${totalSteps}`),
        React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center", fontSize: 12, color: "var(--text-muted)" } },
          totalAnswered > 0 && React.createElement("span", { style: { background: "#f0fdf4", color: "#15803d", padding: "2px 8px", borderRadius: 10, fontWeight: 600, fontSize: 11 } }, `${correctCount}/${totalAnswered} ✓`),
          estMinsLeft && React.createElement("span", null, `~${estMinsLeft}m left`)),
      ),
      // Progress bar
      React.createElement("div", { style: { height: 5, background: "var(--surface-muted)", borderRadius: 3, overflow: "hidden" } },
        React.createElement("div", { style: { height: "100%", width: "100%", transform: `scaleX(${pct / 100})`, transformOrigin: "left", background: "linear-gradient(90deg,#6366f1,#7c3aed)", borderRadius: 3, transition: "transform 0.4s ease" } })),
      // Bottom row: title + exit
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 } },
        React.createElement("span", { style: { fontSize: 12, color: "var(--text-faint)", fontWeight: 500 } }, plan.title),
        React.createElement("button", { onClick: () => { commitResults(); onExit(); }, style: { fontSize: 11, color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", textDecoration: "underline" } }, "Exit")),
      // Difficulty pills (shown after first answer)
      totalAnswered > 0 && !diffVoted && React.createElement("div", { style: { marginTop: 8, animation: "fadeUp 0.3s ease-out" } }, renderDiffPills())),

    // Step content — clicking outside diff panel closes it
    React.createElement("div", {
      style: { flex: 1, overflowY: "auto", padding: "20px 20px 80px" },
      onClick: () => { if (showDiffPanel) setShowDiffPanel(false); }
    }, renderStep()),

    // ── Ask AI floating button + mini-chat ──
    React.createElement("div", { style: { position: "fixed", bottom: 24, right: 24, zIndex: 100 } },
      // Mini-chat panel
      askOpen && React.createElement("div", {
        style: { position: "absolute", bottom: 56, right: 0, width: 320, maxHeight: 380, background: "var(--surface-card)", border: "1.5px solid var(--indigo-500)", borderRadius: 16, boxShadow: "0 12px 40px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", animation: "fadeUp 0.2s ease-out", overflow: "hidden" }
      },
        // Header
        React.createElement("div", { style: { padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 8 } },
          React.createElement(CoachIcon, { size: 24 }),
          React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "var(--text-strong)", flex: 1 } }, "Ask about this step"),
          React.createElement("button", { onClick: () => setAskOpen(false), style: { background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "var(--text-muted)", padding: 0 } }, "✕")),
        // Reply area
        React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "12px 16px", minHeight: 80 } },
          askReply
            ? React.createElement("div", { style: { fontSize: 13, color: "var(--text-body)", lineHeight: 1.65 }, dangerouslySetInnerHTML: { __html: _md(askReply) } })
            : askLoading
              ? React.createElement("div", { style: { display: "flex", gap: 5, padding: "20px 0", justifyContent: "center" } },
                  ...[0, 1, 2].map((d) => React.createElement("span", { key: d, style: { width: 7, height: 7, borderRadius: "50%", background: "#6366f1", animation: "loadDot 1.2s ease-in-out infinite", animationDelay: d * 0.2 + "s" } })))
              : React.createElement("p", { style: { fontSize: 12, color: "var(--text-muted)", margin: 0 } }, "Ask anything about this step — I'll explain it differently, give a hint, or go deeper.")),
        // Input
        React.createElement("div", { style: { padding: "10px 12px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 8 } },
          React.createElement("input", {
            value: askInput, onChange: (e) => setAskInput(e.target.value), autoFocus: true,
            placeholder: "e.g. Why is this the answer?",
            onKeyDown: (e) => {
              if (e.key === "Enter" && askInput.trim() && !askLoading) {
                const q = askInput.trim();
                setAskInput(""); setAskReply(null); setAskLoading(true);
                const stepCtx = s ? `Current step: ${JSON.stringify({ type: s.type, title: s.title, question: s.question || s.statement || s.prompt || "", body: s.body || "" })}` : "";
                (window.brainComplete || ((a) => window.claude.complete(a)))({
                  system: `You're a tutor answering a quick question DURING a lesson on "${topic}". ${stepCtx}\nBe concise — 2-4 sentences max. Use **bold** for key terms. Don't repeat what the step already says; add new insight.`,
                  messages: [{ role: "user", content: q }],
                }).then((r) => { setAskReply(r); setAskLoading(false); })
                  .catch(() => { setAskReply("Couldn't get an answer right now — try again."); setAskLoading(false); });
              }
            },
            style: { flex: 1, border: "1px solid var(--border-default)", borderRadius: 10, padding: "8px 12px", fontSize: 13, fontFamily: "var(--font-sans)", color: "var(--text-body)", background: "var(--surface-page)", outline: "none" }
          }),
          React.createElement("button", {
            disabled: !askInput.trim() || askLoading,
            onClick: () => {
              const q = askInput.trim();
              if (!q || askLoading) return;
              setAskInput(""); setAskReply(null); setAskLoading(true);
              const stepCtx = s ? `Current step: ${JSON.stringify({ type: s.type, title: s.title, question: s.question || s.statement || s.prompt || "", body: s.body || "" })}` : "";
              (window.brainComplete || ((a) => window.claude.complete(a)))({
                system: `You're a tutor answering a quick question DURING a lesson on "${topic}". ${stepCtx}\nBe concise — 2-4 sentences max. Use **bold** for key terms. Don't repeat what the step already says; add new insight.`,
                messages: [{ role: "user", content: q }],
              }).then((r) => { setAskReply(r); setAskLoading(false); })
                .catch(() => { setAskReply("Couldn't get an answer right now — try again."); setAskLoading(false); });
            },
            style: { background: askInput.trim() && !askLoading ? "#4f46e5" : "#c7d2fe", color: "white", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: askInput.trim() && !askLoading ? "pointer" : "default", fontFamily: "var(--font-sans)" }
          }, "Ask"))),
      // Floating button
      React.createElement("button", {
        onClick: () => { setAskOpen((v) => !v); if (!askOpen) { setAskReply(null); setAskInput(""); } },
        style: { width: 48, height: 48, borderRadius: "50%", background: askOpen ? "#4338ca" : "linear-gradient(135deg,#6366f1,#7c3aed)", border: "none", color: "white", fontSize: 22, cursor: "pointer", boxShadow: "0 4px 20px rgba(99,102,241,0.4)", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.15s, background 0.15s" }
      }, askOpen ? "✕" : "💬")));
}

// ─── CHAT MODE (freeform) ────────────────────────────────────────────────────

function ChatMode({ onExit, initialQuery }) {
  // v2 keys — old chat sessions cached a generic greeting bubble that has
  // no place in the dashboard-first layout, so this intentionally starts fresh
  // instead of resurrecting stale messages from the pre-dashboard chat.
  const STORAGE_KEY = "aicoach_chat_msgs_v2";
  const HISTORY_KEY = "aicoach_chat_hist_v2";
  const [messages, setMessages] = React.useState(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } });
  const [input, setInput] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const bodyRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const historyRef = React.useRef((() => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; } })());
  const handled = React.useRef(false);
  const proactiveRef = React.useRef(false);
  // Quick Actions used to guess a topic (weakest[0] or examViews[0]) and fire
  // immediately — with more than one exam, or a stale/mistyped exam in the
  // list, that guess is frequently wrong ("Explain a topic" picking a random
  // unrelated exam). Now it asks first: {action, step:"exam"|"topic", examId}.
  const [pickerFlow, setPickerFlow] = React.useState(null);
  const [pickerSearch, setPickerSearch] = React.useState("");

  const brain = React.useMemo(() => window.getBrain ? window.getBrain() : {}, []);
  const profile = brain.profile || {};
  const name = profile.fullName ? profile.fullName.split(" ")[0] : "";
  const examViews = brain.examViews || [];
  const dueReviews = brain.dueReviews || [];
  const weakest = brain.weakestTopics || [];
  const xpData = window.xpLevel ? window.xpLevel() : null;

  // Nearest exam
  const nextExam = React.useMemo(() => {
    const exams = window.getExams ? window.getExams() : [];
    const now = Date.now();
    return exams.filter((e) => new Date(e.examDate).getTime() > now).sort((a, b) => new Date(a.examDate) - new Date(b.examDate))[0] || null;
  }, []);
  const daysToExam = nextExam ? Math.ceil((new Date(nextExam.examDate).getTime() - Date.now()) / 86400000) : null;

  // Average readiness — only exams with an actual review count, since an
  // unstudied exam's readiness is a neutral placeholder, not a measurement.
  const startedExamViews = examViews.filter((e) => e.started);
  const avgReadiness = startedExamViews.length > 0 ? Math.round(startedExamViews.reduce((a, e) => a + (e.readiness || 0), 0) / startedExamViews.length) : null;

  // Today's Recommendation — prefer a real due review (an already-studied
  // topic whose retention has decayed) over `weakest`, which also contains
  // topics nobody has opened yet (they default to 0% retention and would
  // otherwise always "win" as the weakest, permanently hiding real reviews).
  const recTopic = dueReviews.length > 0 ? dueReviews[0] : (weakest.length > 0 ? weakest[0] : null);
  const recIsReview = dueReviews.length > 0;

  // Suggestion chips — context-aware
  const suggestions = React.useMemo(() => {
    const chips = [];
    if (weakest.length > 0) chips.push({ text: `Explain ${weakest[0].topicName}`, icon: "📖" });
    if (dueReviews.length > 0) chips.push({ text: `Quiz me on ${dueReviews[0].topicName}`, icon: "📝" });
    chips.push({ text: "Summarize my notes", icon: "📄" });
    chips.push({ text: "Make harder questions", icon: "🔥" });
    if (examViews.length > 0) chips.push({ text: `Test my ${examViews[0].name} knowledge`, icon: "🎯" });
    chips.push({ text: "Create flashcards", icon: "🗂" });
    return chips.slice(0, 5);
  }, []);

  React.useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); localStorage.setItem(HISTORY_KEY, JSON.stringify(historyRef.current)); } catch {} }, [messages]);
  React.useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [messages, typing]);
  React.useEffect(() => { if (initialQuery && !handled.current) { handled.current = true; setTimeout(() => send(initialQuery), 100); } }, [initialQuery]);

  // Proactive AI message after 3s on first open with no messages. Prefers a
  // real due review (an already-studied topic whose retention decayed) —
  // `weakest` also contains topics nobody has opened yet, which have no real
  // retention to report, so those get an invite instead of a fabricated %.
  React.useEffect(() => {
    if (proactiveRef.current || (!dueReviews.length && !weakest.length) || messages.length > 0) return;
    const t = setTimeout(() => {
      if (proactiveRef.current) return;
      proactiveRef.current = true;
      if (dueReviews.length) {
        const w = dueReviews[0];
        pushAI(`I noticed your **${w.topicName}** retention is at ${Math.round(w.retention * 100)}%. Want me to explain it or run 5 quick questions?`, [
          { text: "Explain it", icon: "📖" },
          { text: "5 quick questions", icon: "⚡" },
        ]);
      } else {
        const w = weakest[0];
        pushAI(`You haven't started **${w.topicName}** yet. Want a quick intro or 5 practice questions to dive in?`, [
          { text: "Give me an intro", icon: "📖" },
          { text: "5 quick questions", icon: "⚡" },
        ]);
      }
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  const pushAI = (text, actions) => {
    historyRef.current = [...historyRef.current, { role: "assistant", content: text }];
    setMessages((m) => [...m, { id: Date.now() + Math.random(), role: "ai", text, actions }]);
  };

  const send = async (raw) => {
    const text = (typeof raw === "string" ? raw : "").trim();
    if (!text || typing) return;
    historyRef.current = [...historyRef.current, { role: "user", content: text }];
    setMessages((m) => [...m, { id: Date.now() + Math.random(), role: "user", text }]);
    setInput("");
    setTyping(true);
    try {
      const complete = window.brainComplete || ((a) => window.claude.complete(a));
      const prof = window.getProfile ? window.getProfile() : {};
      const profileCtx = [prof.country && `country: ${prof.country}`, prof.educationLevel && `education: ${prof.educationLevel}`, prof.currentYear && `year: ${prof.currentYear}`].filter(Boolean).join(", ");
      // Exam/readiness/weakest-topic context is NOT built here — brainComplete()
      // already injects a fresher, richer version via buildLearnerContext()
      // (ai-brain.jsx). A second copy used to be hand-built from a `brain`
      // snapshot memoized once at mount, so it could silently go stale and
      // disagree with the live one inside the same prompt.
      const reply = await complete({
        system: `You are a brilliant, warm personal tutor.${profileCtx ? ` Student profile: ${profileCtx}.` : ""}
Answer clearly and concisely. Use **bold** for key terms. Keep responses under 100 words. Do NOT output JSON — just write natural text.
After your answer, on a NEW line write "---ACTIONS---" followed by a JSON array of 2-3 follow-up actions the student can take, like: [{"text":"Practice this","icon":"🎯"},{"text":"Explain simpler","icon":"💡"}]
If no actions fit, omit the ACTIONS line entirely.`,
        messages: historyRef.current,
      });
      setTyping(false);
      // Parse actions from response
      let mainText = reply, actions = null;
      const actIdx = reply.indexOf("---ACTIONS---");
      if (actIdx !== -1) {
        mainText = reply.slice(0, actIdx).trim();
        try {
          const actRaw = reply.slice(actIdx + 13).trim();
          actions = JSON.parse(actRaw.slice(actRaw.indexOf("["), actRaw.lastIndexOf("]") + 1));
        } catch {}
      }
      pushAI(mainText, actions);
    } catch (e) {
      setTyping(false);
      pushAI("Connection hiccup — try again in a moment.");
    }
  };

  // A Quick Action was clicked — ask which exam (skipped if there's only
  // one) then which topic, instead of guessing. No exams at all: nothing to
  // pick, so fall back to the old generic phrasing (the AI will just ask).
  function startPicker(actionId) {
    if (examViews.length === 0) { send(QUICK_ACTIONS.find((a) => a.id === actionId).query("a key topic for my exam")); return; }
    setPickerSearch("");
    if (examViews.length === 1) { setPickerFlow({ action: actionId, step: "topic", examId: examViews[0].id }); return; }
    setPickerFlow({ action: actionId, step: "exam" });
  }
  function pickerChooseTopic(topicName) {
    const actionDef = QUICK_ACTIONS.find((a) => a.id === pickerFlow.action);
    send(actionDef.query(topicName));
    setPickerFlow(null);
    setPickerSearch("");
  }

  // Time-of-day greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // ── AI Dashboard — always shown at top ──
  const renderDashboard = () => React.createElement("div", { style: { padding: "20px", display: "flex", flexDirection: "column", gap: 16 } },
    // Hero greeting
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 14, padding: "20px", background: "linear-gradient(135deg,#eef2ff,#e0e7ff)", borderRadius: 18 } },
      React.createElement("div", { style: { position: "relative" } },
        React.createElement(CoachIcon, { size: 48 }),
        React.createElement("div", { style: { position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: "50%", background: "#22c55e", border: "2px solid white" } })),
      React.createElement("div", { style: { flex: 1 } },
        React.createElement("p", { style: { margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-strong)" } }, `${greeting}${name ? `, ${name}` : ""} 👋`),
        React.createElement("p", { style: { margin: "2px 0 0", fontSize: 13, color: "var(--text-muted)" } }, "Ready to study"))),

    // Context cards row
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 } },
      React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "14px 12px", textAlign: "center" } },
        React.createElement("p", { style: { margin: 0, fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" } }, "Readiness"),
        React.createElement("p", { style: { margin: "4px 0 0", fontSize: avgReadiness != null ? 22 : 14, fontWeight: 700, color: avgReadiness == null ? "var(--text-faint)" : avgReadiness >= 70 ? "#15803d" : avgReadiness >= 40 ? "#b45309" : "#b91c1c" } }, avgReadiness != null ? `${avgReadiness}%` : "New")),
      React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "14px 12px", textAlign: "center" } },
        React.createElement("p", { style: { margin: 0, fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" } }, "Next Exam"),
        React.createElement("p", { style: { margin: "4px 0 0", fontSize: 22, fontWeight: 700, color: daysToExam != null && daysToExam <= 7 ? "#b91c1c" : "var(--text-strong)" } }, daysToExam != null ? `${daysToExam}d` : "—")),
      React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "14px 12px", textAlign: "center" } },
        React.createElement("p", { style: { margin: 0, fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" } }, "Reviews Due"),
        React.createElement("p", { style: { margin: "4px 0 0", fontSize: 22, fontWeight: 700, color: dueReviews.length > 0 ? "#b45309" : "#15803d" } }, dueReviews.length))),

    // Today's recommendation
    recTopic && React.createElement("div", {
      onClick: () => send(`Explain ${recTopic.topicName}`),
      style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: "16px 18px", cursor: "pointer" }
    },
      React.createElement("p", { style: { margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" } }, "Today's Recommendation"),
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
        React.createElement("span", { style: { fontSize: 24 } }, recIsReview ? "📖" : "🌱"),
        React.createElement("div", { style: { flex: 1 } },
          React.createElement("p", { style: { margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-strong)" } }, recIsReview ? `Review ${recTopic.topicName}` : `Get started with ${recTopic.topicName}`),
          React.createElement("p", { style: { margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" } }, recIsReview ? `${Math.round(recTopic.retention * 100)}% retention · ~5 min` : "New topic · ~5 min")),
        React.createElement("span", { style: { fontSize: 13, color: "var(--indigo-600)", fontWeight: 600 } }, "Continue →"))),

    // Quick actions grid — asks which exam/topic first (via pickerFlow, see
    // startPicker below) instead of guessing weakest[0]/examViews[0] and
    // firing immediately. That guess was frequently wrong the moment a
    // student had more than one exam, or any stale/mistyped exam in their
    // list — "Explain a topic" could fire off explaining a random exam.
    React.createElement("div", null,
      React.createElement("p", { style: { margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" } }, "Quick Actions"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } },
        ...QUICK_ACTIONS.map((a, i) => React.createElement("button", {
          key: i, onClick: () => startPicker(a.id),
          style: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: 12, cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left" }
        },
          React.createElement("span", { style: { fontSize: 18 } }, a.icon),
          React.createElement("span", { style: { fontSize: 13, fontWeight: 500, color: "var(--text-body)" } }, a.text))))));

  // ── Chat messages — rendered below dashboard ──
  const renderChat = () => React.createElement("div", { style: { padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 12 } },
    ...messages.map((m) =>
      React.createElement(React.Fragment, { key: m.id },
        React.createElement("div", { style: { display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 10, alignItems: "flex-start" } },
          m.role === "ai" && React.createElement(CoachIcon, { size: 28 }),
          React.createElement("div", {
            style: { maxWidth: "80%", background: m.role === "user" ? "#4f46e5" : "var(--surface-card)", color: m.role === "user" ? "white" : "var(--text-body)", border: m.role === "user" ? "none" : "1px solid var(--border-subtle)", padding: "10px 14px", borderRadius: 16, borderTopRightRadius: m.role === "user" ? 4 : 16, borderTopLeftRadius: m.role === "ai" ? 4 : 16, fontSize: 13, lineHeight: 1.65 },
            dangerouslySetInnerHTML: { __html: _md(m.text) }
          })),
        // Action buttons after AI message
        m.role === "ai" && m.actions && Array.isArray(m.actions) && m.actions.length > 0 && React.createElement("div", {
          style: { display: "flex", gap: 6, flexWrap: "wrap", paddingLeft: 38 }
        },
          ...m.actions.map((a, i) => React.createElement("button", {
            key: i, onClick: () => send(a.text),
            style: { display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "var(--surface-card)", border: "1px solid var(--indigo-500)", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "var(--indigo-700)", cursor: "pointer", fontFamily: "var(--font-sans)" }
          }, a.icon && React.createElement("span", null, a.icon), a.text))))),
    typing && React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "flex-start" } },
      React.createElement(CoachIcon, { size: 28 }),
      React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, borderTopLeftRadius: 4, padding: "14px 18px", display: "flex", gap: 5 } },
        ...[0, 1, 2].map((d) => React.createElement("span", { key: d, style: { width: 7, height: 7, borderRadius: "50%", background: "#6366f1", animation: "loadDot 1.2s ease-in-out infinite", animationDelay: d * 0.2 + "s" } })))));

  // Renders the "which exam / which topic" step as an AI-styled chat bubble
  // + selectable pills, appended right below the messages — a natural part
  // of the conversation, not a separate screen.
  const renderPicker = () => {
    if (!pickerFlow) return null;
    const bubble = (text) => React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 } },
      React.createElement(CoachIcon, { size: 28 }),
      React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, borderTopLeftRadius: 4, padding: "10px 14px", fontSize: 13, color: "var(--text-body)" } }, text));
    const cancelBtn = (onClick, label) => React.createElement("button", {
      onClick, style: { alignSelf: "flex-start", border: "none", background: "transparent", color: "var(--text-faint)", fontSize: 12, cursor: "pointer", padding: "6px 0 0", fontFamily: "var(--font-sans)" }
    }, label);

    if (pickerFlow.step === "exam") {
      return React.createElement("div", { style: { padding: "0 20px 16px" } },
        bubble("Which exam would you like to study?"),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8, marginLeft: 38 } },
          ...examViews.map((e) => React.createElement("button", {
            key: e.id, onClick: () => setPickerFlow({ ...pickerFlow, step: "topic", examId: e.id }),
            style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--surface-card)", border: "1.5px solid var(--border-default)", borderRadius: 12, cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left" }
          },
            React.createElement("span", { style: { fontSize: 13, fontWeight: 600, color: "var(--text-strong)" } }, e.name),
            React.createElement("span", { style: { fontSize: 11, color: "var(--text-faint)" } }, e.daysAway != null ? `Exam in ${e.daysAway}d` : ""))),
          cancelBtn(() => setPickerFlow(null), "Cancel")));
    }

    // step === "topic"
    const exam = examViews.find((e) => e.id === pickerFlow.examId);
    const topics = ((exam && exam.topics) || []).map((tp) => ({
      name: tp.topicName || tp.name, retention: tp.lastSeen ? Math.round(tp.retention * 100) : null, unseen: !tp.lastSeen,
    })).sort((a, b) => (a.retention ?? -1) - (b.retention ?? -1));
    const recommended = topics.filter((tp) => tp.unseen || (tp.retention != null && tp.retention < 60)).slice(0, 5);
    const q = pickerSearch.trim().toLowerCase();
    const searched = q ? topics.filter((tp) => tp.name.toLowerCase().includes(q)) : [];
    const cameFromExamStep = examViews.length > 1;

    const topicRow = (tp) => React.createElement("button", {
      key: tp.name, onClick: () => pickerChooseTopic(tp.name),
      style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--surface-card)", border: "1.5px solid var(--border-default)", borderRadius: 12, cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left" }
    },
      React.createElement("span", { style: { fontSize: 13, fontWeight: 600, color: "var(--text-strong)" } }, tp.name),
      React.createElement("span", { style: { fontSize: 11, fontWeight: 700, color: tp.unseen ? "var(--indigo-600)" : tp.retention < 30 ? "#b91c1c" : "#b45309" } }, tp.unseen ? "New" : `${tp.retention}%`));

    return React.createElement("div", { style: { padding: "0 20px 16px" } },
      bubble(exam ? `Great! Which topic in ${exam.name} should we focus on?` : "Which topic should we focus on?"),
      React.createElement("div", { style: { marginLeft: 38, display: "flex", flexDirection: "column", gap: 10 } },
        topics.length === 0 && React.createElement("p", { style: { fontSize: 12, color: "var(--text-faint)", margin: 0 } }, "No topics yet for this exam — try asking in your own words below."),
        recommended.length > 0 && !q && React.createElement("div", null,
          React.createElement("p", { style: { fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" } }, "AI Recommended"),
          React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, ...recommended.map(topicRow))),
        q && React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } },
          searched.length > 0 ? searched.map(topicRow) : React.createElement("p", { style: { fontSize: 12, color: "var(--text-faint)", margin: 0 } }, "No matching topics.")),
        topics.length > 0 && React.createElement("input", {
          value: pickerSearch, onChange: (e) => setPickerSearch(e.target.value), placeholder: "Search topic…",
          style: { padding: "9px 12px", fontSize: 12, fontFamily: "var(--font-sans)", border: "1px solid var(--border-default)", borderRadius: 10, outline: "none", background: "var(--surface-page)" }
        }),
        cancelBtn(() => cameFromExamStep ? setPickerFlow({ action: pickerFlow.action, step: "exam" }) : setPickerFlow(null), cameFromExamStep ? "← Back" : "Cancel")));
  };

  return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)" } },
    // Header
    React.createElement("div", { style: { padding: "10px 20px", borderBottom: "1px solid var(--border-subtle)", background: "var(--surface-card)", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 48 } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
        React.createElement("div", { style: { position: "relative" } },
          React.createElement(CoachIcon, { size: 28 }),
          React.createElement("div", { style: { position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", background: "#22c55e", border: "2px solid var(--surface-card)" } })),
        React.createElement("div", null,
          React.createElement("span", { style: { fontSize: 14, fontWeight: 700, color: "var(--text-strong)" } }, "AI Coach"),
          React.createElement("span", { style: { fontSize: 11, color: "#059669", marginLeft: 8 } }, "Ready to help"))),
      React.createElement("button", { onClick: () => { try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(HISTORY_KEY); } catch {} onExit(); }, style: { background: "transparent", border: "1px solid var(--border-default)", color: "var(--text-muted)", borderRadius: 8, padding: "3px 10px", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-sans)" } }, "Exit")),

    // Single scrollable area: dashboard always on top, chat messages below
    React.createElement("div", { ref: bodyRef, style: { flex: 1, overflowY: "auto", background: "var(--surface-page)" } },
      renderDashboard(),
      messages.length > 0 && React.createElement("div", { style: { borderTop: "1px solid var(--border-subtle)", margin: "0 20px" } }),
      messages.length > 0 && renderChat(),
      renderPicker()),

    // Suggestion chips (shown when input is empty and not typing)
    !typing && !input.trim() && messages.length > 0 && React.createElement("div", { style: { padding: "6px 16px", display: "flex", gap: 6, overflowX: "auto", background: "var(--surface-page)" } },
      ...suggestions.map((s, i) => React.createElement("button", {
        key: i, onClick: () => send(s.text),
        style: { display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: 20, fontSize: 11, fontWeight: 500, color: "var(--text-body)", cursor: "pointer", fontFamily: "var(--font-sans)", whiteSpace: "nowrap", flexShrink: 0 }
      }, React.createElement("span", null, s.icon), s.text))),

    // Input area
    React.createElement("div", { style: { padding: "12px 16px", borderTop: "1px solid var(--border-subtle)", background: "var(--surface-card)", display: "flex", gap: 8, alignItems: "flex-end" } },
      React.createElement("textarea", { ref: inputRef, value: input, onChange: (e) => setInput(e.target.value), onKeyDown: (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }, placeholder: "Ask anything…", rows: 1, style: { flex: 1, border: "1px solid var(--border-default)", borderRadius: 12, padding: "10px 14px", fontSize: 13, fontFamily: "var(--font-sans)", color: "var(--text-body)", background: "var(--surface-page)", resize: "none", outline: "none", lineHeight: 1.5, maxHeight: 100, overflowY: "auto" } }),
      React.createElement("button", { onClick: () => send(input), disabled: !input.trim() || typing, style: { background: input.trim() && !typing ? "#4f46e5" : "#c7d2fe", color: "white", border: "none", borderRadius: 12, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: input.trim() && !typing ? "pointer" : "default", fontFamily: "var(--font-sans)" } }, "Send")));
}

// ─── MAIN ROUTER ─────────────────────────────────────────────────────────────

function AIChat({ t, initialQuery, onConsumeQuery }) {
  const [mode, setMode] = React.useState(null);
  const [topic, setTopic] = React.useState(null);
  const [topicPicker, setTopicPicker] = React.useState(false);
  const [reviewTopic, setReviewTopic] = React.useState(null);
  // Captured copy of a plain-string initialQuery, decoupled from the prop
  // itself. onConsumeQuery() nulls the PARENT's chatQuery in the same effect
  // that sets mode:"chat" here — React renders this component with its
  // latest props+state together, so by the time ChatMode mounts, the
  // initialQuery PROP has already gone back to null and ChatMode's own
  // "send it once" effect never fires. Stashing the value in local state
  // before consuming it sidesteps that race entirely.
  const [pendingChatQuery, setPendingChatQuery] = React.useState(null);

  const brain = React.useMemo(() => window.getBrain ? window.getBrain() : {}, []);
  const examViews = brain.examViews || [];
  const dueReviews = brain.dueReviews || [];
  const weakest = brain.weakestTopics || [];
  const profile = brain.profile || {};
  const name = profile.fullName ? profile.fullName.split(" ")[0] : null;

  React.useEffect(() => {
    if (initialQuery && onConsumeQuery) {
      if (typeof initialQuery === "object" && initialQuery.mode === "learn" && initialQuery.topic) {
        setTopic(initialQuery.topic);
        setMode("learn");
      } else {
        setPendingChatQuery(initialQuery);
        setMode("chat");
      }
      onConsumeQuery();
    }
  }, [initialQuery]);

  const exitToLobby = () => { setMode(null); setTopic(null); setTopicPicker(false); setReviewTopic(null); };
  // Finishing one review returns to the QUEUE (not the lobby) so "clear the
  // stack" is one continuous flow — the queue re-derives from the brain, so
  // the topic just reviewed drops out or shows its new retention.
  const exitToQueue = () => setReviewTopic(null);

  // Active mode screens
  if (mode === "learn" && topic) return React.createElement(LessonEngine, { topic, mode: "learn", onExit: exitToLobby });
  if (mode === "chat") return React.createElement(ChatMode, { onExit: exitToLobby, initialQuery: pendingChatQuery });

  // Review mode — Quick Check session from the queue
  if (mode === "review" && reviewTopic) {
    const isQuick = reviewTopic === "__quick__";
    const quickTopic = isQuick ? ((brain.dueReviews || [])[0]?.topicName || (brain.weakestTopics || [])[0]?.topicName || "General review") : null;
    return React.createElement(QuickCheckEngine, {
      topic: isQuick ? quickTopic : reviewTopic,
      onExit: exitToQueue,
    });
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
        React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: "var(--indigo-600)", flexShrink: 0 } }, "Check →"));
    };

    return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)", padding: "24px 20px", overflowY: "auto" } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 } },
        React.createElement("button", { onClick: exitToLobby, style: { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted)", padding: 0 } }, "←"),
        React.createElement("h2", { style: { margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-strong)" } }, "⚡ Quick Check")),
      React.createElement("p", { style: { margin: "0 0 14px 28px", fontSize: 13, color: "var(--text-muted)" } },
        queue.length > 0
          ? `${queue.length} ${queue.length === 1 ? "topic is" : "topics are"} fading — weakest first.`
          : "Nothing is due right now."),

      // Quick Check all button
      (queue.length > 0 || weakFallback.length > 0) && React.createElement("button", {
        onClick: () => setReviewTopic("__quick__"),
        style: { display: "flex", alignItems: "center", gap: 12, margin: "0 0 16px", padding: "14px 18px", background: "linear-gradient(135deg,#eef2ff,#e0e7ff)", border: "1.5px solid var(--indigo-500)", borderRadius: 14, cursor: "pointer", fontFamily: "var(--font-sans)", width: "100%" }
      },
        React.createElement("span", { style: { fontSize: 24 } }, "⚡"),
        React.createElement("div", { style: { flex: 1, textAlign: "left" } },
          React.createElement("p", { style: { margin: 0, fontSize: 14, fontWeight: 700, color: "var(--indigo-700)" } }, "Quick Check — All Topics"),
          React.createElement("p", { style: { margin: "2px 0 0", fontSize: 12, color: "var(--indigo-600)" } }, "5 questions · ~2 min · see your score")),
        React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "var(--indigo-600)" } }, "Go →")),

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

  // Practice mode — full exam simulator with confidence + why
  if (mode === "practice") {
    return React.createElement(PracticeEngine, { examViews, onExit: exitToLobby });
  }

  // Speed Round mode
  if (mode === "speed") {
    return React.createElement(SpeedRoundEngine, { examViews, onExit: exitToLobby });
  }

  // Exam Simulation — full timed mock exam covering ALL topics of one subject
  if (mode === "exam_sim") {
    return React.createElement(ExamSimEngine, { examViews, onExit: exitToLobby });
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
