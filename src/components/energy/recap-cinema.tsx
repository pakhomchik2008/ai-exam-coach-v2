/**
 * Session Recap cinema — 4s trading-terminal beat. GSAP only here;
 * reduced-motion snaps every beat to its final frame.
 */
import React from "react";
import { SlotTick } from "../SlotTick";
import { Sparkline } from "../charts/energy-charts";
import { fireHaptic, usePrefersReducedMotion } from "../../lib/motion-runtime";
import { useTypewriter } from "./chat-life";

export type RecapCinemaProps = {
  score: number;
  delta: number;
  trend: number[];
  mistakes: string[];
  comment: string;
  children?: React.ReactNode;
  cta: React.ReactNode;
};

export function RecapCinema({
  score,
  delta,
  trend,
  mistakes,
  comment,
  children,
  cta,
}: RecapCinemaProps) {
  const reduce = usePrefersReducedMotion();
  const [beat, setBeat] = React.useState(reduce ? 5 : 0);
  const typed = useTypewriter(beat >= 4 ? comment : "", 40);
  const sign = delta > 0 ? "+" : "";

  React.useEffect(() => {
    if (reduce) return undefined;
    let live = true;
    let kill: () => void = () => undefined;
    void import("gsap").then(({ gsap }) => {
      if (!live) return;
      const tl = gsap.timeline({
        onComplete: () => { if (live) setBeat(5); },
      });
      tl.call(() => { if (live) setBeat(1); }, [], 0);
      tl.call(() => { if (live) { setBeat(2); fireHaptic("heavy"); } }, [], 0.6);
      tl.call(() => { if (live) setBeat(3); }, [], 1.2);
      tl.call(() => { if (live) setBeat(4); }, [], 2.0);
      tl.call(() => { if (live) setBeat(5); }, [], 3.0);
      kill = () => tl.kill();
    });
    return () => { live = false; kill(); };
  }, [reduce]);

  return (
    <div className="energy-recap">
      <div className={`energy-recap-score${beat >= 1 ? " is-on" : ""}`}>
        <SlotTick to={score} duration={600} />
      </div>
      <p className={`energy-recap-delta${beat >= 2 ? " is-on" : ""}`} data-sign={delta >= 0 ? "up" : "down"}>
        {sign}{delta}
      </p>
      <div className={`energy-recap-trend${beat >= 3 ? " is-on" : ""}`}>
        <Sparkline values={trend} />
      </div>
      <ul className={`energy-recap-miss${beat >= 4 ? " is-on" : ""}`}>
        {mistakes.slice(0, 3).map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      {comment && (
        <p className={`energy-recap-ai${beat >= 4 ? " is-on" : ""}`}>{typed}</p>
      )}
      {children}
      <div className={`energy-recap-cta${beat >= 5 ? " is-on" : ""}`}>{cta}</div>
    </div>
  );
}
