// AI Exam Coach — AI Coach v6: Lesson Engine
//
// The AI generates a structured lesson plan upfront. The UI renders each step
// as its own full-screen phase — not chat bubbles. Progress is always visible.
// Brain write-back happens after every quiz interaction. Celebration at the end.

const COACH_MODES = [
  { id: "learn", emoji: "🧠",
    label: { en: "Learn", uk: "Навчання", ru: "Обучение", fr: "Apprendre", de: "Lernen" },
    desc: { en: "Structured lesson", uk: "Структурований урок", ru: "Структурированный урок", fr: "Leçon structurée", de: "Strukturierte Lektion" } },
  { id: "review", emoji: "⚡",
    label: { en: "Quick Check", uk: "Швидка перевірка", ru: "Быстрая проверка", fr: "Vérification rapide", de: "Schnellcheck" },
    desc: { en: "5 questions · 2 min", uk: "5 питань · 2 хв", ru: "5 вопросов · 2 мин", fr: "5 questions · 2 min", de: "5 Fragen · 2 Min" } },
  { id: "practice", emoji: "🎯",
    label: { en: "Practice", uk: "Практика", ru: "Практика", fr: "Pratique", de: "Übung" },
    desc: { en: "Exam questions", uk: "Екзаменаційні питання", ru: "Экзаменационные вопросы", fr: "Questions d'examen", de: "Prüfungsfragen" } },
  { id: "speed", emoji: "🏎️",
    label: { en: "Speed Round", uk: "Швидкий раунд", ru: "Быстрый раунд", fr: "Manche rapide", de: "Speed-Runde" },
    desc: { en: "20 Qs × 30 sec", uk: "20 питань × 30 сек", ru: "20 вопросов × 30 сек", fr: "20 questions × 30 s", de: "20 Fragen × 30 Sek" } },
  { id: "exam_sim", emoji: "📝",
    label: { en: "Exam Simulation", uk: "Симуляція іспиту", ru: "Симуляция экзамена", fr: "Simulation d'examen", de: "Prüfungssimulation" },
    desc: { en: "Full mock exam · timed", uk: "Повний пробний іспит · на час", ru: "Полный пробный экзамен · на время", fr: "Examen blanc complet · chronométré", de: "Komplette Probeprüfung · zeitlich begrenzt" } },
  { id: "chat", emoji: "💬",
    label: { en: "Chat", uk: "Чат", ru: "Чат", fr: "Chat", de: "Chat" },
    desc: { en: "Ask anything", uk: "Запитайте що завгодно", ru: "Спросите что угодно", fr: "Posez toutes vos questions", de: "Frag alles" } },
];

// ChatMode's Quick Actions — query(topicName) is filled in only after the
// student has actually picked an exam+topic via the picker flow (see
// startPicker in ChatMode), never guessed.
const QUICK_ACTIONS = [
  { id: "explain", text: { en: "Explain a topic", uk: "Пояснити тему", ru: "Объяснить тему", fr: "Expliquer un sujet", de: "Thema erklären" }, icon: "📖", query: (topicName) => `Explain ${topicName}` },
  { id: "quiz", text: { en: "Generate quiz", uk: "Створити квіз", ru: "Создать квиз", fr: "Générer un quiz", de: "Quiz erstellen" }, icon: "📝", query: (topicName) => `Quiz me on ${topicName}` },
  { id: "notes", text: { en: "Summarize notes", uk: "Підсумувати конспект", ru: "Резюмировать конспект", fr: "Résumer les notes", de: "Notizen zusammenfassen" }, icon: "📄", query: (topicName) => `Summarize my notes on ${topicName}` },
  { id: "solve", text: { en: "Solve a problem", uk: "Розв'язати задачу", ru: "Решить задачу", fr: "Résoudre un problème", de: "Aufgabe lösen" }, icon: "🧮", query: (topicName) => `Give me a problem to solve in ${topicName} and walk me through it` },
  { id: "test", text: { en: "Test my knowledge", uk: "Перевірити знання", ru: "Проверить знания", fr: "Tester mes connaissances", de: "Wissen testen" }, icon: "🎯", query: (topicName) => `Test my knowledge on ${topicName}` },
  { id: "flashcards", text: { en: "Make flashcards", uk: "Створити картки", ru: "Создать карточки", fr: "Créer des cartes", de: "Karteikarten erstellen" }, icon: "🗂", query: (topicName) => `Create flashcards for ${topicName}` },
];

// ─── Shared ──────────────────────────────────────────────────────────────────

