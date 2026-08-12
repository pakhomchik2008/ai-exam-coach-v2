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
}

export interface LearnNode {
  readonly id: string;
  readonly title: I18nString;
  // 1 = warm-up / trivial recall
  // 3 = standard exam question
  // 5 = trap / edge case / multi-step derivation
  readonly complexity: 1 | 2 | 3 | 4 | 5;
  readonly estimatedMinutes: number;
  // Node ids that must be mastered before this one unlocks. Stored now but
  // NOT enforced until Phase 3.7e — MVP renders every unlocked node as
  // available so a student can pick their entry point. `readonly []` for
  // top-of-unit nodes.
  readonly prerequisites: readonly string[];
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

// Localizes an I18nString against a language code, falling back to English
// the same way every other i18n site in this app does (see AIChat.jsx's L()).
export function localize(str: I18nString, lang: string): string {
  return (str as unknown as Record<string, string | undefined>)[lang] || str.en;
}
