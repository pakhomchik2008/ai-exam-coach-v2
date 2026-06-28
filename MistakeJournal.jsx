// AI Exam Coach — Mistake Journal. Every entry here came from a real wrong
// answer picked in a real AI-generated quiz (see StudyHub.jsx's quiz option
// onClick) — there is no seeded/demo content, so a brand-new user correctly
// sees an empty state instead of someone else's fake mistakes.
function MistakeJournal({ t }) {
  const [mistakes, setMistakes] = React.useState(() => window.getMistakes());
  const [openId, setOpenId] = React.useState(null);

  const remove = (id) => {
    window.clearMistake(id);
    setMistakes(window.getMistakes());
  };
  const clearAll = () => {
    window.clearAllMistakes();
    setMistakes([]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", fontFamily: "var(--font-sans)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-3)" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>Mistake Journal</h1>
          <p style={{ margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Every question you've gotten wrong in an AI Study Tool quiz, so you can revisit it later.</p>
        </div>
        {mistakes.length > 0 && (
          <button onClick={clearAll} style={{ border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-muted)", borderRadius: "var(--radius-lg)", padding: "8px 14px", fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)", cursor: "pointer", fontFamily: "var(--font-sans)", whiteSpace: "nowrap" }}>
            Clear all
          </button>
        )}
      </div>

      {mistakes.length === 0 ? (
        <div style={{ borderRadius: "var(--radius-xl)", border: "1px dashed var(--border-default)", background: "var(--surface-card)", padding: "var(--space-8)", textAlign: "center" }}>
          <p style={{ margin: "0 0 6px", fontSize: "var(--text-base)", fontWeight: "var(--weight-medium)", color: "var(--text-strong)" }}>No mistakes logged yet</p>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Take a quiz in the Study tab — anything you get wrong shows up here automatically.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {mistakes.map((m) => {
            const open = openId === m.id;
            return (
              <div key={m.id} style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", overflow: "hidden" }}>
                <button onClick={() => setOpenId(open ? null : m.id)} style={{ width: "100%", textAlign: "left", border: "none", background: "transparent", cursor: "pointer", padding: "var(--space-4)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-3)", fontFamily: "var(--font-sans)" }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ display: "inline-block", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--indigo-600)", background: "var(--indigo-50)", borderRadius: "var(--radius-full)", padding: "2px 10px", marginBottom: 6 }}>{m.topic}</span>
                    <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-strong)", lineHeight: 1.5 }}>{m.question}</p>
                  </div>
                  <span style={{ color: "var(--text-faint)", fontSize: 12, flexShrink: 0, marginTop: 4 }}>{open ? "▲" : "▼"}</span>
                </button>
                {open && (
                  <div style={{ padding: "0 var(--space-4) var(--space-4)", display: "flex", flexDirection: "column", gap: 6 }}>
                    {(m.options || []).map((opt, i) => {
                      const isCorrect = i === m.correctIndex;
                      const wasPicked = i === m.selectedIndex;
                      return (
                        <div key={i} style={{ fontSize: "var(--text-sm)", padding: "8px 12px", borderRadius: "var(--radius-lg)", background: isCorrect ? "var(--emerald-50)" : wasPicked ? "#FFF1F2" : "var(--surface-muted)", color: isCorrect ? "var(--emerald-700)" : wasPicked ? "var(--red-600)" : "var(--text-muted)" }}>
                          {isCorrect ? "✓ " : wasPicked ? "✕ " : ""}{opt}
                        </div>
                      );
                    })}
                    {m.explanation && <p style={{ margin: "6px 0 0", fontSize: "var(--text-xs)", color: "var(--text-muted)", lineHeight: 1.6 }}>{m.explanation}</p>}
                    <button onClick={() => remove(m.id)} style={{ alignSelf: "flex-start", marginTop: 4, border: "none", background: "transparent", color: "var(--text-faint)", fontSize: "var(--text-xs)", cursor: "pointer", padding: 0, fontFamily: "var(--font-sans)" }}>Remove</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
window.MistakeJournal = MistakeJournal;
