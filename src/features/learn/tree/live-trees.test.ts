/**
 * NMT + IELTS are the live product trees. Structural completeness only —
 * do not invent syllabus nodes here. SAT / GCSE / A-Level stay deferred.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getTree } from "./index";
import { flattenLessonNodes } from "./schema";

function assertFinished(taxonomy: string) {
  const tree = getTree(taxonomy);
  expect(tree, taxonomy).toBeTruthy();
  expect(tree!.units.length).toBeGreaterThanOrEqual(4);
  const lessons = flattenLessonNodes(tree!);
  expect(lessons.length).toBeGreaterThanOrEqual(30);
  for (const { node, unit } of lessons) {
    expect(node.id, unit.id).toBeTruthy();
    expect(node.title.en, node.id).toBeTruthy();
    expect(node.estimatedMinutes, node.id).toBeGreaterThan(0);
    expect(node.complexity, node.id).toBeGreaterThanOrEqual(1);
  }
}

describe("live Learn trees", () => {
  it("NMT maths and IELTS are structurally finished", () => {
    assertFinished("nmt");
    assertFinished("ielts");
  });

  it("Learn header shows the exam date on the same screen", () => {
    const src = readFileSync("src/features/learn/LearnMain.jsx", "utf8");
    expect(src).toMatch(/examDateLine/);
    expect(src).toMatch(/PageHeader/);
    expect(src).toMatch(/exam\.examDate/);
  });
});
