// AI Exam Coach — Schedule screen (i18n-aware)
function Schedule({ t }) {
  const todayDate = new Date();
  const [cursor, setCursor] = React.useState(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
  const [selected, setSelected] = React.useState(todayDate);
  const { sessionsByDay: SESSIONS_BY_DAY, examDates: EXAM_DATES } = React.useMemo(() => window.buildScheduleData(), []);

  const changeMonth = (delta) => {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
    setSelected(null); // BUG-18 fix: don't show a stale date label from the previous month
  };

  function getDaysInGrid(cursor) {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    let start = new Date(firstDay);
    const dow = (firstDay.getDay() + 6) % 7;
    start.setDate(start.getDate() - dow);
    let end = new Date(lastDay);
    const edow = (lastDay.getDay() + 6) % 7;
    if (edow < 6) end.setDate(end.getDate() + (6 - edow));
    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));
    return days;
  }

  const days = getDaysInGrid(cursor);
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const today = fmt(new Date());
  const selKey = selected ? fmt(selected) : null;
  const selSessions = selKey ? (SESSIONS_BY_DAY[selKey] || []) : [];
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const weekdays = [t.mon, t.tue, t.wed, t.thu, t.fri, t.sat, t.sun];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", fontFamily: "var(--font-sans)" }}>
      <h1 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>{t.schedule_title}</h1>
      <div style={{ display: "grid", gap: "var(--space-4)", gridTemplateColumns: "1fr 300px" }}>
        <div style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)", padding: "var(--space-4)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
            <button onClick={() => changeMonth(-1)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: "4px 8px", color: "var(--text-muted)", fontSize: "var(--text-lg)" }}>←</button>
            <h2 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>{monthNames[cursor.getMonth()]} {cursor.getFullYear()}</h2>
            <button onClick={() => changeMonth(1)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: "4px 8px", color: "var(--text-muted)", fontSize: "var(--text-lg)" }}>→</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "var(--space-1)", textAlign: "center", marginBottom: "var(--space-1)" }}>
            {weekdays.map((d) => <div key={d} style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", padding: "4px 0" }}>{d}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "var(--space-1)" }}>
            {days.map((d) => {
              const key = fmt(d);
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = key === today;
              const isSel = key === selKey;
              const sess = SESSIONS_BY_DAY[key] || [];
              const exams = EXAM_DATES[key] || [];
              const colors = [...new Set(sess.map(s => s.color))].slice(0, 4);
              const completedCount = sess.filter((s) => s.status === "completed").length;
              const pendingCount = sess.length - completedCount;
              const tooltipParts = [];
              if (pendingCount) tooltipParts.push(`${pendingCount} session${pendingCount > 1 ? "s" : ""} planned`);
              if (completedCount) tooltipParts.push(`${completedCount} completed`);
              if (exams.length) tooltipParts.push(exams.map((ex) => `${ex.subject} exam`).join(", "));
              return (
                <button key={key} onClick={() => setSelected(new Date(d))} title={tooltipParts.join(" · ") || undefined} style={{
                  minHeight: "64px", borderRadius: "var(--radius-lg)", textAlign: "left", padding: "6px", cursor: "pointer", fontFamily: "var(--font-sans)",
                  border: isSel ? "2px solid var(--indigo-500)" : isToday ? "1px solid var(--slate-700)" : "1px solid var(--border-subtle)",
                  background: inMonth ? "var(--surface-card)" : "var(--surface-muted)",
                  opacity: inMonth ? 1 : 0.5,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "var(--text-sm)", color: inMonth ? "var(--text-strong)" : "var(--text-faint)" }}>{d.getDate()}</span>
                    {exams.length > 0 && (
                      <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <span style={{ color: exams[0].color, fontSize: "10px" }}>★</span>
                        {exams.length > 1 && <span style={{ fontSize: "9px", color: "var(--text-faint)" }}>×{exams.length}</span>}
                      </span>
                    )}
                  </div>
                  <div style={{ marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "2px" }}>
                    {colors.map((c) => <span key={c} style={{ width: 6, height: 6, borderRadius: "50%", background: c, display: "inline-block" }} />)}
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", marginTop: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--text-muted)", display: "inline-block" }} /> Dot colour = subject with a session that day</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span aria-hidden="true">★</span> Exam date</span>
            <span>Hover a date for a summary</span>
          </div>
        </div>
        <aside style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)", padding: "var(--space-4)" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>
            {selected ? selected.toLocaleDateString(t.code === "uk" ? "uk-UA" : t.code === "fr" ? "fr-FR" : t.code === "de" ? "de-DE" : "en-GB", { weekday: "long", day: "numeric", month: "short" }) : t.schedule_pick_day}
          </h3>
          {selSessions.length === 0
            ? <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{t.schedule_no_sessions}</p>
            : <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {selSessions.map((s, i) => (
                  <div key={i} style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", borderLeft: `4px solid ${s.color}`, padding: "8px 10px" }}>
                    <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{s.subject}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "var(--text-sm)", color: "var(--text-strong)" }}>{s.topic}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: s.status === "completed" ? "var(--emerald-600)" : "var(--text-faint)" }}>
                      {s.status === "completed" ? "✓ " + t.schedule_completed : t.schedule_pending}
                    </p>
                  </div>
                ))}
              </div>
          }
          {(EXAM_DATES[selKey] || []).map((ex, i) => (
            <div key={i} style={{ marginTop: "var(--space-3)", borderRadius: "var(--radius-lg)", background: "var(--amber-50)", border: "1px solid var(--amber-100)", padding: "8px 10px", fontSize: "var(--text-sm)", color: "var(--amber-700)" }}>
              ★ {ex.subject} {t.schedule_exam_today}
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
window.Schedule = Schedule;
