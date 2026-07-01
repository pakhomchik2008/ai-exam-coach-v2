// AI Exam Coach — AI Coach v5: a real tutoring experience, not a chatbot.
//
// Four learning modes, each with its own UX:
//   LEARN    — structured lessons with teach→check→practice loops
//   REVIEW   — spaced-repetition flashcard drill on fading topics
//   PRACTICE — exam-style questions, timed, scored
//   CHAT     — freeform Q&A for when the student just wants to ask
//
// Rich card types that feel like a lesson, not a message:
//   lesson        — full-width teaching block with key takeaway
//   quiz          — MCQ with difficulty badge + explanation
//   worked_example — step-by-step reveal
//   explain_back  — student explains in own words, AI evaluates
//   flashcard     — flip card with self-rating
//   summary       — session/topic summary with next steps

// ─── Utilities ───────────────────────────────────────────────────────────────

function TypingHint() {
  const [slow, setSlow] = React.useState(false);
  React.useEffect(() => { const id = setTimeout(() => setSlow(true), 4000); return () => clearTimeout(id); }, []);
  if (!slow) return null;
  return React.createElement("span", { style: { fontSize: 12, color: "var(--text-faint)", marginLeft: 8 } }, "Still thinking…");
}

const COACH_MODES = [
  { id: "learn", emoji: "🧠", label: "Learn", desc: "Structured lesson" },
  { id: "review", emoji: "⚡", label: "Review", desc: "Spaced repetition" },
  { id: "practice", emoji: "🎯", label: "Practice", desc: "Exam questions" },
  { id: "chat", emoji: "💬", label: "Chat", desc: "Ask anything" },
];

// ─── Main Component ──────────────────────────────────────────────────────────

