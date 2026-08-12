/**
 * Hero predictor sparkline. The signature motion of the landing:
 * the score path draws itself, then the amber diamond sits on the forecast.
 * Reduced-motion users get the final frame immediately.
 */

type PredictorChartProps = {
  nowLabel: string;
  predLabel: string;
  /** Visible numbers on the axis — NMT-ish 100–200 scale, not a fake user count. */
  nowScore?: number;
  predScore?: number;
};

const D = "M8 92 C 40 88, 70 86, 100 78 S 170 70, 210 52 S 280 28, 312 18";

export function PredictorChart({
  nowLabel,
  predLabel,
  nowScore = 142,
  predScore = 176,
}: PredictorChartProps) {
  return (
    <figure className="land-chart">
      <svg viewBox="0 0 320 110" role="img" aria-label={`${nowLabel} ${nowScore}, ${predLabel} ${predScore}`}>
        <defs>
          <linearGradient id="landChartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F3D062" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#F3D062" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="land-chart-fill" d={`${D} L 312 110 L 8 110 Z`} fill="url(#landChartFill)" />
        <path className="land-chart-line" d={D} fill="none" stroke="#F5F5F4" strokeWidth="2.4" strokeLinecap="round" />
        <circle className="land-chart-now" cx="8" cy="92" r="3.2" fill="#F5F5F4" />
        <rect className="land-chart-diamond" x="307.2" y="13.4" width="9.2" height="9.2" rx="0.8" transform="rotate(45 312 18)" fill="#F3D062" />
      </svg>
      <figcaption>
        <span>{nowLabel} {nowScore}</span>
        <span>{predLabel} {predScore}</span>
      </figcaption>
    </figure>
  );
}
