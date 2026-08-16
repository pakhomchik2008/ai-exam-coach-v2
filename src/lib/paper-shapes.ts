/**
 * Official sitting shapes per exam + subject.
 *
 * Decision #113: #37 stays — we do not ingest ЗНО онлайн / revision banks.
 * We encode public board характеристики (УЦОЯО PDFs, College Board, AQA spec)
 * and generate original items. A student file is optional, never required.
 *
 * Family-level "18 GCSE MCQs" is a lie. Official is only claimed when this
 * catalog has a verified subject sitting. Unlisted subjects stay a generic mock.
 *
 * Decision #114: difficulty is calibrated from official public demos
 * (УЦОЯО 2023–2026 sittings, College Board Bluebook 1–5, ETS/GMAC samples).
 * We do not store or regenerate those items — only the difficulty curve.
 */
import { canonicalQualification, paperQualForExam, type ExamNameLike } from "./paper-language";
import { GRE_AWA, GRE_QUANT, GRE_VERBAL } from "./gre-paper";
import { GMAT_DATA_INSIGHTS, GMAT_QUANT, GMAT_VERBAL } from "./gmat-paper";

export type ItemKind = "mcq" | "match" | "short" | "order" | "multi" | "groups" | "written";

export interface PaperSection {
  readonly kind: ItemKind;
  readonly count: number;
  readonly options?: number;
  readonly left?: number;
  readonly right?: number;
  readonly picks?: number;
  readonly maxMarksEach: number;
  readonly note: string;
}

export interface PaperSitting {
  readonly id: string;
  readonly label: string;
  readonly minutes: number;
  readonly questionCount: number;
  readonly maxRaw: number;
  readonly sections: readonly PaperSection[];
}

export interface DifficultyCal {
  readonly mix: string;
  readonly do: string;
  readonly dont: string;
}

export interface PaperShape {
  readonly id: string;
  readonly qualification: string;
  readonly source: string;
  readonly year: number;
  readonly note: string;
  readonly difficulty: DifficultyCal;
  readonly papers: readonly PaperSitting[];
}

function cal(mix: string, doThis: string, dont: string): DifficultyCal {
  return { mix, do: doThis, dont };
}

function sitting(
  id: string,
  label: string,
  minutes: number,
  maxRaw: number,
  sections: readonly PaperSection[],
): PaperSitting {
  const questionCount = sections.reduce((sum, section) => sum + section.count, 0);
  return { id, label, minutes, questionCount, maxRaw, sections };
}

function mcq(count: number, options: number, maxMarksEach: number, note: string): PaperSection {
  return { kind: "mcq", count, options, maxMarksEach, note };
}
function match(count: number, left: number, right: number, maxMarksEach: number, note: string): PaperSection {
  return { kind: "match", count, left, right, maxMarksEach, note };
}
function short(count: number, maxMarksEach: number, note: string): PaperSection {
  return { kind: "short", count, maxMarksEach, note };
}
function order(count: number, maxMarksEach: number, note: string): PaperSection {
  return { kind: "order", count, maxMarksEach, note };
}
function multi(count: number, options: number, picks: number, maxMarksEach: number, note: string): PaperSection {
  return { kind: "multi", count, options, picks, maxMarksEach, note };
}
function groups(count: number, maxMarksEach: number, note: string): PaperSection {
  return { kind: "groups", count, maxMarksEach, note };
}
function written(count: number, maxMarksEach: number, note: string): PaperSection {
  return { kind: "written", count, maxMarksEach, note };
}

const NMT_INDEX = "https://testportal.gov.ua/skladnyky-nmt-2026/";

