# Phase 5 — Baccalauréat général

Orientation. Hlib picked Bac over GRE/GMAT/PTE (14 Aug 2026).

## Scope (this slice)

Bac **général** only. Same plumbing as Abitur + IELTS marking:

- Qualification `bac`, France default (was IB — placeholder).
- Scale **0–20**, step 0.5, mentions on the moyenne.
- Terminal coefficients (60/100): français 5+5, philo 8, two spécialités 16+16, grand oral 10.
- Official-ish Learn trees from BO 2019 programmes (still 2025–26): Français, Philosophie, Grand oral, Maths, PC, SVT, SES, NSI, HGGSP, HLP, LLCER Anglais.
- Paper language French. Coach/papers ignore UI language.
- Verified curriculum rows in the bundled seed (`source: "official"`).

## Deferred

- Bac techno / pro
- Arts, SI, other LLCER, biologie-écologie (AI-generate + confirm)
- Full IeltsWriting-style in-app dissertation UI (rubric prompt lives in `bac-paper.ts`)
- Licensed annales (Decision #37)
- GRE / GMAT / PTE — next exam after this is live

## Hlib by hand

Run `supabase/19_bac.sql`. Until then the bundled snapshot still shows Bac; France-on-IB stays until the update lands.

## What could break silently

| Risk | Guard |
|---|---|
| "Baccalauréat" resolved as IB | `familyFromName` checks French Bac before IB; test in `resolve.test.ts` |
| `bac-math` predictor shows 0–100 | `scaleIdForTaxonomy` walks the `bac-` prefix |
| Papers in English because UI is English | `paperLanguageFor("bac") === "fr"` |
