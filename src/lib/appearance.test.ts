import { describe, expect, it } from "vitest";
import { applyAppearance } from "./appearance";

describe("applyAppearance", () => {
  it("sets data-theme on the document element", () => {
    applyAppearance({ theme: "dark", accent: "Indigo" });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    applyAppearance({ theme: "system" });
    expect(document.documentElement.getAttribute("data-theme")).toBe(null);
  });

  it("toggles the dyslexia class", () => {
    applyAppearance({ dyslexiaFont: true });
    expect(document.documentElement.classList.contains("dyslexia")).toBe(true);
    applyAppearance({ dyslexiaFont: false });
    expect(document.documentElement.classList.contains("dyslexia")).toBe(false);
  });
});