export const PAPER_SHAPES: readonly PaperShape[] = [
  {
    id: "nmt-math",
    qualification: "nmt",
    source: "https://testportal.gov.ua/wp-content/uploads/2026/01/Harakterystyka-NMT_matematyka_2026.pdf",
    year: 2026,
    note: "НМТ математика 2026: 22 / 60 хв / 32 тестових. 15×5 варіантів, 3 логічні пари, 4 короткі.",
    difficulty: cal(
      "1–8 school applied (chart, %, ratio, log, vector, spatial). 9–15 traps (which-statements, integrals, inequality systems, circle). Matching: function properties / evaluate / geometry. Shorts 19–22 are the hard end: piecewise+derivative, combinatorics, 3D volume, parameter so no roots.",
      "Five options А–Д. One calculation or one concept per MCQ. Shorts need 2–3 steps. Decimal answers allowed, including negatives. A formula sheet exists — still require working.",
      "No 2+2. No bare order-of-operations. No olympiad inequalities. Do not copy УЦОЯО demo or live items from 2023–2026.",
    ),
    papers: [sitting("nmt-math", "Математика", 60, 32, [
      mcq(15, 5, 1, "1–15 одна з п’яти. Items 2, 6, 10, 12, 15 need an original SVG figure (triangle, graph, circle, spatial) in the figure field."),
      match(3, 3, 5, 3, "16–18 логічні пари 1–3 × А–Д"),
      short(4, 2, "19–22 HARD only: (19) piecewise or derivative, (20) combinatorics, (21) 3D solid volume, (22) parameter so an equation has no roots. At least two items MUST include an original SVG figure. Ban order-of-operations warmups like (2³−5)·4+12:3."),
    ])],
  },
  {
    id: "nmt-ukr",
    qualification: "nmt",
    source: "https://testportal.gov.ua/wp-content/uploads/2026/01/Harakterystyka-NMT_ukrmova_2026.pdf",
    year: 2026,
    note: "НМТ українська мова 2026: 30 / 60 хв / 45 тестових. 1–10 чотири варіанти, 11–25 п’ять.",
    difficulty: cal(
      "1–10 orthography / stress / prefix / soft sign / hyphen / tautology (4 options). 11–20 syntax, punctuation justification, morphology, vocative (5 options). 21–25 one scrambled paragraph. Matching: phraseology / style.",
      "Near-miss distractors (wrong letter, wrong stress). School ЗНО programme only.",
      "No 'what is a noun'. No literary-theory essays. Do not copy demo sentences.",
    ),
    papers: [sitting("nmt-ukr", "Українська мова", 60, 45, [
      mcq(10, 4, 1, "1–10 орфографія / наголос / лексика, 4 варіанти"),
      mcq(15, 5, 1, "11–25 синтаксис / пунктуація / морфологія, 5 варіантів; 21–25 один розсипаний текст"),
      match(5, 4, 5, 4, "26–30 логічні пари 1–4 × А–Д"),
    ])],
  },
  {
    id: "nmt-hist",
    qualification: "nmt",
    source: "https://testportal.gov.ua/wp-content/uploads/2026/01/Harakterystyka-NMT_istUkrayiny_2026.pdf",
    year: 2026,
    note: "НМТ історія України 2026: 30 / 60 хв. MCQ, пари, послідовність, три з семи.",
    difficulty: cal(
      "1–20 one fact / cause / map / figure. Matching year↔event or figure↔work. Order four events across centuries. 3-of-7 is the hard end.",
      "Concrete Ukrainian history 9th c.–today. Plausible neighbouring-year distractors.",
      "No 'when was Kyiv founded' baby trivia. No essays. Do not copy demo items.",
    ),
    papers: [sitting("nmt-hist", "Історія України", 60, 54, [
      mcq(20, 4, 1, "1–20 одна з чотирьох"),
      match(4, 4, 5, 4, "21–24 логічні пари 1–4 × А–Д"),
      order(3, 3, "25–27 послідовність з 4 подій"),
      multi(3, 7, 3, 3, "28–30 три правильні з семи"),
    ])],
  },
  {
    id: "nmt-lit",
    qualification: "nmt",
    source: "https://testportal.gov.ua/wp-content/uploads/2026/01/Harakterystyka-NMT_ukrliteratura_2026.pdf",
    year: 2026,
    note: "НМТ українська література 2026: 30 / 60 хв / 45 тестових. MCQ — п’ять варіантів.",
    difficulty: cal(
      "Quote / author / work / genre / folklore vs literary. Matching artist↔statement.",
      "School canon only. One skill per item. Five options А–Д.",
      "No obscure untaught authors. Do not copy demo quotes.",
    ),
    papers: [sitting("nmt-lit", "Українська література", 60, 45, [
      mcq(25, 5, 1, "1–25 одна з п’яти"),
      match(5, 4, 5, 4, "26–30 логічні пари 1–4 × А–Д"),
    ])],
  },
  {
    id: "nmt-bio",
    qualification: "nmt",
    source: "https://testportal.gov.ua/wp-content/uploads/2026/01/Harakterystyka-NMT_biologiya_2026.pdf",
    year: 2026,
    note: "НМТ біологія 2026: 30 / 60 хв. 24 MCQ, 4 пари, 2 тригрупові.",
    difficulty: cal(
      "1–12 cell / plant / human recall+apply. 13–24 experiment, graph, which-statements. Matching + three-group classification.",
      "Programme facts with one twist. Four options.",
      "No med-school biochemistry. Do not copy demo items.",
    ),
    papers: [sitting("nmt-bio", "Біологія", 60, 46, [
      mcq(24, 4, 1, "1–24 одна з чотирьох"),
      match(4, 4, 5, 4, "25–28 логічні пари 1–4 × А–Д"),
      groups(2, 3, "29–30 три групи, по одному вибору"),
    ])],
  },
  {
    id: "nmt-phys",
    qualification: "nmt",
    source: "https://testportal.gov.ua/wp-content/uploads/2026/01/Harakterystyka-NMT_fizyka_2026.pdf",
    year: 2026,
    note: "НМТ фізика 2026: 22 / 60 хв. 14 MCQ, 2 пари, 6 коротких.",
    difficulty: cal(
      "1–8 concept + one formula (path vs displacement, KE vs p, Coulomb, R). 9–14 graphs / direction / nuclear. Shorts: equilibrium, centripetal, mixing, capacitors, lens, half-life ratio.",
      "Formula sheet allowed. Numbers that cancel. Four options. Shorts 2–3 steps.",
      "No contest physics. Do not copy demo items.",
    ),
    papers: [sitting("nmt-phys", "Фізика", 60, 32, [
      mcq(14, 4, 1, "1–14 одна з чотирьох"),
      match(2, 3, 5, 3, "15–16 логічні пари 1–3 × А–Д"),
      short(6, 2, "17–22 коротка відповідь"),
    ])],
  },
  {
    id: "nmt-chem",
    qualification: "nmt",
    source: "https://testportal.gov.ua/wp-content/uploads/2026/01/Harakterystyka-NMT_himiya_2026.pdf",
    year: 2026,
    note: "НМТ хімія 2026: 24 / 60 хв. 18 MCQ, 2 пари, 4 короткі.",
    difficulty: cal(
      "1–12 formula / periodicity / pH / redox. 13–18 organic + which-statements. Shorts: Mr, isomers, solubility %, yield %, mixture mass.",
      "School reactions. Round Ar to integers. Four options.",
      "No university physical chemistry. Do not copy demo items.",
    ),
    papers: [sitting("nmt-chem", "Хімія", 60, 32, [
      mcq(18, 4, 1, "1–18 одна з чотирьох"),
      match(2, 3, 5, 3, "19–20 логічні пари 1–3 × А–Д"),
      short(4, 2, "21–24 коротка відповідь"),
    ])],
  },
  {
    id: "nmt-geo",
    qualification: "nmt",
    source: "https://testportal.gov.ua/wp-content/uploads/2026/01/Harakterystyka-NMT_geografiya_2026.pdf",
    year: 2026,
    note: "НМТ географія 2026: 30 / 60 хв. 20 MCQ, 4 короткі, 6× три з семи.",
    difficulty: cal(
      "1–5 place / term. 6–17 map / profile / tectonics clusters. Shorts numeric. 3-of-7 is the hard end.",
      "Ukraine + world. Describe a map in words — do not paste a copyrighted map.",
      "No capital-city quiz only. Do not copy demo items.",
    ),
    papers: [sitting("nmt-geo", "Географія", 60, 46, [
      mcq(20, 4, 1, "1–20 одна з чотирьох"),
      short(4, 2, "21–24 коротка відповідь"),
      multi(6, 7, 3, 3, "25–30 три правильні з семи"),
    ])],
  },
  {
    id: "nmt-eng",
    qualification: "nmt",
    source: "https://testportal.gov.ua/wp-content/uploads/2026/01/Harakterystyka-NMT_inozemnimovy_2026.pdf",
    year: 2026,
    note: "НМТ іноземна 2026: 32 / 60 хв / 32 тестових. 6 tasks (5+5+6+6+5+5).",
    difficulty: cal(
      "Task 1 ads match B1. Task 2 ~400-word story, 5 MCQ. Task 3 museum match. Task 4 sentence gap. Task 5 vocab/phrasal. Task 6 grammar. Overall B1–B2.",
      "Authentic short texts. Four options on MCQ. Matching has unused extras.",
      "No C1 academic papers. No A2 'my name is'. Do not copy demo passages.",
    ),
    papers: [sitting("nmt-eng", "Іноземна мова", 60, 32, [
      mcq(20, 4, 1, "Tasks 1–2 and 5–6 style: one answer"),
      short(12, 1, "Tasks 3–4 style: matching / gap-fill as short keys"),
    ])],
  },
  {
    id: "sat-rw",
    qualification: "sat",
    source: "https://satsuite.collegeboard.org/sat/whats-on-the-test/structure",
    year: 2024,
    note: "Digital SAT Reading and Writing: 54 / 64 min (two 32-min modules).",
    difficulty: cal(
      "Short 25–150 word stems, one question each. Craft/structure, info/ideas, conventions, expression. Module 1 mixed; mock sits mid-hard (harder module-2 path).",
      "Vocabulary in context, grammar in a sentence, rhetoric. Four options.",
      "No long SAT essay. No GRE-hard vocab. Do not copy Bluebook stems.",
    ),
    papers: [sitting("sat-rw", "Reading and Writing", 64, 54, [
      mcq(54, 4, 1, "Two modules × 27. Adaptive module 2 is not modelled — one mixed paper."),
    ])],
  },
  {
    id: "sat-math",
    qualification: "sat",
    source: "https://satsuite.collegeboard.org/sat/whats-on-the-test/structure",
    year: 2024,
    note: "Digital SAT Math: 44 / 70 min. Most MCQ; some student-produced response.",
    difficulty: cal(
      "Algebra ~35%, Advanced Math ~35%, PSDA, some geometry. Module 1 mixed easy/medium/hard. Mock sits harder-module-2: non-obvious factoring, rationals, function composition — still SAT, not AMC.",
      "Four-option MCQ + SPR integers/decimals. Calculator-ok algebra.",
      "No contest olympiad. No arithmetic-only. Do not copy Bluebook items.",
    ),
    papers: [sitting("sat-math", "Math", 70, 44, [
      mcq(36, 4, 1, "Multiple choice"),
      short(8, 1, "Student-produced response"),
    ])],
  },
  {
    id: "gre-verbal",
    qualification: "gre",
    source: "https://www.ets.org/gre/test-takers/general-test/prepare/content.html",
    year: 2023,
    note: "Shorter GRE Verbal: 27 / 41.",
    difficulty: cal(
      "Text completion 1–3 blanks, sentence equivalence, dense RC. Vocab is GRE-hard.",
      "Five options typical. Precise diction, not SAT-easy synonyms.",
      "No SAT-easy vocab. Do not copy ETS items.",
    ),
    papers: [sitting("gre-verbal", "Verbal", GRE_VERBAL.minutes, GRE_VERBAL.questions, [
      mcq(GRE_VERBAL.questions, 5, 1, "Text completion / sentence equivalence / reading"),
    ])],
  },
  {
    id: "gre-quant",
    qualification: "gre",
    source: "https://www.ets.org/gre/test-takers/general-test/prepare/content.html",
    year: 2023,
    note: "Shorter GRE Quant: 27 / 47.",
    difficulty: cal(
      "Quantitative comparison + problem solving. Tricks over calculation. Harder than SAT.",
      "Compare A / B / equal / cannot. Data interpretation.",
      "No calculus. Do not copy ETS items.",
    ),
    papers: [sitting("gre-quant", "Quant", GRE_QUANT.minutes, GRE_QUANT.questions, [
      mcq(GRE_QUANT.questions, 5, 1, "Quantitative comparison and problem solving"),
    ])],
  },
  {
    id: "gre-awa",
    qualification: "gre",
    source: "https://www.ets.org/gre/test-takers/general-test/prepare/content.html",
    year: 2023,
    note: "Shorter GRE AWA: one Issue essay, 30 min. Argument removed.",
    difficulty: cal(
      "One Issue essay, 30 min, 0–6 half points.",
      "Take a position, examples, concede a counter.",
      "No Argument task — ETS removed it. Do not copy Issue prompts.",
    ),
    papers: [sitting("gre-awa", "Analytical Writing", GRE_AWA.minutes, 1, [
      written(1, 6, "Issue essay, 0–6 half points"),
    ])],
  },
  {
    id: "gmat-quant",
    qualification: "gmat",
    source: "https://www.mba.com/exams/gmat-exam/about/exam-structure-and-content",
    year: 2024,
    note: "GMAT Focus Quant: 21 / 45.",
    difficulty: cal(
      "Problem solving, no geometry. Harder than SAT. Data sufficiency lives in Data Insights.",
      "Five options. Tight algebra / word problems.",
      "No geometry. Do not copy GMAC items.",
    ),
    papers: [sitting("gmat-quant", "Quantitative", GMAT_QUANT.minutes, GMAT_QUANT.questions, [
      mcq(GMAT_QUANT.questions, 5, 1, "Problem solving. No geometry."),
    ])],
  },
  {
    id: "gmat-verbal",
    qualification: "gmat",
    source: "https://www.mba.com/exams/gmat-exam/about/exam-structure-and-content",
    year: 2024,
    note: "GMAT Focus Verbal: 23 / 45. No Sentence Correction.",
    difficulty: cal(
      "Critical reasoning + reading. No sentence correction.",
      "Assumption / weaken / strengthen / evaluate.",
      "No grammar underline. Do not copy GMAC items.",
    ),
    papers: [sitting("gmat-verbal", "Verbal", GMAT_VERBAL.minutes, GMAT_VERBAL.questions, [
      mcq(GMAT_VERBAL.questions, 5, 1, "Critical reasoning and reading"),
    ])],
  },
  {
    id: "gmat-di",
    qualification: "gmat",
    source: "https://www.mba.com/exams/gmat-exam/about/exam-structure-and-content",
    year: 2024,
    note: "GMAT Focus Data Insights: 20 / 45.",
    difficulty: cal(
      "Data sufficiency, tables, graphs. Multi-source feel.",
      "Statement (1)/(2) sufficient patterns. Five options.",
      "Do not copy GMAC items.",
    ),
    papers: [sitting("gmat-di", "Data Insights", GMAT_DATA_INSIGHTS.minutes, GMAT_DATA_INSIGHTS.questions, [
      mcq(GMAT_DATA_INSIGHTS.questions, 5, 1, "Data sufficiency, tables, graphs"),
    ])],
  },
  {
    id: "gcse-history",
    qualification: "gcse",
    source: "https://www.aqa.org.uk/subjects/history/gcse/history-8145/specification/specification-at-a-glance",
    year: 2016,
    note: "AQA GCSE History 8145: two written papers, 2h / 84 marks each. Not 11 MCQs.",
    difficulty: cal(
      "Written command words. 4–16 mark. Sources + essays. Not MCQ.",
      "Explain / How far / Write an account. Short original stimulus.",
      "No 11 MCQs. Do not copy AQA extracts.",
    ),
    papers: [
      sitting("gcse-hist-p1", "Paper 1 · Understanding the modern world", 120, 84, [
        written(6, 7, "Section A period study — six compulsory questions, 40 marks"),
        written(4, 10, "Section B wider world depth — four compulsory questions, 40 marks + SPaG"),
      ]),
      sitting("gcse-hist-p2", "Paper 2 · Shaping the nation", 120, 84, [
        written(4, 10, "Section A thematic study — four compulsory questions, 40 marks"),
        written(4, 10, "Section B British depth + historic environment — four questions, 40 marks + SPaG"),
      ]),
    ],
  },
];

