import { describe, expect, it } from "vitest";
import { applyThemeVars, resolveThemeId, THEME_IDS, THEMES } from "./themes";

describe("resolveThemeId", () => {
  it("keeps a named palette", () => {
    expect(resolveThemeId("violet")).toBe("violet");
  });

  it("maps the old dark toggle to midnight", () => {
    expect(resolveThemeId("dark")).toBe("midnight");
  });

  it("maps light, system, and junk to cream", () => {
    expect(resolveThemeId("light")).toBe("cream");
    expect(resolveThemeId("system")).toBe("cream");
    expect(resolveThemeId(undefined)).toBe("cream");
  });

  it("lists all six spec ids", () => {
    expect(THEME_IDS).toEqual(["cream", "midnight", "trading", "violet", "arcade", "mono"]);
    expect(THEMES.cream.accent).toBe("#1B4D4A");
    expect(THEMES.midnight.accent).toBe("#F3D062");
  });
});

describe("applyThemeVars", () => {
  it("writes data-theme and the four core vars", () => {
    const root = document.createElement("html");
    applyThemeVars("arcade", root);
    expect(root.getAttribute("data-theme")).toBe("arcade");
    expect(root.style.getPropertyValue("--theme-accent")).toBe("#FF10A5");
    expect(root.style.getPropertyValue("--theme-bg")).toBe("#0F0B14");
  });
});
