// AI Exam Coach — Learn (Phase 3.7a).
//
// Replaces StudyHub for exams that HAVE a Learn tree defined
// (src/features/learn/tree/index.ts). For exams without a tree, falls back
// to StudyHub — MVP ships trees for nmt and ielts only; adding another
// exam later is a new tree file + one registry entry, no route change.
//
// Fold everything (main list, node preview sheet, Teach, Drill, Prove) into
// one component here rather than fanning out to 4 small files. MVP has 3
// short linear phases; splitting them costs prop drilling and gains
// nothing until 3.7b starts adding the other exercise types.

import { getTree, availableTaxonomies } from "./tree/index";
import { localize, totalNodeCount } from "./tree/schema";
import { checkAndRecordQuestion } from "../../lib/question-novelty";

// ─── shared: node status color/label ──────────────────────────────────────────
const MASTERY_STYLE = {
  locked:     { color: "var(--slate-400)", label: "🔒" },
  unlocked:   { color: "var(--slate-500)", label: "○"  },
  bronze:     { color: "#b0752c",          label: "🥉" },
  silver:     { color: "#8892a8",          label: "🥈" },
  gold:       { color: "#d4a017",          label: "🥇" },
  legendary:  { color: "#7b3ff2",          label: "👑" },
};

// Same normalization pattern QuickCheckEngine uses on fill-in answers —
// case-insensitive, whitespace-collapsed. `math.js` equivalence is deferred
// to Phase 3.7b; string match catches the majority of fill-ins here.
function normalizeAnswer(s) {
  return (s || "").toString().toLowerCase().trim().replace(/\s+/g, " ");
}

// Best-effort dedup pass for the 3-question Prove batch. Same shape as
// AIChat.jsx's dedupeAgainstQuestionBank — kept small enough here (only
// Prove needs it in Learn; Teach and Drill are one-off content) that a
// second copy is cheaper than exporting one and re-plumbing the module.
async function dedupePairs(questions, examTaxonomy, regenerate) {
  const sb = window._supabase;
  const userId = window.getSession && window.getSession()?.id;
  if (!sb || !userId || !examTaxonomy) return questions;
  const checks = await Promise.all(
    questions.map((q) => checkAndRecordQuestion(sb, userId, examTaxonomy, null, q.question || "")),
  );
  const dupIdxs = checks.map((r, i) => (r.duplicate ? i : -1)).filter((i) => i >= 0);
  if (dupIdxs.length === 0) return questions;
  let replacement = null;
  try { replacement = await regenerate(); } catch { return questions; }
  if (!Array.isArray(replacement) || replacement.length === 0) return questions;
  const replChecks = await Promise.all(
    replacement.map((q) => checkAndRecordQuestion(sb, userId, examTaxonomy, null, q.question || "")),
  );
  const fresh = replacement.filter((_, i) => !replChecks[i].duplicate);
  const next = questions.slice();
  let r = 0;
  for (const idx of dupIdxs) {
    if (r >= fresh.length) break;
    next[idx] = fresh[r++];
  }
  return next;
}

// ─── Node runner (Teach → Drill → Prove) ──────────────────────────────────────

