// Vercel serverless function — fetches a syllabus/spec page server-side so
// CurriculumStep's URL-import panel can work around browser CORS (a plain
// client-side fetch() of an arbitrary third-party URL is blocked almost
// universally). Needs no API key — it's a plain HTTP fetch, nothing here
// touches ANTHROPIC_API_KEY (that stays isolated to api/complete.js).
//
// Because this endpoint fetches a URL the CLIENT supplies, it's a classic
// SSRF surface (a malicious caller could point it at http://169.254.169.254/
// or http://localhost:6379/ to probe/reach internal services). Guards below:
//   - http/https only
//   - hostname AND every resolved IP checked against private/loopback/link-
//     local ranges (blocks DNS-rebinding, not just literal IP URLs)
//   - redirects followed manually (max 3), re-checked at each hop — fetch's
//     automatic redirect-follow would silently bypass the checks above
//   - response capped at 2MB, request capped at 10s

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

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
  const ips = literalVersion ? [hostname] : (await lookup(hostname, { all: true })).map((r) => r.address);
  if (!ips.length || ips.some(isPrivateIP)) throw new Error("This host is not allowed");
  return u;
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

async function fetchOnce(urlStr) {
  const safeUrl = await assertSafeUrl(urlStr);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(safeUrl.toString(), {
      redirect: "manual",
      signal: controller.signal,
      headers: { "User-Agent": "AIExamCoach-URLImport/1.0" },
    });
    if (resp.status >= 300 && resp.status < 400 && resp.headers.get("location")) {
      return { redirect: new URL(resp.headers.get("location"), safeUrl).toString() };
    }
    if (!resp.ok) throw new Error(`Upstream returned ${resp.status}`);
    const reader = resp.body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) { controller.abort(); throw new Error("Page too large"); }
      chunks.push(value);
    }
    const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    return { text: buf.toString("utf-8") };
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
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
