import { describe, expect, it } from "vitest";
import { greComposite, isGreQual, snapAwa, snapSection, writingScorePrompt } from "./gre-paper";

describe("GRE marking", () => {
  it("snaps sections to 130–170", () => {
    expect(snapSection(129)).toBe(130);
    expect(snapSection(171)).toBe(170);
    expect(snapSection(155.4)).toBe(155);
  });

  it("snaps AWA to half points", () => {
    expect(snapAwa(4.24)).toBe(4);
    expect(snapAwa(4.25)).toBe(4.5);
    expect(snapAwa(6.2)).toBe(6);
  });

  it("sums V+Q onto 260–340 and ignores missing sides", () => {
    expect(greComposite(160, 164)).toBe(324);
    expect(greComposite(160)).toBe(160);
    expect(greComposite(undefined, 170)).toBe(170);
    expect(greComposite()).toBeNull();
  });

  it("does not treat GMAT as GRE", () => {
    expect(isGreQual("gre")).toBe(true);
    expect(isGreQual("gmat")).toBe(false);
  });

  it("asks for a 0–6 Issue score, not IELTS bands", () => {
    const prompt = writingScorePrompt({ issue: "Governments should…", essay: "I agree…" });
    expect(prompt).toMatch(/0–6/);
    expect(prompt).toMatch(/Issue/);
    expect(prompt).not.toMatch(/band/i);
  });
});