function CoachIcon({ size = 32 }) {
  return React.createElement("div", {
    style: { width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,var(--indigo-500),var(--indigo-600))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }
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
    .replace(/`([^`\n]+?)`/g, "<code style='background:var(--slate-100);padding:2px 5px;border-radius:4px;font-size:0.92em'>$1</code>")
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
    padding: "12px 20px", background: primary ? (disabled ? "var(--indigo-200)" : "var(--indigo-600)") : "var(--surface-card)",
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
function LessonCheckpoint({ step: s, resolved, onResult, onXp, onAdvance, t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
  const [cpIdx, setCpIdx] = React.useState(0);
  const [cpSelected, setCpSelected] = React.useState(null);
  const [cpRevealed, setCpRevealed] = React.useState(false);
  const [cpResults, setCpResults] = React.useState([]);

  const questions = s.questions || [];
  if (cpIdx >= questions.length) {
    // Checkpoint complete — show mini summary
    const cpCorrect = cpResults.filter(Boolean).length;
    return React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
      React.createElement("div", { style: { background: "linear-gradient(135deg, var(--emerald-50) 0%, var(--surface-card) 100%)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24, borderLeft: "var(--border-accent-width) solid var(--emerald-500)", textAlign: "center" } },
        React.createElement("div", { style: { marginBottom: 14 } }, _badge("var(--emerald-50)", "var(--emerald-700)", L("📊 CHECKPOINT RESULTS", "📊 РЕЗУЛЬТАТИ КОНТРОЛЬНОЇ", "📊 РЕЗУЛЬТАТЫ КОНТРОЛЬНОЙ", "📊 RÉSULTATS DU CONTRÔLE", "📊 KONTROLLERGEBNISSE"))),
        React.createElement("p", { style: { fontSize: 36, fontWeight: 700, color: cpCorrect === questions.length ? "var(--emerald-700)" : "var(--amber-700)", margin: "8px 0" } }, `${cpCorrect}/${questions.length}`),
        React.createElement("p", { style: { fontSize: 14, color: "var(--text-muted)", margin: "0 0 16px" } },
          cpCorrect === questions.length ? L("Perfect score! 🌟", "Ідеальний результат! 🌟", "Идеальный результат! 🌟", "Score parfait ! 🌟", "Perfekte Punktzahl! 🌟") : cpCorrect >= questions.length * 0.6 ? L("Good work! Keep going.", "Гарна робота! Продовжуйте.", "Хорошая работа! Продолжайте.", "Bon travail ! Continuez.", "Gute Arbeit! Weiter so.") : L("Let's review — you'll get there.", "Давайте повторимо — у вас все вийде.", "Давайте повторим — у вас всё получится.", "Révisons — vous y arriverez.", "Lass uns wiederholen — du schaffst das."))),
      React.createElement("div", { style: { marginTop: 16 } }, _btn(L("Continue →", "Продовжити →", "Продолжить →", "Continuer →", "Weiter →"), () => { onXp(cpCorrect === questions.length ? 50 : 20); onAdvance(); }, true, false)));
  }
  const q = questions[cpIdx];
  return React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
    React.createElement("div", { style: { marginBottom: 12, display: "flex", alignItems: "center", gap: 8 } },
      _badge("linear-gradient(135deg,var(--indigo-500),var(--indigo-600))", "white", L(`CHECKPOINT ${cpIdx + 1}/${questions.length}`, `КОНТРОЛЬНА ${cpIdx + 1}/${questions.length}`, `КОНТРОЛЬНАЯ ${cpIdx + 1}/${questions.length}`, `CONTRÔLE ${cpIdx + 1}/${questions.length}`, `KONTROLLE ${cpIdx + 1}/${questions.length}`))),
    React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 } },
      React.createElement("p", { style: { fontWeight: 600, fontSize: 16, margin: "0 0 16px", color: "var(--text-strong)", lineHeight: 1.5 }, dangerouslySetInnerHTML: { __html: _md(q.question) } }),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
        ...(q.options || []).map((opt, i) => {
          const isCor = i === q.correct, isSel = i === cpSelected;
          let bg = "var(--surface-card)", bc = "var(--border-default)", col = "var(--text-body)", lbg = "var(--slate-100)", lcol = "var(--slate-400)";
          if (cpRevealed) {
            if (isCor) { bg = "var(--emerald-50)"; bc = "var(--emerald-500)"; col = "var(--emerald-700)"; lbg = "var(--emerald-500)"; lcol = "white"; }
            else if (isSel) { bg = "var(--red-50)"; bc = "var(--red-500)"; col = "var(--red-700)"; lbg = "var(--red-500)"; lcol = "white"; }
            else { col = "var(--slate-300)"; bc = "var(--slate-100)"; }
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
        style: { marginTop: 14, padding: "12px 16px", background: cpSelected === q.correct ? "var(--emerald-50)" : "var(--amber-50)", border: `1px solid ${cpSelected === q.correct ? "var(--emerald-100)" : "var(--amber-200)"}`, borderRadius: 12, fontSize: 14, color: cpSelected === q.correct ? "var(--emerald-700)" : "var(--amber-700)", lineHeight: 1.6 }
      }, cpSelected === q.correct ? "✅ " : "💡 ", q.explanation)),
    cpRevealed && React.createElement("div", { style: { marginTop: 16 } },
      _btn(cpIdx + 1 < questions.length ? L("Next question →", "Наступне питання →", "Следующий вопрос →", "Question suivante →", "Nächste Frage →") : L("See results →", "Переглянути результати →", "Посмотреть результаты →", "Voir les résultats →", "Ergebnisse ansehen →"), () => { setCpIdx((n) => n + 1); setCpSelected(null); setCpRevealed(false); }, true, false)));
}

// ─── LEARN ENGINE ────────────────────────────────────────────────────────────
// First contact with a topic. Rich theory sections with examples, formulas,
// callouts. AI decides how many sections the topic needs. Each section:
// full explanation → quick quiz. Ends with summary + checkpoint.

function LearnEngine({ topic, onExit, t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
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

        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error(L("Taking too long — try again.", "Це триває занадто довго — спробуйте ще раз.", "Это длится слишком долго — попробуйте ещё раз.", "Cela prend trop de temps — réessayez.", "Das dauert zu lange — versuche es erneut."))), 55000));
        const raw = await Promise.race([
          complete({ system, messages: [{ role: "user", content: `Create a comprehensive study guide on: ${topic}` }], topicContext }),
          timeout,
        ]);
        const parsed = window.parseJSON ? window.parseJSON(raw) : JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
        if (!parsed || !Array.isArray(parsed.sections) || parsed.sections.length === 0) throw new Error(L("Invalid study guide", "Недійсний навчальний посібник", "Недействительное учебное пособие", "Guide d'étude invalide", "Ungültiger Lernleitfaden"));
        setPlan(parsed); setLoading(false);
      } catch (e) {
        console.error("Learn generation failed:", e);
        setError(e.message || L("Failed to generate", "Не вдалося згенерувати", "Не удалось сгенерировать", "Échec de la génération", "Generierung fehlgeschlagen")); setLoading(false);
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
      React.createElement("p", { style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)" } }, L("Building your study guide...", "Створюємо ваш навчальний посібник...", "Создаём ваше учебное пособие...", "Création de votre guide d'étude...", "Dein Lernleitfaden wird erstellt...")),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)" } }, `${L("Topic", "Тема", "Тема", "Sujet", "Thema")}: ${topic}`),
      React.createElement("p", { style: { fontSize: 12, color: "var(--text-faint)" } }, L("This takes a moment — lots of material to prepare", "Це займе трохи часу — потрібно підготувати багато матеріалу", "Это займёт немного времени — нужно подготовить много материала", "Cela prend un moment — beaucoup de matériel à préparer", "Das dauert einen Moment — viel Material wird vorbereitet")),
      React.createElement("div", { style: { display: "flex", gap: 6 } },
        ...[0, 1, 2].map((d) => React.createElement("span", { key: d, style: { width: 8, height: 8, borderRadius: "50%", background: "var(--indigo-500)", animation: "loadDot 1.2s ease-in-out infinite", animationDelay: d * 0.2 + "s" } }))));
  }

  if (error) {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", gap: 16, padding: "0 24px" } },
      React.createElement("span", { style: { fontSize: 40 } }, "⚠️"),
      React.createElement("p", { style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)", margin: 0 } }, L("Couldn't generate study guide", "Не вдалося створити навчальний посібник", "Не удалось создать учебное пособие", "Impossible de générer le guide d'étude", "Lernleitfaden konnte nicht erstellt werden")),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", margin: 0, textAlign: "center" } }, error),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 } },
        _btn(L("↺ Try again", "↺ Спробувати ще раз", "↺ Попробовать ещё раз", "↺ Réessayer", "↺ Erneut versuchen"), () => setRetryCount((n) => n + 1), true, false),
        _btn(L("← Back", "← Назад", "← Назад", "← Retour", "← Zurück"), onExit, false, false)));
  }

  // ─── Progress header ──────────────────────────────────────────────────────
  const header = React.createElement("div", { style: { padding: "12px 20px 0", flexShrink: 0 } },
    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } },
      React.createElement("span", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)" } },
        phase === "roadmap" ? L("Overview", "Огляд", "Обзор", "Aperçu", "Übersicht") : phase === "summary" ? L("Summary", "Підсумок", "Итог", "Résumé", "Zusammenfassung") : phase === "checkpoint" ? L("Final Check", "Фінальна перевірка", "Финальная проверка", "Contrôle final", "Abschlusskontrolle") : phase === "done" ? L("Complete!", "Готово!", "Готово!", "Terminé !", "Fertig!") : L(`Section ${secIdx + 1} of ${totalSections}`, `Розділ ${secIdx + 1} з ${totalSections}`, `Раздел ${secIdx + 1} из ${totalSections}`, `Section ${secIdx + 1} sur ${totalSections}`, `Abschnitt ${secIdx + 1} von ${totalSections}`)),
      React.createElement("div", { style: { display: "flex", gap: 12, fontSize: 12, color: "var(--text-muted)" } },
        totalAnswered > 0 && React.createElement("span", null, `${correctCount}/${totalAnswered} ✓`),
        React.createElement("button", { onClick: () => { if (phase !== "roadmap") commitResults(); onExit(); }, style: { fontSize: 11, color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", textDecoration: "underline" } }, L("Exit", "Вийти", "Выйти", "Quitter", "Verlassen")))),
    React.createElement("div", { style: { height: 4, background: "var(--surface-muted)", borderRadius: 2, overflow: "hidden" } },
      React.createElement("div", { style: { height: "100%", width: "100%", transform: `scaleX(${progressPct / 100})`, transformOrigin: "left", background: "linear-gradient(90deg,var(--indigo-500),var(--indigo-600))", borderRadius: 2, transition: "transform 0.4s ease" } })),
    React.createElement("span", { style: { fontSize: 11, color: "var(--text-faint)", marginTop: 4, display: "block" } }, plan.title));

  // ─── ROADMAP ──────────────────────────────────────────────────────────────
  if (phase === "roadmap") {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)" } },
      header,
      React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "24px 20px" } },
        React.createElement("div", { style: { textAlign: "center", marginBottom: 28 } },
          React.createElement("span", { style: { fontSize: 48 } }, "📘"),
          React.createElement("h1", { style: { fontSize: 22, fontWeight: 700, color: "var(--text-strong)", margin: "12px 0 6px" } }, plan.title),
          React.createElement("p", { style: { fontSize: 14, color: "var(--text-muted)", margin: 0 } }, L(`${totalSections} sections · ~${plan.estimatedMinutes || 15} min`, `${totalSections} розділів · ~${plan.estimatedMinutes || 15} хв`, `${totalSections} разделов · ~${plan.estimatedMinutes || 15} мин`, `${totalSections} sections · ~${plan.estimatedMinutes || 15} min`, `${totalSections} Abschnitte · ~${plan.estimatedMinutes || 15} Min.`))),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 } },
          ...sections.map((s, i) => React.createElement("div", {
            key: i,
            style: { display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14 }
          },
            React.createElement("div", { style: { width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,var(--indigo-500),var(--indigo-600))", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 } }, i + 1),
            React.createElement("div", { style: { flex: 1 } },
              React.createElement("span", { style: { fontSize: 15, fontWeight: 600, color: "var(--text-strong)" } }, s.title),
              s.quiz && s.quiz.length > 0 && React.createElement("span", { style: { fontSize: 11, color: "var(--text-muted)", marginLeft: 8 } }, L(`+ ${s.quiz.length} quiz`, `+ ${s.quiz.length} тест`, `+ ${s.quiz.length} тест`, `+ ${s.quiz.length} quiz`, `+ ${s.quiz.length} Quiz`)))))),
        _btn(L("Let's start →", "Почнімо →", "Начнём →", "Commençons →", "Los geht's →"), () => { setPhase("section"); scrollTop(); }, true, false)));
  }

  // ─── SECTION (rich theory) ────────────────────────────────────────────────
  if (phase === "section") {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)" } },
      header,
      React.createElement("div", { ref: scrollRef, style: { flex: 1, overflowY: "auto", padding: "20px 20px 24px" } },
        React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
          React.createElement("div", { style: { marginBottom: 12 } },
            _badge("linear-gradient(135deg,var(--indigo-500),var(--indigo-600))", "white", L(`📖 SECTION ${secIdx + 1} of ${totalSections}`, `📖 РОЗДІЛ ${secIdx + 1} з ${totalSections}`, `📖 РАЗДЕЛ ${secIdx + 1} из ${totalSections}`, `📖 SECTION ${secIdx + 1} SUR ${totalSections}`, `📖 ABSCHNITT ${secIdx + 1} VON ${totalSections}`))),
          React.createElement("h2", { style: { fontSize: 20, fontWeight: 700, color: "var(--text-strong)", margin: "0 0 20px" } }, sec.title),

          // Main content
          React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24, marginBottom: 16 } },
            ...renderContent(sec.content)),

          // Formula
          sec.formula && React.createElement("div", { style: { background: "var(--slate-100)", border: "1px solid var(--slate-300)", borderRadius: 12, padding: "16px 20px", marginBottom: 16, textAlign: "center" } },
            React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 } }, L("📐 KEY FORMULA / RULE", "📐 КЛЮЧОВА ФОРМУЛА / ПРАВИЛО", "📐 КЛЮЧЕВАЯ ФОРМУЛА / ПРАВИЛО", "📐 FORMULE / RÈGLE CLÉ", "📐 SCHLÜSSELFORMEL / -REGEL")),
            React.createElement("div", { style: { fontFamily: "var(--font-mono)", fontSize: 16, color: "var(--slate-900)", lineHeight: 1.6, whiteSpace: "pre-wrap" } }, sec.formula)),

          // Example
          sec.example && React.createElement("div", { style: { background: "var(--indigo-50)", border: "1px solid var(--indigo-100)", borderRadius: 14, padding: 20, marginBottom: 16 } },
            React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: "var(--indigo-600)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 } }, L("📝 WORKED EXAMPLE", "📝 РОЗВ'ЯЗАНИЙ ПРИКЛАД", "📝 РЕШЁННЫЙ ПРИМЕР", "📝 EXEMPLE RÉSOLU", "📝 GELÖSTES BEISPIEL")),
            sec.example.problem && React.createElement("p", { style: { fontWeight: 600, fontSize: 14, color: "var(--indigo-800)", margin: "0 0 12px", lineHeight: 1.5 } }, sec.example.problem),
            sec.example.solution && React.createElement("div", { style: { fontSize: 14, color: "var(--indigo-700)", lineHeight: 1.75, marginBottom: 10 }, dangerouslySetInnerHTML: { __html: _md(String(sec.example.solution).replace(/\n/g, "<br/>")) } }),
            sec.example.answer && React.createElement("div", { style: { fontWeight: 700, fontSize: 15, color: "var(--indigo-800)", borderTop: "1px solid var(--indigo-100)", paddingTop: 10, marginTop: 4 } }, L("→ Answer: ", "→ Відповідь: ", "→ Ответ: ", "→ Réponse : ", "→ Antwort: "), sec.example.answer)),

          // Pro tip
          sec.proTip && React.createElement("div", { style: { background: "var(--emerald-50)", border: "1px solid var(--emerald-100)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 14, color: "var(--emerald-700)", lineHeight: 1.6 } },
            "💡 ", React.createElement("strong", null, L("Pro tip: ", "Порада: ", "Совет: ", "Astuce : ", "Profi-Tipp: ")), sec.proTip),

          // Common mistake
          sec.commonMistake && React.createElement("div", { style: { background: "var(--red-50)", border: "1px solid var(--red-200)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 14, color: "var(--red-700)", lineHeight: 1.6 } },
            "⚠️ ", React.createElement("strong", null, L("Common mistake: ", "Типова помилка: ", "Типичная ошибка: ", "Erreur fréquente : ", "Häufiger Fehler: ")), sec.commonMistake),

          // Key points
          sec.keyPoints && sec.keyPoints.length > 0 && React.createElement("div", { style: { background: "var(--amber-50)", border: "1px solid var(--amber-200)", borderRadius: 12, padding: "14px 18px", marginBottom: 20 } },
            React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: "var(--amber-700)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 } }, L("🔑 KEY POINTS", "🔑 КЛЮЧОВІ МОМЕНТИ", "🔑 КЛЮЧЕВЫЕ МОМЕНТЫ", "🔑 POINTS CLÉS", "🔑 KERNPUNKTE")),
            ...sec.keyPoints.map((kp, i) => React.createElement("div", { key: i, style: { display: "flex", gap: 8, fontSize: 14, color: "var(--amber-700)", lineHeight: 1.5, marginBottom: 4 } },
              React.createElement("span", null, "•"), React.createElement("span", { dangerouslySetInnerHTML: { __html: _md(kp) } })))),

          // Continue button
          _btn(sec.quiz && sec.quiz.length > 0 ? L("Got it — quiz me →", "Зрозуміло — перевірте мене →", "Понятно — проверьте меня →", "Compris — testez-moi →", "Verstanden — frag mich ab →") : (secIdx + 1 < totalSections ? L("Got it, next section →", "Зрозуміло, наступний розділ →", "Понятно, следующий раздел →", "Compris, section suivante →", "Verstanden, nächster Abschnitt →") : L("See summary →", "Переглянути підсумок →", "Посмотреть итог →", "Voir le résumé →", "Zusammenfassung ansehen →")), goFromSection, true, false))));
  }

  // ─── QUIZ (after each section) ────────────────────────────────────────────
  if (phase === "quiz") {
    const quizzes = sec.quiz || [];
    const q = quizzes[quizIdx];
    if (!q) return React.createElement("div", { style: { padding: 40, textAlign: "center" } }, _btn(L("Continue →", "Продовжити →", "Продолжить →", "Continuer →", "Weiter →"), nextAfterQuiz, true, false));

    return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)" } },
      header,
      React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "20px 20px 24px" } },
        React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
          React.createElement("div", { style: { marginBottom: 12, display: "flex", gap: 8 } },
            _badge("var(--indigo-50)", "var(--indigo-600)", L(`📝 QUICK CHECK ${quizIdx + 1}/${quizzes.length}`, `📝 ШВИДКА ПЕРЕВІРКА ${quizIdx + 1}/${quizzes.length}`, `📝 БЫСТРАЯ ПРОВЕРКА ${quizIdx + 1}/${quizzes.length}`, `📝 VÉRIFICATION RAPIDE ${quizIdx + 1}/${quizzes.length}`, `📝 SCHNELLTEST ${quizIdx + 1}/${quizzes.length}`)),
            _badge("var(--emerald-50)", "var(--emerald-700)", sec.title)),
          React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 } },
            React.createElement("p", { style: { fontWeight: 600, fontSize: 16, margin: "0 0 16px", color: "var(--text-strong)", lineHeight: 1.5 }, dangerouslySetInnerHTML: { __html: _md(q.question) } }),
            React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
              ...(q.options || []).map((opt, i) => {
                const isCor = i === q.correct, isSel = i === selected;
                let bg = "var(--surface-card)", bc = "var(--border-default)", col = "var(--text-body)", lbg = "var(--slate-100)", lcol = "var(--slate-400)";
                if (revealed) {
                  if (isCor) { bg = "var(--emerald-50)"; bc = "var(--emerald-500)"; col = "var(--emerald-700)"; lbg = "var(--emerald-500)"; lcol = "white"; }
                  else if (isSel) { bg = "var(--red-50)"; bc = "var(--red-500)"; col = "var(--red-700)"; lbg = "var(--red-500)"; lcol = "white"; }
                  else { col = "var(--slate-300)"; bc = "var(--slate-100)"; }
                }
                return React.createElement("button", {
                  key: i, disabled: revealed, onClick: () => answerQuiz(i, q.correct),
                  style: { display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: bg, border: `1.5px solid ${bc}`, borderRadius: 14, color: col, fontSize: 14, textAlign: "left", cursor: revealed ? "default" : "pointer", width: "100%", fontFamily: "var(--font-sans)", transition: "all 0.15s" }
                },
                  React.createElement("span", { style: { width: 28, height: 28, borderRadius: 8, background: lbg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: lcol, flexShrink: 0 } }, ["A", "B", "C", "D"][i]),
                  React.createElement("span", { style: { lineHeight: 1.45, fontWeight: 500 } }, opt));
              })),
            revealed && q.explanation && React.createElement("div", {
              style: { marginTop: 14, padding: "12px 16px", background: selected === q.correct ? "var(--emerald-50)" : "var(--amber-50)", border: `1px solid ${selected === q.correct ? "var(--emerald-100)" : "var(--amber-200)"}`, borderRadius: 12, fontSize: 14, color: selected === q.correct ? "var(--emerald-700)" : "var(--amber-700)", lineHeight: 1.6 }
            }, selected === q.correct ? "✅ " : "💡 ", q.explanation)),
          revealed && React.createElement("div", { style: { marginTop: 16 } },
            _btn(quizIdx + 1 < quizzes.length ? L("Next question →", "Наступне питання →", "Следующий вопрос →", "Question suivante →", "Nächste Frage →") : secIdx + 1 < totalSections ? L("Next section →", "Наступний розділ →", "Следующий раздел →", "Section suivante →", "Nächster Abschnitt →") : L("See summary →", "Переглянути підсумок →", "Посмотреть итог →", "Voir le résumé →", "Zusammenfassung ansehen →"), nextAfterQuiz, true, false)))));
  }

  // ─── SUMMARY (cheat sheet) ────────────────────────────────────────────────
  if (phase === "summary") {
    const summaryPoints = plan.summary || [];
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)" } },
      header,
      React.createElement("div", { ref: scrollRef, style: { flex: 1, overflowY: "auto", padding: "20px 20px 24px" } },
        React.createElement("div", { style: { textAlign: "center", marginBottom: 20 } },
          React.createElement("span", { style: { fontSize: 40 } }, "📋"),
          React.createElement("h2", { style: { fontSize: 20, fontWeight: 700, color: "var(--text-strong)", margin: "8px 0 4px" } }, L("Key Takeaways", "Ключові висновки", "Ключевые выводы", "Points clés à retenir", "Wichtige Erkenntnisse")),
          React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", margin: 0 } }, L("Copy these into your notes!", "Занотуйте це собі!", "Запишите это себе!", "Copiez ceci dans vos notes !", "Notiere dir das!"))),
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24, marginBottom: 20 } },
          ...summaryPoints.map((point, i) => React.createElement("div", {
            key: i,
            style: { display: "flex", gap: 10, padding: "10px 0", borderBottom: i < summaryPoints.length - 1 ? "1px solid var(--border-subtle)" : "none" }
          },
            React.createElement("span", { style: { fontSize: 16, flexShrink: 0, color: "var(--indigo-500)" } }, "✦"),
            React.createElement("span", { style: { fontSize: 14, color: "var(--text-body)", lineHeight: 1.6 }, dangerouslySetInnerHTML: { __html: _md(point) } })))),
        _btn(L("Ready — test me! →", "Готовий — перевір мене! →", "Готов — проверь меня! →", "Prêt — testez-moi ! →", "Bereit — teste mich! →"), () => { setPhase("checkpoint"); scrollTop(); }, true, false)));
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
          t,
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
      React.createElement("h1", { style: { fontSize: 24, fontWeight: 700, color: "var(--text-strong)", margin: "0 0 4px", textAlign: "center" } }, L("Study Guide Complete!", "Навчальний посібник завершено!", "Учебное пособие завершено!", "Guide d'étude terminé !", "Lernleitfaden abgeschlossen!")),
      React.createElement("p", { style: { fontSize: 14, color: "var(--text-muted)", margin: "0 0 24px" } }, plan.title),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%", maxWidth: 360, marginBottom: 24 } },
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "16px", textAlign: "center" } },
          React.createElement("p", { style: { fontSize: 28, fontWeight: 700, color: accuracy >= 70 ? "var(--emerald-700)" : "var(--amber-700)", margin: 0 } }, `${accuracy}%`),
          React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" } }, L("Accuracy", "Точність", "Точность", "Précision", "Genauigkeit"))),
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "16px", textAlign: "center" } },
          React.createElement("p", { style: { fontSize: 28, fontWeight: 700, color: "var(--indigo-600)", margin: 0 } }, `+${finalXp}`),
          React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" } }, L("XP Earned", "Отримано XP", "Получено XP", "XP gagnés", "XP verdient"))),
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "16px", textAlign: "center" } },
          React.createElement("p", { style: { fontSize: 14, fontWeight: 600, color: "var(--text-muted)", margin: 0 } }, `${masteryBefore || 0}%`),
          React.createElement("p", { style: { fontSize: 20, fontWeight: 700, color: masteryDelta > 0 ? "var(--emerald-700)" : "var(--text-strong)", margin: "2px 0 0" } }, `→ ${masteryNow || 0}%`),
          React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" } }, L("Mastery", "Освоєння", "Освоение", "Maîtrise", "Beherrschung"))),
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "16px", textAlign: "center" } },
          React.createElement("p", { style: { fontSize: 28, fontWeight: 700, color: "var(--text-strong)", margin: 0 } }, `${totalSections}📖`),
          React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" } }, L("Sections", "Розділи", "Разделы", "Sections", "Abschnitte")))),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" } }, L(`${correctCount} of ${totalAnswered} questions correct`, `${correctCount} з ${totalAnswered} правильних відповідей`, `${correctCount} из ${totalAnswered} правильных ответов`, `${correctCount} sur ${totalAnswered} réponses correctes`, `${correctCount} von ${totalAnswered} richtigen Antworten`)),
      xpLevelAfter && React.createElement("div", { style: { width: "100%", maxWidth: 360, marginBottom: 16, background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "14px 16px" } },
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } },
          React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "var(--indigo-600)" } }, L(`⭐ Level ${xpLevelAfter.level}`, `⭐ Рівень ${xpLevelAfter.level}`, `⭐ Уровень ${xpLevelAfter.level}`, `⭐ Niveau ${xpLevelAfter.level}`, `⭐ Level ${xpLevelAfter.level}`)),
          React.createElement("span", { style: { fontSize: 11, color: "var(--text-muted)" } }, `${xpLevelAfter.into} / ${xpLevelAfter.need} XP`)),
        React.createElement("div", { style: { height: 8, background: "var(--border-subtle)", borderRadius: 4, overflow: "hidden" } },
          React.createElement("div", { style: { height: "100%", width: `${xpPctAfter}%`, background: "linear-gradient(90deg,var(--indigo-500),var(--indigo-600))", borderRadius: 4 } }))),
      _btn(L("Done →", "Готово →", "Готово →", "Terminé →", "Fertig →"), onExit, true, false));
  }

  return null;
}

// ─── FLASHCARD ENGINE (Review mode) ──────────────────────────────────────────

function QuickCheckEngine({ topic, onExit, t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
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
  const DIFFICULTY_LABELS = [
    L("Beginner", "Початківець", "Начинающий", "Débutant", "Anfänger"),
    L("Standard", "Стандарт", "Стандарт", "Standard", "Standard"),
    L("Challenging", "Складний", "Сложный", "Difficile", "Anspruchsvoll"),
    L("Advanced", "Просунутий", "Продвинутый", "Avancé", "Fortgeschritten"),
    L("Expert", "Експерт", "Эксперт", "Expert", "Experte"),
  ];
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

        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error(L("Took too long — try again.", "Це тривало занадто довго — спробуйте ще раз.", "Это длилось слишком долго — попробуйте ещё раз.", "Cela a pris trop de temps — réessayez.", "Das hat zu lange gedauert — versuche es erneut."))), 40000));
        const raw = await Promise.race([
          complete({ system, messages: [{ role: "user", content: `Generate a Quick Check on: ${topic}` }], topicContext }),
          timeout,
        ]);
        const parsed = window.parseJSON ? window.parseJSON(raw) : JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
        if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) throw new Error(L("Invalid questions", "Недійсні запитання", "Недействительные вопросы", "Questions invalides", "Ungültige Fragen"));
        setQuestions(parsed);
        setLoading(false);
      } catch (e) {
        console.error("Quick Check generation failed:", e);
        setError(e.message || L("Failed to generate questions", "Не вдалося згенерувати питання", "Не удалось сгенерировать вопросы", "Échec de la génération des questions", "Fragen konnten nicht generiert werden"));
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
      React.createElement("p", { style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)" } }, L("Preparing Quick Check...", "Готуємо швидку перевірку...", "Готовим быструю проверку...", "Préparation de la vérification rapide...", "Schnelltest wird vorbereitet...")),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)" } }, `${L("Topic", "Тема", "Тема", "Sujet", "Thema")}: ${topic}`),
      React.createElement("div", { style: { display: "flex", gap: 6 } },
        ...[0, 1, 2].map((d) => React.createElement("span", { key: d, style: { width: 8, height: 8, borderRadius: "50%", background: "var(--indigo-500)", animation: "loadDot 1.2s ease-in-out infinite", animationDelay: d * 0.2 + "s" } }))));
  }

  if (error) {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", gap: 16, padding: "0 24px" } },
      React.createElement("span", { style: { fontSize: 40 } }, "⚠️"),
      React.createElement("p", { style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)", margin: 0 } }, L("Couldn't generate questions", "Не вдалося згенерувати питання", "Не удалось сгенерировать вопросы", "Impossible de générer les questions", "Fragen konnten nicht generiert werden")),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", margin: 0, textAlign: "center" } }, error),
      _btn(L("← Back", "← Назад", "← Назад", "← Retour", "← Zurück"), onExit, false, false));
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
    const message = pct === 100 ? L(`${topic} locked in!`, `${topic} закріплено!`, `${topic} закреплено!`, `${topic} maîtrisé !`, `${topic} verinnerlicht!`) : pct >= 80 ? L("Almost perfect!", "Майже ідеально!", "Почти идеально!", "Presque parfait !", "Fast perfekt!") : pct >= 60 ? L("Good, but room to grow", "Непогано, є куди рости", "Неплохо, есть куда расти", "Bien, mais il y a de la marge", "Gut, aber noch Luft nach oben") : L("Let's review this topic", "Повторімо цю тему", "Повторим эту тему", "Révisons ce sujet", "Wiederholen wir dieses Thema");

    return React.createElement("div", {
      style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", padding: "0 24px", animation: "fadeUp 0.5s ease-out" }
    },
      React.createElement("span", { style: { fontSize: 56, marginBottom: 8, animation: "pulse 0.6s ease-in-out" } }, emoji),
      React.createElement("h1", { style: { fontSize: 24, fontWeight: 700, color: "var(--text-strong)", margin: "0 0 4px", textAlign: "center" } },
        `${correct}/${total} ✓`),
      React.createElement("p", { style: { fontSize: 15, color: "var(--text-muted)", margin: "0 0 24px", textAlign: "center" } }, message),

      levelUp && React.createElement("div", {
        style: { width: "100%", maxWidth: 340, background: "linear-gradient(135deg,var(--indigo-600),var(--indigo-600))", borderRadius: 14, padding: "14px 18px", marginBottom: 20, textAlign: "center", animation: "fadeUp 0.4s ease-out" }
      },
        React.createElement("p", { style: { margin: 0, fontSize: 15, fontWeight: 700, color: "white" } }, L(`🎉 Difficulty up — ${DIFFICULTY_LABELS[Math.min(4, difficulty)]}!`, `🎉 Складність підвищено — ${DIFFICULTY_LABELS[Math.min(4, difficulty)]}!`, `🎉 Сложность повышена — ${DIFFICULTY_LABELS[Math.min(4, difficulty)]}!`, `🎉 Difficulté augmentée — ${DIFFICULTY_LABELS[Math.min(4, difficulty)]} !`, `🎉 Schwierigkeit erhöht — ${DIFFICULTY_LABELS[Math.min(4, difficulty)]}!`)),
        React.createElement("p", { style: { margin: "3px 0 0", fontSize: 12, color: "rgba(255,255,255,0.85)" } }, L(`5 perfect Quick Checks in a row on ${topic}`, `5 ідеальних швидких перевірок поспіль з теми ${topic}`, `5 идеальных быстрых проверок подряд по теме ${topic}`, `5 vérifications rapides parfaites d'affilée sur ${topic}`, `5 perfekte Schnelltests in Folge zu ${topic}`))),

      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, width: "100%", maxWidth: 340, marginBottom: 24 } },
        ...[
          { val: `${pct}%`, label: L("Score", "Результат", "Результат", "Score", "Ergebnis"), color: pct >= 80 ? "var(--emerald-700)" : pct >= 60 ? "var(--amber-700)" : "var(--red-700)" },
          { val: `${elapsed}s`, label: L("Time", "Час", "Время", "Temps", "Zeit"), color: "var(--indigo-600)" },
          { val: `+${xpEarned}`, label: "XP", color: "var(--indigo-600)" },
        ].map((s, i) => React.createElement("div", { key: i, style: { textAlign: "center", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: "12px 8px" } },
          React.createElement("p", { style: { margin: 0, fontSize: 22, fontWeight: 700, color: s.color } }, s.val),
          React.createElement("p", { style: { margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" } }, s.label)))),

      wrongTopics.length > 0 && React.createElement("div", { style: { width: "100%", maxWidth: 340, background: "linear-gradient(135deg, var(--amber-50), var(--amber-100))", border: "1px solid var(--amber-200)", borderRadius: 12, padding: "12px 16px", marginBottom: 16 } },
        React.createElement("p", { style: { margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "var(--amber-700)", textTransform: "uppercase", letterSpacing: "0.05em" } }, L("Review these:", "Повторіть це:", "Повторите это:", "À revoir :", "Das solltest du wiederholen:")),
        ...wrongTopics.map((tp, i) => React.createElement("p", { key: i, style: { margin: "3px 0", fontSize: 13, color: "var(--amber-700)" } }, `→ ${tp}`))),

      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 } },
        _btn(L("Done →", "Готово →", "Готово →", "Terminé →", "Fertig →"), onExit, true, false)));
  }

  // ── Question view ──
  const q = questions.questions[idx];
  const total = questions.questions.length;
  const pct = Math.round(((idx + 1) / total) * 100);

  const renderQuestion = () => {
    if (q.type === "fill") {
      return React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 } },
          React.createElement("div", { style: { marginBottom: 14 } }, _badge("var(--amber-50)", "var(--amber-700)", L("✍️ FILL IN", "✍️ ЗАПОВНІТЬ", "✍️ ЗАПОЛНИТЕ", "✍️ COMPLÉTEZ", "✍️ AUSFÜLLEN"))),
          React.createElement("p", { style: { fontWeight: 600, fontSize: 16, margin: "0 0 20px", color: "var(--text-strong)", lineHeight: 1.5 }, dangerouslySetInnerHTML: { __html: _md(q.question).replace("___", "<u style='border-bottom:2px dashed var(--indigo-500);padding:0 8px;color:var(--indigo-500)'>___</u>") } }),
          !revealed && React.createElement("div", { style: { display: "flex", gap: 10 } },
            React.createElement("input", {
              value: fillInput, onChange: (e) => setFillInput(e.target.value),
              onKeyDown: (e) => { if (e.key === "Enter" && fillInput.trim()) answerFill(); },
              placeholder: L("Type your answer…", "Введіть відповідь…", "Введите ответ…", "Tapez votre réponse…", "Gib deine Antwort ein…"), autoFocus: true,
              style: { flex: 1, border: "1.5px solid var(--border-default)", borderRadius: 12, padding: "12px 16px", fontSize: 15, fontFamily: "var(--font-sans)", color: "var(--text-body)", background: "var(--surface-page)", outline: "none" }
            }),
            React.createElement("button", {
              onClick: fillInput.trim() ? answerFill : undefined, disabled: !fillInput.trim(),
              style: { padding: "12px 20px", background: fillInput.trim() ? "var(--indigo-600)" : "var(--indigo-200)", color: "white", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: fillInput.trim() ? "pointer" : "default", fontFamily: "var(--font-sans)" }
            }, L("Check", "Перевірити", "Проверить", "Vérifier", "Prüfen"))),
          revealed && React.createElement("div", {
            style: { padding: "12px 16px", background: selected === "correct" ? "linear-gradient(135deg, var(--emerald-50), var(--emerald-50))" : "linear-gradient(135deg, var(--amber-50), var(--amber-100))", border: `1px solid ${selected === "correct" ? "var(--emerald-100)" : "var(--amber-200)"}`, borderRadius: 12, fontSize: 14, color: selected === "correct" ? "var(--emerald-700)" : "var(--amber-700)", lineHeight: 1.6 }
          }, selected === "correct" ? L(`✅ Correct! "${q.answer}"`, `✅ Правильно! «${q.answer}»`, `✅ Правильно! «${q.answer}»`, `✅ Correct ! « ${q.answer} »`, `✅ Richtig! „${q.answer}"`) : L(`💡 The answer is "${q.answer}". ${q.explanation || ""}`, `💡 Правильна відповідь: «${q.answer}». ${q.explanation || ""}`, `💡 Правильный ответ: «${q.answer}». ${q.explanation || ""}`, `💡 La réponse est « ${q.answer} ». ${q.explanation || ""}`, `💡 Die Antwort ist „${q.answer}". ${q.explanation || ""}`))));
    }

    // MCQ
    return React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
      React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 } },
        React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 14 } },
          _badge("linear-gradient(135deg,var(--indigo-500),var(--indigo-600))", "white", L("⚡ QUESTION", "⚡ ПИТАННЯ", "⚡ ВОПРОС", "⚡ QUESTION", "⚡ FRAGE")),
          q.topic && _badge("var(--surface-muted)", "var(--text-muted)", q.topic)),
        React.createElement("p", { style: { fontWeight: 600, fontSize: 16, margin: "0 0 16px", color: "var(--text-strong)", lineHeight: 1.5 }, dangerouslySetInnerHTML: { __html: _md(q.question) } }),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
          ...(q.options || []).map((opt, i) => {
            const isCor = i === q.correct, isSel = i === selected;
            let bg = "var(--surface-card)", bc = "var(--border-default)", col = "var(--text-body)", lbg = "var(--slate-100)", lcol = "var(--slate-400)";
            if (revealed) {
              if (isCor) { bg = "var(--emerald-50)"; bc = "var(--emerald-500)"; col = "var(--emerald-700)"; lbg = "var(--emerald-500)"; lcol = "white"; }
              else if (isSel) { bg = "var(--red-50)"; bc = "var(--red-500)"; col = "var(--red-700)"; lbg = "var(--red-500)"; lcol = "white"; }
              else { col = "var(--slate-300)"; bc = "var(--slate-100)"; }
            }
            return React.createElement("button", {
              key: i, disabled: revealed, onClick: () => answerMcq(i),
              style: { display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: bg, border: `1.5px solid ${bc}`, borderRadius: 14, color: col, fontSize: 14, textAlign: "left", cursor: revealed ? "default" : "pointer", width: "100%", fontFamily: "var(--font-sans)", transition: "all 0.15s" }
            },
              React.createElement("span", { style: { width: 28, height: 28, borderRadius: 8, background: lbg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: lcol, flexShrink: 0 } }, ["A", "B", "C", "D"][i]),
              React.createElement("span", { style: { lineHeight: 1.45, fontWeight: 500 } }, opt));
          })),
        revealed && React.createElement("div", {
          style: { marginTop: 14, padding: "12px 16px", background: selected === q.correct ? "linear-gradient(135deg, var(--emerald-50), var(--emerald-50))" : "linear-gradient(135deg, var(--amber-50), var(--amber-100))", border: `1px solid ${selected === q.correct ? "var(--emerald-100)" : "var(--amber-200)"}`, borderRadius: 12, fontSize: 14, color: selected === q.correct ? "var(--emerald-700)" : "var(--amber-700)", lineHeight: 1.6 }
        }, selected === q.correct ? "✅ " : "💡 ", q.explanation)));
  };

  return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)" } },
    // Progress header
    React.createElement("div", { style: { padding: "12px 20px 0" } },
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } },
        React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } },
          React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "var(--text-strong)" } }, `${idx + 1} of ${total}`),
          difficulty > 1 && React.createElement("span", { style: { background: "var(--indigo-100)", color: "var(--indigo-700)", padding: "2px 8px", borderRadius: 10, fontWeight: 600, fontSize: 11 } }, DIFFICULTY_LABELS[difficulty - 1])),
        React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } },
          results.length > 0 && React.createElement("span", { style: { background: "var(--emerald-50)", color: "var(--emerald-700)", padding: "2px 8px", borderRadius: 10, fontWeight: 600, fontSize: 11 } }, `${results.filter((r) => r.correct).length}/${results.length} ✓`),
          React.createElement("button", { onClick: () => { setDone(true); _sfx.complete(); },
            style: { fontSize: 11, color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", textDecoration: "underline" } }, L("End", "Завершити", "Завершить", "Terminer", "Beenden")))),
      // Step dots
      React.createElement("div", { style: { display: "flex", gap: 4, marginBottom: 4 } },
        ...questions.questions.map((_, i) => {
          const r = results[i];
          const bg = i === idx ? "var(--indigo-500)" : r ? (r.correct ? "var(--emerald-500)" : "var(--red-500)") : "var(--border-subtle)";
          return React.createElement("div", { key: i, style: { flex: 1, height: 5, borderRadius: 3, background: bg, transition: "background 0.3s" } });
        })),
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginTop: 4 } },
        React.createElement("span", { style: { fontSize: 12, color: "var(--text-faint)", fontWeight: 500 } }, questions.sessionTitle || L(`Quick Check: ${topic}`, `Швидка перевірка: ${topic}`, `Быстрая проверка: ${topic}`, `Vérification rapide : ${topic}`, `Schnelltest: ${topic}`)),
        React.createElement("button", { onClick: onExit, style: { fontSize: 11, color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", textDecoration: "underline" } }, L("Exit", "Вийти", "Выйти", "Quitter", "Verlassen")))),

    // Question content
    React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "20px 20px 80px" } }, renderQuestion()),

    // Continue button at bottom
    revealed && React.createElement("div", { style: { padding: "12px 20px 20px" } },
      _btn(idx + 1 >= total ? L("See results →", "Переглянути результати →", "Посмотреть результаты →", "Voir les résultats →", "Ergebnisse ansehen →") : L("Next →", "Далі →", "Далее →", "Suivant →", "Weiter →"), advance, true, false)));
}

