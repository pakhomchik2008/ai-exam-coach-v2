import { describe, expect, it } from "vitest";
import { alevelTreeSlug, nmtTreeSlug, treeForExam, treeKeyForExam } from "./resolve";
import { availableTaxonomies, getTree } from "./index";

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

  it("opens the combined SAT tree instead of NMT math", () => {
    expect(treeKeyForExam({ name: "SAT", qualificationId: "sat" })).toBe("sat");
    expect(treeKeyForExam({ name: "SAT Mathematics", qualificationId: "sat" })).toBe("sat");
    expect(treeForExam({ name: "SAT", qualificationId: "sat" })?.examTaxonomy).toBe("sat");
  });

  it("opens section exams as one tree", () => {
    expect(treeKeyForExam({ name: "ACT", qualificationId: "act" })).toBe("act");
    expect(treeKeyForExam({ name: "TOEFL", qualificationId: "toefl" })).toBe("toefl");
    expect(treeKeyForExam({ name: "Duolingo", qualificationId: "duolingo" })).toBe("duolingo");
    expect(treeKeyForExam({ name: "GRE", qualificationId: "gre" })).toBe("gre");
    expect(treeKeyForExam({ name: "GRE Verbal", qualificationId: "gre" })).toBe("gre");
    expect(getTree("gre")?.examTaxonomy).toBe("gre");
  });

  it("splits GCSE / AP / Matura subjects", () => {
    expect(treeKeyForExam({ name: "GCSE Mathematics", qualificationId: "gcse" })).toBe("gcse-math");
    expect(treeKeyForExam({ name: "GCSE Combined Science", qualificationId: "gcse" })).toBe("gcse-sci");
    expect(treeKeyForExam({ name: "AP Calculus BC", qualificationId: "ap" })).toBe("ap-calc-bc");
    expect(treeKeyForExam({ name: "AP Calculus AB", qualificationId: "ap" })).toBe("ap-calc-ab");
    expect(treeKeyForExam({ name: "Matura Matematyka", qualificationId: "matura" })).toBe("matura-math");
    expect(treeKeyForExam({ name: "Abitur Deutsch", qualificationId: "abitur" })).toBe("abitur-de");
    expect(treeKeyForExam({ name: "Bac Mathématiques", qualificationId: "bac" })).toBe("bac-math");
    expect(treeKeyForExam({ name: "Baccalauréat Français", qualificationId: "bac" })).toBe("bac-fr");
    expect(treeKeyForExam({ name: "Bac Philosophie", qualificationId: "bac" })).toBe("bac-philo");
    expect(treeKeyForExam({ name: "Bac Grand oral", qualificationId: "bac" })).toBe("bac-go");
    expect(treeKeyForExam({ name: "Bac Physique-Chimie", qualificationId: "bac" })).toBe("bac-pc");
  });

  it("still finds SAT when the stored qualificationId is a stale GCSE", () => {
    expect(treeKeyForExam({ name: "SAT Mathematics", qualificationId: "gcse" })).toBe("sat");
  });

  it("does not treat GMAT as GRE", () => {
    expect(treeKeyForExam({ name: "GMAT Focus", qualificationId: "custom" })).not.toBe("gre");
  });

  it("does not treat French Bac as IB", () => {
    expect(treeKeyForExam({ name: "Baccalauréat Mathématiques", qualificationId: "ib" })).toBe("bac-math");
    expect(treeKeyForExam({ name: "International Baccalaureate Mathematics AA", qualificationId: "ib" })).toBe("ib-aa");
  });

  it("still finds NMT language when the stored qualificationId is a stale GCSE", () => {
    expect(treeKeyForExam({ name: "NMT Українська мова", qualificationId: "gcse" })).toBe("nmt-ukr");
    expect(treeKeyForExam({ name: "НМТ Математика", qualificationId: "gcse" })).toBe("nmt");
  });

  it("splits A-Level subjects instead of one shared tree", () => {
    expect(treeKeyForExam({ name: "A-Level Mathematics", qualificationId: "alevel" })).toBe("alevel-math");
    expect(treeKeyForExam({ name: "A-Level Further Mathematics", qualificationId: "alevel" })).toBe("alevel-fm");
    expect(treeKeyForExam({ name: "A-Level Chemistry", qualificationId: "alevel" })).toBe("alevel-chem");
    expect(treeKeyForExam({ name: "A-Level English Literature", qualificationId: "alevel" })).toBe("alevel-lit");
    expect(treeKeyForExam({ name: "A-Level English Language", qualificationId: "alevel" })).toBe("alevel-eng");
  });

  it("still finds A-Level maths when the stored qualificationId is a stale GCSE", () => {
    expect(treeKeyForExam({ name: "A-Level Mathematics", qualificationId: "gcse" })).toBe("alevel-math");
  });

  it("does not register a bare alevel key", () => {
    expect(getTree("alevel")).toBeNull();
    expect(treeKeyForExam({ name: "A-Level", qualificationId: "alevel" })).toBeNull();
  });
});

describe("alevelTreeSlug", () => {
  it("keeps Further Maths off the Maths tree", () => {
    expect(alevelTreeSlug({ name: "A-Level Further Maths" })).toBe("alevel-fm");
    expect(alevelTreeSlug({ name: "A-Level Mathematics" })).toBe("alevel-math");
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

  it("returns different trees for A-Level Maths and Chemistry", () => {
    const math = treeForExam({ name: "A-Level Mathematics", qualificationId: "alevel" });
    const chem = treeForExam({ name: "A-Level Chemistry", qualificationId: "alevel" });
    expect(math?.examTaxonomy).toBe("alevel-math");
    expect(chem?.examTaxonomy).toBe("alevel-chem");
    expect(math).not.toBe(chem);
  });

  it("does not register a bare subject-split qualification key", () => {
    expect(getTree("gcse")).toBeNull();
    expect(getTree("ap")).toBeNull();
    expect(getTree("ib")).toBeNull();
    expect(getTree("matura")).toBeNull();
    expect(getTree("abitur")).toBeNull();
    expect(getTree("bac")).toBeNull();
  });

  it("keeps node ids unique inside every registered tree", () => {
    for (const key of availableTaxonomies()) {
      const tree = getTree(key);
      expect(tree, key).toBeTruthy();
      const ids = tree!.units.flatMap((u) => u.nodes.map((n) => n.id));
      expect(new Set(ids).size, key).toBe(ids.length);
    }
  });

  it("keeps node ids unique inside each A-Level subject tree", () => {
    for (const key of [
      "alevel-math", "alevel-fm", "alevel-phys", "alevel-chem", "alevel-bio",
      "alevel-cs", "alevel-econ", "alevel-bus", "alevel-eng", "alevel-lit",
      "alevel-hist", "alevel-geo", "alevel-psy", "alevel-pol",
      "alevel-fr", "alevel-de", "alevel-es",
    ]) {
      const tree = getTree(key);
      expect(tree, key).toBeTruthy();
      const ids = tree!.units.flatMap((u) => u.nodes.map((n) => n.id));
      expect(new Set(ids).size, key).toBe(ids.length);
    }
  });
});