function NodeRunner({ tree, unit, node, lang, onExit, t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
  const [phase, setPhase] = React.useState("teach"); // teach | drill | prove | done
  const [teach, setTeach] = React.useState(null);
  const [teachError, setTeachError] = React.useState(null);
  const [drillQs, setDrillQs] = React.useState(null);
  const [drillError, setDrillError] = React.useState(null);
  const [drillIdx, setDrillIdx] = React.useState(0);
  const [drillSelected, setDrillSelected] = React.useState(null);
  const [drillFillInput, setDrillFillInput] = React.useState("");
  const [drillRevealed, setDrillRevealed] = React.useState(false);
  const [drillResults, setDrillResults] = React.useState([]);
  const [proveQs, setProveQs] = React.useState(null);
  const [proveError, setProveError] = React.useState(null);
  const [proveIdx, setProveIdx] = React.useState(0);
  const [proveSelected, setProveSelected] = React.useState(null);
  const [proveResults, setProveResults] = React.useState([]);
  const [proveTimeLeft, setProveTimeLeft] = React.useState(node.estimatedMinutes * 60);
  const [finalMastery, setFinalMastery] = React.useState(null);

  const nodeTitle = localize(node.title, lang);
  const unitTitle = localize(unit.title, lang);

  // Teach: one Sonnet call, cached in local state for the life of this
  // component (no persistence — MVP doesn't need "resume mid-lesson").
  React.useEffect(() => {
    if (phase !== "teach" || teach || teachError) return;
    const complete = window.brainComplete || ((a) => window.claude.complete(a));
    const langDir = window.aiLangDirective ? window.aiLangDirective() : "";
    const system = `You are teaching a student the concept "${nodeTitle}" (unit: ${unitTitle}) for the ${tree.examTaxonomy.toUpperCase()} exam.
OUTPUT ONLY valid JSON — no markdown, no fences. Start with { end with }.
FORMAT: {"hook":"3-sentence engaging hook","example":{"prompt":"a worked example","steps":["step 1","step 2","..."],"answer":"final answer"},"takeaway":"one-line rule to remember"}
RULES: pitch to exam level, keep steps short, use plain math notation (no LaTeX for now — v2). ${langDir}`;
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("Took too long")), 30000));
    Promise.race([complete({ system, messages: [{ role: "user", content: `Teach me: ${nodeTitle}` }] }), timeout])
      .then((raw) => {
        const p = window.parseJSON ? window.parseJSON(raw) : JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
        if (!p || !p.hook) throw new Error("Invalid teach response");
        setTeach(p);
      })
      .catch((e) => setTeachError(e.message || "Failed to load"));
  }, [phase, teach, teachError, nodeTitle, unitTitle, tree.examTaxonomy]);

  // Drill: 5 mixed MCQ / fill-in on the same node.
  React.useEffect(() => {
    if (phase !== "drill" || drillQs || drillError) return;
    const complete = window.brainComplete || ((a) => window.claude.complete(a));
    const langDir = window.aiLangDirective ? window.aiLangDirective() : "";
    const system = `Generate exactly 5 practice questions for the concept "${nodeTitle}" (${tree.examTaxonomy.toUpperCase()} exam prep).
OUTPUT ONLY valid JSON — no markdown, no fences. Start with { end with }.
FORMAT: {"questions":[
  {"type":"mcq","question":"...","options":["A","B","C","D"],"correct":0,"explanation":"1 sentence"},
  {"type":"fill","question":"Complete: ...","answer":"expected answer","accept":["variant 1","variant 2"],"explanation":"1 sentence"}
]}
RULES: mix 3 mcq + 2 fill. Difficulty matches complexity ${node.complexity}/5. Every fill answer is a short word/number/formula the learner can type. ${langDir}`;
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("Took too long")), 30000));
    Promise.race([complete({ system, messages: [{ role: "user", content: `Drill me on: ${nodeTitle}` }] }), timeout])
      .then((raw) => {
        const p = window.parseJSON ? window.parseJSON(raw) : JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
        if (!p || !Array.isArray(p.questions) || p.questions.length === 0) throw new Error("Invalid drill response");
        setDrillQs(p.questions.slice(0, 5));
      })
      .catch((e) => setDrillError(e.message || "Failed to load"));
  }, [phase, drillQs, drillError, nodeTitle, tree.examTaxonomy, node.complexity]);

  // Prove: 3 exam-style Qs, dedup-checked, on a timer.
  React.useEffect(() => {
    if (phase !== "prove" || proveQs || proveError) return;
    const complete = window.brainComplete || ((a) => window.claude.complete(a));
    const langDir = window.aiLangDirective ? window.aiLangDirective() : "";
    const system = `Generate exactly 3 real-exam-style MCQ questions for "${nodeTitle}" (${tree.examTaxonomy.toUpperCase()}).
OUTPUT ONLY valid JSON — no markdown, no fences. Start with { end with }.
FORMAT: {"questions":[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"1-2 sentences","topic":"${nodeTitle}"}]}
RULES: exam-difficulty, no warm-ups; 4 options, "correct" is 0-based index. ${langDir}`;
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("Took too long")), 30000));
    const generate = () => Promise.race([
      complete({ system, messages: [{ role: "user", content: `Test me on: ${nodeTitle}` }] }),
      timeout,
    ]).then((raw) => {
      const p = window.parseJSON ? window.parseJSON(raw) : JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
      if (!p || !Array.isArray(p.questions) || p.questions.length === 0) throw new Error("Invalid prove response");
      return p.questions.slice(0, 3);
    });
    (async () => {
      try {
        const raw = await generate();
        const deduped = await dedupePairs(raw, tree.examTaxonomy, generate);
        setProveQs(deduped);
      } catch (e) { setProveError(e.message || "Failed to load"); }
    })();
  }, [phase, proveQs, proveError, nodeTitle, tree.examTaxonomy]);

  // Prove timer runs down live; hitting 0 auto-submits whatever we've got.
  React.useEffect(() => {
    if (phase !== "prove" || !proveQs) return;
    if (proveTimeLeft <= 0) return;
    const id = setInterval(() => setProveTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [phase, proveQs, proveTimeLeft]);

  // Auto-finish Prove when the timer runs out — same behaviour every timed
  // engine already has, so the learner never gets stuck on a dead screen.
  React.useEffect(() => {
    if (phase === "prove" && proveQs && proveTimeLeft === 0 && finalMastery === null) {
      finishProve(proveResults);
    }
  }, [phase, proveQs, proveTimeLeft]);

  function submitDrillAnswer(input) {
    if (drillRevealed) return;
    const q = drillQs[drillIdx];
    let isCorrect = false;
    if (q.type === "mcq") isCorrect = input === q.correct;
    else if (q.type === "fill") {
      const user = normalizeAnswer(input);
      const accepts = [q.answer, ...(q.accept || [])].map(normalizeAnswer);
      isCorrect = accepts.some((a) => a && a === user);
    }
    setDrillSelected(input);
    setDrillRevealed(true);
    setDrillResults((r) => [...r, { correct: isCorrect }]);
  }
  function nextDrill() {
    setDrillSelected(null); setDrillRevealed(false); setDrillFillInput("");
    if (drillIdx + 1 >= drillQs.length) setPhase("prove");
    else setDrillIdx((i) => i + 1);
  }

  function submitProveAnswer(optIdx) {
    if (proveSelected !== null) return;
    const q = proveQs[proveIdx];
    const isCorrect = optIdx === q.correct;
    setProveSelected(optIdx);
    const nextResults = [...proveResults, { correct: isCorrect, q, chosen: optIdx }];
    setProveResults(nextResults);
    // Log wrong ones into the shared Mistake Journal — same shape every
    // other engine uses so the journal groups them consistently.
    if (!isCorrect && window.logMistake) {
      window.logMistake({
        topic: nodeTitle, question: q.question, options: q.options,
        correctIndex: q.correct, selectedIndex: optIdx, explanation: q.explanation,
      });
    }
    setTimeout(() => {
      setProveSelected(null);
      if (proveIdx + 1 >= proveQs.length) finishProve(nextResults);
      else setProveIdx((i) => i + 1);
    }, 1200);
  }

  function finishProve(results) {
    const correct = results.filter((r) => r.correct).length;
    const totalQ = proveQs ? proveQs.length : 3;
    // MVP mastery rule: >=2/3 → bronze. Silver/Gold/Legendary come in 3.7d.
    const mastery = correct >= Math.ceil(totalQ * 2 / 3) ? "bronze" : "unlocked";
    if (window.recordNodeAttempt) window.recordNodeAttempt(tree.examTaxonomy, node.id, mastery);
    setFinalMastery({ mastery, correct, total: totalQ });
    setPhase("done");
  }

  // ─── Render helpers ───────────────────────────────────────────────────────
  const wrap = (content) => React.createElement("div", {
    style: { padding: "20px", maxWidth: 720, margin: "0 auto", fontFamily: "var(--font-sans)" },
  }, content);
  const header = React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 20 } },
    React.createElement("button", {
      onClick: onExit,
      style: { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted)", padding: 0 },
    }, "←"),
    React.createElement("div", null,
      React.createElement("div", { style: { fontSize: 11, textTransform: "uppercase", color: "var(--text-faint)", letterSpacing: "0.06em" } }, unitTitle),
      React.createElement("h2", { style: { margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-strong)" } }, nodeTitle),
    ),
  );

  // ── Phase: Teach ──
  if (phase === "teach") {
    if (teachError) return wrap([header,
      React.createElement("p", { style: { color: "var(--red-600)" }, key: "e" }, teachError),
      React.createElement("button", { key: "r", onClick: () => { setTeach(null); setTeachError(null); }, style: { padding: "10px 16px", borderRadius: 10, border: "1px solid var(--border-default)", cursor: "pointer" } }, "Retry"),
    ]);
    if (!teach) return wrap([header, React.createElement("p", { key: "l", style: { color: "var(--text-muted)" } }, L("Preparing your lesson…", "Готуємо урок…", "Готовим урок…", "Préparation…", "Bereite Lektion vor…"))]);
    return wrap([
      header,
      React.createElement("p", { key: "hook", style: { fontSize: 16, lineHeight: 1.55, color: "var(--text-body)" } }, teach.hook),
      React.createElement("div", { key: "ex", style: { marginTop: 20, background: "var(--surface-muted)", borderRadius: 12, padding: 16 } },
        React.createElement("div", { style: { fontSize: 12, textTransform: "uppercase", color: "var(--text-faint)", letterSpacing: "0.06em", marginBottom: 8 } }, L("Worked example", "Приклад", "Пример", "Exemple", "Beispiel")),
        React.createElement("p", { style: { margin: "0 0 8px", fontWeight: 600 } }, teach.example?.prompt),
        React.createElement("ol", { style: { paddingLeft: 20, margin: 0, color: "var(--text-body)" } },
          (teach.example?.steps || []).map((s, i) => React.createElement("li", { key: i, style: { marginBottom: 4 } }, s)),
        ),
        React.createElement("p", { style: { marginTop: 10, fontWeight: 700, color: "var(--text-strong)" } }, "= ", teach.example?.answer),
      ),
      React.createElement("p", { key: "take", style: { marginTop: 20, padding: "12px 14px", background: "var(--indigo-50)", borderRadius: 10, color: "var(--text-strong)" } }, "💡 ", teach.takeaway),
      React.createElement("button", {
        key: "next", onClick: () => setPhase("drill"),
        style: { marginTop: 24, width: "100%", padding: "14px", borderRadius: 12, background: "var(--indigo-600)", color: "#fff", border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer" },
      }, L("Start drill →", "Почати вправи →", "Начать упражнения →", "Commencer →", "Übung starten →")),
    ]);
  }

  // ── Phase: Drill ──
  if (phase === "drill") {
    if (drillError) return wrap([header, React.createElement("p", { style: { color: "var(--red-600)" }, key: "e" }, drillError)]);
    if (!drillQs) return wrap([header, React.createElement("p", { key: "l", style: { color: "var(--text-muted)" } }, L("Loading exercises…", "Завантажуємо…", "Загружаем…", "Chargement…", "Lade…"))]);
    const q = drillQs[drillIdx];
    return wrap([
      header,
      React.createElement("div", { key: "prog", style: { fontSize: 12, color: "var(--text-faint)", marginBottom: 10 } }, `${drillIdx + 1} / ${drillQs.length}`),
      React.createElement("p", { key: "q", style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)" } }, q.question),
      q.type === "mcq" && React.createElement("div", { key: "opts", style: { display: "flex", flexDirection: "column", gap: 8 } },
        ...q.options.map((opt, i) => {
          const wasChosen = drillSelected === i;
          const showCorrect = drillRevealed && i === q.correct;
          const showWrong = drillRevealed && wasChosen && i !== q.correct;
          const bg = showCorrect ? "var(--emerald-50)" : showWrong ? "var(--red-50)" : "var(--surface-card)";
          const border = showCorrect ? "var(--emerald-500)" : showWrong ? "var(--red-500)" : "var(--border-default)";
          return React.createElement("button", {
            key: i, onClick: () => submitDrillAnswer(i), disabled: drillRevealed,
            style: { textAlign: "left", padding: "12px 14px", background: bg, border: `1.5px solid ${border}`, borderRadius: 10, fontSize: 14, cursor: drillRevealed ? "default" : "pointer", fontFamily: "var(--font-sans)" },
          }, opt);
        }),
      ),
      q.type === "fill" && React.createElement("div", { key: "fill", style: { marginTop: 8 } },
        React.createElement("input", {
          value: drillFillInput,
          onChange: (e) => setDrillFillInput(e.target.value),
          onKeyDown: (e) => { if (e.key === "Enter" && !drillRevealed) submitDrillAnswer(drillFillInput); },
          disabled: drillRevealed,
          placeholder: L("Type your answer", "Введіть відповідь", "Введите ответ", "Votre réponse", "Deine Antwort"),
          style: { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid var(--border-default)", fontSize: 15, fontFamily: "var(--font-sans)", boxSizing: "border-box" },
        }),
        !drillRevealed && React.createElement("button", {
          onClick: () => submitDrillAnswer(drillFillInput),
          style: { marginTop: 8, padding: "10px 16px", borderRadius: 10, background: "var(--indigo-600)", color: "#fff", border: "none", cursor: "pointer" },
        }, L("Check", "Перевірити", "Проверить", "Vérifier", "Prüfen")),
      ),
      drillRevealed && React.createElement("div", { key: "exp", style: { marginTop: 16, padding: 12, background: "var(--surface-muted)", borderRadius: 8, fontSize: 13, color: "var(--text-body)" } }, q.explanation),
      drillRevealed && React.createElement("button", {
        key: "next", onClick: nextDrill,
        style: { marginTop: 16, width: "100%", padding: "14px", borderRadius: 12, background: "var(--indigo-600)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" },
      }, drillIdx + 1 >= drillQs.length ? L("To Prove →", "До перевірки →", "К проверке →", "Vers le test →", "Zum Test →") : L("Next →", "Далі →", "Далее →", "Suivant →", "Weiter →")),
    ]);
  }

  // ── Phase: Prove ──
  if (phase === "prove") {
    if (proveError) return wrap([header, React.createElement("p", { style: { color: "var(--red-600)" }, key: "e" }, proveError)]);
    if (!proveQs) return wrap([header, React.createElement("p", { key: "l", style: { color: "var(--text-muted)" } }, L("Loading exam questions…", "Завантажуємо питання…", "Загружаем вопросы…", "Chargement…", "Lade…"))]);
    const q = proveQs[proveIdx];
    const mm = Math.floor(proveTimeLeft / 60);
    const ss = String(proveTimeLeft % 60).padStart(2, "0");
    return wrap([
      header,
      React.createElement("div", { key: "top", style: { display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-faint)", marginBottom: 10 } },
        React.createElement("span", null, `${proveIdx + 1} / ${proveQs.length}`),
        React.createElement("span", { style: { fontVariantNumeric: "tabular-nums" } }, `⏱ ${mm}:${ss}`),
      ),
      React.createElement("p", { key: "q", style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)" } }, q.question),
      React.createElement("div", { key: "opts", style: { display: "flex", flexDirection: "column", gap: 8 } },
        ...q.options.map((opt, i) => {
          const showCorrect = proveSelected !== null && i === q.correct;
          const showWrong = proveSelected === i && i !== q.correct;
          const bg = showCorrect ? "var(--emerald-50)" : showWrong ? "var(--red-50)" : "var(--surface-card)";
          const border = showCorrect ? "var(--emerald-500)" : showWrong ? "var(--red-500)" : "var(--border-default)";
          return React.createElement("button", {
            key: i, onClick: () => submitProveAnswer(i), disabled: proveSelected !== null,
            style: { textAlign: "left", padding: "12px 14px", background: bg, border: `1.5px solid ${border}`, borderRadius: 10, fontSize: 14, cursor: proveSelected !== null ? "default" : "pointer", fontFamily: "var(--font-sans)" },
          }, opt);
        }),
      ),
    ]);
  }

  // ── Phase: Done ──
  if (phase === "done" && finalMastery) {
    const passed = finalMastery.mastery === "bronze";
    return wrap([
      header,
      React.createElement("div", { key: "res", style: { textAlign: "center", padding: "24px 0" } },
        React.createElement("div", { style: { fontSize: 48, marginBottom: 8 } }, passed ? "🥉" : "💪"),
        React.createElement("h3", { style: { margin: 0, fontSize: 22, color: "var(--text-strong)" } },
          passed ? L("Bronze mastery!", "Бронзова майстерність!", "Бронзовое мастерство!", "Bronze !", "Bronze!")
                 : L("Not quite yet", "Ще не зовсім", "Пока не совсем", "Presque !", "Fast!"),
        ),
        React.createElement("p", { style: { color: "var(--text-muted)", marginTop: 8 } }, `${finalMastery.correct} / ${finalMastery.total}`),
      ),
      React.createElement("button", {
        key: "back", onClick: onExit,
        style: { marginTop: 12, width: "100%", padding: "14px", borderRadius: 12, background: "var(--indigo-600)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" },
      }, L("Back to tree", "До дерева", "К дереву", "Retour à l'arbre", "Zurück")),
    ]);
  }

  return null;
}

// ─── Main list ────────────────────────────────────────────────────────────────

function LearnMain({ t }) {
  const lang = (t && t.code) || "en";
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[lang] || en);
  // Pick the exam-taxonomy for the user's currently-active exam. Falls back
  // to the first available tree if the current exam has no tree yet — the
  // MVP shipping decision (Decision Log #41) is to keep the section open
  // for every exam, using nmt/ielts trees as content even when the student's
  // real exam is different.
  const exams = window.getExams ? window.getExams() : [];
  const availableTax = availableTaxonomies();
  const currentExam = exams[0];
  const currentQual = currentExam && (window.examQualificationId
    ? window.examQualificationId(currentExam)
    : currentExam.qualificationId);
  const taxonomy = (currentQual && availableTax.includes(currentQual)) ? currentQual : availableTax[0];
  const tree = getTree(taxonomy);

  const [openNode, setOpenNode] = React.useState(null); // { unit, node }
  const [running, setRunning] = React.useState(null);   // { unit, node }
  // Learn store change → re-render (mastery pill updates immediately after
  // a Prove finish). Same subscribe pattern brain-store / profile-store use.
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const unsub = window.subscribeLearn && window.subscribeLearn(() => setTick((n) => n + 1));
    return () => unsub && unsub();
  }, []);

  if (!tree) {
    return React.createElement("div", { style: { padding: 24, fontFamily: "var(--font-sans)" } },
      React.createElement("p", null, L("No learn tree available for your exam yet.", "Дерево для цього іспиту ще не готове.", "Дерево для этого экзамена ещё не готово.", "Aucun arbre disponible.", "Kein Baum verfügbar.")),
    );
  }

  if (running) {
    return React.createElement(NodeRunner, {
      tree, unit: running.unit, node: running.node, lang, t,
      onExit: () => { setRunning(null); setOpenNode(null); },
    });
  }

  const learnState = window.getLearn ? window.getLearn() : {};
  const nodeState = learnState[tree.examTaxonomy] || {};
  const mastered = Object.values(nodeState).filter((n) => ["bronze", "silver", "gold", "legendary"].includes(n.mastery)).length;
  const total = totalNodeCount(tree);

  return React.createElement("div", { style: { maxWidth: 720, margin: "0 auto", padding: "20px 16px 60px", fontFamily: "var(--font-sans)" } },
    React.createElement("div", { key: "head", style: { marginBottom: 24 } },
      React.createElement("h1", { style: { margin: 0, fontSize: 24, fontWeight: 700, color: "var(--text-strong)" } }, L("Learn", "Навчання", "Обучение", "Apprendre", "Lernen")),
      React.createElement("p", { style: { margin: "6px 0 0", color: "var(--text-muted)", fontSize: 13 } },
        L(`${mastered} of ${total} topics mastered · ${tree.examTaxonomy.toUpperCase()}`,
          `${mastered} із ${total} тем засвоєно · ${tree.examTaxonomy.toUpperCase()}`,
          `${mastered} из ${total} тем освоено · ${tree.examTaxonomy.toUpperCase()}`,
          `${mastered} sur ${total} sujets · ${tree.examTaxonomy.toUpperCase()}`,
          `${mastered} von ${total} · ${tree.examTaxonomy.toUpperCase()}`)),
    ),
    ...tree.units.map((unit) => React.createElement("div", { key: unit.id, style: { marginBottom: 28 } },
      React.createElement("h2", { style: { margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "var(--text-strong)", textTransform: "uppercase", letterSpacing: "0.06em" } }, localize(unit.title, lang)),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
        ...unit.nodes.map((node) => {
          const st = nodeState[node.id] || { mastery: "unlocked", attempts: 0 };
          const style = MASTERY_STYLE[st.mastery] || MASTERY_STYLE.unlocked;
          return React.createElement("button", {
            key: node.id, onClick: () => setOpenNode({ unit, node }),
            style: { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: 10, cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)" },
          },
            React.createElement("span", { style: { fontSize: 20, color: style.color, minWidth: 24, textAlign: "center" } }, style.label),
            React.createElement("div", { style: { flex: 1 } },
              React.createElement("div", { style: { fontSize: 14, fontWeight: 600, color: "var(--text-strong)" } }, localize(node.title, lang)),
              React.createElement("div", { style: { fontSize: 11, color: "var(--text-faint)", marginTop: 2 } }, `~${node.estimatedMinutes} min · complexity ${node.complexity}/5`),
            ),
          );
        }),
      ),
    )),
    openNode && React.createElement("div", {
      key: "sheet",
      onClick: () => setOpenNode(null),
      style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" },
    }, React.createElement("div", {
      onClick: (e) => e.stopPropagation(),
      style: { background: "var(--surface-card)", padding: 20, borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 520, boxSizing: "border-box" },
    },
      React.createElement("h3", { style: { margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-strong)" } }, localize(openNode.node.title, lang)),
      React.createElement("p", { style: { margin: "4px 0 16px", fontSize: 12, color: "var(--text-muted)" } }, `${localize(openNode.unit.title, lang)} · ~${openNode.node.estimatedMinutes} min`),
      React.createElement("button", {
        onClick: () => setRunning(openNode),
        style: { width: "100%", padding: "14px", borderRadius: 12, background: "var(--indigo-600)", color: "#fff", border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 8 },
      }, L("Start", "Почати", "Начать", "Commencer", "Starten")),
      React.createElement("button", {
        onClick: () => { setRunning({ unit: openNode.unit, node: openNode.node, skipToProve: true }); },
        style: { width: "100%", padding: "12px", borderRadius: 12, background: "transparent", color: "var(--text-body)", border: "1px solid var(--border-default)", cursor: "pointer" },
      }, L("Skip to Prove", "Одразу до перевірки", "Сразу к проверке", "Aller au test", "Direkt zum Test")),
    )),
  );
}

Object.assign(window, { LearnMain });
