# Phase 4.4 — Motion & Visual Energy

Branch: `phase-4.4/motion-energy`.

Vibe: trading-terminal / cyberpunk-arcade. Tokens + libraries + every
section in the 4.4 brief.

## Ships

- Motion tokens (`src/styles/motion.ts`) + energy CSS
- Libraries: Framer Motion 11, GSAP 3 (recap only), Lenis (landing +
  Progress), Auto-Animate (mastery table). No Lottie / Rive / Three /
  Anime / react-countup — SlotTick stays.
- Dashboard fire: predictor draw-in, mission ring, streak flame, XP bar,
  rank badge, tilt cards, ambient glow, live tape
- Learn: UnitSkillTree cinematic paths, locked shake, mastery pop, boss pulse
- Practice / Exam Sim: drain timer, question flip, correct/wrong, segments
- Chat: typing wave, stream line, send pop, streaming tint
- Progress: radar, heatmap, waterfall, candlestick, stacked area, sankey,
  sparklines
- Calendar: 40ms elastic follow, drop ripple, snap guide, today pulse,
  empty-slot ghost
- Session Recap: 4s GSAP cinema
- View Transitions on tab change
- Motion lab at `#motion-lab` (Storybook stand-in)
- `prefers-reduced-motion` → 120ms fade, no loops / shake / particles

## Deferred (honest)

- Playwright reduced-motion E2E — Playwright still not in the repo
  (CLAUDE.md). Covered by vitest + CSS reduce rules instead.
- Native Storybook toolchain — Motion lab is the 20-piece gallery
- Pull-to-refresh + long-press radial burst (micro, last on the list)
- iPhone 12 screencast + Lighthouse 88 proof — Hlib on a real device
