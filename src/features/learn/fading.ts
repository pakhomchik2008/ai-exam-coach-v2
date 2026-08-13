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

export function normalizeAnswer(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "").replace(/[·*×⋅]/g, "").replace(/^\(+|\)+$/g, "");
}

export function stepMatches(input: string, step: FadeStep): boolean {
  const got = normalizeAnswer(input);
  if (!got) return false;
  if (got === normalizeAnswer(step.answer)) return true;
  return step.accept.some((alt) => normalizeAnswer(alt) === got);
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
