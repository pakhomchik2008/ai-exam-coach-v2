#!/usr/bin/env node
// Local stand-in for Vercel's serverless runtime, so api/complete.js and
// api/fetch-url.js can be exercised on 127.0.0.1 instead of only in production.
// Before this existed the dev preview simply had no /api at all (see the note
// at schedule-store.jsx:842), which is why the auth gate on those endpoints was
// impossible to test without deploying.
//
//   node scripts/dev-api.mjs          # listens on 8745
//   python3 serve.py 5050             # static files; proxies /api/* to 8745
//
// Secrets come from the real environment or from a .env.local next to this
// repo's root (gitignored). Zero npm dependencies, same as the functions.

import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.argv[2] || 8745);

// ─── .env.local ───────────────────────────────────────────────────────────────
const envFile = join(ROOT, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    const value = m[2].replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
  console.log(`[dev-api] loaded .env.local`);
}

// Origin allowlist already covers 127.0.0.1:5050 and localhost:5050 by default
// (api/_guard.js DEFAULT_ORIGINS), so nothing extra is needed for local runs.

const routes = {
  "/api/complete": () => import("../api/complete.js"),
  "/api/fetch-url": () => import("../api/fetch-url.js"),
};

// Minimal Vercel-compatible res: only .status/.json/.setHeader are used by the
// handlers, and .end for CORS preflight.
function wrapResponse(raw) {
  let code = 200;
  return {
    setHeader: (k, v) => raw.setHeader(k, v),
    status(c) { code = c; return this; },
    json(payload) {
      const body = JSON.stringify(payload);
      raw.writeHead(code, { "Content-Type": "application/json" });
      raw.end(body);
    },
    end() { raw.writeHead(code); raw.end(); },
  };
}

function readBody(raw) {
  return new Promise((resolve) => {
    let data = "";
    raw.on("data", (c) => { data += c; if (data.length > 5e6) raw.destroy(); });
    raw.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
    });
  });
}

http.createServer(async (rawReq, rawRes) => {
  const path = new URL(rawReq.url, "http://localhost").pathname;
  const load = routes[path];
  if (!load) {
    rawRes.writeHead(404, { "Content-Type": "application/json" });
    rawRes.end(JSON.stringify({ error: `No dev route for ${path}` }));
    return;
  }

  const req = { method: rawReq.method, headers: rawReq.headers, body: await readBody(rawReq) };
  const res = wrapResponse(rawRes);
  try {
    const mod = await load();
    await mod.default(req, res);
  } catch (err) {
    console.error(`[dev-api] ${path} threw:`, err);
    if (!rawRes.headersSent) {
      rawRes.writeHead(500, { "Content-Type": "application/json" });
      rawRes.end(JSON.stringify({ error: String(err) }));
    }
  }
}).listen(PORT, "127.0.0.1", () => {
  const have = (k) => (process.env[k] ? "set" : "MISSING");
  console.log(`[dev-api] http://127.0.0.1:${PORT}  routes: ${Object.keys(routes).join(", ")}`);
  console.log(`[dev-api] ANTHROPIC_API_KEY=${have("ANTHROPIC_API_KEY")}  SUPABASE_SERVICE_ROLE_KEY=${have("SUPABASE_SERVICE_ROLE_KEY")}`);
});
