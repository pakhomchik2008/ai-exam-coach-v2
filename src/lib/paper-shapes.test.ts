import { describe, expect, it } from "vitest";
import { specFor } from "./exam-specs";
import {
  PAPER_SHAPES,
  isBabyShort,
  normalizeSimQuestion,
  paperShapeFor,
  parseFigurePack,
  scoreSimAnswer,
  sectionGenerationPrompt,
  shouldDrawFigure,
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

  it("sits NMT English as the 2026 six-task paper, not 20 MCQ + shorts", () => {
    const sitting = sittingById(paperShapeFor({ qualificationId: "nmt", name: "НМТ Англійська мова" }));
    expect(sitting?.questionCount).toBe(32);
    expect(sitting?.minutes).toBe(60);
    expect(sitting?.maxRaw).toBe(32);
    expect(sitting?.sections.map((s) => s.kind)).toEqual(["match", "mcq", "match", "match", "mcq", "mcq"]);
    expect(sitting?.sections[0]).toMatchObject({ kind: "match", count: 5, left: 1, right: 8 });
    expect(sitting?.sections[1]).toMatchObject({ kind: "mcq", count: 5, options: 4 });
    expect(sitting?.sections[2]).toMatchObject({ kind: "match", count: 6, right: 8 });
    expect(sitting?.sections[3]).toMatchObject({ kind: "match", count: 6, right: 8 });
    expect(paperShapeFor({ qualificationId: "nmt", name: "НМТ Англійська мова" })?.difficulty.do).toMatch(/advert|photo|figureBrief/i);
    expect(paperShapeFor({ qualificationId: "nmt", name: "НМТ Англійська мова" })?.difficulty.dont).toMatch(/Do not copy/i);
  });

  it("sits A-level Maths as three 2-hour papers", () => {
    const shape = paperShapeFor({ qualificationId: "alevel", name: "A-Level Mathematics" });
    expect(shape?.papers).toHaveLength(3);
    expect(shape?.papers.every((p) => p.minutes === 120)).toBe(true);
  });

  it.each([
    ["A-Level English Literature", "alevel-eng-lit", [180, 150], [75, 75]],
    ["A-Level English Language", "alevel-eng-lang", [150, 150], [100, 100]],
    ["A-Level Economics", "alevel-economics", [120, 120, 120], [80, 80, 80]],
    ["A-Level Psychology", "alevel-psychology", [120, 120, 120], [96, 96, 96]],
    ["A-Level Computer Science", "alevel-cs", [150, 150], [100, 100]],
    ["A-Level Business Studies", "alevel-business", [120, 120, 120], [100, 100, 100]],
    ["A-Level Politics", "alevel-politics", [120, 120, 120], [77, 77, 77]],
    ["A-Level French", "alevel-french", [150, 120, 23], [100, 80, 60]],
    ["A-Level Spanish", "alevel-spanish", [150, 120, 23], [100, 80, 60]],
    ["A-Level German", "alevel-german", [150, 120, 23], [100, 80, 60]],
    ["A-Level Sociology", "alevel-sociology", [120, 120, 120], [80, 80, 80]],
    ["A-Level Law", "alevel-law", [120, 120, 120], [100, 100, 100]],
    ["A-Level Film Studies", "alevel-film", [150, 150], [120, 100]],
    ["A-Level Physical Education", "alevel-pe", [120, 120], [105, 105]],
    ["A-Level Art & Design", "alevel-art", [90, 90], [96, 96]],
    ["A-Level Music", "alevel-music", [150], [120]],
    ["A-Level Religious Studies", "alevel-rs", [180, 180], [100, 100]],
    ["A-Level Philosophy", "alevel-philosophy", [180, 180], [100, 100]],
    ["A-Level Drama and Theatre", "alevel-drama", [180], [80]],
    ["A-Level Design & Technology", "alevel-dt", [150, 90], [120, 80]],
    ["A-Level Media Studies", "alevel-media", [120, 120], [84, 84]],
    ["A-Level Geology", "alevel-geology", [135, 135, 90], [110, 100, 60]],
    ["A-Level Environmental Science", "alevel-envsci", [180, 180], [120, 120]],
    ["A-Level Dance", "alevel-dance", [150], [100]],
    ["A-Level Classical Civilisation", "alevel-classics", [140, 105, 105], [100, 75, 75]],
    ["A-Level Electronics", "alevel-electronics", [165, 165], [140, 140]],
  ] as const)("sits %s on the official shape, not a generic mock", (name, id, minutes, maxRaw) => {
    const shape = paperShapeFor({ qualificationId: "alevel", name });
    expect(shape?.id).toBe(id);
    expect(shape?.papers.map((p) => p.minutes)).toEqual([...minutes]);
    expect(shape?.papers.map((p) => p.maxRaw)).toEqual([...maxRaw]);
    expect(specFor("alevel", 6, name).official).toBe(true);
  });

  it.each([
    ["GCSE Drama", "gcse-drama", [105], [80]],
    ["GCSE Religious Studies", "gcse-rs", [105, 105], [96, 96]],
    ["GCSE Sociology", "gcse-sociology", [105, 105], [100, 100]],
    ["GCSE French", "gcse-french", [45, 12, 60, 75], [50, 50, 50, 50]],
    ["GCSE Spanish", "gcse-spanish", [45, 12, 60, 75], [50, 50, 50, 50]],
    ["GCSE German", "gcse-german", [45, 12, 60, 75], [50, 50, 50, 50]],
    ["GCSE Computer Science", "gcse-cs", [120, 105], [90, 90]],
    ["GCSE Business", "gcse-business", [105, 105], [90, 90]],
    ["GCSE Economics", "gcse-economics", [105, 105], [80, 80]],
    ["GCSE Physical Education", "gcse-pe", [75, 75], [78, 78]],
    ["GCSE Art & Design", "gcse-art", [90, 90], [96, 96]],
    ["GCSE Music", "gcse-music", [90], [96]],
    ["GCSE Electronics", "gcse-electronics", [90, 90], [80, 80]],
    ["GCSE Food Preparation and Nutrition", "gcse-food", [105], [100]],
  ] as const)("sits %s on the AQA GCSE shape, not a generic mock", (name, id, minutes, maxRaw) => {
    const shape = paperShapeFor({ qualificationId: "gcse", name });
    expect(shape?.id).toBe(id);
    expect(shape?.papers.map((p) => p.minutes)).toEqual([...minutes]);
    expect(shape?.papers.map((p) => p.maxRaw)).toEqual([...maxRaw]);
    expect(specFor("gcse", 6, name).official).toBe(true);
  });

  it("does not let English Literature fall through to Language", () => {
    expect(paperShapeFor({ qualificationId: "alevel", name: "English Literature" })?.id).toBe("alevel-eng-lit");
    expect(paperShapeFor({ qualificationId: "alevel", name: "Англійська література" })?.id).toBe("alevel-eng-lit");
    expect(paperShapeFor({ qualificationId: "alevel", name: "English Language" })?.id).toBe("alevel-eng-lang");
  });

  it("does not let Physical Education fall through to Physics", () => {
    expect(paperShapeFor({ qualificationId: "alevel", name: "A-Level Physical Education" })?.id).toBe("alevel-pe");
    expect(paperShapeFor({ qualificationId: "alevel", name: "A-Level Physics" })?.id).toBe("alevel-physics");
    expect(paperShapeFor({ qualificationId: "gcse", name: "GCSE Physical Education" })?.id).toBe("gcse-pe");
    expect(paperShapeFor({ qualificationId: "gcse", name: "GCSE Physics" })?.id).toBe("gcse-physics");
  });

  it("does not let Religious Studies fall through to Philosophy", () => {
    expect(paperShapeFor({ qualificationId: "alevel", name: "A-Level Religious Studies" })?.id).toBe("alevel-rs");
    expect(paperShapeFor({ qualificationId: "alevel", name: "A-Level Philosophy" })?.id).toBe("alevel-philosophy");
  });

  it("does not let Design & Technology fall through to Art", () => {
    expect(paperShapeFor({ qualificationId: "alevel", name: "A-Level Design and Technology" })?.id).toBe("alevel-dt");
    expect(paperShapeFor({ qualificationId: "alevel", name: "A-Level Product Design" })?.id).toBe("alevel-dt");
    expect(paperShapeFor({ qualificationId: "alevel", name: "A-Level Art & Design" })?.id).toBe("alevel-art");
  });

  it("does not let Geology fall through to Geography", () => {
    expect(paperShapeFor({ qualificationId: "alevel", name: "A-Level Geology" })?.id).toBe("alevel-geology");
    expect(paperShapeFor({ qualificationId: "alevel", name: "A-Level Geography" })?.id).toBe("alevel-geography");
  });

  it.each([
    ["AP Calculus AB", "ap-calc-ab", [100, 90], [42, 54]],
    ["AP Calculus BC", "ap-calc-bc", [100, 90], [42, 54]],
    ["AP Statistics", "ap-stats", [90, 90], [42, 40]],
    ["AP Physics 1", "ap-physics-1", [85, 95], [42, 40]],
    ["AP Physics C", "ap-physics-c", [85, 95, 85, 95], [42, 40, 42, 40]],
    ["AP Chemistry", "ap-chem", [90, 105], [60, 46]],
    ["AP Biology", "ap-bio", [90, 90], [60, 36]],
    ["AP Environmental Science", "ap-envsci", [90, 70], [80, 30]],
    ["AP Human Geography", "ap-human-geo", [60, 75], [60, 21]],
    ["AP US History", "ap-ush", [55, 40, 100], [55, 9, 13]],
    ["AP World History", "ap-world", [55, 40, 100], [55, 9, 13]],
    ["AP European History", "ap-euro", [55, 40, 100], [55, 9, 13]],
    ["AP English Language", "ap-eng-lang", [60, 135], [45, 18]],
    ["AP English Literature", "ap-eng-lit", [60, 120], [55, 18]],
    ["AP Computer Science A", "ap-csa", [90, 90], [42, 36]],
    ["AP Psychology", "ap-psych", [90, 70], [75, 14]],
    ["AP Economics (Micro)", "ap-micro", [70, 60], [60, 21]],
    ["AP Economics (Macro)", "ap-macro", [70, 60], [60, 21]],
    ["AP US Government", "ap-gov", [80, 100], [55, 28]],
    ["AP Spanish", "ap-spanish", [70, 80], [50, 55]],
    ["AP French", "ap-french", [70, 80], [50, 55]],
  ] as const)("sits %s on the College Board AP shape, not a generic mock", (name, id, minutes, maxRaw) => {
    const shape = paperShapeFor({ qualificationId: "ap", name });
    expect(shape?.id).toBe(id);
    expect(shape?.papers.map((p) => p.minutes)).toEqual([...minutes]);
    expect(shape?.papers.map((p) => p.maxRaw)).toEqual([...maxRaw]);
    expect(specFor("ap", 6, name).official).toBe(true);
  });

  it.each([
    ["IB Mathematics AA", "ib-math-aa", [120, 120, 60], [110, 110, 55]],
    ["IB Mathematics AI", "ib-math-ai", [120, 120, 60], [110, 110, 55]],
    ["IB Physics", "ib-physics", [120, 150], [60, 90]],
    ["IB Chemistry", "ib-chemistry", [120, 150], [60, 90]],
    ["IB Biology", "ib-biology", [120, 150], [60, 90]],
    ["IB Environmental Systems", "ib-ess", [60, 120], [40, 65]],
    ["IB History", "ib-history", [60, 90, 150], [24, 30, 45]],
    ["IB Geography", "ib-geography", [135, 75, 60], [60, 50, 28]],
    ["IB Economics", "ib-economics", [75, 105, 105], [25, 40, 60]],
    ["IB English A", "ib-eng-a", [135, 105], [40, 30]],
    ["IB English B", "ib-eng-b", [90, 120], [30, 65]],
    ["IB Computer Science", "ib-cs", [130, 80, 60], [100, 65, 30]],
    ["IB Visual Arts", "ib-visual-arts", [90, 60], [30, 30]],
    ["IB Psychology", "ib-psychology", [120, 120, 60], [49, 44, 24]],
    ["IB Philosophy", "ib-philosophy", [150, 60, 75], [50, 25, 25]],
  ] as const)("sits %s on the IB HL shape, not a generic mock", (name, id, minutes, maxRaw) => {
    const shape = paperShapeFor({ qualificationId: "ib", name });
    expect(shape?.id).toBe(id);
    expect(shape?.papers.map((p) => p.minutes)).toEqual([...minutes]);
    expect(shape?.papers.map((p) => p.maxRaw)).toEqual([...maxRaw]);
    expect(specFor("ib", 6, name).official).toBe(true);
  });

  it("does not let AP Calculus BC fall through to AB", () => {
    expect(paperShapeFor({ qualificationId: "ap", name: "AP Calculus BC" })?.id).toBe("ap-calc-bc");
    expect(paperShapeFor({ qualificationId: "ap", name: "AP Calculus AB" })?.id).toBe("ap-calc-ab");
  });

  it("does not let AP Physics C fall through to Physics 1", () => {
    expect(paperShapeFor({ qualificationId: "ap", name: "AP Physics C" })?.id).toBe("ap-physics-c");
    expect(paperShapeFor({ qualificationId: "ap", name: "AP Physics 1" })?.id).toBe("ap-physics-1");
  });

  it("does not let AP Micro fall through to Macro", () => {
    expect(paperShapeFor({ qualificationId: "ap", name: "AP Economics (Micro)" })?.id).toBe("ap-micro");
    expect(paperShapeFor({ qualificationId: "ap", name: "AP Economics (Macro)" })?.id).toBe("ap-macro");
  });

  it("does not let IB Mathematics AA fall through to AI", () => {
    expect(paperShapeFor({ qualificationId: "ib", name: "Mathematics AA" })?.id).toBe("ib-math-aa");
    expect(paperShapeFor({ qualificationId: "ib", name: "Mathematics AI" })?.id).toBe("ib-math-ai");
  });

  it("does not let IB English A fall through to English B", () => {
    expect(paperShapeFor({ qualificationId: "ib", name: "English A" })?.id).toBe("ib-eng-a");
    expect(paperShapeFor({ qualificationId: "ib", name: "English B" })?.id).toBe("ib-eng-b");
  });

  it.each([
    ["University Mathematics", "uni-math", [120], [100]],
    ["University English Literature", "uni-eng-lit", [120], [100]],
    ["University Law", "uni-law", [120], [100]],
    ["University Medicine", "uni-medicine", [120], [100]],
    ["University Architecture", "uni-architecture", [90], [80]],
    ["University Art History", "uni-art-hist", [90], [80]],
  ] as const)("sits %s on a typical unseen module, not 18 MCQs", (name, id, minutes, maxRaw) => {
    const shape = paperShapeFor({ qualificationId: "uni", name });
    expect(shape?.id).toBe(id);
    expect(shape?.papers.map((p) => p.minutes)).toEqual([...minutes]);
    expect(shape?.papers.map((p) => p.maxRaw)).toEqual([...maxRaw]);
    expect(specFor("uni", 6, name).official).toBe(true);
  });

  it("does not let University Art History fall through to History", () => {
    expect(paperShapeFor({ qualificationId: "uni", name: "Art History" })?.id).toBe("uni-art-hist");
    expect(paperShapeFor({ qualificationId: "uni", name: "History" })?.id).toBe("uni-history");
  });

  it("does not call a bare family official", () => {
    expect(specFor("gcse", 6, "GCSE Latin").official).toBe(false);
    expect(specFor("ap", 6, "AP").official).toBe(false);
    expect(specFor("ib", 6, "IB").official).toBe(false);
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

  it("asks NMT English Task 1 for photo ads and A–H extras", () => {
    const shape = paperShapeFor({ qualificationId: "nmt", name: "NMT English" });
    const task1 = shape?.papers[0]?.sections[0];
    const prompt = sectionGenerationPrompt({
      examName: "NMT English",
      styleNote: shape?.note || "",
      topics: ["Reading"],
      section: task1 || { kind: "match", count: 5, left: 1, right: 8, maxMarksEach: 1, note: "" },
      difficulty: shape?.difficulty ?? null,
    });
    expect(prompt).toMatch(/A–H|A-H/);
    expect(prompt).toMatch(/figureBrief/);
    expect(prompt).toMatch(/advert|photo/i);
    expect(prompt).toMatch(/Do not copy/);
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

  it("parses a print-pack of figures", () => {
    const pack = parseFigurePack(`===FIG 2===
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420"><circle cx="10" cy="10" r="4"/></svg>
===FIG 5===
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420"><rect x="1" y="1" width="8" height="8"/></svg>`);
    expect(pack.get(2)).toMatch(/circle/);
    expect(pack.get(5)).toMatch(/rect/);
  });

  it("keeps a shared reading passage on an MCQ", () => {
    const q = normalizeSimQuestion({
      kind: "mcq", question: "What is TRUE of paragraph 1?", options: ["A", "B", "C", "D"], correct: 0,
      stimulus: "A 400-word original college narrative used as the Task 2 stem.",
    }, "mcq");
    expect(q?.stimulus).toMatch(/400-word/);
  });

  it("draws a source plate when the brief is set", () => {
    const q = normalizeSimQuestion({
      kind: "written", question: "Study Source A. How useful is it?",
      figureBrief: "1930s soup kitchen, queue of workers", figureKind: "source",
      markscheme: ["content"],
    }, "written");
    expect(shouldDrawFigure(q!)).toBe(true);
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
