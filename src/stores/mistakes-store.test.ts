/**
 * Mistake journal: normalisation on read/write, and the spaced-repetition
 * review queue that decides what a student is shown next.
 *
 * `migrateMistake` returning `null` is the store's only defence against a
 * corrupted or half-written localStorage entry taking down the journal screen,
 * so the rejection cases matter as much as the happy path.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "../bootstrap";

interface Mistake {
  id: string;
  topic: string;
  question: string;
  status: "pending" | "recovered";
  wrongCount: number;
  retryCount: number;
  nextReviewAt: number;
  confidence: number | null;
  recoveredAt: number | null;
}

type Api = {
  migrateMistake: (raw: unknown) => Mistake | null;
  getMistakes: () => Mistake[];
  clearAllMistakes: () => void;
  logMistake: (m: Record<string, unknown>) => void;
  recordMistakeRetry: (id: string, opts: { correct: boolean }) => Mistake | null;
  computeReviewQueue: () => Record<"overdue" | "dueToday" | "dueTomorrow" | "later", Mistake[]>;
  MISTAKES_KEY: string;
  getSchedule: () => { sessions: { notes: string; topic: string; date: string; examId: string; status: string; id: string }[] };
  deleteSession: (id: string) => void;
  fmtDateKey: (d: Date) => string;
};

const api = window as unknown as Api;
const DAY_MS = 86_400_000;

const valid = (over: Record<string, unknown> = {}) => ({
  id: "m1",
  question: "2 + 2 = ?",
  ...over,
});

describe("migrateMistake — rejection", () => {
  it.each([null, undefined, 42, "str", []])("rejects %p", (bad) => {
    expect(api.migrateMistake(bad)).toBeNull();
  });

  it("rejects an entry with no id", () => {
    expect(api.migrateMistake({ question: "q" })).toBeNull();
    expect(api.migrateMistake({ id: "", question: "q" })).toBeNull();
  });

  it("rejects an entry with no question", () => {
    expect(api.migrateMistake({ id: "m1" })).toBeNull();
    expect(api.migrateMistake({ id: "m1", question: "" })).toBeNull();
  });
});

describe("migrateMistake — defaults", () => {
  it("defaults an absent topic to General", () => {
    expect(api.migrateMistake(valid())!.topic).toBe("General");
  });

  it("starts wrongCount at 1 — the original wrong answer counts", () => {
    expect(api.migrateMistake(valid())!.wrongCount).toBe(1);
    expect(api.migrateMistake(valid({ wrongCount: 0 }))!.wrongCount).toBe(1);
    expect(api.migrateMistake(valid({ wrongCount: 4 }))!.wrongCount).toBe(4);
  });

  it("starts retryCount at 0", () => {
    expect(api.migrateMistake(valid())!.retryCount).toBe(0);
    expect(api.migrateMistake(valid({ retryCount: -3 }))!.retryCount).toBe(0);
  });

  it("treats any status other than recovered as pending", () => {
    expect(api.migrateMistake(valid())!.status).toBe("pending");
    expect(api.migrateMistake(valid({ status: "banana" }))!.status).toBe("pending");
    expect(api.migrateMistake(valid({ status: "recovered" }))!.status).toBe("recovered");
  });

  it("clears recoveredAt on a pending entry", () => {
    expect(api.migrateMistake(valid({ recoveredAt: 123 }))!.recoveredAt).toBeNull();
  });

  it("accepts confidence only within 1–5", () => {
    expect(api.migrateMistake(valid({ confidence: 3 }))!.confidence).toBe(3);
    expect(api.migrateMistake(valid({ confidence: 0 }))!.confidence).toBeNull();
    expect(api.migrateMistake(valid({ confidence: 6 }))!.confidence).toBeNull();
    expect(api.migrateMistake(valid({ confidence: "4" }))!.confidence).toBeNull();
  });

  it("schedules the first review a day after it was logged", () => {
    const at = Date.UTC(2026, 0, 1);
    expect(api.migrateMistake(valid({ at }))!.nextReviewAt).toBe(at + DAY_MS);
  });
});

describe("computeReviewQueue", () => {
  let saved: string | null;

  beforeEach(() => {
    saved = localStorage.getItem(api.MISTAKES_KEY);
    api.clearAllMistakes();
  });

  afterEach(() => {
    if (saved === null) localStorage.removeItem(api.MISTAKES_KEY);
    else localStorage.setItem(api.MISTAKES_KEY, saved);
  });

  /** Writes mistakes straight to storage so nextReviewAt can be controlled. */
  function seed(entries: Record<string, unknown>[]): void {
    localStorage.setItem(api.MISTAKES_KEY, JSON.stringify(entries));
  }

  it("is empty with no mistakes", () => {
    const q = api.computeReviewQueue();
    expect(q.overdue).toHaveLength(0);
    expect(q.dueToday).toHaveLength(0);
  });

  it("buckets by calendar day, not by raw timestamp", () => {
    const now = Date.now();
    seed([
      { id: "a", question: "q", nextReviewAt: now - 3 * DAY_MS },
      { id: "b", question: "q", nextReviewAt: now },
      { id: "c", question: "q", nextReviewAt: now + DAY_MS },
      { id: "d", question: "q", nextReviewAt: now + 9 * DAY_MS },
    ]);

    const q = api.computeReviewQueue();
    expect(q.overdue.map((m) => m.id)).toEqual(["a"]);
    expect(q.dueToday.map((m) => m.id)).toEqual(["b"]);
    expect(q.dueTomorrow.map((m) => m.id)).toEqual(["c"]);
    expect(q.later.map((m) => m.id)).toEqual(["d"]);
  });

  it("excludes recovered mistakes from every bucket", () => {
    const now = Date.now();
    seed([
      { id: "a", question: "q", nextReviewAt: now - DAY_MS, status: "recovered" },
      { id: "b", question: "q", nextReviewAt: now - DAY_MS },
    ]);

    const q = api.computeReviewQueue();
    expect(q.overdue.map((m) => m.id)).toEqual(["b"]);
  });

  it("drops corrupt entries instead of throwing", () => {
    seed([{ id: "ok", question: "q" }, null as never, { id: "" } as never, 42 as never]);
    expect(() => api.computeReviewQueue()).not.toThrow();
    expect(api.getMistakes()).toHaveLength(1);
  });
});

