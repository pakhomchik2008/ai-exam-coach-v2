// Resolves which Learn tree an exam should open.
//
// Qualification id alone is not enough: two NMT sittings (Ukrainian language
// + Mathematics) share `qualificationId: "nmt"`, and the old LearnMain used
// `exams[0]` + `getTree("nmt")` — so language students only ever saw the
// math tree. Subject is inferred from the exam name (and aliases the
// curriculum seed already uses). Unknown NMT subjects return null rather
// than silently falling through to math.

import { getTree } from "./index";
import type { LearnTree } from "./schema";

export type ExamLike = {
  name?: string;
  qualificationId?: string;
  subject?: string;
};

const NMT_SLUGS: { slug: string; re: RegExp }[] = [
  // Literature before language — "українська література" contains "українськ".
  // No `\b` on Cyrillic: JS word boundaries only know [A-Za-z0-9_].
  { slug: "nmt-lit", re: /літератур|литератур|literature|укрліт/i },
  { slug: "nmt-ukr", re: /українськ|украинск|ukrainian|укр\s*мов|укрмов/i },
  { slug: "nmt", re: /матем|math/i },
  { slug: "nmt-hist", re: /істор|истор|history/i },
  { slug: "nmt-bio", re: /біолог|биолог|biology|\bbio\b/i },
  { slug: "nmt-chem", re: /хім|хим|chem/i },
  { slug: "nmt-phys", re: /фізик|физик|physics/i },
  { slug: "nmt-geo", re: /географ|geography/i },
  { slug: "nmt-eng", re: /англійськ|английск|english|англ/i },
  { slug: "nmt-de", re: /німецьк|немецк|german|deutsch/i },
  { slug: "nmt-fr", re: /французьк|французск|french|français/i },
  { slug: "nmt-es", re: /іспанськ|испанск|spanish|español/i },
];

export function nmtTreeSlug(exam: ExamLike | null | undefined): string | null {
  const blob = `${(exam && exam.name) || ""} ${(exam && exam.subject) || ""}`;
  for (const row of NMT_SLUGS) {
    if (row.re.test(blob)) return row.slug;
  }
  return null;
}

export function treeKeyForExam(exam: ExamLike | null | undefined): string | null {
  if (!exam) return null;
  const fromWindow = typeof window !== "undefined"
    ? (window as Window & { examQualificationId?: (e: ExamLike) => string | null }).examQualificationId
    : undefined;
  const qual = (fromWindow && fromWindow(exam)) || exam.qualificationId;
  if (!qual) return nmtTreeSlug(exam);
  if (qual === "nmt" || qual === "zno") return nmtTreeSlug(exam);
  if (getTree(qual)) return qual;
  return null;
}

export function treeForExam(exam: ExamLike | null | undefined): LearnTree | null {
  const key = treeKeyForExam(exam);
  return key ? getTree(key) : null;
}
