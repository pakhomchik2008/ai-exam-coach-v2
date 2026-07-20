// AI Exam Coach — Landing + authentication.
// Three explicit paths in: Sign Up, Log In, Try Demo. Auth is local-only
// (auth-store.jsx) — there's no backend, but it's wired up for real:
// passwords are hashed (never stored in plaintext), wrong-password and
// no-such-account are distinguished, and Try Demo skips account creation
// entirely rather than faking one.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LEN = 8;

function PasswordInput({ value, onChange, placeholder, autoComplete, hasError, t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
  const [show, setShow] = React.useState(false);
  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "12px 44px 12px 16px", fontSize: "var(--text-base)",
    fontFamily: "var(--font-sans)", color: "var(--text-strong)", background: "var(--surface-card)",
    border: hasError ? "1px solid var(--red-400)" : "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", outline: "none",
  };
  return (
    <div style={{ position: "relative" }}>
      <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} autoComplete={autoComplete} style={inputStyle} />
      <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? L("Hide password", "Приховати пароль", "Скрыть пароль", "Masquer le mot de passe", "Passwort verbergen") : L("Show password", "Показати пароль", "Показать пароль", "Afficher le mot de passe", "Passwort anzeigen")}
        style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", fontSize: 16, color: "var(--text-faint)", padding: 6, lineHeight: 1 }}>
        {show ? "🙈" : "👁️"}
      </button>
    </div>
  );
}

