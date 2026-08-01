// Shared helpers for the syllabus pipeline (normalize + seed).

import { createHash } from "node:crypto";

// Deterministic UUID v5 so re-running the seeder produces the SAME ids for the
// same logical node — the generated SQL stays idempotent (re-run = no churn).
const DNS_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
export function uuidv5(name, namespace = DNS_NAMESPACE) {
  const ns = Buffer.from(namespace.replace(/-/g, ""), "hex");
  const hash = createHash("sha1").update(ns).update(name, "utf8").digest();
  const b = hash.subarray(0, 16);
  b[6] = (b[6] & 0x0f) | 0x50; // version 5
  b[8] = (b[8] & 0x3f) | 0x80; // RFC 4122 variant
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// URL/id-safe slug. Latin-only fold; non-latin scripts keep their characters
// (so NMT/Gaokao topic slugs stay meaningful) with only whitespace collapsed.
export function slugify(s) {
  const base = String(s || "").trim().toLowerCase()
    .normalize("NFKD").replace(/[̀-ͯ]/g, ""); // strip latin diacritics
  return base
    .replace(/[^\p{L}\p{N}\s-]/gu, "")   // drop punctuation, keep letters/numbers (any script)
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── SQL literal helpers ───────────────────────────────────────────────────────
export const sqlStr = (v) => (v == null ? "null" : `'${String(v).replace(/'/g, "''")}'`);
export const sqlUuid = (v) => `'${v}'::uuid`;
export const sqlInt = (v) => (v == null || v === "" ? "null" : String(Math.round(Number(v))));
export const sqlBool = (v) => (v ? "true" : "false");
export const sqlJsonb = (v) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
export const sqlTextArray = (arr) =>
  !arr || !arr.length ? "'{}'::text[]" : `array[${arr.map(sqlStr).join(",")}]::text[]`;

// Stable ids for every node, derived from its logical path so they never move.
export const ids = {
  source: (exam, key) => uuidv5(`exam-coach:${exam}:source:${key}`),
  section: (exam, secSlug) => uuidv5(`exam-coach:${exam}:section:${secSlug}`),
  topic: (exam, secSlug, topicSlug) => uuidv5(`exam-coach:${exam}:${secSlug}:topic:${topicSlug}`),
  subtopic: (exam, secSlug, topicSlug, subSlug) => uuidv5(`exam-coach:${exam}:${secSlug}:${topicSlug}:sub:${subSlug}`),
  skill: (skillSlug) => uuidv5(`exam-coach:skill:${skillSlug}`), // global across exams
};
