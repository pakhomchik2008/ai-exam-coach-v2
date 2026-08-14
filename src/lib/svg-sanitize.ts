// AI Exam Coach — safe SVG rendering for AI-generated diagrams
// (Phase 3.7d). Claude occasionally emits an <svg> block inside the theory
// reader to illustrate a triangle, coordinate plane, function graph, etc.
// Rendering that untrusted string via dangerouslySetInnerHTML without a
// sanitizer would let a stray <script> or `onclick="…"` execute in-page —
// exactly the XSS surface DOMPurify exists to close.
//
// DOMPurify's SVG profile drops every scripting sink (script tags, on*
// attributes, javascript: URLs, foreignObject) while preserving the shape
// tags we actually want (svg/g/path/rect/circle/line/polyline/polygon/
// text/tspan/ellipse/defs/marker/use/title/desc). Same defaults every
// well-known SVG editor uses server-side.

import DOMPurify from "dompurify";

// DOMPurify accepts a plain SVG string when USE_PROFILES.svg is set; return
// the cleaned HTML string, safe to hand to dangerouslySetInnerHTML.
// Returns null when the input isn't recognisable as an SVG document — the
// caller should skip rendering in that case rather than showing an empty
// container.
export function sanitizeSvg(input: string | null | undefined): string | null {
  if (!input || typeof input !== "string") return null;
  const lower = input.toLowerCase();
  const start = lower.indexOf("<svg");
  const end = lower.lastIndexOf("</svg>");
  if (start < 0 || end < 0 || end < start) return null;
  const trimmed = input.slice(start, end + "</svg>".length);
  const clean = DOMPurify.sanitize(trimmed, { USE_PROFILES: { svg: true, svgFilters: true } });
  return clean && clean.trim().length > 0 ? clean : null;
}
