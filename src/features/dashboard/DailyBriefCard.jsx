// Examik — Dashboard's live counterpart to the daily_brief email
// (api/notifications-cron.js): same three ingredients (today's plan status,
// streak, nearest exam countdown) computed from data the Dashboard already
// has, so opening the app shows what the email would have said. Ultra adds
// one AI-written line, cached once per local day in localStorage so it
// costs exactly one AI call per Ultra user per day, not one per render.

const AI_CACHE_KEY = "daily_brief_ai_v1";
const AI_TIMEOUT_MS = 30000;

function todayLocalKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readCachedAiLine() {
  try {
    const raw = JSON.parse(localStorage.getItem(AI_CACHE_KEY) || "null");
    if (raw && raw.date === todayLocalKey() && typeof raw.text === "string") return raw.text;
  } catch { /* corrupt cache — refetch */ }
  return null;
}

function writeCachedAiLine(text) {
  try { localStorage.setItem(AI_CACHE_KEY, JSON.stringify({ date: todayLocalKey(), text })); } catch { /* storage full/blocked — not fatal */ }
}

function DailyBriefCard({ L, streak, focusSession, activeCourses }) {
  const isUltra = !!(window.getProfile && window.getProfile().tier === "ultra");
  const [aiLine, setAiLine] = React.useState(() => (isUltra ? readCachedAiLine() : null));
  const [aiLoading, setAiLoading] = React.useState(false);

  const nearestExam = activeCourses.length
    ? [...activeCourses].sort((a, b) => a.daysAway - b.daysAway)[0]
    : null;

  // Home/Lock Screen widget — no-ops on web and when the widget extension
  // isn't installed, so this is safe to fire on every Dashboard mount.
  React.useEffect(() => {
    if (window.pushWidgetBrief) {
      window.pushWidgetBrief({
        streak,
        planTopic: focusSession ? focusSession.topic : "",
        examName: nearestExam ? nearestExam.subject : "",
        examDaysAway: nearestExam ? nearestExam.daysAway : -1,
      });
    }
  }, [streak, focusSession, nearestExam]);

  React.useEffect(() => {
    if (!isUltra || aiLine || aiLoading) return;
    let cancelled = false;
    setAiLoading(true);
    const planText = focusSession ? `${focusSession.topic} (${focusSession.subject})` : "no session scheduled — a rest day";
    const examText = nearestExam ? `${nearestExam.subject} in ${nearestExam.daysAway} day${nearestExam.daysAway === 1 ? "" : "s"}` : "no active exam";
    const prompt = [
      `Today's plan: ${planText}. Current streak: ${streak} day${streak === 1 ? "" : "s"}. Nearest exam: ${examText}.`,
      `Write exactly one short, honest, encouraging sentence for a daily in-app brief. Plain language, no jargon, no exclamation marks.`,
    ].join(" ");
    const aiLangDirective = window.aiLangDirective ? window.aiLangDirective() : "";
    const call = window.brainComplete
      ? window.brainComplete(aiLangDirective ? { system: aiLangDirective, messages: [{ role: "user", content: prompt }] } : { prompt })
      : Promise.resolve(null);
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), AI_TIMEOUT_MS));
    Promise.race([call, timeout]).then((text) => {
      if (cancelled) return;
      if (typeof text === "string" && text.trim()) {
        setAiLine(text.trim());
        writeCachedAiLine(text.trim());
      }
    }).catch(() => { /* best-effort — the rest of the card still renders */ }).finally(() => {
      if (!cancelled) setAiLoading(false);
    });
    return () => { cancelled = true; };
    // Deliberately keyed on isUltra alone: fires once per mount (cache/day
    // already gates repeats), not on every streak/focusSession recompute.
  }, [isUltra]);

  const planLine = focusSession
    ? L("Today: {topic} · {subject}", "Сьогодні: {topic} · {subject}", "Сегодня: {topic} · {subject}", "Aujourd'hui : {topic} · {subject}", "Heute: {topic} · {subject}")
        .replace("{topic}", focusSession.topic).replace("{subject}", focusSession.subject)
    : L("No session scheduled today — a good day to rest, or get ahead.", "Сьогодні сесій немає — можна відпочити або піти вперед.", "Сегодня сессий нет — можно отдохнуть или пойти вперёд.", "Aucune séance aujourd'hui — repose-toi ou prends de l'avance.", "Heute keine Einheit — Zeit zum Ausruhen oder Vorarbeiten.");

  const examLine = nearestExam
    ? L("{subject}: {n} day{s} away", "{subject}: залишилось {n} дн.", "{subject}: осталось {n} дн.", "{subject} : dans {n} j.", "{subject}: noch {n} Tag{s}")
        .replace("{subject}", nearestExam.subject).replace("{n}", nearestExam.daysAway).replace("{s}", nearestExam.daysAway === 1 ? "" : "s")
    : null;

  return (
    <section style={{ borderRadius: "var(--radius-xl)", background: "var(--surface-card)", border: "1px solid var(--border-default)", padding: "var(--space-4)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
        <span style={{ fontSize: 16 }} aria-hidden="true">☀️</span>
        <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>
          {L("Daily brief", "Щоденний огляд", "Ежедневный обзор", "Résumé quotidien", "Tagesüberblick")}
        </span>
      </div>

      <p style={{ margin: "0 0 4px", fontSize: "var(--text-sm)", color: "var(--text-body)" }}>{planLine}</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", marginTop: 6 }}>
        {streak > 0 && (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>🔥 {streak} {L("day streak", "днів поспіль", "дней подряд", "j. de série", "Tage Serie")}</span>
        )}
        {examLine && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>📅 {examLine}</span>}
      </div>

      {isUltra && (aiLine || aiLoading) && (
        <div className="ux-fadeup" style={{ marginTop: "var(--space-3)", paddingTop: "var(--space-3)", borderTop: "1px solid var(--border-subtle)" }}>
          <span style={{ fontFamily: "'JetBrains Mono', var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--chrome-gold, #C6A572)", fontWeight: 700 }}>
            {L("ULTRA INSIGHT", "ULTRA ІНСАЙТ", "ULTRA ИНСАЙТ", "ULTRA INSIGHT", "ULTRA INSIGHT")}
          </span>
          <p style={{ margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--text-body)", lineHeight: 1.5 }}>
            {aiLine || L("Thinking…", "Думаю…", "Думаю…", "Réflexion…", "Denke nach…")}
          </p>
        </div>
      )}
    </section>
  );
}
window.DailyBriefCard = DailyBriefCard;

// Module marker: these files carry no import/export of their own (they still
// communicate via `window` globals), and without one the JSX transform treats
// the file as a CommonJS script and emits a bare `require()` call that throws
// in the browser. Removed once this module uses real imports.
export {};
