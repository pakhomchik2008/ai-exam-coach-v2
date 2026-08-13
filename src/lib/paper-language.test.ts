import { describe, expect, it } from "vitest";
import {
  canonicalQualification,
  coachLanguageDirective,
  inferCoachQual,
  paperLanguageDirective,
  paperLanguageFor,
} from "./paper-language";

describe("paperLanguageFor", () => {
  it("maps each exam to its official paper language", () => {
    expect(paperLanguageFor("nmt")).toBe("uk");
    expect(paperLanguageFor("nmt-ukr")).toBe("uk");
    expect(paperLanguageFor("nmt-math")).toBe("uk");
    expect(paperLanguageFor("abitur")).toBe("de");
    expect(paperLanguageFor("ielts")).toBe("en");
    expect(paperLanguageFor("alevel")).toBe("en");
    expect(paperLanguageFor("sat")).toBe("en");
    expect(paperLanguageFor("matura")).toBe("pl");
  });

  it("is case-insensitive and ignores unknown quals", () => {
    expect(paperLanguageFor("NMT")).toBe("uk");
    expect(paperLanguageFor("custom")).toBeNull();
    expect(paperLanguageFor(null)).toBeNull();
  });
});

describe("canonicalQualification", () => {
  it("collapses Learn tree slugs onto the exam", () => {
    expect(canonicalQualification("nmt-ukr")).toBe("nmt");
    expect(canonicalQualification("alevel-chem")).toBe("alevel");
  });
});

describe("paperLanguageDirective", () => {
  it("tells the model to ignore the UI language", () => {
    const nmt = paperLanguageDirective("nmt-ukr");
    expect(nmt).toMatch(/Ukrainian/);
    expect(nmt).toMatch(/ignore/i);
    expect(paperLanguageDirective("ielts")).toMatch(/English/);
    expect(paperLanguageDirective("nope")).toBe("");
  });
});

describe("coachLanguageDirective", () => {
  it("forces NMT chat into Ukrainian", () => {
    expect(coachLanguageDirective("nmt")).toMatch(/Ukrainian/);
    expect(coachLanguageDirective("nmt")).toMatch(/chat/i);
  });
});

describe("inferCoachQual", () => {
  it("prefers an explicit paper, then the topic exam, then a sole student exam", () => {
    expect(inferCoachQual({ paperQual: "sat", topicExamQual: "nmt", studentQuals: ["nmt"] })).toBe("sat");
    expect(inferCoachQual({ topicExamQual: "nmt", studentQuals: ["ielts"] })).toBe("nmt");
    expect(inferCoachQual({ studentQuals: ["nmt", "nmt"] })).toBe("nmt");
    expect(inferCoachQual({ studentQuals: ["nmt-ukr", "nmt-math"] })).toBe("nmt");
    expect(inferCoachQual({ studentQuals: ["nmt", "ielts"] })).toBeNull();
  });
});
