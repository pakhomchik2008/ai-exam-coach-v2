import { describe, expect, it } from "vitest";
import {
  canonicalQualification,
  coachLanguageDirective,
  copyLangFor,
  inferCoachQual,
  paperLanguageDirective,
  paperLanguageFor,
  paperQualForExam,
} from "./paper-language";

describe("paperLanguageFor", () => {
  it("maps each exam to its official paper language", () => {
    expect(paperLanguageFor("nmt")).toBe("uk");
    expect(paperLanguageFor("nmt-ukr")).toBe("uk");
    expect(paperLanguageFor("nmt-math")).toBe("uk");
    expect(paperLanguageFor("nmt-eng")).toBe("en");
    expect(paperLanguageFor("nmt-de")).toBe("de");
    expect(paperLanguageFor("nmt-fr")).toBe("fr");
    expect(paperLanguageFor("nmt-es")).toBe("es");
    expect(paperLanguageFor("abitur")).toBe("de");
    expect(paperLanguageFor("ielts")).toBe("en");
    expect(paperLanguageFor("alevel")).toBe("en");
    expect(paperLanguageFor("sat")).toBe("en");
    expect(paperLanguageFor("matura")).toBe("pl");
    expect(paperLanguageFor("matura-math")).toBe("pl");
    expect(paperLanguageFor("matura-eng")).toBe("en");
    expect(paperLanguageFor("matura-de")).toBe("de");
    expect(paperLanguageFor("bac")).toBe("fr");
    expect(paperLanguageFor("bac-math")).toBe("fr");
    expect(paperLanguageFor("gre")).toBe("en");
    expect(paperLanguageFor("gmat")).toBe("en");
    expect(paperLanguageFor("pte")).toBe("en");
  });

  it("is case-insensitive and ignores unknown quals", () => {
    expect(paperLanguageFor("NMT")).toBe("uk");
    expect(paperLanguageFor("custom")).toBeNull();
    expect(paperLanguageFor(null)).toBeNull();
  });
});

describe("paperQualForExam", () => {
  it("keeps NMT English / German as their own paper, not generic nmt", () => {
    expect(paperQualForExam({ qualificationId: "nmt", name: "NMT Англійська мова" })).toBe("nmt-eng");
    expect(paperQualForExam({ qualificationId: "nmt", name: "NMT English" })).toBe("nmt-eng");
    expect(paperQualForExam({ qualificationId: "nmt", name: "НМТ Німецька мова" })).toBe("nmt-de");
    expect(paperQualForExam({ qualificationId: "nmt", name: "NMT Deutsch" })).toBe("nmt-de");
    expect(paperQualForExam({ qualificationId: "nmt", name: "NMT Математика" })).toBe("nmt");
    expect(paperQualForExam({ qualificationId: "nmt", name: "НМТ Українська мова" })).toBe("nmt");
    expect(paperQualForExam({ qualificationId: "nmt", name: "NMT French" })).toBe("nmt-fr");
  });

  it("keeps Matura English / German as their own paper, not generic matura", () => {
    expect(paperQualForExam({ qualificationId: "matura", name: "Matura Język angielski" })).toBe("matura-eng");
    expect(paperQualForExam({ qualificationId: "matura", name: "Matura English" })).toBe("matura-eng");
    expect(paperQualForExam({ qualificationId: "matura", name: "Matura Język niemiecki" })).toBe("matura-de");
    expect(paperQualForExam({ qualificationId: "matura", name: "Matura Matematyka" })).toBe("matura");
    expect(paperQualForExam({ qualificationId: "matura", name: "Matura Język polski" })).toBe("matura");
  });
});

