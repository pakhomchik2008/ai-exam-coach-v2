import { describe, expect, it } from "vitest";
import {
  buildDrillSystem,
  buildExplainSystem,
  normalizeAnswer,
  normalizeDrillQuestion,
  normalizeDrillQuestions,
  parseExplainGrade,
  scoreDrill,
  scoreDragDrop,
  scoreFill,
  scoreMatch,
  scoreOrder,
  shuffled,
} from "./drill-exercises";

describe("normalizeAnswer", () => {
  it("collapses case and spaces", () => {
    expect(normalizeAnswer("  Area   Formula ")).toBe("area formula");
  });
});

describe("normalizeDrillQuestion", () => {
  it("keeps a valid mcq", () => {
    const q = normalizeDrillQuestion({
      type: "mcq",
      question: "2+2?",
      options: ["3", "4"],
      correct: 1,
      explanation: "four",
    });
    expect(q).toMatchObject({ type: "mcq", correct: 1 });
  });

  it("accepts matching aliases and a pairs object", () => {
    const q = normalizeDrillQuestion({
      type: "matching",
      question: "Match",
      pairs: { log: "inverse of exp", exp: "inverse of log" },
    });
    expect(q?.type).toBe("match");
    if (q?.type !== "match") return;
    expect(q.pairs).toHaveLength(2);
  });

  it("reads order from steps", () => {
    const q = normalizeDrillQuestion({
      type: "sequence",
      question: "Solve",
      steps: ["isolate", "divide", "check"],
    });
    expect(q?.type).toBe("order");
    if (q?.type !== "order") return;
    expect(q.items).toEqual(["isolate", "divide", "check"]);
  });

  it("drops drag_drop when blank count disagrees", () => {
    expect(normalizeDrillQuestion({
      type: "cloze",
      question: "The ___ is ___ and ___",
      answers: ["a", "b"],
      bank: ["a", "b", "c"],
    })).toBeNull();
  });

  it("merges answers into the drag_drop bank", () => {
    const q = normalizeDrillQuestion({
      type: "drag_drop",
      question: "The ___ of a square is side²",
      answers: ["area"],
      bank: ["perimeter"],
    });
    expect(q?.type).toBe("drag_drop");
    if (q?.type !== "drag_drop") return;
    expect(q.bank).toEqual(expect.arrayContaining(["area", "perimeter"]));
  });

  it("drops a one-pair match and a two-step order", () => {
    expect(normalizeDrillQuestion({
      type: "match", question: "x", pairs: [{ left: "a", right: "b" }],
    })).toBeNull();
    expect(normalizeDrillQuestion({
      type: "order", question: "x", items: ["a", "b"],
    })).toBeNull();
  });

  it("skips unknown types and keeps the rest", () => {
    const qs = normalizeDrillQuestions([
      { type: "audio", question: "listen" },
      { type: "fill_in", question: "The ___", answer: "cell" },
    ]);
    expect(qs).toHaveLength(1);
    expect(qs[0]?.type).toBe("fill");
  });
});

describe("scorers", () => {
  it("scores fill against accept variants", () => {
    const q = normalizeDrillQuestion({
      type: "fill", question: "x", answer: "mitochondria", accept: ["mitochondrion"],
    });
    if (q?.type !== "fill") throw new Error("expected fill");
    expect(scoreFill(q, "Mitochondrion")).toBe(true);
    expect(scoreFill(q, "nucleus")).toBe(false);
  });

  it("scores match only when every left is right", () => {
    const q = normalizeDrillQuestion({
      type: "match",
      question: "x",
      pairs: [
        { left: "a", right: "1" },
        { left: "b", right: "2" },
      ],
    });
    if (q?.type !== "match") throw new Error("expected match");
    expect(scoreMatch(q, { a: "1", b: "2" })).toBe(true);
    expect(scoreMatch(q, { a: "1", b: "1" })).toBe(false);
    expect(scoreMatch(q, { a: "1" })).toBe(false);
  });

  it("scores order as an exact sequence", () => {
    const q = normalizeDrillQuestion({
      type: "order", question: "x", items: ["one", "two", "three"],
    });
    if (q?.type !== "order") throw new Error("expected order");
    expect(scoreOrder(q, ["one", "two", "three"])).toBe(true);
    expect(scoreOrder(q, ["two", "one", "three"])).toBe(false);
  });

  it("scores drag_drop slot by slot", () => {
    const q = normalizeDrillQuestion({
      type: "drag_drop",
      question: "___ then ___",
      answers: ["first", "second"],
      bank: ["first", "second", "third"],
    });
    if (q?.type !== "drag_drop") throw new Error("expected drag_drop");
    expect(scoreDragDrop(q, ["first", "second"])).toBe(true);
    expect(scoreDragDrop(q, ["second", "first"])).toBe(false);
    expect(scoreDragDrop(q, ["first", null])).toBe(false);
  });

  it("routes scoreDrill by type", () => {
    expect(scoreDrill({
      type: "mcq", question: "q", options: ["a", "b"], correct: 1, explanation: "",
    }, 1)).toBe(true);
    expect(scoreDrill({
      type: "explain", question: "q", rubric: [], modelAnswer: "", explanation: "",
    }, "anything")).toBe(false);
  });
});

describe("shuffled", () => {
  it("returns a permutation of the same items", () => {
    const src = ["a", "b", "c", "d"];
    const out = shuffled(src);
    expect(out).toHaveLength(4);
    expect(out.slice().sort()).toEqual(src);
    expect(src).toEqual(["a", "b", "c", "d"]);
  });
});

describe("parseExplainGrade", () => {
  it("repairs LaTeX slashes and respects an explicit fail", () => {
    const g = parseExplainGrade('{"score":6,"pass":false,"feedback":"Use $a \\cdot b$"}');
    expect(g.pass).toBe(false);
    expect(g.score).toBe(6);
    expect(g.feedback).toContain("cdot");
  });

  it("passes on score >= 6 when the model omitted pass", () => {
    const g = parseExplainGrade({ score: 7, feedback: "Named the rule and an example." });
    expect(g.pass).toBe(true);
  });

  it("salvages raw prose so the student still sees a grade", () => {
    const g = parseExplainGrade("You named the power rule.");
    expect(g.feedback).toMatch(/power rule/);
    expect(g.pass).toBe(false);
  });
});

describe("prompts", () => {
  it("asks for the four new types", () => {
    const sys = buildDrillSystem("Logs", "nmt", 3);
    expect(sys).toMatch(/"type":"match"/);
    expect(sys).toMatch(/"type":"order"/);
    expect(sys).toMatch(/"type":"drag_drop"/);
    expect(sys).toMatch(/"type":"explain"/);
  });

  it("embeds the rubric in the explain grader", () => {
    expect(buildExplainSystem("Logs", ["names the base"], "Ukrainian"))
      .toMatch(/names the base/);
  });
});
