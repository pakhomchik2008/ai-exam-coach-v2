// AI Exam Coach — Learn tree registry.
//
// One place that answers "give me the tree for this exam" — LearnMain and
// every downstream phase (Teach/Drill/Prove) go through `getTree()` rather
// than importing individual tree files, so adding a new exam is a one-line
// map entry, not a fan-out of imports.

import type { LearnTree } from "./schema";
import NMT_MATH from "./nmt-math";
import IELTS from "./ielts";

const TREES: Record<string, LearnTree> = {
  nmt: NMT_MATH,
  ielts: IELTS,
};

export function getTree(examTaxonomy: string): LearnTree | null {
  return TREES[examTaxonomy] || null;
}

export function availableTaxonomies(): readonly string[] {
  return Object.keys(TREES);
}