describe("copyLangFor", () => {
  it("uses the paper language, not the UI, for NMT trees", () => {
    expect(copyLangFor("nmt", "en")).toBe("uk");
    expect(copyLangFor("nmt-eng", "uk")).toBe("en");
    expect(copyLangFor("nmt-de", "en")).toBe("de");
    expect(copyLangFor(null, "fr")).toBe("fr");
  });

  it("reads NMT English from the exam name, not the family id", () => {
    expect(copyLangFor(paperQualForExam({ qualificationId: "nmt", name: "NMT Математика" }), "en")).toBe("uk");
    expect(copyLangFor(paperQualForExam({ qualificationId: "nmt", name: "NMT English" }), "uk")).toBe("en");
  });

  it("uses Polish for Matura, English for Język angielski", () => {
    expect(copyLangFor("matura", "en")).toBe("pl");
    expect(copyLangFor("matura-math", "en")).toBe("pl");
    expect(copyLangFor("matura-eng", "uk")).toBe("en");
    expect(copyLangFor(paperQualForExam({ qualificationId: "matura", name: "Matura Matematyka" }), "en")).toBe("pl");
    expect(copyLangFor(paperQualForExam({ qualificationId: "matura", name: "Matura Język angielski" }), "uk")).toBe("en");
  });
});

describe("canonicalQualification", () => {
  it("collapses Learn tree slugs onto the exam", () => {
    expect(canonicalQualification("nmt-ukr")).toBe("nmt");
    expect(canonicalQualification("alevel-chem")).toBe("alevel");
    expect(canonicalQualification("bac-math")).toBe("bac");
    expect(canonicalQualification("gre")).toBe("gre");
    expect(canonicalQualification("gmat")).toBe("gmat");
    expect(canonicalQualification("pte")).toBe("pte");
  });
});

describe("paperLanguageDirective", () => {
  it("tells the model to ignore the UI language", () => {
    const nmt = paperLanguageDirective("nmt-ukr");
    expect(nmt).toMatch(/Ukrainian/);
    expect(nmt).toMatch(/ignore/i);
    expect(paperLanguageDirective("ielts")).toMatch(/English/);
    expect(paperLanguageDirective("bac")).toMatch(/French/);
    expect(paperLanguageDirective("nope")).toBe("");
  });
});

describe("coachLanguageDirective", () => {
  it("forces NMT chat into Ukrainian", () => {
    expect(coachLanguageDirective("nmt")).toMatch(/Ukrainian/);
    expect(coachLanguageDirective("nmt")).toMatch(/chat/i);
  });

  it("keeps NMT English / German in the paper language", () => {
    expect(coachLanguageDirective("nmt-eng")).toMatch(/English/);
    expect(coachLanguageDirective("nmt-eng")).toMatch(/No Ukrainian/);
    expect(coachLanguageDirective("nmt-de")).toMatch(/German/);
  });

  it("keeps Matura English in English, not Polish", () => {
    expect(coachLanguageDirective("matura")).toMatch(/Polish/);
    expect(coachLanguageDirective("matura-eng")).toMatch(/English/);
    expect(coachLanguageDirective("matura-eng")).toMatch(/No Polish/);
    expect(coachLanguageDirective("matura-eng")).not.toMatch(/Respond ENTIRELY in Polish/);
    expect(paperLanguageDirective("matura-eng")).toMatch(/Do not translate into Polish/);
  });
});

describe("inferCoachQual", () => {
  it("prefers an explicit paper, then the topic exam, then a sole student exam", () => {
    expect(inferCoachQual({ paperQual: "sat", topicExamQual: "nmt", studentQuals: ["nmt"] })).toBe("sat");
    expect(inferCoachQual({ topicExamQual: "nmt", studentQuals: ["ielts"] })).toBe("nmt");
    expect(inferCoachQual({ studentQuals: ["nmt", "nmt"] })).toBe("nmt");
    expect(inferCoachQual({ studentQuals: ["nmt-ukr", "nmt-math"] })).toBe("nmt-ukr");
    expect(inferCoachQual({ studentQuals: ["nmt", "ielts"] })).toBeNull();
  });

  it("does not force Ukrainian onto NMT English when the student also has NMT math", () => {
    expect(inferCoachQual({ studentQuals: ["nmt", "nmt-eng"] })).toBeNull();
    expect(inferCoachQual({ topicExamQual: "nmt-eng", studentQuals: ["nmt", "nmt-eng"] })).toBe("nmt-eng");
    expect(inferCoachQual({ studentQuals: ["nmt-eng"] })).toBe("nmt-eng");
    expect(inferCoachQual({ studentQuals: ["nmt-de"] })).toBe("nmt-de");
  });
});
