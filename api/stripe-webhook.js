// Stripe webhook — the only writer that may flip Pro.
//
// Unsigned POSTs would let anyone grant themselves a subscription, so this
// endpoint fails closed without STRIPE_WEBHOOK_SECRET and verifies the
// Stripe-Signature HMAC on the raw body. bodyParser is off for that reason.

import { isProStatus, unixToIso, verifyStripeSignature } from "./_stripe.js";

export const config = {
  api: { bodyParser: false },
};

const SUPABASE_URL = process.env.SUPABASE_URL || "https://cyftpdiabopydwytyudt.supabase.co";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function serviceHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function stripeGet(path, secret) {
  const resp = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!resp.ok) return null;
  return resp.json();
}

async function lookupUserIdByCustomer(headers, customerId) {
  if (!customerId) return "";
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions?stripe_customer_id=eq.${encodeURIComponent(customerId)}&select=user_id&limit=1`,
    { headers },
  );
  if (!resp.ok) return "";
  const rows = await resp.json();
  return rows[0] && rows[0].user_id ? rows[0].user_id : "";
}

async function upsertSubscription(headers, row) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify(row),
  });
  return resp.ok;
}

async function patchProfileTier(headers, userId, pro, tier) {
  const readResp = await fetch(
    `${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${userId}&key=eq.user_profile_v1&select=value&limit=1`,
    { headers },
  );
  if (!readResp.ok) return;
  const rows = await readResp.json();
  const existing = rows[0] && rows[0].value && typeof rows[0].value === "object" ? rows[0].value : {};
  const next = { ...existing, pro, tier };
  await fetch(`${SUPABASE_URL}/rest/v1/user_data`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ user_id: userId, key: "user_profile_v1", value: next }),
  });
}

// Which product a subscription is for, from its Price id. Ultra's Price
// doesn't exist yet — STRIPE_PRICE_ID_ULTRA is unset until Hlib creates it in
// Stripe (see "Hlib does by hand" in docs/phase-5-billing-tiers-plan.md), so
// this falls through to 'pro' for every live subscription until then.
export function tierFromPriceId(priceId, status) {
  if (!isProStatus(status)) return "free";
  if (priceId && priceId === process.env.STRIPE_PRICE_ID_ULTRA) return "ultra";
  return "pro";
}

function subscriptionPriceId(sub) {
  const item = sub.items && Array.isArray(sub.items.data) ? sub.items.data[0] : null;
  return (item && item.price && item.price.id) || null;
}

function subscriptionRow(userId, sub, customerId) {
  const status = typeof sub.status === "string" ? sub.status : "none";
  return {
    user_id: userId,
    stripe_customer_id: customerId || sub.customer || null,
    stripe_subscription_id: sub.id || null,
    status,
    trial_end: unixToIso(sub.trial_end),
    current_period_end: unixToIso(sub.current_period_end),
    tier: tierFromPriceId(subscriptionPriceId(sub), status),
  };
}

async function apply(headers, userId, sub, customerId) {
  if (!UUID_RE.test(userId) || !sub) return;
  const row = subscriptionRow(userId, sub, customerId);
  await upsertSubscription(headers, row);
  await patchProfileTier(headers, userId, isProStatus(row.status), row.tier);
}

async function handleEvent(event, secret, headers) {
  const type = event && event.type;
  const obj = event && event.data && event.data.object;
  if (!type || !obj) return;

  if (type === "checkout.session.completed") {
    const userId = (obj.metadata && obj.metadata.userId) || obj.client_reference_id || "";
    const subId = typeof obj.subscription === "string" ? obj.subscription : obj.subscription && obj.subscription.id;
    const customerId = typeof obj.customer === "string" ? obj.customer : "";
    const sub = subId ? await stripeGet(`subscriptions/${subId}`, secret) : null;
    if (sub) await apply(headers, userId, sub, customerId);
    return;
  }

  if (type === "customer.subscription.updated" || type === "customer.subscription.deleted") {
    const userId = (obj.metadata && obj.metadata.userId) || await lookupUserIdByCustomer(headers, obj.customer);
    const sub = type === "customer.subscription.deleted" ? { ...obj, status: "canceled" } : obj;
    await apply(headers, userId, sub, obj.customer);
    return;
  }

  if (type === "invoice.paid") {
    const subId = typeof obj.subscription === "string" ? obj.subscription : "";
    if (!subId) return;
    const sub = await stripeGet(`subscriptions/${subId}`, secret);
    if (!sub) return;
    const userId = (sub.metadata && sub.metadata.userId) || await lookupUserIdByCustomer(headers, sub.customer);
    await apply(headers, userId, sub, sub.customer);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const headers = serviceHeaders();
  if (!webhookSecret || !stripeKey || !headers) {
    res.status(503).json({ error: "Webhook is not configured." });
    return;
  }

  const raw = await readRawBody(req);
  if (!verifyStripeSignature(raw, req.headers["stripe-signature"], webhookSecret)) {
    res.status(400).json({ error: "Invalid signature." });
    return;
  }

  let event;
  try {
    event = JSON.parse(raw.toString("utf8"));
  } catch {
    res.status(400).json({ error: "Invalid JSON." });
    return;
  }

  try {
    await handleEvent(event, stripeKey, headers);
  } catch {
    res.status(500).json({ error: "Handler failed." });
    return;
  }

  res.status(200).json({ received: true });
}
