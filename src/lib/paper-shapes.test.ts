import { describe, expect, it } from "vitest";
import { specFor } from "./exam-specs";
import {
  PAPER_SHAPES,
  isBabyShort,
  normalizeSimQuestion,
  paperShapeFor,
  scoreSimAnswer,
  sectionGenerationPrompt,
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

  it("splits NMT Ukrainian into 4-option then 5-option MCQ, as the 2026 demo", () => {
    const sitting = sittingById(paperShapeFor({ qualificationId: "nmt", name: "НМТ Українська мова" }));
    expect(sitting?.sections[0]).toMatchObject({ kind: "mcq", count: 10, options: 4 });
    expect(sitting?.sections[1]).toMatchObject({ kind: "mcq", count: 15, options: 5 });
  });

  it("sits NMT literature on five-option MCQ", () => {
    const sitting = sittingById(paperShapeFor({ qualificationId: "nmt", name: "НМТ Українська література" }));
    expect(sitting?.sections[0]?.options).toBe(5);
  });

  it("sits GCSE History as two 2-hour written papers", () => {
    const shape = paperShapeFor({ qualificationId: "gcse", name: "GCSE History" });
    expect(shape?.papers).toHaveLength(2);
    expect(shape?.papers.every((p) => p.minutes === 120)).toBe(true);
    expect(shape?.papers[0]?.sections.every((s) => s.kind === "written")).toBe(true);
  });

  it("sits GCSE Geography as three AQA papers with figures, not 11 MCQs", () => {
    const shape = paperShapeFor({ qualificationId: "gcse", name: "GCSE Geography" });
    expect(shape?.papers).toHaveLength(3);
    expect(shape?.papers.every((p) => p.minutes === 90)).toBe(true);
    expect(shape?.difficulty.do).toMatch(/SVG/);
  });

  it("sits A-level Maths as three 2-hour papers", () => {
    const shape = paperShapeFor({ qualificationId: "alevel", name: "A-Level Mathematics" });
    expect(shape?.papers).toHaveLength(3);
    expect(shape?.papers.every((p) => p.minutes === 120)).toBe(true);
  });

  it("does not call a bare GCSE official", () => {
    const spec = specFor("gcse", 6, "GCSE Sociology");
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

  it("every shape has a calibrated difficulty curve", () => {
    for (const shape of PAPER_SHAPES) {
      expect(shape.difficulty.mix.length, shape.id).toBeGreaterThan(20);
      expect(shape.difficulty.dont, shape.id).toMatch(/do not copy/i);
    }
  });
});

describe("sectionGenerationPrompt", () => {
  it("steers NMT math off baby arithmetic and off olympiad", () => {
    const shape = paperShapeFor({ qualificationId: "nmt", name: "НМТ Математика" });
    const prompt = sectionGenerationPrompt({
      examName: "НМТ Математика",
      styleNote: shape?.note || "",
      topics: ["Алгебра"],
      section: shape?.papers[0]?.sections[0] || { kind: "mcq", count: 15, maxMarksEach: 1, note: "" },
      difficulty: shape?.difficulty ?? null,
    });
    expect(prompt).toMatch(/19–22/);
    expect(prompt).toMatch(/No 2\+2/);
    expect(prompt).toMatch(/No olympiad/);
  });

  it("bans order-of-operations shorts and asks for figures", () => {
    const shape = paperShapeFor({ qualificationId: "nmt", name: "НМТ Математика" });
    const short = shape?.papers[0]?.sections.find((s) => s.kind === "short");
    const prompt = sectionGenerationPrompt({
      examName: "НМТ Математика",
      styleNote: shape?.note || "",
      topics: ["Стереометрія"],
      section: short || { kind: "short", count: 4, maxMarksEach: 2, note: "" },
      difficulty: shape?.difficulty ?? null,
    });
    expect(prompt).toMatch(/BANNED/);
    expect(prompt).toMatch(/figure/);
    expect(prompt).toMatch(/3D/);
  });

  it("asks GCSE written items for an original source figure", () => {
    const shape = paperShapeFor({ qualificationId: "gcse", name: "GCSE History" });
    const written = shape?.papers[0]?.sections[0];
    const prompt = sectionGenerationPrompt({
      examName: "GCSE History",
      styleNote: shape?.note || "",
      topics: ["Germany"],
      section: written || { kind: "written", count: 6, maxMarksEach: 7, note: "" },
      difficulty: shape?.difficulty ?? null,
    });
    expect(prompt).toMatch(/figure/);
    expect(prompt).toMatch(/Study Figure 1|Source A/);
  });
});

describe("isBabyShort", () => {
  it("rejects a bare order-of-operations stem", () => {
    expect(isBabyShort("Обчисліть значення виразу: (2³ - 5) · 4 + 12 : 3")).toBe(true);
  });

  it("keeps a real last-paper short", () => {
    expect(isBabyShort("Задано функцію. Обчисліть значення виразу f(−3) − f'(2).")).toBe(false);
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

  it("keeps an SVG figure on a short item", () => {
    const q = normalizeSimQuestion({
      kind: "short", question: "Об'єм призми", answer: "3600",
      figure: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 720 400\"><rect x=\"10\" y=\"10\" width=\"40\" height=\"20\"/></svg>",
    }, "short");
    expect(q?.figure).toMatch(/<svg/);
  });

  it("scores a short numeric with accept list", () => {
    const q = normalizeSimQuestion({
      kind: "short", question: "x", answer: "12", accept: ["12.0"],
    }, "short");
    expect(scoreSimAnswer(q!, "12.0").correct).toBe(true);
    expect(scoreSimAnswer(q!, "13").correct).toBe(false);
  });
});
