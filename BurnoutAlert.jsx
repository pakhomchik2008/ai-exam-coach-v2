// AI Exam Coach — Predictive Burnout Detection (#9)
function BurnoutAlert({ t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
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
    <div style={{ borderRadius: 'var(--radius-xl)', background: isIntensity ? 'var(--amber-50)' : 'var(--sky-50)', border: `1px solid ${isIntensity ? 'var(--amber-200)' : 'var(--sky-100)'}`, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, fontFamily: 'var(--font-sans)' }}>
      <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{isIntensity ? '⚠️' : '💙'}</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: '0 0 3px', fontWeight: 700, fontSize: 'var(--text-sm)', color: isIntensity ? 'var(--amber-700)' : 'var(--sky-700)' }}>
          {isIntensity
            ? L(`You've studied ${studyHours}h in the last 3 days`, `Ви навчалися ${studyHours} год за останні 3 дні`, `Вы занимались ${studyHours} ч за последние 3 дня`, `Vous avez étudié ${studyHours} h ces 3 derniers jours`, `Du hast in den letzten 3 Tagen ${studyHours} Std. gelernt`)
            : L(`You've missed ${totalMissed} sessions this week`, `Ви пропустили ${totalMissed} сесій цього тижня`, `Вы пропустили ${totalMissed} сессий на этой неделе`, `Vous avez manqué ${totalMissed} séances cette semaine`, `Du hast diese Woche ${totalMissed} Einheiten verpasst`)}
        </p>
        <p style={{ margin: '0 0 6px', fontSize: 'var(--text-xs)', color: isIntensity ? 'var(--amber-700)' : 'var(--sky-700)', lineHeight: 1.5 }}>
          {aiMsg || (isIntensity
            ? L('Consider a rest day or lighter session today — consistent pacing leads to better long-term retention.', 'Сьогодні варто відпочити або зменшити навантаження — стабільний темп дає краще довгострокове запам\'ятовування.', 'Сегодня стоит отдохнуть или снизить нагрузку — стабильный темп даёт лучшее долгосрочное запоминание.', 'Pensez à une journée de repos ou une séance plus légère — un rythme régulier améliore la rétention à long terme.', 'Gönn dir heute eine Pause oder eine leichtere Einheit — gleichmäßiges Tempo verbessert das Langzeitgedächtnis.')
            : L("Let's scale back next week's load and rebuild momentum gradually. Small consistent steps matter more than big catchups.", 'Зменшимо навантаження наступного тижня і поступово відновимо ритм. Малі стабільні кроки важливіші за великі надолуження.', 'Снизим нагрузку на следующей неделе и постепенно восстановим ритм. Маленькие стабильные шаги важнее больших навёрстываний.', "Allégeons la charge de la semaine prochaine et reconstruisons l'élan progressivement.", 'Reduzieren wir die Last nächste Woche und bauen den Schwung schrittweise wieder auf.'))}
        </p>
        {!aiMsg && !loading && (
          <button onClick={getAdvice} style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 11, color: isIntensity ? 'var(--amber-600)' : 'var(--sky-700)', cursor: 'pointer', fontFamily: 'var(--font-sans)', textDecoration: 'underline' }}>
            {L('Get personalised advice →', 'Отримати персональну пораду →', 'Получить персональный совет →', 'Obtenir un conseil personnalisé →', 'Persönlichen Rat erhalten →')}
          </button>
        )}
        {loading && <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>🤖 {L('Thinking…', 'Думаю…', 'Думаю…', 'Réflexion…', 'Denke nach…')}</p>}
      </div>
      <button onClick={dismiss} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-faint)', fontSize: 16, padding: 0, flexShrink: 0, lineHeight: 1 }}>✕</button>
    </div>
  );
}
window.BurnoutAlert = BurnoutAlert;
