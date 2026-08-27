/**
 * Examik mark — block E of eleven squares. Final (Decision Log #125,
 * brand/README.md) — Hlib reviewed and kept it, do not regenerate.
 * Lockup is horizontal only: unframed E + "Examik". The framed cream tile is
 * the app icon / favicon, never a header. Gap is one cell of the E so every
 * surface (nav, landing, OG, email) is the same drawing.
 */

const PURPLE = "#8921F5";
const PAPER = "#F7F5F0";

const CELLS: [number, number][] = [
  [0, 0], [1, 0], [2, 0],
  [0, 1],
  [0, 2], [1, 2], [2, 2],
  [0, 3],
  [0, 4], [1, 4], [2, 4],
];

export const BRAND_GLYPH = {
  square: 6,
  gap: 4,
  originX: 19,
  originY: 9,
  width: 26,
  height: 46,
  tile: 64,
} as const;

export const LOCKUP_MARK = 24;

export function lockupGapPx(markHeight: number): number {
  // 1.6x cell gap — 0.85 still read as too tight (Hlib, 26 Aug 2026:
  // "больше разрыв намного больше").
  return markHeight * (BRAND_GLYPH.square / BRAND_GLYPH.height) * 1.6;
}

type BrandMarkProps = {
  size?: number;
  framed?: boolean;
  title?: string;
};

export function BrandGlyph({ color = PURPLE }: { color?: string }) {
  return (
    <g fill={color}>
      {CELLS.map(([col, row]) => (
        <rect
          key={`${col}-${row}`}
          x={BRAND_GLYPH.originX + col * (BRAND_GLYPH.square + BRAND_GLYPH.gap)}
          y={BRAND_GLYPH.originY + row * (BRAND_GLYPH.square + BRAND_GLYPH.gap)}
          width={BRAND_GLYPH.square}
          height={BRAND_GLYPH.square}
        />
      ))}
    </g>
  );
}

export function BrandMark({ size = LOCKUP_MARK, framed = false, title }: BrandMarkProps) {
  if (framed) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${BRAND_GLYPH.tile} ${BRAND_GLYPH.tile}`}
        role={title ? "img" : "presentation"}
        aria-hidden={title ? undefined : true}
        aria-label={title}
      >
        <rect width={BRAND_GLYPH.tile} height={BRAND_GLYPH.tile} rx="14" fill={PAPER} />
        {/* Bounding box is centered but cell mass isn't: col 0 is fully
            filled, cols 1-2 are sparse, so the E's visual weight sits left
            of its own bbox. Nudge +5px right to center the actual ink. */}
        <g transform="translate(5, 0)">
          <BrandGlyph />
        </g>
      </svg>
    );
  }

  const width = size * (BRAND_GLYPH.width / BRAND_GLYPH.height);
  return (
    <svg
      width={width}
      height={size}
      viewBox={`${BRAND_GLYPH.originX} ${BRAND_GLYPH.originY} ${BRAND_GLYPH.width} ${BRAND_GLYPH.height}`}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <BrandGlyph />
    </svg>
  );
}

type BrandLockupProps = {
  mark?: number;
  title?: string;
  wordClassName?: string;
};

export function BrandLockup({
  mark = LOCKUP_MARK,
  title = "Examik",
  wordClassName,
}: BrandLockupProps) {
  const gap = lockupGapPx(mark);
  const fontSize = `${1.2 * (mark / LOCKUP_MARK)}rem`;
  return (
    <span className="brand-lockup" style={{ gap, fontSize }}>
      <BrandMark size={mark} />
      <span className={["brand-lockup-word", wordClassName].filter(Boolean).join(" ")}>
        {title}
      </span>
    </span>
  );
}
