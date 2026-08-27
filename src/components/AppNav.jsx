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

// Demo sessions are real Supabase anonymous users (see auth-store.jsx
// startDemo), but nothing outside the onboarding wizard's last step ever
// offers a way back to creating a real account — a demo user who skipped
// that step, or who is browsing a fresh visit, has no visible path to sign
// up. This button + modal is that path, always on-screen while in demo.
const SIGNUP_COPY = {
  en: { cta: "Sign up", title: "Create your account", sub: "Keeps your plan and progress — same demo data, now saved for good.", name: "Full name", email: "Email", password: "Password", submit: "Create account", busy: "Creating…", emailBad: "Enter a valid email.", pwShort: "Use at least 6 characters.", pending: "Check your email to confirm — your progress is already saved." },
  uk: { cta: "Реєстрація", title: "Створи акаунт", sub: "Збереже твій план і прогрес — ті самі демо-дані, тепер назавжди.", name: "Повне ім'я", email: "Email", password: "Пароль", submit: "Створити акаунт", busy: "Створюємо…", emailBad: "Введіть дійсний email.", pwShort: "Щонайменше 6 символів.", pending: "Перевір пошту для підтвердження — прогрес уже збережено." },
  ru: { cta: "Регистрация", title: "Создай аккаунт", sub: "Сохранит твой план и прогресс — те же демо-данные, теперь навсегда.", name: "Полное имя", email: "Email", password: "Пароль", submit: "Создать аккаунт", busy: "Создаём…", emailBad: "Введите действительный email.", pwShort: "Не менее 6 символов.", pending: "Проверь почту для подтверждения — прогресс уже сохранён." },
  fr: { cta: "S'inscrire", title: "Crée ton compte", sub: "Conserve ton plan et ta progression — mêmes données démo, sauvegardées pour de bon.", name: "Nom complet", email: "E-mail", password: "Mot de passe", submit: "Créer le compte", busy: "Création…", emailBad: "Entrez un e-mail valide.", pwShort: "Au moins 6 caractères.", pending: "Vérifie ton e-mail pour confirmer — ta progression est déjà sauvegardée." },
  de: { cta: "Registrieren", title: "Konto erstellen", sub: "Speichert deinen Plan und Fortschritt — dieselben Demo-Daten, jetzt dauerhaft.", name: "Vollständiger Name", email: "E-Mail", password: "Passwort", submit: "Konto erstellen", busy: "Wird erstellt…", emailBad: "Gib eine gültige E-Mail ein.", pwShort: "Mindestens 6 Zeichen.", pending: "Prüfe deine E-Mail zur Bestätigung — dein Fortschritt ist schon gespeichert." },
};

