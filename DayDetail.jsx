// AI Exam Coach — DayDetail: tap a WeekStrip cell to see what happened or what's planned.
function DayDetail({ day, dayIndex, onClose, onStart, t }) {
  const { Button, Badge } = window.AIExamCoachDesignSystem_99e467;
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[(t && t.code) || "en"] || en);

  const fullLabels = {
    en: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
    uk: ["Понеділок","Вівторок","Середа","Четвер","П'ятниця","Субота","Неділя"],
    ru: ["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"],
    fr: ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"],
    de: ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"],
  };
  const lang = (t && t.code) || "en";
  const fullDay = (fullLabels[lang] || fullLabels.en)[dayIndex] || day.label;

  const isPast = !day.today && day.sessions && day.sessions.every((s) => s.done);
  const isToday = !!day.today;
  const isFuture = !isToday && !isPast && day.sessions && day.sessions.some((s) => !s.done);
  const isEmpty = !day.sessions || day.sessions.length === 0;

  const done = (day.sessions || []).filter((s) => s.done);
  const pending = (day.sessions || []).filter((s) => !s.done);
  const totalMins = (day.sessions || []).reduce((a, s) => a + (s.duration || 0), 0);
  const doneMins = done.reduce((a, s) => a + (s.duration || 0), 0);

  const statusTone = isPast ? "easy" : isToday ? "medium" : "default";
  const statusLabel = isEmpty
    ? L("Rest day", "Вихідний", "Выходной", "Repos", "Ruhetag")
    : isPast
    ? L("Complete", "Виконано", "Выполнено", "Complété", "Abgeschlossen")
    : isToday
    ? L("Today", "Сьогодні", "Сегодня", "Aujourd'hui", "Heute")
    : L("Planned", "Заплановано", "Запланировано", "Planifié", "Geplant");

  const coachLine = isEmpty
    ? L("No sessions scheduled — rest and recover. Consistent rest improves retention.", "Сесій немає — відпочивайте. Відпочинок покращує запам'ятовування.", "Сессий нет — отдыхайте. Отдых улучшает запоминание.", "Pas de séance — reposez-vous. Le repos améliore la rétention.", "Keine Einheiten — erhol dich. Erholung verbessert die Retention.")
    : isPast && done.length === day.scheduled
    ? L(`Great work — all ${done.length} sessions completed. `, `Чудова робота — всі ${done.length} сесії виконані. `, `Отличная работа — все ${done.length} сессии выполнены. `, `Excellent — ${done.length} séances complétées. `, `Super — alle ${done.length} Einheiten abgeschlossen. `) + L("Keep this momentum.", "Тримайте темп.", "Держите темп.", "Gardez ce rythme.", "Halte dieses Tempo.")
    : isToday && pending.length > 0
    ? L(`${done.length} done, ${pending.length} remaining today. `, `${done.length} виконано, ${pending.length} залишилось сьогодні. `, `${done.length} выполнено, ${pending.length} осталось сегодня. `, `${done.length} faites, ${pending.length} restantes. `, `${done.length} erledigt, ${pending.length} verbleiben heute. `) + L("You're on track!", "Ви на правильному шляху!", "Вы на правильном пути!", "Vous êtes dans les temps!", "Du bist auf Kurs!")
    : L(`${day.scheduled} sessions planned — `, `${day.scheduled} сесій заплановано — `, `${day.scheduled} сессий запланировано — `, `${day.scheduled} séances prévues — `, `${day.scheduled} Einheiten geplant — `) + L(`${totalMins} min total.`, `${totalMins} хв загалом.`, `${totalMins} мин всего.`, `${totalMins} min au total.`, `${totalMins} Min. gesamt.`);

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pill = (color) => ({
    width: 8, height: 8, borderRadius: "999px", background: color, flexShrink: 0, marginTop: 4,
  });

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", fontFamily: "var(--font-sans)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 480, background: "var(--surface-page)", borderTopLeftRadius: "var(--radius-2xl)", borderTopRightRadius: "var(--radius-2xl)", borderTop: "4px solid var(--indigo-500)", boxShadow: "var(--shadow-lg)", overflow: "hidden" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-3)", padding: "var(--space-5) var(--space-5) var(--space-4)", background: "var(--surface-card)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>{fullDay} {day.date}</h2>
              <Badge tone={statusTone}>{statusLabel}</Badge>
            </div>
            {!isEmpty && (
              <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                {L("Sessions", "Сесій", "Сессий", "Séances", "Einheiten")}: {day.completed}/{day.scheduled} · {doneMins}/{totalMins} {L("min", "хв", "мин", "min", "Min")}
              </p>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "var(--surface-muted)", width: 36, height: 36, borderRadius: "var(--radius-full)", cursor: "pointer", fontSize: 18, color: "var(--text-muted)", lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "var(--space-4) var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)", maxHeight: "60vh", overflowY: "auto" }}>

          {/* Coach bubble */}
          <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start", padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-xl)", background: "var(--indigo-50)" }}>
            <span aria-hidden="true" style={{ fontSize: 18 }}>🤖</span>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-body)", lineHeight: 1.5 }}>{coachLine}</p>
          </div>

          {isEmpty ? (
            /* Rest day illustration */
            <div style={{ textAlign: "center", padding: "var(--space-6) 0" }}>
              <div style={{ fontSize: 48, marginBottom: "var(--space-3)" }} aria-hidden="true">😴</div>
              <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{L("No sessions planned. Rest up!", "Сесій немає. Відпочивайте!", "Сессий нет. Отдыхайте!", "Aucune séance prévue. Reposez-vous!", "Keine Einheiten geplant. Erhole dich!")}</p>
            </div>
          ) : (
            <>
              {/* Completed sessions */}
              {done.length > 0 && (
                <div>
                  <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--emerald-600)" }}>
                    ✓ {L("Completed", "Виконано", "Выполнено", "Complétées", "Abgeschlossen")}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    {done.map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)", padding: "var(--space-3)", borderRadius: "var(--radius-lg)", background: "var(--emerald-50)", border: "1px solid var(--emerald-100)" }}>
                        <div style={pill(s.color)}></div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>{s.topic}</p>
                          <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{s.subject} · {s.duration} {L("min", "хв", "мин", "min", "Min")}</p>
                        </div>
                        <span style={{ fontSize: "var(--text-base)", color: "var(--emerald-500)" }}>✓</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending sessions */}
              {pending.length > 0 && (
                <div>
                  <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>
                    {isToday
                      ? L("Up next", "Далі", "Далее", "Ensuite", "Als nächstes")
                      : L("Planned", "Заплановано", "Запланировано", "Planifié", "Geplant")}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    {pending.map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)", padding: "var(--space-3)", borderRadius: "var(--radius-lg)", background: "var(--surface-card)", border: "1px solid var(--border-default)" }}>
                        <div style={pill(s.color)}></div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>{s.topic}</p>
                          <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{s.subject} · {s.duration} {L("min", "хв", "мин", "min", "Min")}</p>
                        </div>
                        {(isToday || isFuture) && onStart && (
                          <button
                            onClick={() => { onClose(); onStart({ id: s.subject + i, subject: s.subject, color: s.color, topic: s.topic, difficulty: 3, review: 1, est: s.duration }); }}
                            style={{ border: "none", background: "transparent", color: "var(--indigo-600)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-xs)", cursor: "pointer", fontFamily: "var(--font-sans)", flexShrink: 0, padding: "2px 0" }}
                          >{L("Study →", "Вчити →", "Учить →", "Étudier →", "Lernen →")}</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "var(--space-4) var(--space-5)", borderTop: "1px solid var(--border-subtle)", background: "var(--surface-card)" }}>
          <Button variant="secondary" size="lg" fullWidth onClick={onClose}>{L("Close", "Закрити", "Закрыть", "Fermer", "Schließen")}</Button>
        </div>
      </div>
    </div>
  );
}
window.DayDetail = DayDetail;
