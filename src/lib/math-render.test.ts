import { describe, it, expect } from "vitest";
import { renderMathText, renderCoachMarkdown } from "./math-render";

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

  it("does not send an English paragraph wrapped in $$ to KaTeX", () => {
    const html = renderCoachMarkdown("$$a divides a number b (written a | b) if there exists a whole number k such that b = a k. Notation: a | b.$$");
    expect(html).toContain("a divides a number b");
    expect(html).not.toContain("katex-display");
    expect(html).not.toContain("coach-md-math-block");
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

  it("repairs invented <<frac{a}{b}// notation into real rendered LaTeX", () => {
    const html = renderMathText("Simplify <<frac{2}{3}//.");
    expect(html).toContain("katex");
    expect(html).not.toContain("<<frac");
    expect(html).not.toContain("//");
  });

  it("leaves ordinary text with a literal // untouched", () => {
    const html = renderMathText("see https://examik.net for more");
    expect(html).toContain("https://examik.net");
  });
});

describe("renderCoachMarkdown", () => {
  it("renders **bold** in prose", () => {
    const html = renderCoachMarkdown("say **hello** there");
    expect(html).toContain("<strong>hello</strong>");
    expect(html).not.toContain("**");
    expect(html).not.toContain("<p");
  });

  it("bolds a formula wrapped in stars — the fading-step case", () => {
    const html = renderCoachMarkdown("— **$12x = 36$**");
    expect(html).toContain("<strong>");
    expect(html).toContain("katex");
    expect(html).not.toContain("**");
    expect(html).not.toContain("$12x");
  });

  it("renders a hint that mentions $x$ without leaking dollars", () => {
    const html = renderCoachMarkdown("Значення $x$ із кроку 3");
    expect(html).toContain("Значення");
    expect(html).toContain("із кроку 3");
    expect(html).toContain("katex");
    expect(html).not.toContain("$x$");
  });

  it("strips leftover unpaired ** so students never see stars", () => {
    const html = renderCoachMarkdown("oops **broken");
    expect(html).toContain("oops broken");
    expect(html).not.toContain("**");
  });

  it("renders ## headings instead of leaking hashes", () => {
    const html = renderCoachMarkdown("## Похідна\n\nA rate of change.");
    expect(html).toContain("<h3");
    expect(html).toContain("Похідна");
    expect(html).not.toContain("## ");
  });

  it("renders bullet and numbered lists", () => {
    const html = renderCoachMarkdown("- one\n- two\n\n1. first\n2. second");
    expect(html).toContain("<ul");
    expect(html).toContain("<ol");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<li>first</li>");
  });

  it("renders a GFM table", () => {
    const html = renderCoachMarkdown("| x | y |\n| --- | --- |\n| 1 | 2 |");
    expect(html).toContain("<table");
    expect(html).toContain("<th>x</th>");
    expect(html).toContain("<td>1</td>");
  });

  it("renders a blockquote after HTML-escaping >", () => {
    const html = renderCoachMarkdown("> remember the chain rule");
    expect(html).toContain("<blockquote");
    expect(html).toContain("remember the chain rule");
    expect(html).not.toContain("&gt; remember");
  });

  it("keeps fenced code as a pre block, not leaked backticks", () => {
    const html = renderCoachMarkdown("```\nconst x = 1;\n```");
    expect(html).toContain("<pre");
    expect(html).toContain("const x = 1;");
    expect(html).not.toContain("```");
  });

  it("still escapes HTML in prose", () => {
    const html = renderCoachMarkdown("**hi** <script>bad</script>");
    expect(html).toContain("<strong>hi</strong>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("handles empty input", () => {
    expect(renderCoachMarkdown("")).toBe("");
  });
});
