// AI Exam Coach — Learn (Phase 3.7a).
//
// Replaces StudyHub for exams that HAVE a Learn tree defined
// (src/features/learn/tree/index.ts). NMT is per-subject: two NMT sittings
// (language + math) are two cards, not one shared math tree. Exams without
// a tree stay out of the picker instead of silently opening NMT Math.
//
// Fold everything (main list, node preview sheet, Teach, Drill, Prove) into
// one component here rather than fanning out to 4 small files. 3.7b scoring
// lives in drill-exercises.ts; the boards stay here so one runner owns phase.

import { treeForExam } from "./tree/resolve";
import { flattenLessonNodes, localize, totalNodeCount } from "./tree/schema";
import { freeTopicLimit, topicIsLocked } from "./premium";
import { ProSheet } from "./ProSheet.jsx";
import { checkAndRecordQuestion } from "../../lib/question-novelty";
import { WaitPress } from "../../components/WaitPress";
import { renderCoachMarkdown } from "../../lib/math-render";
import { languageNameFor } from "../../lib/paper-language";
import {
  buildDrillSystem,
  buildExplainSystem,
  normalizeAnswer,
  normalizeDrillQuestions,
  parseExplainGrade,
  scoreDrill,
  shuffled,
} from "./drill-exercises";
import { formatRegenWait, getHearts, HEARTS_MAX, HEARTS_REGEN_MS, spendHeart, subscribeHearts } from "../../lib/hearts";

function HeartsBar({ t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const unsub = subscribeHearts(() => setTick((n) => n + 1));
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => { unsub(); clearInterval(id); };
  }, []);
  const { hearts, nextRegenAt } = getHearts();
  const wait = nextRegenAt ? Math.max(0, nextRegenAt - Date.now()) : 0;
  return React.createElement("div", {
    "aria-label": L(`${hearts} of ${HEARTS_MAX} hearts`, `${hearts} з ${HEARTS_MAX} сердець`, `${hearts} из ${HEARTS_MAX} сердец`, `${hearts} sur ${HEARTS_MAX} cœurs`, `${hearts} von ${HEARTS_MAX} Herzen`),
    style: { display: "flex", alignItems: "center", gap: 6, fontVariantNumeric: "tabular-nums" },
  },
    React.createElement("span", { "aria-hidden": "true", style: { letterSpacing: 2, fontSize: 16, color: "var(--red-500)" } },
      "❤".repeat(hearts) + "♡".repeat(Math.max(0, HEARTS_MAX - hearts))),
    hearts < HEARTS_MAX && nextRegenAt && React.createElement("span", {
      style: { fontSize: 11, fontWeight: 600, color: "var(--text-faint)", fontFamily: "var(--font-mono)" },
    }, formatRegenWait(wait)),
  );
}

function OutOfHearts({ t, onBack, onContinue }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const unsub = subscribeHearts(() => setTick((n) => n + 1));
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => { unsub(); clearInterval(id); };
  }, []);
  const { hearts, nextRegenAt } = getHearts();
  if (hearts > 0) {
    return React.createElement("div", { style: { textAlign: "center", padding: "28px 8px" } },
      React.createElement("p", { style: { color: "var(--text-body)", margin: "0 0 16px" } },
        L("A heart is back — continue.", "Серце повернулось — далі.", "Сердце вернулось — дальше.", "Un cœur est revenu.", "Ein Herz ist zurück.")),
      React.createElement("button", {
        type: "button",
        onClick: onContinue,
        style: { padding: "12px 24px", borderRadius: 999, background: "var(--indigo-600)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" },
      }, L("Continue", "Далі", "Далее", "Continuer", "Weiter")),
    );
  }
  const wait = nextRegenAt ? Math.max(0, nextRegenAt - Date.now()) : HEARTS_REGEN_MS;
  return React.createElement("div", { style: { textAlign: "center", padding: "28px 8px" } },
    React.createElement("div", { style: { fontSize: 36, marginBottom: 10 } }, "♡"),
    React.createElement("h3", { style: { margin: "0 0 8px", fontSize: 20, color: "var(--text-strong)" } },
      L("Out of hearts", "Серця скінчились", "Сердца кончились", "Plus de cœurs", "Keine Herzen")),
    React.createElement("p", { style: { margin: "0 0 18px", color: "var(--text-muted)", fontSize: 14 } },
      L(`Next heart in ${formatRegenWait(wait)}. Teach is still free.`,
        `Наступне серце через ${formatRegenWait(wait)}. Теорія безкоштовна.`,
        `Следующее сердце через ${formatRegenWait(wait)}. Теория бесплатная.`,
        `Prochain cœur dans ${formatRegenWait(wait)}.`,
        `Nächstes Herz in ${formatRegenWait(wait)}.`)),
    onBack && React.createElement("button", {
      type: "button",
      onClick: onBack,
      style: { padding: "12px 24px", borderRadius: 999, background: "var(--indigo-600)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" },
    }, L("Back to list", "До списку", "К списку", "Retour à la liste", "Zurück zur Liste")),
  );
}

function mdHtml(text) {
  return { __html: renderCoachMarkdown(text) };
}

// ─── shared: node status color/label ──────────────────────────────────────────
const MASTERY_STYLE = {
  locked:     { color: "var(--slate-400)", label: "🔒" },
  unlocked:   { color: "var(--slate-500)", label: "○"  },
  bronze:     { color: "#b0752c",          label: "🥉" },
  silver:     { color: "#8892a8",          label: "🥈" },
  gold:       { color: "#d4a017",          label: "🥇" },
  legendary:  { color: "#7b3ff2",          label: "👑" },
};

function emptyDraft() {
  return {
    matchLeft: null,
    matchPairs: {},
    matchRights: [],
    order: [],
    slots: [],
    bank: [],
    selectedBank: null,
    explain: "",
  };
}

