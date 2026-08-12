// AI Exam Coach — inline math rendering with KaTeX (Phase 3.7a follow-up).
//
// Called by the Learn-mode theory reader (src/features/chat/AIChat.jsx's
// LearnTheoryReader) to turn AI-authored text carrying $inline$ and
// $$block$$ math into rendered HTML. We render at write-time (React
// `dangerouslySetInnerHTML`) rather than mounting a KaTeX React component
// per node: the reader is mostly-static content with a lot of formulas, and
// a single innerHTML string is faster to paint than many nested wrappers.
//
// KaTeX is sandboxed against injection — see the renderMathInText docs:
// with `throwOnError: false` and `trust: false` (defaults), it never emits
// arbitrary HTML from math input. Everything OUTSIDE the math delimiters is
// escaped by escapeHtml() below before being spliced back in, so a stray
// "<script>" in AI prose can't break out either.

import katex from "katex";

// Segments the string into text + math runs, preserving order. Handles both
// $$block$$ and $inline$; a lone `$` inside prose (like "$5") is passed
// through as literal text since the KaTeX call would 404 the render anyway.
export type MathSegment = { kind: "text" | "inline" | "block"; value: string };

export function tokenizeMath(input: string): MathSegment[] {
  const out: MathSegment[] = [];
  let i = 0;
  while (i < input.length) {
    // Block: $$...$$
    if (input[i] === "$" && input[i + 1] === "$") {
      const end = input.indexOf("$$", i + 2);
      if (end === -1) { out.push({ kind: "text", value: input.slice(i) }); break; }
      out.push({ kind: "block", value: input.slice(i + 2, end) });
      i = end + 2;
      continue;
    }
    // Inline: $...$ — but only if the closing $ shows up on this line and
    // the content isn't empty; otherwise treat as prose (probably a currency).
    if (input[i] === "$") {
      const end = input.indexOf("$", i + 1);
      const newline = input.indexOf("\n", i + 1);
      const looksLikeMath = end !== -1 && end > i + 1 && (newline === -1 || end < newline);
      if (looksLikeMath) {
        out.push({ kind: "inline", value: input.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    // Plain text run — accumulate until the next `$`.
    let next = input.indexOf("$", i + 1);
    if (next === -1) next = input.length;
    out.push({ kind: "text", value: input.slice(i, next) });
    i = next;
  }
  return out;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Renders one math segment to HTML — used by callers that already tokenized
// (e.g. AIChat's markdown pipeline) so they can escape/format prose their
// own way without re-running tokenizeMath. Delegates to KaTeX with the same
// safe defaults as renderMathText.
export function renderMathSegment(seg: MathSegment): string {
  if (seg.kind === "text") return escapeHtml(seg.value);
  try {
    return katex.renderToString(seg.value, {
      throwOnError: false,
      displayMode: seg.kind === "block",
      output: "html",
    });
  } catch {
    return escapeHtml(seg.kind === "block" ? `$$${seg.value}$$` : `$${seg.value}$`);
  }
}

// Renders a run of AI prose that may contain math. Returns an HTML string
// safe to hand to `dangerouslySetInnerHTML` — see file header on why.
export function renderMathText(input: string): string {
  if (!input) return "";
  const segs = tokenizeMath(input);
  return segs.map((s) => {
    if (s.kind === "text") return escapeHtml(s.value).replace(/\n/g, "<br>");
    return renderMathSegment(s);
  }).join("");
}
