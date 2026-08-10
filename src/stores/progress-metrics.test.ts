/**
 * `computeStreak` reads the real schedule store, so these tests drive it by
 * writing sessions through the store's own write path rather than stubbing it.
 *
 * The timezone case is the one that matters: a UTC-based date key lands on the
 * wrong calendar day for any user west of UTC (11pm PST is already "tomorrow" in
 * UTC), which silently breaks the streak at exactly the boundary it exists to
 * protect.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "../bootstrap";

interface Session {
  id: string;
  examId?: string;
  date: string;
  status: string;
}

type Api = {
  computeStreak: () => number;
  computeAchievements: () => { id: string; unlocked: boolean }[];
  getSchedule: () => { sessions: Session[] };
  saveSchedule: (schedule: { sessions: Session[] }) => void;
  fmtDateKey: (d: Date) => string;
};

const api = window as unknown as Api;

/** Local date key N days before today — matches the store's own convention. */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return api.fmtDateKey(d);
}

// `migrateSession` drops any session without a non-empty string `examId`, so a
// fixture that omits it is silently discarded on save rather than rejected.
function seedCompletedOn(offsets: number[]): void {
  api.saveSchedule({
    sessions: offsets.map((n, i) => ({
      id: `__streak_test_${i}`,
      examId: "__streak_test_exam__",
      date: daysAgo(n),
      status: "completed",
    })),
  });
}

let original: { sessions: Session[] };

beforeEach(() => {
  original = api.getSchedule();
});

afterEach(() => {
  api.saveSchedule(original);
});

describe("computeStreak", () => {
  it("is 0 with no completed sessions", () => {
    api.saveSchedule({ sessions: [] });
    expect(api.computeStreak()).toBe(0);
  });

  it("ignores sessions that are scheduled but not completed", () => {
    api.saveSchedule({
      sessions: [
        { id: "a", examId: "__streak_test_exam__", date: daysAgo(0), status: "pending" },
      ],
    });
    expect(api.computeStreak()).toBe(0);
  });

  it("counts today alone as 1", () => {
    seedCompletedOn([0]);
    expect(api.computeStreak()).toBe(1);
  });

  it("counts consecutive days ending today", () => {
    seedCompletedOn([0, 1, 2, 3]);
    expect(api.computeStreak()).toBe(4);
  });

  // The rule that makes the streak usable: not having studied *yet* today must
  // not zero out a real streak that ran through yesterday.
  it("keeps a streak alive when today has not been studied yet", () => {
    seedCompletedOn([1, 2, 3]);
    expect(api.computeStreak()).toBe(3);
  });

  it("stops at the first gap", () => {
    seedCompletedOn([0, 1, 3, 4, 5]);
    expect(api.computeStreak()).toBe(2);
  });

  it("is 0 when the most recent session is older than yesterday", () => {
    seedCompletedOn([2, 3, 4]);
    expect(api.computeStreak()).toBe(0);
  });

  it("counts a day once even with several sessions on it", () => {
    seedCompletedOn([0, 0, 0, 1]);
    expect(api.computeStreak()).toBe(2);
  });
});

describe("computeAchievements", () => {
  it("locks everything on an empty history", () => {
    api.saveSchedule({ sessions: [] });
    expect(api.computeAchievements().every((a) => !a.unlocked)).toBe(true);
  });

  it("unlocks the 3-day streak badge but not the 7-day one at 3 days", () => {
    seedCompletedOn([0, 1, 2]);
    const byId = Object.fromEntries(api.computeAchievements().map((a) => [a.id, a.unlocked]));
    expect(byId["streak_3"]).toBe(true);
    expect(byId["streak_7"]).toBe(false);
  });

  it("unlocks the 5-session badge at exactly 5 completed sessions", () => {
    seedCompletedOn([0, 1, 2, 3, 4]);
    const byId = Object.fromEntries(api.computeAchievements().map((a) => [a.id, a.unlocked]));
    expect(byId["five_sessions"]).toBe(true);
    expect(byId["twentyfive_sessions"]).toBe(false);
  });
});
