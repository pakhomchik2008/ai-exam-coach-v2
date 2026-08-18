/**
 * Phase 4.4 motion tokens. One table so landing, dashboard, and later
 * recap/practice do not invent a second easing language.
 */
export const MOTION = {
  ease: {
    snap: "cubic-bezier(0.16, 1, 0.3, 1)",
    springy: "cubic-bezier(0.16, 1, 0.3, 1)",
    smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
    swift: "cubic-bezier(0.6, 0, 0.4, 1)",
  },
  duration: {
    micro: 120,
    quick: 200,
    base: 320,
    slow: 520,
    cinema: 800,
  },
  stagger: { tight: 30, base: 60, loose: 100 },
} as const;

export type MotionEase = keyof typeof MOTION.ease;
