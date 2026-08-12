import { describe, it, expect } from "vitest";
import { playSound, SOUND_NAMES, soundsEnabled } from "./sounds";

describe("sound kit", () => {
  it("ships exactly the six spec cues", () => {
    expect([...SOUND_NAMES]).toEqual(["tap", "select", "correct", "wrong", "complete", "level"]);
  });

  it("defaults off (no profile → silent)", () => {
    expect(soundsEnabled()).toBe(false);
  });

  it("playSound is a no-op when silent", () => {
    expect(() => playSound("tap")).not.toThrow();
  });
});
