/**
 * Canonical "official-ish" mock-exam shape per qualification (Phase 3 §3b —
 * see docs/phase-3-plan.md). Promotes what used to be an inline
 * EXAM_MOCK_SPECS object in AIChat.jsx into a real module alongside
 * scales.ts, adding a named duration instead of the ad-hoc "1.5 minutes per
 * question" math that used to live at each call site.
 *
 * "Official-ish" is deliberate, not modest phrasing: these are NOT licensed
 * real-paper timings — per Decision Log #37, real past-paper licensing
 * ($10k–$100k/y with Cambridge/College Board/Pearson) isn't feasible on a
 * solo-founder budget at launch. The durations here are exactly the
 * 1.5-min-per-question heuristic the app already used, just centralized and
 * named — no new numbers invented, no false precision claimed. `specFor`'s
 * `official` flag exists so UI copy can say "exam-style mock" rather than
 * imply a real board's actual clock.
 */

export interface ExamSpec {
  readonly questionCount: number;
  readonly durationMin: number;
  readonly note: string;
}

const MIN_PER_QUESTION = 1.5;
function spec(questionCount: number, note: string): ExamSpec {
  return { questionCount, durationMin: Math.round(questionCount * MIN_PER_QUESTION), note };
}

export const EXAM_SPECS: Record<string, ExamSpec> = {
  nmt: spec(20, "НМТ style: single-best-answer and matching items, moderate-to-hard, curriculum-faithful to the Ukrainian program."),
  sat: spec(22, "Digital SAT style: concise multiple-choice, evidence and reasoning focus, adaptive difficulty."),
  act: spec(20, "ACT style: fast-paced four-option multiple-choice."),
  ap: spec(16, "AP style: college-level multiple-choice, application-heavy."),
  ib: spec(18, "IB style: multiple-choice using command terms, HL-level rigour."),
  gcse: spec(18, "GCSE style: graduated difficulty from foundation to higher tier."),
  alevel: spec(18, "A-Level style: demanding multi-step multiple-choice."),
  matura: spec(18, "Matura style: exam-board multiple-choice."),
  abitur: spec(16, "Abitur style: analytical multiple-choice."),
  bac: spec(16, "Baccalauréat général: written papers are 4h (français, philosophie, most spécialités); Grand oral is 20 min. Practice uses exam-style items, not a licensed annales clock."),
  gre: spec(27, "Shorter GRE (Sept 2023+): Verbal 27/41, Quant 27/47. AWA is a separate 30-min Issue essay. Practice uses exam-style items, not a licensed PowerPrep clock."),
  ielts: spec(40, "IELTS Reading: 3 passages, 40 questions, 60 minutes. Writing and Listening use their own clocks."),
};

export interface ResolvedExamSpec extends ExamSpec {
  /** False when falling back to the generic topic-count heuristic — no named
   * spec exists for this qualification (yet). Drives whether the UI can
   * claim "exam-style mock" for this qualification specifically or has to
   * stay generic. */
  readonly official: boolean;
}

/**
 * Resolves the spec for a qualification id (nmt/sat/gcse/...), falling back
 * to the same topic-count-derived heuristic Practice mode and the generic
 * path already used before named specs existed: 12–24 questions, 2 per topic.
 */
export function specFor(qualificationId: string | null | undefined, topicCount: number): ResolvedExamSpec {
  const known = qualificationId ? EXAM_SPECS[qualificationId] : undefined;
  if (known) return { ...known, official: true };
  const questionCount = Math.max(12, Math.min(24, topicCount > 0 ? topicCount * 2 : 16));
  return { ...spec(questionCount, "at genuine exam difficulty for this subject"), official: false };
}