// ─── SPEED ROUND ENGINE ─────────────────────────────────────────────────────
// Pre-session setup → 20 rapid-fire questions, 30 sec each, summary at end.

function SpeedRoundEngine({ examViews, onExit, t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
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

        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error(L("Took too long.", "Це тривало занадто довго.", "Это длилось слишком долго.", "Cela a pris trop de temps.", "Das hat zu lange gedauert."))), 50000));
        const raw = await Promise.race([
          complete({ system, messages: [{ role: "user", content: `Generate ${totalQ} speed round questions` }] }),
          timeout,
        ]);
        const parsed = window.parseJSON ? window.parseJSON(raw) : JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
        if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) throw new Error(L("Invalid questions", "Недійсні запитання", "Недействительные вопросы", "Questions invalides", "Ungültige Fragen"));
        setQuestions(parsed.questions.slice(0, totalQ));
        setPhase("session");
      } catch (e) {
        setError(e.message || L("Failed to generate questions", "Не вдалося згенерувати питання", "Не удалось сгенерировать вопросы", "Échec de la génération des questions", "Fragen konnten nicht generiert werden"));
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
        React.createElement("h2", { style: { margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-strong)" } }, L("🏎️ Speed Round", "🏎️ Швидкий раунд", "🏎️ Быстрый раунд", "🏎️ Tour rapide", "🏎️ Speed-Runde"))),
      React.createElement("p", { style: { margin: "0 0 20px 28px", fontSize: 13, color: "var(--text-muted)" } }, L(`${totalQ} questions · ${perQ}s each · exam warmup`, `${totalQ} питань · по ${perQ}с · розминка перед іспитом`, `${totalQ} вопросов · по ${perQ}с · разминка перед экзаменом`, `${totalQ} questions · ${perQ}s chacune · échauffement examen`, `${totalQ} Fragen · je ${perQ}s · Prüfungs-Aufwärmen`)),

      // Mode toggle
      React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 20 } },
        ...[["ai", L("🤖 AI picks", "🤖 AI обирає", "🤖 AI выбирает", "🤖 L'IA choisit", "🤖 KI wählt")], ["manual", L("✋ I'll choose", "✋ Оберу сам", "✋ Выберу сам", "✋ Je choisis", "✋ Ich wähle")]].map(([key, label]) =>
          React.createElement("button", {
            key, onClick: () => setPickMode(key),
            style: { flex: 1, padding: "12px", borderRadius: 12, border: `1.5px solid ${pickMode === key ? "var(--indigo-500)" : "var(--border-default)"}`, background: pickMode === key ? "var(--indigo-50)" : "var(--surface-card)", fontSize: 14, fontWeight: 600, color: pickMode === key ? "var(--indigo-700)" : "var(--text-body)", cursor: "pointer", fontFamily: "var(--font-sans)" }
          }, label))),

      // AI picks view
      pickMode === "ai" && React.createElement("div", { style: { marginBottom: 20 } },
        aiLoading && React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "16px", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14 } },
          React.createElement("div", { style: { display: "flex", gap: 4 } },
            ...[0, 1, 2].map((d) => React.createElement("span", { key: d, style: { width: 6, height: 6, borderRadius: "50%", background: "var(--indigo-500)", animation: "loadDot 1.2s ease-in-out infinite", animationDelay: d * 0.15 + "s" } }))),
          React.createElement("span", { style: { fontSize: 13, color: "var(--text-muted)" } }, L("AI is picking your weakest topics...", "AI обирає ваші найслабші теми...", "AI выбирает ваши самые слабые темы...", "L'IA choisit vos sujets les plus faibles...", "KI wählt deine schwächsten Themen..."))),
        !aiLoading && aiTopics && React.createElement("div", null,
          React.createElement("p", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" } }, L("AI selected these topics for you", "AI обрав ці теми для вас", "AI выбрал эти темы для вас", "L'IA a sélectionné ces sujets pour vous", "Die KI hat diese Themen für dich ausgewählt")),
          React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 } },
            ...aiTopics.map((name, i) => React.createElement("span", {
              key: i,
              style: { padding: "8px 14px", background: "linear-gradient(135deg,var(--indigo-50),var(--indigo-100))", border: "1.5px solid var(--indigo-500)", borderRadius: 20, fontSize: 13, fontWeight: 600, color: "var(--indigo-700)" }
            }, name))),
          React.createElement("button", {
            onClick: () => { setAiTopics(null); pickAiTopics(); },
            style: { marginTop: 12, background: "none", border: "none", fontSize: 12, color: "var(--indigo-600)", cursor: "pointer", fontFamily: "var(--font-sans)", fontWeight: 600, padding: 0 }
          }, L("🔄 Reshuffle", "🔄 Перемішати", "🔄 Перемешать", "🔄 Mélanger", "🔄 Neu mischen")))),

      // Manual picks view
      pickMode === "manual" && React.createElement("div", { style: { marginBottom: 20 } },
        React.createElement("p", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" } }, L(`Pick 2-8 topics (${chosenTopics.length} selected)`, `Оберіть 2-8 тем (обрано: ${chosenTopics.length})`, `Выберите 2-8 тем (выбрано: ${chosenTopics.length})`, `Choisissez 2 à 8 sujets (${chosenTopics.length} sélectionné(s))`, `Wähle 2-8 Themen (${chosenTopics.length} ausgewählt)`)),
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
          React.createElement("span", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" } }, L("Your drill", "Ваше тренування", "Ваша тренировка", "Votre exercice", "Deine Übung")),
          React.createElement("span", { style: { fontSize: 11, color: "var(--text-muted)" } }, `~${Math.ceil(totalQ * perQ / 60)} ${L("min", "хв", "мин", "min", "Min.")}`)),
        React.createElement("div", { style: { display: "flex", gap: 20 } },
          React.createElement("div", null,
            React.createElement("p", { style: { fontSize: 22, fontWeight: 700, color: "var(--text-strong)", margin: 0 } }, totalQ),
            React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: 0 } }, L("questions", "питань", "вопросов", "questions", "Fragen"))),
          React.createElement("div", null,
            React.createElement("p", { style: { fontSize: 22, fontWeight: 700, color: "var(--text-strong)", margin: 0 } }, `${perQ}s`),
            React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: 0 } }, L("per question", "на питання", "на вопрос", "par question", "pro Frage"))),
          React.createElement("div", null,
            React.createElement("p", { style: { fontSize: 22, fontWeight: 700, color: "var(--text-strong)", margin: 0 } }, activeTopics.length),
            React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: 0 } }, L("topics", "тем", "тем", "sujets", "Themen"))))),

      // Start button
      React.createElement("button", {
        onClick: startRound, disabled: !canStart,
        style: { width: "100%", padding: "16px", borderRadius: 14, border: "none", background: canStart ? "linear-gradient(135deg,var(--indigo-500),var(--indigo-600))" : "var(--indigo-200)", color: "white", fontSize: 16, fontWeight: 700, cursor: canStart ? "pointer" : "default", fontFamily: "var(--font-sans)", marginTop: "auto" }
      }, L("Start Speed Round →", "Почати швидкий раунд →", "Начать быстрый раунд →", "Démarrer le tour rapide →", "Speed-Runde starten →")));
  }

  // ── Loading ──
  if (phase === "loading" && !error) {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", gap: 16 } },
      React.createElement(CoachIcon, { size: 56 }),
      React.createElement("p", { style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)" } }, L("Preparing Speed Round...", "Готуємо швидкий раунд...", "Готовим быстрый раунд...", "Préparation du tour rapide...", "Speed-Runde wird vorbereitet...")),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)" } }, L(`${totalQ} questions × ${perQ} seconds each`, `${totalQ} питань × по ${perQ} секунд`, `${totalQ} вопросов × по ${perQ} секунд`, `${totalQ} questions × ${perQ} secondes chacune`, `${totalQ} Fragen × je ${perQ} Sekunden`)),
      chosenTopics.length > 0 && React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", maxWidth: 340 } },
        ...chosenTopics.map((n, i) => React.createElement("span", { key: i, style: { padding: "4px 10px", background: "var(--indigo-50)", borderRadius: 12, fontSize: 11, color: "var(--indigo-700)", fontWeight: 600 } }, n))),
      React.createElement("div", { style: { display: "flex", gap: 6 } },
        ...[0, 1, 2].map((d) => React.createElement("span", { key: d, style: { width: 8, height: 8, borderRadius: "50%", background: "var(--indigo-500)", animation: "loadDot 1.2s ease-in-out infinite", animationDelay: d * 0.2 + "s" } }))));
  }

  if (error) {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", gap: 16, padding: "0 24px" } },
      React.createElement("span", { style: { fontSize: 40 } }, "⚠️"),
      React.createElement("p", { style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)" } }, L("Couldn't generate questions", "Не вдалося згенерувати питання", "Не удалось сгенерировать вопросы", "Impossible de générer les questions", "Fragen konnten nicht generiert werden")),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", textAlign: "center" } }, error),
      _btn(L("← Back", "← Назад", "← Назад", "← Retour", "← Zurück"), onExit, false, false));
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
      React.createElement("h1", { style: { fontSize: 24, fontWeight: 700, color: "var(--text-strong)", margin: "0 0 4px" } }, L("Speed Round Complete!", "Швидкий раунд завершено!", "Быстрый раунд завершён!", "Tour rapide terminé !", "Speed-Runde abgeschlossen!")),
      React.createElement("p", { style: { fontSize: 14, color: "var(--text-muted)", margin: "0 0 24px" } }, L(`${results.length} questions in ${Math.round(results.reduce((a, r) => a + (r.time || perQ), 0))}s`, `${results.length} питань за ${Math.round(results.reduce((a, r) => a + (r.time || perQ), 0))}с`, `${results.length} вопросов за ${Math.round(results.reduce((a, r) => a + (r.time || perQ), 0))}с`, `${results.length} questions en ${Math.round(results.reduce((a, r) => a + (r.time || perQ), 0))}s`, `${results.length} Fragen in ${Math.round(results.reduce((a, r) => a + (r.time || perQ), 0))}s`)),

      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, width: "100%", maxWidth: 380, marginBottom: 24 } },
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "16px", textAlign: "center" } },
          React.createElement("p", { style: { fontSize: 28, fontWeight: 700, color: accuracy >= 70 ? "var(--emerald-700)" : "var(--amber-700)", margin: 0 } }, `${accuracy}%`),
          React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" } }, L("Accuracy", "Точність", "Точность", "Précision", "Genauigkeit"))),
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "16px", textAlign: "center" } },
          React.createElement("p", { style: { fontSize: 28, fontWeight: 700, color: "var(--text-strong)", margin: 0 } }, `${avgTime}s`),
          React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" } }, L("Avg time", "Сер. час", "Ср. время", "Temps moyen", "Ø Zeit"))),
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "16px", textAlign: "center" } },
          React.createElement("p", { style: { fontSize: 28, fontWeight: 700, color: "var(--indigo-600)", margin: 0 } }, `+${earnedXp}`),
          React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" } }, "XP"))),

      timedOut > 0 && React.createElement("p", { style: { fontSize: 13, color: "var(--amber-700)", margin: "0 0 12px" } }, L(`⏰ ${timedOut} ${timedOut === 1 ? "question" : "questions"} timed out`, `⏰ Час вичерпано на ${timedOut} ${timedOut === 1 ? "питанні" : "питаннях"}`, `⏰ Время истекло на ${timedOut} ${timedOut === 1 ? "вопросе" : "вопросах"}`, `⏰ ${timedOut} question(s) — temps écoulé`, `⏰ Bei ${timedOut} Frage(n) die Zeit abgelaufen`)),

      // Post-session insight — repeated misses
      repeatedMiss.length > 0 && React.createElement("div", { style: { width: "100%", maxWidth: 380, marginBottom: 16, background: "var(--amber-50)", border: "1px solid var(--amber-200)", borderRadius: 14, padding: "14px 16px" } },
        React.createElement("p", { style: { margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "var(--amber-700)" } }, L("💡 Insight", "💡 Спостереження", "💡 Наблюдение", "💡 Analyse", "💡 Erkenntnis")),
        ...repeatedMiss.map(([topic, count], i) =>
          React.createElement("p", { key: i, style: { margin: "0 0 2px", fontSize: 13, color: "var(--amber-700)" } }, L(`You missed "${topic}" ${count}x — consider a Learn session on it.`, `Ви помилилися в темі «${topic}» ${count} рази — варто пройти сесію Навчання з неї.`, `Вы ошиблись в теме «${topic}» ${count} раза — стоит пройти сессию Обучения по ней.`, `Vous avez raté « ${topic} » ${count}x — envisagez une session d'apprentissage.`, `Du hast „${topic}" ${count}x verpasst — erwäge eine Lernsitzung dazu.`)))),

      // Wrong answers review
      results.filter((r) => !r.correct).length > 0 && React.createElement("div", { style: { width: "100%", maxWidth: 380, marginBottom: 16 } },
        React.createElement("p", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" } }, L("Review mistakes", "Перегляньте помилки", "Просмотрите ошибки", "Revoir les erreurs", "Fehler ansehen")),
        React.createElement("div", { style: { maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 } },
          ...results.filter((r) => !r.correct).map((r, i) => {
            const q = questions[r.qIdx];
            return q && React.createElement("div", { key: i, style: { background: "var(--red-50)", border: "1px solid var(--red-200)", borderRadius: 10, padding: "10px 14px", fontSize: 13 } },
              React.createElement("p", { style: { margin: "0 0 4px", fontWeight: 600, color: "var(--red-700)" } }, q.q),
              React.createElement("p", { style: { margin: 0, color: "var(--red-700)", fontSize: 12 } }, `✓ ${q.options[q.correct]}${q.explanation ? ` — ${q.explanation}` : ""}`));
          }))),

      _btn(L("Done →", "Готово →", "Готово →", "Terminé →", "Fertig →"), onExit, true, false));
  }

  // ── Session ──
  const q = questions[idx];
  if (!q) return null;
  const timerPct = (timer / perQ) * 100;
  const timerColor = timer <= 5 ? "var(--red-500)" : timer <= 10 ? "var(--amber-500)" : "var(--indigo-500)";

  return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)" } },
    // Top bar: timer + progress
    React.createElement("div", { style: { padding: "12px 20px 0" } },
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } },
        React.createElement("span", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)" } }, L(`Question ${idx + 1}/${questions.length}`, `Питання ${idx + 1}/${questions.length}`, `Вопрос ${idx + 1}/${questions.length}`, `Question ${idx + 1}/${questions.length}`, `Frage ${idx + 1}/${questions.length}`)),
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } },
          React.createElement("span", { style: { fontSize: 24, fontWeight: 700, color: timerColor, fontFamily: "var(--font-mono)", minWidth: 36, textAlign: "right" } }, timer),
          React.createElement("span", { style: { fontSize: 11, color: "var(--text-muted)" } }, L("sec", "с", "с", "s", "Sek."))),
        React.createElement("span", { style: { fontSize: 12, color: "var(--text-muted)" } }, `${results.filter((r) => r.correct).length}✓ ${results.filter((r) => !r.correct).length}✗`)),
      // Timer bar
      React.createElement("div", { style: { height: 4, background: "var(--surface-muted)", borderRadius: 2, overflow: "hidden" } },
        React.createElement("div", { style: { height: "100%", width: "100%", transform: `scaleX(${timerPct / 100})`, transformOrigin: "left", background: timerColor, borderRadius: 2, transition: "transform 1s linear, background 0.3s" } })),
      // Progress dots
      React.createElement("div", { style: { display: "flex", gap: 3, marginTop: 6, justifyContent: "center" } },
        ...questions.map((_, i) => {
          const r = results[i];
          const bg = i === idx ? timerColor : r ? (r.correct ? "var(--emerald-500)" : "var(--red-500)") : "var(--border-subtle)";
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
            if (i === q.correct) { bg = "var(--emerald-50)"; bc = "var(--emerald-500)"; col = "var(--emerald-700)"; }
            else if (i === selected) { bg = "var(--red-50)"; bc = "var(--red-500)"; col = "var(--red-700)"; }
            else { col = "var(--slate-300)"; bc = "var(--slate-100)"; }
          }
          return React.createElement("button", {
            key: i, disabled: selected !== null,
            onClick: () => answer(i),
            style: { display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: bg, border: `1.5px solid ${bc}`, borderRadius: 14, color: col, fontSize: 14, textAlign: "left", cursor: selected !== null ? "default" : "pointer", width: "100%", fontFamily: "var(--font-sans)", fontWeight: 500, transition: "all 0.15s" }
          },
            React.createElement("span", { style: { width: 28, height: 28, borderRadius: 8, background: selected !== null && i === q.correct ? "var(--emerald-500)" : selected === i ? "var(--red-500)" : "var(--slate-100)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: selected !== null && (i === q.correct || i === selected) ? "white" : "var(--slate-400)", flexShrink: 0 } }, ["A", "B", "C", "D"][i]),
            opt);
        }))));
}

// ─── PRACTICE ENGINE (Exam simulation) ───────────────────────────────────────

