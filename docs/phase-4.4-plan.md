# Phase 4.4 — Motion & Visual Energy (test slice)

Branch: `phase-4.4/motion-energy`, cut from `main`.

Full spec is the trading-terminal / cyberpunk-arcade brief. This PR is
the lab: tokens + landing energy + dashboard ticker. No Framer / GSAP /
Lenis / react-countup until Hlib likes the vibe on a real screen.

## Ships

- `src/styles/motion.ts` — snap / springy / smooth / swift + durations
- `src/styles/energy.css` — scanlines, CRT dip, ambient glow, ticker
- Landing: ticker, slot-tick scores, breathing confidence band, pulse
  on the forecast, mouse-tied glow
- Dashboard: live ticker (streak, forecast, weak nodes, days-to-exam)
- `prefers-reduced-motion` kills loops, glow, CRT; numbers snap to final

## Deferred

Framer Motion, GSAP recap cinema, skill-tree constellation, practice
drain timer, chat trails, radar/heatmap, calendar physics, Storybook,
Playwright, Lenis. Next PR if this slice reads as fire, not carnival.
