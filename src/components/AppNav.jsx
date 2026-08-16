// Examik — four rooms on the bar, not seven pills.
// Today / Learn / Coach stay routes. More is a sheet: Calendar, Exams,
// Journal, Tools, Progress, Settings, logout. Seven-item collapse is gone
// because four labels fit a phone.

import { BrandMark } from "../brand/BrandMark";

export const MORE_TABS = Object.freeze([
  "calendar", "schedule", "exams", "journal", "studyhub", "progress", "settings",
]);

function NavLogoMark({ size = 26 }) {
  return <BrandMark size={size} framed />;
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
    <button type="button" onClick={() => confirm ? onLogout() : setConfirm(true)} style={{
      border: "none", background: "transparent", cursor: "pointer",
      width: "100%", textAlign: "left", minHeight: 44, padding: "10px 12px",
      fontSize: "var(--text-base)", fontFamily: "var(--font-sans)",
      color: confirm ? "var(--red-600)" : "var(--text-faint)",
      fontWeight: confirm ? "var(--weight-semibold)" : "var(--weight-normal)",
      borderRadius: "var(--radius-lg)",
    }}>{confirm ? ({ uk: "Натисніть ще раз", ru: "Нажмите ещё раз", fr: "Cliquez à nouveau", de: "Erneut klicken" }[(window.getProfile && window.getProfile().lang) || "en"] || "Click again to confirm") : label}</button>
  );
}

function roomStyle(active, open) {
  return {
    border: "none", cursor: "pointer", borderRadius: "var(--radius-full)",
    padding: "7px 13px", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)",
    background: active ? "var(--ink-900)" : "transparent",
    color: active ? "var(--text-invert)" : open ? "var(--text-strong)" : "var(--text-muted)",
    fontWeight: active || open ? "var(--weight-semibold)" : "var(--weight-medium)",
    boxShadow: open && !active ? "inset 0 0 0 1.5px var(--ink-900)" : "none",
    transition: "background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)",
    whiteSpace: "nowrap",
  };
}

function AppNav({ current, onNavigate, onLogout, lang, onLangChange }) {
  const t = window.LANGS[lang] || window.LANGS.en;
  const rooms = [
    { id: "dashboard", label: t.nav_today },
    { id: "study", label: t.nav_study },
    { id: "chat", label: t.nav_chat },
  ];
  const moreItems = [
    { id: "calendar", label: t.nav_calendar },
    { id: "exams", label: t.nav_exams },
    { id: "journal", label: t.nav_journal },
    { id: "studyhub", label: t.nav_tools },
    { id: "progress", label: t.nav_progress },
    { id: "settings", label: t.nav_settings },
  ];
  const moreActive = MORE_TABS.includes(current);
  const [langOpen, setLangOpen] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const langs = Object.values(window.LANGS);
  const moreRef = React.useRef(null);
  const langRef = React.useRef(null);

  const go = (id) => {
    onNavigate(id);
    setMoreOpen(false);
    setLangOpen(false);
  };

  React.useEffect(() => {
    if (!moreOpen) return undefined;
    const prev = document.activeElement;
    const sheet = moreRef.current && moreRef.current.querySelector("[role='dialog']");
    const focusables = sheet ? [...sheet.querySelectorAll("button")] : [];
    if (focusables[0]) focusables[0].focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") {
        setMoreOpen(false);
        return;
      }
      if (e.key !== "Tab" || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, [moreOpen]);

  React.useEffect(() => {
    if (!langOpen) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setLangOpen(false); };
    const onDown = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [langOpen]);

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50,
      borderBottom: "1px solid var(--border-subtle)",
      background: "var(--surface-nav)",
      backdropFilter: "blur(14px) saturate(160%)", WebkitBackdropFilter: "blur(14px) saturate(160%)",
    }}>
      {moreOpen && (
        <div
          className="app-nav-more-backdrop"
          onClick={() => setMoreOpen(false)}
        />
      )}
      <div style={{ maxWidth: "var(--container-app)", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", gap: 8 }}>
        <button type="button" onClick={() => go("dashboard")} aria-label="Examik" style={{
          display: "flex", alignItems: "center", gap: 10, border: "none", background: "transparent",
          cursor: "pointer", padding: 0, fontWeight: 600, color: "var(--text-strong)",
          fontFamily: "var(--font-brand)", letterSpacing: "-0.03em", fontSize: "1.2rem",
        }}>
          <NavLogoMark />
          <span className="app-nav-wordmark">Examik</span>
        </button>

        <div className="app-nav-links">
          {rooms.map((l) => (
            <button
              key={l.id}
              type="button"
              className="app-nav-room"
              aria-current={current === l.id ? "page" : undefined}
              onClick={() => go(l.id)}
              style={roomStyle(current === l.id, false)}
            >{l.label}</button>
          ))}

          <div ref={moreRef} style={{ position: "relative" }}>
            <button
              type="button"
              className="app-nav-room"
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              aria-current={moreActive ? "true" : undefined}
              onClick={() => { setMoreOpen((o) => !o); setLangOpen(false); }}
              style={roomStyle(moreActive, moreOpen)}
            >{t.nav_more}</button>
            {moreOpen && (
              <div
                role="dialog"
                aria-modal="true"
                aria-label={t.nav_more}
                className="app-nav-more-sheet"
              >
                {moreItems.map((item) => {
                  const active = current === item.id || (item.id === "calendar" && current === "schedule");
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => go(item.id)}
                      style={{
                        border: "none", cursor: "pointer", borderRadius: "var(--radius-lg)",
                        width: "100%", textAlign: "left", minHeight: 44, padding: "10px 12px",
                        fontSize: "var(--text-base)", fontFamily: "var(--font-sans)",
                        background: active ? "var(--ink-900)" : "transparent",
                        color: active ? "var(--text-invert)" : "var(--text-body)",
                        fontWeight: active ? "var(--weight-semibold)" : "var(--weight-normal)",
                      }}
                    >{item.label}</button>
                  );
                })}
                <div style={{ marginTop: 4, paddingTop: 4, borderTop: "1px solid var(--border-subtle)" }}>
                  <NavLogoutButton onLogout={() => { setMoreOpen(false); onLogout(); }} label={t.nav_logout} />
                </div>
              </div>
            )}
          </div>

          <div ref={langRef} style={{ position: "relative", marginLeft: 4 }}>
            <button type="button" className="ux-press app-nav-lang" onClick={() => { setLangOpen((o) => !o); setMoreOpen(false); }} style={{
              border: "1px solid var(--border-default)", cursor: "pointer", borderRadius: "var(--radius-full)",
              padding: "5px 11px", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)",
              background: "var(--surface-card)", color: "var(--text-body)", display: "flex", alignItems: "center", gap: 4,
            }}>
              <span>{t.flag}</span><span className="app-nav-lang-caret" style={{ fontSize: 10, color: "var(--text-faint)" }}>▾</span>
            </button>
            {langOpen && (
              <div className="ux-pop" style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 100,
                background: "var(--surface-nav)", backdropFilter: "blur(16px) saturate(180%)", WebkitBackdropFilter: "blur(16px) saturate(180%)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-lg)",
                overflow: "hidden", minWidth: 160,
              }}>
                {langs.map((l) => (
                  <button key={l.code} type="button" onClick={() => { onLangChange(l.code); setLangOpen(false); }} style={{
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
        </div>
      </div>
    </nav>
  );
}
window.AppNav = AppNav;

export {};
