// Vercel serverless function — replaces the local AI proxy (localhost:8745)
// that index.html used during development. Reads the API key from a Vercel
// environment variable so it's never present in any file you upload.
//
// Setup on Vercel: Project Settings → Environment Variables →
//   ANTHROPIC_API_KEY         = <your Anthropic key>
//   SUPABASE_SERVICE_ROLE_KEY = <Supabase Settings → API → service_role>
//   OPENAI_API_KEY            optional — see api/_openai.js. When set, any
//                              Anthropic failure (out of credit, 5xx, rate
//                              limit, timeout, or the key missing entirely)
//                              retries the same request through OpenAI
//                              instead of failing the call. Emergency-only:
//                              does not change what model a healthy
//                              Anthropic account serves.
// Redeploy after adding them. See api/_guard.js for the optional ones.
//
// This endpoint is authenticated: every caller must present a live Supabase
// access token and spends from a per-user daily quota (supabase/07_ai_usage.sql).
// It used to be open, which meant anyone who found the URL could bill this
// project's Anthropic key indefinitely.

import { guard, recordUsage } from "./_guard.js";
import { modelForTier, resolveUserTier, thinkingConfigFor } from "./_tier.js";
import { callOpenAi, openAiModelForTier } from "./_openai.js";

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
// Sit under Vercel Hobby's 60s kill so we return JSON instead of an HTML 504
// the client then reports as "took too long".
const UPSTREAM_TIMEOUT_MS = 55_000;
// With an OpenAI fallback configured, Anthropic and OpenAI are tried
// SEQUENTIALLY inside the same 60s function — giving Anthropic the full 55s
// before even starting OpenAI blew both Vercel's own ceiling and every
// client-side race timeout (AIChat.jsx: 40-55s per call site) long before
// OpenAI got a chance to answer. A hung/slow Anthropic call now gets cut
// short fast so there is real time left for the fallback; a clean failure
// (e.g. "out of credit") returns in ~1-2s regardless and is unaffected.
const ANTHROPIC_TIMEOUT_WITH_FALLBACK_MS = 12_000;
const OPENAI_FALLBACK_TIMEOUT_MS = 35_000;

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

function anthropicErrorMessage(data) {
  if (!data) return "Upstream AI error";
  if (typeof data.error === "string") return data.error;
  if (data.error && typeof data.error.message === "string") return data.error.message;
  if (typeof data.message === "string") return data.message;
  try { return JSON.stringify(data).slice(0, 400); } catch { return "Upstream AI error"; }
}

function textFromContent(content) {
  const blocks = content || [];
  const typed = blocks.filter((b) => b && b.type === "text").map((b) => b.text || "").join("");
  if (typed) return typed;
  return blocks.map((b) => (b && b.text) || "").join("");
}

export default async function handler(req, res) {
  const gate = await guard(req, res, "complete");
  if (!gate) return; // guard already wrote 401/403/405/429

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!apiKey && !openAiKey) {
    res.status(500).json({ error: "Neither ANTHROPIC_API_KEY nor OPENAI_API_KEY is set in this Vercel project's environment variables." });
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
  const model = modelForTier(tier);
  const thinking = thinkingConfigFor(model);

  // Anthropic first (when configured) — on ANY failure (missing key, out of
  // credit, 5xx, rate limit, timeout), fall through to OpenAI if that key
  // exists, rather than failing the call. `anthropicAttempted` distinguishes
  // "we tried and it broke" from "no key, skipped straight to fallback" for
  // the combined error message if both providers end up failing.
  let anthropicAttempted = false;
  let anthropicErr = null;
  if (apiKey) {
    anthropicAttempted = true;
    try {
      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 8192,
          ...(thinking ? { thinking } : {}),
          system,
          messages: msgs,
        }),
        signal: AbortSignal.timeout(openAiKey ? ANTHROPIC_TIMEOUT_WITH_FALLBACK_MS : UPSTREAM_TIMEOUT_MS),
      });
      const data = await upstream.json();
      if (!upstream.ok) {
        const httpErr = new Error(anthropicErrorMessage(data));
        httpErr.status = upstream.status;
        throw httpErr;
      }
      // Bill the tokens this call actually cost against the user's daily budget.
      // Awaited: the Lambda freezes at response time, so an un-awaited call here
      // is not reliably delivered. gate.usage.day pins it to the day the request
      // slot was spent, not the day this line happens to run.
      await recordUsage(gate.user, "complete", data.usage, gate.usage && gate.usage.day);
      res.status(200).json({ text: textFromContent(data.content) });
      return;
    } catch (err) {
      anthropicErr = err;
    }
  }

  if (openAiKey) {
    try {
      const result = await callOpenAi({
        apiKey: openAiKey,
        model: openAiModelForTier(tier),
        system,
        msgs,
        timeoutMs: OPENAI_FALLBACK_TIMEOUT_MS,
      });
      await recordUsage(gate.user, "complete", result.usage, gate.usage && gate.usage.day);
      res.status(200).json({ text: result.text, provider: "openai-fallback" });
      return;
    } catch (openAiErr) {
      res.status(502).json({
        error: anthropicAttempted
          ? `Anthropic failed (${anthropicErr && anthropicErr.message}); OpenAI fallback also failed (${openAiErr.message}).`
          : `OpenAI failed (${openAiErr.message}).`,
      });
      return;
    }
  }

  // No OpenAI key configured — report the Anthropic failure exactly as
  // before this change: upstream's own status/message when it responded,
  // 504 on a timeout, 500 for anything else (network error, no key at all).
  const timedOut = anthropicErr && (anthropicErr.name === "TimeoutError" || anthropicErr.name === "AbortError");
  if (timedOut) {
    res.status(504).json({ error: "AI took too long. Try again." });
    return;
  }
  if (anthropicErr && anthropicErr.status) {
    res.status(anthropicErr.status).json({ error: anthropicErr.message });
    return;
  }
  res.status(500).json({ error: anthropicErr ? String(anthropicErr) : "Neither AI provider is configured." });
}
