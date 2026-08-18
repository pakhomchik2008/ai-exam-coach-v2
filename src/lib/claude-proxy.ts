/**
 * `window.claude.complete` — the single client-side entry point for every AI
 * call in the app. Lifted verbatim out of the inline <script> in index.html so
 * that index.html can carry a strict CSP with no inline-script exemption
 * (Phase 6 requirement).
 *
 * The daily cap lives server-side per user (supabase/07_ai_usage.sql), not here.
 * The old client-side counter was both unenforceable — /api/complete accepted
 * anyone — and silently masqueraded as real AI output once exhausted.
 *
 * Every call carries the caller's Supabase access token via window.apiHeaders
 * (published by auth-store.jsx); api/_guard.js rejects requests without one.
 */

import { apiUrl } from "./platform";

type CompleteArg = string | { system?: string; messages: unknown[] };

interface ProxyError extends Error {
  status?: number;
}

async function complete(arg: CompleteArg): Promise<string> {
  const system = typeof arg === "string" ? undefined : arg.system;
  const messages = typeof arg === "string" ? [{ role: "user", content: arg }] : arg.messages;

  const getHeaders = (window as unknown as Record<string, unknown>)["apiHeaders"] as
    | (() => Promise<Record<string, string>>)
    | undefined;

  const headers = getHeaders ? await getHeaders() : { "Content-Type": "application/json" };

  const res = await fetch(apiUrl("/api/complete"), {
    method: "POST",
    headers,
    body: JSON.stringify({ system, messages }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // 401/403/429 carry a plain sentence meant for the user; anything else is an
    // upstream object worth keeping verbatim for debugging. `data.error` is
    // usually already a plain string (our own validation messages, e.g.
    // "Payload too large (...)") — JSON.stringify-ing a string just wraps it in
    // an extra pair of quotes, so only reach for that on a non-string payload.
    const msg =
      res.status === 401 || res.status === 403 || res.status === 429
        ? data.error || "AI is unavailable right now."
        : typeof data.error === "string"
          ? data.error
          : data.error
            ? JSON.stringify(data.error)
            : "Local API is not running. Second terminal: npm run dev:api";
    const err: ProxyError = new Error(msg);
    err.status = res.status;
    throw err;
  }

  return data.text;
}

Object.assign(window, { claude: { complete } });

export {};
