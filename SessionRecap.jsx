// AI Exam Coach — Session Recap: shown immediately after a study session
// finishes, replacing the old flat "Session saved" toast. Every number here
// is derived from real before/after state (readiness delta, streak delta,
// achievements newly unlocked) computed in Dashboard.jsx's handleSessionDone
// — nothing here is fabricated or estimated client-side.
function SessionRecap({ data, onClose, t }) {
  const { Button } = window.AIExamCoachDesignSystem_99e467;
  const d = data;
  const mm = String(Math.floor(d.seconds / 60)).padStart(2, "0");
  const ss = String(d.seconds % 60).padStart(2, "0");
  const deltaSign = d.gradeDelta > 0 ? "+" : "";
  const deltaColor = d.gradeDelta > 0 ? "var(--emerald-600)" : d.gradeDelta < 0 ? "var(--red-500)" : "var(--text-muted)";

  const stats = [
    { label: "Time studied", value: `${mm}:${ss}` },
    ...(d.quizTotal > 0 ? [{ label: "Quiz accuracy", value: `${d.quizCorrect}/${d.quizTotal}` }] : []),
    { label: "Readiness change", value: `${deltaSign}${d.gradeDelta}%`, color: deltaColor },
    { label: "XP earned", value: `+${d.xp}` },
  ];

  return (
    <div style={{ maxWidth: "var(--container-read)", margin: "0 auto", textAlign: "center", animation: "revealUp 0.4s ease-out" }}>
      <div style={{ borderRadius: "var(--radius-2xl)", background: "linear-gradient(135deg, var(--indigo-50), #FAF5FF)", border: "1px solid var(--border-subtle)", padding: "var(--space-8) var(--space-6)" }}>
        <p style={{ fontSize: 40, margin: "0 0 var(--space-2)" }}>🎉</p>
        <h1 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>Session Complete!</h1>
        <p style={{ margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{d.topic} · {d.subject}</p>

        <div style={{ marginTop: "var(--space-6)", display: "grid", gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: "var(--space-3)" }}>
          {stats.map((stat, i) => (
            <div key={i} style={{ borderRadius: "var(--radius-xl)", background: "#fff", border: "1px solid var(--border-subtle)", padding: "var(--space-3)" }}>
              <div style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", fontFamily: "var(--font-mono)", color: stat.color || "var(--text-strong)" }}>{stat.value}</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {d.streakAfter > d.streakBefore && (
          <div style={{ marginTop: "var(--space-4)", borderRadius: "var(--radius-xl)", background: "#fff7ed", border: "1px solid #fed7aa", padding: "var(--space-3) var(--space-4)", fontSize: "var(--text-sm)", color: "#9a3412", fontWeight: "var(--weight-semibold)" }}>
            🔥 {d.streakAfter}-day streak — keep it going!
          </div>
        )}

        {d.newAchievements.length > 0 && (
          <div style={{ marginTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {d.newAchievements.map((a) => (
              <div key={a.id} style={{ borderRadius: "var(--radius-xl)", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", padding: "var(--space-3) var(--space-4)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span style={{ fontSize: 20 }}>{a.emoji}</span>
                Achievement unlocked — {a.label}
              </div>
            ))}
          </div>
        )}

        {d.nextFocus && (
          <div style={{ marginTop: "var(--space-4)", borderRadius: "var(--radius-xl)", background: "#fff", border: "1px solid var(--border-subtle)", padding: "var(--space-4)", textAlign: "left" }}>
            <p style={{ margin: "0 0 4px", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--indigo-600)" }}>Tomorrow's focus</p>
            <p style={{ margin: 0, fontSize: "var(--text-base)", color: "var(--text-strong)" }}>{d.nextFocus.topic} · {d.nextFocus.subject}</p>
          </div>
        )}

        <div style={{ marginTop: "var(--space-6)" }}>
          <Button variant="primary" size="lg" fullWidth onClick={onClose}>Back to Dashboard →</Button>
        </div>
      </div>
    </div>
  );
}
window.SessionRecap = SessionRecap;
