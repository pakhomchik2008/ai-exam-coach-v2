/**
 * `migrateProfile` normalises on every read and every write, which is what makes
 * the 14 duplicated `sessionLengthMin || 45` fallbacks scattered across the app
 * (audit finding #15) dead code rather than live bugs.
 *
 * That guarantee is load-bearing and invisible — these tests pin it down before
 * Phase 2 removes those fallbacks.
 */
import { describe, it, expect } from "vitest";
import "../bootstrap";

interface Profile {
  weeklyHours: number;
  daysPerWeek: number;
  sessionLengthMin: number;
  planIntensity: string;
  blackoutSlots: unknown[];
  materials: string[];
  prefs: string[];
  soundsEnabled: boolean;
}

const migrateProfile = (window as unknown as { migrateProfile: (raw: unknown) => Profile })
  .migrateProfile;

describe("migrateProfile — defaults", () => {
  it.each([null, undefined, 42, "nope", []])("returns a full profile for %p", (bad) => {
    const p = migrateProfile(bad);
    expect(p.weeklyHours).toBe(12);
    expect(p.daysPerWeek).toBe(5);
    expect(p.sessionLengthMin).toBe(45);
    expect(p.planIntensity).toBe("balanced");
  });
});

describe("migrateProfile — sessionLengthMin is always a number in [15, 180]", () => {
  it.each([
    [10, 45], // below the floor → default, not clamped to 15
    [14, 45],
    [15, 15], // exactly the floor is honoured
    [90, 90],
    [180, 180], // exactly the ceiling is honoured
    [181, 45], // above the ceiling → default
    [Infinity, 45],
    [NaN, 45],
    [-30, 45],
  ])("maps %p to %i", (input, expected) => {
    expect(migrateProfile({ sessionLengthMin: input }).sessionLengthMin).toBe(expected);
  });

  it("rounds a fractional value", () => {
    expect(migrateProfile({ sessionLengthMin: 47.6 }).sessionLengthMin).toBe(48);
  });

  it("rejects a non-numeric value", () => {
    expect(migrateProfile({ sessionLengthMin: "90" }).sessionLengthMin).toBe(45);
  });
});

describe("migrateProfile — daysPerWeek is always in [1, 7]", () => {
  it.each([
    [0, 5],
    [1, 1],
    [7, 7],
    [8, 5],
    [-2, 5],
  ])("maps %p to %i", (input, expected) => {
    expect(migrateProfile({ daysPerWeek: input }).daysPerWeek).toBe(expected);
  });
});

describe("migrateProfile — weeklyHours", () => {
  it("rejects zero and negatives", () => {
    expect(migrateProfile({ weeklyHours: 0 }).weeklyHours).toBe(12);
    expect(migrateProfile({ weeklyHours: -5 }).weeklyHours).toBe(12);
  });

  it("keeps a sane positive value", () => {
    expect(migrateProfile({ weeklyHours: 20 }).weeklyHours).toBe(20);
  });
});

describe("migrateProfile — soundsEnabled defaults off", () => {
  it("is false on a blank profile", () => {
    expect(migrateProfile(null).soundsEnabled).toBe(false);
  });

  it("preserves an explicit true", () => {
    expect(migrateProfile({ soundsEnabled: true }).soundsEnabled).toBe(true);
  });
});

describe("migrateProfile — planIntensity", () => {
  it.each(["minimal", "balanced", "ambitious"])("accepts %s", (v) => {
    expect(migrateProfile({ planIntensity: v }).planIntensity).toBe(v);
  });

  it("falls back to balanced on an unknown value", () => {
    expect(migrateProfile({ planIntensity: "turbo" }).planIntensity).toBe("balanced");
  });
});

describe("migrateProfile — array fields reject non-arrays and bad members", () => {
  it("drops non-string materials", () => {
    const p = migrateProfile({ materials: ["notes", 42, null, "papers"] });
    expect(p.materials).toEqual(["notes", "papers"]);
  });

  it("falls back to defaults when given a non-array", () => {
    expect(migrateProfile({ materials: "notes" }).materials).toEqual(["notes", "papers"]);
  });

  // Day keys are lowercase ("mon"), and "all" is a valid period alongside the
  // three named ones.
  it("keeps well-formed blackout slots and drops the rest", () => {
    const p = migrateProfile({
      blackoutSlots: [
        { day: "mon", period: "all" },
        { day: "fri", period: "evening" },
        { day: "Mon", period: "all" }, // wrong case
        { day: "nope", period: "all" }, // not a weekday
        { day: "sat", period: "midnight" }, // not a period
        "garbage",
        null,
      ],
    });
    expect(p.blackoutSlots).toEqual([
      { day: "mon", period: "all" },
      { day: "fri", period: "evening" },
    ]);
  });
});
