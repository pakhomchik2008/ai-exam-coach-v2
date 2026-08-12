import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ATTEMPTS_KEY, getAttempts, recordAttempt, attemptsFor, scaledScoreFor, scoreTrend } from "./exam-attempts";

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
});

const base = { mode: "real" as const, correct: 8, total: 10, examId: "e1", examName: "Maths" };

describe("recordAttempt", () => {
  it("stores an attempt and reports no previous one on the first go", () => {
    const { attempt, previous } = recordAttempt(base);
    expect(attempt.scorePct).toBe(80);
    expect(previous).toBeNull();
    expect(getAttempts()).toHaveLength(1);
  });

  it("returns the prior attempt for the same exam and mode", () => {
    recordAttempt({ ...base, correct: 5 });
    const { previous } = recordAttempt({ ...base, correct: 9 });
    expect(previous?.scorePct).toBe(50);
  });

  it("does not compare across modes", () => {
    recordAttempt({ ...base, mode: "practice", correct: 5 });
    const { previous } = recordAttempt({ ...base, mode: "real", correct: 9 });
    expect(previous).toBeNull();
  });

  it("does not compare across exams", () => {
    recordAttempt({ ...base, examId: "e2", correct: 5 });
    const { previous } = recordAttempt({ ...base, examId: "e1", correct: 9 });
    expect(previous).toBeNull();
  });

  it("collapses an immediate duplicate record instead of appending a phantom attempt", () => {
    recordAttempt(base);
    recordAttempt(base);
    expect(getAttempts()).toHaveLength(1);
  });

  it("keeps a genuine repeat of the same score once the dedupe window has passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-11T10:00:00Z"));
    recordAttempt(base);
    vi.setSystemTime(new Date("2026-08-11T10:05:00Z"));
    recordAttempt(base);
    expect(getAttempts()).toHaveLength(2);
  });

  it("does not persist an attempt with no questions, and still reports a score of zero", () => {
    const { attempt } = recordAttempt({ ...base, correct: 0, total: 0 });
    expect(attempt.scorePct).toBe(0);
    expect(getAttempts()).toHaveLength(0);
  });

  it("caps stored history rather than growing without bound", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 130; i++) {
      vi.setSystemTime(new Date(Date.UTC(2026, 0, 1) + i * 60_000));
      recordAttempt({ ...base, correct: i % 11 });
    }
    expect(getAttempts().length).toBeLessThanOrEqual(120);
  });

  it("survives corrupted storage without throwing", () => {
    localStorage.setItem(ATTEMPTS_KEY, "{not json");
    expect(getAttempts()).toEqual([]);
    expect(() => recordAttempt(base)).not.toThrow();
  });

  it("drops malformed rows on read instead of surfacing them as attempts", () => {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify([{ id: "x", total: 0 }, { nope: true }]));
    expect(getAttempts()).toEqual([]);
  });
});

describe("attemptsFor", () => {
  it("returns newest first, scoped to one exam and mode", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-11T10:00:00Z"));
    recordAttempt({ ...base, correct: 4 });
    vi.setSystemTime(new Date("2026-08-11T11:00:00Z"));
    recordAttempt({ ...base, correct: 7 });
    vi.setSystemTime(new Date("2026-08-11T12:00:00Z"));
    recordAttempt({ ...base, examId: "other", correct: 1 });
    expect(attemptsFor("e1", "real").map((a) => a.scorePct)).toEqual([70, 40]);
  });
});

describe("scoreTrend", () => {
  it("reads oldest to newest so the line moves forward in time", () => {
    vi.useFakeTimers();
    [3, 6, 9].forEach((c, i) => {
      vi.setSystemTime(new Date(Date.UTC(2026, 0, 1) + i * 3_600_000));
      recordAttempt({ ...base, correct: c });
    });
    expect(scoreTrend("e1", "real")).toEqual([30, 60, 90]);
  });

  it("is empty when nothing has been attempted", () => {
    expect(scoreTrend("e1", "real")).toEqual([]);
  });
});

describe("scaledScoreFor", () => {
  it("projects onto the exam's real scale", () => {
    // НМТ runs 100–200, so a 50% attempt lands mid-scale at 150.
    const s = scaledScoreFor({ scorePct: 50, taxonomy: "nmt" });
    expect(s.value).toBe(150);
    expect(s.approximate).toBe(false);
  });

  it("snaps to a step the real exam can actually report", () => {
    // IELTS reports half bands only — 0..9 at 0.5.
    const s = scaledScoreFor({ scorePct: 77, taxonomy: "ielts" });
    expect(s.value % 0.5).toBe(0);
    expect(s.approximate).toBe(false);
  });

  it("flags the generic 0-100 fallback as approximate", () => {
    const s = scaledScoreFor({ scorePct: 64, taxonomy: null });
    expect(s.approximate).toBe(true);
    expect(s.value).toBe(64);
  });
});