function PracticeEngine({ examViews, onExit, t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
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
      { key: "easy", label: L("Easy", "Легкий", "Лёгкий", "Facile", "Leicht"), emoji: "😊", desc: L("Basics & definitions", "Основи та визначення", "Основы и определения", "Bases et définitions", "Grundlagen & Definitionen") },
      { key: "medium", label: L("Medium", "Середній", "Средний", "Moyen", "Mittel"), emoji: "🎯", desc: L("Standard exam level", "Стандартний рівень іспиту", "Стандартный уровень экзамена", "Niveau d'examen standard", "Standard-Prüfungsniveau") },
      { key: "hard", label: L("Hard", "Складний", "Сложный", "Difficile", "Schwer"), emoji: "🔥", desc: L("Tricky edge cases", "Складні граничні випадки", "Сложные граничные случаи", "Cas limites délicats", "Knifflige Grenzfälle") },
      { key: "adaptive", label: L("Adaptive", "Адаптивний", "Адаптивный", "Adaptatif", "Adaptiv"), emoji: "🤖", desc: L("AI adjusts in real-time", "AI підлаштовується в реальному часі", "AI подстраивается в реальном времени", "L'IA s'ajuste en temps réel", "KI passt sich in Echtzeit an") },
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

        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error(L("Took too long.", "Це тривало занадто довго.", "Это длилось слишком долго.", "Cela a pris trop de temps.", "Das hat zu lange gedauert."))), 45000));
        const raw = await Promise.race([
          complete({ system, messages: [{ role: "user", content: `Generate a ${config.difficulty} practice exam on: ${topicList}` }] }),
          timeout,
        ]);
        const parsed = window.parseJSON ? window.parseJSON(raw) : JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
        if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) throw new Error(L("Invalid questions", "Недійсні запитання", "Недействительные вопросы", "Questions invalides", "Ungültige Fragen"));
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
        React.createElement("h2", { style: { margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-strong)" } }, L("🎯 Practice Exam", "🎯 Тренувальний іспит", "🎯 Тренировочный экзамен", "🎯 Examen d'entraînement", "🎯 Übungsprüfung"))),

      // Difficulty
      React.createElement("p", { style: { fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" } }, L("Difficulty", "Складність", "Сложность", "Difficulté", "Schwierigkeit")),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 } },
        ...DIFFS.map((d) => React.createElement("button", {
          key: d.key, onClick: () => setConfig((c) => ({ ...c, difficulty: d.key })),
          style: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: config.difficulty === d.key ? "var(--indigo-50)" : "var(--surface-card)", border: `1.5px solid ${config.difficulty === d.key ? "var(--indigo-500)" : "var(--border-default)"}`, borderRadius: 12, cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left" }
        },
          React.createElement("span", { style: { fontSize: 20 } }, d.emoji),
          React.createElement("div", null,
            React.createElement("p", { style: { margin: 0, fontSize: 13, fontWeight: 600, color: config.difficulty === d.key ? "var(--indigo-700)" : "var(--text-strong)" } }, d.label),
            React.createElement("p", { style: { margin: 0, fontSize: 11, color: "var(--text-muted)" } }, d.desc))))),

      // Topics
      React.createElement("p", { style: { fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" } }, L("Topics", "Теми", "Темы", "Sujets", "Themen")),
      React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 } },
        ...allTopics.slice(0, 12).map((tp) => {
          const on = selectedTopics.includes(tp.name);
          return React.createElement("button", {
            key: tp.name, onClick: () => setConfig((c) => {
              const cur = c.topics.length > 0 ? c.topics : allTopics.slice(0, 3).map((t) => t.name);
              return { ...c, topics: on ? cur.filter((n) => n !== tp.name) : [...cur, tp.name] };
            }),
            style: { padding: "6px 12px", fontSize: 12, fontWeight: 600, borderRadius: 20, border: `1px solid ${on ? "var(--indigo-500)" : "var(--border-default)"}`, background: on ? "var(--indigo-50)" : "var(--surface-card)", color: on ? "var(--indigo-700)" : "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font-sans)" }
          }, tp.name);
        })),

      // Start button
      _btn(L("Start Practice →", "Почати тренування →", "Начать тренировку →", "Démarrer l'entraînement →", "Übung starten →"), startPractice, true, false));
  }

  // ── Loading ──
  if (loading) {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", gap: 16 } },
      React.createElement(CoachIcon, { size: 56 }),
      React.createElement("p", { style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)" } }, L("Generating your exam...", "Створюємо ваш іспит...", "Создаём ваш экзамен...", "Génération de votre examen...", "Deine Prüfung wird erstellt...")),
      React.createElement("div", { style: { display: "flex", gap: 6 } },
        ...[0, 1, 2].map((d) => React.createElement("span", { key: d, style: { width: 8, height: 8, borderRadius: "50%", background: "var(--indigo-500)", animation: "loadDot 1.2s ease-in-out infinite", animationDelay: d * 0.2 + "s" } }))));
  }

  if (error) {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", gap: 16, padding: "0 24px" } },
      React.createElement("span", { style: { fontSize: 40 } }, "⚠️"),
      React.createElement("p", { style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)", margin: 0 } }, L("Couldn't generate exam", "Не вдалося створити іспит", "Не удалось создать экзамен", "Impossible de générer l'examen", "Prüfung konnte nicht erstellt werden")),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", margin: 0 } }, error),
      _btn(L("← Back", "← Назад", "← Назад", "← Retour", "← Zurück"), () => { setPhase("setup"); setError(null); }, false, false));
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
      const tp = r.topic || L("Unknown", "Невідомо", "Неизвестно", "Inconnu", "Unbekannt");
      if (!byTopic[tp]) byTopic[tp] = { correct: 0, total: 0 };
      byTopic[tp].total++;
      if (r.correct) byTopic[tp].correct++;
    });
    const weakTopics = Object.entries(byTopic).filter(([, v]) => v.correct / v.total < 0.5).map(([k]) => k);

    return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", padding: "0 24px", animation: "fadeUp 0.5s ease-out", gap: 4 } },
      React.createElement("span", { style: { fontSize: 56, marginBottom: 8 } }, pct >= 80 ? "🏆" : pct >= 60 ? "✨" : "💪"),
      React.createElement("h1", { style: { fontSize: 24, fontWeight: 700, color: "var(--text-strong)", margin: "0 0 4px" } }, L("Practice Complete!", "Тренування завершено!", "Тренировка завершена!", "Entraînement terminé !", "Übung abgeschlossen!")),
      React.createElement("p", { style: { fontSize: 14, color: "var(--text-muted)", margin: "0 0 24px" } }, L(`${correct}/${total} correct · ${pct}%`, `${correct}/${total} правильно · ${pct}%`, `${correct}/${total} правильно · ${pct}%`, `${correct}/${total} correct · ${pct}%`, `${correct}/${total} richtig · ${pct}%`)),

      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, width: "100%", maxWidth: 340, marginBottom: 20 } },
        ...[
          { val: `${pct}%`, label: L("Score", "Результат", "Результат", "Score", "Ergebnis"), color: pct >= 70 ? "var(--emerald-700)" : "var(--red-700)" },
          { val: `${total}`, label: L("Questions", "Питання", "Вопросы", "Questions", "Fragen"), color: "var(--indigo-600)" },
          { val: `+${xpEarned}`, label: "XP", color: "var(--indigo-600)" },
        ].map((s, i) => React.createElement("div", { key: i, style: { textAlign: "center", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: "12px 8px" } },
          React.createElement("p", { style: { margin: 0, fontSize: 22, fontWeight: 700, color: s.color } }, s.val),
          React.createElement("p", { style: { margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" } }, s.label)))),

      weakTopics.length > 0 && React.createElement("div", { style: { width: "100%", maxWidth: 340, background: "var(--amber-50)", border: "1px solid var(--amber-200)", borderRadius: 12, padding: "12px 16px", marginBottom: 16 } },
        React.createElement("p", { style: { margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "var(--amber-700)", textTransform: "uppercase" } }, L("🎯 Pattern detected — focus on:", "🎯 Виявлено закономірність — зверніть увагу на:", "🎯 Обнаружена закономерность — обратите внимание на:", "🎯 Schéma détecté — concentrez-vous sur :", "🎯 Muster erkannt — konzentriere dich auf:")),
        ...weakTopics.map((tp, i) => React.createElement("p", { key: i, style: { margin: "3px 0", fontSize: 13, color: "var(--amber-700)" } }, `• ${tp}`))),

      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 } },
        _btn(L("Done →", "Готово →", "Готово →", "Terminé →", "Fertig →"), onExit, true, false)));
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
    { key: "guessing", emoji: "🤔", label: L("Guessing", "Здогадка", "Догадка", "Je devine", "Rate mal") },
    { key: "okay", emoji: "🤨", label: L("Okay", "Нормально", "Нормально", "Correct", "Okay") },
    { key: "easy", emoji: "😎", label: L("Easy", "Легко", "Легко", "Facile", "Einfach") },
  ];

  return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)" } },
    // Progress header
    React.createElement("div", { style: { padding: "12px 20px 0" } },
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } },
        React.createElement("span", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)" } }, L(`Question ${qIdx + 1} / ${totalQ}`, `Питання ${qIdx + 1} / ${totalQ}`, `Вопрос ${qIdx + 1} / ${totalQ}`, `Question ${qIdx + 1} / ${totalQ}`, `Frage ${qIdx + 1} / ${totalQ}`)),
        React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", fontSize: 12 } },
          q.difficulty && _badge(q.difficulty === "hard" ? "var(--red-50)" : q.difficulty === "easy" ? "var(--emerald-50)" : "var(--amber-50)",
            q.difficulty === "hard" ? "var(--red-700)" : q.difficulty === "easy" ? "var(--emerald-700)" : "var(--amber-700)", q.difficulty),
          React.createElement("button", { onClick: () => setPhase("summary"),
            style: { fontSize: 11, color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", textDecoration: "underline" } }, L("End exam", "Завершити іспит", "Завершить экзамен", "Terminer l'examen", "Prüfung beenden")))),
      React.createElement("div", { style: { height: 4, background: "var(--surface-muted)", borderRadius: 2, overflow: "hidden" } },
        React.createElement("div", { style: { height: "100%", width: "100%", transform: `scaleX(${pctDone / 100})`, transformOrigin: "left", background: "linear-gradient(90deg,var(--indigo-500),var(--indigo-600))", borderRadius: 2, transition: "transform 0.4s" } }))),

    // Content
    React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "20px" } },
      // Pattern alert
      patternAlert && !revealed && !showWhy && React.createElement("div", {
        style: { marginBottom: 16, padding: "12px 16px", background: "var(--red-50)", border: "1px solid var(--red-400)", borderRadius: 12, animation: "fadeUp 0.3s" }
      },
        React.createElement("p", { style: { margin: 0, fontSize: 13, fontWeight: 700, color: "var(--red-700)" } }, L("🎯 Pattern detected", "🎯 Виявлено закономірність", "🎯 Обнаружена закономерность", "🎯 Schéma détecté", "🎯 Muster erkannt")),
        React.createElement("p", { style: { margin: "4px 0 0", fontSize: 12, color: "var(--red-600)" } }, L(`You've struggled with ${patternAlert.topic} ${patternAlert.count} times. Consider a refresher after this exam.`, `Ви ${patternAlert.count} разів мали труднощі з темою ${patternAlert.topic}. Варто повторити її після цього іспиту.`, `У вас ${patternAlert.count} раз(а) были трудности с темой ${patternAlert.topic}. Стоит повторить её после этого экзамена.`, `Vous avez eu du mal avec ${patternAlert.topic} ${patternAlert.count} fois. Envisagez une révision après cet examen.`, `Du hattest ${patternAlert.count}x Schwierigkeiten mit ${patternAlert.topic}. Erwäge eine Auffrischung nach dieser Prüfung.`))),

      // Question card
      React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24, animation: "fadeUp 0.3s ease-out" } },
        q.topic && React.createElement("div", { style: { marginBottom: 10 } }, _badge("var(--indigo-50)", "var(--indigo-600)", q.topic)),
        React.createElement("p", { style: { fontWeight: 600, fontSize: 16, margin: "0 0 16px", color: "var(--text-strong)", lineHeight: 1.5 }, dangerouslySetInnerHTML: { __html: _md(q.question) } }),

        // Options
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
          ...(q.options || []).map((opt, i) => {
            const isCorrect = i === q.correct;
            const isSel = i === selected;
            let bg = "var(--surface-card)", bc = "var(--border-default)", col = "var(--text-body)", lbg = "var(--slate-100)", lcol = "var(--slate-400)";
            if (revealed || showWhy) {
              if (isCorrect) { bg = "var(--emerald-50)"; bc = "var(--emerald-500)"; col = "var(--emerald-700)"; lbg = "var(--emerald-500)"; lcol = "white"; }
              else if (isSel) { bg = "var(--red-50)"; bc = "var(--red-500)"; col = "var(--red-700)"; lbg = "var(--red-500)"; lcol = "white"; }
              else { col = "var(--slate-300)"; bc = "var(--slate-100)"; }
            } else if (isSel) { bg = "var(--indigo-50)"; bc = "var(--indigo-500)"; col = "var(--indigo-700)"; lbg = "var(--indigo-500)"; lcol = "white"; }
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
          React.createElement("p", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", margin: "0 0 8px" } }, L("How confident are you?", "Наскільки ви впевнені?", "Насколько вы уверены?", "Quel est votre degré de confiance ?", "Wie sicher bist du dir?")),
          React.createElement("div", { style: { display: "flex", gap: 8 } },
            ...CONF_OPTS.map((c) => React.createElement("button", {
              key: c.key, onClick: () => setConfidence(c.key),
              style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 8px", background: confidence === c.key ? "var(--indigo-50)" : "var(--surface-card)", border: `1.5px solid ${confidence === c.key ? "var(--indigo-500)" : "var(--border-default)"}`, borderRadius: 10, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, color: confidence === c.key ? "var(--indigo-700)" : "var(--text-muted)" }
            }, React.createElement("span", null, c.emoji), c.label)))),

        // Submit button
        selected !== null && confidence !== null && !revealed && !showWhy && React.createElement("div", { style: { marginTop: 12 } },
          _btn(L("Submit →", "Надіслати →", "Отправить →", "Envoyer →", "Absenden →"), submitAnswer, true, false)),

        // "Why did you choose?" (wrong answer)
        showWhy && React.createElement("div", { style: { marginTop: 16, animation: "fadeUp 0.3s" } },
          React.createElement("div", { style: { padding: "12px 16px", background: "var(--amber-50)", border: "1px solid var(--amber-200)", borderRadius: 12, marginBottom: 12 } },
            React.createElement("p", { style: { margin: 0, fontSize: 14, fontWeight: 600, color: "var(--amber-700)" } }, L(`Why did you choose ${["A", "B", "C", "D"][selected]}?`, `Чому ви обрали ${["A", "B", "C", "D"][selected]}?`, `Почему вы выбрали ${["A", "B", "C", "D"][selected]}?`, `Pourquoi avez-vous choisi ${["A", "B", "C", "D"][selected]} ?`, `Warum hast du ${["A", "B", "C", "D"][selected]} gewählt?`)),
            React.createElement("p", { style: { margin: "4px 0 0", fontSize: 12, color: "var(--amber-700)" } }, L("Explain your reasoning — this helps you learn from mistakes.", "Поясніть свою логіку — це допоможе вчитися на помилках.", "Объясните свою логику — это поможет учиться на ошибках.", "Expliquez votre raisonnement — cela vous aide à apprendre de vos erreurs.", "Erkläre deine Überlegung — das hilft dir, aus Fehlern zu lernen."))),
          React.createElement("textarea", {
            value: whyInput, onChange: (e) => setWhyInput(e.target.value), autoFocus: true,
            placeholder: L("I thought this because...", "Я так вважав, тому що...", "Я так думал, потому что...", "J'ai pensé cela parce que...", "Ich dachte das, weil..."), rows: 2,
            style: { width: "100%", border: "1px solid var(--border-default)", borderRadius: 12, padding: "10px 14px", fontSize: 13, fontFamily: "var(--font-sans)", color: "var(--text-body)", background: "var(--surface-page)", resize: "none", outline: "none", boxSizing: "border-box" }
          }),
          React.createElement("div", { style: { marginTop: 8 } },
            _btn(whyInput.trim() ? L("See explanation →", "Переглянути пояснення →", "Посмотреть объяснение →", "Voir l'explication →", "Erklärung ansehen →") : L("Skip →", "Пропустити →", "Пропустить →", "Passer →", "Überspringen →"), () => { setShowWhy(false); setRevealed(true); }, true, false))),

        // Explanation (after reveal)
        revealed && React.createElement("div", { style: { marginTop: 14, padding: "12px 16px", background: results[results.length - 1]?.correct ? "var(--emerald-50)" : "var(--amber-50)", border: `1px solid ${results[results.length - 1]?.correct ? "var(--emerald-100)" : "var(--amber-200)"}`, borderRadius: 12, fontSize: 14, color: results[results.length - 1]?.correct ? "var(--emerald-700)" : "var(--amber-700)", lineHeight: 1.6 } },
          results[results.length - 1]?.correct ? "✅ " : "💡 ", q.explanation)),

      // Continue button
      revealed && React.createElement("div", { style: { marginTop: 16 } }, _btn(L("Continue →", "Продовжити →", "Продолжить →", "Continuer →", "Weiter →"), advance, true, false))));
}

// ─── EXAM SIMULATION ─────────────────────────────────────────────────────────
// A full timed mock exam for ONE subject, covering ALL of its topics (not just
// weak ones) — distinct from Practice (untimed, topic-picked, reveals per
// question) and Speed Round (per-question 30s clock, weak-topics only). Here
// the clock is a single exam-wide countdown and nothing is revealed until the
// whole paper is submitted, matching how a real exam actually works.
// Official-ish mock-exam shape per qualification: how many objective questions
// a real paper runs, and a style/difficulty note that steers the generator
// toward that exam's actual character. Falls back to a topic-count heuristic
// for anything not listed. Extend by adding a key — no code change needed.
const EXAM_MOCK_SPECS = {
  nmt:    { count: 20, note: "НМТ style: single-best-answer and matching items, moderate-to-hard, curriculum-faithful to the Ukrainian program." },
  sat:    { count: 22, note: "Digital SAT style: concise multiple-choice, evidence and reasoning focus, adaptive difficulty." },
  act:    { count: 20, note: "ACT style: fast-paced four-option multiple-choice." },
  ap:     { count: 16, note: "AP style: college-level multiple-choice, application-heavy." },
  ib:     { count: 18, note: "IB style: multiple-choice using command terms, HL-level rigour." },
  gcse:   { count: 18, note: "GCSE style: graduated difficulty from foundation to higher tier." },
  alevel: { count: 18, note: "A-Level style: demanding multi-step multiple-choice." },
  matura: { count: 18, note: "Matura style: exam-board multiple-choice." },
  abitur: { count: 16, note: "Abitur style: analytical multiple-choice." },
};

