// AI Exam Coach — derived progress metrics computed purely from real
// persisted data (exams-store + schedule-store). No fabricated numbers: an
// empty history yields a 0 streak and all-locked achievements, not a
// placeholder figure like the hardcoded "12" this replaces in Progress.jsx.

function computeStreak() {
  const schedule = window.getSchedule ? window.getSchedule() : null;
  const sessions = (schedule && schedule.sessions) || [];
  const doneDates = new Set(sessions.filter((s) => s.status === "completed" && s.date).map((s) => s.date));
  if (doneDates.size === 0) return 0;

  const fmt = (d) => d.toISOString().slice(0, 10);
  let cursor = new Date();
  // Today not yet studied shouldn't zero out a real streak ending yesterday.
  if (!doneDates.has(fmt(cursor))) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (doneDates.has(fmt(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function computeAchievements() {
  const exams = window.getExams ? window.getExams() : [];
  const schedule = window.getSchedule ? window.getSchedule() : null;
  const sessions = (schedule && schedule.sessions) || [];
  const completedCount = sessions.filter((s) => s.status === "completed").length;
  const fullyCovered = exams.filter((e) => (e.completionPct || 0) >= 100).length;
  const streak = computeStreak();

  return [
    { id: "first_exam", emoji: "🎯", label: "Added your first exam", unlocked: exams.length >= 1 },
    { id: "five_sessions", emoji: "🔥", label: "Completed 5 study sessions", unlocked: completedCount >= 5 },
    { id: "twentyfive_sessions", emoji: "💪", label: "Completed 25 study sessions", unlocked: completedCount >= 25 },
    { id: "streak_3", emoji: "📅", label: "3-day study streak", unlocked: streak >= 3 },
    { id: "streak_7", emoji: "🏆", label: "7-day study streak", unlocked: streak >= 7 },
    { id: "full_coverage", emoji: "✅", label: "Covered 100% of an exam's topics", unlocked: fullyCovered >= 1 },
  ];
}

Object.assign(window, { computeStreak, computeAchievements });
