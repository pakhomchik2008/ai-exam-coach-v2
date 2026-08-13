// AI Exam Coach — Learn tree registry.
//
// One place that answers "give me the tree for this exam" — LearnMain and
// every downstream phase (Teach/Drill/Prove) go through `getTree()` rather
// than importing individual tree files, so adding a new exam is a one-line
// map entry, not a fan-out of imports.
//
// Subject-split exams (NMT, A-Level, GCSE, AP, IB, Matura, Abitur) never
// register a bare qualification key. Section exams (SAT, ACT, IELTS,
// TOEFL, DET) do — one sitting, one tree. `nmt` stays Mathematics on
// purpose: learn-store already keys math mastery under that taxonomy.

import type { LearnTree } from "./schema";
import NMT_MATH from "./nmt-math";
import IELTS from "./ielts";
import SAT from "./sat";
import ACT from "./act";
import TOEFL from "./toefl";
import DUOLINGO from "./duolingo";
import {
  NMT_UKR, NMT_HIST, NMT_BIO, NMT_CHEM, NMT_PHYS, NMT_GEO,
  NMT_ENG, NMT_LIT, NMT_DE, NMT_FR, NMT_ES,
} from "./nmt-subjects";
import {
  ALEVEL_MATH, ALEVEL_FM, ALEVEL_PHYS, ALEVEL_CHEM, ALEVEL_BIO,
  ALEVEL_CS, ALEVEL_ECON, ALEVEL_BUS, ALEVEL_ENG, ALEVEL_LIT,
  ALEVEL_HIST, ALEVEL_GEO, ALEVEL_PSY, ALEVEL_POL,
  ALEVEL_FR, ALEVEL_DE, ALEVEL_ES,
} from "./alevel-subjects";
import {
  GCSE_MATH, GCSE_SCI, GCSE_ENG, GCSE_LIT, GCSE_BIO, GCSE_CHEM, GCSE_PHYS,
  GCSE_HIST, GCSE_GEO, GCSE_CS, GCSE_FR, GCSE_DE, GCSE_ES,
  GCSE_BUS, GCSE_ECON, GCSE_RS, GCSE_PE, GCSE_SOC, GCSE_PSY,
} from "./gcse-subjects";
import {
  AP_CALC_AB, AP_CALC_BC, AP_CSA, AP_PHYS1, AP_CHEM, AP_HUG,
  AP_STAT, AP_BIO, AP_PHYS_C, AP_ENV, AP_USH, AP_WH, AP_EUH,
  AP_LANG, AP_LIT, AP_PSY, AP_MICRO, AP_MACRO, AP_GOV, AP_CSP,
  AP_FR, AP_ES,
} from "./ap-subjects";
import {
  IB_AA, IB_AI, IB_CS, IB_PHYS, IB_CHEM, IB_BIO, IB_ECON, IB_BUS,
  IB_ENG, IB_HIST, IB_PSY, IB_GEO, IB_ESS,
} from "./ib-subjects";
import {
  MATURA_PL, MATURA_MATH, MATURA_ENG, MATURA_BIO, MATURA_CHEM, MATURA_PHYS,
  MATURA_CS, MATURA_GEO, MATURA_HIST, MATURA_WOS, MATURA_ECON, MATURA_LANG,
} from "./matura-subjects";
import {
  ABITUR_DE, ABITUR_MATH, ABITUR_ENG, ABITUR_BIO, ABITUR_CHEM, ABITUR_PHYS,
  ABITUR_CS, ABITUR_HIST, ABITUR_GEO, ABITUR_POL, ABITUR_MUSIC, ABITUR_LANG,
} from "./abitur-subjects";

