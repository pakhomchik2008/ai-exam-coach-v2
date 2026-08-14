import { describe, it, expect } from "vitest";
import {
  SCALES,
  scaleForTaxonomy,
  scaleIdForTaxonomy,
  isNormalizedFallback,
  clampToScale,
  formatScore,
  percentToScore,
  scoreToPercent,
  scaleSteps,
  schemeFromExam,
  predictedFromReadiness,
  targetReadiness,
  stepDownPredicted,
} from "./scales";

describe("scale definitions match the real exams", () => {
  it("IELTS runs 0–9 in half bands", () => {
    expect(SCALES.ielts.min).toBe(0);
    expect(SCALES.ielts.max).toBe(9);
    expect(SCALES.ielts.step).toBe(0.5);
  });

  it("НМТ runs 100–200 per subject", () => {
    expect(SCALES.nmt_subject.min).toBe(100);
    expect(SCALES.nmt_subject.max).toBe(200);
  });

  it("SAT composite runs 400–1600 and a section runs 200–800", () => {
    expect([SCALES.sat_total.min, SCALES.sat_total.max]).toEqual([400, 1600]);
    expect([SCALES.sat_section.min, SCALES.sat_section.max]).toEqual([200, 800]);
  });

  it("GCSE runs 1–9", () => {
    expect([SCALES.gcse.min, SCALES.gcse.max]).toEqual([1, 9]);
  });

  it("puts every targetTop inside its own range", () => {
    for (const [id, s] of Object.entries(SCALES)) {
      expect(s.targetTop, id).toBeGreaterThanOrEqual(s.min);
      expect(s.targetTop, id).toBeLessThanOrEqual(s.max);
    }
  });
});

describe("scaleForTaxonomy", () => {
  it.each([
    ["ielts", "ielts"],
    ["nmt", "nmt_subject"],
    ["zno", "nmt_subject"],
    ["sat", "sat_total"],
    ["gcse", "gcse"],
    ["toefl", "toefl"],
    ["act", "act"],
    ["bac", "bac"],
    ["bac-math", "bac"],
    ["nmt-ukr", "nmt_subject"],
  ])("maps %s to the %s scale", (taxonomy, expected) => {
    expect(scaleIdForTaxonomy(taxonomy)).toBe(expected);
  });

  it("is case-insensitive", () => {
    expect(scaleIdForTaxonomy("IELTS")).toBe("ielts");
  });

  it.each([null, undefined, "", "something-we-have-never-seen"])(
    "falls back to the normalized scale for %p",
    (taxonomy) => {
      const id = scaleIdForTaxonomy(taxonomy);
      expect(id).toBe("normalized");
      expect(isNormalizedFallback(id)).toBe(true);
    },
  );

  it("does not mark a real scale as a fallback", () => {
    expect(isNormalizedFallback(scaleIdForTaxonomy("ielts"))).toBe(false);
  });

  it("returns the scale object itself, matching the resolved id", () => {
    expect(scaleForTaxonomy("ielts")).toBe(SCALES.ielts);
    expect(scaleForTaxonomy("nmt")).toBe(SCALES.nmt_subject);
    expect(scaleForTaxonomy("who-knows")).toBe(SCALES.normalized);
  });
});

describe("clampToScale", () => {
  it("clamps below and above the range", () => {
    expect(clampToScale(-4, SCALES.ielts)).toBe(0);
    expect(clampToScale(99, SCALES.ielts)).toBe(9);
    expect(clampToScale(0, SCALES.nmt_subject)).toBe(100);
    expect(clampToScale(9999, SCALES.nmt_subject)).toBe(200);
  });

  // An IELTS predictor emitting 7.3 is claiming a score that cannot appear on a
  // result slip. Snapping is correctness, not polish.
  it.each([
    [7.3, 7.5],
    [7.2, 7.0],
    [6.75, 7.0],
    [6.24, 6.0],
  ])("snaps IELTS %p to %p", (input, expected) => {
    expect(clampToScale(input, SCALES.ielts)).toBe(expected);
  });

  it("snaps SAT to its 10-point steps", () => {
    expect(clampToScale(1237, SCALES.sat_total)).toBe(1240);
    expect(clampToScale(1234, SCALES.sat_total)).toBe(1230);
  });

  it("never emits floating-point drift on fractional steps", () => {
    for (const step of scaleSteps(SCALES.ielts)) {
      expect(clampToScale(step, SCALES.ielts)).toBe(step);
      expect(String(clampToScale(step, SCALES.ielts))).not.toMatch(/\d{6,}/);
    }
  });

  it.each([NaN, Infinity, -Infinity])("returns the floor for %p", (bad) => {
    expect(clampToScale(bad, SCALES.ielts)).toBe(SCALES.ielts.min);
  });
});

