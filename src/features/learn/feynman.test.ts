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

  it("repairs LaTeX backslashes that break JSON.parse", () => {
    // \c is not a JSON escape — this is the cdot / left / sum case.
    const g = parseFeynmanGrade('{"clarity":3,"completeness":2,"gaps":[],"feedback":"Use $a \\cdot b$"}');
    expect(g.feedback).toContain("cdot");
    expect(g.clarity).toBe(3);
  });

  it("accepts comment as feedback and a one-object array", () => {
    const g = parseFeynmanGrade([{ comment: "Too vague.", clarity: "4" }]);
    expect(g.feedback).toBe("Too vague.");
    expect(g.clarity).toBe(4);
  });

  it("uses raw prose when JSON is missing so the student still sees a grade", () => {
    const g = parseFeynmanGrade("That was not an explanation of divisibility.");
    expect(g.feedback).toMatch(/divisibility/);
    expect(g.clarity).toBe(0);
  });
});

describe("buildFeynmanSystem", () => {
  it("asks for JSON in the exam language", () => {
    expect(buildFeynmanSystem("Logarithms", "Ukrainian")).toMatch(/Ukrainian/);
    expect(buildFeynmanSystem("Logarithms", "Ukrainian")).toMatch(/OUTPUT ONLY valid JSON/);
  });
});
