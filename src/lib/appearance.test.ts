import { describe, expect, it } from "vitest";
import { applyAppearance } from "./appearance";

describe("applyAppearance", () => {
  it("sets data-theme to a named palette", () => {
    applyAppearance({ theme: "midnight", accent: "Indigo" });
    expect(document.documentElement.getAttribute("data-theme")).toBe("midnight");
    applyAppearance({ theme: "system" });
    expect(document.documentElement.getAttribute("data-theme")).toBe("cream");
  });

  it("maps the old dark toggle to midnight", () => {
    applyAppearance({ theme: "dark" });
    expect(document.documentElement.getAttribute("data-theme")).toBe("midnight");
  });

  it("toggles the dyslexia class", () => {
    applyAppearance({ dyslexiaFont: true });
    expect(document.documentElement.classList.contains("dyslexia")).toBe(true);
    applyAppearance({ dyslexiaFont: false });
    expect(document.documentElement.classList.contains("dyslexia")).toBe(false);
  });
});
