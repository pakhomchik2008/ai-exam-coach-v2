// RevenueCat webhook — the native-iOS counterpart to stripe-webhook.js.
// Same `subscriptions` table, same tier/status semantics, so refreshProStatus()
// and the cron's trial_end email trigger don't need to know which store paid.
//
// RevenueCat's app_user_id IS our Supabase user id — native-iap.ts configures
// the SDK with { appUserID: session.id } right after sign-in specifically so
// this webhook never needs a separate identity-mapping table.
//
// Auth: RevenueCat sends whatever string is configured as the webhook's
// "Authorization header" verbatim. Unsigned POSTs would let anyone grant
// themselves a subscription, so this fails closed without
// REVENUECAT_WEBHOOK_SECRET and rejects any request whose Authorization
// header doesn't match it exactly.

const SUPABASE_URL = process.env.SUPABASE_URL || "https://cyftpdiabopydwytyudt.supabase.co";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Statuses that keep the account cron/UI-visible as Pro/Ultra — mirrors
// isProStatus() in api/_stripe.js so both stores share one definition of "paying".
function isProStatus(status) {
  return status === "trialing" || status === "active" || status === "past_due";
}

// RevenueCat events that still mean "keep access" — CANCELLATION only turns
// off auto-renew, the subscriber keeps access until expiration_at_ms.
const ACTIVE_EVENT_TYPES = new Set([
  "INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION", "CANCELLATION",
]);

function statusFromEvent(type, periodType) {
  if (type === "EXPIRATION") return "canceled";
  if (type === "BILLING_ISSUE") return "past_due";
  if (!ACTIVE_EVENT_TYPES.has(type)) return null; // TEST, TRANSFER, etc. — ignore, don't touch the row
  return periodType === "TRIAL" ? "trialing" : "active";
}

// Ultra products aren't created in App Store Connect yet — same "falls
// through to pro until Hlib makes the product" story as Stripe's
// ULTRA_PRICE_ENV_VARS (see tierFromPriceId in api/stripe-webhook.js).
const ULTRA_PRODUCT_ENV_VARS = ["REVENUECAT_PRODUCT_ID_ULTRA_MONTHLY", "REVENUECAT_PRODUCT_ID_ULTRA_YEARLY"];

function tierFromProductId(productId, status) {
  if (!isProStatus(status)) return "free";
  if (productId && ULTRA_PRODUCT_ENV_VARS.some((name) => productId === process.env[name])) return "ultra";
  return "pro";
}

function msToIso(ms) {
  return typeof ms === "number" && ms > 0 ? new Date(ms).toISOString() : null;
}

function serviceHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
}

async function upsertSubscription(headers, row) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify(row),
  });
  return resp.ok;
}

// Duplicated from api/stripe-webhook.js on purpose — two call sites reading
// and merge-patching the same user_data row is simple; a shared helper
// module would need its own careful import wiring for two Vercel functions
// that otherwise share nothing.
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

async function handleEvent(event, headers) {
  const userId = event && event.app_user_id;
  const type = event && event.type;
  if (!userId || !UUID_RE.test(userId) || !type) return;

  const status = statusFromEvent(type, event.period_type);
  if (!status) return;

  const tier = tierFromProductId(event.product_id || null, status);
  const row = {
    user_id: userId,
    status,
    trial_end: event.period_type === "TRIAL" ? msToIso(event.expiration_at_ms) : null,
    current_period_end: msToIso(event.expiration_at_ms),
    tier,
  };
  await upsertSubscription(headers, row);
  await patchProfileTier(headers, userId, isProStatus(status), tier);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
  const headers = serviceHeaders();
  if (!webhookSecret || !headers) {
    res.status(503).json({ error: "Webhook is not configured." });
    return;
  }

  if (req.headers.authorization !== webhookSecret) {
    res.status(401).json({ error: "Invalid signature." });
    return;
  }

  const body = req.body && typeof req.body === "object" ? req.body : null;
  const event = body && body.event;
  if (!event) {
    res.status(400).json({ error: "Invalid payload." });
    return;
  }

  try {
    await handleEvent(event, headers);
  } catch {
    res.status(500).json({ error: "Handler failed." });
    return;
  }

  res.status(200).json({ received: true });
}
