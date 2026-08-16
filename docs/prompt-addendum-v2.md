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
- Max card is on the public page as a list price: $9.99/mo or $90/yr (−25%).
  CTA is waitlist, not Checkout, until 5c + 5d + Weekly Deep Report.
- Pro yearly list price is $54 (−25%). Live charge is still the 3-day
  trial then $5.99/mo until the yearly Stripe Price exists.
- Honest bits stay: no fake reviews, card at Checkout.
- Do not claim Sonnet in public copy until the model router ships.

Nav/IA (not this cut): Today / Learn / Coach / More.

## B — Logo

Placeholder stays the block-E of eleven squares (`brand/logo.svg`,
`BrandMark.tsx`). Same geometry until Hlib picks from 6 Examik
concepts and hands an SVG.

Do not invent a new mark. Do not change lockup layout beyond the
word `Examik`. iOS AppIcon set is the same raster until regenerate.

## N — Pricing

Public offer matches Checkout today:

| State | What the page says | What code does |
|---|---|---|
| Free | 1 exam. First unit of each subject. Calendar + journal locked. | `premium.ts` first-unit, `examSlotLocked()`, `ProGatePage` on Calendar/Journal |
| Pro | All features. 3 days free, card at Checkout, then $5.99/mo or $54/yr | One `STRIPE_PRICE_ID` + `trial_period_days: 3` |
| Max | Hidden | $9.99/mo later: unlimited Sonnet + unlimited Socratic/Feynman + Weekly Deep Report |

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