const NMT_ENG_IDS = new Set(["nmt-eng", "nmt-de", "nmt-fr", "nmt-es"]);

const SUBJECT_MATCHERS: readonly { id: string; re: RegExp }[] = [
  { id: "nmt-math", re: /матем|math|алгебр|геометр/i },
  { id: "nmt-ukr", re: /українськ(а|ої) мов|украинск(ая|ий) яз|ukrainian language/i },
  { id: "nmt-hist", re: /істор|истор|history/i },
  { id: "nmt-lit", re: /літератур|литератур|literature/i },
  { id: "nmt-bio", re: /біолог|биолог|biology/i },
  { id: "nmt-phys", re: /фізик|физик|physics/i },
  { id: "nmt-chem", re: /хімі|хими|chemistry/i },
  { id: "nmt-geo", re: /географ|geograph/i },
  { id: "nmt-eng", re: /англійськ|английск|english|англ/i },
  { id: "nmt-de", re: /німецьк|немецк|german|deutsch/i },
  { id: "nmt-fr", re: /французьк|французск|french|français/i },
  { id: "nmt-es", re: /іспанськ|испанск|spanish|español/i },
  { id: "sat-math", re: /math|математи/i },
  { id: "sat-rw", re: /read|writ|verbal|english|читан|письм/i },
  { id: "gre-verbal", re: /verbal|read/i },
  { id: "gre-quant", re: /quant|math/i },
  { id: "gre-awa", re: /awa|writ|essay|issue/i },
  { id: "gmat-quant", re: /quant|math/i },
  { id: "gmat-verbal", re: /verbal|read/i },
  { id: "gmat-di", re: /data|insight/i },
  { id: "gcse-history", re: /histor|істор|истор/i },
];

