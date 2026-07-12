// AI Exam Coach — Study Calendar: a real Google-Calendar-style weekly grid.
// Sessions from the AI budget engine (schedule-store.jsx's allocateBudget)
// render here as draggable/resizable blocks; the user can also click an
// empty slot to hand-create a session, or delete one. Any touch — drag,
// resize, or create — marks the session `manual: true` (schedule-store.jsx),
// which is the one flag that protects it from being silently overwritten the
// next time the AI budget engine replans (weeklyHours change, new exam, etc).
//
// Also home to the left sidebar (upcoming exams, weekly goal, filters,
// upcoming events, study stats), the floating "+" quick-create menu, and
// personal events — a session type (`type: "personal"`) that's never
// touched by the AI scheduler because its examId is the PERSONAL_EVENT_ID
// sentinel, which never matches a real exam id (see schedule-store.jsx).

const CAL_HOUR_START = 6;   // 06:00
const CAL_HOUR_END = 23;    // 23:00
const CAL_HOUR_PX = 56;
const CAL_SNAP_MIN = 15;
const CAL_WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CAL_WEEKDAY_IDS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const PERSONAL_CATEGORIES = [
  { id: "gym", label: "Gym", emoji: "🏋️", color: "#F97316" },
  { id: "work", label: "Work", emoji: "💼", color: "#0EA5E9" },
  { id: "birthday", label: "Birthday", emoji: "🎂", color: "#EC4899" },
  { id: "flight", label: "Flight", emoji: "✈️", color: "#8B5CF6" },
  { id: "meeting", label: "Meeting", emoji: "🤝", color: "#14B8A6" },
  { id: "vacation", label: "Vacation", emoji: "🏖️", color: "#F59E0B" },
  { id: "custom", label: "Custom", emoji: "📌", color: "#64748B" },
];

