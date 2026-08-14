// Resolves which Learn tree an exam should open.
//
// Qualification id alone is not enough: NMT / A-Level / GCSE / AP share one
// id across subjects. The exam *name* wins over a stale qualificationId
// (old adds were silently tagged GCSE). Unknown subjects return null
// rather than silently falling through to math.

import { getTree } from "./index";
import type { LearnNode, LearnTree, LearnUnit } from "./schema";

export type ExamLike = {
  name?: string;
  qualificationId?: string;
  subject?: string;
  courseId?: string;
};

type SlugRow = { slug: string; re: RegExp };
type Family =
  | "nmt" | "alevel" | "gcse" | "sat" | "act" | "ap" | "ib"
  | "matura" | "abitur" | "bac" | "ielts" | "toefl" | "duolingo" | "gre" | "gmat" | "pte";

const NMT_SLUGS: SlugRow[] = [
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

const ALEVEL_SLUGS: SlugRow[] = [
  { slug: "alevel-fm", re: /further\s*(math|mathematics)|further maths|вища матем|высшая матем|додатков/i },
  { slug: "alevel-math", re: /матем|math/i },
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

const GCSE_SLUGS: SlugRow[] = [
  { slug: "gcse-sci", re: /combined\s*science|trilogy|double\s*science/i },
  { slug: "gcse-lit", re: /literature|літератур|литератур/i },
  { slug: "gcse-eng", re: /english|англійськ|английск/i },
  { slug: "gcse-cs", re: /computer\s*science|computing|\bcs\b|інформатик/i },
  { slug: "gcse-math", re: /матем|math/i },
  { slug: "gcse-bio", re: /біолог|биолог|biology|\bbio\b/i },
  { slug: "gcse-chem", re: /хім|хим|chem/i },
  { slug: "gcse-phys", re: /фізик|физик|physics/i },
  { slug: "gcse-hist", re: /істор|истор|history/i },
  { slug: "gcse-geo", re: /географ|geography/i },
  { slug: "gcse-de", re: /німецьк|немецк|german|deutsch/i },
  { slug: "gcse-fr", re: /французьк|французск|french|français/i },
  { slug: "gcse-es", re: /іспанськ|испанск|spanish|español/i },
  { slug: "gcse-bus", re: /business|бізнес|бизнес/i },
  { slug: "gcse-econ", re: /econom|економ|эконом/i },
  { slug: "gcse-rs", re: /religious|релігі|религ|\brs\b/i },
  { slug: "gcse-pe", re: /physical\s*education|\bpe\b|фізкульт|физкульт/i },
  { slug: "gcse-soc", re: /sociolog|соціолог|социолог/i },
  { slug: "gcse-psy", re: /psycholog|психолог/i },
];

const AP_SLUGS: SlugRow[] = [
  { slug: "ap-calc-bc", re: /calculus\s*bc|calc\s*bc/i },
  { slug: "ap-calc-ab", re: /calculus\s*ab|calc\s*ab|calculus|матем|math/i },
  { slug: "ap-csp", re: /computer\s*science\s*principles|\bcsp\b/i },
  { slug: "ap-csa", re: /computer\s*science|\bcs\s*a\b|apcsa|інформатик/i },
  { slug: "ap-phys-c", re: /physics\s*c/i },
  { slug: "ap-phys1", re: /physics|фізик|физик/i },
  { slug: "ap-chem", re: /хім|хим|chem/i },
  { slug: "ap-hug", re: /human\s*geo|\bhug\b|aphg/i },
  { slug: "ap-env", re: /environmental|еколог/i },
  { slug: "ap-stat", re: /statistic|статистик/i },
  { slug: "ap-bio", re: /біолог|биолог|biology|\bbio\b/i },
  { slug: "ap-wh", re: /world\s*history/i },
  { slug: "ap-euh", re: /european\s*history/i },
  { slug: "ap-ush", re: /us\s*history|u\.s\.\s*history|american\s*history/i },
  { slug: "ap-lit", re: /literature|літератур|литератур/i },
  { slug: "ap-lang", re: /english|англійськ|английск/i },
  { slug: "ap-psy", re: /psycholog|психолог/i },
  { slug: "ap-micro", re: /micro/i },
  { slug: "ap-macro", re: /macro/i },
  { slug: "ap-gov", re: /government|\bgov\b/i },
  { slug: "ap-es", re: /spanish|іспанськ|испанск/i },
  { slug: "ap-fr", re: /french|французьк|французск/i },
];

const IB_SLUGS: SlugRow[] = [
  { slug: "ib-aa", re: /analysis|math\s*aa|\baa\b/i },
  { slug: "ib-ai", re: /applications|math\s*ai|\bai\b/i },
  { slug: "ib-ess", re: /environmental|ess\b/i },
  { slug: "ib-cs", re: /computer\s*science|computing|\bcs\b|інформатик/i },
  { slug: "ib-bus", re: /business|бізнес|бизнес/i },
  { slug: "ib-eng", re: /english|англійськ|английск/i },
  { slug: "ib-phys", re: /фізик|физик|physics/i },
  { slug: "ib-chem", re: /хім|хим|chem/i },
  { slug: "ib-bio", re: /біолог|биолог|biology|\bbio\b/i },
  { slug: "ib-econ", re: /econom|економ|эконом/i },
  { slug: "ib-hist", re: /істор|истор|history/i },
  { slug: "ib-geo", re: /географ|geography/i },
  { slug: "ib-psy", re: /psycholog|психолог/i },
];

const MATURA_SLUGS: SlugRow[] = [
  { slug: "matura-pl", re: /polski|polish|польськ|польск/i },
  { slug: "matura-math", re: /matematyk|матем|math/i },
  { slug: "matura-eng", re: /angielsk|english|англійськ|английск/i },
  { slug: "matura-wos", re: /\bwos\b|civics|społeczeń|wiedza o/i },
  { slug: "matura-cs", re: /informatyk|computer\s*science|\bcs\b/i },
  { slug: "matura-lang", re: /niemieck|rosyjsk|francusk|hiszpańsk|französ|spanish|włosk|italian|foreign|іноземн/i },
  { slug: "matura-bio", re: /biolog|біолог|биолог|\bbio\b/i },
  { slug: "matura-chem", re: /chemi|хім|хим|chem/i },
  { slug: "matura-phys", re: /fizyk|фізик|физик|physics/i },
  { slug: "matura-hist", re: /histor|істор|истор/i },
  { slug: "matura-geo", re: /geograf|географ/i },
  { slug: "matura-econ", re: /ekonom|econom|економ/i },
];

const ABITUR_SLUGS: SlugRow[] = [
  { slug: "abitur-de", re: /deutsch|німецьк|немецк|\bgerman\b/i },
  { slug: "abitur-math", re: /mathematik|матем|math/i },
  { slug: "abitur-music", re: /musik|music|музик|музык/i },
  { slug: "abitur-cs", re: /informatik|computer\s*science|\bcs\b/i },
  { slug: "abitur-pol", re: /sozialkunde|wirtschaft|politics|government|economics|економ|політик/i },
  { slug: "abitur-eng", re: /englisch|english|англійськ|английск/i },
  { slug: "abitur-lang", re: /französisch|spanish|foreign|іноземн/i },
  { slug: "abitur-bio", re: /biolog|біолог|биолог|\bbio\b/i },
  { slug: "abitur-chem", re: /chemie|хім|хим|chem/i },
  { slug: "abitur-phys", re: /physik|фізик|физик|physics/i },
  { slug: "abitur-hist", re: /geschichte|істор|истор|history/i },
  { slug: "abitur-geo", re: /geograph|географ|geography/i },
];

const BAC_SLUGS: SlugRow[] = [
  { slug: "bac-go", re: /grand\s*oral/i },
  { slug: "bac-hggsp", re: /hggsp|géopolitique|geopolitique|histoire-g[eé]o.*sp[eé]/i },
  { slug: "bac-hlp", re: /\bhlp\b|humanit[eé]s,\s*litt[eé]rature|litt[eé]rature et philosophie/i },
  { slug: "bac-pc", re: /physique-chimie|physique\s*chimie/i },
  { slug: "bac-svt", re: /\bsvt\b|sciences de la vie|vie et de la terre/i },
  { slug: "bac-nsi", re: /\bnsi\b|num[eé]rique et sciences/i },
  { slug: "bac-llcer", re: /llcer|anglais\s*sp[eé]|sp[eé]cialit[eé]\s*anglais/i },
  { slug: "bac-ses", re: /\bses\b|sciences [eé]conomiques|[eé]conomiques et sociales/i },
  { slug: "bac-philo", re: /philo/i },
  { slug: "bac-fr", re: /fran[cç]ais|french\s*literature|french\s*lang/i },
  { slug: "bac-math", re: /math/i },
];

const FAMILIES: Family[] = [
  "nmt", "alevel", "gcse", "sat", "act", "ap", "ib",
  "matura", "abitur", "bac", "ielts", "toefl", "duolingo", "gre", "gmat", "pte",
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

function firstSlug(exam: ExamLike | null | undefined, rows: SlugRow[]): string | null {
  const blob = subjectBlob(exam);
  for (const row of rows) {
    if (row.re.test(blob)) return row.slug;
  }
  return null;
}

export function nmtTreeSlug(exam: ExamLike | null | undefined): string | null {
  return firstSlug(exam, NMT_SLUGS);
}

export function alevelTreeSlug(exam: ExamLike | null | undefined): string | null {
  return firstSlug(exam, ALEVEL_SLUGS);
}

export function gcseTreeSlug(exam: ExamLike | null | undefined): string | null {
  return firstSlug(exam, GCSE_SLUGS);
}

export function apTreeSlug(exam: ExamLike | null | undefined): string | null {
  return firstSlug(exam, AP_SLUGS);
}

export function ibTreeSlug(exam: ExamLike | null | undefined): string | null {
  return firstSlug(exam, IB_SLUGS);
}

export function maturaTreeSlug(exam: ExamLike | null | undefined): string | null {
  return firstSlug(exam, MATURA_SLUGS);
}

export function abiturTreeSlug(exam: ExamLike | null | undefined): string | null {
  return firstSlug(exam, ABITUR_SLUGS);
}

export function bacTreeSlug(exam: ExamLike | null | undefined): string | null {
  return firstSlug(exam, BAC_SLUGS);
}

function qualificationOf(exam: ExamLike): string | null {
  const fromWindow = typeof window !== "undefined"
    ? (window as Window & { examQualificationId?: (e: ExamLike) => string | null }).examQualificationId
    : undefined;
  return (fromWindow && fromWindow(exam)) || exam.qualificationId || null;
}

function familyFromName(exam: ExamLike): Family | null {
  const blob = subjectBlob(exam);
  if (/nmt|нмт|зно/i.test(blob)) return "nmt";
  if (/a[\s-]?level/i.test(blob)) return "alevel";
  if (/gcse/i.test(blob)) return "gcse";
  if (/\bgmat\b/i.test(blob)) return "gmat";
  if (/\bgre\b/i.test(blob)) return "gre";
  if (/\bsat\b/i.test(blob)) return "sat";
  if (/\bact\b/i.test(blob)) return "act";
  if (/toefl/i.test(blob)) return "toefl";
  if (/\bpte\b|pearson test of english/i.test(blob)) return "pte";
  if (/duolingo|\bdet\b/i.test(blob)) return "duolingo";
  if (/ielts/i.test(blob)) return "ielts";
  if (/matura/i.test(blob)) return "matura";
  if (/abitur/i.test(blob)) return "abitur";
  // French Bac before IB: "baccalaureate" used to steal "Baccalauréat".
  if (/(baccalaur[eé]at|\bbac\s*g[eé]n[eé]ral|\bfrench\s*bac\b)/i.test(blob)
    && !/international/i.test(blob)) return "bac";
  if (/\bbac\b/i.test(blob) && !/\bib\b|international/i.test(blob)) return "bac";
  if (/\bib\b|international\s*baccalaureate/i.test(blob)) return "ib";
  if (/\bap\b/i.test(blob)) return "ap";
  return null;
}

function familyFromQual(qual: string | null): Family | null {
  if (!qual) return null;
  if (qual === "zno") return "nmt";
  return FAMILIES.includes(qual as Family) ? (qual as Family) : null;
}

function keyForFamily(family: Family, exam: ExamLike): string | null {
  switch (family) {
    case "nmt": return nmtTreeSlug(exam);
    case "alevel": return alevelTreeSlug(exam);
    case "gcse": return gcseTreeSlug(exam);
    case "ap": return apTreeSlug(exam);
    case "ib": return ibTreeSlug(exam);
    case "matura": return maturaTreeSlug(exam);
    case "abitur": return abiturTreeSlug(exam);
    case "bac": return bacTreeSlug(exam);
    case "sat":
    case "act":
    case "ielts":
    case "toefl":
    case "duolingo":
    case "gre":
    case "gmat":
    case "pte":
      return family;
    default:
      return null;
  }
}

export function treeKeyForExam(exam: ExamLike | null | undefined): string | null {
  if (!exam) return null;
  // Name wins over a stale qualificationId.
  const fromName = familyFromName(exam);
  if (fromName) return keyForFamily(fromName, exam);
  const qual = qualificationOf(exam);
  const fromQual = familyFromQual(qual);
  if (fromQual) return keyForFamily(fromQual, exam);
  if (qual && getTree(qual)) return qual;
  return null;
}

export function treeForExam(exam: ExamLike | null | undefined): LearnTree | null {
  const key = treeKeyForExam(exam);
  return key ? getTree(key) : null;
}

/** Match a dashboard topic name onto a lesson node. Exact title wins. */
export function findLessonByTitle(
  tree: LearnTree | null | undefined,
  topicName: string | null | undefined,
): { unit: LearnUnit; node: LearnNode } | null {
  const needle = (topicName || "").trim().toLowerCase();
  if (!tree || !needle) return null;
  let fuzzy: { unit: LearnUnit; node: LearnNode } | null = null;
  for (const unit of tree.units) {
    for (const node of unit.nodes) {
      if (node.kind === "boss") continue;
      const titles = [node.title.en, node.title.uk, node.title.ru, node.title.fr, node.title.de, node.title.pl, node.title.es]
        .filter((s): s is string => Boolean(s))
        .map((s) => s.toLowerCase());
      if (titles.includes(needle)) return { unit, node };
      if (!fuzzy && titles.some((t) => t.includes(needle) || needle.includes(t))) fuzzy = { unit, node };
    }
  }
  return fuzzy;
}
