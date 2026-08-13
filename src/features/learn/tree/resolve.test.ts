import { describe, expect, it } from "vitest";
import { nmtTreeSlug, treeForExam, treeKeyForExam } from "./resolve";
import { getTree } from "./index";

describe("nmtTreeSlug", () => {
  it("splits NMT language from NMT math", () => {
    expect(nmtTreeSlug({ name: "NMT Українська мова" })).toBe("nmt-ukr");
    expect(nmtTreeSlug({ name: "НМТ Математика" })).toBe("nmt");
    expect(nmtTreeSlug({ name: "NMT Mathematics" })).toBe("nmt");
  });

  it("does not treat literature as language", () => {
    expect(nmtTreeSlug({ name: "НМТ Українська література" })).toBe("nmt-lit");
  });

  it("returns null instead of guessing math", () => {
    expect(nmtTreeSlug({ name: "NMT" })).toBeNull();
    expect(nmtTreeSlug({ name: "Custom exam" })).toBeNull();
  });
});

describe("treeKeyForExam", () => {
  it("uses subject, not just qualificationId", () => {
    expect(treeKeyForExam({ name: "NMT Українська мова", qualificationId: "nmt" })).toBe("nmt-ukr");
    expect(treeKeyForExam({ name: "NMT Математика", qualificationId: "nmt" })).toBe("nmt");
    expect(treeKeyForExam({ name: "IELTS", qualificationId: "ielts" })).toBe("ielts");
  });

  it("does not fall through to math for SAT", () => {
    expect(treeKeyForExam({ name: "SAT", qualificationId: "sat" })).toBeNull();
  });
});

describe("treeForExam", () => {
  it("returns different trees for the two mandatory NMT papers", () => {
    const ukr = treeForExam({ name: "NMT Українська мова", qualificationId: "nmt" });
    const math = treeForExam({ name: "NMT Математика", qualificationId: "nmt" });
    expect(ukr?.examTaxonomy).toBe("nmt-ukr");
    expect(math?.examTaxonomy).toBe("nmt");
    expect(ukr).not.toBe(math);
    expect(getTree("nmt")?.examTaxonomy).toBe("nmt");
  });

  it("keeps node ids unique inside each NMT subject tree", () => {
    for (const key of ["nmt-ukr", "nmt-hist", "nmt-bio", "nmt-chem", "nmt-phys", "nmt-geo", "nmt-eng", "nmt-lit"]) {
      const tree = getTree(key);
      expect(tree, key).toBeTruthy();
      const ids = tree!.units.flatMap((u) => u.nodes.map((n) => n.id));
      expect(new Set(ids).size, key).toBe(ids.length);
    }
  });
});
