/**
 * Persisted history of finished exam attempts (Phase 3 §3c — see
 * docs/phase-3-plan.md).
 *
 * Before this, an attempt's score existed only in React state on the summary
 * screen and died the moment the student pressed "Done". That made the one
 * question every exam recap should answer — "am I actually getting better?" —
 * unanswerable, because there was nothing to compare against.
 *
 * Two rules this module holds to, matching mistakes-store.jsx and
 * brain-store.jsx:
 *
 *   1. Every row is a real finished attempt. Nothing here is seeded, back-
 *      filled, or estimated, so an empty history means "no attempts yet",
 *      never "feature not wired up".
 *   2. Scores are stored as the raw correct/total the student actually got.
 *      The exam-scale projection (`scaledScore`) is derived at read time from
 *      scales.ts, never persisted — if a scale is ever corrected, old attempts
 *      re-project correctly instead of preserving a stale number.
 */

import { percentToScore, scaleForTaxonomy, scaleIdForTaxonomy, isNormalizedFallback, formatScore } from "./scales";

export const ATTEMPTS_KEY = "exam_attempts_v1";

/**
 * Global cap, not per-exam. The plan sketched 20 (matching brain-store's
 * per-topic history), but that cap is per-topic there — applied globally to
 * attempts it would wipe a three-subject student's entire history for one
 * subject after a couple of weeks of drilling the others. 120 keeps roughly a
 * full exam season for a realistic multi-subject load and is still a few KB.
 * The sparkline reads the last 10 for one exam, so this cap is invisible in
 * the UI; anything wanting genuine all-time history must not assume this list
 * is complete.
 */
const MAX_ATTEMPTS = 120;

/** Two finishes of the same exam this close together are a double-record
 * (a re-render or a remount), not a student who really sat two exams. */
const DEDUPE_WINDOW_MS = 10_000;

export type AttemptMode = "real" | "practice";

export interface ExamAttempt {
  readonly id: string;
  /** Null for a cross-subject practice drill ("All subjects"). */
  readonly examId: string | null;
  readonly examName: string;
  readonly mode: AttemptMode;
  readonly correct: number;
  readonly total: number;
  /** 0–100, derived from correct/total at write time. */
  readonly scorePct: number;
  /** Qualification/taxonomy id (nmt/sat/...) used to pick the score scale. */
  readonly taxonomy: string | null;
  /** Topics scored under 50% in this attempt — what "Drill weak topics" targets. */
  readonly weakTopics: readonly string[];
  readonly at: number;
}

export interface NewAttempt {
  examId?: string | null;
  examName?: string | null;
  mode: AttemptMode;
  correct: number;
  total: number;
  taxonomy?: string | null;
  weakTopics?: readonly string[] | null;
}

function migrateAttempt(raw: unknown): ExamAttempt | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !r.id) return null;
  const total = typeof r.total === "number" && r.total > 0 ? Math.round(r.total) : 0;
  if (!total) return null; // a zero-question attempt has no score to report
  const correct = typeof r.correct === "number" && r.correct >= 0 ? Math.min(total, Math.round(r.correct)) : 0;
  return {
    id: r.id,
    examId: typeof r.examId === "string" && r.examId ? r.examId : null,
    examName: typeof r.examName === "string" && r.examName ? r.examName : "",
    mode: r.mode === "real" ? "real" : "practice",
    correct,
    total,
    scorePct: Math.round((correct / total) * 100),
    taxonomy: typeof r.taxonomy === "string" && r.taxonomy ? r.taxonomy : null,
    weakTopics: Array.isArray(r.weakTopics) ? r.weakTopics.filter((t): t is string => typeof t === "string") : [],
    at: typeof r.at === "number" ? r.at : Date.now(),
  };
}

export function getAttempts(): ExamAttempt[] {
  let raw: unknown;
  try {
    raw = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) ?? "[]");
  } catch {
    raw = [];
  }
  if (!Array.isArray(raw)) return [];
  return raw.map(migrateAttempt).filter((a): a is ExamAttempt => a !== null);
}

