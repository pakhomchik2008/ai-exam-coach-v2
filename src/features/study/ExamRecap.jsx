// AI Exam Coach — Exam Recap: the screen shown after a finished practice drill
// or mock exam (Phase 3 §3c).
//
// Deliberately NOT the same component as SessionRecap.jsx. That one closes a
// *study session* and its whole job is asking which topics were covered so
// mastery can move. This one closes an *attempt* and answers a different
// question — "how did I score, and am I improving?" — which needs history the
// study recap has no concept of. Merging them would mean one component with
// two disjoint halves and a mode flag.
//
// Everything on this screen is computed from a real finished attempt:
//   · the score is the answers the student actually gave
//   · the delta is a real previous attempt, or absent on a first attempt —
//     never "+0%" standing in for "no comparison exists"
//   · the mistakes listed are real journal entries from THIS attempt
//   · the AI comment is generated from those numbers, and simply doesn't
//     render if generation fails. No canned encouragement.
import { recordAttempt, scaledScoreFor, scoreTrend } from "../../lib/exam-attempts";
import { renderCoachMarkdown } from "../../lib/math-render";

const MAX_LISTED_MISTAKES = 3;

// Fixed 0–100 domain rather than min/max of the data: an auto-scaled sparkline
// turns a 71→73 wobble into a dramatic climb, which would be a lie told with
// geometry.
function Sparkline({ points, t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[(t && t.code) || "en"] || en);
  if (!Array.isArray(points) || points.length < 2) return null;
  const w = 132, h = 34, pad = 3;
  const stepX = (w - pad * 2) / (points.length - 1);
  const yOf = (pct) => h - pad - (Math.max(0, Math.min(100, pct)) / 100) * (h - pad * 2);
  const coords = points.map((p, i) => [pad + i * stepX, yOf(p)]);
  const last = coords[coords.length - 1];
  const rising = points[points.length - 1] >= points[0];
  const stroke = rising ? "var(--emerald-500)" : "var(--amber-500)";
  return (
    <svg
      width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img"
      aria-label={L(
        `Last ${points.length} attempts: ${points.join("%, ")}%`,
        `Останні ${points.length} спроб: ${points.join("%, ")}%`,
        `Последние ${points.length} попыток: ${points.join("%, ")}%`,
        `${points.length} dernières tentatives : ${points.join(" %, ")} %`,
        `Letzte ${points.length} Versuche: ${points.join("%, ")}%`
      )}
      style={{ overflow: "visible" }}
    >
      <line x1={pad} y1={yOf(50)} x2={w - pad} y2={yOf(50)} stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="2 3" />
      <polyline
        points={coords.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="3" fill={stroke} />
    </svg>
  );
}

/**
 * @param {{
 *   mode: "real" | "practice",
 *   examId: string | null,
 *   examName: string,
 *   taxonomy: string | null,
 *   correct: number,
 *   total: number,
 *   weakTopics: string[],
 *   sessionStartedAt: number | null,
 *   headline: string,
 *   stats?: { val: string | number, label: string, color?: string }[] | null,
 *   review?: { question: string, options: string[], correct: number, selected: number | null | undefined, explanation: string }[] | null,
 *   onExit: () => void,
 *   onDrillWeak?: ((topics: string[]) => void) | null,
 *   t: { code?: string } | null,
 * }} props
 */
function ExamRecap({
  mode,                 // "real" | "practice"
  examId,               // null for a cross-subject practice drill
  examName,
  taxonomy,             // qualification id (nmt/sat/...) — picks the score scale
  correct,
  total,
  weakTopics,
  sessionStartedAt,     // ms; scopes "mistakes made this attempt"
  headline,             // engine-specific title ("Time's up!", "Practice Complete!")
  stats = null,         // [{ val, label, color }] — engine-specific extras
  review = null,        // optional per-question review rows (mock exam only)
  onExit,
  onDrillWeak = null,   // optional; omit to hide the drill CTA
  t,
}) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[(t && t.code) || "en"] || en);
  const weak = Array.isArray(weakTopics) ? weakTopics : [];
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  // ── Record the attempt exactly once, on mount ───────────────────────────
  // The ref (not state) is what makes it once: a re-render must not append a
  // second row for the same attempt. exam-attempts.ts additionally collapses
  // an immediate duplicate, so a remount can't fabricate history either.
  const recordedRef = React.useRef(false);
  const [recorded, setRecorded] = React.useState(null); // { attempt, previous }
  React.useEffect(() => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    try {
      setRecorded(recordAttempt({ examId, examName, mode, correct, total, taxonomy, weakTopics: weak }));
    } catch {
      setRecorded(null); // history unavailable — the score below still renders
    }
  }, []);

  const previous = recorded && recorded.previous;
  const delta = previous ? pct - previous.scorePct : null;
  const trend = recorded ? scoreTrend(examId, mode) : [];
  const scaled = scaledScoreFor({ scorePct: pct, taxonomy });

  // ── Mistakes made during THIS attempt ───────────────────────────────────
  // Time-scoped rather than examId-scoped: examId is frequently null on a
  // journal entry (mistakes-store.jsx logs it only when the quiz resolved a
  // real exam/topic link), so filtering by it would silently show nothing for
  // exactly the drills that need it most.
  const sessionMistakes = React.useMemo(() => {
    if (!window.getMistakes || !sessionStartedAt) return [];
    try {
      return window.getMistakes()
        .filter((m) => m.at >= sessionStartedAt)
        .slice(0, MAX_LISTED_MISTAKES);
    } catch {
      return [];
    }
  }, [sessionStartedAt, recorded]);

  // ── AI coach comment ────────────────────────────────────────────────────
  const [comment, setComment] = React.useState(null);
  const [commentLoading, setCommentLoading] = React.useState(true);
  React.useEffect(() => {
    if (!recorded) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const complete = window.brainComplete;
        const deltaLine = delta === null
          ? "This is their first recorded attempt at this exam."
          : `Their previous attempt scored ${previous.scorePct}%, so this is a change of ${delta > 0 ? "+" : ""}${delta} points.`;
        const reply = await complete({
          system: "You are an exam coach reviewing a student's mock result. Reply with exactly 2 short sentences, max 30 words total: one honest read of where they stand, one specific next action. No praise padding, no emoji, no bullet points. If the score dropped, say so plainly and constructively.",
          messages: [{
            role: "user",
            content: `Exam: ${examName || "practice drill"}\nScore: ${correct}/${total} (${pct}%)\n${deltaLine}\nWeakest topics: ${weak.length ? weak.join(", ") : "none stood out"}`,
          }],
        });
        if (!cancelled) setComment(String(reply).trim());
      } catch {
        if (!cancelled) setComment(null); // offline / no key — section just doesn't render
      } finally {
        if (!cancelled) setCommentLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [recorded]);

  const emoji = pct >= 80 ? "🏆" : pct >= 60 ? "✨" : pct >= 40 ? "💪" : "📖";
  const scoreColor = pct >= 70 ? "var(--emerald-700)" : pct >= 45 ? "var(--amber-700)" : "var(--red-700)";
  const deltaColor = delta > 0 ? "var(--emerald-700)" : delta < 0 ? "var(--red-700)" : "var(--text-muted)";
  const deltaBg = delta > 0 ? "var(--emerald-50)" : delta < 0 ? "var(--red-50)" : "var(--surface-card)";

  const card = {
    background: "var(--surface-card)", border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-xl)", padding: "var(--space-4)", marginBottom: "var(--space-4)", textAlign: "left",
  };
  const sectionLabel = {
    margin: "0 0 var(--space-2)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
    textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", fontFamily: "var(--font-sans)", padding: "0 20px 24px", overflowY: "auto" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", padding: "28px 4px 20px", animation: "fadeUp 0.5s ease-out" }}>
        <p style={{ fontSize: 52, margin: "0 0 6px" }}>{emoji}</p>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)", margin: "0 0 4px" }}>{headline}</h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", margin: 0 }}>
          {correct}/{total} {L("correct", "правильно", "правильно", "correct", "richtig")}{examName ? ` · ${examName}` : ""}
        </p>
      </div>

      {/* Score + delta vs the last attempt */}
      <div style={{ ...card, display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 auto", minWidth: 120 }}>
          <p style={{ margin: 0, fontSize: 34, fontWeight: "var(--weight-bold)", fontFamily: "var(--font-mono)", color: scoreColor, lineHeight: 1.1 }}>
            {scaled.approximate ? `${pct}%` : scaled.text}
            {!scaled.approximate && scaled.label && (
              <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-muted)", marginLeft: 6 }}>{scaled.label}</span>
            )}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            {scaled.approximate
              // No published scale for this qualification — say so rather than
              // dressing a percentage up as an exam score.
              ? L("Percent correct", "Відсоток правильних", "Процент правильных", "Pourcentage de bonnes réponses", "Prozent richtig")
              : L(`≈ on the ${String(taxonomy).toUpperCase()} scale · ${pct}% correct`, `≈ за шкалою ${String(taxonomy).toUpperCase()} · ${pct}% правильних`, `≈ по шкале ${String(taxonomy).toUpperCase()} · ${pct}% правильных`, `≈ sur l'échelle ${String(taxonomy).toUpperCase()} · ${pct}% correct`, `≈ auf der ${String(taxonomy).toUpperCase()}-Skala · ${pct}% richtig`)}
          </p>
        </div>

        {delta !== null && (
          <div style={{ textAlign: "center", background: deltaBg, borderRadius: "var(--radius-lg)", padding: "8px 14px" }}>
            <p style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", fontFamily: "var(--font-mono)", color: deltaColor }}>
              {delta > 0 ? "+" : ""}{delta}
            </p>
            <p style={{ margin: 0, fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)" }}>
              {L("vs last", "проти минулої", "к прошлой", "vs préc.", "vs. letzte")}
            </p>
          </div>
        )}

        {trend.length >= 2 && <Sparkline points={trend} t={t} />}
      </div>

      {delta === null && recorded && (
        <p style={{ margin: "-8px 0 var(--space-4)", fontSize: "var(--text-xs)", color: "var(--text-faint)", textAlign: "center" }}>
          {L("First attempt at this exam — future ones will show your progress here.", "Перша спроба цього іспиту — наступні покажуть ваш прогрес тут.", "Первая попытка этого экзамена — следующие покажут ваш прогресс здесь.", "Première tentative — les suivantes montreront votre progression ici.", "Erster Versuch — künftige zeigen hier deinen Fortschritt.")}
        </p>
      )}

      {/* Engine-specific stats */}
      {Array.isArray(stats) && stats.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 8, marginBottom: "var(--space-4)" }}>
          {stats.map((s, i) => (
            <div key={i} style={{ textAlign: "center", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "10px 4px" }}>
              <p style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: "var(--weight-bold)", color: s.color || "var(--text-strong)" }}>{s.val}</p>
              <p style={{ margin: "2px 0 0", fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase" }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Weak topics + drill CTA */}
      {weak.length > 0 && (
        <div style={{ ...card, background: "var(--amber-50)", border: "1px solid var(--amber-200)" }}>
          <p style={{ ...sectionLabel, color: "var(--amber-700)" }}>
            {L("Weakest this attempt", "Найслабше цієї спроби", "Самое слабое в этой попытке", "Le plus faible cette fois", "Am schwächsten diesmal")}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {weak.map((tp, i) => (
              <span key={i} style={{ padding: "3px 10px", borderRadius: "var(--radius-full)", background: "var(--surface-card)", color: "var(--amber-700)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)" }}>{tp}</span>
            ))}
          </div>
          {onDrillWeak && (
            <button
              onClick={() => onDrillWeak(weak)}
              style={{ marginTop: "var(--space-3)", width: "100%", padding: "11px 0", borderRadius: "var(--radius-lg)", border: "none", background: "var(--amber-700)", color: "var(--white)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-bold)", cursor: "pointer", fontFamily: "var(--font-sans)" }}
            >
              🎯 {L(`Drill these ${weak.length}`, `Відпрацювати ці ${weak.length}`, `Отработать эти ${weak.length}`, `Travailler ces ${weak.length}`, `Diese ${weak.length} üben`)} →
            </button>
          )}
        </div>
      )}

      {/* What went wrong — real journal entries from this attempt */}
      {sessionMistakes.length > 0 && (
        <div style={card}>
          <p style={sectionLabel}>
            {L("What tripped you up", "Що вас підвело", "Что вас подвело", "Ce qui vous a piégé", "Woran es hakte")}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {sessionMistakes.map((m) => (
              <div key={m.id}>
                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-strong)", lineHeight: 1.45 }} dangerouslySetInnerHTML={{ __html: renderCoachMarkdown(m.question) }} />
                {m.options && m.options[m.correctIndex] != null && (
                  <p style={{ margin: "3px 0 0", fontSize: "var(--text-xs)", color: "var(--emerald-700)", fontWeight: "var(--weight-medium)" }} dangerouslySetInnerHTML={{ __html: `✓ ${renderCoachMarkdown(m.options[m.correctIndex])}` }} />
                )}
                <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{m.topic}</p>
              </div>
            ))}
          </div>
          <p style={{ margin: "var(--space-3) 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
            {L("Saved to your Mistake Journal for review.", "Збережено у Журналі помилок для повторення.", "Сохранено в Журнал ошибок для повторения.", "Enregistré dans votre Journal d'erreurs.", "Im Fehlerjournal zum Wiederholen gespeichert.")}
          </p>
        </div>
      )}

      {/* AI coach read on the result */}
      {(commentLoading || comment) && (
        <div style={{ ...card, background: "linear-gradient(135deg,var(--indigo-50),var(--indigo-50))", border: "1px solid var(--indigo-200)" }}>
          <p style={{ ...sectionLabel, color: "var(--indigo-600)" }}>
            🤖 {L("Coach's read", "Думка коуча", "Мнение коуча", "Avis du coach", "Einschätzung des Coachs")}
          </p>
          {commentLoading
            ? (
              <div style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map((j) => (
                  <span key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--indigo-200)", display: "inline-block", animation: `loadDot 1.2s ${j * 0.2}s ease-in-out infinite` }} />
                ))}
              </div>
            )
            : <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-body)", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: renderCoachMarkdown(comment) }} />}
        </div>
      )}

      {/* Per-question review (mock exam only) */}
      {Array.isArray(review) && review.length > 0 && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <p style={sectionLabel}>{L("Full review", "Повний огляд", "Полный обзор", "Revue complète", "Vollständige Übersicht")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {review.map((r, i) => {
              const answered = r.selected !== null && r.selected !== undefined;
              const isCorrect = answered && r.selected === r.correct;
              const opts = r.options || [];
              return (
                <div key={i} style={{ background: "var(--surface-card)", border: `1px solid ${answered ? (isCorrect ? "var(--emerald-100)" : "var(--red-200)") : "var(--border-subtle)"}`, borderRadius: "var(--radius-lg)", padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                    <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)", lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: `${i + 1}. ${renderCoachMarkdown(r.question)}` }} />
                    <span style={{ fontSize: 15, flexShrink: 0 }}>{!answered ? "⬜" : isCorrect ? "✅" : "❌"}</span>
                  </div>
                  <p style={{ margin: "0 0 2px", fontSize: "var(--text-xs)", color: "var(--text-muted)" }} dangerouslySetInnerHTML={{ __html: answered
                      ? `${L("Your answer", "Ваша відповідь", "Ваш ответ", "Votre réponse", "Deine Antwort")}: ${renderCoachMarkdown(opts[r.selected] || "")}`
                      : L("Not answered", "Немає відповіді", "Нет ответа", "Sans réponse", "Nicht beantwortet") }} />
                  {!isCorrect && (
                    <p style={{ margin: "0 0 6px", fontSize: "var(--text-xs)", color: "var(--emerald-700)", fontWeight: "var(--weight-semibold)" }} dangerouslySetInnerHTML={{ __html: `${L("Correct", "Правильно", "Правильно", "Correct", "Richtig")}: ${renderCoachMarkdown(opts[r.correct] || "")}` }} />
                  )}
                  <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)", lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: renderCoachMarkdown(r.explanation) }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={onExit}
        style={{ width: "100%", padding: "14px 0", borderRadius: "var(--radius-lg)", border: "none", background: "var(--indigo-600)", color: "var(--white)", fontSize: "var(--text-base)", fontWeight: "var(--weight-bold)", cursor: "pointer", fontFamily: "var(--font-sans)" }}
      >
        {L("Done", "Готово", "Готово", "Terminé", "Fertig")} →
      </button>
    </div>
  );
}

export { ExamRecap };
