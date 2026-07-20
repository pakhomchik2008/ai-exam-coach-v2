// AI Exam Coach — Onboarding bits: coach bubble, grade picker, upload, plan review
// All exported to window for Onboarding.jsx to compose. Inline styles, mobile-first.

// ── Coach speech bubble — sells the "talking to an advisor" feel ───────────────
function CoachBubble({ children, advisor }) {
  return (
    <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
      <div aria-hidden="true" style={{ flexShrink: 0, width: 40, height: 40, borderRadius: "var(--radius-full)", background: "var(--indigo-100)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🤖</div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: "0 0 4px", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--indigo-600)" }}>{advisor}</p>
        <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-2xl)", borderTopLeftRadius: "var(--radius-xs)", padding: "var(--space-3) var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-body)", lineHeight: 1.5, boxShadow: "var(--shadow-sm)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Dynamic grade picker — adapts UI to the exam's grading system ───────────────
function GradePicker({ grade, value, onChange, accent }) {
  if (grade.kind === "score") {
    const pct = ((value - grade.min) / (grade.max - grade.min)) * 100;
    return (
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-3xl)", fontWeight: "var(--weight-bold)", color: accent, lineHeight: 1 }}>{value}{grade.suffix || ""}</span>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{grade.min}–{grade.max}{grade.suffix || ""}</span>
        </div>
        <input type="range" min={grade.min} max={grade.max} step={grade.step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: "100%", accentColor: accent, height: 28 }} />
        <div style={{ height: 6, borderRadius: "var(--radius-full)", background: "var(--slate-100)", overflow: "hidden", marginTop: 2 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: accent, borderRadius: "var(--radius-full)" }} />
        </div>
      </div>
    );
  }
  // scale — segmented pill buttons
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
      {grade.options.map((g) => {
        const sel = String(value) === String(g);
        return (
          <button key={g} type="button" onClick={() => onChange(g)}
            style={{ minWidth: 48, minHeight: 44, padding: "0 var(--space-3)", borderRadius: "var(--radius-lg)", fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", cursor: "pointer", fontFamily: "var(--font-sans)",
              border: sel ? `2px solid ${accent}` : "1.5px solid var(--border-default)",
              background: sel ? "var(--indigo-50)" : "var(--surface-card)",
              color: sel ? "var(--indigo-700)" : "var(--text-muted)",
              transition: "all var(--dur-fast) ease" }}>
            {g}
          </button>
        );
      })}
    </div>
  );
}

