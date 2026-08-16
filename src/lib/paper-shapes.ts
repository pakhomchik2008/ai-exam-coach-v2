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

/** AQA 7652 / 7692 / 7662 share one clock. Language-specific source + prompt language. */
function alevelModernLanguage(opts: {
  id: string;
  language: string;
  code: string;
  source: string;
}): PaperShape {
  const slug = opts.id.replace("alevel-", "");
  return {
    id: opts.id,
    qualification: "alevel",
    source: opts.source,
    year: 2016,
    note: `AQA A-level ${opts.language} ${opts.code}: Paper 1 2h30 / 100 (listen+read+translate), Paper 2 2h / 80, Paper 3 oral 21–23 min / 60. Listening is a printed transcript here — real AQA is student-controlled audio. Speaking is a timed written card + IRP. No dictionary.`,
    difficulty: cal(
      `Paper 1: gist / detail / inference in ${opts.language}, then 100-word translations both ways. Paper 2: ~300 words per essay on a set text/film. Paper 3: stimulus card + IRP.`,
      `Original authentic-style extracts as figure plates (news, interview, blog). Questions in ${opts.language} except the into-English translation.`,
      `Do not copy AQA recordings, texts, or set-work wording. No dictionary. No English essays on Paper 2.`,
    ),
    papers: [
      sitting(`al-${slug}-p1`, "Paper 1 · Listening, reading and writing", 150, 100, [
        short(6, 5, "Listening from a printed transcript (30). figureBrief for the transcript plate."),
        short(10, 5, "Reading (50). figureBrief for each unseen extract."),
        written(2, 10, "Translation into English and into the target language (min 100 words each)."),
      ]),
      sitting(`al-${slug}-p2`, "Paper 2 · Writing", 120, 80, [
        written(2, 40, "Two essays (~300 words) in the target language on set text and/or film."),
      ]),
      sitting(`al-${slug}-p3`, "Paper 3 · Speaking (written mock)", 23, 60, [
        written(1, 25, "Stimulus-card discussion. Figure = the card."),
        written(1, 35, "IRP presentation + follow-up (written)."),
      ]),
    ],
  };
}

/** AQA 8652 / 8692 / 8662 (first teach 2024) share one Higher-tier clock. */
function gcseModernLanguage(opts: {
  id: string;
  language: string;
  code: string;
  source: string;
}): PaperShape {
  const slug = opts.id.replace("gcse-", "");
  return {
    id: opts.id,
    qualification: "gcse",
    source: opts.source,
    year: 2024,
    note: `AQA GCSE ${opts.language} ${opts.code} (first teach 2024): Higher clocks — Listening 45 min / 50, Speaking 10–12 min / 50, Reading 60 min / 50, Writing 75 min / 50. Foundation is shorter; this mock sits Higher. Listening is a printed transcript. Speaking is a timed written role-play + photo card. No dictionary.`,
    difficulty: cal(
      `Higher: gist/detail/inference in ${opts.language}, dictation, 50-word translations, 90- and 150-word writing. Themes: people and lifestyle, popular culture, the world around us.`,
      `Original extracts as figure plates. Photo-card items MUST set figureBrief. Questions in English on Papers 1 and 3; writing and speaking in ${opts.language}.`,
      `Do not copy AQA recordings, photo cards, or vocab-list sentences. No dictionary. No A-level essays.`,
    ),
    papers: [
      sitting(`gcse-${slug}-p1`, "Paper 1 · Listening (Higher)", 45, 50, [
        short(8, 5, "Section A listening from a printed transcript (40). figureBrief for the transcript plate."),
        short(2, 5, "Section B dictation — transcribe short sentences (10)."),
      ]),
      sitting(`gcse-${slug}-p2`, "Paper 2 · Speaking (written mock)", 12, 50, [
        written(1, 10, "Role-play"),
        written(1, 15, "Reading aloud + short conversation"),
        written(1, 25, "Photo card. Figure = the card."),
      ]),
      sitting(`gcse-${slug}-p3`, "Paper 3 · Reading (Higher)", 60, 50, [
        short(8, 5, "Section A reading (40). figureBrief for each extract."),
        written(1, 10, "Section B translation into English (min 50 words)."),
      ]),
      sitting(`gcse-${slug}-p4`, "Paper 4 · Writing (Higher)", 75, 50, [
        written(1, 10, "Translation into the target language (min 50 words)."),
        written(1, 15, "90-word bullet writing"),
        written(1, 25, "150-word open writing"),
      ]),
    ],
  };
}

/** College Board AP: one exam day, two (or three) timed sections. Picker sits each section. */
function apMcqFrq(opts: {
  id: string;
  title: string;
  source: string;
  year: number;
  note: string;
  mix: string;
  do: string;
  dont?: string;
  mcq: { count: number; minutes: number; note?: string };
  frq: { count: number; minutes: number; maxRaw: number; note: string };
}): PaperShape {
  const slug = opts.id.replace("ap-", "");
  return {
    id: opts.id,
    qualification: "ap",
    source: opts.source,
    year: opts.year,
    note: opts.note,
    difficulty: cal(opts.mix, opts.do, opts.dont || "Do not copy College Board FRQs, CED examples, or AP Classroom items."),
    papers: [
      sitting(`ap-${slug}-mcq`, "Section I · Multiple choice", opts.mcq.minutes, opts.mcq.count, [
        mcq(opts.mcq.count, 4, 1, opts.mcq.note || "Four-option MCQ. Stimulus sets MAY share a figureBrief."),
      ]),
      sitting(`ap-${slug}-frq`, "Section II · Free response", opts.frq.minutes, opts.frq.maxRaw, [
        written(opts.frq.count, Math.round(opts.frq.maxRaw / opts.frq.count), opts.frq.note),
      ]),
    ],
  };
}

function apHistory(opts: {
  id: string;
  title: string;
  source: string;
  span: string;
  dbqSpan: string;
}): PaperShape {
  const slug = opts.id.replace("ap-", "");
  return {
    id: opts.id,
    qualification: "ap",
    source: opts.source,
    year: 2017,
    note: `College Board ${opts.title}: 3h15. Section IA 55 MCQ / 55 min / 40%, IB 3 SAQ / 40 min / 20%, II DBQ+LEQ / 100 min / 40%. Sources are original plates — do not ingest AP images.`,
    difficulty: cal(
      `Stimulus MCQ sets, then 3 required SAQ (${opts.span}), then one DBQ (${opts.dbqSpan}) and one LEQ. HIPP + thesis + evidence.`,
      "Every stimulus set / SAQ / DBQ MUST set figureBrief (original cartoon, map, table, or short source plate). Seven DBQ docs are original, not AP released.",
      "Do not copy College Board documents or SAQ stems.",
    ),
    papers: [
      sitting(`ap-${slug}-mcq`, "Section IA · Multiple choice", 55, 55, [
        mcq(55, 4, 1, "Sets of 3–4 on one stimulus. figureBrief required on each set."),
      ]),
      sitting(`ap-${slug}-saq`, "Section IB · Short answer", 40, 9, [
        written(3, 3, `Three required SAQ (${opts.span}). At least two with a source figure.`),
      ]),
      sitting(`ap-${slug}-frq`, "Section II · DBQ and LEQ", 100, 13, [
        written(1, 7, `DBQ, 7 original documents (${opts.dbqSpan}). Figure on each doc plate.`),
        written(1, 6, "LEQ — thesis + evidence, no documents."),
      ]),
    ],
  };
}

function apWorldLanguage(opts: { id: string; language: string; source: string }): PaperShape {
  const slug = opts.id.replace("ap-", "");
  return {
    id: opts.id,
    qualification: "ap",
    source: opts.source,
    year: 2027,
    note: `College Board AP ${opts.language} Language and Culture (~2h30). New digital form: Section I free response (project presentation + Q&A + argumentative essay) then Section II 55 MCQ (25 listen / 30 read). Listening is a printed transcript. Speaking is a timed written script. Project research is not sat here — invent an original project brief.`,
    difficulty: cal(
      `Presentational and interpersonal ${opts.language}, then interpretive listen+read. Argumentative essay uses print + audio-as-transcript sources.`,
      `Listen items MUST set figureBrief (transcript plate). Essay sources are original. Responses in ${opts.language}.`,
      `Do not copy College Board audio, project topics, or AP Classroom items. No dictionary.`,
    ),
    papers: [
      sitting(`ap-${slug}-frq`, "Section I · Free response (written mock)", 70, 50, [
        written(1, 20, "Project presentation script (3 min spoken → written)."),
        written(1, 15, "Project Q&A — four short replies."),
        written(1, 15, "Argumentative essay, 55 min, print + transcript sources. Figures required."),
      ]),
      sitting(`ap-${slug}-mcq`, "Section II · Interpretive", 80, 55, [
        mcq(25, 4, 1, "Listening from a printed transcript (40 min). figureBrief for each clip."),
        mcq(30, 4, 1, "Reading (40 min). figureBrief for each extract."),
      ]),
    ],
  };
}

function ibMathHl(opts: { id: string; course: string; source: string }): PaperShape {
  return {
    id: opts.id,
    qualification: "ib",
    source: opts.source,
    year: 2021,
    note: `IB ${opts.course} HL (first assessment 2021): Paper 1 2h / 110 no tech, Paper 2 2h / 110 tech, Paper 3 1h / 55 two problem-solving questions. SL is shorter (1h30 / 80, no Paper 3) — this mock sits HL. IA exploration 20% not sat. IBO has announced a later mark cut to 100/100/50; clocks on the public subject brief stay 2h/2h/1h.`,
    difficulty: cal(
      `${opts.course} HL: short then extended. Paper 1 algebraic / proof. Paper 2 modelling with tech. Paper 3 two long connected problems.`,
      "Graph / diagram items MUST set figureBrief. Exact notation. Working required.",
      "Do not copy IB specimen or past papers. No SL-only demand on Paper 3. IA is not sat here.",
    ),
    papers: [
      sitting(`${opts.id}-p1`, "Paper 1 · No technology", 120, 110, [
        short(8, 5, "Section A short-response"),
        written(4, 17, "Section B extended. At least two figures."),
      ]),
      sitting(`${opts.id}-p2`, "Paper 2 · Technology", 120, 110, [
        short(8, 5, "Section A short-response. Several with figures."),
        written(4, 17, "Section B extended. Modelling + figure."),
      ]),
      sitting(`${opts.id}-p3`, "Paper 3 · Problem solving", 60, 55, [
        written(2, 27, "Two compulsory extended problem-solving questions. Figure on both."),
      ]),
    ],
  };
}

