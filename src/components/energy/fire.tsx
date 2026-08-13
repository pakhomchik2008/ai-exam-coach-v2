/**
 * Dashboard fire kit — predictor, mission ring, streak flame, XP, rank,
 * tilt cards, ambient glow. CSS/rAF first; Framer only for the 3D tilt.
 */
import React from "react";
import { motion } from "framer-motion";
import { SlotTick } from "../SlotTick";
import { MOTION } from "../../styles/motion";
import {
  bindAmbientPointer,
  fireHaptic,
  prefersReducedMotion,
  usePrefersReducedMotion,
} from "../../lib/motion-runtime";

const D = "M8 92 C 40 88, 70 86, 100 78 S 170 70, 210 52 S 280 28, 312 18";

export function AmbientGlow({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => bindAmbientPointer(ref.current), []);
  return (
    <div ref={ref} className="energy-glow">
      {children}
    </div>
  );
}

export function PredictorHero({
  nowLabel,
  predLabel,
  nowScore,
  predScore,
}: {
  nowLabel: string;
  predLabel: string;
  nowScore: number;
  predScore: number;
}) {
  return (
    <figure className="energy-predictor">
      <svg viewBox="0 0 320 110" role="img" aria-label={`${nowLabel} ${nowScore}, ${predLabel} ${predScore}`}>
        <defs>
          <linearGradient id="energyPredFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4B36A" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#D4B36A" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="land-chart-band" d={D} fill="none" stroke="#D4B36A" strokeWidth="16" strokeLinecap="round" />
        <path d={`${D} L 312 110 L 8 110 Z`} fill="url(#energyPredFill)" />
        <path className="land-chart-line energy-draw" d={D} fill="none" stroke="#1B4D4A" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="8" cy="92" r="3.2" fill="#1B4D4A" />
        <circle className="land-chart-pulse" cx="312" cy="18" r="5" fill="#D4B36A" />
      </svg>
      <figcaption>
        <span>{nowLabel} <SlotTick to={nowScore} /></span>
        <span>{predLabel} <SlotTick to={predScore} /></span>
      </figcaption>
    </figure>
  );
}

export function MissionRing({
  percent,
  label,
  done,
}: {
  percent: number;
  label: string;
  done?: boolean;
}) {
  const reduce = usePrefersReducedMotion();
  const clamped = Math.max(0, Math.min(100, percent));
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);
  const burst = !!done && !reduce;

  React.useEffect(() => {
    if (!burst) return undefined;
    fireHaptic("heavy");
    return undefined;
  }, [burst]);

  return (
    <div className="energy-mission">
      <svg viewBox="0 0 88 88" width="88" height="88" aria-label={label}>
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--border-subtle)" strokeWidth="8" />
        <circle
          className="energy-mission-ring"
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="#D4B36A"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={reduce ? offset : c}
          style={{
            strokeDashoffset: offset,
            transition: reduce ? "none" : `stroke-dashoffset ${MOTION.duration.cinema}ms var(--motion-snap)`,
          }}
          transform="rotate(-90 44 44)"
        />
      </svg>
      <div className="energy-mission-label">
        <strong><SlotTick to={clamped} />%</strong>
        <span>{label}</span>
      </div>
      {burst && <ParticleBurst count={20} />}
    </div>
  );
}

export function StreakFlame({ days, grew }: { days: number; grew?: boolean }) {
  const reduce = usePrefersReducedMotion();
  const h = Math.max(28, Math.min(78, 24 + days * 4));
  const [d, setD] = React.useState(() => flamePath(0, h));

  React.useEffect(() => {
    if (reduce) return undefined;
    let frame = 0;
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      if (now - last > 330) {
        frame += 1;
        setD(flamePath(frame, h));
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [h, reduce]);

  return (
    <div className={`energy-flame${grew ? " energy-flame--pop" : ""}`} aria-label={`${days}`}>
      <svg viewBox={`0 0 40 ${h + 8}`} width="40" height={h + 8}>
        <path d={d} fill="#F59E0B" />
        <path d={flamePath(2, h * 0.62, 12)} fill="#FDE68A" opacity="0.85" />
      </svg>
      <span>{days}</span>
    </div>
  );
}

function flamePath(seed: number, height: number, cx = 20): string {
  const wobble = Math.sin(seed * 0.9) * 2.4;
  const top = 4 + (seed % 3);
  return `M${cx} ${height + 4} C ${cx - 14 + wobble} ${height * 0.62}, ${cx - 10} ${height * 0.28}, ${cx + wobble * 0.4} ${top} C ${cx + 10} ${height * 0.28}, ${cx + 14 - wobble} ${height * 0.62}, ${cx} ${height + 4} Z`;
}

export function XPBar({
  into,
  need,
  level,
  leveledUp,
}: {
  into: number;
  need: number;
  level: number;
  leveledUp?: boolean;
}) {
  const pct = need > 0 ? Math.min(100, (into / need) * 100) : 0;
  return (
    <div className={`energy-xp${leveledUp ? " energy-xp--boom" : ""}`}>
      <div className="energy-xp-meta">
        <span>LV {level}</span>
        <span>{into}/{need} XP</span>
      </div>
      <div className="energy-xp-track">
        <div className="energy-xp-fill" style={{ width: `${pct}%` }}>
          <i className="energy-xp-spark" />
        </div>
      </div>
    </div>
  );
}

export function RankBadge({
  title,
  emoji,
  leveledUp,
}: {
  title: string;
  emoji: string;
  leveledUp?: boolean;
}) {
  return (
    <div className={`energy-rank${leveledUp ? " energy-rank--spin" : ""}`} aria-label={title}>
      <span className="energy-rank-medal">{emoji}</span>
      <span>{title}</span>
    </div>
  );
}

export function TiltCard({
  children,
  back,
}: {
  children: React.ReactNode;
  back?: React.ReactNode;
}) {
  const reduce = usePrefersReducedMotion();
  const [tilt, setTilt] = React.useState({ x: 0, y: 0 });
  const [flipped, setFlipped] = React.useState(false);

  const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: py * -8, y: px * 8 });
  };

  return (
    <button
      type="button"
      className="energy-tilt"
      onMouseMove={onMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      onClick={() => back && setFlipped((f) => !f)}
    >
      <motion.div
        className="energy-tilt-inner"
        animate={{ rotateX: reduce ? 0 : (flipped ? 180 : tilt.x), rotateY: reduce ? 0 : (flipped ? 0 : tilt.y) }}
        transition={{ duration: MOTION.duration.quick / 1000, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="energy-tilt-face">{children}</div>
        {back && <div className="energy-tilt-face energy-tilt-back">{back}</div>}
      </motion.div>
    </button>
  );
}

export function ParticleBurst({ count = 20 }: { count?: number }) {
  if (prefersReducedMotion()) return null;
  const bits = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    return {
      i,
      x: Math.cos(angle) * 42,
      y: Math.sin(angle) * 42,
    };
  });
  return (
    <span className="energy-burst" aria-hidden="true">
      {bits.map((b) => (
        <i key={b.i} style={{ "--bx": `${b.x}px`, "--by": `${b.y}px` } as React.CSSProperties} />
      ))}
    </span>
  );
}