// ── Multi-select chip grid (materials / preferences) ───────────────────────────
function ChipGrid({ items, selected, onToggle, lang }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
      {items.map((it) => {
        const sel = selected.has(it.id);
        return (
          <button key={it.id} type="button" onClick={() => onToggle(it.id)}
            style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", minHeight: 48, padding: "0 var(--space-3)", borderRadius: "var(--radius-xl)", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)",
              border: sel ? "2px solid var(--indigo-500)" : "1.5px solid var(--border-default)",
              background: sel ? "var(--indigo-50)" : "var(--surface-card)",
              color: sel ? "var(--indigo-700)" : "var(--text-body)" }}>
            <span aria-hidden="true" style={{ fontSize: 18 }}>{it.emoji}</span>
            <span style={{ flex: 1 }}>{it[lang] || it.en}</span>
            <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: "var(--radius-full)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff",
              border: sel ? "none" : "1.5px solid var(--border-default)", background: sel ? "var(--indigo-500)" : "transparent" }}>{sel ? "✓" : ""}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── File upload zone — real <input type=file>, shows picked files ──────────────
function UploadZone({ files, onAdd, onRemove, copy }) {
  const inputRef = React.useRef(null);
  const [drag, setDrag] = React.useState(false);
  // Pass the real File objects through (not just name/size) so the parent can
  // actually read their content for AI analysis instead of faking it.
  const pick = (list) => { if (list && list.length) onAdd(Array.from(list)); };
  return (
    <div>
      <button type="button"
        onClick={() => inputRef.current && inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files); }}
        style={{ width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-6)", borderRadius: "var(--radius-2xl)", cursor: "pointer", fontFamily: "var(--font-sans)",
          border: `2px dashed ${drag ? "var(--indigo-500)" : "var(--border-default)"}`,
          background: drag ? "var(--indigo-50)" : "var(--surface-muted)" }}>
        <span aria-hidden="true" style={{ fontSize: 28, lineHeight: 1 }}>📤</span>
        <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)", lineHeight: 1.3, textAlign: "center" }}>{copy.s4_upload}</span>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", lineHeight: 1.3, textAlign: "center" }}>{copy.s4_upload_sub}</span>
      </button>
      <input ref={inputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.ppt,.pptx,.doc,.docx,.txt"
        onChange={(e) => { pick(e.target.files); e.target.value = ""; }} style={{ display: "none" }} />
      {files.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-lg)", background: "var(--surface-card)", border: "1px solid var(--border-subtle)" }}>
              <span aria-hidden="true">📎</span>
              <span style={{ flex: 1, fontSize: "var(--text-sm)", color: "var(--text-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
              {f.size != null && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>{(f.size / 1024).toFixed(0)} KB</span>}
              <button type="button" onClick={() => onRemove(i)} aria-label={copy.remove} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-faint)", fontSize: 16, lineHeight: 1, padding: 2 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AI analysis animation → reveals real, AI-generated findings ────────────────
// `lines` is null while the actual Claude analysis call is in flight (parent
// component runs it); once it resolves, the reveal animation starts. No more
// scripted "18 Biology topics found" regardless of what was actually uploaded.
function AnalysisAnimation({ copy, lines, onComplete }) {
  const [shown, setShown] = React.useState(0);
  const [phase, setPhase] = React.useState("analysing"); // analysing → building → done
  React.useEffect(() => {
    if (!lines) return;
    if (shown < lines.length) {
      const id = setTimeout(() => setShown((n) => n + 1), 650);
      return () => clearTimeout(id);
    }
    const a = setTimeout(() => setPhase("building"), 500);
    const b = setTimeout(() => { setPhase("done"); onComplete(); }, 1900);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [shown, lines]);
  const safeLines = lines || [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", padding: "var(--space-4) 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <div aria-hidden="true" style={{ width: 22, height: 22, borderRadius: "var(--radius-full)", border: "3px solid var(--indigo-100)", borderTopColor: "var(--indigo-500)", animation: phase === "done" ? "none" : "onb-spin 0.8s linear infinite" }} />
        <span style={{ fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>
          {phase === "building" ? copy.building : copy.analysing}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {safeLines.slice(0, shown).map((l, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-body)", animation: "onb-rise var(--dur-normal) var(--ease-out)" }}>
            <span aria-hidden="true" style={{ color: "var(--emerald-500)", fontWeight: "var(--weight-bold)" }}>✓</span>
            <span>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Plan review card per subject — editable sessions/week ──────────────────────
// BUG-27 fix: a brand-new account has no study history, so it gets an honest
// placeholder instead of a fabricated confidence percentage.
function PlanRow({ row, copy, onSessions, noHistory }) {
  const probColor = row.probability >= 60 ? "var(--emerald-600)" : row.probability >= 40 ? "var(--amber-600)" : "var(--red-500)";
  return (
    <div style={{ borderRadius: "var(--radius-2xl)", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderTop: `4px solid ${row.color}`, boxShadow: "var(--shadow-sm)", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>{row.name}</p>
          <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{copy.exam}: {row.examDate}</p>
        </div>
        {noHistory ? (
          <div style={{ textAlign: "right", maxWidth: 140 }}>
            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-faint)", lineHeight: 1.4 }}>{copy.forecast_locked}</p>
          </div>
        ) : (
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: "var(--text-2xl)", fontWeight: "var(--weight-bold)", color: probColor, lineHeight: 1 }}>{row.probability}%</p>
            <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{copy.prob}</p>
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)" }}>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{copy.s2_current}</span>
        <strong style={{ color: "var(--text-strong)" }}>{row.current}</strong>
        <span aria-hidden="true" style={{ color: "var(--text-faint)" }}>→</span>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{copy.s2_target}</span>
        <strong style={{ color: "var(--indigo-700)" }}>{row.target}</strong>
      </div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 6 }}>
          <span>{copy.sessions}</span><span style={{ fontFamily: "var(--font-mono)", color: "var(--text-strong)", fontWeight: "var(--weight-semibold)" }}>{row.sessions}×</span>
        </div>
        <input type="range" min={1} max={7} value={row.sessions} onChange={(e) => onSessions(Number(e.target.value))} style={{ width: "100%", accentColor: row.color, height: 24 }} />
      </div>
    </div>
  );
}
function copy_label(copy) { return copy.s2_current; }

// ── Availability grid — days/week, session length, weekly blackout times ───────
// These three feed the hour-budget scheduler (schedule-store.jsx) directly:
// without them the engine only had weeklyHours to work with and had no way to
// turn "9h/week" into real dated sessions — see the audit that motivated this.
// English-only for now, matching the precedent already set by AiHoursModal's
// hardcoded placeholder text in this same file — i18n for these can follow later.
function AvailabilityGrid({ daysPerWeek, setDaysPerWeek, sessionLengthMin, setSessionLengthMin, blackoutSlots, setBlackoutSlots, copy }) {
  const DAY_LABELS = copy.day_abbr || { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
  const PERIOD_LABELS = copy.period_abbr || { morning: "AM", afternoon: "PM", evening: "Eve" };
  const days = window.WEEK_DAYS || Object.keys(DAY_LABELS);
  const periods = window.DAY_PERIODS || Object.keys(PERIOD_LABELS);

  const isAllDay = (day) => blackoutSlots.some((s) => s.day === day && s.period === "all");
  const isPeriodOff = (day, period) => blackoutSlots.some((s) => s.day === day && (s.period === "all" || s.period === period));

  const toggleAllDay = (day) => {
    setBlackoutSlots((slots) => {
      const otherDays = slots.filter((s) => s.day !== day);
      return isAllDay(day) ? otherDays : [...otherDays, { day, period: "all" }];
    });
  };
  const togglePeriod = (day, period) => {
    setBlackoutSlots((slots) => {
      const otherDays = slots.filter((s) => s.day !== day);
      const daySlots = slots.filter((s) => s.day === day);
      if (daySlots.some((s) => s.period === "all")) {
        // Splitting "all day" into individual periods — every other period stays off, this one turns on.
        return [...otherDays, ...periods.filter((p) => p !== period).map((p) => ({ day, period: p }))];
      }
      const wasOff = daySlots.some((s) => s.period === period);
      const keep = daySlots.filter((s) => s.period !== period);
      return [...otherDays, ...(wasOff ? keep : [...keep, { day, period }])];
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div>
        <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>{copy.s2_days_per_week}</p>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {[3, 4, 5, 6, 7].map((n) => (
            <button key={n} type="button" onClick={() => setDaysPerWeek(n)}
              style={{ flex: 1, minHeight: 44, borderRadius: "var(--radius-lg)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", cursor: "pointer", fontFamily: "var(--font-sans)",
                border: daysPerWeek === n ? "2px solid var(--indigo-500)" : "1.5px solid var(--border-default)",
                background: daysPerWeek === n ? "var(--indigo-50)" : "var(--surface-card)",
                color: daysPerWeek === n ? "var(--indigo-700)" : "var(--text-muted)" }}>{n}</button>
          ))}
        </div>
      </div>
      <div>
        <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>{copy.s2_session_length}</p>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {[30, 45, 60, 90].map((m) => (
            <button key={m} type="button" onClick={() => setSessionLengthMin(m)}
              style={{ flex: 1, minHeight: 44, borderRadius: "var(--radius-lg)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", cursor: "pointer", fontFamily: "var(--font-sans)",
                border: sessionLengthMin === m ? "2px solid var(--indigo-500)" : "1.5px solid var(--border-default)",
                background: sessionLengthMin === m ? "var(--indigo-50)" : "var(--surface-card)",
                color: sessionLengthMin === m ? "var(--indigo-700)" : "var(--text-muted)" }}>{m}m</button>
          ))}
        </div>
      </div>
      <div>
        <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>{copy.s2_when_unavailable}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {days.map((day) => (
            <div key={day} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 34, fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: "var(--weight-medium)" }}>{DAY_LABELS[day]}</span>
              {periods.map((p) => (
                <button key={p} type="button" onClick={() => togglePeriod(day, p)}
                  style={{ flex: 1, minHeight: 44, borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)", cursor: "pointer", fontFamily: "var(--font-sans)",
                    border: isPeriodOff(day, p) ? "1.5px solid var(--red-500)" : "1.5px solid var(--border-default)",
                    background: isPeriodOff(day, p) ? "var(--red-50)" : "var(--surface-card)",
                    color: isPeriodOff(day, p) ? "var(--red-700)" : "var(--text-faint)" }}>{PERIOD_LABELS[p]}</button>
              ))}
              <button type="button" onClick={() => toggleAllDay(day)}
                style={{ flex: 1, minHeight: 44, borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)", cursor: "pointer", fontFamily: "var(--font-sans)",
                  border: isAllDay(day) ? "1.5px solid var(--red-500)" : "1.5px solid var(--border-default)",
                  background: isAllDay(day) ? "var(--red-50)" : "var(--surface-card)",
                  color: isAllDay(day) ? "var(--red-700)" : "var(--text-faint)" }}>{copy.all_day}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── AI hours-estimate modal — Step 3's only AI entry point ─────────────────────
// Manual slider is the primary path; this is purely an optional enhancement.
// Any failure (parse error, network, etc.) closes the modal silently — no
// error state exists here at all, by design.
function AiHoursModal({ subjects, examLabel, onApply, onClose, copy }) {
  const [weekDescription, setWeekDescription] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const subjList = subjects.filter((s) => s.name.trim()).map((s) => `${s.name} (current ${s.current}, target ${s.target})`).join("; ") || "no subjects entered yet";
      const prompt = `Student preparing for ${examLabel}. Subjects: ${subjList}. Their week, in their own words: "${weekDescription.trim() || "not specified"}". Recommend a realistic number of study hours per week (a single integer between 2 and 40). Reply ONLY with JSON, no markdown: {"hours":N}`;
      const raw = await window.claude.complete(prompt);
      const clean = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
      const parsed = JSON.parse(clean);
      const hours = Math.max(2, Math.min(40, Math.round(Number(parsed.hours)) || 12));
      onApply(hours);
    } catch {
      onClose(); // silent — never show an error card
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)", padding: "var(--space-4)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, background: "var(--surface-page)", borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-lg)", padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <p style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>{copy.ai_estimate_title}</p>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{copy.ai_estimate_sub}</p>
        <textarea value={weekDescription} onChange={(e) => setWeekDescription(e.target.value)} rows={3} autoFocus
          placeholder={copy.ai_estimate_placeholder}
          style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", color: "var(--text-strong)", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", outline: "none", resize: "vertical" }} />
        <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
          <button type="button" onClick={onClose} style={{ flex: 1, minHeight: 44, border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-muted)", borderRadius: "var(--radius-lg)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>{copy.cancel}</button>
          <button type="button" onClick={submit} disabled={loading}
            style={{ flex: 1, minHeight: 44, border: "none", background: loading ? "var(--slate-200)" : "var(--indigo-600)", color: loading ? "var(--text-faint)" : "#fff", borderRadius: "var(--radius-lg)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", cursor: loading ? "default" : "pointer", fontFamily: "var(--font-sans)" }}>
            {loading ? copy.thinking : copy.estimate}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CoachBubble, GradePicker, ChipGrid, UploadZone, AnalysisAnimation, PlanRow, AiHoursModal, AvailabilityGrid });
