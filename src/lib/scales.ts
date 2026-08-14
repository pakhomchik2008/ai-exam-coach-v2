/**
 * Canonical per-exam score scales.
 *
 * This module exists to kill audit finding #10. Before it, the app generated
 * letter grades from three mutually inconsistent thresholds:
 *
 *   exams-store.letterBand   80 / 60 / 40
 *   AIPlan.jsx:67            80 / 60 / 40
 *   AIChat.jsx:535, :2169    90 / 75 / 60
 *
 * so the same 82% displayed as a different letter depending on which screen the
 * student happened to be looking at. Letter grades are also simply wrong for the
 * exams this product targets — none of IELTS, НМТ, SAT or GCSE reports one.
 *
 * The rule from here on: a predicted grade uses the exam's own scheme.
 * IELTS is a band, НМТ is 100–200, SAT is 400–1600. Letters exist only
 * for exams that actually report letters (A-Level, uni class).
 */

export type ScaleFormat = "decimal" | "integer";

export interface Scale {
  /** Lowest reportable score on the real exam. */
  readonly min: number;
  /** Highest reportable score. */
  readonly max: number;
  /** Smallest increment the exam actually reports. */
  readonly step: number;
  /** A strong result — used to preset target sliders, not as a pass mark. */
  readonly targetTop: number;
  readonly format: ScaleFormat;
  /** Shown next to the number where the unit is not self-evident. */
  readonly label: string;
}

export const SCALES = {
  /** IELTS band score, whole and half bands. */
  ielts: { min: 0, max: 9, step: 0.5, targetTop: 8.0, format: "decimal", label: "band" },
  /** НМТ, per subject, on the 100–200 scale. */
  nmt_subject: { min: 100, max: 200, step: 1, targetTop: 180, format: "integer", label: "балів" },
  /** SAT composite. */
  sat_total: { min: 400, max: 1600, step: 10, targetTop: 1400, format: "integer", label: "" },
  /** SAT single section (EBRW or Math). */
  sat_section: { min: 200, max: 800, step: 10, targetTop: 700, format: "integer", label: "" },
  /** GCSE 9–1 numbered grades. */
  gcse: { min: 1, max: 9, step: 1, targetTop: 7, format: "integer", label: "grade" },
  toefl: { min: 0, max: 120, step: 1, targetTop: 100, format: "integer", label: "" },
  duolingo: { min: 10, max: 160, step: 5, targetTop: 130, format: "integer", label: "" },
  /** PTE Academic overall and each skill — Pearson uses the same 10–90 for both. */
  pte: { min: 10, max: 90, step: 1, targetTop: 76, format: "integer", label: "" },
  /** Baccalauréat général. Bulletins print half-points; 16 is mention TB. */
  bac: { min: 0, max: 20, step: 0.5, targetTop: 16, format: "decimal", label: "/20" },
  /** GRE General V+Q. ETS prints two 130–170s; students plan against the sum. */
  gre: { min: 260, max: 340, step: 1, targetTop: 320, format: "integer", label: "V+Q" },
  gre_section: { min: 130, max: 170, step: 1, targetTop: 160, format: "integer", label: "" },
  gre_awa: { min: 0, max: 6, step: 0.5, targetTop: 5, format: "decimal", label: "AWA" },
  /** GMAT Focus total. Tens ending in 5 — classic 200–800 is a different exam. */
  gmat: { min: 205, max: 805, step: 10, targetTop: 655, format: "integer", label: "Focus" },
  gmat_section: { min: 60, max: 90, step: 1, targetTop: 82, format: "integer", label: "" },
  act: { min: 1, max: 36, step: 1, targetTop: 32, format: "integer", label: "" },
  ap: { min: 1, max: 5, step: 1, targetTop: 5, format: "integer", label: "" },
  ib: { min: 1, max: 7, step: 1, targetTop: 6, format: "integer", label: "" },
  /**
   * Fallback for an exam we have no real scale for. Deliberately a plain
   * percentage rather than a guess at the exam's true units — see
   * `isNormalizedFallback`, which callers use to surface that it is approximate.
   */
  normalized: { min: 0, max: 100, step: 1, targetTop: 85, format: "integer", label: "%" },
} as const satisfies Record<string, Scale>;

