/**
 * Hero predictor sparkline. Phase 4.4: the path still draws, the band
 * breathes, the forecast pulse ticks, scores slot-machine up.
 */

import { SlotTick } from "../../components/SlotTick";

type PredictorChartProps = {
  nowLabel: string;
  predLabel: string;
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
        <path className="land-chart-band" d={D} fill="none" stroke="#F3D062" strokeWidth="16" strokeLinecap="round" />
        <path className="land-chart-fill" d={`${D} L 312 110 L 8 110 Z`} fill="url(#landChartFill)" />
        <path className="land-chart-line" d={D} fill="none" stroke="#F5F5F4" strokeWidth="2.4" strokeLinecap="round" />
        <circle className="land-chart-now" cx="8" cy="92" r="3.2" fill="#F5F5F4" />
        <circle className="land-chart-pulse" cx="312" cy="18" r="5" fill="#F3D062" />
        <rect className="land-chart-diamond" x="307.2" y="13.4" width="9.2" height="9.2" rx="0.8" transform="rotate(45 312 18)" fill="#F3D062" />
      </svg>
      <figcaption>
        <span>{nowLabel} <SlotTick to={nowScore} /></span>
        <span>{predLabel} <SlotTick to={predScore} /></span>
      </figcaption>
    </figure>
  );
}
