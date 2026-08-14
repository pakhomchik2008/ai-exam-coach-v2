import { describe, expect, it } from "vitest";
import { isGmatQual, snapSection, snapTotal } from "./gmat-paper";

describe("GMAT Focus marking", () => {
  it("snaps the total onto 205–805 in tens (always ends in 5)", () => {
    expect(snapTotal(204)).toBe(205);
    expect(snapTotal(806)).toBe(805);
    expect(snapTotal(644)).toBe(645);
    expect(snapTotal(645)).toBe(645);
    expect(String(snapTotal(700)).endsWith("5")).toBe(true);
  });

  it("snaps sections to 60–90", () => {
    expect(snapSection(59)).toBe(60);
    expect(snapSection(91)).toBe(90);
    expect(snapSection(82.4)).toBe(82);
  });

  it("does not treat GRE as GMAT", () => {
    expect(isGmatQual("gmat")).toBe(true);
    expect(isGmatQual("gre")).toBe(false);
  });
});
