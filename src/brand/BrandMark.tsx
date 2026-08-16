/**
 * Examik mark — block E of eleven squares. Placeholder until the new SVG lands.
 * Same geometry as brand/logo.svg so nav, favicon, and lockup stay one drawing.
 */

const PURPLE = "#8921F5";
const PAPER = "#F7F5F0";
const NAVY = "#141822";

const CELLS: [number, number][] = [
  [0, 0], [1, 0], [2, 0],
  [0, 1],
  [0, 2], [1, 2], [2, 2],
  [0, 3],
  [0, 4], [1, 4], [2, 4],
];

const SQUARE = 6;
const GAP = 4;
const ORIGIN_X = 19;
const ORIGIN_Y = 9;

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
          x={ORIGIN_X + col * (SQUARE + GAP)}
          y={ORIGIN_Y + row * (SQUARE + GAP)}
          width={SQUARE}
          height={SQUARE}
        />
      ))}
    </g>
  );
}

export function BrandMark({ size = 26, framed = true, title }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {framed ? <rect width="64" height="64" rx="14" fill={PAPER} /> : null}
      <BrandGlyph />
    </svg>
  );
}

type BrandLockupProps = {
  width?: number;
  title?: string;
};

export function BrandLockup({ width = 200, title = "Examik" }: BrandLockupProps) {
  return (
    <svg
      width={width}
      viewBox="0 0 280 340"
      role="img"
      aria-label={title}
    >
      <rect width="280" height="340" fill={NAVY} />
      <g transform="translate(140 118) scale(2.15) translate(-32 -32)">
        <BrandGlyph />
      </g>
      <text
        x="140"
        y="236"
        textAnchor="middle"
        fill={PAPER}
        fontFamily="var(--font-brand), Georgia, serif"
        fontSize="32"
        fontWeight="600"
      >
        {title}
      </text>
      <text
        x="140"
        y="268"
        textAnchor="middle"
        fill={PURPLE}
        fontFamily="var(--font-sans), ui-sans-serif, system-ui, sans-serif"
        fontSize="11"
        fontWeight="600"
        letterSpacing="0.32em"
      >
        SINCE 2026
      </text>
    </svg>
  );
}
