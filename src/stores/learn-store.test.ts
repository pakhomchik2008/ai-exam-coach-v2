import { describe, it, expect, beforeEach } from "vitest";
import "./learn-store.jsx";

// Access the window-globals the module publishes — same pattern every
// other legacy-store test uses (see e.g. schedule-scheduler.test.ts).
declare global {
  interface Window {
    getLearn: () => Record<string, unknown>;
    getNodeProgress: (tax: string, nodeId: string) => { mastery: string; attempts: number; lastReviewedAt: number | null };
    recordNodeAttempt: (tax: string, nodeId: string, mastery: string) => { mastery: string; attempts: number; lastReviewedAt: number | null };
    masteredCount: (tax: string) => number;
    migrateLearn: (raw: unknown) => Record<string, unknown>;
  }
}

beforeEach(() => {
  try { localStorage.clear(); } catch { /* jsdom without localStorage — never happens here, but the store guards it */ }
});

describe("learn-store getNodeProgress", () => {
  it("defaults unknown nodes to unlocked / 0 attempts", () => {
    const p = window.getNodeProgress("nmt", "nm-01");
    expect(p.mastery).toBe("unlocked");
    expect(p.attempts).toBe(0);
    expect(p.lastReviewedAt).toBeNull();
  });
});

describe("learn-store recordNodeAttempt", () => {
  it("raises unlocked → bronze on first Prove pass", () => {
    const p = window.recordNodeAttempt("nmt", "nm-01", "bronze");
    expect(p.mastery).toBe("bronze");
    expect(p.attempts).toBe(1);
    expect(typeof p.lastReviewedAt).toBe("number");
  });

  it("does NOT downgrade mastery on a later worse attempt", () => {
    window.recordNodeAttempt("nmt", "nm-01", "gold");
    const p = window.recordNodeAttempt("nmt", "nm-01", "bronze");
    // Kept at gold — retry should never reduce a mastered state
    expect(p.mastery).toBe("gold");
    expect(p.attempts).toBe(2);
  });

  it("upgrades in order: unlocked → bronze → silver → gold → legendary", () => {
    expect(window.recordNodeAttempt("nmt", "nm-02", "bronze").mastery).toBe("bronze");
    expect(window.recordNodeAttempt("nmt", "nm-02", "silver").mastery).toBe("silver");
    expect(window.recordNodeAttempt("nmt", "nm-02", "gold").mastery).toBe("gold");
    expect(window.recordNodeAttempt("nmt", "nm-02", "legendary").mastery).toBe("legendary");
  });

  it("scopes progress per exam taxonomy", () => {
    window.recordNodeAttempt("nmt", "nm-01", "bronze");
    const ielts = window.getNodeProgress("ielts", "nm-01");
    expect(ielts.mastery).toBe("unlocked");
    expect(ielts.attempts).toBe(0);
  });

  it("increments attempts even when mastery stays flat", () => {
    window.recordNodeAttempt("nmt", "nm-03", "gold");
    const p = window.recordNodeAttempt("nmt", "nm-03", "gold");
    expect(p.attempts).toBe(2);
    expect(p.mastery).toBe("gold");
  });
});

describe("learn-store masteredCount", () => {
  it("counts only bronze+ nodes", () => {
    window.recordNodeAttempt("nmt", "nm-01", "bronze");
    window.recordNodeAttempt("nmt", "nm-02", "silver");
    window.recordNodeAttempt("nmt", "nm-03", "unlocked"); // does not count
    expect(window.masteredCount("nmt")).toBe(2);
  });

  it("returns 0 for an exam with no progress", () => {
    expect(window.masteredCount("sat")).toBe(0);
  });
});

describe("learn-store migrateLearn", () => {
  it("filters out invalid nodes silently", () => {
    const raw = {
      nmt: {
        "nm-01": { mastery: "gold", attempts: 5, lastReviewedAt: 12345 },
        "nm-02": "not an object",
        "nm-03": { mastery: "invalid-level", attempts: 1 },
      },
    };
    const out = window.migrateLearn(raw) as { nmt: Record<string, { mastery: string } | undefined> };
    expect(out.nmt["nm-01"]?.mastery).toBe("gold");
    expect(out.nmt["nm-02"]).toBeUndefined();
    // Invalid mastery level normalized to "unlocked" — never lost outright
    expect(out.nmt["nm-03"]?.mastery).toBe("unlocked");
  });

  it("handles null / non-object input by returning empty state", () => {
    const out = window.migrateLearn(null);
    expect(Object.keys(out).filter((k) => k !== "_v")).toHaveLength(0);
  });
});
