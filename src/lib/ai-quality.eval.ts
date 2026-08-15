/**
 * Live prompt eval. NOT part of `npm test` — it calls Anthropic for real,
 * costs money, and is non-deterministic.
 *
 *   npm run eval                 # 3 samples per prompt, Haiku
 *   AI_EVAL_SAMPLES=8 npm run eval
 *   AI_EVAL_MODEL=claude-sonnet-4-5 npm run eval
 *
 * question-lint.test.ts proves the linter still catches a known-bad question.
 * It cannot prove a *prompt* still produces good ones — the model is the thing
 * under test there, so only a real call answers it. Run this after editing any
 * MCQ system prompt, and before switching the model behind api/complete.js.
 *
 * Thresholds are deliberately loose: this is a smoke test for "the prompt got
 * worse", not a benchmark. A single bad sample is normal; 40% bad is a bug.
 */
import { describe, expect, it } from "vitest";
import { buildDrillSystem, buildExplainSystem } from "../features/learn/drill-exercises";
import { lintMcq, mcqRulesBlock, planCorrectIndices, type LintableMcq } from "./question-lint";

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.AI_EVAL_MODEL || "claude-haiku-4-5-20251001";
const SAMPLES = Number(process.env.AI_EVAL_SAMPLES || 3);

/** Share of generated questions that must survive the lint. */
const MIN_CLEAN_RATE = 0.7;
/** Share of answers that must sit somewhere other than index 0. */
const MIN_POSITION_SPREAD = 0.5;

async function complete(system: string, user: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!response.ok) throw new Error(`Anthropic ${response.status}: ${await response.text()}`);
  const data = await response.json() as { content?: { text?: string }[] };
  return (data.content || []).map((block) => block.text || "").join("");
}

function parseQuestions(raw: string): LintableMcq[] {
  const body = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  const parsed = JSON.parse(body) as { questions?: LintableMcq[] };
  return Array.isArray(parsed.questions) ? parsed.questions : [];
}

const MCQ_PROMPTS = [
  {
    name: "learn-drill (NMT math)",
    system: () => buildDrillSystem("Квадратні рівняння", "nmt", 3),
    user: "Drill me on: Квадратні рівняння",
    language: "uk",
  },
  {
    name: "learn-prove (IELTS)",
    system: () => `Generate exactly 4 real-exam-style MCQ questions for "Skimming for gist" (IELTS).
OUTPUT ONLY valid JSON — no markdown, no fences. Start with { end with }.
FORMAT: {"questions":[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"1-2 sentences","topic":"Skimming for gist"}]}
RULES: exam-difficulty, no warm-ups; 4 options, "correct" is 0-based index.
${mcqRulesBlock(planCorrectIndices(4, 4))}`,
    user: "Test me on: Skimming for gist",
    language: "en",
  },
];

describe.skipIf(!API_KEY)(`live prompt eval (${MODEL}, ${SAMPLES} samples)`, () => {
  it.each(MCQ_PROMPTS)("$name keeps the answer shape honest", async ({ system, user, language }) => {
    const questions: LintableMcq[] = [];
    for (let i = 0; i < SAMPLES; i++) {
      questions.push(...parseQuestions(await complete(system(), user)));
    }
    expect(questions.length).toBeGreaterThan(0);

    const results = questions.map((question) => lintMcq(question, { language }));
    const clean = results.filter((r) => r.ok).length;
    const cleanRate = clean / results.length;
    const atZero = questions.filter((q) => q.correct === 0).length;
    const spread = 1 - atZero / questions.length;

    const reasons = results.flatMap((r) => r.reasons);
    console.log(
      `${clean}/${results.length} clean (${Math.round(cleanRate * 100)}%), `
      + `${Math.round(spread * 100)}% off index 0`
      + (reasons.length ? ` — ${[...new Set(reasons)].join(", ")}` : ""),
    );

    expect(cleanRate).toBeGreaterThanOrEqual(MIN_CLEAN_RATE);
    expect(spread).toBeGreaterThanOrEqual(MIN_POSITION_SPREAD);
  }, 180_000);

  // The grader drifts toward praise, so a rubric that passes gibberish is the
  // failure mode worth catching before students notice Prove is free XP.
  it("does not pass a weak explanation", async () => {
    const weak = [
      "idk something about energy",
      "It is when the thing goes up and then it goes down again",
      "photosynthesis",
    ];
    const system = buildExplainSystem(
      "Why does increasing temperature speed up a reaction?",
      ["names collision frequency", "mentions activation energy"],
      "English",
    );
    for (const answer of weak) {
      const raw = await complete(system, answer);
      const graded = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as {
        score?: number;
        pass?: boolean;
      };
      console.log(`"${answer.slice(0, 30)}…" → score ${graded.score}, pass ${graded.pass}`);
      expect(graded.pass).toBe(false);
      expect(graded.score).toBeLessThan(6);
    }
  }, 180_000);
});
