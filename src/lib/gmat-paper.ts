/**
 * GMAT Focus Edition (the current GMAT). Public GMAC structure, not a
 * licensed Official Practice Exam pack (Decision Log #37).
 *
 * Total 205–805 in tens, always ending in 5 — that is how you tell Focus
 * from classic 200–800. Each section is 60–90. GMAC does not publish the
 * Q+V+DI → total formula, so we never invent one.
 *
 * Focus dropped AWA, Sentence Correction, and Quant geometry.
 */
import { clampToScale, SCALES } from "./scales";

export const GMAT_QUANT = { questions: 21, minutes: 45 } as const;
export const GMAT_VERBAL = { questions: 23, minutes: 45 } as const;
export const GMAT_DATA_INSIGHTS = { questions: 20, minutes: 45 } as const;

export function isGmatQual(qualificationId?: string | null): boolean {
  if (!qualificationId) return false;
  const id = qualificationId.toLowerCase();
  return id === "gmat" || id.startsWith("gmat-");
}

export function snapSection(n: number): number {
  return clampToScale(n, SCALES.gmat_section);
}

export function snapTotal(n: number): number {
  return clampToScale(n, SCALES.gmat);
}