function SignUpModal({ onClose, lang }) {
  const c = SIGNUP_COPY[lang] || SIGNUP_COPY.en;
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError(c.emailBad); return; }
    if (password.length < 6) { setError(c.pwShort); return; }
    setBusy(true);
    try {
      const res = await window.upgradeAnonymousAccount({ name: name.trim(), email: email.trim(), password });
      if (res && res.emailPending) setPending(true);
      else onClose();
    } catch (err) {
      setError((err && err.message) || c.emailBad);
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "12px 14px", fontSize: "var(--text-base)",
    fontFamily: "var(--font-sans)", color: "var(--text-strong)", background: "var(--surface-card)",
    border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", outline: "none", marginBottom: 12,
  };

  return (
    <div className="ux-overlay" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)", padding: 16 }}>
      <div className="ux-modal" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 400, background: "var(--surface-page)", borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-lg)", padding: 24 }}>
        {pending ? (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--emerald-700)" }}>{c.pending}</p>
        ) : (
          <form onSubmit={submit}>
            <h2 style={{ margin: "0 0 4px", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--text-strong)" }}>{c.title}</h2>
            <p style={{ margin: "0 0 16px", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{c.sub}</p>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={c.name} autoComplete="name" style={inputStyle} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={c.email} autoComplete="email" style={inputStyle} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={c.password} autoComplete="new-password" style={{ ...inputStyle, marginBottom: 4 }} />
            {error && <p style={{ color: "var(--red-600)", fontSize: 12, margin: "0 0 8px" }}>{error}</p>}
            <button type="submit" disabled={busy} style={{ width: "100%", marginTop: 12, padding: 12, borderRadius: 12, border: "none", background: "var(--indigo-600)", color: "#fff", fontWeight: 700, cursor: busy ? "wait" : "pointer", fontFamily: "var(--font-sans)" }}>
              {busy ? c.busy : c.submit}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function NavSignUpButton({ lang }) {
  const c = SIGNUP_COPY[lang] || SIGNUP_COPY.en;
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" className="ux-press" onClick={() => setOpen(true)} style={{
        border: "none", background: "var(--indigo-600)", color: "#fff", cursor: "pointer", marginLeft: 4,
        fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", fontWeight: 700,
        padding: "8px 16px", borderRadius: 999,
      }}>{c.cta}</button>
      {open && <SignUpModal onClose={() => setOpen(false)} lang={lang} />}
    </>
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

  const session = window.getSession ? window.getSession() : null;
  const isDemo = !!session && session.mode === "demo";

  const [langOpen, setLangOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const langs = Object.values(window.LANGS);
  const navigate = (id) => { onNavigate(id); setMobileOpen(false); setLangOpen(false); };

  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  // Drag-to-dismiss on the grabber, tracking the pointer 1:1 (apple-design
  // §2/§3) instead of the sheet only ever running its fixed close transition
  // on a tap. Mutates the DOM directly rather than via React state so the
  // sheet follows the finger every frame with no render in between.
  const sheetRef = React.useRef(null);
  const dragRef = React.useRef(null);

  // Resistance grows the further past the boundary — used so an upward drag
  // past "fully open" (there's nowhere further to go) feels like it's
  // pushing against something instead of hard-stopping (apple-design §9).
  function rubberband(overshoot, dimension, constant = 0.55) {
    return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
  }

  const onGrabberPointerDown = (e) => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheet.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startTime: e.timeStamp, height: sheet.getBoundingClientRect().height };
    sheet.style.transition = "none"; // take over from the CSS transition while dragging
  };

  const onGrabberPointerMove = (e) => {
    const drag = dragRef.current;
    const sheet = sheetRef.current;
    if (!drag || !sheet) return;
    const raw = e.clientY - drag.startY;
    const y = raw < 0 ? -rubberband(-raw, drag.height) : raw;
    sheet.style.transform = `translateY(${y}px)`;
  };

  const onGrabberPointerUp = (e) => {
    const drag = dragRef.current;
    const sheet = sheetRef.current;
    if (!drag || !sheet) return;
    dragRef.current = null;
    const raw = e.clientY - drag.startY;
    const elapsed = e.timeStamp - drag.startTime;
    // AUDIT.md's exact velocity-dismiss formula: distance/elapsedMs > ~0.11,
    // not a distance threshold alone — a fast short flick should dismiss
    // just as reliably as a slow long drag.
    const velocity = elapsed > 0 ? Math.abs(raw) / elapsed : 0;
    const shouldDismiss = raw > 0 && (raw > drag.height * 0.35 || velocity > 0.11);
    sheet.style.transition = ""; // hand back to the CSS transition for the settle
    sheet.style.transform = "";
    if (shouldDismiss) setMobileOpen(false);
    // else: clearing the inline transform while .is-open stays on lets the
    // CSS transition snap the sheet back to translateY(0) on its own.
  };

  return (
    <nav className="app-nav">
      <div className="app-nav-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="button" onClick={() => navigate("dashboard")} aria-label="Examik" style={{
            display: "flex", alignItems: "center", border: "none", background: "transparent",
            cursor: "pointer", padding: 0, color: "var(--text-strong)",
          }}>
            <BrandLockup wordClassName="app-nav-wordmark" />
          </button>
          {isDemo && <NavSignUpButton lang={lang} />}
        </div>

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
      <div
        className={"app-nav-more-scrim" + (mobileOpen ? " is-open" : "")}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className={"app-nav-more-sheet" + (mobileOpen ? " is-open" : "")}
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen ? "true" : undefined}
        aria-label={mobileOpen ? t.nav_more : undefined}
        // The sheet hides via `transform`, not `display`, so the transition can
        // play — but that alone leaves every button inside keyboard-reachable
        // while invisible and off-screen. `inert` removes the whole subtree
        // from tab order and the accessibility tree until it's actually open.
        inert={mobileOpen ? undefined : ""}
      >
        <div
          className="app-nav-more-grabber"
          aria-hidden="true"
          style={{ touchAction: "none", cursor: "grab" }}
          onPointerDown={onGrabberPointerDown}
          onPointerMove={onGrabberPointerMove}
          onPointerUp={onGrabberPointerUp}
          onPointerCancel={onGrabberPointerUp}
        />
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
