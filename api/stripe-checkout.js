// Stripe Checkout Session — subscription + 3-day trial.
//
// The secret key never leaves this function. The browser gets a hosted
// Checkout URL and redirects. No AI quota: a pay click is not an Anthropic
// call (see authenticate() in api/_guard.js).

import { authenticate, resolveAppOrigin } from "./_guard.js";
import { encodeStripeForm, isProStatus } from "./_stripe.js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://cyftpdiabopydwytyudt.supabase.co";

function serviceHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
}

export default async function handler(req, res) {
  const auth = await authenticate(req, res, "Sign in to start Pro.");
  if (!auth) return;

  const secret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!secret || !priceId) {
    res.status(503).json({ error: "Billing is not configured." });
    return;
  }

  const { user } = auth;
  if (user.is_anonymous === true) {
    res.status(403).json({ error: "Create an account to start Pro." });
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
      `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${user.id}&select=status,stripe_customer_id&limit=1`,
      { headers },
    );
    if (existingResp.ok) {
      const rows = await existingResp.json();
      const row = rows[0];
      if (row && isProStatus(row.status)) {
        res.status(409).json({ error: "Already Pro." });
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
    "subscription_data[trial_period_days]": "3",
    "subscription_data[metadata][userId]": user.id,
    "metadata[userId]": user.id,
    client_reference_id: user.id,
    success_url: `${base}/?billing=success`,
    cancel_url: `${base}/?billing=cancel`,
  };
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
