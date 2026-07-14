// AI Exam Coach — Progress screen: brain-driven, no legacy deriveCourses.
function Progress({ t }) {
  const { Card, ProgressBar, Badge } = window.AIExamCoachDesignSystem_99e467;
  const brain = window.useBrain();
  const examViews = brain.examViews || [];
  const week = window.deriveWeek();
  const achievements = window.computeAchievements ? window.computeAchievements() : [];
  const maxBar = Math.max(3, ...week.map((d) => Math.max(d.scheduled, d.completed)));

  const weeklyGoalH = (window.getProfile ? window.getProfile() : {}).weeklyHours || 12;
  const secStudied = window.secondsStudiedThisWeek ? window.secondsStudiedThisWeek() : 0;
  const hoursStudied = Math.round((secStudied / 3600) * 10) / 10;

  const readinessLabel = (r) => {
    if (r < 25) return { label: "Struggling", emoji: "😟", color: "var(--red-500)" };
    if (r < 50) return { label: "Getting there", emoji: "📈", color: "var(--amber-600)" };
    if (r < 75) return { label: "Confident", emoji: "✓", color: "var(--emerald-600)" };
    return { label: "Mastered", emoji: "⭐", color: "var(--indigo-600)" };
  };

  const weakest = React.useMemo(() => {
    // Only compare exams that have actually been studied — an exam nobody
    // has touched yet has a placeholder readiness number, not a real "low" one.
    const active = examViews.filter((e) => (e.daysAway == null || e.daysAway >= 0) && e.started);
    if (!active.length) return null;
    return active.reduce((a, b) => b.readiness < a.readiness ? b : a);
  }, [brain]);

  // Build mastery table from the brain's per-topic data
  const masteryRows = React.useMemo(() => {
    const rows = [];
    for (const ev of examViews) {
      for (const tp of ev.topics || []) {
        if (!tp.lastSeen) continue;
        const daysSince = tp.lastSeen ? Math.round((Date.now() - new Date(tp.lastSeen).getTime()) / 86400000) : null;
        const lastLabel = daysSince === 0 ? "Today" : daysSince === 1 ? "Yesterday" : daysSince != null ? `${daysSince}d ago` : "–";
        const dueIn = tp.dueDate ? Math.round((new Date(tp.dueDate).getTime() - Date.now()) / 86400000) : null;
        const nextLabel = dueIn != null ? (dueIn <= 0 ? "Now" : dueIn === 1 ? "Tomorrow" : `In ${dueIn}d`) : "–";
        rows.push({
          topic: tp.name, subject: ev.name, last: lastLabel, next: nextLabel,
          readiness: Math.round(tp.retention * 100),
          tone: tp.retention >= 0.7 ? "positive" : tp.retention >= 0.4 ? "warning" : "negative",
        });
      }
    }
    return rows.sort((a, b) => a.readiness - b.readiness);
  }, [brain]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)", fontFamily: "var(--font-sans)" }}>
      <h1 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>{t.progress_title}</h1>
      {weakest && weakest.readiness < 40 && (
        <div style={{ borderRadius: "var(--radius-xl)", background: "#FFF1F2", border: "1px solid var(--red-100)", padding: "12px var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)" }}>
          <span style={{ color: "var(--red-600)", fontWeight: "var(--weight-semibold)" }}>Lowest readiness:</span>
          <span style={{ color: "var(--text-body)" }}>{weakest.name} at {weakest.readiness}%</span>
        </div>
      )}
      <div style={{ display: "grid", gap: "var(--space-4)", gridTemplateColumns: "1fr 1fr 2fr" }}>
        <Card style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)" }}>{t.progress_streak}</p>
          <p style={{ margin: "4px 0 0", fontSize: "var(--text-5xl)", fontWeight: "var(--weight-bold)", color: "var(--action-primary)" }}>{window.computeStreak ? window.computeStreak() : 0}</p>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{t.progress_streak_days}</p>
        </Card>

        <Card style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)" }}>This week</p>
          <p style={{ margin: "4px 0 0", fontSize: "var(--text-3xl)", fontWeight: "var(--weight-bold)", fontFamily: "var(--font-mono)", color: "var(--text-strong)" }}>{hoursStudied}h</p>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>of {weeklyGoalH}h goal</p>
        </Card>

        <Card>
          <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)" }}>{t.progress_this_week}</p>
          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "stretch" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: 20 }}>
              <span style={{ fontSize: 10, color: "var(--text-faint)", writingMode: "vertical-rl", transform: "rotate(180deg)", whiteSpace: "nowrap", letterSpacing: 0.5 }}>Sessions</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-3)", height: "80px" }}>
                {week.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                    <div style={{ width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 3, height: "60px" }}>
                      <div title={`Scheduled: ${d.scheduled} sessions`} style={{ width: 8, height: `${(d.scheduled / maxBar) * 100}%`, background: "var(--slate-200)", borderRadius: "3px 3px 0 0", cursor: "default", minHeight: d.scheduled > 0 ? 4 : 0 }} />
                      <div title={`Completed: ${d.completed} sessions`} style={{ width: 8, height: `${(d.completed / maxBar) * 100}%`, background: "var(--emerald-500)", borderRadius: "3px 3px 0 0", cursor: "default", minHeight: d.completed > 0 ? 4 : 0 }} />
                    </div>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{[t.mon,t.tue,t.wed,t.thu,t.fri,t.sat,t.sun][i]}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "var(--space-4)", marginTop: "var(--space-2)", fontSize: 11, color: "var(--text-muted)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, background: "var(--slate-200)", borderRadius: 2, display: "inline-block" }} /> Scheduled
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, background: "var(--emerald-500)", borderRadius: 2, display: "inline-block" }} /> Completed
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <section>
        <h2 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>{t.progress_confidence}</h2>
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {examViews.length === 0 && (
              <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No exams yet — add one to see readiness levels.</p>
            )}
            {examViews.map((ev) => {
              const el = readinessLabel(ev.readiness);
              return (
                <div key={ev.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm)", marginBottom: 4 }}>
                    <span style={{ color: "var(--text-body)" }}>{ev.name}</span>
                    <span style={{ color: ev.started ? el.color : "var(--text-faint)", fontWeight: "var(--weight-medium)", fontSize: "var(--text-xs)" }}>
                      {ev.started ? `${el.emoji} ${el.label} · ${ev.readiness}%` : "Not started yet"}
                    </span>
                  </div>
                  <ProgressBar value={ev.started ? ev.readiness : 0} autoColor />
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section>
        <h2 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>{t.progress_mastery}</h2>
        <Card padding="0">
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
            <thead>
              <tr style={{ background: "var(--surface-muted)", color: "var(--text-muted)", textAlign: "left" }}>
                {[t.progress_topic, t.progress_subject, t.progress_last_studied, "Retention", t.progress_next_review].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", fontWeight: "var(--weight-medium)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {masteryRows.length === 0 && (
                <tr><td colSpan={5} style={{ padding: "16px 12px", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No study history yet.</td></tr>
              )}
              {masteryRows.map((r, i) => {
                const el = readinessLabel(r.readiness);
                return (
                  <tr key={i} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "10px 12px", color: "var(--text-strong)" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <Badge tone={r.tone}>{el.emoji}</Badge>{r.topic}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "var(--text-muted)" }}>{r.subject}</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-muted)" }}>{r.last}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ color: el.color, fontWeight: "var(--weight-medium)", fontSize: "var(--text-xs)" }}>{el.emoji} {r.readiness}%</span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "var(--text-muted)" }}>{r.next}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </Card>
      </section>

      <section>
        <h2 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>Achievements</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "var(--space-3)" }}>
          {achievements.map((a) => (
            <Card key={a.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", opacity: a.unlocked ? 1 : 0.45 }}>
              <span style={{ fontSize: 24 }}>{a.unlocked ? a.emoji : "🔒"}</span>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text-body)", fontWeight: a.unlocked ? "var(--weight-medium)" : "var(--weight-normal)" }}>{a.label}</span>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
window.Progress = Progress;
