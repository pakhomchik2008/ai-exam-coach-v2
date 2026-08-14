/**
 * Baccalauréat général — published marking, not a licensed past paper.
 *
 * Numbers are from the ministère (réforme 2019, still the 2025–26 sitting):
 * terminal written/oral coefficients sum to 60; contrôle continu is the
 * other 40. Mentions are legal thresholds on the /20 moyenne, not marketing
 * labels. Half-points are how bulletins actually print.
 *
 * We do not copy Education nationale examiner grids verbatim (copyright).
 * Essay prompts below name the four public criteria a jury uses, then ask
 * the model for a /20 — same pattern as IELTS band descriptors in
 * ielts-paper.ts.
 */
import { clampToScale, SCALES } from "./scales";

export type BacMention =
  | "ajourne"
  | "rattrapage"
  | "passable"
  | "assez-bien"
  | "bien"
  | "tres-bien";

/** Terminal épreuves only. Contrôle continu (40/100) is school-side. */
export const BAC_TERMINAL_COEFFS = {
  francaisEcrit: 5,
  francaisOral: 5,
  philosophie: 8,
  specialite1: 16,
  specialite2: 16,
  grandOral: 10,
} as const;

export type BacTerminalPaper = keyof typeof BAC_TERMINAL_COEFFS;

export const BAC_MENTION_LABEL: Readonly<Record<BacMention, { en: string; fr: string; uk: string }>> = {
  ajourne: { en: "Fail", fr: "Ajourné", uk: "Не склав" },
  rattrapage: { en: "Second-group oral", fr: "Second groupe (rattrapage)", uk: "Усний перездача" },
  passable: { en: "Pass", fr: "Passable", uk: "Задовільно" },
  "assez-bien": { en: "Fairly good", fr: "Assez bien", uk: "Добре" },
  bien: { en: "Good", fr: "Bien", uk: "Дуже добре" },
  "tres-bien": { en: "Very good", fr: "Très bien", uk: "Відмінно" },
};

export function isBacQual(qualificationId?: string | null): boolean {
  if (!qualificationId) return false;
  const id = qualificationId.toLowerCase();
  return id === "bac" || id.startsWith("bac-");
}

export function snapNote(n: number): number {
  return clampToScale(n, SCALES.bac);
}

/**
 * Weighted /20 on the papers the student actually sat. Missing papers are
 * omitted, not zeroed — a Français-only practice must not look like 2/20.
 */
export function terminalMoyenne(
  scores: Partial<Record<BacTerminalPaper, number>>,
): number | null {
  let weight = 0;
  let acc = 0;
  for (const paper of Object.keys(BAC_TERMINAL_COEFFS) as BacTerminalPaper[]) {
    const raw = scores[paper];
    if (raw == null || !Number.isFinite(raw)) continue;
    const coeff = BAC_TERMINAL_COEFFS[paper];
    acc += snapNote(raw) * coeff;
    weight += coeff;
  }
  if (weight === 0) return null;
  return snapNote(acc / weight);
}

export function mentionFromMoyenne(moyenne: number): BacMention {
  const m = snapNote(moyenne);
  if (m < 8) return "ajourne";
  if (m < 10) return "rattrapage";
  if (m < 12) return "passable";
  if (m < 14) return "assez-bien";
  if (m < 16) return "bien";
  return "tres-bien";
}

export type BacEssayKind = "commentaire" | "dissertation" | "philosophie";

const ESSAY_CRITERIA: Readonly<Record<BacEssayKind, string>> = {
  commentaire:
    "Compréhension du texte; analyse littéraire (procédés, enjeux); composition du devoir; qualité de la langue.",
  dissertation:
    "Problématisation du sujet; plan progressif et exemples précis; connaissance des œuvres du parcours; qualité de la langue.",
  philosophie:
    "Problématisation; analyse conceptuelle; argumentation et exemples; clarté de la langue. /20, demis admis.",
};

export function writingScorePrompt(opts: {
  kind: BacEssayKind;
  subject: string;
  essay: string;
}): string {
  const criteria = ESSAY_CRITERIA[opts.kind];
  return `Tu es un correcteur du baccalauréat général. Note ce devoir ${opts.kind} sur 20 (demis admis: 12, 12.5, 13…).
Critères publics: ${criteria}

SUJET:
${opts.subject}

COPIE:
${opts.essay}

OUTPUT ONLY valid JSON:
{"overall":12.5,"problematisation":12,"analyse":13,"composition":12,"langue":13,"why":"2-3 phrases précises.","improve":["un geste concret","un autre","un troisième"]}
RULES: overall is the mean of the four, snapped to 0.5. No cheerleading. Under 8 = copie hors-sujet or empty.`;
}
