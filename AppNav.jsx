// AI Exam Coach — top navigation + language switcher
function AppNav({ current, onNavigate, onLogout, lang, onLangChange }) {
  const t = window.LANGS[lang] || window.LANGS.en;
  const links = [
    { id: "dashboard", label: t.nav_dashboard },
    { id: "chat",      label: "🤖 " + (t.nav_chat || "AI Coach") },
    { id: "study",     label: t.nav_study },
    { id: "journal",   label: t.nav_journal },
    { id: "schedule",  label: t.nav_schedule },
    { id: "exams",     label: t.nav_exams },
    { id: "progress",  label: t.nav_progress },
    { id: "settings",  label: t.nav_settings },
  ];
  const [langOpen, setLangOpen] = React.useState(false);
  const langs = Object.values(window.LANGS);

  return (
    <nav style={{ borderBottom: "1px solid var(--border-default)", background: "var(--surface-card)" }}>
      <div style={{ maxWidth: "var(--container-app)", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "var(--weight-bold)", color: "var(--text-strong)", fontFamily: "var(--font-sans)" }}>
          <span aria-hidden="true" style={{ color: "var(--indigo-600)" }}>🤖</span>
          <span>AI Exam Coach</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {links.map((l) => {
            const active = current === l.id;
            return (
              <button key={l.id} onClick={() => onNavigate(l.id)} style={{
                border: "none", cursor: "pointer", borderRadius: "var(--radius-md)",
                padding: "6px 12px", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)",
                background: active ? "var(--slate-100)" : "transparent",
                color: active ? "var(--text-strong)" : "var(--text-muted)",
                fontWeight: active ? "var(--weight-medium)" : "var(--weight-normal)",
              }}>{l.label}</button>
            );
          })}

          {/* Language picker */}
          <div style={{ position: "relative", marginLeft: "var(--space-2)" }}>
            <button onClick={() => setLangOpen(o => !o)} style={{
              border: "1px solid var(--border-default)", cursor: "pointer", borderRadius: "var(--radius-md)",
              padding: "5px 10px", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)",
              background: "var(--surface-card)", color: "var(--text-body)", display: "flex", alignItems: "center", gap: "4px",
            }}>
              <span>{t.flag}</span><span style={{ fontSize: "10px", color: "var(--text-faint)" }}>▾</span>
            </button>
            {langOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 100,
                background: "var(--surface-card)", border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-lg)",
                overflow: "hidden", minWidth: "160px",
              }}>
                {langs.map((l) => (
                  <button key={l.code} onClick={() => { onLangChange(l.code); setLangOpen(false); }} style={{
                    display: "flex", alignItems: "center", gap: "var(--space-2)", width: "100%", textAlign: "left",
                    padding: "10px 14px", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-sm)", background: lang === l.code ? "var(--indigo-50)" : "var(--surface-card)",
                    color: lang === l.code ? "var(--indigo-700)" : "var(--text-body)",
                    fontWeight: lang === l.code ? "var(--weight-medium)" : "var(--weight-normal)",
                  }}>
                    <span>{l.flag}</span><span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={onLogout} style={{ border: "none", background: "transparent", cursor: "pointer", marginLeft: "4px", fontSize: "var(--text-sm)", color: "var(--text-faint)", fontFamily: "var(--font-sans)" }}>{t.nav_logout}</button>
        </div>
      </div>
    </nav>
  );
}
window.AppNav = AppNav;
