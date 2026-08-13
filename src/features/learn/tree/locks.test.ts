import { describe, it, expect } from "vitest";
import NMT_MATH from "./nmt-math";
import IELTS from "./ielts";
import {
  findNode,
  isBossNode,
  lessonNodes,
  totalNodeCount,
  withBossNodes,
} from "./schema";
import {
  canOpenNode,
  edgePath,
  isMastered,
  layoutUnit,
  TREE_ROW,
  unmetPrerequisites,
  unitLessonMastered,
  type NodeProgressMap,
} from "./locks";

function bronze(...ids: string[]): NodeProgressMap {
  const p: NodeProgressMap = {};
  for (const id of ids) p[id] = { mastery: "bronze" };
  return p;
}

describe("isMastered", () => {
  it("treats bronze and above as mastered, nothing else", () => {
    expect(isMastered("bronze")).toBe(true);
    expect(isMastered("silver")).toBe(true);
    expect(isMastered("gold")).toBe(true);
    expect(isMastered("legendary")).toBe(true);
    expect(isMastered("unlocked")).toBe(false);
    expect(isMastered("locked")).toBe(false);
    expect(isMastered(undefined)).toBe(false);
  });
});

describe("withBossNodes", () => {
  it("appends one boss per unit with every lesson as a prereq", () => {
    const tree = withBossNodes(NMT_MATH);
    expect(tree.units).toHaveLength(NMT_MATH.units.length);
    for (const unit of tree.units) {
      const bosses = unit.nodes.filter(isBossNode);
      expect(bosses).toHaveLength(1);
      const boss = bosses[0];
      if (!boss) throw new Error("boss missing");
      expect(boss.id).toBe(`${unit.id}-boss`);
      expect(boss.prerequisites).toEqual(lessonNodes(unit).map((n) => n.id));
      expect(boss.complexity).toBe(5);
    }
  });

  it("is idempotent", () => {
    const once = withBossNodes(NMT_MATH);
    const twice = withBossNodes(once);
    expect(twice.units.map((u) => u.nodes.map((n) => n.id))).toEqual(
      once.units.map((u) => u.nodes.map((n) => n.id)),
    );
  });

  it("does not change the lesson-only totalNodeCount of the original tree", () => {
    expect(totalNodeCount(NMT_MATH)).toBe(47);
    expect(totalNodeCount(withBossNodes(NMT_MATH))).toBe(47 + NMT_MATH.units.length);
  });
});

describe("canOpenNode", () => {
  const tree = withBossNodes(NMT_MATH);

  it("opens entry-point nodes with empty prerequisites", () => {
    expect(canOpenNode(tree, {}, "nm-01")).toBe(true);
    expect(canOpenNode(tree, {}, "fn-01")).toBe(true);
    expect(canOpenNode(tree, {}, "ge-01")).toBe(true);
    expect(canOpenNode(tree, {}, "sh-01")).toBe(true);
  });

  it("locks a node until every prerequisite is bronze+", () => {
    expect(canOpenNode(tree, {}, "nm-02")).toBe(false);
    expect(canOpenNode(tree, bronze("nm-01"), "nm-02")).toBe(true);
  });

  it("requires ALL parents for a multi-prereq node (al-06)", () => {
    expect(canOpenNode(tree, bronze("al-04"), "al-06")).toBe(false);
    expect(canOpenNode(tree, bronze("al-05"), "al-06")).toBe(false);
    expect(canOpenNode(tree, bronze("al-04", "al-05"), "al-06")).toBe(true);
  });

  it("keeps a already-mastered node open even if prereqs later fail", () => {
    // 3.7a free-for-all: student bronze'd nm-02 without nm-01. Don't lock them out.
    expect(canOpenNode(tree, bronze("nm-02"), "nm-02")).toBe(true);
  });

  it("locks the unit boss until every lesson in the unit is mastered", () => {
    const nm = tree.units[0];
    if (!nm) throw new Error("nm unit missing");
    const lessonIds = lessonNodes(nm).map((n) => n.id);
    expect(canOpenNode(tree, {}, "nm-boss")).toBe(false);
    expect(canOpenNode(tree, bronze(...lessonIds.slice(0, -1)), "nm-boss")).toBe(false);
    expect(canOpenNode(tree, bronze(...lessonIds), "nm-boss")).toBe(true);
  });

  it("returns false for an unknown node id", () => {
    expect(canOpenNode(tree, {}, "no-such-node")).toBe(false);
  });
});

