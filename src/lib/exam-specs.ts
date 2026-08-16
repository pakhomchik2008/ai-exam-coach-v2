/**
 * Mock-exam clock + count. Subject sittings come from paper-shapes.ts
 * (official board характеристики). A bare qualification id is no longer
 * "official" — that was the GCSE History → 18 MCQ lie.
 *
 * Decision #37 still holds: no licensed item bank. Decision #113: public
 * structure only; generate original items; student file optional.
 */
import { paperShapeFor, sittingById, type PaperSitting } from "./paper-shapes";

export interface ExamSpec {
  readonly questionCount: number;
  readonly durationMin: number;
  readonly note: string;
}

export interface ResolvedExamSpec extends ExamSpec {
  readonly official: boolean;
  readonly sitting: PaperSitting | null;
}

const MIN_PER_QUESTION = 1.5;
function spec(questionCount: number, note: string): ExamSpec {
  return { questionCount, durationMin: Math.round(questionCount * MIN_PER_QUESTION), note };
}

/** Kept for tests that still list family-level heuristics. Not official. */
export const EXAM_SPECS: Record<string, ExamSpec> = {
  nmt: spec(20, "НМТ is per subject — use paper-shapes, not this family row."),
  sat: spec(22, "Digital SAT is per section — Reading and Writing 54/64 or Math 44/70."),
  act: spec(20, "ACT style: fast-paced four-option multiple-choice."),
  ap: spec(16, "AP style: college-level multiple-choice, application-heavy."),
  ib: spec(18, "IB style: multiple-choice using command terms, HL-level rigour."),
  gcse: spec(18, "GCSE is per subject and paper — History is two 2-hour written papers."),
  alevel: spec(18, "A-Level style: demanding multi-step multiple-choice."),
  matura: spec(18, "Matura style: exam-board multiple-choice."),
  abitur: spec(16, "Abitur style: analytical multiple-choice."),
  bac: spec(16, "Baccalauréat général: written papers are 4h; Grand oral is 20 min."),
  gre: spec(27, "Shorter GRE: Verbal 27/41, Quant 27/47, AWA 30-min Issue."),
  gmat: spec(21, "GMAT Focus: Quant 21/45, Verbal 23/45, Data Insights 20/45."),
  pte: spec(20, "PTE Academic (~2h): 22 item types across four skills."),
  ielts: spec(40, "IELTS Reading: 3 passages, 40 questions, 60 minutes."),
};

export function specFor(
  qualificationId: string | null | undefined,
  topicCount: number,
  examName?: string | null,
  paperId?: string | null,
): ResolvedExamSpec {
  const shape = paperShapeFor({
    qualificationId: qualificationId || null,
    name: examName || null,
  });
  const sitting = sittingById(shape, paperId);
  if (shape && sitting) {
    return {
      questionCount: sitting.questionCount,
      durationMin: sitting.minutes,
      note: shape.note,
      official: true,
      sitting,
    };
  }
  const questionCount = Math.max(12, Math.min(24, topicCount > 0 ? topicCount * 2 : 16));
  return { ...spec(questionCount, "at genuine exam difficulty for this subject"), official: false, sitting: null };
}
