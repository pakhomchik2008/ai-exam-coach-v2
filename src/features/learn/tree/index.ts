// AI Exam Coach — Learn tree registry.
//
// One place that answers "give me the tree for this exam" — LearnMain and
// every downstream phase (Teach/Drill/Prove) go through `getTree()` rather
// than importing individual tree files, so adding a new exam is a one-line
// map entry, not a fan-out of imports.
//
// NMT is split by subject. `nmt` stays Mathematics on purpose: learn-store
// already keys math mastery under that taxonomy, and a rename would wipe it.
// A-Level is the same split — never register a bare `alevel` key.

import type { LearnTree } from "./schema";
import NMT_MATH from "./nmt-math";
import IELTS from "./ielts";
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
  // No bare `alevel` — same trap as NMT math. Subject slug only.
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
  ielts: IELTS,
};

export function getTree(examTaxonomy: string): LearnTree | null {
  return TREES[examTaxonomy] || null;
}

export function availableTaxonomies(): readonly string[] {
  return Object.keys(TREES);
}
