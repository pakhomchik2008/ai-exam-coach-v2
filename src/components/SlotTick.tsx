/**
 * Slot-machine tick for score numbers. No react-countup — same rAF
 * pattern QuickOnboarding already uses. Reduced-motion snaps to `to`.
 */
import React from "react";
import { MOTION } from "../styles/motion";

type SlotTickProps = {
  to: number;
  duration?: number;
  className?: string;
};

export function SlotTick({ to, duration = MOTION.duration.cinema, className }: SlotTickProps) {
  const reduce = React.useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const [n, setN] = React.useState(0);

  React.useEffect(() => {
    if (reduce) return undefined;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - p) ** 3;
      setN(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration, reduce]);

  return <span className={className}>{reduce ? to : n}</span>;
}
