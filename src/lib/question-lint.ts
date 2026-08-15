/**
 * Answer-shape lint for AI multiple choice.
 *
 * Every LLM writes the correct option more carefully than the distractors, so
 * "pick the longest one" scores well above chance without knowing the subject.
 * A student learns that pattern in a week and then trains the wrong reflex.
 * Model choice does not fix it — Sonnet has the same tell, just less often —
 * so the fix has to live between the parse and the screen.
 *
 * Four cheap checks, all pure so Vitest can hit them with recorded bad output
 * instead of a live model:
 *
 *   length-bias      correct option is the longest AND meaningfully longer
 *   catch-all        "all of the above" — free marks, never on a real paper
 *   duplicate-option two options that normalize to the same string
 *   explanation-echo explanation restates the option instead of teaching
 *   language-mix     Ukrainian question with Russian options, and the reverse
 *
 * Position bias gets handled twice on purpose: `planCorrectIndices` tells the
 * model where to put each answer (so its own few-shot habit of `"correct":0`
 * is overridden before generation), and `shuffleMcq` permutes again after
 * parsing (so a model that ignored the plan still lands somewhere random).
 */

import { normalizeQuestionText } from "./question-novelty";

export type LintableMcq = {
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
};

export type LintReason =
  | "shape"
  | "length-bias"
  | "catch-all-option"
  | "duplicate-option"
  | "explanation-echo"
  | "language-mix";

export type LintResult = { ok: boolean; reasons: LintReason[] };

export type Rng = () => number;

/**
 * A fixed ±N% corridor rejects legitimate maths, where "no real solutions"
 * sits next to "$x=2$" and the ratio is meaningless. Both conditions have to
 * hold: clearly longer in relative terms AND long enough in absolute terms
 * that a student could see it across the room.
 */
export const LENGTH_BIAS_RATIO = 1.35;
export const LENGTH_BIAS_MIN_CHARS = 12;

/**
 * Whole-string similarity, not containment. A good explanation naturally
 * quotes the answer ("half the base times the height, so 24 cm²"); a useless
 * one _is_ the answer with a full stop added.
 */
export const ECHO_SIMILARITY = 0.85;

/** Below this many letters a script ratio is noise, so the language check abstains. */
const MIN_LETTERS_FOR_LANGUAGE = 8;

const CATCH_ALL = [
  /^(all|none|any) of (the )?(above|these|them)\.?$/i,
  /^both [ab] and [bc]\.?$/i,
  /^(всі|жоден|жодне|усі) (з )?(перелічен|наведен|вищепереліч)/i,
  /^(все|ничего|ни один|ни одно) (из )?(перечислен|вышепереч|указан)/i,
  /^(toutes|aucune) (les |des )?(réponses|propositions)/i,
  /^(alle|keine) (der )?(genannten|obigen)/i,
];

const CYRILLIC = /\p{Script=Cyrillic}/u;
const LATIN = /\p{Script=Latin}/u;
// Letters that exist in exactly one of the two Cyrillic alphabets we ship.
const UK_ONLY = /[іїєґ]/i;
const RU_ONLY = /[ыэъё]/i;

const CYRILLIC_LANGS = new Set(["uk", "ru"]);
// Paper languages from paper-language.ts, plus `ru` — not a paper language,
// but the UI language the Ukrainian papers actually get contaminated with.
const LATIN_LANGS = new Set(["en", "fr", "de", "pl", "es"]);

/**
 * Where the correct answer should sit in each question of a batch. Handed to
 * the model in the prompt and checked against what comes back — a model that
 * ignores the plan is also the model most likely to have ignored the rest of
 * the format, which is worth knowing.
 */
export function planCorrectIndices(
  count: number,
  optionCount: number,
  rng: Rng = Math.random,
): number[] {
  if (!Number.isFinite(count) || count <= 0) return [];
  if (!Number.isFinite(optionCount) || optionCount < 2) return [];
  const plan: number[] = [];
  for (let i = 0; i < count; i++) {
    plan.push(Math.floor(rng() * optionCount) % optionCount);
  }
  return plan;
}

