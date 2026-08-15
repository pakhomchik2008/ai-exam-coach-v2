// AI Exam Coach — AI Coach v6: Lesson Engine
//
// Chat attachments use CHAT_LIMITS rather than the study upload limits: every
// attached file is re-sent with the whole conversation on each turn, so the cap
// multiplies token cost by thread length, not just by file size.
import { validateFiles, rejectionSummary, CHAT_LIMITS, ACCEPT_ATTRIBUTE } from "../../lib/upload-limits";
import { extractStudyFile, describeStudyFileError, toClaudeBlocks } from "../../lib/extract-study-file";
import { describeAiError } from "../../lib/ai-error";
import { checkAndRecordQuestion } from "../../lib/question-novelty";
import { filterMcqBatch, filterFlashcards, mcqRulesBlock, mixedLanguage, planCorrectIndices, reportRejections } from "../../lib/question-lint";
import { failClosedExplain, isWeakTeachBack } from "../../lib/weak-transcript";
import { renderCoachMarkdown } from "../../lib/math-render";
import { sanitizeSvg } from "../../lib/svg-sanitize";
import { isSpeechSupported, speak } from "../../lib/speech";
import { specFor } from "../../lib/exam-specs";
import { ExamRecap } from "../study/ExamRecap.jsx";
import { WaitPress } from "../../components/WaitPress";
import { ListenClip } from "../../components/ListenClip";
import { dropIeltsSpeakingTopics, isIeltsListeningTopic, isIeltsQual, isIeltsSpeakingTopic } from "../../lib/ielts-listen";
import { isIeltsReadingTopic, isIeltsWritingTopic } from "../../lib/ielts-paper";
import { IeltsReading } from "../ielts/IeltsReading";
import { IeltsWriting } from "../ielts/IeltsWriting";
import { SocraticDialog } from "../learn/SocraticDialog.jsx";
import { FadingDialog } from "../learn/FadingDialog.jsx";
import { FeynmanDialog } from "../learn/FeynmanDialog.jsx";
import { SpeakingDialog } from "../learn/SpeakingDialog.jsx";
import { recommendLearnMethod } from "../learn/recommend";
import { treeForExam } from "../learn/tree/resolve";
import { flattenLessonNodes, localize } from "../learn/tree/schema";
import { freeNodeCount, isProUser, topicIsLocked } from "../learn/premium";
import { copyLangFor, inferCoachQual, languageNameFor, paperLanguageFor, paperQualForExam } from "../../lib/paper-language";
import { ProSheet } from "../learn/ProSheet.jsx";

/**
 * The qualification id (nmt/sat/gcse/...) an exam belongs to, or null — the
 * key that picks both the mock-exam spec (exam-specs.ts) and the reporting
 * scale (scales.ts).
 *
 * Delegates to exams-store's `examQualificationId` so there is one definition
 * of "which qualification is this", not a copy per feature.
 */
function _qualificationOf(exam) {
  if (!exam) return null;
  return (window.examQualificationId ? window.examQualificationId(exam) : exam.qualificationId) || null;
}

function _paperQualOf(exam) {
  if (!exam) return null;
  return paperQualForExam({ ...exam, qualificationId: _qualificationOf(exam) }) || _qualificationOf(exam);
}