function calFmtDate(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function calMondayOf(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
function calMinutesOf(hhmm) { const [h, m] = (hhmm || "17:00").split(":").map(Number); return h * 60 + m; }
function calHHMM(mins) { const w = Math.max(0, Math.min(24 * 60 - 1, Math.round(mins))); const h = Math.floor(w / 60), m = w % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; }
function calSnap(mins) { return Math.round(mins / CAL_SNAP_MIN) * CAL_SNAP_MIN; }
// Pure so calendar-tests.jsx can cover it without a live DOM/gridRef — takes
// the pixel offset from the row's left edge and one column's pixel width,
// returns a clamped 0-6 day index. This is the exact formula that had the
// Wednesday→Saturday drag bug (see xToDayIndex below for the story).
function calDayIndexFromOffset(offsetX, colWidth) {
  if (!colWidth) return 0;
  return Math.max(0, Math.min(6, Math.floor(offsetX / colWidth)));
}
function calNextQuarterHour() {
  const d = new Date();
  const mins = calSnap(d.getHours() * 60 + d.getMinutes() + CAL_SNAP_MIN); // round UP to next slot
  return calHHMM(mins);
}

function StudyCalendar({ t, onGoToExams }) {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [weekStart, setWeekStart] = React.useState(() => calMondayOf(new Date()));
  const exams = React.useMemo(() => window.getExams(), [refreshKey]);
  const courses = React.useMemo(() => window.deriveCourses(exams), [exams, refreshKey]);
  const schedule = React.useMemo(() => window.getSchedule(), [refreshKey]);
  const profile = React.useMemo(() => window.getProfile(), [refreshKey]);
  const courseById = React.useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const defaultDurationMin = profile.sessionLengthMin || 45;

  const gridRef = React.useRef(null);
  const [drag, setDrag] = React.useState(null);     // { id, mode: "move"|"resize", ... }
  const [preview, setPreview] = React.useState(null); // { id, date, startTime, durationMin } while dragging
  const [armedDelete, setArmedDelete] = React.useState(null);
  const [createSpec, setCreateSpec] = React.useState(null); // { date, startTime, type, recurring }
  const [fabOpen, setFabOpen] = React.useState(false);

  // ── sidebar filters (visual only — never changes what's stored) ─────────
  const [hiddenExamIds, setHiddenExamIds] = React.useState(() => new Set());
  const [showPersonal, setShowPersonal] = React.useState(true);
  const toggleExamFilter = (examId) => setHiddenExamIds((prev) => {
    const next = new Set(prev);
    next.has(examId) ? next.delete(examId) : next.add(examId);
    return next;
  });

  const weekDays = React.useMemo(() => {
    const out = [];
    for (let i = 0; i < 7; i++) { const d = new Date(weekStart); d.setDate(d.getDate() + i); out.push(d); }
    return out;
  }, [weekStart]);

  const { examDates } = React.useMemo(() => (window.buildScheduleData ? window.buildScheduleData() : { examDates: {} }), [refreshKey]);

  // Merge the in-flight drag/resize preview into the session list BEFORE
  // grouping by date — this is what actually moves a dragged block into the
  // target day's column while dragging, not just repositions it within its
  // original column.
  const displaySessions = React.useMemo(() => {
    if (!preview) return schedule.sessions;
    return schedule.sessions.map((s) => s.id === preview.id ? { ...s, ...preview } : s);
  }, [schedule, preview]);

  // Sidebar stats/upcoming-events read the FULL set (filters are a grid
  // visibility toggle, not a data scope change) — only the grid below
  // applies hiddenExamIds/showPersonal.
  const relevantSessions = React.useMemo(
    () => displaySessions.filter((s) => s.type === "personal" || courseById.has(s.examId)),
    [displaySessions, courseById]
  );

  const sessionsByDate = React.useMemo(() => {
    const map = {};
    relevantSessions.forEach((s) => {
      if (s.type === "personal") { if (!showPersonal) return; }
      else if (hiddenExamIds.has(s.examId)) return;
      (map[s.date] = map[s.date] || []).push(s);
    });
    return map;
  }, [relevantSessions, hiddenExamIds, showPersonal]);

  const todayKey = calFmtDate(new Date());
  const gridHeight = (CAL_HOUR_END - CAL_HOUR_START) * CAL_HOUR_PX;

  function yToMinutes(clientY) {
    const rect = gridRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    return CAL_HOUR_START * 60 + (y / CAL_HOUR_PX) * 60;
  }
  // gridRef is anchored to a SINGLE day column (Monday's, dayIdx===0) — its
  // rect.width is therefore already one column's width, and rect.left is
  // already the left edge of the whole 7-column row (Monday starts the row).
  function xToDayIndex(clientX) {
    const rect = gridRef.current.getBoundingClientRect();
    return calDayIndexFromOffset(clientX - rect.left, rect.width);
  }

  // ── drag-to-move / drag-to-resize ─────────────────────────────────────
  React.useEffect(() => {
    if (!drag) return;
    function onMove(e) {
      if (!gridRef.current) return;
      if (drag.mode === "resize") {
        const mins = yToMinutes(e.clientY);
        // Clamp 15min–8h — a fast/overshot drag shouldn't be able to silently
        // produce a session with no duration or one spanning the rest of the day.
        const newDuration = Math.max(CAL_SNAP_MIN, Math.min(8 * 60, calSnap(mins - calMinutesOf(drag.startTime))));
        setPreview({ id: drag.id, date: drag.date, startTime: drag.startTime, durationMin: newDuration });
      } else {
        const dayIdx = xToDayIndex(e.clientX);
        const rawStart = calSnap(yToMinutes(e.clientY) - drag.grabOffsetMin);
        const clamped = Math.max(0, Math.min(24 * 60 - drag.durationMin, rawStart));
        const date = calFmtDate(weekDays[dayIdx]);
        setPreview({ id: drag.id, date, startTime: calHHMM(clamped), durationMin: drag.durationMin });
      }
    }
    function onUp() {
      setDrag((d) => {
        setPreview((p) => {
          if (p && window.updateSession) window.updateSession(p.id, { date: p.date, startTime: p.startTime, durationMin: p.durationMin });
          return null;
        });
        return null;
      });
      setRefreshKey((k) => k + 1);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, [drag, weekDays]);

  function startMove(e, session) {
    if (session.status === "completed") return;
    e.preventDefault(); e.stopPropagation();
    const grabOffsetMin = yToMinutes(e.clientY) - calMinutesOf(session.startTime || "17:00");
    setDrag({ id: session.id, mode: "move", date: session.date, startTime: session.startTime || "17:00", durationMin: session.durationMin || defaultDurationMin, grabOffsetMin });
  }
  function startResize(e, session) {
    if (session.status === "completed") return;
    e.preventDefault(); e.stopPropagation();
    setDrag({ id: session.id, mode: "resize", date: session.date, startTime: session.startTime || "17:00" });
  }

  function onGridClick(e, dayIdx) {
    if (e.target !== e.currentTarget) return; // clicked a session block, not empty space
    const mins = calSnap(yToMinutes(e.clientY));
    setCreateSpec({ date: calFmtDate(weekDays[dayIdx]), startTime: calHHMM(mins), type: "study", recurring: false });
  }

  function openFabCreate(type, recurring) {
    setFabOpen(false);
    setCreateSpec({ date: todayKey, startTime: calNextQuarterHour(), type, recurring });
  }

  function confirmDelete(id) {
    if (armedDelete === id) {
      if (window.deleteSession) window.deleteSession(id);
      setArmedDelete(null);
      setRefreshKey((k) => k + 1);
    } else {
      setArmedDelete(id);
      setTimeout(() => setArmedDelete((cur) => cur === id ? null : cur), 2500);
    }
  }

  const activeExams = exams.filter((e) => new Date(e.examDate) > new Date());
  const weekLabel = `${weekDays[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${weekDays[6].toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", fontFamily: "var(--font-sans)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>
          {t?.calendar_title || "Study Calendar"}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setWeekStart((w) => { const d = new Date(w); d.setDate(d.getDate() - 7); return d; })}
            style={{ border: "1px solid var(--border-default)", background: "var(--surface-card)", borderRadius: "var(--radius-lg)", padding: "6px 10px", cursor: "pointer", color: "var(--text-muted)" }}>←</button>
          <button onClick={() => setWeekStart(calMondayOf(new Date()))}
            style={{ border: "1px solid var(--border-default)", background: "var(--surface-card)", borderRadius: "var(--radius-lg)", padding: "6px 14px", cursor: "pointer", color: "var(--text-body)", fontSize: "var(--text-sm)", fontWeight: 600 }}>Today</button>
          <button onClick={() => setWeekStart((w) => { const d = new Date(w); d.setDate(d.getDate() + 7); return d; })}
            style={{ border: "1px solid var(--border-default)", background: "var(--surface-card)", borderRadius: "var(--radius-lg)", padding: "6px 10px", cursor: "pointer", color: "var(--text-muted)" }}>→</button>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginLeft: 6, fontWeight: 600 }}>{weekLabel}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <CalSidebar
          activeExams={activeExams} courseById={courseById} allSessions={relevantSessions}
          profile={profile} todayKey={todayKey}
          hiddenExamIds={hiddenExamIds} toggleExamFilter={toggleExamFilter}
          showPersonal={showPersonal} setShowPersonal={setShowPersonal}
          onGoToExams={onGoToExams}
        />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
            Drag a session to move it · drag its bottom edge to resize · click an empty slot to add one · click a session's × to remove it. Anything you edit here stays put — the AI planner won't overwrite it.
          </p>

          <div style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
            {/* day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)", borderBottom: "1px solid var(--border-default)" }}>
              <div />
              {weekDays.map((d, i) => {
                const key = calFmtDate(d);
                const isToday = key === todayKey;
                const exam = (examDates[key] || [])[0];
                return (
                  <div key={key} style={{ padding: "10px 6px", textAlign: "center", borderLeft: "1px solid var(--border-subtle)", background: isToday ? "var(--indigo-50)" : "transparent" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? "var(--indigo-600)" : "var(--text-faint)", textTransform: "uppercase" }}>{CAL_WEEKDAY_LABELS[i]}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: isToday ? "var(--indigo-600)" : "var(--text-strong)" }}>{d.getDate()}</div>
                    {exam && <div style={{ fontSize: 9, color: exam.color, fontWeight: 700, marginTop: 2 }}>★ {exam.subject}</div>}
                  </div>
                );
              })}
            </div>

            {/* time grid */}
            <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)", position: "relative" }}>
              <div style={{ position: "relative", height: gridHeight }}>
                {Array.from({ length: CAL_HOUR_END - CAL_HOUR_START }, (_, i) => (
                  <div key={i} style={{ position: "absolute", top: i * CAL_HOUR_PX - 6, right: 6, fontSize: 10, color: "var(--text-faint)" }}>
                    {String(CAL_HOUR_START + i).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
              {weekDays.map((d, dayIdx) => {
                const key = calFmtDate(d);
                const daySessions = sessionsByDate[key] || [];
                return (
                  <div key={key} ref={dayIdx === 0 ? gridRef : null} onClick={(e) => onGridClick(e, dayIdx)}
                    style={{ position: "relative", height: gridHeight, borderLeft: "1px solid var(--border-subtle)", cursor: "crosshair", background: key === todayKey ? "var(--indigo-50)" : "transparent" }}>
                    {Array.from({ length: CAL_HOUR_END - CAL_HOUR_START }, (_, i) => (
                      <div key={i} style={{ position: "absolute", top: i * CAL_HOUR_PX, left: 0, right: 0, borderTop: "1px solid var(--border-subtle)", pointerEvents: "none" }} />
                    ))}
                    {daySessions.map((s) => {
                      const isPersonal = s.type === "personal";
                      const cat = isPersonal ? PERSONAL_CATEGORIES.find((c) => c.id === s.category) : null;
                      const course = isPersonal ? null : courseById.get(s.examId);
                      const blockColor = isPersonal ? (s.personalColor || cat?.color || "#64748B") : (course?.color || "#6366F1");
                      const startMin = calMinutesOf(s.startTime || "17:00");
                      const dur = s.durationMin || defaultDurationMin;
                      const top = ((startMin - CAL_HOUR_START * 60) / 60) * CAL_HOUR_PX;
                      const height = Math.max(18, (dur / 60) * CAL_HOUR_PX - 2);
                      const completed = s.status === "completed";
                      const isDragging = drag && drag.id === s.id;
                      return (
                        <div key={s.id} onMouseDown={(e) => startMove(e, s)} style={{
                          position: "absolute", top, height, left: 3, right: 3,
                          borderRadius: 6, padding: "3px 6px", overflow: "hidden",
                          background: blockColor + (completed ? "22" : isPersonal ? "14" : "1c"),
                          borderLeft: `3px solid ${blockColor}`,
                          borderLeftStyle: isPersonal ? "dashed" : "solid",
                          cursor: completed ? "default" : "grab",
                          opacity: completed ? 0.6 : isDragging ? 0.85 : 1,
                          boxShadow: isDragging ? "var(--shadow-md)" : "none",
                          zIndex: isDragging ? 10 : 1,
                          fontFamily: "var(--font-sans)",
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {completed && "✓ "}{isPersonal && (cat?.emoji || "📌") + " "}{s.seriesId && "🔁 "}{s.topic}
                          </div>
                          <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{s.startTime || "17:00"} · {isPersonal ? (cat?.label || "Event") : (course?.name || "")}</div>
                          {!completed && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); confirmDelete(s.id); }} style={{
                                position: "absolute", top: 2, right: 2, width: 14, height: 14, lineHeight: "14px", textAlign: "center",
                                border: "none", borderRadius: "50%", cursor: "pointer", fontSize: 9,
                                background: armedDelete === s.id ? "var(--red-500)" : "rgba(0,0,0,0.12)",
                                color: armedDelete === s.id ? "#fff" : "var(--text-muted)",
                              }}>{armedDelete === s.id ? "✓" : "×"}</button>
                              <div onMouseDown={(e) => startResize(e, s)} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 6, cursor: "ns-resize" }} />
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <CalFab open={fabOpen} setOpen={setFabOpen} onGoToExams={onGoToExams} onCreate={openFabCreate} />

      {createSpec && (
        <QuickCreateModal spec={createSpec} exams={activeExams} defaultDurationMin={defaultDurationMin}
          onClose={() => setCreateSpec(null)}
          onCreate={() => { setCreateSpec(null); setRefreshKey((k) => k + 1); }} />
      )}
    </div>
  );
}

// ─── left sidebar ───────────────────────────────────────────────────────────

function CalSidebar({ activeExams, courseById, allSessions, profile, todayKey, hiddenExamIds, toggleExamFilter, showPersonal, setShowPersonal, onGoToExams }) {
  const weekMonday = calMondayOf(new Date());
  const weekSunday = new Date(weekMonday); weekSunday.setDate(weekSunday.getDate() + 6);
  const weekMondayKey = calFmtDate(weekMonday);
  const weekSundayKey = calFmtDate(weekSunday);

  const thisWeekStudy = allSessions.filter((s) => s.type !== "personal" && s.date >= weekMondayKey && s.date <= weekSundayKey);
  const plannedHoursThisWeek = thisWeekStudy.reduce((sum, s) => sum + (s.durationMin || profile.sessionLengthMin || 45) / 60, 0);
  const completedThisWeek = thisWeekStudy.filter((s) => s.status === "completed").length;
  const completedHoursThisWeek = (window.secondsStudiedThisWeek ? window.secondsStudiedThisWeek() : 0) / 3600;
  const goalHours = profile.weeklyHours || 12;
  const goalPct = Math.max(0, Math.min(100, Math.round((completedHoursThisWeek / goalHours) * 100)));

  const upcoming = allSessions
    .filter((s) => s.date >= todayKey && s.status !== "completed")
    .sort((a, b) => (a.date + (a.startTime || "17:00")).localeCompare(b.date + (b.startTime || "17:00")))
    .slice(0, 5);

  const upcomingExamsSorted = React.useMemo(
    () => activeExams.slice().sort((a, b) => new Date(a.examDate) - new Date(b.examDate)).slice(0, 4),
    [activeExams]
  );

  const streak = window.computeStreak ? window.computeStreak() : 0;

  const sectionTitle = { margin: "0 0 8px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-faint)" };
  const card = { borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)", padding: 14 };

  return (
    <aside style={{ width: 252, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Upcoming Exams */}
      <div style={card}>
        <p style={sectionTitle}>Upcoming Exams</p>
        {upcomingExamsSorted.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-faint)" }}>No exams yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {upcomingExamsSorted.map((e) => {
              const days = window.daysAway ? window.daysAway(e.examDate) : 0;
              return (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: e.color, flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.name}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: days <= 7 ? "var(--amber-600)" : "var(--text-faint)", flexShrink: 0 }}>{days}d</span>
                </div>
              );
            })}
          </div>
        )}
        {onGoToExams && (
          <button onClick={onGoToExams} style={{ marginTop: 10, border: "none", background: "transparent", color: "var(--indigo-600)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0 }}>
            Manage exams →
          </button>
        )}
      </div>

      {/* Weekly Goal */}
      <div style={card}>
        <p style={sectionTitle}>Weekly Goal</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: "var(--indigo-600)", fontFamily: "var(--font-mono)" }}>{Math.round(completedHoursThisWeek * 10) / 10}h</span>
          <span style={{ fontSize: 12, color: "var(--text-faint)" }}>/ {goalHours}h</span>
        </div>
        <div style={{ height: 6, background: "var(--surface-sunken)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${goalPct}%`, background: goalPct >= 100 ? "var(--emerald-500)" : "var(--indigo-500)", borderRadius: "var(--radius-full)", transition: "width 0.4s ease" }} />
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text-faint)" }}>{Math.round(plannedHoursThisWeek * 10) / 10}h planned this week</p>
      </div>

      {/* Filters */}
      <div style={card}>
        <p style={sectionTitle}>Filters</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {activeExams.map((e) => (
            <label key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-body)", cursor: "pointer" }}>
              <input type="checkbox" checked={!hiddenExamIds.has(e.id)} onChange={() => toggleExamFilter(e.id)} style={{ accentColor: e.color, width: 13, height: 13, cursor: "pointer" }} />
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: e.color, flexShrink: 0 }} />
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.name}</span>
            </label>
          ))}
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-body)", cursor: "pointer" }}>
            <input type="checkbox" checked={showPersonal} onChange={() => setShowPersonal((v) => !v)} style={{ accentColor: "#64748B", width: 13, height: 13, cursor: "pointer" }} />
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#64748B", flexShrink: 0 }} />
            <span>Personal events</span>
          </label>
        </div>
      </div>

      {/* Upcoming Events */}
      <div style={card}>
        <p style={sectionTitle}>Upcoming Events</p>
        {upcoming.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-faint)" }}>Nothing scheduled — you're all caught up.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {upcoming.map((s) => {
              const isPersonal = s.type === "personal";
              const cat = isPersonal ? PERSONAL_CATEGORIES.find((c) => c.id === s.category) : null;
              const course = isPersonal ? null : courseById.get(s.examId);
              const color = isPersonal ? (s.personalColor || cat?.color || "#64748B") : (course?.color || "#6366F1");
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: color, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {isPersonal && (cat?.emoji || "📌") + " "}{s.topic}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-faint)" }}>{s.date === todayKey ? "Today" : s.date} · {s.startTime || "17:00"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Study Statistics */}
      <div style={card}>
        <p style={sectionTitle}>Study Statistics</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ textAlign: "center", padding: "8px 4px", borderRadius: "var(--radius-lg)", background: "var(--surface-muted)" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-strong)" }}>{completedThisWeek}/{thisWeekStudy.length}</div>
            <div style={{ fontSize: 9, color: "var(--text-muted)" }}>sessions done</div>
          </div>
          <div style={{ textAlign: "center", padding: "8px 4px", borderRadius: "var(--radius-lg)", background: "var(--surface-muted)" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-strong)" }}>{streak}🔥</div>
            <div style={{ fontSize: 9, color: "var(--text-muted)" }}>day streak</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── floating "+" action button ─────────────────────────────────────────────

function CalFab({ open, setOpen, onCreate, onGoToExams }) {
  const items = [
    { id: "study", label: "Study Session", emoji: "📚", action: () => onCreate("study", false) },
    { id: "exam", label: "Exam", emoji: "🎓", action: () => { setOpen(false); if (onGoToExams) onGoToExams(); } },
    { id: "personal", label: "Personal Event", emoji: "📌", action: () => onCreate("personal", false) },
    { id: "recurring", label: "Recurring Study Session", emoji: "🔁", action: () => onCreate("study", true) },
  ];
  return (
    <div style={{ position: "fixed", right: 28, bottom: 28, zIndex: 200, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, animation: "fadeUp 0.15s ease both" }}>
          {items.map((it) => (
            <button key={it.id} onClick={it.action} style={{
              display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--border-default)",
              background: "var(--surface-card)", boxShadow: "var(--shadow-md)", borderRadius: "var(--radius-full)",
              padding: "8px 16px 8px 8px", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: "var(--text-strong)",
            }}>
              <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--indigo-50)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{it.emoji}</span>
              {it.label}
            </button>
          ))}
        </div>
      )}
      <button onClick={() => setOpen((v) => !v)} aria-label="Create" style={{
        width: 56, height: 56, borderRadius: "50%", border: "none", cursor: "pointer",
        background: "linear-gradient(135deg, var(--indigo-600), #7c3aed)", color: "#fff",
        fontSize: 26, boxShadow: "0 8px 24px rgba(99,102,241,0.4)", display: "flex", alignItems: "center", justifyContent: "center",
        transform: open ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.2s ease",
      }}>+</button>
    </div>
  );
}