function draftForQuestion(q) {
  const d = emptyDraft();
  if (!q) return d;
  if (q.type === "match") d.matchRights = shuffled(q.pairs.map((p) => p.right));
  if (q.type === "order") d.order = shuffled(q.items);
  if (q.type === "drag_drop") {
    d.slots = q.answers.map(() => null);
    d.bank = shuffled(q.bank);
  }
  return d;
}

function splitDragStem(question) {
  return String(question || "").split(/_{3,}/);
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

function NodeRunner({ tree, unit, node, lang, onExit, t, skipToProve }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
  const [phase, setPhase] = React.useState(skipToProve ? "prove" : "teach"); // teach | drill | prove | done
  const [teach, setTeach] = React.useState(null);
  const [teachError, setTeachError] = React.useState(null);
  const [drillQs, setDrillQs] = React.useState(null);
  const [drillError, setDrillError] = React.useState(null);
  const [drillIdx, setDrillIdx] = React.useState(0);
  const [drillSelected, setDrillSelected] = React.useState(null);
  const [drillFillInput, setDrillFillInput] = React.useState("");
  const [drillDraft, setDrillDraft] = React.useState(emptyDraft);
  const [drillRevealed, setDrillRevealed] = React.useState(false);
  const [drillGrading, setDrillGrading] = React.useState(false);
  const [drillGrade, setDrillGrade] = React.useState(null);
  const [drillGradeError, setDrillGradeError] = React.useState(null);
  const [drillResults, setDrillResults] = React.useState([]);
  const [proveQs, setProveQs] = React.useState(null);
  const [proveError, setProveError] = React.useState(null);
  const [proveIdx, setProveIdx] = React.useState(0);
  const [proveSelected, setProveSelected] = React.useState(null);
  const [proveResults, setProveResults] = React.useState([]);
  const [proveTimeLeft, setProveTimeLeft] = React.useState(node.estimatedMinutes * 60);
  const [finalMastery, setFinalMastery] = React.useState(null);
  const [heartWall, setHeartWall] = React.useState(false);

  const nodeTitle = localize(node.title, lang);
  const unitTitle = localize(unit.title, lang);

  React.useEffect(() => {
    if (skipToProve && getHearts().hearts <= 0) setHeartWall(true);
  }, [skipToProve]);

  // Teach: one Sonnet call, cached in local state for the life of this
  // component (no persistence — MVP doesn't need "resume mid-lesson").
  React.useEffect(() => {
    if (phase !== "teach" || teach || teachError) return;
    const complete = window.brainComplete || ((a) => window.claude.complete(a));
    const system = `You are teaching a student the concept "${nodeTitle}" (unit: ${unitTitle}) for the ${tree.examTaxonomy.toUpperCase()} exam.
OUTPUT ONLY valid JSON — no markdown, no fences. Start with { end with }.
FORMAT: {"hook":"3-sentence engaging hook","example":{"prompt":"a worked example","steps":["step 1","step 2","..."],"answer":"final answer"},"takeaway":"one-line rule to remember"}
RULES: pitch to exam level, keep steps short, use plain math notation (no LaTeX for now — v2).`;
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("Took too long")), 30000));
    Promise.race([complete({ system, messages: [{ role: "user", content: `Teach me: ${nodeTitle}` }], paperQual: tree.examTaxonomy }), timeout])
      .then((raw) => {
        const p = window.parseJSON ? window.parseJSON(raw) : JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
        if (!p || !p.hook) throw new Error("Invalid teach response");
        setTeach(p);
      })
      .catch((e) => setTeachError(e.message || "Failed to load"));
  }, [phase, teach, teachError, nodeTitle, unitTitle, tree.examTaxonomy]);

  // Drill: 5 mixed types. Normalize drops junk so a bad match/order
  // item does not blank the whole set.
  React.useEffect(() => {
    if (phase !== "drill" || drillQs || drillError) return;
    const complete = window.brainComplete || ((a) => window.claude.complete(a));
    const system = buildDrillSystem(nodeTitle, tree.examTaxonomy, node.complexity);
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("Took too long")), 30000));
    Promise.race([complete({ system, messages: [{ role: "user", content: `Drill me on: ${nodeTitle}` }], paperQual: tree.examTaxonomy }), timeout])
      .then((raw) => {
        const p = window.parseJSON ? window.parseJSON(raw) : JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
        const qs = normalizeDrillQuestions(p && p.questions).slice(0, 5);
        if (!qs.length) throw new Error("Invalid drill response");
        setDrillQs(qs);
        setDrillDraft(draftForQuestion(qs[0]));
      })
      .catch((e) => setDrillError(e.message || "Failed to load"));
  }, [phase, drillQs, drillError, nodeTitle, tree.examTaxonomy, node.complexity]);

  // Prove: 3 exam-style Qs, dedup-checked, on a timer.
  React.useEffect(() => {
    if (phase !== "prove" || proveQs || proveError) return;
    const complete = window.brainComplete || ((a) => window.claude.complete(a));
    const system = `Generate exactly 3 real-exam-style MCQ questions for "${nodeTitle}" (${tree.examTaxonomy.toUpperCase()}).
OUTPUT ONLY valid JSON — no markdown, no fences. Start with { end with }.
FORMAT: {"questions":[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"1-2 sentences","topic":"${nodeTitle}"}]}
RULES: exam-difficulty, no warm-ups; 4 options, "correct" is 0-based index.`;
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("Took too long")), 30000));
    const generate = () => Promise.race([
      complete({ system, messages: [{ role: "user", content: `Test me on: ${nodeTitle}` }], paperQual: tree.examTaxonomy }),
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
    if (drillRevealed || drillGrading) return;
    const q = drillQs[drillIdx];
    if (q.type === "explain") return;
    const isCorrect = scoreDrill(q, input);
    setDrillSelected(input);
    setDrillRevealed(true);
    setDrillResults((r) => [...r, { correct: isCorrect }]);
    if (!isCorrect) spendHeart();
  }

  async function submitExplain() {
    if (drillRevealed || drillGrading) return;
    const q = drillQs[drillIdx];
    const text = (drillDraft.explain || "").trim();
    if (!text) return;
    setDrillGrading(true);
    const complete = window.brainComplete || ((a) => window.claude.complete(a));
    const lang = languageNameFor(tree.examTaxonomy)
      || ({ en: "English", uk: "Ukrainian", ru: "Russian", fr: "French", de: "German" }[t?.code] || "English");
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("Took too long")), 45000));
    try {
      const raw = await Promise.race([
        complete({
          system: buildExplainSystem(nodeTitle, q.rubric || [], lang),
          messages: [{ role: "user", content: text }],
          paperQual: tree.examTaxonomy,
        }),
        timeout,
      ]);
      const parsed = window.parseJSON ? window.parseJSON(raw) : raw;
      const grade = parseExplainGrade(parsed ?? raw);
      setDrillGrade(grade);
      setDrillRevealed(true);
      setDrillResults((r) => [...r, { correct: grade.pass }]);
      if (!grade.pass) spendHeart();
    } catch (e) {
      setDrillGradeError(e.message || "Failed to grade");
    } finally {
      setDrillGrading(false);
    }
  }

  function nextDrill() {
    if (getHearts().hearts <= 0) {
      setHeartWall(true);
      return;
    }
    if (drillIdx + 1 >= drillQs.length) {
      setPhase("prove");
      return;
    }
    const next = drillIdx + 1;
    setDrillIdx(next);
    setDrillSelected(null);
    setDrillRevealed(false);
    setDrillFillInput("");
    setDrillGrade(null);
    setDrillGradeError(null);
    setDrillGrading(false);
    setDrillDraft(draftForQuestion(drillQs[next]));
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
    if (!isCorrect) {
      spendHeart();
      if (window.logMistake) {
        window.logMistake({
          topic: nodeTitle, question: q.question, options: q.options,
          correctIndex: q.correct, selectedIndex: optIdx, explanation: q.explanation,
        });
      }
    }
    setTimeout(() => {
      setProveSelected(null);
      if (proveIdx + 1 >= proveQs.length) finishProve(nextResults);
      else if (getHearts().hearts <= 0) setHeartWall(true);
      else setProveIdx((i) => i + 1);
    }, 1200);
  }

  function finishProve(results) {
    const correct = results.filter((r) => r.correct).length;
    const totalQ = proveQs ? proveQs.length : 3;
    const passMark = Math.ceil(totalQ * 2 / 3);
    const mastery = correct >= passMark ? "bronze" : "unlocked";
    if (window.recordNodeAttempt) window.recordNodeAttempt(tree.examTaxonomy, node.id, mastery);
    setFinalMastery({ mastery, correct, total: totalQ });
    setPhase("done");
  }

  function leave(result) {
    onExit(result || null);
  }

  // Pass: medal pops, then return to the list. Fail: stay until they tap.
  React.useEffect(() => {
    if (phase !== "done" || !finalMastery || finalMastery.mastery !== "bronze") return;
    if (prefersReducedMotion()) return;
    const id = setTimeout(() => leave({ nodeId: node.id, unlocked: true }), 1600);
    return () => clearTimeout(id);
  }, [phase, finalMastery]);

  // ─── Render helpers ───────────────────────────────────────────────────────
  const wrap = (content) => React.createElement("div", {
    style: { padding: "20px", maxWidth: 720, margin: "0 auto", fontFamily: "var(--font-sans)" },
  }, content);
  const header = React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 20 } },
    React.createElement("button", {
      type: "button",
      onClick: () => leave(
        phase === "done" && finalMastery && finalMastery.mastery === "bronze"
          ? { nodeId: node.id, unlocked: true }
          : null
      ),
      "aria-label": L("Back", "Назад", "Назад", "Retour", "Zurück"),
      style: { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted)", padding: 0 },
    }, "←"),
    React.createElement("div", { style: { flex: 1, minWidth: 0 } },
      React.createElement("div", { style: { fontSize: 11, textTransform: "uppercase", color: "var(--text-faint)", letterSpacing: "0.06em" } }, unitTitle),
      React.createElement("h2", { style: { margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-strong)" } }, nodeTitle),
    ),
    React.createElement(HeartsBar, { t }),
  );

  if (heartWall) {
    return wrap([header, React.createElement(OutOfHearts, {
      key: "hearts",
      t,
      onBack: () => leave(null),
      onContinue: () => setHeartWall(false),
    })]);
  }

  // ── Phase: Teach ──
  if (phase === "teach") {
    if (teachError) return wrap([header,
      React.createElement("p", { style: { color: "var(--red-600)" }, key: "e" }, teachError),
      React.createElement("button", { key: "r", onClick: () => { setTeach(null); setTeachError(null); }, style: { padding: "10px 16px", borderRadius: 10, border: "1px solid var(--border-default)", cursor: "pointer" } }, "Retry"),
    ]);
    if (!teach) return wrap([header, React.createElement(WaitPress, {
      key: "l",
      title: L("Preparing your lesson…", "Готуємо урок…", "Готовим урок…", "Préparation…", "Bereite Lektion vor…"),
      lang: t?.code,
      compact: true,
    })]);
    return wrap([
      header,
      React.createElement("p", { key: "hook", style: { fontSize: 16, lineHeight: 1.55, color: "var(--text-body)" }, dangerouslySetInnerHTML: mdHtml(teach.hook) }),
      React.createElement("div", { key: "ex", style: { marginTop: 20, background: "var(--surface-muted)", borderRadius: 12, padding: 16 } },
        React.createElement("div", { style: { fontSize: 12, textTransform: "uppercase", color: "var(--text-faint)", letterSpacing: "0.06em", marginBottom: 8 } }, L("Worked example", "Приклад", "Пример", "Exemple", "Beispiel")),
        React.createElement("p", { style: { margin: "0 0 8px", fontWeight: 600 }, dangerouslySetInnerHTML: mdHtml(teach.example?.prompt) }),
        React.createElement("ol", { style: { paddingLeft: 20, margin: 0, color: "var(--text-body)" } },
          (teach.example?.steps || []).map((s, i) => React.createElement("li", { key: i, style: { marginBottom: 4 }, dangerouslySetInnerHTML: mdHtml(s) })),
        ),
        React.createElement("p", { style: { marginTop: 10, fontWeight: 700, color: "var(--text-strong)" }, dangerouslySetInnerHTML: mdHtml(`= ${teach.example?.answer || ""}`) }),
      ),
      React.createElement("p", { key: "take", style: { marginTop: 20, padding: "12px 14px", background: "var(--indigo-50)", borderRadius: 10, color: "var(--text-strong)" }, dangerouslySetInnerHTML: mdHtml(`💡 ${teach.takeaway || ""}`) }),
      React.createElement("button", {
        key: "next",
        onClick: () => {
          if (getHearts().hearts <= 0) { setHeartWall(true); return; }
          setPhase("drill");
        },
        style: { marginTop: 24, width: "100%", padding: "14px", borderRadius: 12, background: "var(--indigo-600)", color: "#fff", border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer" },
      }, L("Start drill →", "Почати вправи →", "Начать упражнения →", "Commencer →", "Übung starten →")),
    ]);
  }

  function pairMatch(left, right) {
    setDrillDraft((d) => {
      const next = { ...d.matchPairs };
      for (const [k, v] of Object.entries(next)) {
        if (v === right) delete next[k];
      }
      next[left] = right;
      return { ...d, matchLeft: null, matchPairs: next };
    });
  }
  function unpairMatch(left) {
    setDrillDraft((d) => {
      const next = { ...d.matchPairs };
      delete next[left];
      return { ...d, matchPairs: next, matchLeft: null };
    });
  }
  function moveOrder(i, dir) {
    setDrillDraft((d) => {
      const order = d.order.slice();
      const j = i + dir;
      if (j < 0 || j >= order.length) return d;
      const tmp = order[i];
      order[i] = order[j];
      order[j] = tmp;
      return { ...d, order };
    });
  }
  function placeSlot(i) {
    setDrillDraft((d) => {
      const token = d.selectedBank;
      const slots = d.slots.slice();
      const bank = d.bank.slice();
      if (slots[i]) {
        bank.push(slots[i]);
        slots[i] = null;
      }
      if (token) {
        slots[i] = token;
        const idx = bank.indexOf(token);
        if (idx >= 0) bank.splice(idx, 1);
      }
      return { ...d, slots, bank, selectedBank: null };
    });
  }

  const chip = (tone, extra) => ({
    textAlign: "left",
    padding: "10px 12px",
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "var(--font-sans)",
    background: tone === "ok" ? "var(--emerald-50)" : tone === "bad" ? "var(--red-50)" : tone === "on" ? "var(--indigo-50)" : "var(--surface-card)",
    border: `1.5px solid ${tone === "ok" ? "var(--emerald-500)" : tone === "bad" ? "var(--red-500)" : tone === "on" ? "var(--indigo-500)" : "var(--border-default)"}`,
    cursor: drillRevealed ? "default" : "pointer",
    ...extra,
  });

  // ── Phase: Drill ──
  if (phase === "drill") {
    if (drillError) return wrap([header, React.createElement("p", { style: { color: "var(--red-600)" }, key: "e" }, drillError)]);
    if (!drillQs) return wrap([header, React.createElement("p", { key: "l", style: { color: "var(--text-muted)" } }, L("Loading exercises…", "Завантажуємо…", "Загружаем…", "Chargement…", "Lade…"))]);
    const q = drillQs[drillIdx];
    const usedRights = new Set(Object.values(drillDraft.matchPairs));
    const matchReady = q.type === "match" && Object.keys(drillDraft.matchPairs).length === q.pairs.length;
    const dropReady = q.type === "drag_drop" && drillDraft.slots.length === q.answers.length && drillDraft.slots.every(Boolean);
    const checkLabel = L("Check", "Перевірити", "Проверить", "Vérifier", "Prüfen");
    const stemParts = q.type === "drag_drop" ? splitDragStem(q.question) : null;
    return wrap([
      header,
      React.createElement("div", { key: "prog", style: { fontSize: 12, color: "var(--text-faint)", marginBottom: 10 } }, `${drillIdx + 1} / ${drillQs.length}`),
      q.type !== "drag_drop" && React.createElement("p", { key: "q", style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)" }, dangerouslySetInnerHTML: mdHtml(q.question) }),
      q.type === "mcq" && React.createElement("div", { key: "opts", style: { display: "flex", flexDirection: "column", gap: 8 } },
        ...q.options.map((opt, i) => {
          const wasChosen = drillSelected === i;
          const showCorrect = drillRevealed && i === q.correct;
          const showWrong = drillRevealed && wasChosen && i !== q.correct;
          return React.createElement("button", {
            key: i, onClick: () => submitDrillAnswer(i), disabled: drillRevealed,
            style: chip(showCorrect ? "ok" : showWrong ? "bad" : "off"),
            dangerouslySetInnerHTML: mdHtml(opt),
          });
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
          className: "learn-btn learn-btn--primary",
          onClick: () => submitDrillAnswer(drillFillInput),
          style: { marginTop: 8 },
        }, checkLabel),
      ),
      q.type === "match" && React.createElement("div", { key: "match", className: "learn-match" },
        React.createElement("div", { className: "learn-match-col" },
          ...q.pairs.map((pair) => {
            const chosen = drillDraft.matchPairs[pair.left];
            const tone = drillRevealed
              ? (chosen && normalizeAnswer(chosen) === normalizeAnswer(pair.right) ? "ok" : "bad")
              : (drillDraft.matchLeft === pair.left || chosen ? "on" : "off");
            return React.createElement("button", {
              key: pair.left,
              type: "button",
              disabled: drillRevealed,
              onClick: () => (chosen ? unpairMatch(pair.left) : setDrillDraft((d) => ({ ...d, matchLeft: pair.left }))),
              style: chip(tone),
              dangerouslySetInnerHTML: mdHtml(chosen ? `${pair.left} → ${chosen}` : pair.left),
            });
          }),
        ),
        React.createElement("div", { className: "learn-match-col" },
          ...drillDraft.matchRights.map((right) => React.createElement("button", {
            key: right,
            type: "button",
            disabled: drillRevealed || usedRights.has(right),
            onClick: () => drillDraft.matchLeft && pairMatch(drillDraft.matchLeft, right),
            style: chip(usedRights.has(right) ? "on" : "off", { opacity: usedRights.has(right) ? 0.55 : 1 }),
            dangerouslySetInnerHTML: mdHtml(right),
          })),
        ),
        !drillRevealed && React.createElement("button", {
          className: "learn-btn learn-btn--primary",
          disabled: !matchReady,
          onClick: () => matchReady && submitDrillAnswer(drillDraft.matchPairs),
        }, checkLabel),
      ),
      q.type === "order" && React.createElement("div", { key: "order", style: { display: "flex", flexDirection: "column", gap: 8 } },
        ...drillDraft.order.map((item, i) => {
          const tone = drillRevealed ? (normalizeAnswer(item) === normalizeAnswer(q.items[i]) ? "ok" : "bad") : "off";
          return React.createElement("div", { key: item + i, style: { display: "flex", gap: 8, alignItems: "stretch" } },
            React.createElement("div", { style: { ...chip(tone, { flex: 1, cursor: "default" }) }, dangerouslySetInnerHTML: mdHtml(`${i + 1}. ${item}`) }),
            !drillRevealed && React.createElement("button", {
              type: "button", "aria-label": "Up", disabled: i === 0,
              onClick: () => moveOrder(i, -1),
              style: chip("off", { minWidth: 40, textAlign: "center", opacity: i === 0 ? 0.4 : 1 }),
            }, "↑"),
            !drillRevealed && React.createElement("button", {
              type: "button", "aria-label": "Down", disabled: i === drillDraft.order.length - 1,
              onClick: () => moveOrder(i, 1),
              style: chip("off", { minWidth: 40, textAlign: "center", opacity: i === drillDraft.order.length - 1 ? 0.4 : 1 }),
            }, "↓"),
          );
        }),
        !drillRevealed && React.createElement("button", {
          className: "learn-btn learn-btn--primary",
          onClick: () => submitDrillAnswer(drillDraft.order),
        }, checkLabel),
      ),
      q.type === "drag_drop" && React.createElement("div", { key: "drop" },
        React.createElement("p", { style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)", lineHeight: 1.7 } },
          ...(stemParts || [q.question]).flatMap((part, i) => {
            const nodes = [React.createElement("span", { key: `t${i}`, dangerouslySetInnerHTML: mdHtml(part) })];
            if (i < q.answers.length) {
              const filled = drillDraft.slots[i];
              const tone = drillRevealed
                ? (normalizeAnswer(filled) === normalizeAnswer(q.answers[i]) ? "ok" : "bad")
                : (filled ? "on" : "off");
              nodes.push(React.createElement("button", {
                key: `s${i}`,
                type: "button",
                disabled: drillRevealed,
                onClick: () => placeSlot(i),
                style: chip(tone, { display: "inline-block", minWidth: 72, margin: "0 4px", padding: "4px 10px" }),
              }, filled || "___"));
            }
            return nodes;
          }),
        ),
        !drillRevealed && React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 } },
          ...drillDraft.bank.map((token) => React.createElement("button", {
            key: token,
            type: "button",
            onClick: () => setDrillDraft((d) => ({ ...d, selectedBank: d.selectedBank === token ? null : token })),
            style: chip(drillDraft.selectedBank === token ? "on" : "off"),
            dangerouslySetInnerHTML: mdHtml(token),
          })),
        ),
        !drillRevealed && React.createElement("button", {
          className: "learn-btn learn-btn--primary",
          disabled: !dropReady,
          onClick: () => dropReady && submitDrillAnswer(drillDraft.slots),
          style: { marginTop: 12 },
        }, checkLabel),
      ),
      q.type === "explain" && React.createElement("div", { key: "explain", style: { marginTop: 8 } },
        React.createElement("textarea", {
          value: drillDraft.explain,
          onChange: (e) => setDrillDraft((d) => ({ ...d, explain: e.target.value })),
          disabled: drillRevealed || drillGrading,
          rows: 5,
          placeholder: L("Explain in your own words", "Поясни своїми словами", "Объясни своими словами", "Explique avec tes mots", "Erkläre in eigenen Worten"),
          style: { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid var(--border-default)", fontSize: 15, fontFamily: "var(--font-sans)", boxSizing: "border-box", resize: "vertical" },
        }),
        !drillRevealed && React.createElement("button", {
          className: "learn-btn learn-btn--primary",
          disabled: drillGrading || !(drillDraft.explain || "").trim(),
          onClick: submitExplain,
          style: { marginTop: 8 },
        }, drillGrading
          ? L("Grading…", "Оцінюємо…", "Оцениваем…", "Correction…", "Bewerte…")
          : checkLabel),
        drillGradeError && React.createElement("p", { style: { color: "var(--red-600)", fontSize: 13 } }, drillGradeError),
        drillGrade && React.createElement("div", {
          style: { marginTop: 12, padding: 12, background: drillGrade.pass ? "var(--emerald-50)" : "var(--red-50)", borderRadius: 8, fontSize: 13, color: "var(--text-body)" },
          dangerouslySetInnerHTML: mdHtml(`**${drillGrade.score}/10** — ${drillGrade.feedback}`),
        }),
      ),
      drillRevealed && q.explanation && React.createElement("div", { key: "exp", style: { marginTop: 16, padding: 12, background: "var(--surface-muted)", borderRadius: 8, fontSize: 13, color: "var(--text-body)" }, dangerouslySetInnerHTML: mdHtml(q.explanation) }),
      drillRevealed && React.createElement("button", {
        key: "next",
        className: "learn-btn learn-btn--primary",
        onClick: nextDrill,
        style: { marginTop: 16 },
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
      React.createElement("p", { key: "q", style: { fontSize: 16, fontWeight: 600, color: "var(--text-strong)" }, dangerouslySetInnerHTML: mdHtml(q.question) }),
      React.createElement("div", { key: "opts", style: { display: "flex", flexDirection: "column", gap: 8 } },
        ...q.options.map((opt, i) => {
          const showCorrect = proveSelected !== null && i === q.correct;
          const showWrong = proveSelected === i && i !== q.correct;
          const bg = showCorrect ? "var(--emerald-50)" : showWrong ? "var(--red-50)" : "var(--surface-card)";
          const border = showCorrect ? "var(--emerald-500)" : showWrong ? "var(--red-500)" : "var(--border-default)";
          return React.createElement("button", {
            key: i, onClick: () => submitProveAnswer(i), disabled: proveSelected !== null,
            style: { textAlign: "left", padding: "12px 14px", background: bg, border: `1.5px solid ${border}`, borderRadius: 10, fontSize: 14, cursor: proveSelected !== null ? "default" : "pointer", fontFamily: "var(--font-sans)" },
            dangerouslySetInnerHTML: mdHtml(opt),
          });
        }),
      ),
    ]);
  }

  // ── Phase: Done ──
  if (phase === "done" && finalMastery) {
    const passed = finalMastery.mastery === "bronze";
    const medal = MASTERY_STYLE[finalMastery.mastery] || MASTERY_STYLE.unlocked;
    return wrap([
      header,
      React.createElement("div", { key: "res", style: { textAlign: "center", padding: "28px 0 8px" } },
        React.createElement("div", {
          className: passed ? "learn-done-medal" : undefined,
          style: { fontSize: 44, lineHeight: 1, color: medal.color },
          "aria-hidden": "true",
        }, medal.label),
        React.createElement("h3", {
          className: "learn-done-copy",
          style: { margin: "12px 0 0", fontSize: 22, color: "var(--text-strong)" },
        },
          passed ? L("Bronze mastery", "Бронзова майстерність", "Бронзовое мастерство", "Maîtrise bronze", "Bronze-Meisterschaft")
                 : L("Not quite yet", "Ще не зовсім", "Пока не совсем", "Pas encore", "Noch nicht"),
        ),
        React.createElement("p", {
          className: "learn-done-copy",
          style: { color: "var(--text-muted)", marginTop: 8, fontVariantNumeric: "tabular-nums" },
        }, `${finalMastery.correct} / ${finalMastery.total}`),
        passed && React.createElement("span", {
          className: "learn-done-check",
          "aria-hidden": "true",
        }, "✓"),
      ),
      React.createElement("button", {
        key: "back",
        type: "button",
        className: "learn-btn learn-btn--primary",
        onClick: () => leave(passed ? { nodeId: node.id, unlocked: true } : null),
        style: { marginTop: 16 },
      }, passed
        ? L("Continue", "Далі", "Далее", "Continuer", "Weiter")
        : L("Back to list", "До списку", "К списку", "Retour à la liste", "Zurück zur Liste")),
    ]);
  }

  return null;
}

// ─── Main list ────────────────────────────────────────────────────────────────

function LearnMain({ t }) {
  const lang = (t && t.code) || "en";
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[lang] || en);
  const exams = window.getExams ? window.getExams() : [];
  const options = exams.map((exam) => ({
    exam,
    tree: treeForExam(exam),
    label: window.examDisplayName ? window.examDisplayName(exam) : exam.name,
  })).filter((o) => o.tree);
  // Never auto-enter a tree when the student has more than one exam — even
  // if only one currently resolves. Otherwise Learn opens Chemistry and
  // hides Mathematics with no way back.
  const [pickedId, setPickedId] = React.useState(() => (
    exams.length === 1 && options.length === 1 ? options[0].exam.id : null
  ));
  const selected = options.find((o) => o.exam.id === pickedId) || null;
  const tree = selected ? selected.tree : null;

  const learnState = window.getLearn ? window.getLearn() : {};
  const nodeState = (tree && learnState[tree.examTaxonomy]) || {};
  // Ignore leftover `-boss` keys from 3.7e so the header stays lesson-only.
  const mastered = Object.entries(nodeState)
    .filter(([id, n]) => ["bronze", "silver", "gold", "legendary"].includes(n.mastery) && !id.endsWith("-boss"))
    .length;
  const total = tree ? totalNodeCount(tree) : 0;

  const [openNode, setOpenNode] = React.useState(null); // { unit, node }
  const [proSheet, setProSheet] = React.useState(false);
  const [running, setRunning] = React.useState(null);   // { unit, node }
  const [justUnlocked, setJustUnlocked] = React.useState(null);
  const [shownMastered, setShownMastered] = React.useState(mastered);
  // Learn store change → re-render (mastery pill updates immediately after
  // a Prove finish). Same subscribe pattern brain-store / profile-store use.
  const [, setTick] = React.useState(0);
  const enterOnceRef = React.useRef(true);
  const shownRef = React.useRef(mastered);
  const startBtnRef = React.useRef(null);

  React.useEffect(() => {
    const unsubLearn = window.subscribeLearn && window.subscribeLearn(() => setTick((n) => n + 1));
    const unsubExams = window.subscribeExams && window.subscribeExams(() => setTick((n) => n + 1));
    const unsubHearts = subscribeHearts(() => setTick((n) => n + 1));
    return () => { unsubLearn && unsubLearn(); unsubExams && unsubExams(); unsubHearts(); };
  }, []);

  React.useEffect(() => { enterOnceRef.current = false; }, []);

  React.useEffect(() => {
    if (running) return;
    const from = shownRef.current;
    if (from === mastered) return;
    if (prefersReducedMotion() || mastered < from) {
      shownRef.current = mastered;
      setShownMastered(mastered);
      return;
    }
    const t0 = performance.now();
    const dur = 400;
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - (1 - p) ** 3;
      setShownMastered(Math.round(from + (mastered - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else shownRef.current = mastered;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mastered, running]);

  React.useEffect(() => {
    if (!openNode) return;
    const onKey = (e) => { if (e.key === "Escape") setOpenNode(null); };
    window.addEventListener("keydown", onKey);
    if (startBtnRef.current) startBtnRef.current.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [openNode]);

  React.useEffect(() => {
    if (!justUnlocked) return;
    const id = setTimeout(() => setJustUnlocked(null), 520);
    return () => clearTimeout(id);
  }, [justUnlocked]);

  function masteryAria(m) {
    if (m === "bronze") return L("Bronze", "Бронза", "Бронза", "Bronze", "Bronze");
    if (m === "silver") return L("Silver", "Срібло", "Серебро", "Argent", "Silber");
    if (m === "gold") return L("Gold", "Золото", "Золото", "Or", "Gold");
    if (m === "legendary") return L("Legendary", "Легендарний", "Легендарный", "Légendaire", "Legendär");
    return L("Not started", "Ще не почато", "Ещё не начато", "Pas commencé", "Noch nicht begonnen");
  }

  function exitRunner(result) {
    setRunning(null);
    setOpenNode(null);
    if (result && result.unlocked && result.nodeId) setJustUnlocked(result.nodeId);
  }

  if (options.length === 0) {
    return React.createElement("div", { style: { padding: 24, fontFamily: "var(--font-sans)" } },
      React.createElement("h1", { style: { margin: "0 0 8px", fontSize: 24, fontWeight: 700, color: "var(--text-strong)" } }, L("Learn", "Навчання", "Обучение", "Apprendre", "Lernen")),
      React.createElement("p", { style: { margin: 0, color: "var(--text-muted)", fontSize: 14 } },
        L("Add an exam first — Learn opens a topic tree per exam.", "Спочатку додай іспит — Навчання відкриває дерево тем окремо для кожного.", "Сначала добавь экзамен — Обучение открывает дерево тем отдельно для каждого.", "Ajoute d'abord un examen.", "Füge zuerst eine Prüfung hinzu.")),
    );
  }

  if (!tree) {
    return React.createElement("div", {
      className: "learn-main",
      style: { maxWidth: 720, margin: "0 auto", padding: "20px 16px 60px", fontFamily: "var(--font-sans)" },
    },
      React.createElement("h1", { style: { margin: "0 0 6px", fontSize: 24, fontWeight: 700, color: "var(--text-strong)" } }, L("Learn", "Навчання", "Обучение", "Apprendre", "Lernen")),
      React.createElement("p", { style: { margin: "0 0 20px", color: "var(--text-muted)", fontSize: 13 } },
        L("Pick an exam. Topics stay separate.", "Обери іспит. Теми кожного — окремо.", "Выбери экзамен. Темы каждого — отдельно.", "Choisis un examen.", "Wähle eine Prüfung.")),
      React.createElement("div", { className: "ux-stagger", style: { display: "flex", flexDirection: "column", gap: 10 } },
        ...options.map((o) => React.createElement("button", {
          key: o.exam.id,
          type: "button",
          className: "ux-card ux-press",
          onClick: () => setPickedId(o.exam.id),
          style: {
            display: "flex", alignItems: "center", gap: 14, padding: "16px 16px",
            background: "var(--surface-card)", border: "1px solid var(--border-default)",
            borderLeft: `6px solid ${o.exam.color || "var(--indigo-500)"}`,
            borderRadius: "var(--radius-xl)", cursor: "pointer", textAlign: "left",
            fontFamily: "var(--font-sans)",
          },
        },
          React.createElement("div", { style: { flex: 1, minWidth: 0 } },
            React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: "var(--text-strong)" } }, o.label),
            React.createElement("div", { style: { fontSize: 12, color: "var(--text-muted)", marginTop: 4 } },
              L(`${totalNodeCount(o.tree)} topics`, `${totalNodeCount(o.tree)} тем`, `${totalNodeCount(o.tree)} тем`, `${totalNodeCount(o.tree)} sujets`, `${totalNodeCount(o.tree)} Themen`)),
          ),
          React.createElement("span", { "aria-hidden": "true", style: { color: "var(--text-faint)", fontSize: 20 } }, "→"),
        )),
      ),
    );
  }

  if (running) {
    return React.createElement(NodeRunner, {
      tree, unit: running.unit, node: running.node, lang, t,
      skipToProve: !!running.skipToProve,
      onExit: exitRunner,
    });
  }

  const pct = total > 0 ? mastered / total : 0;
  const shouldEnter = enterOnceRef.current;
  const examLabel = selected.label || tree.examTaxonomy.toUpperCase();
  const lessonFlat = flattenLessonNodes(tree);
  const lessonTotal = lessonFlat.length;
  const freeCount = freeTopicLimit(lessonTotal);
  const proCount = Math.max(0, lessonTotal - freeCount);
  const indexById = new Map(lessonFlat.map((row) => [row.node.id, row.index]));
  const progressLabel = L(
    `${shownMastered} of ${total} topics mastered · ${examLabel}`,
    `${shownMastered} із ${total} тем засвоєно · ${examLabel}`,
    `${shownMastered} из ${total} тем освоено · ${examLabel}`,
    `${shownMastered} sur ${total} sujets · ${examLabel}`,
    `${shownMastered} von ${total} · ${examLabel}`,
  );

  return React.createElement("div", {
    className: "learn-main" + (shouldEnter ? " learn-main--enter" : ""),
    style: { maxWidth: 720, margin: "0 auto", padding: "20px 16px 60px", fontFamily: "var(--font-sans)" },
  },
    React.createElement("div", { key: "head", style: { marginBottom: 24 } },
      options.length > 1 && React.createElement("div", {
        style: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 },
      },
        ...options.map((o) => {
          const on = o.exam.id === pickedId;
          return React.createElement("button", {
            key: o.exam.id,
            type: "button",
            className: "ux-press",
            onClick: () => { setOpenNode(null); setPickedId(o.exam.id); },
            style: {
              minHeight: 36, padding: "8px 14px", borderRadius: "var(--radius-full)",
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)",
              border: on ? "2px solid var(--indigo-500)" : "1px solid var(--border-default)",
              background: on ? "var(--indigo-50)" : "var(--surface-card)",
              color: on ? "var(--indigo-700)" : "var(--text-body)",
            },
          }, o.label);
        }),
      ),
      React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 } },
        React.createElement("h1", { style: { margin: 0, fontSize: 24, fontWeight: 700, color: "var(--text-strong)" } }, examLabel),
        React.createElement(HeartsBar, { t }),
      ),
      React.createElement("p", { style: { margin: "6px 0 0", color: "var(--text-muted)", fontSize: 13, fontVariantNumeric: "tabular-nums" } }, progressLabel),
      proCount > 0 && React.createElement("p", { style: { margin: "4px 0 0", color: "var(--text-faint)", fontSize: 12 } },
        L(`${freeCount} free · ${proCount} Pro`, `${freeCount} безкоштовно · ${proCount} Pro`, `${freeCount} бесплатно · ${proCount} Pro`, `${freeCount} gratuits · ${proCount} Pro`, `${freeCount} gratis · ${proCount} Pro`)),
      React.createElement("div", {
        className: "learn-progress",
        role: "progressbar",
        "aria-valuemin": 0,
        "aria-valuemax": total,
        "aria-valuenow": mastered,
        "aria-label": progressLabel,
        style: { "--learn-pct": String(pct) },
      }, React.createElement("div", { className: "learn-progress-fill" })),
    ),
    ...tree.units.map((unit, ui) => React.createElement("div", {
      key: unit.id,
      className: "learn-unit",
      style: { marginBottom: 28, "--learn-i": String(ui) },
    },
      React.createElement("h2", { style: { margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "var(--text-strong)", textTransform: "uppercase", letterSpacing: "0.06em" } }, localize(unit.title, lang)),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
        ...unit.nodes.map((node) => {
          const st = nodeState[node.id] || { mastery: "unlocked", attempts: 0 };
          const style = MASTERY_STYLE[st.mastery] || MASTERY_STYLE.unlocked;
          const unlockedNow = justUnlocked === node.id;
          const idx = indexById.has(node.id) ? indexById.get(node.id) : -1;
          const locked = idx >= 0 && topicIsLocked(idx, lessonTotal);
          return React.createElement("button", {
            key: node.id,
            type: "button",
            className: "learn-node",
            onClick: () => (locked ? setProSheet(true) : setOpenNode({ unit, node })),
            style: { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: 10, cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)", opacity: locked ? 0.72 : 1 },
          },
            React.createElement("span", {
              className: "learn-medal" + (unlockedNow ? " learn-medal--pop" : ""),
              style: { fontSize: 20, color: locked ? "var(--text-faint)" : style.color, minWidth: 24, textAlign: "center" },
              "aria-label": locked ? "Pro" : masteryAria(st.mastery),
            }, locked ? "🔒" : style.label),
            React.createElement("div", { style: { flex: 1 } },
              React.createElement("div", { style: { fontSize: 14, fontWeight: 600, color: "var(--text-strong)" } }, localize(node.title, lang)),
              React.createElement("div", { style: { fontSize: 11, color: "var(--text-faint)", marginTop: 2 } }, `~${node.estimatedMinutes} min · complexity ${node.complexity}/5`),
            ),
            locked && React.createElement("span", { style: { fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--indigo-600)", background: "var(--indigo-50)", padding: "3px 7px", borderRadius: 999 } }, "Pro"),
          );
        }),
      ),
    )),
    openNode && React.createElement("div", {
      key: "sheet",
      className: "learn-sheet-backdrop",
      onClick: () => setOpenNode(null),
      style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" },
    }, React.createElement("div", {
      className: "learn-sheet-panel",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "learn-sheet-title",
      onClick: (e) => e.stopPropagation(),
      style: { background: "var(--surface-card)", padding: "12px 20px calc(28px + env(safe-area-inset-bottom, 0px))", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 520, boxSizing: "border-box" },
    },
      React.createElement("div", {
        "aria-hidden": "true",
        style: { width: 36, height: 4, borderRadius: 99, background: "var(--border-strong)", margin: "0 auto 14px" },
      }),
      React.createElement("h3", { id: "learn-sheet-title", style: { margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-strong)" } }, localize(openNode.node.title, lang)),
      React.createElement("p", { style: { margin: "4px 0 16px", fontSize: 12, color: "var(--text-muted)" } },
        `${localize(openNode.unit.title, lang)} · complexity ${openNode.node.complexity}/5 · ~${openNode.node.estimatedMinutes} min`),
      React.createElement("button", {
        ref: startBtnRef,
        type: "button",
        className: "learn-btn learn-btn--primary",
        onClick: () => setRunning(openNode),
      }, L("Start", "Почати", "Начать", "Commencer", "Starten")),
      React.createElement("p", { style: { margin: "14px 0 2px", fontSize: 12, color: "var(--text-faint)", textAlign: "center" } },
        L("Already know this?", "Вже знаєш тему?", "Уже знаешь тему?", "Tu connais déjà ?", "Kennst du das schon?")),
      React.createElement("button", {
        type: "button",
        className: "learn-btn learn-btn--ghost",
        disabled: getHearts().hearts <= 0,
        onClick: () => {
          if (getHearts().hearts <= 0) return;
          setRunning({ unit: openNode.unit, node: openNode.node, skipToProve: true });
        },
      }, getHearts().hearts <= 0
        ? L("Skip to Prove — no hearts", "Перевірка — немає сердець", "Проверка — нет сердец", "Test — plus de cœurs", "Test — keine Herzen")
        : L("Skip to Prove", "Одразу до перевірки", "Сразу к проверке", "Aller au test", "Direkt zum Test")),
    )),
    proSheet && React.createElement(ProSheet, { key: "pro", freeCount, lockedCount: proCount, onClose: () => setProSheet(false), t }),
  );
}

Object.assign(window, { LearnMain });
