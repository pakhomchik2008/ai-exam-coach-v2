import { describe, it, expect } from "vitest";
import { specFor } from "./exam-specs";

describe("specFor", () => {
  it("uses the official NMT math sitting when the subject is named", () => {
    const s = specFor("nmt", 5, "NMT Математика");
    expect(s.official).toBe(true);
    expect(s.questionCount).toBe(22);
    expect(s.durationMin).toBe(60);
  });

  it("falls back to the topic-count heuristic for an unlisted qualification", () => {
    const s = specFor("some_unlisted_quals", 4);
    expect(s.official).toBe(false);
    expect(s.questionCount).toBe(12);
  });

  it("clamps the fallback question count between 12 and 24", () => {
    expect(specFor(null, 1).questionCount).toBe(12);
    expect(specFor(null, 100).questionCount).toBe(24);
  });

  it("uses 16 questions when there are no topics at all", () => {
    expect(specFor(null, 0).questionCount).toBe(16);
  });

  it("does not treat a family id as an official paper", () => {
    expect(specFor("gcse", 8).official).toBe(false);
    expect(specFor("nmt", 8).official).toBe(false);
  });
});
