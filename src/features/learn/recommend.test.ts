import { describe, expect, it } from "vitest";
import { recommendLearnMethod } from "./recommend";

describe("recommendLearnMethod", () => {
  it("sends a first visit to theory", () => {
    expect(recommendLearnMethod({ firstVisit: true })).toBe("theory");
  });

  it("sends confusion to Socratic and a weak drill to fading", () => {
    expect(recommendLearnMethod({ firstVisit: false, saidConfused: true })).toBe("socratic");
    expect(recommendLearnMethod({ firstVisit: false, drillAccuracy: 0.3 })).toBe("fading");
  });

  it("sends post-Silver review to Feynman", () => {
    expect(recommendLearnMethod({ firstVisit: false, afterSilver: true })).toBe("feynman");
  });
});
