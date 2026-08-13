/**
 * AI Chat as a living entity — typing wave, streaming tint, send trail,
 * coach eye blink. CSS classes also work from the legacy createElement tree.
 */
import React from "react";
import { usePrefersReducedMotion } from "../../lib/motion-runtime";

export function TypingDots() {
  return (
    <span className="energy-dots" aria-label="typing">
      <i /><i /><i />
    </span>
  );
}

export function CoachEye({ pulse }: { pulse?: boolean }) {
  return (
    <span className={`energy-eye${pulse ? " energy-eye--pulse" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 28 28" width="28" height="28">
        <circle cx="14" cy="14" r="13" fill="#1B4D4A" />
        <ellipse className="energy-eye-lid" cx="14" cy="14" rx="7" ry="7" fill="#F3D062" />
        <circle cx="14" cy="14" r="3.2" fill="#0B0C0D" />
      </svg>
    </span>
  );
}

export function StreamLine({ active }: { active: boolean }) {
  if (!active) return null;
  return <span className="energy-stream" aria-hidden="true" />;
}

export function useTypewriter(text: string, ms = 40): string {
  const reduce = usePrefersReducedMotion();
  const [out, setOut] = React.useState(reduce ? text : "");

  React.useEffect(() => {
    if (reduce) return undefined;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, ms);
    return () => window.clearInterval(id);
  }, [text, ms, reduce]);

  return out;
}
