/**
 * EXAM COACH mark — open book, rising bars, forecast arrow.
 * Same paths as brand/logo.svg so nav, favicon, and lockup stay one drawing.
 */

const GOLD = "#D4B36A";
const TEAL = "#1B4D4A";

type BrandMarkProps = {
  size?: number;
  framed?: boolean;
  title?: string;
};

export function BrandGlyph({ color = GOLD }: { color?: string }) {
  return (
    <g>
      <g fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 22 L32 16 L55 22 V46 L32 52 L9 46 Z" />
        <path d="M32 16 V52" />
        <path d="M15 43 C 22 40, 28 34, 35 28 C 39 24, 45 21, 51 19" />
      </g>
      <rect x="19.2" y="36.5" width="5.6" height="9.2" rx="1" fill={color} />
      <rect x="29.2" y="30.2" width="5.6" height="15.5" rx="1" fill={color} />
      <rect x="39.2" y="24.2" width="5.6" height="21.5" rx="1" fill={color} />
      <path d="M51 19 L45.6 17.4 L47.8 23.2 Z" fill={color} />
    </g>
  );
}

export function BrandMark({ size = 26, framed = true, title }: BrandMarkProps) {
  const color = framed ? GOLD : TEAL;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {framed ? <rect width="64" height="64" rx="14" fill={TEAL} /> : null}
      <BrandGlyph color={color} />
    </svg>
  );
}

type BrandLockupProps = {
  width?: number;
  title?: string;
};

export function BrandLockup({ width = 200, title = "EXAM COACH" }: BrandLockupProps) {
  return (
    <svg
      width={width}
      viewBox="0 0 280 340"
      role="img"
      aria-label={title}
    >
      <rect width="280" height="340" fill={TEAL} />
      <g transform="translate(140 118) scale(2.15) translate(-32 -32)">
        <BrandGlyph color={GOLD} />
      </g>
      <text
        x="140"
        y="236"
        textAnchor="middle"
        fill={GOLD}
        fontFamily="var(--font-sans), ui-sans-serif, system-ui, sans-serif"
        fontSize="28"
        fontWeight="800"
        letterSpacing="0.12em"
      >
        EXAM COACH
      </text>
      <text
        x="140"
        y="268"
        textAnchor="middle"
        fill={GOLD}
        fontFamily="var(--font-sans), ui-sans-serif, system-ui, sans-serif"
        fontSize="11"
        fontWeight="600"
        letterSpacing="0.36em"
      >
        SINCE 2026
      </text>
    </svg>
  );
}
