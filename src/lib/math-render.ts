// Examik — inline math rendering with KaTeX (Phase 3.7a follow-up).
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

function looksLikeProseMath(value: string): boolean {
  const words = value.trim().split(/\s+/).filter(Boolean).length;
  if (words <= 8) return false;
  const tex = /\\[a-zA-Z]+/.test(value);
  return words > 20 || (words > 8 && !tex);
}

export function tokenizeMath(input: string): MathSegment[] {
  const out: MathSegment[] = [];
  let i = 0;
  while (i < input.length) {
    // Block: $$...$$
    if (input[i] === "$" && input[i + 1] === "$") {
      const end = input.indexOf("$$", i + 2);
      if (end === -1) { out.push({ kind: "text", value: input.slice(i) }); break; }
      const inner = input.slice(i + 2, end);
      // A whole English paragraph wrapped in $$ makes KaTeX stack glyphs
      // on top of each other (Socratic "I give up" dump). Keep it as prose.
      out.push(looksLikeProseMath(inner) ? { kind: "text", value: inner } : { kind: "block", value: inner });
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

// Private-use sentinels so markdown regexes can see math as one token.
// tokenizeMath runs FIRST — otherwise `**$x$**` splits into `**` + math + `**`
// and the bold regex never pairs. Markers have no `*` / `$` / backticks.
function mathMarker(i: number): string {
  return `\uE000M${i}\uE001`;
}

function fenceMarker(i: number): string {
  return `\uE010F${i}\uE011`;
}

function applyInlineMarkdown(s: string): string {
  return s
    .replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+?)\*/g, "<em>$1</em>")
    .replace(/`([^`\n]+?)`/g, "<code class=\"coach-md-code\">$1</code>")
    .replace(/\*\*/g, "");
}

function extractFences(s: string): { text: string; fences: string[] } {
  const fences: string[] = [];
  const text = s.replace(/```[^\n]*\n([\s\S]*?)```/g, (_all, body: string) => {
    const plain = body.replace(/\n$/, "");
    const i = fences.length;
    fences.push(
      `<div class="coach-md-pre-wrap"><button type="button" class="coach-md-copy" data-copy="${escapeHtml(plain)}">Copy</button><pre class="coach-md-pre"><code>${plain}</code></pre></div>`,
    );
    return fenceMarker(i);
  });
  return { text, fences };
}

function isTableRow(line: string): boolean {
  return line.includes("|") && line.replace(/\|/g, "").trim().length > 0;
}

function isTableSep(line: string): boolean {
  return /^\s*\|?[\s:|-]+\|[\s:|-]+/.test(line) && /---/.test(line);
}

function splitCells(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function isUl(line: string): boolean {
  return /^[-*]\s+/.test(line);
}

function isOl(line: string): boolean {
  return /^\d+\.\s+/.test(line);
}

function isQuote(line: string): boolean {
  return /^(&gt;|>)\s?/.test(line);
}

function isHeading(line: string): boolean {
  return /^#{1,3}\s+\S/.test(line);
}

function isHr(line: string): boolean {
  return /^(-{3,}|\*{3,})$/.test(line.trim());
}

function isFenceToken(line: string): boolean {
  return /^\uE010F\d+\uE011$/.test(line.trim());
}

function isBlockStart(line: string): boolean {
  return isHeading(line) || isUl(line) || isOl(line) || isQuote(line) || isHr(line) || isFenceToken(line);
}

function applyCoachBlocks(s: string): string {
  const lines = s.split("\n");
  const out: string[] = [];
  let i = 0;
  const peek = (): string | undefined => lines[i];
  while (i < lines.length) {
    const line = peek();
    if (line == null) break;
    if (line.trim() === "") { i += 1; continue; }

    if (isFenceToken(line)) {
      out.push(line.trim());
      i += 1;
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const marks = heading[1] ?? "##";
      const title = heading[2] ?? "";
      const level = Math.min(4, marks.length + 1);
      out.push(`<h${level} class="coach-md-h">${title}</h${level}>`);
      i += 1;
      continue;
    }

    if (isHr(line)) {
      out.push("<hr class=\"coach-md-hr\" />");
      i += 1;
      continue;
    }

    if (isQuote(line)) {
      const bits: string[] = [];
      let cur = peek();
      while (cur != null && isQuote(cur)) {
        bits.push(cur.replace(/^(&gt;|>)\s?/, ""));
        i += 1;
        cur = peek();
      }
      out.push(`<blockquote class="coach-md-quote">${bits.join("<br/>")}</blockquote>`);
      continue;
    }

    const nextLine = lines[i + 1];
    if (isTableRow(line) && nextLine != null && isTableSep(nextLine)) {
      const head = splitCells(line);
      i += 2;
      const body: string[][] = [];
      let row = peek();
      while (row != null && isTableRow(row) && !isTableSep(row)) {
        body.push(splitCells(row));
        i += 1;
        row = peek();
      }
      const th = head.map((c) => `<th>${c}</th>`).join("");
      const tr = body.map((cells) => `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
      out.push(`<div class="coach-md-table-wrap"><table class="coach-md-table"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`);
      continue;
    }

    if (isUl(line)) {
      const items: string[] = [];
      let cur = peek();
      while (cur != null && isUl(cur)) {
        items.push(`<li>${cur.replace(/^[-*]\s+/, "")}</li>`);
        i += 1;
        cur = peek();
      }
      out.push(`<ul class="coach-md-ul">${items.join("")}</ul>`);
      continue;
    }

    if (isOl(line)) {
      const items: string[] = [];
      let cur = peek();
      while (cur != null && isOl(cur)) {
        items.push(`<li>${cur.replace(/^\d+\.\s+/, "")}</li>`);
        i += 1;
        cur = peek();
      }
      out.push(`<ol class="coach-md-ol">${items.join("")}</ol>`);
      continue;
    }

    const para: string[] = [];
    let cur = peek();
    while (cur != null && cur.trim() !== "" && !isBlockStart(cur)) {
      const ahead = lines[i + 1];
      if (isTableRow(cur) && ahead != null && isTableSep(ahead)) break;
      para.push(cur);
      i += 1;
      cur = peek();
    }
    out.push(`<p class="coach-md-p">${para.join("<br/>")}</p>`);
  }
  // A lone paragraph stays unwrapped so callers can drop the HTML into an
  // existing <p> / <button> without illegal nested paragraphs.
  const only = out.length === 1 ? out[0] : undefined;
  if (only && only.startsWith("<p class=\"coach-md-p\">") && only.endsWith("</p>")) {
    return only.slice("<p class=\"coach-md-p\">".length, -4);
  }
  return out.join("");
}