function ibScienceHl(opts: { id: string; subject: string; source: string }): PaperShape {
  return {
    id: opts.id,
    qualification: "ib",
    source: opts.source,
    year: 2025,
    note: `IB ${opts.subject} HL (first assessment 2025): Paper 1 2h / 60 (1A 40 MCQ + 1B data) / 36%, Paper 2 2h30 / 90 / 44%. SL is 1h30+1h30. Scientific investigation IA 20% not sat. No Paper 3 / options.`,
    difficulty: cal(
      "Paper 1A rapid apply, 1B data/uncertainty/experimental, Paper 2 short + extended. HL depth on AHL content.",
      "Data / apparatus items MUST set figureBrief (original table, graph, setup). Units and uncertainty matter.",
      "Do not copy IB specimens. IA is not sat here. No pre-2025 Paper 3 options.",
    ),
    papers: [
      sitting(`${opts.id}-p1`, "Paper 1 · MCQ and data", 120, 60, [
        mcq(40, 4, 1, "Paper 1A multiple choice. Several with figures."),
        short(5, 4, "Paper 1B data / experimental. figureBrief required."),
      ]),
      sitting(`${opts.id}-p2`, "Paper 2 · Short and extended", 150, 90, [
        short(10, 3, "Short-response. Several with figures."),
        written(6, 10, "Extended. At least two figures."),
      ]),
    ],
  };
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
      mcq(20, 4, 1, "1–20 одна з чотирьох. Map / portrait / cartoon items MUST set figureBrief."),
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
      mcq(20, 4, 1, "1–20 одна з чотирьох. Map / profile items MUST set figureBrief."),
      short(4, 2, "21–24 коротка відповідь"),
      multi(6, 7, 3, 3, "25–30 три правильні з семи"),
    ])],
  },
  {
    id: "nmt-eng",
    qualification: "nmt",
    source: "https://testportal.gov.ua/wp-content/uploads/2026/01/Harakterystyka-NMT_inozemnimovy_2026.pdf",
    year: 2026,
    note: "НМТ іноземна 2026: 32 / 60 хв / 32 тестових. Task 1 №1–5 відповідність (оголошення з фото → A–H, 3 зайві). Task 2 №6–10 MCQ. Task 3 №11–16 відповідність (тексти → A–H, 2 зайві). Tasks 4–6 №17–32 пропуски.",
    difficulty: cal(
      "Calibrated to УЦОЯО 2024–2026 demos (curve only). Task 1: scan photo-ads, B1. Task 2: one 350–450 word narrative, 5 MCQ — TRUE of a named paragraph, EXCEPT, inference, why. Task 3: 6 short authentic texts, paraphrase match, not keyword. Task 4: one text, 6 clause gaps (relative / purpose / whether), A–H, 2 unused. Task 5: vocab + phrasal + linker near-misses. Task 6: grammar (its/their, modals, participles, whether/while). Floor B1, ceiling B2, one C1-ish distractor max.",
      "English only. Task 1: every item MUST set figureBrief (print advert photo-plate) and figureKind source. Task 2/5/6: put the FULL shared passage in every item's stimulus. Matching: identical right[] on all items in the task; unused extras stay unused.",
      "Do not copy УЦОЯО demo ads, college-day narrative, museum set, polyglot gap-text, husky, or robot grammar text. No A2 'my name is' / cat-dog-house. No IELTS essay. No listening. No Ukrainian stems.",
    ),
    papers: [sitting("nmt-eng", "Іноземна мова", 60, 32, [
      match(5, 1, 8, 1, "Task 1 №1–5. Each item is ONE photo-advert. left[0] = 2–4 sentence original ad copy. right = the SAME 8 short headings A–H (eating out / job / clinic style), 3 unused across the set. figureBrief MUST be a print advert photo (shop, flyer, billboard) with 4+ readable English words. figureKind source."),
      mcq(5, 4, 1, "Task 2 №6–10. ONE shared 350–450 word original narrative/article in stimulus on every item. Stems: TRUE according to paragraph N / EXCEPT / what caused / why. Four options. Not 'what is the title'."),
      match(6, 1, 8, 1, "Task 3 №11–16. Each item is one short authentic text (80–140 words). right = the SAME 8 sentence completions A–H ('This place ______'), 2 unused. Paraphrase, not a repeated keyword."),
      match(6, 1, 8, 1, "Task 4 №17–22. ONE shared gapped text in stimulus (same on every item). right = the SAME 8 clause fragments A–H, 2 unused. Gaps need a clause, not a single noun."),
      mcq(5, 4, 1, "Task 5 №23–27. ONE shared gapped text in stimulus. Vocab / phrasal / discourse marker. Near-miss A–D (look through / look out)."),
      mcq(5, 4, 1, "Task 6 №28–32. ONE shared gapped text in stimulus. Grammar only: determiners, modals, verb patterns, whether/while. Not A2 be/have."),
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
      "Written command words. 4–16 mark. Sources + essays. Not MCQ. Real papers print photos, cartoons, maps.",
      "Explain / How far / Write an account. Original stimulus + SVG figure on at least half the items (cartoon, map, photo-like scene).",
      "No 11 MCQs. Do not copy AQA extracts or photos.",
    ),
    papers: [
      sitting("gcse-hist-p1", "Paper 1 · Understanding the modern world", 120, 84, [
        written(6, 7, "Section A period study — six questions, 40 marks. At least three need an SVG source figure."),
        written(4, 10, "Section B wider world depth — four questions, 40 marks + SPaG. At least two need a figure."),
      ]),
      sitting("gcse-hist-p2", "Paper 2 · Shaping the nation", 120, 84, [
        written(4, 10, "Section A thematic study — four questions, 40 marks. At least two need a figure."),
        written(4, 10, "Section B British depth + historic environment — four questions. Site map / photo-like SVG required on two."),
      ]),
    ],
  },
  {
    id: "gcse-math",
    qualification: "gcse",
    source: "https://www.aqa.org.uk/subjects/mathematics/gcse/mathematics-8300/specification/specification-at-a-glance",
    year: 2015,
    note: "AQA GCSE Maths 8300: three 90-min / 80-mark papers. Mix of 1-mark to multi-step. Q count is not fixed — mock is a representative sitting.",
    difficulty: cal(
      "Early items school-applied. Later items multi-step. Many stems say 'not drawn accurately' with a diagram.",
      "Short + written mix. At least half the items MUST have an original SVG figure (triangle, circle, graph, 3D).",
      "No order-of-operations warmup. Do not copy AQA items.",
    ),
    papers: [
      sitting("gcse-math-p1", "Paper 1 · non-calculator", 90, 80, [
        short(12, 3, "Closed items, several with figures"),
        written(4, 11, "Multi-step. At least two with SVG figures."),
      ]),
      sitting("gcse-math-p2", "Paper 2 · calculator", 90, 80, [
        short(12, 3, "Closed items, several with figures"),
        written(4, 11, "Multi-step. At least two with SVG figures."),
      ]),
      sitting("gcse-math-p3", "Paper 3 · calculator", 90, 80, [
        short(12, 3, "Closed items, several with figures"),
        written(4, 11, "Multi-step. At least two with SVG figures."),
      ]),
    ],
  },
  {
    id: "gcse-eng-lang",
    qualification: "gcse",
    source: "https://www.aqa.org.uk/subjects/english/gcse/english-8700/specification/specification-at-a-glance",
    year: 2015,
    note: "AQA GCSE English Language 8700: two 1h45 / 80-mark papers. Reading + writing. Sources are unseen texts, not MCQ.",
    difficulty: cal(
      "Paper 1 fiction extract + descriptive write. Paper 2 two non-fiction + viewpoint write.",
      "Original short extracts in stimulus. A source can include an SVG illustration (poster, photo-like scene) when the task is visual.",
      "Do not copy AQA inserts.",
    ),
    papers: [
      sitting("gcse-eng-p1", "Paper 1 · Explorations in creative reading and writing", 105, 80, [
        written(4, 10, "Reading: 4+8+8+20 on one original fiction extract"),
        written(1, 40, "Writing: one descriptive or narrative"),
      ]),
      sitting("gcse-eng-p2", "Paper 2 · Writers' viewpoints and perspectives", 105, 80, [
        written(4, 10, "Reading: 4+8+12+16 on two original linked texts"),
        written(1, 40, "Writing: one viewpoint piece"),
      ]),
    ],
  },
  {
    id: "gcse-eng-lit",
    qualification: "gcse",
    source: "https://www.aqa.org.uk/subjects/english/gcse/english-8702/specification/specification-at-a-glance",
    year: 2015,
    note: "AQA GCSE English Literature 8702: Paper 1 1h45 / 64; Paper 2 2h15 / 96. Essays, closed book.",
    difficulty: cal(
      "Extract-to-whole essays. Unseen poetry on Paper 2.",
      "Original short extracts in stimulus. No figure required unless a stage diagram helps.",
      "Do not copy set-text extracts from AQA papers.",
    ),
    papers: [
      sitting("gcse-englit-p1", "Paper 1 · Shakespeare and the 19th-century novel", 105, 64, [
        written(1, 32, "Shakespeare: extract + whole play"),
        written(1, 32, "19th-century novel: extract + whole text"),
      ]),
      sitting("gcse-englit-p2", "Paper 2 · Modern texts and poetry", 135, 96, [
        written(1, 34, "Modern prose or drama essay"),
        written(1, 30, "Named poem vs anthology"),
        written(2, 16, "Unseen poem + comparison"),
      ]),
    ],
  },
  {
    id: "gcse-combined-sci",
    qualification: "gcse",
    source: "https://www.aqa.org.uk/subjects/science/gcse/science-8464/specification/specification-at-a-glance",
    year: 2016,
    note: "AQA Combined Science Trilogy 8464: six 1h15 / 70-mark papers. MCQ + structured + open. Diagrams and graphs on almost every paper.",
    difficulty: cal(
      "Foundation/Higher mix of recall and apply. Graphs, apparatus, cell/circuit drawings.",
      "At least half the items MUST have an original SVG figure (graph, apparatus, cell, circuit).",
      "Do not copy AQA items.",
    ),
    papers: [
      sitting("gcse-csci-b1", "Biology Paper 1", 75, 70, [
        mcq(8, 4, 1, "Closed. Several with figures"),
        short(6, 4, "Structured"),
        written(2, 15, "Open response. At least one figure."),
      ]),
      sitting("gcse-csci-b2", "Biology Paper 2", 75, 70, [
        mcq(8, 4, 1, "Closed. Several with figures"),
        short(6, 4, "Structured"),
        written(2, 15, "Open response. At least one figure."),
      ]),
      sitting("gcse-csci-c1", "Chemistry Paper 1", 75, 70, [
        mcq(8, 4, 1, "Closed. Several with figures"),
        short(6, 4, "Structured"),
        written(2, 15, "Open response. At least one figure."),
      ]),
      sitting("gcse-csci-c2", "Chemistry Paper 2", 75, 70, [
        mcq(8, 4, 1, "Closed. Several with figures"),
        short(6, 4, "Structured"),
        written(2, 15, "Open response. At least one figure."),
      ]),
      sitting("gcse-csci-p1", "Physics Paper 1", 75, 70, [
        mcq(8, 4, 1, "Closed. Several with figures"),
        short(6, 4, "Structured"),
        written(2, 15, "Open response. At least one figure."),
      ]),
      sitting("gcse-csci-p2", "Physics Paper 2", 75, 70, [
        mcq(8, 4, 1, "Closed. Several with figures"),
        short(6, 4, "Structured"),
        written(2, 15, "Open response. At least one figure."),
      ]),
    ],
  },
  {
    id: "gcse-biology",
    qualification: "gcse",
    source: "https://www.aqa.org.uk/subjects/biology/gcse/biology-8461/specification/specification-at-a-glance",
    year: 2016,
    note: "AQA GCSE Biology 8461: two 1h45 / 100-mark papers.",
    difficulty: cal(
      "MCQ + structured + open. Cells, graphs, practical diagrams.",
      "At least half the items MUST have an original SVG figure.",
      "Do not copy AQA items.",
    ),
    papers: [
      sitting("gcse-bio-p1", "Paper 1 · topics 1–4", 105, 100, [
        mcq(10, 4, 1, "Closed. Several with figures"),
        short(8, 5, "Structured"),
        written(2, 25, "Open. At least one figure."),
      ]),
      sitting("gcse-bio-p2", "Paper 2 · topics 5–7", 105, 100, [
        mcq(10, 4, 1, "Closed. Several with figures"),
        short(8, 5, "Structured"),
        written(2, 25, "Open. At least one figure."),
      ]),
    ],
  },
  {
    id: "gcse-chemistry",
    qualification: "gcse",
    source: "https://www.aqa.org.uk/subjects/chemistry/gcse/chemistry-8462/specification/specification-at-a-glance",
    year: 2016,
    note: "AQA GCSE Chemistry 8462: two 1h45 / 100-mark papers.",
    difficulty: cal(
      "MCQ + structured + open. Apparatus, bonding diagrams, graphs.",
      "At least half the items MUST have an original SVG figure.",
      "Do not copy AQA items.",
    ),
    papers: [
      sitting("gcse-chem-p1", "Paper 1 · topics 1–5", 105, 100, [
        mcq(10, 4, 1, "Closed. Several with figures"),
        short(8, 5, "Structured"),
        written(2, 25, "Open. At least one figure."),
      ]),
      sitting("gcse-chem-p2", "Paper 2 · topics 6–10", 105, 100, [
        mcq(10, 4, 1, "Closed. Several with figures"),
        short(8, 5, "Structured"),
        written(2, 25, "Open. At least one figure."),
      ]),
    ],
  },
  {
    id: "gcse-physics",
    qualification: "gcse",
    source: "https://www.aqa.org.uk/subjects/physics/gcse/physics-8463/specification/specification-at-a-glance",
    year: 2016,
    note: "AQA GCSE Physics 8463: two 1h45 / 100-mark papers.",
    difficulty: cal(
      "MCQ + structured + open. Circuits, waves, force diagrams, graphs.",
      "At least half the items MUST have an original SVG figure.",
      "Do not copy AQA items.",
    ),
    papers: [
      sitting("gcse-phys-p1", "Paper 1 · topics 1–4", 105, 100, [
        mcq(10, 4, 1, "Closed. Several with figures"),
        short(8, 5, "Structured"),
        written(2, 25, "Open. At least one figure."),
      ]),
      sitting("gcse-phys-p2", "Paper 2 · topics 5–8", 105, 100, [
        mcq(10, 4, 1, "Closed. Several with figures"),
        short(8, 5, "Structured"),
        written(2, 25, "Open. At least one figure."),
      ]),
    ],
  },
  {
    id: "gcse-geography",
    qualification: "gcse",
    source: "https://filestore.aqa.org.uk/resources/geography/specifications/AQA-8035-SP-2016.PDF",
    year: 2016,
    note: "AQA GCSE Geography 8035: three 90-min papers (88 / 88 / 76 marks). Maps, photos, graphs on every paper.",
    difficulty: cal(
      "MCQ + short + levels of response. Paper 3 is issue evaluation + fieldwork.",
      "Most items MUST have an original SVG: sketch map, climate graph, photo-like landscape, or field sketch. Never a copyrighted OS map.",
      "Do not copy AQA resources booklets.",
    ),
    papers: [
      sitting("gcse-geo-p1", "Paper 1 · Living with the physical environment", 90, 88, [
        mcq(6, 4, 1, "Closed, often on a figure"),
        short(6, 4, "Short + levels"),
        written(3, 14, "Extended. Each needs a map or photo-like SVG."),
      ]),
      sitting("gcse-geo-p2", "Paper 2 · Challenges in the human environment", 90, 88, [
        mcq(6, 4, 1, "Closed, often on a figure"),
        short(6, 4, "Short + levels"),
        written(3, 14, "Extended. Each needs a map or photo-like SVG."),
      ]),
      sitting("gcse-geo-p3", "Paper 3 · Geographical applications", 90, 76, [
        short(6, 5, "Issue evaluation on an original resource"),
        written(2, 23, "Fieldwork + issue. Both need a figure."),
      ]),
    ],
  },
  {
    id: "gcse-drama",
    qualification: "gcse",
    source: "https://www.aqa.org.uk/subjects/drama/gcse/drama-8261/specification/specification-at-a-glance",
    year: 2016,
    note: "AQA GCSE Drama 8261: Component 1 written 1h45 / 80 / 40% (open book). Comp 2 devising + Comp 3 texts in practice are NEA — not sat. Extract split 4+8+12+20 is the usual published pattern for the 44-mark Section B.",
    difficulty: cal(
      "4 MCQ on drama terms, then four extract questions on a set play, then a 32-mark live-theatre evaluation.",
      "Extract items MUST set figureBrief (original ground plan / costume / lighting — not a copyrighted still). Name a public-domain or clearly labelled original play.",
      "Do not copy AQA extracts. NEA performance is not sat here.",
    ),
    papers: [
      sitting("gcse-drama-c1", "Component 1 · Understanding drama", 105, 80, [
        mcq(4, 4, 1, "Section A multiple choice"),
        written(1, 4, "Section B extract"),
        written(1, 8, "Section B extract"),
        written(1, 12, "Section B extract"),
        written(1, 20, "Section B extract. Figure = the extract / staging plate."),
        written(1, 32, "Section C live theatre. Figure = a staging plate."),
      ]),
    ],
  },
  {
    id: "gcse-rs",
    qualification: "gcse",
    source: "https://www.aqa.org.uk/subjects/religious-studies/gcse/religious-studies-8062/specification/specification-at-a-glance",
    year: 2016,
    note: "AQA GCSE RS A 8062: two 1h45 / 96-mark papers (+ SPaG not sat here). Comp 1: two religions × two five-part (1+1+4+6+12). Comp 2: four themes × the same five-part.",
    difficulty: cal(
      "1-mark, 1-mark, 4 explain, 6 develop, 12 evaluate. Two religions then four themes (relationships, life, God, peace, crime, rights).",
      "12-markers need a reasoned judgement and a contrasting view. Quote scripture or a named teaching — do not invent verses.",
      "Do not copy AQA stems. No 'what is a religion' baby defs.",
    ),
    papers: [
      sitting("gcse-rs-c1", "Component 1 · Study of religions", 105, 96, [
        mcq(8, 4, 1, "1-mark parts of the four five-part questions"),
        written(4, 4, "4-mark explain"),
        written(4, 6, "6-mark explain"),
        written(4, 12, "12-mark evaluate"),
      ]),
      sitting("gcse-rs-c2", "Component 2 · Thematic studies", 105, 96, [
        mcq(8, 4, 1, "1-mark parts of the four theme questions"),
        written(4, 4, "4-mark explain"),
        written(4, 6, "6-mark explain"),
        written(4, 12, "12-mark evaluate"),
      ]),
    ],
  },
  {
    id: "gcse-sociology",
    qualification: "gcse",
    source: "https://www.aqa.org.uk/subjects/sociology/gcse/sociology-8192/specification/specification-at-a-glance",
    year: 2017,
    note: "AQA GCSE Sociology 8192: two 1h45 / 100-mark papers. Each paper two sections, each opening with two MCQ then shorts + two 12-mark 'discuss how far'. Mid-mark split is not fixed — four 12-mark essays per paper are.",
    difficulty: cal(
      "Families + education; crime + stratification. Named perspectives (functionalism, Marxism, feminism, New Right) and UK evidence.",
      "Item / methods shorts MAY set figureBrief (table or short Item). 12-markers: discuss how far sociologists would agree — judgement required.",
      "Do not copy AQA Items. No 'what is society' baby defs.",
    ),
    papers: [
      sitting("gcse-soc-p1", "Paper 1 · Families and education", 105, 100, [
        mcq(4, 4, 1, "Two MCQ per section"),
        short(12, 4, "Short / item / methods"),
        written(4, 12, "Two 12-mark essays per section"),
      ]),
      sitting("gcse-soc-p2", "Paper 2 · Crime and stratification", 105, 100, [
        mcq(4, 4, 1, "Two MCQ per section"),
        short(12, 4, "Short / item / methods"),
        written(4, 12, "Two 12-mark essays per section"),
      ]),
    ],
  },
  gcseModernLanguage({
    id: "gcse-french",
    language: "French",
    code: "8652",
    source: "https://www.aqa.org.uk/subjects/french/gcse/french-8652/specification/specification-at-a-glance",
  }),
  gcseModernLanguage({
    id: "gcse-spanish",
    language: "Spanish",
    code: "8692",
    source: "https://www.aqa.org.uk/subjects/spanish/gcse/spanish-8692/specification/specification-at-a-glance",
  }),
  gcseModernLanguage({
    id: "gcse-german",
    language: "German",
    code: "8662",
    source: "https://www.aqa.org.uk/subjects/german/gcse/german-8662/specification/specification-at-a-glance",
  }),
  {
    id: "gcse-cs",
    qualification: "gcse",
    source: "https://www.aqa.org.uk/subjects/computer-science/gcse/computer-science-8525/specification/specification-at-a-glance",
    year: 2025,
    note: "AQA GCSE Computer Science 8525 (first teach 2025): Paper 1 2h / 90 (programming), Paper 2 1h45 / 90 (concepts + SQL). Item mix is not fixed.",
    difficulty: cal(
      "Paper 1: algorithms, trace, write/refine code. Paper 2: data rep, systems, networks, cyber, SQL, impacts.",
      "Trace tables, flowcharts, logic, packet diagrams as original SVG. Code in the stem.",
      "Do not copy AQA items. No A-level skeleton paper.",
    ),
    papers: [
      sitting("gcse-cs-p1", "Paper 1 · Computational thinking and programming", 120, 90, [
        mcq(10, 4, 1, "MCQ"),
        short(10, 4, "Short / trace. Several MUST set figureBrief."),
        written(4, 10, "Write / refine code. Figure = stub or data."),
      ]),
      sitting("gcse-cs-p2", "Paper 2 · Computing concepts", 105, 90, [
        mcq(10, 4, 1, "MCQ"),
        short(10, 4, "Short / SQL / calculate. Figures on binary and gates."),
        written(4, 10, "Extended. At least one figure."),
      ]),
    ],
  },
  {
    id: "gcse-business",
    qualification: "gcse",
    source: "https://www.aqa.org.uk/subjects/business/gcse/business-8132/specification/specification-at-a-glance",
    year: 2017,
    note: "AQA GCSE Business 8132: two 1h45 / 90-mark papers. Section A 20 (MCQ+short), B ~34 case, C ~36 case.",
    difficulty: cal(
      "Ops/HR then marketing/finance, plus business in the real world. Quant: %, averages, cash-flow, break-even.",
      "Case items MUST set figureBrief (accounts extract, chart). Original firm, original numbers.",
      "Do not copy AQA cases. No A-level 25-mark essays.",
    ),
    papers: [
      sitting("gcse-bus-p1", "Paper 1 · Operations and HRM", 105, 90, [
        mcq(10, 4, 1, "Section A MCQ (part of 20)"),
        short(5, 2, "Section A short (rest of 20)"),
        written(2, 17, "Section B case (~34). Figure = the case."),
        written(2, 18, "Section C case (~36). Figure = the case."),
      ]),
      sitting("gcse-bus-p2", "Paper 2 · Marketing and finance", 105, 90, [
        mcq(10, 4, 1, "Section A MCQ"),
        short(5, 2, "Section A short"),
        written(2, 17, "Section B case. Figure = the case."),
        written(2, 18, "Section C case. Figure = the case."),
      ]),
    ],
  },
  {
    id: "gcse-economics",
    qualification: "gcse",
    source: "https://www.aqa.org.uk/subjects/economics/gcse/economics-8136/specification/specification-at-a-glance",
    year: 2017,
    note: "AQA GCSE Economics 8136: two 1h45 / 80-mark papers. Section A opens with 10 MCQ then shorts/extended. Section B five calculation/short/extended. Item count after the 10 MCQ is not fixed.",
    difficulty: cal(
      "How markets work; how the economy works. Calculations + apply to unseen data.",
      "Data items MUST set figureBrief (table, demand/supply, time series). Original numbers.",
      "Do not copy AQA contexts. No A-level 40-mark essays.",
    ),
    papers: [
      sitting("gcse-econ-p1", "Paper 1 · How markets work", 105, 80, [
        mcq(10, 4, 1, "Section A 10 multiple choice"),
        short(10, 3, "Short / calculate. Several with figures."),
        written(4, 10, "Extended. At least one figure."),
      ]),
      sitting("gcse-econ-p2", "Paper 2 · How the economy works", 105, 80, [
        mcq(10, 4, 1, "Section A 10 multiple choice"),
        short(10, 3, "Short / calculate. Several with figures."),
        written(4, 10, "Extended. At least one figure."),
      ]),
    ],
  },
  {
    id: "gcse-pe",
    qualification: "gcse",
    source: "https://www.aqa.org.uk/subjects/physical-education/gcse/physical-education-8582/specification/specification-at-a-glance",
    year: 2016,
    note: "AQA GCSE PE 8582: two 1h15 / 78-mark papers (30% each) + NEA practical 100 / 40% not sat. Item mix is not fixed.",
    difficulty: cal(
      "Paper 1: anatomy, movement, training, data. Paper 2: psychology, socio-cultural, health, data.",
      "Anatomy / lever / graph items MUST set figureBrief. Original numbers.",
      "Do not copy AQA stems. NEA performance is not sat here. No 'name a sport' baby.",
    ),
    papers: [
      sitting("gcse-pe-p1", "Paper 1 · The human body and movement", 75, 78, [
        mcq(10, 4, 1, "MCQ / objective"),
        short(12, 3, "Short. Several with figures."),
        written(4, 8, "Extended. At least one figure."),
      ]),
      sitting("gcse-pe-p2", "Paper 2 · Socio-cultural and well-being", 75, 78, [
        mcq(10, 4, 1, "MCQ / objective"),
        short(12, 3, "Short. Data items need a figure."),
        written(4, 8, "Extended"),
      ]),
    ],
  },
  {
    id: "gcse-art",
    qualification: "gcse",
    source: "https://www.aqa.org.uk/subjects/art-and-design/gcse/art-and-design-8201/specification/specification-at-a-glance",
    year: 2016,
    note: "AQA GCSE Art and Design 8201–8206 is 100% NEA: Component 1 portfolio (no time limit, 96, 60%) + Component 2 ESA (prep + 10h studio, 96, 40%). There is no written exam. Exam Sim sits the written annotation / starting-point analysis only — not the 10h practical.",
    difficulty: cal(
      "Critical annotation and a response to an ESA starting point. AO1–AO4.",
      "Starting-point items MUST set figureBrief (original still-life / location plate).",
      "Do not copy AQA ESA starting points. Do not pretend this is a 10-hour studio sitting.",
    ),
    papers: [
      sitting("gcse-art-c1", "Component 1 · Portfolio (written)", 90, 96, [
        written(1, 48, "Critical annotation of a sustained project. Figure = a studied work."),
        written(1, 48, "Reflective commentary on development. Figure = a development sheet."),
      ]),
      sitting("gcse-art-c2", "Component 2 · ESA starting point (written mock)", 90, 96, [
        written(1, 32, "Choose one original starting point. Figure = the stimulus."),
        written(1, 32, "Development plan: artist connections, materials."),
        written(1, 32, "Annotation of a finished-outcome intention. Figure = a sketch."),
      ]),
    ],
  },
  {
    id: "gcse-music",
    qualification: "gcse",
    source: "https://www.aqa.org.uk/subjects/music/gcse/music-8271/specification/specification-at-a-glance",
    year: 2016,
    note: "AQA GCSE Music 8271: Component 1 understanding 1h30 / 96 (listen 68 + study pieces 28) = 40%. Performing and composing NEA are not sat. Listening is a printed score / excerpt plate — real AQA is audio.",
    difficulty: cal(
      "Unfamiliar listening across areas of study, then set study pieces. Western classical + popular / traditional / music for ensemble.",
      "Listening items MUST set figureBrief (original short score excerpt or texture diagram). Correct terms. Do not paste a copyrighted score.",
      "Do not copy AQA excerpts. Performance / composition NEA is not sat here.",
    ),
    papers: [
      sitting("gcse-mus-c1", "Component 1 · Understanding music", 90, 96, [
        short(17, 4, "Section A listening (68). Figure = score excerpt / texture plate."),
        written(2, 14, "Section B study pieces (28). Figure on at least one."),
      ]),
    ],
  },
  {
    id: "alevel-math",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/mathematics/a-level/mathematics-7357/specification/specification-at-a-glance",
    year: 2017,
    note: "AQA A-level Maths 7357: three 2h / 100-mark papers (Pure+Pure/Mech+Pure/Stats).",
    difficulty: cal(
      "Short to multi-step. Graphs, mechanics diagrams, stats plots.",
      "At least half the items MUST have an original SVG figure.",
      "No GCSE-easy arithmetic. Do not copy AQA items.",
    ),
    papers: [
      sitting("al-math-p1", "Paper 1 · Pure", 120, 100, [
        short(8, 5, "Short / mid"),
        written(4, 15, "Multi-step. At least two with figures."),
      ]),
      sitting("al-math-p2", "Paper 2 · Pure + Mechanics", 120, 100, [
        short(8, 5, "Short / mid. Mechanics needs force/motion SVG."),
        written(4, 15, "Multi-step. At least two with figures."),
      ]),
      sitting("al-math-p3", "Paper 3 · Pure + Statistics", 120, 100, [
        short(8, 5, "Short / mid. Stats needs a plot SVG."),
        written(4, 15, "Multi-step. At least two with figures."),
      ]),
    ],
  },
  {
    id: "alevel-further-math",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/mathematics/as-and-a-level/further-mathematics-7367/specification/specification-at-a-glance",
    year: 2017,
    note: "AQA A-level Further Maths 7367: three 2h / 100-mark papers.",
    difficulty: cal(
      "Harder than 7357. Complex, matrices, further calculus, optional applied.",
      "Figures on geometry / mechanics / discrete graphs.",
      "Do not copy AQA items.",
    ),
    papers: [
      sitting("al-fm-p1", "Paper 1 · Core", 120, 100, [
        short(8, 5, "Short / mid"),
        written(4, 15, "Multi-step"),
      ]),
      sitting("al-fm-p2", "Paper 2 · Core", 120, 100, [
        short(8, 5, "Short / mid"),
        written(4, 15, "Multi-step"),
      ]),
      sitting("al-fm-p3", "Paper 3 · Applied options", 120, 100, [
        short(8, 5, "Short / mid"),
        written(4, 15, "Multi-step"),
      ]),
    ],
  },
  {
    id: "alevel-biology",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/biology/a-level/biology-7402/specification/specification-at-a-glance",
    year: 2015,
    note: "AQA A-level Biology 7402: three 2h papers (91 / 91 / 78).",
    difficulty: cal(
      "Short + long + essay on Paper 3. Graphs, micrographs, practical diagrams.",
      "At least half the items MUST have an original SVG figure (graph, cell, apparatus).",
      "Do not copy AQA items.",
    ),
    papers: [
      sitting("al-bio-p1", "Paper 1 · topics 1–4", 120, 91, [
        short(8, 6, "Short / long"),
        written(2, 21, "Extended. At least one figure."),
      ]),
      sitting("al-bio-p2", "Paper 2 · topics 5–8", 120, 91, [
        short(8, 6, "Short / long"),
        written(2, 21, "Comprehension + extended. At least one figure."),
      ]),
      sitting("al-bio-p3", "Paper 3 · synoptic", 120, 78, [
        short(6, 6, "Practical / data"),
        written(2, 21, "Essay + data. Figure required on the data item."),
      ]),
    ],
  },
  {
    id: "alevel-chemistry",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/chemistry/a-level/chemistry-7405/specification/specification-at-a-glance",
    year: 2015,
    note: "AQA A-level Chemistry 7405: three 2h papers (105 / 105 / 90).",
    difficulty: cal(
      "Physical / inorganic / organic + synoptic Paper 3 with MCQ.",
      "Apparatus, mechanisms, spectra as original SVG on several items.",
      "Do not copy AQA items.",
    ),
    papers: [
      sitting("al-chem-p1", "Paper 1 · Physical + Inorganic", 120, 105, [
        short(10, 6, "Short / long"),
        written(3, 15, "Extended. At least one figure."),
      ]),
      sitting("al-chem-p2", "Paper 2 · Physical + Organic", 120, 105, [
        short(10, 6, "Short / long"),
        written(3, 15, "Extended. At least one figure."),
      ]),
      sitting("al-chem-p3", "Paper 3 · synoptic", 120, 90, [
        mcq(20, 4, 1, "Multiple choice across the spec"),
        short(6, 5, "Practical / data. Several with figures."),
        written(2, 20, "Extended. At least one figure."),
      ]),
    ],
  },
  {
    id: "alevel-physics",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/physics/a-level/physics-7408/specification/specification-at-a-glance",
    year: 2015,
    note: "AQA A-level Physics 7408: three 2h papers (85 / 85 / 80). Papers 1–2 include 25 MCQ.",
    difficulty: cal(
      "60 marks short/long + 25 MCQ on Papers 1–2. Paper 3 practical + option.",
      "Force, circuit, wave, and graph SVG on at least half the items.",
      "Do not copy AQA items.",
    ),
    papers: [
      sitting("al-phys-p1", "Paper 1 · sections 1–6.1", 120, 85, [
        mcq(25, 4, 1, "25 multiple choice"),
        short(8, 5, "Short / long. Several with figures."),
        written(2, 10, "Longer. At least one figure."),
      ]),
      sitting("al-phys-p2", "Paper 2 · 6.2, 7, 8", 120, 85, [
        mcq(25, 4, 1, "25 multiple choice"),
        short(8, 5, "Short / long. Several with figures."),
        written(2, 10, "Longer. At least one figure."),
      ]),
      sitting("al-phys-p3", "Paper 3 · practical + option", 120, 80, [
        short(8, 6, "Practical / data. Figures required."),
        written(2, 16, "Option. At least one figure."),
      ]),
    ],
  },
  {
    id: "alevel-history",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/history/a-level/history-7042/specification/specification-at-a-glance",
    year: 2015,
    note: "AQA A-level History 7042: two 2h30 / 80-mark papers + NEA. Interpretations and sources.",
    difficulty: cal(
      "Comp 1 interpretations + two essays. Comp 2 sources + two essays.",
      "Source items need an original stimulus and often an SVG (cartoon, map, photo-like scene).",
      "Do not copy AQA sources. NEA is not sat here.",
    ),
    papers: [
      sitting("al-hist-c1", "Component 1 · Breadth study", 150, 80, [
        written(1, 30, "Compulsory interpretations question"),
        written(2, 25, "Two essays from three"),
      ]),
      sitting("al-hist-c2", "Component 2 · Depth study", 150, 80, [
        written(1, 30, "Compulsory sources. Figure or facsimile-like SVG required."),
        written(2, 25, "Two essays from three"),
      ]),
    ],
  },
  {
    id: "alevel-geography",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/geography/as-and-a-level/geography-7037/specification/specification-at-a-glance",
    year: 2016,
    note: "AQA A-level Geography 7037: two 2h30 / 120-mark papers + NEA.",
    difficulty: cal(
      "Short + levels + extended. Maps, photos, graphs on every section.",
      "Most items MUST have an original SVG (sketch map, photo-like landscape, graph).",
      "Do not copy AQA resources. NEA is not sat here.",
    ),
    papers: [
      sitting("al-geo-c1", "Component 1 · Physical geography", 150, 120, [
        short(6, 6, "Section A water/carbon"),
        written(4, 21, "Sections B+C. Each extended item needs a figure."),
      ]),
      sitting("al-geo-c2", "Component 2 · Human geography", 150, 120, [
        short(6, 6, "Section A systems/governance"),
        written(4, 21, "Sections B+C. Each extended item needs a figure."),
      ]),
    ],
  },
  {
    id: "alevel-eng-lit",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/english/a-level/english-7712/specification/specification-at-a-glance",
    year: 2015,
    note: "AQA A-level English Literature A 7712: Paper 1 3h / 75, Paper 2 2h30 / 75. NEA (texts across time) is not sat here. Item count is fixed: three 25-mark questions per paper.",
    difficulty: cal(
      "Closed-book except Paper 1 Section C. Shakespeare passage+essay, unseen poetry pair, comparison; then set text, unseen prose, linking essay.",
      "Extract items MUST set figureBrief (passage / poem pair / prose extract as a print plate). Original unseen texts only.",
      "Do not copy AQA unseen poems, extracts, or set-text wording. NEA is not sat here.",
    ),
    papers: [
      sitting("al-elit-p1", "Paper 1 · Love through the ages", 180, 75, [
        written(1, 25, "Section A Shakespeare: passage-based + linked essay. Figure = the passage."),
        written(1, 25, "Section B unseen poetry: two original poems. Figure = the pair."),
        written(1, 25, "Section C comparing texts (open book in the real sitting)."),
      ]),
      sitting("al-elit-p2", "Paper 2 · Texts in shared contexts", 150, 75, [
        written(1, 25, "Section A set-text essay"),
        written(1, 25, "Section B unseen prose extract. Figure required."),
        written(1, 25, "Section B linking two texts"),
      ]),
    ],
  },
  {
    id: "alevel-eng-lang",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/english/a-level/english-7702/specification/specification-at-a-glance",
    year: 2015,
    note: "AQA A-level English Language 7702: two 2h30 / 100-mark papers. NEA (Language in Action) is not sat here. Paper 1 is four questions; Paper 2 is three.",
    difficulty: cal(
      "Close language analysis with frameworks, then children's language / diversity / discourses / directed writing.",
      "Text items MUST set figureBrief (two linked texts, child-language data, discourse pair). Original texts only.",
      "Do not copy AQA inserts. NEA investigation / original writing is not sat here.",
    ),
    papers: [
      sitting("al-elang-p1", "Paper 1 · Language, the Individual and Society", 150, 100, [
        written(1, 25, "Analyse text 1. Figure = the contemporary text."),
        written(1, 25, "Analyse text 2. Figure = the older text."),
        written(1, 20, "Compare the two texts"),
        written(1, 30, "Children's language development essay. Figure = spoken/written/multimodal data."),
      ]),
      sitting("al-elang-p2", "Paper 2 · Language Diversity and Change", 150, 100, [
        written(1, 30, "Evaluative essay: diversity or change"),
        written(1, 40, "Analyse how two texts present ideas/attitudes. Figure = the pair."),
        written(1, 30, "Directed writing on the same topic"),
      ]),
    ],
  },
  {
    id: "alevel-economics",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/economics/a-level/economics-7136/specification/specification-at-a-glance",
    year: 2015,
    note: "AQA A-level Economics 7136: three 2h / 80-mark papers. Papers 1–2 are data response (40) + essay (40). Paper 3 is 30 MCQ + 50-mark case. Data-response part count is not fixed by the spec — mock parts are representative.",
    difficulty: cal(
      "Apply AD/AS, elasticity, market structures, labour, macro policy to unseen data. Paper 3 MCQ is the synoptic grind.",
      "Data / case items MUST set figureBrief (table, AD/AS, Lorenz, time series). Original numbers only.",
      "Do not copy AQA contexts or MCQ stems.",
    ),
    papers: [
      sitting("al-econ-p1", "Paper 1 · Markets and market failure", 120, 80, [
        written(4, 10, "Section A data response (one of two contexts). Figure on the data item."),
        written(1, 40, "Section B essay (one from three)"),
      ]),
      sitting("al-econ-p2", "Paper 2 · National and international economy", 120, 80, [
        written(4, 10, "Section A data response. Figure on the data item."),
        written(1, 40, "Section B essay (one from three)"),
      ]),
      sitting("al-econ-p3", "Paper 3 · Economic principles and issues", 120, 80, [
        mcq(30, 4, 1, "Section A 30 multiple choice across the spec"),
        written(5, 10, "Section B case study. Figure required on the case."),
      ]),
    ],
  },
  {
    id: "alevel-psychology",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/psychology/as-and-a-level/psychology-7181-7182/specification/specification-at-a-glance",
    year: 2015,
    note: "AQA A-level Psychology 7182: three 2h / 96-mark papers. Each paper mixes MCQ, short, and extended. Exact item count is not fixed — mock mix is representative of a 96-mark sitting.",
    difficulty: cal(
      "AO1/AO2/AO3. Paper 1 four 24s (social, memory, attachment, psychopathology). Paper 2 approaches + biopsych + 48-mark research methods. Paper 3 issues + three options.",
      "Research-methods and scenario items MUST set figureBrief (table, graph, design sketch). Name studies, do not paste them.",
      "Do not copy AQA stems or data. No invented 'famous' studies.",
    ),
    papers: [
      sitting("al-psych-p1", "Paper 1 · Introductory Topics", 120, 96, [
        mcq(8, 4, 1, "MCQ across the four topics"),
        short(8, 3, "Short / application"),
        written(4, 16, "One extended per topic (8 or 16). Figure on at least one scenario."),
      ]),
      sitting("al-psych-p2", "Paper 2 · Psychology in Context", 120, 96, [
        mcq(8, 4, 1, "MCQ"),
        short(8, 5, "Short / research methods. Several with data figures."),
        written(3, 16, "Approaches, biopsychology, methods extended"),
      ]),
      sitting("al-psych-p3", "Paper 3 · Issues and Options", 120, 96, [
        mcq(8, 4, 1, "Issues and debates + options"),
        short(8, 3, "Short / application"),
        written(4, 16, "Issues essay + one from each option block"),
      ]),
    ],
  },
  {
    id: "alevel-cs",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/computer-science/a-level/computer-science-7517/specification/specification-at-a-glance",
    year: 2015,
    note: "AQA A-level Computer Science 7517: Paper 1 on-screen 2h30 / 100 raw (scaled ×1.5), Paper 2 written 2h30 / 100 raw. NEA (75) is not sat here. Paper 1 is mocked as written short + code-write/adapt — no IDE.",
    difficulty: cal(
      "Paper 1: programming, OOP, data structures, skeleton-style adapt. Paper 2: data rep, computer systems, networks, databases, functional, consequences.",
      "Trace tables, flowcharts, logic circuits, packet diagrams as original SVG. Code in the stem, not as a photo of an AQA skeleton.",
      "Do not copy AQA skeleton programs or paper items. NEA is not sat here.",
    ),
    papers: [
      sitting("al-cs-p1", "Paper 1 · Programming (on-screen mock)", 150, 100, [
        short(8, 5, "Short theory / trace. Several MUST set figureBrief (trace table, flowchart)."),
        written(4, 15, "Write / adapt / extend programs. Figure = stub or data."),
      ]),
      sitting("al-cs-p2", "Paper 2 · Written theory", 150, 100, [
        short(8, 5, "Short / calculation. Figures on binary, gates, networks."),
        written(4, 15, "Extended. At least one figure."),
      ]),
    ],
  },
  {
    id: "alevel-business",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/business/a-level/business-7132/specification/specification-at-a-glance",
    year: 2023,
    note: "AQA A-level Business 7132 (first teach 2023): three 2h / 100-mark papers. Paper 1 item split is fixed (15 MCQ + 35 short + 2×25 essays). Papers 2–3 part counts are approximate.",
    difficulty: cal(
      "MCQ + shorts + essays; three data-response clusters; one long case. Quant skills (break-even, ARR, ratios, index) on every paper.",
      "Case / data items MUST set figureBrief (accounts extract, market chart, ops diagram). Original firm, original numbers.",
      "Do not copy AQA cases or MCQ stems.",
    ),
    papers: [
      sitting("al-bus-p1", "Paper 1 · Business 1", 120, 100, [
        mcq(15, 4, 1, "Section A 15 multiple choice"),
        short(7, 5, "Section B short answer (35)"),
        written(2, 25, "Sections C+D essays (one from two, twice)"),
      ]),
      sitting("al-bus-p2", "Paper 2 · Business 2", 120, 100, [
        short(5, 5, "Data-response parts. Figures on the data."),
        written(3, 25, "Three compulsory data-response clusters (~33 each including shorts)."),
      ]),
      sitting("al-bus-p3", "Paper 3 · Business 3", 120, 100, [
        short(4, 7, "Case-study shorts. Figure = the case pack."),
        written(3, 24, "Longer case questions (~six parts in the real paper)."),
      ]),
    ],
  },
  {
    id: "alevel-politics",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/government-and-politics/a-level/politics-7152/specification/specification-at-a-glance",
    year: 2017,
    note: "AQA A-level Politics 7152: three 2h / 77-mark papers. Spec says 'medium explain + essay'; the 3×9 + 25 extract + 25 essay split is the published paper pattern, not a free invention.",
    difficulty: cal(
      "UK government/politics; USA + comparative; political ideas. Explain-and-analyse then extract then judgement essay.",
      "Extract items MUST set figureBrief (original political extract / cartoon / table). Use real institutions, not invented parties.",
      "Do not copy AQA extracts. No UK-only answers on the USA paper.",
    ),
    papers: [
      sitting("al-pol-p1", "Paper 1 · Government and politics of the UK", 120, 77, [
        written(3, 9, "Medium 'explain and analyse'"),
        written(1, 25, "Extract question. Figure = the extract."),
        written(1, 25, "Essay"),
      ]),
      sitting("al-pol-p2", "Paper 2 · USA and comparative politics", 120, 77, [
        written(3, 9, "Medium 'explain and analyse'"),
        written(1, 25, "Extract question. Figure = the extract."),
        written(1, 25, "Essay"),
      ]),
      sitting("al-pol-p3", "Paper 3 · Political ideas", 120, 77, [
        written(3, 9, "Medium 'explain and analyse'"),
        written(1, 25, "Extract question. Figure = the extract."),
        written(1, 25, "Essay"),
      ]),
    ],
  },
  alevelModernLanguage({
    id: "alevel-french",
    language: "French",
    code: "7652",
    source: "https://www.aqa.org.uk/subjects/french/a-level/french-7652/specification/specification-at-a-glance",
  }),
  alevelModernLanguage({
    id: "alevel-spanish",
    language: "Spanish",
    code: "7692",
    source: "https://www.aqa.org.uk/subjects/spanish/a-level/spanish-7692/specification/specification-at-a-glance",
  }),
  alevelModernLanguage({
    id: "alevel-german",
    language: "German",
    code: "7662",
    source: "https://www.aqa.org.uk/subjects/german/a-level/german-7662/specification/specification-at-a-glance",
  }),
  {
    id: "alevel-sociology",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/sociology/a-level/sociology-7192/specification/specification-at-a-glance",
    year: 2015,
    note: "AQA A-level Sociology 7192: three 2h / 80-mark papers. Item split is the published paper pattern (4/6/10/20/30), not a free invention.",
    difficulty: cal(
      "Outline 2 / outline 3 / apply Item / 20–30 evaluate. Named studies and perspectives. Methods in Context applies a method to a school setting.",
      "Item questions MUST set figureBrief (short original Item A/B as a print plate). Name real theorists; do not invent studies.",
      "Do not copy AQA Items. No 'what is sociology' baby defs.",
    ),
    papers: [
      sitting("al-soc-p1", "Paper 1 · Education with Theory and Methods", 120, 80, [
        written(1, 4, "Outline two"),
        written(1, 6, "Outline three"),
        written(1, 10, "Applying material from Item A. Figure = the Item."),
        written(1, 30, "Evaluate essay. Figure = the Item."),
        written(1, 20, "Methods in Context. Figure = the Item."),
        written(1, 10, "Theory and Methods: outline and explain two"),
      ]),
      sitting("al-soc-p2", "Paper 2 · Topics in Sociology", 120, 80, [
        written(2, 10, "Outline and explain two — one per optional topic"),
        written(2, 10, "Item analyse two. Figure = the Item."),
        written(2, 20, "Evaluate essay. Figure = the Item."),
      ]),
      sitting("al-soc-p3", "Paper 3 · Crime and Deviance with Theory and Methods", 120, 80, [
        written(1, 4, "Outline two"),
        written(1, 6, "Outline three"),
        written(1, 10, "Applying material from Item A. Figure = the Item."),
        written(1, 30, "Evaluate essay. Figure = the Item."),
        written(1, 10, "Theory and Methods: outline and explain two"),
        written(1, 20, "Theory and Methods evaluate. Figure = the Item."),
      ]),
    ],
  },
  {
    id: "alevel-law",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/law/a-level/law-7162/specification/specification-at-a-glance",
    year: 2017,
    note: "AQA A-level Law 7162: three 2h / 100-mark papers. Spec says MCQ + short + extended; the 5×1 + 5 + 5 + 10 + 15 + 30 + 30 split is the published paper pattern (e.g. 7162/1 June 2023).",
    difficulty: cal(
      "ELS/nature-of-law MCQ, then explain, then advise-on-scenario, then 15 and two 30s. Paper 1 crime, Paper 2 tort, Paper 3 contract or human rights.",
      "Scenario items MUST set figureBrief (fact-pattern plate). Cite real authorities — do not invent case names.",
      "Do not copy AQA scenarios. No 'what is a court' baby defs.",
    ),
    papers: [
      sitting("al-law-p1", "Paper 1 · Criminal law + English legal system", 120, 100, [
        mcq(5, 4, 1, "Nature of law / ELS / crime MCQ"),
        short(2, 5, "Explain two / apply a short fact"),
        written(1, 10, "Advise on a scenario"),
        written(1, 15, "Longer scenario / explain"),
        written(2, 30, "Problem question + essay. Figure on the problem."),
      ]),
      sitting("al-law-p2", "Paper 2 · Tort + English legal system", 120, 100, [
        mcq(5, 4, 1, "Nature of law / ELS / tort MCQ"),
        short(2, 5, "Explain two / apply a short fact"),
        written(1, 10, "Advise on a scenario"),
        written(1, 15, "Longer scenario / explain"),
        written(2, 30, "Problem question + essay. Figure on the problem."),
      ]),
      sitting("al-law-p3", "Paper 3 · Contract or Human rights + ELS", 120, 100, [
        mcq(5, 4, 1, "Nature of law / ELS / option MCQ"),
        short(2, 5, "Explain two / apply a short fact"),
        written(1, 10, "Advise on a scenario"),
        written(1, 15, "Longer scenario / explain"),
        written(2, 30, "Problem question + essay. Figure on the problem."),
      ]),
    ],
  },
  {
    id: "alevel-film",
    qualification: "alevel",
    source: "https://www.eduqas.co.uk/qualifications/film-studies-as-a-level/",
    year: 2017,
    note: "AQA does not offer Film. Eduqas A-level Film Studies A670QS: Component 1 2h30 / 120 (3×40), Component 2 2h30 / 100, Component 3 production NEA not sat. Board is Eduqas, not AQA — say so in the paper picker.",
    difficulty: cal(
      "Comparative Hollywood; US since 2005; British since 1995; then global / documentary / silent / experimental. Sequence analysis + context + ideology.",
      "Each essay MUST set figureBrief (original still / shot diagram, not a copyrighted frame). Discuss form: cinematography, mise-en-scène, editing, sound.",
      "Do not copy Eduqas set-film wording or stills. NEA production is not sat here. Do not invent a film and call it a set text — use a well-known public title or a clearly labelled original example.",
    ),
    papers: [
      sitting("al-film-c1", "Component 1 · Varieties of film and filmmaking", 150, 120, [
        written(3, 40, "Sections A–C. Figure = a still / sequence plate."),
      ]),
      sitting("al-film-c2", "Component 2 · Global filmmaking perspectives", 150, 100, [
        written(1, 40, "Section A global two-film. Figure = a still."),
        written(3, 20, "Documentary / silent / experimental. Figure on at least two."),
      ]),
    ],
  },
  {
    id: "alevel-pe",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/physical-education/a-level/physical-education-7582/specification/specification-at-a-glance",
    year: 2016,
    note: "AQA A-level PE 7582: two 2h / 105-mark papers (3×35) + NEA practical 90 / 30%. NEA is not sat here. Item mix inside each 35 is not fixed — mock mix is representative.",
    difficulty: cal(
      "Anatomy/physiology, skill acquisition, sport and society; then exercise phys/biomechanics, psychology, technology. MCQ + short + extended per section.",
      "Anatomy, force, and data items MUST set figureBrief (joint, lever, graph, training session). Original numbers.",
      "Do not copy AQA stems. NEA performance is not sat here. No 'name a sport' baby trivia.",
    ),
    papers: [
      sitting("al-pe-p1", "Paper 1 · Factors affecting participation", 120, 105, [
        mcq(9, 4, 1, "Three sections × a few MCQ"),
        short(12, 3, "Short / apply. Several with figures."),
        written(6, 10, "Extended. At least two figures (anatomy / society data)."),
      ]),
      sitting("al-pe-p2", "Paper 2 · Factors affecting optimal performance", 120, 105, [
        mcq(9, 4, 1, "Three sections × a few MCQ"),
        short(12, 3, "Short / calculate. Biomechanics needs a figure."),
        written(6, 10, "Extended. At least two figures."),
      ]),
    ],
  },
  {
    id: "alevel-art",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/art-and-design/a-level/art-and-design-7201-7206/specification/specification-at-a-glance",
    year: 2015,
    note: "AQA A-level Art and Design 7201–7206 is 100% NEA: Component 1 personal investigation (no time limit, 96, 60%) + Component 2 ESA (prep + 15h studio, 96, 40%). There is no written exam. Exam Sim sits the written material / starting-point analysis only — not the 15h practical.",
    difficulty: cal(
      "Critical/contextual prose (1000–3000 words in the real Comp 1) and a response to an ESA starting point. AO1–AO4: develop, refine, record, present.",
      "Starting-point items MUST set figureBrief (original still-life / location / artefact plate). Specialist vocabulary. Bibliography-style references, not copied artist statements.",
      "Do not copy AQA ESA starting points. Do not pretend this is a 15-hour studio sitting. No 'draw a house' baby tasks.",
    ),
    papers: [
      sitting("al-art-c1", "Component 1 · Personal investigation (written)", 90, 96, [
        written(1, 48, "Critical/contextual essay (a 1000-word slice of the 1000–3000 prose). Figure = a studied work, original plate."),
        written(1, 48, "Reflective commentary linking practical decisions to sources. Figure = a development sheet."),
      ]),
      sitting("al-art-c2", "Component 2 · ESA starting point (written mock)", 90, 96, [
        written(1, 32, "Choose one original starting point and justify. Figure = the stimulus."),
        written(1, 32, "Development plan: artist connections, materials, refinements."),
        written(1, 32, "Annotation of a finished-outcome intention. Figure = a composition sketch."),
      ]),
    ],
  },
  {
    id: "alevel-music",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/music/a-level/music-7272/specification/specification-at-a-glance",
    year: 2016,
    note: "AQA A-level Music 7272: Component 1 appraising 2h30 / 120 (listen 56 + analysis 34 + essay 30) = 40%. Performance and composition NEA are not sat. Listening is a printed score / excerpt plate here — real AQA is audio excerpts.",
    difficulty: cal(
      "Listening on unfamiliar excerpts (area of study), then set-work analysis, then a contextual essay. Western classical + chosen areas (pop, jazz, music for media, etc.).",
      "Listening/analysis items MUST set figureBrief (original short score excerpt or texture diagram). Use correct terms (cadence, ostinato, tonality). Do not paste a copyrighted score.",
      "Do not copy AQA excerpts or set-work wording. Performance / composition NEA is not sat here. No 'name the instrument' A2-only.",
    ),
    papers: [
      sitting("al-mus-c1", "Component 1 · Appraising music", 150, 120, [
        short(8, 4, "Section A listening (56 with the MCQ). Figure = score excerpt / texture plate."),
        mcq(6, 4, 4, "Section A listening MCQ on the same excerpts. stimulus = the excerpt description."),
        written(2, 17, "Section B analysis of a set-work-style extract. Figure required."),
        written(1, 30, "Section C contextual essay"),
      ]),
    ],
  },
  {
    id: "alevel-rs",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/religious-studies/a-level/religious-studies-7062/specification/specification-at-a-glance",
    year: 2016,
    note: "AQA A-level Religious Studies 7062: two 3h / 100-mark papers. Comp 1 is four compulsory two-part (10+15). Comp 2 is two two-part (10+15) plus two 25-mark dialogues.",
    difficulty: cal(
      "AO1 explain then AO2 evaluate. Philosophy of religion, ethics, one religion, then synoptic dialogues. Named scholars (Hume, Kant, Barth), not slogans.",
      "Dialogue / extract items MAY set figureBrief (short stimulus). Argue; do not preach.",
      "Do not copy AQA stems. No 'what is a religion' baby defs. Not the Philosophy 7172 paper.",
    ),
    papers: [
      sitting("al-rs-c1", "Component 1 · Philosophy of religion and ethics", 180, 100, [
        written(4, 10, "AO1 first part of each two-part (two philosophy, two ethics)"),
        written(4, 15, "AO2 second part of each two-part"),
      ]),
      sitting("al-rs-c2", "Component 2 · Study of religion and dialogues", 180, 100, [
        written(2, 10, "Study of religion AO1"),
        written(2, 15, "Study of religion AO2"),
        written(1, 25, "Dialogue: philosophy of religion and religion"),
        written(1, 25, "Dialogue: ethics and religion"),
      ]),
    ],
  },
  {
    id: "alevel-philosophy",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/philosophy/a-level/philosophy-7172/specification/specification-at-a-glance",
    year: 2017,
    note: "AQA A-level Philosophy 7172: two 3h / 100-mark papers. Each section is five questions: 3 + 5 + 5 + 12 + 25. That split is the published paper pattern.",
    difficulty: cal(
      "Define, explain, explain, illustrate, then a 25-mark argument. Epistemology + moral; God + mind. Set texts (Descartes, Hume, Mill, Plato) used as arguments, not biographies.",
      "3-markers are precise definitions. 25-markers need thesis, objection, reply, judgement — not a list of views.",
      "Do not copy AQA stems. No 'what is philosophy' baby defs. Not the RS 7062 paper.",
    ),
    papers: [
      sitting("al-phil-p1", "Paper 1 · Epistemology and moral philosophy", 180, 100, [
        written(2, 3, "Define — one per section"),
        written(4, 5, "Explain — two per section"),
        written(2, 12, "Explain and illustrate — one per section"),
        written(2, 25, "Evaluate essay — one per section"),
      ]),
      sitting("al-phil-p2", "Paper 2 · Metaphysics of God and of mind", 180, 100, [
        written(2, 3, "Define — one per section"),
        written(4, 5, "Explain — two per section"),
        written(2, 12, "Explain and illustrate — one per section"),
        written(2, 25, "Evaluate essay — one per section"),
      ]),
    ],
  },
  {
    id: "alevel-drama",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/drama/a-level/drama-7262/specification/specification-at-a-glance",
    year: 2016,
    note: "AQA A-level Drama and Theatre 7262: Component 1 written 3h / 80 / 40% (open book). Comp 2 devised + Comp 3 making theatre are NEA — not sat.",
    difficulty: cal(
      "Set-play essay (List A), three-part extract (List B), live-theatre evaluation. Directing / acting / design choices with precise stage vocabulary.",
      "Extract items MUST set figureBrief (original ground plan / costume / lighting state — not a copyrighted still). Name a public-domain or clearly labelled original play, not an AQA extract.",
      "Do not copy AQA extracts or live-theatre wording. NEA performance is not sat here.",
    ),
    papers: [
      sitting("al-drama-c1", "Component 1 · Drama and theatre", 180, 80, [
        written(1, 25, "Section A set play (List A)"),
        written(3, 10, "Section B three-part extract (List B). Figure = the extract / staging plate."),
        written(1, 25, "Section C live theatre. Figure = a staging plate."),
      ]),
    ],
  },
  {
    id: "alevel-dt",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/design-and-technology/a-level/design-and-technology-7552/specification/specification-at-a-glance",
    year: 2017,
    note: "AQA A-level D&T Product Design 7552: Paper 1 2h30 / 120 (technical), Paper 2 1h30 / 80 (designing and making: 30 product analysis + 50 manufacture). NEA 100 / 50% is not sat. Paper 1 item count is not fixed.",
    difficulty: cal(
      "Materials, processes, mechanisms, maths in D&T, then product analysis from a visual stimulus and commercial manufacture.",
      "Most items MUST set figureBrief (exploded view, section, mechanism, material micrograph, product photo-plate). Original product, original numbers.",
      "Do not copy AQA product photos. NEA prototype is not sat here. No 'what is a pencil' baby.",
    ),
    papers: [
      sitting("al-dt-p1", "Paper 1 · Technical principles", 150, 120, [
        short(12, 5, "Short / calculate. Several with figures."),
        written(4, 15, "Extended. At least two figures."),
      ]),
      sitting("al-dt-p2", "Paper 2 · Designing and making principles", 90, 80, [
        short(6, 5, "Section A product analysis (30). Figure = the product plate."),
        written(2, 25, "Section B commercial manufacture (50)"),
      ]),
    ],
  },
  {
    id: "alevel-media",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/media-studies/a-level/media-studies-7572/specification/specification-at-a-glance",
    year: 2017,
    note: "AQA A-level Media Studies 7572: Media One 2h / 84, Media Two 2h / 84, NEA cross-media 60 / 30% not sat. Unseen + Close Study Products. Exact mid-mark split varies by series — mock mix is representative of 84.",
    difficulty: cal(
      "Media One: language/representation on advert + music video, then industries/audiences. Media Two: TV, magazines, online/games — unseen analysis plus three 25-mark essays, one synoptic. Named theorists (Hall, Gilroy, Gauntlett) applied, not listed.",
      "Unseen items MUST set figureBrief (original advert / poster / page / still). Do not paste a copyrighted CSP frame — invent an original product in the same form.",
      "Do not copy AQA unseen figures or CSP wording. NEA production is not sat here.",
    ),
    papers: [
      sitting("al-media-p1", "Media One", 120, 84, [
        written(1, 8, "Unseen analysis. Figure = original advert/poster."),
        written(1, 12, "Representation: unseen + a CSP-style product"),
        written(1, 9, "Theory apply"),
        written(2, 20, "Two essays, one extended"),
        written(1, 15, "Industries / audiences"),
      ]),
      sitting("al-media-p2", "Media Two", 120, 84, [
        written(1, 9, "Unseen analysis. Figure = still / page / UI plate."),
        written(3, 25, "Three essays — one extended, one synoptic"),
      ]),
    ],
  },
  {
    id: "alevel-geology",
    qualification: "alevel",
    source: "https://www.ocr.org.uk/qualifications/as-and-a-level/geology-h014-h414-from-2017/specification-at-a-glance/",
    year: 2017,
    note: "AQA does not offer Geology. OCR A-level Geology H414: 01 Fundamentals 2h15 / 110, 02 Scientific literacy 2h15 / 100, 03 Practical skills 1h30 / 60. Practical endorsement (04) is not sat. Board is OCR — say so in the picker.",
    difficulty: cal(
      "Minerals, tectonics, logs, fossils, petrology, geohazards, basin analysis. Paper 02 is a scientific-literacy passage. Paper 03 is fieldwork / practical written.",
      "Most items MUST set figureBrief (geological map, graphic log, fossil, thin-section, outcrop). Original numbers, original locality.",
      "Do not copy OCR figures or passages. Endorsement is not sat here. No 'what is a rock' baby.",
    ),
    papers: [
      sitting("al-geo-l-p1", "Paper 01 · Fundamentals of geology", 135, 110, [
        short(10, 5, "Short / calculate. Several with map or log figures."),
        written(4, 15, "Extended. At least two figures."),
      ]),
      sitting("al-geo-l-p2", "Paper 02 · Scientific literacy in geology", 135, 100, [
        short(8, 5, "Extract from an original passage. Figure on the data."),
        written(4, 15, "Apply the passage. Figure required on at least one."),
      ]),
      sitting("al-geo-l-p3", "Paper 03 · Practical skills in geology", 90, 60, [
        short(8, 4, "Field / lab. Figures on apparatus or outcrop."),
        written(2, 14, "Extended practical / fieldwork"),
      ]),
    ],
  },
  {
    id: "alevel-envsci",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/environmental-science/a-level/environmental-science-7447/specification/specification-at-a-glance",
    year: 2017,
    note: "AQA A-level Environmental Science 7447: two 3h / 120-mark papers. Mix of MCQ, short, extended. Item count is not fixed — mock mix is representative. Research methods on both papers.",
    difficulty: cal(
      "Paper 1: physical environment, energy, pollution, methods. Paper 2: living environment, biological resources, sustainability, methods. Synoptic links required.",
      "Data / sampling items MUST set figureBrief (graph, transect, map, apparatus). Original numbers.",
      "Do not copy AQA stems. No 'recycle more' slogan answers.",
    ),
    papers: [
      sitting("al-env-p1", "Paper 1 · Physical environment", 180, 120, [
        mcq(15, 4, 1, "MCQ across the paper"),
        short(15, 3, "Short / calculate. Several with figures."),
        written(4, 15, "Extended. At least two figures."),
      ]),
      sitting("al-env-p2", "Paper 2 · Living environment", 180, 120, [
        mcq(15, 4, 1, "MCQ across the paper"),
        short(15, 3, "Short / calculate. Several with figures."),
        written(4, 15, "Extended. At least two figures."),
      ]),
    ],
  },
  {
    id: "alevel-dance",
    qualification: "alevel",
    source: "https://www.aqa.org.uk/subjects/dance/a-level/dance-7237/specification/specification-at-a-glance",
    year: 2016,
    note: "AQA A-level Dance 7237: Component 1 practical NEA 80 / 50% not sat. Component 2 critical engagement 2h30 / 100 / 50% — short 25 + essay 25 on the compulsory set work, then two 25-mark essays on the optional set work.",
    difficulty: cal(
      "Compulsory set work + area of study, then optional set work. Short answers on movement / context, then critical essays.",
      "Short items MAY set figureBrief (floor plan / motif diagram). Use accurate dance vocabulary. Do not paste a copyrighted still.",
      "Do not copy AQA set-work wording. Performance / choreography NEA is not sat here.",
    ),
    papers: [
      sitting("al-dance-c2", "Component 2 · Critical engagement", 150, 100, [
        short(5, 5, "Section A shorts on the compulsory set work / area of study"),
        written(1, 25, "Section A essay on the compulsory set work"),
        written(2, 25, "Section B two essays on the second set work / area of study"),
      ]),
    ],
  },
  {
    id: "alevel-classics",
    qualification: "alevel",
    source: "https://www.ocr.org.uk/qualifications/as-and-a-level/classical-civilisation-h408-from-2017/",
    year: 2017,
    note: "AQA does not offer Classical Civilisation. OCR H408: World of the Hero 2h20 / 100 / 40%, Culture and the Arts 1h45 / 75 / 30%, Beliefs and Ideas 1h45 / 75 / 30%. Board is OCR — say so in the picker.",
    difficulty: cal(
      "Homer + Virgil (compare), then a culture/arts option (theatre or imperial image) and a beliefs/ideas option. Source + essay.",
      "Source items MUST set figureBrief (original vase / plan / inscription plate — not a copyrighted museum photo). Quote the poem; do not invent lines.",
      "Do not copy OCR sources. No Latin/Greek language paper — this is Civilisation, not Latin.",
    ),
    papers: [
      sitting("al-class-c1", "Component 11 · The World of the Hero", 140, 100, [
        written(2, 15, "Section A Homer — two-part"),
        written(2, 15, "Section B Virgil — two-part"),
        written(1, 40, "Section C comparative essay"),
      ]),
      sitting("al-class-c2", "Component 2 · Culture and the Arts", 105, 75, [
        written(1, 25, "Source / visual. Figure required."),
        written(2, 25, "Essays"),
      ]),
      sitting("al-class-c3", "Component 3 · Beliefs and Ideas", 105, 75, [
        written(1, 25, "Source / visual. Figure required."),
        written(2, 25, "Essays"),
      ]),
    ],
  },
  {
    id: "gcse-electronics",
    qualification: "gcse",
    source: "https://www.eduqas.co.uk/qualifications/electronics-gcse/",
    year: 2017,
    note: "AQA does not offer GCSE Electronics. Eduqas C490: Component 1 Discovering Electronics 1h30 / 80 / 40%, Component 2 Application of Electronics 1h30 / 80 / 40%, Component 3 NEA 20% not sat. Board is Eduqas — say so in the picker.",
    difficulty: cal(
      "Systems, sensing, switching, timing, sequential logic, then applied systems (audio, comms, control). Circuit + calculation.",
      "Circuit / timing-diagram items MUST set figureBrief (original schematic, not a copyrighted datasheet drawing).",
      "Do not copy Eduqas SAMs. NEA system build is not sat here.",
    ),
    papers: [
      sitting("gcse-el-c1", "Component 1 · Discovering Electronics", 90, 80, [
        short(10, 4, "Short / calculate. Several with circuit figures."),
        written(4, 10, "Structured / synoptic. At least one figure."),
      ]),
      sitting("gcse-el-c2", "Component 2 · Application of Electronics", 90, 80, [
        short(10, 4, "Short / calculate. Several with figures."),
        written(4, 10, "Applied system. Figure = the system."),
      ]),
    ],
  },
  {
    id: "alevel-electronics",
    qualification: "alevel",
    source: "https://www.eduqas.co.uk/qualifications/electronics-asa-level/",
    year: 2017,
    note: "AQA does not offer A-level Electronics. Eduqas A490: Component 1 Principles 2h45 / 140 / 40%, Component 2 Application 2h45 / 140 / 40%, Component 3 NEA 20% not sat. Board is Eduqas — say so in the picker.",
    difficulty: cal(
      "DC circuits, semiconductors, timing, sequential, MCHP, then comms, instrumentation, power. Calculation + system design.",
      "Schematic / timing / Bode items MUST set figureBrief. Original component values.",
      "Do not copy Eduqas SAMs. NEA extended system is not sat here.",
    ),
    papers: [
      sitting("al-el-c1", "Component 1 · Principles of Electronics", 165, 140, [
        short(10, 6, "Short / calculate. Several with figures."),
        written(4, 20, "Extended / QER. At least two figures."),
      ]),
      sitting("al-el-c2", "Component 2 · Application of Electronics", 165, 140, [
        short(10, 6, "Short / calculate. Several with figures."),
        written(4, 20, "Applied system. Figure = the system."),
      ]),
    ],
  },
  apMcqFrq({
    id: "ap-calc-ab",
    title: "AP Calculus AB",
    source: "https://apstudents.collegeboard.org/courses/ap-calculus-ab/assessment",
    year: 2025,
    note: "College Board AP Calculus AB: 3h10 hybrid. Section I 42 MCQ / 100 min (29 no-calc + 13 calc), Section II 6 FRQ / 90 min (2 calc + 4 no-calc). Same clock as BC; AB content only.",
    mix: "Limit, derivative, integral, FTC, DE, applications. Graphical / tabular / analytic / verbal.",
    do: "Graph and table items MUST set figureBrief. Exact AP-style notation. Show the setup, not only the answer.",
    mcq: { count: 42, minutes: 100, note: "Part A 29 no calculator, Part B 13 calculator. Several with figures." },
    frq: { count: 6, minutes: 90, maxRaw: 54, note: "Six FRQ (typically 9 points). At least two real-world. Figures on graph items." },
  }),
  apMcqFrq({
    id: "ap-calc-bc",
    title: "AP Calculus BC",
    source: "https://apstudents.collegeboard.org/courses/ap-calculus-bc/assessment",
    year: 2025,
    note: "College Board AP Calculus BC: same 3h10 clock as AB (42 MCQ / 100, 6 FRQ / 90) plus BC topics (series, parametrics, polar, more integration).",
    mix: "AB content plus series, polar/parametric, advanced integration. Same four representations.",
    do: "Graph / series-visual items MUST set figureBrief. BC depth — not an AB paper with extra time.",
    mcq: { count: 42, minutes: 100, note: "Part A 29 no calculator, Part B 13 calculator. Include BC topics." },
    frq: { count: 6, minutes: 90, maxRaw: 54, note: "Six FRQ. At least one series or polar/parametric. Figures on graph items." },
  }),
  apMcqFrq({
    id: "ap-stats",
    title: "AP Statistics",
    source: "https://apstudents.collegeboard.org/courses/ap-statistics/assessment",
    year: 2025,
    note: "College Board AP Statistics: 3h digital. Section I 42 MCQ / 90 min / 50%, Section II 4 FRQ × 10 / 90 min / 50% (inference is Q3).",
    mix: "Explore, sample, probability, inference. All four statistical practices.",
    do: "Plot / table items MUST set figureBrief. Original numbers. State hypotheses and conditions.",
    mcq: { count: 42, minutes: 90 },
    frq: { count: 4, minutes: 90, maxRaw: 40, note: "Four 10-point FRQ. Q3 is inference. Data figures required." },
  }),
  apMcqFrq({
    id: "ap-physics-1",
    title: "AP Physics 1",
    source: "https://apstudents.collegeboard.org/courses/ap-physics-1-algebra-based/assessment",
    year: 2025,
    note: "College Board AP Physics 1 (algebra-based): 3h hybrid. Section I 42 MCQ / 85 min, Section II 4 FRQ / 95 min (routines, representations, experimental, qualitative/quantitative).",
    mix: "Newtonian mechanics, energy, momentum, rotation, waves, circuits — algebra, not calculus.",
    do: "Diagram / graph items MUST set figureBrief. Show the model, not only the number.",
    dont: "Do not copy College Board FRQs. No calculus-based Physics C demand.",
    mcq: { count: 42, minutes: 85, note: "Discrete or stimulus sets. Several with figures." },
    frq: { count: 4, minutes: 95, maxRaw: 40, note: "Four FRQ types. Experimental-design item needs a figure." },
  }),
  {
    id: "ap-physics-c",
    qualification: "ap",
    source: "https://apstudents.collegeboard.org/courses/ap-physics-c-mechanics/assessment",
    year: 2025,
    note: "College Board AP Physics C is two separate 3h exams (Mechanics; Electricity and Magnetism). Each: 42 MCQ / 85 min + 4 FRQ / 95 min. Onboarding name is one subject — picker sits all four sections. Calculus required.",
    difficulty: cal(
      "Mechanics: kinematics through rotation/gravitation with calculus. E&M: fields, Gauss, circuits, induction with calculus.",
      "Diagram / field-map items MUST set figureBrief. Derive, do not only quote a formula.",
      "Do not copy College Board FRQs. No algebra-only Physics 1 demand.",
    ),
    papers: [
      sitting("ap-physc-mech-mcq", "Mechanics · Section I MCQ", 85, 42, [
        mcq(42, 4, 1, "Mechanics MCQ. Several with figures."),
      ]),
      sitting("ap-physc-mech-frq", "Mechanics · Section II FRQ", 95, 40, [
        written(4, 10, "Four FRQ types. At least two figures."),
      ]),
      sitting("ap-physc-em-mcq", "E&M · Section I MCQ", 85, 42, [
        mcq(42, 4, 1, "E&M MCQ. Field / circuit figures."),
      ]),
      sitting("ap-physc-em-frq", "E&M · Section II FRQ", 95, 40, [
        written(4, 10, "Four FRQ types. At least two figures."),
      ]),
    ],
  },
  apMcqFrq({
    id: "ap-chem",
    title: "AP Chemistry",
    source: "https://apstudents.collegeboard.org/courses/ap-chemistry/assessment",
    year: 2025,
    note: "College Board AP Chemistry: 3h15 hybrid. Section I 60 MCQ / 90 min, Section II 7 FRQ / 105 min (3 long × 10 + 4 short × 4 = 46).",
    mix: "Structure, bonding, reactions, kinetics, thermo, equilibrium. Models + calculation + claim-evidence.",
    do: "Particle diagram / graph items MUST set figureBrief. Calculator allowed. Original numbers.",
    mcq: { count: 60, minutes: 90, note: "Discrete and set-based. Several with figures." },
    frq: { count: 7, minutes: 105, maxRaw: 46, note: "Three long (10) and four short (4). Lab-design and representation items need figures." },
  }),
  apMcqFrq({
    id: "ap-bio",
    title: "AP Biology",
    source: "https://apstudents.collegeboard.org/courses/ap-biology/assessment",
    year: 2025,
    note: "College Board AP Biology: 3h hybrid. Section I 60 MCQ / 90 min, Section II 6 FRQ / 90 min (2 long + 4 short).",
    mix: "Evolution, energetics, information, systems. Science practices: explain, analyze, calculate, claim-evidence.",
    do: "Graph / model items MUST set figureBrief. Original data. No memorized-only vocab dumps.",
    mcq: { count: 60, minutes: 90 },
    frq: { count: 6, minutes: 90, maxRaw: 36, note: "Two long + four short. Experiment / graph items need figures." },
  }),
  apMcqFrq({
    id: "ap-envsci",
    title: "AP Environmental Science",
    source: "https://apstudents.collegeboard.org/courses/ap-environmental-science/assessment",
    year: 2025,
    note: "College Board AP Environmental Science: 2h40 digital. Section I 80 MCQ / 90 min / 60%, Section II 3 FRQ / 70 min / 40% (investigation, data, calculations).",
    mix: "Earth systems, biodiversity, populations, earth resources, energy, pollution, global change.",
    do: "Model / data items MUST set figureBrief. Propose a justified solution, not a slogan.",
    mcq: { count: 80, minutes: 90 },
    frq: { count: 3, minutes: 70, maxRaw: 30, note: "Investigation + data + calculation. Each needs a figure." },
  }),
  apHistory({
    id: "ap-ush",
    title: "AP U.S. History",
    source: "https://apstudents.collegeboard.org/courses/ap-united-states-history/assessment",
    span: "1491–2001",
    dbqSpan: "1754–1980",
  }),
  apHistory({
    id: "ap-world",
    title: "AP World History: Modern",
    source: "https://apstudents.collegeboard.org/courses/ap-world-history-modern/assessment",
    span: "1200–2001",
    dbqSpan: "1200–2001",
  }),
  apHistory({
    id: "ap-euro",
    title: "AP European History",
    source: "https://apstudents.collegeboard.org/courses/ap-european-history/assessment",
    span: "1450–2001",
    dbqSpan: "1450–2001",
  }),
  apMcqFrq({
    id: "ap-eng-lang",
    title: "AP English Language",
    source: "https://apstudents.collegeboard.org/courses/ap-english-language-and-composition/assessment",
    year: 2025,
    note: "College Board AP English Language and Composition: 3h15 digital. Section I 45 MCQ / 60 min / 45% (reading + writing), Section II 3 essays / 135 min including 15-min reading / 55%.",
    mix: "Nonfiction rhetorical analysis, synthesis of 6 sources, argument. Reading questions + prose-revision questions.",
    do: "Passage / source items MUST set figureBrief (original excerpt or visual source). Cite at least 3 synthesis sources.",
    dont: "Do not copy College Board passages or released essays. No fiction-lit paper — that is AP Lit.",
    mcq: { count: 45, minutes: 60, note: "23–25 reading + 20–22 writing/revision on nonfiction excerpts." },
    frq: { count: 3, minutes: 135, maxRaw: 18, note: "Synthesis + rhetorical analysis + argument. Synthesis sources need figures." },
  }),
  apMcqFrq({
    id: "ap-eng-lit",
    title: "AP English Literature",
    source: "https://apstudents.collegeboard.org/courses/ap-english-literature-and-composition/assessment",
    year: 2025,
    note: "College Board AP English Literature and Composition: 3h digital. Section I 55 MCQ / 60 min / 45% (prose + poetry sets), Section II 3 essays / 120 min / 55%. Section times are the long-standing CED split of the published 3h.",
    mix: "Poetry analysis, prose/drama analysis, literary argument on a work of quality.",
    do: "Each MCQ set is one original excerpt. Essays quote the passage. Do not paste a copyrighted novel chapter — write a short original extract.",
    dont: "Do not copy College Board passages. No AP Lang synthesis essay.",
    mcq: { count: 55, minutes: 60, note: "Five sets, 8–13 each. At least two prose/drama and two poetry." },
    frq: { count: 3, minutes: 120, maxRaw: 18, note: "Poetry + prose + literary argument." },
  }),
  apMcqFrq({
    id: "ap-csa",
    title: "AP Computer Science A",
    source: "https://apstudents.collegeboard.org/courses/ap-computer-science-a/assessment",
    year: 2025,
    note: "College Board AP Computer Science A: 3h digital. Section I 42 MCQ / 55%, Section II 4 FRQ / 45% (methods, class design, ArrayList, 2D array). College Board publishes the 3h total; the 90/90 split is the CED section clock.",
    mix: "Java: objects, control, arrays, ArrayList, 2D, inheritance. Read code and write code.",
    do: "FRQ stems MAY set figureBrief (UML or sample data). Code in the stem, not as an SVG dump.",
    mcq: { count: 42, minutes: 90, note: "Trace, equivalence, required-code. Occasional 2-question sets." },
    frq: { count: 4, minutes: 90, maxRaw: 36, note: "Methods + class + ArrayList + 2D array. Write Java." },
  }),
  apMcqFrq({
    id: "ap-psych",
    title: "AP Psychology",
    source: "https://apstudents.collegeboard.org/courses/ap-psychology/assessment",
    year: 2025,
    note: "College Board AP Psychology (redesigned): 2h40 digital. Section I 75 MCQ / 90 min / 67%, Section II 2 FRQ / 70 min / 33% (Article Analysis + Evidence-Based Question).",
    mix: "Apply perspectives and research methods. Evaluate quantitative and qualitative representations.",
    do: "Table / graph items MUST set figureBrief. AAQ uses an original article excerpt, not an AP released study.",
    mcq: { count: 75, minutes: 90 },
    frq: { count: 2, minutes: 70, maxRaw: 14, note: "AAQ + EBQ. Article / evidence figures required." },
  }),
  apMcqFrq({
    id: "ap-micro",
    title: "AP Microeconomics",
    source: "https://apstudents.collegeboard.org/courses/ap-microeconomics/assessment",
    year: 2025,
    note: "College Board AP Microeconomics: 2h10 hybrid. Section I 60 MCQ / 70 min / 66%, Section II 3 FRQ / 60 min including 10-min reading / 33% (1 long + 2 short).",
    mix: "Scarcity, supply/demand, elasticity, costs, markets, factor markets, government. Graph + calculate.",
    do: "Graph items MUST set figureBrief (original S/D, cost, surplus). Label axes.",
    dont: "Do not copy College Board FRQs. No macro AD/AS paper.",
    mcq: { count: 60, minutes: 70 },
    frq: { count: 3, minutes: 60, maxRaw: 21, note: "One long + two short. At least two graphs." },
  }),
  apMcqFrq({
    id: "ap-macro",
    title: "AP Macroeconomics",
    source: "https://apstudents.collegeboard.org/courses/ap-macroeconomics/assessment",
    year: 2025,
    note: "College Board AP Macroeconomics: 2h10 hybrid. Section I 60 MCQ / 70 min / 66%, Section II 3 FRQ / 60 min including 10-min reading / 33% (1 long + 2 short).",
    mix: "Indicators, AD/AS, money, policy, growth, trade. Graph + calculate.",
    do: "Graph items MUST set figureBrief (original AD/AS, money market, Phillips). Label axes.",
    dont: "Do not copy College Board FRQs. No micro cost-curve paper.",
    mcq: { count: 60, minutes: 70 },
    frq: { count: 3, minutes: 60, maxRaw: 21, note: "One long + two short. At least two graphs." },
  }),
  apMcqFrq({
    id: "ap-gov",
    title: "AP U.S. Government and Politics",
    source: "https://apstudents.collegeboard.org/courses/ap-united-states-government-and-politics/assessment",
    year: 2025,
    note: "College Board AP U.S. Government and Politics: 3h digital. Section I 55 MCQ / 80 min / 50%, Section II 4 FRQ / 100 min / 50% (concept, quantitative, SCOTUS comparison, argument).",
    mix: "Foundations, branches, civil liberties/rights, ideology, participation. Apply required cases and documents.",
    do: "Data / document items MUST set figureBrief. SCOTUS comparison uses one required case + one original scenario case — do not paste an AP released pairing.",
    mcq: { count: 55, minutes: 80 },
    frq: { count: 4, minutes: 100, maxRaw: 28, note: "Concept + quant + SCOTUS + argument essay. Quant needs a figure." },
  }),
  apWorldLanguage({
    id: "ap-spanish",
    language: "Spanish",
    source: "https://apstudents.collegeboard.org/courses/ap-spanish-language-and-culture/assessment",
  }),
  apWorldLanguage({
    id: "ap-french",
    language: "French",
    source: "https://apstudents.collegeboard.org/courses/ap-french-language-and-culture/assessment",
  }),
  ibMathHl({
    id: "ib-math-aa",
    course: "Mathematics: analysis and approaches",
    source: "https://www.ibo.org/programmes/diploma-programme/curriculum/mathematics/mathematics/",
  }),
  ibMathHl({
    id: "ib-math-ai",
    course: "Mathematics: applications and interpretation",
    source: "https://www.ibo.org/programmes/diploma-programme/curriculum/mathematics/mathematics/",
  }),
  ibScienceHl({
    id: "ib-physics",
    subject: "Physics",
    source: "https://www.ibo.org/programmes/diploma-programme/curriculum/sciences/physics/",
  }),
  ibScienceHl({
    id: "ib-chemistry",
    subject: "Chemistry",
    source: "https://www.ibo.org/programmes/diploma-programme/curriculum/sciences/chemistry/",
  }),
  ibScienceHl({
    id: "ib-biology",
    subject: "Biology",
    source: "https://www.ibo.org/programmes/diploma-programme/curriculum/sciences/biology/",
  }),
  {
    id: "ib-ess",
    qualification: "ib",
    source: "https://www.ibo.org/programmes/diploma-programme/curriculum/sciences/ess/",
    year: 2017,
    note: "IB Environmental systems and societies: Paper 1 case 1h / 40 / 25%, Paper 2 2h / 65 / 50%, IA 25% not sat. ESS is the interdisciplinary Group 3/4 course — not the same clock as Group 4 Biology/Chemistry/Physics.",
    difficulty: cal(
      "Case-study resource booklet, then short + two essays. Systems, models, sustainability.",
      "Case / data items MUST set figureBrief (original map, table, model). Do not paste a copyrighted satellite image.",
      "Do not copy IB specimens. IA fieldwork is not sat here. No Group 4 Physics paper.",
    ),
    papers: [
      sitting("ib-ess-p1", "Paper 1 · Case study", 60, 40, [
        short(8, 5, "Resource-booklet questions. figureBrief for the case plates."),
      ]),
      sitting("ib-ess-p2", "Paper 2 · Short and essays", 120, 65, [
        short(9, 5, "Section A short. Several with figures."),
        written(2, 10, "Section B two essays."),
      ]),
    ],
  },
  {
    id: "ib-history",
    qualification: "ib",
    source: "https://www.ibo.org/programmes/diploma-programme/curriculum/individuals-and-societies/history/",
    year: 2017,
    note: "IB History HL: Paper 1 sources 1h / 24 / 20%, Paper 2 world topics 1h30 / 30 / 25%, Paper 3 regional 2h30 / 45 / 35%. SL has no Paper 3. IA 20% not sat. This mock sits HL.",
    difficulty: cal(
      "Prescribed-subject sources, then two world-history essays, then three regional essays.",
      "Paper 1 sources MUST set figureBrief (original text/cartoon/table plates). OPVL. Essays need a thesis and named evidence.",
      "Do not copy IB specimens or prescribed-subject packs. IA is not sat here.",
    ),
    papers: [
      sitting("ib-hist-p1", "Paper 1 · Sources", 60, 24, [
        written(4, 6, "Four source questions on one prescribed subject. Figures on the sources."),
      ]),
      sitting("ib-hist-p2", "Paper 2 · World history", 90, 30, [
        written(2, 15, "Two essays from two different world-history topics."),
      ]),
      sitting("ib-hist-p3", "Paper 3 · Regional", 150, 45, [
        written(3, 15, "Three essays from one regional option."),
      ]),
    ],
  },
  {
    id: "ib-geography",
    qualification: "ib",
    source: "https://www.ibo.org/programmes/diploma-programme/curriculum/individuals-and-societies/geography/",
    year: 2019,
    note: "IB Geography HL: Paper 1 options 2h15 / 60 / 35%, Paper 2 core 1h15 / 50 / 25%, Paper 3 HL core extension 1h / 28 / 20%. SL Paper 1 is 1h30 / 40. IA 20% not sat. This mock sits HL.",
    difficulty: cal(
      "Optional themes (structured + essay), then core short + infographic + essay, then HL two-part essay.",
      "Map / infographic items MUST set figureBrief. Original numbers. Named located examples.",
      "Do not copy IB specimens. IA fieldwork is not sat here.",
    ),
    papers: [
      sitting("ib-geo-p1", "Paper 1 · Optional themes", 135, 60, [
        written(3, 10, "Structured on three options. Figures on each."),
        written(3, 10, "One extended per option."),
      ]),
      sitting("ib-geo-p2", "Paper 2 · Global change", 75, 50, [
        short(6, 5, "Section A structured (30). Several with figures."),
        short(2, 5, "Section B infographic (10). Figure required."),
        written(1, 10, "Section C essay (10)."),
      ]),
      sitting("ib-geo-p3", "Paper 3 · HL extension", 60, 28, [
        written(1, 12, "Part A"),
        written(1, 16, "Part B evaluative"),
      ]),
    ],
  },
  {
    id: "ib-economics",
    qualification: "ib",
    source: "https://www.ibo.org/programmes/diploma-programme/curriculum/individuals-and-societies/economics/",
    year: 2022,
    note: "IB Economics HL (first assessment 2022): Paper 1 1h15 / 25 / 20%, Paper 2 1h45 / 40 / 30%, Paper 3 1h45 / 60 / 30%. SL has no Paper 3. IA portfolio 20% not sat. This mock sits HL.",
    difficulty: cal(
      "Extended response, then data response, then HL policy/quantitative paper.",
      "Data / diagram items MUST set figureBrief (original AD/AS, PPC, table). Label diagrams.",
      "Do not copy IB specimens. IA commentary portfolio is not sat here.",
    ),
    papers: [
      sitting("ib-econ-p1", "Paper 1 · Extended response", 75, 25, [
        written(1, 10, "Part A"),
        written(1, 15, "Part B evaluative"),
      ]),
      sitting("ib-econ-p2", "Paper 2 · Data response", 105, 40, [
        written(1, 40, "One data-response question. Figure = the data booklet."),
      ]),
      sitting("ib-econ-p3", "Paper 3 · HL policy", 105, 60, [
        short(6, 5, "Calculations / short. Several with figures."),
        written(2, 15, "Policy recommendation. At least one figure."),
      ]),
    ],
  },
  {
    id: "ib-eng-a",
    qualification: "ib",
    source: "https://www.ibo.org/programmes/diploma-programme/curriculum/language-and-literature/",
    year: 2021,
    note: "IB Language A (Literature or Language & Literature) HL (first assessment 2021): Paper 1 2h15 / 40 two guided analyses, Paper 2 1h45 / 30 comparative essay. IO / HL essay not sat. This mock sits HL. SL Paper 1 is one analysis / 1h15.",
    difficulty: cal(
      "Unseen guided literary (or text) analysis, then a comparative essay on two studied works — here, two original short extracts standing in for studied works.",
      "Each Paper 1 text MUST set figureBrief or sit in stimulus. Quote. No plot-summary essays.",
      "Do not copy IB specimens or set-work wording. Orals and the HL essay are not sat here.",
    ),
    papers: [
      sitting("ib-enga-p1", "Paper 1 · Guided analysis", 135, 40, [
        written(2, 20, "Two unseen texts. Each extract in stimulus / figure."),
      ]),
      sitting("ib-enga-p2", "Paper 2 · Comparative", 105, 30, [
        written(1, 30, "One comparative essay on two works."),
      ]),
    ],
  },
  {
    id: "ib-eng-b",
    qualification: "ib",
    source: "https://www.ibo.org/programmes/diploma-programme/curriculum/language-acquisition/",
    year: 2020,
    note: "IB Language B HL: Paper 1 writing 1h30 / 30, Paper 2 receptive 2h / 65 (listen + read). Listening is a printed transcript. Individual oral 25% not sat. This mock sits HL.",
    difficulty: cal(
      "One written text type at HL, then listening and reading comprehension. Themes: identities, experiences, human ingenuity, social organisation, sharing the planet.",
      "Listen items MUST set figureBrief (transcript). Reading texts are original. Write in the target language.",
      "Do not copy IB specimens or audio. Oral is not sat here. No Language A literary essay.",
    ),
    papers: [
      sitting("ib-engb-p1", "Paper 1 · Writing", 90, 30, [
        written(1, 30, "One HL text type (blog, speech, proposal, article)."),
      ]),
      sitting("ib-engb-p2", "Paper 2 · Receptive", 120, 65, [
        mcq(12, 4, 1, "Listening from a printed transcript. figureBrief per clip."),
        short(8, 4, "Listening short"),
        mcq(12, 4, 1, "Reading. figureBrief per extract."),
        short(5, 5, "Reading short"),
      ]),
    ],
  },
  {
    id: "ib-cs",
    qualification: "ib",
    source: "https://www.ibo.org/programmes/diploma-programme/curriculum/sciences/computer-science/",
    year: 2014,
    note: "IB Computer Science HL (current until the 2027 first assessment): Paper 1 2h10 / 100, Paper 2 1h20 / 65, Paper 3 case study 1h / 30. IA 20% not sat. This mock sits HL. SL has no Paper 3.",
    difficulty: cal(
      "Core theory + OOP/option, then the annually issued case-study paper. Trace, write, evaluate.",
      "Trace tables / UML MAY set figureBrief. Code in the stem. Paper 3 uses an original case, not the live IB case.",
      "Do not copy IB specimens or the current official case study. IA is not sat here.",
    ),
    papers: [
      sitting("ib-cs-p1", "Paper 1 · Core", 130, 100, [
        short(10, 4, "Short / trace. Several with figures."),
        written(6, 10, "Extended. At least one figure."),
      ]),
      sitting("ib-cs-p2", "Paper 2 · Option", 80, 65, [
        short(5, 5, "Short / code"),
        written(4, 10, "Extended option (OOP common)."),
      ]),
      sitting("ib-cs-p3", "Paper 3 · Case study", 60, 30, [
        written(4, 7, "Case-study questions. Figure = the case."),
      ]),
    ],
  },
  {
    id: "ib-visual-arts",
    qualification: "ib",
    source: "https://www.ibo.org/programmes/diploma-programme/curriculum/the-arts/visual-arts/",
    year: 2017,
    note: "IB Visual Arts is 100% coursework: comparative study, process portfolio, exhibition. There is no written exam. Exam Sim sits the written comparative-study / exhibition rationale only — not the studio exhibition.",
    difficulty: cal(
      "Compare at least 3 artworks from at least 2 cultures, then a curatorial rationale.",
      "Each artwork plate MUST set figureBrief (original still-life / location drawing — not a copyrighted museum photo).",
      "Do not copy IB sample screens. Do not pretend this is the exhibition.",
    ),
    papers: [
      sitting("ib-va-cs", "Comparative study (written)", 90, 30, [
        written(1, 15, "Compare two works. Figures required."),
        written(1, 15, "Third work + making connections. Figure required."),
      ]),
      sitting("ib-va-ex", "Exhibition rationale (written mock)", 60, 30, [
        written(1, 30, "Curatorial rationale for a coherent exhibition. Figure = a hanging plan."),
      ]),
    ],
  },
  {
    id: "ib-psychology",
    qualification: "ib",
    source: "https://www.ibo.org/programmes/diploma-programme/curriculum/individuals-and-societies/psychology/",
    year: 2019,
    note: "IB Psychology HL: Paper 1 2h / 49 (SAQ + essay), Paper 2 2h / 44 (two option essays), Paper 3 1h / 24 research. SL Paper 2 is 1h / one essay, no Paper 3. IA 20% not sat. This mock sits HL.",
    difficulty: cal(
      "Approaches SAQ + essay, then two option essays, then three research-methods shorts on an unseen study.",
      "Unseen-study items MUST set figureBrief (original method plate). Named studies, not invented famous ones.",
      "Do not copy IB specimens. IA experimental study is not sat here.",
    ),
    papers: [
      sitting("ib-psych-p1", "Paper 1 · Approaches", 120, 49, [
        written(3, 9, "Three SAQ on the core approaches"),
        written(1, 22, "One essay. HL essay references AHL."),
      ]),
      sitting("ib-psych-p2", "Paper 2 · Options", 120, 44, [
        written(2, 22, "Two essays from two options."),
      ]),
      sitting("ib-psych-p3", "Paper 3 · Research", 60, 24, [
        written(3, 8, "Three shorts on an unseen study. Figure = the study plate."),
      ]),
    ],
  },
  {
    id: "ib-philosophy",
    qualification: "ib",
    source: "https://www.ibo.org/programmes/diploma-programme/curriculum/individuals-and-societies/philosophy/",
    year: 2016,
    note: "IB Philosophy HL: Paper 1 2h30 / 50, Paper 2 1h / 25, Paper 3 1h15 / 25 unseen text (HL). SL has no Paper 3. IA 20% not sat. This mock sits HL.",
    difficulty: cal(
      "Core theme + optional theme essays, then a prescribed-text essay, then HL unseen-text analysis.",
      "Stimulus items MAY set figureBrief. Argue; do not dump philosopher biographies.",
      "Do not copy IB unseen texts or prescribed-text wording. IA is not sat here.",
    ),
    papers: [
      sitting("ib-phil-p1", "Paper 1 · Themes", 150, 50, [
        written(1, 25, "Core theme essay. Stimulus may need a figure."),
        written(1, 25, "Optional theme essay."),
      ]),
      sitting("ib-phil-p2", "Paper 2 · Prescribed text", 60, 25, [
        written(1, 25, "One essay on a prescribed text — use an original short extract in stimulus, not a copyrighted chapter."),
      ]),
      sitting("ib-phil-p3", "Paper 3 · HL unseen", 75, 25, [
        written(1, 25, "Unseen text. Extract in stimulus."),
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
  { id: "gcse-combined-sci", re: /combined science|trilogy|double science/i },
  { id: "gcse-eng-lit", re: /english lit|літератур|литератур/i },
  { id: "gcse-eng-lang", re: /english lang|english(?! lit)/i },
  { id: "gcse-math", re: /math|матем/i },
  { id: "gcse-biology", re: /biolog|біолог|биолог/i },
  { id: "gcse-chemistry", re: /chem|хімі|хими/i },
  { id: "gcse-pe", re: /physical education|\bpe\b|фізичн(а|ої) культур|физкультур/i },
  { id: "gcse-physics", re: /physics\b|фізик|физик/i },
  { id: "gcse-geography", re: /geograph|географ/i },
  { id: "gcse-drama", re: /drama|theatre|theater|театр/i },
  { id: "gcse-rs", re: /religious stud|\brs\b|релігі|религ/i },
  { id: "gcse-sociology", re: /sociolog|соціолог|социолог/i },
  { id: "gcse-french", re: /french|французьк|французск|français/i },
  { id: "gcse-spanish", re: /spanish|іспанськ|испанск|español/i },
  { id: "gcse-german", re: /german|німецьк|немецк|deutsch/i },
  { id: "gcse-cs", re: /computer science|computing|\bcs\b|інформатик|информатик/i },
  { id: "gcse-electronics", re: /electronic/i },
  { id: "gcse-business", re: /business|бізнес|бизнес/i },
  { id: "gcse-economics", re: /econom|економі|экономи/i },
  { id: "gcse-art", re: /art\s*(&|and)?\s*design|fine art|\bart\b|мистецтв|искусств/i },
  { id: "gcse-music", re: /music|музик|музык/i },
  { id: "alevel-further-math", re: /further math|further maths|вища матем|высш/i },
  { id: "alevel-math", re: /math|матем/i },
  { id: "alevel-biology", re: /biolog|біолог|биолог/i },
  { id: "alevel-chemistry", re: /chem|хімі|хими/i },
  { id: "alevel-pe", re: /physical education|\bpe\b|фізичн(а|ої) культур|физкультур/i },
  { id: "alevel-physics", re: /physics\b|фізик|физик/i },
  { id: "alevel-history", re: /histor|істор|истор/i },
  { id: "alevel-geology", re: /geolog|геологі|геологи/i },
  { id: "alevel-envsci", re: /environmental science|environmental stud|еколог/i },
  { id: "alevel-geography", re: /geograph|географ/i },
  { id: "alevel-eng-lit", re: /english lit|літератур|литератур/i },
  { id: "alevel-eng-lang", re: /english lang|english(?! lit)|английск|англійськ/i },
  { id: "alevel-economics", re: /econom|економі|экономи/i },
  { id: "alevel-psychology", re: /psycholog|психолог/i },
  { id: "alevel-cs", re: /computer science|computing|\bcs\b|інформатик|информатик/i },
  { id: "alevel-electronics", re: /electronic/i },
  { id: "alevel-business", re: /business|бізнес|бизнес/i },
  { id: "alevel-politics", re: /politic|government and politics|політик|политик/i },
  { id: "alevel-french", re: /french|французьк|французск|français/i },
  { id: "alevel-spanish", re: /spanish|іспанськ|испанск|español/i },
  { id: "alevel-german", re: /german|німецьк|немецк|deutsch/i },
  { id: "alevel-sociology", re: /sociolog|соціолог|социолог/i },
  { id: "alevel-law", re: /\blaw\b|юриспр|\bправо\b/i },
  { id: "alevel-film", re: /film stud|\bfilm\b|кіно|кино/i },
  { id: "alevel-dt", re: /design and technology|design\s*&\s*technology|\bd&t\b|product design|дизайн/i },
  { id: "alevel-art", re: /art\s*(&|and)?\s*design|fine art|\bart\b|мистецтв|искусств/i },
  { id: "alevel-music", re: /music|музик|музык/i },
  { id: "alevel-rs", re: /religious stud|\brs\b|релігі|религ/i },
  { id: "alevel-philosophy", re: /philosoph|філософ|философ/i },
  { id: "alevel-drama", re: /drama|theatre|theater|театр/i },
  { id: "alevel-media", re: /media stud|\bmedia\b|медіа|медиа/i },
  { id: "alevel-dance", re: /dance|хореогр|танц/i },
  { id: "alevel-classics", re: /classic|classical civ|античн|класичн/i },
  { id: "ap-calc-bc", re: /calculus bc|calc bc/i },
  { id: "ap-calc-ab", re: /calculus ab|calc ab|calculus(?! bc)/i },
  { id: "ap-stats", re: /statistic/i },
  { id: "ap-physics-c", re: /physics c/i },
  { id: "ap-physics-1", re: /physics 1|physics(?! c)/i },
  { id: "ap-chem", re: /chem/i },
  { id: "ap-bio", re: /biolog/i },
  { id: "ap-envsci", re: /environmental science/i },
  { id: "ap-world", re: /world history/i },
  { id: "ap-euro", re: /european history/i },
  { id: "ap-ush", re: /u\.?s\.? history|united states history|apush/i },
  { id: "ap-eng-lit", re: /english lit/i },
  { id: "ap-eng-lang", re: /english lang|english(?! lit)/i },
  { id: "ap-csa", re: /computer science|cs a|\bcsa\b/i },
  { id: "ap-psych", re: /psycholog/i },
  { id: "ap-micro", re: /micro/i },
  { id: "ap-macro", re: /macro/i },
  { id: "ap-gov", re: /government|gov(ernment)? and politic/i },
  { id: "ap-spanish", re: /spanish|español/i },
  { id: "ap-french", re: /french|français/i },
  { id: "ib-math-aa", re: /analysis and approaches|\baa\b/i },
  { id: "ib-math-ai", re: /applications and interpretation|\bai\b/i },
  { id: "ib-ess", re: /environmental system/i },
  { id: "ib-physics", re: /physics/i },
  { id: "ib-chemistry", re: /chem/i },
  { id: "ib-biology", re: /biolog/i },
  { id: "ib-history", re: /histor/i },
  { id: "ib-geography", re: /geograph/i },
  { id: "ib-economics", re: /econom/i },
  { id: "ib-eng-a", re: /english a|language a|literature/i },
  { id: "ib-eng-b", re: /english b|language b/i },
  { id: "ib-cs", re: /computer science|computing/i },
  { id: "ib-visual-arts", re: /visual art/i },
  { id: "ib-psychology", re: /psycholog/i },
  { id: "ib-philosophy", re: /philosoph/i },
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

export const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

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
FORMAT: {"questions":[{"kind":"mcq","question":"...","options":["..."],"correct":0,"explanation":"1-2 sentences","topic":"...","stimulus":"","figureBrief":""}]}
RULES: each item has exactly ${n} options; "correct" is a 0-based index.
stimulus is a shared passage when the section note asks for one (same text on every item), else "".
figureBrief is a 8–20 word drawing brief (triangle ABC with median AM, circuit, climate graph) or "". Do NOT put SVG in this JSON — a second pass draws it.
When the stem says "див. рисунок" / "Study Figure 1", figureBrief MUST be non-empty.`;
  }
  if (section.kind === "match") {
    return `${base}
FORMAT: {"questions":[{"kind":"match","question":"...","left":["1..."],"right":["A..."],"pairs":[0],"explanation":"...","topic":"...","stimulus":"","figureBrief":"","figureKind":"source"}]}
RULES: left has ${section.left} stems; right has ${section.right} options (A–H when 8); pairs[i] is the right-index for left[i].
If this task is a set (ads / texts / gaps), ALL items MUST share the identical right[] list. Unused extras stay unused — do not reuse a heading.
stimulus is the shared gapped text when the section note asks for one, else "".
figureBrief is a 8–20 word drawing brief or "". Task 1 ads: non-empty, figureKind "source". No SVG in this JSON.`;
  }
  if (section.kind === "short") {
    return `${base}
FORMAT: {"questions":[{"kind":"short","question":"...","answer":"-2.5","accept":["-2,5","-2.50"],"explanation":"2-3 step method","topic":"...","figureBrief":""}]}
RULES: these are the LAST items on the paper — harder than the MCQs.
Each item needs 2–3 reasoning steps (piecewise+derivative, combinatorics C(n,k), 3D volume, parameter).
Answer is a number (decimals and negatives allowed). accept lists comma/dot twins.
BANNED: a single arithmetic expression with no context (order of operations, "обчисліть значення виразу (2³-5)·4").
figureBrief is a drawing brief or "". At least half MUST be non-empty (prism, graph, trapezoid). No SVG in this JSON.`;
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
FORMAT: {"questions":[{"kind":"written","question":"...","stimulus":"optional source extract","maxMarks":${section.maxMarksEach},"markscheme":["bullet 1","bullet 2"],"topic":"...","figureBrief":"","figureKind":"source"}]}
RULES: exam-board command words (Explain / How far / Write an account). Stimulus is a short original source, not a copyrighted extract.
figureKind is "source" (History photo/cartoon) or "figure" (map/graph). figureBrief MUST be non-empty when the stem says "Study Figure 1" / "Source A". No SVG in this JSON.`;
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
  figureBrief?: string;
  figureKind?: "figure" | "source";
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
  const figureBrief = typeof row.figureBrief === "string" ? row.figureBrief.trim() : "";
  const figureKind = row.figureKind === "source" ? "source" : "figure";
  const stimulus = typeof row.stimulus === "string" ? row.stimulus : "";
  if (kind === "mcq") {
    const options = Array.isArray(row.options) ? row.options.map((o) => String(o)) : [];
    const correct = typeof row.correct === "number" ? row.correct : 0;
    if (options.length < 2) return null;
    return { kind, question, options, correct, explanation, topic, figure, figureBrief, figureKind, stimulus };
  }
  if (kind === "match") {
    const left = Array.isArray(row.left) ? row.left.map((o) => String(o)) : [];
    const right = Array.isArray(row.right) ? row.right.map((o) => String(o)) : [];
    const pairs = Array.isArray(row.pairs) ? row.pairs.map((n) => Number(n)) : [];
    if (!left.length || !right.length) return null;
    return { kind, question, left, right, pairs, explanation, topic, figure, figureBrief, figureKind, stimulus };
  }
  if (kind === "short") {
    const answer = String(row.answer || row.correct || "").trim();
    const accept = Array.isArray(row.accept) ? row.accept.map((o) => String(o)) : [];
    if (!answer) return null;
    return { kind, question, answer, accept, explanation, topic, figure, figureBrief, figureKind };
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
    figure,
    figureBrief,
    figureKind,
  };
}

const FIGURE_HINT = /див\.?\s*рисун|see (the )?figure|study (figure|source)|source [a-d]\b|figure \d|рис\.|карт[аеиу]|графік|graph|diagram|апарат|circuit|трикутн|triangle|коло |prism|призм|trapez|трапец/i;

export function figureBriefOf(question: SimQuestion): string {
  if (question.figureBrief) return question.figureBrief;
  const blob = `${question.question} ${question.stimulus || ""}`.trim();
  return blob.slice(0, 180);
}

export function shouldDrawFigure(question: SimQuestion): boolean {
  if (question.figure && question.figure.includes("<svg")) return false;
  if (question.figureBrief) return true;
  if (question.kind === "written" && question.figureKind === "source") return true;
  return FIGURE_HINT.test(`${question.question} ${question.stimulus || ""}`);
}

export const EXAM_FIGURE_PLAYBOOK = `Official printed-paper style (УЦОЯО / AQA), not a website illustration.
- White background. Black ink only (#111). No purple, no gradients, no drop shadows.
- Strokes 1.6–2.2, round caps. Geometry looks compass-drawn. Vertices labelled.
- viewBox "0 0 720 420". 24px padding. No width/height on <svg>. No <script>, no on*, no <image href>.
- Labels 1–4 words, font-family="ui-sans-serif, system-ui, sans-serif" font-size 14 font-weight 650 fill="#111".
- History SOURCE: a dense pictorial scene (people, buildings, objects, period clothes) — a plate the student can read like a photo, not a stick-man. Caption lives outside the SVG.
- NMT English Task 1 ADVERT: a readable printed advert / flyer / shop-window / billboard. People or products, 4+ original English words (offer, place, price). Photo-like, not a stick-man logo.
- Film still / PE anatomy / Music score: a readable plate (shot diagram, joint/lever, 4-bar excerpt). Not a copyrighted frame or published score.
- Geography: sketch map with north arrow + scale bar, or a landscape plate with 4+ landform labels.
- Science: apparatus / circuit / cell / graph with labelled axes and units.
- Maths: the actual figure in the stem (triangle, circle, prism, axes). Hidden edges dashed.
- Never copy a published past-paper image. Never write the word Diagram inside the SVG.`;

export function figurePassPrompt(examName: string, batch: readonly { i: number; question: string; brief: string }[]): string {
  const lines = batch.map((row) => `[${row.i}] STEM: ${row.question}\nBRIEF: ${row.brief}`).join("\n\n");
  const headers = batch.map((row) => `===FIG ${row.i}===\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420">...</svg>`).join("\n");
  return `You are the exam-board illustrator for "${examName}".
${EXAM_FIGURE_PLAYBOOK}
Draw one ORIGINAL print-ready SVG per item. Ultra-clear, as good as a real paper plate.
OUTPUT ONLY this pack — no JSON, no markdown fences:
${headers}
Items:
${lines}`;
}

export function parseFigurePack(raw: string): Map<number, string> {
  const map = new Map<number, string>();
  if (!raw) return map;
  const re = /===FIG\s+(\d+)===\s*([\s\S]*?)(?====FIG\s+\d+===|$)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    const chunk = match[2] || "";
    if (chunk.toLowerCase().includes("<svg")) map.set(Number(match[1]), chunk.trim());
  }
  return map;
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
