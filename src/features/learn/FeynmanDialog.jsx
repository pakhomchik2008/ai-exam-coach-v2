// Feynman teach-back — student explains, Sonnet grades.
// Mic uses the browser SpeechRecognition API only. No Whisper.

import { renderCoachMarkdown } from "../../lib/math-render";
import { WaitPress } from "../../components/WaitPress";
import { languageNameFor } from "../../lib/paper-language";
import { buildFeynmanSystem, parseFeynmanGrade } from "./feynman";

function md(text) {
  return renderCoachMarkdown(text);
}

function examQual(resolved) {
  if (!resolved || !window.getExams) return null;
  const exam = window.getExams().find((e) => e.id === resolved.examId);
  return (window.examQualificationId && window.examQualificationId(exam)) || (exam && exam.qualificationId) || null;
}

function speechLang(qual, ui) {
  if (languageNameFor(qual) === "Ukrainian") return "uk-UA";
  if (languageNameFor(qual) === "German") return "de-DE";
  if (languageNameFor(qual) === "Polish") return "pl-PL";
  if (languageNameFor(qual) === "French") return "fr-FR";
  return ui === "ru" ? "ru-RU" : ui === "uk" ? "uk-UA" : ui === "de" ? "de-DE" : ui === "fr" ? "fr-FR" : "en-US";
}

export function FeynmanDialog({ topic, onExit, t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
  const [draft, setDraft] = React.useState("");
  const [listening, setListening] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [grade, setGrade] = React.useState(null);
  const [marked, setMarked] = React.useState(false);
  const grantedRef = React.useRef(false);
  const recRef = React.useRef(null);
  const resolved = React.useMemo(
    () => (window.resolveTopicForBrain ? window.resolveTopicForBrain(topic) : null),
    [topic],
  );
  const qual = examQual(resolved);
  const canSpeak = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  function toggleMic() {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;
    if (listening && recRef.current) {
      recRef.current.stop();
      setListening(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = speechLang(qual, t?.code);
    rec.interimResults = true;
    rec.onresult = (ev) => {
      const text = Array.from(ev.results).map((r) => r[0].transcript).join(" ");
      setDraft(text);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  async function gradeDraft() {
    const text = draft.trim();
    if (!text || loading) return;
    setLoading(true); setError(null); setGrade(null);
    const complete = window.brainComplete || ((a) => window.claude.complete(a));
    const lang = languageNameFor(qual) || ({ en: "English", uk: "Ukrainian", ru: "Russian", fr: "French", de: "German" }[t?.code] || "English");
    const topicContext = resolved ? { examId: resolved.examId, topicName: resolved.topicName } : undefined;
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 45000));
    try {
      const raw = await Promise.race([
        complete({
          system: buildFeynmanSystem(topic, lang),
          messages: [{ role: "user", content: text }],
          topicContext,
          paperQual: qual,
        }),
        timeout,
      ]);
      const parsed = window.parseJSON ? window.parseJSON(raw) : JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
      setGrade(parseFeynmanGrade(parsed));
    } catch (e) {
      setError(e.message || L("Failed", "Не вдалося", "Не удалось", "Échec", "Fehler"));
    } finally {
      setLoading(false);
    }
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
      L("Explain it back", "Поясни мені", "Объясни мне", "Explique-moi", "Erklär es")),
  );

  return wrap([
    header,
    React.createElement("h1", { key: "t", style: { margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "var(--text-strong)" } }, topic),
    React.createElement("p", { key: "lead", style: { color: "var(--text-muted)", lineHeight: 1.55, margin: "0 0 16px" } },
      L("Explain this to a beginner in 60–90 seconds. Voice or text.",
        "Поясніть тему новачку за 60–90 секунд. Голос або текст.",
        "Объясните тему новичку за 60–90 секунд. Голос или текст.",
        "Explique ça à un débutant en 60–90 s.",
        "Erkläre das einem Anfänger in 60–90 s.")),
    React.createElement("textarea", {
      key: "ta",
      value: draft,
      onChange: (e) => setDraft(e.target.value),
      rows: 8,
      placeholder: L("Start with what it is, then how it works, then one example.",
        "Почніть з того, що це є, як працює, і один приклад.",
        "Начните с того, что это, как работает, и один пример.",
        "Dis ce que c’est, comment ça marche, un exemple.",
        "Was es ist, wie es geht, ein Beispiel."),
      style: { width: "100%", boxSizing: "border-box", padding: 14, borderRadius: 14, border: "1px solid var(--border-default)", fontFamily: "var(--font-sans)", fontSize: 15, lineHeight: 1.6, background: "var(--surface-card)", color: "var(--text-body)", resize: "vertical" },
    }),
    React.createElement("div", { key: "row", style: { display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" } },
      canSpeak && React.createElement("button", {
        type: "button",
        onClick: toggleMic,
        style: { padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border-default)", background: listening ? "var(--indigo-50)" : "var(--surface-card)", cursor: "pointer", fontFamily: "var(--font-sans)", fontWeight: 600 },
      }, listening
        ? L("Stop", "Стоп", "Стоп", "Stop", "Stop")
        : L("Speak", "Голос", "Голос", "Parler", "Sprechen")),
      React.createElement("button", {
        type: "button",
        disabled: !draft.trim() || loading,
        onClick: gradeDraft,
        style: { padding: "10px 16px", borderRadius: 10, border: "none", background: "var(--indigo-600)", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", opacity: !draft.trim() || loading ? 0.5 : 1 },
      }, L("Grade me", "Оціни", "Оцени", "Note-moi", "Bewerten")),
    ),
    loading && React.createElement(WaitPress, { key: "w", title: L("Listening to your explanation…", "Читаю пояснення…", "Читаю объяснение…", "Lecture…", "Lese…"), lang: t?.code, compact: true }),
    error && React.createElement("p", { key: "e", style: { color: "var(--red-600)" } }, error),
    grade && React.createElement("div", { key: "g", style: { marginTop: 18, padding: 16, borderRadius: 14, border: "1px solid var(--border-default)", background: "var(--surface-card)" } },
      React.createElement("div", { style: { fontWeight: 700, marginBottom: 8 } },
        L(`Clarity ${grade.clarity}/10 · Completeness ${grade.completeness}/10`,
          `Ясність ${grade.clarity}/10 · Повнота ${grade.completeness}/10`,
          `Ясность ${grade.clarity}/10 · Полнота ${grade.completeness}/10`,
          `Clarté ${grade.clarity}/10 · Completude ${grade.completeness}/10`,
          `Klarheit ${grade.clarity}/10 · Vollständigkeit ${grade.completeness}/10`)),
      React.createElement("div", { dangerouslySetInnerHTML: { __html: md(grade.feedback) } }),
      grade.gaps.length > 0 && React.createElement("ul", { style: { margin: "10px 0 0", paddingLeft: 18 } },
        ...grade.gaps.map((g, i) => React.createElement("li", { key: i }, g))),
      marked
        ? React.createElement("div", { style: { marginTop: 14, color: "var(--emerald-600)", fontWeight: 600 } }, "+50 XP")
        : React.createElement("button", {
          type: "button",
          onClick: markAsRead,
          style: { marginTop: 14, padding: "12px 24px", borderRadius: 999, background: "var(--indigo-600)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" },
        }, L("Got it · +50 XP", "Зрозумів · +50 XP", "Понял · +50 XP", "Compris · +50 XP", "Verstanden · +50 XP")),
    ),
  ]);
}
