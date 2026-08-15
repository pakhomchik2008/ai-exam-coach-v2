# Phase 4.6 — Settings as grouped cards

Branch: `phase-4.6/settings`, cut from `main` after #28 (Stripe).

Hlib asked for the full 10-block Settings spec (Notion/Linear grouping,
named cards, subscription findable). This slice ships the layout and
wires every row that already has a backend. It does not invent Crisp,
an App Store, or an image model.

## Ships

- Hub is a 3-column tile grid (OneSignal-style). Each tile opens an
  in-tab page (not a bottom sheet). Subscription tile shows Active / trial CTA.
- Subscription card first after profile (the buy button that was
  invisible in the flat list). Breathing border on Free.
- Theme carousel: 6 palettes (Cream default). Tap previews, Save persists.
  data-theme on html; data-tier still only the XP wash.
- Accent presets (existing tweak palettes, now on the profile).
- Language flag carousel, country, dyslexia spacing, tier-background toggle.
- Sounds + volume + preview-on-enable + `navigator.vibrate` on web.
- Notification master + existing per-trigger toggles + quiet hours stored.
- Stripe Customer Portal session (`/api/stripe-portal`). Promo codes
  allowed on Checkout.
- Export JSON of `PERSONAL_DATA_KEYS`. Privacy/terms via landing legal
  ids. Telegram + GitHub + TikTok already on the footer.
- About + version easter egg. Danger zone with streak/XP confirm.
- Avatar: initials canvas or a resized photo data URL. No AI generate
  (Decision Log #39).

## Honest gaps (UI is there, infra is not)

| Row | Why it is not a real Crisp/App Store/etc |
|---|---|
| Crisp chat | No Crisp website id. Support row opens Telegram + mailto. |
| App Store review | No native binary. Row hidden on web. |
| Quiet hours vs cron | Hobby cron is 16:00 UTC once a day. Quiet hours are saved; they cannot retarget send time. |
| Dark mode holes | ~246 hardcoded colour literals. Semantic tokens flip; some screens stay light. Same caveat as Legend tier. |
| Delete account | `POST /api/delete-account` cancels Stripe (best-effort) then hard-deletes `auth.users`. Rows with `ON DELETE CASCADE` go with it. |
| Payment history | Portal shows it. No in-app invoice table. |

## Decision Log

| # | Decision | Why |
|---|---|---|
| 67 | Hub tiles + in-tab pages, not 10 new routes | Spec screenshot. Keeps Settings as one tab. |
| 68 | No Crisp SDK without a website id | Same as Resend: missing key is a no-op, not a fake widget. |
| 69 | Avatar is photo/initials, not a model | Decision Log #39. |
| 70 | Theme tap previews; Save persists; Back without Save reverts | Phone sheets were too short for carousel + Save. Page close is the revert point. |
| 71 | Six named palettes, not Light/Dark/System | Spec. Cream is default. Old `dark` profiles map to midnight. |
| 72 | Pages, not bottom sheets | Phone overlays cramped Personalization / Notifications. Nested pages back to the parent page. |

## Reversibility

- `profile.theme` default `system` is a no-op.
- Unset `STRIPE_SECRET_KEY` and portal 503s; Checkout still works.
