// AI Exam Coach — Learn tree registry.
//
// One place that answers "give me the tree for this exam" — LearnMain and
// every downstream phase (Teach/Drill/Prove) go through `getTree()` rather
// than importing individual tree files, so adding a new exam is a one-line
// map entry, not a fan-out of imports.
//
// NMT is split by subject. `nmt` stays Mathematics on purpose: learn-store
// already keys math mastery under that taxonomy, and a rename would wipe it.

import type { LearnTree } from "./schema";
import NMT_MATH from "./nmt-math";
import IELTS from "./ielts";
import {
  NMT_UKR, NMT_HIST, NMT_BIO, NMT_CHEM, NMT_PHYS, NMT_GEO,
  NMT_ENG, NMT_LIT, NMT_DE, NMT_FR, NMT_ES,
} from "./nmt-subjects";

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
  ielts: IELTS,
};

export function getTree(examTaxonomy: string): LearnTree | null {
  return TREES[examTaxonomy] || null;
}

export function availableTaxonomies(): readonly string[] {
  return Object.keys(TREES);
}
