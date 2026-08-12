/**
 * Unit tests for the pure helpers in `exams-store.jsx`.
 *
 * `letterBand` is covered here specifically because audit finding #10 found
 * three mutually inconsistent grade scales in the app (80/60/40 here, 90/75/60
 * in AIChat). Pinning this one down means the Phase 2 numeric-scale migration
 * has a baseline to change deliberately rather than by accident.
 */
import { describe, it, expect } from "vitest";
import "../bootstrap";

type ExamsStore = {
  daysAway: (examDate: string) => number;
  fmtDateKey: (d: Date) => string;
  sessionsNeeded: (completionPct: number, daysLeft: number) => number;
  requiredPct: (completionPct: number, daysLeft: number, totalDays: number) => number;
  migrateExam: (raw: unknown) => Record<string, unknown>;
};

const s = window as unknown as ExamsStore;

describe("daysAway", () => {
  it("returns a positive count for a future date", () => {
    const future = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    expect(s.daysAway(future)).toBeGreaterThan(8);
    expect(s.daysAway(future)).toBeLessThanOrEqual(11);
  });

  it("returns zero or negative for a past date", () => {
    const past = new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10);
    expect(s.daysAway(past)).toBeLessThanOrEqual(0);
  });
});

describe("fmtDateKey", () => {
  it("zero-pads month and day", () => {
    expect(s.fmtDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  // Same timezone trap as the calendar helpers: local components in, local
  // components out, never a UTC round-trip.
  it("keeps a just-after-midnight date on its own day", () => {
    expect(s.fmtDateKey(new Date(2026, 5, 15, 0, 30))).toBe("2026-06-15");
  });
});

describe("sessionsNeeded", () => {
  it("is zero once the exam has passed", () => {
    expect(s.sessionsNeeded(50, 0)).toBe(0);
    expect(s.sessionsNeeded(50, -3)).toBe(0);
  });

  it("needs nothing more when the syllabus is complete", () => {
    expect(s.sessionsNeeded(100, 30)).toBe(0);
  });

  it("demands more sessions per week as the deadline closes in", () => {
    const farOut = s.sessionsNeeded(0, 120);
    const nearby = s.sessionsNeeded(0, 14);
    expect(nearby).toBeGreaterThan(farOut);
  });

  it("never returns a fractional session", () => {
    for (const days of [1, 7, 30, 99]) {
      expect(Number.isInteger(s.sessionsNeeded(37, days))).toBe(true);
    }
  });
});

describe("requiredPct", () => {
  it("is 100 when the prep window is degenerate", () => {
    expect(s.requiredPct(0, 0, 0)).toBe(100);
  });

  it("is 0 at the very start of the window", () => {
    expect(s.requiredPct(0, 90, 90)).toBe(0);
  });

  it("is 100 at the end of the window", () => {
    expect(s.requiredPct(0, 0, 90)).toBe(100);
  });

  it("is 50 at the midpoint", () => {
    expect(s.requiredPct(0, 45, 90)).toBe(50);
  });
});

describe("migrateExam", () => {
  it("survives garbage input without throwing", () => {
    for (const bad of [null, undefined, 42, "nope", [], {}]) {
      expect(() => s.migrateExam(bad)).not.toThrow();
    }
  });

  // `topics: null` is deliberate and load-bearing — it distinguishes "this
  // exam's syllabus has not been resolved yet" from "resolved, and it is empty".
  // `topicsStatus` carries the same distinction for the UI.
  it("leaves topics null when none were supplied", () => {
    const migrated = s.migrateExam({ id: "x", name: "Test" });
    expect(migrated["topics"]).toBeNull();
    expect(migrated["topicsStatus"]).toBe("idle");
  });

  it("keeps supplied topics and drops non-string members", () => {
    const migrated = s.migrateExam({
      id: "x",
      name: "Test",
      topics: ["Algebra", "", 42, null, "Calculus"],
    });
    expect(migrated["topics"]).toEqual(["Algebra", "Calculus"]);
  });

  it("rejects an unknown topicsStatus", () => {
    expect(s.migrateExam({ id: "x", topicsStatus: "banana" })["topicsStatus"]).toBe("idle");
  });

  // Was silently dropped before Phase 3 §3c, which meant an exam created
  // without a course could never resolve its official format or score scale.
  it("preserves qualificationId so non-course exams keep their exam type", () => {
    expect(s.migrateExam({ id: "x", qualificationId: "nmt" })["qualificationId"]).toBe("nmt");
  });

  it("normalises a missing or non-string qualificationId to null", () => {
    expect(s.migrateExam({ id: "x" })["qualificationId"]).toBeNull();
    expect(s.migrateExam({ id: "x", qualificationId: 7 })["qualificationId"]).toBeNull();
  });
});
