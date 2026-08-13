/**
 * Exam papers AND coach replies follow the exam's official language.
 * НМТ stays Ukrainian even if the app UI is English. Learn trees use
 * slugs like `nmt-ukr` — those must still resolve to Ukrainian.
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

export function canonicalQualification(qualificationId: string | null | undefined): string | null {
  if (!qualificationId) return null;
  const id = qualificationId.toLowerCase();
  if (id === "zno" || id === "nmt" || id.startsWith("nmt-")) return "nmt";
  if (id === "alevel" || id.startsWith("alevel-")) return "alevel";
  if (id === "gcse" || id.startsWith("gcse-")) return "gcse";
  if (id === "ap" || id.startsWith("ap-")) return "ap";
  if (id === "ib" || id.startsWith("ib-")) return "ib";
  if (id === "matura" || id.startsWith("matura-")) return "matura";
  if (id === "abitur" || id.startsWith("abitur-")) return "abitur";
  return id;
}

export function paperLanguageFor(qualificationId: string | null | undefined): PaperLanguage | null {
  const canon = canonicalQualification(qualificationId);
  if (!canon) return null;
  return PAPER_LANGUAGE[canon] || null;
}

export function languageNameFor(qualificationId: string | null | undefined): string | null {
  const code = paperLanguageFor(qualificationId);
  return code ? LANGUAGE_NAME[code] : null;
}

export function paperLanguageDirective(qualificationId: string | null | undefined): string {
  const code = paperLanguageFor(qualificationId);
  if (!code) return "";
  const exam = (canonicalQualification(qualificationId) || "exam").toUpperCase();
  return `This is a real ${exam} paper. Write the ENTIRE paper — question stems, options, explanations, topic labels, passages — in ${LANGUAGE_NAME[code]} only. Do not mix languages (no English stem with ${LANGUAGE_NAME[code]} answers, or the reverse). The student's app UI may be in another language; ignore it for this paper.`;
}

export function coachLanguageDirective(qualificationId: string | null | undefined): string {
  const code = paperLanguageFor(qualificationId);
  if (!code) return "";
  const exam = (canonicalQualification(qualificationId) || "exam").toUpperCase();
  return `This student is preparing for ${exam}. Respond ENTIRELY in ${LANGUAGE_NAME[code]} — chat, theory, flashcards, Socratic turns, hints, explanations, action chips. The app UI language does not matter. Do not mix in English.`;
}

export function inferCoachQual(opts: {
  paperQual?: string | null;
  topicExamQual?: string | null;
  studentQuals?: readonly (string | null | undefined)[];
}): string | null {
  if (opts.paperQual) return opts.paperQual;
  if (opts.topicExamQual) return opts.topicExamQual;
  // NMT students often have nmt-ukr + nmt-math + … — same exam language.
  const uniq = [...new Set(
    (opts.studentQuals || [])
      .map((q) => canonicalQualification(q))
      .filter((q): q is string => Boolean(q)),
  )];
  return uniq.length === 1 ? uniq[0] ?? null : null;
}
