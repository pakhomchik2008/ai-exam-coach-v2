// AI Exam Coach — automated regression tests for StudyCalendar.jsx +
// schedule-store.jsx's date/time engine. This app has no build step (Babel
// standalone, no npm/jest), so this is a dependency-free assertion runner
// exposed as window.runCalendarTests() — run it from the browser console,
// or headlessly via a preview_eval call. It never runs on its own; loading
// this file only defines the function.
//
// Covers exactly the bug classes that matter for a drag/resize calendar:
// day-index math (the actual root cause of the Wednesday→Saturday bug),
// timezone-safe date formatting, week-start (Monday) computation across a
// full year including both 2026 DST transitions, minute/snap round-trips,
// and two integration tests against the real schedule-store.jsx write path
// (manual-session id uniqueness, manual sessions surviving a replan).

function runCalendarTests() {
  const results = [];
  function assert(name, cond, detail) {
    results.push({ name, pass: !!cond, detail: detail || "" });
  }
  function assertEqual(name, actual, expected) {
    assert(name, actual === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }

  // ── day-index math (the Wednesday→Saturday bug) ──────────────────────────
  // A week row is 7 equal columns of width `colWidth`. Clicking/dragging at
  // pixel offset `offsetX` from the row's left edge must land on
  // floor(offsetX / colWidth), clamped to 0-6 — NOT floor((offsetX/colWidth)*7),
  // which is the exact regression this suite guards against.
  if (window.calDayIndexFromOffset) {
    const COL = 172; // an arbitrary but realistic column width in px
    assertEqual("dayIndex: start of Monday's column → 0", window.calDayIndexFromOffset(5, COL), 0);
    assertEqual("dayIndex: mid Wednesday's column (idx 2) → 2", window.calDayIndexFromOffset(2.5 * COL, COL), 2);
    assertEqual("dayIndex: mid Saturday's column (idx 5) → 5, not clamped to Sunday", window.calDayIndexFromOffset(5.5 * COL, COL), 5);
    assertEqual("dayIndex: exact boundary between Fri/Sat → 5", window.calDayIndexFromOffset(5 * COL, COL), 5);
    assertEqual("dayIndex: just past end of week → clamped to 6 (Sunday)", window.calDayIndexFromOffset(7.9 * COL, COL), 6);
    assertEqual("dayIndex: negative offset → clamped to 0 (Monday)", window.calDayIndexFromOffset(-40, COL), 0);
  } else {
    assert("calDayIndexFromOffset exists", false, "not exposed on window — StudyCalendar.jsx may not be loaded");
  }

  // ── date formatting is timezone-safe (local components, no UTC round-trip) ─
  if (window.calFmtDate) {
    const d = new Date(2026, 0, 5); // Jan 5 2026, local midnight
    assertEqual("calFmtDate: zero-pads month/day", window.calFmtDate(d), "2026-01-05");
    const dEnd = new Date(2026, 11, 31);
    assertEqual("calFmtDate: year boundary", window.calFmtDate(dEnd), "2026-12-31");
    // A date built from local y/m/d components must format back to those
    // exact components — this fails if any code path routes through
    // toISOString()/UTC getters, which can shift the date by a day near
    // midnight depending on the browser's timezone offset.
    for (let m = 0; m < 12; m++) {
      const probe = new Date(2026, m, 15, 0, 30); // 00:30 local — the classic UTC-shift trap
      const key = window.calFmtDate(probe);
      assert(`calFmtDate: month ${m + 1} at 00:30 local stays on day 15`, key.endsWith("-15"), `got ${key}`);
    }
  }

  // ── week-start (Monday) computation, incl. both 2026 DST transitions ─────
  if (window.calMondayOf) {
    // Every day of a year must map to a Monday with hours reset to 0 —
    // this must hold across DST transitions too, since setDate() (used
    // internally) operates on local calendar days, not raw millisecond
    // offsets, and is immune to the "add 86400000ms" DST trap.
    let allMonday = true, allMidnight = true, failDate = null;
    const probeDates = [
      new Date(2026, 2, 8),   // around US spring-forward (Mar 8 2026)
      new Date(2026, 2, 29),  // around EU spring-forward (Mar 29 2026)
      new Date(2026, 9, 25),  // around EU fall-back (Oct 25 2026)
      new Date(2026, 10, 1),  // around US fall-back (Nov 1 2026)
    ];
    for (let i = 0; i < 365; i++) {
      const d = new Date(2026, 0, 1 + i);
      const mon = window.calMondayOf(d);
      if (mon.getDay() !== 1) { allMonday = false; failDate = d; break; }
      if (mon.getHours() !== 0 || mon.getMinutes() !== 0) { allMidnight = false; failDate = d; break; }
    }
    assert("calMondayOf: always returns a Monday, every day of 2026", allMonday, failDate ? `failed on ${failDate}` : "");
    assert("calMondayOf: always resets to local midnight", allMidnight, failDate ? `failed on ${failDate}` : "");
    probeDates.forEach((d) => {
      const mon = window.calMondayOf(d);
      assertEqual(`calMondayOf: DST-adjacent date ${window.calFmtDate(d)} → Monday`, mon.getDay(), 1);
    });
  }

  // ── minute/time round-trips ────────────────────────────────────────────
  if (window.calMinutesOf && window.calHHMM) {
    assertEqual("calMinutesOf('09:30')", window.calMinutesOf("09:30"), 570);
    assertEqual("calMinutesOf('') falls back to 17:00", window.calMinutesOf(""), 1020);
    assertEqual("calHHMM(570) → '09:30'", window.calHHMM(570), "09:30");
    assertEqual("calHHMM clamps negative to 00:00", window.calHHMM(-15), "00:00");
    assertEqual("calHHMM clamps past midnight to 23:59", window.calHHMM(24 * 60 + 30), "23:59");
    // Round-trip: HH:MM → minutes → HH:MM must be stable for any on-the-hour
    // or on-the-15 value (the only granularity the UI ever produces).
    for (let m = 0; m < 24 * 60; m += 15) {
      const hhmm = window.calHHMM(m);
      assertEqual(`round-trip ${hhmm}`, window.calMinutesOf(hhmm), m);
    }
  }

  // ── 15-minute snap ─────────────────────────────────────────────────────
  if (window.calSnap) {
    assertEqual("calSnap(37) → 30", window.calSnap(37), 30);
    assertEqual("calSnap(38) → 45", window.calSnap(38), 45);
    assertEqual("calSnap(0) → 0", window.calSnap(0), 0);
    assertEqual("calSnap(682) → 675", window.calSnap(682), 675);
  }

  // ── integration: manual session id uniqueness (real store write path) ───
  if (window.addManualSession && window.getSchedule && window.deleteSession) {
    const examId = "__test_cal_ids__";
    const before = window.getSchedule().sessions.length;
    window.addManualSession({ examId, topic: "t1", date: "2026-06-01", startTime: "09:00", durationMin: 30 });
    window.addManualSession({ examId, topic: "t2", date: "2026-06-01", startTime: "09:00", durationMin: 30 });
    const created = window.getSchedule().sessions.filter((s) => s.examId === examId);
    assertEqual("addManualSession: two rapid calls create two sessions", created.length, 2);
    assert("addManualSession: ids are unique", created.length === 2 && created[0].id !== created[1].id, JSON.stringify(created.map((s) => s.id)));
    created.forEach((s) => window.deleteSession(s.id));
    assertEqual("cleanup: test sessions removed", window.getSchedule().sessions.filter((s) => s.examId === examId).length, 0);
    void before;
  }

  // ── integration: manual sessions survive a replan ────────────────────────
  if (window.saveExams && window.getExams && window.addManualSession && window.getSchedule && window.saveProfile) {
    const examId = "__test_cal_manual_survives__";
    const originalExams = window.getExams();
    try {
      window.saveExams([...originalExams, {
        id: examId, name: "Test Exam", color: "#6366F1",
        examDate: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10),
        examBoard: "Custom", topicCount: 3, completionPct: 0, confidencePct: 50, targetGrade: "A",
        topics: ["A", "B", "C"],
      }]);
      window.addManualSession({ examId, topic: "Hand-placed", date: "2026-06-10", startTime: "14:00", durationMin: 60 });
      const manualBefore = window.getSchedule().sessions.find((s) => s.examId === examId && s.manual);
      assert("manual session created before replan", !!manualBefore);

      // Trigger reconcileSchedule's replanning path by changing this exam's topicCount.
      const exams = window.getExams();
      window.saveExams(exams.map((e) => e.id === examId ? { ...e, topicCount: 5 } : e));

      const manualAfter = window.getSchedule().sessions.find((s) => s.id === manualBefore?.id);
      assert("manual session survives reconcileSchedule replan", !!manualAfter && manualAfter.date === "2026-06-10" && manualAfter.startTime === "14:00");
    } finally {
      // cleanup — restore original exam list, which also drops this test's sessions via reconcileSchedule's removed-exam path
      window.saveExams(originalExams);
    }
  }

  const failed = results.filter((r) => !r.pass);
  const summary = { total: results.length, passed: results.length - failed.length, failed: failed.length, failures: failed };
  const label = failed.length === 0 ? "✅ ALL PASS" : `❌ ${failed.length} FAILED`;
  console.log(`[calendar-tests] ${label} — ${summary.passed}/${summary.total}`, failed.length ? failed : "");
  return summary;
}

window.runCalendarTests = runCalendarTests;
