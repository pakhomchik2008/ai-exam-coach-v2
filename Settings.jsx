// AI Exam Coach — Settings screen (i18n-aware)
//
// `Field`/`Section` are deliberately at module scope, not nested inside
// Settings(). Defining a component inside another component's render body
// gives it a brand-new function identity on every render of the parent — and
// since typing in the Full name input calls setFullName, which re-renders
// Settings, that recreated Field on every keystroke and React unmounted +
// remounted the real <input> DOM node each time, dropping focus after every
// single character. Module scope keeps Field's identity stable across
// re-renders, which is the actual fix (not a debounce or event-handler patch).
function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-body)", marginBottom: "var(--space-1)", fontFamily: "var(--font-sans)" }}>{label}</label>
      {children}
    </div>
  );
}
function Section({ title, children }) {
  return (
    <div>
      <p style={{ margin: "0 0 12px", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)", fontFamily: "var(--font-sans)" }}>{title}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>{children}</div>
    </div>
  );
}

// Study-availability section text isn't in i18n.jsx yet (adding full 5-language
// keys there for one settings section is a lot of churn) — same lightweight
// inline-L() pattern AIPlan.jsx already uses for its own new copy.
function L(lang, en, uk, ru, fr, de) { return { en, uk, ru, fr, de }[lang] || en; }

function Settings({ t, lang, onLangChange, onLogout }) {
  const { Button } = window.AIExamCoachDesignSystem_99e467;
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
  // Study-plan budget inputs — feed schedule-store.jsx's allocateBudget
  // (Phase 3). Editing any of these here goes through the same saveProfile()
  // path as the wizard, which already diffs BUDGET_FIELDS and calls
  // replanAllSchedules() when they actually change.
  const [weeklyHours, setWeeklyHours] = React.useState(profile.weeklyHours);
  const [daysPerWeek, setDaysPerWeek] = React.useState(profile.daysPerWeek);
  const [sessionLengthMin, setSessionLengthMin] = React.useState(profile.sessionLengthMin);
  const [blackoutSlots, setBlackoutSlots] = React.useState(profile.blackoutSlots);
  const [planIntensity, setPlanIntensity] = React.useState(profile.planIntensity || "balanced");
  const [saved, setSaved] = React.useState(false);
  const [confirmErase, setConfirmErase] = React.useState(false);
  const [confirmLogout, setConfirmLogout] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showReminderInfo, setShowReminderInfo] = React.useState(false);

  const ZONES = window.TIMEZONES || [];

  React.useEffect(() => {
    if (!confirmErase) return;
    const id = setTimeout(() => setConfirmErase(false), 3000);
    return () => clearTimeout(id);
  }, [confirmErase]);
  React.useEffect(() => {
    if (!confirmLogout) return;
    const id = setTimeout(() => setConfirmLogout(false), 3000);
    return () => clearTimeout(id);
  }, [confirmLogout]);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function save() {
    const trimmedEmail = email.trim();
    const emailValid = !trimmedEmail || EMAIL_RE.test(trimmedEmail);
    setEmailError(emailValid ? "" : t.settings_email_invalid);
    // An invalid email shouldn't block saving the rest of the form — only the
    // email field itself is withheld until it's fixed.
    window.saveProfile({
      fullName, timezone: tz.id, reminderEnabled, reminderHour,
      email: emailValid ? trimmedEmail : profile.email,
      weeklyHours, daysPerWeek, sessionLengthMin, blackoutSlots, planIntensity,
    });
    setSaved(true); setTimeout(() => setSaved(false), 2800);
  }
  function logOut() {
    if (window.clearSession) window.clearSession();
    if (onLogout) onLogout();
  }
  function eraseAllData() {
    try { localStorage.clear(); } catch {}
    if (onLogout) onLogout();
  }

  const inputStyle = { width: "100%", boxSizing: "border-box", padding: "12px 16px", fontSize: "var(--text-base)", fontFamily: "var(--font-sans)", color: "var(--text-strong)", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", outline: "none" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", fontFamily: "var(--font-sans)" }}>
      <h1 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>{t.settings_title}</h1>
      <div style={{ maxWidth: "var(--container-form)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)", padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>

        <Section title={t.settings_account}>
          <Field label={t.settings_fullname}>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={L(lang, "Your name","Ваше ім'я","Ваше имя","Votre nom","Dein Name")} autoComplete="name" style={inputStyle} />
          </Field>
          <Field label={t.settings_email}>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
              placeholder="you@example.com"
              autoComplete="email"
              style={{ ...inputStyle, border: emailError ? "1px solid var(--red-400)" : inputStyle.border }}
            />
            {emailError && <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--red-600)" }}>{emailError}</p>}
          </Field>
          <Field label={t.settings_password}>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                style={{ ...inputStyle, paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"}
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", fontSize: 16, color: "var(--text-faint)", padding: 6, lineHeight: 1 }}>
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{t.settings_password_note}</p>
          </Field>
        </Section>

        <Section title={t.settings_timezone}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            <span aria-hidden="true">🌍</span>
            <span>{lang === "uk" ? "Визначено автоматично" : lang === "ru" ? "Определено автоматически" : lang === "fr" ? "Détecté automatiquement" : lang === "de" ? "Automatisch erkannt" : "Auto-detected"} — <strong style={{ color: "var(--text-strong)" }}>{tz.label} · {tz.place}</strong></span>
          </div>
          <Field label={t.settings_timezone}>
            <select value={tz.id} onChange={(e) => setTz(ZONES.find((z) => z.id === e.target.value))} style={{ ...inputStyle, appearance: "none" }}>
              {ZONES.map((z) => <option key={z.id} value={z.id}>{z.label} — {z.place}</option>)}
            </select>
          </Field>
        </Section>

        <Section title={t.settings_reminders}>
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", cursor: "pointer" }}>
              <input type="checkbox" checked={reminderEnabled} onChange={(e) => setReminderEnabled(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "var(--indigo-600)", cursor: "pointer" }} />
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text-body)" }}>
                {t.settings_reminder_send}
              </span>
              <button type="button" onClick={(e) => { e.preventDefault(); setShowReminderInfo((v) => !v); }} aria-label={t.settings_reminder_info_label}
                style={{ width: 18, height: 18, borderRadius: "50%", border: "1px solid var(--border-default)", background: showReminderInfo ? "var(--indigo-50)" : "var(--surface-muted)", color: "var(--text-muted)", fontSize: 11, fontWeight: "var(--weight-bold)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0, fontFamily: "var(--font-sans)" }}>
                i
              </button>
            </label>
            {showReminderInfo && (
              <p style={{ margin: "6px 0 0 28px", fontSize: "var(--text-xs)", color: "var(--text-muted)", background: "var(--surface-muted)", borderRadius: "var(--radius-lg)", padding: "8px 10px", maxWidth: 420 }}>
                {t.settings_reminder_info}
              </p>
            )}
          </div>
          {reminderEnabled && (
            <div>
              <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-body)", marginBottom: "var(--space-1)" }}>
                {t.settings_reminder_time} — {String(reminderHour).padStart(2,"0")}:00
              </label>
              <input type="range" min={6} max={22} value={reminderHour} onChange={(e) => setReminderHour(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--indigo-600)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-xs)", color: "var(--text-faint)", marginTop: "2px" }}>
                <span>6:00</span><span>22:00</span>
              </div>
            </div>
          )}
        </Section>

        <Section title={L(lang, "Study intensity","Режим навчання","Режим учёбы","Intensité d'étude","Lernintensität")}>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            {(window.INTENSITY_PRESETS || []).map((preset) => {
              const sel = planIntensity === preset.id;
              // Live preview: how many sessions/week this tier actually yields
              // for the CURRENT exams — the difference is visible before saving.
              let perWeek = null;
              try {
                const plan = window.allocateBudget(window.getExams(), { ...window.getProfile(), weeklyHours, daysPerWeek, sessionLengthMin, blackoutSlots, planIntensity: preset.id });
                let total = 0, weeks = 1;
                for (const [, v] of plan) total += (v.sessions || []).length;
                const exams = window.getExams().filter((e) => new Date(e.examDate || e.date) > new Date());
                if (exams.length) {
                  const maxDays = Math.max(...exams.map((e) => Math.max(1, Math.ceil((new Date(e.examDate || e.date) - new Date()) / 86400000))));
                  weeks = Math.max(1, maxDays / 7);
                }
                perWeek = Math.round(total / weeks);
              } catch {}
              return (
                <button key={preset.id} type="button" onClick={() => setPlanIntensity(preset.id)}
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "var(--space-3) var(--space-2)", borderRadius: "var(--radius-xl)", cursor: "pointer", fontFamily: "var(--font-sans)",
                    border: sel ? "2px solid var(--indigo-500)" : "1.5px solid var(--border-default)",
                    background: sel ? "var(--indigo-50)" : "var(--surface-card)", transition: "all var(--dur-fast) ease" }}>
                  <span style={{ fontSize: 20 }}>{preset.emoji}</span>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-bold)", color: sel ? "var(--indigo-700)" : "var(--text-strong)" }}>{preset.label[lang] || preset.label.en}</span>
                  {perWeek !== null && (
                    <span style={{ fontSize: "var(--text-xs)", color: sel ? "var(--indigo-600)" : "var(--text-faint)", fontWeight: "var(--weight-semibold)" }}>
                      ~{perWeek} {L(lang, "sessions/wk","сесій/тижд","сессий/нед","séances/sem","Einheiten/Wo")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
            {L(lang,
              "Saving with a new mode rebuilds your whole calendar at that pace.",
              "Збереження з новим режимом перебудовує весь календар у цьому темпі.",
              "Сохранение с новым режимом перестраивает весь календарь в этом темпе.",
              "Enregistrer avec un nouveau mode reconstruit tout votre calendrier à ce rythme.",
              "Beim Speichern mit neuem Modus wird der gesamte Kalender in diesem Tempo neu aufgebaut."
            )}
          </p>
        </Section>

        <Section title={L(lang, "Study availability","Доступність для навчання","Доступность для учёбы","Disponibilité d'étude","Lernverfügbarkeit")}>
          <div>
            <div style={{ textAlign: "center", marginBottom: "var(--space-3)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-4xl)", fontWeight: "var(--weight-bold)", color: "var(--indigo-600)", lineHeight: 1 }}>{weeklyHours}</span>
              <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                {L(lang, "hours per week","годин на тиждень","часов в неделю","heures par semaine","Stunden pro Woche")}
              </p>
            </div>
            <input type="range" min={2} max={40} step={1} value={weeklyHours} onChange={(e) => setWeeklyHours(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--indigo-600)", height: 28 }} />
          </div>
          <window.AvailabilityGrid
            daysPerWeek={daysPerWeek} setDaysPerWeek={setDaysPerWeek}
            sessionLengthMin={sessionLengthMin} setSessionLengthMin={setSessionLengthMin}
            blackoutSlots={blackoutSlots} setBlackoutSlots={setBlackoutSlots}
            copy={{
              s2_days_per_week: L(lang, "Days per week", "Днів на тиждень", "Дней в неделю", "Jours par semaine", "Tage pro Woche"),
              s2_session_length: L(lang, "Session length", "Тривалість сесії", "Длительность сессии", "Durée de la séance", "Sitzungsdauer"),
              s2_when_unavailable: L(lang, "When are you unavailable?", "Коли ви недоступні?", "Когда вы недоступны?", "Quand n'êtes-vous pas disponible ?", "Wann bist du nicht verfügbar?"),
              all_day: L(lang, "All", "Увесь день", "Весь день", "Tout", "Ganzer Tag"),
              day_abbr: (window.ONB && window.ONB[lang] && window.ONB[lang].day_abbr) || { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" },
              period_abbr: (window.ONB && window.ONB[lang] && window.ONB[lang].period_abbr) || { morning: "AM", afternoon: "PM", evening: "Eve" },
            }} />
          <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
            {L(lang,
              "Changes here recalculate your entire study schedule to fit the new budget.",
              "Зміни тут перераховують весь ваш розклад навчання під новий бюджет.",
              "Изменения здесь пересчитывают весь ваш учебный график под новый бюджет.",
              "Ces changements recalculent tout votre emploi du temps d'étude.",
              "Änderungen hier berechnen Ihren gesamten Lernplan neu."
            )}
          </p>
        </Section>

        <Section title={t.settings_language}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {Object.values(window.LANGS).map((l) => (
              <button key={l.code} onClick={() => onLangChange(l.code)}
                style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", fontSize: "var(--text-sm)", cursor: "pointer", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: "6px",
                  border: lang === l.code ? "1px solid var(--indigo-500)" : "1px solid var(--border-default)",
                  background: lang === l.code ? "var(--indigo-50)" : "var(--surface-card)",
                  color: lang === l.code ? "var(--indigo-700)" : "var(--text-muted)",
                  fontWeight: lang === l.code ? "var(--weight-medium)" : "var(--weight-normal)" }}>
                <span>{l.flag}</span><span>{l.label}</span>
              </button>
            ))}
          </div>
        </Section>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <Button variant="accent" size="md" onClick={save}>{t.settings_save}</Button>
        </div>

        <Section title={t.settings_actions}>
          <button
            onClick={() => confirmLogout ? logOut() : setConfirmLogout(true)}
            style={{ alignSelf: "flex-start", border: confirmLogout ? "1px solid var(--red-200)" : "1px solid var(--border-default)", background: confirmLogout ? "var(--red-50)" : "var(--surface-card)", color: confirmLogout ? "var(--red-600)" : "var(--text-body)", borderRadius: "var(--radius-xl)", padding: "10px 20px", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            {confirmLogout ? L(lang, "Click again to confirm","Натисніть ще раз","Нажмите ещё раз","Cliquez à nouveau","Erneut klicken") : t.nav_logout}
          </button>
          <div>
            <button
              onClick={() => confirmErase ? eraseAllData() : setConfirmErase(true)}
              style={{ alignSelf: "flex-start", border: "1px solid var(--red-200)", background: confirmErase ? "var(--red-100)" : "var(--rose-50)", color: "var(--red-600)", borderRadius: "var(--radius-xl)", padding: "10px 20px", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", cursor: "pointer", fontFamily: "var(--font-sans)" }}
            >
              {confirmErase ? t.settings_erase_confirm : t.settings_erase}
            </button>
            <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{t.settings_erase_note}</p>
          </div>
        </Section>
      </div>

      {/* Toast notification */}
      <div style={{
        position: "fixed", bottom: 28, right: 28, zIndex: 9999,
        background: "var(--slate-900)", color: "#fff",
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
