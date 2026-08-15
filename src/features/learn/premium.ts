// Free vs Pro split for Learn trees.
//
// Free = the first unit, every lesson in it. Later units stay visible but
// locked. Sequential unit 1 is a real lesson; the old half-tree split
// skipped the end of unit 1 and unlocked random later nodes (Decision #76,
// reverses #63). Stripe (3.7i) flips profile.pro via the webhook;
// isProUser() still reads that cache so a missing table does not lock
// everyone.

import { lessonNodes, type LearnTree } from "./tree/schema";

export function freeNodeCount(tree: LearnTree): number {
  const unit = tree.units[0];
  if (!unit) return 0;
  return lessonNodes(unit).length;
}

export function isPremiumNode(tree: LearnTree, nodeId: string): boolean {
  const unit = tree.units[0];
  if (!unit) return true;
  return !unit.nodes.some((n) => n.id === nodeId);
}

export function isProUser(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & { getProfile?: () => { pro?: boolean } };
  return w.getProfile?.().pro === true;
}

export function topicIsLocked(tree: LearnTree, nodeId: string): boolean {
  return isPremiumNode(tree, nodeId) && !isProUser();
}
