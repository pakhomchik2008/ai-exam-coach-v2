import { describe, expect, it } from "vitest";
import {
  buildSpeakingCueSystem,
  buildSpeakingGradeSystem,
  isSpeakingTreeNode,
  parseSpeakingBand,
  parseSpeakingCue,
} from "./speaking";

describe("parseSpeakingCue", () => {
  it("defaults to Part 2 and keeps bullets", () => {
    const cue = parseSpeakingCue({
      title: "A teacher",
      prompt: "Describe a teacher who influenced you.",
      bullets: ["who", "when", "why"],
    });
    expect(cue.part).toBe(2);
    expect(cue.bullets).toHaveLength(3);
  });

  it("throws when the card has no prompt", () => {
    expect(() => parseSpeakingCue({ title: "" })).toThrow(/invalid speaking cue/);
  });
});

describe("parseSpeakingBand", () => {
  it("clamps to half-steps and 0–9", () => {
    const g = parseSpeakingBand({
      fluency: 12, lexical: 5.2, grammar: -1, pronunciation: 6.8,
      overall: 6.25, feedback: "You stayed on topic.",
    });
    expect(g.fluency).toBe(9);
    expect(g.lexical).toBe(5);
    expect(g.grammar).toBe(0);
    expect(g.pronunciation).toBe(7);
    expect(g.overall).toBe(6.5);
  });

  it("salvages raw prose", () => {
    const g = parseSpeakingBand("Too short for a band.");
    expect(g.feedback).toMatch(/Too short/);
    expect(g.overall).toBe(0);
  });
});

describe("helpers", () => {
  it("tags speaking tree ids", () => {
    expect(isSpeakingTreeNode("s-01")).toBe(true);
    expect(isSpeakingTreeNode("tf-speak-02")).toBe(true);
    expect(isSpeakingTreeNode("l-01")).toBe(false);
  });

  it("asks for JSON cue and bands", () => {
    expect(buildSpeakingCueSystem("Hometown", "ielts")).toMatch(/Part 2/);
    expect(buildSpeakingGradeSystem("Hometown", "ielts")).toMatch(/INFERRED/);
  });
});
