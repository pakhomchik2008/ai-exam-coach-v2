// AI Exam Coach — Predictive Burnout Detection (#9)
function BurnoutAlert({ t }) {
  const [dismissed, setDismissed] = React.useState(() => {
    try { return sessionStorage.getItem('burnout_dismissed') === '1'; } catch { return false; }
  });
  const [aiMsg, setAiMsg]   = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const week = window.deriveWeek();
  // Only days strictly before today count as "past" — a session scheduled
  // for later this week isn't "missed" just because it hasn't happened yet.
  const todayIdx = week.findIndex((d) => d.today);
  const past = todayIdx >= 0 ? week.slice(0, todayIdx) : [];
  const pastDone = past.reduce((a, d) => a + d.completed, 0);
  const studyHours = Math.round(pastDone * 0.75 * 10) / 10; // ~45 min each
  const totalMissed = past.reduce((a, d) => a + Math.max(0, d.scheduled - d.completed), 0);

  const dismiss = () => { setDismissed(true); try { sessionStorage.setItem('burnout_dismissed','1'); } catch {} };

  // High intensity: >4h in 3 days; Missed: >3 scheduled sessions skipped
  const scenario = studyHours >= 4.5 ? 'intensity' : totalMissed >= 4 ? 'missed' : null;
  if (!scenario || dismissed) return null;

  const isIntensity = scenario === 'intensity';

  const getAdvice = async () => {
    setLoading(true);
    try {
      const p = isIntensity
        ? `A student studied ${studyHours}h in 3 days (${pastDone} sessions). Write a 1-sentence warm, supportive message about sustainable study and rest. Don't be alarming.`
        : `A student missed ${totalMissed} sessions this week. Write a 1-sentence encouraging message about rebuilding consistency with a lighter schedule.`;
      const lang = window.aiLangDirective ? window.aiLangDirective() : "";
      setAiMsg(await window.claude.complete(lang ? { system: lang, messages: [{ role: "user", content: p }] } : p));
    } catch { setAiMsg(null); }
    setLoading(false);
  };

  return (
    <div style={{ borderRadius: 'var(--radius-xl)', background: isIntensity ? '#fffbeb' : '#f0f9ff', border: `1px solid ${isIntensity ? '#fde68a' : '#bae6fd'}`, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, fontFamily: 'var(--font-sans)' }}>
      <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{isIntensity ? '⚠️' : '💙'}</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: '0 0 3px', fontWeight: 700, fontSize: 'var(--text-sm)', color: isIntensity ? '#92400e' : '#0369a1' }}>
          {isIntensity ? `You've studied ${studyHours}h in the last 3 days` : `You've missed ${totalMissed} sessions this week`}
        </p>
        <p style={{ margin: '0 0 6px', fontSize: 'var(--text-xs)', color: isIntensity ? '#b45309' : '#0284c7', lineHeight: 1.5 }}>
          {aiMsg || (isIntensity
            ? 'Consider a rest day or lighter session today — consistent pacing leads to better long-term retention.'
            : "Let's scale back next week's load and rebuild momentum gradually. Small consistent steps matter more than big catchups.")}
        </p>
        {!aiMsg && !loading && (
          <button onClick={getAdvice} style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 11, color: isIntensity ? '#d97706' : '#0284c7', cursor: 'pointer', fontFamily: 'var(--font-sans)', textDecoration: 'underline' }}>
            Get personalised advice →
          </button>
        )}
        {loading && <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>🤖 Thinking…</p>}
      </div>
      <button onClick={dismiss} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-faint)', fontSize: 16, padding: 0, flexShrink: 0, lineHeight: 1 }}>✕</button>
    </div>
  );
}
window.BurnoutAlert = BurnoutAlert;
