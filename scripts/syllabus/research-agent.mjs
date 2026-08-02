// Syllabus pipeline — steps 1-3: research agent (deliverable #4).
//
//   node scripts/syllabus/research-agent.mjs <exam>
//
// Reads syllabus-data/<exam>.sources.json (a curated list of OFFICIAL / trusted
// public source URLs, in priority order), fetches each page's text, and asks the
// LLM to EXTRACT — never invent — the syllabus hierarchy present in that text,
// emitting syllabus-data/<exam>.raw.json for `normalize.mjs`.
//
// Hard rule (enforced in the prompt): the model may only output sections/topics
// that literally appear in the fetched source text. If a source doesn't specify
// topics, it says so and you point it at a more detailed trusted source instead.
//
// LLM transport (first that is configured):
//   ANTHROPIC_API_KEY  → api.anthropic.com directly
//   COMPLETE_URL       → your deployed /api/complete proxy (same one the app uses)
//
// sources.json shape:
//   { "exam":"toefl",
//     "sources":[ { "key":"ets_toefl_format","name":"ETS — TOEFL iBT format",
//       "type":"official_org","url":"https://...","retrieved_at":"2026-08-01" } ] }

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const exam = process.argv[2];
if (!exam) { console.error("usage: node research-agent.mjs <exam>"); process.exit(1); }
const cfgPath = join(HERE, "..", "..", "syllabus-data", `${exam}.sources.json`);
const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));

const MODEL = process.env.SYLLABUS_MODEL || "claude-opus-4-8";

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (syllabus-research-agent)" } });
  if (!res.ok) throw new Error(`fetch ${url} → HTTP ${res.status}`);
  const html = await res.text();
  // Crude HTML → text: drop scripts/styles, strip tags, collapse whitespace.
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24000); // keep the prompt bounded
}

async function complete(system, user) {
  if (process.env.ANTHROPIC_API_KEY) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 8000, system, messages: [{ role: "user", content: user }] }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error("anthropic: " + JSON.stringify(data).slice(0, 300));
    return data.content.map((c) => c.text || "").join("");
  }
  if (process.env.COMPLETE_URL) {
    // /api/complete is authenticated (api/_guard.js) — a Supabase access token
    // is required. Grab one from the browser devtools while signed in:
    //   await window.getAccessToken()
    // and export it as COMPLETE_TOKEN. Prefer ANTHROPIC_API_KEY above for
    // batch runs: it skips both the proxy and the caller's daily quota.
    const headers = { "content-type": "application/json" };
    if (process.env.COMPLETE_TOKEN) headers.authorization = `Bearer ${process.env.COMPLETE_TOKEN}`;
    const res = await fetch(process.env.COMPLETE_URL, {
      method: "POST", headers,
      body: JSON.stringify({ system, messages: [{ role: "user", content: user }] }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error("proxy: " + JSON.stringify(data).slice(0, 300));
    return data.text;
  }
  throw new Error("no LLM transport: set ANTHROPIC_API_KEY or COMPLETE_URL");
}

const SYSTEM =
  "You are a syllabus extraction agent. You are given the TEXT of an official or " +
  "trusted educational source for one exam. Output ONLY valid JSON (no markdown) " +
  "matching this shape: {\"sections\":[{\"name\":\"...\",\"description\":\"...\"," +
  "\"topics\":[{\"name\":\"...\",\"difficulty\":1-10,\"subtopics\":[{\"name\":\"...\"}]," +
  "\"skills\":[\"...\"]}]}]}. " +
  "CRITICAL RULES: (1) Extract ONLY sections, topics and subtopics that literally " +
  "appear in the provided text. NEVER invent, guess, or add anything from your own " +
  "knowledge. (2) Use the source's own wording for names. (3) If the text does not " +
  "contain a real syllabus / topic breakdown, return {\"sections\":[],\"note\":\"" +
  "no syllabus found in this source\"}. difficulty is your estimate of relative " +
  "difficulty for a typical candidate; everything else must come from the text.";

const merged = { exam, sources: cfg.sources, skills: cfg.skills || [], sections: [] };
for (const src of cfg.sources) {
  process.stderr.write(`• ${src.key}: ${src.url}\n`);
  let text;
  try { text = await fetchText(src.url); }
  catch (e) { process.stderr.write(`  ✗ ${e.message}\n`); continue; }
  const raw = await complete(SYSTEM, `Exam: ${cfg.name || exam}\nSource: ${src.name}\n\nSOURCE TEXT:\n${text}`);
  let parsed;
  try { parsed = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)); }
  catch { process.stderr.write(`  ✗ could not parse model output\n`); continue; }
  const sections = Array.isArray(parsed.sections) ? parsed.sections : [];
  sections.forEach((s) => { s.source = src.key; (s.topics || []).forEach((t) => (t.source = src.key)); });
  merged.sections.push(...sections);
  process.stderr.write(`  ✓ ${sections.length} sections${parsed.note ? " (" + parsed.note + ")" : ""}\n`);
}

const outPath = join(HERE, "..", "..", "syllabus-data", `${exam}.raw.json`);
writeFileSync(outPath, JSON.stringify(merged, null, 2) + "\n");
console.log(`✓ ${exam}: ${merged.sections.length} sections → syllabus-data/${exam}.raw.json (review, then normalize + seed)`);
