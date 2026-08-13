import { describe, expect, it } from "vitest";
import { freeTopicLimit, isPremiumIndex, topicIsLocked } from "./premium";

describe("freeTopicLimit", () => {
  it("gives NMT math 23 free of 47", () => {
    expect(freeTopicLimit(47)).toBe(23);
    expect(isPremiumIndex(22, 47)).toBe(false);
    expect(isPremiumIndex(23, 47)).toBe(true);
  });

  it("locks only the second half when the student is not Pro", () => {
    expect(topicIsLocked(0, 47)).toBe(false);
    expect(topicIsLocked(23, 47)).toBe(true);
    expect(isPremiumIndex(5, 10)).toBe(true);
  });
});
