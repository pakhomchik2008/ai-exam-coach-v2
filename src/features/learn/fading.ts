// Worked-example fading — parse the 5-level plan and score a step.
//
// No SymPy. Accept-list + collapsed-string match. Sonnet can still
// put equivalent forms in `accept`.

export type FadeStep = {
  reveal: string;
  answer: string;
  accept: readonly string[];
  hint: string;
};

export type FadePlan = {
  title: string;
  problem: string;
  steps: FadeStep[];
};

export function parseFadePlan(raw: unknown): FadePlan {
  if (!raw || typeof raw !== "object") throw new Error("invalid fade plan");
  const row = raw as { title?: unknown; problem?: unknown; steps?: unknown };
  const title = typeof row.title === "string" ? row.title.trim() : "";
  const problem = typeof row.problem === "string" ? row.problem.trim() : "";
  if (!title || !problem || !Array.isArray(row.steps) || row.steps.length < 3) {
    throw new Error("fade plan missing fields");
  }
  const steps = row.steps.slice(0, 6).map((s, i) => {
    const step = s && typeof s === "object" ? s as { reveal?: unknown; answer?: unknown; accept?: unknown; hint?: unknown } : {};
    const reveal = typeof step.reveal === "string" ? step.reveal.trim() : "";
    const answer = typeof step.answer === "string" ? step.answer.trim() : "";
    if (!reveal || !answer) throw new Error(`fade step ${i + 1} incomplete`);
    const accept = Array.isArray(step.accept)
      ? step.accept.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];
    const hint = typeof step.hint === "string" ? step.hint.trim() : "";
    return { reveal, answer, accept, hint };
  });
  return { title, problem, steps };
}

const STOP = new Set([
  "the", "a", "an", "of", "is", "are", "to", "by", "that", "this", "so", "any",
  "and", "or", "for", "in", "on", "it", "its", "be", "as", "with", "then",
]);

export function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .replace(/\$/g, "")
    .replace(/\s+/g, "")
    .replace(/[·*×⋅]/g, "")
    .replace(/^\(+|\)+$/g, "");
}

function contentTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/\$/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0 && !STOP.has(t));
}

function tokenFits(got: string, want: string): boolean {
  if (got === want) return true;
  const [short, long] = got.length <= want.length ? [got, want] : [want, got];
  return short.length >= 3 && long.startsWith(short);
}

function phraseMatches(input: string, expected: string): boolean {
  const got = normalizeAnswer(input);
  const want = normalizeAnswer(expected);
  if (!got || !want) return false;
  if (got === want) return true;
  if (want.length >= 8 && (got.includes(want) || want.includes(got))) return true;
  const wantTokens = contentTokens(expected);
  const gotTokens = contentTokens(input);
  if (wantTokens.length === 0 || gotTokens.length === 0) return false;
  // Formulas stay exact. Phrase mode only when the key has a real word.
  if (!wantTokens.some((t) => /[a-z]{3,}/.test(t))) return false;
  return wantTokens.every((w) => gotTokens.some((g) => tokenFits(g, w)));
}

export function stepMatches(input: string, step: FadeStep): boolean {
  if (phraseMatches(input, step.answer)) return true;
  return step.accept.some((alt) => phraseMatches(input, alt));
}

// Level 1 = all revealed. Each next level hides one more step from the end.
export function hiddenCountForLevel(level: number, stepCount: number): number {
  if (level <= 1) return 0;
  return Math.min(stepCount, level - 1);
}

export function hiddenIndexes(level: number, stepCount: number): number[] {
  const hide = hiddenCountForLevel(level, stepCount);
  const start = stepCount - hide;
  return Array.from({ length: hide }, (_, i) => start + i);
}
