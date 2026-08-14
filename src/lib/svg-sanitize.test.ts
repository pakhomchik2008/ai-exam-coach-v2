import { describe, it, expect } from "vitest";
import { sanitizeSvg } from "./svg-sanitize";

describe("sanitizeSvg", () => {
  it("passes a benign svg through", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>';
    const out = sanitizeSvg(svg);
    expect(out).toContain("<svg");
    expect(out).toContain("circle");
  });

  it("strips script tags", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect/></svg>';
    const out = sanitizeSvg(svg);
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert(1)");
  });

  it("strips inline event handlers", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect onclick="alert(1)"/></svg>';
    const out = sanitizeSvg(svg);
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("alert(1)");
  });

  it("strips javascript: URLs", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><rect/></a></svg>';
    const out = sanitizeSvg(svg);
    expect(out || "").not.toContain("javascript:");
  });

  it("returns null for non-SVG input", () => {
    expect(sanitizeSvg("<p>not svg</p>")).toBeNull();
    expect(sanitizeSvg("")).toBeNull();
    expect(sanitizeSvg(null)).toBeNull();
    expect(sanitizeSvg(undefined)).toBeNull();
  });

  it("pulls the svg out of a markdown fence or prose wrapper", () => {
    const inner = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>';
    const out = sanitizeSvg("Here is the figure:\n```svg\n" + inner + "\n```");
    expect(out).toContain("<svg");
    expect(out).toContain("circle");
  });
});
