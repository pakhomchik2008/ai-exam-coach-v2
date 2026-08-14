/**
 * Exam-type resolution (audit finding #30).
 *
 * `examType()` used to answer an unknown id with `EXAM_TYPES[1]` — A-Level. A
 * student whose exam id was misspelt, renamed in the DB, or simply not loaded
 * yet was silently handed A-Level's A*–E grade scale and AQA board list, with
 * nothing logged and nothing visibly wrong until their predicted grade came out
 * in the wrong units.
 *
 * The contract now: unknown ids resolve to "custom", the entry that exists for
 * exams we do not model.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "../bootstrap";

interface ExamTypeEntry {
  id: string;
  label: string;
  grade: { kind: string; options?: string[]; min?: number; max?: number; step?: number };
}

type Api = {
  EXAM_TYPES: ExamTypeEntry[];
  examType: (id: unknown) => ExamTypeEntry;
  resolveExamType: (list: ExamTypeEntry[], id: unknown) => ExamTypeEntry;
  isSectionBasedExam: (id: string) => boolean;
  suggestedQualificationId: (lastExam: { name?: string; qualificationId?: string } | null, profile: { country?: string } | null) => string;
};

const api = window as unknown as Api;

describe("examType — known ids", () => {
  it.each(["gcse", "alevel", "sat", "nmt", "ielts", "toefl", "duolingo", "ib", "bac", "gre", "gmat", "pte", "custom"])("resolves %s to itself", (id) => {
    expect(api.examType(id).id).toBe(id);
  });
});

describe("examType — unknown ids (audit #30)", () => {
  it.each([
    "a-level", // plausible misspelling of "alevel"
    "IELTS", // wrong case
    "lsat", // a real exam that is not in the catalog
    "renamed-in-db",
  ])("resolves %p to custom, not A-Level", (id) => {
    const resolved = api.examType(id);
    expect(resolved.id).toBe("custom");
    expect(resolved.id).not.toBe("alevel");
  });

  it("does not hand out A-Level's grade scale for an unknown exam", () => {
    const alevel = api.examType("alevel");
    const unknown = api.examType("definitely-not-a-real-exam");
    expect(unknown.grade.options).not.toEqual(alevel.grade.options);
  });

  // Nothing picked yet is a normal state in several flows, not a data problem.
  it.each([null, undefined, ""])("resolves %p to custom without complaining", (id) => {
    expect(api.examType(id).id).toBe("custom");
  });
});

describe("resolveExamType — reporting", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it("reports an unknown id instead of failing silently", () => {
    api.resolveExamType(api.EXAM_TYPES, `unseen-${Date.now()}`);
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0]?.[0])).toContain("unknown exam id");
  });

  it("reports each unknown id only once, so render loops cannot spam", () => {
    const id = `repeated-${Date.now()}`;
    api.resolveExamType(api.EXAM_TYPES, id);
    api.resolveExamType(api.EXAM_TYPES, id);
    api.resolveExamType(api.EXAM_TYPES, id);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("stays quiet for an empty id", () => {
    api.resolveExamType(api.EXAM_TYPES, null);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("resolveExamType — works against an arbitrary merged catalog", () => {
  // qualifications-store rebuilds examType over a DB-merged list whose order is
  // not the bundled one. Index-based fallback was meaningless there.
  const merged: ExamTypeEntry[] = [
    { id: "ielts", label: "IELTS", grade: { kind: "score" } },
    { id: "toefl", label: "TOEFL", grade: { kind: "score" } },
    { id: "custom", label: "Custom", grade: { kind: "scale", options: ["A"] } },
  ];

  it("falls back to custom regardless of position in the list", () => {
    expect(api.resolveExamType(merged, "nope").id).toBe("custom");
  });

  it("falls back to the first entry when the list has no custom", () => {
    const noCustom = merged.filter((e) => e.id !== "custom");
    expect(api.resolveExamType(noCustom, "nope").id).toBe("ielts");
  });
});

describe("language exams in the bundled catalog", () => {
  it("IELTS is a 0–9 half-band score, not GCSE 3–9", () => {
    const ielts = api.examType("ielts");
    expect(ielts.grade.kind).toBe("score");
    expect(ielts.grade.min).toBe(0);
    expect(ielts.grade.max).toBe(9);
    expect(ielts.grade.step).toBe(0.5);
    expect(api.isSectionBasedExam("ielts")).toBe(true);
  });

  it("does not attach a UK board list to IELTS", () => {
    const ielts = api.examType("ielts") as ExamTypeEntry & { boardOptions?: string[] };
    expect(ielts.boardOptions).toBeUndefined();
  });
});

describe("GRE in the bundled catalog", () => {
  it("is a 260–340 V+Q score and section-based", () => {
    const gre = api.examType("gre");
    expect(gre.grade.kind).toBe("score");
    expect(gre.grade.min).toBe(260);
    expect(gre.grade.max).toBe(340);
    expect(gre.grade.step).toBe(1);
    expect(api.isSectionBasedExam("gre")).toBe(true);
  });
});

describe("GMAT in the bundled catalog", () => {
  it("is Focus 205–805, not classic 200–800", () => {
    const gmat = api.examType("gmat");
    expect(gmat.grade.kind).toBe("score");
    expect(gmat.grade.min).toBe(205);
    expect(gmat.grade.max).toBe(805);
    expect(gmat.grade.step).toBe(10);
    expect(api.isSectionBasedExam("gmat")).toBe(true);
  });
});

describe("PTE in the bundled catalog", () => {
  it("is a 10–90 score and section-based", () => {
    const pte = api.examType("pte");
    expect(pte.grade.kind).toBe("score");
    expect(pte.grade.min).toBe(10);
    expect(pte.grade.max).toBe(90);
    expect(pte.grade.step).toBe(1);
    expect(api.isSectionBasedExam("pte")).toBe(true);
  });
});

describe("suggestedQualificationId", () => {
  it("reads the last exam's qualification", () => {
    expect(api.suggestedQualificationId({ qualificationId: "nmt", name: "Maths" }, {})).toBe("nmt");
  });

  it("infers NMT from the exam name when qualificationId is missing", () => {
    expect(api.suggestedQualificationId({ name: "NMT Українська мова" }, { country: "gb" })).toBe("nmt");
  });

  it("does not default a named NMT exam to GCSE", () => {
    expect(api.suggestedQualificationId({ name: "NMT Українська мова" }, {})).not.toBe("gcse");
  });

  it("infers GRE from the exam name", () => {
    expect(api.suggestedQualificationId({ name: "GRE General Test" }, { country: "us" })).toBe("gre");
  });

  it("infers GMAT Focus from the exam name, not GRE", () => {
    expect(api.suggestedQualificationId({ name: "GMAT Focus" }, {})).toBe("gmat");
    expect(api.suggestedQualificationId({ name: "GRE General Test" }, {})).not.toBe("gmat");
  });

  it("infers PTE Academic from the exam name, not IELTS", () => {
    expect(api.suggestedQualificationId({ name: "PTE Academic" }, {})).toBe("pte");
    expect(api.suggestedQualificationId({ name: "IELTS Academic" }, {})).not.toBe("pte");
  });
});
