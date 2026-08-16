# Prompt addendum v2 — Examik

Locked 16 Aug 2026. Working name was AI Exam Coach / exam.coach.
Brand is **Examik** in every language — do not translate.

Domain intent: `examik.app`. Confirm/buy before pointing DNS. Until then
the live alias stays `https://ai-exam-coach-v2.vercel.app`.

Do not reuse Decision Log #73–86 (billing) or #87–99 (AI quality).
#100–103 live in `docs/phase-5-billing-tiers-plan.md`. This file starts
at #104.

## A — Landing

Wordmark, hero, footer, Settings, emails, legal: **Examik**.

- Five langs share the same Latin string. No «Взліт», no «Exam Coach».
- Footer: GitHub + legal links. Telegram and TikTok URLs are gone.
- Privacy / Terms / EULA / Refund / Cookies / Children name Examik.
- Live Learn trees in public copy: **NMT + IELTS only**. Do not list
  SAT / A-Level / GCSE as live trees.
- One price, one sentence, everywhere: **3 days free, then $5.99/month.**
  No Max card. No yearly toggle. Live Checkout stays 3-day trial → $5.99/mo.
  Max, Sprint, yearly Checkout stay deferred until Hlib creates those
  Stripe Prices and says so. Reverses #109 list-Max / list-yearly.
- Honest bits stay: no fake reviews, card at Checkout.
- Do not claim Sonnet in public copy until the model router ships.

Nav/IA (not this cut): Today / Learn / Coach / More.

## B — Logo

Placeholder stays the block-E of eleven squares (`brand/logo.svg`,
`BrandMark.tsx`). Same geometry until Hlib picks from 6 Examik
concepts and hands an SVG. Do not invent a new mark.

Lockup is one horizontal drawing — unframed 24px E + `Examik` in
`--font-brand`, gap = one cell of the E. Same pair in landing nav,
app nav, OG, emails. Framed cream rounded-rect is favicon / app
icon only. Never in a header. No `SINCE 2026`. AI is a feature,
not the name. iOS AppIcon set is the same raster until regenerate.

## N — Pricing

Public offer matches Checkout today:

| State | What the page says | What code does |
|---|---|---|
| Free | 1 exam. First unit of each subject. Calendar + journal locked. | `premium.ts` first-unit, `examSlotLocked()`, `ProGatePage` on Calendar/Journal |
| Pro | All features. 3 days free, then $5.99/month. Card at Checkout. | One `STRIPE_PRICE_ID` + `trial_period_days: 3` |
| Max | Hidden — not on the public page | $9.99/mo later: unlimited Sonnet + unlimited Socratic/Feynman + Weekly Deep Report |

Hlib sets Stripe `STRIPE_PRICE_ID` to the Pro $5.99 Price. Do not
advertise Sprint $2.99 on the live page until slice 5d.

See #100–103 in `docs/phase-5-billing-tiers-plan.md`.

## Do not touch

- `window.AIExamCoachDesignSystem_99e467` / `_ds_bundle.js` namespace
- File / component names (`ExamWizard`, `ExamRecap`, `exam-specs.ts`)
- SQL table names
- GitHub slug `pakhomchik2008/ai-exam-coach-v2`
- `dash_upcoming_exams: "Your exam coach"` (role, not brand)
- ExamRecap prompt “You are an exam coach”
- Capacitor `appId` — no `capacitor.config.ts` yet

## Decision Log

