// Settings hub — tile grid (OneSignal-style). Detail is an in-tab page so
// the tab stays one route. Helpers stay at module scope: Field/Section
// used to remount inputs; Card/Row would too.

import { isProUser } from "../learn/premium";
import { startProCheckout, startBillingPortal } from "../../lib/billing";
import { applyAppearance } from "../../lib/appearance";
import { THEME_META, THEMES, resolveThemeId } from "../../styles/themes";
import { exportPersonalData } from "../../lib/export-data";
import { deleteAccount } from "../../lib/delete-account";
import { ACCENT_OPTIONS } from "../../app/tweaks";
import { Legal } from "../../app/legal/Legal";

function L(lang, en, uk, ru, fr, de) { return { en, uk, ru, fr, de }[lang] || en; }

function HubIcon({ children }) {
  return (
    <span className="settings-hub-icon" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
    </span>
  );
}

function HubCard({ title, sub, status, cta, danger, pulse, icon, onClick }) {
  return (
    <button type="button" className={`settings-hub-card${pulse ? " settings-sub-free" : ""}`} data-danger={danger ? "1" : undefined} onClick={onClick}>
      <div className="settings-hub-copy">
        <h2>{title}</h2>
        <p>{sub}</p>
        {status ? <span className="settings-hub-status">{status}</span> : null}
        {cta ? <span className="settings-hub-cta">{cta}</span> : null}
      </div>
      {icon}
    </button>
  );
}

function Card({ children, danger }) {
  return <section className={`settings-card${danger ? " settings-danger" : ""}`}>{children}</section>;
}

function Row({ label, sub, value, chevron, onClick, children }) {
  const inner = (
    <>
      <span className="settings-row-label">
        <strong>{label}</strong>
        {sub ? <em>{sub}</em> : null}
      </span>
      {children || (value != null ? <span className="settings-row-value">{value}{chevron ? <span className="settings-chevron">›</span> : null}</span> : null)}
    </>
  );
  if (!onClick) return <div className="settings-row">{inner}</div>;
  return <button type="button" className="settings-row" onClick={onClick}>{inner}</button>;
}

function MagToggle({ on, onChange, label }) {
  return (
    <button
      type="button"
      className="settings-toggle"
      data-on={on ? "1" : "0"}
      aria-pressed={on}
      aria-label={label}
      onClick={() => onChange(!on)}
    >
      <i />
    </button>
  );
}

function SettingsPage({ title, onClose, backLabel, children }) {
  return (
    <div className="settings-page">
      <header className="settings-page-head">
        <button type="button" className="settings-page-back" onClick={onClose} aria-label={backLabel || "Back"}>‹</button>
        <h1>{title}</h1>
      </header>
      <div className="settings-page-body">{children}</div>
    </div>
  );
}

function avatarLetters(name) {
  return (name || "?").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function XpAvatar({ src, name, into, need }) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const pct = need > 0 ? Math.min(1, into / need) : 0;
  return (
    <div className="settings-avatar-wrap" aria-hidden="true">
      {src
        ? <img className="settings-avatar-face" src={src} alt="" />
        : <span className="settings-avatar-face">{avatarLetters(name)}</span>}
      <svg className="settings-avatar-ring" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--border-default)" strokeWidth="3" />
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--amber-500)" strokeWidth="3"
          strokeDasharray={`${circ * pct} ${circ}`} strokeLinecap="round" transform="rotate(-90 36 36)" />
      </svg>
    </div>
  );
}

const AVATAR_MAX_BYTES = 8 * 1024 * 1024;

function readAvatarFile(file, done, fail) {
  if (!file || !String(file.type || "").startsWith("image/")) { fail(); return; }
  if (file.size > AVATAR_MAX_BYTES) { fail(); return; }
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    try {
      const c = document.createElement("canvas");
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext("2d");
      const s = Math.min(img.width, img.height) || 1;
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 128, 128);
      done(c.toDataURL("image/jpeg", 0.82));
    } catch {
      fail();
    }
    URL.revokeObjectURL(url);
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    fail();
  };
  img.src = url;
}

function lastSyncLabel(lang) {
  try {
    const shadow = JSON.parse(localStorage.getItem("sync_shadow_v1") || "{}");
    const times = Object.values(shadow).filter((v) => typeof v === "string").map((v) => Date.parse(v)).filter(Number.isFinite);
    if (!times.length) return L(lang, "Not synced yet", "Ще не синхронізовано", "Ещё не синхронизировано", "Pas encore synchronisé", "Noch nicht synchronisiert");
    const agoMin = Math.max(0, Math.round((Date.now() - Math.max(...times)) / 60000));
    if (agoMin < 1) return L(lang, "Synced just now", "Синхронізовано щойно", "Синхронизировано только что", "Synchronisé à l’instant", "Gerade synchronisiert");
    return L(lang, `Synced ${agoMin} min ago`, `Синхронізовано ${agoMin} хв тому`, `Синхронизировано ${agoMin} мин назад`, `Synchronisé il y a ${agoMin} min`, `Vor ${agoMin} Min synchronisiert`);
  } catch {
    return L(lang, "Local only", "Лише локально", "Только локально", "Local seulement", "Nur lokal");
  }
}

const ACCENT_COLORS = { Indigo: "#4F46E5", Violet: "#7C3AED", Rose: "#E11D48", Amber: "#D97706" };
const PKG_VERSION = "3.0.0";