// ─── quick-create modal (study session / personal event / recurring) ──────

function QuickCreateModal({ spec, exams, defaultDurationMin, onClose, onCreate }) {
  const [type, setType] = React.useState(spec.type);
  const [recurring, setRecurring] = React.useState(spec.recurring);
  const [examId, setExamId] = React.useState(exams[0]?.id || "");
  const [topic, setTopic] = React.useState("");
  const [category, setCategory] = React.useState(PERSONAL_CATEGORIES[0].id);
  const [notes, setNotes] = React.useState("");
  const [date, setDate] = React.useState(spec.date);
  const [startTime, setStartTime] = React.useState(spec.startTime);
  const [durationMin, setDurationMin] = React.useState(defaultDurationMin);
  const [weekdays, setWeekdays] = React.useState(() => new Set([CAL_WEEKDAY_IDS[(new Date(spec.date + "T00:00:00").getDay() + 6) % 7]]));
  const [endDate, setEndDate] = React.useState(() => { const d = new Date(spec.date + "T00:00:00"); d.setDate(d.getDate() + 8 * 7); return calFmtDate(d); });

  const exam = exams.find((e) => e.id === examId);
  const topics = exam?.topics || [];
  const cat = PERSONAL_CATEGORIES.find((c) => c.id === category);
  const canSave = type === "personal" ? true : !!examId;

  function toggleWeekday(id) {
    setWeekdays((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function save() {
    if (recurring) {
      if (window.addRecurringSessions) {
        window.addRecurringSessions({
          examId: type === "study" ? examId : null,
          topic: type === "study" ? (topic || "Study session") : (topic || cat.label),
          type, category: type === "personal" ? category : null,
          personalColor: type === "personal" ? cat.color : null,
          notes, startTime, durationMin,
          weekdays: Array.from(weekdays), startDate: date, endDate,
        });
      }
    } else if (window.addManualSession) {
      window.addManualSession({
        examId: type === "study" ? examId : null,
        topic: type === "study" ? (topic || "Study session") : (topic || cat.label),
        type, category: type === "personal" ? category : null,
        personalColor: type === "personal" ? cat.color : null,
        notes, date, startTime, durationMin,
      });
    }
    onCreate();
  }

  const inputStyle = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)" };
  const label = { display: "block", fontSize: 11, color: "var(--text-faint)", marginBottom: 4 };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--surface-card)", borderRadius: "var(--radius-2xl)", padding: 24, width: 380, maxHeight: "88vh", overflowY: "auto", boxShadow: "var(--shadow-lg)" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text-strong)" }}>
          {recurring ? "Add recurring session" : type === "personal" ? "Add personal event" : "Add study session"}
        </h3>

        {/* type toggle */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[{ id: "study", label: "📚 Study" }, { id: "personal", label: "📌 Personal" }].map((opt) => (
            <button key={opt.id} type="button" onClick={() => setType(opt.id)} style={{
              flex: 1, padding: "8px", borderRadius: "var(--radius-lg)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 700,
              border: type === opt.id ? "2px solid var(--indigo-500)" : "1.5px solid var(--border-default)",
              background: type === opt.id ? "var(--indigo-50)" : "var(--surface-page)",
              color: type === opt.id ? "var(--indigo-700)" : "var(--text-muted)",
            }}>{opt.label}</button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {type === "study" ? (
            exams.length === 0 ? (
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", margin: 0 }}>Add an exam first — there's nothing to attach a session to yet.</p>
            ) : (
              <>
                <div>
                  <label style={label}>Exam</label>
                  <select value={examId} onChange={(e) => { setExamId(e.target.value); setTopic(""); }} style={inputStyle}>
                    {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>Topic</label>
                  {topics.length > 0 ? (
                    <select value={topic} onChange={(e) => setTopic(e.target.value)} style={inputStyle}>
                      <option value="">Pick a topic…</option>
                      {topics.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                    </select>
                  ) : (
                    <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Revision" style={inputStyle} />
                  )}
                </div>
              </>
            )
          ) : (
            <>
              <div>
                <label style={label}>Category</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {PERSONAL_CATEGORIES.map((c) => (
                    <button key={c.id} type="button" onClick={() => setCategory(c.id)} title={c.label} style={{
                      padding: "8px 4px", borderRadius: "var(--radius-lg)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 16,
                      border: category === c.id ? `2px solid ${c.color}` : "1.5px solid var(--border-default)",
                      background: category === c.id ? c.color + "18" : "var(--surface-page)",
                    }}>{c.emoji}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={label}>Title</label>
                <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={cat.label} style={inputStyle} />
              </div>
              <div>
                <label style={label}>Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
            </>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={label}>{recurring ? "Start date" : "Date"}</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={label}>Time</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={label}>Duration — {durationMin} min</label>
            <input type="range" min={15} max={180} step={15} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--indigo-600)" }} />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-body)", cursor: "pointer" }}>
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} style={{ accentColor: "var(--indigo-600)", width: 14, height: 14 }} />
            Repeat weekly
          </label>

          {recurring && (
            <>
              <div>
                <label style={label}>Repeat on</label>
                <div style={{ display: "flex", gap: 4 }}>
                  {CAL_WEEKDAY_IDS.map((wd, i) => (
                    <button key={wd} type="button" onClick={() => toggleWeekday(wd)} style={{
                      flex: 1, padding: "6px 0", borderRadius: 6, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 700,
                      border: weekdays.has(wd) ? "2px solid var(--indigo-500)" : "1.5px solid var(--border-default)",
                      background: weekdays.has(wd) ? "var(--indigo-50)" : "var(--surface-page)",
                      color: weekdays.has(wd) ? "var(--indigo-700)" : "var(--text-muted)",
                    }}>{CAL_WEEKDAY_LABELS[i][0]}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={label}>Until</label>
                <input type="date" value={endDate} min={date} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, border: "1px solid var(--border-default)", background: "var(--surface-page)", borderRadius: "var(--radius-lg)", padding: "10px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Cancel</button>
            <button onClick={save} disabled={!canSave || (recurring && weekdays.size === 0)}
              style={{ flex: 1, border: "none", background: canSave ? "var(--indigo-600)" : "var(--slate-200)", color: canSave ? "#fff" : "var(--text-faint)", borderRadius: "var(--radius-lg)", padding: "10px", cursor: canSave ? "pointer" : "default", fontWeight: 600, fontFamily: "var(--font-sans)" }}>
              {recurring ? "Add series" : "Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  StudyCalendar,
  // Exposed for calendar-tests.jsx — these are the pure functions behind
  // every date/time computation in the calendar (drag, resize, week nav,
  // creation). Testing them directly, without a live drag, is what actually
  // catches regressions like the Wednesday→Saturday day-index bug.
  calFmtDate, calMondayOf, calMinutesOf, calHHMM, calSnap, calDayIndexFromOffset,
});
