// Resolves which Learn tree an exam should open.
//
// Qualification id alone is not enough: two NMT sittings (Ukrainian language
// + Mathematics) share `qualificationId: "nmt"`, and A-Level Maths / Chemistry
// share `alevel`. The old LearnMain used `exams[0]` + `getTree("nmt")` — so
// language students only ever saw the math tree. Subject is inferred from
// the exam name (and aliases the curriculum seed already uses). Unknown
// subjects return null rather than silently falling through to math.

import { getTree } from "./index";
import type { LearnTree } from "./schema";

export type ExamLike = {
  name?: string;
  qualificationId?: string;
  subject?: string;
  courseId?: string;
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

const ALEVEL_SLUGS: { slug: string; re: RegExp }[] = [
  // Further Maths before Maths — "Further Mathematics" contains "math".
  { slug: "alevel-fm", re: /further\s*(math|mathematics)|further maths|вища матем|высшая матем|додатков/i },
  { slug: "alevel-math", re: /матем|math/i },
  // Literature before English Language — "English Literature" contains "english".
  { slug: "alevel-lit", re: /літератур|литератур|literature/i },
  { slug: "alevel-eng", re: /англійськ|английск|english|англ/i },
  { slug: "alevel-hist", re: /істор|истор|history/i },
  { slug: "alevel-bio", re: /біолог|биолог|biology|\bbio\b/i },
  { slug: "alevel-chem", re: /хім|хим|chem/i },
  { slug: "alevel-phys", re: /фізик|физик|physics/i },
  { slug: "alevel-geo", re: /географ|geography/i },
  { slug: "alevel-cs", re: /computer\s*science|computing|\bcs\b|інформатик|информатик/i },
  { slug: "alevel-econ", re: /econom|економ|эконом/i },
  { slug: "alevel-bus", re: /business|бізнес|бизнес/i },
  { slug: "alevel-psy", re: /psycholog|психолог/i },
  { slug: "alevel-pol", re: /politic|політик|политик|government/i },
  { slug: "alevel-de", re: /німецьк|немецк|german|deutsch/i },
  { slug: "alevel-fr", re: /французьк|французск|french|français/i },
  { slug: "alevel-es", re: /іспанськ|испанск|spanish|español/i },
];

function courseBlob(exam: ExamLike): string {
  const getCourse = typeof window !== "undefined"
    ? (window as Window & { getCourse?: (id: string) => { title?: string; subject?: string; curriculumRef?: { subject?: string; qualificationId?: string } } | null }).getCourse
    : undefined;
  if (!exam.courseId || !getCourse) return "";
  const course = getCourse(exam.courseId);
  if (!course) return "";
  const ref = course.curriculumRef || {};
  return [course.title, course.subject, ref.subject, ref.qualificationId].filter(Boolean).join(" ");
}

function subjectBlob(exam: ExamLike | null | undefined): string {
  return [
    exam && exam.name,
    exam && exam.subject,
    courseBlob(exam || {}),
  ].filter(Boolean).join(" ");
}

export function nmtTreeSlug(exam: ExamLike | null | undefined): string | null {
  const blob = subjectBlob(exam);
  for (const row of NMT_SLUGS) {
    if (row.re.test(blob)) return row.slug;
  }
  return null;
}

export function alevelTreeSlug(exam: ExamLike | null | undefined): string | null {
  const blob = subjectBlob(exam);
  for (const row of ALEVEL_SLUGS) {
    if (row.re.test(blob)) return row.slug;
  }
  return null;
}

function qualificationOf(exam: ExamLike): string | null {
  const fromWindow = typeof window !== "undefined"
    ? (window as Window & { examQualificationId?: (e: ExamLike) => string | null }).examQualificationId
    : undefined;
  return (fromWindow && fromWindow(exam)) || exam.qualificationId || null;
}

function looksLikeNmt(exam: ExamLike, qual: string | null): boolean {
  if (qual === "nmt" || qual === "zno") return true;
  return /nmt|нмт|зно/i.test(`${exam.name || ""} ${exam.subject || ""} ${courseBlob(exam)}`);
}

function looksLikeAlevel(exam: ExamLike, qual: string | null): boolean {
  if (qual === "alevel") return true;
  return /a[\s-]?level/i.test(`${exam.name || ""} ${exam.subject || ""} ${courseBlob(exam)}`);
}

export function treeKeyForExam(exam: ExamLike | null | undefined): string | null {
  if (!exam) return null;
  const qual = qualificationOf(exam);
  // Name wins over a stale qualificationId (old adds were silently tagged
  // GCSE/AQA). "NMT Українська мова" with qualificationId "gcse" is still NMT.
  if (looksLikeNmt(exam, qual)) return nmtTreeSlug(exam);
  if (looksLikeAlevel(exam, qual)) return alevelTreeSlug(exam);
  if (qual && getTree(qual)) return qual;
  if (!qual) return nmtTreeSlug(exam) || alevelTreeSlug(exam);
  return null;
}

export function treeForExam(exam: ExamLike | null | undefined): LearnTree | null {
  const key = treeKeyForExam(exam);
  return key ? getTree(key) : null;
}
