/**
 * Exam Coach mark — open book on navy.
 * Framed mark is the PNG icon so nav, favicon, and lockup stay one drawing.
 */

const GOLD = "#CCA563";
const NAVY = "#141822";

type BrandMarkProps = {
  size?: number;
  framed?: boolean;
  title?: string;
};

const LOGO_SRCSET = "/brand/logo-64.png 64w, /brand/logo-128.png 128w, /brand/logo-256.png 256w, /brand/logo-512.png 512w";

export function BrandGlyph({ color = GOLD }: { color?: string }) {
  return (
    <g fill={color}>
      <path d="M14.2 22.4c.2-2.4 2.8-5 7.2-7.2C25.6 13.4 29.2 12.8 31.2 13.2v38.2c-3.2-.4-7.6-1.8-11.4-3.8-3.8-2-5.8-4-5.6-6.2z" />
      <path d="M49.8 22.4c-.2-2.4-2.8-5-7.2-7.2C38.4 13.4 34.8 12.8 32.8 13.2v38.2c3.2-.4 7.6-1.8 11.4-3.8 3.8-2 5.8-4 5.6-6.2z" />
    </g>
  );
}

export function BrandMark({ size = 26, framed = true, title }: BrandMarkProps) {
  if (framed) {
    return (
      <img
        src="/brand/logo-128.png"
        srcSet={LOGO_SRCSET}
        sizes={`${size}px`}
        width={size}
        height={size}
        alt={title || "Exam Coach"}
        draggable={false}
        style={{ display: "block", flexShrink: 0 }}
      />
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <BrandGlyph color={GOLD} />
    </svg>
  );
}

type BrandLockupProps = {
  width?: number;
  title?: string;
};

export function BrandLockup({ width = 200, title = "Exam Coach" }: BrandLockupProps) {
  return (
    <div
      role="img"
      aria-label={title}
      style={{
        width,
        boxSizing: "border-box",
        padding: "40px 24px 32px",
        background: NAVY,
        textAlign: "center",
      }}
    >
      <img
        src="/brand/logo-256.png"
        srcSet="/brand/logo-256.png 256w, /brand/logo-512.png 512w"
        sizes={`${Math.round(width * 0.46)}px`}
        width={Math.round(width * 0.46)}
        height={Math.round(width * 0.46)}
        alt=""
        draggable={false}
        style={{ display: "block", margin: "0 auto" }}
      />
      <div
        style={{
          marginTop: 20,
          color: GOLD,
          fontFamily: "var(--font-brand), Georgia, serif",
          fontSize: Math.round(width * 0.125),
          fontWeight: 600,
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 10,
          color: GOLD,
          fontFamily: "var(--font-sans)",
          fontSize: Math.round(width * 0.048),
          fontWeight: 600,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          opacity: 0.72,
        }}
      >
        Since 2026
      </div>
    </div>
  );
}
