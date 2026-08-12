/**
 * exam.coach mark — the rising graph-e with an amber diamond at the peak.
 * Used in AppNav and the landing lockup so the SVG path lives in one place.
 */

type BrandMarkProps = {
  size?: number;
  /** Teal rounded square behind the graph. Off for inline wordmark-adjacent use. */
  framed?: boolean;
  title?: string;
};

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
      {framed ? <rect width="64" height="64" rx="14" fill="#1B4D4A" /> : null}
      <polyline
        points="10,48 18,40 28,42 36,28 46,24 54,14"
        fill="none"
        stroke={framed ? "#F5F5F4" : "#1B4D4A"}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="51.2"
        y="10.4"
        width="6.2"
        height="6.2"
        rx="0.6"
        transform="rotate(45 54.3 13.5)"
        fill="#F3D062"
      />
    </svg>
  );
}
