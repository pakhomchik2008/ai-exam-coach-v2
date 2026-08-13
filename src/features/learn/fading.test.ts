import { describe, expect, it } from "vitest";
import { hiddenIndexes, normalizeAnswer, parseFadePlan, stepMatches } from "./fading";

describe("parseFadePlan", () => {
  it("keeps official step answers", () => {
    const plan = parseFadePlan({
      title: "Derivative",
      problem: "f(x)=3x^2+2x-5",
      steps: [
        { reveal: "Split", answer: "3x^2, 2x, -5", accept: ["3x^2 + 2x - 5"], hint: "terms" },
        { reveal: "Power", answer: "6x", accept: ["6x"], hint: "2*3x" },
        { reveal: "Linear", answer: "2", accept: ["2"], hint: "2x" },
      ],
    });
    expect(plan.steps).toHaveLength(3);
  });
});

describe("stepMatches", () => {
  it("treats 2(x+1) and 2x+2 as different unless listed", () => {
    const step = { reveal: "expand", answer: "2x+2", accept: ["2(x+1)", "2*(x+1)"], hint: "" };
    expect(stepMatches("2x+2", step)).toBe(true);
    expect(stepMatches("2(x+1)", step)).toBe(true);
    expect(stepMatches("5", step)).toBe(false);
  });

  it("ignores spaces and multiply dots", () => {
    expect(normalizeAnswer("2 · x")).toBe("2x");
  });
});

describe("hiddenIndexes", () => {
  it("hides from the end as the level rises", () => {
    expect(hiddenIndexes(1, 4)).toEqual([]);
    expect(hiddenIndexes(2, 4)).toEqual([3]);
    expect(hiddenIndexes(5, 4)).toEqual([0, 1, 2, 3]);
  });
});