/** Fisher-Yates over the options, with `correct` following its own text. */
export function shuffleMcq<T extends LintableMcq>(question: T, rng: Rng = Math.random): T {
  const options = question.options.slice();
  const answer = options[question.correct];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = options[i] as string;
    options[i] = options[j] as string;
    options[j] = tmp;
  }
  const correct = options.indexOf(answer as string);
  return { ...question, options, correct: correct < 0 ? question.correct : correct };
}

/** 0..1, where 1 is identical after normalization. Cheap enough for one option. */
export function similarity(a: string, b: string): number {
  const left = normalizeQuestionText(a);
  const right = normalizeQuestionText(b);
  if (!left && !right) return 1;
  if (!left || !right) return 0;
  if (left === right) return 1;
  const distance = levenshtein(left, right);
  return 1 - distance / Math.max(left.length, right.length);
}

function levenshtein(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        (current[j - 1] as number) + 1,
        (previous[j] as number) + 1,
        (previous[j - 1] as number) + cost,
      );
    }
    previous = current;
  }
  return previous[b.length] as number;
}

/**
 * True when the text is not written in the paper language. Maths is stripped
 * first: `$\frac{1}{2}$` is Latin to a script test and would flag every
 * Ukrainian algebra question.
 */
export function languageMismatch(text: string, language: string | null | undefined): boolean {
  if (!language) return false;
  const lang = language.slice(0, 2).toLowerCase();
  const wantsCyrillic = CYRILLIC_LANGS.has(lang);
  if (!wantsCyrillic && !LATIN_LANGS.has(lang)) return false;

  const prose = text.replace(/\$[^$]*\$/g, " ").replace(/\\[a-zA-Z]+/g, " ");
  let cyrillic = 0;
  let latin = 0;
  for (const char of prose) {
    if (CYRILLIC.test(char)) cyrillic++;
    else if (LATIN.test(char)) latin++;
  }
  const letters = cyrillic + latin;
  if (letters < MIN_LETTERS_FOR_LANGUAGE) return false;

  const wantedShare = (wantsCyrillic ? cyrillic : latin) / letters;
  if (wantedShare < 0.5) return true;

  // Both alphabets are Cyrillic, so the script ratio cannot separate them.
  if (lang === "uk" && RU_ONLY.test(prose)) return true;
  if (lang === "ru" && UK_ONLY.test(prose)) return true;
  return false;
}

/**
 * Duplicate detection cannot reuse `normalizeQuestionText`: that one strips
 * every non-alphanumeric character because it exists to hash paraphrases, so
 * `$x=2$` and `$x=-2$` collapse to the same string and a perfectly good
 * algebra question gets thrown away. Options need punctuation-insensitive but
 * sign-preserving comparison.
 */
