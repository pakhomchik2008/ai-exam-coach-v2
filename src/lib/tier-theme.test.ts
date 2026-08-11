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
import { readFileSync } from "node:fs";
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

describe("audit #11 — every tier themes the page", () => {
  // Was: only `legend` carried `theme: true`, so levelling through the first
  // four tiers changed nothing visible. Phase 2 gave each tier a palette in
  // src/styles/tokens/tiers.css.
  it("themes all five tiers", () => {
    const themed = api.XP_TIERS.filter((t) => t.theme).map((t) => t.id);
    expect(themed).toEqual(["novice", "scholar", "adept", "master", "legend"]);
  });

  // `applyTierTheme` only writes data-tier for tiers where `theme` is true, and
  // the CSS keys off that attribute — so a tier with no matching rule block
  // would silently render as the base look. This pins the two together.
  it("has a CSS rule block for every themed tier id", () => {
    // Read from the repo root — vitest runs with cwd there, and `import.meta.url`
    // is not a file: URL under the jsdom environment.
    const css = readFileSync("src/styles/tokens/tiers.css", "utf8");
    for (const tier of api.XP_TIERS.filter((t) => t.theme)) {
      expect(css, tier.id).toContain(`[data-tier="${tier.id}"]`);
    }
  });
});