const TREES: Record<string, LearnTree> = {
  nmt: NMT_MATH,
  "nmt-ukr": NMT_UKR,
  "nmt-hist": NMT_HIST,
  "nmt-bio": NMT_BIO,
  "nmt-chem": NMT_CHEM,
  "nmt-phys": NMT_PHYS,
  "nmt-geo": NMT_GEO,
  "nmt-eng": NMT_ENG,
  "nmt-lit": NMT_LIT,
  "nmt-de": NMT_DE,
  "nmt-fr": NMT_FR,
  "nmt-es": NMT_ES,
  "alevel-math": ALEVEL_MATH,
  "alevel-fm": ALEVEL_FM,
  "alevel-phys": ALEVEL_PHYS,
  "alevel-chem": ALEVEL_CHEM,
  "alevel-bio": ALEVEL_BIO,
  "alevel-cs": ALEVEL_CS,
  "alevel-econ": ALEVEL_ECON,
  "alevel-bus": ALEVEL_BUS,
  "alevel-eng": ALEVEL_ENG,
  "alevel-lit": ALEVEL_LIT,
  "alevel-hist": ALEVEL_HIST,
  "alevel-geo": ALEVEL_GEO,
  "alevel-psy": ALEVEL_PSY,
  "alevel-pol": ALEVEL_POL,
  "alevel-fr": ALEVEL_FR,
  "alevel-de": ALEVEL_DE,
  "alevel-es": ALEVEL_ES,
  "gcse-math": GCSE_MATH,
  "gcse-sci": GCSE_SCI,
  "gcse-eng": GCSE_ENG,
  "gcse-lit": GCSE_LIT,
  "gcse-bio": GCSE_BIO,
  "gcse-chem": GCSE_CHEM,
  "gcse-phys": GCSE_PHYS,
  "gcse-hist": GCSE_HIST,
  "gcse-geo": GCSE_GEO,
  "gcse-cs": GCSE_CS,
  "gcse-fr": GCSE_FR,
  "gcse-de": GCSE_DE,
  "gcse-es": GCSE_ES,
  "gcse-bus": GCSE_BUS,
  "gcse-econ": GCSE_ECON,
  "gcse-rs": GCSE_RS,
  "gcse-pe": GCSE_PE,
  "gcse-soc": GCSE_SOC,
  "gcse-psy": GCSE_PSY,
  "ap-calc-ab": AP_CALC_AB,
  "ap-calc-bc": AP_CALC_BC,
  "ap-csa": AP_CSA,
  "ap-phys1": AP_PHYS1,
  "ap-chem": AP_CHEM,
  "ap-hug": AP_HUG,
  "ap-stat": AP_STAT,
  "ap-bio": AP_BIO,
  "ap-phys-c": AP_PHYS_C,
  "ap-env": AP_ENV,
  "ap-ush": AP_USH,
  "ap-wh": AP_WH,
  "ap-euh": AP_EUH,
  "ap-lang": AP_LANG,
  "ap-lit": AP_LIT,
  "ap-psy": AP_PSY,
  "ap-micro": AP_MICRO,
  "ap-macro": AP_MACRO,
  "ap-gov": AP_GOV,
  "ap-csp": AP_CSP,
  "ap-fr": AP_FR,
  "ap-es": AP_ES,
  "ib-aa": IB_AA,
  "ib-ai": IB_AI,
  "ib-cs": IB_CS,
  "ib-phys": IB_PHYS,
  "ib-chem": IB_CHEM,
  "ib-bio": IB_BIO,
  "ib-econ": IB_ECON,
  "ib-bus": IB_BUS,
  "ib-eng": IB_ENG,
  "ib-hist": IB_HIST,
  "ib-psy": IB_PSY,
  "ib-geo": IB_GEO,
  "ib-ess": IB_ESS,
  "matura-pl": MATURA_PL,
  "matura-math": MATURA_MATH,
  "matura-eng": MATURA_ENG,
  "matura-bio": MATURA_BIO,
  "matura-chem": MATURA_CHEM,
  "matura-phys": MATURA_PHYS,
  "matura-cs": MATURA_CS,
  "matura-geo": MATURA_GEO,
  "matura-hist": MATURA_HIST,
  "matura-wos": MATURA_WOS,
  "matura-econ": MATURA_ECON,
  "matura-lang": MATURA_LANG,
  "abitur-de": ABITUR_DE,
  "abitur-math": ABITUR_MATH,
  "abitur-eng": ABITUR_ENG,
  "abitur-bio": ABITUR_BIO,
  "abitur-chem": ABITUR_CHEM,
  "abitur-phys": ABITUR_PHYS,
  "abitur-cs": ABITUR_CS,
  "abitur-hist": ABITUR_HIST,
  "abitur-geo": ABITUR_GEO,
  "abitur-pol": ABITUR_POL,
  "abitur-music": ABITUR_MUSIC,
  "abitur-lang": ABITUR_LANG,
  sat: SAT,
  act: ACT,
  ielts: IELTS,
  toefl: TOEFL,
  duolingo: DUOLINGO,
};

export function getTree(examTaxonomy: string): LearnTree | null {
  return TREES[examTaxonomy] || null;
}

export function availableTaxonomies(): readonly string[] {
  return Object.keys(TREES);
}