describe("unmetPrerequisites", () => {
  const tree = withBossNodes(NMT_MATH);

  it("lists the locked parents by node object", () => {
    const unmet = unmetPrerequisites(tree, {}, "nm-02");
    expect(unmet.map((n) => n.id)).toEqual(["nm-01"]);
  });

  it("is empty when every parent is mastered", () => {
    expect(unmetPrerequisites(tree, bronze("nm-01"), "nm-02")).toEqual([]);
  });

  it("resolves cross-unit parents (al-01 needs nm-07)", () => {
    const unmet = unmetPrerequisites(tree, {}, "al-01");
    expect(unmet.map((n) => n.id)).toEqual(["nm-07"]);
    expect(findNode(tree, "nm-07")?.unit.id).toBe("nm");
  });
});

describe("unitLessonMastered", () => {
  it("ignores the boss when counting", () => {
    const tree = withBossNodes(NMT_MATH);
    const nm = tree.units[0];
    if (!nm) throw new Error("nm unit missing");
    const first = lessonNodes(nm)[0];
    if (!first) throw new Error("first lesson missing");
    const { mastered, total } = unitLessonMastered(nm, bronze(first.id, "nm-boss"));
    expect(total).toBe(lessonNodes(nm).length);
    expect(mastered).toBe(1);
  });
});

describe("layoutUnit", () => {
  it("places one row per node and a consecutive spine", () => {
    const tree = withBossNodes(NMT_MATH);
    const nm = tree.units[0];
    if (!nm) throw new Error("nm unit missing");
    const layout = layoutUnit(nm);
    expect(layout.placed).toHaveLength(nm.nodes.length);
    expect(layout.height).toBe(nm.nodes.length * TREE_ROW);
    const spine = layout.edges.filter((e) => e.kind === "spine");
    expect(spine).toHaveLength(nm.nodes.length - 1);
  });

  it("draws extra prereq edges for skip-level parents, not for adjacent ones", () => {
    const tree = withBossNodes(NMT_MATH);
    const nm = tree.units[0];
    if (!nm) throw new Error("nm unit missing");
    const layout = layoutUnit(nm);
    // nm-04 requires nm-01 (skip) — should be a prereq edge
    const skip = layout.edges.filter((e) => e.kind === "prereq" && e.fromId === "nm-01" && e.toId === "nm-04");
    expect(skip).toHaveLength(1);
    // nm-02 requires nm-01 (adjacent) — spine only, no extra prereq edge
    const adj = layout.edges.filter((e) => e.kind === "prereq" && e.fromId === "nm-01" && e.toId === "nm-02");
    expect(adj).toHaveLength(0);
  });

  it("does not draw SVG edges for cross-unit prerequisites", () => {
    const tree = withBossNodes(NMT_MATH);
    const al = tree.units[1];
    if (!al) throw new Error("al unit missing");
    const layout = layoutUnit(al);
    expect(layout.edges.some((e) => e.fromId === "nm-07")).toBe(false);
  });

  it("edgePath is a straight line for the spine and a curve for skip prereqs", () => {
    const spine = edgePath({
      fromId: "a", toId: "b", x1: 28, y1: 34, x2: 28, y2: 102, kind: "spine",
    });
    expect(spine.startsWith("M ")).toBe(true);
    expect(spine).toContain("L ");
    const curve = edgePath({
      fromId: "a", toId: "c", x1: 28, y1: 34, x2: 28, y2: 238, kind: "prereq",
    });
    expect(curve).toContain("C ");
  });
});

describe("IELTS tree still grows bosses", () => {
  it("adds 4 bosses (Listening / Reading / Writing / Speaking)", () => {
    const tree = withBossNodes(IELTS);
    expect(tree.units.filter((u) => u.nodes.some(isBossNode))).toHaveLength(4);
    expect(canOpenNode(tree, {}, "l-01")).toBe(true);
    expect(canOpenNode(tree, {}, "l-02")).toBe(false);
  });
});
