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
  grade: { kind: string; options?: string[] };
}

type Api = {
  EXAM_TYPES: ExamTypeEntry[];
  examType: (id: unknown) => ExamTypeEntry;
  resolveExamType: (list: ExamTypeEntry[], id: unknown) => ExamTypeEntry;
};

const api = window as unknown as Api;

describe("examType — known ids", () => {
  it.each(["gcse", "alevel", "sat", "nmt", "ib", "custom"])("resolves %s to itself", (id) => {
    expect(api.examType(id).id).toBe(id);
  });
});

describe("examType — unknown ids (audit #30)", () => {
  it.each([
    "a-level", // plausible misspelling of "alevel"
    "IELTS", // wrong case
    "pte", // a real exam that is not in the catalog
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
