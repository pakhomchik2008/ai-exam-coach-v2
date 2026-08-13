/**
 * Exam papers are written in the exam's official language.
 * The app UI can be Ukrainian while an IELTS paper stays English,
 * and an НМТ paper stays Ukrainian even if the UI is English.
 */
export type PaperLanguage = "en" | "uk" | "de" | "pl" | "fr";

const PAPER_LANGUAGE: Readonly<Record<string, PaperLanguage>> = {
  nmt: "uk",
  zno: "uk",
  abitur: "de",
  matura: "pl",
  ielts: "en",
  toefl: "en",
  duolingo: "en",
  pte: "en",
  sat: "en",
  act: "en",
  ap: "en",
  gcse: "en",
  alevel: "en",
  ib: "en",
};

const LANGUAGE_NAME: Readonly<Record<PaperLanguage, string>> = {
  en: "English",
  uk: "Ukrainian",
  de: "German",
  pl: "Polish",
  fr: "French",
};

export function paperLanguageFor(qualificationId: string | null | undefined): PaperLanguage | null {
  if (!qualificationId) return null;
  return PAPER_LANGUAGE[qualificationId.toLowerCase()] || null;
}

export function paperLanguageDirective(qualificationId: string | null | undefined): string {
  const code = paperLanguageFor(qualificationId);
  if (!code) return "";
  const exam = (qualificationId || "exam").toUpperCase();
  return `This is a real ${exam} paper. Write the ENTIRE paper — question stems, options, explanations, topic labels, passages — in ${LANGUAGE_NAME[code]} only. Do not mix languages (no English stem with ${LANGUAGE_NAME[code]} answers, or the reverse). The student's app UI may be in another language; ignore it for this paper.`;
}
