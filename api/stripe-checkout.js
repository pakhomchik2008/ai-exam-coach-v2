// Stripe Checkout Session — Pro or Ultra, monthly or yearly, 3-day trial.
//
// The secret key never leaves this function. The browser gets a hosted
// Checkout URL and redirects. No AI quota: a pay click is not an Anthropic
// call (see authenticate() in api/_guard.js).
//
// Phase 5 slice E (Decision #118/#119): public Ultra + yearly. Four Price
// ids, each optional — missing ones 503 individually rather than the whole
// endpoint refusing to boot. Body is `{ tier, interval }`, both optional and
// defaulting to the original Pro-monthly shape so existing callers (the
// Free-tier "Start 3-day trial" button) keep working unchanged.

import { authenticate, resolveAppOrigin } from "./_guard.js";
import { encodeStripeForm, isProStatus } from "./_stripe.js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://cyftpdiabopydwytyudt.supabase.co";

function serviceHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
}

export function priceEnvVar(tier, interval) {
  const yearly = interval === "yearly";
  if (tier === "ultra") return yearly ? "STRIPE_PRICE_ID_ULTRA_YEARLY" : "STRIPE_PRICE_ID_ULTRA";
  return yearly ? "STRIPE_PRICE_ID_YEARLY" : "STRIPE_PRICE_ID";
}

export default async function handler(req, res) {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const tier = body.tier === "ultra" ? "ultra" : "pro";
  const interval = body.interval === "yearly" ? "yearly" : "monthly";
  const skipTrial = body.skipTrial === true;

  const auth = await authenticate(req, res, tier === "ultra" ? "Sign in to start Ultra." : "Sign in to start Pro.");
  if (!auth) return;

  const secret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env[priceEnvVar(tier, interval)];
  if (!secret || !priceId) {
    res.status(503).json({ error: "Billing is not configured." });
    return;
  }

  const { user } = auth;
  if (user.is_anonymous === true) {
    res.status(403).json({ error: `Create an account to start ${tier === "ultra" ? "Ultra" : "Pro"}.` });
    return;
  }

  const email = typeof user.email === "string" ? user.email.trim() : "";
  if (!email) {
    res.status(400).json({ error: "Add an email in Settings first." });
    return;
  }

  let customerId = "";
  const headers = serviceHeaders();
  if (headers) {
    const existingResp = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${user.id}&select=status,tier,stripe_customer_id&limit=1`,
      { headers },
    );
    if (existingResp.ok) {
      const rows = await existingResp.json();
      const row = rows[0];
      if (row && isProStatus(row.status)) {
        // Same tier already active — nothing to do. A different paid tier
        // must go through the Stripe portal (Settings > Subscription),
        // never a second parallel Checkout session — that would double-bill.
        if (row.tier === tier) {
          res.status(409).json({ error: `Already ${tier === "ultra" ? "Ultra" : "Pro"}.` });
          return;
        }
        res.status(409).json({ error: "You already have a paid plan. Manage it from Settings." });
        return;
      }
      if (row && typeof row.stripe_customer_id === "string") {
        customerId = row.stripe_customer_id;
      }
    }
  }

  const base = resolveAppOrigin(req);
  const fields = {
    mode: "subscription",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    "subscription_data[metadata][userId]": user.id,
    "metadata[userId]": user.id,
    client_reference_id: user.id,
    success_url: `${base}/?billing=success`,
    cancel_url: `${base}/?billing=cancel`,
    allow_promotion_codes: "true",
  };
  // Trial is opt-in from the client now — was hardcoded on every checkout
  // with no way to just pay today (Hlib, 27 Aug 2026).
  if (!skipTrial) fields["subscription_data[trial_period_days]"] = "3";
  if (customerId) fields.customer = customerId;
  else fields.customer_email = email;

  const stripeResp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encodeStripeForm(fields),
  });
  const session = await stripeResp.json().catch(() => ({}));
  if (!stripeResp.ok || !session.url) {
    res.status(502).json({ error: "Could not start checkout." });
    return;
  }

  res.status(200).json({ url: session.url });
}