| # | Decision | Why |
|---|---|---|
| 104 | Brand is Examik, untranslated, all five langs | One string. Domain and App Store need Latin. Translating it fragments search |
| 105 | Canonical domain is examik.app when bought | Vercel URL stays the fallback origin until DNS is live |
| 106 | Delete Telegram + TikTok from product surfaces | Accounts do not exist. Dead social links are worse than none |
| 107 | Keep the design-system window namespace | Renaming `AIExamCoachDesignSystem_99e467` blanks screens. Brand copy ≠ architecture |
| 110 | Lockup is horizontal unframed E + Examik. Framed cream tile is icon-only | A poster is not a lockup. One drawing in every header |
| 111 | App chrome uses landing paper/ink. Do not restyle AIChat / KaTeX | The cover is the product. Coach is a room inside it |
| 112 | One public price. Today = recommendNextAction. Miss → dated calendar block | Copy honesty without new Checkout. The loop ChatGPT cannot fake |
| 113 | Exam Sim sits official public paper shapes per subject. #37 stays — no third-party banks. File optional | УЦОЯО / College Board / AQA характеристики, original items. Family-level "18 GCSE MCQs" was a lie |
| 114 | Exam Sim difficulty is calibrated from official public demos, not a generic "genuine exam" line | УЦОЯО 2023–2026 sittings + Bluebook 1–5 + ETS/GMAC samples. Curve only — do not store those items |
| 115 | GCSE / A-level sit AQA paper clocks and generate original SVG figures (maps, apparatus, source scenes) | Real papers print photos. We do not ingest AQA images — original drawings only |
| 116 | Exam figures are a second pass (===FIG n===), never inline SVG in the item JSON | Inline SVG broke parseJSON, so Source A never reached the screen |
| 117 | Remaining A-level AQA electives sit official clocks (7712/7702/7136/7182/7517/7132/7152/7652/7692/7662). Listening / on-screen / oral mocked as written with a note. NEA not sat | Same #113 rule. Generic 18-MCQ mock was the leftover lie for Lit/Lang/Econ/Psych/CS/Business/Politics/MFL |
| 118 | Sociology 7192, Law 7162, PE 7582, Music 7272 sit AQA clocks. Film sits Eduqas A670QS (AQA has no Film). Art 7201 is 100% NEA — Exam Sim sits written material only, not the 15h studio | Leftover generic mock was the same lie. Physics matcher must be `physics`, not `physic`, or it steals Physical Education |
| 119 | RS 7062, Philosophy 7172, Drama 7262, D&T 7552, Media 7572 sit AQA clocks. Drama/D&T/Media NEA not sat. RS matcher before Philosophy so 'philosophy of religion' in the RS note cannot steal the wrong paper | Same leftover-mock lie. D&T matcher before Art so Product Design does not become Fine Art |
| 120 | Dance 7237 + EnvSci 7447 sit AQA. Geology sits OCR H414, Classics sits OCR H408 (AQA has neither). GCSE Drama 8261 / RS 8062 / Sociology 8192 sit AQA written papers; NEA not sat | Last leftover generic-mock list. Geology matcher is `geolog`, not `geo`, or it would steal Geography |
| 121 | Remaining GCSE onboarding electives sit official clocks: MFL 8652/8692/8662 Higher (listen/speak mocked as printed), CS 8525, Business 8132, Economics 8136, PE 8582, Art 8201 written-only NEA, Music 8271 listen paper. Electronics stays unofficial | Same #113 leftover-mock lie. PE matcher before Physics. Art is 100% NEA — sit annotation, not the 10h studio |
| 122 | Electronics sits Eduqas (AQA has none): GCSE C490 2×1h30/80, A-level A490 2×2h45/140. AP onboarding subjects sit College Board section clocks. IB onboarding subjects sit HL clocks (SL shorter — same #121 Higher rule). University stays unofficial — board is "Custom modules", no public характеристика | Same leftover-mock lie. Uni clocks would be invented. Visual Arts / Art NEA still written-only. AP listen/speak mocked as printed |
| 123 | Food 8585 + AP Human Geography sit official clocks. Uni onboarding subjects sit a typical UK unseen 2h/100 (studio 90/80) so Exam Sim is not 18 MCQs — note says this is a convention, not a board. Bare AP/IB/GCSE without a subject stay unofficial | Same leftover. Art History matcher before History. Bare family picker would be 20+ papers — worse than a generic mock |
