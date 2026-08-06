// Shared gate for every serverless function in this project.
//
// Files under api/ whose name starts with "_" are NOT routed by Vercel, so this
// is a plain module, not an endpoint.
//
// Three checks, in order:
//   1. Origin  — cheap, blocks a page on someone else's domain using a stolen
//                token from a logged-in visitor. Weak on its own (curl just
//                omits the header), which is why it is not the only check.
//   2. Auth    — the caller must present a live Supabase access token. Verified
//                against Supabase's own /auth/v1/user, so a forged or expired
//                JWT is rejected without this project shipping any JWT library
//                (there is no package.json here — these functions run with zero
//                npm dependencies).
//   3. Quota   — public.ai_quota_consume() in 07_ai_usage.sql, spent per user
//                per UTC day. Requires SUPABASE_SERVICE_ROLE_KEY.
//
// Required Vercel environment variables:
//   ANTHROPIC_API_KEY          (api/complete.js only)
//   SUPABASE_SERVICE_ROLE_KEY  Settings → API → service_role. SECRET.
//   SUPABASE_URL               optional, defaults to the project below
//   SUPABASE_ANON_KEY          optional, defaults to the publishable key below
//   ALLOWED_ORIGINS            optional, comma-separated; defaults below

// These two are already public — auth-store.jsx ships them to every browser —
// so hardcoding them as defaults leaks nothing and keeps setup to one variable.
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://cyftpdiabopydwytyudt.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || "sb_publishable_wL5HRZEHk9zAMUNWJa0BMA_IA4cC9Wo";

const DEFAULT_ORIGINS = [
  "https://ai-exam-coach-v2.vercel.app",
  "http://127.0.0.1:5050",
  "http://localhost:5050",
];

function allowedOrigins() {
  const fromEnv = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return fromEnv.length ? fromEnv : DEFAULT_ORIGINS;
}

// Vercel preview deployments get a generated hostname per commit, so an exact
// allowlist would break every preview. Same project, same owner — allowed.
function isVercelPreview(origin) {
  try {
    const h = new URL(origin).hostname;
    return h.endsWith(".vercel.app") && h.startsWith("ai-exam-coach");
  } catch {
    return false;
  }
}

// Enforced only when the header is present. A missing Origin means a non-browser
// caller (curl, a script) — those are stopped by the auth check below instead,
// and rejecting them here would only push an attacker into deleting one header.
function originRejected(req) {
  const origin = req.headers.origin;
  if (!origin) return null;
  const list = allowedOrigins();
  if (list.includes(origin) || isVercelPreview(origin)) return null;
  return { status: 403, body: { error: "Origin not allowed" } };
}

// ─── token verification ───────────────────────────────────────────────────────
// /auth/v1/user costs one round-trip to Supabase (~50-120 ms). A short cache
// keeps a burst of calls from the same page — the wizard fires several — down to
// one. 60 s is far below the token lifetime, so a signed-out user cannot keep
// using the API for any meaningful window.

const TOKEN_TTL_MS = 60_000;
const tokenCache = new Map(); // token -> { user, expires }

function cachePrune() {
  if (tokenCache.size < 500) return;
  const now = Date.now();
  for (const [k, v] of tokenCache) if (v.expires <= now) tokenCache.delete(k);
}

function bearerToken(req) {
  const raw = req.headers.authorization || req.headers.Authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(raw.trim());
  return m ? m[1].trim() : null;
}

async function verifyToken(token) {
  const hit = tokenCache.get(token);
  if (hit && hit.expires > Date.now()) return hit.user;

  const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
  });
  if (!resp.ok) return null;
  const user = await resp.json();
  if (!user || !user.id) return null;

  cachePrune();
  tokenCache.set(token, { user, expires: Date.now() + TOKEN_TTL_MS });
  return user;
}

// ─── quota ────────────────────────────────────────────────────────────────────

function serviceHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

async function consumeQuota(user, endpoint) {
  const headers = serviceHeaders();
  // Fail closed. A missing service role key must not silently reopen the proxy.
  if (!headers) {
    return {
      allowed: false,
      status: 500,
      body: { error: "SUPABASE_SERVICE_ROLE_KEY is not set in this project's environment variables." },
    };
  }

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ai_quota_consume`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      p_user: user.id,
      p_endpoint: endpoint,
      p_anonymous: user.is_anonymous === true,
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    return {
      allowed: false,
      status: 500,
      body: { error: `Quota check failed (${resp.status}). Has supabase/07_ai_usage.sql been run? ${detail.slice(0, 200)}` },
    };
  }

  const result = await resp.json();
  if (result && result.allowed) return { allowed: true, usage: result };

  return {
    allowed: false,
    status: 429,
    body: {
      error: "Daily AI limit reached. It resets at 00:00 UTC.",
      detail: result,
    },
  };
}

// MUST be awaited before the handler responds. Vercel runs these on Lambda, and
// the execution environment is frozen the moment the response is flushed — an
// un-awaited fetch() issued a tick earlier is not reliably sent. Left
// fire-and-forget, ai_usage.output_tokens stayed at ~0 forever and the entire
// daily_output_tokens budget was decorative.
//
// `day` comes from the consume call rather than being re-derived here: a request
// admitted at 23:59:59 UTC and recorded at 00:00:01 UTC would otherwise update
// zero rows, silently.
//
// Still swallows its own errors — failing to record must not fail a reply the
// user has already been served. The request slot was spent in consumeQuota()
// either way, so the request-count limit holds even if this call is lost.
export async function recordUsage(user, endpoint, usage, day) {
  const headers = serviceHeaders();
  if (!headers || !usage) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/ai_usage_record`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        p_user: user.id,
        p_endpoint: endpoint,
        p_input: usage.input_tokens || 0,
        p_output: usage.output_tokens || 0,
        p_day: day || null,
      }),
    });
  } catch {}
}

// ─── entry point ──────────────────────────────────────────────────────────────
// Returns { user, usage } on success, or null after it has already written the
// error response — so a handler is just:
//
//   const gate = await guard(req, res, "complete");
//   if (!gate) return;

export async function guard(req, res, endpoint) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return null;
  }

  const originError = originRejected(req);
  if (originError) {
    res.status(originError.status).json(originError.body);
    return null;
  }

  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Sign in to use AI features." });
    return null;
  }

  let user;
  try {
    user = await verifyToken(token);
  } catch {
    res.status(503).json({ error: "Could not verify your session. Try again." });
    return null;
  }
  if (!user) {
    res.status(401).json({ error: "Your session has expired. Sign in again." });
    return null;
  }

  const quota = await consumeQuota(user, endpoint);
  if (!quota.allowed) {
    res.status(quota.status).json(quota.body);
    return null;
  }

  return { user, usage: quota.usage };
}