function ExamSimEngine({ examViews, onExit, t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
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
  // Resolve the exam's qualification (nmt/sat/...) via its Course's curriculumRef
  // to pick the official mock spec; fall back to a topic-count heuristic.
  const examQual = React.useMemo(() => {
    const ex = window.getExams ? window.getExams().find((e) => e.id === examId) : null;
    const course = ex && ex.courseId && window.getCourse ? window.getCourse(ex.courseId) : null;
    return (course && course.curriculumRef && course.curriculumRef.qualificationId) || null;
  }, [examId]);
  const mockSpec = EXAM_MOCK_SPECS[examQual] || null;
  const questionCount = mockSpec ? mockSpec.count : Math.max(12, Math.min(24, examTopics.length > 0 ? examTopics.length * 2 : 16));
  const styleNote = mockSpec ? mockSpec.note : "at genuine exam difficulty for this subject";
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
      // Generate in PARALLEL CHUNKS of ~6 questions each, not one giant call.
      // A single 20-24 question request with explanations regularly blew past
      // the 60s budget or returned truncated/invalid JSON on the fast model —
      // that was the "Couldn't generate exam / Took too long" bug. Small chunks
      // each finish quickly, run concurrently, and a chunk that fails just
      // trims the paper instead of failing the whole exam.
      try {
        const complete = window.brainComplete || ((a) => window.claude.complete(a));
        const topics = examTopics.length > 0 ? examTopics : [selectedExam.name];
        const CHUNK = 6;
        const numChunks = Math.max(1, Math.ceil(questionCount / CHUNK));
        const perChunk = Math.ceil(questionCount / numChunks);
        // Round-robin the topics across chunks so coverage is even.
        const chunkTopics = Array.from({ length: numChunks }, (_, i) => {
          const ts = topics.filter((_, j) => j % numChunks === i);
          return ts.length ? ts : topics.slice(0, Math.min(3, topics.length));
        });
        const langDir = window.aiLangDirective ? window.aiLangDirective() : "";
        const makeChunk = (ts) => {
          const system = `You are an exam board writing part of a real mock paper for "${selectedExam.name}". ${styleNote} Write exactly ${perChunk} exam-style multiple-choice questions on these topics: ${ts.join(", ")}.
OUTPUT ONLY valid JSON — no markdown, no fences. Start with { end with }.
FORMAT: {"questions":[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"1-2 sentences","topic":"which topic"}]}
RULES: exactly 4 options; "correct" is a 0-based index; genuine exam difficulty; explanation teaches WHY; no duplicate concepts.${langDir ? " " + langDir : ""}`;
          const to = new Promise((_, rej) => setTimeout(() => rej(new Error("chunk timeout")), 45000));
          return Promise.race([complete({ system, messages: [{ role: "user", content: `Generate ${perChunk} questions on: ${ts.join(", ")}` }] }), to])
            .then((raw) => {
              const p = window.parseJSON ? window.parseJSON(raw) : JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
              return Array.isArray(p && p.questions) ? p.questions : [];
            })
            .catch(() => []);
        };
        const chunks = await Promise.all(chunkTopics.map(makeChunk));
        // Merge, validate shape, cap at target count.
        const all = chunks.flat().filter((q) => q && typeof q.question === "string" && Array.isArray(q.options) && q.options.length === 4 && typeof q.correct === "number").slice(0, questionCount);
        if (all.length === 0) throw new Error(L("Took too long — try again.", "Це тривало занадто довго — спробуйте ще раз.", "Это длилось слишком долго — попробуйте ещё раз.", "Cela a pris trop de temps — réessayez.", "Das hat zu lange gedauert — versuche es erneut."));
        const secs = Math.round(all.length * 1.5) * 60;
        setQuestions(all);
        setAnswers(new Array(all.length).fill(null));
        setIdx(0);
        setTimeLeft(secs);
        setTimeLimitSec(secs);
        setPhase("session");
      } catch (e) {
        console.error("Exam simulation generation failed:", e);
        setError(e.message || L("Failed to generate exam", "Не вдалося створити іспит", "Не удалось создать экзамен", "Échec de la génération de l'examen", "Prüfung konnte nicht erstellt werden"));
        setPhase("setup");
      }
    };

    return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", padding: "24px 20px", overflowY: "auto" } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 20 } },
        React.createElement("button", { onClick: onExit, style: { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted)", padding: 0 } }, "←"),
        React.createElement("h2", { style: { margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-strong)" } }, L("📝 Exam Simulation", "📝 Симуляція іспиту", "📝 Симуляция экзамена", "📝 Simulation d'examen", "📝 Prüfungssimulation"))),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", margin: "0 0 20px" } }, L("A full timed mock exam covering every topic in one subject — no answers revealed until you submit, just like the real thing.", "Повноцінний пробний іспит з таймером, що охоплює всі теми одного предмета — відповіді не показуються, доки ви не здасте, як на справжньому іспиті.", "Полноценный пробный экзамен с таймером, охватывающий все темы одного предмета — ответы не показываются, пока вы не сдадите, как на настоящем экзамене.", "Un examen blanc chronométré complet couvrant tous les sujets d'une matière — aucune réponse révélée avant la soumission, comme un vrai examen.", "Eine vollständige zeitlich begrenzte Testprüfung, die alle Themen eines Fachs abdeckt — keine Antworten werden angezeigt, bis du abgibst, genau wie in echt.")),

      error && React.createElement("div", { style: { padding: "12px 16px", background: "var(--red-50)", border: "1px solid var(--red-400)", borderRadius: 12, marginBottom: 16 } },
        React.createElement("p", { style: { margin: 0, fontSize: 13, color: "var(--red-700)" } }, error)),

      React.createElement("p", { style: { fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" } }, L("Subject", "Предмет", "Предмет", "Matière", "Fach")),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 } },
        ...examViews.map((e) => React.createElement("button", {
          key: e.id, onClick: () => setExamId(e.id),
          style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", background: examId === e.id ? "var(--indigo-50)" : "var(--surface-card)", border: `1.5px solid ${examId === e.id ? "var(--indigo-500)" : "var(--border-default)"}`, borderRadius: 12, cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left" }
        },
          React.createElement("span", { style: { fontSize: 14, fontWeight: 600, color: examId === e.id ? "var(--indigo-700)" : "var(--text-strong)" } }, e.name),
          React.createElement("span", { style: { fontSize: 12, color: "var(--text-muted)" } }, L(`${(e.topics || []).length || "?"} topics`, `${(e.topics || []).length || "?"} тем`, `${(e.topics || []).length || "?"} тем`, `${(e.topics || []).length || "?"} sujets`, `${(e.topics || []).length || "?"} Themen`))))),

      selectedExam && React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24, background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: "14px 8px" } },
        ...[
          { val: questionCount, label: L("Questions", "Питання", "Вопросы", "Questions", "Fragen") },
          { val: `~${estMinutes}m`, label: L("Time limit", "Ліміт часу", "Лимит времени", "Limite de temps", "Zeitlimit") },
          { val: examTopics.length || L("All", "Усі", "Все", "Tous", "Alle"), label: L("Topics", "Теми", "Темы", "Sujets", "Themen") },
        ].map((s, i) => React.createElement("div", { key: i, style: { textAlign: "center" } },
          React.createElement("p", { style: { margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-strong)" } }, s.val),
          React.createElement("p", { style: { margin: "2px 0 0", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" } }, s.label)))),

      _btn(selectedExam ? L("Start exam →", "Почати іспит →", "Начать экзамен →", "Démarrer l'examen →", "Prüfung starten →") : L("Add a subject first", "Спочатку додайте предмет", "Сначала добавьте предмет", "Ajoutez d'abord une matière", "Füge zuerst ein Fach hinzu"), startExam, true, !selectedExam));
  }

  // ── Loading ──
  if (phase === "loading") {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", gap: 16 } },
      React.createElement(CoachIcon, { size: 56 }),
      React.createElement("p", { style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)" } }, L("Assembling your mock exam...", "Складаємо ваш пробний іспит...", "Составляем ваш пробный экзамен...", "Préparation de votre examen blanc...", "Deine Testprüfung wird zusammengestellt...")),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)" } }, selectedExam?.name),
      React.createElement("div", { style: { display: "flex", gap: 6 } },
        ...[0, 1, 2].map((d) => React.createElement("span", { key: d, style: { width: 8, height: 8, borderRadius: "50%", background: "var(--indigo-500)", animation: "loadDot 1.2s ease-in-out infinite", animationDelay: d * 0.2 + "s" } }))));
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
      const tp = q.topic || L("Unknown", "Невідомо", "Неизвестно", "Inconnu", "Unbekannt");
      if (!byTopic[tp]) byTopic[tp] = { correct: 0, total: 0 };
      byTopic[tp].total++;
      if (answers[i] === q.correct) byTopic[tp].correct++;
    });
    const weakTopics = Object.entries(byTopic).filter(([, v]) => v.correct / v.total < 0.5).map(([k]) => k);

    return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", padding: "0 20px 24px", overflowY: "auto" } },
      React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "28px 4px 20px", animation: "fadeUp 0.5s ease-out" } },
        React.createElement("span", { style: { fontSize: 52, marginBottom: 6 } }, pct >= 80 ? "🏆" : pct >= 60 ? "✨" : pct >= 40 ? "💪" : "📖"),
        React.createElement("h1", { style: { fontSize: 22, fontWeight: 700, color: "var(--text-strong)", margin: "0 0 4px" } }, autoSubmitted ? L("Time's up!", "Час вийшов!", "Время вышло!", "Temps écoulé !", "Zeit ist um!") : L("Exam Submitted", "Іспит здано", "Экзамен сдан", "Examen soumis", "Prüfung eingereicht")),
        React.createElement("p", { style: { fontSize: 14, color: "var(--text-muted)", margin: 0 } }, L(`${correctCount}/${total} correct · ${pct}% · ${selectedExam?.name}`, `${correctCount}/${total} правильно · ${pct}% · ${selectedExam?.name}`, `${correctCount}/${total} правильно · ${pct}% · ${selectedExam?.name}`, `${correctCount}/${total} correct · ${pct}% · ${selectedExam?.name}`, `${correctCount}/${total} richtig · ${pct}% · ${selectedExam?.name}`)),
        predictedGrade && React.createElement("div", { style: { marginTop: 10 } }, _badge("var(--indigo-100)", "var(--indigo-700)", L(`Predicted grade: ${predictedGrade}`, `Прогнозована оцінка: ${predictedGrade}`, `Прогнозируемая оценка: ${predictedGrade}`, `Note prévue : ${predictedGrade}`, `Voraussichtliche Note: ${predictedGrade}`)))),

      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 20 } },
        ...[
          { val: `${pct}%`, label: L("Score", "Результат", "Результат", "Score", "Ergebnis"), color: pct >= 70 ? "var(--emerald-700)" : "var(--red-700)" },
          { val: `${answeredCount}/${total}`, label: L("Answered", "Відповіли", "Ответили", "Répondu", "Beantwortet"), color: "var(--indigo-600)" },
          { val: mmss(timeUsed), label: L("Time used", "Витрачено часу", "Затрачено времени", "Temps utilisé", "Verbrauchte Zeit"), color: "var(--text-strong)" },
          { val: `+${xpEarned}`, label: "XP", color: "var(--indigo-600)" },
        ].map((s, i) => React.createElement("div", { key: i, style: { textAlign: "center", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: "10px 4px" } },
          React.createElement("p", { style: { margin: 0, fontSize: 16, fontWeight: 700, color: s.color } }, s.val),
          React.createElement("p", { style: { margin: "2px 0 0", fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase" } }, s.label)))),

      weakTopics.length > 0 && React.createElement("div", { style: { background: "var(--amber-50)", border: "1px solid var(--amber-200)", borderRadius: 12, padding: "12px 16px", marginBottom: 20 } },
        React.createElement("p", { style: { margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "var(--amber-700)", textTransform: "uppercase" } }, L("Focus on:", "Зверніть увагу на:", "Обратите внимание на:", "Concentrez-vous sur :", "Konzentriere dich auf:")),
        ...weakTopics.map((tp, i) => React.createElement("p", { key: i, style: { margin: "3px 0", fontSize: 13, color: "var(--amber-700)" } }, `• ${tp}`))),

      React.createElement("p", { style: { fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" } }, L("Full review", "Повний огляд", "Полный обзор", "Revue complète", "Vollständige Übersicht")),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 } },
        ...questions.map((q, i) => {
          const sel = answers[i];
          const answered = sel !== null && sel !== undefined;
          const isCorrect = answered && sel === q.correct;
          return React.createElement("div", { key: i, style: { background: "var(--surface-card)", border: `1px solid ${answered ? (isCorrect ? "var(--emerald-100)" : "var(--red-200)") : "var(--border-subtle)"}`, borderRadius: 12, padding: "12px 14px" } },
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 } },
              React.createElement("p", { style: { margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text-strong)", lineHeight: 1.5 } }, `${i + 1}. ${q.question}`),
              React.createElement("span", { style: { fontSize: 15, flexShrink: 0 } }, !answered ? "⬜" : isCorrect ? "✅" : "❌")),
            React.createElement("p", { style: { margin: "0 0 2px", fontSize: 12, color: "var(--text-muted)" } },
              answered ? L(`Your answer: ${(q.options || [])[sel]}`, `Ваша відповідь: ${(q.options || [])[sel]}`, `Ваш ответ: ${(q.options || [])[sel]}`, `Votre réponse : ${(q.options || [])[sel]}`, `Deine Antwort: ${(q.options || [])[sel]}`) : L("Not answered", "Немає відповіді", "Нет ответа", "Sans réponse", "Nicht beantwortet")),
            !isCorrect && React.createElement("p", { style: { margin: "0 0 6px", fontSize: 12, color: "var(--emerald-700)", fontWeight: 600 } }, L(`Correct: ${(q.options || [])[q.correct]}`, `Правильно: ${(q.options || [])[q.correct]}`, `Правильно: ${(q.options || [])[q.correct]}`, `Correct : ${(q.options || [])[q.correct]}`, `Richtig: ${(q.options || [])[q.correct]}`)),
            React.createElement("p", { style: { margin: 0, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 } }, q.explanation));
        })),

      _btn(L("Done →", "Готово →", "Готово →", "Terminé →", "Fertig →"), onExit, true, false));
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
        React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "var(--text-strong)" } }, L(`Question ${idx + 1} of ${total}`, `Питання ${idx + 1} з ${total}`, `Вопрос ${idx + 1} из ${total}`, `Question ${idx + 1} sur ${total}`, `Frage ${idx + 1} von ${total}`)),
        React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center" } },
          React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: timeLeft <= 120 ? "var(--red-700)" : "var(--text-strong)" } }, `⏱ ${mmss(timeLeft)}`),
          React.createElement("button", { onClick: () => setShowFinishConfirm(true),
            style: { fontSize: 11, color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", textDecoration: "underline" } }, L("Finish exam", "Завершити іспит", "Завершить экзамен", "Terminer l'examen", "Prüfung beenden")))),
      // Progress dots — filled once answered, outlined if not, current is wider
      React.createElement("div", { style: { display: "flex", gap: 4, marginBottom: 8 } },
        ...questions.map((_, i) => {
          const answered = answers[i] !== null && answers[i] !== undefined;
          return React.createElement("div", {
            key: i, onClick: () => setIdx(i),
            style: { flex: i === idx ? 2 : 1, height: 5, borderRadius: 3, cursor: "pointer", background: i === idx ? "var(--indigo-500)" : answered ? "var(--indigo-200)" : "var(--border-subtle)", transition: "background 0.3s" }
          });
        }))),

    // Finish confirmation banner
    showFinishConfirm && React.createElement("div", { style: { margin: "0 20px 12px", padding: "12px 16px", background: "var(--amber-50)", border: "1px solid var(--amber-200)", borderRadius: 12 } },
      React.createElement("p", { style: { margin: "0 0 8px", fontSize: 13, color: "var(--amber-700)" } },
        unansweredCount > 0 ? L(`${unansweredCount} question${unansweredCount > 1 ? "s" : ""} left unanswered — submit anyway?`, `${unansweredCount} питань без відповіді — все одно надіслати?`, `${unansweredCount} вопросов без ответа — всё равно отправить?`, `${unansweredCount} question(s) sans réponse — soumettre quand même ?`, `${unansweredCount} Frage(n) unbeantwortet — trotzdem abgeben?`) : L("Submit your exam now?", "Надіслати іспит зараз?", "Отправить экзамен сейчас?", "Soumettre votre examen maintenant ?", "Prüfung jetzt abgeben?")),
      React.createElement("div", { style: { display: "flex", gap: 8 } },
        _btn(L("Cancel", "Скасувати", "Отмена", "Annuler", "Abbrechen"), () => setShowFinishConfirm(false), false, false),
        _btn(L("Submit →", "Надіслати →", "Отправить →", "Envoyer →", "Absenden →"), () => finishExam(false), true, false))),

    // Question content
    React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "0 20px 80px" } },
      React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24, animation: "fadeUp 0.3s ease-out" } },
        q.topic && React.createElement("div", { style: { marginBottom: 10 } }, _badge("var(--indigo-50)", "var(--indigo-600)", q.topic)),
        React.createElement("p", { style: { fontWeight: 600, fontSize: 16, margin: "0 0 16px", color: "var(--text-strong)", lineHeight: 1.5 }, dangerouslySetInnerHTML: { __html: _md(q.question) } }),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
          ...(q.options || []).map((opt, i) => {
            const isSel = answers[idx] === i;
            return React.createElement("button", {
              key: i, onClick: () => setAnswers((a) => { const next = [...a]; next[idx] = i; return next; }),
              style: { display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: isSel ? "var(--indigo-50)" : "var(--surface-card)", border: `1.5px solid ${isSel ? "var(--indigo-500)" : "var(--border-default)"}`, borderRadius: 14, color: isSel ? "var(--indigo-700)" : "var(--text-body)", fontSize: 14, textAlign: "left", cursor: "pointer", width: "100%", fontFamily: "var(--font-sans)", transition: "all 0.15s" }
            },
              React.createElement("span", { style: { width: 28, height: 28, borderRadius: 8, background: isSel ? "var(--indigo-500)" : "var(--slate-100)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: isSel ? "white" : "var(--slate-400)", flexShrink: 0 } }, ["A", "B", "C", "D"][i]),
              React.createElement("span", { style: { lineHeight: 1.45, fontWeight: 500 } }, opt));
          })))),

    // Prev / Next navigation
    React.createElement("div", { style: { padding: "12px 20px 20px", display: "flex", gap: 10 } },
      idx > 0 && _btn(L("← Prev", "← Назад", "← Назад", "← Précédent", "← Zurück"), () => setIdx(idx - 1), false, false),
      idx + 1 < total
        ? _btn(L("Next →", "Далі →", "Далее →", "Suivant →", "Weiter →"), () => setIdx(idx + 1), true, false)
        : _btn(L("Review & submit →", "Перевірити й надіслати →", "Проверить и отправить →", "Réviser et soumettre →", "Überprüfen & abgeben →"), () => setShowFinishConfirm(true), true, false)));
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

// ─── Lesson plan cache ───────────────────────────────────────────────────────
// A generated lesson is a pure function of (mode, topic, exam, difficulty vote,
// explanation language, UI language). Generation is a 3-8s AI round-trip, so we
// persist the parsed plan and serve repeat opens instantly — this is what makes
// official-exam topics you've opened before load with zero wait. A bounded LRU
// (most-recent 60) keeps localStorage from growing without limit. Bumping
// LESSON_CACHE_VER invalidates every cached plan at once when the prompt changes.
const LESSON_CACHE_KEY = "brain_lessoncache_v1";
const LESSON_CACHE_VER = 1;
const LESSON_CACHE_MAX = 60;
function lessonCacheKey({ mode, topic, examId, vote, lang, ui }) {
  return `${LESSON_CACHE_VER}::${mode}::${topic}::${examId || "any"}::v${vote ?? 0}::${lang || "ui"}::${ui || "en"}`;
}
function getCachedLesson(key) {
  try { const c = JSON.parse(localStorage.getItem(LESSON_CACHE_KEY) || "{}"); return c[key]?.plan || null; } catch { return null; }
}
function saveCachedLesson(key, plan) {
  try {
    const c = JSON.parse(localStorage.getItem(LESSON_CACHE_KEY) || "{}");
    c[key] = { plan, ts: Date.now() };
    const keys = Object.keys(c);
    if (keys.length > LESSON_CACHE_MAX) {
      keys.sort((a, b) => (c[a].ts || 0) - (c[b].ts || 0)).slice(0, keys.length - LESSON_CACHE_MAX).forEach((k) => delete c[k]);
    }
    localStorage.setItem(LESSON_CACHE_KEY, JSON.stringify(c));
  } catch {}
}

// De-dupes concurrent generations of the same lesson (e.g. a hover-prefetch
// already in flight when the student clicks). Keyed by cacheKey → Promise.
const _lessonInFlight = new Map();

// Builds (or returns cached) a lesson plan for a topic. Pure of React so both
// LessonEngine and the topic picker's hover-prefetch can call it. `force`
// bypasses the cache to regenerate on an explicit retry.
async function generateLessonPlan({ mode, topic, resolved, tcode, force }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[tcode] || en);
  const _lessonExam = resolved && window.getExams ? window.getExams().find((e) => e.id === resolved.examId) : null;
  const langOverride = _lessonExam && _lessonExam.explainLang ? _lessonExam.explainLang : undefined;
  const topicKey = `${topic}::${resolved?.examId || "any"}`;
  const priorVote = getDiffVote(topicKey);
  const cacheKey = lessonCacheKey({ mode, topic, examId: resolved?.examId, vote: priorVote, lang: _lessonExam?.explainLang, ui: tcode });
  if (!force) {
    const cached = getCachedLesson(cacheKey);
    if (cached) return cached;
    if (_lessonInFlight.has(cacheKey)) return _lessonInFlight.get(cacheKey);
  }
  const run = (async () => {
    const complete = window.brainComplete || ((a) => window.claude.complete(a));
    const topicContext = resolved ? { examId: resolved.examId, topicName: resolved.topicName } : undefined;
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
      setTimeout(() => reject(new Error(L("Taking too long — please try again.", "Це триває занадто довго — спробуйте ще раз.", "Это длится слишком долго — попробуйте ещё раз.", "Cela prend trop de temps — réessayez.", "Das dauert zu lange — versuche es erneut."))), 45000));
    const raw = await Promise.race([
      complete({ system, messages: [{ role: "user", content: `Generate a structured lesson on: ${topic}` }], topicContext, langOverride }),
      timeout,
    ]);
    const parsed = window.parseJSON ? window.parseJSON(raw) : JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    if (!parsed || !Array.isArray(parsed.steps) || parsed.steps.length === 0) throw new Error(L("Invalid lesson plan", "Недійсний план уроку", "Недействительный план урока", "Plan de leçon invalide", "Ungültiger Lektionsplan"));
    saveCachedLesson(cacheKey, parsed);
    return parsed;
  })();
  _lessonInFlight.set(cacheKey, run);
  try { return await run; }
  finally { _lessonInFlight.delete(cacheKey); }
}

// Fire-and-forget cache warmer for the topic picker (hover / focus). Silent on
// failure — this is best-effort speculative work, never surfaced to the user.
function prefetchLesson(topic, tcode) {
  try {
    const resolved = window.resolveTopicForBrain ? window.resolveTopicForBrain(topic) : null;
    generateLessonPlan({ mode: "learn", topic, resolved, tcode, force: false }).catch(() => {});
  } catch {}
}

