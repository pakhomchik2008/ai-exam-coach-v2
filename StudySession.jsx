// AI Exam Coach — Study session screen (timer + SM-2 rating)
function StudySession({ session, onDone, onCancel }) {
  const { RatingButtons, Button } = window.AIExamCoachDesignSystem_99e467;
  const [seconds, setSeconds] = React.useState(0);
  const [showRating, setShowRating] = React.useState(false);

  React.useEffect(() => {
    if (showRating) return;
    const i = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(i);
  }, [showRating]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const s = session;

  return (
    <div style={{ maxWidth: "var(--container-read)", margin: "0 auto" }}>
      <div style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", borderLeft: `var(--border-accent-width) solid ${s.color}`, background: "var(--surface-card)", boxShadow: "var(--shadow-sm)", padding: "var(--space-6)" }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: s.color, fontWeight: "var(--weight-medium)" }}>{s.subject}</p>
        <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Review {s.review}</p>
      </div>

      <div style={{ marginTop: "var(--space-6)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)", padding: "var(--space-8)", textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: "var(--text-3xl)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>{s.topic}</h1>
        <p style={{ marginTop: "var(--space-8)", fontFamily: "var(--font-mono)", fontSize: "var(--text-4xl)", color: "var(--text-body)" }}>{mm}:{ss}</p>
        <p style={{ marginTop: "var(--space-1)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Auto-stops at 60 minutes</p>
      </div>

      {!showRating ? (
        <div style={{ marginTop: "var(--space-6)", display: "flex", gap: "var(--space-3)" }}>
          <Button variant="primary" size="lg" fullWidth onClick={() => setShowRating(true)}>I've finished studying this</Button>
          <Button variant="secondary" size="lg" onClick={onCancel}>Cancel</Button>
        </div>
      ) : (
        <div style={{ marginTop: "var(--space-6)" }}>
          <p style={{ textAlign: "center", color: "var(--text-body)", marginBottom: "var(--space-3)" }}>How well did you know it?</p>
          <RatingButtons onRate={(rating) => onDone(rating)} />
        </div>
      )}
    </div>
  );
}
window.StudySession = StudySession;