function AuthForm({ mode, onSwitchMode, onBack, onSuccess, onDemo, t, lang, onLangChange }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
  const isSignUp = mode === "signup";
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [errors, setErrors] = React.useState({});
  const [formError, setFormError] = React.useState("");
  const [shake, setShake] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Reset per-field state when switching modes so stale errors/passwords
  // from the other form don't leak across — email is kept since switching
  // "Don't have an account? Sign up" after a failed login is a common path
  // and re-typing the email you just typed is pure friction.
  React.useEffect(() => {
    setPassword(""); setConfirmPassword(""); setErrors({}); setFormError("");
  }, [mode]);

  function validate() {
    const next = {};
    if (isSignUp && !name.trim()) next.name = L("Enter your name.", "Введіть ваше ім'я.", "Введите ваше имя.", "Entrez votre nom.", "Gib deinen Namen ein.");
    if (!email.trim()) next.email = L("Enter your email.", "Введіть ваш email.", "Введите ваш email.", "Entrez votre email.", "Gib deine E-Mail ein.");
    else if (!EMAIL_RE.test(email.trim())) next.email = L("That doesn't look like a valid email.", "Це не схоже на дійсний email.", "Это не похоже на действительный email.", "Cela ne ressemble pas à un email valide.", "Das sieht nicht nach einer gültigen E-Mail aus.");
    if (!password) next.password = L("Enter your password.", "Введіть ваш пароль.", "Введите ваш пароль.", "Entrez votre mot de passe.", "Gib dein Passwort ein.");
    else if (isSignUp && password.length < MIN_PASSWORD_LEN) next.password = L(`Use at least ${MIN_PASSWORD_LEN} characters.`, `Використайте щонайменше ${MIN_PASSWORD_LEN} символів.`, `Используйте не менее ${MIN_PASSWORD_LEN} символов.`, `Utilisez au moins ${MIN_PASSWORD_LEN} caractères.`, `Verwende mindestens ${MIN_PASSWORD_LEN} Zeichen.`);
    if (isSignUp && confirmPassword !== password) next.confirm = L("Passwords don't match.", "Паролі не збігаються.", "Пароли не совпадают.", "Les mots de passe ne correspondent pas.", "Passwörter stimmen nicht überein.");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    if (submitting) return;
    setFormError("");
    if (!validate()) return;
    setSubmitting(true);
    try {
      const session = isSignUp
        ? await window.signUp({ name, email, password })
        : await window.logIn({ email, password });
      window.saveProfile && window.saveProfile({ fullName: session.name, email: session.email });
      onSuccess();
    } catch (err) {
      setFormError(err.message || L("Something went wrong — please try again.", "Щось пішло не так — спробуйте ще раз.", "Что-то пошло не так — попробуйте ещё раз.", "Une erreur s'est produite — veuillez réessayer.", "Etwas ist schiefgelaufen — bitte versuche es erneut."));
      setShake(true); setTimeout(() => setShake(false), 420);
      setSubmitting(false);
    }
  }

  const inputStyle = (hasError) => ({
    width: "100%", boxSizing: "border-box", padding: "12px 16px", fontSize: "var(--text-base)",
    fontFamily: "var(--font-sans)", color: "var(--text-strong)", background: "var(--surface-card)",
    border: hasError ? "1px solid var(--red-400)" : "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", outline: "none",
  });
  const label = { display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-body)", marginBottom: "var(--space-1)", fontFamily: "var(--font-sans)" };
  const fieldErr = { margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--red-600)" };

  return (
    <div style={{ minHeight: "100vh", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)", padding: "var(--space-5)" }}>
      <style>{`@keyframes authShake{10%,90%{transform:translateX(-1px)}20%,80%{transform:translateX(2px)}30%,50%,70%{transform:translateX(-4px)}40%,60%{transform:translateX(4px)}}@keyframes authRise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes authSpin{to{transform:rotate(360deg)}}`}</style>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 420, background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-lg)", padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)", animation: "authRise var(--dur-normal) var(--ease-out)" }}>

        <div>
          <button type="button" onClick={onBack} style={{ border: "none", background: "transparent", color: "var(--text-faint)", fontSize: "var(--text-sm)", cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0, marginBottom: "var(--space-3)" }}>← {L("Back", "Назад", "Назад", "Retour", "Zurück")}</button>
          <h1 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: "var(--weight-bold)", fontFamily: "var(--font-display)", letterSpacing: "var(--tracking-tight)", color: "var(--text-strong)" }}>{isSignUp ? L("Create your account", "Створіть акаунт", "Создайте аккаунт", "Créez votre compte", "Erstelle dein Konto") : L("Welcome back", "З поверненням", "С возвращением", "Content de vous revoir", "Willkommen zurück")}</h1>
          <p style={{ margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{isSignUp ? L("A few details and your study plan is ready.", "Кілька деталей — і ваш план готовий.", "Пара деталей — и ваш план готов.", "Quelques détails et votre plan est prêt.", "Ein paar Angaben und dein Plan ist fertig.") : L("Log in to pick up where you left off.", "Увійдіть, щоб продовжити з того місця.", "Войдите, чтобы продолжить с того места.", "Connectez-vous pour reprendre où vous en étiez.", "Melde dich an, um dort weiterzumachen, wo du aufgehört hast.")}</p>
        </div>

        {/* Mode switcher */}
        <div style={{ display: "flex", borderRadius: "var(--radius-xl)", background: "var(--surface-muted)", padding: 4, gap: 4 }}>
          {["signup", "login"].map((m) => (
            <button key={m} type="button" onClick={() => onSwitchMode(m)}
              style={{ flex: 1, padding: "8px 0", borderRadius: "var(--radius-lg)", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", transition: "background var(--dur-fast) ease, color var(--dur-fast) ease",
                background: mode === m ? "var(--surface-card)" : "transparent", color: mode === m ? "var(--text-strong)" : "var(--text-muted)", boxShadow: mode === m ? "var(--shadow-sm)" : "none" }}>
              {m === "signup" ? L("Sign Up", "Реєстрація", "Регистрация", "Inscription", "Registrieren") : L("Log In", "Увійти", "Войти", "Connexion", "Anmelden")}
            </button>
          ))}
        </div>

        {formError && (
          <div style={{ borderRadius: "var(--radius-lg)", background: "var(--rose-50)", border: "1px solid var(--red-200)", padding: "10px 14px", fontSize: "var(--text-sm)", color: "var(--red-700)", animation: shake ? "authShake 0.4s ease" : "none" }}>
            ⚠️ {formError}
          </div>
        )}

        {isSignUp && (
          <div>
            <label style={label}>{L("Full name", "Повне ім'я", "Полное имя", "Nom complet", "Vollständiger Name")}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={L("Your name", "Ваше ім'я", "Ваше имя", "Votre nom", "Dein Name")} autoComplete="name" style={inputStyle(errors.name)} />
            {errors.name && <p style={fieldErr}>{errors.name}</p>}
          </div>
        )}

        <div>
          <label style={label}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" style={inputStyle(errors.email)} />
          {errors.email && <p style={fieldErr}>{errors.email}</p>}
        </div>

        <div>
          <label style={label}>{L("Password", "Пароль", "Пароль", "Mot de passe", "Passwort")}</label>
          <PasswordInput value={password} onChange={setPassword} placeholder={isSignUp ? L(`At least ${MIN_PASSWORD_LEN} characters`, `Щонайменше ${MIN_PASSWORD_LEN} символів`, `Не менее ${MIN_PASSWORD_LEN} символов`, `Au moins ${MIN_PASSWORD_LEN} caractères`, `Mindestens ${MIN_PASSWORD_LEN} Zeichen`) : "••••••••"} autoComplete={isSignUp ? "new-password" : "current-password"} hasError={!!errors.password} t={t} />
          {errors.password && <p style={fieldErr}>{errors.password}</p>}
        </div>

        {isSignUp && (
          <div>
            <label style={label}>{L("Confirm password", "Підтвердіть пароль", "Подтвердите пароль", "Confirmez le mot de passe", "Passwort bestätigen")}</label>
            <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder={L("Type it again", "Введіть ще раз", "Введите ещё раз", "Retapez-le", "Gib es erneut ein")} autoComplete="new-password" hasError={!!errors.confirm} t={t} />
            {errors.confirm && <p style={fieldErr}>{errors.confirm}</p>}
          </div>
        )}

        {/* ── OAuth ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {[
            { provider: "google", label: L("Continue with Google", "Продовжити з Google", "Продолжить с Google", "Continuer avec Google", "Weiter mit Google"), logo: (
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.2 30.2 0 24 0 14.8 0 6.9 5.4 3 13.3l7.9 6.1C12.8 13.2 18 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.5c-.5 2.8-2.1 5.2-4.5 6.8l7 5.4c4.1-3.8 6.6-9.4 6.6-16.2z"/><path fill="#FBBC05" d="M10.9 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6L2.4 13.3A23.9 23.9 0 0 0 0 24c0 3.8.9 7.4 2.5 10.6l8.4-6z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7-5.4c-2 1.4-4.6 2.2-8.2 2.2-6 0-11.1-3.7-13-8.9l-8.4 6C6.9 42.6 14.8 48 24 48z"/></svg>
            )},
            { provider: "github", label: L("Continue with GitHub", "Продовжити з GitHub", "Продолжить с GitHub", "Continuer avec GitHub", "Weiter mit GitHub"), logo: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.1.82-.26.82-.58v-2.04c-3.34.72-4.04-1.6-4.04-1.6-.54-1.38-1.33-1.75-1.33-1.75-1.08-.74.08-.73.08-.73 1.2.08 1.83 1.23 1.83 1.23 1.07 1.83 2.8 1.3 3.48 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.04.13 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.3c0 .32.22.69.82.57C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
            )},
            { provider: "apple", label: L("Continue with Apple", "Продовжити з Apple", "Продолжить с Apple", "Continuer avec Apple", "Weiter mit Apple"), logo: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.15 2c.97 0 2.18.65 2.89 1.48-.64.78-1.71 1.38-2.76 1.3-.1-.97.54-2.03.87-2.78zm4.36 4.6c-1.3-.08-2.42.74-3.04.74-.64 0-1.6-.7-2.65-.68-1.36.02-2.63.79-3.32 2-.71 1.24-.54 3.57.77 5.66.64 1 1.5 2.12 2.6 2.1.98-.02 1.36-.64 2.56-.64 1.19 0 1.53.64 2.56.62 1.13-.02 1.87-1.08 2.5-2.08.53-.82.74-1.22.97-2.08-2.5-.97-2.91-4.52-.95-5.64z"/></svg>
            )},
          ].map(({ provider, label, logo }) => (
            <button key={provider} type="button"
              onClick={async () => { try { await window.signInWithOAuth(provider); } catch (e) { setFormError(e.message); } }}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "11px 16px", borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-strong)", fontWeight: "var(--weight-medium)", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", cursor: "pointer" }}>
              {logo}{label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{L("or continue with email", "або продовжте через email", "или продолжите через email", "ou continuez avec l'email", "oder weiter mit E-Mail")}</span>
          <div style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
        </div>

        <button type="submit" disabled={submitting}
          style={{ width: "100%", padding: "14px", borderRadius: "var(--radius-full)", border: "none", background: submitting ? "var(--slate-300)" : "var(--ink-900)", color: "#fff", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-base)", cursor: submitting ? "default" : "pointer", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "var(--shadow-md)" }}>
          {submitting && <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.5)", borderTopColor: "#fff", animation: "authSpin 0.7s linear infinite" }} />}
          {submitting
            ? (isSignUp ? L("Creating account…", "Створення акаунту…", "Создание аккаунта…", "Création du compte…", "Konto wird erstellt…") : L("Signing in…", "Вхід…", "Вход…", "Connexion…", "Anmeldung…"))
            : (isSignUp ? L("Create account", "Створити акаунт", "Создать аккаунт", "Créer un compte", "Konto erstellen") : L("Log in", "Увійти", "Войти", "Connexion", "Anmelden"))}
        </button>

        <p style={{ margin: 0, textAlign: "center", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          {isSignUp ? L("Already have an account? ", "Вже маєте акаунт? ", "Уже есть аккаунт? ", "Vous avez déjà un compte ? ", "Hast du bereits ein Konto? ") : L("Don't have an account? ", "Немає акаунту? ", "Нет аккаунта? ", "Vous n'avez pas de compte ? ", "Kein Konto? ")}
          <button type="button" onClick={() => onSwitchMode(isSignUp ? "login" : "signup")} style={{ border: "none", background: "transparent", color: "var(--indigo-600)", fontWeight: "var(--weight-semibold)", cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0 }}>
            {isSignUp ? L("Log in", "Увійти", "Войти", "Connexion", "Anmelden") : L("Sign up", "Зареєструватися", "Зарегистрироваться", "S'inscrire", "Registrieren")}
          </button>
        </p>

        <button type="button" onClick={onDemo} style={{ border: "none", background: "transparent", color: "var(--text-faint)", fontSize: "var(--text-xs)", cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0, textAlign: "center" }}>
          {L("Just exploring? Try the demo →", "Просто дивитесь? Спробуйте демо →", "Просто смотрите? Попробуйте демо →", "Juste curieux ? Essayez la démo →", "Nur am Schauen? Demo ausprobieren →")}
        </button>
      </form>
    </div>
  );
}

function Landing({ onContinue, t, lang, onLangChange }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
  const [view, setView] = React.useState("marketing"); // "marketing" | "signup" | "login"
  const langs = Object.values(window.LANGS || {});
  const features = [
    { icon: "🎯", title: L("Confidence-Based Pacing", "Темп на основі впевненості", "Темп на основе уверенности", "Rythme basé sur la confiance", "Tempo basierend auf Selbstvertrauen"),
      body: L("Rate how well you knew each topic after a session — your plan's pace and readiness scores adjust accordingly.",
        "Оцініть, наскільки добре ви знали кожну тему після сесії — темп плану та показники готовності підлаштуються.",
        "Оцените, насколько хорошо вы знали каждую тему после сессии — темп плана и показатели готовности подстроятся.",
        "Évaluez votre maîtrise de chaque sujet après une séance — le rythme de votre plan et vos scores de préparation s'ajustent en conséquence.",
        "Bewerte nach jeder Sitzung, wie gut du jedes Thema kanntest — das Tempo deines Plans und die Bereitschaftswerte passen sich entsprechend an.") },
    { icon: "📅", title: L("Smart Scheduling", "Розумне планування", "Умное планирование", "Planification intelligente", "Intelligente Planung"),
      body: L("Auto-generated daily plans that fit your available hours and preferences.",
        "Автоматично згенеровані щоденні плани, що враховують ваш вільний час та вподобання.",
        "Автоматически сгенерированные ежедневные планы, учитывающие ваше свободное время и предпочтения.",
        "Des plans quotidiens générés automatiquement qui s'adaptent à vos disponibilités et préférences.",
        "Automatisch generierte Tagespläne, die zu deiner verfügbaren Zeit und deinen Vorlieben passen.") },
    { icon: "📊", title: L("Track Progress", "Відстеження прогресу", "Отслеживание прогресса", "Suivi de progression", "Fortschritt verfolgen"),
      body: L("Visualise your real study streak, confidence per subject, and unlock achievements as you study.",
        "Візуалізуйте свою реальну серію навчання, впевненість по предметах і відкривайте досягнення під час навчання.",
        "Визуализируйте свою реальную серию обучения, уверенность по предметам и открывайте достижения во время учёбы.",
        "Visualisez votre véritable série d'étude, votre confiance par matière, et débloquez des réussites en étudiant.",
        "Visualisiere deine echte Lernsträhne, dein Selbstvertrauen pro Fach und schalte Erfolge frei, während du lernst.") },
  ];

  function startDemo() {
    if (window.startDemo) window.startDemo();
    onContinue();
  }

  const langPicker = onLangChange && (
    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: "var(--space-6)" }}>
      {langs.map((l) => (
        <button key={l.code} onClick={() => onLangChange(l.code)} title={l.label} aria-label={l.label}
          style={{ border: lang === l.code ? "2px solid var(--indigo-500)" : "2px solid transparent", borderRadius: "var(--radius-full)", background: "transparent", cursor: "pointer", fontSize: "var(--text-lg)", minWidth: 40, minHeight: 40, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1 }}>
          {l.flag}
        </button>
      ))}
    </div>
  );

  if (view !== "marketing") {
    return (
      <AuthForm
        mode={view}
        onSwitchMode={setView}
        onBack={() => setView("marketing")}
        onSuccess={onContinue}
        onDemo={startDemo}
        t={t}
        lang={lang}
        onLangChange={onLangChange}
      />
    );
  }

  const pillBtn = (filled) => ({
    border: filled ? "none" : "1px solid var(--border-strong)",
    background: filled ? "var(--ink-900)" : "var(--surface-card)",
    color: filled ? "var(--text-invert)" : "var(--text-strong)",
    borderRadius: "var(--radius-full)", cursor: "pointer",
    padding: "14px 30px", fontSize: "var(--text-base)",
    fontWeight: "var(--weight-semibold)", fontFamily: "var(--font-sans)",
    boxShadow: filled ? "var(--shadow-md)" : "var(--shadow-sm)",
    transition: "transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
  });

  return (
    <div style={{ maxWidth: "58rem", margin: "0 auto", padding: "var(--space-10) var(--space-6) var(--space-12)" }}>
      {/* Mini-nav: brand mark left, language picker right */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-16)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: "var(--font-display)", fontWeight: "var(--weight-bold)", fontSize: "var(--text-lg)", letterSpacing: "var(--tracking-tight)", color: "var(--text-strong)" }}>
          {window.NavLogoMark ? <window.NavLogoMark /> : null}
          <span>AI Exam Coach</span>
        </div>
        {langPicker}
      </div>

      <div style={{ textAlign: "center" }}>
        {/* Eyebrow chip — FintechX "Core features" style */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 14px", borderRadius: "var(--radius-full)", background: "var(--surface-card)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-sm)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", letterSpacing: "var(--tracking-wide)", textTransform: "uppercase", color: "var(--indigo-600)", marginBottom: "var(--space-5)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--emerald-500)" }} />
          AI Exam Coach
        </div>
        <h1 style={{ margin: 0, fontSize: "clamp(2.4rem, 5.5vw, 3.6rem)", fontWeight: "var(--weight-bold)", letterSpacing: "var(--tracking-tight)", lineHeight: "var(--leading-tight)", color: "var(--text-strong)", fontFamily: "var(--font-display)" }}>{L("Study smarter, not longer", "Навчайтесь розумніше, а не довше", "Учитесь умнее, а не дольше", "Étudiez plus intelligemment, pas plus longtemps", "Klüger lernen, nicht länger")}</h1>
        <p style={{ margin: "var(--space-4) auto 0", maxWidth: "34rem", fontSize: "var(--text-lg)", lineHeight: "var(--leading-normal)", color: "var(--text-muted)" }}>
          {L("Your AI coach builds a day-by-day study plan that adapts as you go. Add a course, set your exam date, and start revising.",
            "Ваш AI-коуч створює щоденний план навчання, який підлаштовується на ходу. Додайте курс, встановіть дату іспиту й починайте повторення.",
            "Ваш AI-коуч создаёт ежедневный план обучения, который подстраивается на ходу. Добавьте курс, установите дату экзамена и начните повторение.",
            "Votre coach IA élabore un plan d'étude quotidien qui s'adapte au fil du temps. Ajoutez un cours, fixez votre date d'examen et commencez à réviser.",
            "Dein KI-Coach erstellt einen Tag-für-Tag-Lernplan, der sich unterwegs anpasst. Füge einen Kurs hinzu, lege dein Prüfungsdatum fest und beginne mit dem Lernen.")}
        </p>
        <div style={{ marginTop: "var(--space-8)", display: "flex", justifyContent: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <button style={pillBtn(true)} onClick={() => setView("signup")}>{L("Sign Up", "Реєстрація", "Регистрация", "Inscription", "Registrieren")} →</button>
          <button style={pillBtn(false)} onClick={() => setView("login")}>{L("Log In", "Увійти", "Войти", "Connexion", "Anmelden")}</button>
        </div>
        <button onClick={startDemo} style={{ marginTop: "var(--space-5)", border: "none", background: "transparent", color: "var(--indigo-600)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0 }}>
          {L("Try demo — no account needed →", "Спробувати демо — без акаунту →", "Попробовать демо — без аккаунта →", "Essayer la démo — sans compte →", "Demo ausprobieren — kein Konto nötig →")}
        </button>
      </div>

      <div style={{ marginTop: "var(--space-16)", display: "grid", gap: "var(--space-5)", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {features.map((f, i) => {
          // Middle card gets the FintechX "dark insight card" treatment.
          const dark = i === 1;
          return (
            <div key={f.title} style={{
              borderRadius: "var(--radius-2xl)",
              border: dark ? "1px solid var(--ink-700)" : "1px solid var(--border-default)",
              background: dark ? "var(--surface-ink)" : "var(--surface-card)",
              boxShadow: dark ? "var(--shadow-lg)" : "var(--shadow-sm)",
              padding: "var(--space-6)", textAlign: "left",
            }}>
              <div aria-hidden="true" style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 44, height: 44, borderRadius: 14, fontSize: "var(--text-xl)",
                background: dark ? "var(--ink-700)" : "var(--indigo-50)", marginBottom: "var(--space-4)",
              }}>{f.icon}</div>
              <h3 style={{ margin: 0, fontWeight: "var(--weight-semibold)", fontSize: "var(--text-lg)", fontFamily: "var(--font-display)", letterSpacing: "var(--tracking-tight)", color: dark ? "var(--text-invert)" : "var(--text-strong)" }}>{f.title}</h3>
              <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-sm)", lineHeight: "var(--leading-normal)", color: dark ? "var(--text-on-ink-muted)" : "var(--text-muted)" }}>{f.body}</p>
            </div>
          );
        })}
      </div>
      <p style={{ marginTop: "var(--space-12)", textAlign: "center", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{L("Free · Open Source · No ads", "Безкоштовно · Відкритий код · Без реклами", "Бесплатно · Открытый код · Без рекламы", "Gratuit · Open Source · Sans publicité", "Kostenlos · Open Source · Keine Werbung")}</p>
    </div>
  );
}
window.Landing = Landing;
