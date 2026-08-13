// Worked-example fading — Level 1 full solution, then hide more steps.
//
// Fourth Learn method. Sonnet writes the plan once; we score fills locally.

import { tokenizeMath, renderMathSegment, escapeHtml as escapeHtmlMath } from "../../lib/math-render";
import { WaitPress } from "../../components/WaitPress";
import { languageNameFor } from "../../lib/paper-language";
import { hiddenIndexes, parseFadePlan, stepMatches } from "./fading";

function md(text) {
  if (!text) return "";
  return tokenizeMath(String(text)).map((s) => {
    if (s.kind !== "text") return renderMathSegment(s);
    return escapeHtmlMath(s.value).replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");
  }).join("");
}

function examQual(resolved) {
  if (!resolved || !window.getExams) return null;
  const exam = window.getExams().find((e) => e.id === resolved.examId);
  return (window.examQualificationId && window.examQualificationId(exam)) || (exam && exam.qualificationId) || null;
}

async function generateFadePlan({ topic, resolved, tcode }) {
  const complete = window.brainComplete || ((a) => window.claude.complete(a));
  const topicContext = resolved ? { examId: resolved.examId, topicName: resolved.topicName } : undefined;
  const lang = languageNameFor(examQual(resolved)) || ({ en: "English", uk: "Ukrainian", ru: "Russian", fr: "French", de: "German" }[tcode] || "English");
  const system = `Build a fading worked example for "${topic}".

OUTPUT ONLY valid JSON:
{"title":"...","problem":"one concrete problem","steps":[{"reveal":"what this step does","answer":"short fill-in","accept":["equivalent form"],"hint":"tiny hint"}]}

Rules:
- 4 or 5 steps, each answer a short phrase / number / formula a student can type.
- accept lists every reasonable equivalent (2x+2 and 2(x+1) if both valid).
- Language: ${lang}. Math as LaTeX in problem/reveal only — answers are plain/LaTeX short.`;
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 45000));
  const raw = await Promise.race([
    complete({ system, messages: [{ role: "user", content: `Fade this topic: ${topic}` }], topicContext, paperQual: examQual(resolved) }),
    timeout,
  ]);
  const parsed = window.parseJSON ? window.parseJSON(raw) : JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
  return parseFadePlan(parsed);
}

export function FadingDialog({ topic, onExit, t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
  const [plan, setPlan] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [level, setLevel] = React.useState(1);
  const [fills, setFills] = React.useState({});
  const [checked, setChecked] = React.useState({});
  const [firstTry, setFirstTry] = React.useState({});
  const [marked, setMarked] = React.useState(false);
  const grantedRef = React.useRef(false);
  const resolved = React.useMemo(
    () => (window.resolveTopicForBrain ? window.resolveTopicForBrain(topic) : null),
    [topic],
  );

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    generateFadePlan({ topic, resolved, tcode: t?.code })
      .then((p) => { if (!cancelled) { setPlan(p); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(e.message || "fail"); setLoading(false); } });
    return () => { cancelled = true; };
  }, [topic]);

  const hidden = plan ? hiddenIndexes(level, plan.steps.length) : [];
  const hiddenSet = new Set(hidden);
  const allHiddenOk = hidden.every((i) => checked[i]);
  const firstTryRate = hidden.length
    ? hidden.filter((i) => firstTry[i] === true).length / hidden.length
    : 1;
  const maxLevel = plan ? Math.min(5, plan.steps.length + 1) : 5;
  const isLast = level >= maxLevel;

  function checkStep(i) {
    if (!plan || checked[i]) return;
    const ok = stepMatches(fills[i] || "", plan.steps[i]);
    setFirstTry((prev) => (i in prev ? prev : { ...prev, [i]: ok }));
    if (ok) setChecked((prev) => ({ ...prev, [i]: true }));
  }

  function nextLevel() {
    if (!allHiddenOk && hidden.length) return;
    if (level > 1 && firstTryRate < 0.8) {
      setFills({}); setChecked({}); setFirstTry({});
      return;
    }
    if (isLast) return;
    setLevel((n) => n + 1);
    setFills({}); setChecked({}); setFirstTry({});
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

  if (loading) return wrap([header, React.createElement(WaitPress, { key: "l", title: L("Building the example…", "Готуємо приклад…", "Готовим пример…", "Préparation…", "Beispiel…"), lang: t?.code, compact: true })]);
  if (error || !plan) return wrap([header, React.createElement("p", { key: "e", style: { color: "var(--red-600)" } }, error || "—")]);

  return wrap([
    header,
    React.createElement("h1", { key: "t", style: { margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "var(--text-strong)" } }, plan.title),
    React.createElement("div", { key: "lvl", style: { fontSize: 13, color: "var(--text-muted)", marginBottom: 16 } },
      L(`Step ${level} of ${maxLevel}`, `Крок ${level} з ${maxLevel}`, `Шаг ${level} из ${maxLevel}`, `Étape ${level} / ${maxLevel}`, `Schritt ${level} von ${maxLevel}`)),
    React.createElement("div", { key: "p", style: { padding: "16px 18px", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: 14, marginBottom: 16 }, dangerouslySetInnerHTML: { __html: md(plan.problem) } }),
    React.createElement("div", { key: "steps", style: { display: "flex", flexDirection: "column", gap: 10 } },
      ...plan.steps.map((step, i) => {
        const hide = hiddenSet.has(i);
        const ok = checked[i];
        const missed = i in firstTry && firstTry[i] === false && !ok;
        return React.createElement("div", {
          key: i,
          style: { padding: "14px 16px", borderRadius: 12, border: `1px solid ${ok ? "var(--emerald-400)" : "var(--border-default)"}`, background: "var(--surface-card)" },
        },
          React.createElement("div", { style: { fontSize: 12, color: "var(--text-faint)", marginBottom: 6 } }, `${i + 1}.`),
          hide && !ok
            ? React.createElement("div", null,
                React.createElement("div", { style: { fontSize: 13, color: "var(--text-muted)", marginBottom: 8 } }, step.hint || L("Fill this step", "Заповніть крок", "Заполните шаг", "Complète cette étape", "Fülle diesen Schritt")),
                React.createElement("div", { style: { display: "flex", gap: 8 } },
                  React.createElement("input", {
                    value: fills[i] || "",
                    onChange: (e) => setFills((p) => ({ ...p, [i]: e.target.value })),
                    onKeyDown: (e) => { if (e.key === "Enter") checkStep(i); },
                    style: { flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-default)", fontFamily: "var(--font-sans)", background: "var(--surface-page)", color: "var(--text-body)" },
                  }),
                  React.createElement("button", {
                    type: "button",
                    onClick: () => checkStep(i),
                    style: { padding: "10px 14px", borderRadius: 10, border: "none", background: "var(--indigo-600)", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" },
                  }, L("Check", "Перевірити", "Проверить", "Vérifier", "Prüfen")),
                ),
                missed && React.createElement("p", { style: { margin: "8px 0 0", fontSize: 13, color: "var(--text-muted)" } },
                  L("Not yet. Hint stays. Try again.", "Ще ні. Підказка лишається. Спробуйте ще.", "Ещё нет. Подсказка остаётся.", "Pas encore.", "Noch nicht.")),
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
