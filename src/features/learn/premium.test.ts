import { afterEach, describe, expect, it } from "vitest";
import { examSlotLocked, freeNodeCount, isPremiumNode, topicIsLocked } from "./premium";
import NMT_MATH from "./tree/nmt-math";
import IELTS from "./tree/ielts";

afterEach(() => {
  delete (window as unknown as { getProfile?: unknown }).getProfile;
});

describe("first-unit free gate", () => {
  it("opens NMT math Numbers (7 nodes), locks Algebra onward", () => {
    expect(freeNodeCount(NMT_MATH)).toBe(7);
    expect(isPremiumNode(NMT_MATH, "nm-07")).toBe(false);
    expect(isPremiumNode(NMT_MATH, "al-01")).toBe(true);
    expect(topicIsLocked(NMT_MATH, "nm-01")).toBe(false);
    expect(topicIsLocked(NMT_MATH, "al-01")).toBe(true);
  });

  it("opens IELTS Listening, locks Reading and Speaking", () => {
    expect(freeNodeCount(IELTS)).toBe(10);
    expect(topicIsLocked(IELTS, "l-01")).toBe(false);
    expect(topicIsLocked(IELTS, "r-01")).toBe(true);
    expect(topicIsLocked(IELTS, "s-01")).toBe(true);
  });

  it("unlocks later units when the student is Pro", () => {
    (window as unknown as { getProfile: () => { pro: boolean } }).getProfile = () => ({ pro: true });
    expect(topicIsLocked(NMT_MATH, "al-01")).toBe(false);
    expect(topicIsLocked(IELTS, "s-01")).toBe(false);
  });

  it("blocks a second exam on Free and lets Pro add more", () => {
    expect(examSlotLocked(0)).toBe(false);
    expect(examSlotLocked(1)).toBe(true);
    (window as unknown as { getProfile: () => { pro: boolean } }).getProfile = () => ({ pro: true });
    expect(examSlotLocked(3)).toBe(false);
  });

  it("fails closed on an empty tree or unknown node", () => {
    const empty = { examTaxonomy: "x", units: [] as const };
    expect(freeNodeCount(empty)).toBe(0);
    expect(topicIsLocked(empty, "nm-01")).toBe(true);
    expect(topicIsLocked(NMT_MATH, "no-such-node")).toBe(true);
  });
});
