/**
 * Six small SVG orbs on elliptical paths around the predictor card.
 * Custom marks, not emoji — the landing tone is clinical, not carnival.
 * Radii and periods stay uneven so they never line up.
 */

import type { CSSProperties, ReactNode } from "react";

type Orb = {
  id: string;
  rx: string;
  ry: string;
  dur: string;
  start: string;
  icon: ReactNode;
};

function ChartIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 13V3M2 13h12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M4 10l3-3 2 1.5 4-5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="8" r="2.1" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="8" r="0.7" fill="currentColor" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M6 3.2c-1.6 0-2.8 1.2-2.8 2.6 0 .4.1.8.3 1.1C2.6 7.3 2 8.2 2 9.3c0 1.3 1 2.3 2.3 2.5v.6c0 .7.6 1.3 1.3 1.3h.8M10 3.2c1.6 0 2.8 1.2 2.8 2.6 0 .4-.1.8-.3 1.1.9.4 1.5 1.3 1.5 2.4 0 1.3-1 2.3-2.3 2.5v.6c0 .7-.6 1.3-1.3 1.3H9.6M8 3.4v9.3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 3.2h4.2c.9 0 1.6.7 1.6 1.6v8.1H4.6A1.6 1.6 0 0 1 3 11.3V3.2zM13 3.2H8.8c-.9 0-1.6.7-1.6 1.6v8.1h4.2A1.6 1.6 0 0 0 13 11.3V3.2z" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M9.2 2.2L4.4 8.6h3.1L6.8 13.8l5.2-6.8H8.8z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3.2" y="2.4" width="9.6" height="11.2" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5.6 6h4.8M5.6 8.4h4.8M5.6 10.8h2.8" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

const ORBS: readonly Orb[] = [
  { id: "chart", rx: "132px", ry: "54px", dur: "18s", start: "8%", icon: <ChartIcon /> },
  { id: "target", rx: "158px", ry: "78px", dur: "24s", start: "28%", icon: <TargetIcon /> },
  { id: "brain", rx: "118px", ry: "88px", dur: "32s", start: "52%", icon: <BrainIcon /> },
  { id: "book", rx: "176px", ry: "46px", dur: "22s", start: "71%", icon: <BookIcon /> },
  { id: "bolt", rx: "148px", ry: "96px", dur: "28s", start: "14%", icon: <BoltIcon /> },
  { id: "note", rx: "104px", ry: "62px", dur: "20s", start: "88%", icon: <NoteIcon /> },
];

type OrbitFieldProps = {
  children: ReactNode;
};

export function OrbitField({ children }: OrbitFieldProps) {
  return (
    <div className="land-orbit">
      {ORBS.map((orb) => (
        <span
          key={orb.id}
          className="land-orb"
          style={{
            "--rx": orb.rx,
            "--ry": orb.ry,
            "--dur": orb.dur,
            "--start": orb.start,
          } as CSSProperties}
        >
          {orb.icon}
        </span>
      ))}
      {children}
    </div>
  );
}
