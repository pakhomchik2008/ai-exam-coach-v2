/**
 * Exam papers AND coach replies follow the exam's official language.
 * НМТ (math, Ukrainian, history, …) stays Ukrainian even if the app UI
 * is English. NMT English / German / French / Spanish papers stay in
 * that language — qualificationId is just `nmt` for every NMT subject,
 * so we also read the exam name. Same for Matura: family id is `matura`,
 * Język angielski must not inherit Polish.
 */
export type PaperLanguage = "en" | "uk" | "de" | "pl" | "fr" | "es";

const PAPER_LANGUAGE: Readonly<Record<string, PaperLanguage>> = {
  nmt: "uk",
  zno: "uk",
  abitur: "de",
  matura: "pl",
  bac: "fr",
  ielts: "en",
  toefl: "en",
  duolingo: "en",
  pte: "en",
  sat: "en",
  gre: "en",
  gmat: "en",
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
  es: "Spanish",
};

type ForeignPaper = {
  slug: string;
  lang: PaperLanguage;
  re: RegExp;
  family: "NMT" | "Matura";
  host: PaperLanguage;
};

// qualificationId on an NMT / Matura sitting is the family. These slugs
// (Learn tree taxonomy, or inferred from the subject name) pick the paper
// language so a foreign-language paper does not inherit Ukrainian / Polish.
const FOREIGN_PAPERS: readonly ForeignPaper[] = [
  { slug: "nmt-eng", lang: "en", re: /англійськ|английск|english|англ/i, family: "NMT", host: "uk" },
  { slug: "nmt-de", lang: "de", re: /німецьк|немецк|german|deutsch/i, family: "NMT", host: "uk" },
  { slug: "nmt-fr", lang: "fr", re: /французьк|французск|french|français/i, family: "NMT", host: "uk" },
  { slug: "nmt-es", lang: "es", re: /іспанськ|испанск|spanish|español/i, family: "NMT", host: "uk" },
  { slug: "matura-eng", lang: "en", re: /angielsk|english|англійськ|английск/i, family: "Matura", host: "pl" },
  { slug: "matura-de", lang: "de", re: /niemieck|german|deutsch|німецьк|немецк/i, family: "Matura", host: "pl" },
  { slug: "matura-fr", lang: "fr", re: /francusk|french|français|французьк|французск/i, family: "Matura", host: "pl" },
  { slug: "matura-es", lang: "es", re: /hiszpańsk|spanish|español|іспанськ|испанск/i, family: "Matura", host: "pl" },
];

const FOREIGN_BY_SLUG: Readonly<Record<string, ForeignPaper>> = Object.fromEntries(
  FOREIGN_PAPERS.map((row) => [row.slug, row]),
);

function foreignPapers(family: ForeignPaper["family"]): readonly ForeignPaper[] {
  return FOREIGN_PAPERS.filter((row) => row.family === family);
}

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
  if (id === "bac" || id.startsWith("bac-")) return "bac";
  if (id === "gre" || id.startsWith("gre-")) return "gre";
  if (id === "gmat" || id.startsWith("gmat-")) return "gmat";
  if (id === "pte" || id.startsWith("pte-")) return "pte";
  return id;
}

export function paperLanguageFor(qualificationId: string | null | undefined): PaperLanguage | null {
  if (!qualificationId) return null;
  const id = qualificationId.toLowerCase();
  if (FOREIGN_BY_SLUG[id]) return FOREIGN_BY_SLUG[id].lang;
  const canon = canonicalQualification(id);
  if (!canon) return null;
  return PAPER_LANGUAGE[canon] || null;
}

export type ExamNameLike = {
  name?: string | null;
  subject?: string | null;
  qualificationId?: string | null;
};

/**
 * Language key for this sitting, not the family. `nmt` + "Англійська мова"
 * → `nmt-eng` so Practice / Speed Round / chat do not inherit Ukrainian.
 * `matura` + "Język angielski" → `matura-eng` the same way.
 */
