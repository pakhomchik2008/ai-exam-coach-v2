import { describe, it, expect } from "vitest";
import { specFor, EXAM_SPECS } from "./exam-specs";

describe("specFor", () => {
  it("resolves a known qualification as official", () => {
    const nmt = EXAM_SPECS.nmt;
    if (!nmt) throw new Error("EXAM_SPECS.nmt missing — fixture drifted");
    const s = specFor("nmt", 5);
    expect(s.official).toBe(true);
    expect(s.questionCount).toBe(nmt.questionCount);
    expect(s.durationMin).toBe(nmt.durationMin);
  });

  it("falls back to the topic-count heuristic for an unlisted qualification", () => {
    const s = specFor("some_unlisted_quals", 4);
    expect(s.official).toBe(false);
    expect(s.questionCount).toBe(12); // 4 topics * 2 = 8, clamped up to the 12 floor
  });

  it("clamps the fallback question count between 12 and 24", () => {
    expect(specFor(null, 1).questionCount).toBe(12);
    expect(specFor(null, 100).questionCount).toBe(24);
  });

  it("uses 16 questions when there are no topics at all", () => {
    expect(specFor(null, 0).questionCount).toBe(16);
  });

  it("derives duration at 1.5 minutes per question for every known spec", () => {
    for (const [id, s] of Object.entries(EXAM_SPECS)) {
      expect(s.durationMin, id).toBe(Math.round(s.questionCount * 1.5));
    }
  });
});
