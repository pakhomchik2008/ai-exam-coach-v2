/**
 * GRE General Test (shorter GRE, Sept 2023+). Public ETS structure, not a
 * licensed PowerPrep pack (Decision Log #37).
 *
 * Reported scores: Verbal 130–170, Quant 130–170 (1-point), AWA 0–6 (half
 * points). The composite we show is V+Q (260–340) — ETS does not print a
 * single total, but students plan against that sum.
 */
import { clampToScale, SCALES } from "./scales";

export const GRE_VERBAL = { questions: 27, minutes: 41 } as const;
export const GRE_QUANT = { questions: 27, minutes: 47 } as const;
export const GRE_AWA = { tasks: 1, minutes: 30 } as const;

export function isGreQual(qualificationId?: string | null): boolean {
  if (!qualificationId) return false;
  const id = qualificationId.toLowerCase();
  return id === "gre" || id.startsWith("gre-");
}

export function snapSection(n: number): number {
  return clampToScale(n, SCALES.gre_section);
}

export function snapAwa(n: number): number {
  return clampToScale(n, SCALES.gre_awa);
}

export function snapComposite(n: number): number {
  return clampToScale(n, SCALES.gre);
}

/** V+Q only. AWA is a separate 0–6 and must not be folded in. */
export function greComposite(verbal?: number, quant?: number): number | null {
  if (verbal == null && quant == null) return null;
  const v = verbal == null ? null : snapSection(verbal);
  const q = quant == null ? null : snapSection(quant);
  if (v == null) return q;
  if (q == null) return v;
  return snapComposite(v + q);
}

export function writingScorePrompt(opts: { issue: string; essay: string }): string {
  return `You are a GRE Analytical Writing rater. Score this Issue essay on the ETS 0–6 scale (half points).
Public criteria: analysis of the issue; development and support; organization; control of standard written English.
Analyze an Argument was removed from the shorter GRE — this is Issue only.

ISSUE:
${opts.issue}

ESSAY:
${opts.essay}

OUTPUT ONLY valid JSON:
{"overall":4.0,"analysis":4,"development":4,"organization":3.5,"language":4,"why":"2-3 specific sentences.","improve":["one concrete fix","another","a third"]}
RULES: overall is the mean of the four, snapped to 0.5. Off-topic or empty → 0. No cheerleading.`;
}
