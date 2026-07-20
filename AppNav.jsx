// AI Exam Coach — top navigation + language switcher
// FintechX redesign: sticky translucent bar, geometric logo mark,
// ink-pill active state, no emoji in the link row.

function NavLogoMark({ size = 26 }) {
  // Rounded ink square with an emerald progress arc — "coached to ready".
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true">
      <rect width="26" height="26" rx="8" fill="var(--ink-900)" />
      <path d="M13 6.5 a6.5 6.5 0 1 1 -6.2 8.5" fill="none"
        stroke="var(--emerald-500)" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="13" cy="13" r="2.4" fill="#FFFFFF" />
    </svg>
  );
}
window.NavLogoMark = NavLogoMark;

function NavLogoutButton({ onLogout, label }) {
  const [confirm, setConfirm] = React.useState(false);
  React.useEffect(() => {
    if (!confirm) return;
    const id = setTimeout(() => setConfirm(false), 3000);
    return () => clearTimeout(id);
  }, [confirm]);
  return (
    <button onClick={() => confirm ? onLogout() : setConfirm(true)} style={{
      border: "none", background: "transparent", cursor: "pointer", marginLeft: "4px",
      fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)",
      color: confirm ? "var(--red-600)" : "var(--text-faint)",
      fontWeight: confirm ? "var(--weight-semibold)" : "var(--weight-normal)",
    }}>{confirm ? ({ uk: "Натисніть ще раз", ru: "Нажмите ещё раз", fr: "Cliquez à nouveau", de: "Erneut klicken" }[(window.getProfile && window.getProfile().lang) || "en"] || "Click again to confirm") : label}</button>
  );
}