// Markdown-lite + KaTeX for every student-facing AI string.
// Math first (so **$x$** bolds the formula), then fences, then inline,
// then headings/lists/tables. Leftover `**` stripped so stars never leak.
export function renderCoachMarkdown(input: string): string {
  if (!input) return "";
  const normalized = String(input).replace(/<br\s*\/?>(\r?\n)?/gi, "\n");
  const segs = tokenizeMath(normalized);
  const mathHtml: string[] = [];
  let joined = "";
  for (const s of segs) {
    if (s.kind === "text") {
      joined += escapeHtml(s.value);
      continue;
    }
    const i = mathHtml.length;
    const tex = s.kind === "block" ? `$$${s.value}$$` : `$${s.value}$`;
    const rendered = renderMathSegment(s);
    mathHtml.push(
      s.kind === "block"
        ? `<div class="coach-md-math-block"><button type="button" class="coach-md-copy" data-copy="${escapeHtml(tex)}">Copy</button>${rendered}</div>`
        : rendered,
    );
    joined += mathMarker(i);
  }
  const fenced = extractFences(joined);
  let next = applyCoachBlocks(applyInlineMarkdown(fenced.text));
  for (let i = 0; i < fenced.fences.length; i++) {
    next = next.split(fenceMarker(i)).join(fenced.fences[i]);
  }
  for (let i = 0; i < mathHtml.length; i++) {
    next = next.split(mathMarker(i)).join(mathHtml[i]);
  }
  return next;
}
