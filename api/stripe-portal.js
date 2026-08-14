// Stripe Customer Portal — cancel / invoices / payment method.
// Same auth-only gate as Checkout. Needs the portal enabled in the
// Stripe Dashboard (Settings → Billing → Customer portal) or this 502s.

import { authenticate, resolveAppOrigin } from "./_guard.js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://cyftpdiabopydwytyudt.supabase.co";

function serviceHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
}

export default async function handler(req, res) {
  const auth = await authenticate(req, res, "Sign in to manage billing.");
  if (!auth) return;

  const secret = process.env.STRIPE_SECRET_KEY;
  const headers = serviceHeaders();
  if (!secret || !headers) {
    res.status(503).json({ error: "Billing is not configured." });
    return;
  }

  const custResp = await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${auth.user.id}&select=stripe_customer_id&limit=1`,
    { headers },
  );
  const rows = custResp.ok ? await custResp.json() : [];
  const customerId = rows[0] && rows[0].stripe_customer_id;
  if (!customerId) {
    res.status(404).json({ error: "No Stripe customer yet. Start a trial first." });
    return;
  }

  const body = new URLSearchParams({
    customer: customerId,
    return_url: `${resolveAppOrigin(req)}/`,
  });
  const stripeResp = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const session = await stripeResp.json().catch(() => ({}));
  if (!stripeResp.ok || !session.url) {
    res.status(502).json({ error: "Could not open the billing portal." });
    return;
  }
  res.status(200).json({ url: session.url });
}