const BY_ID: Readonly<Record<string, PaperShape>> = Object.fromEntries(
  PAPER_SHAPES.map((shape) => [shape.id, shape]),
);

export function paperShapeById(id: string | null | undefined): PaperShape | null {
  if (!id) return null;
  if (NMT_ENG_IDS.has(id) && id !== "nmt-eng") return BY_ID["nmt-eng"] || null;
  return BY_ID[id] || null;
}

const FAMILY_PAPER_IDS: Readonly<Record<string, readonly string[]>> = {
  sat: ["sat-rw", "sat-math"],
  gre: ["gre-verbal", "gre-quant", "gre-awa"],
  gmat: ["gmat-quant", "gmat-verbal", "gmat-di"],
};

function mergeFamily(family: string, ids: readonly string[]): PaperShape | null {
  const papers = ids.flatMap((id) => BY_ID[id]?.papers || []);
  if (!papers.length) return null;
  const first = BY_ID[ids[0] || ""];
  return {
    id: family,
    qualification: family,
    source: first?.source || "",
    year: first?.year || 0,
    note: `Pick one official ${family.toUpperCase()} section. The real sitting is these sections, not a generic MCQ pack.`,
    difficulty: first?.difficulty || cal("Mixed official sections.", "Sit the chosen paper's curve.", "Do not copy published items."),
    papers,
  };
}

