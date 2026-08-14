/**
 * The fold strip is the exam list. If a board drops out of EXAM_CHIPS,
 * the landing silently advertises a shorter product than the FAQ.
 */
import { describe, expect, it } from "vitest";
import { EXAM_CHIPS } from "./ExamMarquee";

describe("exam marquee", () => {
  it("lists every board named on the landing brief", () => {
    const names = EXAM_CHIPS.map((exam) => exam.name);
    for (const need of ["НМТ", "IELTS", "SAT", "GCSE", "TOEFL", "ACT", "AP", "Abitur", "Bac", "GRE", "GMAT", "Duolingo", "Matura"]) {
      expect(names).toContain(need);
    }
  });

  it("keeps product exams that the FAQ already claims", () => {
    const names = EXAM_CHIPS.map((exam) => exam.name);
    expect(names).toContain("ЗНО");
    expect(names).toContain("A-Level");
    expect(names).toContain("IB");
  });

  it("has unique ids so the duplicated track does not collide in React", () => {
    const ids = EXAM_CHIPS.map((exam) => exam.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
