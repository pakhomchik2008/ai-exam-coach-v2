// Examik — one-click unsubscribe target for the footer link in every
// notification email (see api/notifications-cron.js). GDPR/CAN-SPAM require
// this to work without a login step, so it takes just the user id from the
// query string and flips `notifUnsubscribed: true` on that user's synced
// `user_profile_v1` row.
//
// The user id itself isn't a secret (it goes in the URL of every email we
// send), so this endpoint needs no login. But a bare UUID with no proof of
// possession is an IDOR: anyone who has ever seen ONE unsubscribe link (a
// forwarded email, an intercepted one) could swap in any other victim's
// UUID and silently mute them, including the trial-ending billing warning.
// The `t` param is an HMAC-SHA256 of the user id, signed with
// UNSUBSCRIBE_SECRET when notifications-cron.js builds the link — proof the
// server issued this link for this specific id. Falls back to accepting an
// unsigned link when UNSUBSCRIBE_SECRET isn't set (matches this codebase's
// degrade-don't-block convention for missing env vars, and keeps already-
// sent emails' links working), but that means the IDOR stays open until the
// secret is configured in Vercel.
// Fail-safe direction: too easy to unsubscribe is fine, too easy to sign up
// somebody else would not be.
//
// GET-based, matching what every email client actually renders: browsers
// (and preview panes) rewrite unsubscribe links as GET, and any POST-only
// design would strand recipients on a broken page. RFC 8058's List-
// Unsubscribe-Post header is added by the send path, not here.

import { createHmac, timingSafeEqual } from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://cyftpdiabopydwytyudt.supabase.co";

function validToken(userId, token) {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) return true; // not configured yet — degrade to the old unauthenticated behavior
  if (typeof token !== "string" || !token) return false;
  const expected = createHmac("sha256", secret).update(userId).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const gotBuf = Buffer.from(token, "hex");
  return expectedBuf.length === gotBuf.length && timingSafeEqual(expectedBuf, gotBuf);
}

function serviceHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function page(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;background:#f8fafc;color:#0f172a;
display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;max-width:420px;text-align:center;}
h1{margin:0 0 8px;font-size:20px;}p{margin:8px 0 0;color:#475569;font-size:14px;line-height:1.5;}
</style></head><body><div class="card">${body}</div></body></html>`;
}

export default async function handler(req, res) {
  const userId = (req.query && req.query.u) || "";
  const token = (req.query && req.query.t) || "";
  const headers = serviceHeaders();
  if (!headers) {
    res.status(500).setHeader("Content-Type", "text/html; charset=utf-8")
      .send(page("Configuration error", "<h1>Not configured</h1><p>SUPABASE_SERVICE_ROLE_KEY is not set.</p>"));
    return;
  }
  if (!UUID_RE.test(userId)) {
    res.status(400).setHeader("Content-Type", "text/html; charset=utf-8")
      .send(page("Invalid link", "<h1>Invalid link</h1><p>This unsubscribe link is malformed.</p>"));
    return;
  }
  if (!validToken(userId, token)) {
    res.status(403).setHeader("Content-Type", "text/html; charset=utf-8")
      .send(page("Invalid link", "<h1>Invalid link</h1><p>This unsubscribe link is invalid.</p>"));
    return;
  }

  // Read the existing profile blob, patch notifUnsubscribed, upsert back.
  // Merging rather than replacing keeps every other field the client owns
  // (exam prefs, timezone, reminder hour, ...) intact.
  const readResp = await fetch(
    `${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${userId}&key=eq.user_profile_v1&select=value&limit=1`,
    { headers },
  );
  if (!readResp.ok) {
    res.status(500).setHeader("Content-Type", "text/html; charset=utf-8")
      .send(page("Error", "<h1>Something went wrong</h1><p>We couldn't update your preference. Please try again later.</p>"));
    return;
  }
  const rows = await readResp.json();
  const existing = rows[0] && rows[0].value && typeof rows[0].value === "object" ? rows[0].value : {};
  const next = { ...existing, notifUnsubscribed: true };

  const writeResp = await fetch(`${SUPABASE_URL}/rest/v1/user_data`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ user_id: userId, key: "user_profile_v1", value: next }),
  });
  if (!writeResp.ok) {
    res.status(500).setHeader("Content-Type", "text/html; charset=utf-8")
      .send(page("Error", "<h1>Something went wrong</h1><p>We couldn't update your preference. Please try again later.</p>"));
    return;
  }

  res.status(200).setHeader("Content-Type", "text/html; charset=utf-8")
    .send(page("Unsubscribed", "<h1>You're unsubscribed</h1><p>You won't receive any more study reminders. Change your mind? Toggle notifications back on in the app's Settings.</p>"));
}
