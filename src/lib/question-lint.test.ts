/**
 * Golden set: recorded shapes of AI output that shipped a bad question to a
 * student, plus the near-misses that must stay allowed.
 *
 * These are fixtures, not live calls. That means this file gates every PR for
 * free and proves the *linter* still rejects each known bug — it does not
 * prove a prompt still behaves, which needs a real model (see scripts/ai-eval.mjs).
 * Add a row here every time a bad question is found in the wild.
 */
import { describe, expect, it } from "vitest";
import {
  filterMcqBatch,
  languageMismatch,
  lintMcq,
  mcqRulesBlock,
  planCorrectIndices,
  shuffleMcq,
  similarity,
  type LintReason,
  type LintableMcq,
} from "./question-lint";

/** Deterministic stand-in for Math.random so shuffles are assertable. */
function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

type GoldenCase = {
  name: string;
  question: LintableMcq;
  language?: string;
  expect: LintReason[];
};

const GOLDEN: GoldenCase[] = [
  {
    name: "the bug Hlib found: correct option is an essay, distractors are one word",
    question: {
      question: "What is photosynthesis?",
      options: [
        "Respiration",
        "Osmosis",
        "The process by which plants convert light energy into chemical energy stored in glucose",
        "Diffusion",
      ],
      correct: 2,
    },
    expect: ["length-bias"],
  },
  {
    name: "length bias survives a long distractor if the answer is still longest by a mile",
    question: {
      question: "Why does a catalyst speed up a reaction?",
      options: [
        "It raises the temperature of the mixture",
        "It is consumed",
        "It provides an alternative reaction pathway with a lower activation energy, so more collisions succeed",
        "It adds energy",
      ],
      correct: 2,
    },
    expect: ["length-bias"],
  },
  {
    name: "short maths options are allowed to differ — a fixed percentage corridor would reject this",
    question: {
      question: "Solve $x^2 + 4 = 0$ over the reals.",
      options: ["$x=2$", "$x=-2$", "$x=4$", "No real solutions"],
      correct: 3,
    },
    expect: [],
  },
  {
    name: "all of the above",
    question: {
      question: "Which are noble gases?",
      options: ["Helium", "Neon", "Argon", "All of the above"],
      correct: 3,
    },
    expect: ["catch-all-option"],
  },
  {
    name: "none of the above, lowercase, trailing full stop",
    question: {
      question: "Which of these is a prime?",
      options: ["Nine", "Fifteen", "Twenty-one", "none of the above."],
      correct: 3,
    },
    expect: ["catch-all-option"],
  },
  {
    name: "Ukrainian catch-all",
    question: {
      question: "Які з чисел є простими?",
      options: ["Два", "Чотири", "Шість", "Всі з перелічених"],
      correct: 0,
    },
    language: "uk",
    expect: ["catch-all-option"],
  },
  {
    name: "Russian catch-all",
    question: {
      question: "Какие из чисел простые?",
      options: ["Два", "Четыре", "Шесть", "Все из перечисленных"],
      correct: 0,
    },
    language: "ru",
    expect: ["catch-all-option"],
  },
  {
    name: "both A and B",
    question: {
      question: "Which statements hold?",
      options: ["Only A", "Only B", "Both A and B", "Neither"],
      correct: 2,
    },
    expect: ["catch-all-option"],
  },
  {
    name: "two options that differ only by punctuation and case",
    question: {
      question: "What is the capital of France?",
      options: ["Paris", "paris.", "Lyon", "Marseille"],
      correct: 0,
    },
    expect: ["duplicate-option"],
  },
  {
    name: "explanation is the option with a full stop bolted on",
    question: {
      question: "Where is ATP produced?",
      options: ["In the nucleus", "In the mitochondria", "In the ribosome", "In the vacuole"],
      correct: 1,
      explanation: "In the mitochondria.",
    },
    expect: ["explanation-echo"],
  },
  {
    name: "an explanation may quote the answer if it also says why",
    question: {
      question: "Area of a triangle with base 8 cm and height 6 cm?",
      options: ["14 cm²", "24 cm²", "48 cm²", "28 cm²"],
      correct: 1,
      explanation: "Half the base times the height: 8 × 6 ÷ 2, so 24 cm².",
    },
    expect: [],
  },
  {
    name: "Ukrainian paper, Russian options",
    question: {
      question: "Яка з формул описує площу трикутника?",
      options: ["Основание на высоту", "Сторона в квадраті", "Сума кутів", "Радіус кола"],
      correct: 0,
    },
    language: "uk",
    expect: ["language-mix"],
  },
  {
    name: "Russian paper, Ukrainian letters leak in",
    question: {
      question: "Какая формула описывает площадь треугольника?",
      options: ["Основа на висоту навпіл", "Сторона в квадрате", "Сумма углов", "Радиус круга"],
      correct: 0,
    },
    language: "ru",
    expect: ["language-mix"],
  },
  {
    name: "English paper, one option left in Cyrillic",
    question: {
      question: "Which tense fits: I ___ to school every day.",
      options: ["go", "went", "ходжу до школи", "gone"],
      correct: 0,
    },
    language: "en",
    expect: ["language-mix"],
  },
  {
    name: "Ukrainian question full of LaTeX is not a Latin-script question",
    question: {
      question: "Обчисліть похідну функції $f(x) = \\frac{x^2}{2} + 3x$",
      options: ["$x + 3$", "$2x + 3$", "$x^2 + 3$", "$\\frac{x}{2}$"],
      correct: 0,
      explanation: "Похідна степеня зменшує показник на одиницю.",
    },
    language: "uk",
    expect: [],
  },
  {
    name: "correct index past the end of the options",
    question: { question: "Pick one", options: ["A", "B"], correct: 5 },
    expect: ["shape"],
  },
  {
    name: "single option",
    question: { question: "Pick one", options: ["A"], correct: 0 },
    expect: ["shape"],
  },
  {
    name: "blank option string",
    question: { question: "Pick one", options: ["A", "  ", "C", "D"], correct: 0 },
    expect: ["shape"],
  },
  {
    name: "correct is a float, not an index",
    question: { question: "Pick one", options: ["A", "B", "C"], correct: 1.5 },
    expect: ["shape"],
  },
  {
    name: "a clean question passes everything",
    question: {
      question: "Which organelle carries out aerobic respiration?",
      options: ["Mitochondrion", "Chloroplast", "Ribosome", "Golgi body"],
      correct: 0,
      explanation: "Aerobic respiration happens on the cristae, which only mitochondria have.",
    },
    language: "en",
    expect: [],
  },
];

