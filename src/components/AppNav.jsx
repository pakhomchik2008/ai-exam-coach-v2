// Examik — tabs on the bar. Overflow sheet is gone.
// Progress stays under Settings. Tools is a first-class tab (file → quiz).

import { BrandLockup, BrandMark } from "../brand/BrandMark";

function NavLogoMark({ size = 24 }) {
  return <BrandMark size={size} />;
}
window.NavLogoMark = NavLogoMark;
window.BrandLockup = BrandLockup;

// Bottom-tab icons — same stroke system as Settings.jsx's HubIcon (22px,
// strokeWidth 1.75) so the tab bar and the Settings tile grid read as one
// icon family. Hand-drawn paths, not a real icon set — kept minimal on
// purpose so they stay legible at 20px.
const TAB_ICONS = {
  dashboard: <path d="M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />,
  chat: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />,
  study: <><path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H12v18H5.5A2.5 2.5 0 0 1 3 18.5v-13Z" /><path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H12v18h6.5a2.5 2.5 0 0 0 2.5-2.5v-13Z" /></>,
  studyhub: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2 2.8-2.8Z" />,
};

function TabIcon({ id, size = 21 }) {
  if (id === "more") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="6" cy="12" r="1.6" fill="currentColor" />
        <circle cx="12" cy="12" r="1.6" fill="currentColor" />
        <circle cx="18" cy="12" r="1.6" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TAB_ICONS[id]}
    </svg>
  );
}

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
  // The 4 rooms a student opens every day live on the always-visible bottom
  // bar (classic iOS tab bar — Apple HIG default, zero taps to switch).
  // Everything else — Journal, Calendar, Exams, Settings, language, logout —
  // sits one tap behind "More", which opens as a sheet anchored to the bar
  // it was triggered from (spatial consistency: it rises from where you
  // tapped, not from the top of the screen).
  const PRIMARY_TAB_IDS = ["dashboard", "chat", "study", "studyhub"];
  const primaryTabs = PRIMARY_TAB_IDS.map((id) => links.find((l) => l.id === id));
  const moreLinks = links.filter((l) => !PRIMARY_TAB_IDS.includes(l.id));
  const isActive = (id) => current === id || (id === "calendar" && current === "schedule");
  const moreActive = moreLinks.some((l) => isActive(l.id));

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
      </div>

      {/* Scrim + sheet for "More" — dims the page and rises from the bottom
          bar, matching the tab that opened it (Apple materials: dim to
          focus, anchor to source). Closes on scrim tap or picking a link. */}
      {mobileOpen && <div className="app-nav-more-scrim" onClick={() => setMobileOpen(false)} />}
      <div className={"app-nav-more-sheet" + (mobileOpen ? " is-open" : "")}>
        <div className="app-nav-more-grabber" aria-hidden="true" />
        {moreLinks.map((l) => {
          const active = isActive(l.id);
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

      {/* Classic iOS bottom tab bar — the 4 rooms used every day, always one
          tap away, no hamburger. Translucent material over the page content
          (Apple: materials convey a floating functional layer). */}
      <div className="app-nav-bottom-bar">
        {primaryTabs.map((l) => (
          <button
            key={l.id}
            type="button"
            className="app-nav-tab"
            aria-current={isActive(l.id) ? "page" : undefined}
            onClick={() => navigate(l.id)}
          >
            <TabIcon id={l.id} />
            <span>{l.label}</span>
          </button>
        ))}
        <button
          type="button"
          className="app-nav-tab"
          aria-current={moreActive && !mobileOpen ? "page" : undefined}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((o) => !o)}
        >
          <TabIcon id="more" />
          <span>{t.nav_more}</span>
        </button>
      </div>
    </nav>
  );
}
window.AppNav = AppNav;

export {};
