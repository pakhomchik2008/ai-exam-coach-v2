// AI Exam Coach — Landing + authentication.
// Three explicit paths in: Sign Up, Log In, Try Demo. Auth is local-only
// (auth-store.jsx) — there's no backend, but it's wired up for real:
// passwords are hashed (never stored in plaintext), wrong-password and
// no-such-account are distinguished, and Try Demo skips account creation
// entirely rather than faking one.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LEN = 8;

function PasswordInput({ value, onChange, placeholder, autoComplete, hasError }) {
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
      <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}
        style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", fontSize: 16, color: "var(--text-faint)", padding: 6, lineHeight: 1 }}>
        {show ? "🙈" : "👁️"}
      </button>
    </div>
  );
}

function AuthForm({ mode, onSwitchMode, onBack, onSuccess, onDemo }) {
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
    if (isSignUp && !name.trim()) next.name = "Enter your name.";
    if (!email.trim()) next.email = "Enter your email.";
    else if (!EMAIL_RE.test(email.trim())) next.email = "That doesn't look like a valid email.";
    if (!password) next.password = "Enter your password.";
    else if (isSignUp && password.length < MIN_PASSWORD_LEN) next.password = `Use at least ${MIN_PASSWORD_LEN} characters.`;
    if (isSignUp && confirmPassword !== password) next.confirm = "Passwords don't match.";
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
      setFormError(err.message || "Something went wrong — please try again.");
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
    <div style={{ minHeight: "100vh", background: "linear-gradient(to bottom, var(--indigo-50), #FAF5FF)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)", padding: "var(--space-5)" }}>
      <style>{`@keyframes authShake{10%,90%{transform:translateX(-1px)}20%,80%{transform:translateX(2px)}30%,50%,70%{transform:translateX(-4px)}40%,60%{transform:translateX(4px)}}@keyframes authRise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes authSpin{to{transform:rotate(360deg)}}`}</style>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 420, background: "var(--surface-page)", borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-lg)", padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)", animation: "authRise var(--dur-normal) var(--ease-out)" }}>

        <div>
          <button type="button" onClick={onBack} style={{ border: "none", background: "transparent", color: "var(--text-faint)", fontSize: "var(--text-sm)", cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0, marginBottom: "var(--space-3)" }}>← Back</button>
          <h1 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>{isSignUp ? "Create your account" : "Welcome back"}</h1>
          <p style={{ margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{isSignUp ? "A few details and your study plan is ready." : "Log in to pick up where you left off."}</p>
        </div>

        {/* Mode switcher */}
        <div style={{ display: "flex", borderRadius: "var(--radius-xl)", background: "var(--surface-muted)", padding: 4, gap: 4 }}>
          {["signup", "login"].map((m) => (
            <button key={m} type="button" onClick={() => onSwitchMode(m)}
              style={{ flex: 1, padding: "8px 0", borderRadius: "var(--radius-lg)", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", transition: "background var(--dur-fast) ease, color var(--dur-fast) ease",
                background: mode === m ? "var(--surface-card)" : "transparent", color: mode === m ? "var(--indigo-700)" : "var(--text-muted)", boxShadow: mode === m ? "var(--shadow-sm)" : "none" }}>
              {m === "signup" ? "Sign Up" : "Log In"}
            </button>
          ))}
        </div>

        {formError && (
          <div style={{ borderRadius: "var(--radius-lg)", background: "#FFF1F2", border: "1px solid var(--red-200)", padding: "10px 14px", fontSize: "var(--text-sm)", color: "var(--red-700)", animation: shake ? "authShake 0.4s ease" : "none" }}>
            ⚠️ {formError}
          </div>
        )}

        {isSignUp && (
          <div>
            <label style={label}>Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" style={inputStyle(errors.name)} />
            {errors.name && <p style={fieldErr}>{errors.name}</p>}
          </div>
        )}

        <div>
          <label style={label}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" style={inputStyle(errors.email)} />
          {errors.email && <p style={fieldErr}>{errors.email}</p>}
        </div>

        <div>
          <label style={label}>Password</label>
          <PasswordInput value={password} onChange={setPassword} placeholder={isSignUp ? `At least ${MIN_PASSWORD_LEN} characters` : "••••••••"} autoComplete={isSignUp ? "new-password" : "current-password"} hasError={!!errors.password} />
          {errors.password && <p style={fieldErr}>{errors.password}</p>}
        </div>

        {isSignUp && (
          <div>
            <label style={label}>Confirm password</label>
            <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="Type it again" autoComplete="new-password" hasError={!!errors.confirm} />
            {errors.confirm && <p style={fieldErr}>{errors.confirm}</p>}
          </div>
        )}

        {/* ── OAuth ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {[
            { provider: "google", label: "Continue with Google", logo: (
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.2 30.2 0 24 0 14.8 0 6.9 5.4 3 13.3l7.9 6.1C12.8 13.2 18 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.5c-.5 2.8-2.1 5.2-4.5 6.8l7 5.4c4.1-3.8 6.6-9.4 6.6-16.2z"/><path fill="#FBBC05" d="M10.9 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6L2.4 13.3A23.9 23.9 0 0 0 0 24c0 3.8.9 7.4 2.5 10.6l8.4-6z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7-5.4c-2 1.4-4.6 2.2-8.2 2.2-6 0-11.1-3.7-13-8.9l-8.4 6C6.9 42.6 14.8 48 24 48z"/></svg>
            )},
            { provider: "github", label: "Continue with GitHub", logo: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.1.82-.26.82-.58v-2.04c-3.34.72-4.04-1.6-4.04-1.6-.54-1.38-1.33-1.75-1.33-1.75-1.08-.74.08-.73.08-.73 1.2.08 1.83 1.23 1.83 1.23 1.07 1.83 2.8 1.3 3.48 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.04.13 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.3c0 .32.22.69.82.57C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
            )},
            { provider: "apple", label: "Continue with Apple", logo: (
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
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>or continue with email</span>
          <div style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
        </div>

        <button type="submit" disabled={submitting}
          style={{ width: "100%", padding: "14px", borderRadius: "var(--radius-xl)", border: "none", background: submitting ? "var(--slate-300)" : "var(--indigo-600)", color: "#fff", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-base)", cursor: submitting ? "default" : "pointer", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {submitting && <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.5)", borderTopColor: "#fff", animation: "authSpin 0.7s linear infinite" }} />}
          {submitting ? (isSignUp ? "Creating account…" : "Signing in…") : (isSignUp ? "Create account" : "Log in")}
        </button>

        <p style={{ margin: 0, textAlign: "center", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          {isSignUp ? "Already have an account? " : "Don't have an account? "}
          <button type="button" onClick={() => onSwitchMode(isSignUp ? "login" : "signup")} style={{ border: "none", background: "transparent", color: "var(--indigo-600)", fontWeight: "var(--weight-semibold)", cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0 }}>
            {isSignUp ? "Log in" : "Sign up"}
          </button>
        </p>

        <button type="button" onClick={onDemo} style={{ border: "none", background: "transparent", color: "var(--text-faint)", fontSize: "var(--text-xs)", cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0, textAlign: "center" }}>
          Just exploring? Try the demo →
        </button>
      </form>
    </div>
  );
}

function Landing({ onContinue }) {
  const { Button } = window.AIExamCoachDesignSystem_99e467;
  const [view, setView] = React.useState("marketing"); // "marketing" | "signup" | "login"
  const features = [
    { icon: "🎯", title: "Confidence-Based Pacing", body: "Rate how well you knew each topic after a session — your plan's pace and readiness scores adjust accordingly." },
    { icon: "📅", title: "Smart Scheduling", body: "Auto-generated daily plans that fit your available hours and preferences." },
    { icon: "📊", title: "Track Progress", body: "Visualise your real study streak, confidence per subject, and unlock achievements as you study." },
  ];

  function startDemo() {
    if (window.startDemo) window.startDemo();
    onContinue();
  }

  if (view !== "marketing") {
    return (
      <AuthForm
        mode={view}
        onSwitchMode={setView}
        onBack={() => setView("marketing")}
        onSuccess={onContinue}
        onDemo={startDemo}
      />
    );
  }

  return (
    <div style={{ maxWidth: "42rem", margin: "0 auto", padding: "var(--space-12) var(--space-6)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "var(--text-5xl)", marginBottom: "var(--space-4)" }} aria-hidden="true">📚</div>
        <h1 style={{ margin: 0, fontSize: "var(--text-4xl)", fontWeight: "var(--weight-bold)", letterSpacing: "var(--tracking-tight)", color: "var(--text-strong)" }}>Study smarter, not longer</h1>
        <p style={{ margin: "var(--space-3) auto 0", maxWidth: "32rem", fontSize: "var(--text-lg)", color: "var(--text-muted)" }}>
          Your AI coach builds a day-by-day study plan that adapts as you go. Add a course, set your exam date, and start revising.
        </p>
        <div style={{ marginTop: "var(--space-8)", display: "flex", justifyContent: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <Button variant="primary" size="lg" onClick={() => setView("signup")}>Sign Up</Button>
          <Button variant="secondary" size="lg" onClick={() => setView("login")}>Log In</Button>
        </div>
        <button onClick={startDemo} style={{ marginTop: "var(--space-4)", border: "none", background: "transparent", color: "var(--indigo-600)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0 }}>
          Try demo — no account needed →
        </button>
      </div>

      <div style={{ marginTop: "var(--space-16)", display: "grid", gap: "var(--space-6)", gridTemplateColumns: "repeat(3, 1fr)" }}>
        {features.map((f) => (
          <div key={f.title} style={{ borderRadius: "var(--radius-2xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)", padding: "var(--space-5)", textAlign: "center" }}>
            <div style={{ fontSize: "var(--text-3xl)", marginBottom: "var(--space-2)" }} aria-hidden="true">{f.icon}</div>
            <h3 style={{ margin: 0, fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>{f.title}</h3>
            <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{f.body}</p>
          </div>
        ))}
      </div>
      <p style={{ marginTop: "var(--space-12)", textAlign: "center", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>Free · Open Source · No ads</p>
    </div>
  );
}
window.Landing = Landing;
