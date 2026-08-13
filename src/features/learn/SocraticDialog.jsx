// Socratic Learn method — coach asks, student generates the idea.
//
// Third card on the Learn picker. Does not touch skill-tree Prove or
// mastery. One hint, one surrender, +50 XP on Got it (same as cards).

import { renderCoachMarkdown } from "../../lib/math-render";
import { WaitPress } from "../../components/WaitPress";
import { languageNameFor } from "../../lib/paper-language";
import { buildSocraticSystem, parseSocraticTurn, recentMistakeLines } from "./socratic";

function md(text) {
  return renderCoachMarkdown(text);
}

function examQual(resolved) {
  if (!resolved || !window.getExams) return null;
  const exam = window.getExams().find((e) => e.id === resolved.examId);
  return (window.examQualificationId && window.examQualificationId(exam)) || (exam && exam.qualificationId) || null;
}

function coachLanguageName(resolved, tcode) {
  return languageNameFor(examQual(resolved)) || ({ en: "English", uk: "Ukrainian", ru: "Russian", fr: "French", de: "German" }[tcode] || "English");
}

function mistakeSnippet(topic) {
  const list = typeof window !== "undefined" && window.getMistakes ? window.getMistakes() : [];
  return recentMistakeLines(list, topic);
}

export function SocraticDialog({ topic, onExit, t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
  const lang = t?.code || "en";
  const [turns, setTurns] = React.useState([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [hintUsed, setHintUsed] = React.useState(false);
  const [surrendered, setSurrendered] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [marked, setMarked] = React.useState(false);
  const grantedRef = React.useRef(false);
  const threadRef = React.useRef([]);
  const bottomRef = React.useRef(null);
  const resolved = React.useMemo(
    () => (window.resolveTopicForBrain ? window.resolveTopicForBrain(topic) : null),
    [topic],
  );

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [turns, loading]);

  async function askCoach(userText, flags = {}) {
    const complete = window.brainComplete || ((a) => window.claude.complete(a));
    const nextHint = flags.hintUsed ?? hintUsed;
    const nextSurrender = flags.surrendered ?? surrendered;
    const history = threadRef.current.concat(
      userText ? [{ role: "user", content: userText }] : [],
    );
    const qual = examQual(resolved);
    const system = buildSocraticSystem({
      topic,
      language: coachLanguageName(resolved, lang),
      mistakes: mistakeSnippet(topic),
      hintUsed: nextHint,
      surrendered: nextSurrender,
      justSurrendered: flags.justSurrendered === true,
      turnCount: history.filter((m) => m.role === "user").length,
    });
    const topicContext = resolved ? { examId: resolved.examId, topicName: resolved.topicName } : undefined;
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error(
      L("Took too long — try again.", "Це тривало занадто довго — спробуйте ще раз.", "Это длилось слишком долго — попробуйте ещё раз.", "Cela a pris trop de temps — réessayez.", "Das hat zu lange gedauert — versuche es erneut."),
    )), 45000));
    const raw = await Promise.race([
      complete({
        system,
        messages: history.length ? history : [{ role: "user", content: `Start the dialogue on: ${topic}` }],
        topicContext,
        paperQual: qual,
      }),
      timeout,
    ]);
    const turn = parseSocraticTurn(raw);
    threadRef.current = history.concat([{ role: "assistant", content: turn.say }]);
    return turn;
  }

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    askCoach("")
      .then((turn) => {
        if (cancelled) return;
        setTurns([{ role: "coach", ...turn }]);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message || L("Failed to load", "Не вдалося завантажити", "Не удалось загрузить", "Échec du chargement", "Fehler beim Laden"));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [topic]);

  async function send(text, flags = {}, display) {
    const trimmed = (text || "").trim();
    if (!trimmed || loading || done) return;
    setInput("");
    setError(null);
    setTurns((prev) => [...prev, { role: "you", say: display || trimmed }]);
    setLoading(true);
    try {
      const turn = await askCoach(trimmed, flags);
      setTurns((prev) => [...prev, { role: "coach", ...turn }]);
      // Surrender must stay open for practice — ignore a premature "done".
      if (turn.kind === "done" && !flags.justSurrendered) setDone(true);
    } catch (e) {
      setError(e.message || L("Failed to load", "Не вдалося завантажити", "Не удалось загрузить", "Échec du chargement", "Fehler beim Laden"));
    } finally {
      setLoading(false);
    }
  }

  function useHint() {
    if (hintUsed || loading || done) return;
    setHintUsed(true);
    send(
      "[HINT] One leading hint, still a question, not the answer.",
      { hintUsed: true },
      L("Give a hint", "Дай підказку", "Дай подсказку", "Un indice", "Tipp"),
    );
  }

  function surrender() {
    if (surrendered || loading || done) return;
    setSurrendered(true);
    send(
      "[SURRENDER] Explain fully, then give two short practice problems. Do not end the dialogue.",
      { surrendered: true, justSurrendered: true },
      L("I give up — show me", "Здаюсь, покажи", "Сдаюсь, покажи", "J’abandonne", "Zeig es mir"),
    );
  }

  function markAsRead() {
    if (grantedRef.current || marked) return;
    grantedRef.current = true;
    setMarked(true);
    if (window.addXp) window.addXp(50);
    if (resolved && window.recordReview) {
      window.recordReview({
        examId: resolved.examId,
        topicIdx: resolved.topicIdx,
        topicName: resolved.topicName,
        correct: true,
      });
    }
  }

  const wrap = (children) => React.createElement("div", {
    style: { maxWidth: 720, margin: "0 auto", padding: "24px 20px 28px", fontFamily: "var(--font-sans)", color: "var(--text-body)", display: "flex", flexDirection: "column", minHeight: "70vh" },
  }, children);

  const header = React.createElement("div", { key: "hdr", style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 18 } },
    React.createElement("button", { onClick: onExit, style: { background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-muted)", padding: 0 } }, "←"),
    React.createElement("span", { style: { fontSize: 11, textTransform: "uppercase", color: "var(--text-faint)", letterSpacing: "0.08em", fontWeight: 600 } },
      L("Explain with the coach", "Пояснити разом", "Объяснить вместе", "Expliquer ensemble", "Gemeinsam erklären")),
  );

  if (loading && turns.length === 0) {
    return wrap([header, React.createElement(WaitPress, {
      key: "l",
      title: L("Coach is thinking…", "Коуч думає…", "Коуч думает…", "Le coach réfléchit…", "Coach denkt nach…"),
      lang,
      compact: true,
    })]);
  }

  return wrap([
    header,
    React.createElement("h1", { key: "title", style: { margin: "0 0 16px", fontSize: 22, fontWeight: 700, color: "var(--text-strong)", lineHeight: 1.3 } }, topic),
    React.createElement("div", { key: "log", style: { display: "flex", flexDirection: "column", gap: 12, flex: 1 } },
      ...turns.map((turn, i) => React.createElement("div", {
        key: i,
        style: {
          alignSelf: turn.role === "you" ? "flex-end" : "stretch",
          maxWidth: turn.role === "you" ? "85%" : "100%",
          padding: "12px 14px",
          borderRadius: 14,
          background: turn.role === "you" ? "var(--indigo-50)" : "var(--surface-card)",
          border: "1px solid var(--border-default)",
        },
      },
        React.createElement("div", { style: { fontSize: 16, lineHeight: 1.65 }, dangerouslySetInnerHTML: { __html: md(turn.say) } }),
        turn.formal && React.createElement("div", {
          style: { marginTop: 10, padding: "10px 12px", background: "var(--surface-muted)", borderRadius: 10, fontSize: 14, lineHeight: 1.6 },
          dangerouslySetInnerHTML: { __html: md(turn.formal) },
        }),
      )),
      loading && React.createElement("div", { key: "wait", style: { fontSize: 13, color: "var(--text-faint)" } },
        L("…", "…", "…", "…", "…")),
      error && React.createElement("p", { key: "e", style: { color: "var(--red-600)", margin: 0 } }, error),
      React.createElement("div", { key: "end", ref: bottomRef }),
    ),
    !done && React.createElement("div", { key: "tools", style: { display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" } },
      React.createElement("button", {
        type: "button",
        onClick: useHint,
        disabled: hintUsed || loading,
        style: { padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border-default)", background: "var(--surface-card)", cursor: hintUsed || loading ? "default" : "pointer", fontFamily: "var(--font-sans)", fontSize: 13, color: hintUsed ? "var(--text-faint)" : "var(--text-body)" },
      }, hintUsed
        ? L("Hint used", "Підказка витрачена", "Подсказка потрачена", "Indice utilisé", "Tipp verbraucht")
        : L("Give a hint", "Дай підказку", "Дай подсказку", "Un indice", "Tipp")),
      React.createElement("button", {
        type: "button",
        onClick: surrender,
        disabled: loading,
        style: { padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border-default)", background: "transparent", cursor: loading ? "default" : "pointer", fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)" },
      }, L("I give up — show me", "Здаюсь, покажи", "Сдаюсь, покажи", "J’abandonne", "Zeig es mir")),
    ),
    done
      ? (marked
        ? React.createElement("div", { key: "xp", style: { marginTop: 18, color: "var(--emerald-600)", fontWeight: 600 } }, L("+50 XP", "+50 XP", "+50 XP", "+50 XP", "+50 XP"))
        : React.createElement("button", {
          key: "got",
          type: "button",
          onClick: markAsRead,
          style: { marginTop: 18, padding: "12px 24px", borderRadius: 999, background: "var(--indigo-600)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" },
        }, L("Got it · +50 XP", "Зрозумів · +50 XP", "Понял · +50 XP", "Compris · +50 XP", "Verstanden · +50 XP")))
      : React.createElement("form", {
        key: "form",
        onSubmit: (e) => { e.preventDefault(); send(input); },
        style: { display: "flex", gap: 8, marginTop: 12 },
      },
        React.createElement("input", {
          value: input,
          onChange: (e) => setInput(e.target.value),
          disabled: loading,
          placeholder: L("Your answer…", "Ваша відповідь…", "Ваш ответ…", "Ta réponse…", "Deine Antwort…"),
          style: { flex: 1, padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border-default)", fontFamily: "var(--font-sans)", fontSize: 15, background: "var(--surface-card)", color: "var(--text-body)" },
        }),
        React.createElement("button", {
          type: "submit",
          disabled: loading || !input.trim(),
          style: { padding: "12px 16px", borderRadius: 12, background: "var(--indigo-600)", color: "#fff", border: "none", fontWeight: 700, cursor: loading ? "default" : "pointer", fontFamily: "var(--font-sans)" },
        }, L("Send", "Надіслати", "Отправить", "Envoyer", "Senden")),
      ),
  ]);
}
