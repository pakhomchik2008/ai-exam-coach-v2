import { describe, expect, it, vi } from "vitest";
import {
  fireHaptic,
  navigateWithViewTransition,
  prefersReducedMotion,
  reducedFadeMs,
} from "./motion-runtime";

describe("motion-runtime", () => {
  it("reports reduced motion from matchMedia", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("reduce"),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    expect(prefersReducedMotion()).toBe(true);
    expect(reducedFadeMs()).toBe(120);
  });

  it("skips View Transitions when reduced-motion is on", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    const start = vi.fn();
    vi.stubGlobal("document", { startViewTransition: start });
    const update = vi.fn();
    navigateWithViewTransition(update);
    expect(update).toHaveBeenCalledOnce();
    expect(start).not.toHaveBeenCalled();
  });

  it("does not vibrate when reduced-motion is on", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    const vibrate = vi.fn();
    vi.stubGlobal("navigator", { vibrate });
    fireHaptic("heavy");
    expect(vibrate).not.toHaveBeenCalled();
  });
});
