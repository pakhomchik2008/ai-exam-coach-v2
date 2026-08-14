import { describe, expect, it } from "vitest";
import {
  BAC_TERMINAL_COEFFS,
  isBacQual,
  mentionFromMoyenne,
  snapNote,
  terminalMoyenne,
  writingScorePrompt,
} from "./bac-paper";

describe("Bac /20 marking", () => {
  it("snaps to half points like a bulletin", () => {
    expect(snapNote(12.24)).toBe(12);
    expect(snapNote(12.25)).toBe(12.5);
    expect(snapNote(16.7)).toBe(16.5);
    expect(snapNote(21)).toBe(20);
    expect(snapNote(-1)).toBe(0);
  });

  it("weights terminal papers by the published coefficients", () => {
    const sum = Object.values(BAC_TERMINAL_COEFFS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(60);
    expect(terminalMoyenne({
      francaisEcrit: 10,
      francaisOral: 10,
      philosophie: 10,
      specialite1: 10,
      specialite2: 10,
      grandOral: 10,
    })).toBe(10);
    // Two 16-coeff spécialités at 16, everything else 10 → above 12.
    const mixed = terminalMoyenne({
      francaisEcrit: 10,
      francaisOral: 10,
      philosophie: 10,
      specialite1: 16,
      specialite2: 16,
      grandOral: 10,
    });
    expect(mixed).toBeGreaterThanOrEqual(12);
    expect(mixed).toBeLessThan(14);
  });

  it("omits missing papers instead of zeroing them", () => {
    expect(terminalMoyenne({ philosophie: 14 })).toBe(14);
    expect(terminalMoyenne({})).toBeNull();
  });

  it("maps moyenne onto legal mentions", () => {
    expect(mentionFromMoyenne(7.5)).toBe("ajourne");
    expect(mentionFromMoyenne(8)).toBe("rattrapage");
    expect(mentionFromMoyenne(9.5)).toBe("rattrapage");
    expect(mentionFromMoyenne(10)).toBe("passable");
    expect(mentionFromMoyenne(12)).toBe("assez-bien");
    expect(mentionFromMoyenne(14)).toBe("bien");
    expect(mentionFromMoyenne(16)).toBe("tres-bien");
    expect(mentionFromMoyenne(18)).toBe("tres-bien");
  });

  it("treats bac-* tree slugs as Bac", () => {
    expect(isBacQual("bac")).toBe(true);
    expect(isBacQual("bac-math")).toBe(true);
    expect(isBacQual("ib")).toBe(false);
  });

  it("asks the model for a /20 JSON rubric, not IELTS bands", () => {
    const prompt = writingScorePrompt({
      kind: "philosophie",
      subject: "La liberté consiste-t-elle à faire ce que l'on veut ?",
      essay: "On croit souvent…",
    });
    expect(prompt).toMatch(/sur 20/);
    expect(prompt).not.toMatch(/band/i);
    expect(prompt).toMatch(/"overall":12\.5/);
  });
});