export function paperShapeFor(exam: ExamNameLike | null | undefined): PaperShape | null {
  if (!exam) return null;
  const paperQual = paperQualForExam(exam);
  if (paperQual && NMT_ENG_IDS.has(paperQual)) return BY_ID["nmt-eng"] || null;
  const blob = `${exam.name || ""} ${exam.subject || ""} ${paperQual || ""}`;
  const family = canonicalQualification(exam.qualificationId || paperQual);
  for (const row of SUBJECT_MATCHERS) {
    const shape = BY_ID[row.id];
    if (!shape) continue;
    if (family) {
      if (shape.qualification !== family) continue;
    } else {
      const token = shape.qualification === "nmt" ? /nmt|зно/i : new RegExp(shape.qualification, "i");
      if (!token.test(blob)) continue;
    }
    if (row.re.test(blob)) return shape;
  }
  if (family && FAMILY_PAPER_IDS[family]) return mergeFamily(family, FAMILY_PAPER_IDS[family]);
  return null;
}

export function sittingById(shape: PaperShape | null | undefined, paperId?: string | null): PaperSitting | null {
  if (!shape || !shape.papers.length) return null;
  return shape.papers.find((paper) => paper.id === paperId) || shape.papers[0] || null;
}

export const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F", "G"] as const;

