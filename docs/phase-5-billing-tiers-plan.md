# Phase 5 — Billing tiers (Free / Sprint / Pro / Ultra)

Orientation doc. Hlib locked this on 14 Aug 2026. Do not invent a third
model vendor, a third paid model, or a 3-month SKU in this phase.

Branch when work starts: `phase-5/billing-tiers`. Cut after Settings
(`phase-4.6/settings`) is merged. Live Stripe is still blocked for a
Ukrainian company (3.7i) — code against Test mode + Subscription
Schedules; Polar/Paddle/entity is a later cutover, not a reason to
delay the entitlement model.

## What we understood

Two **model** lanes, four **commercial** states:

| State | Money | Model | Unlocks |
|---|---|---|---|
| Free | — | Haiku | 1 exam slot. First **unit** of each subject (not 50% of nodes). Calendar locked. Mistake journal locked. Coach chat + Learn Drill in the free unit stay open. |
| Sprint | $2.99 / 3 days | Haiku | Pro-level tree + Pro surfaces, on a clock. **Not Ultra.** Autoship to Pro. |
| Pro | $5.99/mo · $54/yr (−25%) | Haiku today. Sonnet + daily cap after slice 5c | Full plan: every unit, calendar, journal, practice. 3-day $0 trial, then $5.99. |
| Ultra | $9.99/mo · yearly TBD (~35–40% off, A/B after launch) | Hidden until built | Everything in Pro + unlimited Sonnet + unlimited Socratic/Feynman + Weekly Deep Report. Not on the public page until 5c + 5d + the report exist. |

Annual is 25% off 12× monthly, rounded: 5.99×12×0.75 = 53.91 → **$54**
($4.50/mo). 9.99×12×0.75 = 89.91 → **$90** ($7.50/mo). Badge “−25%”.
Cross out $71.88 / $119.88.

Sprint is not a $0 Stripe trial. It is a paid intro: $2.99 now,
$5.99/mo on day 4, cancel anytime. Disclosure on the paywall **before**
the card. Ultra cannot be bought or sampled during Sprint.

Sonnet (`claude-sonnet-5`) on **all** Ultra traffic, no task allowlist,
no daily cap — reverses the cap/allowlist half of Decision #74/#101,
see #113. Free and Pro stay Haiku-only, unchanged. Opus is **offline
content gen only**, never `api/complete.js`.

Sonnet is not sold as "faster" — it commonly runs slower per-token
than Haiku. Ultra copy sells "smarter" (Socratic depth, essay/Prove
explanation quality), never latency. A best-effort priority queue for
Ultra requests may be built as a technical stretch goal (Vercel Hobby
permitting) but is never a marketing claim — see #114.

3-month SKU: not launch. Monthly + annual only. Revisit from PostHog.

## What this reverses

| Old | New |
|---|---|
| Decision #63 half-tree free split | First unit of the one Free exam, sequential, not 50% of nodes |
| Decision #62 $0 3-day Checkout trial | $2.99 Sprint via Subscription Schedule, then $5.99/mo |
| `$4/month` copy + one `STRIPE_PRICE_ID` | $2.99 / $5.99 / $54 / $9.99 / $90 |
| Binary `profile.pro` | `tier`: `free \| sprint \| pro \| max` |
| Landing “Sonnet / Opus” prices | Haiku default; Sonnet is Ultra-only |
| Coach Practice + Exam Sim free | Practice Engine locked on Free; Exam Sim 1×/week |

Learn Drill inside the free first unit stays open. “Practice drill
locked” means Coach **Practice Engine**, not Learn’s Teach→Drill→Prove.

## Honest gaps today

- `isProUser()` is a boolean. Gates are half-tree (`freeTopicLimit`).
- `api/complete.js` hardcodes Haiku 4.5. No Sonnet route, no cap.
- Quota is 400 `complete`/day per signed-in user, not 5 chat messages.
- Predictor number, weekly Exam Sim, Coach Practice Engine: still ungated
  (not in the locked Free grid of 15 Aug).