export type ScaleId = keyof typeof SCALES;

/** Maps a taxonomy id (as stored on `exam.taxonomy`) to its scale. */
const TAXONOMY_TO_SCALE: Readonly<Record<string, ScaleId>> = {
  ielts: "ielts",
  nmt: "nmt_subject",
  zno: "nmt_subject",
  sat: "sat_total",
  act: "act",
  gcse: "gcse",
  toefl: "toefl",
  duolingo: "duolingo",
  pte: "pte",
  ap: "ap",
  ib: "ib",
  bac: "bac",
  gre: "gre",
  gmat: "gmat",
};

/** True when the resolved scale is the generic 0–100 stand-in, not a real one. */
export function isNormalizedFallback(id: ScaleId): boolean {
  return id === "normalized";
}

/** Resolves a taxonomy to a scale id, falling back to the normalized scale. */
export function scaleIdForTaxonomy(taxonomy: string | null | undefined): ScaleId {
  if (!taxonomy) return "normalized";
  const id = taxonomy.toLowerCase();
  if (TAXONOMY_TO_SCALE[id]) return TAXONOMY_TO_SCALE[id];
  // Learn trees are `bac-math` / `nmt-ukr`. The scale belongs to the exam.
  const dash = id.indexOf("-");
  if (dash > 0) {
    const family = id.slice(0, dash);
    if (TAXONOMY_TO_SCALE[family]) return TAXONOMY_TO_SCALE[family];
  }
  return "normalized";
}

export function scaleForTaxonomy(taxonomy: string | null | undefined): Scale {
  return SCALES[scaleIdForTaxonomy(taxonomy)];
}

/**
 * Clamps to the scale's range and snaps to its real step.
 *
 * Snapping matters: an IELTS predictor that outputs 7.3 is claiming a score that
 * cannot appear on a result slip. Rounding to 7.5 is not cosmetic — it is the
 * difference between a number a student can act on and one they cannot.
 */
export function clampToScale(value: number, scale: Scale): number {
  if (!Number.isFinite(value)) return scale.min;
  const clamped = Math.min(scale.max, Math.max(scale.min, value));
  const steps = Math.round((clamped - scale.min) / scale.step);
  const snapped = scale.min + steps * scale.step;
  // Re-clamp: snapping can overshoot when the range is not a whole number of
  // steps, and floating-point drift on fractional steps needs rounding off.
  return Math.min(scale.max, Math.max(scale.min, roundFloat(snapped)));
}

