// AI Exam Coach — Learn (Phase 3.7a) — skill-tree schema.
//
// A tree is a static, in-repo data structure — not a Supabase table — for
// reasons that matter here: (a) it's shared by every student learning this
// exam, so it doesn't belong under per-user RLS; (b) versioning it via git
// means a syllabus fix is a code review, not a SQL edit; (c) shipping the
// tree with the bundle means the Learn screen renders instantly, without
// waiting on a fetch that would gate the very first paint of the section.
//
// Trees live under `src/features/learn/tree/<exam-taxonomy>.ts`. Each one
// exports a `default: LearnTree` and is picked up by a registry (see
// tree/index.ts). Node ids are stable strings that outlive title edits —
// learn-store keys progress by id, so rewording a title in the tree JSON
// does NOT reset a student's mastery on that node.

export interface I18nString {
  readonly en: string;
  readonly uk?: string;
  readonly ru?: string;
  readonly fr?: string;
  readonly de?: string;
  readonly es?: string;
}

export interface LearnNode {
  readonly id: string;
  readonly title: I18nString;
  // 1 = warm-up / trivial recall
  // 3 = standard exam question
  // 5 = trap / edge case / multi-step derivation
  readonly complexity: 1 | 2 | 3 | 4 | 5;
  readonly estimatedMinutes: number;
  // Node ids that must be bronze+ before this one unlocks. Enforced in
  // Phase 3.7e via canOpenNode() — empty means the node is an entry point.
  readonly prerequisites: readonly string[];
  // Omitted on every hand-authored lesson node. `withBossNodes()` appends
  // a synthetic `boss` node per unit at render time so the static trees
  // stay lesson-only (a title edit never accidentally drops a boss).
  readonly kind?: "lesson" | "boss";
}

export interface LearnUnit {
  readonly id: string;
  readonly title: I18nString;
  readonly nodes: readonly LearnNode[];
}

export interface LearnTree {
  // Matches ai_question_bank.exam_taxonomy — feeding Prove questions into
  // the same dedupe partition every other generator already uses.
  readonly examTaxonomy: string;
  readonly units: readonly LearnUnit[];
}

// Convenience: total node count for a tree, used by the LearnMain header
// ("You've mastered 12 of 47 topics") without every caller re-flattening.
export function totalNodeCount(tree: LearnTree): number {
  return tree.units.reduce((sum, u) => sum + u.nodes.length, 0);
}

// Lesson-only flatten. Boss nodes stay out of the free/Pro split so a
// synthetic unit boss never eats a free slot.
export function flattenLessonNodes(tree: LearnTree): readonly { node: LearnNode; unit: LearnUnit; index: number }[] {
  const out: { node: LearnNode; unit: LearnUnit; index: number }[] = [];
  for (const unit of tree.units) {
    for (const node of unit.nodes) {
      if (isBossNode(node)) continue;
      out.push({ node, unit, index: out.length });
    }
  }
  return out;
}

// Localizes an I18nString against a language code, falling back to English
// the same way every other i18n site in this app does (see AIChat.jsx's L()).
export function localize(str: I18nString, lang: string): string {
  return (str as unknown as Record<string, string | undefined>)[lang] || str.en;
}

export function isBossNode(node: LearnNode): boolean {
  return node.kind === "boss";
}

export function lessonNodes(unit: LearnUnit): readonly LearnNode[] {
  return unit.nodes.filter((n) => n.kind !== "boss");
}

function bossTitle(unit: LearnUnit): I18nString {
  const t = unit.title;
  return {
    en: `${t.en} — Boss`,
    ...(t.uk ? { uk: `${t.uk} — Бос` } : {}),
    ...(t.ru ? { ru: `${t.ru} — Босс` } : {}),
    ...(t.fr ? { fr: `${t.fr} — Boss` } : {}),
    ...(t.de ? { de: `${t.de} — Boss` } : {}),
  };
}

// Appends one synthetic boss node per unit. Idempotent — a tree that
// already has bosses is returned unchanged. Boss prerequisites are every
// lesson in the unit, so the lock engine treats "unit cleared" as "all
// lessons bronze+".
export function withBossNodes(tree: LearnTree): LearnTree {
  return {
    ...tree,
    units: tree.units.map((unit) => {
      if (unit.nodes.some(isBossNode)) return unit;
      const lessons = lessonNodes(unit);
      const boss: LearnNode = {
        id: `${unit.id}-boss`,
        title: bossTitle(unit),
        complexity: 5,
        estimatedMinutes: 10,
        prerequisites: lessons.map((n) => n.id),
        kind: "boss",
      };
      return { ...unit, nodes: [...lessons, boss] };
    }),
  };
}

export function findNode(
  tree: LearnTree,
  nodeId: string,
): { unit: LearnUnit; node: LearnNode } | null {
  for (const unit of tree.units) {
    const node = unit.nodes.find((n) => n.id === nodeId);
    if (node) return { unit, node };
  }
  return null;
}
