// Vercel serverless function — fetches a syllabus/spec page server-side so
// CurriculumStep's URL-import panel can work around browser CORS (a plain
// client-side fetch() of an arbitrary third-party URL is blocked almost
// universally). Needs no API key — it's a plain HTTP fetch, nothing here
// touches ANTHROPIC_API_KEY (that stays isolated to api/complete.js).
//
// Because this endpoint fetches a URL the CLIENT supplies, it's a classic
// SSRF surface (a malicious caller could point it at http://169.254.169.254/
// or http://localhost:6379/ to probe/reach internal services). Guards below:
//   - authenticated + per-user daily quota (api/_guard.js) — without it this is
//     a free anonymous port scanner and outbound-traffic relay, even with every
//     SSRF check below in place
//   - http/https only
//   - hostname AND every resolved IP checked against private/loopback/link-
//     local ranges (blocks DNS-rebinding, not just literal IP URLs)
//   - the connection is pinned to the exact IP assertSafeUrl validated, via
//     Node's `lookup` request option — the actual request never re-resolves
//     the hostname, closing the DNS-rebinding TOCTOU window between the
//     check and the connect (a rebind attacker with a near-zero-TTL record
//     could otherwise swap the answer to a private IP between the two)
//   - redirects followed manually (max 3), re-checked at each hop — fetch's
//     automatic redirect-follow would silently bypass the checks above
//   - response capped at 2MB, request capped at 10s

import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import * as http from "node:http";
import * as https from "node:https";
import { guard } from "./_guard.js";

export const config = { maxDuration: 15 };

const MAX_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10000;
const MAX_REDIRECTS = 3;

function isPrivateIPv4(ip) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true; // malformed -> treat as unsafe
  if (p[0] === 10) return true; // 10.0.0.0/8
  if (p[0] === 127) return true; // 127.0.0.0/8 loopback
  if (p[0] === 169 && p[1] === 254) return true; // 169.254.0.0/16 link-local / cloud metadata
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true; // 172.16.0.0/12
  if (p[0] === 192 && p[1] === 168) return true; // 192.168.0.0/16
  if (p[0] === 0) return true; // 0.0.0.0/8
  return false;
}

function isPrivateIPv6(ip) {
  const lower = ip.toLowerCase();
  if (lower === "::1") return true; // loopback
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7 unique local
  if (lower.startsWith("fe80")) return true; // link-local
  if (lower.startsWith("::ffff:")) return isPrivateIPv4(lower.slice(7)); // IPv4-mapped
  return false;
}

function isPrivateIP(ip) {
  const version = isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true; // couldn't classify -> unsafe
}

async function assertSafeUrl(urlStr) {
  let u;
  try { u = new URL(urlStr); } catch { throw new Error("Invalid URL"); }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("Only http/https URLs are allowed");
  const hostname = u.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "metadata.google.internal") {
    throw new Error("This host is not allowed");
  }
  // Literal IP in the URL, or a hostname that resolves to one — both checked.
  const literalVersion = isIP(hostname);
  const ips = literalVersion ? [hostname] : (await dnsLookup(hostname, { all: true })).map((r) => r.address);
  if (!ips.length || ips.some(isPrivateIP)) throw new Error("This host is not allowed");
  // Hand back the exact IP that was validated so the caller can pin the
  // connection to it — resolving again at connect time is what opens the
  // DNS-rebinding window.
  return { url: u, resolvedIp: ips[0] };
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function fetchOnce(urlStr) {
  return new Promise((resolve, reject) => {
    assertSafeUrl(urlStr).then(({ url, resolvedIp }) => {
      const client = url.protocol === "https:" ? https : http;
      const req = client.request(url, {
        method: "GET",
        headers: { "User-Agent": "Examik-URLImport/1.0" },
        // Force the connection onto the pre-validated IP instead of letting
        // Node re-resolve the hostname. SNI/Host stay on `url` (the first
        // arg), so TLS cert validation is unaffected — only the address the
        // socket dials is pinned. Node's http/https client always requests
        // `{ all: true }` from a custom `lookup`, so the callback must reply
        // with an address array, not the single-address `(err, ip, family)`
        // shape — passing the wrong shape throws "Invalid IP address:
        // undefined" deep inside net.connect with no indication why.
        lookup: (_hostname, _opts, cb) => cb(null, [{ address: resolvedIp, family: isIP(resolvedIp) }]),
        timeout: FETCH_TIMEOUT_MS,
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          resolve({ redirect: new URL(res.headers.location, url).toString() });
          return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          reject(new Error(`Upstream returned ${res.statusCode}`));
          return;
        }
        const chunks = [];
        let total = 0;
        res.on("data", (chunk) => {
          total += chunk.length;
          if (total > MAX_BYTES) {
            req.destroy(new Error("Page too large"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => resolve({ text: Buffer.concat(chunks).toString("utf-8") }));
        res.on("error", reject);
      });
      req.on("timeout", () => req.destroy(new Error("Request timed out")));
      req.on("error", reject);
      req.end();
    }, reject);
  });
}

export default async function handler(req, res) {
  const gate = await guard(req, res, "fetch-url");
  if (!gate) return; // guard already wrote 401/403/405/429

  const { url } = req.body || {};
  if (typeof url !== "string" || !url.trim()) {
    res.status(400).json({ error: "Missing url" });
    return;
  }

  try {
    let current = url.trim();
    let result = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const r = await fetchOnce(current);
      if (r.redirect) {
        if (hop === MAX_REDIRECTS) throw new Error("Too many redirects");
        current = r.redirect;
        continue;
      }
      result = r;
      break;
    }
    const text = stripHtml(result.text).slice(0, 20000);
    res.status(200).json({ text });
  } catch (err) {
    res.status(400).json({ error: String(err.message || err) });
  }
}