export function sectionGenerationPrompt(opts: {
  examName: string;
  styleNote: string;
  topics: readonly string[];
  section: PaperSection;
  difficulty?: DifficultyCal | null;
}): string {
  const { examName, styleNote, topics, section, difficulty } = opts;
  const topicLine = topics.length ? topics.join(", ") : examName;
  const diffBlock = difficulty
    ? `DIFFICULTY (calibrated from official public demos — do not copy those items):
Mix: ${difficulty.mix}
Do: ${difficulty.do}
Don't: ${difficulty.dont}`
    : "Same forms and difficulty as the real sitting.";
  const base = `You write ORIGINAL items for a mock sitting of "${examName}". ${styleNote}
Do not copy a published past paper or a third-party bank.
${diffBlock}
Topics to cover: ${topicLine}
Write exactly ${section.count} items. ${section.note}
OUTPUT ONLY valid JSON — no markdown, no fences. Start with { end with }.`;

  if (section.kind === "mcq") {
    const n = section.options || 4;
    return `${base}
FORMAT: {"questions":[{"kind":"mcq","question":"...","options":["..."],"correct":0,"explanation":"1-2 sentences","topic":"...","figure":""}]}
RULES: each item has exactly ${n} options; "correct" is a 0-based index.
figure is "" or a raw <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 400">…</svg> drawing (triangle, axes, circle, spatial). No width/height, no script, no external images.
When the stem says "see the figure" / "див. рисунок", figure MUST be a real drawing, not empty.`;
  }
  if (section.kind === "match") {
    return `${base}
FORMAT: {"questions":[{"kind":"match","question":"...","left":["1..."],"right":["A..."],"pairs":[0,1,2],"explanation":"...","topic":"..."}]}
RULES: left has ${section.left} stems; right has ${section.right} options (А–Д style); pairs[i] is the right-index for left[i].`;
  }
  if (section.kind === "short") {
    return `${base}
FORMAT: {"questions":[{"kind":"short","question":"...","answer":"-2.5","accept":["-2,5","-2.50"],"explanation":"2-3 step method","topic":"...","figure":""}]}
RULES: these are the LAST items on the paper — harder than the MCQs.
Each item needs 2–3 reasoning steps (piecewise+derivative, combinatorics C(n,k), 3D volume, parameter).
Answer is a number (decimals and negatives allowed). accept lists comma/dot twins.
BANNED: a single arithmetic expression with no context (order of operations, "обчисліть значення виразу (2³-5)·4").
figure is "" or a raw <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 400">…</svg>. At least half the items MUST have a figure (prism, graph, trapezoid).`;
  }
  if (section.kind === "order") {
    return `${base}
FORMAT: {"questions":[{"kind":"order","question":"...","items":["A...","B...","C...","D..."],"correct":[2,0,3,1],"explanation":"...","topic":"..."}]}
RULES: four items; correct is the chronological index order.`;
  }
  if (section.kind === "multi") {
    return `${base}
FORMAT: {"questions":[{"kind":"multi","question":"...","options":["..."],"correct":[0,2,5],"explanation":"...","topic":"..."}]}
RULES: exactly ${section.options} options; correct has exactly ${section.picks} indices.`;
  }
  if (section.kind === "groups") {
    return `${base}
FORMAT: {"questions":[{"kind":"groups","question":"...","columns":[["a","b","c"],["a","b","c"],["a","b","c"]],"correct":[0,1,2],"explanation":"...","topic":"..."}]}
RULES: three columns of three labels; correct[i] is the chosen row in column i.`;
  }
  return `${base}
FORMAT: {"questions":[{"kind":"written","question":"...","stimulus":"optional source extract","maxMarks":${section.maxMarksEach},"markscheme":["bullet 1","bullet 2"],"topic":"..."}]}
RULES: exam-board command words (Explain / How far / Write an account). Stimulus is a short original source, not a copyrighted extract.`;
}

