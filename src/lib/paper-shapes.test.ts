import { describe, expect, it } from "vitest";
import { specFor } from "./exam-specs";
import {
  PAPER_SHAPES,
  normalizeSimQuestion,
  paperShapeFor,
  scoreSimAnswer,
  sittingById,
} from "./paper-shapes";

describe("paperShapeFor", () => {
  it("sits NMT math on the 2026 UTsOYaO paper, not 20 MCQs", () => {
    const shape = paperShapeFor({ qualificationId: "nmt", name: "НМТ Математика" });
    const sitting = sittingById(shape);
    expect(sitting?.questionCount).toBe(22);
    expect(sitting?.minutes).toBe(60);
    expect(sitting?.sections.map((s) => s.kind)).toEqual(["mcq", "match", "short"]);
    expect(sitting?.sections[0]?.options).toBe(5);
  });

  it("sits GCSE History as two 2-hour written papers", () => {
    const shape = paperShapeFor({ qualificationId: "gcse", name: "GCSE History" });
    expect(shape?.papers).toHaveLength(2);
    expect(shape?.papers.every((p) => p.minutes === 120)).toBe(true);
    expect(shape?.papers[0]?.sections.every((s) => s.kind === "written")).toBe(true);
  });

  it("does not call a bare GCSE official", () => {
    const spec = specFor("gcse", 6, "GCSE Geography");
    expect(spec.official).toBe(false);
  });

  it("does not call a bare NMT official when the subject is unknown", () => {
    expect(specFor("nmt", 4, "NMT").official).toBe(false);
  });

  it("resolves SAT Math to 44 / 70", () => {
    const spec = specFor("sat", 8, "SAT Math");
    expect(spec.official).toBe(true);
    expect(spec.questionCount).toBe(44);
    expect(spec.durationMin).toBe(70);
  });

  it("offers SAT section picker when the name is just SAT", () => {
    const shape = paperShapeFor({ qualificationId: "sat", name: "SAT" });
    expect(shape?.papers.map((p) => p.id)).toEqual(["sat-rw", "sat-math"]);
  });
});

describe("PAPER_SHAPES integrity", () => {
  it("every sitting's questionCount matches its sections", () => {
    for (const shape of PAPER_SHAPES) {
      for (const paper of shape.papers) {
        const sum = paper.sections.reduce((n, s) => n + s.count, 0);
        expect(paper.questionCount, shape.id).toBe(sum);
      }
    }
  });

  it("every shape cites a public source", () => {
    for (const shape of PAPER_SHAPES) {
      expect(shape.source, shape.id).toMatch(/^https:\/\//);
    }
  });
});

describe("scoreSimAnswer", () => {
  it("scores a 5-option MCQ", () => {
    const q = normalizeSimQuestion({
      kind: "mcq", question: "2+2", options: ["1", "2", "3", "4", "5"], correct: 3,
    }, "mcq");
    expect(q).toBeTruthy();
    expect(scoreSimAnswer(q!, 3).correct).toBe(true);
    expect(scoreSimAnswer(q!, 0).correct).toBe(false);
  });

  it("scores a short numeric with accept list", () => {
    const q = normalizeSimQuestion({
      kind: "short", question: "x", answer: "12", accept: ["12.0"],
    }, "short");
    expect(scoreSimAnswer(q!, "12.0").correct).toBe(true);
    expect(scoreSimAnswer(q!, "13").correct).toBe(false);
  });
});
