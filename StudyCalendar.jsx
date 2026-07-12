// AI Exam Coach — Study Calendar: a real Google-Calendar-style weekly grid.
// Sessions from the AI budget engine (schedule-store.jsx's allocateBudget)
// render here as draggable/resizable blocks; the user can also click an
// empty slot to hand-create a session, or delete one. Any touch — drag,
// resize, or create — marks the session `manual: true` (schedule-store.jsx),
// which is the one flag that protects it from being silently overwritten the
// next time the AI budget engine replans (weeklyHours change, new exam, etc).

const CAL_HOUR_START = 6;   // 06:00
const CAL_HOUR_END = 23;    // 23:00
const CAL_HOUR_PX = 56;
const CAL_SNAP_MIN = 15;
const CAL_WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

function StudyCalendar({ t }) {
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
  const [createAt, setCreateAt] = React.useState(null); // { date, startTime }

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

  const sessionsByDate = React.useMemo(() => {
    const map = {};
    displaySessions.forEach((s) => {
      if (!courseById.has(s.examId)) return; // exam deleted
      (map[s.date] = map[s.date] || []).push(s);
    });
    return map;
  }, [displaySessions, courseById]);

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
  // The bug this replaced multiplied by 7 as if rect.width were the full
  // row's width, which put x roughly 7× further right than intended —
  // e.g. dragging within Wednesday's column (dayIdx 2) computed index ~14,
  // clamped to 6 (Sunday), which is exactly the "wrong day" symptom
  // (Wednesday → Saturday/Sunday) users were hitting on every drag past the
  // first column.
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
        // produce a session spanning the rest of the day (or a negative one).
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
    setCreateAt({ date: calFmtDate(weekDays[dayIdx]), startTime: calHHMM(mins) });
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
                  const course = courseById.get(s.examId);
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
                      background: (course?.color || "#6366F1") + (completed ? "22" : "1c"),
                      borderLeft: `3px solid ${course?.color || "#6366F1"}`,
                      cursor: completed ? "default" : "grab",
                      opacity: completed ? 0.6 : isDragging ? 0.85 : 1,
                      boxShadow: isDragging ? "var(--shadow-md)" : "none",
                      zIndex: isDragging ? 10 : 1,
                      fontFamily: "var(--font-sans)",
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {completed && "✓ "}{s.topic}
                      </div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{s.startTime || "17:00"} · {course?.name || ""}</div>
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

      {createAt && (
        <CalCreateModal at={createAt} exams={activeExams} defaultDurationMin={defaultDurationMin}
          onClose={() => setCreateAt(null)}
          onCreate={(payload) => { if (window.addManualSession) window.addManualSession(payload); setCreateAt(null); setRefreshKey((k) => k + 1); }} />
      )}
    </div>
  );
}

function CalCreateModal({ at, exams, defaultDurationMin, onClose, onCreate }) {
  const [examId, setExamId] = React.useState(exams[0]?.id || "");
  const [topic, setTopic] = React.useState("");
  const [durationMin, setDurationMin] = React.useState(defaultDurationMin);
  const exam = exams.find((e) => e.id === examId);
  const topics = exam?.topics || [];

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--surface-card)", borderRadius: "var(--radius-2xl)", padding: 24, width: 340, boxShadow: "var(--shadow-lg)" }}>
        <h3 style={{ margin: "0 0 4px", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text-strong)" }}>Add study session</h3>
        <p style={{ margin: "0 0 16px", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{at.date} at {at.startTime}</p>

        {exams.length === 0 ? (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Add an exam first — there's nothing to attach a session to yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>Exam</label>
              <select value={examId} onChange={(e) => { setExamId(e.target.value); setTopic(""); }}
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)" }}>
                {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>Topic</label>
              {topics.length > 0 ? (
                <select value={topic} onChange={(e) => setTopic(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)" }}>
                  <option value="">Pick a topic…</option>
                  {topics.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                </select>
              ) : (
                <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Revision"
                  style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)" }} />
              )}
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>Duration — {durationMin} min</label>
              <input type="range" min={15} max={180} step={15} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--indigo-600)" }} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={onClose} style={{ flex: 1, border: "1px solid var(--border-default)", background: "var(--surface-page)", borderRadius: "var(--radius-lg)", padding: "10px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Cancel</button>
              <button onClick={() => onCreate({ examId, topic: topic || "Study session", date: at.date, startTime: at.startTime, durationMin })}
                disabled={!examId}
                style={{ flex: 1, border: "none", background: "var(--indigo-600)", color: "#fff", borderRadius: "var(--radius-lg)", padding: "10px", cursor: "pointer", fontWeight: 600, fontFamily: "var(--font-sans)" }}>Add</button>
            </div>
          </div>
        )}
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