function normalizeOption(option: string): string {
  return option
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[.,;:!?]+$/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isCatchAll(option: string): boolean {
  const trimmed = option.trim();
  return CATCH_ALL.some((pattern) => pattern.test(trimmed));
}

function hasLengthBias(options: readonly string[], correct: number): boolean {
  if (options.length < 3) return false;
  const answer = (options[correct] ?? "").trim();
  const distractors = options.filter((_, i) => i !== correct).map((o) => o.trim());
  const longestDistractor = Math.max(...distractors.map((o) => o.length));
  if (answer.length <= longestDistractor) return false;
  const mean = distractors.reduce((sum, o) => sum + o.length, 0) / distractors.length;
  if (mean <= 0) return false;
  return answer.length >= mean * LENGTH_BIAS_RATIO
    && answer.length - mean >= LENGTH_BIAS_MIN_CHARS;
}

export function lintMcq(
  question: LintableMcq,
  options: { language?: string | null | undefined } = {},
): LintResult {
  const reasons: LintReason[] = [];
  const opts = Array.isArray(question.options) ? question.options : [];
  const correct = question.correct;
  const shapeOk = typeof question.question === "string"
    && question.question.trim().length > 0
    && opts.length >= 2
    && opts.every((o) => typeof o === "string" && o.trim().length > 0)
    && Number.isInteger(correct)
    && correct >= 0
    && correct < opts.length;
  if (!shapeOk) return { ok: false, reasons: ["shape"] };

  if (hasLengthBias(opts, correct)) reasons.push("length-bias");
  if (opts.some(isCatchAll)) reasons.push("catch-all-option");

  const seen = new Set<string>();
  for (const option of opts) {
    const key = normalizeOption(option);
    if (seen.has(key)) {
      reasons.push("duplicate-option");
      break;
    }
    seen.add(key);
  }

  const explanation = (question.explanation || "").trim();
  if (explanation && similarity(explanation, opts[correct] as string) >= ECHO_SIMILARITY) {
    reasons.push("explanation-echo");
  }

  if (options.language) {
    const surfaces = [question.question, ...opts];
    if (surfaces.some((text) => languageMismatch(text, options.language))) {
      reasons.push("language-mix");
    }
  }

  return { ok: reasons.length === 0, reasons };
}

export type BatchRejection = { index: number; reasons: LintReason[] };

export type BatchResult<T> = {
  kept: T[];
  rejected: BatchRejection[];
};

/**
 * Lint a generated batch and shuffle the survivors.
 *
 * Rejections are returned, never swallowed — the whole point of this pass is
 * that a question disappearing from a drill has a reason attached to it that
 * the caller can count and show.
 */
export function filterMcqBatch<T extends LintableMcq>(
  questions: readonly T[],
  options: { language?: string | null | undefined; rng?: Rng; shuffle?: boolean } = {},
): BatchResult<T> {
  const rng = options.rng || Math.random;
  const shuffle = options.shuffle !== false;
  const kept: T[] = [];
  const rejected: BatchRejection[] = [];
  questions.forEach((question, index) => {
    const result = lintMcq(question, { language: options.language });
    if (!result.ok) {
      rejected.push({ index, reasons: result.reasons });
      return;
    }
    kept.push(shuffle ? shuffleMcq(question, rng) : question);
  });
  return { kept, rejected };
}

/**
 * A dropped question must never be invisible. Before this pass the generators
 * ended in `.filter(...)`, so a batch that came back malformed just rendered
 * shorter and nobody — student or maintainer — knew a question had been eaten.
 *
 * `window.Sentry` is an optional hook (nothing is installed today, same as
 * brain-store.jsx and onboarding-data.jsx), so the console is the real
 * destination for now. The count the student sees is the honest signal.
 */
export function reportRejections(source: string, rejected: readonly BatchRejection[]): void {
  if (!rejected.length || typeof window === "undefined") return;
  const reasons = rejected.flatMap((row) => row.reasons).join(", ");
  const message = `question-lint: dropped ${rejected.length} question(s) from ${source} — ${reasons}`;
  const sentry = (window as unknown as {
    Sentry?: { captureMessage: (msg: string, level?: string) => void };
  }).Sentry;
  if (sentry) sentry.captureMessage(message, "warning");
  else console.warn(message);
}

/**
 * Prompt fragment shared by every MCQ generator in the app. Kept here rather
 * than copy-pasted into eight system prompts so a wording fix lands once and
 * `golden` fixtures keep testing the thing that is actually shipped.
 */
export function mcqRulesBlock(plan: readonly number[]): string {
  const positions = plan.length
    ? `- Put the correct answer at these 0-based indices, in question order: ${plan.join(", ")}. Do not deviate.\n`
    : "";
  return `${positions}- All options within a question must be within a few words of the same length. Never make the correct one the most detailed.
- No "all of the above", "none of the above", or "both A and B".
- Every distractor must be a real misconception a student holds, not filler.
- The explanation teaches WHY the answer is right; it must not just repeat the option text.`;
}