function LessonEngine({ topic, mode, onExit, t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
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
  const [xpPop, setXpPop] = React.useState(null); // {amount, correct, combo, id} — transient floating gain
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

  // Auto-clear the floating "+N XP" pop shortly after it fires.
  React.useEffect(() => {
    if (!xpPop) return;
    const id = setTimeout(() => setXpPop(null), 1100);
    return () => clearTimeout(id);
  }, [xpPop]);

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
    let cancelled = false;
    (async () => {
      try {
        // All prompt building + cache read/write lives in generateLessonPlan so
        // the picker's hover-prefetch shares the exact same path. force on retry.
        const parsed = await generateLessonPlan({ mode, topic, resolved, tcode: t?.code, force: retryCount > 0 });
        if (cancelled) return;
        setPlan(parsed);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        console.error("Lesson generation failed:", e);
        setError(e.message || L("Failed to generate lesson", "Не вдалося створити урок", "Не удалось создать урок", "Échec de la génération de la leçon", "Lektion konnte nicht erstellt werden"));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
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

  // One place awards XP + combo so all three question types stay in sync.
  // A correct-answer streak (≥3 in a row) adds an escalating combo bonus — the
  // little "one more" hook that makes a lesson worth finishing. Fires a
  // floating "+N" pop the HUD renders.
  const registerAnswer = (isCorrect, base) => {
    setConsecutiveCorrect((prev) => {
      const nc = isCorrect ? prev + 1 : 0;
      const bonus = isCorrect && nc >= 3 ? Math.min(30, (nc - 2) * 5) : 0;
      const gained = base + bonus;
      setXp((x) => x + gained);
      setXpPop({ amount: gained, correct: isCorrect, combo: nc, id: Date.now() });
      return nc;
    });
    isCorrect ? _sfx.correct() : _sfx.wrong();
  };

  const answerMcq = (idx, correct, explanation) => {
    if (selected !== null) return;
    const isCorrect = idx === correct;
    setSelected(idx);
    setRevealed(true);
    setResults((r) => [...r, { type: "mcq", correct: isCorrect }]);
    registerAnswer(isCorrect, isCorrect ? 20 : 5);
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
    registerAnswer(isCorrect, isCorrect ? 20 : 5);
    if (resolved && window.recordReview) window.recordReview({ examId: resolved.examId, topicIdx: resolved.topicIdx, topicName: resolved.topicName, correct: isCorrect });
  };

  const answerFill = () => {
    const userAns = fillInput.trim().toLowerCase();
    const accepts = [s.answer, ...(s.accept || [])].map((a) => a.toLowerCase().trim());
    const isCorrect = accepts.some((a) => a === userAns || a.includes(userAns) || userAns.includes(a));
    setRevealed(true);
    setSelected(isCorrect ? "correct" : "wrong");
    setResults((r) => [...r, { type: "fill", correct: isCorrect }]);
    registerAnswer(isCorrect, isCorrect ? 25 : 5);
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
      React.createElement("p", { style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)" } }, L("Building your lesson...", "Створюємо ваш урок...", "Создаём ваш урок...", "Création de votre leçon...", "Deine Lektion wird erstellt...")),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)" } }, `${L("Topic", "Тема", "Тема", "Sujet", "Thema")}: ${topic}`),
      React.createElement("div", { style: { display: "flex", gap: 6 } },
        ...[0, 1, 2].map((d) => React.createElement("span", { key: d, style: { width: 8, height: 8, borderRadius: "50%", background: "var(--indigo-500)", animation: "loadDot 1.2s ease-in-out infinite", animationDelay: d * 0.2 + "s" } }))));
  }

  if (error) {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", gap: 16, padding: "0 24px" } },
      React.createElement("span", { style: { fontSize: 40 } }, "⚠️"),
      React.createElement("p", { style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)", margin: 0 } }, L("Couldn't generate lesson", "Не вдалося створити урок", "Не удалось создать урок", "Impossible de générer la leçon", "Lektion konnte nicht erstellt werden")),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", margin: 0, textAlign: "center" } }, error),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 } },
        _btn(L("↺ Try again", "↺ Спробувати ще раз", "↺ Попробовать ещё раз", "↺ Réessayer", "↺ Erneut versuchen"), () => setRetryCount((n) => n + 1), true, false),
        _btn(L("← Back", "← Назад", "← Назад", "← Retour", "← Zurück"), onExit, false, false)));
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
      React.createElement("h1", { style: { fontSize: 24, fontWeight: 700, color: "var(--text-strong)", margin: "0 0 4px", textAlign: "center" } }, L("Lesson Complete!", "Урок завершено!", "Урок завершён!", "Leçon terminée !", "Lektion abgeschlossen!")),
      React.createElement("p", { style: { fontSize: 14, color: "var(--text-muted)", margin: "0 0 24px" } }, plan.title),

      // Stats grid
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%", maxWidth: 360, marginBottom: 24 } },
        // Accuracy
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "16px", textAlign: "center" } },
          React.createElement("p", { style: { fontSize: 28, fontWeight: 700, color: accuracy >= 70 ? "var(--emerald-700)" : "var(--amber-700)", margin: 0 } }, `${accuracy}%`),
          React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" } }, L("Accuracy", "Точність", "Точность", "Précision", "Genauigkeit"))),
        // XP
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "16px", textAlign: "center" } },
          React.createElement("p", { style: { fontSize: 28, fontWeight: 700, color: "var(--indigo-600)", margin: 0 } }, `+${finalXp}`),
          React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" } }, L("XP Earned", "Отримано XP", "Получено XP", "XP gagnés", "XP verdient"))),
        // Mastery
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "16px", textAlign: "center" } },
          React.createElement("p", { style: { fontSize: 14, fontWeight: 600, color: "var(--text-muted)", margin: 0 } }, `${masteryBefore || 0}%`),
          React.createElement("p", { style: { fontSize: 20, fontWeight: 700, color: masteryDelta > 0 ? "var(--emerald-700)" : "var(--text-strong)", margin: "2px 0 0" } }, `→ ${masteryNow || 0}%`),
          React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" } }, L("Mastery", "Освоєння", "Освоение", "Maîtrise", "Beherrschung"))),
        // Streak
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "16px", textAlign: "center" } },
          React.createElement("p", { style: { fontSize: 28, fontWeight: 700, color: "var(--text-strong)", margin: 0 } }, `${streak}🔥`),
          React.createElement("p", { style: { fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" } }, L("Streak", "Серія", "Серия", "Série", "Serie"))),
      ),

      // Score detail
      React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" } }, L(`${correctCount} of ${totalAnswered} questions correct`, `${correctCount} з ${totalAnswered} правильних відповідей`, `${correctCount} из ${totalAnswered} правильных ответов`, `${correctCount} sur ${totalAnswered} réponses correctes`, `${correctCount} von ${totalAnswered} richtigen Antworten`)),
      xpLevelAfter && React.createElement("div", { style: { width: "100%", maxWidth: 360, marginBottom: 16, background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "14px 16px" } },
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } },
          React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "var(--indigo-600)" } }, L(`⭐ Level ${xpLevelAfter.level}`, `⭐ Рівень ${xpLevelAfter.level}`, `⭐ Уровень ${xpLevelAfter.level}`, `⭐ Niveau ${xpLevelAfter.level}`, `⭐ Level ${xpLevelAfter.level}`)),
          React.createElement("span", { style: { fontSize: 11, color: "var(--text-muted)" } }, `${xpLevelAfter.into} / ${xpLevelAfter.need} XP`)),
        React.createElement("div", { style: { height: 8, background: "var(--border-subtle)", borderRadius: 4, overflow: "hidden" } },
          React.createElement("div", { style: { height: "100%", width: `${xpPctAfter}%`, background: "linear-gradient(90deg,var(--indigo-500),var(--indigo-600))", borderRadius: 4 } }))),
      _btn(L("Done →", "Готово →", "Готово →", "Terminé →", "Fertig →"), onExit, true, false));
  }

  // ─── Step renderers ────────────────────────────────────────────────────────
  const renderTeach = () => React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
    React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24, borderLeft: "var(--border-accent-width) solid var(--indigo-500)" } },
      React.createElement("div", { style: { marginBottom: 14 } }, _badge("var(--indigo-50)", "var(--indigo-600)", L("📖 CONCEPT", "📖 КОНЦЕПЦІЯ", "📖 КОНЦЕПЦИЯ", "📖 CONCEPT", "📖 KONZEPT"))),
      s.title && React.createElement("h2", { style: { margin: "0 0 12px", fontSize: 18, fontWeight: 700, color: "var(--text-strong)" } }, s.title),
      React.createElement("div", { style: { fontSize: 15, lineHeight: 1.75, color: "var(--text-body)", marginBottom: 16 }, dangerouslySetInnerHTML: { __html: _md(s.body) } }),
      s.keyTakeaway && React.createElement("div", { style: { background: "linear-gradient(135deg, var(--amber-50), var(--amber-100))", border: "1px solid var(--amber-200)", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "var(--amber-700)", marginBottom: s.example ? 14 : 0 } },
        "💡 ", React.createElement("strong", null, s.keyTakeaway)),
      s.example && (_isMath(s.example)
        ? React.createElement("div", { style: { background: "linear-gradient(135deg, var(--indigo-100) 0%, var(--indigo-100) 100%)", borderRadius: 12, padding: "14px 20px", textAlign: "center", fontSize: 18, fontWeight: 600, fontFamily: "var(--font-mono, monospace)", color: "var(--indigo-700)", letterSpacing: "0.02em" } }, s.example)
        : React.createElement("div", { style: { background: "var(--surface-muted)", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "var(--text-body)", fontFamily: "var(--font-mono)", lineHeight: 1.7 }, dangerouslySetInnerHTML: { __html: _md(s.example) } }))),
    React.createElement("div", { style: { marginTop: 16 } }, _btn(L("Got it, continue →", "Зрозуміло, продовжити →", "Понятно, продолжить →", "Compris, continuer →", "Verstanden, weiter →"), advance, true, false)));

  const renderMcq = (question, options, correct, explanation, diff, isHook) => React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
    isHook && React.createElement("div", { style: { marginBottom: 12, padding: "10px 16px", background: "linear-gradient(135deg,var(--amber-100),var(--amber-200))", border: "1px solid var(--amber-500)", borderRadius: 12, fontSize: 13, color: "var(--amber-700)", fontWeight: 600 } },
      L("🔥 Before we explain anything — take a guess:", "🔥 Перш ніж ми все пояснимо — спробуйте вгадати:", "🔥 Прежде чем мы всё объясним — попробуйте угадать:", "🔥 Avant toute explication — devinez :", "🔥 Bevor wir etwas erklären — rate mal:")),
    React.createElement("div", { style: { background: "var(--surface-card)", border: isHook ? "2px solid var(--amber-500)" : "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 } },
      React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 14 } },
        isHook
          ? _badge("linear-gradient(135deg,var(--amber-500),var(--amber-600))", "white", L("🔥 HOOK QUESTION", "🔥 ВСТУПНЕ ПИТАННЯ", "🔥 ВВОДНЫЙ ВОПРОС", "🔥 QUESTION D'ACCROCHE", "🔥 EINSTIEGSFRAGE"))
          : _badge("linear-gradient(135deg,var(--indigo-500),var(--indigo-600))", "white", L("⚡ QUESTION", "⚡ ПИТАННЯ", "⚡ ВОПРОС", "⚡ QUESTION", "⚡ FRAGE")),
        diff && _badge(diff === "hard" ? "var(--red-50)" : diff === "easy" ? "var(--emerald-50)" : "var(--amber-50)", diff === "hard" ? "var(--red-700)" : diff === "easy" ? "var(--emerald-700)" : "var(--amber-700)", diff)),
      React.createElement("p", { style: { fontWeight: 600, fontSize: 16, margin: "0 0 16px", color: "var(--text-strong)", lineHeight: 1.5 } }, question),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
        ...options.map((opt, i) => {
          const isCor = i === correct, isSel = i === selected;
          let bg = "var(--surface-card)", bc = "var(--border-default)", col = "var(--text-body)", lbg = "var(--slate-100)", lcol = "var(--slate-400)";
          if (revealed) {
            if (isCor) { bg = "var(--emerald-50)"; bc = "var(--emerald-500)"; col = "var(--emerald-700)"; lbg = "var(--emerald-500)"; lcol = "white"; }
            else if (isSel) { bg = "var(--red-50)"; bc = "var(--red-500)"; col = "var(--red-700)"; lbg = "var(--red-500)"; lcol = "white"; }
            else { col = "var(--slate-300)"; bc = "var(--slate-100)"; }
          }
          return React.createElement("button", {
            key: i, disabled: revealed, onClick: () => answerMcq(i, correct, explanation),
            style: { display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: bg, border: `1.5px solid ${bc}`, borderRadius: 14, color: col, fontSize: 14, textAlign: "left", cursor: revealed ? "default" : "pointer", width: "100%", fontFamily: "var(--font-sans)", transition: "all 0.15s" }
          },
            React.createElement("span", { style: { width: 28, height: 28, borderRadius: 8, background: lbg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: lcol, flexShrink: 0 } }, ["A", "B", "C", "D"][i]),
            React.createElement("span", { style: { lineHeight: 1.45, fontWeight: 500 } }, opt));
        })),
      revealed && React.createElement("div", {
        style: { marginTop: 14, padding: "12px 16px", background: selected === correct ? "linear-gradient(135deg, var(--emerald-50), var(--emerald-50))" : "linear-gradient(135deg, var(--amber-50), var(--amber-100))", border: `1px solid ${selected === correct ? "var(--emerald-100)" : "var(--amber-200)"}`, borderRadius: 12, fontSize: 14, color: selected === correct ? "var(--emerald-700)" : "var(--amber-700)", lineHeight: 1.6 }
      }, selected === correct ? "✅ " : "💡 ", explanation)),
    revealed && React.createElement("div", { style: { marginTop: 16 } }, _btn(L("Continue →", "Продовжити →", "Продолжить →", "Continuer →", "Weiter →"), advance, true, false)));

  const renderTf = (isHook) => React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
    isHook && React.createElement("div", { style: { marginBottom: 12, padding: "10px 16px", background: "linear-gradient(135deg,var(--amber-100),var(--amber-200))", border: "1px solid var(--amber-500)", borderRadius: 12, fontSize: 13, color: "var(--amber-700)", fontWeight: 600 } },
      L("🔥 Before we explain anything — take a guess:", "🔥 Перш ніж ми все пояснимо — спробуйте вгадати:", "🔥 Прежде чем мы всё объясним — попробуйте угадать:", "🔥 Avant toute explication — devinez :", "🔥 Bevor wir etwas erklären — rate mal:")),
    React.createElement("div", { style: { background: "var(--surface-card)", border: isHook ? "2px solid var(--amber-500)" : "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 } },
      React.createElement("div", { style: { marginBottom: 14 } }, isHook ? _badge("linear-gradient(135deg,var(--amber-500),var(--amber-600))", "white", L("🔥 HOOK QUESTION", "🔥 ВСТУПНЕ ПИТАННЯ", "🔥 ВВОДНЫЙ ВОПРОС", "🔥 QUESTION D'ACCROCHE", "🔥 EINSTIEGSFRAGE")) : _badge("var(--indigo-50)", "var(--indigo-600)", L("✋ TRUE OR FALSE", "✋ ПРАВДА ЧИ НЕПРАВДА", "✋ ПРАВДА ИЛИ ЛОЖЬ", "✋ VRAI OU FAUX", "✋ WAHR ODER FALSCH"))),
      React.createElement("p", { style: { fontWeight: 600, fontSize: 16, margin: "0 0 20px", color: "var(--text-strong)", lineHeight: 1.5 } }, s.statement),
      React.createElement("div", { style: { display: "flex", gap: 12 } },
        ...[true, false].map((val) => {
          let bg = "var(--surface-card)", bc = "var(--border-default)", col = "var(--text-body)";
          if (revealed) {
            if (val === s.correct) { bg = "var(--emerald-50)"; bc = "var(--emerald-500)"; col = "var(--emerald-700)"; }
            else if (val === selected) { bg = "var(--red-50)"; bc = "var(--red-500)"; col = "var(--red-700)"; }
            else { col = "var(--slate-300)"; }
          }
          return React.createElement("button", {
            key: String(val), disabled: revealed, onClick: () => answerTf(val, s.correct),
            style: { flex: 1, padding: "16px", background: bg, border: `2px solid ${bc}`, borderRadius: 14, fontSize: 16, fontWeight: 700, color: col, cursor: revealed ? "default" : "pointer", fontFamily: "var(--font-sans)", transition: "all 0.15s" }
          }, val ? L("✅ True", "✅ Правда", "✅ Правда", "✅ Vrai", "✅ Wahr") : L("❌ False", "❌ Неправда", "❌ Ложь", "❌ Faux", "❌ Falsch"));
        })),
      revealed && React.createElement("div", {
        style: { marginTop: 14, padding: "12px 16px", background: selected === s.correct ? "var(--emerald-50)" : "var(--amber-50)", border: `1px solid ${selected === s.correct ? "var(--emerald-100)" : "var(--amber-200)"}`, borderRadius: 12, fontSize: 14, color: selected === s.correct ? "var(--emerald-700)" : "var(--amber-700)", lineHeight: 1.6 }
      }, selected === s.correct ? "✅ " : "💡 ", s.explanation)),
    revealed && React.createElement("div", { style: { marginTop: 16 } }, _btn(L("Continue →", "Продовжити →", "Продолжить →", "Continuer →", "Weiter →"), advance, true, false)));

  const renderFill = () => React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
    React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 } },
      React.createElement("div", { style: { marginBottom: 14 } }, _badge("var(--amber-50)", "var(--amber-700)", L("✍️ FILL IN THE BLANK", "✍️ ЗАПОВНІТЬ ПРОПУСК", "✍️ ЗАПОЛНИТЕ ПРОПУСК", "✍️ COMPLÉTEZ LE BLANC", "✍️ LÜCKE AUSFÜLLEN"))),
      React.createElement("p", { style: { fontWeight: 600, fontSize: 16, margin: "0 0 20px", color: "var(--text-strong)", lineHeight: 1.5 }, dangerouslySetInnerHTML: { __html: _md(s.sentence).replace("___", "<u style='border-bottom:2px dashed var(--indigo-500);padding:0 8px;color:var(--indigo-500)'>___</u>") } }),
      !revealed && React.createElement("div", { style: { display: "flex", gap: 10 } },
        React.createElement("input", {
          value: fillInput, onChange: (e) => setFillInput(e.target.value),
          onKeyDown: (e) => { if (e.key === "Enter" && fillInput.trim()) answerFill(); },
          placeholder: L("Type your answer…", "Введіть відповідь…", "Введите ответ…", "Tapez votre réponse…", "Gib deine Antwort ein…"), autoFocus: true,
          style: { flex: 1, border: "1.5px solid var(--border-default)", borderRadius: 12, padding: "12px 16px", fontSize: 15, fontFamily: "var(--font-sans)", color: "var(--text-body)", background: "var(--surface-page)", outline: "none" }
        }),
        React.createElement("button", {
          onClick: fillInput.trim() ? answerFill : undefined, disabled: !fillInput.trim(),
          style: { padding: "12px 20px", background: fillInput.trim() ? "var(--indigo-600)" : "var(--indigo-200)", color: "white", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: fillInput.trim() ? "pointer" : "default", fontFamily: "var(--font-sans)" }
        }, L("Check", "Перевірити", "Проверить", "Vérifier", "Prüfen"))),
      revealed && React.createElement("div", {
        style: { marginTop: 0, padding: "12px 16px", background: selected === "correct" ? "var(--emerald-50)" : "var(--amber-50)", border: `1px solid ${selected === "correct" ? "var(--emerald-100)" : "var(--amber-200)"}`, borderRadius: 12, fontSize: 14, color: selected === "correct" ? "var(--emerald-700)" : "var(--amber-700)", lineHeight: 1.6 }
      }, selected === "correct" ? L(`✅ Correct! "${s.answer}"`, `✅ Правильно! «${s.answer}»`, `✅ Правильно! «${s.answer}»`, `✅ Correct ! « ${s.answer} »`, `✅ Richtig! „${s.answer}"`) : L(`💡 The answer is "${s.answer}". ${s.explanation || ""}`, `💡 Правильна відповідь: «${s.answer}». ${s.explanation || ""}`, `💡 Правильный ответ: «${s.answer}». ${s.explanation || ""}`, `💡 La réponse est « ${s.answer} ». ${s.explanation || ""}`, `💡 Die Antwort ist „${s.answer}". ${s.explanation || ""}`))),
    revealed && React.createElement("div", { style: { marginTop: 16 } }, _btn(L("Continue →", "Продовжити →", "Продолжить →", "Continuer →", "Weiter →"), advance, true, false)));

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
        setExplainFeedback(L("Couldn't check your answer right now — but writing it out is the learning! Keep going.", "Не вдалося перевірити вашу відповідь зараз — але сам процес написання вже є навчанням! Продовжуйте.", "Не удалось проверить ваш ответ сейчас — но сам процесс написания уже является обучением! Продолжайте.", "Impossible de vérifier votre réponse pour le moment — mais l'écrire est déjà un apprentissage ! Continuez.", "Deine Antwort konnte gerade nicht geprüft werden — aber das Aufschreiben ist schon das Lernen! Mach weiter."));
      }
      setExplainLoading(false);
    };

    return React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
      React.createElement("div", { style: { background: "var(--surface-card)", border: "2px solid var(--indigo-600)", borderRadius: 16, padding: 24 } },
        React.createElement("div", { style: { marginBottom: 14 } }, _badge("linear-gradient(135deg,var(--indigo-600),var(--indigo-500))", "white", L("🧠 EXPLAIN IT BACK", "🧠 ПОЯСНІТЬ СВОЇМИ СЛОВАМИ", "🧠 ОБЪЯСНИТЕ СВОИМИ СЛОВАМИ", "🧠 EXPLIQUEZ-LE", "🧠 ERKLÄR ES ZURÜCK"))),
        React.createElement("p", { style: { fontWeight: 600, fontSize: 16, margin: "0 0 6px", color: "var(--text-strong)", lineHeight: 1.5 } }, s.prompt),
        React.createElement("p", { style: { fontSize: 12, color: "var(--text-muted)", margin: "0 0 16px" } }, L("Explain in your own words — as if teaching a friend.", "Поясніть своїми словами — так, ніби навчаєте друга.", "Объясните своими словами — как будто учите друга.", "Expliquez avec vos propres mots — comme si vous enseigniez à un ami.", "Erkläre es mit deinen eigenen Worten — als würdest du es einem Freund beibringen.")),

        !explainFeedback && React.createElement("div", null,
          React.createElement("textarea", {
            value: explainInput, onChange: (e) => setExplainInput(e.target.value), autoFocus: true,
            placeholder: L("In my own words...", "Своїми словами...", "Своими словами...", "Avec mes propres mots...", "In meinen eigenen Worten..."), rows: 4,
            style: { width: "100%", border: "1.5px solid var(--border-default)", borderRadius: 12, padding: "12px 16px", fontSize: 14, fontFamily: "var(--font-sans)", color: "var(--text-body)", background: "var(--surface-page)", resize: "none", outline: "none", boxSizing: "border-box", lineHeight: 1.5 }
          }),
          React.createElement("div", { style: { marginTop: 10 } },
            _btn(explainLoading ? L("Checking...", "Перевіряємо...", "Проверяем...", "Vérification...", "Wird geprüft...") : L("Check my explanation →", "Перевірити моє пояснення →", "Проверить моё объяснение →", "Vérifier mon explication →", "Meine Erklärung prüfen →"), submitExplanation, true, !explainInput.trim() || explainLoading))),

        explainFeedback && React.createElement("div", {
          style: { padding: "14px 16px", background: "var(--indigo-50)", border: "1px solid var(--indigo-200)", borderRadius: 12, fontSize: 14, color: "var(--indigo-700)", lineHeight: 1.6 },
          dangerouslySetInnerHTML: { __html: _md(explainFeedback) }
        })),
      explainFeedback && React.createElement("div", { style: { marginTop: 16 } }, _btn(L("Continue →", "Продовжити →", "Продолжить →", "Continuer →", "Weiter →"), advance, true, false)));
  };

  const renderMathLine = (text) => {
    if (_isMath(text)) {
      return React.createElement("div", {
        style: { background: "linear-gradient(135deg, var(--indigo-100) 0%, var(--indigo-100) 100%)", borderRadius: 10, padding: "10px 16px", margin: "6px 0", textAlign: "center", fontSize: 17, fontWeight: 600, fontFamily: "var(--font-mono, monospace)", color: "var(--indigo-700)", letterSpacing: "0.02em" }
      }, text);
    }
    return React.createElement("div", { style: { fontSize: 16, color: "var(--text-body)", lineHeight: 1.75, letterSpacing: "0.005em", maxWidth: "40rem" }, dangerouslySetInnerHTML: { __html: _md(text) } });
  };

  const renderWorkedExample = () => {
    const steps = s.steps || [];
    const allVisible = stepsRevealed >= steps.length;
    return React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
      React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24, borderLeft: "var(--border-accent-width) solid var(--indigo-500)" } },
        React.createElement("div", { style: { marginBottom: 14 } }, _badge("var(--indigo-50)", "var(--indigo-600)", L("📝 WORKED EXAMPLE", "📝 РОЗВ'ЯЗАНИЙ ПРИКЛАД", "📝 РЕШЁННЫЙ ПРИМЕР", "📝 EXEMPLE RÉSOLU", "📝 GELÖSTES BEISPIEL"))),
        s.title && React.createElement("h3", { style: { margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "var(--text-strong)" } }, s.title),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 0 } },
          ...steps.map((st, i) => {
            const vis = i < stepsRevealed;
            return React.createElement("div", {
              key: i,
              style: { display: "flex", gap: 12, padding: "14px 0", borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none", opacity: vis ? 1 : 0.25, transform: vis ? "translateY(0)" : "translateY(4px)", transition: "opacity 0.4s, transform 0.4s" }
            },
              React.createElement("div", { style: { width: 28, height: 28, borderRadius: "50%", background: vis ? "linear-gradient(135deg,var(--indigo-600),var(--indigo-500))" : "var(--surface-muted)", color: vis ? "white" : "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, transition: "background 0.3s" } }, i + 1),
              React.createElement("div", { style: { flex: 1 } },
                React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: vis ? "var(--indigo-600)" : "var(--text-faint)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" } }, st.label),
                vis && renderMathLine(st.content)));
          })),
        !allVisible && React.createElement("div", { style: { marginTop: 14 } },
          React.createElement("button", {
            onClick: () => setStepsRevealed((n) => n + 1),
            style: { width: "100%", padding: "12px 20px", background: "none", border: "1.5px dashed var(--indigo-200)", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "var(--indigo-600)", cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all 0.15s" }
          }, stepsRevealed === 0 ? L("Reveal first step →", "Показати перший крок →", "Показать первый шаг →", "Révéler la première étape →", "Ersten Schritt zeigen →") : L(`Reveal step ${stepsRevealed + 1} →`, `Показати крок ${stepsRevealed + 1} →`, `Показать шаг ${stepsRevealed + 1} →`, `Révéler l'étape ${stepsRevealed + 1} →`, `Schritt ${stepsRevealed + 1} zeigen →`))),
        allVisible && s.challenge && React.createElement("div", { style: { marginTop: 14, background: "linear-gradient(135deg, var(--amber-50), var(--amber-100))", border: "1px solid var(--amber-200)", borderRadius: 12, padding: "14px 16px", fontSize: 14, color: "var(--amber-700)" } }, L("🎯 Now you try: ", "🎯 Тепер ваша черга: ", "🎯 Теперь ваша очередь: ", "🎯 À votre tour : ", "🎯 Jetzt bist du dran: "), React.createElement("strong", null, s.challenge))),
      allVisible && React.createElement("div", { style: { marginTop: 16 } },
        _btn(L("Continue →", "Продовжити →", "Продолжить →", "Continuer →", "Weiter →"), () => { setXp((x) => x + 15); advance(); }, true, false)));
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
        t,
      });
      default: return React.createElement("p", null, L(`Unknown step: ${s.type}`, `Невідомий крок: ${s.type}`, `Неизвестный шаг: ${s.type}`, `Étape inconnue : ${s.type}`, `Unbekannter Schritt: ${s.type}`));
    }
  };

  // ─── Progress header ──────────────────────────────────────────────────────
  const pct = Math.round(((step + 1) / totalSteps) * 100);
  const estMinsLeft = plan.estimatedMinutes ? Math.max(1, Math.round(plan.estimatedMinutes * (1 - step / totalSteps))) : null;

  // Live gamification HUD: lifetime level (with this lesson's in-progress XP
  // folded in so the bar visibly climbs as you answer) + an active combo flame.
  const _liveXp = (window.getXp ? window.getXp() : 0) + xp;
  const _lvl = window.xpLevel ? window.xpLevel(_liveXp) : { level: 1, into: 0, need: 100 };
  const _lvlPct = Math.max(0, Math.min(100, Math.round((_lvl.into / Math.max(1, _lvl.need)) * 100)));
  const comboActive = consecutiveCorrect >= 2;

  // ─── Difficulty panel (compact pills) ───────────────────────────────────────
  const topicKey = `${topic}::${resolved?.examId || "any"}`;
  const currentVote = getDiffVote(topicKey);
  const DIFF_OPTIONS = [
    { v: -2, emoji: "😵", label: L("Hard", "Складно", "Сложно", "Difficile", "Schwer") },
    { v:  0, emoji: "👍", label: L("OK", "Нормально", "Нормально", "Correct", "Okay") },
    { v:  2, emoji: "🥱", label: L("Easy", "Легко", "Легко", "Facile", "Einfach") },
  ];

  const renderDiffPills = () => React.createElement("div", {
    style: { display: "flex", gap: 6, alignItems: "center" }
  },
    React.createElement("span", { style: { fontSize: 11, color: "var(--text-faint)", fontWeight: 600 } }, L("Difficulty:", "Складність:", "Сложность:", "Difficulté :", "Schwierigkeit:")),
    ...DIFF_OPTIONS.map(({ v, emoji, label }) =>
      React.createElement("button", {
        key: v,
        onClick: () => { saveDiffVote(topicKey, v); setDiffVoted(true); },
        style: {
          display: "flex", alignItems: "center", gap: 3, padding: "3px 8px",
          background: currentVote === v ? "var(--indigo-50)" : "transparent",
          border: currentVote === v ? "1px solid var(--indigo-200)" : "1px solid var(--border-subtle)",
          borderRadius: 12, fontSize: 11, cursor: "pointer",
          color: currentVote === v ? "var(--indigo-600)" : "var(--text-muted)",
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
        React.createElement("h2", { style: { fontSize: 18, fontWeight: 700, color: "var(--text-strong)", margin: "12px 0 8px" } }, L("Welcome to Learn", "Ласкаво просимо до Навчання", "Добро пожаловать в Обучение", "Bienvenue dans Apprendre", "Willkommen bei Lernen")),
        React.createElement("p", { style: { fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 10px" } },
          L("This is a structured lesson — a few short steps that teach a concept, then check you understood it right away.", "Це структурований урок — кілька коротких кроків, які навчають концепції, а потім одразу перевіряють розуміння.", "Это структурированный урок — несколько коротких шагов, которые обучают концепции, а затем сразу проверяют понимание.", "Ceci est une leçon structurée — quelques étapes courtes qui enseignent un concept, puis vérifient immédiatement votre compréhension.", "Dies ist eine strukturierte Lektion — ein paar kurze Schritte, die ein Konzept vermitteln und dann sofort dein Verständnis prüfen.")),
        React.createElement("p", { style: { fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 20px" } },
          L("Rate each step's difficulty as you go, or tap ", "Оцінюйте складність кожного кроку, або натисніть ", "Оценивайте сложность каждого шага, или нажмите ", "Évaluez la difficulté de chaque étape, ou appuyez sur ", "Bewerte die Schwierigkeit jedes Schritts, oder tippe auf "), React.createElement("strong", null, L("Ask AI", "Запитати AI", "Спросить AI", "Demander à l'IA", "KI fragen")), L(" (bottom-right) any time you want something explained differently.", " (внизу праворуч), коли захочете, щоб щось пояснили інакше.", " (внизу справа), когда захотите, чтобы что-то объяснили иначе.", " (en bas à droite) à tout moment pour une explication différente.", " (unten rechts), wenn du etwas anders erklärt haben möchtest.")),
        React.createElement("button", {
          onClick: dismissLearnTooltip,
          style: { width: "100%", padding: "12px 0", background: "var(--indigo-600)", color: "white", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }
        }, L("Got it →", "Зрозуміло →", "Понятно →", "Compris →", "Verstanden →")))),
    // Progress header
    React.createElement("div", { style: { padding: "12px 20px 0" } },
      // Meta-strip
      step === 0 && React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10, alignItems: "center" } },
        React.createElement("span", { style: { fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 } }, "⏱ ~", estTotalMin, ` ${L("min", "хв", "мин", "min", "Min.")}`),
        examName && React.createElement("span", { style: { fontSize: 12, color: "var(--text-muted)" } }, "·"),
        examName && React.createElement("span", { style: { fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 } }, "📚 ", examName),
        React.createElement("span", { style: { fontSize: 12, color: "var(--text-muted)" } }, "·"),
        React.createElement("span", { style: { fontSize: 12, color: "var(--text-muted)" } }, totalSteps, ` ${L("steps", "кроків", "шагов", "étapes", "Schritte")}`)),
      // ── Game HUD: level badge + XP-to-next bar + combo flame ──
      React.createElement("div", { style: { position: "relative", display: "flex", alignItems: "center", gap: 10, marginBottom: 8 } },
        React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, background: "var(--ink-900)", color: "#fff", fontSize: 11, fontWeight: 800, fontFamily: "var(--font-display)", letterSpacing: "0.02em", flexShrink: 0 } },
          L("LV", "РІВ", "УР", "NIV", "LV"), " ", _lvl.level),
        React.createElement("div", { style: { flex: 1, height: 7, borderRadius: 4, background: "var(--surface-sunken)", overflow: "hidden" } },
          React.createElement("div", { style: { height: "100%", width: _lvlPct + "%", background: "linear-gradient(90deg,var(--emerald-500),var(--emerald-600))", borderRadius: 4, transition: "width 0.5s var(--ease-out)" } })),
        comboActive && React.createElement("span", { key: "combo-" + consecutiveCorrect, style: { display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 9px", borderRadius: 999, background: "var(--amber-50)", color: "var(--amber-700)", fontSize: 11, fontWeight: 800, flexShrink: 0, animation: "pulse 0.4s var(--ease-out)" } }, "🔥 x", consecutiveCorrect),
        // Floating "+N XP" pop on each answer
        xpPop && React.createElement("span", { key: xpPop.id, style: { position: "absolute", right: comboActive ? 74 : 8, top: -2, fontSize: 13, fontWeight: 800, fontFamily: "var(--font-mono)", color: xpPop.correct ? "var(--emerald-600)" : "var(--text-faint)", animation: "xppop 1s var(--ease-out) forwards", pointerEvents: "none" } }, "+", xpPop.amount)),
      // Step counter + stats row
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } },
        React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "var(--text-strong)" } }, L(`Step ${step + 1} of ${totalSteps}`, `Крок ${step + 1} з ${totalSteps}`, `Шаг ${step + 1} из ${totalSteps}`, `Étape ${step + 1} sur ${totalSteps}`, `Schritt ${step + 1} von ${totalSteps}`)),
        React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center", fontSize: 12, color: "var(--text-muted)" } },
          totalAnswered > 0 && React.createElement("span", { style: { background: "var(--emerald-50)", color: "var(--emerald-700)", padding: "2px 8px", borderRadius: 10, fontWeight: 600, fontSize: 11 } }, `${correctCount}/${totalAnswered} ✓`),
          estMinsLeft && React.createElement("span", null, L(`~${estMinsLeft}m left`, `~${estMinsLeft}хв залишилось`, `~${estMinsLeft}мин осталось`, `~${estMinsLeft}min restantes`, `~${estMinsLeft}Min. übrig`))),
      ),
      // Progress bar
      React.createElement("div", { style: { height: 5, background: "var(--surface-muted)", borderRadius: 3, overflow: "hidden" } },
        React.createElement("div", { style: { height: "100%", width: "100%", transform: `scaleX(${pct / 100})`, transformOrigin: "left", background: "linear-gradient(90deg,var(--indigo-500),var(--indigo-600))", borderRadius: 3, transition: "transform 0.4s ease" } })),
      // Bottom row: title + exit
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 } },
        React.createElement("span", { style: { fontSize: 12, color: "var(--text-faint)", fontWeight: 500 } }, plan.title),
        React.createElement("button", { onClick: () => { commitResults(); onExit(); }, style: { fontSize: 11, color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", textDecoration: "underline" } }, L("Exit", "Вийти", "Выйти", "Quitter", "Verlassen"))),
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
          React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "var(--text-strong)", flex: 1 } }, L("Ask about this step", "Запитати про цей крок", "Спросить об этом шаге", "Poser une question sur cette étape", "Frage zu diesem Schritt")),
          React.createElement("button", { onClick: () => setAskOpen(false), style: { background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "var(--text-muted)", padding: 0 } }, "✕")),
        // Reply area
        React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "12px 16px", minHeight: 80 } },
          askReply
            ? React.createElement("div", { style: { fontSize: 13, color: "var(--text-body)", lineHeight: 1.65 }, dangerouslySetInnerHTML: { __html: _md(askReply) } })
            : askLoading
              ? React.createElement("div", { style: { display: "flex", gap: 5, padding: "20px 0", justifyContent: "center" } },
                  ...[0, 1, 2].map((d) => React.createElement("span", { key: d, style: { width: 7, height: 7, borderRadius: "50%", background: "var(--indigo-500)", animation: "loadDot 1.2s ease-in-out infinite", animationDelay: d * 0.2 + "s" } })))
              : React.createElement("p", { style: { fontSize: 12, color: "var(--text-muted)", margin: 0 } }, L("Ask anything about this step — I'll explain it differently, give a hint, or go deeper.", "Запитайте що завгодно про цей крок — я поясню інакше, дам підказку або заглиблюся детальніше.", "Спросите что угодно об этом шаге — я объясню иначе, дам подсказку или углублюсь детальнее.", "Posez toutes vos questions sur cette étape — je l'expliquerai différemment, donnerai un indice, ou irai plus loin.", "Frag alles zu diesem Schritt — ich erkläre es anders, gebe einen Hinweis oder gehe tiefer."))),
        // Input
        React.createElement("div", { style: { padding: "10px 12px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 8 } },
          React.createElement("input", {
            value: askInput, onChange: (e) => setAskInput(e.target.value), autoFocus: true,
            placeholder: L("e.g. Why is this the answer?", "напр. Чому це правильна відповідь?", "напр. Почему это правильный ответ?", "ex. Pourquoi est-ce la bonne réponse ?", "z. B. Warum ist das die Antwort?"),
            onKeyDown: (e) => {
              if (e.key === "Enter" && askInput.trim() && !askLoading) {
                const q = askInput.trim();
                setAskInput(""); setAskReply(null); setAskLoading(true);
                const stepCtx = s ? `Current step: ${JSON.stringify({ type: s.type, title: s.title, question: s.question || s.statement || s.prompt || "", body: s.body || "" })}` : "";
                (window.brainComplete || ((a) => window.claude.complete(a)))({
                  system: `You're a tutor answering a quick question DURING a lesson on "${topic}". ${stepCtx}\nBe concise — 2-4 sentences max. Use **bold** for key terms. Don't repeat what the step already says; add new insight.`,
                  messages: [{ role: "user", content: q }],
                }).then((r) => { setAskReply(r); setAskLoading(false); })
                  .catch(() => { setAskReply(L("Couldn't get an answer right now — try again.", "Не вдалося отримати відповідь зараз — спробуйте ще раз.", "Не удалось получить ответ сейчас — попробуйте ещё раз.", "Impossible d'obtenir une réponse pour le moment — réessayez.", "Antwort konnte gerade nicht abgerufen werden — versuche es erneut.")); setAskLoading(false); });
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
                .catch(() => { setAskReply(L("Couldn't get an answer right now — try again.", "Не вдалося отримати відповідь зараз — спробуйте ще раз.", "Не удалось получить ответ сейчас — попробуйте ещё раз.", "Impossible d'obtenir une réponse pour le moment — réessayez.", "Antwort konnte gerade nicht abgerufen werden — versuche es erneut.")); setAskLoading(false); });
            },
            style: { background: askInput.trim() && !askLoading ? "var(--indigo-600)" : "var(--indigo-200)", color: "white", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: askInput.trim() && !askLoading ? "pointer" : "default", fontFamily: "var(--font-sans)" }
          }, L("Ask", "Запитати", "Спросить", "Demander", "Fragen")))),
      // Floating button
      React.createElement("button", {
        onClick: () => { setAskOpen((v) => !v); if (!askOpen) { setAskReply(null); setAskInput(""); } },
        style: { width: 48, height: 48, borderRadius: "50%", background: askOpen ? "var(--indigo-700)" : "linear-gradient(135deg,var(--indigo-500),var(--indigo-600))", border: "none", color: "white", fontSize: 22, cursor: "pointer", boxShadow: "0 4px 20px rgba(34,124,99,0.4)", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.15s, background 0.15s" }
      }, askOpen ? "✕" : "💬")));
}

