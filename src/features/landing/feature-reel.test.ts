import { describe, expect, it } from "vitest";
import { REEL_PANELS } from "./FeatureReel";

describe("feature reel", () => {
  it("keeps the four shipped surfaces, in that order", () => {
    expect([...REEL_PANELS]).toEqual(["chat", "learn", "journal", "cal"]);
  });
});
