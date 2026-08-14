// Shared Stripe helpers for the serverless functions.
//
// api/ has no npm dependencies (see api/_guard.js). The official stripe
// SDK would be the only reason to add one, so Checkout and the webhook
// speak HTTPS + HMAC themselves. These functions are also imported by
// unit tests — keep them free of req/res.

import crypto from "node:crypto";

const PRO_STATUSES = new Set(["trialing", "active", "past_due"]);
const DAY_MS = 86400000;

export function isProStatus(status) {
  return typeof status === "string" && PRO_STATUSES.has(status);
}

export function unixToIso(unix) {
  if (typeof unix !== "number" || !Number.isFinite(unix)) return null;
  return new Date(unix * 1000).toISOString();
}

export function utcDateKey(d) {
  return d.toISOString().slice(0, 10);
}

// Email the UTC calendar day before trial_end, so the student sees it
// before the charge, not after the 16:00 UTC cron on the day itself.
export function trialEmailDue(trialEnd, now) {
  if (!trialEnd || !now) return false;
  const end = new Date(trialEnd);
  if (Number.isNaN(end.getTime())) return false;
  const warn = new Date(end.getTime() - DAY_MS);
  return utcDateKey(warn) === utcDateKey(now);
}

export function encodeStripeForm(fields) {
  return Object.entries(fields)
    .filter(([, value]) => value != null && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
}

// Stripe-Signature: t=timestamp,v1=hmac_sha256(secret, timestamp + "." + rawBody)
// https://docs.stripe.com/webhooks/signatures
export function verifyStripeSignature(rawBody, header, secret, nowSec = Math.floor(Date.now() / 1000), toleranceSec = 300) {
  if (!header || !secret) return false;
  const payload = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody);
  const parsed = {};
  for (const item of String(header).split(",")) {
    const eq = item.indexOf("=");
    if (eq < 0) continue;
    const key = item.slice(0, eq).trim();
    const value = item.slice(eq + 1).trim();
    if (!parsed[key]) parsed[key] = [];
    parsed[key].push(value);
  }
  const timestamp = parsed.t && parsed.t[0];
  const signatures = parsed.v1 || [];
  if (!timestamp || !signatures.length) return false;
  const age = Math.abs(nowSec - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSec) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  return signatures.some((sig) => {
    try {
      const got = Buffer.from(sig, "hex");
      return got.length === expectedBuf.length && crypto.timingSafeEqual(expectedBuf, got);
    } catch {
      return false;
    }
  });
}
