// Worked-example fading — Level 1 full solution, then hide more steps.
//
// Fourth Learn method. Sonnet writes the plan once; we score fills locally.

import { renderCoachMarkdown } from "../../lib/math-render";
import { WaitPress } from "../../components/WaitPress";
import { copyLangFor, languageNameFor, paperQualForExam } from "../../lib/paper-language";
import { hiddenIndexes, parseFadePlan, stepMatches } from "./fading";

function md(text) {
  return renderCoachMarkdown(text);
}

function examQual(resolved) {
  if (!resolved || !window.getExams) return null;
  const exam = window.getExams().find((e) => e.id === resolved.examId);
  const family = (window.examQualificationId && window.examQualificationId(exam)) || (exam && exam.qualificationId) || null;
  return paperQualForExam({ ...exam, qualificationId: family }) || family;
}

async function generateFadePlan({ topic, resolved, tcode }) {
  const topicContext = resolved ? { examId: resolved.examId, topicName: resolved.topicName } : undefined;
  const lang = languageNameFor(examQual(resolved)) || ({ en: "English", uk: "Ukrainian", ru: "Russian", fr: "French", de: "German" }[tcode] || "English");
  const system = `Build a fading worked example for "${topic}".

OUTPUT ONLY valid JSON:
{"title":"...","problem":"one concrete problem","steps":[{"reveal":"what this step does","answer":"short fill-in","accept":["equivalent form"],"hint":"tiny hint"}]}

Rules:
- 4 or 5 steps, each answer a short phrase / number / formula a student can type.
- accept lists every reasonable equivalent AND common paraphrases (divisible by 3, 3 divides it, sum is a multiple of 3).
- hint is a nudge after a miss — not the question itself. reveal is the step instruction the student sees while filling.
- Language: ${lang}. Math as LaTeX in problem/reveal only — answers are plain/LaTeX short.`;
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 45000));
  const parsed = await Promise.race([
    window.brainCompleteJSON({ system, messages: [{ role: "user", content: `Fade this topic: ${topic}` }], topicContext, paperQual: examQual(resolved) }),
    timeout,
  ]);
  return parseFadePlan(parsed);
}