function AppNav({ current, onNavigate, onLogout, lang, onLangChange }) {
  const t = window.LANGS[lang] || window.LANGS.en;
  const links = [
    { id: "dashboard", label: t.nav_dashboard },
    { id: "chat",      label: t.nav_chat || "AI Coach" },
    { id: "study",     label: t.nav_study },
    { id: "journal",   label: t.nav_journal },
    // "schedule" (month overview) merged into CalendarHub — one calendar tab.
    { id: "calendar",  label: t.nav_calendar || "Calendar" },
    { id: "exams",     label: t.nav_exams },
    { id: "progress",  label: t.nav_progress },
    { id: "settings",  label: t.nav_settings },
  ];
  const [langOpen, setLangOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const langs = Object.values(window.LANGS);

  // Closing the mobile panel on every navigation/logout means a returning
  // user never finds it stuck open from their last visit — same reason
  // langOpen already closes itself after a pick.
  const navigate = (id) => { onNavigate(id); setMobileOpen(false); };

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50,
      borderBottom: "1px solid var(--border-subtle)",
      background: "rgba(255, 255, 255, 0.82)",
      backdropFilter: "blur(14px) saturate(160%)", WebkitBackdropFilter: "blur(14px) saturate(160%)",
    }}>
      <div style={{ maxWidth: "var(--container-app)", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "9px", fontWeight: "var(--weight-bold)", color: "var(--text-strong)", fontFamily: "var(--font-display)", letterSpacing: "var(--tracking-tight)", fontSize: "var(--text-lg)" }}>
          <NavLogoMark />
          <span>AI Exam Coach</span>
        </div>

        <div className="app-nav-links">
          {links.map((l) => {
            const active = current === l.id;
            return (
              <button key={l.id} onClick={() => navigate(l.id)} style={{
                border: "none", cursor: "pointer", borderRadius: "var(--radius-full)",
                padding: "7px 13px", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)",
                background: active ? "var(--ink-900)" : "transparent",
                color: active ? "var(--text-invert)" : "var(--text-muted)",
                fontWeight: active ? "var(--weight-semibold)" : "var(--weight-medium)",
                transition: "background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)",
              }}>{l.label}</button>
            );
          })}

          {/* Language picker */}
          <div style={{ position: "relative", marginLeft: "var(--space-2)" }}>
            <button onClick={() => setLangOpen(o => !o)} style={{
              border: "1px solid var(--border-default)", cursor: "pointer", borderRadius: "var(--radius-full)",
              padding: "5px 11px", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)",
              background: "var(--surface-card)", color: "var(--text-body)", display: "flex", alignItems: "center", gap: "4px",
            }}>
              <span>{t.flag}</span><span style={{ fontSize: "10px", color: "var(--text-faint)" }}>▾</span>
            </button>
            {langOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 100,
                background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(16px) saturate(180%)", WebkitBackdropFilter: "blur(16px) saturate(180%)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-lg)",
                overflow: "hidden", minWidth: "160px",
              }}>
                {langs.map((l) => (
                  <button key={l.code} onClick={() => { onLangChange(l.code); setLangOpen(false); }} style={{
                    display: "flex", alignItems: "center", gap: "var(--space-2)", width: "100%", textAlign: "left",
                    padding: "10px 14px", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-sm)", background: lang === l.code ? "var(--indigo-50)" : "transparent",
                    color: lang === l.code ? "var(--indigo-700)" : "var(--text-body)",
                    fontWeight: lang === l.code ? "var(--weight-medium)" : "var(--weight-normal)",
                  }}>
                    <span>{l.flag}</span><span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <NavLogoutButton onLogout={onLogout} label={t.nav_logout} />
        </div>

        {/* Hamburger — CSS-hidden above 680px, so this never renders on desktop */}
        <button className="app-nav-hamburger" aria-label={mobileOpen ? "Close menu" : "Open menu"} onClick={() => setMobileOpen(o => !o)} style={{
          alignItems: "center", justifyContent: "center", width: "44px", height: "44px",
          border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
          background: "var(--surface-card)", cursor: "pointer", fontSize: "18px", padding: 0,
        }}>{mobileOpen ? "✕" : "☰"}</button>
      </div>

      {/* Mobile panel — CSS-hidden above 680px regardless of mobileOpen, so a
          desktop resize while it happens to be true never leaves it stuck visible */}
      <div className={"app-nav-mobile-panel" + (mobileOpen ? " is-open" : "")} style={{
        flexDirection: "column", gap: "2px", padding: "8px 16px 14px",
        borderTop: "1px solid var(--border-subtle)", background: "var(--surface-card)",
      }}>
        {links.map((l) => {
          const active = current === l.id;
          return (
            <button key={l.id} onClick={() => navigate(l.id)} style={{
              border: "none", cursor: "pointer", borderRadius: "var(--radius-lg)", textAlign: "left",
              display: "flex", alignItems: "center", minHeight: "44px",
              padding: "10px 12px", fontSize: "var(--text-base)", fontFamily: "var(--font-sans)",
              background: active ? "var(--ink-900)" : "transparent",
              color: active ? "var(--text-invert)" : "var(--text-body)",
              fontWeight: active ? "var(--weight-semibold)" : "var(--weight-normal)",
            }}>{l.label}</button>
          );
        })}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px", paddingTop: "10px", borderTop: "1px solid var(--border-subtle)" }}>
          {langs.map((l) => (
            <button key={l.code} onClick={() => onLangChange(l.code)} style={{
              display: "flex", alignItems: "center", gap: "4px", padding: "6px 10px",
              border: "1px solid var(--border-default)", borderRadius: "var(--radius-full)", cursor: "pointer",
              fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)",
              background: lang === l.code ? "var(--indigo-50)" : "var(--surface-card)",
              color: lang === l.code ? "var(--indigo-700)" : "var(--text-body)",
              fontWeight: lang === l.code ? "var(--weight-medium)" : "var(--weight-normal)",
            }}>
              <span>{l.flag}</span><span>{l.label}</span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: "8px" }}>
          <NavLogoutButton onLogout={onLogout} label={t.nav_logout} />
        </div>
      </div>
    </nav>
  );
}
window.AppNav = AppNav;