/** Kills binary-float drift from repeated 0.5-step arithmetic (7.000000000001). */
function roundFloat(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Formats a score for display in the scale's own units. Never a letter. */
export function formatScore(value: number, scale: Scale): string {
  const v = clampToScale(value, scale);
  return scale.format === "decimal" ? v.toFixed(1) : String(Math.round(v));
}

/**
 * Maps a 0–100 internal readiness percentage onto a real exam scale.
 *
 * The app's internal model works in percentages (coverage, mastery, confidence),
 * but a student only understands "6.5" or "172". This is the single conversion
 * point between the two.
 */
export function percentToScore(percent: number, scale: Scale): number {
  const pct = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
  return clampToScale(scale.min + (pct / 100) * (scale.max - scale.min), scale);
}

/** Inverse of `percentToScore`, for seeding the model from a stated target. */
export function scoreToPercent(score: number, scale: Scale): number {
  const span = scale.max - scale.min;
  if (span === 0) return 0;
  const pct = ((clampToScale(score, scale) - scale.min) / span) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

/** Every selectable value on a scale — for target sliders and dropdowns. */
export function scaleSteps(scale: Scale): number[] {
  const out: number[] = [];
  for (let v = scale.min; v <= scale.max; v += scale.step) out.push(roundFloat(v));
  return out;
}

/** Discrete labels, best-first — only for exams that actually report letters. */
const LETTER_OPTIONS: Readonly<Record<string, readonly string[]>> = {
  alevel: ["A*", "A", "B", "C", "D", "E"],
  uni: ["1st", "2:1", "2:2", "3rd", "Pass"],
  custom: ["A", "B", "C", "D", "Pass"],
};

export type ScoreScheme = {
  readonly kind: "score";
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly format: ScaleFormat;
};

export type LabelScheme = {
  readonly kind: "scale";
  readonly options: readonly string[];
};

export type GradeScheme = ScoreScheme | LabelScheme;

export interface ExamGradeInput {
  readonly qualificationId?: string | null;
  readonly gradingSystem?: {
    readonly kind?: string;
    readonly min?: number;
    readonly max?: number;
    readonly step?: number;
    readonly options?: readonly string[];
  } | null;
}

function scaleFromScoreScheme(scheme: ScoreScheme): Scale {
  return {
    min: scheme.min,
    max: scheme.max,
    step: scheme.step,
    targetTop: scheme.max,
    format: scheme.format,
    label: "",
  };
}

function scoreSchemeFromScale(scale: Scale): ScoreScheme {
  return { kind: "score", min: scale.min, max: scale.max, step: scale.step, format: scale.format };
}

/**
 * Picks the display scheme for an exam.
 *
 * A known numeric taxonomy always wins. An IELTS row that still carries
 * leftover A-Level letters (the old default `targetGrade: "A"`) must not
 * keep predicting "C".
 */
export function schemeFromExam(exam: ExamGradeInput): GradeScheme {
  const qid = exam.qualificationId ? exam.qualificationId.toLowerCase() : "";
  if (qid && !isNormalizedFallback(scaleIdForTaxonomy(qid))) {
    return scoreSchemeFromScale(scaleForTaxonomy(qid));
  }

  const g = exam.gradingSystem;
  if (g?.kind === "score" && Number.isFinite(g.min) && Number.isFinite(g.max) && (g.max as number) > (g.min as number)) {
    const step = Number.isFinite(g.step) && (g.step as number) > 0 ? (g.step as number) : 1;
    return {
      kind: "score",
      min: g.min as number,
      max: g.max as number,
      step,
      format: step < 1 ? "decimal" : "integer",
    };
  }
  if (g?.kind === "scale" && Array.isArray(g.options) && g.options.length > 1) {
    return { kind: "scale", options: g.options };
  }

  if (qid && LETTER_OPTIONS[qid]) {
    return { kind: "scale", options: LETTER_OPTIONS[qid] };
  }

  return scoreSchemeFromScale(SCALES.normalized);
}

/** Maps 0–100 readiness onto the exam's own units. */
export function predictedFromReadiness(percent: number, scheme: GradeScheme): string {
  if (scheme.kind === "score") {
    const scale = scaleFromScoreScheme(scheme);
    return formatScore(percentToScore(percent, scale), scale);
  }
  const n = scheme.options.length;
  const pct = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
  const band = Math.floor((100 - pct) / (100 / n));
  const idx = Math.min(n - 1, Math.max(0, band));
  return scheme.options[idx] ?? scheme.options[n - 1] ?? "";
}

/** Readiness % the model must hit to claim the student's stated target. */
export function targetReadiness(target: string | number | null | undefined, scheme: GradeScheme): number {
  if (scheme.kind === "score") {
    const n = typeof target === "number" ? target : Number(target);
    if (Number.isFinite(n)) return scoreToPercent(n, scaleFromScoreScheme(scheme));
    return 80;
  }
  const label = target == null ? "" : String(target);
  const idx = scheme.options.indexOf(label);
  if (idx < 0) return 80;
  if (scheme.options.length <= 1) return 100;
  return Math.round(100 - (idx / (scheme.options.length - 1)) * 100);
}

/** One increment worse — used for the "if you miss the plan" forecast. */
export function stepDownPredicted(label: string, scheme: GradeScheme): string {
  if (scheme.kind === "score") {
    const n = Number(label);
    if (!Number.isFinite(n)) return label;
    const scale = scaleFromScoreScheme(scheme);
    return formatScore(n - scale.step, scale);
  }
  const idx = scheme.options.indexOf(label);
  if (idx < 0 || idx >= scheme.options.length - 1) return label;
  return scheme.options[idx + 1] ?? label;
}
