/**
 * Fold strip follows the DC exam list. Live trees stay NMT / IELTS;
 * the rest are Coach chat — said in the hero, not by hiding the names.
 */
import { describe, expect, it } from "vitest";
import { EXAM_CHIPS } from "./ExamMarquee";

describe("exam marquee", () => {
  it("lists the onboarding boards from the DC landing", () => {
    const names = EXAM_CHIPS.map((exam) => exam.name);
    expect(names).toEqual([
      "NMT", "IELTS", "TOEFL", "Duolingo", "PTE", "SAT", "ACT", "AP",
      "IB", "GCSE", "A-Level", "Matura", "Abitur", "Bac", "GRE", "GMAT",
    ]);
  });

  it("marks only NMT and IELTS as live trees", () => {
    const live = EXAM_CHIPS.filter((exam) => exam.live).map((exam) => exam.name);
    expect(live).toEqual(["NMT", "IELTS"]);
  });

  it("has unique ids so the duplicated track does not collide in React", () => {
    const ids = EXAM_CHIPS.map((exam) => exam.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