/** Academic vs GT + which paper — asked every sitting, never stored. */
function _ieltsSitPickers({ t, module, setModule, paper, setPaper, papers }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
  const chip = (on, label, onClick, key) => React.createElement("button", {
    key, type: "button", onClick,
    style: { padding: "8px 14px", fontSize: 13, fontWeight: 600, borderRadius: 20, border: `1.5px solid ${on ? "var(--indigo-500)" : "var(--border-default)"}`, background: on ? "var(--indigo-50)" : "var(--surface-card)", color: on ? "var(--indigo-700)" : "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font-sans)" },
  }, label);
  return [
    React.createElement("p", { key: "ml", style: { fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" } }, L("Module this sitting", "Модуль цього разу", "Модуль в этот раз", "Module cette fois", "Modul diesmal")),
    React.createElement("div", { key: "mv", style: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 } },
      chip(module === "academic", "Academic", () => setModule("academic"), "ac"),
      chip(module === "gt", "General Training", () => setModule("gt"), "gt")),
    React.createElement("p", { key: "pl", style: { fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" } }, L("Paper", "Секція", "Секция", "Épreuve", "Teil")),
    React.createElement("div", { key: "pv", style: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 } },
      ...papers.map((p) => chip(paper === p.key, p.label, () => setPaper(p.key), p.key))),
  ];
}

// Novelty engine (Phase 3 §3a) — proof point wired into Practice Engine only,
// the highest-traffic generator. Checks each generated question against the
// shared ai_question_bank; if any come back as exact/near-exact duplicates of
// something already banked, generates ONE replacement batch and swaps in
// whichever of those aren't ALSO duplicates. Never blocks or fails the round:
// a table that isn't applied yet (or any Supabase hiccup) degrades to
// checkAndRecordQuestion's built-in `{duplicate:false}` no-op, and a
// duplicate that survives the one retry is served anyway — a repeated
// question beats a broken practice round.
async function dedupeAgainstQuestionBank(questions, examTaxonomy, regenerate) {
  const sb = window._supabase;
  const userId = window.getSession && window.getSession()?.id;
  if (!sb || !userId || !examTaxonomy) return questions;

  const checks = await Promise.all(
    questions.map((q) => checkAndRecordQuestion(sb, userId, examTaxonomy, q.topic || null, q.question)),
  );
  const dupIdxs = checks.map((r, i) => (r.duplicate ? i : -1)).filter((i) => i >= 0);
  if (dupIdxs.length === 0) return questions;

  let replacement = null;
  try {
    replacement = await regenerate();
  } catch {
    return questions; // one retry only — serve the original batch as-is on any failure
  }
  if (!Array.isArray(replacement) || replacement.length === 0) return questions;

  const replacementChecks = await Promise.all(
    replacement.map((q) => checkAndRecordQuestion(sb, userId, examTaxonomy, q.topic || null, q.question)),
  );
  const freshReplacements = replacement.filter((_, i) => !replacementChecks[i].duplicate);

  const next = questions.slice();
  let r = 0;
  for (const idx of dupIdxs) {
    if (r >= freshReplacements.length) break;
    next[idx] = freshReplacements[r++];
  }
  return next;
}
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

function CoachIcon({ size = 32, className }) {
  return React.createElement("div", {
    className,
    style: { width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,var(--indigo-500),var(--indigo-600))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }
  }, React.createElement("svg", { width: size * 0.54, height: size * 0.54, viewBox: "0 0 20 20", fill: "none" },
    React.createElement("path", { d: "M10 2C7.24 2 5 4.24 5 7c0 1.9 1.05 3.55 2.6 4.4L7.3 12h5.4l-.3-.6C14.05 10.55 15 8.9 15 7c0-2.76-2.24-5-5-5z", fill: "var(--white)", opacity: "0.95" }),
    React.createElement("rect", { x: "7.5", y: "13", width: "5", height: "1.5", rx: "0.75", fill: "var(--white)", opacity: "0.75" }),
    React.createElement("rect", { x: "8.5", y: "15", width: "3", height: "1.2", rx: "0.6", fill: "var(--white)", opacity: "0.55" })));
}

// Markdown-lite + KaTeX. Math ($inline$ / $$block$$) is rendered by KaTeX to
// safe HTML BEFORE any escaping happens on the prose around it — otherwise
// the "<" in <span class="katex"> would get double-escaped. Prose segments
// are escaped, then bold/italic/code/newline substitutions run on the
// escaped text (order matters: escaping first lets these regexes never see
// user-injected HTML in the first place).
const _md = (text) => renderCoachMarkdown(text);

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
    color: primary ? "var(--white)" : "var(--text-strong)", border: primary ? "none" : "1.5px solid var(--border-default)",
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
      _badge("linear-gradient(135deg,var(--indigo-500),var(--indigo-600))", "var(--white)", L(`CHECKPOINT ${cpIdx + 1}/${questions.length}`, `КОНТРОЛЬНА ${cpIdx + 1}/${questions.length}`, `КОНТРОЛЬНАЯ ${cpIdx + 1}/${questions.length}`, `CONTRÔLE ${cpIdx + 1}/${questions.length}`, `KONTROLLE ${cpIdx + 1}/${questions.length}`))),
    React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 } },
      React.createElement("p", { style: { fontWeight: 600, fontSize: 16, margin: "0 0 16px", color: "var(--text-strong)", lineHeight: 1.5 }, dangerouslySetInnerHTML: { __html: _md(q.question) } }),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
        ...(q.options || []).map((opt, i) => {
          const isCor = i === q.correct, isSel = i === cpSelected;
          let bg = "var(--surface-card)", bc = "var(--border-default)", col = "var(--text-body)", lbg = "var(--slate-100)", lcol = "var(--slate-400)";
          if (cpRevealed) {
            if (isCor) { bg = "var(--emerald-50)"; bc = "var(--emerald-500)"; col = "var(--emerald-700)"; lbg = "var(--emerald-500)"; lcol = "var(--white)"; }
            else if (isSel) { bg = "var(--red-50)"; bc = "var(--red-500)"; col = "var(--red-700)"; lbg = "var(--red-500)"; lcol = "var(--white)"; }
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
              // The end-of-lesson checkpoint is the highest-signal moment in a
              // lesson, and until now a wrong answer here moved mastery but
              // was never journalled — so the one question the student most
              // needed to revisit was the one the review queue never saw.
              if (!correct && resolved && window.logMistake) {
                window.logMistake({
                  topic: resolved.topicName, question: q.question,
                  options: q.options, correctIndex: q.correct, selectedIndex: i, explanation: q.explanation,
                  examId: resolved.examId, topicIdx: resolved.topicIdx,
                });
              }
            },
            style: { display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: bg, border: `1.5px solid ${bc}`, borderRadius: 14, color: col, fontSize: 14, textAlign: "left", cursor: cpRevealed ? "default" : "pointer", width: "100%", fontFamily: "var(--font-sans)", transition: "all 0.15s" }
          },
            React.createElement("span", { style: { width: 28, height: 28, borderRadius: 8, background: lbg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: lcol, flexShrink: 0 } }, ["A", "B", "C", "D"][i]),
            React.createElement("span", { style: { lineHeight: 1.45, fontWeight: 500 }, dangerouslySetInnerHTML: { __html: _md(opt) } }));
        })),
      cpRevealed && q.explanation && React.createElement("div", {
        style: { marginTop: 14, padding: "12px 16px", background: cpSelected === q.correct ? "var(--emerald-50)" : "var(--amber-50)", border: `1px solid ${cpSelected === q.correct ? "var(--emerald-100)" : "var(--amber-200)"}`, borderRadius: 12, fontSize: 14, color: cpSelected === q.correct ? "var(--emerald-700)" : "var(--amber-700)", lineHeight: 1.6 },
        dangerouslySetInnerHTML: { __html: (cpSelected === q.correct ? "✅ " : "💡 ") + _md(q.explanation) },
      })),
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
        const parsed = await Promise.race([
          window.brainCompleteJSON({ system, messages: [{ role: "user", content: `Create a comprehensive study guide on: ${topic}` }], topicContext, paperQual: _paperQualOf(window.getExams ? window.getExams().find((e) => e.id === resolved?.examId) : null) }),
          timeout,
        ]);
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
    return React.createElement(WaitPress, {
      title: L("Building your study guide...", "Створюємо ваш навчальний посібник...", "Создаём ваше учебное пособие...", "Création de votre guide d'étude...", "Dein Lernleitfaden wird erstellt..."),
      subtitle: `${L("Topic", "Тема", "Тема", "Sujet", "Thema")}: ${topic}`,
      lang: t?.code,
    });
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
            React.createElement("div", { style: { width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,var(--indigo-500),var(--indigo-600))", color: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 } }, i + 1),
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
            _badge("linear-gradient(135deg,var(--indigo-500),var(--indigo-600))", "var(--white)", L(`📖 SECTION ${secIdx + 1} of ${totalSections}`, `📖 РОЗДІЛ ${secIdx + 1} з ${totalSections}`, `📖 РАЗДЕЛ ${secIdx + 1} из ${totalSections}`, `📖 SECTION ${secIdx + 1} SUR ${totalSections}`, `📖 ABSCHNITT ${secIdx + 1} VON ${totalSections}`))),
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
                  if (isCor) { bg = "var(--emerald-50)"; bc = "var(--emerald-500)"; col = "var(--emerald-700)"; lbg = "var(--emerald-500)"; lcol = "var(--white)"; }
                  else if (isSel) { bg = "var(--red-50)"; bc = "var(--red-500)"; col = "var(--red-700)"; lbg = "var(--red-500)"; lcol = "var(--white)"; }
                  else { col = "var(--slate-300)"; bc = "var(--slate-100)"; }
                }
                return React.createElement("button", {
                  key: i, disabled: revealed, onClick: () => answerQuiz(i, q.correct),
                  style: { display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: bg, border: `1.5px solid ${bc}`, borderRadius: 14, color: col, fontSize: 14, textAlign: "left", cursor: revealed ? "default" : "pointer", width: "100%", fontFamily: "var(--font-sans)", transition: "all 0.15s" }
                },
                  React.createElement("span", { style: { width: 28, height: 28, borderRadius: 8, background: lbg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: lcol, flexShrink: 0 } }, ["A", "B", "C", "D"][i]),
                  React.createElement("span", { style: { lineHeight: 1.45, fontWeight: 500 }, dangerouslySetInnerHTML: { __html: _md(opt) } }));
              })),
            revealed && q.explanation && React.createElement("div", {
              style: { marginTop: 14, padding: "12px 16px", background: selected === q.correct ? "var(--emerald-50)" : "var(--amber-50)", border: `1px solid ${selected === q.correct ? "var(--emerald-100)" : "var(--amber-200)"}`, borderRadius: 12, fontSize: 14, color: selected === q.correct ? "var(--emerald-700)" : "var(--amber-700)", lineHeight: 1.6 },
              dangerouslySetInnerHTML: { __html: (selected === q.correct ? "✅ " : "💡 ") + _md(q.explanation) },
            })),
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
  const listenQual = React.useMemo(() => {
    if (!resolved || !window.getExams) return null;
    const exam = window.getExams().find((e) => e.id === resolved.examId);
    return exam ? _qualificationOf(exam) : null;
  }, [resolved]);
  const listenPaperQual = React.useMemo(() => {
    if (!resolved || !window.getExams) return null;
    return _paperQualOf(window.getExams().find((e) => e.id === resolved.examId));
  }, [resolved]);
  const listenMode = isIeltsListeningTopic(topic, listenQual);
  const readMode = isIeltsReadingTopic(topic, listenQual);
  const writeMode = isIeltsWritingTopic(topic, listenQual);
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
    if (readMode || writeMode) { setLoading(false); return; }
    (async () => {
      try {
        const topicContext = resolved ? { examId: resolved.examId, topicName: resolved.topicName } : undefined;
        const system = listenMode
          ? `You are building an IELTS LISTENING Quick Check. The student HEARS a short recording — they must not be able to answer by reading the question alone.

OUTPUT ONLY valid JSON — no markdown, no fences. Start with { end with }.

EVERY item is type "listen":
{"type":"listen","script":"60-120 words of spoken English (conversation or short monologue). Do not put the answer in the first sentence.","accent":"en-GB","question":"What the student is asked AFTER hearing the clip","options":["A","B","C","D"],"correct":0,"explanation":"1 sentence.","topic":"sub-skill"}

You may replace options+correct with fill-in: "answer":"library","accept":["library","the library"] (no options).

FORMAT: {"questions":[...5 items...],"sessionTitle":"Short title"}

RULES:
- Exactly 5 listen items. No silent reading MCQ. No theory-about-listening questions.
- script is the ONLY place the facts live. question + options must be unanswerable without the script.
- Mix: form/note completion (fill), multiple choice, matching speakers, specific detail.
- Scripts in English. Vary setting (booking, campus, lecture, everyday).
- accent is one of en-GB, en-US, en-AU.
- Difficulty: ${DIFFICULTY_MIXES[difficulty - 1]}
- Explanations 1 sentence.`
          : `You are building a QUICK CHECK — 5 rapid retrieval questions for a student who has studied this topic before. This is NOT a flashcard deck. Each question has ONE correct answer and immediate feedback.

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
        // The novelty pass needs to regenerate JUST the questions batch on a
        // dup, without a new sessionTitle each retry — so parseFullBatch keeps
        // the whole {questions, sessionTitle} envelope for the first call, and
        // `regenerate` returns only the inner questions array on retry.
        const complete1 = () => Promise.race([
          window.brainCompleteJSON({ system, messages: [{ role: "user", content: `Generate a Quick Check on: ${topic}` }], topicContext, paperQual: listenPaperQual || listenQual }),
          timeout,
        ]);
        const parsed = await complete1();
        if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) throw new Error(L("Invalid questions", "Недійсні запитання", "Недействительные вопросы", "Questions invalides", "Ungültige Fragen"));
        // taxonomy = resolved.examId is what ai_question_bank partitions by;
        // falls back to a stable per-topic key when the topic isn't brain-
        // resolvable so unresolved topics still dedupe against themselves.
        const examTaxonomy = (resolved && resolved.examId) || `quickcheck:${topic}`;
        const dedupedQuestions = await dedupeAgainstQuestionBank(
          parsed.questions, examTaxonomy,
          () => complete1().then((p2) => (Array.isArray(p2 && p2.questions) ? p2.questions : [])),
        );
        setQuestions({ ...parsed, questions: dedupedQuestions });
        setLoading(false);
      } catch (e) {
        console.error("Quick Check generation failed:", e);
        setError(e.message || L("Failed to generate questions", "Не вдалося згенерувати питання", "Не удалось сгенерировать вопросы", "Échec de la génération des questions", "Fragen konnten nicht generiert werden"));
        setLoading(false);
      }
    })();
  }, [topic, readMode, writeMode, listenMode]);

  const answerMcq = (optIdx) => {
    if (selected !== null) return;
    const q = questions.questions[idx];
    const isCorrect = optIdx === q.correct;
    setSelected(optIdx);
    setRevealed(true);
    setResults((r) => [...r, { correct: isCorrect, topic: q.topic || topic }]);
    isCorrect ? _sfx.correct() : _sfx.wrong();
    if (resolved && window.recordReview) window.recordReview({ examId: resolved.examId, topicIdx: resolved.topicIdx, topicName: resolved.topicName, correct: isCorrect });
    // Quick Check used to record the review but never the mistake, so a wrong
    // answer here lowered mastery yet left nothing in the journal to retry.
    if (!isCorrect && resolved && window.logMistake) {
      window.logMistake({
        topic: resolved.topicName || q.topic || topic, question: q.question,
        options: q.options, correctIndex: q.correct, selectedIndex: optIdx, explanation: q.explanation,
        examId: resolved.examId, topicIdx: resolved.topicIdx,
      });
    }
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

  if (readMode) {
    return React.createElement(IeltsReading, { mode: "quick", module: "academic", onExit, t });
  }
  if (writeMode) {
    return React.createElement(IeltsWriting, { mode: "practice", module: "academic", onExit, t });
  }

  if (loading) {
    return React.createElement(WaitPress, {
      title: L("Preparing Quick Check...", "Готуємо швидку перевірку...", "Готовим быструю проверку...", "Préparation de la vérification rapide...", "Schnelltest wird vorbereitet..."),
      subtitle: `${L("Topic", "Тема", "Тема", "Sujet", "Thema")}: ${topic}`,
      lang: t?.code,
    });
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
        React.createElement("p", { style: { margin: 0, fontSize: 15, fontWeight: 700, color: "var(--white)" } }, L(`🎉 Difficulty up — ${DIFFICULTY_LABELS[Math.min(4, difficulty)]}!`, `🎉 Складність підвищено — ${DIFFICULTY_LABELS[Math.min(4, difficulty)]}!`, `🎉 Сложность повышена — ${DIFFICULTY_LABELS[Math.min(4, difficulty)]}!`, `🎉 Difficulté augmentée — ${DIFFICULTY_LABELS[Math.min(4, difficulty)]} !`, `🎉 Schwierigkeit erhöht — ${DIFFICULTY_LABELS[Math.min(4, difficulty)]}!`)),
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
    const isListen = q.type === "listen" || !!(listenMode && q.script);
    const clip = isListen && q.script ? React.createElement(ListenClip, {
      key: `clip-${idx}`,
      script: q.script,
      locale: q.accent || "en-GB",
      playLabel: L("Play audio", "Увімкнути аудіо", "Включить аудио", "Écouter", "Audio abspielen"),
      stopLabel: L("Stop", "Стоп", "Стоп", "Stop", "Stopp"),
      replayLabel: L("Play again", "Ще раз", "Ещё раз", "Réécouter", "Nochmal"),
      fallbackHint: L("Your browser can't play speech. Read the recording below.", "Браузер не вміє озвучувати. Прочитай запис нижче.", "Браузер не умеет озвучивать. Прочитай запись ниже.", "Le navigateur ne peut pas lire l'audio. Lis l'enregistrement.", "Browser kann nicht vorlesen. Lies die Aufnahme."),
    }) : null;
    const transcript = isListen && revealed && q.script
      ? React.createElement("p", { style: { marginTop: 12, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55, textAlign: "left" }, dangerouslySetInnerHTML: { __html: L("Recording: ", "Запис: ", "Запись: ", "Enregistrement : ", "Aufnahme: ") + _md(q.script) } })
      : null;

    if (q.type === "fill" || (isListen && !(q.options && q.options.length))) {
      return React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
        React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 } },
          clip,
          React.createElement("div", { style: { marginBottom: 14 } }, _badge(isListen ? "var(--indigo-50)" : "var(--amber-50)", isListen ? "var(--indigo-700)" : "var(--amber-700)", isListen ? L("🎧 LISTEN", "🎧 СЛУХАЙ", "🎧 СЛУШАЙ", "🎧 ÉCOUTE", "🎧 HÖR ZU") : L("✍️ FILL IN", "✍️ ЗАПОВНІТЬ", "✍️ ЗАПОЛНИТЕ", "✍️ COMPLÉTEZ", "✍️ AUSFÜLLEN"))),
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
              style: { padding: "12px 20px", background: fillInput.trim() ? "var(--indigo-600)" : "var(--indigo-200)", color: "var(--white)", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: fillInput.trim() ? "pointer" : "default", fontFamily: "var(--font-sans)" }
            }, L("Check", "Перевірити", "Проверить", "Vérifier", "Prüfen"))),
          revealed && React.createElement("div", {
            style: { padding: "12px 16px", background: selected === "correct" ? "linear-gradient(135deg, var(--emerald-50), var(--emerald-50))" : "linear-gradient(135deg, var(--amber-50), var(--amber-100))", border: `1px solid ${selected === "correct" ? "var(--emerald-100)" : "var(--amber-200)"}`, borderRadius: 12, fontSize: 14, color: selected === "correct" ? "var(--emerald-700)" : "var(--amber-700)", lineHeight: 1.6 },
            dangerouslySetInnerHTML: { __html: _md(selected === "correct" ? L(`✅ Correct! "${q.answer}"`, `✅ Правильно! «${q.answer}»`, `✅ Правильно! «${q.answer}»`, `✅ Correct ! « ${q.answer} »`, `✅ Richtig! „${q.answer}"`) : L(`💡 The answer is "${q.answer}". ${q.explanation || ""}`, `💡 Правильна відповідь: «${q.answer}». ${q.explanation || ""}`, `💡 Правильный ответ: «${q.answer}». ${q.explanation || ""}`, `💡 La réponse est « ${q.answer} ». ${q.explanation || ""}`, `💡 Die Antwort ist „${q.answer}". ${q.explanation || ""}`)) },
          }),
          transcript));
    }

    // MCQ (and listen-with-options)
    return React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
      React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 } },
        clip,
        React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 14 } },
          _badge("linear-gradient(135deg,var(--indigo-500),var(--indigo-600))", "var(--white)", isListen ? L("🎧 LISTEN", "🎧 СЛУХАЙ", "🎧 СЛУШАЙ", "🎧 ÉCOUTE", "🎧 HÖR ZU") : L("⚡ QUESTION", "⚡ ПИТАННЯ", "⚡ ВОПРОС", "⚡ QUESTION", "⚡ FRAGE")),
          q.topic && _badge("var(--surface-muted)", "var(--text-muted)", q.topic)),
        React.createElement("p", { style: { fontWeight: 600, fontSize: 16, margin: "0 0 16px", color: "var(--text-strong)", lineHeight: 1.5 }, dangerouslySetInnerHTML: { __html: _md(q.question) } }),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
          ...(q.options || []).map((opt, i) => {
            const isCor = i === q.correct, isSel = i === selected;
            let bg = "var(--surface-card)", bc = "var(--border-default)", col = "var(--text-body)", lbg = "var(--slate-100)", lcol = "var(--slate-400)";
            if (revealed) {
              if (isCor) { bg = "var(--emerald-50)"; bc = "var(--emerald-500)"; col = "var(--emerald-700)"; lbg = "var(--emerald-500)"; lcol = "var(--white)"; }
              else if (isSel) { bg = "var(--red-50)"; bc = "var(--red-500)"; col = "var(--red-700)"; lbg = "var(--red-500)"; lcol = "var(--white)"; }
              else { col = "var(--slate-300)"; bc = "var(--slate-100)"; }
            }
            return React.createElement("button", {
              key: i, disabled: revealed, onClick: () => answerMcq(i),
              style: { display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: bg, border: `1.5px solid ${bc}`, borderRadius: 14, color: col, fontSize: 14, textAlign: "left", cursor: revealed ? "default" : "pointer", width: "100%", fontFamily: "var(--font-sans)", transition: "all 0.15s" }
            },
              React.createElement("span", { style: { width: 28, height: 28, borderRadius: 8, background: lbg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: lcol, flexShrink: 0 } }, ["A", "B", "C", "D"][i]),
              React.createElement("span", { style: { lineHeight: 1.45, fontWeight: 500 }, dangerouslySetInnerHTML: { __html: _md(opt) } }));
          })),
        revealed && React.createElement("div", {
          style: { marginTop: 14, padding: "12px 16px", background: selected === q.correct ? "linear-gradient(135deg, var(--emerald-50), var(--emerald-50))" : "linear-gradient(135deg, var(--amber-50), var(--amber-100))", border: `1px solid ${selected === q.correct ? "var(--emerald-100)" : "var(--amber-200)"}`, borderRadius: 12, fontSize: 14, color: selected === q.correct ? "var(--emerald-700)" : "var(--amber-700)", lineHeight: 1.6 },
          dangerouslySetInnerHTML: { __html: (selected === q.correct ? "✅ " : "💡 ") + _md(q.explanation) },
        }),
        transcript));
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
  const [dropped, setDropped] = React.useState(0);
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
      const system = `You are a study coach. Pick the 5 BEST topics for a speed round drill from this list. Prioritise topics the student is weakest at. Return ONLY a JSON array of topic names — no explanation, no markdown.\n\nTopics (name → retention%):\n${weak.map((t) => `- ${t.name} (${Math.round((t.retention || 0) * 100)}%)`).join("\n")}`;
      const parsed = await window.brainCompleteJSON({ system, messages: [{ role: "user", content: "Pick 5 topics for my speed round" }] }, null);
      const names = Array.isArray(parsed) ? parsed : (parsed && parsed.topics) || [];
      if (!names.length) throw new Error("no topics");
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
        const topicList = chosenTopics.length > 0 ? chosenTopics.join(", ") : (allTopics.length > 0 ? allTopics.sort(() => Math.random() - 0.5).slice(0, 6).map((t) => t.name).join(", ") : "general knowledge");
        const system = `Generate exactly ${totalQ} rapid-fire multiple-choice questions for a SPEED ROUND exam drill. Focus on these topics: ${topicList}. Each question must be answerable in under 30 seconds — no complex calculations.

OUTPUT ONLY valid JSON — no markdown, no fences. Start with { end with }.

FORMAT: {"questions":[{"q":"Question text","options":["A","B","C","D"],"correct":0,"topic":"topic name","explanation":"One sentence why"}]}

RULES:
- 4 options each, exactly one correct, "correct" is 0-based index
- Questions should be clear and direct — no ambiguity
- Mix easy (40%), medium (40%), hard (20%)
- Spread questions across the given topics evenly
${mcqRulesBlock(planCorrectIndices(totalQ, 4))}`;

        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error(L("Took too long.", "Це тривало занадто довго.", "Это длилось слишком долго.", "Cela a pris trop de temps.", "Das hat zu lange gedauert."))), 50000));
        const namesForRound = chosenTopics.length > 0 ? chosenTopics : allTopics.map((tp) => tp.name);
        const examsById = new Map((window.getExams ? window.getExams() : []).map((e) => [e.id, e]));
        const roundQuals = namesForRound.map((name) => {
          const row = allTopics.find((tp) => tp.name === name);
          return _paperQualOf(examsById.get(row?.examId));
        }).filter(Boolean);
        const roundLangs = [...new Set(roundQuals.map((q) => paperLanguageFor(q)).filter(Boolean))];
        const speedPaperQual = roundLangs.length === 1 ? roundQuals[0] : _paperQualOf(examsById.get(examViews[0]?.id));
        const generate = () => Promise.race([
          window.brainCompleteJSON({ system, messages: [{ role: "user", content: `Generate ${totalQ} speed round questions` }], paperQual: speedPaperQual }),
          timeout,
        ]).then((p) => {
          if (!p || !Array.isArray(p.questions) || p.questions.length === 0) throw new Error(L("Invalid questions", "Недійсні запитання", "Недействительные вопросы", "Questions invalides", "Ungültige Fragen"));
          const { kept, rejected } = filterMcqBatch(p.questions, { language: paperLanguageFor(speedPaperQual) });
          reportRejections("speed-round", rejected);
          setDropped((n) => n + rejected.length);
          if (!kept.length) throw new Error(L("Invalid questions", "Недійсні запитання", "Недействительные вопросы", "Questions invalides", "Ungültige Fragen"));
          return kept;
        });
        const rawQuestions = await generate();
        // Speed Round can span topics from MULTIPLE exams (aiTopics picks
        // weakest across the whole brain). taxonomy uses the first exam's
        // qualification as a stable partition, or a generic fallback so
        // dedupe still works for a pool without a resolvable exam.
        const firstExam = examViews[0];
        const examTaxonomy = _qualificationOf(window.getExams ? window.getExams().find((e) => e.id === firstExam?.id) : null) || "speedround";
        const dedupedQuestions = await dedupeAgainstQuestionBank(rawQuestions, examTaxonomy, generate);
        setQuestions(dedupedQuestions.slice(0, totalQ));
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
        style: { width: "100%", padding: "16px", borderRadius: 14, border: "none", background: canStart ? "linear-gradient(135deg,var(--indigo-500),var(--indigo-600))" : "var(--indigo-200)", color: "var(--white)", fontSize: 16, fontWeight: 700, cursor: canStart ? "pointer" : "default", fontFamily: "var(--font-sans)", marginTop: "auto" }
      }, L("Start Speed Round →", "Почати швидкий раунд →", "Начать быстрый раунд →", "Démarrer le tour rapide →", "Speed-Runde starten →")));
  }

  // ── Loading ──
  if (phase === "loading" && !error) {
    return React.createElement(WaitPress, {
      title: L("Preparing Speed Round...", "Готуємо швидкий раунд...", "Готовим быстрый раунд...", "Préparation du tour rapide...", "Speed-Runde wird vorbereitet..."),
      subtitle: L(`${totalQ} questions × ${perQ} seconds each`, `${totalQ} питань × по ${perQ} секунд`, `${totalQ} вопросов × по ${perQ} секунд`, `${totalQ} questions × ${perQ} secondes chacune`, `${totalQ} Fragen × je ${perQ} Sekunden`),
      lang: t?.code,
    });
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

      dropped > 0 && React.createElement("p", { style: { fontSize: 12, color: "var(--text-faint)", margin: "0 0 12px" } }, L(`${dropped} question(s) failed the quality check and were skipped.`, `${dropped} питання не пройшли перевірку якості — пропущено.`, `${dropped} вопрос(ов) не прошли проверку качества — пропущены.`, `${dropped} question(s) recalée(s) au contrôle qualité.`, `${dropped} Frage(n) haben die Qualitätsprüfung nicht bestanden.`)),

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
              React.createElement("p", { style: { margin: "0 0 4px", fontWeight: 600, color: "var(--red-700)" }, dangerouslySetInnerHTML: { __html: _md(q.q) } }),
              React.createElement("p", { style: { margin: 0, color: "var(--red-700)", fontSize: 12 }, dangerouslySetInnerHTML: { __html: _md(`✓ ${q.options[q.correct]}${q.explanation ? ` — ${q.explanation}` : ""}`) } }));
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
      React.createElement("p", { style: { fontWeight: 600, fontSize: 17, margin: "0 0 20px", color: "var(--text-strong)", lineHeight: 1.5 }, dangerouslySetInnerHTML: { __html: _md(q.q) } }),
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
            React.createElement("span", { style: { width: 28, height: 28, borderRadius: 8, background: selected !== null && i === q.correct ? "var(--emerald-500)" : selected === i ? "var(--red-500)" : "var(--slate-100)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: selected !== null && (i === q.correct || i === selected) ? "var(--white)" : "var(--slate-400)", flexShrink: 0 } }, ["A", "B", "C", "D"][i]),
            React.createElement("span", { dangerouslySetInnerHTML: { __html: _md(opt) } }));
        }))));
}

// ─── PRACTICE ENGINE (Exam simulation) ───────────────────────────────────────

function PracticeEngine({ examViews, onExit, seed, t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
  const [phase, setPhase] = React.useState("setup"); // setup | session | summary
  // examId scopes the drill to one subject; null means "across everything".
  // `length` is chosen explicitly rather than derived from difficulty — a
  // student who wants 5 quick questions should not have to pick "Easy" to get
  // a shorter set. `timed` adds an optional countdown (audit #5).
  const [config, setConfig] = React.useState({
    difficulty: "adaptive", length: 10, timed: false,
    // A recap's "Drill weak topics" CTA arrives as `seed` — it preselects the
    // subject and topics but deliberately still lands on the setup screen, so
    // the student sees (and can change) what is about to be generated instead
    // of an AI call firing from one tap.
    // With a single subject the picker below is hidden, so leaving examId null
    // meant that student's drills were never attributed to their exam — no
    // score on the real exam scale and no attempt history in the recap. One
    // exam is unambiguous: attribute to it.
    examId: (seed && seed.examId) || (examViews.length === 1 ? examViews[0].id : null),
    topics: (seed && seed.topics) || [],
  });
  const [remainingSec, setRemainingSec] = React.useState(null);
  const [startedAt, setStartedAt] = React.useState(null);
  // XP used to be awarded inline in the summary's render body, so every
  // re-render of that screen granted it again. The recap below re-renders
  // several times (attempt recorded, AI comment resolved), which would have
  // turned that into runaway XP.
  const xpAwardedRef = React.useRef(false);
  const [questions, setQuestions] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [qIdx, setQIdx] = React.useState(0);
  const [selected, setSelected] = React.useState(null);
  // Confidence is inferred from time-to-answer, not asked. The old two-tap
  // "select A/B/C/D, then pick Guessing/Okay/Easy, then Submit" flow was the
  // #1 friction in Practice; time-to-first-select is a real signal, doesn't
  // interrupt, and keeps the brain-store input the review path already reads.
  // Kept as state so re-renders don't reset the reference clock.
  const [questionShownAt, setQuestionShownAt] = React.useState(() => Date.now());
  const [revealed, setRevealed] = React.useState(false);
  const [results, setResults] = React.useState([]);
  const [patternAlert, setPatternAlert] = React.useState(null);
  const [ieltsModule, setIeltsModule] = React.useState("academic");
  const [ieltsPaper, setIeltsPaper] = React.useState("reading");
  const [ieltsRun, setIeltsRun] = React.useState(null);

  const practiceQual = React.useMemo(() => {
    const exam = config.examId && window.getExams
      ? window.getExams().find((e) => e.id === config.examId)
      : (examViews.length === 1 && window.getExams
        ? window.getExams().find((e) => e.id === examViews[0].id)
        : null);
    return _paperQualOf(exam);
  }, [config.examId, examViews]);
  const ieltsOn = isIeltsQual(practiceQual);

  const everyTopic = examViews.flatMap((e) => (e.topics || []).map((t) => ({ name: t.topicName || t.name, exam: e.name, examId: e.id, topicIdx: t.topicIdx, retention: t.retention })));
  // Scoped to the chosen exam. Previously every exam's topics were flattened
  // into one list and then truncated to the first 12, so a student with three
  // subjects could not reach most of their own topics at all.
  const allTopics = config.examId ? everyTopic.filter((tp) => tp.examId === config.examId) : everyTopic;

  // Countdown for a timed drill. Hooks cannot come after the conditional
  // returns below, so it lives here with the pattern detector. Ticking stops
  // as soon as the session leaves the question phase, and hitting zero ends the
  // drill at the summary rather than discarding the answers already given.
  React.useEffect(() => {
    if (remainingSec === null || phase !== "session") return undefined;
    if (remainingSec <= 0) { setPhase("summary"); return undefined; }
    const id = setTimeout(() => setRemainingSec((sec) => (sec === null ? null : sec - 1)), 1000);
    return () => clearTimeout(id);
  }, [remainingSec, phase]);

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

  if (ieltsRun?.paper === "reading") {
    return React.createElement(IeltsReading, {
      mode: "practice", module: ieltsRun.module, t,
      onExit: () => { setIeltsRun(null); setPhase("setup"); },
    });
  }
  if (ieltsRun?.paper === "writing") {
    return React.createElement(IeltsWriting, {
      mode: "practice", module: ieltsRun.module, t,
      onExit: () => { setIeltsRun(null); setPhase("setup"); },
    });
  }

  // ── Setup screen ──
  if (phase === "setup") {
    const DIFFS = [
      { key: "easy", label: L("Easy", "Легкий", "Лёгкий", "Facile", "Leicht"), emoji: "😊", desc: L("Basics & definitions", "Основи та визначення", "Основы и определения", "Bases et définitions", "Grundlagen & Definitionen") },
      { key: "medium", label: L("Medium", "Середній", "Средний", "Moyen", "Mittel"), emoji: "🎯", desc: L("Standard exam level", "Стандартний рівень іспиту", "Стандартный уровень экзамена", "Niveau d'examen standard", "Standard-Prüfungsniveau") },
      { key: "hard", label: L("Hard", "Складний", "Сложный", "Difficile", "Schwer"), emoji: "🔥", desc: L("Tricky edge cases", "Складні граничні випадки", "Сложные граничные случаи", "Cas limites délicats", "Knifflige Grenzfälle") },
      { key: "adaptive", label: L("Adaptive", "Адаптивний", "Адаптивный", "Adaptatif", "Adaptiv"), emoji: "🤖", desc: L("AI adjusts in real-time", "AI підлаштовується в реальному часі", "AI подстраивается в реальном времени", "L'IA s'ajuste en temps réel", "KI passt sich in Echtzeit an") },
    ];
    const selectedTopics = config.topics.length > 0 ? config.topics : allTopics.slice(0, 3).map((t) => t.name);
    const showGeneric = !ieltsOn || ieltsPaper === "listening";

    const startPractice = async () => {
      if (ieltsOn && (ieltsPaper === "reading" || ieltsPaper === "writing")) {
        setIeltsRun({ paper: ieltsPaper, module: ieltsModule });
        return;
      }
      // ~1 minute per question is the pace a timed drill should feel like.
      setRemainingSec(config.timed ? config.length * 60 : null);
      setStartedAt(Date.now());
      setPhase("session"); setLoading(true); setError(null);
      try {
        const topicList = selectedTopics.join(", ");
        const n = config.length;
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
- No duplicate concepts
${mcqRulesBlock(planCorrectIndices(n, 4))}`;

        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error(L("Took too long.", "Це тривало занадто довго.", "Это длилось слишком долго.", "Cela a pris trop de temps.", "Das hat zu lange gedauert."))), 45000));
        const generate = () => Promise.race([
          window.brainCompleteJSON({ system, messages: [{ role: "user", content: `Generate a ${config.difficulty} practice exam on: ${topicList}` }], paperQual: practiceQual }),
          timeout,
        ]).then((p) => {
          if (!p || !Array.isArray(p.questions) || p.questions.length === 0) throw new Error(L("Invalid questions", "Недійсні запитання", "Недействительные вопросы", "Questions invalides", "Ungültige Fragen"));
          const { kept, rejected } = filterMcqBatch(p.questions, { language: paperLanguageFor(practiceQual) });
          reportRejections("practice-exam", rejected);
          if (!kept.length) throw new Error(L("Invalid questions", "Недійсні запитання", "Недействительные вопросы", "Questions invalides", "Ungültige Fragen"));
          return kept;
        });

        const rawQuestions = await generate();
        const exam = config.examId && window.getExams ? window.getExams().find((e) => e.id === config.examId) : null;
        const examTaxonomy = (exam && exam.qualificationId) || config.examId;
        const questions = await dedupeAgainstQuestionBank(rawQuestions, examTaxonomy, generate);
        setQuestions(questions);
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
      ieltsOn && _ieltsSitPickers({
        t, module: ieltsModule, setModule: setIeltsModule, paper: ieltsPaper, setPaper: setIeltsPaper,
        papers: [
          { key: "reading", label: L("Reading · 1 passage", "Reading · 1 текст", "Reading · 1 текст", "Reading · 1 texte", "Reading · 1 Text") },
          { key: "writing", label: L("Writing · 1 task", "Writing · 1 завдання", "Writing · 1 задание", "Writing · 1 tâche", "Writing · 1 Aufgabe") },
          { key: "listening", label: L("Listening", "Listening", "Listening", "Listening", "Listening") },
        ],
      }),
      ieltsOn && (ieltsPaper === "reading" || ieltsPaper === "writing") && React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", margin: "0 0 20px" } },
        ieltsPaper === "reading"
          ? L("One passage + ~10 questions. True/False/Not Given, MCQ, fill. Like the real paper.", "Один текст + ~10 питань. True/False/Not Given, MCQ, пропуски. Як на справжньому папері.", "Один текст + ~10 вопросов. True/False/Not Given, MCQ, пропуски. Как на настоящем бланке.", "Un texte + ~10 questions. True/False/Not Given, QCM, trous. Comme l'épreuve réelle.", "Ein Text + ~10 Fragen. True/False/Not Given, MCQ, Lücken. Wie die echte Prüfung.")
          : L("You get a prompt (chart or essay). You write. Examiner gives a band + why + what to fix.", "Тема (графік або есе). Ти пишеш. Екзаменатор ставить банд + чому + де підтягнути.", "Тема (график или эссе). Ты пишешь. Экзаменатор ставит балл + почему + где подтянуть.", "Un sujet (graphique ou essai). Tu écris. L'examinateur donne une bande + pourquoi + quoi corriger.", "Ein Prompt (Diagramm oder Essay). Du schreibst. Band + Begründung + Lücken.")),

      showGeneric && React.createElement("p", { style: { fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" } }, L("Difficulty", "Складність", "Сложность", "Difficulté", "Schwierigkeit")),
      showGeneric && React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 } },
        ...DIFFS.map((d) => React.createElement("button", {
          key: d.key, onClick: () => setConfig((c) => ({ ...c, difficulty: d.key })),
          style: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: config.difficulty === d.key ? "var(--indigo-50)" : "var(--surface-card)", border: `1.5px solid ${config.difficulty === d.key ? "var(--indigo-500)" : "var(--border-default)"}`, borderRadius: 12, cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left" }
        },
          React.createElement("span", { style: { fontSize: 20 } }, d.emoji),
          React.createElement("div", null,
            React.createElement("p", { style: { margin: 0, fontSize: 13, fontWeight: 600, color: config.difficulty === d.key ? "var(--indigo-700)" : "var(--text-strong)" } }, d.label),
            React.createElement("p", { style: { margin: 0, fontSize: 11, color: "var(--text-muted)" } }, d.desc))))),

      // Subject — only worth showing when there is more than one to choose from.
      examViews.length > 1 && React.createElement("p", { style: { fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" } }, L("Subject", "Предмет", "Предмет", "Matière", "Fach")),
      examViews.length > 1 && React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 } },
        ...[{ id: null, name: L("All subjects", "Усі предмети", "Все предметы", "Toutes les matières", "Alle Fächer") }].concat(examViews.map((e) => ({ id: e.id, name: e.name }))).map((e) => {
          const on = config.examId === e.id;
          return React.createElement("button", {
            key: e.id || "all",
            // Changing subject clears the topic selection — the old picks
            // belong to a different syllabus.
            onClick: () => setConfig((c) => ({ ...c, examId: e.id, topics: [] })),
            style: { padding: "6px 12px", fontSize: 12, fontWeight: 600, borderRadius: 20, border: `1px solid ${on ? "var(--indigo-500)" : "var(--border-default)"}`, background: on ? "var(--indigo-50)" : "var(--surface-card)", color: on ? "var(--indigo-700)" : "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font-sans)" }
          }, e.name);
        })),

      showGeneric && React.createElement("p", { style: { fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" } }, L("Questions", "Питань", "Вопросов", "Questions", "Fragen")),
      showGeneric && React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 20 } },
        ...[5, 10, 20, 50].map((n) => {
          const on = config.length === n;
          return React.createElement("button", {
            key: n, onClick: () => setConfig((c) => ({ ...c, length: n })),
            style: { flex: 1, padding: "10px 0", fontSize: 14, fontWeight: 700, borderRadius: 12, border: `1.5px solid ${on ? "var(--indigo-500)" : "var(--border-default)"}`, background: on ? "var(--indigo-50)" : "var(--surface-card)", color: on ? "var(--indigo-700)" : "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font-sans)" }
          }, n);
        })),

      showGeneric && React.createElement("button", {
        onClick: () => setConfig((c) => ({ ...c, timed: !c.timed })),
        "aria-pressed": config.timed,
        style: { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 14px", marginBottom: 20, background: config.timed ? "var(--indigo-50)" : "var(--surface-card)", border: `1.5px solid ${config.timed ? "var(--indigo-500)" : "var(--border-default)"}`, borderRadius: 12, cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left" }
      },
        React.createElement("span", { style: { fontSize: 18 } }, "\u23F1\uFE0F"),
        React.createElement("div", { style: { flex: 1 } },
          React.createElement("p", { style: { margin: 0, fontSize: 13, fontWeight: 600, color: config.timed ? "var(--indigo-700)" : "var(--text-strong)" } }, L("Timer", "Таймер", "Таймер", "Minuteur", "Timer")),
          React.createElement("p", { style: { margin: 0, fontSize: 11, color: "var(--text-muted)" } }, config.timed ? L(`${config.length} min — about a minute a question`, `${config.length} хв — приблизно хвилина на питання`, `${config.length} мин — примерно минута на вопрос`, `${config.length} min — environ une minute par question`, `${config.length} Min — etwa eine Minute pro Frage`) : L("Off — take your time", "Вимкнено — не поспішайте", "Выключен — не спешите", "Désactivé — prenez votre temps", "Aus — lass dir Zeit"))),
        React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: config.timed ? "var(--indigo-600)" : "var(--text-faint)" } }, config.timed ? L("ON", "УВІМК", "ВКЛ", "ON", "AN") : L("OFF", "ВИМК", "ВЫКЛ", "OFF", "AUS"))),

      showGeneric && React.createElement("p", { style: { fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" } }, L("Topics", "Теми", "Темы", "Sujets", "Themen")),
      showGeneric && React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24, maxHeight: 180, overflowY: "auto" } },
        ...allTopics.map((tp) => {
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
    return React.createElement(WaitPress, {
      title: L("Generating your exam...", "Створюємо ваш іспит...", "Создаём ваш экзамен...", "Génération de votre examen...", "Deine Prüfung wird erstellt..."),
      lang: t?.code,
    });
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
    if (window.addXp && total > 0 && !xpAwardedRef.current) {
      xpAwardedRef.current = true;
      window.addXp(xpEarned);
    }
    const byTopic = {};
    results.forEach((r) => {
      const tp = r.topic || L("Unknown", "Невідомо", "Неизвестно", "Inconnu", "Unbekannt");
      if (!byTopic[tp]) byTopic[tp] = { correct: 0, total: 0 };
      byTopic[tp].total++;
      if (r.correct) byTopic[tp].correct++;
    });
    const weakTopics = Object.entries(byTopic).filter(([, v]) => v.correct / v.total < 0.5).map(([k]) => k);
    const drillExam = config.examId && window.getExams ? window.getExams().find((e) => e.id === config.examId) : null;

    return React.createElement(ExamRecap, {
      mode: "practice",
      examId: config.examId,
      examName: drillExam ? drillExam.name : L("Practice drill", "Тренування", "Тренировка", "Entraînement", "Übung"),
      taxonomy: _qualificationOf(drillExam),
      correct, total, weakTopics,
      sessionStartedAt: startedAt,
      headline: L("Practice Complete!", "Тренування завершено!", "Тренировка завершена!", "Entraînement terminé !", "Übung abgeschlossen!"),
      stats: [
        { val: `${total}`, label: L("Questions", "Питання", "Вопросы", "Questions", "Fragen"), color: "var(--indigo-600)" },
        { val: `+${xpEarned}`, label: "XP", color: "var(--indigo-600)" },
      ],
      // Re-seeding the drill it is already inside: reset to setup with the weak
      // topics preselected rather than routing through the parent.
      onDrillWeak: (topics) => {
        setConfig((c) => ({ ...c, topics }));
        setQuestions(null); setResults([]); setQIdx(0); setSelected(null); setQuestionShownAt(Date.now());
        setRevealed(false); setPatternAlert(null); setRemainingSec(null);
        xpAwardedRef.current = false;
        setPhase("setup");
      },
      onExit,
      t,
    });
  }

  // ── Question view ──
  if (!questions) return null;
  const q = questions[qIdx];
  const totalQ = questions.length;
  const pctDone = Math.round(((qIdx + 1) / totalQ) * 100);

  // Single argument, not a read from state: the click handler passes the option
  // index straight in, so we don't have to wait a render for setSelected to
  // land before submitting — kept the "tap answer = submit" flow feeling
  // instant, which was the whole point of dropping the confidence step.
  const submitAnswer = (optIdx) => {
    if (selected !== null) return; // second tap on the same question is a no-op
    setSelected(optIdx);
    // Under 4s = confident, under 12s = normal, longer = probably guessed.
    // Thresholds match what students report anecdotally and what StudyHub's
    // pacing already assumes (60-90s per Q on paper, faster on multiple
    // choice). Feeds recordReview via the same key the old chip used.
    const elapsedSec = (Date.now() - questionShownAt) / 1000;
    const confidence = elapsedSec < 4 ? "easy" : elapsedSec < 12 ? "okay" : "guessing";
    const isCorrect = optIdx === q.correct;
    const resolved = window.resolveTopicForBrain ? window.resolveTopicForBrain(q.topic) : null;
    if (resolved && window.recordReview) {
      window.recordReview({ examId: resolved.examId, topicIdx: resolved.topicIdx, topicName: resolved.topicName, correct: isCorrect });
    }
    if (!isCorrect && resolved && window.logMistake) {
      window.logMistake({
        topic: resolved?.topicName || q.topic, question: q.question,
        options: q.options, correctIndex: q.correct, selectedIndex: optIdx, explanation: q.explanation,
        examId: resolved?.examId, topicIdx: resolved?.topicIdx,
      });
    }
    setResults((r) => [...r, { correct: isCorrect, topic: q.topic, confidence, selected: optIdx }]);
    // No "why did you choose" prompt any more — tapping the wrong answer
    // reveals the explanation immediately. Students were skipping the textarea
    // anyway, and the extra tap made a five-question drill feel like ten.
    setRevealed(true);
  };

  const advance = () => {
    setSelected(null); setRevealed(false); setPatternAlert(null);
    setQuestionShownAt(Date.now()); // reset the timer for the next question
    if (qIdx + 1 >= totalQ) { setPhase("summary"); } else { setQIdx(qIdx + 1); }
  };

  return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)" } },
    // Progress header
    React.createElement("div", { style: { padding: "12px 20px 0" } },
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } },
        React.createElement("span", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)" } }, L(`Question ${qIdx + 1} / ${totalQ}`, `Питання ${qIdx + 1} / ${totalQ}`, `Вопрос ${qIdx + 1} / ${totalQ}`, `Question ${qIdx + 1} / ${totalQ}`, `Frage ${qIdx + 1} / ${totalQ}`)),
        React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", fontSize: 12 } },
          // Turns red under a minute — the only moment the number needs to grab
          // attention.
          remainingSec !== null && React.createElement("span", {
            role: "timer",
            style: { fontFamily: "var(--font-mono)", fontWeight: 700, color: remainingSec <= 60 ? "var(--red-600)" : "var(--text-muted)" }
          }, `${Math.floor(remainingSec / 60)}:${String(remainingSec % 60).padStart(2, "0")}`),
          q.difficulty && _badge(q.difficulty === "hard" ? "var(--red-50)" : q.difficulty === "easy" ? "var(--emerald-50)" : "var(--amber-50)",
            q.difficulty === "hard" ? "var(--red-700)" : q.difficulty === "easy" ? "var(--emerald-700)" : "var(--amber-700)", q.difficulty),
          React.createElement("button", { onClick: () => setPhase("summary"),
            style: { fontSize: 11, color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", textDecoration: "underline" } }, L("End exam", "Завершити іспит", "Завершить экзамен", "Terminer l'examen", "Prüfung beenden")))),
      React.createElement("div", { style: { height: 4, background: "var(--surface-muted)", borderRadius: 2, overflow: "hidden" } },
        React.createElement("div", { style: { height: "100%", width: "100%", transform: `scaleX(${pctDone / 100})`, transformOrigin: "left", background: "linear-gradient(90deg,var(--indigo-500),var(--indigo-600))", borderRadius: 2, transition: "transform 0.4s" } }))),

    // Content
    React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "20px" } },
      // Pattern alert
      patternAlert && !revealed && React.createElement("div", {
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
            if (revealed) {
              if (isCorrect) { bg = "var(--emerald-50)"; bc = "var(--emerald-500)"; col = "var(--emerald-700)"; lbg = "var(--emerald-500)"; lcol = "var(--white)"; }
              else if (isSel) { bg = "var(--red-50)"; bc = "var(--red-500)"; col = "var(--red-700)"; lbg = "var(--red-500)"; lcol = "var(--white)"; }
              else { col = "var(--slate-300)"; bc = "var(--slate-100)"; }
            }
            return React.createElement("button", {
              key: i, disabled: revealed,
              onClick: () => submitAnswer(i),
              style: { display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: bg, border: `1.5px solid ${bc}`, borderRadius: 14, color: col, fontSize: 14, textAlign: "left", cursor: revealed ? "default" : "pointer", width: "100%", fontFamily: "var(--font-sans)", transition: "all 0.15s" }
            },
              React.createElement("span", { style: { width: 28, height: 28, borderRadius: 8, background: lbg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: lcol, flexShrink: 0 } }, ["A", "B", "C", "D"][i]),
              React.createElement("span", { style: { lineHeight: 1.45, fontWeight: 500 }, dangerouslySetInnerHTML: { __html: _md(opt) } }));
          })),

        // Explanation (after reveal)
        revealed && React.createElement("div", { style: { marginTop: 14, padding: "12px 16px", background: results[results.length - 1]?.correct ? "var(--emerald-50)" : "var(--amber-50)", border: `1px solid ${results[results.length - 1]?.correct ? "var(--emerald-100)" : "var(--amber-200)"}`, borderRadius: 12, fontSize: 14, color: results[results.length - 1]?.correct ? "var(--emerald-700)" : "var(--amber-700)", lineHeight: 1.6 }, dangerouslySetInnerHTML: { __html: (results[results.length - 1]?.correct ? "✅ " : "💡 ") + _md(q.explanation) } })),

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
function ExamSimEngine({ examViews, onExit, onDrillTopics, t }) {
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
  const [droppedCount, setDroppedCount] = React.useState(0);
  const [autoSubmitted, setAutoSubmitted] = React.useState(false);
  const [startedAt, setStartedAt] = React.useState(null);
  const finishedRef = React.useRef(false);
  const [ieltsModule, setIeltsModule] = React.useState("academic");
  const [ieltsPaper, setIeltsPaper] = React.useState("reading");
  const [ieltsRun, setIeltsRun] = React.useState(null);

  const selectedExam = examViews.find((e) => e.id === examId) || examViews[0] || null;
  const examTopics = selectedExam ? (selectedExam.topics || []).map((t) => t.topicName || t.name).filter(Boolean) : [];
  // Resolve the exam's qualification (nmt/sat/...) — course-backed exams carry
  // it on the Course's curriculumRef, legacy exams directly — to pick the
  // named spec (src/lib/exam-specs.ts); specFor() falls back to a
  // topic-count heuristic for anything unlisted.
  const examQual = React.useMemo(
    () => _qualificationOf(window.getExams ? window.getExams().find((e) => e.id === examId) : null),
    [examId]
  );
  const spec = React.useMemo(() => specFor(examQual, examTopics.length), [examQual, examTopics.length]);
  const questionCount = spec.questionCount;
  const styleNote = spec.note;
  const estMinutes = spec.durationMin;

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
        window.logMistake({
          topic: resolved?.topicName || q.topic, question: q.question,
          options: q.options, correctIndex: q.correct, selectedIndex: sel, explanation: q.explanation,
          examId: resolved?.examId, topicIdx: resolved?.topicIdx,
        });
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

  if (ieltsRun?.paper === "reading") {
    return React.createElement(IeltsReading, {
      mode: "exam", module: ieltsRun.module, t,
      onExit: () => { setIeltsRun(null); setPhase("setup"); },
    });
  }
  if (ieltsRun?.paper === "writing") {
    return React.createElement(IeltsWriting, {
      mode: "exam", module: ieltsRun.module, t,
      onExit: () => { setIeltsRun(null); setPhase("setup"); },
    });
  }

  // ── Setup screen ──
  if (phase === "setup" || (phase === "loading" && error)) {
    const startExam = async () => {
      if (!selectedExam) return;
      if (isIeltsQual(examQual)) {
        setIeltsRun({ paper: ieltsPaper, module: ieltsModule });
        return;
      }
      setPhase("loading"); setError(null); finishedRef.current = false; setAutoSubmitted(false);
      setStartedAt(Date.now());
      // Generate in PARALLEL CHUNKS of ~6 questions each, not one giant call.
      // A single 20-24 question request with explanations regularly blew past
      // the 60s budget or returned truncated/invalid JSON on the fast model —
      // that was the "Couldn't generate exam / Took too long" bug. Small chunks
      // each finish quickly, run concurrently, and a chunk that fails just
      // trims the paper instead of failing the whole exam.
      try {
        const topics = examTopics.length > 0 ? examTopics : [selectedExam.name];
        const CHUNK = 6;
        const numChunks = Math.max(1, Math.ceil(questionCount / CHUNK));
        const perChunk = Math.ceil(questionCount / numChunks);
        // Round-robin the topics across chunks so coverage is even.
        const chunkTopics = Array.from({ length: numChunks }, (_, i) => {
          const ts = topics.filter((_, j) => j % numChunks === i);
          return ts.length ? ts : topics.slice(0, Math.min(3, topics.length));
        });
        const makeChunk = (ts) => {
          const system = `You are an exam board writing part of a real mock paper for "${selectedExam.name}". ${styleNote} Write exactly ${perChunk} exam-style multiple-choice questions on these topics: ${ts.join(", ")}.
OUTPUT ONLY valid JSON — no markdown, no fences. Start with { end with }.
FORMAT: {"questions":[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"1-2 sentences","topic":"which topic"}]}
RULES: exactly 4 options; "correct" is a 0-based index; genuine exam difficulty; explanation teaches WHY; no duplicate concepts.
${mcqRulesBlock(planCorrectIndices(perChunk, 4))}`;
          const to = new Promise((_, rej) => setTimeout(() => rej(new Error("chunk timeout")), 45000));
          return Promise.race([window.brainCompleteJSON({ system, messages: [{ role: "user", content: `Generate ${perChunk} questions on: ${ts.join(", ")}` }], paperQual: _paperQualOf(window.getExams ? window.getExams().find((e) => e.id === examId) : null) }), to])
            .then((p) => (Array.isArray(p && p.questions) ? p.questions : []))
            // A dead chunk must not kill the paper, but it must not vanish
            // either — the recap counts what is missing.
            .catch((err) => { console.warn("exam-sim: chunk failed —", err.message || err); return []; });
        };
        const chunks = await Promise.all(chunkTopics.map(makeChunk));
        // Merge, lint, cap at target count. Lint runs before the slice so a
        // rejected question is replaced by a spare from another chunk rather
        // than shortening the paper.
        const merged = chunks.flat().filter((q) => q && typeof q.question === "string" && Array.isArray(q.options) && q.options.length === 4 && typeof q.correct === "number");
        const examPaperQual = _paperQualOf(window.getExams ? window.getExams().find((e) => e.id === examId) : null);
        const linted = filterMcqBatch(merged, { language: paperLanguageFor(examPaperQual) });
        reportRejections("exam-sim", linted.rejected);
        setDroppedCount(linted.rejected.length);
        const rawAll = linted.kept.slice(0, questionCount);
        if (rawAll.length === 0) throw new Error(L("Took too long — try again.", "Це тривало занадто довго — спробуйте ще раз.", "Это длилось слишком долго — попробуйте ещё раз.", "Cela a pris trop de temps — réessayez.", "Das hat zu lange gedauert — versuche es erneut."));
        // Novelty pass across the whole assembled paper. Retry regenerates
        // one extra chunk covering all topics — cheaper than another
        // full-paper generation, and dedupeAgainstQuestionBank only pulls the
        // replacements it actually needs. taxonomy = the exam's qualification
        // (nmt/sat/…), the same key ai_question_bank partitions by.
        const examTaxonomyLocal = examQual || (selectedExam && selectedExam.id) || "examsim";
        const all = await dedupeAgainstQuestionBank(rawAll, examTaxonomyLocal, () => makeChunk(topics));
        // An official-spec paper keeps its full named time budget even if a
        // chunk failure shortened the actual question count — the point of
        // "official format" is the clock matching the real thing, not
        // shrinking alongside a generation hiccup. An unlisted qualification
        // has no such budget to protect, so it stays proportional to what
        // was actually generated.
        const secs = spec.official ? spec.durationMin * 60 : Math.round(all.length * 1.5) * 60;
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

      isIeltsQual(examQual) && _ieltsSitPickers({
        t, module: ieltsModule, setModule: setIeltsModule, paper: ieltsPaper, setPaper: setIeltsPaper,
        papers: [
          { key: "reading", label: L("Reading · 3 passages · 40q · 60m", "Reading · 3 тексти · 40п · 60хв", "Reading · 3 текста · 40в · 60мин", "Reading · 3 textes · 40q · 60m", "Reading · 3 Texte · 40F · 60m") },
          { key: "writing", label: L("Writing · Task 1+2 · 60m", "Writing · Task 1+2 · 60хв", "Writing · Task 1+2 · 60мин", "Writing · Task 1+2 · 60m", "Writing · Task 1+2 · 60m") },
        ],
      }),

      // Real vs Practice made visible (Phase 3 §3b): only a named spec can
      // honestly claim to mirror an exam's official shape — everything else
      // is a generic mock, and the copy says so rather than implying more
      // precision than the fallback heuristic actually has.
      selectedExam && spec.official && React.createElement("div", {
        style: { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "var(--emerald-50)", border: "1px solid var(--emerald-100)", borderRadius: 999, marginBottom: 12, fontSize: 11, fontWeight: 700, color: "var(--emerald-700)" }
      }, "✓ ", L(`Official ${examQual?.toUpperCase()} format`, `Офіційний формат ${examQual?.toUpperCase()}`, `Официальный формат ${examQual?.toUpperCase()}`, `Format officiel ${examQual?.toUpperCase()}`, `Offizielles ${examQual?.toUpperCase()}-Format`)),

      selectedExam && React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24, background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: "14px 8px" } },
        ...[
          isIeltsQual(examQual) && ieltsPaper === "writing"
            ? { val: "2", label: L("Tasks", "Завдання", "Задания", "Tâches", "Aufgaben") }
            : { val: isIeltsQual(examQual) ? 40 : questionCount, label: L("Questions", "Питання", "Вопросы", "Questions", "Fragen") },
          { val: isIeltsQual(examQual) ? "60m" : `~${estMinutes}m`, label: L("Time limit", "Ліміт часу", "Лимит времени", "Limite de temps", "Zeitlimit") },
          isIeltsQual(examQual)
            ? { val: ieltsPaper === "writing" ? "T1+T2" : "3", label: ieltsPaper === "writing" ? L("Paper", "Папір", "Бумага", "Épreuve", "Teil") : L("Passages", "Тексти", "Тексты", "Textes", "Texte") }
            : { val: examTopics.length || L("All", "Усі", "Все", "Tous", "Alle"), label: L("Topics", "Теми", "Темы", "Sujets", "Themen") },
        ].map((s, i) => React.createElement("div", { key: i, style: { textAlign: "center" } },
          React.createElement("p", { style: { margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-strong)" } }, s.val),
          React.createElement("p", { style: { margin: "2px 0 0", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" } }, s.label)))),

      _btn(selectedExam ? L("Start exam →", "Почати іспит →", "Начать экзамен →", "Démarrer l'examen →", "Prüfung starten →") : L("Add a subject first", "Спочатку додайте предмет", "Сначала добавьте предмет", "Ajoutez d'abord une matière", "Füge zuerst ein Fach hinzu"), startExam, true, !selectedExam));
  }

  // ── Loading ──
  if (phase === "loading") {
    return React.createElement(WaitPress, {
      title: L("Assembling your mock exam...", "Складаємо ваш пробний іспит...", "Составляем ваш пробный экзамен...", "Préparation de votre examen blanc...", "Deine Testprüfung wird zusammengestellt..."),
      subtitle: selectedExam?.name,
      lang: t?.code,
    });
  }

  // ── Summary ──
  if (phase === "summary") {
    const total = questions.length;
    const answeredCount = answers.filter((a) => a !== null && a !== undefined).length;
    const correctCount = questions.filter((q, i) => answers[i] === q.correct).length;
    const pct = Math.round((correctCount / total) * 100);
    const xpEarned = correctCount * 15 + (pct >= 80 ? 100 : pct >= 50 ? 40 : 0); // display only — actually awarded once in finishExam()
    // The old "Predicted grade: B" badge is gone: ExamRecap reports the score
    // on the exam's real scale instead. Letter grades were audit #10 — none of
    // the exams this app targets reports one (see src/lib/scales.ts).
    const timeUsed = timeLimitSec - timeLeft;

    const byTopic = {};
    questions.forEach((q, i) => {
      const tp = q.topic || L("Unknown", "Невідомо", "Неизвестно", "Inconnu", "Unbekannt");
      if (!byTopic[tp]) byTopic[tp] = { correct: 0, total: 0 };
      byTopic[tp].total++;
      if (answers[i] === q.correct) byTopic[tp].correct++;
    });
    const weakTopics = Object.entries(byTopic).filter(([, v]) => v.correct / v.total < 0.5).map(([k]) => k);

    return React.createElement(ExamRecap, {
      mode: "real",
      examId,
      examName: selectedExam?.name || "",
      taxonomy: examQual,
      correct: correctCount,
      total,
      weakTopics,
      sessionStartedAt: startedAt,
      headline: autoSubmitted
        ? L("Time's up!", "Час вийшов!", "Время вышло!", "Temps écoulé !", "Zeit ist um!")
        : L("Exam Submitted", "Іспит здано", "Экзамен сдан", "Examen soumis", "Prüfung eingereicht"),
      stats: [
        { val: `${answeredCount}/${total}`, label: L("Answered", "Відповіли", "Ответили", "Répondu", "Beantwortet"), color: "var(--indigo-600)" },
        { val: mmss(timeUsed), label: L("Time used", "Витрачено часу", "Затрачено времени", "Temps utilisé", "Verbrauchte Zeit"), color: "var(--text-strong)" },
        { val: `+${xpEarned}`, label: "XP", color: "var(--indigo-600)" },
        ...(droppedCount > 0 ? [{ val: String(droppedCount), label: L("Failed quality check", "Не пройшли перевірку", "Не прошли проверку", "Recalées au contrôle", "Qualitätsprüfung nicht bestanden"), color: "var(--text-faint)" }] : []),
      ],
      // The per-question breakdown stays — it is the most-used part of a mock
      // recap and has no equivalent anywhere else in the app.
      review: questions.map((q, i) => ({
        question: q.question, options: q.options, correct: q.correct,
        selected: answers[i], explanation: q.explanation,
      })),
      // Routes out to the Practice engine via the parent (a mock exam cannot
      // re-run itself as a drill), pre-filtered to what was just missed.
      onDrillWeak: onDrillTopics ? (topics) => onDrillTopics(examId, topics) : null,
      onExit,
      t,
    });
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
              React.createElement("span", { style: { width: 28, height: 28, borderRadius: 8, background: isSel ? "var(--indigo-500)" : "var(--slate-100)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: isSel ? "var(--white)" : "var(--slate-400)", flexShrink: 0 } }, ["A", "B", "C", "D"][i]),
              React.createElement("span", { style: { lineHeight: 1.45, fontWeight: 500 }, dangerouslySetInnerHTML: { __html: _md(opt) } }));
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
const LESSON_CACHE_VER = 3;
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

function lessonPaperOpts(resolved) {
  const exam = resolved && window.getExams ? window.getExams().find((e) => e.id === resolved.examId) : null;
  const paperQual = _paperQualOf(exam);
  const langOverride = paperLanguageFor(paperQual) ? undefined : (exam && exam.explainLang ? exam.explainLang : undefined);
  return { exam, paperQual, langOverride, cacheLang: paperLanguageFor(paperQual) || exam?.explainLang };
}

// Learn chrome follows the paper, not the app UI: NMT math stays Ukrainian
// even when the nav is English. NMT English stays English.
function learnCopyCode(resolved, uiLang) {
  const { paperQual } = lessonPaperOpts(resolved);
  return copyLangFor(paperQual, uiLang || "en");
}

// Builds (or returns cached) a lesson plan for a topic. Pure of React so both
// LessonEngine and the topic picker's hover-prefetch can call it. `force`
// bypasses the cache to regenerate on an explicit retry.
async function generateLessonPlan({ mode, topic, resolved, tcode, force }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[tcode] || en);
  const { paperQual, langOverride, cacheLang } = lessonPaperOpts(resolved);
  const topicKey = `${topic}::${resolved?.examId || "any"}`;
  const priorVote = getDiffVote(topicKey);
  const cacheKey = lessonCacheKey({ mode, topic, examId: resolved?.examId, vote: priorVote, lang: cacheLang, ui: tcode });
  if (!force) {
    const cached = getCachedLesson(cacheKey);
    if (cached) return cached;
    if (_lessonInFlight.has(cacheKey)) return _lessonInFlight.get(cacheKey);
  }
  const run = (async () => {
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
    const parsed = await Promise.race([
      window.brainCompleteJSON({ system, messages: [{ role: "user", content: `Generate a structured lesson on: ${topic}` }], topicContext, langOverride, paperQual }),
      timeout,
    ]);
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

// ─── Learn mode: pure theory reader (Phase 3.7a follow-up) ────────────────────
//
// mode="learn" no longer produces the mixed quiz-script LessonEngine used to
// render — the student asked for pure, high-quality theory. This builder
// generates a single structured page: TL;DR → key concepts → worked
// examples → common pitfalls → cheat sheet. Formulas come back as LaTeX
// (`$…$` / `$$…$$`) so the KaTeX-aware `_md` renders them as real math.
//
// Cached the same way as generateLessonPlan (localStorage-backed via
// getCachedLesson / setCachedLesson) — a warm reopen of the same topic is
// instant and doesn't burn a fresh AI call.

const THEORY_MODE_TAG = "theory";

async function generateTheoryReader({ topic, resolved, tcode, force }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[tcode] || en);
  const { paperQual, langOverride, cacheLang } = lessonPaperOpts(resolved);
  const cacheKey = lessonCacheKey({ mode: THEORY_MODE_TAG, topic, examId: resolved?.examId, vote: 0, lang: cacheLang, ui: tcode });
  if (!force) {
    const cached = getCachedLesson(cacheKey);
    if (cached) return cached;
    if (_lessonInFlight.has(cacheKey)) return _lessonInFlight.get(cacheKey);
  }
  const run = (async () => {
    const topicContext = resolved ? { examId: resolved.examId, topicName: resolved.topicName } : undefined;
    const system = `You are the best exam-prep teacher in the world. Write ONE excellent, self-contained theory page for the topic "${topic}". No questions, no drills — just pure, clear teaching a student can read once and remember.

OUTPUT ONLY valid JSON — no markdown fences, no text before or after. Start with { end with }.

STRUCTURE — every field required unless marked optional:
{
  "title": "One clear title, matching the topic",
  "tldr": "2-3 sentences summarising the whole idea in plain language a beginner can grasp",
  "diagram": "REQUIRED. Raw SVG: <svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 720 400\\">…</svg>. This is a DRAWING the student remembers — geometry, arrows, axes, shaded regions — never a layout of notes. See DIAGRAM PLAYBOOK.",
  "diagramCaption": "One sentence naming what the figure shows (not the word Diagram).",
  "concepts": [
    {"heading": "Concept name", "body": "2-4 short paragraphs explaining it. Use analogies and concrete examples. **Bold** key terms."}
  ],
  "examples": [
    {"prompt": "A worked example problem", "steps": ["Step 1: …", "Step 2: …", "…"], "answer": "The final answer"}
  ],
  "pitfalls": ["Common mistake 1 (short, one sentence)", "Common mistake 2", "…"],
  "cheatsheet": ["Key formula or rule 1", "Key formula or rule 2", "…"],
  "relatedConcepts": ["Related topic name 1", "Related topic name 2", "Related topic name 3"]
}

RULES:
- 3-5 concepts, ordered from easiest to hardest.
- 2-3 worked examples that cover different situations.
- 3-6 pitfalls; 4-8 cheat-sheet lines.
- 2-3 relatedConcepts — topic names the student would naturally study NEXT to build on this one. Real topic names only, no filler like "practice problems".
- Write MATH as LaTeX: inline like $x^2 + 1$, display like $$\\int_a^b f(x)\\,dx$$. Never use unicode superscripts or ^ notation — the reader renders LaTeX to real formulas.
- Concepts read as prose — full sentences with line breaks between paragraphs. Not bullet lists.
- Explanations pitch at exam-preparation level, not textbook. Concrete, active voice.

DIAGRAM PLAYBOOK — the figure is the visual memory of the page. It must show a RELATIONSHIP in space.

BANNED (these fail the page — do not emit them):
- A 2×2 or N×M grid of equal rounded rectangles filled with bullet lists
- Four identical "type of X" cards
- Putting the word "Diagram" / "Схема" inside the SVG
- ASCII arrows as text ("->", "=>", "→" as characters in a <text>)
- More than ~18 words of running prose in the whole SVG
- Identical boxes with no connecting geometry

REQUIRED:
- One composition, one story. Labels are 1–4 words. Explanation lives in concepts, not in the drawing.
- Directed edges use a real arrowhead: <defs><marker id="arr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="currentColor"/></marker></defs> then marker-end="url(#arr)" on the <line> or <path>.
- Soft region fills: fill="currentColor" fill-opacity="0.08" to "0.16". Strokes 1.75–2.25, stroke="currentColor", stroke-linecap="round", stroke-linejoin="round".
- Points: small filled circles r="3.5". Hidden 3D edges: stroke-dasharray="5 4".
- font-family="ui-sans-serif, system-ui, sans-serif" font-size 13–15, font-weight 650 on titles. currentColor for every stroke, fill, and text (light and dark themes).
- viewBox "0 0 720 400" (taller only if the figure needs vertical space). Leave 20px padding inside the viewBox so arrowheads and labels are not clipped. No width or height attributes on <svg>. Never <script>, never on* attributes, never external images.

SHAPE BY TOPIC:
- Geometry (triangle, circle, quadrilateral, angle) → the actual figure with labelled vertices/sides/angles and the numbers from your worked example.
- Coordinate geometry / vectors → axes with numbered ticks and the points/lines plotted.
- Functions (linear, quadratic, trig, exp, log) → the graph on axes; mark intercepts, vertex, asymptote.
- Derivatives / integrals → the curve plus a tangent, or a shaded region under the curve.
- Stereometry (prism, cone, sphere, pyramid) → 3D-projected wireframe, dashed hidden edges.
- Number-line topics → a horizontal line with the solution set as a thick shaded interval.
- Probability / combinatorics → a tree with weighted branches, or overlapping Venn sets — not a table of numbers.
- Statistics → bars, a histogram, or a box plot of the sample data.
- Physics-shaped topics → a free-body diagram or a time-vs-position graph.
- Logic / proof / methods → FOUR DIFFERENT geometries in one canvas, never four copies of a card. Direct = a left-to-right implication chain of 3–4 pills with arrowed paths. Contradiction = a path that assumes ¬Q and ends at a ⊥. Induction = three rising steps (n=1, k, k+1). Contrapositive = a reversed arrow ¬Q → ¬P. Two-word titles only.
- Classification / taxonomy → a tree or nested sets.
- Procedure / algorithm / grammar / essay structure → numbered nodes on a path with arrows (a sentence skeleton, a paragraph map) — not a list of tips.
- IELTS Listening/Reading → the map, flow, or table skeleton the task actually uses.`;
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error(L("Took too long — try again.", "Це тривало занадто довго — спробуйте ще раз.", "Это длилось слишком долго — попробуйте ещё раз.", "Cela a pris trop de temps — réessayez.", "Das hat zu lange gedauert — versuche es erneut."))), 45000));
    const parsed = await Promise.race([
      window.brainCompleteJSON({ system, messages: [{ role: "user", content: `Write the theory page for: ${topic}` }], topicContext, langOverride, paperQual }),
      timeout,
    ]);
    if (!parsed || !parsed.title || !Array.isArray(parsed.concepts)) throw new Error(L("Invalid theory page", "Некоректний контент", "Некорректный контент", "Contenu invalide", "Ungültiger Inhalt"));
    const theoryLang = paperLanguageFor(paperQual);
    const theorySurfaces = [parsed.title, parsed.tldr, parsed.diagramCaption]
      .concat((parsed.concepts || []).flatMap((c) => [c.heading, c.body]))
      .concat((parsed.examples || []).flatMap((ex) => [ex.prompt, ex.answer].concat(ex.steps || [])))
      .concat(parsed.pitfalls || [])
      .concat(parsed.cheatsheet || []);
    if (mixedLanguage(theorySurfaces, theoryLang)) {
      throw new Error(L("Invalid theory page", "Некоректний контент", "Некорректный контент", "Contenu invalide", "Ungültiger Inhalt"));
    }
    saveCachedLesson(cacheKey, parsed);
    _lessonInFlight.delete(cacheKey);
    return parsed;
  })();
  _lessonInFlight.set(cacheKey, run);
  run.catch(() => _lessonInFlight.delete(cacheKey));
  return run;
}

function LearnTheoryReader({ topic, onExit, t, onOpenTopic }) {
  const resolved = React.useMemo(() => window.resolveTopicForBrain ? window.resolveTopicForBrain(topic) : null, [topic]);
  const copy = learnCopyCode(resolved, t?.code);
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[copy] || en);
  const [plan, setPlan] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [retry, setRetry] = React.useState(0);
  const [markedRead, setMarkedRead] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);
  // Once-per-open XP grant so re-scrolling to the "Got it" button doesn't
  // multiply the reward. Same shape as LessonEngine's xpCommittedRef.
  const grantedRef = React.useRef(false);
  const speechRef = React.useRef(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null); setPlan(null); setMarkedRead(false);
    grantedRef.current = false;
    (async () => {
      try {
        const parsed = await generateTheoryReader({ topic, resolved, tcode: copy, force: retry > 0 });
        if (cancelled) return;
        setPlan(parsed); setLoading(false);
      } catch (e) {
        if (cancelled) return;
        console.error("Theory generation failed:", e);
        setError(e.message || L("Failed to load", "Не вдалося завантажити", "Не удалось загрузить", "Échec du chargement", "Fehler beim Laden"));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [topic, retry]);

  // Stop narration whenever the reader unmounts, the topic swaps, or a
  // re-fetch tears down `plan` — otherwise the browser's global speech
  // queue keeps talking on the next page (see src/lib/speech.ts header).
  React.useEffect(() => {
    return () => { if (speechRef.current) { speechRef.current.stop(); speechRef.current = null; } };
  }, [topic]);

  const toggleSpeak = () => {
    if (speaking) {
      if (speechRef.current) speechRef.current.stop();
      speechRef.current = null;
      setSpeaking(false);
      return;
    }
    if (!plan) return;
    const chunks = [
      plan.title,
      plan.tldr,
      ...(Array.isArray(plan.concepts) ? plan.concepts.flatMap((c) => [c.heading, c.body]) : []),
      ...(Array.isArray(plan.pitfalls) ? [L("Common mistakes:", "Типові помилки:", "Типичные ошибки:", "Erreurs fréquentes :", "Häufige Fehler:"), ...plan.pitfalls] : []),
    ].filter((s) => typeof s === "string" && s.trim().length > 0);
    setSpeaking(true);
    speechRef.current = speak(chunks, copy, () => setSpeaking(false));
  };

  const markAsRead = () => {
    if (grantedRef.current || markedRead) return;
    grantedRef.current = true;
    setMarkedRead(true);
    if (window.addXp) window.addXp(50);
    // Positive review signal on the resolved topic so retention rises — a
    // student who read the theory has definitely engaged with the concept.
    if (resolved && window.recordReview) {
      window.recordReview({ examId: resolved.examId, topicIdx: resolved.topicIdx, topicName: resolved.topicName, correct: true });
    }
    _sfx.correct();
  };

  const wrap = (children) => React.createElement("div", {
    style: { maxWidth: 720, margin: "0 auto", padding: "24px 20px 80px", fontFamily: "var(--font-sans)", color: "var(--text-body)" },
  }, children);
  const speechAvailable = isSpeechSupported();
  const header = React.createElement("div", { key: "hdr", style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 18 } },
    React.createElement("button", { onClick: onExit, style: { background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-muted)", padding: 0 } }, "←"),
    React.createElement("span", { style: { flex: 1, fontSize: 11, textTransform: "uppercase", color: "var(--text-faint)", letterSpacing: "0.08em", fontWeight: 600 } },
      L("Theory", "Теорія", "Теория", "Théorie", "Theorie")),
    // Voice narration button — hidden entirely when the browser has no
    // SpeechSynthesis at all (a handful of embedded WebViews). Otherwise
    // toggles between Play / Stop on the same button.
    plan && speechAvailable && React.createElement("button", {
      onClick: toggleSpeak,
      "aria-label": speaking ? L("Stop", "Зупинити", "Остановить", "Arrêter", "Stopp") : L("Listen", "Слухати", "Слушать", "Écouter", "Vorlesen"),
      title: speaking ? L("Stop", "Зупинити", "Остановить", "Arrêter", "Stopp") : L("Listen", "Слухати", "Слушать", "Écouter", "Vorlesen"),
      style: { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: speaking ? "var(--indigo-600)" : "var(--surface-card)", color: speaking ? "#fff" : "var(--text-body)", border: `1px solid ${speaking ? "var(--indigo-600)" : "var(--border-default)"}`, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" },
    },
      React.createElement("span", { style: { fontSize: 14 } }, speaking ? "⏹" : "▶"),
      React.createElement("span", null, speaking ? L("Stop", "Стоп", "Стоп", "Stop", "Stopp") : L("Listen", "Слухати", "Слушать", "Écouter", "Vorlesen")),
    ),
  );

  if (loading) return wrap([header, React.createElement(WaitPress, {
    key: "l",
    title: L("Preparing your theory page…", "Готуємо теорію…", "Готовим теорию…", "Préparation…", "Bereite Theorie vor…"),
    lang: copy,
    compact: true,
  })]);
  if (error) return wrap([header,
    React.createElement("p", { key: "e", style: { color: "var(--red-600)" } }, error),
    React.createElement("button", { key: "r", onClick: () => setRetry((n) => n + 1), style: { marginTop: 10, padding: "10px 16px", borderRadius: 10, border: "1px solid var(--border-default)", background: "var(--surface-card)", cursor: "pointer", fontFamily: "var(--font-sans)" } },
      L("Retry", "Ще раз", "Ещё раз", "Réessayer", "Erneut versuchen")),
  ]);
  if (!plan) return wrap([header]);

  const html = (s) => ({ __html: _md(s || "") });
  const kSect = { marginTop: 32 };
  const kSectLabel = { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)", fontWeight: 700, marginBottom: 10 };
  const kBodyProse = { fontSize: 16, lineHeight: 1.75, color: "var(--text-body)" };

  return wrap([
    header,
    React.createElement("h1", { key: "title", style: { margin: "0 0 12px", fontSize: 28, fontWeight: 800, color: "var(--text-strong)", lineHeight: 1.2, letterSpacing: "-0.01em" } }, plan.title),
    plan.tldr && React.createElement("div", { key: "tldr", style: { marginTop: 8, padding: "16px 18px", background: "var(--indigo-50)", borderRadius: 12, fontSize: 15, lineHeight: 1.6, color: "var(--text-strong)" } },
      React.createElement("div", { style: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--indigo-700)", fontWeight: 700, marginBottom: 6 } }, L("TL;DR", "Коротко", "Коротко", "En bref", "Kurz gesagt")),
      React.createElement("div", { dangerouslySetInnerHTML: html(plan.tldr) }),
    ),
    // AI-authored SVG. sanitizeSvg (DOMPurify) drops script/on*. currentColor
    // in the prompt keeps strokes on both themes. Chrome lives in learn.css
    // so a 720-wide viewBox fills the column instead of sitting in a 480px box.
    plan.diagram && (() => {
      const clean = sanitizeSvg(plan.diagram);
      if (!clean) return null;
      const caption = typeof plan.diagramCaption === "string" && plan.diagramCaption.trim()
        ? plan.diagramCaption.trim()
        : null;
      return React.createElement("figure", { key: "diagram", className: "theory-diagram" },
        React.createElement("div", { dangerouslySetInnerHTML: { __html: clean } }),
        caption && React.createElement("figcaption", null, caption),
      );
    })(),
    // Concepts — the main body. Each concept renders as its own heading +
    // multi-paragraph explanation. KaTeX-rendered math inline via _md.
    Array.isArray(plan.concepts) && plan.concepts.length > 0 && React.createElement("div", { key: "concepts", style: kSect },
      React.createElement("div", { style: kSectLabel }, L("Core concepts", "Ключові концепції", "Ключевые концепции", "Concepts clés", "Kernkonzepte")),
      ...plan.concepts.map((c, i) => React.createElement("section", { key: i, style: { marginTop: i === 0 ? 4 : 24 } },
        React.createElement("h2", { style: { margin: "0 0 10px", fontSize: 20, fontWeight: 700, color: "var(--text-strong)", lineHeight: 1.3 } }, c.heading),
        React.createElement("div", { style: kBodyProse, dangerouslySetInnerHTML: html(c.body) }),
      )),
    ),
    Array.isArray(plan.examples) && plan.examples.length > 0 && React.createElement("div", { key: "ex", style: kSect },
      React.createElement("div", { style: kSectLabel }, L("Worked examples", "Розв'язані приклади", "Разобранные примеры", "Exemples résolus", "Beispiele")),
      ...plan.examples.map((ex, i) => React.createElement("div", { key: i, style: { marginTop: i === 0 ? 4 : 20, padding: "16px 18px", background: "var(--surface-muted)", borderRadius: 12 } },
        React.createElement("div", { style: { fontSize: 15, fontWeight: 600, color: "var(--text-strong)", marginBottom: 10 }, dangerouslySetInnerHTML: html(ex.prompt) }),
        Array.isArray(ex.steps) && React.createElement("ol", { style: { paddingLeft: 22, margin: "0 0 10px", color: "var(--text-body)", fontSize: 15, lineHeight: 1.7 } },
          ...ex.steps.map((s, j) => React.createElement("li", { key: j, style: { marginBottom: 6 }, dangerouslySetInnerHTML: html(s) })),
        ),
        ex.answer && React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: "var(--indigo-700)", paddingTop: 8, borderTop: "1px solid var(--border-subtle)" } },
          React.createElement("span", { style: { color: "var(--text-faint)", fontWeight: 500 } }, L("Answer: ", "Відповідь: ", "Ответ: ", "Réponse : ", "Antwort: ")),
          React.createElement("span", { dangerouslySetInnerHTML: html(ex.answer) }),
        ),
      )),
    ),
    Array.isArray(plan.pitfalls) && plan.pitfalls.length > 0 && React.createElement("div", { key: "pit", style: kSect },
      React.createElement("div", { style: kSectLabel }, L("Common mistakes", "Типові помилки", "Типичные ошибки", "Erreurs fréquentes", "Häufige Fehler")),
      React.createElement("ul", { style: { paddingLeft: 22, margin: 0, fontSize: 15, lineHeight: 1.75, color: "var(--text-body)" } },
        ...plan.pitfalls.map((p, i) => React.createElement("li", { key: i, style: { marginBottom: 6 }, dangerouslySetInnerHTML: html(p) })),
      ),
    ),
    Array.isArray(plan.cheatsheet) && plan.cheatsheet.length > 0 && React.createElement("div", { key: "cs", style: kSect },
      React.createElement("div", { style: kSectLabel }, L("Cheat sheet", "Шпаргалка", "Шпаргалка", "Aide-mémoire", "Spickzettel")),
      React.createElement("div", { style: { padding: "16px 18px", background: "var(--surface-card)", border: "1px dashed var(--border-default)", borderRadius: 12 } },
        React.createElement("ul", { style: { paddingLeft: 22, margin: 0, fontSize: 15, lineHeight: 1.85, color: "var(--text-strong)" } },
          ...plan.cheatsheet.map((c, i) => React.createElement("li", { key: i, style: { marginBottom: 4 }, dangerouslySetInnerHTML: html(c) })),
        ),
      ),
    ),
    // Watch on YouTube — plain search link, no API key needed. Opens the
    // student's YouTube results for "<topic> explained" in a new tab,
    // letting them pick a video that fits their level. When we later add a
    // Google API key, this button can graduate to an inline first-result
    // embed without changing anywhere else.
    React.createElement("div", { key: "yt", style: kSect },
      React.createElement("div", { style: kSectLabel }, L("Watch a video", "Подивитися відео", "Посмотреть видео", "Regarder une vidéo", "Video ansehen")),
      React.createElement("a", {
        href: `https://www.youtube.com/results?search_query=${encodeURIComponent(topic + " explained")}`,
        target: "_blank",
        rel: "noopener noreferrer",
        style: { display: "inline-flex", alignItems: "center", gap: 10, padding: "12px 18px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: 12, textDecoration: "none", color: "var(--text-body)", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-sans)" },
      },
        React.createElement("span", { style: { fontSize: 18 } }, "▶"),
        React.createElement("span", null,
          L(`Search "${topic}" on YouTube`, `Пошук "${topic}" на YouTube`, `Найти "${topic}" на YouTube`, `Chercher "${topic}" sur YouTube`, `"${topic}" auf YouTube suchen`)),
      ),
    ),
    // Related concepts — bridges to the next topics. Clicking swaps this
    // reader in place via onOpenTopic (falls back to plain buttons that
    // do nothing extra if the parent didn't wire the callback).
    Array.isArray(plan.relatedConcepts) && plan.relatedConcepts.length > 0 && React.createElement("div", { key: "rel", style: kSect },
      React.createElement("div", { style: kSectLabel }, L("Related concepts", "Пов'язані теми", "Связанные темы", "Concepts liés", "Verwandte Konzepte")),
      React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 } },
        ...plan.relatedConcepts.map((rc, i) => React.createElement("button", {
          key: i,
          onClick: () => onOpenTopic && onOpenTopic(rc),
          disabled: !onOpenTopic,
          style: { padding: "10px 16px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: 999, cursor: onOpenTopic ? "pointer" : "default", color: "var(--text-body)", fontSize: 13, fontWeight: 500, fontFamily: "var(--font-sans)" },
        }, "→ ", rc)),
      ),
    ),
    React.createElement("div", { key: "cta", style: { marginTop: 40, display: "flex", justifyContent: "center" } },
      markedRead
        ? React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, color: "var(--emerald-600)", fontWeight: 600, fontSize: 15 } },
            React.createElement("span", { style: { fontSize: 22 } }, "✓"),
            L("Marked as read · +50 XP", "Позначено · +50 XP", "Отмечено · +50 XP", "Marqué comme lu · +50 XP", "Als gelesen markiert · +50 XP"),
          )
        : React.createElement("button", {
            onClick: markAsRead,
            style: { padding: "14px 32px", borderRadius: 999, background: "var(--indigo-600)", color: "#fff", border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "var(--font-sans)" },
          },
            L("Got it · +50 XP", "Зрозумів · +50 XP", "Понял · +50 XP", "Compris · +50 XP", "Verstanden · +50 XP"),
          ),
    ),
  ]);
}

// ─── Learn mode: flashcards slide reader (Phase 3.7c) ────────────────────────
//
// Second Learn method, alongside LearnTheoryReader. Same audience, different
// intake: some students learn by reading through, others by cycling 6-10
// bite-sized cards. AI decides card count (6 for simple topics, 10 for
// complex ones) so a trivial recall topic doesn't get padded and a deep one
// isn't compressed. Cards are one-concept-each (front only — no flip; the
// concept + short explanation + micro-example live on the same face).
// KaTeX-rendered math via _md, same pipeline as the theory reader.

const FLASHCARDS_MODE_TAG = "flashcards";

async function generateFlashcards({ topic, resolved, tcode, force }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[tcode] || en);
  const { paperQual, langOverride, cacheLang } = lessonPaperOpts(resolved);
  const cacheKey = lessonCacheKey({ mode: FLASHCARDS_MODE_TAG, topic, examId: resolved?.examId, vote: 0, lang: cacheLang, ui: tcode });
  if (!force) {
    const cached = getCachedLesson(cacheKey);
    if (cached) return cached;
    if (_lessonInFlight.has(cacheKey)) return _lessonInFlight.get(cacheKey);
  }
  const run = (async () => {
    const topicContext = resolved ? { examId: resolved.examId, topicName: resolved.topicName } : undefined;
    const langName = languageNameFor(paperQual);
    const system = `You are the best exam-prep teacher in the world. Break the topic "${topic}" into a small deck of concept cards — each card is ONE clear idea a student can absorb in under 30 seconds.

OUTPUT ONLY valid JSON — no markdown fences, no text before or after. Start with { end with }.

STRUCTURE:
{
  "title": "One clear title, matching the topic",
  "cards": [
    {"heading": "Concept name (3-5 words)", "body": "1-2 short sentences explaining the concept. Concrete, active voice.", "example": "Optional: one tiny worked example or formula (leave off if the body already speaks for itself)"}
  ]
}

RULES:
- Total cards: 6 for a simple recall topic, 10 for a deep multi-step topic, else pick something between based on how much genuinely different content there is. Never fewer than 6 or more than 10.
- Cards are ordered easiest → hardest, each building on the last.
- Each card covers ONE distinct concept — no repeats, no near-duplicates.
- Write MATH as LaTeX: inline like $x^2 + 1$, display like $$\\frac{a}{b}$$. Never unicode superscripts or ^ notation — the reader renders LaTeX to real formulas.
- **Bold** the single key term on each card.
- Skip filler like "in this card we will…" — get straight to the point.${langName ? `\n- Write EVERY JSON string (title, heading, body, example) in ${langName} only. The app UI may be in another language — ignore it.` : ""}`;
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error(L("Took too long — try again.", "Це тривало занадто довго — спробуйте ще раз.", "Это длилось слишком долго — попробуйте ещё раз.", "Cela a pris trop de temps — réessayez.", "Das hat zu lange gedauert — versuche es erneut."))), 45000));
    const parsed = await Promise.race([
      window.brainCompleteJSON({ system, messages: [{ role: "user", content: `Build the flashcard deck for: ${topic}` }], topicContext, langOverride, paperQual }),
      timeout,
    ]);
    if (!parsed || !Array.isArray(parsed.cards) || parsed.cards.length === 0) throw new Error(L("Invalid deck", "Некоректна колода", "Некорректная колода", "Deck invalide", "Ungültiges Deck"));
    const linted = filterFlashcards(parsed.cards.slice(0, 10), paperLanguageFor(paperQual));
    reportRejections("learn-flashcards", linted.rejected);
    parsed.cards = linted.kept;
    if (!parsed.cards.length) throw new Error(L("Invalid deck", "Некоректна колода", "Некорректная колода", "Deck invalide", "Ungültiges Deck"));
    saveCachedLesson(cacheKey, parsed);
    _lessonInFlight.delete(cacheKey);
    return parsed;
  })();
  _lessonInFlight.set(cacheKey, run);
  run.catch(() => _lessonInFlight.delete(cacheKey));
  return run;
}

