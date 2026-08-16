// Examik — tabs on the bar. Overflow sheet is gone.
// Progress stays under Settings. Tools is a first-class tab (file → quiz).

import { BrandLockup, BrandMark } from "../brand/BrandMark";

function NavLogoMark({ size = 24 }) {
  return <BrandMark size={size} />;
}
window.NavLogoMark = NavLogoMark;
window.BrandLockup = BrandLockup;

function NavLogoutButton({ onLogout, label }) {
  const [confirm, setConfirm] = React.useState(false);
  React.useEffect(() => {
    if (!confirm) return;
    const id = setTimeout(() => setConfirm(false), 3000);
    return () => clearTimeout(id);
  }, [confirm]);
  return (
    <button type="button" onClick={() => confirm ? onLogout() : setConfirm(true)} style={{
      border: "none", background: "transparent", cursor: "pointer", marginLeft: 4,
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
    { id: "chat", label: t.nav_chat },
    { id: "study", label: t.nav_study },
    { id: "studyhub", label: t.nav_tools },
    { id: "journal", label: t.nav_journal },
    { id: "calendar", label: t.nav_calendar },
    { id: "exams", label: t.nav_exams },
    { id: "settings", label: t.nav_settings },
  ];
  const [langOpen, setLangOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const langs = Object.values(window.LANGS);
  const navigate = (id) => { onNavigate(id); setMobileOpen(false); setLangOpen(false); };

  return (
    <nav className="app-nav">
      <div className="app-nav-bar">
        <button type="button" onClick={() => navigate("dashboard")} aria-label="Examik" style={{
          display: "flex", alignItems: "center", border: "none", background: "transparent",
          cursor: "pointer", padding: 0, color: "var(--text-strong)",
        }}>
          <BrandLockup wordClassName="app-nav-wordmark" />
        </button>

        <div className="app-nav-links">
          {links.map((l) => {
            const active = current === l.id || (l.id === "calendar" && current === "schedule");
            return (
              <button
                key={l.id}
                type="button"
                className="app-nav-room"
                aria-current={active ? "page" : undefined}
                onClick={() => navigate(l.id)}
              >{l.label}</button>
            );
          })}

          <div style={{ position: "relative", marginLeft: 4 }}>
            <button type="button" className="ux-press app-nav-lang" onClick={() => setLangOpen((o) => !o)}>
              <span>{t.flag}</span>
              <span className="app-nav-lang-caret" style={{ fontSize: 10, color: "var(--text-faint)" }}>▾</span>
            </button>
            {langOpen && (
              <div className="ux-pop" style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 100,
                background: "var(--chrome-paper)",
                border: "1px solid var(--chrome-line)",
                borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-lg)",
                overflow: "hidden", minWidth: 160,
              }}>
                {langs.map((l) => (
                  <button key={l.code} type="button" onClick={() => { onLangChange(l.code); setLangOpen(false); }} style={{
                    display: "flex", alignItems: "center", gap: "var(--space-2)", width: "100%", textAlign: "left",
                    padding: "10px 14px", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-sm)", background: lang === l.code ? "var(--chrome-ink)" : "transparent",
                    color: lang === l.code ? "var(--chrome-paper)" : "var(--text-body)",
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

        <button
          type="button"
          className="app-nav-hamburger"
          aria-label={mobileOpen ? t.nav_close : "Open menu"}
          onClick={() => setMobileOpen((o) => !o)}
        >{mobileOpen ? "✕" : "☰"}</button>
      </div>

      <div className={"app-nav-mobile-panel" + (mobileOpen ? " is-open" : "")}>
        {links.map((l) => {
          const active = current === l.id || (l.id === "calendar" && current === "schedule");
          return (
            <button
              key={l.id}
              type="button"
              className="app-nav-room"
              aria-current={active ? "page" : undefined}
              onClick={() => navigate(l.id)}
              style={{ width: "100%", textAlign: "left", borderRadius: "var(--radius-lg)" }}
            >{l.label}</button>
          );
        })}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, paddingTop: 10, borderTop: "1px solid var(--chrome-line)" }}>
          {langs.map((l) => (
            <button key={l.code} type="button" onClick={() => onLangChange(l.code)} className="app-nav-lang" style={{
              padding: "6px 10px", minHeight: 36, fontSize: "var(--text-xs)",
              background: lang === l.code ? "var(--chrome-ink)" : "var(--chrome-paper)",
              color: lang === l.code ? "var(--chrome-paper)" : "var(--chrome-ink)",
            }}>
              <span>{l.flag}</span><span>{l.label}</span>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          <NavLogoutButton onLogout={onLogout} label={t.nav_logout} />
        </div>
      </div>
    </nav>
  );
}
window.AppNav = AppNav;

export {};