- Stripe Checkout: one Pro Price (`STRIPE_PRICE_ID`), `trial_period_days: 3` ($0). Live copy matches that. Ultra is **off the public page** until it exists in code.
- Apple IAP / Capacitor: not in this app yet. Web Stripe first.
- PostHog: not installed.
- Referral “1 week Pro per friend”: named in this spec, not coded.

## Architecture

### Entitlements

`subscriptions` grows a `tier` column (`free` is absence of a row, or
`status` not active). Client cache: `profile.tier` replaces
`profile.pro`. `isProUser()` becomes `hasProSurfaces()` (Sprint | Pro |
Ultra). `isUltraUser()` is Ultra only.

Server is source of truth. Webhook writes the row. Client degrades:
missing table (PGRST205) → treat as Free, never crash.

### Model router

One function in `api/complete.js` (or a tiny `_model.js`):

```
route(tier) → { model }
```

No `task` allowlist, no Sonnet cap (reversed by #113) — `tier ===
'ultra'` → `claude-sonnet-5`, else `claude-haiku-4-5-20251001`. This
is the whole function; keep it that simple, don't reintroduce the
task param unless a future decision reverses #113 back.

Haiku chat for Free is a separate quota key (`complete-chat:user` =
5). Learn generation in the unlocked unit still uses the existing
`complete` budget so Teach is not killed by the chat cap. No separate
Sonnet counter — Ultra's `complete:user` request quota (same ceiling
as Pro, see Free gates below) is the only limiter.

### $2.99 → $5.99 (web)

Stripe Subscription Schedules, two phases, one subscription:

1. 3 days, one invoice = $2.99 (Sprint Price).
2. Recurring Pro monthly $5.99 (year is **not** the Sprint
   continuation; Sprint always lands on monthly Pro, annual is a
   separate Checkout from Pro/Ultra paywalls).

**Launch rule:** Sprint Checkout is monthly-Pro only. Annual is a
toggle on Pro and Ultra paywalls for people who are not in Sprint.

Apple IAP Introductory Offer “Pay up front” is the native twin. It
ships with Capacitor (Phase 6), not this branch. Same disclosure copy.

Anti-abuse: Stripe Radar email + card fingerprint. One Sprint per
customer id; webhook rejects a second Sprint Price on the same
fingerprint. Apple does this per Apple ID when IAP exists.

### Free gates (exact)

| Surface | Free | Sprint/Pro/Ultra |
|---|---|---|
| Active exams | 1 slot | unlimited |
| Learn tree | first unit, all Learn modes | full tree |
| Coach Practice Engine | locked | open |
| Exam Sim full-length | 1 / rolling week | unlimited |
| Coach Chat | 5 Haiku msgs/UTC day | unlimited Haiku |
| Mistake Journal | locked (paywall tab) | open |
| Calendar | locked (paywall tab) | drag / create / personal |
| Predictor | still ungated (not this cut) | number shown |

Paywall `trigger` is passed into PostHog: `predictor_blur` |
`node_locked` | `calendar_edit` | `chat_limit` | `practice_locked` |
`exam_slot` | `journal` | `exam_sim_cap`.

### Weekly Deep Report (Ultra) — was "Score Predictor + heatmap", merged by #115

Not a separate artifact. Same daily brief pipeline (email +
`notifications-cron.js` + in-app card) every tier already gets
(streak, due mistakes, exam countdown) — Ultra rows get one extra
block, once a week, not daily:

- **Predicted score** — deterministic formula (mastery % per node →
  `scales.ts` band), not an AI call. Cheap, reproducible, matches
  the plain Predictor number Pro/Ultra already see elsewhere (Free
  gates table above).
- **AI commentary** — one `brainComplete` call summarizing the
  formula's inputs into plain language ("weak in Algebra, strong in
  Reading"). This is the only AI-generated part; the number itself
  never comes from the model.
- **Weak-topic heatmap** — visual, built from `mistakes-store.jsx` +
  Learn tree mastery, same data the Mistake Journal already has.

Delivery: same cron, same template, gated by `tier === 'ultra'` —
weekly block simply doesn't render for Free/Sprint/Pro. No new
schedule, no new send path.

## Conversion (all of these ship, not a backlog)

1. **Value-stacking paywall** — list *this* student’s locked unit
   titles, mistake count, blurred predictor. No generic “Go Pro”.
2. **Progress-loss push** — Sprint day 3 evening. Real nodes near
   Silver, not a fake countdown. Needs OneSignal + a cron trigger
   (new `sprint_end`, same pattern as `trial_end`).
3. **Real-date urgency** — from `exam_date`: “N days to NMT. Free
   finishes ~X% of this tree.” Honest arithmetic, no fake timer.
4. **Annual anchor** — monthly and yearly side by side. Badge “−25%”.
   Yearly subtitle `$4.50/міс` and `$7.50/міс`. Cross out $71.88 / $119.88.
5. **Live social proof** — `select count` of Sprint+Pro+Ultra rows.
   No hardcoded “1,240”. If count < 50, hide the line (don’t look
   empty-fake).
6. **Win-back on cancel** — in-app screen before Portal: what they
   lose (named nodes, streak). Cancel stays visible and one tap.
   Then Stripe Portal. Apple later: their native manage-sub.
7. **Referral** — 1 week Pro per referred friend, cap 12 months.
   Own slice after money moves; needs a table + codes. Not launch
   day 1 if it blocks Checkout.

Disclosure (always, before pay):

> Сьогодні: $2.99 · Через 3 дні: $5.99/міс автоматично · Скасуй у будь-який момент

## PostHog

Install once. Events:

`sprint_started`, `sprint_converted`, `sprint_churned`,
`paywall_shown` (+ `trigger`), `paywall_dismissed`, `tier_upgraded`,
`sonnet_cap_hit`, `cancellation_started`, `cancellation_completed`.

Weekly: Sprint→Pro ≥ 35%. Click-through by trigger. If >15% of Ultra
users hit Sonnet cap every day → raise cap or Ultra price, don’t
silently eat margin.

## Slices (do in this order)

Each slice is its own PR. Gate: typecheck, lint, vitest, build.

| Slice | Ships | Blocked by |
|---|---|---|
| **5a Entitlements** | `tier` on `subscriptions` + `profile.tier`. `hasProSurfaces` / `isUltraUser`. Tests. No paywall copy change yet. | — |
| **5b Free gates** | Remainder: predictor blur, chat 5, Practice lock, Exam Sim 1/week. Paywall trigger ids. (First-unit, 1 exam slot, locked calendar + journal already shipped on `fix/price-copy`.) | 5a |
| **5c Router** | Allowlisted `task` → Haiku/Sonnet. 40/day Sonnet counter. Soft degrade toast. Opus never in `complete.js`. | 5a |
| **5d Stripe** | Prices: Sprint $2.99/3d, Pro $5.99/$54, Ultra $9.99/$90. Subscription Schedule. Radar. Webhook writes `tier`. Kill `$0 trial_period_days`. | 5a, Hlib creates Prices in Test mode |
| **5e Paywall** | Value-stack, annual toggle, disclosure, social-proof RPC (hide if n<50), Settings copy. | 5b, 5d |
| **5f Loops** | Day-3 push + `sprint_end` cron, exam-date urgency line, win-back then Portal. | 5d, 5e |
| **5g PostHog** | SDK + the event list. | 5e |
| **5h Referral** | Codes, 1 week Pro, cap 12 mo. | 5d |
| **5i Apple IAP** | Same $2.99 intro, native disclosure. | Capacitor + Apple account (Phase 6) |

Landing FAQ / price cards update in **5e**, same PR as paywall, so
copy cannot disagree with Checkout.

## Decision Log

| # | Decision | Why |
|---|---|---|
| 73 | Two model lanes (Haiku / Sonnet), four commercial states | Students feel Sonnet on heavy tasks; flashcards must not pay thinking-tokens. Four states because Sprint is a paid intro, not a third intelligence tier. |
| 74 | Sonnet 5 on Ultra only, cap 40/day, soft Haiku fallback | Opus 5 is overkill and slow. Hard block feels broken. Cap protects $9.99 margin (Sonnet 5 thinking + new tokenizer ≈ 3–5× Haiku). Do not advertise the 40. |
| 75 | Opus never in `api/complete.js` | Offline syllabus / item writing only. Prod traffic stays Haiku/Sonnet. |
| 76 | Free = 1 exam slot + first unit, not 50% of nodes | Sequential first unit is a real lesson. Half-tree skipped unit 1’s end and opened random later nodes. Reverses #63. |
| 77 | Coach Practice locked on Free; Learn Drill in unit 1 stays | Spec’s “practice drill” is the Practice Engine. Learn’s four modes in the free unit must actually work. |
| 78 | Sprint $2.99 / 3 days → Pro $5.99/mo via Subscription Schedule | Not `$0 trial_period_days`. Not a one-shot Payment + day-4 button. Reverses #62. |
| 79 | Ultra forbidden during Sprint | $2.99 cannot subsidise Sonnet. |
| 80 | Sprint always converts to **monthly** Pro | Annual is a conscious pick on Pro/Ultra paywalls, not a surprise year charge after $2.99. |
| 86 | List prices: Pro $5.99 / $54, Ultra $9.99 / $90, Sprint $2.99 | 25% annual off 12× monthly, rounded. Beats $4.99 on Haiku-unlimited IELTS grinders. |
| 81 | No 3-month SKU at launch | Four prices is enough. Add from PostHog, not guesswork. |
| 82 | Web Stripe first, Apple IAP with Capacitor | No native binary. Same commercial terms, different primitive. |
| 83 | Social proof is a live count, hidden below 50 | A fake “1,240” is a dark pattern we will not ship. |
| 84 | Cancel stays one visible tap | Apple Guideline. Win-back is information, not a maze. |
| 85 | Referral is 5h, not 5a | Money path must work before we give away weeks of Pro. |
| 100 | Live offer is a $0 3-day **Pro** trial, then $5.99/mo | Reverses #78 for launch. Checkout already uses `trial_period_days: 3`. $1.99 / $2.99 Sprint copy was a third price story. Checkout is still one Pro Price until 5d |
| 101 | Ultra = unlimited Sonnet + unlimited Socratic/Feynman + Weekly Deep Report, $9.99/mo | Not “the same app on Sonnet”. Yearly 35–40% off, A/B after launch. Hidden from the public page until 5c + 5d + the report ship. Do not advertise Sonnet on Pro until the router exists |
| 102 | Free public copy = 1 exam, first unit of each subject, calendar + journal locked | Matches code. Half-tree (#63) stays reversed. An addendum “половина тем” was a misread of the repo |
| 103 | No Ultra card, no SAT/A-Level as live trees | Copy-drift kills App Store reviews. Live trees are NMT + IELTS. Ultra keys stay in i18n unused |
| 109 | Public page lists Ultra $9.99/$90 and Pro yearly $54 (−25%). Ultra CTA is waitlist, not Checkout | Reverses the “hide Ultra” half of #103. Yearly math is #86 (5.99×12×0.75→54, 9.99×12×0.75→90), not the later “35–40% TBD” in #101. Live charge stays $5.99/mo trial until Hlib adds Stripe Price ids |
| 112 | Public page is one sentence: 3 days free, then $5.99/month. No Ultra card, no yearly toggle | Reverses #109 for public copy. Live Checkout unchanged. Ultra / Sprint / yearly stay deferred until Prices exist and Hlib says so |
| 113 | "Max" renamed "Ultra" everywhere in this doc (17 Aug 2026). Sonnet on Ultra is unconditional — no task allowlist, no 40/day cap | Session grill (17 Aug) re-decided the routing half of #74/#101: Hlib chose full-Sonnet over the cap after being shown the margin risk. Naming was drifting toward a second, uncoordinated premium tier before this session caught it. |
| 114 | Ultra copy never claims speed. Priority queue (if built) is an internal stretch goal, not marketing copy | Sonnet 5 is typically slower per-token than Haiku — a "faster" claim next to "smarter model" would be self-contradicting and provably false to anyone who notices the lag. |
| 115 | Score Predictor (formula) + AI commentary + weak-topic heatmap = the "Weekly Deep Report" named in #101, not a separate feature | One deliverable, not two. Formula-based number stays free of AI cost/latency; only the commentary sentence is a `brainComplete` call. Ships inside the existing daily-brief pipeline (email + in-app card), gated to a weekly Ultra-only block. |
| 116 | Ultra gets its own 3-day free trial (same shape as Pro's), not auto-granted to existing Pro subscribers | Existing Pro subs stay on Pro at current price; they see an opt-in "Ultra available" upgrade card, never a silent price change or forced migration. |
| 117 | Ultra Coach-chat / `complete` request quota equals Pro's, not raised further | Quota was never the Pro→Ultra differentiator — model (Sonnet vs Haiku) and the Weekly Deep Report are. Keeps `ai_limits` at two tier keys (`user`, `anon`) rather than fragmenting per paid tier. |

Build order agreed 17 Aug for when usage resets, mapped onto the
slices below: **A** = 5a-equivalent tier plumbing (Ultra model
routing in `complete.js`, no allowlist per #113) → **B** = Predictor
formula + AI commentary (#115) → **C** = heatmap, folded into the
same Weekly Deep Report block → **D** = existing-Pro opt-in upgrade
card + landing/pricing copy. **D is blocked by #112** — no public
Ultra card ships until Hlib explicitly reverses it, same as today.

## Reversibility

- Unset new Price env vars → Checkout 503s; entitlements still work
  off the webhook row / manual `profile.tier`.
- Router defaults to Haiku if Sonnet id missing.
- Free gates: a single `FREE_GATES=0` (or `profile.tier = 'pro'`
  manual) restores current “everything open” for Hlib’s account.
- Drop PostHog: events no-op without the key.

## What could break silently

| Risk | Guard |
|---|---|
| Old `profile.pro: true` clients | Migration: `pro === true` → `tier: 'pro'` in `migrateProfile`. |
| Half-tree lock tests (`freeTopicLimit(47) === 23`) | Rewrite against first-unit; do not leave both rules. |
| Sprint webhook fires without schedule phase 2 | Test: after 3 days in Test clock, status stays `active`, tier `pro`. |
| Sonnet thinking blows Hobby 60s | `maxDuration` already 60. Theory/essay on Sonnet must keep the existing 45s client race. If it times out, retry once on Haiku. |
| Free chat cap vs Learn Teach | Separate quota keys. Hitting 5 chat msgs must not 429 a Teach call. |
| Second Sprint on a new email, same card | Radar + customer fingerprint. Log `sprint_abuse_blocked`. |
| Predictor blur still copy-pasteable | Blur the number in the DOM; don’t send the raw score to the client on Free (compute server-side or omit the field). |
| Ukraine live charges | Test mode until entity/Polar. Do not “just flip live”. |

## Hlib does by hand (when 5d starts)

1. Stripe Test mode: five Prices (Sprint $2.99 / 3-day phase,
   Pro $5.99 / $54, Ultra $9.99 / $90). Put ids in Vercel.
2. Webhook events: existing four, plus
   `subscription_schedule.updated` if we use schedules.
3. Run the new `supabase/NN_entitlements.sql` (tier column,
   sonnet quota, chat quota, social-proof RPC).
4. PostHog project key → `VITE_PUBLIC_POSTHOG_KEY` when 5g ships.
5. OneSignal copy for `sprint_end` after 5f.

## Not this phase

- Polar/Paddle live entity
- Capacitor / App Store / Play / IAP
- 3-month Price
- Opus in production
- Hearts, video Teach, Whisper as paywall levers
- Fake social proof
- Hiding Cancel
