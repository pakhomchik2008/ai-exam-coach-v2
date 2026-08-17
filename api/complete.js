// Vercel serverless function — replaces the local AI proxy (localhost:8745)
// that index.html used during development. Reads the API key from a Vercel
// environment variable so it's never present in any file you upload.
//
// Setup on Vercel: Project Settings → Environment Variables →
//   ANTHROPIC_API_KEY         = <your Anthropic key>
//   SUPABASE_SERVICE_ROLE_KEY = <Supabase Settings → API → service_role>
// Redeploy after adding them. See api/_guard.js for the optional ones.
//
// This endpoint is authenticated: every caller must present a live Supabase
// access token and spends from a per-user daily quota (supabase/07_ai_usage.sql).
// It used to be open, which meant anyone who found the URL could bill this
// project's Anthropic key indefinitely.

import { guard, recordUsage } from "./_guard.js";
import { modelForTier, resolveUserTier } from "./_tier.js";

// Extend to 60 s so lesson generation (8-12 structured steps) doesn't time out
// on Vercel Hobby. Pro plan supports up to 300 s.
export const config = { maxDuration: 60 };

// Size caps. Quota limits how MANY requests a user makes; these limit how
// expensive any single one can be.
//
// This used to be 200_000 — sized for the largest *text* prompt in the app
// (curriculum-store.jsx's URL import, ~12 KB of scraped page text). It did not
// account for file attachments: a single phone photo is 2-5 MB raw, which is
// 3-7 MB once base64-encoded, so the very first image attachment already blew
// past it. That surfaced as a generic "Analysis failed" / "Connection hiccup"
// with no indication it was a size problem.
//
// Raised to sit just under Vercel's own hard ~4.5 MB request-body limit for
// Node serverless functions, which cannot be worked around by changing this
// number — it is a platform ceiling, not application config. This gives real
// headroom for a resized image (see src/lib/image-resize.ts, which downscales
// to Claude's own 1568px recommendation before encoding) plus conversation
// history, while a truly huge attachment — a many-page PDF sent whole — will
// still correctly fail here rather than being silently truncated upstream.
const MAX_PAYLOAD_CHARS = 4_000_000;
const MAX_MESSAGES = 80;

function payloadError(system, msgs) {
  if (!Array.isArray(msgs)) return "messages must be an array";
  if (!msgs.length) return "messages is empty";
  if (msgs.length > MAX_MESSAGES) return `Too many messages (max ${MAX_MESSAGES})`;
  for (const m of msgs) {
    if (!m || typeof m !== "object") return "Each message must be an object";
    if (m.role !== "user" && m.role !== "assistant") return "Invalid message role";
    if (typeof m.content !== "string" && !Array.isArray(m.content)) {
      return "Message content must be a string or an array of blocks";
    }
  }
  const size = JSON.stringify({ system, msgs }).length;
  if (size > MAX_PAYLOAD_CHARS) {
    return `Payload too large (${size} chars, max ${MAX_PAYLOAD_CHARS})`;
  }
  return null;
}

export default async function handler(req, res) {
  const gate = await guard(req, res, "complete");
  if (!gate) return; // guard already wrote 401/403/405/429

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY is not set in this Vercel project's environment variables." });
    return;
  }

  // `system` may be a plain string (legacy callers) or an array of content
  // blocks with `cache_control` for prompt caching (ai-brain.jsx's
  // brainComplete) — forwarded to Anthropic as-is either way.
  const { system, messages, prompt } = req.body || {};
  // Accept either {messages} (from brainComplete) or {prompt} (legacy fallback)
  const msgs = messages || (prompt ? [{ role: "user", content: prompt }] : null);
  if (!msgs) {
    res.status(400).json({ error: "Missing messages or prompt" });
    return;
  }

  const invalid = payloadError(system, msgs);
  if (invalid) {
    res.status(400).json({ error: invalid });
    return;
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceHeaders = serviceKey
    ? { "Content-Type": "application/json", apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
    : null;
  const tier = await resolveUserTier(gate.user, serviceHeaders);

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: modelForTier(tier),
        max_tokens: 8192,
        system,
        messages: msgs,
      }),
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: data });
      return;
    }
    // Bill the tokens this call actually cost against the user's daily budget.
    // Awaited: the Lambda freezes at response time, so an un-awaited call here
    // is not reliably delivered. gate.usage.day pins it to the day the request
    // slot was spent, not the day this line happens to run.
    await recordUsage(gate.user, "complete", data.usage, gate.usage && gate.usage.day);
    const text = (data.content || []).map((b) => b.text || "").join("");
    res.status(200).json({ text });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
