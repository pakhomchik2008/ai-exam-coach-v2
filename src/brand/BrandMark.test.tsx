/**
 * Lockup geometry: one horizontal drawing, no poster, no framed header tile.
 */
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BrandLockup, BrandMark, BRAND_GLYPH, LOCKUP_MARK, lockupGapPx } from "./BrandMark";

describe("BrandMark lockup", () => {
  it("gap is 0.6 cell of the E at the 24px mark", () => {
    expect(lockupGapPx(LOCKUP_MARK)).toBeCloseTo(LOCKUP_MARK * (6 / 46) * 0.6);
    expect(BRAND_GLYPH.width).toBe(26);
    expect(BRAND_GLYPH.height).toBe(46);
  });

  it("unframed mark crops to the glyph, not the 64 tile", () => {
    const { container } = render(<BrandMark size={24} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "19 9 26 46");
    expect(svg).toHaveAttribute("height", "24");
    expect(container.querySelector("rect[rx]")).toBeNull();
  });

  it("framed cream tile exists only when asked — app icon, not headers", () => {
    const { container } = render(<BrandMark size={64} framed title="Examik" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "0 0 64 64");
    const plate = container.querySelector("rect[rx='14']");
    expect(plate).toHaveAttribute("fill", "#F7F5F0");
  });

  it("lockup is horizontal Examik with no SINCE line and no navy slab", () => {
    const { container } = render(<BrandLockup />);
    expect(container.textContent).toBe("Examik");
    expect(container.textContent).not.toMatch(/SINCE/);
    expect(container.querySelector(".brand-lockup")).toHaveStyle({
      gap: `${lockupGapPx(24)}px`,
    });
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("19 9 26 46");
  });
});

describe("brand sources are one drawing", () => {
  it("kills the poster lockup and SINCE 2026", () => {
    const files = [
      "src/brand/BrandMark.tsx",
      "brand/wordmark.svg",
      "brand/lockup.svg",
      "public/brand/wordmark.svg",
      "public/brand/lockup.svg",
      "api/notifications-cron.js",
    ];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      expect(src, file).not.toMatch(/SINCE 2026/);
      expect(src, file).not.toMatch(/280 340/);
    }
  });

  it("headers use BrandLockup, never a framed mark", () => {
    const nav = readFileSync("src/components/AppNav.jsx", "utf8");
    const land = readFileSync("src/features/landing/MarketingPage.jsx", "utf8");
    const wizard = readFileSync("src/features/exams/exam-wizard.jsx", "utf8");
    expect(nav).toMatch(/<BrandLockup/);
    expect(nav).not.toMatch(/framed/);
    expect(land).toMatch(/<BrandLockup/);
    expect(land).not.toMatch(/framed/);
    expect(wizard).toMatch(/BrandLockup/);
    const cron = readFileSync("api/notifications-cron.js", "utf8");
    expect(cron).toMatch(/brandLockupHtml/);
    expect(cron).toMatch(/\/brand\/mark-48\.png/);
    expect(cron).not.toMatch(/\/brand\/mark\.svg/);
    expect(cron).not.toMatch(/logo-32\.png/);
    expect(cron.indexOf("Iowan Old Style")).toBeLessThan(cron.indexOf("Georgia"));
    expect(readFileSync("index.html", "utf8")).toMatch(/lockup-og\.png/);
  });
});