export function paperQualForExam(exam: ExamNameLike | null | undefined): string | null {
  if (!exam) return null;
  const qual = (exam.qualificationId || "").toLowerCase();
  if (FOREIGN_BY_SLUG[qual]) return qual;
  const blob = `${exam.name || ""} ${exam.subject || ""}`;
  const isNmt = qual === "nmt" || qual === "zno" || qual.startsWith("nmt-") || /nmt|нмт|зно/i.test(blob);
  if (isNmt) {
    for (const row of foreignPapers("NMT")) {
      if (row.re.test(blob)) return row.slug;
    }
    return qual || "nmt";
  }
  const isMatura = qual === "matura" || qual.startsWith("matura-") || /matura/i.test(blob);
  if (isMatura) {
    for (const row of foreignPapers("Matura")) {
      if (row.re.test(blob)) return row.slug;
    }
    return qual || "matura";
  }
  return exam.qualificationId || null;
}

/** I18nString lookup code: paper language when known, else the UI. */
export function copyLangFor(qualificationId: string | null | undefined, uiLang = "en"): string {
  return paperLanguageFor(qualificationId) || uiLang || "en";
}

export function languageNameFor(qualificationId: string | null | undefined): string | null {
  const code = paperLanguageFor(qualificationId);
  return code ? LANGUAGE_NAME[code] : null;
}

function foreignNote(qualificationId: string | null | undefined, kind: "paper" | "coach"): string {
  if (!qualificationId) return "";
  const foreign = FOREIGN_BY_SLUG[qualificationId.toLowerCase()];
  if (!foreign) return "";
  const name = LANGUAGE_NAME[foreign.lang];
  const host = LANGUAGE_NAME[foreign.host];
  if (kind === "paper") {
    return ` This is the ${foreign.family} ${name} paper (foreign language). Stems, options, passages, explanations, JSON string values, action chips — ${name} only. Do not translate into ${host}.`;
  }
  return ` ${foreign.family} ${name} as a subject: theory, flashcards, Socratic, chat, hints — ${name} only. No ${host}.`;
}

export function paperLanguageDirective(qualificationId: string | null | undefined): string {
  const code = paperLanguageFor(qualificationId);
  if (!code) return "";
  const exam = (canonicalQualification(qualificationId) || "exam").toUpperCase();
  const name = LANGUAGE_NAME[code];
  return `This is a real ${exam} paper. Write the ENTIRE paper — question stems, options, explanations, topic labels, passages, every JSON string value — in ${name} only. Do not mix languages (no English stem with ${name} answers, or the reverse). The student's app UI may be in another language; ignore it for this paper.${foreignNote(qualificationId, "paper")}`;
}

export function coachLanguageDirective(qualificationId: string | null | undefined): string {
  const code = paperLanguageFor(qualificationId);
  if (!code) return "";
  const exam = (canonicalQualification(qualificationId) || "exam").toUpperCase();
  const name = LANGUAGE_NAME[code];
  return `This student is preparing for ${exam}. Respond ENTIRELY in ${name} — chat, theory, flashcards, Socratic turns, hints, explanations, action chips, every JSON string. The app UI language does not matter. Do not mix in another language.${foreignNote(qualificationId, "coach")}`;
}

export function inferCoachQual(opts: {
  paperQual?: string | null;
  topicExamQual?: string | null;
  studentQuals?: readonly (string | null | undefined)[];
}): string | null {
  if (opts.paperQual) return opts.paperQual;
  if (opts.topicExamQual) return opts.topicExamQual;
  const raw = (opts.studentQuals || []).filter((q): q is string => Boolean(q));
  // Same paper language (nmt-ukr + nmt-math → Ukrainian). Mixed NMT
  // English + NMT math must NOT collapse to Ukrainian.
  const langs = [...new Set(raw.map((q) => paperLanguageFor(q)).filter((l): l is PaperLanguage => Boolean(l)))];
  if (langs.length === 1) {
    return raw.find((q) => paperLanguageFor(q) === langs[0]) || null;
  }
  return null;
}
