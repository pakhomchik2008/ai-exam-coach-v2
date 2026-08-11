/**
 * Integration tests against the real schedule-store write path, ported from the
 * old `calendar-tests.jsx`.
 *
 * These matter more than the pure date helpers: they cover the two ways a
 * student silently loses work — two manual sessions colliding on one id, and a
 * hand-placed session being wiped by an automatic replan.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "../bootstrap";

interface Session {
  id: string;
  examId: string;
  date: string;
  startTime: string;
  manual?: boolean;
}

interface Exam {
  id: string;
  name: string;
  topicCount: number;
  [key: string]: unknown;
}

type Store = {
  addManualSession: (s: Record<string, unknown>) => void;
  getSchedule: () => { sessions: Session[] };
  deleteSession: (id: string) => void;
  getExams: () => Exam[];
  saveExams: (exams: Exam[]) => void;
};

const store = window as unknown as Store;

const EXAM_ID = "__test_schedule_store__";
let originalExams: Exam[];

beforeEach(() => {
  originalExams = store.getExams();
});

afterEach(() => {
  // Restoring the original exam list also drops this test's sessions, via
  // reconcileSchedule's removed-exam path.
  store.saveExams(originalExams);
  store
    .getSchedule()
    .sessions.filter((s) => s.examId === EXAM_ID)
    .forEach((s) => store.deleteSession(s.id));
});

describe("addManualSession", () => {
  it("gives two sessions created in the same tick distinct ids", () => {
    const payload = {
      examId: EXAM_ID,
      date: "2026-06-01",
      startTime: "09:00",
      durationMin: 30,
    };
    store.addManualSession({ ...payload, topic: "t1" });
    store.addManualSession({ ...payload, topic: "t2" });

    const created = store.getSchedule().sessions.filter((s) => s.examId === EXAM_ID);

    expect(created).toHaveLength(2);
    expect(created[0]!.id).not.toBe(created[1]!.id);
  });
});

describe("reconcileSchedule", () => {
  it("keeps a hand-placed session at its exact slot through an automatic replan", () => {
    const examDate = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
    store.saveExams([
      ...originalExams,
      {
        id: EXAM_ID,
        name: "Test Exam",
        color: "#6366F1",
        examDate,
        examBoard: "Custom",
        topicCount: 3,
        completionPct: 0,
        confidencePct: 50,
        targetGrade: "A",
        topics: ["A", "B", "C"],
      },
    ]);

    store.addManualSession({
      examId: EXAM_ID,
      topic: "Hand-placed",
      date: "2026-06-10",
      startTime: "14:00",
      durationMin: 60,
    });

    const before = store.getSchedule().sessions.find((s) => s.examId === EXAM_ID && s.manual);
    expect(before, "manual session should exist before the replan").toBeDefined();

    // Changing topicCount is what triggers reconcileSchedule's replanning path.
    store.saveExams(
      store.getExams().map((e) => (e.id === EXAM_ID ? { ...e, topicCount: 5 } : e)),
    );

    const after = store.getSchedule().sessions.find((s) => s.id === before!.id);
    expect(after, "manual session should survive the replan").toBeDefined();
    expect(after!.date).toBe("2026-06-10");
    expect(after!.startTime).toBe("14:00");
  });
});