describe("logMistake dates a calendar block", () => {
  beforeEach(() => {
    api.clearAllMistakes();
    api.getSchedule().sessions
      .filter((s) => s.notes === "mistake-review")
      .forEach((s) => api.deleteSession(s.id));
  });

  afterEach(() => {
    api.clearAllMistakes();
    api.getSchedule().sessions
      .filter((s) => s.notes === "mistake-review")
      .forEach((s) => api.deleteSession(s.id));
  });

  it("places a pending review on nextReviewAt", () => {
    api.logMistake({ topic: "Quadratics", question: "x^2 = 0?", examId: "exam-q" });
    const miss = api.getMistakes()[0];
    expect(miss).toBeDefined();
    const date = api.fmtDateKey(new Date(miss!.nextReviewAt));
    const hits = api.getSchedule().sessions.filter((s) => s.notes === "mistake-review");
    expect(hits).toHaveLength(1);
    expect(hits[0]!.date).toBe(date);
    expect(hits[0]!.topic).toBe("Review: Quadratics");
    expect(hits[0]!.examId).toBe("exam-q");
    expect(hits[0]!.status).toBe("pending");
  });

  it("does not stack a second block for the same topic", () => {
    api.logMistake({ topic: "Quadratics", question: "q1", examId: "exam-q" });
    api.logMistake({ topic: "Quadratics", question: "q2", examId: "exam-q" });
    const hits = api.getSchedule().sessions.filter((s) => s.notes === "mistake-review" && s.topic === "Review: Quadratics");
    expect(hits).toHaveLength(1);
  });

  it("drops the block when the last miss on that topic is recovered", () => {
    api.logMistake({ topic: "Quadratics", question: "q1", examId: "exam-q" });
    const miss = api.getMistakes()[0]!;
    api.recordMistakeRetry(miss.id, { correct: true });
    const hits = api.getSchedule().sessions.filter((s) => s.notes === "mistake-review" && s.topic === "Review: Quadratics");
    expect(hits).toHaveLength(0);
  });
});
