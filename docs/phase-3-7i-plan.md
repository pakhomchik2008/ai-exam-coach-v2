# Phase 3.7i — Stripe Checkout + trial-end email

Branch: `phase-3.7i/stripe`, cut from `main` after #25 (Speaking).

Landing already promised a 3-day trial then $4/month. Keys are on
Vercel (Test mode). This slice takes money and unlocks the second half
of each Learn tree. It does not invent a new paywall shape.

## MVP

- Checkout Session, subscription, `trial_period_days: 3`, Price from
  `STRIPE_PRICE_ID`. Secret key stays on the server.
- Webhook flips Pro. Table `subscriptions` is source of truth;
  `profile.pro` is a cache so `isProUser()` keeps working.
- Trial-end email is the 6th cron trigger. Billing notice — still
  sends if the student unsubscribed from study reminders.
- Missing keys / missing table → 503 or no-op, never a blank screen.

## Deferred

| Item | Why |
|---|---|
| Live mode | Stripe does not support Ukrainian companies. Test mode is enough to code. Live later = Paddle / Lemon Squeezy / Polar, or a foreign entity. |
| Customer portal / cancel in-app | Stripe Dashboard + Stripe's own emails for v1. |
| Annual / Opus prices on the landing | Not a Price in Stripe. Pro monthly is $4, matching the Price Hlib created. |
| Hearts / video / Coach tiering | Existing half-tree lock is the paywall. Don't restack gates in the same PR. |
| No-card trial | Checkout collects a card. Landing "no card" copy was pre-billing. |

## Decision Log

| # | Decision | Why |
|---|---|---|
| 62 | Carded 3-day Checkout trial | Stripe's default. Landing FAQ already said the real trial would be carded. |
| 63 | Keep the half-tree free split | Already shipped. Don't switch to "1 unit free" in the billing PR. |
| 64 | `subscriptions` table, not only `user_data` | Webhook looks up by customer id. Cron needs `trial_end`. A client `saveProfile` must not be able to wipe Pro. |
| 65 | No `stripe` npm package | `api/` has zero dependencies. `fetch` + HMAC-SHA256, same as Resend. |
| 66 | Checkout does not spend AI quota | `authenticate()` is origin + JWT only. A pay click must not burn the daily complete budget. |

## Reversibility

- Unset the three Stripe env vars. Checkout returns 503; Learn stays
  on the manual `profile.pro` flag.
- Drop `subscriptions` after a rollback if Hlib wants it gone. Client
  treats PGRST205 as "no row".

## What could break silently

| Risk | Guard |
|---|---|
| Webhook URL created before this route exists | Hlib waits. After merge: Test mode → Webhooks → `/api/stripe-webhook`. Signing secret → `STRIPE_WEBHOOK_SECRET` on Production **and** Preview, then redeploy. |
| Preview checkout, webhook only on Production | Same Stripe account. `userId` is in metadata. Production webhook still writes the row. Success URL uses the request Origin so preview users return to preview. |
| Table not run | Checkout still redirects. Webhook patches `user_profile_v1.pro` as fallback. Cron skips trial-end (PGRST205). |
| Client `saveProfile` races the webhook | Refresh reads the table on boot and after `?billing=success`. No row → leave `profile.pro` alone (manual flag still works). |
| Ukraine live Stripe | Not this slice. Test charges only. |

## After merge — Hlib does this

1. Run `supabase/18_subscriptions.sql` in the SQL editor.
2. Stripe Dashboard, **Test mode ON**.
3. Developers → Webhooks → Add endpoint
   `https://ai-exam-coach-v2.vercel.app/api/stripe-webhook`
4. Events only: `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.paid`.
5. Signing secret `whsec_…` → Vercel `STRIPE_WEBHOOK_SECRET`
   (Production + Preview) → **redeploy**.
6. Send a test event → expect HTTP 200.
7. Real test: sign in (not Demo) → Settings or a locked topic →
   start trial → test card `4242…`.
