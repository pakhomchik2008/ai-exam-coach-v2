import { describe, expect, it } from "vitest";
import { isPteQual, snapScore, writingScorePrompt } from "./pte-paper";

describe("PTE Academic marking", () => {
  it("snaps overall and skills onto 10–90", () => {
    expect(snapScore(9)).toBe(10);
    expect(snapScore(91)).toBe(90);
    expect(snapScore(64.4)).toBe(64);
    expect(snapScore(64.5)).toBe(65);
  });

  it("does not treat IELTS or PTE Core as a different scale here", () => {
    expect(isPteQual("pte")).toBe(true);
    expect(isPteQual("ielts")).toBe(false);
    expect(isPteQual("toefl")).toBe(false);
  });

  it("asks for a 10–90 essay score, not IELTS bands", () => {
    const prompt = writingScorePrompt({ prompt: "Agree or disagree…", essay: "I agree…" });
    expect(prompt).toMatch(/10–90/);
    expect(prompt).toMatch(/PTE Academic/);
    expect(prompt).not.toMatch(/band/i);
    expect(prompt).not.toMatch(/0–6/);
  });
});
