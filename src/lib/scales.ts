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
 * The rule from here on: scores are numeric, in the real units of the actual
 * exam, everywhere. Nothing in this module returns a letter.
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
  sat: "sat_total",
  act: "normalized",
  gcse: "gcse",
  alevel: "normalized",
  toefl: "normalized",
  duolingo: "normalized",
  pte: "normalized",
};

/** True when the resolved scale is the generic 0–100 stand-in, not a real one. */
export function isNormalizedFallback(id: ScaleId): boolean {
  return id === "normalized";
}

/** Resolves a taxonomy to a scale id, falling back to the normalized scale. */
export function scaleIdForTaxonomy(taxonomy: string | null | undefined): ScaleId {
  if (!taxonomy) return "normalized";
  return TAXONOMY_TO_SCALE[taxonomy.toLowerCase()] ?? "normalized";
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
