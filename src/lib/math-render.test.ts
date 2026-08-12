import { describe, it, expect } from "vitest";
import { renderMathText } from "./math-render";

describe("renderMathText", () => {
  it("escapes plain HTML in prose", () => {
    const html = renderMathText("hello <script>bad</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("preserves newlines as <br>", () => {
    const html = renderMathText("line one\nline two");
    expect(html).toContain("<br>");
  });

  it("renders inline math via KaTeX", () => {
    const html = renderMathText("Solve $x^2 + 1$ for x");
    expect(html).toContain("katex");
    expect(html).toContain("Solve");
    expect(html).toContain("for x");
  });

  it("renders block math on its own line", () => {
    const html = renderMathText("Formula: $$a^2 + b^2 = c^2$$ done.");
    expect(html).toContain("katex-display");
  });

  it("treats a lone dollar sign as literal text (currency case)", () => {
    const html = renderMathText("costs $5 total");
    expect(html).toContain("costs $5 total");
    expect(html).not.toContain("katex");
  });

  it("does not crash on malformed TeX", () => {
    const html = renderMathText("bad: $\\frac{1$");
    // throwOnError:false keeps rendering possible; assertion is just that
    // we get some HTML back rather than an exception.
    expect(typeof html).toBe("string");
  });

  it("handles empty input", () => {
    expect(renderMathText("")).toBe("");
  });
});
