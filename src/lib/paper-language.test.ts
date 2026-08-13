import { describe, expect, it } from "vitest";
import { paperLanguageDirective, paperLanguageFor } from "./paper-language";

describe("paperLanguageFor", () => {
  it("maps each exam to its official paper language", () => {
    expect(paperLanguageFor("nmt")).toBe("uk");
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

describe("paperLanguageDirective", () => {
  it("tells the model to ignore the UI language", () => {
    const nmt = paperLanguageDirective("nmt");
    expect(nmt).toMatch(/Ukrainian/);
    expect(nmt).toMatch(/ignore/i);
    expect(paperLanguageDirective("ielts")).toMatch(/English/);
    expect(paperLanguageDirective("nope")).toBe("");
  });
});
