// Shared Learn-tree builder. Subject files pass official topic titles;
// grouping and node ids stay stable so mastery keys survive title edits.

import type { LearnTree, LearnUnit } from "./schema";

export function unit(prefix: string, en: string, uk: string, names: readonly string[]): LearnUnit {
  return {
    id: prefix,
    title: { en, uk },
    nodes: names.map((name, i) => ({
      id: `${prefix}-${String(i + 1).padStart(2, "0")}`,
      title: { en: name, uk: name },
      complexity: (i < 2 ? 2 : i < 5 ? 3 : 4) as 2 | 3 | 4,
      estimatedMinutes: 10,
      prerequisites: i === 0 ? [] : [`${prefix}-${String(i).padStart(2, "0")}`],
    })),
  };
}

export function tree(examTaxonomy: string, units: readonly LearnUnit[]): LearnTree {
  return { examTaxonomy, units };
}