describe("formatScore — never a letter grade", () => {
  it("renders IELTS with one decimal", () => {
    expect(formatScore(7, SCALES.ielts)).toBe("7.0");
    expect(formatScore(6.5, SCALES.ielts)).toBe("6.5");
  });

  it("renders integer scales without a decimal point", () => {
    expect(formatScore(172, SCALES.nmt_subject)).toBe("172");
    expect(formatScore(1400, SCALES.sat_total)).toBe("1400");
    expect(formatScore(7, SCALES.gcse)).toBe("7");
  });

  // The actual regression guard for audit finding #10.
  it("never produces A/B/C/D for any value on any scale", () => {
    for (const scale of Object.values(SCALES)) {
      for (const step of scaleSteps(scale)) {
        expect(formatScore(step, scale)).toMatch(/^[\d.]+$/);
      }
    }
  });
});

describe("percent <-> score round trip", () => {
  it("maps the extremes exactly", () => {
    expect(percentToScore(0, SCALES.ielts)).toBe(0);
    expect(percentToScore(100, SCALES.ielts)).toBe(9);
    expect(percentToScore(0, SCALES.nmt_subject)).toBe(100);
    expect(percentToScore(100, SCALES.nmt_subject)).toBe(200);
  });

  it("clamps out-of-range percentages", () => {
    expect(percentToScore(-20, SCALES.sat_total)).toBe(400);
    expect(percentToScore(140, SCALES.sat_total)).toBe(1600);
  });

  it("round-trips within one step", () => {
    for (const scale of Object.values(SCALES)) {
      for (const pct of [0, 17, 50, 83, 100]) {
        const back = scoreToPercent(percentToScore(pct, scale), scale);
        const tolerance = (scale.step / (scale.max - scale.min)) * 100;
        expect(Math.abs(back - pct)).toBeLessThanOrEqual(Math.ceil(tolerance) + 1);
      }
    }
  });

  it("keeps scoreToPercent inside 0–100", () => {
    expect(scoreToPercent(-999, SCALES.gcse)).toBe(0);
    expect(scoreToPercent(999, SCALES.gcse)).toBe(100);
  });
});

describe("schemeFromExam — exam's own grading, not A-Level letters", () => {
  it("IELTS stays 0–9 even when leftover letter grades sit on the row", () => {
    const scheme = schemeFromExam({
      qualificationId: "ielts",
      gradingSystem: { kind: "scale", options: ["A*", "A", "B", "C", "D", "E"] },
    });
    expect(scheme.kind).toBe("score");
    if (scheme.kind === "score") {
      expect(scheme.min).toBe(0);
      expect(scheme.max).toBe(9);
    }
    expect(predictedFromReadiness(50, scheme)).toBe("4.5");
    expect(predictedFromReadiness(39, scheme)).toBe("3.5");
  });

  it("Bac reports 0–20 with half points", () => {
    const scheme = schemeFromExam({ qualificationId: "bac" });
    expect(scheme.kind).toBe("score");
    expect(predictedFromReadiness(50, scheme)).toBe("10.0");
    expect(predictedFromReadiness(80, scheme)).toBe("16.0");
  });

  it("НМТ reports 100–200", () => {
    const scheme = schemeFromExam({ qualificationId: "nmt" });
    expect(predictedFromReadiness(0, scheme)).toBe("100");
    expect(predictedFromReadiness(50, scheme)).toBe("150");
    expect(predictedFromReadiness(100, scheme)).toBe("200");
  });

  it("A-Level still uses letters", () => {
    const scheme = schemeFromExam({ qualificationId: "alevel" });
    expect(scheme.kind).toBe("scale");
    expect(predictedFromReadiness(95, scheme)).toBe("A*");
    expect(predictedFromReadiness(50, scheme)).toBe("C");
  });

  it("converts an IELTS 7.5 target into readiness, not the letter-A threshold", () => {
    const scheme = schemeFromExam({ qualificationId: "ielts" });
    expect(targetReadiness("7.5", scheme)).toBe(scoreToPercent(7.5, SCALES.ielts));
    expect(targetReadiness("A", scheme)).toBe(80);
  });

  it("steps down one real increment", () => {
    const ielts = schemeFromExam({ qualificationId: "ielts" });
    expect(stepDownPredicted("7.5", ielts)).toBe("7.0");
    const nmt = schemeFromExam({ qualificationId: "nmt" });
    expect(stepDownPredicted("180", nmt)).toBe("179");
    const alevel = schemeFromExam({ qualificationId: "alevel" });
    expect(stepDownPredicted("B", alevel)).toBe("C");
  });
});

describe("scaleSteps", () => {
  it("produces every IELTS half band", () => {
    const steps = scaleSteps(SCALES.ielts);
    expect(steps[0]).toBe(0);
    expect(steps.at(-1)).toBe(9);
    expect(steps).toHaveLength(19);
  });

  it("produces all nine GCSE grades", () => {
    expect(scaleSteps(SCALES.gcse)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("stays within range on every scale", () => {
    for (const [id, scale] of Object.entries(SCALES)) {
      const steps = scaleSteps(scale);
      expect(steps[0], id).toBe(scale.min);
      expect(steps.at(-1)!, id).toBeLessThanOrEqual(scale.max);
    }
  });
});
