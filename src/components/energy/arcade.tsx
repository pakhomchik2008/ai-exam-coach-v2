/**
 * Practice / exam arcade — drain timer, 3D question flip, correct/wrong
 * feedback. CSS-driven so AIChat can opt in with class names too.
 */
import React from "react";
import { fireHaptic, usePrefersReducedMotion } from "../../lib/motion-runtime";
import { MOTION } from "../../styles/motion";

export function DrainTimer({
  remainingSec,
  totalSec,
  label,
}: {
  remainingSec: number;
  totalSec: number;
  label?: string;
}) {
  const reduce = usePrefersReducedMotion();
  const pct = totalSec > 0 ? Math.max(0, Math.min(100, (remainingSec / totalSec) * 100)) : 0;
  const danger = remainingSec <= 60;
  const critical = remainingSec <= 10;

  React.useEffect(() => {
    if (reduce || remainingSec <= 0) return undefined;
    if (danger && remainingSec % 10 === 0) fireHaptic("medium");
    if (critical) fireHaptic("heavy");
    return undefined;
  }, [remainingSec, danger, critical, reduce]);

  const mm = String(Math.floor(remainingSec / 60)).padStart(2, "0");
  const ss = String(remainingSec % 60).padStart(2, "0");

  return (
    <div
      className={`energy-drain${danger ? " energy-drain--danger" : ""}${critical ? " energy-drain--shake" : ""}`}
      role="timer"
      aria-label={label || `${mm}:${ss}`}
    >
      <div className="energy-drain-col">
        <div className="energy-drain-fluid" style={{ height: `${pct}%` }} />
      </div>
      <span>{mm}:{ss}</span>
    </div>
  );
}

export function QuestionFlip({
  flipKey,
  children,
}: {
  flipKey: string | number;
  children: React.ReactNode;
}) {
  const reduce = usePrefersReducedMotion();
  return (
    <div
      key={flipKey}
      className={reduce ? "energy-q" : "energy-q energy-q--flip"}
      style={{ animationDuration: `${MOTION.duration.base}ms` }}
    >
      {children}
    </div>
  );
}

export function AnswerFeedback({
  ok,
  xp,
  children,
}: {
  ok: boolean;
  xp?: number;
  children?: React.ReactNode;
}) {
  const reduce = usePrefersReducedMotion();
  React.useEffect(() => {
    fireHaptic(ok ? "light" : "heavy");
  }, [ok]);

  return (
    <div className={ok ? "energy-ok" : reduce ? "energy-bad" : "energy-bad energy-bad--shake"}>
      {ok && typeof xp === "number" && <span className="energy-xp-fly">+{xp} XP</span>}
      {children}
    </div>
  );
}

export function SegmentBar({
  results,
}: {
  results: Array<boolean | null>;
}) {
  return (
    <div className="energy-segments" aria-hidden="true">
      {results.map((r, i) => (
        <i
          key={i}
          className={r === true ? "is-ok" : r === false ? "is-bad" : "is-wait"}
        />
      ))}
    </div>
  );
}

export function BossIntro({
  title,
  onDone,
}: {
  title: string;
  onDone: () => void;
}) {
  const reduce = usePrefersReducedMotion();
  const [shown, setShown] = React.useState(reduce ? title : "");

  React.useEffect(() => {
    if (reduce) {
      const id = window.setTimeout(onDone, 120);
      return () => window.clearTimeout(id);
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(title.slice(0, i));
      if (i >= title.length) {
        window.clearInterval(id);
        window.setTimeout(onDone, 400);
      }
    }, 40);
    return () => window.clearInterval(id);
  }, [title, onDone, reduce]);

  return (
    <div className="energy-boss-intro" role="dialog" aria-label={title}>
      <p>BOSS UNIT</p>
      <h2>{shown}</h2>
    </div>
  );
}