export type SimAnswer =
  | number
  | string
  | number[]
  | null
  | undefined;

export type SimQuestion = {
  kind: ItemKind;
  question: string;
  options?: string[];
  correct?: number | number[] | string;
  explanation?: string;
  topic?: string;
  left?: string[];
  right?: string[];
  pairs?: number[];
  items?: string[];
  answer?: string;
  accept?: string[];
  columns?: string[][];
  stimulus?: string;
  markscheme?: string[];
  maxMarks?: number;
  figure?: string;
};

/** Last-section NMT shorts that are just order-of-operations. Official 19–22 never look like this. */
export function isBabyShort(question: string): boolean {
  const text = String(question || "");
  const hard = /функц|похідн|призм|пірамід|комбін|параметр|нерівн|об'?єм|ймовірн|послідовн|piecewise|derivative|prism|combinator/i.test(text);
  if (hard) return false;
  return /обчисл.+\s+значення\s+виразу|evaluate the (value of the )?expression|compute the value of/i.test(text);
}

export function normalizeSimQuestion(raw: unknown, fallback: ItemKind): SimQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const question = String(row.question || "").trim();
  if (!question) return null;
  const kind = (typeof row.kind === "string" ? row.kind : fallback) as ItemKind;
  const topic = typeof row.topic === "string" ? row.topic : "";
  const explanation = typeof row.explanation === "string" ? row.explanation : "";
  const figure = typeof row.figure === "string" ? row.figure : "";
  if (kind === "mcq") {
    const options = Array.isArray(row.options) ? row.options.map((o) => String(o)) : [];
    const correct = typeof row.correct === "number" ? row.correct : 0;
    if (options.length < 2) return null;
    return { kind, question, options, correct, explanation, topic, figure };
  }
  if (kind === "match") {
    const left = Array.isArray(row.left) ? row.left.map((o) => String(o)) : [];
    const right = Array.isArray(row.right) ? row.right.map((o) => String(o)) : [];
    const pairs = Array.isArray(row.pairs) ? row.pairs.map((n) => Number(n)) : [];
    if (!left.length || !right.length) return null;
    return { kind, question, left, right, pairs, explanation, topic, figure };
  }
  if (kind === "short") {
    const answer = String(row.answer || row.correct || "").trim();
    const accept = Array.isArray(row.accept) ? row.accept.map((o) => String(o)) : [];
    if (!answer) return null;
    return { kind, question, answer, accept, explanation, topic, figure };
  }
  if (kind === "order") {
    const items = Array.isArray(row.items) ? row.items.map((o) => String(o)) : [];
    const correct = Array.isArray(row.correct) ? row.correct.map((n) => Number(n)) : [];
    if (items.length < 3) return null;
    return { kind, question, items, correct, explanation, topic };
  }
  if (kind === "multi") {
    const options = Array.isArray(row.options) ? row.options.map((o) => String(o)) : [];
    const correct = Array.isArray(row.correct) ? row.correct.map((n) => Number(n)) : [];
    if (options.length < 3 || !correct.length) return null;
    return { kind, question, options, correct, explanation, topic };
  }
  if (kind === "groups") {
    const columns = Array.isArray(row.columns)
      ? row.columns.map((col) => (Array.isArray(col) ? col.map((o) => String(o)) : []))
      : [];
    const correct = Array.isArray(row.correct) ? row.correct.map((n) => Number(n)) : [];
    if (columns.length < 2) return null;
    return { kind, question, columns, correct, explanation, topic };
  }
  const markscheme = Array.isArray(row.markscheme) ? row.markscheme.map((o) => String(o)) : [];
  return {
    kind: "written",
    question,
    stimulus: typeof row.stimulus === "string" ? row.stimulus : "",
    markscheme,
    maxMarks: typeof row.maxMarks === "number" ? row.maxMarks : 8,
    topic,
    explanation,
  };
}

