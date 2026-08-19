import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "./learn-store.jsx";

// Access the window-globals the module publishes — same pattern every
// other legacy-store test uses (see e.g. schedule-scheduler.test.ts).
type NodeProgress = {
  mastery: string;
  attempts: number;
  lastReviewedAt: number | null;
  interval: number;
  ease: number;
  dueAt: number | null;
};

declare global {
  interface Window {
    getLearn: () => Record<string, unknown>;
    getNodeProgress: (tax: string, nodeId: string) => NodeProgress;
    recordNodeAttempt: (
      tax: string,
      nodeId: string,
      result: { correct: number; total: number; canAdvance?: boolean },
    ) => NodeProgress;
    masteredCount: (tax: string) => number;
    migrateLearn: (raw: unknown) => Record<string, unknown>;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
// Perfect 3/3 Prove — SM-2 quality 5, the biggest ease bump per pass.
const PERFECT = { correct: 3, total: 3 };
// Below the 2/3 passMark — SM-2 quality 2, a fail.
const FAIL = { correct: 1, total: 3 };

beforeEach(() => {
  try { localStorage.clear(); } catch { /* jsdom without localStorage — never happens here, but the store guards it */ }
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
});

afterEach(() => { vi.useRealTimers(); });

describe("learn-store getNodeProgress", () => {
  it("defaults unknown nodes to unlocked / 0 attempts / no review scheduled", () => {
    const p = window.getNodeProgress("nmt", "nm-01");
    expect(p.mastery).toBe("unlocked");
    expect(p.attempts).toBe(0);
    expect(p.lastReviewedAt).toBeNull();
    expect(p.dueAt).toBeNull();
  });
});

describe("learn-store recordNodeAttempt — bronze (free, first pass)", () => {
  it("raises unlocked → bronze on first Prove pass, schedules a 1-day review", () => {
    const p = window.recordNodeAttempt("nmt", "nm-01", PERFECT);
    expect(p.mastery).toBe("bronze");
    expect(p.attempts).toBe(1);
    expect(typeof p.lastReviewedAt).toBe("number");
    expect(p.interval).toBe(1);
    expect(p.dueAt).toBe(Date.now() + DAY_MS);
  });

  it("does not award bronze on a failed first attempt", () => {
    const p = window.recordNodeAttempt("nmt", "nm-01", FAIL);
    expect(p.mastery).toBe("unlocked");
  });
});

describe("learn-store recordNodeAttempt — Silver/Gold/Legendary (Ultra, SM-2 gated)", () => {
  it("does NOT advance past bronze before the SM-2 due date, even for Ultra", () => {
    window.recordNodeAttempt("nmt", "nm-01", PERFECT); // bronze, due in 1 day
    // Same instant — nowhere near due.
    const p = window.recordNodeAttempt("nmt", "nm-01", { ...PERFECT, canAdvance: true });
    expect(p.mastery).toBe("bronze");
  });

  it("does NOT advance past bronze for a non-Ultra user even after the due date", () => {
    window.recordNodeAttempt("nmt", "nm-01", PERFECT); // due in 1 day
    vi.setSystemTime(new Date(Date.now() + DAY_MS + 1000));
    const p = window.recordNodeAttempt("nmt", "nm-01", { ...PERFECT, canAdvance: false });
    expect(p.mastery).toBe("bronze");
  });

  it("advances bronze → silver → gold → legendary, one rank per on-time Ultra pass", () => {
    window.recordNodeAttempt("nmt", "nm-01", PERFECT); // → bronze, due +1d

    vi.setSystemTime(new Date(Date.now() + DAY_MS + 1000));
    let p = window.recordNodeAttempt("nmt", "nm-01", { ...PERFECT, canAdvance: true });
    expect(p.mastery).toBe("silver");
    expect(p.interval).toBe(6); // SM-2: interval 1 → 6 on the second successful review

    vi.setSystemTime(new Date(Date.now() + p.interval * DAY_MS + 1000));
    p = window.recordNodeAttempt("nmt", "nm-01", { ...PERFECT, canAdvance: true });
    expect(p.mastery).toBe("gold");

    vi.setSystemTime(new Date(Date.now() + p.interval * DAY_MS + 1000));
    p = window.recordNodeAttempt("nmt", "nm-01", { ...PERFECT, canAdvance: true });
    expect(p.mastery).toBe("legendary");

    // Legendary is the ceiling — stays put, does not error.
    vi.setSystemTime(new Date(Date.now() + p.interval * DAY_MS + 1000));
    p = window.recordNodeAttempt("nmt", "nm-01", { ...PERFECT, canAdvance: true });
    expect(p.mastery).toBe("legendary");
  });

  it("never downgrades mastery on a later worse or failed attempt", () => {
    window.recordNodeAttempt("nmt", "nm-01", PERFECT);
    vi.setSystemTime(new Date(Date.now() + DAY_MS + 1000));
    window.recordNodeAttempt("nmt", "nm-01", { ...PERFECT, canAdvance: true }); // silver

    const p = window.recordNodeAttempt("nmt", "nm-01", { ...FAIL, canAdvance: true });
    expect(p.mastery).toBe("silver");
    expect(p.attempts).toBe(3);
  });

  it("a failed review resets the SM-2 interval to 1 day and drops ease", () => {
    window.recordNodeAttempt("nmt", "nm-01", PERFECT); // interval 1, ease 2.6
    vi.setSystemTime(new Date(Date.now() + DAY_MS + 1000));
    const before = window.recordNodeAttempt("nmt", "nm-01", { ...PERFECT, canAdvance: true }); // silver, interval 6

    const after = window.recordNodeAttempt("nmt", "nm-01", { ...FAIL, canAdvance: true });
    expect(after.interval).toBe(1);
    expect(after.ease).toBeCloseTo(before.ease - 0.2, 5);
  });

  it("scopes progress per exam taxonomy", () => {
    window.recordNodeAttempt("nmt", "nm-01", PERFECT);
    const ielts = window.getNodeProgress("ielts", "nm-01");
    expect(ielts.mastery).toBe("unlocked");
    expect(ielts.attempts).toBe(0);
  });
});

describe("learn-store masteredCount", () => {
  it("counts only bronze+ nodes", () => {
    window.recordNodeAttempt("nmt", "nm-01", PERFECT);
    window.recordNodeAttempt("nmt", "nm-02", FAIL); // stays unlocked — does not count
    expect(window.masteredCount("nmt")).toBe(1);
  });

  it("returns 0 for an exam with no progress", () => {
    expect(window.masteredCount("sat")).toBe(0);
  });
});

describe("learn-store migrateLearn", () => {
  it("filters out invalid nodes silently and backfills SM-2 fields", () => {
    const raw = {
      nmt: {
        "nm-01": { mastery: "gold", attempts: 5, lastReviewedAt: 12345 },
        "nm-02": "not an object",
        "nm-03": { mastery: "invalid-level", attempts: 1 },
      },
    };
    const out = window.migrateLearn(raw) as { nmt: Record<string, NodeProgress | undefined> };
    expect(out.nmt["nm-01"]?.mastery).toBe("gold");
    expect(out.nmt["nm-01"]?.ease).toBe(2.5); // pre-SM-2 record — backfilled to default ease
    expect(out.nmt["nm-01"]?.dueAt).toBeNull();
    expect(out.nmt["nm-02"]).toBeUndefined();
    // Invalid mastery level normalized to "unlocked" — never lost outright
    expect(out.nmt["nm-03"]?.mastery).toBe("unlocked");
  });

  it("handles null / non-object input by returning empty state", () => {
    const out = window.migrateLearn(null);
    expect(Object.keys(out).filter((k) => k !== "_v")).toHaveLength(0);
  });
});
