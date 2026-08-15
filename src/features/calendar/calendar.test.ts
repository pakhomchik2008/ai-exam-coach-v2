/**
 * Ported from the old `calendar-tests.jsx`, which was a dependency-free
 * assertion runner exposed as `window.runCalendarTests()` because the app had no
 * build step and therefore no test runner.
 *
 * These cover the bug classes that actually matter for a drag/resize calendar:
 * day-index math (the root cause of the Wednesday→Saturday bug), timezone-safe
 * date formatting, Monday week-start across both 2026 DST transitions, and
 * minute/snap round-trips.
 */
import { readFileSync } from "node:fs";
import { describe, it, expect, beforeAll } from "vitest";
import "../../bootstrap";

type CalFns = {
  calDayIndexFromOffset: (offsetX: number, colWidth: number) => number;
  calFmtDate: (d: Date) => string;
  calMondayOf: (d: Date) => Date;
  calMinutesOf: (hhmm: string) => number;
  calHHMM: (minutes: number) => string;
  calSnap: (minutes: number) => number;
};

let cal: CalFns;

beforeAll(() => {
  cal = window as unknown as CalFns;
});

describe("calDayIndexFromOffset — the Wednesday→Saturday regression", () => {
  // A week row is 7 equal columns of width `colWidth`. Clicking/dragging at
  // pixel offset `offsetX` must land on floor(offsetX / colWidth) clamped to
  // 0–6 — NOT floor((offsetX / colWidth) * 7), which was the actual bug.
  const COL = 172;

  it("maps the start of Monday's column to 0", () => {
    expect(cal.calDayIndexFromOffset(5, COL)).toBe(0);
  });

  it("maps mid-Wednesday to index 2", () => {
    expect(cal.calDayIndexFromOffset(2.5 * COL, COL)).toBe(2);
  });

  it("maps mid-Saturday to 5 rather than clamping to Sunday", () => {
    expect(cal.calDayIndexFromOffset(5.5 * COL, COL)).toBe(5);
  });

  it("puts an exact Fri/Sat boundary on Saturday", () => {
    expect(cal.calDayIndexFromOffset(5 * COL, COL)).toBe(5);
  });

  it("clamps past the end of the week to Sunday", () => {
    expect(cal.calDayIndexFromOffset(7.9 * COL, COL)).toBe(6);
  });

  it("clamps a negative offset to Monday", () => {
    expect(cal.calDayIndexFromOffset(-40, COL)).toBe(0);
  });
});

describe("calFmtDate — timezone safety", () => {
  it("zero-pads month and day", () => {
    expect(cal.calFmtDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("handles the year boundary", () => {
    expect(cal.calFmtDate(new Date(2026, 11, 31))).toBe("2026-12-31");
  });

  // A date built from local y/m/d must format back to those exact components.
  // This fails if any code path routes through toISOString()/UTC getters, which
  // shift the date by a day near midnight depending on the browser's offset.
  it.each(Array.from({ length: 12 }, (_, m) => m))(
    "keeps 00:30 local on day 15 in month %i",
    (month) => {
      const probe = new Date(2026, month, 15, 0, 30);
      expect(cal.calFmtDate(probe)).toMatch(/-15$/);
    },
  );
});

describe("calMondayOf — week start across DST", () => {
  it("returns a Monday at local midnight for every day of 2026", () => {
    const offenders: string[] = [];
    for (let i = 0; i < 365; i++) {
      const d = new Date(2026, 0, 1 + i);
      const mon = cal.calMondayOf(d);
      if (mon.getDay() !== 1 || mon.getHours() !== 0 || mon.getMinutes() !== 0) {
        offenders.push(cal.calFmtDate(d));
      }
    }
    expect(offenders).toEqual([]);
  });

  // setDate() operates on local calendar days, not raw millisecond offsets, and
  // so is immune to the "add 86400000ms" DST trap. These four dates sit on the
  // 2026 US and EU transitions.
  it.each([
    ["US spring-forward", new Date(2026, 2, 8)],
    ["EU spring-forward", new Date(2026, 2, 29)],
    ["EU fall-back", new Date(2026, 9, 25)],
    ["US fall-back", new Date(2026, 10, 1)],
  ])("returns a Monday around %s", (_label, date) => {
    expect(cal.calMondayOf(date as Date).getDay()).toBe(1);
  });
});

describe("time parsing and formatting", () => {
  it("parses HH:MM to minutes", () => {
    expect(cal.calMinutesOf("09:30")).toBe(570);
  });

  it("falls back to 17:00 on empty input", () => {
    expect(cal.calMinutesOf("")).toBe(1020);
  });

  it("formats minutes back to HH:MM", () => {
    expect(cal.calHHMM(570)).toBe("09:30");
  });

  it("clamps negative minutes to 00:00", () => {
    expect(cal.calHHMM(-15)).toBe("00:00");
  });

  it("clamps past midnight to 23:59", () => {
    expect(cal.calHHMM(24 * 60 + 30)).toBe("23:59");
  });

  it("round-trips every 15-minute slot in a day", () => {
    for (let m = 0; m < 24 * 60; m += 15) {
      expect(cal.calMinutesOf(cal.calHHMM(m))).toBe(m);
    }
  });
});

describe("prod bundle", () => {
  it("does not load calendar-tests.jsx", () => {
    const src = readFileSync("src/bootstrap.ts", "utf8");
    expect(src).not.toContain("calendar-tests");
  });
});

describe("calSnap — 15-minute grid", () => {
  it.each([
    [37, 30],
    [38, 45],
    [0, 0],
    [682, 675],
  ])("snaps %i to %i", (input, expected) => {
    expect(cal.calSnap(input)).toBe(expected);
  });
});