function normKey(value: string): string {
  return String(value || "").toLowerCase().replace(/\s+/g, "").replace(",", ".");
}

export function scoreSimAnswer(question: SimQuestion, answer: SimAnswer): { correct: boolean; marks: number; maxMarks: number } {
  if (question.kind === "mcq") {
    const maxMarks = question.maxMarks || 1;
    const ok = answer === question.correct;
    return { correct: ok, marks: ok ? maxMarks : 0, maxMarks };
  }
  if (question.kind === "short") {
    const maxMarks = question.maxMarks || 2;
    const got = normKey(String(answer || ""));
    const pool = [question.answer, ...(question.accept || [])].filter(Boolean).map((v) => normKey(String(v)));
    const ok = Boolean(got) && pool.some((v) => v === got);
    return { correct: ok, marks: ok ? maxMarks : 0, maxMarks };
  }
  if (question.kind === "match") {
    const maxMarks = question.pairs?.length || 0;
    const got = Array.isArray(answer) ? answer : [];
    let marks = 0;
    (question.pairs || []).forEach((want, i) => { if (got[i] === want) marks += 1; });
    return { correct: marks === maxMarks && maxMarks > 0, marks, maxMarks };
  }
  if (question.kind === "order") {
    const want = Array.isArray(question.correct) ? question.correct : [];
    const got = Array.isArray(answer) ? answer : [];
    const maxMarks = want.length;
    let marks = 0;
    want.forEach((w, i) => { if (got[i] === w) marks += 1; });
    return { correct: marks === maxMarks && maxMarks > 0, marks, maxMarks };
  }
  if (question.kind === "multi") {
    const want = new Set(Array.isArray(question.correct) ? question.correct : []);
    const got = new Set(Array.isArray(answer) ? answer : []);
    const maxMarks = want.size;
    let marks = 0;
    want.forEach((w) => { if (got.has(w)) marks += 1; });
    return { correct: marks === maxMarks && maxMarks > 0, marks, maxMarks };
  }
  if (question.kind === "groups") {
    const want = Array.isArray(question.correct) ? question.correct : [];
    const got = Array.isArray(answer) ? answer : [];
    const maxMarks = want.length;
    let marks = 0;
    want.forEach((w, i) => { if (got[i] === w) marks += 1; });
    return { correct: marks === maxMarks && maxMarks > 0, marks, maxMarks };
  }
  const maxMarks = question.maxMarks || 8;
  const text = String(answer || "").trim();
  return { correct: text.length > 40, marks: 0, maxMarks };
}

export function nmtIndexUrl(): string {
  return NMT_INDEX;
}