function Settings({ t, lang, onLangChange, onLogout, onGoToExams, onGoToTools, onGoToProgress }) {
  const profile = React.useMemo(() => window.getProfile(), []);
  const [fullName, setFullName] = React.useState(profile.fullName || "");
  const [email, setEmail] = React.useState(profile.email || "");
  const [emailError, setEmailError] = React.useState("");
  const [tz, setTz] = React.useState(() => {
    if (profile.timezone) {
      const z = (window.TIMEZONES || []).find((z) => z.id === profile.timezone);
      if (z) return z;
    }
    return window.detectTimezone ? window.detectTimezone() : { id: "+00", label: "GMT+0", place: "London" };
  });
  const [reminderEnabled, setReminderEnabled] = React.useState(profile.reminderEnabled);
  const [reminderHour, setReminderHour] = React.useState(profile.reminderHour);
  const [notifyExamCountdown, setNotifyExamCountdown] = React.useState(profile.notifyExamCountdown);
  const [notifyWeeklyDigest, setNotifyWeeklyDigest] = React.useState(profile.notifyWeeklyDigest);
  const [notifyStreakDanger, setNotifyStreakDanger] = React.useState(profile.notifyStreakDanger);
  const [notifyMistakeReview, setNotifyMistakeReview] = React.useState(profile.notifyMistakeReview);
  const [notifyMaster, setNotifyMaster] = React.useState(profile.notifyMaster !== false);
  const [soundsEnabled, setSoundsEnabled] = React.useState(profile.soundsEnabled === true);
  const [soundVolume, setSoundVolume] = React.useState(profile.soundVolume ?? 0.7);
  const [hapticEnabled, setHapticEnabled] = React.useState(profile.hapticEnabled !== false);
  const [theme, setTheme] = React.useState(() => resolveThemeId(profile.theme));
  const [accent, setAccent] = React.useState(profile.accent || "Indigo");
  const [dyslexiaFont, setDyslexiaFont] = React.useState(profile.dyslexiaFont === true);
  const [tierOff, setTierOff] = React.useState(profile.tierThemeDisabled === true);
  const [hoursPerDay, setHoursPerDay] = React.useState(profile.hoursPerDay || Math.round((profile.weeklyHours || 12) / (profile.daysPerWeek || 5)));
  const [country, setCountry] = React.useState(profile.country || "");
  const [avatar, setAvatar] = React.useState(profile.avatarDataUrl || "");
  const [password, setPassword] = React.useState("");
  const [password2, setPassword2] = React.useState("");
  const [accountError, setAccountError] = React.useState("");
  const [avatarError, setAvatarError] = React.useState("");
  const [emailPending, setEmailPending] = React.useState(false);
  const [accountBusy, setAccountBusy] = React.useState(false);
  const [quietStart, setQuietStart] = React.useState(profile.quietHoursStart ?? 22);
  const [quietEnd, setQuietEnd] = React.useState(profile.quietHoursEnd ?? 7);
  const [quietOn, setQuietOn] = React.useState(profile.quietHoursStart != null);
  const [sheet, setSheet] = React.useState(null);
  const [billingBusy, setBillingBusy] = React.useState(false);
  const [billingError, setBillingError] = React.useState("");
  const [saved, setSaved] = React.useState(false);
  const [confirmErase, setConfirmErase] = React.useState(false);
  const [confirmLogout, setConfirmLogout] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleteBusy, setDeleteBusy] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState("");
  const [egg, setEgg] = React.useState(0);
  const [pushStatus, setPushStatus] = React.useState("unsupported");
  const [exported, setExported] = React.useState(false);
  const pro = isProUser();
  const xp = window.xpLevel ? window.xpLevel() : { level: 1, xp: 0, into: 0, need: 100 };
  const tier = window.xpTier ? window.xpTier() : { id: "novice", emoji: "🌱" };
  const exams = (window.getExams ? window.getExams() : []).filter((e) => e && e.examDate);
  const streak = window.computeStreak ? window.computeStreak() : 0;
  const ZONES = window.TIMEZONES || [];
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const session = window.getSession ? window.getSession() : null;
  const isDemo = !session || session.mode === "demo";
  const minPassword = window.MIN_PASSWORD_LEN || 8;

  React.useEffect(() => {
    if (!window.isPushSupported || !window.isPushSupported()) return;
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push((OneSignal) => {
      setPushStatus(OneSignal.Notifications.permission ? "granted" : "default");
    });
  }, []);

  React.useEffect(() => {
    return () => applyAppearance(window.getProfile());
  }, []);

  React.useEffect(() => {
    if (!confirmErase) return;
    const id = setTimeout(() => setConfirmErase(false), 4000);
    return () => clearTimeout(id);
  }, [confirmErase]);

  function persist(patch) {
    const next = window.saveProfile(patch);
    applyAppearance(next);
    return next;
  }

  async function saveProfileSheet() {
    const trimmedEmail = email.trim();
    const emailValid = !trimmedEmail || EMAIL_RE.test(trimmedEmail);
    setEmailError(emailValid ? "" : t.settings_email_invalid);
    setAccountError("");
    if (!emailValid) return;
    if (password && password.length < minPassword) {
      setAccountError(L(lang, `Use at least ${minPassword} characters.`, `Щонайменше ${minPassword} символів.`, `Не менее ${minPassword} символов.`, `Au moins ${minPassword} caractères.`, `Mindestens ${minPassword} Zeichen.`));
      return;
    }
    if (password && password !== password2) {
      setAccountError(t.settings_password_mismatch);
      return;
    }
    persist({
      fullName, timezone: tz.id, reminderEnabled, reminderHour,
      notifyExamCountdown, notifyWeeklyDigest, notifyStreakDanger, notifyMistakeReview,
      notifyMaster, soundsEnabled, soundVolume, hapticEnabled, theme, accent, dyslexiaFont,
      tierThemeDisabled: tierOff, hoursPerDay, country, avatarDataUrl: avatar,
      quietHoursStart: quietOn ? quietStart : null, quietHoursEnd: quietOn ? quietEnd : null,
      email: trimmedEmail,
    });
    if (!window.updateAccount) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2800);
      setSheet(null);
      return;
    }
    setAccountBusy(true);
    try {
      const result = await window.updateAccount({
        name: fullName,
        email: trimmedEmail,
        password: password || undefined,
      });
      setPassword("");
      setPassword2("");
      setEmailPending(!!result.emailPending);
      setSaved(true);
      setTimeout(() => setSaved(false), 2800);
      if (!result.emailPending) setSheet(null);
    } catch (err) {
      setAccountError(err && err.code === "DEMO" ? t.settings_password_demo : (err && err.message) || t.settings_email_invalid);
    } finally {
      setAccountBusy(false);
    }
  }

  async function buy() {
    setBillingBusy(true);
    setBillingError("");
    const result = await startProCheckout();
    if (result.error) { setBillingError(result.error); setBillingBusy(false); }
  }
  async function portal() {
    setBillingBusy(true);
    setBillingError("");
    const result = await startBillingPortal();
    if (result.error) { setBillingError(result.error); setBillingBusy(false); }
  }

  const inputStyle = { width: "100%", boxSizing: "border-box", padding: "12px 16px", fontSize: "var(--text-base)", fontFamily: "var(--font-sans)", color: "var(--text-strong)", background: "var(--surface-muted)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", outline: "none" };
  const tierWash = `linear-gradient(180deg, color-mix(in srgb, var(--tier-accent) 8%, transparent), transparent 72px)`;

  return (
    <div className="settings-hub" style={{ backgroundImage: tierOff ? "none" : tierWash, margin: "-8px -4px 0", padding: "8px 4px 0" }}>
      {!sheet && (
        <div className="settings-hub-home">
      <h1>{t.settings_title}</h1>

      <section className="settings-hub-section">
        <p className="settings-hub-kicker">{L(lang, "Account", "Акаунт", "Аккаунт", "Compte", "Konto")}</p>
        <div className="settings-hub-grid">
          <HubCard
            title={L(lang, "Profile", "Профіль", "Профиль", "Profil", "Profil")}
            sub={L(lang, "Name, photo, email, password", "Ім'я, фото, email, пароль", "Имя, фото, email, пароль", "Nom, photo, e-mail, mot de passe", "Name, Foto, E-Mail, Passwort")}
            onClick={() => setSheet("profile")}
            icon={<HubIcon><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></HubIcon>}
          />
          <HubCard
            title={L(lang, "Subscription", "Підписка", "Подписка", "Abonnement", "Abo")}
            sub={pro
              ? L(lang, "Full Learn tree unlocked.", "Все дерево Learn відкрите.", "Всё дерево Learn открыто.", "Arbre Learn complet déverrouillé.", "Ganzer Learn-Baum offen.")
              : L(lang, "First unit free. 3 days of Pro free, then $5.99/month.", "Перший юніт безкоштовно. 3 дні Pro безкоштовно, далі $5.99/міс.", "Первый юнит бесплатно. 3 дня Pro бесплатно, дальше $5.99/мес.", "Premier chapitre gratuit. 3 jours de Pro gratuits, puis $5.99/mois.", "Erste Einheit gratis. 3 Tage Pro kostenlos, dann $5.99/Monat.")}
            status={pro ? L(lang, "Active", "Активна", "Активна", "Actif", "Aktiv") : null}
            cta={pro ? null : L(lang, "Start 3-day trial", "Почати 3-денний тріал", "Начать 3-дневный триал", "Commencer l’essai", "3-Tage-Trial starten")}
            pulse={!pro}
            onClick={() => setSheet("billing")}
            icon={<HubIcon><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></HubIcon>}
          />
        </div>
      </section>

      <section className="settings-hub-section">
        <p className="settings-hub-kicker">{L(lang, "App", "Застосунок", "Приложение", "App", "App")}</p>
        <div className="settings-hub-grid">
          <HubCard
            title={L(lang, "Study", "Навчання", "Учёба", "Études", "Lernen")}
            sub={exams.length
              ? L(lang, `${exams.length} exam${exams.length === 1 ? "" : "s"} · ${hoursPerDay}h / day`, `${exams.length} іспит(и) · ${hoursPerDay} год/день`, `${exams.length} экзамен(а) · ${hoursPerDay} ч/день`, `${exams.length} examen(s) · ${hoursPerDay} h/j`, `${exams.length} Prüfung(en) · ${hoursPerDay} Std/Tag`)
              : L(lang, "Exams, hours, current tier", "Іспити, години, рівень", "Экзамены, часы, уровень", "Examens, heures, palier", "Prüfungen, Stunden, Stufe")}
            onClick={() => setSheet("study")}
            icon={<HubIcon><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></HubIcon>}
          />
          <HubCard
            title={L(lang, "Personalization", "Персоналізація", "Персонализация", "Personnalisation", "Personalisierung")}
            sub={L(lang, "Theme, language, accent, region", "Тема, мова, акцент, регіон", "Тема, язык, акцент, регион", "Thème, langue, accent, région", "Thema, Sprache, Akzent, Region")}
            onClick={() => setSheet("appearance")}
            icon={<HubIcon><circle cx="13.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="10.5" r="2.5" /><circle cx="8.5" cy="7.5" r="2.5" /><circle cx="6.5" cy="12.5" r="2.5" /><path d="M12 22c5.5 0 10-4.5 10-10 0-1.7-.4-3.3-1.1-4.7" /><path d="M2.1 10.2A10 10 0 0 0 12 22" /></HubIcon>}
          />
          <HubCard
            title={L(lang, "Sound & haptics", "Звук і тактильність", "Звук и тактильность", "Son et haptique", "Ton & Haptik")}
            sub={soundsEnabled
              ? L(lang, "Effects on", "Ефекти увімкнені", "Эффекты включены", "Effets activés", "Effekte an")
              : L(lang, "Off by default", "Тиша за замовчуванням", "По умолчанию выкл.", "Désactivé par défaut", "Standard aus")}
            onClick={() => setSheet("sound")}
            icon={<HubIcon><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></HubIcon>}
          />
          <HubCard
            title={L(lang, "Notifications", "Сповіщення", "Уведомления", "Notifications", "Benachrichtigungen")}
            sub={notifyMaster
              ? L(lang, "Push, email, quiet hours", "Push, email, тихі години", "Push, email, тихие часы", "Push, e-mail, heures calmes", "Push, E-Mail, Ruhezeiten")
              : L(lang, "All notifications off", "Усі сповіщення вимкнені", "Все уведомления выкл.", "Toutes les notifs off", "Alle Benachrichtigungen aus")}
            status={notifyMaster ? L(lang, "Active", "Активні", "Активны", "Actif", "Aktiv") : null}
            onClick={() => setSheet("notify")}
            icon={<HubIcon><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></HubIcon>}
          />
          <HubCard
            title={L(lang, "Study Tools", "Матеріали", "Материалы", "Outils d’étude", "Lernwerkzeuge")}
            sub={L(lang, "Upload, YouTube, quiz from your files", "Завантаження, YouTube, тест з файлів", "Загрузка, YouTube, тест из файлов", "Import, YouTube, quiz depuis tes fichiers", "Upload, YouTube, Quiz aus Dateien")}
            onClick={() => onGoToTools && onGoToTools()}
            icon={<HubIcon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></HubIcon>}
          />
          <HubCard
            title={L(lang, "Progress", "Прогрес", "Прогресс", "Progrès", "Fortschritt")}
            sub={L(lang, "Mastery, streak, achievements", "Майстерність, серія, досягнення", "Мастерство, серия, достижения", "Maîtrise, série, succès", "Meisterschaft, Serie, Erfolge")}
            onClick={() => onGoToProgress && onGoToProgress()}
            icon={<HubIcon><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></HubIcon>}
          />
        </div>
      </section>

      <section className="settings-hub-section">
        <p className="settings-hub-kicker">{L(lang, "General", "Загальне", "Общее", "Général", "Allgemein")}</p>
        <div className="settings-hub-grid">
          <HubCard
            title={L(lang, "Data & privacy", "Дані та приватність", "Данные и приватность", "Données et confidentialité", "Daten & Privatsphäre")}
            sub={L(lang, "Export, sync, legal", "Експорт, синк, юридичне", "Экспорт, синк, юридическое", "Export, sync, mentions", "Export, Sync, Rechtliches")}
            onClick={() => setSheet("data")}
            icon={<HubIcon><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></HubIcon>}
          />
          <HubCard
            title={L(lang, "Support", "Підтримка", "Поддержка", "Support", "Support")}
            sub={L(lang, "FAQ, Telegram, bugs", "FAQ, Telegram, баги", "FAQ, Telegram, баги", "FAQ, Telegram, bugs", "FAQ, Telegram, Bugs")}
            onClick={() => setSheet("support")}
            icon={<HubIcon><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></HubIcon>}
          />
          <HubCard
            title={L(lang, "About", "Про застосунок", "О приложении", "À propos", "Über die App")}
            sub={`exam.coach · v${PKG_VERSION}`}
            onClick={() => setSheet("aboutMenu")}
            icon={<HubIcon><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></HubIcon>}
          />
          <HubCard
            title={L(lang, "Danger zone", "Небезпечна зона", "Опасная зона", "Zone danger", "Gefahrenzone")}
            sub={L(lang, "Reset, log out, delete", "Скинути, вийти, видалити", "Сбросить, выйти, удалить", "Reset, quitter, supprimer", "Reset, Abmelden, Löschen")}
            danger
            onClick={() => setSheet("danger")}
            icon={<HubIcon><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></HubIcon>}
          />
        </div>
      </section>
        </div>
      )}

      {sheet === "profile" && (
        <SettingsPage backLabel={t.onboard_back} title={L(lang, "Edit profile", "Редагувати профіль", "Редактировать профиль", "Modifier le profil", "Profil bearbeiten")} onClose={() => setSheet(null)}>
          <div className="settings-form">
            <div className="settings-row" style={{ alignItems: "center", borderTop: "none", paddingLeft: 0, paddingRight: 0 }}>
              <XpAvatar src={avatar} name={fullName} into={xp.into} need={xp.need} />
              <span className="settings-row-label">
                <strong>{fullName || L(lang, "Your name", "Твоє ім'я", "Твоё имя", "Ton nom", "Dein Name")}</strong>
                <em>{email || "—"} · {L(lang, "Level", "Рівень", "Уровень", "Niveau", "Level")} {xp.level} {tier.emoji}</em>
              </span>
            </div>
            <input id="settings-avatar-file" type="file" accept="image/*" className="settings-avatar-file" onChange={(e) => {
              const f = e.target.files && e.target.files[0];
              e.target.value = "";
              if (!f) return;
              readAvatarFile(f, (data) => {
                setAvatarError("");
                setAvatar(data);
                persist({ avatarDataUrl: data });
              }, () => setAvatarError(t.settings_avatar_bad));
            }} />
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <label htmlFor="settings-avatar-file"
                style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid var(--border-default)", background: "var(--surface-muted)", cursor: "pointer", textAlign: "center", fontFamily: "var(--font-sans)", fontSize: 14 }}>
                {L(lang, "Upload photo", "Завантажити фото", "Загрузить фото", "Uploader une photo", "Foto hochladen")}
              </label>
              <button type="button" onClick={() => { setAvatar(""); persist({ avatarDataUrl: "" }); setAvatarError(""); }}
                style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid var(--border-default)", background: "var(--surface-muted)", cursor: "pointer" }}>
                {L(lang, "Use initials", "Ініціали", "Инициалы", "Initiales", "Initialen")}
              </button>
            </div>
            {avatarError && <p style={{ color: "var(--red-600)", fontSize: 12, margin: "-4px 0 12px" }}>{avatarError}</p>}
            <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{t.settings_fullname}</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" style={{ ...inputStyle, marginBottom: 12 }} />
            <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{t.settings_email}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" style={inputStyle} />
            {emailError && <p style={{ color: "var(--red-600)", fontSize: 12 }}>{emailError}</p>}
            {emailPending && <p style={{ color: "var(--indigo-700)", fontSize: 12 }}>{t.settings_email_pending}</p>}
            {isDemo
              ? <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "12px 0 0" }}>{t.settings_password_demo}</p>
              : (
                <>
                  <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", margin: "12px 0 4px" }}>{t.settings_password}</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder={t.settings_password_note} style={{ ...inputStyle, marginBottom: 12 }} />
                  <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{t.settings_password_confirm}</label>
                  <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" style={inputStyle} />
                </>
              )}
            {accountError && <p style={{ color: "var(--red-600)", fontSize: 12 }}>{accountError}</p>}
            <button type="button" disabled={accountBusy} onClick={saveProfileSheet}
              style={{ marginTop: 16, width: "100%", padding: 12, borderRadius: 12, border: "none", background: "var(--indigo-600)", color: "#fff", fontWeight: 700, cursor: accountBusy ? "wait" : "pointer" }}>
              {accountBusy ? L(lang, "Saving…", "Збереження…", "Сохранение…", "Enregistrement…", "Speichern…") : t.settings_save}
            </button>
          </div>
        </SettingsPage>
      )}

      {sheet === "study" && (
        <SettingsPage backLabel={t.onboard_back} title={L(lang, "Study", "Навчання", "Учёба", "Études", "Lernen")} onClose={() => setSheet(null)}>
          <Card>
            {exams.length === 0
              ? <Row label={L(lang, "No exams yet", "Ще немає іспитів", "Ещё нет экзаменов", "Pas encore d’examens", "Noch keine Prüfungen")} sub={L(lang, "Add one from the Exams tab.", "Додай на вкладці Іспити.", "Добавь на вкладке Экзамены.", "Ajoute-en dans Examens.", "Füge eine unter Prüfungen hinzu.")} chevron onClick={() => onGoToExams && onGoToExams()} />
              : exams.slice(0, 4).map((e) => (
                <Row key={e.id} label={e.name} sub={`${e.examDate} · ${L(lang, "target", "ціль", "цель", "objectif", "Ziel")} ${e.targetGrade || "—"}`} chevron onClick={() => onGoToExams && onGoToExams()} />
              ))}
            <Row label={L(lang, "Hours per day", "Годин на день", "Часов в день", "Heures / jour", "Stunden / Tag")} value={`${hoursPerDay}h`} chevron onClick={() => setSheet("hours")} />
            <Row label={L(lang, "Current tier", "Поточний рівень", "Текущий тир", "Palier actuel", "Aktuelle Stufe")} value={`${tier.emoji} ${window.tierTitle ? window.tierTitle(tier, lang) : tier.id}`} />
          </Card>
        </SettingsPage>
      )}

      {sheet === "appearance" && (
        <SettingsPage backLabel={t.onboard_back} title={L(lang, "Personalization", "Персоналізація", "Персонализация", "Personnalisation", "Personalisierung")} onClose={() => {
          applyAppearance(window.getProfile());
          setTheme(resolveThemeId(window.getProfile().theme));
          setSheet(null);
        }}>
          <Card>
            <div style={{ padding: "10px 16px 4px", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{L(lang, "Theme", "Тема", "Тема", "Thème", "Thema")}</div>
            <div className="settings-theme-rail">
              {THEME_META.map((meta) => {
                const palette = THEMES[meta.id];
                const name = meta.name[lang] || meta.name.en;
                return (
                  <button
                    key={meta.id}
                    type="button"
                    className="settings-theme-swatch"
                    data-on={theme === meta.id ? "1" : "0"}
                    aria-label={name}
                    aria-pressed={theme === meta.id}
                    onClick={() => {
                      setTheme(meta.id);
                      applyAppearance({ ...window.getProfile(), theme: meta.id });
                    }}
                  >
                    <span className="settings-theme-mini" style={{ background: palette.bg, color: palette.text }}>
                      <i style={{ background: palette.accent }} />
                      <b style={{ color: palette.accent }}>176</b>
                    </span>
                    <em>{name}</em>
                  </button>
                );
              })}
            </div>
            <div className="settings-row">
              <button type="button" onClick={() => { persist({ theme }); setSheet(null); }}
                style={{ width: "100%", padding: 12, borderRadius: 12, border: "none", background: "var(--indigo-600)", color: "var(--text-invert)", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                {t.settings_save}
              </button>
            </div>
          </Card>
          <Card>
            <Row label={L(lang, "Show tier background", "Показувати фон рівня", "Показывать фон уровня", "Fond du palier", "Stufen-Hintergrund")}>
              <MagToggle on={!tierOff} label="tier bg" onChange={(v) => { setTierOff(!v); persist({ tierThemeDisabled: !v }); }} />
            </Row>
            <div style={{ padding: "4px 16px 4px", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{L(lang, "Accent", "Акцент", "Акцент", "Accent", "Akzent")}</div>
            <div className="settings-swatches">
              {ACCENT_OPTIONS.map((name) => (
                <button key={name} type="button" className="settings-swatch" data-on={accent === name ? "1" : "0"}
                  style={{ background: ACCENT_COLORS[name] }} aria-label={name}
                  onClick={() => { setAccent(name); persist({ accent: name }); }} />
              ))}
            </div>
          </Card>
          <Card>
            <div style={{ padding: "4px 16px 0", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{L(lang, "Language", "Мова", "Язык", "Langue", "Sprache")}</div>
            <div className="settings-flags">
              {Object.values(window.LANGS || {}).map((l) => (
                <button key={l.code} type="button" className="settings-flag" data-on={lang === l.code ? "1" : "0"} onClick={() => onLangChange(l.code)}>
                  <span>{l.flag}</span><span>{l.label}</span>
                </button>
              ))}
            </div>
            <Row label={L(lang, "Country / region", "Країна / регіон", "Страна / регион", "Pays / région", "Land / Region")} value={country || tz.place} chevron onClick={() => setSheet("region")} />
            <Row label={L(lang, "Dyslexia-friendly", "Зручно при дислексії", "Удобно при дислексии", "Lisibilité dyslexie", "Legasthenie-freundlich")}>
              <MagToggle on={dyslexiaFont} label="dyslexia" onChange={(v) => { setDyslexiaFont(v); persist({ dyslexiaFont: v }); }} />
            </Row>
          </Card>
        </SettingsPage>
      )}

      {sheet === "sound" && (
        <SettingsPage backLabel={t.onboard_back} title={L(lang, "Sound & haptics", "Звук і тактильність", "Звук и тактильность", "Son et haptique", "Ton & Haptik")} onClose={() => setSheet(null)}>
          <Card>
            <Row label={L(lang, "Sound effects", "Звукові ефекти", "Звуковые эффекты", "Effets sonores", "Soundeffekte")} sub={L(lang, "Off by default", "Тиша за замовчуванням", "По умолчанию выкл.", "Désactivé par défaut", "Standard aus")}>
              <MagToggle on={soundsEnabled} label="sounds" onChange={(v) => {
                setSoundsEnabled(v);
                persist({ soundsEnabled: v });
                if (v) window.previewSound && window.previewSound("select");
              }} />
            </Row>
            {soundsEnabled && (
              <div className="settings-row">
                <span className="settings-row-label"><strong>{L(lang, "Volume", "Гучність", "Громкость", "Volume", "Lautstärke")}</strong></span>
                <input type="range" min={0} max={1} step={0.05} value={soundVolume}
                  onChange={(e) => { const v = Number(e.target.value); setSoundVolume(v); persist({ soundVolume: v }); }}
                  style={{ width: 120, accentColor: "var(--indigo-600)" }} />
              </div>
            )}
            <Row label={L(lang, "Haptic feedback", "Тактильний відгук", "Тактильный отклик", "Retour haptique", "Haptik")} sub={L(lang, "Vibration where the browser allows it", "Вібрація, якщо браузер вміє", "Вибрация, если браузер умеет", "Vibre si le navigateur le permet", "Vibration, wenn der Browser es kann")}>
              <MagToggle on={hapticEnabled} label="haptic" onChange={(v) => {
                setHapticEnabled(v);
                persist({ hapticEnabled: v });
                if (v && navigator.vibrate) navigator.vibrate([8, 30, 16, 30, 28]);
              }} />
            </Row>
            <Row label={L(lang, "Preview sounds", "Прослухати звуки", "Прослушать звуки", "Écouter les sons", "Sounds anhören")} chevron onClick={() => setSheet("sounds")} />
          </Card>
        </SettingsPage>
      )}

      {sheet === "notify" && (
        <SettingsPage backLabel={t.onboard_back} title={L(lang, "Notifications", "Сповіщення", "Уведомления", "Notifications", "Benachrichtigungen")} onClose={() => setSheet(null)}>
          <Card>
            <Row label={L(lang, "All notifications", "Усі сповіщення", "Все уведомления", "Toutes les notifications", "Alle Benachrichtigungen")}>
              <MagToggle on={notifyMaster} label="master notify" onChange={(v) => { setNotifyMaster(v); persist({ notifyMaster: v }); }} />
            </Row>
            {notifyMaster && (
              <>
                <Row label={t.settings_reminder_send} value={`${String(reminderHour).padStart(2, "0")}:00`}>
                  <MagToggle on={reminderEnabled} label="daily" onChange={(v) => { setReminderEnabled(v); persist({ reminderEnabled: v }); }} />
                </Row>
                {reminderEnabled && (
                  <div className="settings-row">
                    <input type="range" min={6} max={22} value={reminderHour} onChange={(e) => {
                      const h = Number(e.target.value);
                      setReminderHour(h);
                      persist({ reminderHour: h });
                    }} style={{ width: "100%", accentColor: "var(--indigo-600)" }} />
                  </div>
                )}
              </>
            )}
          </Card>
          {notifyMaster && (
            <Card>
              {[
                { v: notifyExamCountdown, set: setNotifyExamCountdown, k: "notifyExamCountdown",
                  label: L(lang, "Exam approaching", "Іспит наближається", "Экзамен близко", "Examen proche", "Prüfung naht"),
                  sub: L(lang, "T-30 / 14 / 7 / 3 / 1", "T-30 / 14 / 7 / 3 / 1", "T-30 / 14 / 7 / 3 / 1", "T-30 / 14 / 7 / 3 / 1", "T-30 / 14 / 7 / 3 / 1") },
                { v: notifyWeeklyDigest, set: setNotifyWeeklyDigest, k: "notifyWeeklyDigest",
                  label: L(lang, "Weekly digest", "Тижневий підсумок", "Еженедельный итог", "Récap hebdo", "Wochenüberblick") },
                { v: notifyStreakDanger, set: setNotifyStreakDanger, k: "notifyStreakDanger",
                  label: L(lang, "Streak in danger", "Серія в небезпеці", "Серия в опасности", "Série en danger", "Serie in Gefahr") },
                { v: notifyMistakeReview, set: setNotifyMistakeReview, k: "notifyMistakeReview",
                  label: L(lang, "Time to review", "Час повторити", "Пора повторить", "À réviser", "Wiederholen") },
              ].map((row) => (
                <Row key={row.k} label={row.label} sub={row.sub}>
                  <MagToggle on={row.v} label={row.k} onChange={(v) => { row.set(v); persist({ [row.k]: v }); }} />
                </Row>
              ))}
              <Row label={L(lang, "Quiet hours", "Тихі години", "Тихие часы", "Heures calmes", "Ruhezeiten")}
                sub={L(lang, "No emails overnight", "Без листів уночі", "Без писем ночью", "Pas d’e-mails la nuit", "Nachts keine E-Mails")}>
                <MagToggle on={quietOn} label="quiet" onChange={(v) => {
                  setQuietOn(v);
                  persist({ quietHoursStart: v ? quietStart : null, quietHoursEnd: v ? quietEnd : null });
                }} />
              </Row>
              {quietOn && (
                <div className="settings-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
                  <span className="settings-row-label">
                    <strong>{quietStart}:00 → {quietEnd}:00</strong>
                    <em>{L(lang, "Start / end", "Початок / кінець", "Начало / конец", "Début / fin", "Start / Ende")}</em>
                  </span>
                  <input type="range" min={0} max={23} value={quietStart} onChange={(e) => {
                    const h = Number(e.target.value);
                    setQuietStart(h);
                    persist({ quietHoursStart: h, quietHoursEnd: quietEnd });
                  }} style={{ width: "100%", accentColor: "var(--indigo-600)" }} />
                  <input type="range" min={0} max={23} value={quietEnd} onChange={(e) => {
                    const h = Number(e.target.value);
                    setQuietEnd(h);
                    persist({ quietHoursStart: quietStart, quietHoursEnd: h });
                  }} style={{ width: "100%", accentColor: "var(--indigo-600)" }} />
                </div>
              )}
              {window.isPushSupported && window.isPushSupported() && pushStatus !== "granted" && pushStatus !== "denied" && (
                <Row label={L(lang, "Enable browser push", "Увімкнути push", "Включить push", "Activer le push", "Push aktivieren")} chevron
                  onClick={async () => setPushStatus(await window.requestPushPermission())} />
              )}
            </Card>
          )}
        </SettingsPage>
      )}

      {sheet === "billing" && (
        <SettingsPage backLabel={t.onboard_back} title={L(lang, "Subscription", "Підписка", "Подписка", "Abonnement", "Abo")} onClose={() => setSheet(null)}>
          <Card>
            <Row
              label={pro ? "Pro" : "Free"}
              sub={pro
                ? L(lang, "Full Learn tree unlocked. $5.99/month after trial.", "Все дерево Learn відкрите. $5.99/міс після тріалу.", "Всё дерево Learn открыто. $5.99/мес после триала.", "Arbre Learn complet. $5.99/mois après l’essai.", "Ganzer Learn-Baum. $5.99/Monat nach dem Trial.")
                : L(lang, "First unit free. Rest unlocks with Pro — 3 days free, then $5.99/month. Card at checkout.", "Перший юніт безкоштовно. Решта в Pro — 3 дні безкоштовно, далі $5.99/міс. Картка на Checkout.", "Первый юнит бесплатно. Остальное в Pro — 3 дня бесплатно, дальше $5.99/мес. Карта на Checkout.", "Premier chapitre gratuit. Le reste avec Pro — 3 jours gratuits, puis $5.99/mois.", "Erste Einheit gratis. Rest mit Pro — 3 Tage kostenlos, dann $5.99/Monat.")}
              value={pro ? L(lang, "Active", "Активна", "Активна", "Actif", "Aktiv") : "Free"}
            />
            {billingError && <p style={{ margin: "0 16px 10px", fontSize: 12, color: "var(--red-600)" }}>{billingError}</p>}
            {!pro && (
              <div className="settings-row">
                <button type="button" disabled={billingBusy} onClick={buy}
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "none", background: "var(--indigo-600)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: billingBusy ? "wait" : "pointer", fontFamily: "var(--font-sans)" }}>
                  {billingBusy ? L(lang, "Redirecting…", "Перехід…", "Переход…", "Redirection…", "Weiterleitung…") : L(lang, "Start 3-day trial", "Почати 3-денний тріал", "Начать 3-дневный триал", "Commencer l’essai", "3-Tage-Trial starten")}
                </button>
              </div>
            )}
            <Row label={L(lang, "Manage subscription", "Керувати підпискою", "Управлять подпиской", "Gérer l’abonnement", "Abo verwalten")}
              sub={L(lang, "Stripe portal — invoices, cancel, card", "Портал Stripe — рахунки, скасування, картка", "Портал Stripe", "Portail Stripe", "Stripe-Portal")}
              chevron onClick={portal} />
            <Row label={L(lang, "Promo code", "Промокод", "Промокод", "Code promo", "Promo-Code")}
              sub={L(lang, "Enter it on Stripe Checkout", "Вводиш на Stripe Checkout", "Вводишь на Stripe Checkout", "Saisi sur Stripe Checkout", "Auf Stripe Checkout eingeben")}
              chevron onClick={buy} />
          </Card>
        </SettingsPage>
      )}

      {sheet === "data" && (
        <SettingsPage backLabel={t.onboard_back} title={L(lang, "Data & privacy", "Дані та приватність", "Данные и приватность", "Données et confidentialité", "Daten & Privatsphäre")} onClose={() => setSheet(null)}>
          <Card>
            <Row label={L(lang, "Export data", "Експортувати дані", "Экспортировать данные", "Exporter les données", "Daten exportieren")}
              value={exported ? L(lang, "Downloaded", "Завантажено", "Скачано", "Téléchargé", "Heruntergeladen") : "JSON"} chevron
              onClick={() => { exportPersonalData(); setExported(true); }} />
            <Row label={L(lang, "Sync", "Синхронізація", "Синхронизация", "Sync", "Sync")} value={lastSyncLabel(lang)} />
            <Row label={L(lang, "Privacy policy", "Політика конфіденційності", "Политика конфиденциальности", "Confidentialité", "Datenschutz")} chevron onClick={() => setSheet("privacy")} />
            <Row label={L(lang, "Terms of use", "Умови використання", "Условия использования", "Conditions", "Nutzungsbedingungen")} chevron onClick={() => setSheet("terms")} />
            <Row label={t.land_foot_eula || "EULA"} chevron onClick={() => setSheet("eula")} />
            <Row label={t.land_foot_refund || "Refund"} chevron onClick={() => setSheet("refund")} />
            <Row label={t.land_foot_cookies || "Cookies"} chevron onClick={() => setSheet("cookies")} />
            <Row label={t.land_foot_children || "13+"} chevron onClick={() => setSheet("children")} />
            <Row label={L(lang, "Who sees my data", "Хто бачить мої дані", "Кто видит мои данные", "Qui voit mes données", "Wer meine Daten sieht")}
              sub={L(lang, "You. RLS on Supabase. AI calls go through our proxy — the key is not in the browser.", "Ти. RLS у Supabase. AI йде через наш проксі — ключа в браузері немає.", "Ты. RLS в Supabase. AI через наш прокси.", "Toi. RLS sur Supabase. L’IA passe par notre proxy.", "Du. RLS auf Supabase. KI über unseren Proxy.")} />
          </Card>
        </SettingsPage>
      )}

      {sheet === "support" && (
        <SettingsPage backLabel={t.onboard_back} title={L(lang, "Support", "Підтримка", "Поддержка", "Support", "Support")} onClose={() => setSheet(null)}>
          <Card>
            <Row label={L(lang, "FAQ", "Питання", "Вопросы", "FAQ", "FAQ")} chevron onClick={() => setSheet("faq")} />
            <Row label={L(lang, "Write to support", "Написати в підтримку", "Написать в поддержку", "Écrire au support", "Support schreiben")}
              sub="Telegram · email" chevron onClick={() => window.open("https://t.me/examcoach_ua", "_blank", "noopener")} />
            <Row label={L(lang, "Report a bug", "Повідомити про баг", "Сообщить о баге", "Signaler un bug", "Fehler melden")} chevron
              onClick={() => window.open("https://github.com/pakhomchik2008/ai-exam-coach-v2/issues/new", "_blank", "noopener")} />
            <Row label={L(lang, "Telegram community", "Telegram-спільнота", "Сообщество Telegram", "Communauté Telegram", "Telegram-Community")} chevron
              onClick={() => window.open("https://t.me/examcoach_ua", "_blank", "noopener")} />
          </Card>
        </SettingsPage>
      )}

      {sheet === "aboutMenu" && (
        <SettingsPage backLabel={t.onboard_back} title={L(lang, "About", "Про застосунок", "О приложении", "À propos", "Über die App")} onClose={() => setSheet(null)}>
          <Card>
            <Row label="exam.coach" value={`v${PKG_VERSION}`} onClick={() => {
              const n = egg + 1;
              setEgg(n);
              if (n >= 5) setSheet("egg");
            }} />
            <Row label={L(lang, "Our story", "Наша історія", "Наша история", "Notre histoire", "Unsere Geschichte")} chevron onClick={() => setSheet("about")} />
            <Row label={L(lang, "Contact", "Контакт", "Контакт", "Contact", "Kontakt")} value="Hlib Pakhomov" chevron
              onClick={() => { window.location.href = "mailto:hlibpakh@gmail.com"; }} />
            <Row label="Telegram" chevron onClick={() => window.open("https://t.me/examcoach_ua", "_blank", "noopener")} />
            <Row label="TikTok" chevron onClick={() => window.open("https://www.tiktok.com/@exam.coach", "_blank", "noopener")} />
            <Row label="GitHub" chevron onClick={() => window.open("https://github.com/pakhomchik2008/ai-exam-coach-v2", "_blank", "noopener")} />
          </Card>
        </SettingsPage>
      )}

      {sheet === "danger" && (
        <SettingsPage backLabel={t.onboard_back} title={L(lang, "Danger zone", "Небезпечна зона", "Опасная зона", "Zone danger", "Gefahrenzone")} onClose={() => setSheet(null)}>
          <Card danger>
            <Row
              label={confirmErase
                ? L(lang, `You lose a ${streak}-day streak and ${xp.xp} XP. Tap again.`, `Втратиш серію ${streak} днів і ${xp.xp} XP. Ще раз.`, `Потеряешь серию ${streak} дней и ${xp.xp} XP. Ещё раз.`, `Tu perds ${streak} j de série et ${xp.xp} XP. Encore une fois.`, `Du verlierst ${streak} Tage Serie und ${xp.xp} XP. Nochmal.`)
                : L(lang, "Reset progress", "Скинути прогрес", "Сбросить прогресс", "Réinitialiser", "Fortschritt zurücksetzen")}
              chevron
              onClick={() => {
                if (!confirmErase) { setConfirmErase(true); return; }
                try { localStorage.clear(); } catch {}
                if (onLogout) onLogout();
              }}
            />
            <Row
              label={confirmLogout ? L(lang, "Tap again to log out", "Ще раз — вийти", "Ещё раз — выйти", "Encore pour quitter", "Nochmal zum Abmelden") : t.nav_logout}
              chevron
              onClick={() => {
                if (!confirmLogout) { setConfirmLogout(true); return; }
                if (window.clearSession) window.clearSession();
                if (onLogout) onLogout();
              }}
            />
            <Row
              label={deleteBusy
                ? L(lang, "Deleting…", "Видаляю…", "Удаляю…", "Suppression…", "Löschen…")
                : confirmDelete
                ? L(lang, "Last tap wipes study data and the account.", "Останній тап стирає навчальні дані і акаунт.", "Последний тап стирает учебные данные и аккаунт.", "Dernier tap: données + compte.", "Letzter Tap: Lern­daten und Konto weg.")
                : L(lang, "Delete account", "Видалити акаунт", "Удалить аккаунт", "Supprimer le compte", "Konto löschen")}
              chevron
              onClick={async () => {
                if (deleteBusy) return;
                if (!confirmDelete) { setConfirmDelete(true); setDeleteError(""); return; }
                setDeleteBusy(true);
                setDeleteError("");
                const result = await deleteAccount();
                if (result.error) {
                  setDeleteError(result.error);
                  setDeleteBusy(false);
                  return;
                }
                try { localStorage.clear(); } catch {}
                if (window.clearSession) window.clearSession();
                if (onLogout) onLogout();
              }}
            />
            {deleteError ? <p style={{ margin: "0 16px 12px", fontSize: 12, color: "var(--red-600)" }}>{deleteError}</p> : null}
          </Card>
        </SettingsPage>
      )}
      {sheet === "hours" && (
        <SettingsPage backLabel={t.onboard_back} title={L(lang, "Hours per day", "Годин на день", "Часов в день", "Heures / jour", "Stunden / Tag")} onClose={() => setSheet("study")}>
          <Card>
            <div className="settings-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 16 }}>
              <input type="range" min={1} max={8} step={0.5} value={hoursPerDay}
                onChange={(e) => setHoursPerDay(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--indigo-600)" }} />
              <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-strong)" }}>{hoursPerDay}h</p>
              <button type="button" onClick={() => { persist({ hoursPerDay }); setSheet("study"); }}
                style={{ width: "100%", padding: 12, borderRadius: 12, border: "none", background: "var(--indigo-600)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                {t.settings_save}
              </button>
            </div>
          </Card>
        </SettingsPage>
      )}

      {sheet === "region" && (
        <SettingsPage backLabel={t.onboard_back} title={L(lang, "Country / timezone", "Країна / пояс", "Страна / пояс", "Pays / fuseau", "Land / Zone")} onClose={() => setSheet("appearance")}>
          <Card>
            <div className="settings-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
              <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder={L(lang, "Ukraine", "Україна", "Украина", "Ukraine", "Ukraine")} style={inputStyle} />
              <select value={tz.id} onChange={(e) => setTz(ZONES.find((z) => z.id === e.target.value) || tz)} style={{ ...inputStyle, appearance: "none" }}>
                {ZONES.map((z) => <option key={z.id} value={z.id}>{z.label} — {z.place}</option>)}
              </select>
              <button type="button" onClick={() => { persist({ country, timezone: tz.id }); setSheet("appearance"); }}
                style={{ marginTop: 4, width: "100%", padding: 12, borderRadius: 12, border: "none", background: "var(--indigo-600)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                {t.settings_save}
              </button>
            </div>
          </Card>
        </SettingsPage>
      )}

      {sheet === "sounds" && (
        <SettingsPage backLabel={t.onboard_back} title={L(lang, "Preview sounds", "Прослухати звуки", "Прослушать звуки", "Écouter les sons", "Sounds anhören")} onClose={() => setSheet("sound")}>
          <Card>
            <div className="settings-row" style={{ flexWrap: "wrap", gap: 8 }}>
              {(window.SOUND_NAMES || []).map((name) => (
                <button key={name} type="button" onClick={() => window.previewSound && window.previewSound(name)}
                  style={{ border: "1px solid var(--border-default)", background: "var(--surface-muted)", color: "var(--text-body)", borderRadius: 99, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>
                  {name}
                </button>
              ))}
            </div>
          </Card>
        </SettingsPage>
      )}

      {["privacy", "terms", "eula", "refund", "cookies", "children"].includes(sheet) && (
        <SettingsPage backLabel={t.onboard_back} title={t[`legal_${sheet}_title`] || sheet} onClose={() => setSheet("data")}>
          <Legal page={sheet} t={t} />
        </SettingsPage>
      )}

      {sheet === "faq" && (
        <SettingsPage backLabel={t.onboard_back} title={t.land_faq_title || "FAQ"} onClose={() => setSheet("support")}>
          <Card>
            <div className="settings-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <details key={n}>
                  <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--text-strong)" }}>{t[`land_faq_${n}_q`]}</summary>
                  <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5 }}>{t[`land_faq_${n}_a`]}</p>
                </details>
              ))}
            </div>
          </Card>
        </SettingsPage>
      )}

      {sheet === "about" && (
        <SettingsPage backLabel={t.onboard_back} title={t.land_about_title || "About"} onClose={() => setSheet("aboutMenu")}>
          <Card>
            <div className="settings-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: "var(--text-body)" }}>{t.land_about_p1}</p>
              <p style={{ margin: "12px 0 0", fontSize: 15, lineHeight: 1.55, color: "var(--text-body)" }}>{t.land_about_p2}</p>
            </div>
          </Card>
        </SettingsPage>
      )}

      {sheet === "egg" && (
        <SettingsPage backLabel={t.onboard_back} title="Shipping stats" onClose={() => { setSheet("aboutMenu"); setEgg(0); }}>
          <Card>
            <div className="settings-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: "var(--text-body)" }}>
                {L(lang, "Built by Hlib in Ukraine. Coffee: ∞. Beta testers: you.", "Зробив Гліб в Україні. Кави: ∞. Бета: ти.", "Сделал Глеб в Украине. Кофе: ∞.", "Fait par Hlib en Ukraine. Café : ∞.", "Gebaut von Hlib in der Ukraine. Kaffee: ∞.")}
              </p>
              <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--text-faint)" }}>exam.coach v{PKG_VERSION}</p>
            </div>
          </Card>
        </SettingsPage>
      )}

      <div style={{
        position: "fixed", bottom: 28, right: 28, zIndex: 9999,
        background: "var(--slate-900)", color: "var(--white)",
        borderRadius: "var(--radius-xl)", padding: "12px 20px",
        fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)",
        display: "flex", alignItems: "center", gap: 10,
        boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
        transform: saved ? "translateY(0)" : "translateY(80px)",
        opacity: saved ? 1 : 0,
        transition: "transform 0.25s cubic-bezier(0.16,1,0.3,1), opacity 0.2s ease",
        pointerEvents: "none",
      }}>
        <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--emerald-500)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>✓</span>
        {t.settings_saved}
      </div>
    </div>
  );
}

window.Settings = Settings;
export {};