// ─── CHAT MODE (freeform) ────────────────────────────────────────────────────

function ChatMode({ onExit, initialQuery, t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
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
    if (weakest.length > 0) chips.push({ text: L(`Explain ${weakest[0].topicName}`, `Поясни ${weakest[0].topicName}`, `Объясни ${weakest[0].topicName}`, `Explique ${weakest[0].topicName}`, `Erkläre ${weakest[0].topicName}`), icon: "📖" });
    if (dueReviews.length > 0) chips.push({ text: L(`Quiz me on ${dueReviews[0].topicName}`, `Заквізуй мене з ${dueReviews[0].topicName}`, `Проверь меня по ${dueReviews[0].topicName}`, `Interroge-moi sur ${dueReviews[0].topicName}`, `Frag mich zu ${dueReviews[0].topicName}`), icon: "📝" });
    chips.push({ text: L("Summarize my notes", "Підсумуй мої конспекти", "Резюмируй мои конспекты", "Résume mes notes", "Fasse meine Notizen zusammen"), icon: "📄" });
    chips.push({ text: L("Make harder questions", "Зроби складніші питання", "Сделай вопросы посложнее", "Fais des questions plus difficiles", "Mach die Fragen schwerer"), icon: "🔥" });
    if (examViews.length > 0) chips.push({ text: L(`Test my ${examViews[0].name} knowledge`, `Перевір мої знання з ${examViews[0].name}`, `Проверь мои знания по ${examViews[0].name}`, `Teste mes connaissances en ${examViews[0].name}`, `Teste mein Wissen in ${examViews[0].name}`), icon: "🎯" });
    chips.push({ text: L("Create flashcards", "Створи картки", "Создай карточки", "Crée des cartes", "Erstelle Karteikarten"), icon: "🗂" });
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
        pushAI(L(`I noticed your **${w.topicName}** retention is at ${Math.round(w.retention * 100)}%. Want me to explain it or run 5 quick questions?`,
          `Я помітив, що ваша впевненість у **${w.topicName}** становить ${Math.round(w.retention * 100)}%. Пояснити тему чи запустити 5 швидких питань?`,
          `Я заметил, что ваша уверенность в **${w.topicName}** составляет ${Math.round(w.retention * 100)}%. Объяснить тему или запустить 5 быстрых вопросов?`,
          `J'ai remarqué que votre rétention de **${w.topicName}** est de ${Math.round(w.retention * 100)}%. Je l'explique ou on fait 5 questions rapides ?`,
          `Mir ist aufgefallen, dass deine Merkfähigkeit bei **${w.topicName}** bei ${Math.round(w.retention * 100)}% liegt. Soll ich es erklären oder 5 schnelle Fragen stellen?`), [
          { text: L("Explain it", "Поясни це", "Объясни это", "Explique-le", "Erkläre es"), icon: "📖" },
          { text: L("5 quick questions", "5 швидких питань", "5 быстрых вопросов", "5 questions rapides", "5 schnelle Fragen"), icon: "⚡" },
        ]);
      } else {
        const w = weakest[0];
        pushAI(L(`You haven't started **${w.topicName}** yet. Want a quick intro or 5 practice questions to dive in?`,
          `Ви ще не починали **${w.topicName}**. Хочете короткий вступ чи 5 практичних питань?`,
          `Вы ещё не начинали **${w.topicName}**. Хотите короткое введение или 5 практических вопросов?`,
          `Vous n'avez pas encore commencé **${w.topicName}**. Une intro rapide ou 5 questions pour vous lancer ?`,
          `Du hast **${w.topicName}** noch nicht begonnen. Möchtest du eine kurze Einführung oder 5 Übungsfragen?`), [
          { text: L("Give me an intro", "Дай короткий вступ", "Дай короткое введение", "Donne-moi une intro", "Gib mir eine Einführung"), icon: "📖" },
          { text: L("5 quick questions", "5 швидких питань", "5 быстрых вопросов", "5 questions rapides", "5 schnelle Fragen"), icon: "⚡" },
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
      pushAI(L("Connection hiccup — try again in a moment.", "Тимчасовий збій зв'язку — спробуйте за хвилину.", "Временный сбой связи — попробуйте через минуту.", "Petit souci de connexion — réessayez dans un instant.", "Kurzer Verbindungsaussetzer — versuch es gleich noch einmal."));
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
  const greeting = hour < 12 ? L("Good morning", "Доброго ранку", "Доброе утро", "Bonjour", "Guten Morgen") : hour < 18 ? L("Good afternoon", "Доброго дня", "Добрый день", "Bon après-midi", "Guten Tag") : L("Good evening", "Доброго вечора", "Добрый вечер", "Bonsoir", "Guten Abend");

  // ── AI Dashboard — always shown at top ──
  const renderDashboard = () => React.createElement("div", { style: { padding: "20px", display: "flex", flexDirection: "column", gap: 16 } },
    // Hero greeting
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 14, padding: "20px", background: "linear-gradient(135deg,var(--indigo-50),var(--indigo-100))", borderRadius: 18 } },
      React.createElement("div", { style: { position: "relative" } },
        React.createElement(CoachIcon, { size: 48 }),
        React.createElement("div", { style: { position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: "50%", background: "var(--emerald-500)", border: "2px solid white" } })),
      React.createElement("div", { style: { flex: 1 } },
        React.createElement("p", { style: { margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-strong)" } }, `${greeting}${name ? `, ${name}` : ""} 👋`),
        React.createElement("p", { style: { margin: "2px 0 0", fontSize: 13, color: "var(--text-muted)" } }, L("Ready to study", "Готові вчитися", "Готовы учиться", "Prêt à étudier", "Bereit zu lernen")))),

    // Context cards row
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 } },
      React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "14px 12px", textAlign: "center" } },
        React.createElement("p", { style: { margin: 0, fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" } }, L("Readiness", "Готовність", "Готовность", "Préparation", "Bereitschaft")),
        React.createElement("p", { style: { margin: "4px 0 0", fontSize: avgReadiness != null ? 22 : 14, fontWeight: 700, color: avgReadiness == null ? "var(--text-faint)" : avgReadiness >= 70 ? "var(--emerald-700)" : avgReadiness >= 40 ? "var(--amber-700)" : "var(--red-700)" } }, avgReadiness != null ? `${avgReadiness}%` : L("New", "Нове", "Новое", "Nouveau", "Neu"))),
      React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "14px 12px", textAlign: "center" } },
        React.createElement("p", { style: { margin: 0, fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" } }, L("Next Exam", "Наступний іспит", "Следующий экзамен", "Prochain examen", "Nächste Prüfung")),
        React.createElement("p", { style: { margin: "4px 0 0", fontSize: 22, fontWeight: 700, color: daysToExam != null && daysToExam <= 7 ? "var(--red-700)" : "var(--text-strong)" } }, daysToExam != null ? `${daysToExam}d` : "—")),
      React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "14px 12px", textAlign: "center" } },
        React.createElement("p", { style: { margin: 0, fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" } }, L("Reviews Due", "Повторень потрібно", "Повторений нужно", "Révisions dues", "Fällige Wiederholungen")),
        React.createElement("p", { style: { margin: "4px 0 0", fontSize: 22, fontWeight: 700, color: dueReviews.length > 0 ? "var(--amber-700)" : "var(--emerald-700)" } }, dueReviews.length))),

    // Today's recommendation
    recTopic && React.createElement("div", {
      onClick: () => send(L(`Explain ${recTopic.topicName}`, `Поясни ${recTopic.topicName}`, `Объясни ${recTopic.topicName}`, `Explique ${recTopic.topicName}`, `Erkläre ${recTopic.topicName}`)),
      style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: "16px 18px", cursor: "pointer" }
    },
      React.createElement("p", { style: { margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" } }, L("Today's Recommendation", "Рекомендація на сьогодні", "Рекомендация на сегодня", "Recommandation du jour", "Heutige Empfehlung")),
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
        React.createElement("span", { style: { fontSize: 24 } }, recIsReview ? "📖" : "🌱"),
        React.createElement("div", { style: { flex: 1 } },
          React.createElement("p", { style: { margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-strong)" } }, recIsReview ? L(`Review ${recTopic.topicName}`, `Повтори ${recTopic.topicName}`, `Повтори ${recTopic.topicName}`, `Révise ${recTopic.topicName}`, `Wiederhole ${recTopic.topicName}`) : L(`Get started with ${recTopic.topicName}`, `Почни з ${recTopic.topicName}`, `Начни с ${recTopic.topicName}`, `Commence par ${recTopic.topicName}`, `Beginne mit ${recTopic.topicName}`)),
          React.createElement("p", { style: { margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" } }, recIsReview ? L(`${Math.round(recTopic.retention * 100)}% retention · ~5 min`, `${Math.round(recTopic.retention * 100)}% пам'яті · ~5 хв`, `${Math.round(recTopic.retention * 100)}% памяти · ~5 мин`, `${Math.round(recTopic.retention * 100)}% de rétention · ~5 min`, `${Math.round(recTopic.retention * 100)}% Merkfähigkeit · ~5 Min`) : L("New topic · ~5 min", "Нова тема · ~5 хв", "Новая тема · ~5 мин", "Nouveau sujet · ~5 min", "Neues Thema · ~5 Min"))),
        React.createElement("span", { style: { fontSize: 13, color: "var(--indigo-600)", fontWeight: 600 } }, L("Continue →", "Продовжити →", "Продолжить →", "Continuer →", "Weiter →")))),

    // Quick actions grid — asks which exam/topic first (via pickerFlow, see
    // startPicker below) instead of guessing weakest[0]/examViews[0] and
    // firing immediately. That guess was frequently wrong the moment a
    // student had more than one exam, or any stale/mistyped exam in their
    // list — "Explain a topic" could fire off explaining a random exam.
    React.createElement("div", null,
      React.createElement("p", { style: { margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" } }, L("Quick Actions", "Швидкі дії", "Быстрые действия", "Actions rapides", "Schnellaktionen")),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } },
        ...QUICK_ACTIONS.map((a, i) => React.createElement("button", {
          key: i, onClick: () => startPicker(a.id),
          style: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: 12, cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left" }
        },
          React.createElement("span", { style: { fontSize: 18 } }, a.icon),
          React.createElement("span", { style: { fontSize: 13, fontWeight: 500, color: "var(--text-body)" } }, a.text[t?.code] || a.text.en))))));

  // ── Chat messages — rendered below dashboard ──
  const renderChat = () => React.createElement("div", { style: { padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 12 } },
    ...messages.map((m) =>
      React.createElement(React.Fragment, { key: m.id },
        React.createElement("div", { style: { display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 10, alignItems: "flex-start" } },
          m.role === "ai" && React.createElement(CoachIcon, { size: 28 }),
          React.createElement("div", {
            style: { maxWidth: "80%", background: m.role === "user" ? "var(--indigo-600)" : "var(--surface-card)", color: m.role === "user" ? "white" : "var(--text-body)", border: m.role === "user" ? "none" : "1px solid var(--border-subtle)", padding: "10px 14px", borderRadius: 16, borderTopRightRadius: m.role === "user" ? 4 : 16, borderTopLeftRadius: m.role === "ai" ? 4 : 16, fontSize: 13, lineHeight: 1.65 },
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
        ...[0, 1, 2].map((d) => React.createElement("span", { key: d, style: { width: 7, height: 7, borderRadius: "50%", background: "var(--indigo-500)", animation: "loadDot 1.2s ease-in-out infinite", animationDelay: d * 0.2 + "s" } })))));

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
        bubble(L("Which exam would you like to study?", "Який іспит хочете вивчати?", "Какой экзамен хотите изучать?", "Quel examen voulez-vous étudier ?", "Welche Prüfung möchtest du lernen?")),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8, marginLeft: 38 } },
          ...examViews.map((e) => React.createElement("button", {
            key: e.id, onClick: () => setPickerFlow({ ...pickerFlow, step: "topic", examId: e.id }),
            style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--surface-card)", border: "1.5px solid var(--border-default)", borderRadius: 12, cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left" }
          },
            React.createElement("span", { style: { fontSize: 13, fontWeight: 600, color: "var(--text-strong)" } }, e.name),
            React.createElement("span", { style: { fontSize: 11, color: "var(--text-faint)" } }, e.daysAway != null ? L(`Exam in ${e.daysAway}d`, `Іспит через ${e.daysAway}д`, `Экзамен через ${e.daysAway}д`, `Examen dans ${e.daysAway}j`, `Prüfung in ${e.daysAway}T`) : ""))),
          cancelBtn(() => setPickerFlow(null), L("Cancel", "Скасувати", "Отмена", "Annuler", "Abbrechen"))));
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
      React.createElement("span", { style: { fontSize: 11, fontWeight: 700, color: tp.unseen ? "var(--indigo-600)" : tp.retention < 30 ? "var(--red-700)" : "var(--amber-700)" } }, tp.unseen ? L("New", "Нове", "Новое", "Nouveau", "Neu") : `${tp.retention}%`));

    return React.createElement("div", { style: { padding: "0 20px 16px" } },
      bubble(exam ? L(`Great! Which topic in ${exam.name} should we focus on?`, `Чудово! На якій темі з ${exam.name} зосередимось?`, `Отлично! На какой теме из ${exam.name} сосредоточимся?`, `Parfait ! Sur quel sujet de ${exam.name} devrions-nous nous concentrer ?`, `Super! Auf welches Thema in ${exam.name} sollten wir uns konzentrieren?`) : L("Which topic should we focus on?", "На якій темі зосередимось?", "На какой теме сосредоточимся?", "Sur quel sujet devrions-nous nous concentrer ?", "Auf welches Thema sollten wir uns konzentrieren?")),
      React.createElement("div", { style: { marginLeft: 38, display: "flex", flexDirection: "column", gap: 10 } },
        topics.length === 0 && React.createElement("p", { style: { fontSize: 12, color: "var(--text-faint)", margin: 0 } }, L("No topics yet for this exam — try asking in your own words below.", "Поки немає тем для цього іспиту — спробуйте написати своїми словами нижче.", "Пока нет тем для этого экзамена — попробуйте написать своими словами ниже.", "Pas encore de sujets pour cet examen — essayez de poser votre question ci-dessous.", "Noch keine Themen für diese Prüfung — versuche es unten mit deinen eigenen Worten.")),
        recommended.length > 0 && !q && React.createElement("div", null,
          React.createElement("p", { style: { fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" } }, L("AI Recommended", "Рекомендовано AI", "Рекомендовано AI", "Recommandé par l'IA", "KI-Empfehlung")),
          React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, ...recommended.map(topicRow))),
        q && React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } },
          searched.length > 0 ? searched.map(topicRow) : React.createElement("p", { style: { fontSize: 12, color: "var(--text-faint)", margin: 0 } }, L("No matching topics.", "Немає відповідних тем.", "Нет подходящих тем.", "Aucun sujet correspondant.", "Keine passenden Themen."))),
        topics.length > 0 && React.createElement("input", {
          value: pickerSearch, onChange: (e) => setPickerSearch(e.target.value), placeholder: L("Search topic…", "Пошук теми…", "Поиск темы…", "Rechercher un sujet…", "Thema suchen…"),
          style: { padding: "9px 12px", fontSize: 12, fontFamily: "var(--font-sans)", border: "1px solid var(--border-default)", borderRadius: 10, outline: "none", background: "var(--surface-page)" }
        }),
        cancelBtn(() => cameFromExamStep ? setPickerFlow({ action: pickerFlow.action, step: "exam" }) : setPickerFlow(null), cameFromExamStep ? L("← Back", "← Назад", "← Назад", "← Retour", "← Zurück") : L("Cancel", "Скасувати", "Отмена", "Annuler", "Abbrechen"))));
  };

  return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)" } },
    // Header
    React.createElement("div", { style: { padding: "10px 20px", borderBottom: "1px solid var(--border-subtle)", background: "var(--surface-card)", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 48 } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
        React.createElement("div", { style: { position: "relative" } },
          React.createElement(CoachIcon, { size: 28 }),
          React.createElement("div", { style: { position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", background: "var(--emerald-500)", border: "2px solid var(--surface-card)" } })),
        React.createElement("div", null,
          React.createElement("span", { style: { fontSize: 14, fontWeight: 700, color: "var(--text-strong)" } }, L("AI Coach", "AI-коуч", "AI-коуч", "Coach IA", "KI-Coach")),
          React.createElement("span", { style: { fontSize: 11, color: "var(--emerald-600)", marginLeft: 8 } }, L("Ready to help", "Готовий допомогти", "Готов помочь", "Prêt à aider", "Bereit zu helfen")))),
      React.createElement("button", { onClick: () => { try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(HISTORY_KEY); } catch {} onExit(); }, style: { background: "transparent", border: "1px solid var(--border-default)", color: "var(--text-muted)", borderRadius: 8, padding: "3px 10px", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-sans)" } }, L("Exit", "Вийти", "Выйти", "Quitter", "Verlassen"))),

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
      React.createElement("textarea", { ref: inputRef, value: input, onChange: (e) => setInput(e.target.value), onKeyDown: (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }, placeholder: L("Ask anything…", "Запитайте що завгодно…", "Спросите что угодно…", "Posez toutes vos questions…", "Frag alles…"), rows: 1, style: { flex: 1, border: "1px solid var(--border-default)", borderRadius: 12, padding: "10px 14px", fontSize: 13, fontFamily: "var(--font-sans)", color: "var(--text-body)", background: "var(--surface-page)", resize: "none", outline: "none", lineHeight: 1.5, maxHeight: 100, overflowY: "auto" } }),
      React.createElement("button", { onClick: () => send(input), disabled: !input.trim() || typing, style: { background: input.trim() && !typing ? "var(--indigo-600)" : "var(--indigo-200)", color: "white", border: "none", borderRadius: 12, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: input.trim() && !typing ? "pointer" : "default", fontFamily: "var(--font-sans)" } }, L("Send", "Надіслати", "Отправить", "Envoyer", "Senden"))));
}

// ─── MAIN ROUTER ─────────────────────────────────────────────────────────────

function AIChat({ t, initialQuery, onConsumeQuery }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
  const [mode, setMode] = React.useState(null);
  const [topic, setTopic] = React.useState(null);
  const [topicPicker, setTopicPicker] = React.useState(false);
  const [expandedFolders, setExpandedFolders] = React.useState({}); // examId -> bool, "show all N" toggle in the topic picker
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
  if (mode === "learn" && topic) return React.createElement(LessonEngine, { topic, mode: "learn", onExit: exitToLobby, t });
  if (mode === "chat") return React.createElement(ChatMode, { onExit: exitToLobby, initialQuery: pendingChatQuery, t });

  // Review mode — Quick Check session from the queue
  if (mode === "review" && reviewTopic) {
    const isQuick = reviewTopic === "__quick__";
    const quickTopic = isQuick ? ((brain.dueReviews || [])[0]?.topicName || (brain.weakestTopics || [])[0]?.topicName || L("General review", "Загальний огляд", "Общий обзор", "Révision générale", "Allgemeine Wiederholung")) : null;
    return React.createElement(QuickCheckEngine, {
      topic: isQuick ? quickTopic : reviewTopic,
      onExit: exitToQueue,
      t,
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
      return d <= 0 ? L("today", "сьогодні", "сегодня", "aujourd'hui", "heute") : d === 1 ? L("yesterday", "вчора", "вчера", "hier", "gestern") : L(`${d} days ago`, `${d} дн. тому`, `${d} дн. назад`, `il y a ${d} jours`, `vor ${d} Tagen`);
    };
    const retColor = (r) => r < 0.3 ? { fg: "var(--red-700)", bg: "var(--red-50)", bar: "var(--red-500)" } : r < 0.5 ? { fg: "var(--amber-700)", bg: "var(--amber-50)", bar: "var(--amber-500)" } : { fg: "var(--amber-700)", bg: "var(--amber-50)", bar: "var(--subject-yellow)" };
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
            `${tp.examName}${tp.lastSeen ? ` · ${L(`last seen ${daysAgo(tp.lastSeen)}`, `востаннє ${daysAgo(tp.lastSeen)}`, `последний раз ${daysAgo(tp.lastSeen)}`, `vu ${daysAgo(tp.lastSeen)}`, `zuletzt ${daysAgo(tp.lastSeen)}`)}` : ""}`)),
        React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: "var(--indigo-600)", flexShrink: 0 } }, L("Check →", "Перевірити →", "Проверить →", "Vérifier →", "Prüfen →")));
    };

    return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)", padding: "24px 20px", overflowY: "auto" } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 } },
        React.createElement("button", { onClick: exitToLobby, style: { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted)", padding: 0 } }, "←"),
        React.createElement("h2", { style: { margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-strong)" } }, L("⚡ Quick Check", "⚡ Швидка перевірка", "⚡ Быстрая проверка", "⚡ Vérification rapide", "⚡ Schnelltest"))),
      React.createElement("p", { style: { margin: "0 0 14px 28px", fontSize: 13, color: "var(--text-muted)" } },
        queue.length > 0
          ? L(`${queue.length} ${queue.length === 1 ? "topic is" : "topics are"} fading — weakest first.`, `${queue.length} ${queue.length === 1 ? "тема забувається" : "тем забуваються"} — спочатку найслабші.`, `${queue.length} ${queue.length === 1 ? "тема забывается" : "тем забываются"} — сначала самые слабые.`, `${queue.length} sujet(s) s'estompe(nt) — les plus faibles en premier.`, `${queue.length} Thema(en) verblasst/verblassen — schwächste zuerst.`)
          : L("Nothing is due right now.", "Наразі нічого не потребує повторення.", "Сейчас ничего не требует повторения.", "Rien à réviser pour le moment.", "Momentan nichts fällig.")),

      // Quick Check all button
      (queue.length > 0 || weakFallback.length > 0) && React.createElement("button", {
        onClick: () => setReviewTopic("__quick__"),
        style: { display: "flex", alignItems: "center", gap: 12, margin: "0 0 16px", padding: "14px 18px", background: "linear-gradient(135deg,var(--indigo-50),var(--indigo-100))", border: "1.5px solid var(--indigo-500)", borderRadius: 14, cursor: "pointer", fontFamily: "var(--font-sans)", width: "100%" }
      },
        React.createElement("span", { style: { fontSize: 24 } }, "⚡"),
        React.createElement("div", { style: { flex: 1, textAlign: "left" } },
          React.createElement("p", { style: { margin: 0, fontSize: 14, fontWeight: 700, color: "var(--indigo-700)" } }, L("Quick Check — All Topics", "Швидка перевірка — усі теми", "Быстрая проверка — все темы", "Vérification rapide — tous les sujets", "Schnelltest — alle Themen")),
          React.createElement("p", { style: { margin: "2px 0 0", fontSize: 12, color: "var(--indigo-600)" } }, L("5 questions · ~2 min · see your score", "5 питань · ~2 хв · дізнайтесь свій результат", "5 вопросов · ~2 мин · узнайте свой результат", "5 questions · ~2 min · voyez votre score", "5 Fragen · ~2 Min. · sieh dein Ergebnis"))),
        React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "var(--indigo-600)" } }, L("Go →", "Почати →", "Начать →", "Aller →", "Los →"))),

      queue.length > 0 && React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
        ...queue.map(rowFor)),

      queue.length === 0 && React.createElement("div", { style: { textAlign: "center", padding: "32px 0" } },
        React.createElement("span", { style: { fontSize: 44 } }, "🌱"),
        React.createElement("p", { style: { margin: "12px 0 4px", fontSize: 16, fontWeight: 700, color: "var(--text-strong)" } }, L("All memories fresh!", "Усі знання свіжі!", "Все знания свежие!", "Toutes les connaissances sont fraîches !", "Alles frisch im Gedächtnis!")),
        React.createElement("p", { style: { margin: "0 0 20px", fontSize: 13, color: "var(--text-muted)" } }, L("Come back later — or sharpen your weakest topics now.", "Поверніться пізніше — або підтягніть свої слабкі теми зараз.", "Вернитесь позже — или подтяните свои слабые темы сейчас.", "Revenez plus tard — ou améliorez vos sujets les plus faibles maintenant.", "Komm später wieder — oder verbessere jetzt deine schwächsten Themen."))),
      queue.length === 0 && weakFallback.length > 0 && React.createElement("div", null,
        React.createElement("p", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" } }, L("Weakest topics", "Найслабші теми", "Самые слабые темы", "Sujets les plus faibles", "Schwächste Themen")),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
          ...weakFallback.map(rowFor))));
  }

  // Practice mode — full exam simulator with confidence + why
  if (mode === "practice") {
    return React.createElement(PracticeEngine, { examViews, onExit: exitToLobby, t });
  }

  // Speed Round mode
  if (mode === "speed") {
    return React.createElement(SpeedRoundEngine, { examViews, onExit: exitToLobby, t });
  }

  // Exam Simulation — full timed mock exam covering ALL topics of one subject
  if (mode === "exam_sim") {
    return React.createElement(ExamSimEngine, { examViews, onExit: exitToLobby, t });
  }

  // Topic picker for Learn mode — grouped into ONE FOLDER PER SUBJECT so a
  // student with several exams sees each subject's full topic list under its
  // own header, with studied topics marked (green ✓ / red = needs review) and
  // sorted to the bottom, instead of one confusing flat list where one subject
  // crowds out the others.
  if (topicPicker) {
    const ce = React.createElement;
    // Status pill for a topic: New (unseen), % with colour by retention.
    const statusPill = (tp) => {
      if (!tp.lastSeen) return ce("span", { style: { fontSize: 12, fontWeight: 700, color: "var(--indigo-600)" } }, L("New", "Нове", "Новое", "Nouveau", "Neu"));
      const r = Math.round(tp.retention * 100);
      const done = r >= 70, weak = r < 40;
      const col = done ? "var(--emerald-700)" : weak ? "var(--red-700)" : "var(--amber-700)";
      return ce("span", { style: { fontSize: 12, fontWeight: 700, color: col, display: "inline-flex", alignItems: "center", gap: 4 } },
        done ? "✓ " + r + "%" : (weak ? "⚠ " : "") + r + "%");
    };
    const folders = examViews.filter((e) => (e.topics || []).length > 0);

    return ce("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)", padding: "24px 20px", overflowY: "auto" } },
      ce("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 } },
        ce("button", { onClick: () => setTopicPicker(false), "aria-label": L("Back","Назад","Назад","Retour","Zurück"), style: { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted)", padding: 0 } }, "←"),
        ce("h2", { style: { margin: 0, fontSize: 18, fontWeight: 700, fontFamily: "var(--font-display)", letterSpacing: "-0.02em", color: "var(--text-strong)" } }, L("What do you want to learn?", "Що хочете вивчити?", "Что хотите изучить?", "Que voulez-vous apprendre ?", "Was möchtest du lernen?"))),
      ce("p", { style: { margin: "0 0 18px 28px", fontSize: 13, color: "var(--text-muted)" } },
        L("Pick a topic — finished ones show a green check.", "Оберіть тему — пройдені позначені зеленою галочкою.", "Выберите тему — пройденные отмечены зелёной галочкой.", "Choisissez un sujet — les terminés ont une coche verte.", "Wähle ein Thema — erledigte haben ein grünes Häkchen.")),

      folders.length === 0 && ce("p", { style: { fontSize: 14, color: "var(--text-muted)", margin: "20px 0" } },
        L("Add an exam first to build your topic list.", "Спершу додайте іспит, щоб з'явилися теми.", "Сначала добавьте экзамен, чтобы появились темы.", "Ajoutez d'abord un examen pour créer votre liste de sujets.", "Füge zuerst eine Prüfung hinzu, um deine Themenliste zu erstellen.")),

      ...folders.map((e, fi) => {
        const rows = (e.topics || []).map((tp) => ({ tp, name: tp.topicName || tp.name, studied: !!tp.lastSeen, ret: tp.lastSeen ? tp.retention : null }));
        const doneCount = rows.filter((r) => r.studied).length;
        // Unstudied first (what to do next), studied sink to the bottom.
        const ordered = [...rows.filter((r) => !r.studied), ...rows.filter((r) => r.studied)];
        const pct = Math.round((doneCount / Math.max(1, rows.length)) * 100);
        return ce("section", { key: e.id || fi, style: { marginBottom: 18, borderRadius: 18, border: "1px solid var(--border-subtle)", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)", overflow: "hidden" } },
          // Folder header
          ce("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)" } },
            ce("span", { style: { width: 10, height: 10, borderRadius: 3, background: e.color || "var(--indigo-500)", flexShrink: 0 } }),
            ce("div", { style: { flex: 1, minWidth: 0 } },
              ce("div", { style: { fontSize: 15, fontWeight: 700, fontFamily: "var(--font-display)", letterSpacing: "-0.01em", color: "var(--text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, e.name),
              ce("div", { style: { marginTop: 5, height: 5, borderRadius: 3, background: "var(--surface-sunken)", overflow: "hidden" } },
                ce("div", { style: { height: "100%", width: pct + "%", background: "var(--emerald-500)", borderRadius: 3, transition: "width var(--dur-slow) var(--ease-out)" } }))),
            ce("span", { style: { fontSize: 12, fontWeight: 700, color: "var(--text-muted)", fontFamily: "var(--font-mono)", flexShrink: 0 } }, doneCount + "/" + rows.length)),
          // Topic rows — collapsed to ~5 with a "show all N" toggle for long lists
          (() => {
            const COLLAPSE_N = 5;
            const expanded = !!expandedFolders[e.id];
            const visible = expanded || rows.length <= COLLAPSE_N ? ordered : ordered.slice(0, COLLAPSE_N);
            const hidden = rows.length - visible.length;
            return ce("div", { style: { display: "flex", flexDirection: "column" } },
              ...visible.map((r, ri) => ce("button", {
                key: ri, onClick: () => { setTopic(r.name); setTopicPicker(false); setMode("learn"); },
                // Warm the lesson cache on intent (hover/focus) so the click that
                // follows opens instantly instead of waiting on generation.
                onMouseEnter: () => prefetchLesson(r.name, t?.code),
                onFocus: () => prefetchLesson(r.name, t?.code),
                style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 16px", background: r.studied ? "var(--surface-muted)" : "transparent", border: "none", borderTop: ri === 0 ? "none" : "1px solid var(--border-subtle)", cursor: "pointer", fontFamily: "var(--font-sans)", width: "100%", textAlign: "left" }
              },
                ce("span", { style: { fontSize: 14, fontWeight: r.studied ? 500 : 600, color: r.studied ? "var(--text-muted)" : "var(--text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, r.name),
                statusPill(r.tp))),
              (rows.length > COLLAPSE_N) && ce("button", {
                onClick: () => setExpandedFolders((m) => ({ ...m, [e.id]: !expanded })),
                style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 16px", background: "transparent", border: "none", borderTop: "1px solid var(--border-subtle)", cursor: "pointer", fontFamily: "var(--font-sans)", width: "100%", fontSize: 13, fontWeight: 700, color: "var(--indigo-600)" }
              },
                expanded
                  ? L("Show less ↑", "Згорнути ↑", "Свернуть ↑", "Réduire ↑", "Weniger ↑")
                  : L(`Show all ${rows.length} topics ↓`, `Показати всі ${rows.length} тем ↓`, `Показать все ${rows.length} тем ↓`, `Voir les ${rows.length} sujets ↓`, `Alle ${rows.length} Themen ↓`)));
          })());
      }));
  }

  // ─── LOBBY ─────────────────────────────────────────────────────────────────
  const greeting = name
    ? L(`Hey ${name}! What do you want to do?`, `Привіт, ${name}! Що будемо робити?`, `Привет, ${name}! Что будем делать?`, `Salut ${name} ! Que veux-tu faire ?`, `Hallo ${name}! Was möchtest du tun?`)
    : L("Hey! What do you want to do?", "Привіт! Що будемо робити?", "Привет! Что будем делать?", "Salut ! Que veux-tu faire ?", "Hallo! Was möchtest du tun?");
  const urgentReview = dueReviews.length > 0 ? dueReviews[0] : null;
  const xpData = window.xpLevel ? window.xpLevel() : null;
  const xpPct = xpData ? Math.round((xpData.into / xpData.need) * 100) : 0;

  return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)" } },
    // Hero
    React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "36px 20px 20px" } },
      React.createElement(CoachIcon, { size: 56 }),
      React.createElement("h1", { style: { margin: "16px 0 4px", fontSize: 22, fontWeight: 700, color: "var(--text-strong)" } }, greeting),
      React.createElement("p", { style: { margin: 0, fontSize: 14, color: "var(--text-muted)" } }, L("Your AI Coach is ready.", "Ваш AI-коуч готовий.", "Ваш AI-коуч готов.", "Votre coach IA est prêt.", "Dein KI-Coach ist bereit.")),
      xpData && React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, margin: "14px auto 0", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: "10px 16px", maxWidth: 240 } },
        React.createElement("span", { style: { fontSize: 11, fontWeight: 700, color: "var(--indigo-600)", background: "var(--indigo-50)", padding: "4px 8px", borderRadius: 8, letterSpacing: "0.04em", whiteSpace: "nowrap" } }, `LV ${xpData.level}`),
        React.createElement("div", { style: { flex: 1 } },
          React.createElement("div", { style: { height: 6, background: "var(--border-subtle)", borderRadius: 3, overflow: "hidden" } },
            React.createElement("div", { style: { height: "100%", width: `${xpPct}%`, background: "linear-gradient(90deg,var(--indigo-500),var(--indigo-600))", borderRadius: 3 } })),
          React.createElement("p", { style: { fontSize: 10, color: "var(--text-muted)", margin: "3px 0 0", textAlign: "right" } }, `${xpData.into}/${xpData.need} XP`)))),

    // Urgent review nudge
    urgentReview && React.createElement("div", {
      onClick: () => { setReviewTopic(urgentReview.topicName); setMode("review"); },
      style: { margin: "0 20px 16px", padding: "12px 16px", background: "var(--amber-50)", border: "1px solid var(--amber-200)", borderRadius: 12, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }
    },
      React.createElement("span", { style: { fontSize: 20 } }, "⚡"),
      React.createElement("div", { style: { flex: 1 } },
        React.createElement("p", { style: { margin: 0, fontSize: 13, fontWeight: 600, color: "var(--amber-700)" } }, L(`${urgentReview.topicName} is fading`, `${urgentReview.topicName} забувається`, `${urgentReview.topicName} забывается`, `${urgentReview.topicName} s'estompe`, `${urgentReview.topicName} verblasst`)),
        React.createElement("p", { style: { margin: 0, fontSize: 12, color: "var(--amber-700)" } }, L(`${Math.round(urgentReview.retention * 100)}% retention — review now`, `${Math.round(urgentReview.retention * 100)}% утримання — повторіть зараз`, `${Math.round(urgentReview.retention * 100)}% удержания — повторите сейчас`, `${Math.round(urgentReview.retention * 100)}% de rétention — révisez maintenant`, `${Math.round(urgentReview.retention * 100)}% Behalten — jetzt wiederholen`))),
      React.createElement("span", { style: { fontSize: 12, color: "var(--amber-700)", fontWeight: 600 } }, "→")),

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
        React.createElement("span", { style: { fontSize: 15, fontWeight: 700, color: "var(--text-strong)" } }, m.label[t?.code] || m.label.en),
        React.createElement("span", { style: { fontSize: 12, color: "var(--text-muted)" } }, m.desc[t?.code] || m.desc.en)))));
}

Object.assign(window, { AIChat, CoachIcon, LearnEngine });
