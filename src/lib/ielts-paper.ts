/**
 * Real IELTS paper shapes. Practice is one section; Exam Sim is the
 * full Reading clock (3 passages / 40 / 60) or both Writing tasks.
 * Academic vs General Training is chosen per sitting, not stored.
 */
import { clampToScale, SCALES } from "./scales";
import { isIeltsQual } from "./ielts-listen";

export type IeltsModule = "academic" | "gt";
export type IeltsPaper = "reading" | "writing" | "listening";
export type IeltsRunMode = "quick" | "practice" | "exam";

export const IELTS_READING = {
  quick: { passages: 1, questions: 5, minutes: 0 },
  practice: { passages: 1, questions: 10, minutes: 20 },
  exam: { passages: 3, questions: 40, minutes: 60 },
} as const;

export const IELTS_WRITING = {
  practice: { tasks: 1, minutes: 20 },
  exam: { tasks: 2, minutes: 60 },
} as const;

export function isIeltsReadingTopic(
  topic: string | null | undefined,
  qualificationId?: string | null,
): boolean {
  if (!isIeltsQual(qualificationId)) return false;
  return /(read|читан)/i.test(topic || "");
}

export function isIeltsWritingTopic(
  topic: string | null | undefined,
  qualificationId?: string | null,
): boolean {
  if (!isIeltsQual(qualificationId)) return false;
  return /(writ|письм|écrit)/i.test(topic || "");
}

export type TfngValue = "true" | "false" | "ng";

export function normalizeTfng(raw: unknown): TfngValue | null {
  const s = String(raw || "").trim().toLowerCase();
  if (s === "true" || s === "t" || s === "yes") return "true";
  if (s === "false" || s === "f" || s === "no") return "false";
  if (s === "ng" || s === "not given" || s === "notgiven") return "ng";
  return null;
}

export function answersMatch(user: string, answer: string, accept: string[] = []): boolean {
  const norm = (s: string) => String(s).toLowerCase().trim().replace(/\s+/g, " ");
  const compact = (s: string) => norm(s).replace(/\s/g, "");
  const u = norm(user);
  const pool = [answer, ...accept].map(norm);
  return pool.some((a) => a && (a === u || a.includes(u) || u.includes(a) || compact(a) === compact(u)));
}

export function snapBand(n: number): number {
  return clampToScale(n, SCALES.ielts);
}

export function wordCount(text: string): number {
  const t = (text || "").trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

export function readingPrompt(opts: {
  mode: IeltsRunMode;
  module: IeltsModule;
  passageIndex: number;
  passageCount: number;
  questionCount: number;
}): string {
  const { mode, module, passageIndex, passageCount, questionCount } = opts;
  const flavour = module === "gt"
    ? "General Training: workplace / everyday / social notices or magazine-style prose."
    : "Academic: journalistic or academic article. Dense, factual, no invented citations.";
  return `You write ONE IELTS Reading passage and its questions. This is passage ${passageIndex} of ${passageCount} (${mode}).
${flavour}

OUTPUT ONLY valid JSON — no markdown, no fences. Start with { end with }.

FORMAT:
{"title":"short title","text":"400-900 words. Paragraphs separated by a blank line.","questions":[...]}

QUESTION TYPES (mix at least 2):
{"type":"tfng","question":"The writer says…","correct":"true|false|ng","explanation":"1 sentence + paragraph hint"}
{"type":"mcq","question":"…","options":["A","B","C","D"],"correct":0,"explanation":"1 sentence"}
{"type":"fill","question":"Complete: The museum opens at ___","answer":"9am","accept":["9 am","09:00"],"explanation":"1 sentence"}

RULES:
- Exactly ${questionCount} questions. They MUST be answerable from THIS passage only.
- Do not leak answers in the question stem.
- TFNG: "not given" means the passage is silent, not that it is false.
- text is the full passage the student will read. No questions inside the text.`;
}

export function writingTaskPrompt(opts: {
  module: IeltsModule;
  task: 1 | 2;
}): string {
  const { module, task } = opts;
  if (task === 1 && module === "academic") {
    return `Create one IELTS Academic Writing Task 1.
OUTPUT ONLY valid JSON — no markdown, no fences.
FORMAT: {"task":1,"title":"The chart below shows…","instructions":"Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.","minWords":150,"svg":"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 360 220'>…simple bar or line chart, currentColor strokes, no script…</svg>"}
RULES: invent plausible numbers. SVG must be a complete <svg>…</svg>. No axes labels smaller than 10px.`;
  }
  if (task === 1) {
    return `Create one IELTS General Training Writing Task 1 (a letter).
OUTPUT ONLY valid JSON — no markdown, no fences.
FORMAT: {"task":1,"title":"You should spend about 20 minutes on this task.","instructions":"You recently… Write a letter to… You should write at least 150 words.","minWords":150,"letterType":"formal|semi-formal|informal"}
RULES: one clear situation, 3 bullet points the letter must cover.`;
  }
  return `Create one IELTS Writing Task 2 essay prompt (${module === "gt" ? "General Training" : "Academic"}).
OUTPUT ONLY valid JSON — no markdown, no fences.
FORMAT: {"task":2,"title":"You should spend about 40 minutes on this task.","instructions":"Some people believe… To what extent do you agree or disagree? Write at least 250 words.","minWords":250}
RULES: one opinion / discussion / problem-solution prompt. No charts.`;
}

export function writingScorePrompt(opts: {
  module: IeltsModule;
  task: 1 | 2;
  instructions: string;
  essay: string;
  words: number;
  minWords: number;
}): string {
  return `You are an IELTS Writing examiner. Score this ${opts.module === "gt" ? "General Training" : "Academic"} Task ${opts.task}.
Official criteria: Task Achievement/Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy. Bands 0–9 in 0.5 steps.
Minimum words: ${opts.minWords}. Student wrote ${opts.words}.

TASK:
${opts.instructions}

ESSAY:
${opts.essay}

OUTPUT ONLY valid JSON:
{"overall":6.5,"task":6.0,"cohesion":6.5,"lexical":7.0,"grammar":6.0,"why":"2-3 sentences, honest, specific.","improve":["one concrete fix","another","a third"]}
RULES: overall is the mean of the four, snapped to 0.5. Under-length must cost Task. No cheerleading.`;
}
