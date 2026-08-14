// Deletes this student's auth user. user_data / subscriptions / usage /
// notification_log all cascade from auth.users. Stripe cancel is best-effort
// so a GDPR wipe is not blocked by a missing Price or a dead Checkout.
//
// Authenticated POST only — same gate as Checkout, no AI quota.

import { authenticate } from "./_guard.js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://cyftpdiabopydwytyudt.supabase.co";

function serviceHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
}

async function cancelStripe(headers, userId) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return;
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&select=stripe_subscription_id&limit=1`,
    { headers },
  );
  if (!resp.ok) return;
  const rows = await resp.json();
  const subId = rows[0] && rows[0].stripe_subscription_id;
  if (typeof subId !== "string" || !subId) return;
  await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${secret}` },
  });
}

export default async function handler(req, res) {
  const auth = await authenticate(req, res, "Sign in to delete your account.");
  if (!auth) return;

  const headers = serviceHeaders();
  if (!headers) {
    res.status(503).json({ error: "Account deletion is not configured." });
    return;
  }

  const userId = auth.user.id;
  try {
    await cancelStripe(headers, userId);
  } catch {
    // Keep going — leftover Stripe is refundable; leftover PII is not.
  }

  const del = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users/${userId}?shouldSoftDelete=false`,
    { method: "DELETE", headers },
  );
  if (!del.ok) {
    res.status(500).json({ error: "Could not delete the account. Email support." });
    return;
  }

  res.status(200).json({ ok: true });
}
