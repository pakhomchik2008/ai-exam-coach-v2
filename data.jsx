// AI Exam Coach — shared mock data for the UI kit
// COURSES/TODAY_SESSIONS used to be hardcoded demo content. They're now derived
// live from real exams (exams-store.jsx) via buildScheduleData()/deriveCourses().
// MASTERY/WEAKNESS_ALERTS below stay as empty skeletons — neither has a real
// underlying data source yet (per-topic study history), and fabricating one
// would reintroduce the fake-data problem already removed. WEEK is the
// exception: it's now derived from the real persisted schedule (see
// deriveWeek()). WEEKLY_REVIEW/SIMULATIONS were removed along with the
// Weekly Review and Success Simulation screens, which were unreachable and
// had no real data source either.

const MASTERY = [];

const WEAKNESS_ALERTS = [];

// buildScheduleData() now just composes the persisted schedule store with the
// live exam-derived courses — same name/signature/shape every existing
// consumer (Dashboard.jsx, Schedule.jsx, AIChat.jsx) already expects, so no
// consumer needed to change for the schedule to become persisted instead of
// regenerated from scratch on every call.
function buildScheduleData() {
  const schedule = window.getSchedule();
  const courses = window.deriveCourses(window.getExams());
  return window.buildScheduleView(schedule, courses);
}

// Real "scheduled" counts per weekday (Mon-Sun, current week) from the
// persisted schedule. "Completed" stays honest at whatever's actually been
// marked done via markSessionCompleted() — never fabricated.
function deriveWeek(labels) {
  const { sessionsByDay } = buildScheduleData();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(monday.getDate() - ((today.getDay() + 6) % 7)); // back up to this week's Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(d.getDate() + i);
    const key = window.fmtDateKey(d);
    const sessions = sessionsByDay[key] || [];
    return {
      label: labels ? labels[i] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
      date: d.getDate(),
      scheduled: sessions.length,
      completed: sessions.filter((s) => s.status === "completed").length,
      today: window.fmtDateKey(d) === window.fmtDateKey(today),
      sessions,
    };
  });
}

Object.assign(window, { MASTERY, WEAKNESS_ALERTS, buildScheduleData, deriveWeek });
