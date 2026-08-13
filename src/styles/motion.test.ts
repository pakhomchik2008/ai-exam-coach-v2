import { describe, expect, it } from "vitest";
import { MOTION } from "./motion";

describe("motion tokens", () => {
  it("keeps snap as the default entrance ease", () => {
    expect(MOTION.ease.snap).toContain("0.16");
  });

  it("exposes the five durations the brief named", () => {
    expect(MOTION.duration).toEqual({
      micro: 120,
      quick: 200,
      base: 320,
      slow: 520,
      cinema: 800,
    });
  });
});
