import { beforeEach, describe, expect, it } from "vitest";
import {
  HEARTS_KEY,
  HEARTS_MAX,
  HEARTS_REGEN_MS,
  applyRegen,
  formatRegenWait,
  getHearts,
  loseHeart,
  migrateHearts,
  spendHeart,
} from "./hearts";

const t0 = 1_700_000_000_000;

describe("migrateHearts", () => {
  it("defaults a missing blob to a full set", () => {
    expect(migrateHearts(null)).toEqual({ hearts: HEARTS_MAX, nextRegenAt: null });
  });

  it("clamps junk instead of throwing", () => {
    expect(migrateHearts({ hearts: 99, nextRegenAt: "nope" })).toEqual({
      hearts: HEARTS_MAX, nextRegenAt: null,
    });
    expect(migrateHearts({ hearts: -2 }).hearts).toBe(0);
  });
});

describe("applyRegen", () => {
  it("fills one heart after 30 minutes", () => {
    const next = applyRegen({ hearts: 3, nextRegenAt: t0 + HEARTS_REGEN_MS }, t0 + HEARTS_REGEN_MS);
    expect(next.hearts).toBe(4);
    expect(next.nextRegenAt).toBe(t0 + HEARTS_REGEN_MS * 2);
  });

  it("catches up several missed ticks and caps at max", () => {
    const next = applyRegen({ hearts: 1, nextRegenAt: t0 }, t0 + HEARTS_REGEN_MS * 10);
    expect(next).toEqual({ hearts: HEARTS_MAX, nextRegenAt: null });
  });

  it("does nothing when already full", () => {
    expect(applyRegen({ hearts: HEARTS_MAX, nextRegenAt: t0 }, t0 + 1e12))
      .toEqual({ hearts: HEARTS_MAX, nextRegenAt: null });
  });
});

describe("loseHeart", () => {
  it("starts the regen clock on the first miss", () => {
    const next = loseHeart({ hearts: 5, nextRegenAt: null }, t0);
    expect(next.hearts).toBe(4);
    expect(next.nextRegenAt).toBe(t0 + HEARTS_REGEN_MS);
  });

  it("does not go below zero", () => {
    expect(loseHeart({ hearts: 0, nextRegenAt: t0 + HEARTS_REGEN_MS }, t0).hearts).toBe(0);
  });

  it("keeps an already-running clock", () => {
    const clock = t0 + 60_000;
    const next = loseHeart({ hearts: 3, nextRegenAt: clock }, t0);
    expect(next.hearts).toBe(2);
    expect(next.nextRegenAt).toBe(clock);
  });
});

describe("formatRegenWait", () => {
  it("renders mm:ss", () => {
    expect(formatRegenWait(12 * 60 * 1000 + 5000)).toBe("12:05");
    expect(formatRegenWait(0)).toBe("0:00");
  });
});

describe("spendHeart", () => {
  beforeEach(() => {
    localStorage.removeItem(HEARTS_KEY);
  });

  it("persists a miss and refuses a sixth", () => {
    expect(getHearts(t0).hearts).toBe(5);
    expect(spendHeart(t0)).toBe(true);
    expect(getHearts(t0).hearts).toBe(4);
    for (let i = 0; i < 4; i++) spendHeart(t0);
    expect(getHearts(t0).hearts).toBe(0);
    expect(spendHeart(t0)).toBe(false);
  });

  it("returns a heart after the wait", () => {
    spendHeart(t0);
    expect(getHearts(t0 + HEARTS_REGEN_MS).hearts).toBe(5);
  });
});