function AIChat({ t, initialQuery, onConsumeQuery }) {
  const STORAGE_KEY = "aicoach_v5_msgs";
  const HISTORY_KEY = "aicoach_v5_hist";
  const SESSION_KEY = "aicoach_v5_sess";
  const MODE_KEY = "aicoach_v5_mode";

  // ─── State ─────────────────────────────────────────────────────────────────
  const [messages, setMessages] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  });
  const [cardStates, setCardStates] = React.useState({});
  const [input, setInput] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const [mode, setMode] = React.useState(() => {
    try { return localStorage.getItem(MODE_KEY) || null; } catch { return null; }
  });
  const [activeTopic, setActiveTopic] = React.useState(null);
  const [stepsRevealed, setStepsRevealed] = React.useState({});
  const bodyRef = React.useRef(null);
  const handled = React.useRef(false);
  const historyRef = React.useRef((() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
  })());
  const sessionRef = React.useRef((() => {
    try {
      const s = localStorage.getItem(SESSION_KEY);
      return s ? JSON.parse(s) : (window.createCoachSession ? window.createCoachSession() : { startedAt: Date.now(), topicsCovered: [], quizResults: [], conceptsTaught: 0, diagnosedWeaknesses: [], diagnosedStrengths: [] });
    } catch { return { startedAt: Date.now(), topicsCovered: [], quizResults: [], conceptsTaught: 0, diagnosedWeaknesses: [], diagnosedStrengths: [] }; }
  })());

  // ─── Persistence ───────────────────────────────────────────────────────────
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(historyRef.current));
      if (sessionRef.current) localStorage.setItem(SESSION_KEY, JSON.stringify(sessionRef.current));
      if (mode) localStorage.setItem(MODE_KEY, mode);
    } catch {}
  }, [messages, mode]);

  React.useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, typing]);

  React.useEffect(() => {
    if (initialQuery && !handled.current) {
      handled.current = true;
      if (onConsumeQuery) onConsumeQuery();
      setMode("chat");
      setTimeout(() => send(initialQuery), 100);
    }
  }, [initialQuery]);

  // ─── Brain helpers ─────────────────────────────────────────────────────────
  const brain = React.useMemo(() => window.getBrain ? window.getBrain() : {}, [messages]);
  const examViews = brain.examViews || [];
  const dueReviews = brain.dueReviews || [];
  const weakest = brain.weakestTopics || [];
  const profile = brain.profile || {};
  const memory = brain.memory || {};
  const name = profile.fullName ? profile.fullName.split(" ")[0] : null;

  const sess = sessionRef.current;
  const sessQuizzes = sess.quizResults.length;
  const sessCorrect = sess.quizResults.filter((r) => r.correct).length;

  // ─── Topic detection & brain write-back ────────────────────────────────────
  const detectTopic = (text) => {
    if (!text || !window.resolveTopicForBrain) return;
    const r = window.resolveTopicForBrain(text);
    if (r && sess) {
      if (!sess.topicsCovered.some((t) => t.examId === r.examId && t.topicIdx === r.topicIdx)) {
        sess.topicsCovered.push(r);
      }
      setActiveTopic(r);
    }
  };

  const recordQuiz = (card, idx) => {
    const correct = idx === card.correct;
    sess.quizResults.push({ correct, topicName: activeTopic?.topicName || "unknown", question: card.question });
    if (!correct) sess.conceptsTaught++;
    if (activeTopic && window.recordReview) window.recordReview(activeTopic.examId, activeTopic.topicIdx, correct);
    if (!correct && activeTopic && window.logMistake)
      window.logMistake({ topic: activeTopic.topicName, question: card.question, chosen: card.options[idx], correct: card.options[card.correct], examId: activeTopic.examId, topicIdx: activeTopic.topicIdx });
  };

  const recordConfidence = (value) => {
    if (!activeTopic) return;
    const map = { got_it: 5, not_sure: 3, confused: 1 };
    if (window.recordConfidence && map[value]) window.recordConfidence(activeTopic.examId, activeTopic.topicIdx, map[value]);
    if (value === "got_it" && !sess.diagnosedStrengths.includes(activeTopic.topicName)) sess.diagnosedStrengths.push(activeTopic.topicName);
    if (value === "confused" && !sess.diagnosedWeaknesses.includes(activeTopic.topicName)) sess.diagnosedWeaknesses.push(activeTopic.topicName);
  };

  const recordFlashcard = (rating) => {
    if (!activeTopic) return;
    const correct = rating !== "again";
    if (window.recordReview) window.recordReview(activeTopic.examId, activeTopic.topicIdx, correct);
  };

  // ─── System prompt per mode ────────────────────────────────────────────────
  const buildSystemPrompt = () => {
    const modeInstructions = {
      learn: `MODE: STRUCTURED LESSON
You are conducting a lesson. Follow this flow strictly:
1. DIAGNOSE — ask 1 probing question to gauge the student's level on this topic. Use a "quiz" card for this.
2. TEACH — based on their answer, teach ONE concept using a "lesson" card. Include a key takeaway.
3. CHECK — immediately follow with either:
   - A "quiz" card to test the concept you just taught
   - An "explain_back" card asking them to explain in their own words
4. PRACTICE — if they got it right, give a "worked_example" card showing how this applies
5. ADVANCE — move to the next concept and repeat from step 2
Every 3-4 concepts, use a "confidence" card. After 5-6 concepts, use a "summary" card.
Never teach two concepts in a row without checking understanding between them.`,

      review: `MODE: SPACED REPETITION REVIEW
You are running a rapid review drill on topics the student has studied before but is forgetting.
1. Present each topic as a "flashcard" card — question on front, answer on back
2. After the student rates themselves, move immediately to the next card
3. Keep the pace fast — no lengthy explanations unless they rate "again"
4. If they rate "again", briefly re-teach the concept (max 2 sentences) then give another flashcard
5. After 5 cards, show a mini "summary" card with their recall rate
Focus on the topics from the DUE FOR REVIEW list in the learner context.`,

      practice: `MODE: EXAM PRACTICE
You are an exam coach running timed practice. Be strict, exam-focused.
1. Give exam-style "quiz" cards — harder than learning mode, matching the exam board's style
2. After each answer, give brief targeted feedback (1 sentence)
3. If wrong, explain the mark scheme point they missed, then immediately give the next question
4. Every 5 questions, show a "summary" card with score and weak areas identified
5. Mix topics within the same subject to simulate real exam conditions
Questions should be realistic exam difficulty. Reference the exam board and target grade.`,

      chat: `MODE: FREE CHAT
The student wants to ask you something freely. Be a brilliant, warm tutor.
- Answer their question clearly and concisely
- Use "lesson" cards for teaching explanations
- Use "quiz" cards to check understanding when appropriate
- Use "worked_example" cards for step-by-step solutions
- You can teach ANY subject, not just their enrolled exams
- Keep responses focused — teach one thing at a time, then check understanding`,
    };

    return `You are an exceptional personal tutor — not a chatbot, not an AI assistant, a TUTOR. You drive the session. You decide what to teach next based on what you know about this student. You are warm but demanding. You celebrate real progress and gently push through struggles.

${modeInstructions[mode] || modeInstructions.chat}

${memory.learningStyle ? `This student learns best with: ${memory.learningStyle}.` : ""}
${memory.preferredExplanations?.length ? `Explanations that worked before: ${memory.preferredExplanations.join(", ")}.` : ""}
Session so far: ${sess.topicsCovered.length} topics, ${sessQuizzes} quizzes (${sessCorrect} correct).

⚠️ RESPONSE FORMAT — your ENTIRE response must be valid JSON. { to }. No markdown fences. Nothing before or after.

{"text":"...","actions":null,"card":null}

━━━ TEXT ━━━
Max 50 words. Warm, direct. **bold** key terms. End with a question or direction.
Omit text entirely (set to "") when the card speaks for itself.

━━━ ACTIONS (or null) ━━━
2-4 contextual buttons: ["Got it, next concept", "Explain differently", "Show me an example"]
These should feel like what a student would naturally say to a tutor, not generic chat replies.

━━━ CARD TYPES ━━━

"lesson" — for teaching a concept:
{"type":"lesson","title":"The Derivative","body":"A derivative measures the **rate of change** of a function at any point. Think of it as the slope of the curve — how steep the hill is right where you're standing.","keyTakeaway":"Derivative = instantaneous rate of change = slope at a point","example":"If f(x) = x², then f'(x) = 2x. At x=3, the slope is 6."}

"quiz" — for testing understanding:
{"type":"quiz","difficulty":"medium","question":"What does f'(3) = 6 tell us?","options":["f(3) = 6","The slope at x=3 is 6","The area under the curve is 6","f has 6 roots"],"correct":1,"explanation":"f'(3) is the derivative at x=3, meaning the instantaneous slope of the curve at that point is 6.","source":"exam"}
difficulty: "easy" | "medium" | "hard" | "exam"
source: "concept" | "exam" | "materials" (if from their uploaded notes)

"explain_back" — student explains in own words:
{"type":"explain_back","prompt":"In your own words, what is a derivative and why do we care about it?","hint":"Think about what it tells us about how a function behaves...","evaluationCriteria":"Should mention rate of change or slope. Bonus: mention applications like velocity or optimization."}

"worked_example" — step-by-step solution:
{"type":"worked_example","title":"Finding the derivative of x³ + 2x","steps":[{"label":"Apply power rule to x³","content":"Bring down the power: 3x²"},{"label":"Apply power rule to 2x","content":"The derivative of 2x is just 2"},{"label":"Combine","content":"f'(x) = 3x² + 2"}],"challenge":"Now you try: find the derivative of 4x³ - x² + 7"}

"flashcard" — for review mode:
{"type":"flashcard","front":"What is the powerhouse of the cell?","back":"The **mitochondria** — it produces ATP through cellular respiration.","topic":"Cell Biology"}

"menu" — for topic/subject selection:
{"type":"menu","label":"Pick a topic","items":[{"emoji":"📐","text":"Algebra"},...]}

"confidence" — periodic check-in:
{"type":"confidence"}

"summary" — session/topic summary:
{"type":"summary","title":"Derivatives — Lesson Complete","covered":["What a derivative is","Power rule","Chain rule basics"],"score":"3/4 quiz questions correct","insight":"You're solid on the power rule but chain rule needs more practice.","next":"Ready to tackle the product rule next?"}`;
  };

  // ─── Markdown renderer ─────────────────────────────────────────────────────
  const md = (text) => {
    if (!text) return "";
    let h = text
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*\n]+?)\*/g, "<em>$1</em>")
      .replace(/`([^`\n]+?)`/g, "<code style='background:#f1f5f9;padding:2px 5px;border-radius:4px;font-size:0.92em'>$1</code>");
    return h;
  };

  // ─── Response parser ───────────────────────────────────────────────────────
  const parse = (raw) => {
    try {
      const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
      if (s < 0 || e < 0) return { text: raw, actions: null, card: null };
      const j = JSON.parse(raw.slice(s, e + 1));
      return {
        text: j.text || "",
        actions: Array.isArray(j.actions) && j.actions.length ? j.actions : null,
        card: j.card || null,
      };
    } catch { return { text: raw, actions: null, card: null }; }
  };

  // ─── AI communication ─────────────────────────────────────────────────────
  const pushAI = ({ text, actions, card, isError }) => {
    const id = Date.now() + Math.random();
    if (!isError && text) historyRef.current = [...historyRef.current, { role: "assistant", content: text + (card ? ` [card:${card.type}]` : "") }];
    setMessages((m) => [...m, { id, role: "ai", text, actions, card, isError }]);
  };

  const callAI = async () => {
    setTyping(true);
    try {
      const complete = window.brainComplete || ((a) => window.claude.complete(a));
      const topicContext = activeTopic ? { examId: activeTopic.examId, topicName: activeTopic.topicName } : undefined;
      const raw = await complete({ system: buildSystemPrompt(), messages: historyRef.current, topicContext });
      setTyping(false);
      const parsed = parse(raw);
      if (parsed.card?.type === "quiz" || parsed.card?.type === "lesson") sess.conceptsTaught++;
      pushAI(parsed);
    } catch (e) {
      setTyping(false);
      console.error("AI Coach error:", e);
      pushAI({ text: "Connection hiccup — try again in a moment.", actions: ["🔄 Retry"], card: null, isError: true });
    }
  };

  const send = (rawText) => {
    const text = (rawText || "").trim();
    if (!text || typing) return;
    historyRef.current = [...historyRef.current, { role: "user", content: text }];
    setMessages((m) => [...m, { id: Date.now() + Math.random(), role: "user", text }]);
    setInput("");
    detectTopic(text);
    callAI();
  };

  // ─── Card interactions ─────────────────────────────────────────────────────
  const onMenuSelect = (msgId, text) => {
    setCardStates((s) => ({ ...s, [msgId]: { done: true, selected: text } }));
    send(text);
  };
  const onQuizAnswer = (msgId, idx, card) => {
    const correct = idx === card.correct;
    setCardStates((s) => ({ ...s, [msgId]: { done: true, selected: idx, correct } }));
    recordQuiz(card, idx);
    const note = correct
      ? `(Quiz: correct ✓ — "${card.options[idx]}")`
      : `(Quiz: wrong ✗ — chose "${card.options[idx]}", answer was "${card.options[card.correct]}")`;
    setTimeout(() => { historyRef.current = [...historyRef.current, { role: "user", content: note }]; callAI(); }, 600);
  };
  const onConfidence = (msgId, val) => {
    setCardStates((s) => ({ ...s, [msgId]: { done: true, value: val } }));
    recordConfidence(val);
    const txt = { got_it: "Got it!", not_sure: "Not quite sure yet.", confused: "I'm confused — explain differently?" };
    setTimeout(() => send(txt[val]), 300);
  };
  const onFlashcardRate = (msgId, rating) => {
    setCardStates((s) => ({ ...s, [msgId]: { done: true, rating } }));
    recordFlashcard(rating);
    const txt = { easy: "(Flashcard: Easy — remembered well)", hard: "(Flashcard: Hard — barely remembered)", again: "(Flashcard: Again — didn't remember)" };
    setTimeout(() => { historyRef.current = [...historyRef.current, { role: "user", content: txt[rating] }]; callAI(); }, 400);
  };
  const onExplainBack = (msgId, userExplanation, card) => {
    setCardStates((s) => ({ ...s, [msgId]: { done: true } }));
    const note = `(Student's explanation of "${card.prompt}"): ${userExplanation}\n(Evaluation criteria: ${card.evaluationCriteria || "general understanding"})`;
    historyRef.current = [...historyRef.current, { role: "user", content: note }];
    setMessages((m) => [...m, { id: Date.now() + Math.random(), role: "user", text: userExplanation }]);
    callAI();
  };
  const onAction = (text) => {
    if (text === "🔄 Retry") { callAI(); return; }
    send(text);
  };
  const revealStep = (msgId, stepIdx) => {
    setStepsRevealed((s) => ({ ...s, [msgId]: Math.max(s[msgId] || 0, stepIdx + 1) }));
  };
  const onWorkedExampleDone = (msgId, card) => {
    setCardStates((s) => ({ ...s, [msgId]: { done: true } }));
    if (card.challenge) send(card.challenge);
    else { historyRef.current = [...historyRef.current, { role: "user", content: "(Worked example complete — ready to continue)" }]; callAI(); }
  };

  // ─── Mode selection & welcome ──────────────────────────────────────────────
  const selectMode = (modeId) => {
    setMode(modeId);
    // Auto-generate opening based on mode
    const openers = {
      learn: () => {
        if (weakest.length > 0) {
          const w = weakest[0];
          return `I want to learn about ${w.topicName} (${w.examName})`;
        }
        return null; // will show topic picker
      },
      review: () => {
        if (dueReviews.length > 0) return "Start my review session";
        return "I want to review what I've studied";
      },
      practice: () => {
        if (examViews.length > 0) return `Practice exam questions for ${examViews[0].name}`;
        return "Give me some practice questions";
      },
      chat: () => null,
    };
    const opener = openers[modeId]();
    if (opener) {
      setTimeout(() => send(opener), 150);
    } else if (modeId === "learn") {
      // Show topic picker
      const items = examViews.length
        ? examViews.flatMap((e) => (e.topics || []).filter((tp) => !tp.lastSeen || tp.retention < 0.5).slice(0, 2).map((tp) => ({ emoji: "📘", text: `${tp.name} (${e.name})` }))).slice(0, 5)
        : [{ emoji: "📐", text: "Mathematics" }, { emoji: "⚗️", text: "Chemistry" }, { emoji: "⚡", text: "Physics" }, { emoji: "🧬", text: "Biology" }];
      if (items.length === 0) items.push(...examViews.slice(0, 4).map((e) => ({ emoji: "📘", text: e.name })));
      setTimeout(() => pushAI({
        text: `What do you want to learn${name ? `, ${name}` : ""}? Pick a topic or type your own.`,
        actions: null,
        card: { type: "menu", label: "Suggested topics", items },
      }), 200);
    } else if (modeId === "chat") {
      setTimeout(() => pushAI({
        text: `Ask me anything${name ? `, ${name}` : ""}. I can explain concepts, solve problems, quiz you — whatever you need.`,
        actions: ["Help me with homework", "Explain a concept", "Quiz me on something"],
        card: null,
      }), 200);
    }
  };

  // ─── Clear ─────────────────────────────────────────────────────────────────
  const clearSession = () => {
    if (window.commitCoachSession) window.commitCoachSession(sessionRef.current);
    try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(HISTORY_KEY); localStorage.removeItem(SESSION_KEY); localStorage.removeItem(MODE_KEY); } catch {}
    historyRef.current = [];
    sessionRef.current = window.createCoachSession ? window.createCoachSession() : { startedAt: Date.now(), topicsCovered: [], quizResults: [], conceptsTaught: 0, diagnosedWeaknesses: [], diagnosedStrengths: [] };
    setMessages([]); setCardStates({}); setStepsRevealed({}); setMode(null); setActiveTopic(null); handled.current = false;
  };

  // ─── Card renderers ────────────────────────────────────────────────────────
  const S = {}; // shared styles
  S.card = { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 20, maxWidth: 520 };
  S.cardFull = { ...S.card, maxWidth: "100%" };
  S.badge = (bg, fg) => ({ display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 12, background: bg, color: fg });
  S.btn = (bg, fg, border) => ({ padding: "10px 16px", background: bg, color: fg, border: border ? `1.5px solid ${border}` : "none", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all 0.15s" });

  const renderLesson = (msgId, card) => {
    return React.createElement("div", { style: { ...S.cardFull, borderLeft: "4px solid var(--indigo-500)" } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 } },
        React.createElement("span", { style: S.badge("var(--indigo-50)", "var(--indigo-600)") }, "📖 CONCEPT")),
      card.title && React.createElement("h3", { style: { margin: "0 0 10px", fontSize: 16, fontWeight: 700, color: "var(--text-strong)" } }, card.title),
      React.createElement("div", { style: { fontSize: 14, lineHeight: 1.7, color: "var(--text-body)", marginBottom: card.keyTakeaway ? 14 : 0 }, dangerouslySetInnerHTML: { __html: md(card.body || "") } }),
      card.keyTakeaway && React.createElement("div", {
        style: { background: "#fefce8", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#92400e", marginBottom: card.example ? 12 : 0 }
      }, "💡 ", React.createElement("strong", null, "Key takeaway: "), card.keyTakeaway),
      card.example && React.createElement("div", {
        style: { background: "var(--surface-muted)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--text-body)", fontFamily: "var(--font-mono)" }
      }, card.example)
    );
  };

  const renderQuiz = (msgId, card) => {
    const cs = cardStates[msgId] || {};
    const L = ["A", "B", "C", "D"];
    const diffColors = { easy: ["#f0fdf4", "#15803d"], medium: ["#fefce8", "#92400e"], hard: ["#fef2f2", "#b91c1c"], exam: ["var(--indigo-50)", "var(--indigo-600)"] };
    const [dbg, dfg] = diffColors[card.difficulty] || diffColors.medium;

    return React.createElement("div", { style: S.card },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 } },
        React.createElement("span", { style: S.badge("linear-gradient(135deg,#6366f1,#4f46e5)", "white") }, "⚡ CHECK"),
        card.difficulty && React.createElement("span", { style: S.badge(dbg, dfg) }, card.difficulty),
        card.source === "materials" && React.createElement("span", { style: S.badge("#f0fdf4", "#15803d") }, "📚 From your notes")),
      React.createElement("p", { style: { fontWeight: 700, fontSize: 14, margin: "0 0 12px", color: "var(--text-strong)", lineHeight: 1.5 } }, card.question),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
        ...card.options.map((opt, i) => {
          const isCor = i === card.correct, isSel = i === cs.selected;
          let bg = "var(--surface-card)", bc = "var(--border-default)", col = "var(--text-body)", lbg = "#f3f4f6", lcol = "#9ca3af";
          if (cs.done) {
            if (isCor) { bg = "#f0fdf4"; bc = "#22c55e"; col = "#15803d"; lbg = "#22c55e"; lcol = "white"; }
            else if (isSel) { bg = "#fef2f2"; bc = "#ef4444"; col = "#b91c1c"; lbg = "#ef4444"; lcol = "white"; }
            else { col = "#d1d5db"; bc = "#f3f4f6"; }
          }
          return React.createElement("button", {
            key: i, disabled: !!cs.done,
            onClick: cs.done ? null : () => onQuizAnswer(msgId, i, card),
            style: { display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: bg, border: `1.5px solid ${bc}`, borderRadius: 12, color: col, fontSize: 13, textAlign: "left", cursor: cs.done ? "default" : "pointer", width: "100%", fontFamily: "var(--font-sans)", transition: "all 0.15s" }
          },
            React.createElement("span", { style: { width: 26, height: 26, borderRadius: 8, background: lbg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: lcol, flexShrink: 0 } }, L[i]),
            React.createElement("span", { style: { lineHeight: 1.45, fontWeight: 500 } }, opt));
        })),
      cs.done && React.createElement("div", {
        style: { marginTop: 12, padding: "11px 14px", background: cs.correct ? "#f0fdf4" : "#fffbeb", border: `1px solid ${cs.correct ? "#bbf7d0" : "#fde68a"}`, borderRadius: 12, fontSize: 13, color: cs.correct ? "#15803d" : "#92400e", lineHeight: 1.6 }
      }, cs.correct ? "✅ " : "💡 ", card.explanation)
    );
  };

  const renderExplainBack = (msgId, card) => {
    const cs = cardStates[msgId] || {};
    const [val, setVal] = React.useState("");
    if (cs.done) return null;
    return React.createElement("div", { style: { ...S.cardFull, borderLeft: "4px solid #f59e0b" } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 } },
        React.createElement("span", { style: S.badge("#fefce8", "#92400e") }, "✍️ YOUR TURN")),
      React.createElement("p", { style: { fontWeight: 700, fontSize: 14, margin: "0 0 8px", color: "var(--text-strong)", lineHeight: 1.5 } }, card.prompt),
      card.hint && React.createElement("p", { style: { fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px", fontStyle: "italic" } }, "💡 Hint: ", card.hint),
      React.createElement("textarea", {
        value: val, onChange: (e) => setVal(e.target.value),
        placeholder: "Type your explanation here…",
        rows: 3,
        style: { width: "100%", boxSizing: "border-box", border: "1px solid var(--border-default)", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontFamily: "var(--font-sans)", color: "var(--text-body)", background: "var(--surface-page)", resize: "vertical", outline: "none", lineHeight: 1.5 }
      }),
      React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", marginTop: 10 } },
        React.createElement("button", {
          onClick: val.trim() ? () => onExplainBack(msgId, val.trim(), card) : null,
          disabled: !val.trim(),
          style: { ...S.btn(val.trim() ? "#4f46e5" : "#c7d2fe", "white"), opacity: val.trim() ? 1 : 0.6 }
        }, "Submit my explanation →"))
    );
  };

  const renderWorkedExample = (msgId, card) => {
    const cs = cardStates[msgId] || {};
    const revealed = stepsRevealed[msgId] || 0;
    const steps = card.steps || [];
    const allRevealed = revealed >= steps.length;
    return React.createElement("div", { style: { ...S.cardFull, borderLeft: "4px solid #8b5cf6" } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 } },
        React.createElement("span", { style: S.badge("#f5f3ff", "#7c3aed") }, "📝 WORKED EXAMPLE")),
      card.title && React.createElement("h3", { style: { margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: "var(--text-strong)" } }, card.title),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 0 } },
        ...steps.map((step, i) => {
          const visible = i < revealed;
          return React.createElement("div", { key: i, style: { display: "flex", gap: 12, padding: "10px 0", borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none", opacity: visible ? 1 : 0.3, transition: "opacity 0.3s" } },
            React.createElement("div", { style: { width: 28, height: 28, borderRadius: "50%", background: visible ? "#7c3aed" : "var(--surface-muted)", color: visible ? "white" : "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 } }, i + 1),
            React.createElement("div", { style: { flex: 1 } },
              React.createElement("div", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 2 } }, step.label),
              visible && React.createElement("div", { style: { fontSize: 14, color: "var(--text-body)", lineHeight: 1.6 }, dangerouslySetInnerHTML: { __html: md(step.content) } })));
        })),
      !allRevealed && React.createElement("button", {
        onClick: () => revealStep(msgId, revealed),
        style: { ...S.btn("var(--indigo-50)", "var(--indigo-600)", "var(--indigo-200)"), marginTop: 12, width: "100%" }
      }, revealed === 0 ? "Show first step →" : "Show next step →"),
      allRevealed && !cs.done && React.createElement("div", { style: { marginTop: 14 } },
        card.challenge && React.createElement("div", { style: { background: "#fefce8", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#92400e", marginBottom: 10 } }, "🎯 Now you try: ", React.createElement("strong", null, card.challenge)),
        React.createElement("button", {
          onClick: () => onWorkedExampleDone(msgId, card),
          style: { ...S.btn("#4f46e5", "white"), width: "100%" }
        }, card.challenge ? "I'll try it →" : "Continue →"))
    );
  };

  const renderFlashcard = (msgId, card) => {
    const cs = cardStates[msgId] || {};
    const [flipped, setFlipped] = React.useState(false);
    if (cs.done) return React.createElement("div", { style: { ...S.card, opacity: 0.6, textAlign: "center", padding: 14 } },
      React.createElement("span", { style: { fontSize: 13, color: "var(--text-muted)" } },
        cs.rating === "easy" ? "✅ Easy" : cs.rating === "hard" ? "🤔 Hard" : "🔄 Again"));
    return React.createElement("div", { style: { ...S.cardFull, cursor: !flipped ? "pointer" : "default", minHeight: 120, position: "relative" }, onClick: !flipped ? () => setFlipped(true) : undefined },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 } },
        React.createElement("span", { style: S.badge("#f5f3ff", "#7c3aed") }, "🔄 FLASHCARD"),
        card.topic && React.createElement("span", { style: { fontSize: 11, color: "var(--text-muted)" } }, card.topic)),
      !flipped
        ? React.createElement("div", { style: { textAlign: "center", padding: "20px 0" } },
            React.createElement("p", { style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)", lineHeight: 1.5, margin: 0 } }, card.front),
            React.createElement("p", { style: { fontSize: 12, color: "var(--text-faint)", margin: "12px 0 0" } }, "Tap to reveal answer"))
        : React.createElement("div", null,
            React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", margin: "0 0 6px" } }, card.front),
            React.createElement("div", { style: { fontSize: 15, lineHeight: 1.6, color: "var(--text-strong)", margin: "0 0 16px" }, dangerouslySetInnerHTML: { __html: md(card.back) } }),
            React.createElement("div", { style: { display: "flex", gap: 8 } },
              React.createElement("button", { onClick: () => onFlashcardRate(msgId, "again"), style: { ...S.btn("#fef2f2", "#b91c1c", "#fecaca"), flex: 1 } }, "Again"),
              React.createElement("button", { onClick: () => onFlashcardRate(msgId, "hard"), style: { ...S.btn("#fffbeb", "#92400e", "#fde68a"), flex: 1 } }, "Hard"),
              React.createElement("button", { onClick: () => onFlashcardRate(msgId, "easy"), style: { ...S.btn("#f0fdf4", "#15803d", "#bbf7d0"), flex: 1 } }, "Easy")))
    );
  };

  const renderConfidence = (msgId) => {
    const cs = cardStates[msgId] || {};
    if (cs.done) return null;
    const opts = [
      { l: "✅  Got it!", v: "got_it", bg: "#f0fdf4", bc: "#bbf7d0", c: "#15803d" },
      { l: "🤔  Almost...", v: "not_sure", bg: "#fffbeb", bc: "#fde68a", c: "#92400e" },
      { l: "😅  Lost", v: "confused", bg: "#fef2f2", bc: "#fecaca", c: "#b91c1c" },
    ];
    return React.createElement("div", { style: S.card },
      React.createElement("p", { style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", margin: "0 0 10px" } }, "How are you feeling?"),
      React.createElement("div", { style: { display: "flex", gap: 8 } },
        ...opts.map((o) => React.createElement("button", {
          key: o.v, onClick: () => onConfidence(msgId, o.v),
          style: { flex: 1, padding: "12px 8px", background: o.bg, border: `1.5px solid ${o.bc}`, borderRadius: 12, color: o.c, fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "center", fontFamily: "var(--font-sans)" }
        }, o.l))));
  };

  const renderSummary = (msgId, card) => {
    return React.createElement("div", { style: { ...S.cardFull, borderLeft: "4px solid #22c55e", background: "linear-gradient(135deg, #f0fdf4 0%, var(--surface-card) 100%)" } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 } },
        React.createElement("span", { style: S.badge("#f0fdf4", "#15803d") }, "📊 SUMMARY")),
      card.title && React.createElement("h3", { style: { margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "var(--text-strong)" } }, card.title),
      card.covered?.length > 0 && React.createElement("div", { style: { marginBottom: 10 } },
        React.createElement("p", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", margin: "0 0 6px" } }, "COVERED"),
        React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 } },
          ...card.covered.map((c, i) => React.createElement("span", { key: i, style: { fontSize: 12, background: "var(--indigo-50)", color: "var(--indigo-600)", padding: "4px 10px", borderRadius: 8, fontWeight: 500 } }, "✓ " + c)))),
      card.score && React.createElement("p", { style: { fontSize: 14, fontWeight: 600, color: "var(--text-strong)", margin: "0 0 8px" } }, "📈 " + card.score),
      card.insight && React.createElement("p", { style: { fontSize: 13, color: "var(--text-body)", margin: "0 0 10px", lineHeight: 1.5 } }, card.insight),
      card.next && React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: "var(--indigo-600)" } }, "→ " + card.next));
  };

  const renderMenu = (msgId, card) => {
    const cs = cardStates[msgId] || {};
    if (cs.done) return null;
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8, maxWidth: 420 } },
      card.label && React.createElement("p", { style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", margin: "0 0 2px" } }, card.label),
      ...(card.items || []).map((item, i) => React.createElement("button", {
        key: i, onClick: () => onMenuSelect(msgId, item.text),
        style: { display: "flex", alignItems: "center", gap: 11, padding: "13px 18px", background: "var(--surface-card)", border: "1.5px solid var(--border-default)", borderRadius: 14, fontSize: 14, fontWeight: 600, color: "var(--text-strong)", cursor: "pointer", width: "100%", fontFamily: "var(--font-sans)", transition: "border-color 0.15s" }
      }, React.createElement("span", { style: { fontSize: 18, flexShrink: 0 } }, item.emoji), item.text)));
  };

  const renderCard = (msgId, card) => {
    if (!card) return null;
    switch (card.type) {
      case "lesson": return renderLesson(msgId, card);
      case "quiz": return renderQuiz(msgId, card);
      case "explain_back": return renderExplainBack(msgId, card);
      case "worked_example": return renderWorkedExample(msgId, card);
      case "flashcard": return renderFlashcard(msgId, card);
      case "confidence": return renderConfidence(msgId);
      case "summary": return renderSummary(msgId, card);
      case "menu": return renderMenu(msgId, card);
      default: return null;
    }
  };

  // ─── Coach icon ────────────────────────────────────────────────────────────
  const CoachIcon = ({ size = 32 }) =>
    React.createElement("div", {
      style: { width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1 0%,#7c3aed 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }
    },
      React.createElement("svg", { width: size * 0.54, height: size * 0.54, viewBox: "0 0 20 20", fill: "none" },
        React.createElement("path", { d: "M10 2C7.24 2 5 4.24 5 7c0 1.9 1.05 3.55 2.6 4.4L7.3 12h5.4l-.3-.6C14.05 10.55 15 8.9 15 7c0-2.76-2.24-5-5-5z", fill: "white", opacity: "0.95" }),
        React.createElement("rect", { x: "7.5", y: "13", width: "5", height: "1.5", rx: "0.75", fill: "white", opacity: "0.75" }),
        React.createElement("rect", { x: "8.5", y: "15", width: "3", height: "1.2", rx: "0.6", fill: "white", opacity: "0.55" })));

  // ─── Find last AI message for action rendering ─────────────────────────────
  let lastAiId = null;
  for (let i = messages.length - 1; i >= 0; i--) { if (messages[i].role === "ai") { lastAiId = messages[i].id; break; } }

  // ─── MODE SELECTOR (lobby screen) ──────────────────────────────────────────
  if (!mode) {
    const greeting = name ? `Hey ${name}!` : "Hey!";
    const urgentReview = dueReviews.length > 0 ? dueReviews[0] : null;
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)" } },
      // Hero
      React.createElement("div", { style: { textAlign: "center", padding: "40px 20px 24px" } },
        React.createElement(CoachIcon, { size: 56 }),
        React.createElement("h1", { style: { margin: "16px 0 4px", fontSize: 22, fontWeight: 700, color: "var(--text-strong)" } }, `${greeting} What do you want to do?`),
        React.createElement("p", { style: { margin: 0, fontSize: 14, color: "var(--text-muted)" } }, "Your AI Coach is ready.")),

      // Urgent review nudge
      urgentReview && React.createElement("div", {
        onClick: () => selectMode("review"),
        style: { margin: "0 20px 16px", padding: "12px 16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }
      },
        React.createElement("span", { style: { fontSize: 20 } }, "⚡"),
        React.createElement("div", { style: { flex: 1 } },
          React.createElement("p", { style: { margin: 0, fontSize: 13, fontWeight: 600, color: "#92400e" } }, `${urgentReview.topicName} is fading`),
          React.createElement("p", { style: { margin: 0, fontSize: 12, color: "#b45309" } }, `${Math.round(urgentReview.retention * 100)}% retention — review now to save it`)),
        React.createElement("span", { style: { fontSize: 12, color: "#92400e", fontWeight: 600 } }, "→")),

      // Mode cards
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "0 20px", flex: 1 } },
        ...COACH_MODES.map((m) => React.createElement("button", {
          key: m.id, onClick: () => selectMode(m.id),
          style: {
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "28px 16px", background: "var(--surface-card)", border: "1.5px solid var(--border-default)", borderRadius: 16,
            cursor: "pointer", fontFamily: "var(--font-sans)", transition: "border-color 0.15s, transform 0.1s",
          }
        },
          React.createElement("span", { style: { fontSize: 32 } }, m.emoji),
          React.createElement("span", { style: { fontSize: 15, fontWeight: 700, color: "var(--text-strong)" } }, m.label),
          React.createElement("span", { style: { fontSize: 12, color: "var(--text-muted)" } }, m.desc)))),

      // Session stats
      sessQuizzes > 0 && React.createElement("div", { style: { padding: "12px 20px", textAlign: "center", fontSize: 12, color: "var(--text-muted)" } },
        `Last session: ${sessQuizzes} quizzes (${sessCorrect} correct) · ${sess.topicsCovered.length} topics`)
    );
  }

  // ─── ACTIVE SESSION ────────────────────────────────────────────────────────
  const modeInfo = COACH_MODES.find((m) => m.id === mode) || COACH_MODES[0];

  return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)" } },

    // Session header
    React.createElement("div", { style: { padding: "10px 20px", borderBottom: "1px solid var(--border-subtle)", background: "var(--surface-card)", borderRadius: "var(--radius-2xl) var(--radius-2xl) 0 0", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 48 } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
        React.createElement(CoachIcon, { size: 28 }),
        React.createElement("span", { style: { fontSize: 13, fontWeight: 600, color: "var(--text-strong)" } }, `${modeInfo.emoji} ${modeInfo.label}`),
        activeTopic && React.createElement("span", { style: { fontSize: 12, color: "var(--indigo-600)", background: "var(--indigo-50)", padding: "2px 10px", borderRadius: 10, fontWeight: 500 } }, activeTopic.topicName),
        sessQuizzes > 0 && React.createElement("span", { style: { fontSize: 12, color: "var(--text-muted)", background: "var(--surface-muted)", padding: "2px 8px", borderRadius: 10 } }, `${sessCorrect}/${sessQuizzes} ✓`)),
      React.createElement("div", { style: { display: "flex", gap: 6 } },
        React.createElement("button", { onClick: () => { clearSession(); }, style: { background: "transparent", border: "1px solid var(--border-default)", color: "var(--text-muted)", borderRadius: 8, padding: "3px 10px", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-sans)" } }, "End session"))),

    // Messages
    React.createElement("div", { ref: bodyRef, style: { flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16, background: "var(--surface-page)" } },
      ...messages.map((m) => {
        if (m.role === "user") {
          return React.createElement("div", { key: m.id, style: { display: "flex", justifyContent: "flex-end" } },
            React.createElement("div", { style: { maxWidth: "78%", background: "#4f46e5", color: "#fff", padding: "10px 14px", borderRadius: 16, borderTopRightRadius: 4, fontSize: 13, lineHeight: 1.65, fontWeight: 500 } }, m.text));
        }
        // AI message
        const isLast = m.id === lastAiId;
        const cardEl = renderCard(m.id, m.card);
        const hasText = m.text && m.text.trim();
        return React.createElement("div", { key: m.id, style: { display: "flex", flexDirection: "column", gap: 10 } },
          // Text bubble (only if there's text)
          hasText && React.createElement("div", { style: { display: "flex", gap: 12, alignItems: "flex-start" } },
            React.createElement(CoachIcon, { size: 30 }),
            React.createElement("div", {
              style: { background: m.isError ? "#FFF1F2" : "var(--surface-card)", border: m.isError ? "1px solid var(--red-200)" : "1px solid var(--border-subtle)", borderRadius: 16, borderTopLeftRadius: 4, padding: "10px 14px", maxWidth: "82%", fontSize: 13, color: "var(--text-body)", lineHeight: 1.65 },
              dangerouslySetInnerHTML: { __html: md(m.text) }
            })),
          // Card (full-width, not inside a bubble)
          cardEl && React.createElement("div", { style: { marginLeft: 42 } }, cardEl),
          // Actions
          isLast && m.actions?.length > 0 && !typing && React.createElement("div", { style: { marginLeft: 42, display: "flex", flexWrap: "wrap", gap: 8 } },
            ...m.actions.map((a, i) => React.createElement("button", {
              key: i, onClick: () => onAction(a),
              style: { padding: "8px 16px", background: "var(--surface-card)", border: "1.5px solid var(--border-default)", borderRadius: 20, fontSize: 13, color: "var(--text-body)", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }
            }, a))));
      }),

      typing && React.createElement("div", { style: { display: "flex", gap: 12, alignItems: "flex-start" } },
        React.createElement(CoachIcon, { size: 30 }),
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, borderTopLeftRadius: 4, padding: "14px 18px", display: "flex", gap: 5, alignItems: "center" } },
          ...[0, 1, 2].map((d) => React.createElement("span", { key: d, style: { width: 7, height: 7, borderRadius: "50%", background: "#6366f1", animation: "aiTyping 1.2s ease-in-out infinite", animationDelay: d * 0.2 + "s" } })),
          React.createElement(TypingHint, null)))),

    // Input
    React.createElement("div", { style: { padding: "12px 16px", borderTop: "1px solid var(--border-subtle)", background: "var(--surface-card)", display: "flex", gap: 8, alignItems: "flex-end" } },
      React.createElement("textarea", {
        value: input, onChange: (e) => setInput(e.target.value),
        onKeyDown: (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } },
        placeholder: mode === "chat" ? "Ask anything…" : mode === "review" ? "Type or use the cards above…" : "Answer or ask a question…",
        rows: 1,
        style: { flex: 1, border: "1px solid var(--border-default)", borderRadius: 12, padding: "10px 14px", fontSize: 13, fontFamily: "var(--font-sans)", color: "var(--text-body)", background: "var(--surface-page)", resize: "none", outline: "none", lineHeight: 1.5, maxHeight: 100, overflowY: "auto" }
      }),
      React.createElement("button", {
        onClick: () => send(input), disabled: !input.trim() || typing,
        style: { background: input.trim() && !typing ? "#4f46e5" : "#c7d2fe", color: "white", border: "none", borderRadius: 12, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: input.trim() && !typing ? "pointer" : "default", fontFamily: "var(--font-sans)", whiteSpace: "nowrap" }
      }, "Send"))
  );
}

Object.assign(window, { AIChat, CoachIcon: function CoachIconExported(props) {
  const size = (props && props.size) || 32;
  return React.createElement("div", {
    style: { width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1 0%,#7c3aed 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }
  },
    React.createElement("svg", { width: size * 0.54, height: size * 0.54, viewBox: "0 0 20 20", fill: "none" },
      React.createElement("path", { d: "M10 2C7.24 2 5 4.24 5 7c0 1.9 1.05 3.55 2.6 4.4L7.3 12h5.4l-.3-.6C14.05 10.55 15 8.9 15 7c0-2.76-2.24-5-5-5z", fill: "white", opacity: "0.95" }),
      React.createElement("rect", { x: "7.5", y: "13", width: "5", height: "1.5", rx: "0.75", fill: "white", opacity: "0.75" }),
      React.createElement("rect", { x: "8.5", y: "15", width: "3", height: "1.2", rx: "0.6", fill: "white", opacity: "0.55" })));
} });
