// AI Exam Coach — Learn (Phase 3.7e) — prerequisite locks + SVG layout.
//
// Lock state is *derived*, never stored. A missing learn-store entry is
// still "unlocked" in the store (3.7a default); whether the student can
// *open* the node is computed here from the prereq graph + bronze+
// mastery. That way a syllabus edit that adds a prereq re-locks the
// node without a data migration, and a student who already bronze'd a
// node during the 3.7a free-for-all keeps access to it.

import {
  findNode,
  isBossNode,
  type LearnNode,
  type LearnTree,
  type LearnUnit,
} from "./schema";

export type NodeProgressMap = Record<string, { mastery: string } | undefined>;

const MASTERED = new Set(["bronze", "silver", "gold", "legendary"]);

export function isMastered(mastery: string | undefined): boolean {
  return !!mastery && MASTERED.has(mastery);
}

export function canOpenNode(
  tree: LearnTree,
  progress: NodeProgressMap,
  nodeId: string,
): boolean {
  const found = findNode(tree, nodeId);
  if (!found) return false;
  if (isMastered(progress[nodeId]?.mastery)) return true;
  return found.node.prerequisites.every((id) => isMastered(progress[id]?.mastery));
}

export function unmetPrerequisites(
  tree: LearnTree,
  progress: NodeProgressMap,
  nodeId: string,
): LearnNode[] {
  const found = findNode(tree, nodeId);
  if (!found) return [];
  const out: LearnNode[] = [];
  for (const id of found.node.prerequisites) {
    if (isMastered(progress[id]?.mastery)) continue;
    const pre = findNode(tree, id);
    if (pre) out.push(pre.node);
  }
  return out;
}

export function unitLessonMastered(
  unit: LearnUnit,
  progress: NodeProgressMap,
): { mastered: number; total: number } {
  const lessons = unit.nodes.filter((n) => !isBossNode(n));
  const mastered = lessons.filter((n) => isMastered(progress[n.id]?.mastery)).length;
  return { mastered, total: lessons.length };
}

// ── SVG layout (one column per unit) ────────────────────────────────────────

export const TREE_GUTTER = 56;
export const TREE_ROW = 68;
export const TREE_CX = 28;
export const TREE_R = 11;

export interface LaidOutNode {
  readonly id: string;
  readonly node: LearnNode;
  readonly x: number;
  readonly y: number;
  readonly isBoss: boolean;
}

export interface LaidOutEdge {
  readonly fromId: string;
  readonly toId: string;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly kind: "spine" | "prereq";
}

export interface UnitLayout {
  readonly placed: readonly LaidOutNode[];
  readonly edges: readonly LaidOutEdge[];
  readonly height: number;
  readonly width: number;
}

export function layoutUnit(unit: LearnUnit): UnitLayout {
  const nodes = unit.nodes;
  const indexById = new Map(nodes.map((n, i) => [n.id, i]));
  const placed: LaidOutNode[] = nodes.map((node, i) => ({
    id: node.id,
    node,
    x: TREE_CX,
    y: TREE_ROW * i + TREE_ROW / 2,
    isBoss: isBossNode(node),
  }));

  const edges: LaidOutEdge[] = [];
  for (let i = 1; i < placed.length; i++) {
    const from = placed[i - 1];
    const to = placed[i];
    if (!from || !to) continue;
    edges.push({
      fromId: from.id,
      toId: to.id,
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      kind: "spine",
    });
  }
  for (const node of nodes) {
    const toIdx = indexById.get(node.id);
    if (toIdx === undefined) continue;
    const to = placed[toIdx];
    if (!to) continue;
    for (const pre of node.prerequisites) {
      const fromIdx = indexById.get(pre);
      if (fromIdx === undefined) continue; // cross-unit — no SVG line
      if (toIdx - fromIdx === 1) continue; // already the spine
      const from = placed[fromIdx];
      if (!from) continue;
      edges.push({
        fromId: pre,
        toId: node.id,
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        kind: "prereq",
      });
    }
  }

  return {
    placed,
    edges,
    height: Math.max(TREE_ROW, nodes.length * TREE_ROW),
    width: TREE_GUTTER,
  };
}

export function edgePath(e: LaidOutEdge): string {
  if (e.kind === "spine") {
    return `M ${e.x1} ${e.y1} L ${e.x2} ${e.y2}`;
  }
  const dy = e.y2 - e.y1;
  const bulge = Math.min(24, Math.abs(dy) / 4 + 12);
  return `M ${e.x1} ${e.y1} C ${e.x1 - bulge} ${e.y1 + dy / 3}, ${e.x2 - bulge} ${e.y2 - dy / 3}, ${e.x2} ${e.y2}`;
}