function saveAttempts(list: readonly ExamAttempt[]): void {
  try {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(list.slice(0, MAX_ATTEMPTS)));
  } catch {
    /* quota or private-mode — the recap still renders, it just can't compare */
  }
}

/** Newest first, for one exam and mode. `examId: null` means the cross-subject drill. */
export function attemptsFor(examId: string | null, mode: AttemptMode): ExamAttempt[] {
  return getAttempts().filter((a) => a.examId === examId && a.mode === mode);
}

/**
 * Appends an attempt and returns it together with the attempt it should be
 * compared against — the previous one for the same exam and mode, or null on
 * a first attempt.
 *
 * Returning `previous` (rather than making the caller re-read) is deliberate:
 * the caller records and compares in the same tick, and re-reading would
 * return the row just written as its own predecessor.
 */
export function recordAttempt(input: NewAttempt): { attempt: ExamAttempt; previous: ExamAttempt | null } {
  const list = getAttempts();
  const examId = input.examId ?? null;
  const now = Date.now();

  const attempt = migrateAttempt({
    id: "a" + now + "_" + Math.random().toString(36).slice(2, 7),
    examId,
    examName: input.examName ?? "",
    mode: input.mode,
    correct: input.correct,
    total: input.total,
    taxonomy: input.taxonomy ?? null,
    weakTopics: input.weakTopics ?? [],
    at: now,
  });
  // A zero-question attempt (generation failed, student bailed before answering
  // anything) is not a data point. Report it back so the recap can still render
  // its score, but keep it out of the history that trends are drawn from.
  if (!attempt) {
    const previous = list.find((a) => a.examId === examId && a.mode === input.mode) ?? null;
    return {
      attempt: {
        id: "unrecorded", examId, examName: input.examName ?? "", mode: input.mode,
        correct: 0, total: 0, scorePct: 0, taxonomy: input.taxonomy ?? null, weakTopics: [], at: now,
      },
      previous,
    };
  }

  // Collapse an immediate re-record of the same result instead of appending a
  // phantom second attempt (see DEDUPE_WINDOW_MS).
  const head = list[0];
  const isRepeat =
    head != null &&
    head.examId === examId &&
    head.mode === attempt.mode &&
    head.correct === attempt.correct &&
    head.total === attempt.total &&
    now - head.at < DEDUPE_WINDOW_MS;
  const rest = isRepeat ? list.slice(1) : list;

  saveAttempts([attempt, ...rest]);
  return { attempt, previous: rest.find((a) => a.examId === examId && a.mode === attempt.mode) ?? null };
}

// ─── derived, for the recap UI ──────────────────────────────────────────────

export interface ScaledScore {
  readonly value: number;
  readonly text: string;
  readonly label: string;
  /** True when there is no real scale for this exam and the number is just the
   * percentage restated — the UI must not present it as an exam score. */
  readonly approximate: boolean;
}

/** Projects an attempt onto its exam's real reporting scale (band, балів, 1600...). */
export function scaledScoreFor(attempt: Pick<ExamAttempt, "scorePct" | "taxonomy">): ScaledScore {
  const scaleId = scaleIdForTaxonomy(attempt.taxonomy);
  const scale = scaleForTaxonomy(attempt.taxonomy);
  const value = percentToScore(attempt.scorePct, scale);
  return {
    value,
    text: formatScore(value, scale),
    label: scale.label,
    approximate: isNormalizedFallback(scaleId),
  };
}

/**
 * Oldest-to-newest score percentages for the sparkline, at most `limit`
 * points. Chronological (not the newest-first storage order) because a trend
 * line that reads right-to-left is a trend line read backwards.
 */
export function scoreTrend(examId: string | null, mode: AttemptMode, limit = 10): number[] {
  return attemptsFor(examId, mode).slice(0, limit).reverse().map((a) => a.scorePct);
}
