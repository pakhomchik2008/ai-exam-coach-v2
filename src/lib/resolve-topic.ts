/**
 * Bind a Learn/chat topic title back to an exam.
 *
 * The topic picker lists Learn-tree node titles. examViews store
 * `topicName`, and curriculum rows are sometimes `{ name }` objects.
 * Matching only `t.name` left Socratic/Fading/theory with no exam, so
 * the coach fell through to the UI language (English on a Bac paper).
 */

export type TopicHit = {
  examId: string;
  topicIdx: number;
  topicName: string;
  examName: string;
};

export type ExamViewLike = {
  id: string;
  name?: string;
  topics?: readonly unknown[];
};

export type TreeCatalog = {
  examId: string;
  examName: string;
  nodes: readonly { index: number; titles: readonly string[] }[];
};

export function topicLabel(topic: unknown): string {
  if (typeof topic === "string") return topic;
  if (!topic || typeof topic !== "object") return "";
  const row = topic as { topicName?: unknown; name?: unknown };
  if (typeof row.topicName === "string") return row.topicName;
  if (typeof row.name === "string") return row.name;
  return "";
}

function norm(s: string): string {
  return s.toLowerCase().trim();
}

export function titlesMatch(a: string, b: string): boolean {
  const left = norm(a);
  const right = norm(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

export function resolveTopicFromViews(
  topicName: string,
  examViews: readonly ExamViewLike[],
): TopicHit | null {
  if (!topicName) return null;
  for (const view of examViews) {
    const topics = view.topics || [];
    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      const label = topicLabel(topic);
      if (!titlesMatch(label, topicName)) continue;
      const idxRaw = topic && typeof topic === "object" && "topicIdx" in topic
        ? Number((topic as { topicIdx?: number }).topicIdx)
        : i;
      return {
        examId: view.id,
        topicIdx: Number.isFinite(idxRaw) ? idxRaw : i,
        topicName: label,
        examName: view.name || "",
      };
    }
  }
  return null;
}

export function resolveTopicFromTrees(
  topicName: string,
  catalogs: readonly TreeCatalog[],
): TopicHit | null {
  if (!topicName) return null;
  for (const catalog of catalogs) {
    for (const node of catalog.nodes) {
      if (!node.titles.some((title) => titlesMatch(title, topicName))) continue;
      return {
        examId: catalog.examId,
        topicIdx: node.index,
        topicName: node.titles[0] || topicName,
        examName: catalog.examName,
      };
    }
  }
  return null;
}