function LearnFlashcards({ topic, onExit, t }) {
  const resolved = React.useMemo(() => window.resolveTopicForBrain ? window.resolveTopicForBrain(topic) : null, [topic]);
  const copy = learnCopyCode(resolved, t?.code);
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[copy] || en);
  const [plan, setPlan] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [retry, setRetry] = React.useState(0);
  const [idx, setIdx] = React.useState(0);
  const [markedRead, setMarkedRead] = React.useState(false);
  const grantedRef = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null); setPlan(null); setIdx(0);
    (async () => {
      try {
        const parsed = await generateFlashcards({ topic, resolved, tcode: copy, force: retry > 0 });
        if (cancelled) return;
        setPlan(parsed); setLoading(false);
      } catch (e) {
        if (cancelled) return;
        console.error("Flashcards generation failed:", e);
        setError(e.message || L("Failed to load", "Не вдалося завантажити", "Не удалось загрузить", "Échec du chargement", "Fehler beim Laden"));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [topic, retry]);

  // Left/right arrow keys navigate the deck — same shape every slide reader
  // ships with, so the interaction is discoverable without a legend.
  React.useEffect(() => {
    if (!plan) return;
    const onKey = (e) => {
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight") setIdx((i) => Math.min(plan.cards.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [plan]);

  const markAsRead = () => {
    if (grantedRef.current || markedRead) return;
    grantedRef.current = true;
    setMarkedRead(true);
    if (window.addXp) window.addXp(50);
    if (resolved && window.recordReview) {
      window.recordReview({ examId: resolved.examId, topicIdx: resolved.topicIdx, topicName: resolved.topicName, correct: true });
    }
    _sfx.correct();
  };

  const wrap = (children) => React.createElement("div", {
    style: { maxWidth: 720, margin: "0 auto", padding: "24px 20px 80px", fontFamily: "var(--font-sans)", color: "var(--text-body)" },
  }, children);
  const header = React.createElement("div", { key: "hdr", style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 18 } },
    React.createElement("button", { onClick: onExit, style: { background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-muted)", padding: 0 } }, "←"),
    React.createElement("span", { style: { fontSize: 11, textTransform: "uppercase", color: "var(--text-faint)", letterSpacing: "0.08em", fontWeight: 600 } },
      L("Flashcards", "Картки", "Карточки", "Cartes", "Karteikarten")),
  );

  if (loading) return wrap([header, React.createElement(WaitPress, {
    key: "l",
    title: L("Preparing your cards…", "Готуємо картки…", "Готовим карточки…", "Préparation…", "Bereite Karten vor…"),
    lang: copy,
    compact: true,
  })]);
  if (error) return wrap([header,
    React.createElement("p", { key: "e", style: { color: "var(--red-600)" } }, error),
    React.createElement("button", { key: "r", onClick: () => setRetry((n) => n + 1), style: { marginTop: 10, padding: "10px 16px", borderRadius: 10, border: "1px solid var(--border-default)", background: "var(--surface-card)", cursor: "pointer", fontFamily: "var(--font-sans)" } },
      L("Retry", "Ще раз", "Ещё раз", "Réessayer", "Erneut versuchen")),
  ]);
  if (!plan) return wrap([header]);

  const card = plan.cards[idx];
  const isLast = idx === plan.cards.length - 1;
  const html = (s) => ({ __html: _md(s || "") });

  return wrap([
    header,
    React.createElement("h1", { key: "title", style: { margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "var(--text-strong)", lineHeight: 1.25 } }, plan.title),
    // Progress dots — one per card, current is filled. Compact hint that
    // the deck has an end without hiding it behind a counter.
    React.createElement("div", { key: "dots", style: { display: "flex", gap: 6, marginBottom: 20, marginTop: 4 } },
      ...plan.cards.map((_, i) => React.createElement("span", {
        key: i,
        style: { width: 8, height: 8, borderRadius: "50%", background: i === idx ? "var(--indigo-600)" : i < idx ? "var(--indigo-300)" : "var(--slate-200)" },
      })),
    ),
    React.createElement("div", { key: "card", style: {
      background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: 16,
      padding: "28px 26px", minHeight: 260, display: "flex", flexDirection: "column", gap: 14,
      boxShadow: "var(--shadow-sm)",
    } },
      React.createElement("div", { style: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)", fontWeight: 700 } }, `${idx + 1} / ${plan.cards.length}`),
      React.createElement("h2", { style: { margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text-strong)", lineHeight: 1.3 } }, card.heading),
      React.createElement("div", { style: { fontSize: 16, lineHeight: 1.7, color: "var(--text-body)" }, dangerouslySetInnerHTML: html(card.body) }),
      card.example && React.createElement("div", { style: { marginTop: "auto", padding: "12px 14px", background: "var(--surface-muted)", borderRadius: 10, fontSize: 14, lineHeight: 1.65 }, dangerouslySetInnerHTML: html(card.example) }),
    ),
    React.createElement("div", { key: "nav", style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18, gap: 12 } },
      React.createElement("button", {
        onClick: () => setIdx((i) => Math.max(0, i - 1)),
        disabled: idx === 0,
        style: { padding: "12px 20px", borderRadius: 12, border: "1px solid var(--border-default)", background: idx === 0 ? "var(--surface-muted)" : "var(--surface-card)", color: idx === 0 ? "var(--text-faint)" : "var(--text-body)", cursor: idx === 0 ? "default" : "pointer", fontFamily: "var(--font-sans)", fontWeight: 600 },
      }, "← " + L("Back", "Назад", "Назад", "Précédent", "Zurück")),
      isLast
        ? (markedRead
            ? React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, color: "var(--emerald-600)", fontWeight: 600, fontSize: 15 } },
                React.createElement("span", { style: { fontSize: 20 } }, "✓"),
                L("+50 XP", "+50 XP", "+50 XP", "+50 XP", "+50 XP"),
              )
            : React.createElement("button", {
                onClick: markAsRead,
                style: { padding: "12px 24px", borderRadius: 999, background: "var(--indigo-600)", color: "#fff", border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "var(--font-sans)" },
              }, L("Got it · +50 XP", "Зрозумів · +50 XP", "Понял · +50 XP", "Compris · +50 XP", "Verstanden · +50 XP")))
        : React.createElement("button", {
            onClick: () => setIdx((i) => Math.min(plan.cards.length - 1, i + 1)),
            style: { padding: "12px 20px", borderRadius: 12, background: "var(--indigo-600)", color: "#fff", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", fontWeight: 700 },
          }, L("Next", "Далі", "Далее", "Suivant", "Weiter") + " →"),
    ),
  ]);
}

// Picker — asked every time the student opens Learn mode. Five methods,
// no persistence: the "right" method depends on the topic and the mood, not
// on a permanent setting somewhere the student would forget to change.
function LearnMethodPicker({ topic, onExit, onPick, t }) {
  const resolved = React.useMemo(() => window.resolveTopicForBrain ? window.resolveTopicForBrain(topic) : null, [topic]);
  const copy = learnCopyCode(resolved, t?.code);
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[copy] || en);
  const recommended = recommendLearnMethod({ firstVisit: true });
  const wrap = (children) => React.createElement("div", {
    style: { maxWidth: 720, margin: "0 auto", padding: "24px 20px", fontFamily: "var(--font-sans)" },
  }, children);
  const cardStyle = { flex: "1 1 240px", padding: "24px 22px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: 16, cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)", display: "flex", flexDirection: "column", gap: 10, transition: "border-color 120ms" };
  const card = (id, emoji, title, blurb) => {
    const rec = recommended === id;
    return React.createElement("button", {
      key: id,
      onClick: () => onPick(id),
      style: { ...cardStyle, borderColor: rec ? "var(--indigo-400)" : "var(--border-default)" },
    },
      rec && React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: "var(--indigo-600)", textTransform: "uppercase", letterSpacing: "0.06em" } },
        L("Recommended", "Рекомендовано", "Рекомендуем", "Recommandé", "Empfohlen")),
      React.createElement("div", { style: { fontSize: 28 } }, emoji),
      React.createElement("div", { style: { fontSize: 17, fontWeight: 700, color: "var(--text-strong)" } }, title),
      React.createElement("div", { style: { fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 } }, blurb),
    );
  };
  return wrap([
    React.createElement("div", { key: "hdr", style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 18 } },
      React.createElement("button", { onClick: onExit, style: { background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-muted)", padding: 0 } }, "←"),
      React.createElement("span", { style: { fontSize: 11, textTransform: "uppercase", color: "var(--text-faint)", letterSpacing: "0.08em", fontWeight: 600 } },
        L("How do you want to learn?", "Як ви хочете вчити?", "Как хотите учить?", "Comment veux-tu apprendre ?", "Wie möchtest du lernen?")),
    ),
    React.createElement("h1", { key: "title", style: { margin: "0 0 24px", fontSize: 22, fontWeight: 700, color: "var(--text-strong)", lineHeight: 1.3 } }, topic),
    React.createElement("div", { key: "opts", style: { display: "flex", gap: 14, flexWrap: "wrap" } },
      card("theory", "📖",
        L("Full theory page", "Повна теорія", "Полная теория", "Théorie complète", "Vollständige Theorie"),
        L("Structured read — TL;DR, concepts, worked examples, common mistakes, cheat sheet.",
          "Структурований конспект — TL;DR, концепції, приклади, помилки, шпаргалка.",
          "Структурированный конспект — TL;DR, концепции, примеры, ошибки, шпаргалка.",
          "Lecture structurée — TL;DR, concepts, exemples, erreurs, aide-mémoire.",
          "Strukturierte Lektüre — TL;DR, Konzepte, Beispiele, Fehler, Spickzettel.")),
      card("flashcards", "🎴",
        L("Flashcards", "Картки", "Карточки", "Cartes", "Karteikarten"),
        L("6-10 bite-sized cards, one concept each. Swipe through at your pace.",
          "6-10 коротких карток, по одному концепту. Гортайте у своєму темпі.",
          "6-10 коротких карточек, по одному концепту. Листайте в своём темпе.",
          "6-10 cartes courtes, un concept chacune. Passe à ton rythme.",
          "6-10 kurze Karten, ein Konzept pro Karte. Blättere in deinem Tempo.")),
      card("socratic", "💬",
        L("Explain with the coach", "Пояснити разом", "Объяснить вместе", "Expliquer ensemble", "Gemeinsam erklären"),
        L("The coach asks. You find the idea. One hint if you stall.",
          "Коуч питає. Ви самі виводите ідею. Одна підказка, якщо застрягли.",
          "Коуч спрашивает. Вы сами выводите идею. Одна подсказка, если застряли.",
          "Le coach questionne. Tu trouves l’idée. Un indice si tu bloques.",
          "Der Coach fragt. Du findest die Idee. Ein Tipp, wenn du hängst.")),
      card("fading", "🪜",
        L("Step by step", "Крок за кроком", "Шаг за шагом", "Étape par étape", "Schritt für Schritt"),
        L("A worked example that hides one more step each level. You fill the gaps.",
          "Розв’язок, де кожен рівень ховає ще один крок. Ви заповнюєте пропуски.",
          "Решение, где каждый уровень прячет ещё один шаг. Вы заполняете пропуски.",
          "Un exemple travaillé qui cache une étape de plus. Tu complètes.",
          "Ein Beispiel, das pro Level einen Schritt mehr verbirgt.")),
      card("feynman", "🎤",
        L("Explain it back", "Поясни мені", "Объясни мне", "Explique-moi", "Erklär es"),
        L("Teach a beginner in 60–90 seconds. Voice or text. The coach grades gaps.",
          "Поясніть новачку за 60–90 секунд. Голос або текст. Коуч знайде прогалини.",
          "Объясните новичку за 60–90 секунд. Голос или текст. Коуч найдёт пробелы.",
          "Explique à un débutant en 60–90 s. Voix ou texte.",
          "Erkläre einem Anfänger in 60–90 s. Stimme oder Text.")),
      topicAllowsSpeaking(topic) && card("speaking", "🎙️",
        L("Speaking", "Говоріння", "Говорение", "Expression orale", "Sprechen"),
        L("Cue card, then talk. Whisper transcribes. The coach gives IELTS-style bands.",
          "Картка, потім говорите. Whisper пише текст. Коуч ставить бали як на IELTS.",
          "Карточка, потом говорите. Whisper пишет текст. Коуч ставит баллы как на IELTS.",
          "Carte, puis tu parles. Whisper transcrit. Notes style IELTS.",
          "Karte, dann sprechen. Whisper schreibt. IELTS-Bänder.")),
    ),
  ]);
}

function topicAllowsSpeaking(topic) {
  const resolved = window.resolveTopicForBrain && window.resolveTopicForBrain(topic);
  if (!resolved || !window.getExams) return /ielts|toefl/i.test(topic || "");
  const exam = window.getExams().find((e) => e.id === resolved.examId);
  const qual = (window.examQualificationId && window.examQualificationId(exam)) || (exam && exam.qualificationId) || "";
  return qual === "ielts" || qual === "toefl" || /ielts|toefl/i.test(topic || "");
}

function LessonEngine({ topic, mode, onExit, t }) {
  // Learn mode: pick method (theory reader vs flashcards) first, then
  // delegate. Practice and review skip the picker.
  const [learnMethod, setLearnMethod] = React.useState(null);
  // Topic can swap while the reader is open — LearnTheoryReader's
  // "Related concepts" pills call this to jump to a new topic without
  // leaving the section. Falls back to the initial prop otherwise.
  const [activeTopic, setActiveTopic] = React.useState(topic);
  React.useEffect(() => { setActiveTopic(topic); }, [topic]);
  if (mode === "learn") {
    if (!learnMethod) {
      return React.createElement(LearnMethodPicker, { topic: activeTopic, onExit, t, onPick: setLearnMethod });
    }
    if (learnMethod === "flashcards") {
      return React.createElement(LearnFlashcards, { topic: activeTopic, onExit, t });
    }
    if (learnMethod === "socratic") {
      return React.createElement(SocraticDialog, { topic: activeTopic, onExit, t });
    }
    if (learnMethod === "fading") {
      return React.createElement(FadingDialog, { topic: activeTopic, onExit, t });
    }
    if (learnMethod === "feynman") {
      return React.createElement(FeynmanDialog, { topic: activeTopic, onExit, t });
    }
    if (learnMethod === "speaking") {
      return React.createElement(SpeakingDialog, { topic: activeTopic, onExit, t });
    }
    return React.createElement(LearnTheoryReader, { topic: activeTopic, onExit, t, onOpenTopic: setActiveTopic });
  }
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

  const answerMcq = (idx, correct, explanation, question, options) => {
    if (selected !== null) return;
    const isCorrect = idx === correct;
    setSelected(idx);
    setRevealed(true);
    setResults((r) => [...r, { type: "mcq", correct: isCorrect }]);
    registerAnswer(isCorrect, isCorrect ? 20 : 5);
    if (resolved && window.recordReview) window.recordReview({ examId: resolved.examId, topicIdx: resolved.topicIdx, topicName: resolved.topicName, correct: isCorrect });
    if (!isCorrect && resolved && window.logMistake) {
      // Question and options come in as arguments rather than being re-read
      // from `plan.steps[step]` — the old lookup also carried a dead
      // `type === "checkpoint"` branch (checkpoints render LessonCheckpoint,
      // which never reaches here) and logged the literal string "checkpoint"
      // as the question.
      window.logMistake({
        topic: resolved.topicName, question: question || "",
        options, correctIndex: correct, selectedIndex: idx, explanation,
        examId: resolved.examId, topicIdx: resolved.topicIdx,
      });
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
    return React.createElement(WaitPress, {
      title: L("Building your lesson...", "Створюємо ваш урок...", "Создаём ваш урок...", "Création de votre leçon...", "Deine Lektion wird erstellt..."),
      subtitle: `${L("Topic", "Тема", "Тема", "Sujet", "Thema")}: ${topic}`,
      lang: t?.code,
    });
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
          ? _badge("linear-gradient(135deg,var(--amber-500),var(--amber-600))", "var(--white)", L("🔥 HOOK QUESTION", "🔥 ВСТУПНЕ ПИТАННЯ", "🔥 ВВОДНЫЙ ВОПРОС", "🔥 QUESTION D'ACCROCHE", "🔥 EINSTIEGSFRAGE"))
          : _badge("linear-gradient(135deg,var(--indigo-500),var(--indigo-600))", "var(--white)", L("⚡ QUESTION", "⚡ ПИТАННЯ", "⚡ ВОПРОС", "⚡ QUESTION", "⚡ FRAGE")),
        diff && _badge(diff === "hard" ? "var(--red-50)" : diff === "easy" ? "var(--emerald-50)" : "var(--amber-50)", diff === "hard" ? "var(--red-700)" : diff === "easy" ? "var(--emerald-700)" : "var(--amber-700)", diff)),
      React.createElement("p", { style: { fontWeight: 600, fontSize: 16, margin: "0 0 16px", color: "var(--text-strong)", lineHeight: 1.5 }, dangerouslySetInnerHTML: { __html: _md(question) } }),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
        ...options.map((opt, i) => {
          const isCor = i === correct, isSel = i === selected;
          let bg = "var(--surface-card)", bc = "var(--border-default)", col = "var(--text-body)", lbg = "var(--slate-100)", lcol = "var(--slate-400)";
          if (revealed) {
            if (isCor) { bg = "var(--emerald-50)"; bc = "var(--emerald-500)"; col = "var(--emerald-700)"; lbg = "var(--emerald-500)"; lcol = "var(--white)"; }
            else if (isSel) { bg = "var(--red-50)"; bc = "var(--red-500)"; col = "var(--red-700)"; lbg = "var(--red-500)"; lcol = "var(--white)"; }
            else { col = "var(--slate-300)"; bc = "var(--slate-100)"; }
          }
          return React.createElement("button", {
            key: i, disabled: revealed, onClick: () => answerMcq(i, correct, explanation, question, options),
            style: { display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: bg, border: `1.5px solid ${bc}`, borderRadius: 14, color: col, fontSize: 14, textAlign: "left", cursor: revealed ? "default" : "pointer", width: "100%", fontFamily: "var(--font-sans)", transition: "all 0.15s" }
          },
            React.createElement("span", { style: { width: 28, height: 28, borderRadius: 8, background: lbg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: lcol, flexShrink: 0 } }, ["A", "B", "C", "D"][i]),
            React.createElement("span", { style: { lineHeight: 1.45, fontWeight: 500 }, dangerouslySetInnerHTML: { __html: _md(opt) } }));
        })),
      revealed && React.createElement("div", {
        style: { marginTop: 14, padding: "12px 16px", background: selected === correct ? "linear-gradient(135deg, var(--emerald-50), var(--emerald-50))" : "linear-gradient(135deg, var(--amber-50), var(--amber-100))", border: `1px solid ${selected === correct ? "var(--emerald-100)" : "var(--amber-200)"}`, borderRadius: 12, fontSize: 14, color: selected === correct ? "var(--emerald-700)" : "var(--amber-700)", lineHeight: 1.6 },
        dangerouslySetInnerHTML: { __html: (selected === correct ? "✅ " : "💡 ") + _md(explanation) },
      })),
    revealed && React.createElement("div", { style: { marginTop: 16 } }, _btn(L("Continue →", "Продовжити →", "Продолжить →", "Continuer →", "Weiter →"), advance, true, false)));

  const renderTf = (isHook) => React.createElement("div", { style: { animation: "fadeUp 0.3s ease-out" } },
    isHook && React.createElement("div", { style: { marginBottom: 12, padding: "10px 16px", background: "linear-gradient(135deg,var(--amber-100),var(--amber-200))", border: "1px solid var(--amber-500)", borderRadius: 12, fontSize: 13, color: "var(--amber-700)", fontWeight: 600 } },
      L("🔥 Before we explain anything — take a guess:", "🔥 Перш ніж ми все пояснимо — спробуйте вгадати:", "🔥 Прежде чем мы всё объясним — попробуйте угадать:", "🔥 Avant toute explication — devinez :", "🔥 Bevor wir etwas erklären — rate mal:")),
    React.createElement("div", { style: { background: "var(--surface-card)", border: isHook ? "2px solid var(--amber-500)" : "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 } },
      React.createElement("div", { style: { marginBottom: 14 } }, isHook ? _badge("linear-gradient(135deg,var(--amber-500),var(--amber-600))", "var(--white)", L("🔥 HOOK QUESTION", "🔥 ВСТУПНЕ ПИТАННЯ", "🔥 ВВОДНЫЙ ВОПРОС", "🔥 QUESTION D'ACCROCHE", "🔥 EINSTIEGSFRAGE")) : _badge("var(--indigo-50)", "var(--indigo-600)", L("✋ TRUE OR FALSE", "✋ ПРАВДА ЧИ НЕПРАВДА", "✋ ПРАВДА ИЛИ ЛОЖЬ", "✋ VRAI OU FAUX", "✋ WAHR ODER FALSCH"))),
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
          style: { padding: "12px 20px", background: fillInput.trim() ? "var(--indigo-600)" : "var(--indigo-200)", color: "var(--white)", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: fillInput.trim() ? "pointer" : "default", fontFamily: "var(--font-sans)" }
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
        if (isWeakTeachBack(explainInput, s.prompt)) {
          const fail = failClosedExplain();
          setExplainFeedback(fail.feedback + " ⭐");
          setXp((x) => x + 10);
          setExplainLoading(false);
          return;
        }
        const reply = await window.brainComplete({
          system: `You are grading a student's explanation. They were asked: "${s.prompt}". The ideal answer covers: ${s.ideal}. Grade their attempt — be encouraging but honest. If they missed key points, name them specifically. If they nailed it, tell them what was good. 2-3 sentences max. End with a score: ⭐ (weak), ⭐⭐ (okay), ⭐⭐⭐ (great).`,
          messages: [{ role: "user", content: explainInput }],
          topicContext: resolved ? { examId: resolved.examId, topicName: resolved.topicName } : undefined,
          paperQual: _paperQualOf(window.getExams ? window.getExams().find((e) => e.id === resolved?.examId) : null),
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
        React.createElement("div", { style: { marginBottom: 14 } }, _badge("linear-gradient(135deg,var(--indigo-600),var(--indigo-500))", "var(--white)", L("🧠 EXPLAIN IT BACK", "🧠 ПОЯСНІТЬ СВОЇМИ СЛОВАМИ", "🧠 ОБЪЯСНИТЕ СВОИМИ СЛОВАМИ", "🧠 EXPLIQUEZ-LE", "🧠 ERKLÄR ES ZURÜCK"))),
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
              React.createElement("div", { style: { width: 28, height: 28, borderRadius: "50%", background: vis ? "linear-gradient(135deg,var(--indigo-600),var(--indigo-500))" : "var(--surface-muted)", color: vis ? "var(--white)" : "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, transition: "background 0.3s" } }, i + 1),
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
      className: "ux-overlay",
      style: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
      onClick: dismissLearnTooltip,
    },
      React.createElement("div", {
        className: "ux-modal",
        style: { background: "var(--surface-card)", borderRadius: 20, padding: "28px 26px", maxWidth: 360, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" },
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
          style: { width: "100%", padding: "12px 0", background: "var(--indigo-600)", color: "var(--white)", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }
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
        React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, background: "var(--ink-900)", color: "var(--white)", fontSize: 11, fontWeight: 800, fontFamily: "var(--font-display)", letterSpacing: "0.02em", flexShrink: 0 } },
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
                window.brainComplete({
                  system: `You're a tutor answering a quick question DURING a lesson on "${topic}". ${stepCtx}\nBe concise — 2-4 sentences max. Use **bold** for key terms. Don't repeat what the step already says; add new insight.`,
                  messages: [{ role: "user", content: q }],
                  topicContext: resolved ? { examId: resolved.examId, topicName: resolved.topicName } : undefined,
                  paperQual: _paperQualOf(window.getExams ? window.getExams().find((e) => e.id === resolved?.examId) : null),
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
              window.brainComplete({
                system: `You're a tutor answering a quick question DURING a lesson on "${topic}". ${stepCtx}\nBe concise — 2-4 sentences max. Use **bold** for key terms. Don't repeat what the step already says; add new insight.`,
                messages: [{ role: "user", content: q }],
                topicContext: resolved ? { examId: resolved.examId, topicName: resolved.topicName } : undefined,
                paperQual: _paperQualOf(window.getExams ? window.getExams().find((e) => e.id === resolved?.examId) : null),
              }).then((r) => { setAskReply(r); setAskLoading(false); })
                .catch(() => { setAskReply(L("Couldn't get an answer right now — try again.", "Не вдалося отримати відповідь зараз — спробуйте ще раз.", "Не удалось получить ответ сейчас — попробуйте ещё раз.", "Impossible d'obtenir une réponse pour le moment — réessayez.", "Antwort konnte gerade nicht abgerufen werden — versuche es erneut.")); setAskLoading(false); });
            },
            style: { background: askInput.trim() && !askLoading ? "var(--indigo-600)" : "var(--indigo-200)", color: "var(--white)", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: askInput.trim() && !askLoading ? "pointer" : "default", fontFamily: "var(--font-sans)" }
          }, L("Ask", "Запитати", "Спросить", "Demander", "Fragen")))),
      // Floating button
      React.createElement("button", {
        onClick: () => { setAskOpen((v) => !v); if (!askOpen) { setAskReply(null); setAskInput(""); } },
        style: { width: 48, height: 48, borderRadius: "50%", background: askOpen ? "var(--indigo-700)" : "linear-gradient(135deg,var(--indigo-500),var(--indigo-600))", border: "none", color: "var(--white)", fontSize: 22, cursor: "pointer", boxShadow: "0 4px 20px rgba(79,70,229,0.4)", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.15s, background 0.15s" }
      }, askOpen ? "✕" : "💬")));
}

// ─── CHAT MODE (freeform) ────────────────────────────────────────────────────

function ChatMode({ onExit, initialQuery, t }) {
  const studentQuals = (window.getExams ? window.getExams() : []).map((e) => _paperQualOf(e));
  const coachQual = inferCoachQual({ studentQuals });
  const copy = copyLangFor(coachQual, t?.code || "en");
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[copy] || en);
  // v2 keys — old chat sessions cached a generic greeting bubble that has
  // no place in the dashboard-first layout, so this intentionally starts fresh
  // instead of resurrecting stale messages from the pre-dashboard chat.
  const STORAGE_KEY = "aicoach_chat_msgs_v2";
  const HISTORY_KEY = "aicoach_chat_hist_v2";
  const [messages, setMessages] = React.useState(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } });
  const [input, setInput] = React.useState("");
  const [attachments, setAttachments] = React.useState([]);
  const [attachError, setAttachError] = React.useState("");
  const fileInputRef = React.useRef(null);
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
  const [copiedId, setCopiedId] = React.useState(null);

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

  React.useEffect(() => {
    try {
      // UI transcript keeps name/kind only — dataUrl/base64 would blow the
      // 5 MB localStorage cap on a couple of screenshots. Live state still
      // holds the preview for this session.
      const slim = messages.map((m) => (m.attachments
        ? { ...m, attachments: m.attachments.map((f) => ({ kind: f.kind, name: f.name, ext: f.ext })) }
        : m));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(historyRef.current));
    } catch {}
  }, [messages]);
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

  // Reads a batch into base64 descriptors. Images and PDFs go to Claude as
  // native vision/document blocks — a photo of a textbook problem is the whole
  // point of this feature — while text files are inlined.
  const attachFiles = async (list) => {
    const incoming = Array.from(list || []);
    if (!incoming.length) return;
    const lang = (window.getProfile && window.getProfile().lang) || "en";
    const { accepted, rejected } = validateFiles(incoming, attachments, CHAT_LIMITS);
    const problems = rejected.map((r) => rejectionSummary([r], lang, CHAT_LIMITS));

    const read = [];
    for (const file of accepted) {
      try {
        read.push(...(await extractStudyFile(file)));
      } catch (err) {
        problems.push(describeStudyFileError(err, file.name || "file", lang));
      }
    }
    if (read.length) setAttachments((a) => a.concat(read));
    setAttachError(problems.filter(Boolean).join(" · "));
  };

  const send = async (raw) => {
    const text = (typeof raw === "string" ? raw : "").trim();
    // An attachment on its own is a legitimate message — "here is the problem,
    // help" — so text is only required when nothing is attached.
    if ((!text && !attachments.length) || typing) return;

    const sent = attachments;
    const content = sent.length
      ? toClaudeBlocks(sent).concat([{ type: "text", text: text || "Explain what is in the attached file(s)." }])
      : text;

    historyRef.current = [...historyRef.current, { role: "user", content }];
    setMessages((m) => [...m, { id: Date.now() + Math.random(), role: "user", text, attachments: sent }]);
    setInput("");
    setAttachments([]);
    setAttachError("");
    setTyping(true);
    try {
      const prof = window.getProfile ? window.getProfile() : {};
      const profileCtx = [prof.country && `country: ${prof.country}`, prof.educationLevel && `education: ${prof.educationLevel}`, prof.currentYear && `year: ${prof.currentYear}`].filter(Boolean).join(", ");
      const reply = await window.brainComplete({
        system: `You are a brilliant, warm personal tutor.${profileCtx ? ` Student profile: ${profileCtx}.` : ""}
Answer clearly. Use **bold** for key terms. Keep it under 150 words unless the student explicitly asks for depth. Do NOT output JSON — just natural text.

FORMATTING:
- Write MATH using LaTeX: inline as $x^2 + 1$, display as $$\\frac{a}{b}$$. NEVER use ^, ², or unicode superscripts — the client renders LaTeX to real formulas.
- Section titles as ## Title on their own line. The client renders them — never leave raw hashes in a sentence.
- Use short paragraphs (2-3 sentences each). Blank line between paragraphs.
- Bullet lists start with "- " on their own line.
- Number multi-step solutions as "1. ", "2. ", etc.
- Tables as GitHub pipes when comparing cases. Fenced code only for actual code.

After your answer, on a NEW line write "---ACTIONS---" followed by a JSON array of 2-3 follow-up actions the student can take, like: [{"text":"Practice this","icon":"🎯"},{"text":"Explain simpler","icon":"💡"}]
If no actions fit, omit the ACTIONS line entirely.`,
        messages: historyRef.current,
        paperQual: coachQual,
      });
      setTyping(false);
      // Parse actions from response
      let mainText = reply, actions = null;
      const actIdx = reply.indexOf("---ACTIONS---");
      if (actIdx !== -1) {
        mainText = reply.slice(0, actIdx).trim();
        try {
          const actRaw = reply.slice(actIdx + 13).trim();
          actions = window.parseJSON ? window.parseJSON(actRaw, null, "chat-actions") : JSON.parse(actRaw.slice(actRaw.indexOf("["), actRaw.lastIndexOf("]") + 1));
        } catch {}
      }
      pushAI(mainText, actions);
    } catch (e) {
      setTyping(false);
      // Real server message (e.g. a specific payload-too-large or quota
      // reason) instead of always showing the same generic line — see
      // src/lib/ai-error.ts. A bare network failure with no HTTP response
      // still falls back to the generic phrase there.
      pushAI(describeAiError(e, t?.code || "en"));
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

  function copyCoachText(text, id) {
    if (!text || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1600);
    }).catch(() => {});
  }
  function onCoachCopyClick(e) {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;
    e.preventDefault();
    copyCoachText(btn.getAttribute("data-copy") || "", btn);
  }

  const renderSentFiles = (files) => {
    if (!files || !files.length) return [];
    return files.map((f, i) => {
      if (f.kind === "image" && f.dataUrl) {
        return React.createElement("img", {
          key: `${f.name}-${i}`,
          src: f.dataUrl,
          alt: f.name || "",
          style: { display: "block", maxWidth: 220, width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 10 },
        });
      }
      const icon = f.kind === "image" ? "🖼️" : (f.kind === "pdf" || f.ext === "pdf") ? "📄" : "📎";
      return React.createElement("div", {
        key: `${f.name}-${i}`,
        style: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, lineHeight: 1.3 },
      },
        React.createElement("span", { "aria-hidden": true }, icon),
        React.createElement("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 } }, f.name || L("File", "Файл", "Файл", "Fichier", "Datei")));
    });
  };

  // ── Chat messages — rendered below dashboard ──
  const renderChat = () => React.createElement("div", { style: { padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 14 }, onClick: onCoachCopyClick },
    ...messages.map((m) =>
      React.createElement(React.Fragment, { key: m.id },
        React.createElement("div", { style: { display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 10, alignItems: "flex-start" } },
          m.role === "ai" && React.createElement(CoachIcon, { size: 28 }),
          m.role === "user"
            ? React.createElement("div", {
                style: { maxWidth: "80%", minWidth: (m.attachments && m.attachments.length) ? 148 : undefined, background: "var(--indigo-600)", color: "var(--white)", border: "none", padding: "10px 12px", borderRadius: 16, borderTopRightRadius: 4, fontSize: 14, lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 8 },
              },
                ...renderSentFiles(m.attachments),
                m.text && m.text.trim()
                  ? React.createElement("div", { dangerouslySetInnerHTML: { __html: _md(m.text) } })
                  : null)
            : React.createElement("div", {
                className: "aicoach-msg",
                style: { maxWidth: "80%", background: "var(--surface-card)", color: "var(--text-body)", border: "1px solid var(--border-subtle)", padding: "14px 18px", borderRadius: 16, borderTopLeftRadius: 4, fontSize: 15, lineHeight: 1.72 },
                dangerouslySetInnerHTML: { __html: _md(m.text) },
              })),
        m.role === "ai" && React.createElement("div", {
          style: { display: "flex", gap: 6, flexWrap: "wrap", paddingLeft: 38, alignItems: "center" }
        },
          React.createElement("button", {
            type: "button",
            onClick: () => copyCoachText(m.text, m.id),
            style: { padding: "6px 12px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font-sans)" },
          }, copiedId === m.id ? L("Copied", "Скопійовано", "Скопировано", "Copié", "Kopiert") : L("Copy", "Копіювати", "Копировать", "Copier", "Kopieren")),
          ...(Array.isArray(m.actions) ? m.actions.map((a, i) => React.createElement("button", {
            key: i, onClick: () => send(a.text),
            style: { display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "var(--surface-card)", border: "1px solid var(--indigo-500)", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "var(--indigo-700)", cursor: "pointer", fontFamily: "var(--font-sans)" }
          }, a.icon && React.createElement("span", null, a.icon), a.text)) : [])))),
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
    const topics = dropIeltsSpeakingTopics(
      ((exam && exam.topics) || []).map((tp) => ({
        name: tp.topicName || tp.name, retention: tp.lastSeen ? Math.round(tp.retention * 100) : null, unseen: !tp.lastSeen,
      })),
      (tp) => tp.name,
      exam && exam.qualificationId,
    ).sort((a, b) => (a.retention ?? -1) - (b.retention ?? -1));
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

    // Attachment chips — sit above the input so the student can see and remove
    // what is about to be sent.
    (attachments.length > 0 || attachError) && React.createElement("div", { style: { padding: "8px 16px 0", background: "var(--surface-card)", display: "flex", flexDirection: "column", gap: 6 } },
      attachments.length > 0 && React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 } },
        ...attachments.map((f, i) => React.createElement("span", {
          key: `${f.name}-${i}`,
          style: { display: "inline-flex", alignItems: "center", gap: 6, maxWidth: 220, padding: "4px 8px", background: "var(--surface-page)", border: "1px solid var(--border-default)", borderRadius: 8, fontSize: 11, color: "var(--text-body)" }
        },
          f.kind === "image"
            ? React.createElement("img", { src: f.dataUrl, alt: "", style: { width: 18, height: 18, objectFit: "cover", borderRadius: 4, display: "block" } })
            : React.createElement("span", null, f.kind === "pdf" || f.ext === "pdf" ? "📄" : "📃"),
          React.createElement("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, f.name),
          React.createElement("button", {
            onClick: () => setAttachments((a) => a.filter((_, j) => j !== i)),
            "aria-label": L("Remove", "Видалити", "Удалить", "Retirer", "Entfernen"),
            style: { border: "none", background: "transparent", cursor: "pointer", color: "var(--text-faint)", fontSize: 13, lineHeight: 1, padding: 0 }
          }, "\u2715")))),
      attachError && React.createElement("p", { role: "alert", style: { margin: 0, fontSize: 11, color: "var(--red-600)" } }, attachError)),

    // Input area
    React.createElement("div", { style: { padding: "12px 16px", borderTop: "1px solid var(--border-subtle)", background: "var(--surface-card)", display: "flex", gap: 8, alignItems: "flex-end" } },
      React.createElement("input", { ref: fileInputRef, type: "file", multiple: true, accept: ACCEPT_ATTRIBUTE, onChange: (e) => { attachFiles(e.target.files); e.target.value = ""; }, style: { display: "none" } }),
      React.createElement("button", {
        onClick: () => fileInputRef.current && fileInputRef.current.click(),
        disabled: typing,
        title: L("Attach files", "Прикріпити файли", "Прикрепить файлы", "Joindre des fichiers", "Dateien anhängen"),
        "aria-label": L("Attach files", "Прикріпити файли", "Прикрепить файлы", "Joindre des fichiers", "Dateien anhängen"),
        style: { flexShrink: 0, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid var(--border-default)", borderRadius: 12, cursor: typing ? "default" : "pointer", color: "var(--text-muted)", fontSize: 16 }
      }, "\uD83D\uDCCE"),
      React.createElement("textarea", { ref: inputRef, value: input, onChange: (e) => setInput(e.target.value), onKeyDown: (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }, placeholder: L("Ask anything…", "Запитайте що завгодно…", "Спросите что угодно…", "Posez toutes vos questions…", "Frag alles…"), rows: 1, style: { flex: 1, border: "1px solid var(--border-default)", borderRadius: 12, padding: "10px 14px", fontSize: 13, fontFamily: "var(--font-sans)", color: "var(--text-body)", background: "var(--surface-page)", resize: "none", outline: "none", lineHeight: 1.5, maxHeight: 100, overflowY: "auto" } }),
      (() => { const canSend = (input.trim() || attachments.length) && !typing; return React.createElement("button", { onClick: () => send(input), disabled: !canSend, style: { background: canSend ? "var(--indigo-600)" : "var(--indigo-200)", color: "var(--white)", border: "none", borderRadius: 12, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: canSend ? "pointer" : "default", fontFamily: "var(--font-sans)" } }, L("Send", "Надіслати", "Отправить", "Envoyer", "Senden")); })()));
}

// ─── MAIN ROUTER ─────────────────────────────────────────────────────────────

function AIChat({ t, initialQuery, onConsumeQuery }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
  const [mode, setMode] = React.useState(null);
  // Set by a recap's "Drill weak topics" CTA before switching to Practice, so
  // the drill opens pre-filtered to the topics the student just lost marks on.
  // Lives here rather than inside PracticeEngine because the mock-exam recap
  // (a different engine) is what usually sets it.
  const [practiceSeed, setPracticeSeed] = React.useState(null);
  const [topic, setTopic] = React.useState(null);
  const [topicPicker, setTopicPicker] = React.useState(false);
  const [expandedFolders, setExpandedFolders] = React.useState({}); // examId -> bool, "show all N" toggle in the topic picker
  const [customTopicFor, setCustomTopicFor] = React.useState(null);  // examId whose "add your own topic" input is open
  const [customTopicText, setCustomTopicText] = React.useState("");
  const [proGate, setProGate] = React.useState(null); // { freeCount, lockedCount } | null
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

  const exitToLobby = () => { setMode(null); setTopic(null); setTopicPicker(false); setReviewTopic(null); setPracticeSeed(null); };
  // Learn back stays on the topic folders — lobby forces an extra tap
  // through the mode cards just to pick the next section.
  const exitToLearnTopics = () => { setTopic(null); setMode(null); setTopicPicker(true); };
  const drillTopics = (examId, topics) => { setPracticeSeed({ examId, topics }); setMode("practice"); };
  // Finishing one review returns to the QUEUE (not the lobby) so "clear the
  // stack" is one continuous flow — the queue re-derives from the brain, so
  // the topic just reviewed drops out or shows its new retention.
  const exitToQueue = () => setReviewTopic(null);

  // Active mode screens
  if (mode === "learn" && topic) return React.createElement(LessonEngine, { topic, mode: "learn", onExit: exitToLearnTopics, t });
  if (mode === "chat") return React.createElement(ChatMode, { onExit: exitToLobby, initialQuery: pendingChatQuery, t });

  // Review mode — Quick Check session from the queue
  if (mode === "review" && reviewTopic) {
    const isQuick = reviewTopic === "__quick__";
    const notSpeaking = (t) => {
      const ev = (brain.examViews || []).find((e) => e.id === t.examId || e.name === t.examName);
      return !isIeltsSpeakingTopic(t.topicName, ev && ev.qualificationId);
    };
    const quickTopic = isQuick ? ((brain.dueReviews || []).find(notSpeaking)?.topicName || (brain.weakestTopics || []).find(notSpeaking)?.topicName || L("General review", "Загальний огляд", "Общий обзор", "Révision générale", "Allgemeine Wiederholung")) : null;
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
    const hideSpeaking = (t) => {
      const ev = (freshBrain.examViews || []).find((e) => e.id === t.examId || e.name === t.examName);
      return !isIeltsSpeakingTopic(t.topicName, ev && ev.qualificationId);
    };
    const queue = (freshBrain.dueReviews || []).filter(hideSpeaking);
    const weakFallback = (freshBrain.weakestTopics || []).filter((t) => t.lastSeen && hideSpeaking(t)).slice(0, 4);
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
    return React.createElement(PracticeEngine, { examViews, onExit: exitToLobby, seed: practiceSeed, t });
  }

  // Speed Round mode
  if (mode === "speed") {
    return React.createElement(SpeedRoundEngine, { examViews, onExit: exitToLobby, t });
  }

  // Exam Simulation — full timed mock exam covering ALL topics of one subject
  if (mode === "exam_sim") {
    return React.createElement(ExamSimEngine, { examViews, onExit: exitToLobby, onDrillTopics: drillTopics, t });
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
    // Append a student-proposed topic to this exam's course so it becomes a real,
    // progress-tracked topic (persisted), then open its AI-generated lesson.
    const addCustomTopic = (examId, rawText) => {
      const name = (rawText || "").trim();
      if (!name) return;
      const exam = (window.getExams ? window.getExams() : []).find((x) => x.id === examId);
      const course = exam && exam.courseId && window.getCourse ? window.getCourse(exam.courseId) : null;
      if (course && window.saveCourse) {
        const exists = (course.topics || []).some((tp) => String(tp.name || "").toLowerCase() === name.toLowerCase());
        if (!exists) {
          // saveCourse(courseId, patch) — pass a topics patch, not the whole course.
          window.saveCourse(course.id, { topics: [...(course.topics || []), { name, difficulty: 5, importance: 5, subtopics: [] }] });
        }
      }
      setCustomTopicFor(null); setCustomTopicText("");
      prefetchLesson(name, t?.code);
      setTopic(name); setTopicPicker(false); setMode("learn");
    };
    const rawExams = window.getExams ? window.getExams() : [];
    const folders = examViews.filter((e) => {
      const exam = rawExams.find((x) => x.id === e.id);
      return treeForExam(exam) || (e.topics || []).length > 0;
    });
    const treeRowsFor = (examView) => {
      const exam = rawExams.find((x) => x.id === examView.id);
      const tree = treeForExam(exam);
      if (!tree) return null;
      const flat = flattenLessonNodes(tree);
      const nodeState = ((window.getLearn && window.getLearn()) || {})[tree.examTaxonomy] || {};
      return flat.map((row) => {
        const mastery = nodeState[row.node.id] && nodeState[row.node.id].mastery;
        return {
          name: localize(row.node.title, copyLangFor(tree.examTaxonomy, t?.code || "en")),
          unitTitle: localize(row.unit.title, copyLangFor(tree.examTaxonomy, t?.code || "en")),
          studied: ["bronze", "silver", "gold", "legendary"].includes(mastery),
          premium: topicIsLocked(tree, row.node.id),
          index: row.index,
          total: flat.length,
        };
      });
    };

    // Deliberately NOT a flex column: the folder sections carry
    // `overflow: hidden` for their rounded corners, and as flex children they
    // shrink below their content once an expanded list outgrows this fixed
    // height — silently clipping the last rows (and the toggle) instead of
    // scrolling. Block layout keeps every section at its natural height.
    return ce("div", { style: { height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)", padding: "24px 20px", overflowY: "auto" } },
      ce("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 } },
        ce("button", { onClick: () => setTopicPicker(false), "aria-label": L("Back","Назад","Назад","Retour","Zurück"), style: { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted)", padding: 0 } }, "←"),
        ce("h2", { style: { margin: 0, fontSize: 18, fontWeight: 700, fontFamily: "var(--font-display)", letterSpacing: "-0.02em", color: "var(--text-strong)" } }, L("What do you want to learn?", "Що хочете вивчити?", "Что хотите изучить?", "Que voulez-vous apprendre ?", "Was möchtest du lernen?"))),
      ce("p", { style: { margin: "0 0 18px 28px", fontSize: 13, color: "var(--text-muted)" } },
        L("Pick a topic — finished ones show a green check.", "Оберіть тему — пройдені позначені зеленою галочкою.", "Выберите тему — пройденные отмечены зелёной галочкой.", "Choisissez un sujet — les terminés ont une coche verte.", "Wähle ein Thema — erledigte haben ein grünes Häkchen.")),

      folders.length === 0 && ce("p", { style: { fontSize: 14, color: "var(--text-muted)", margin: "20px 0" } },
        L("Add an exam first to build your topic list.", "Спершу додайте іспит, щоб з'явилися теми.", "Сначала добавьте экзамен, чтобы появились темы.", "Ajoutez d'abord un examen pour créer votre liste de sujets.", "Füge zuerst eine Prüfung hinzu, um deine Themenliste zu erstellen.")),

      ...folders.map((e, fi) => {
        const treeRows = treeRowsFor(e);
        const rows = treeRows || (e.topics || []).map((tp) => ({ tp, name: tp.topicName || tp.name, studied: !!tp.lastSeen, premium: false, unitTitle: null }));
        const doneCount = rows.filter((r) => r.studied).length;
        const ordered = treeRows ? rows : [...rows.filter((r) => !r.studied), ...rows.filter((r) => r.studied)];
        const pct = Math.round((doneCount / Math.max(1, rows.length)) * 100);
        const treeForRows = treeRows ? treeForExam(rawExams.find((x) => x.id === e.id)) : null;
        const freeN = treeForRows ? freeNodeCount(treeForRows) : rows.length;
        const proN = treeRows ? rows.length - freeN : 0;
        return ce("section", { key: e.id || fi, style: { marginBottom: 18, borderRadius: 18, border: "1px solid var(--border-subtle)", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)", overflow: "hidden" } },
          // Folder header
          ce("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)" } },
            ce("span", { style: { width: 10, height: 10, borderRadius: 3, background: e.color || "var(--indigo-500)", flexShrink: 0 } }),
            ce("div", { style: { flex: 1, minWidth: 0 } },
              ce("div", { style: { fontSize: 15, fontWeight: 700, fontFamily: "var(--font-display)", letterSpacing: "-0.01em", color: "var(--text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, e.name),
              ce("div", { style: { marginTop: 5, height: 5, borderRadius: 3, background: "var(--surface-sunken)", overflow: "hidden" } },
                ce("div", { style: { height: "100%", width: pct + "%", background: "var(--emerald-500)", borderRadius: 3, transition: "width var(--dur-slow) var(--ease-out)" } }))),
            ce("span", { style: { fontSize: 12, fontWeight: 700, color: "var(--text-muted)", fontFamily: "var(--font-mono)", flexShrink: 0 } }, doneCount + "/" + rows.length)),
          treeRows && proN > 0 && !isProUser() && ce("div", { style: { padding: "8px 16px", fontSize: 12, color: "var(--text-muted)", borderBottom: "1px solid var(--border-subtle)" } },
            L(`${freeN} free · ${proN} Pro`, `${freeN} безкоштовно · ${proN} Pro`, `${freeN} бесплатно · ${proN} Pro`, `${freeN} gratuits · ${proN} Pro`, `${freeN} gratis · ${proN} Pro`)),
          (() => {
            const PREVIEW_N = 3;
            const expanded = !!expandedFolders[e.id];
            // Expanded means the FULL syllabus — free and Pro alike. slice()
            // already returns everything when the list is shorter than the
            // preview, so there is no second cap anywhere in this path.
            const visible = expanded ? ordered : ordered.slice(0, PREVIEW_N);
            const hidden = Math.max(0, ordered.length - PREVIEW_N);
            return ce("div", { style: { display: "flex", flexDirection: "column" } },
              ...visible.map((r, ri) => ce("button", {
                key: ri,
                onClick: () => {
                  if (r.premium) { setProGate({ freeCount: freeN, lockedCount: proN }); return; }
                  setTopic(r.name); setTopicPicker(false); setMode("learn");
                },
                onMouseEnter: () => { if (!r.premium) prefetchLesson(r.name, t?.code); },
                onFocus: () => { if (!r.premium) prefetchLesson(r.name, t?.code); },
                style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 16px", background: r.studied ? "var(--surface-muted)" : "transparent", border: "none", borderTop: ri === 0 ? "none" : "1px solid var(--border-subtle)", cursor: "pointer", fontFamily: "var(--font-sans)", width: "100%", textAlign: "left" }
              },
                // Titles wrap. A 47-node Ukrainian syllabus has names far
                // wider than the card, and an ellipsis turned them into
                // guesswork ("Многочлени, розкладання на…").
                ce("span", {
                  style: {
                    flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.4,
                    fontWeight: r.studied ? 500 : 600,
                    color: r.studied ? "var(--text-muted)" : "var(--text-strong)",
                    overflowWrap: "anywhere",
                    // Locked rows stay in the list — the student should see the
                    // whole syllabus they're buying, just not read it yet.
                    filter: r.premium ? "blur(3.5px)" : "none",
                    opacity: r.premium ? 0.75 : 1,
                    userSelect: r.premium ? "none" : "auto",
                  },
                }, r.name),
                r.premium
                  ? ce("span", { style: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--indigo-600)", background: "var(--indigo-50)", padding: "3px 7px", borderRadius: 999, flexShrink: 0 } }, "🔒", "Pro")
                  : (r.tp ? statusPill(r.tp) : (r.studied ? ce("span", { style: { fontSize: 12, fontWeight: 700, color: "var(--emerald-700)", flexShrink: 0 } }, "✓") : null)))),
              (ordered.length > PREVIEW_N) && ce("button", {
                onClick: () => setExpandedFolders((m) => ({ ...m, [e.id]: !expanded })),
                style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 16px", background: "transparent", border: "none", borderTop: "1px solid var(--border-subtle)", cursor: "pointer", fontFamily: "var(--font-sans)", width: "100%", fontSize: 13, fontWeight: 700, color: "var(--indigo-600)" }
              },
                expanded
                  ? L("Show less ↑", "Згорнути ↑", "Свернуть ↑", "Réduire ↑", "Weniger ↑")
                  : L(`View ${hidden} more ↓`, `Ще ${hidden} ↓`, `Ещё ${hidden} ↓`, `Voir ${hidden} de plus ↓`, `${hidden} weitere ↓`)),
              // Student-proposed topic → added to the course and taught by AI.
              customTopicFor === e.id
                ? ce("div", { style: { display: "flex", gap: 8, padding: "10px 16px", borderTop: "1px solid var(--border-subtle)", alignItems: "center" } },
                    ce("input", {
                      autoFocus: true, value: customTopicText,
                      onChange: (ev) => setCustomTopicText(ev.target.value),
                      onKeyDown: (ev) => { if (ev.key === "Enter") addCustomTopic(e.id, customTopicText); if (ev.key === "Escape") { setCustomTopicFor(null); setCustomTopicText(""); } },
                      placeholder: L("Type a topic…", "Введіть тему…", "Введите тему…", "Saisir un sujet…", "Thema eingeben…"),
                      style: { flex: 1, minWidth: 0, padding: "9px 12px", borderRadius: 10, border: "1px solid var(--border-subtle)", fontSize: 14, fontFamily: "var(--font-sans)", outline: "none" }
                    }),
                    ce("button", { onClick: () => addCustomTopic(e.id, customTopicText), disabled: !customTopicText.trim(),
                      style: { padding: "9px 14px", borderRadius: 10, border: "none", background: customTopicText.trim() ? "var(--indigo-600)" : "var(--surface-muted)", color: customTopicText.trim() ? "var(--white)" : "var(--text-muted)", fontWeight: 700, fontSize: 13, cursor: customTopicText.trim() ? "pointer" : "default", whiteSpace: "nowrap" } },
                      L("Learn →", "Вчити →", "Учить →", "Apprendre →", "Lernen →")))
                : ce("button", { onClick: () => { setCustomTopicFor(e.id); setCustomTopicText(""); },
                    style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 16px", background: "transparent", border: "none", borderTop: "1px solid var(--border-subtle)", cursor: "pointer", fontFamily: "var(--font-sans)", width: "100%", fontSize: 13, fontWeight: 600, color: "var(--text-muted)" } },
                    L("+ Add your own topic", "+ Додати свою тему", "+ Добавить свою тему", "+ Ajouter votre sujet", "+ Eigenes Thema")));
          })());
      }),
      proGate && ce(ProSheet, { freeCount: proGate.freeCount, lockedCount: proGate.lockedCount, onClose: () => setProGate(null), t }),
    );
  }

  // ─── LOBBY ─────────────────────────────────────────────────────────────────
  const greeting = name
    ? L(`Hey ${name}! What do you want to do?`, `Привіт, ${name}! Що будемо робити?`, `Привет, ${name}! Что будем делать?`, `Salut ${name} ! Que veux-tu faire ?`, `Hallo ${name}! Was möchtest du tun?`)
    : L("Hey! What do you want to do?", "Привіт! Що будемо робити?", "Привет! Что будем делать?", "Salut ! Que veux-tu faire ?", "Hallo! Was möchtest du tun?");
  const urgentReview = dueReviews.length > 0 ? dueReviews[0] : null;
  const xpData = window.xpLevel ? window.xpLevel() : null;
  const xpPct = xpData ? Math.round((xpData.into / xpData.need) * 100) : 0;

  return React.createElement("div", { className: "coach-lobby", style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)" } },
    // Hero
    React.createElement("div", { className: "coach-lobby-hero", style: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "36px 20px 20px" } },
      React.createElement(CoachIcon, { size: 56, className: "coach-lobby-icon" }),
      React.createElement("h1", { style: { margin: "16px 0 4px", fontSize: 22, fontWeight: 700, color: "var(--text-strong)" } }, greeting),
      React.createElement("p", { style: { margin: 0, fontSize: 14, color: "var(--text-muted)" } }, L("Your AI Coach is ready.", "Ваш AI-коуч готовий.", "Ваш AI-коуч готов.", "Votre coach IA est prêt.", "Dein KI-Coach ist bereit.")),
      xpData && React.createElement("div", { className: "coach-lobby-xp", style: { display: "flex", alignItems: "center", gap: 10, margin: "14px auto 0", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: "10px 16px", maxWidth: 240 } },
        React.createElement("span", { style: { fontSize: 11, fontWeight: 700, color: "var(--indigo-600)", background: "var(--indigo-50)", padding: "4px 8px", borderRadius: 8, letterSpacing: "0.04em", whiteSpace: "nowrap" } }, `LV ${xpData.level}`),
        window.xpTier && (() => { const _tier = window.xpTier(); return React.createElement("span", { className: _tier.theme ? "tier-glow" : "", style: { fontSize: 11, fontWeight: 700, color: "var(--text-strong)", background: "var(--surface-muted)", border: "1px solid var(--border-subtle)", padding: "4px 8px", borderRadius: 8, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 } }, _tier.emoji, window.tierTitle(_tier, t?.code)); })(),
        React.createElement("div", { style: { flex: 1 } },
          React.createElement("div", { style: { height: 6, background: "var(--border-subtle)", borderRadius: 3, overflow: "hidden" } },
            React.createElement("div", { className: "ux-bar-fill", style: { height: "100%", width: `${xpPct}%`, background: "linear-gradient(90deg,var(--indigo-500),var(--indigo-600))", borderRadius: 3 } })),
          React.createElement("p", { style: { fontSize: 10, color: "var(--text-muted)", margin: "3px 0 0", textAlign: "right" } }, `${xpData.into}/${xpData.need} XP`)))),

    // Urgent review nudge
    urgentReview && React.createElement("div", {
      className: "ux-card ux-press",
      onClick: () => { setReviewTopic(urgentReview.topicName); setMode("review"); },
      style: { margin: "0 20px 16px", padding: "12px 16px", background: "var(--amber-50)", border: "1px solid var(--amber-200)", borderRadius: 12, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }
    },
      React.createElement("span", { style: { fontSize: 20 } }, "⚡"),
      React.createElement("div", { style: { flex: 1 } },
        React.createElement("p", { style: { margin: 0, fontSize: 13, fontWeight: 600, color: "var(--amber-700)" } }, L(`${urgentReview.topicName} is fading`, `${urgentReview.topicName} забувається`, `${urgentReview.topicName} забывается`, `${urgentReview.topicName} s'estompe`, `${urgentReview.topicName} verblasst`)),
        React.createElement("p", { style: { margin: 0, fontSize: 12, color: "var(--amber-700)" } }, L(`${Math.round(urgentReview.retention * 100)}% retention — review now`, `${Math.round(urgentReview.retention * 100)}% утримання — повторіть зараз`, `${Math.round(urgentReview.retention * 100)}% удержания — повторите сейчас`, `${Math.round(urgentReview.retention * 100)}% de rétention — révisez maintenant`, `${Math.round(urgentReview.retention * 100)}% Behalten — jetzt wiederholen`))),
      React.createElement("span", { style: { fontSize: 12, color: "var(--amber-700)", fontWeight: 600 } }, "→")),

    // Mode cards
    React.createElement("div", { className: "ux-stagger", style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "0 20px", flex: 1 } },
      ...COACH_MODES.map((m) => React.createElement("button", {
        key: m.id,
        className: "ux-card ux-press coach-mode",
        onClick: () => {
          if (m.id === "learn") { setTopicPicker(true); }
          else { setMode(m.id); }
        },
        style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "28px 16px", background: "var(--surface-card)", border: "1.5px solid var(--border-default)", borderRadius: 16, cursor: "pointer", fontFamily: "var(--font-sans)" }
      },
        React.createElement("span", { className: "coach-mode-emoji", style: { fontSize: 32 } }, m.emoji),
        React.createElement("span", { style: { fontSize: 15, fontWeight: 700, color: "var(--text-strong)" } }, m.label[t?.code] || m.label.en),
        React.createElement("span", { style: { fontSize: 12, color: "var(--text-muted)" } }, m.desc[t?.code] || m.desc.en)))));
}

Object.assign(window, { AIChat, CoachIcon, LearnEngine });

// Module marker: these files carry no import/export of their own (they still
// communicate via `window` globals), and without one the JSX transform treats
// the file as a CommonJS script and emits a bare `require()` call that throws
// in the browser. Removed once this module uses real imports.
export {};
