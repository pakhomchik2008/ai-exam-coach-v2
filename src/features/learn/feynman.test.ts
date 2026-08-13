import { describe, expect, it } from "vitest";
import { buildFeynmanSystem, parseFeynmanGrade } from "./feynman";

describe("parseFeynmanGrade", () => {
  it("clamps scores and keeps gaps", () => {
    const g = parseFeynmanGrade({
      clarity: 12,
      completeness: -1,
      gaps: ["constants"],
      feedback: "You named the power rule.",
    });
    expect(g.clarity).toBe(10);
    expect(g.completeness).toBe(0);
    expect(g.gaps).toEqual(["constants"]);
  });
});

describe("buildFeynmanSystem", () => {
  it("asks for JSON in the exam language", () => {
    expect(buildFeynmanSystem("Logarithms", "Ukrainian")).toMatch(/Ukrainian/);
    expect(buildFeynmanSystem("Logarithms", "Ukrainian")).toMatch(/OUTPUT ONLY valid JSON/);
  });
});