describe("golden set — questions that must never reach a student again", () => {
  it.each(GOLDEN)("$name", ({ question, language, expect: reasons }) => {
    const result = lintMcq(question, { language });
    expect(result.reasons.sort()).toEqual([...reasons].sort());
    expect(result.ok).toBe(reasons.length === 0);
  });
});

describe("planCorrectIndices", () => {
  it("spreads the answer across positions instead of leaving it at 0", () => {
    const plan = planCorrectIndices(24, 4, seededRng(7));
    expect(plan).toHaveLength(24);
    expect(new Set(plan).size).toBeGreaterThan(1);
    expect(plan.every((i) => i >= 0 && i < 4)).toBe(true);
  });

  it("returns nothing when there is nothing to plan", () => {
    expect(planCorrectIndices(0, 4)).toEqual([]);
    expect(planCorrectIndices(5, 1)).toEqual([]);
  });
});

describe("shuffleMcq", () => {
  it("moves the answer and keeps `correct` pointing at it", () => {
    const question: LintableMcq = {
      question: "Q",
      options: ["right", "w1", "w2", "w3"],
      correct: 0,
    };
    const shuffledQuestion = shuffleMcq(question, seededRng(3));
    expect(shuffledQuestion.options).toHaveLength(4);
    expect(shuffledQuestion.options[shuffledQuestion.correct]).toBe("right");
    expect([...shuffledQuestion.options].sort()).toEqual([...question.options].sort());
  });

  it("does not leave every answer at the index the model chose", () => {
    const rng = seededRng(11);
    const moved = Array.from({ length: 20 }, () =>
      shuffleMcq({ question: "Q", options: ["a", "b", "c", "d"], correct: 0 }, rng).correct);
    expect(new Set(moved).size).toBeGreaterThan(1);
  });
});

describe("filterMcqBatch", () => {
  it("keeps the good ones, reports why the rest went, and never silently drops", () => {
    const batch: LintableMcq[] = [
      { question: "Good one", options: ["Alpha", "Beta", "Gamma", "Delta"], correct: 1 },
      { question: "Bad one", options: ["Alpha", "Beta", "Gamma", "All of the above"], correct: 3 },
      { question: "Broken", options: ["only"], correct: 0 },
    ];
    const { kept, rejected } = filterMcqBatch(batch, { rng: seededRng(5) });
    expect(kept).toHaveLength(1);
    expect(kept[0]?.question).toBe("Good one");
    expect(rejected).toEqual([
      { index: 1, reasons: ["catch-all-option"] },
      { index: 2, reasons: ["shape"] },
    ]);
  });

  it("can skip the shuffle when the caller already placed the options", () => {
    const batch: LintableMcq[] = [
      { question: "Q", options: ["a", "b", "c", "d"], correct: 2 },
    ];
    const { kept } = filterMcqBatch(batch, { shuffle: false });
    expect(kept[0]?.correct).toBe(2);
  });
});

describe("languageMismatch", () => {
  it("abstains on strings too short to judge", () => {
    expect(languageMismatch("42", "uk")).toBe(false);
    expect(languageMismatch("$x=2$", "uk")).toBe(false);
  });

  it("abstains on a language it does not model", () => {
    expect(languageMismatch("Дуже довгий текст українською", "ja")).toBe(false);
  });

  it("catches Cyrillic in a Matura paper", () => {
    expect(languageMismatch("Дуже довгий текст українською", "pl")).toBe(true);
  });

  it("allows an English exam term inside a Ukrainian question", () => {
    expect(languageMismatch("Що перевіряє секція IELTS Reading у цьому завданні?", "uk")).toBe(false);
  });
});

describe("similarity", () => {
  it("treats punctuation-only differences as the same string", () => {
    expect(similarity("In the mitochondria", "in the mitochondria.")).toBe(1);
  });

  it("separates a real explanation from an echo", () => {
    expect(similarity("24 cm²", "Half the base times the height, so 24 cm².")).toBeLessThan(0.85);
  });
});

describe("mcqRulesBlock", () => {
  it("names the planned indices so the model cannot default to 0", () => {
    expect(mcqRulesBlock([2, 0, 3])).toContain("2, 0, 3");
  });

  it("still bans catch-alls when there is no plan", () => {
    const block = mcqRulesBlock([]);
    expect(block).not.toContain("0-based indices");
    expect(block).toContain("none of the above");
  });
});
