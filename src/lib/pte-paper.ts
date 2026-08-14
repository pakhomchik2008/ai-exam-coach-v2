/**
 * PTE Academic (Pearson, Aug 2025 item set). Public structure, not a
 * licensed Scored Practice Test (Decision Log #37).
 *
 * Overall and each communicative skill (Speaking / Writing / Reading /
 * Listening) report 10–90. Pearson does not publish a simple average, so
 * we never invent one. Write Essay uses public traits, not the Score
 * Guide grids verbatim.
 *
 * Aug 2025 added Summarize Group Discussion and Respond to a Situation.
 * PTE Core / Home / UKVI-as-a-separate-qual are not this exam.
 */
import { clampToScale, SCALES } from "./scales";

export function isPteQual(qualificationId?: string | null): boolean {
  if (!qualificationId) return false;
  const id = qualificationId.toLowerCase();
  return id === "pte" || id.startsWith("pte-");
}

export function snapScore(n: number): number {
  return clampToScale(n, SCALES.pte);
}

export function writingScorePrompt(opts: { prompt: string; essay: string }): string {
  return `You are a PTE Academic Write Essay rater. Score this essay on the Pearson 10–90 scale.
Public traits: content; form (length/format); development, structure and coherence; grammar; vocabulary; spelling.
This is not an IELTS paper and not GRE Analytical Writing.

PROMPT:
${opts.prompt}

ESSAY:
${opts.essay}

OUTPUT ONLY valid JSON:
{"overall":65,"content":70,"form":80,"development":60,"grammar":65,"vocabulary":70,"spelling":80,"why":"2-3 specific sentences.","improve":["one concrete fix","another","a third"]}
RULES: overall is the mean of the six traits, snapped to a whole 10–90. Off-topic, under 120 words, or empty → 10. No cheerleading.`;
}