export function FadingDialog({ topic, onExit, t }) {
  const resolved = React.useMemo(
    () => (window.resolveTopicForBrain ? window.resolveTopicForBrain(topic) : null),
    [topic],
  );
  const copy = copyLangFor(examQual(resolved), t?.code || "en");
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[copy] || en);
  const [plan, setPlan] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [level, setLevel] = React.useState(1);
  const [fills, setFills] = React.useState({});
  const [checked, setChecked] = React.useState({});
  const [tries, setTries] = React.useState({});
  const [marked, setMarked] = React.useState(false);
  const grantedRef = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    generateFadePlan({ topic, resolved, tcode: copy })
      .then((p) => { if (!cancelled) { setPlan(p); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(e.message || "fail"); setLoading(false); } });
    return () => { cancelled = true; };
  }, [topic]);

  const hidden = plan ? hiddenIndexes(level, plan.steps.length) : [];
  const hiddenSet = new Set(hidden);
  const allHiddenOk = hidden.every((i) => checked[i]);
  const maxLevel = plan ? Math.min(5, plan.steps.length + 1) : 5;
  const isLast = level >= maxLevel;

  function checkStep(i) {
    if (!plan || checked[i]) return;
    const text = (fills[i] || "").trim();
    if (!text) return;
    const ok = stepMatches(text, plan.steps[i]);
    const nextTries = (tries[i] || 0) + 1;
    setTries((prev) => ({ ...prev, [i]: (prev[i] || 0) + 1 }));
    // Two misses: show the step. Leaving them in an input with a dead Check
    // is how "I can't press send" happens — Next level stays disabled until
    // every hidden fill is marked checked.
    if (ok || nextTries >= 2) setChecked((prev) => ({ ...prev, [i]: true }));
  }

  function nextLevel() {
    if (!allHiddenOk && hidden.length) return;
    if (isLast) return;
    setLevel((n) => n + 1);
    setFills({}); setChecked({}); setTries({});
  }

  function markAsRead() {
    if (grantedRef.current || marked) return;
    grantedRef.current = true;
    setMarked(true);
    if (window.addXp) window.addXp(50);
    if (resolved && window.recordReview) {
      window.recordReview({ examId: resolved.examId, topicIdx: resolved.topicIdx, topicName: resolved.topicName, correct: true });
    }
  }

  const wrap = (children) => React.createElement("div", {
    style: { maxWidth: 720, margin: "0 auto", padding: "24px 20px 80px", fontFamily: "var(--font-sans)", color: "var(--text-body)" },
  }, children);
  const header = React.createElement("div", { key: "hdr", style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 18 } },
    React.createElement("button", { onClick: onExit, style: { background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-muted)", padding: 0 } }, "←"),
    React.createElement("span", { style: { fontSize: 11, textTransform: "uppercase", color: "var(--text-faint)", letterSpacing: "0.08em", fontWeight: 600 } },
      L("Step by step", "Крок за кроком", "Шаг за шагом", "Étape par étape", "Schritt für Schritt")),
  );

  if (loading) return wrap([header, React.createElement(WaitPress, { key: "l", title: L("Building the example…", "Готуємо приклад…", "Готовим пример…", "Préparation…", "Beispiel…"), lang: copy, compact: true })]);
  if (error || !plan) return wrap([header, React.createElement("p", { key: "e", style: { color: "var(--red-600)" } }, error || "—")]);

  return wrap([
    header,
    React.createElement("h1", { key: "t", style: { margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "var(--text-strong)" }, dangerouslySetInnerHTML: { __html: md(plan.title || "") } }),
    React.createElement("div", { key: "lvl", style: { fontSize: 13, color: "var(--text-muted)", marginBottom: 16 } },
      L(`Step ${level} of ${maxLevel}`, `Крок ${level} з ${maxLevel}`, `Шаг ${level} из ${maxLevel}`, `Étape ${level} / ${maxLevel}`, `Schritt ${level} von ${maxLevel}`)),
    React.createElement("div", { key: "p", style: { padding: "16px 18px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: 14, marginBottom: 16 }, dangerouslySetInnerHTML: { __html: md(plan.problem) } }),
    React.createElement("div", { key: "steps", style: { display: "flex", flexDirection: "column", gap: 10 } },
      ...plan.steps.map((step, i) => {
        const hide = hiddenSet.has(i);
        const ok = checked[i];
        const missCount = tries[i] || 0;
        const empty = !(fills[i] || "").trim();
        return React.createElement("div", {
          key: i,
          style: { padding: "14px 16px", borderRadius: 12, border: `1px solid ${ok ? "var(--emerald-400)" : "var(--border-default)"}`, background: "var(--surface-card)" },
        },
          React.createElement("div", { style: { fontSize: 12, color: "var(--text-faint)", marginBottom: 6 } }, `${i + 1}.`),
          hide && !ok
            ? React.createElement("div", null,
                React.createElement("div", { style: { fontSize: 15, fontWeight: 600, color: "var(--text-strong)", marginBottom: 8 }, dangerouslySetInnerHTML: { __html: md(step.reveal) } }),
                React.createElement("div", { style: { display: "flex", gap: 8 } },
                  React.createElement("input", {
                    value: fills[i] || "",
                    onChange: (e) => setFills((p) => ({ ...p, [i]: e.target.value })),
                    onKeyDown: (e) => { if (e.key === "Enter") checkStep(i); },
                    style: { flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-default)", fontFamily: "var(--font-sans)", background: "var(--surface-page)", color: "var(--text-body)" },
                  }),
                  React.createElement("button", {
                    type: "button",
                    disabled: empty,
                    onClick: () => checkStep(i),
                    style: { padding: "10px 14px", borderRadius: 10, border: "none", background: "var(--indigo-600)", color: "#fff", fontWeight: 700, cursor: empty ? "not-allowed" : "pointer", opacity: empty ? 0.5 : 1, fontFamily: "var(--font-sans)" },
                  }, L("Check", "Перевірити", "Проверить", "Vérifier", "Prüfen")),
                ),
                missCount > 0 && step.hint && React.createElement("div", { style: { margin: "10px 0 0", fontSize: 14, lineHeight: 1.5, color: "var(--text-body)" } },
                  React.createElement("strong", { style: { color: "var(--indigo-700)", marginRight: 6 } }, L("Hint", "Підказка", "Подсказка", "Indice", "Hinweis")),
                  React.createElement("span", { dangerouslySetInnerHTML: { __html: md(step.hint) } })),
                missCount > 0 && !step.hint && React.createElement("p", { style: { margin: "8px 0 0", fontSize: 13, color: "var(--text-muted)" } },
                  L("Not yet. Try again.", "Ще ні. Спробуйте ще.", "Ещё нет. Попробуй ещё.", "Pas encore.", "Noch nicht.")),
              )
            : React.createElement("div", { dangerouslySetInnerHTML: { __html: md(`${step.reveal} — **${step.answer}**`) } }),
        );
      }),
    ),
    React.createElement("div", { key: "nav", style: { marginTop: 20 } },
      isLast && allHiddenOk
        ? (marked
          ? React.createElement("div", { style: { color: "var(--emerald-600)", fontWeight: 600 } }, "+50 XP")
          : React.createElement("button", {
            type: "button",
            onClick: markAsRead,
            style: { padding: "12px 24px", borderRadius: 999, background: "var(--indigo-600)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" },
          }, L("Got it · +50 XP", "Зрозумів · +50 XP", "Понял · +50 XP", "Compris · +50 XP", "Verstanden · +50 XP")))
        : React.createElement("button", {
          type: "button",
          disabled: hidden.length > 0 && !allHiddenOk,
          onClick: nextLevel,
          style: { padding: "12px 20px", borderRadius: 12, background: "var(--indigo-600)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", opacity: hidden.length > 0 && !allHiddenOk ? 0.5 : 1 },
        }, L("Next level", "Наступний рівень", "Следующий уровень", "Niveau suivant", "Nächstes Level")),
    ),
  ]);
}
