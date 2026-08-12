import { describe, it, expect } from "vitest";
import { mapUiLangToLocale, textForSpeech } from "./speech";

describe("mapUiLangToLocale", () => {
  it("maps known ui codes to BCP-47", () => {
    expect(mapUiLangToLocale("en")).toBe("en-US");
    expect(mapUiLangToLocale("uk")).toBe("uk-UA");
    expect(mapUiLangToLocale("ru")).toBe("ru-RU");
    expect(mapUiLangToLocale("fr")).toBe("fr-FR");
    expect(mapUiLangToLocale("de")).toBe("de-DE");
  });

  it("falls back to en-US for unknown or missing input", () => {
    expect(mapUiLangToLocale(null)).toBe("en-US");
    expect(mapUiLangToLocale(undefined)).toBe("en-US");
    expect(mapUiLangToLocale("zz")).toBe("en-US");
  });
});

describe("textForSpeech", () => {
  it("strips LaTeX delimiters and keeps prose", () => {
    expect(textForSpeech("Solve $x^2 + 1$ for x")).toContain("Solve");
    expect(textForSpeech("Solve $x^2 + 1$ for x")).not.toContain("$");
  });

  it("expands \\frac{a}{b} to natural speech", () => {
    const out = textForSpeech("Simplify \\frac{a}{b} first");
    expect(out).toContain("a over b");
  });

  it("expands \\sqrt{n}", () => {
    const out = textForSpeech("Compute \\sqrt{2}");
    expect(out).toContain("square root of 2");
  });

  it("strips HTML tags", () => {
    expect(textForSpeech("Hello <strong>world</strong>")).not.toContain("<");
    expect(textForSpeech("Hello <strong>world</strong>")).toContain("world");
  });

  it("strips markdown emphasis", () => {
    expect(textForSpeech("**Bold** and *italic* and `code`")).not.toMatch(/[*_`]/);
  });

  it("collapses whitespace", () => {
    expect(textForSpeech("a   b\n\n c ")).toBe("a b c");
  });

  it("returns empty string for empty input", () => {
    expect(textForSpeech("")).toBe("");
  });
});
