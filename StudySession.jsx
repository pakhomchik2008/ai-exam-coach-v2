// AI Exam Coach — Study session screen: timer + mid-session quizzes + Socratic
// AI chat tutor. The chat makes the student THINK during the session (not just
// passively read), and passes the conversation to the recap so every session
// leaves a real record of what was discussed.
function StudySession({ session, onDone, onCancel, t }) {
  const { RatingButtons, Button } = window.AIExamCoachDesignSystem_99e467;
  const [seconds, setSeconds] = React.useState(0);
  const [showRating, setShowRating] = React.useState(false);
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);

  const s = session;

  // Resolve which brain topic this session maps to, robust to how it was launched.
  const resolved = React.useMemo(() => {
    const exams = window.getExams ? window.getExams() : [];
    let exam = s.examId ? exams.find((e) => e.id === s.examId) : null;
    if (!exam) exam = exams.find((e) => e.name === s.subject);
    if (!exam) return null;
    let topicIdx = (typeof s.id === "string" && s.id.includes("::") && window.topicIndexFromId)
      ? window.topicIndexFromId(s.id) : -1;
    if (topicIdx < 0 && Array.isArray(exam.topics)) {
      const i = exam.topics.indexOf(s.topic);
      if (i >= 0) topicIdx = i;
    }
    if (topicIdx < 0) topicIdx = 0;
    return { examId: exam.id, topicIdx, topicName: s.topic };
  }, []);

  // ── Quiz generation ───────────────────────────────────────────────────────
  const [quizzes, setQuizzes] = React.useState(null);
  const [activeQuizIdx, setActiveQuizIdx] = React.useState(null);
  const [quizAnswers, setQuizAnswers] = React.useState({});
  const [shownQuizIdx, setShownQuizIdx] = React.useState({});

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const exam = (window.getExams ? window.getExams() : []).find((e) => e.name === s.subject);
        const examBoard = exam && exam.examBoard ? exam.examBoard : null;
        let kbContext = "";
        const examId = resolved && resolved.examId;
        const kb = examId && window.getExamKB ? window.getExamKB(examId) : null;
        if (kb && kb.status === "ready" && Array.isArray(kb.chapters)) {
          const norm = (x) => String(x || "").toLowerCase();
          const topicL = norm(s.topic);
          const ch = kb.chapters.find((c) =>
            norm(c.title).includes(topicL) || topicL.includes(norm(c.title)) ||
            (Array.isArray(c.topics) && c.topics.some((tp) => norm(tp).includes(topicL) || topicL.includes(norm(tp)))));
          const src = ch || kb.chapters[0];
          if (src) {
            const bits = [].concat((src.keyFacts || []).slice(0, 6)).concat((src.objectives || []).slice(0, 3)).concat((src.formulas || []).slice(0, 3));
            if (bits.length) kbContext = `\n\nBase the questions ONLY on these facts from the student's own materials:\n- ${bits.join("\n- ")}`;
          }
        }
        const system = `You are a quiz generator for exam revision. Output ONLY valid JSON — no markdown, no fences, nothing else before { or after }.

Schema:
{"quiz":[{"question":"string","options":["A","B","C","D"],"correct":0,"explanation":"<=18 word explanation"}]}

Rules: EXACTLY 2 quiz questions. 4 options each, "correct" is the index of the right one. Tailor difficulty and content tightly to the given topic.${kbContext ? " When source facts are provided, every question must be answerable from them." : ""}`;
        const userPrompt = `Generate 2 active-recall quiz questions for:
Subject: ${s.subject}
Topic: ${s.topic}
${examBoard ? `Exam board: ${examBoard}\n` : ""}Difficulty (1=easy,3=hard): ${s.difficulty || 2}${kbContext}`;
        const complete = window.brainComplete ? (a) => window.brainComplete(a) : (a) => window.claude.complete(a);
        const raw = await complete({ system, messages: [{ role: "user", content: userPrompt }] });
        if (cancelled) return;
        const j = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
        const parsed = JSON.parse(j);
        const list = (parsed.quiz || []).slice(0, 2).map((q) => ({
          question: q.question || "", options: Array.isArray(q.options) ? q.options : [],
          correct: typeof q.correct === "number" ? q.correct : 0, explanation: q.explanation || "",
        })).filter((q) => q.question && q.options.length === 4);
        if (!cancelled) setQuizzes(list);
      } catch (err) {
        console.error("StudySession quiz generation failed:", err);
        if (!cancelled) setQuizzes([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── AI Chat tutor ─────────────────────────────────────────────────────────
  const STATIC_OPENER = `Let's make this session count 💪 You're studying **${s.topic}**.\n\nBefore we dive in — what's one thing you already know about this? (Even a rough idea is fine!)`;

  const [chatOpen, setChatOpen] = React.useState(false);
  const [chatMessages, setChatMessages] = React.useState([{ role: "assistant", content: STATIC_OPENER }]);
  const [chatInput, setChatInput] = React.useState("");
  const [chatLoading, setChatLoading] = React.useState(false);
  const chatEndRef = React.useRef(null);
  const chatInputRef = React.useRef(null);

  const QUICK_PROMPTS = [
    `What are the key ideas in ${s.topic}?`,
    "Quiz me on this",
    "I'm stuck — give me a hint",
    "Why does this come up in exams?",
  ];

  React.useEffect(() => {
    if (chatOpen && chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatOpen]);

  const userMsgCount = chatMessages.filter((m) => m.role === "user").length;

  const sendChat = async (text) => {
    const msg = (text || chatInput).trim();
    if (!msg || chatLoading) return;
    const newMsgs = [...chatMessages, { role: "user", content: msg }];
    setChatMessages(newMsgs);
    setChatInput("");
    setChatLoading(true);
    try {
      const system = `You are a Socratic study tutor. The student is studying "${s.topic}" for ${s.subject}.
Your role: make them THINK. Never give full answers — ask probing questions, give hints, build on what they say.
Rules:
• Keep responses to 2–3 sentences MAX
• If they answer correctly → praise briefly, then probe deeper with a follow-up question
• If they're wrong or stuck → give ONE hint, not the answer
• Always end with a question or challenge for them to think about`;

      // Send only real user+AI turns to the API (skip the static opener)
      const apiHistory = newMsgs.filter((m) => m.role === "user" || m._real);
      const complete = window.brainComplete ? (a) => window.brainComplete(a) : (a) => window.claude.complete(a);
      const reply = await complete({ system, messages: apiHistory });
      setChatMessages((prev) => [...prev, { role: "assistant", content: reply, _real: true }]);
    } catch {
      // Silently drop — don't show an error bubble, just let them keep the conversation going
    } finally {
      setChatLoading(false);
      setTimeout(() => chatInputRef.current && chatInputRef.current.focus(), 50);
    }
  };

  // Render text with **bold** markdown support
  const renderText = (text) => {
    const parts = String(text).split(/\*\*([^*]+)\*\*/g);
    return parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p);
  };

  // ── Timer — pauses during rating + active quiz, NOT during chat ───────────
  React.useEffect(() => {
    if (showRating || activeQuizIdx !== null) return;
    const i = setInterval(() => setSeconds((sec) => sec + 1), 1000);
    return () => clearInterval(i);
  }, [showRating, activeQuizIdx]);

  const estSeconds = Math.max(1, s.est || 25) * 60;
  const THRESH_1 = Math.max(75, Math.round(estSeconds / 3));
  const THRESH_2 = Math.max(THRESH_1 + 60, Math.round((estSeconds * 2) / 3));

  React.useEffect(() => {
    if (showRating || activeQuizIdx !== null || !quizzes || !quizzes.length) return;
    if (!shownQuizIdx[0] && quizzes[0] && seconds >= THRESH_1) {
      setActiveQuizIdx(0); setShownQuizIdx((m) => ({ ...m, 0: true })); return;
    }
    if (!shownQuizIdx[1] && quizzes[1] && seconds >= THRESH_2) {
      setActiveQuizIdx(1); setShownQuizIdx((m) => ({ ...m, 1: true }));
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
    const correct = optionIdx === activeQuiz.correct;
    if (!correct && window.logMistake) {
      window.logMistake({ topic: s.topic, question: activeQuiz.question, options: activeQuiz.options, correctIndex: activeQuiz.correct, selectedIndex: optionIdx, explanation: activeQuiz.explanation, examId: resolved && resolved.examId, topicIdx: resolved && resolved.topicIdx });
    } else if (correct && resolved && window.recordReview) {
      window.recordReview({ examId: resolved.examId, topicIdx: resolved.topicIdx, topicName: resolved.topicName, correct: true, quality: 1 });
    }
    setQuizAnswers((m) => ({ ...m, [activeQuizIdx]: optionIdx }));
  };

  const handleFinish = () => setShowRating(true);

  return (
    <div style={{ maxWidth: "var(--container-read)", margin: "0 auto" }}>

      {/* Subject header */}
      <div style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", borderLeft: `var(--border-accent-width) solid ${s.color}`, background: "var(--surface-card)", boxShadow: "var(--shadow-sm)", padding: "var(--space-6)" }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: s.color, fontWeight: "var(--weight-medium)" }}>{s.subject}</p>
        <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{L("Review","Повторення","Повторение","Révision","Wiederholung")} {s.review}</p>
      </div>

      {/* Timer */}
      <div style={{ marginTop: "var(--space-6)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)", padding: "var(--space-8)", textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: "var(--text-3xl)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>{s.topic}</h1>
        <p style={{ marginTop: "var(--space-8)", fontFamily: "var(--font-mono)", fontSize: "var(--text-4xl)", color: "var(--text-body)" }}>{mm}:{ss}</p>
        <p style={{ marginTop: "var(--space-1)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{L("Auto-stops at 60 minutes","Автоматично зупиняється через 60 хвилин","Автоматически останавливается через 60 минут","S'arrête automatiquement après 60 minutes","Stoppt automatisch nach 60 Minuten")}</p>
      </div>

      {/* AI Chat tutor — hidden during rating to keep focus on self-assessment */}
      {!showRating && (
        <div style={{ marginTop: "var(--space-4)" }}>
          {/* Toggle button */}
          <button
            onClick={() => setChatOpen((o) => !o)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "13px 16px",
              borderRadius: chatOpen ? "var(--radius-xl) var(--radius-xl) 0 0" : "var(--radius-xl)",
              border: "1.5px solid #c7d2fe",
              background: chatOpen ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "var(--indigo-50)",
              color: chatOpen ? "#fff" : "var(--indigo-700)",
              fontFamily: "var(--font-sans)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)",
              cursor: "pointer", transition: "all 0.2s ease",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🤖</span>
              {chatOpen
                ? L("Close AI tutor","Закрити AI-репетитора","Закрыть AI-репетитора","Fermer le tuteur IA","KI-Tutor schließen")
                : L("Think it through — chat with AI tutor","Обміркуй це — чат з AI-репетитором","Обдумай это — чат с AI-репетитором","Réfléchissez-y — discutez avec le tuteur IA","Denk darüber nach — chatte mit dem KI-Tutor")}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {userMsgCount > 0 && !chatOpen && (
                <span style={{ background: "var(--indigo-600)", color: "#fff", borderRadius: "var(--radius-full)", padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>{userMsgCount} {L("exchanges","обмінів","обменов","échanges","Nachrichten")}</span>
              )}
              <span style={{ opacity: 0.6, fontSize: 11 }}>{chatOpen ? "▲" : "▼"}</span>
            </span>
          </button>

          {/* Chat panel */}
          {chatOpen && (
            <div style={{ border: "1.5px solid #c7d2fe", borderTop: "none", borderRadius: "0 0 var(--radius-xl) var(--radius-xl)", background: "var(--surface-card)", animation: "revealUp 0.2s ease-out" }}>

              {/* Message list */}
              <div style={{ maxHeight: 320, overflowY: "auto", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 10 }}>
                {chatMessages.map((msg, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, flexDirection: msg.role === "user" ? "row-reverse" : "row", alignItems: "flex-end" }}>
                    {msg.role === "assistant" && (
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0, boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}>🤖</div>
                    )}
                    <div style={{
                      maxWidth: "80%", padding: "10px 14px", lineHeight: 1.55, fontSize: "var(--text-sm)",
                      borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      background: msg.role === "user" ? "var(--indigo-600)" : "var(--surface-page)",
                      color: msg.role === "user" ? "#fff" : "var(--text-body)",
                      border: msg.role === "user" ? "none" : "1px solid var(--border-subtle)",
                      boxShadow: msg.role === "user" ? "0 2px 8px rgba(99,102,241,0.25)" : "none",
                    }}>
                      {renderText(msg.content)}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {chatLoading && (
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🤖</div>
                    <div style={{ padding: "12px 16px", borderRadius: "18px 18px 18px 4px", background: "var(--surface-page)", border: "1px solid var(--border-subtle)", display: "flex", gap: 4, alignItems: "center" }}>
                      {[0, 1, 2].map((j) => (
                        <span key={j} style={{ width: 7, height: 7, borderRadius: "50%", background: "#a5b4fc", display: "inline-block", animation: `loadDot 1.2s ${j * 0.2}s ease-in-out infinite` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick-start prompts — shown only before first user message */}
              {userMsgCount === 0 && !chatLoading && (
                <div style={{ padding: "0 var(--space-4) var(--space-3)", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <p style={{ width: "100%", margin: "0 0 6px", fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: "var(--weight-medium)" }}>{L("Quick start:","Швидкий старт:","Быстрый старт:","Démarrage rapide :","Schnellstart:")}</p>
                  {QUICK_PROMPTS.map((p, i) => (
                    <button key={i} onClick={() => sendChat(p)}
                      style={{ padding: "6px 13px", borderRadius: "var(--radius-full)", border: "1.5px solid #a5b4fc", background: "transparent", color: "var(--indigo-600)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)", cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all 0.15s ease" }}>
                      {p}
                    </button>
                  ))}
                </div>
              )}

              {/* Input row */}
              <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                <input
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                  placeholder={L("Answer, ask, or think out loud...","Відповідай, запитуй або міркуй уголос...","Отвечай, спрашивай или думай вслух...","Répondez, demandez ou réfléchissez à voix haute...","Antworte, frag oder denke laut nach...")}
                  disabled={chatLoading}
                  style={{ flex: 1, border: "1px solid var(--border-default)", borderRadius: "var(--radius-full)", padding: "10px 16px", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", outline: "none", background: "var(--surface-page)", color: "var(--text-body)" }}
                />
                <button
                  onClick={() => sendChat()}
                  disabled={!chatInput.trim() || chatLoading}
                  style={{ width: 40, height: 40, borderRadius: "50%", border: "none", fontSize: 17, flexShrink: 0, cursor: chatInput.trim() && !chatLoading ? "pointer" : "default", background: chatInput.trim() && !chatLoading ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "var(--slate-100)", color: chatInput.trim() && !chatLoading ? "#fff" : "var(--text-muted)", transition: "all 0.15s ease" }}>
                  ↑
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mid-session quiz */}
      {activeQuiz && (
        <div style={{ marginTop: "var(--space-6)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)", padding: "var(--space-6)", animation: "revealUp 0.4s ease-out" }}>
          <span style={{ display: "inline-block", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 20, letterSpacing: "0.06em" }}>⚡ {L("QUICK CHECK","ШВИДКА ПЕРЕВІРКА","БЫСТРАЯ ПРОВЕРКА","VÉRIFICATION RAPIDE","SCHNELLCHECK")}</span>
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
                <button key={oi} disabled={quizAnswered} onClick={quizAnswered ? undefined : () => answerQuiz(oi)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: bg, border: `1.5px solid ${bc}`, borderRadius: 12, color: col, fontSize: 13, textAlign: "left", cursor: quizAnswered ? "default" : "pointer", width: "100%", fontFamily: "var(--font-sans)" }}>
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
          {quizAnswered && <Button variant="secondary" size="md" fullWidth onClick={() => setActiveQuizIdx(null)} style={{ marginTop: "var(--space-4)" }}>{L("Continue studying","Продовжити навчання","Продолжить обучение","Continuer à étudier","Weiter lernen")}</Button>}
        </div>
      )}

      {/* Action buttons */}
      {!showRating && activeQuizIdx === null ? (
        <div style={{ marginTop: "var(--space-6)", display: "flex", gap: "var(--space-3)" }}>
          <Button variant="primary" size="lg" fullWidth onClick={handleFinish}>{L("I've finished studying this","Я закінчив вивчати це","Я закончил изучать это","J'ai fini d'étudier ceci","Ich habe das fertig gelernt")}</Button>
          <Button variant="secondary" size="lg" onClick={onCancel}>{L("Cancel","Скасувати","Отмена","Annuler","Abbrechen")}</Button>
        </div>
      ) : activeQuizIdx !== null ? (
        <div style={{ marginTop: "var(--space-6)" }}>
          <Button variant="secondary" size="lg" onClick={onCancel}>{L("Cancel","Скасувати","Отмена","Annuler","Abbrechen")}</Button>
        </div>
      ) : showRating ? (
        <div style={{ marginTop: "var(--space-6)" }}>
          <p style={{ textAlign: "center", color: "var(--text-body)", marginBottom: "var(--space-3)" }}>{L("How well did you know it?","Наскільки добре ти це знав?","Насколько хорошо ты это знал?","À quel point le saviez-vous ?","Wie gut kanntest du das?")}</p>
          <RatingButtons onRate={(rating) => {
            const answeredIdx = Object.keys(quizAnswers).map(Number);
            const quizCorrect = answeredIdx.filter((i) => quizzes && quizzes[i] && quizAnswers[i] === quizzes[i].correct).length;
            onDone({ rating, seconds, quizCorrect, quizTotal: answeredIdx.length, chatMessages });
          }} />
        </div>
      ) : null}
    </div>
  );
}
window.StudySession = StudySession;
