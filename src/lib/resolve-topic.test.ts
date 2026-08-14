import { describe, expect, it } from "vitest";
import {
  resolveTopicFromTrees,
  resolveTopicFromViews,
  titlesMatch,
  topicLabel,
} from "./resolve-topic";

describe("topicLabel", () => {
  it("reads topicName on examViews, not name", () => {
    expect(topicLabel({ topicName: "Mesure et incertitudes", topicIdx: 0 })).toBe("Mesure et incertitudes");
    expect(topicLabel({ name: "Dérivation" })).toBe("Dérivation");
    expect(topicLabel("La liberté")).toBe("La liberté");
    expect(topicLabel({ topicName: { name: "nope" } })).toBe("");
  });
});

describe("resolveTopicFromViews", () => {
  it("finds a Learn title stored as topicName", () => {
    const hit = resolveTopicFromViews("Mesure et incertitudes", [{
      id: "e1",
      name: "Bac Physique-Chimie",
      topics: [{ topicName: "Mesure et incertitudes", topicIdx: 0 }],
    }]);
    expect(hit?.examId).toBe("e1");
    expect(hit?.topicName).toBe("Mesure et incertitudes");
  });

  it("returns null when the title is only on the Learn tree", () => {
    expect(resolveTopicFromViews("Mesure et incertitudes", [{
      id: "e1",
      name: "Bac",
      topics: [{ topicName: "Unrelated curriculum row", topicIdx: 0 }],
    }])).toBeNull();
  });
});

describe("resolveTopicFromTrees", () => {
  const bacPc = [{
    examId: "e-bac",
    examName: "Bac Physique-Chimie",
    nodes: [
      { index: 0, titles: ["Mesure et incertitudes", "Вимірювання й похибки"] },
      { index: 1, titles: ["Lois de Newton"] },
    ],
  }];

  it("binds a tree node title to the Bac exam", () => {
    const hit = resolveTopicFromTrees("Mesure et incertitudes", bacPc);
    expect(hit).toEqual({
      examId: "e-bac",
      topicIdx: 0,
      topicName: "Mesure et incertitudes",
      examName: "Bac Physique-Chimie",
    });
  });

  it("matches the Ukrainian title of the same node", () => {
    expect(resolveTopicFromTrees("Вимірювання й похибки", bacPc)?.examId).toBe("e-bac");
  });
});

describe("titlesMatch", () => {
  it("is case-insensitive and ignores empty", () => {
    expect(titlesMatch("La Liberté", "la liberté")).toBe(true);
    expect(titlesMatch("", "x")).toBe(false);
  });
});
