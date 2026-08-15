// Learn Drill question shapes + scoring.
//
// 3.7a only scored mcq / fill. 3.7b adds match, order, drag_drop, explain.
// Keep every scorer here so Vitest can hit them without mounting LearnMain.
// The model lies about JSON shape; normalize is the contract, not the prompt.

import { mcqRulesBlock, planCorrectIndices } from "../../lib/question-lint";

export type McqQuestion = {
  type: "mcq";
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

export type FillQuestion = {
  type: "fill";
  question: string;
  answer: string;
  accept: readonly string[];
  explanation: string;
};

export type MatchPair = { left: string; right: string };

export type MatchQuestion = {
  type: "match";
  question: string;
  pairs: readonly MatchPair[];
  explanation: string;
};

export type OrderQuestion = {
  type: "order";
  question: string;
  items: readonly string[];
  explanation: string;
};

export type DragDropQuestion = {
  type: "drag_drop";
  question: string;
  bank: readonly string[];
  answers: readonly string[];
  explanation: string;
};

export type ExplainQuestion = {
  type: "explain";
  question: string;
  rubric: readonly string[];
  modelAnswer: string;
  explanation: string;
};

export type DrillQuestion =
  | McqQuestion
  | FillQuestion
  | MatchQuestion
  | OrderQuestion
  | DragDropQuestion
  | ExplainQuestion;

export type ExplainGrade = {
  score: number;
  pass: boolean;
  feedback: string;
};

const TYPE_ALIAS: Record<string, DrillQuestion["type"]> = {
  mcq: "mcq",
  multiple_choice: "mcq",
  fill: "fill",
  fill_in: "fill",
  fill_in_blank: "fill",
  match: "match",
  matching: "match",
  order: "order",
  sequence: "order",
  sort: "order",
  drag_drop: "drag_drop",
  dragdrop: "drag_drop",
  cloze: "drag_drop",
  gap: "drag_drop",
  explain: "explain",
  short_answer: "explain",
  open: "explain",
};

export function normalizeAnswer(s: unknown): string {
  return (s ?? "").toString().toLowerCase().trim().replace(/\s+/g, " ");
}

export function shuffled<T>(items: readonly T[]): T[] {
  const next = items.slice();
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = next[i];
    next[i] = next[j] as T;
    next[j] = tmp as T;
  }
  return next;
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null;
}

function asString(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function asStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(asString).filter(Boolean);
}

function firstList(row: Record<string, unknown>, keys: readonly string[]): string[] {
  for (const key of keys) {
    const list = asStringList(row[key]);
    if (list.length) return list;
  }
  return [];
}

function explanationOf(row: Record<string, unknown>): string {
  return asString(row.explanation) || asString(row.explain) || "";
}

function readPairs(row: Record<string, unknown>): MatchPair[] {
  if (Array.isArray(row.pairs)) {
    return row.pairs.map((item) => {
      const rec = asRecord(item);
      if (!rec) return null;
      const left = asString(rec.left) || asString(rec.term) || asString(rec.l);
      const right = asString(rec.right) || asString(rec.definition) || asString(rec.r);
      return left && right ? { left, right } : null;
    }).filter((p): p is MatchPair => Boolean(p));
  }
  const obj = asRecord(row.pairs);
  if (!obj) return [];
  return Object.entries(obj)
    .map(([left, right]) => {
      const r = asString(right);
      return left.trim() && r ? { left: left.trim(), right: r } : null;
    })
    .filter((p): p is MatchPair => Boolean(p));
}

function blankCount(question: string): number {
  const matches = question.match(/_{3,}/g);
  return matches ? matches.length : 0;
}

export function normalizeDrillQuestion(raw: unknown): DrillQuestion | null {
  const row = asRecord(raw);
  if (!row) return null;
  const type = TYPE_ALIAS[asString(row.type).toLowerCase()];
  if (!type) return null;
  const question = asString(row.question) || asString(row.prompt) || asString(row.statement);
  if (!question) return null;
  const explanation = explanationOf(row);

  if (type === "mcq") {
    const options = asStringList(row.options);
    const correct = Number(row.correct);
    if (options.length < 2 || !Number.isInteger(correct) || correct < 0 || correct >= options.length) {
      return null;
    }
    return { type, question, options, correct, explanation };
  }

  if (type === "fill") {
    const answer = asString(row.answer) || asString(row.expected);
    if (!answer) return null;
    return { type, question, answer, accept: asStringList(row.accept), explanation };
  }

  if (type === "match") {
    const pairs = readPairs(row);
    if (pairs.length < 2 || pairs.length > 6) return null;
    return { type, question, pairs, explanation };
  }

  if (type === "order") {
    const items = firstList(row, ["items", "steps", "order"]);
    if (items.length < 3 || items.length > 6) return null;
    return { type, question, items, explanation };
  }

  if (type === "drag_drop") {
    const answers = firstList(row, ["answers", "slots"]);
    const bankRaw = firstList(row, ["bank", "choices"]);
    const blanks = blankCount(question);
    if (answers.length < 1 || answers.length > 4) return null;
    if (blanks > 0 && blanks !== answers.length) return null;
    const bank = Array.from(new Set([...answers, ...bankRaw]));
    if (bank.length < answers.length) return null;
    return { type, question, bank, answers, explanation };
  }

  const rubric = firstList(row, ["rubric", "criteria"]);
  const modelAnswer = asString(row.modelAnswer) || asString(row.model_answer) || asString(row.answer);
  return { type: "explain", question, rubric, modelAnswer, explanation };
}

