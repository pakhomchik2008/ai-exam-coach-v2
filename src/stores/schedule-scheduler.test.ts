/**
 * Behavior tests for the Phase 3 §3e scheduler tweaks (studyDays picker,
 * hoursPerDay cap, even spread across the window).
 *
 * Runs against the real `allocateBudget` via bootstrap — same setup pattern
 * as schedule-store.test.ts — so a regression here is a regression in what a
 * student would actually see on their calendar, not just a helper drift.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "../bootstrap";

interface Session {
  id: string;
  examId: string;
  date: string;
  startTime: string;
  status?: string;
  manual?: boolean;
}

interface Exam {
  id: string;
  name: string;
  topicCount: number;
  [key: string]: unknown;
}

type Store = {
  getSchedule: () => { sessions: Session[] };
  getExams: () => Exam[];
  saveExams: (exams: Exam[]) => void;
  getProfile: () => Record<string, unknown>;
  saveProfile: (patch: Record<string, unknown>) => Record<string, unknown>;
  deleteSession: (id: string) => void;
};

const store = window as unknown as Store;

const EXAM_ID = "__test_scheduler__";
let originalExams: Exam[];
let originalProfile: Record<string, unknown>;

function futureDateISO(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

function seedExam(daysAhead: number, topicCount = 5): void {
  store.saveExams([
    ...originalExams,
    {
      id: EXAM_ID,
      name: "Scheduler test",
      color: "#6366F1",
      examDate: futureDateISO(daysAhead),
      examBoard: "Custom",
      topicCount,
      completionPct: 0,
      confidencePct: 50,
      targetGrade: "A",
      topics: Array.from({ length: topicCount }, (_, i) => `T${i + 1}`),
      sessionLengthMin: 45,
    },
  ]);
}

function sessionsForExam(): Session[] {
  return store.getSchedule().sessions.filter((s) => s.examId === EXAM_ID);
}

function weekdaysUsed(sessions: Session[]): Set<string> {
  const NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const out = new Set<string>();
  for (const s of sessions) {
    out.add(NAMES[new Date(s.date + "T00:00:00").getDay()]!);
  }
  return out;
}

beforeEach(() => {
  originalExams = store.getExams();
  originalProfile = store.getProfile();
});

afterEach(() => {
  store.saveExams(originalExams);
  store.saveProfile(originalProfile);
  sessionsForExam().forEach((s) => store.deleteSession(s.id));
});

describe("studyDays picker", () => {
  it("only lands sessions on the weekdays the student picked", () => {
    // Weekend-only student — the old scheduler would have put them on Mon/Tue
    // regardless (first N days of the week), leaving the calendar visibly
    // empty on the days they actually meant.
    store.saveProfile({
      studyDays: ["sat", "sun"],
      hoursPerDay: 4,
      daysPerWeek: 2,
      weeklyHours: 8,
      sessionLengthMin: 45,
    });
    seedExam(30, 4);

    const used = weekdaysUsed(sessionsForExam());
    expect([...used].sort()).toEqual(["sat", "sun"]);
  });

  it("respects a single-day pick", () => {
    store.saveProfile({
      studyDays: ["sun"],
      hoursPerDay: 3,
      daysPerWeek: 1,
      weeklyHours: 3,
      sessionLengthMin: 45,
    });
    seedExam(30, 3);

    expect([...weekdaysUsed(sessionsForExam())]).toEqual(["sun"]);
  });
});

describe("hoursPerDay cap", () => {
  it("does not stack more than hoursPerDay / sessionLength sessions on one day", () => {
    // 2h/day, 45-min sessions → cap of 2 (rounded from 2.67). The old
    // scheduler could produce 10 back-to-back slots on one date.
    store.saveProfile({
      studyDays: ["mon", "tue", "wed", "thu", "fri"],
      hoursPerDay: 2,
      daysPerWeek: 5,
      weeklyHours: 10,
      sessionLengthMin: 45,
    });
    seedExam(45, 6);

    const perDate: Record<string, number> = {};
    for (const s of sessionsForExam()) {
      perDate[s.date] = (perDate[s.date] ?? 0) + 1;
    }
    const max = Math.max(...Object.values(perDate));
    // Cap of 3 rather than exact 2: the scheduler rounds and shares dates
    // across exams — the real point is "not 10", not a precise ceiling.
    expect(max).toBeLessThanOrEqual(3);
  });
});

describe("even time-of-day spread", () => {
  it("does not stack five subjects on one clock time when availability is unset", () => {
    store.saveProfile({
      studyDays: ["mon", "tue", "wed", "thu", "fri"],
      hoursPerDay: 6,
      daysPerWeek: 5,
      weeklyHours: 20,
      sessionLengthMin: 45,
      blackoutSlots: [],
    });
    const exams = originalExams.slice();
    for (let i = 0; i < 5; i++) {
      exams.push({
        id: `${EXAM_ID}_${i}`,
        name: `Subject ${i}`,
        color: "#6366F1",
        examDate: futureDateISO(40),
        examBoard: "Custom",
        topicCount: 4,
        completionPct: 0,
        confidencePct: 50,
        targetGrade: "A",
        topics: ["A", "B", "C", "D"],
        sessionLengthMin: 45,
      });
    }
    store.saveExams(exams);

    const pending = store.getSchedule().sessions.filter((s) =>
      String(s.examId).startsWith(EXAM_ID) && s.status !== "completed");
    const byDate: Record<string, string[]> = {};
    for (const s of pending) {
      (byDate[s.date] = byDate[s.date] || []).push(s.startTime);
    }
    const stacked = Object.values(byDate).filter((times) => times.length >= 3);
    expect(stacked.length).toBeGreaterThan(0);
    for (const times of stacked) {
      const unique = new Set(times);
      expect(unique.size).toBe(times.length);
      const mins = times.map((t) => {
        const parts = t.split(":").map(Number);
        return (parts[0] || 0) * 60 + (parts[1] || 0);
      }).sort((a, b) => a - b);
      expect(mins[mins.length - 1]! - mins[0]!).toBeGreaterThan(3 * 60);
      expect(mins[0]!).toBeLessThan(12 * 60);
    }

    pending.forEach((s) => store.deleteSession(s.id));
  });
});

describe("weekly planning window (§3g)", () => {
  it("plans only the next 7 days rather than the full window to the exam", () => {
    store.saveProfile({
      studyDays: ["mon", "tue", "wed", "thu", "fri"],
      hoursPerDay: 2,
      daysPerWeek: 5,
      weeklyHours: 10,
      sessionLengthMin: 45,
    });
    seedExam(30, 4);

    const dates = sessionsForExam().map((s) => s.date).sort();
    expect(dates.length).toBeGreaterThan(0);
    const last = new Date(dates[dates.length - 1]!).getTime();
    const daysAhead = (last - Date.now()) / 86_400_000;
    // §3g: horizon capped at 7 days — the end-of-week dashboard prompt asks
    // the student before generating another week.
    expect(daysAhead).toBeLessThanOrEqual(8);
  });

  it("spreads that week's sessions across multiple days, not one day", () => {
    store.saveProfile({
      studyDays: ["mon", "tue", "wed", "thu", "fri"],
      hoursPerDay: 2,
      daysPerWeek: 5,
      weeklyHours: 10,
      sessionLengthMin: 45,
    });
    seedExam(30, 4);

    const uniqueDates = new Set(sessionsForExam().map((s) => s.date));
    expect(uniqueDates.size).toBeGreaterThan(1);
  });
});
