/**
 * Tier ladder tests.
 *
 * These exist to pin down user-reported bug #11: only the `legend` tier carries
 * `theme: true`, so levelling up through the first four tiers changes nothing
 * about the background. The test below asserts the CURRENT (broken) state
 * deliberately and is marked so — Phase 2 flips it, and the flip should be a
 * visible, reviewed change rather than something that quietly starts passing.
 */
import { describe, it, expect } from "vitest";
import "../bootstrap";

interface Tier {
  id: string;
  minLevel: number;
  theme: boolean;
  title: Record<string, string>;
}

type TierApi = {
  XP_TIERS: Tier[];
  tierForLevel: (level: number) => Tier;
  tierTitle: (tier: Tier, langCode: string) => string;
};

const api = window as unknown as TierApi;

describe("XP_TIERS ladder", () => {
  it("has five tiers in ascending level order", () => {
    expect(api.XP_TIERS).toHaveLength(5);
    const levels = api.XP_TIERS.map((t) => t.minLevel);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });

  it("starts at level 1 so there is no ungraded gap", () => {
    expect(api.XP_TIERS[0]!.minLevel).toBe(1);
  });

  it("gives every tier a title in all five shipped languages", () => {
    for (const tier of api.XP_TIERS) {
      for (const lang of ["en", "uk", "ru", "fr", "de"]) {
        expect(tier.title[lang], `${tier.id}.${lang}`).toBeTruthy();
      }
    }
  });
});

describe("tierForLevel", () => {
  it.each([
    [1, "novice"],
    [2, "novice"],
    [3, "scholar"],
    [4, "scholar"],
    [5, "adept"],
    [7, "adept"],
    [8, "master"],
    [11, "master"],
    [12, "legend"],
    [99, "legend"],
  ])("maps level %i to %s", (level, expected) => {
    expect(api.tierForLevel(level).id).toBe(expected);
  });

  it("clamps a below-range level to the first tier", () => {
    expect(api.tierForLevel(0).id).toBe("novice");
    expect(api.tierForLevel(-5).id).toBe("novice");
  });
});

describe("tierTitle", () => {
  it("falls back to English for an unknown language", () => {
    const novice = api.tierForLevel(1);
    expect(api.tierTitle(novice, "zz")).toBe(novice.title["en"]);
  });
});

describe("BUG #11 — tier theming is not wired up for 4 of 5 tiers", () => {
  // Documented in docs/audit.md. Phase 2 sets `theme: true` on all five and
  // adds the matching gradient sets to tiers.css; this assertion should fail
  // loudly at that point so the change is reviewed, not silently absorbed.
  it("currently themes only `legend` — flip this when Phase 2 lands", () => {
    const themed = api.XP_TIERS.filter((t) => t.theme).map((t) => t.id);
    expect(themed).toEqual(["legend"]);
  });
});