export function normalizeDrillQuestions(raw: unknown): DrillQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: DrillQuestion[] = [];
  for (const item of raw) {
    const q = normalizeDrillQuestion(item);
    if (q) out.push(q);
  }
  return out;
}

export function scoreFill(q: FillQuestion, input: unknown): boolean {
  const user = normalizeAnswer(input);
  const accepts = [q.answer, ...q.accept].map(normalizeAnswer);
  return Boolean(user) && accepts.some((a) => a && a === user);
}

export function scoreMatch(q: MatchQuestion, chosen: Record<string, string>): boolean {
  if (Object.keys(chosen).length !== q.pairs.length) return false;
  return q.pairs.every((pair) => normalizeAnswer(chosen[pair.left]) === normalizeAnswer(pair.right));
}

export function scoreOrder(q: OrderQuestion, chosen: readonly string[]): boolean {
  if (chosen.length !== q.items.length) return false;
  return q.items.every((item, i) => normalizeAnswer(item) === normalizeAnswer(chosen[i]));
}

export function scoreDragDrop(q: DragDropQuestion, slots: readonly (string | null)[]): boolean {
  if (slots.length !== q.answers.length) return false;
  return q.answers.every((answer, i) => normalizeAnswer(slots[i]) === normalizeAnswer(answer));
}

export function scoreDrill(
  q: DrillQuestion,
  input: unknown,
): boolean {
  if (q.type === "mcq") return input === q.correct;
  if (q.type === "fill") return scoreFill(q, input);
  if (q.type === "match") {
    return asRecord(input) ? scoreMatch(q, input as Record<string, string>) : false;
  }
  if (q.type === "order") {
    return Array.isArray(input) ? scoreOrder(q, input.map((x) => String(x))) : false;
  }
  if (q.type === "drag_drop") {
    return Array.isArray(input) ? scoreDragDrop(q, input.map((x) => (x == null ? null : String(x)))) : false;
  }
  return false;
}

function tryParseJsonObject(s: string): Record<string, unknown> | null {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  const slice = s.slice(start, end + 1);
  for (const candidate of [slice, slice.replace(/\\(?!["\\/bfnrtu])/g, "\\\\")]) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // try the repaired slice
    }
  }
  return null;
}

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(10, Math.round(v)));
}

export function parseExplainGrade(raw: unknown): ExplainGrade {
  const row = typeof raw === "string" ? tryParseJsonObject(raw) : asRecord(raw);
  if (row) {
    const feedback = asString(row.feedback) || asString(row.comment) || asString(row.text);
    const score = clampScore(row.score ?? row.clarity ?? row.completeness);
    const passFlag = row.pass === true || row.correct === true;
    if (feedback) {
      return { score, pass: passFlag || score >= 6, feedback };
    }
  }
  if (typeof raw === "string" && raw.trim()) {
    return { score: 0, pass: false, feedback: raw.trim() };
  }
  throw new Error("invalid explain grade");
}

export function buildDrillSystem(nodeTitle: string, examTaxonomy: string, complexity: number): string {
  return `Generate exactly 5 practice questions for the concept "${nodeTitle}" (${examTaxonomy.toUpperCase()} exam prep).
OUTPUT ONLY valid JSON — no markdown, no fences. Start with { end with }.
FORMAT: {"questions":[
  {"type":"mcq","question":"...","options":["A","B","C","D"],"correct":0,"explanation":"1 sentence"},
  {"type":"match","question":"Match each term.","pairs":[{"left":"term","right":"definition"}],"explanation":"1 sentence"},
  {"type":"order","question":"Put the steps in order.","items":["first","second","third"],"explanation":"1 sentence"},
  {"type":"drag_drop","question":"The ___ of a triangle is half the ___ times height.","bank":["area","base","volume"],"answers":["area","base"],"explanation":"1 sentence"},
  {"type":"explain","question":"In your own words, why ...?","rubric":["names the rule","gives one example"],"modelAnswer":"2-3 sentences","explanation":"1 sentence"}
]}
RULES:
- One of each type above, in any order. fill is also allowed instead of mcq.
- match: 3-5 pairs. order: 3-5 items in the CORRECT sequence. drag_drop: 1-3 blanks written as ___ in the question; answers[i] fills blank i; bank includes the answers plus 1-2 distractors.
- explain rubric has 2-4 concrete checks. Difficulty matches complexity ${complexity}/5.
- Every string the student sees is in the exam paper language.
${mcqRulesBlock(planCorrectIndices(1, 4))}`;
}

export function buildExplainSystem(
  nodeTitle: string,
  rubric: readonly string[],
  language: string,
): string {
  const checks = rubric.length
    ? rubric.map((line, i) => `${i + 1}. ${line}`).join("\n")
    : "1. Names the core idea\n2. Avoids a common misconception";
  return `You grade a short student explanation of "${nodeTitle}".

OUTPUT ONLY valid JSON — no markdown fences, no prose around it:
{"score":0-10,"pass":true,"feedback":"3-6 sentences, concrete"}

Rubric (mark each):
${checks}

Rules:
- pass is true when score >= 6.
- Quote what they got right. Name what they skipped.
- Gibberish or off-topic still gets a real grade.
- Language: ${language}.
- Math as LaTeX $...$. In JSON, write every backslash twice (\\\\frac not \\frac).`;
}
