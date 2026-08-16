/**
 * The fold strip is the exam list. Only live Learn trees belong here.
 * SAT / A-Level / GCSE are Coach chat — putting them on the strip sold a tree.
 */
import { describe, expect, it } from "vitest";
import { EXAM_CHIPS } from "./ExamMarquee";

describe("exam marquee", () => {
  it("lists only the live Learn trees", () => {
    const names = EXAM_CHIPS.map((exam) => exam.name);
    expect(names).toEqual(["НМТ", "ЗНО", "IELTS"]);
  });

  it("does not advertise boards that have no live tree", () => {
    const names = EXAM_CHIPS.map((exam) => exam.name);
    for (const board of ["SAT", "GCSE", "A-Level", "TOEFL", "IB"]) {
      expect(names).not.toContain(board);
    }
  });

  it("has unique ids so the duplicated track does not collide in React", () => {
    const ids = EXAM_CHIPS.map((exam) => exam.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
