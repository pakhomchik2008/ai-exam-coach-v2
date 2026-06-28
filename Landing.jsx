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
