// AI Exam Coach — Learn (Phase 3.7e) — per-unit SVG skill tree.
//
// Lines live in an SVG gutter; labels stay HTML so long Ukrainian titles
// wrap instead of getting clipped by a viewBox. Click target is the whole
// row. Lock state is derived (see tree/locks.ts), never stored.

import {
  canOpenNode,
  edgePath,
  isMastered,
  layoutUnit,
  TREE_GUTTER,
  TREE_R,
  type NodeProgressMap,
} from "./locks";
import { isBossNode, localize, type LearnNode, type LearnTree, type LearnUnit } from "./schema";

const GLYPH: Record<string, { fill: string; stroke: string }> = {
  locked:    { fill: "transparent", stroke: "var(--slate-400)" },
  unlocked:  { fill: "var(--surface-card)", stroke: "var(--indigo-600)" },
  bronze:    { fill: "#b0752c", stroke: "#b0752c" },
  silver:    { fill: "#8892a8", stroke: "#8892a8" },
  gold:      { fill: "#d4a017", stroke: "#d4a017" },
  legendary: { fill: "#7b3ff2", stroke: "#7b3ff2" },
};

function glyphFor(mastery: string | undefined, open: boolean): { fill: string; stroke: string } {
  if (!open && !isMastered(mastery)) return GLYPH.locked as { fill: string; stroke: string };
  return (GLYPH[mastery || "unlocked"] || GLYPH.unlocked) as { fill: string; stroke: string };
}

export function UnitSkillTree({
  unit,
  tree,
  progress,
  lang,
  onSelect,
}: {
  unit: LearnUnit;
  tree: LearnTree;
  progress: NodeProgressMap;
  lang: string;
  onSelect: (node: LearnNode) => void;
}) {
  const layout = layoutUnit(unit);
  const lessons = unit.nodes.filter((n) => !isBossNode(n));
  const masteredLessons = lessons.filter((n) => isMastered(progress[n.id]?.mastery)).length;
  const boss = unit.nodes.find(isBossNode);
  const bossDone = boss ? isMastered(progress[boss.id]?.mastery) : false;

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-strong)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {localize(unit.title, lang)}
        </h2>
        <span style={{ fontSize: 11, color: "var(--text-faint)", whiteSpace: "nowrap" }}>
          {masteredLessons}/{lessons.length}
          {bossDone ? " · boss" : ""}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "stretch" }}>
        <svg
          width={TREE_GUTTER}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          aria-hidden="true"
          style={{ flexShrink: 0, overflow: "visible" }}
        >
          {layout.edges.map((e) => (
            <path
              key={`${e.kind}-${e.fromId}-${e.toId}`}
              d={edgePath(e)}
              fill="none"
              stroke={e.kind === "spine" ? "var(--border-default)" : "var(--indigo-300, #a5b4fc)"}
              strokeWidth={e.kind === "spine" ? 2 : 1.5}
              strokeDasharray={e.kind === "prereq" ? "4 3" : undefined}
            />
          ))}
          {layout.placed.map((p) => {
            const open = canOpenNode(tree, progress, p.id);
            const mastery = progress[p.id]?.mastery;
            const g = glyphFor(mastery, open);
            if (p.isBoss) {
              const r = TREE_R + 2;
              const pts = `${p.x},${p.y - r} ${p.x + r},${p.y} ${p.x},${p.y + r} ${p.x - r},${p.y}`;
              return (
                <polygon
                  key={p.id}
                  points={pts}
                  fill={g.fill}
                  stroke={g.stroke}
                  strokeWidth={2}
                />
              );
            }
            return (
              <circle
                key={p.id}
                cx={p.x}
                cy={p.y}
                r={TREE_R}
                fill={g.fill}
                stroke={g.stroke}
                strokeWidth={2}
                strokeDasharray={!open && !isMastered(mastery) ? "3 2" : undefined}
              />
            );
          })}
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          {layout.placed.map((p) => {
            const open = canOpenNode(tree, progress, p.id);
            const mastery = progress[p.id]?.mastery || "unlocked";
            const locked = !open && !isMastered(mastery);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p.node)}
                aria-disabled={locked}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  height: 68,
                  width: "100%",
                  padding: "0 12px",
                  background: p.isBoss ? "var(--indigo-50, var(--surface-muted))" : "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--border-default)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "var(--font-sans)",
                  opacity: locked ? 0.55 : 1,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-strong)" }}>
                    {localize(p.node.title, lang)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
                    {p.isBoss
                      ? `~${p.node.estimatedMinutes} min · unit final`
                      : `~${p.node.estimatedMinutes} min · complexity ${p.node.complexity}/5`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
