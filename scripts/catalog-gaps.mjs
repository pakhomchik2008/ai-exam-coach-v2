#!/usr/bin/env node
// Catalog reachability report — "which subjects can a student actually get?"
//
//     node scripts/catalog-gaps.mjs              # report against the live DB
//     node scripts/catalog-gaps.mjs --sql F.sql  # ...as if F.sql had been run
//
// Why this exists: counting rows in the `curriculum` table answers the wrong
// question. What matters is whether a subject the PICKER OFFERS resolves to a
// syllabus, and that depends on three things the table alone does not show:
//
//   * the merge — the app reads the bundled CURRICULUM_SEED *and* the DB
//     (curriculum-store.jsx), so a subject present only in one of them is still
//     reachable, and a DB-only count under-reports;
//   * the board — _boardMatches() treats a board-tagged row as INVISIBLE to
//     every other board, so a row tagged 'AQA' does not exist for an Edexcel
//     student. A subject is only really covered if it resolves on every board
//     the qualification offers;
//   * aliases — the picker offers native-language names ("Biologie") while rows
//     are named in English ("Biology"). No alias, no match.
//
// Outcomes are ranked by how the student experiences them:
//   syllabus  → resolves to a topic list
//   known     → no row, but in KNOWN_SUBJECTS, so it shows in autocomplete and
//               goes straight to AI-generate + confirm (a designed path)
//   dead end  → neither: the student has to type it and land on "not found"

import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const SUPABASE_URL = process.env.SUPABASE_URL || "https://cyftpdiabopydwytyudt.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_wL5HRZEHk9zAMUNWJa0BMA_IA4cC9Wo";

const sqlArg = process.argv.indexOf("--sql");
const SQL_FILE = sqlArg > -1 ? resolve(process.argv[sqlArg + 1]) : null;

// ── the bundled seed, evaluated straight out of the shipped file ─────────────
function loadBundledSeed() {
  const ctx = createContext({ window: {}, console });
  // Strip the Phase-1 ESM marker (`export {};`) — this runs the source as a
  // vm script, not a module, and a trailing `export` throws there.
  const src = readFileSync(join(ROOT, "src/data/curriculum-data.jsx"), "utf8").replace(
    /\nexport\s*\{\};\s*$/,
    "",
  );
  runInContext(src, ctx);
  return {
    seed: ctx.window.CURRICULUM_SEED || [],
    known: ctx.window.KNOWN_SUBJECTS || {},
  };
}

async function table(name) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${name}?select=*`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

// ── the matcher, mirrored from curriculum-store.jsx ──────────────────────────
const norm = (s) => String(s || "").toLowerCase().trim();
const boardMatches = (rowBoard, queryBoard) => !rowBoard || (rowBoard || null) === (queryBoard || null);
const nameHits = (row, subject) =>
  norm(row.subject) === norm(subject) || (row.aliases || []).some((a) => norm(a) === norm(subject));

// ── optionally replay a pending migration's effects, in memory ───────────────
// Deliberately narrow: it understands only the statement shapes this repo's
// catalog migrations use. Anything else is reported as unapplied rather than
// silently ignored, so the report can never quietly overstate coverage.
function applyMigration(rows, sql) {
  const jsonLit = String.raw`'(\[(?:[^']|'')*\])'::jsonb`;
  const un = (s) => JSON.parse(s.replace(/''/g, "'"));
  const applied = [];
  let out = rows.map((r) => ({ ...r, aliases: [...(r.aliases || [])] }));

  for (const m of sql.matchAll(/update public\.curriculum set board = null\s*\n\s*where qualification_id = '([^']+)' and board = '([^']+)';/g)) {
    const hit = out.filter((r) => r.qualification_id === m[1] && r.board === m[2]);
    hit.forEach((r) => { r.board = null; });
    applied.push(`board ${m[1]}/${m[2]} → wildcard (${hit.length} rows)`);
  }
  for (const m of sql.matchAll(new RegExp(String.raw`select pg_temp\.add_aliases\('([^']*)', '((?:[^']|'')*)', ${jsonLit}\);`, "g"))) {
    const subject = m[2].replace(/''/g, "'");
    const hit = out.filter((r) => r.qualification_id === m[1] && r.subject === subject);
    if (!hit.length) { applied.push(`!! alias fill matched NO row: ${m[1]} / "${subject}"`); continue; }
    hit.forEach((r) => { r.aliases = [...new Set([...r.aliases, ...un(m[3])])]; });
    applied.push(`aliases += ${un(m[3]).join("/")} on ${m[1]}/"${subject}"`);
  }
  // Part 3 shape: repairs a stub (topics length <= 1) in place — distinct from
  // Part 5's "set topics = X, aliases = Y" below by having no aliases clause.
  // Capture groups: 1 = new topics JSON (from jsonLit), 2 = qualification_id, 3 = subject.
  for (const m of sql.matchAll(new RegExp(String.raw`update public\.curriculum set topics = ${jsonLit}\s*\n` +
      String.raw` where source = 'official' and jsonb_array_length\(topics\) <= 1\s*\n` +
      String.raw`   and qualification_id = '([a-z]+)' and subject = '((?:[^']|'')*)';`, "g"))) {
    const [, topicsJson, qualId, subjectRaw] = m;
    const subject = subjectRaw.replace(/''/g, "'");
    const row = out.find((r) => r.qualification_id === qualId && r.subject === subject && (r.topics || []).length <= 1);
    if (!row) { applied.push(`Part 3 repair matched NO stub row: ${qualId} / "${subject}" (already fixed, or name changed)`); continue; }
    row.topics = un(topicsJson);
    applied.push(`repaired stub ${qualId}/"${subject}" → ${row.topics.length} topics`);
  }
  const ins = sql.match(new RegExp(String.raw`values \(\s*'([^']*)', '([^']*)', '([^']*)', (null|'[^']*'), (null|'[^']*'), '((?:[^']|'')*)',\s*${jsonLit},\s*${jsonLit},\s*'official'`));
  if (ins) {
    out.push({ country_id: ins[1], education_system_id: ins[2], qualification_id: ins[3],
      board: ins[4] === "null" ? null : ins[4].slice(1, -1),
      spec_version: ins[5] === "null" ? null : ins[5].slice(1, -1),
      subject: ins[6].replace(/''/g, "'"), aliases: un(ins[7]), topics: un(ins[8]), source: "official" });
    applied.push(`inserted ${ins[3]}/"${ins[6]}" (${un(ins[8]).length} topics)`);
  }
  const upd = sql.match(new RegExp(String.raw`set topics = ${jsonLit},\s*\n\s*aliases = ${jsonLit}\s*\n\s*where qualification_id = '([^']+)' and subject = '((?:[^']|'')*)';`));
  if (upd) {
    const subject = upd[4].replace(/''/g, "'");
    const row = out.find((r) => r.qualification_id === upd[3] && r.subject === subject);
    if (!row) applied.push(`!! topic replace matched NO row: ${upd[3]} / "${subject}"`);
    else { row.topics = un(upd[1]); row.aliases = un(upd[2]); applied.push(`replaced topics on ${upd[3]}/"${subject}" (${row.topics.length})`); }
  }
  return { rows: out, applied };
}

// ── report ───────────────────────────────────────────────────────────────────
const { seed, known } = loadBundledSeed();
const [dbRowsRaw, quals] = await Promise.all([table("curriculum"), table("qualifications")]);
quals.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));

let dbRows = dbRowsRaw;
if (SQL_FILE) {
  const r = applyMigration(dbRows, readFileSync(SQL_FILE, "utf8"));
  dbRows = r.rows;
  console.log(`── replaying ${SQL_FILE.split("/").pop()} in memory ──`);
  r.applied.forEach((a) => console.log(`   ${a}`));
  if (r.applied.some((a) => a.startsWith("!!"))) process.exitCode = 1;
  console.log();
}

// Same shape for both sources, so the matcher does not branch.
const merged = [
  ...seed.map((r) => ({ qualification_id: r.qualificationId, board: r.board ?? null,
    subject: r.subject, aliases: r.aliases || [], topics: r.topics || [], origin: "bundled" })),
  ...dbRows.map((r) => ({ qualification_id: r.qualification_id, board: r.board ?? null,
    subject: r.subject, aliases: r.aliases || [], topics: r.topics || [], origin: "db" })),
];

console.log(`bundled seed: ${seed.length} rows   database: ${dbRows.length} rows   merged: ${merged.length}\n`);

const totals = { syllabus: 0, known: 0, dead: 0 };
const deadEnds = [];
for (const q of quals) {
  const presets = q.subject_presets || [];
  if (!presets.length) continue;
  const boards = (q.board_options || []).length ? q.board_options : [q.board ?? null];
  const mine = merged.filter((r) => r.qualification_id === q.id);
  const knownList = (known[q.id] || []).map(norm);

  const buckets = { syllabus: [], partial: [], known: [], dead: [] };
  for (const p of presets) {
    const ok = boards.filter((b) => mine.some((r) => boardMatches(r.board, b) && nameHits(r, p)));
    if (ok.length === boards.length) buckets.syllabus.push(p);
    else if (ok.length) buckets.partial.push(`${p} [only ${ok.join("/")}]`);
    else if (knownList.includes(norm(p))) buckets.known.push(p);
    else buckets.dead.push(p);
  }
  totals.syllabus += buckets.syllabus.length;
  totals.known += buckets.known.length;
  totals.dead += buckets.dead.length + buckets.partial.length;
  deadEnds.push(...buckets.dead.map((s) => `${q.id}/${s}`));

  const flag = buckets.dead.length || buckets.partial.length ? "!" : " ";
  console.log(`${flag} ${q.id.padEnd(9)} ${presets.length} presets → ` +
    `${buckets.syllabus.length} syllabus, ${buckets.known.length} known, ` +
    `${buckets.dead.length + buckets.partial.length} dead end`);
  if (buckets.partial.length) console.log(`    board-partial: ${buckets.partial.join(", ")}`);
  if (buckets.dead.length) console.log(`    DEAD END:      ${buckets.dead.join(", ")}`);
}
console.log(`\n  TOTAL  ${totals.syllabus} syllabus / ${totals.known} known / ${totals.dead} dead end`);

// ── data-quality checks ──────────────────────────────────────────────────────
console.log("\n── rows that would hand a student a course with almost nothing in it ──");
const stubs = merged.filter((r) => r.topics.length <= 2);
if (!stubs.length) console.log("  none");
for (const r of stubs) {
  console.log(`  ! ${r.origin.padEnd(7)} ${r.qualification_id}/"${r.subject}" — ` +
    `${r.topics.length} topic(s): ${r.topics.map((t) => `"${t.name}"`).join(", ")}`);
}

console.log("\n── board-tagged rows (invisible to every other board) ──");
const tagged = {};
for (const r of merged.filter((r) => r.board)) {
  (tagged[`${r.qualification_id}/${r.board}`] ||= []).push(r.subject);
}
if (!Object.keys(tagged).length) console.log("  none — every row is a wildcard");
for (const [k, v] of Object.entries(tagged)) console.log(`  ! ${k}: ${v.length} row(s) — ${v.join(", ")}`);

console.log("\n── bundled seed vs database drift ──");
const key = (r) => `${r.qualification_id}/${norm(r.subject)}`;
const inDb = new Set(dbRows.map((r) => key({ qualification_id: r.qualification_id, subject: r.subject })));
const inSeed = new Set(seed.map((r) => key({ qualification_id: r.qualificationId, subject: r.subject })));
const seedOnly = [...inSeed].filter((k) => !inDb.has(k));
const dbOnly = [...inDb].filter((k) => !inSeed.has(k));
console.log(`  bundled-only (lost if the DB is ever treated as the only source): ${seedOnly.length ? seedOnly.join(", ") : "none"}`);
console.log(`  database-only (invisible offline / on first paint): ${dbOnly.length ? dbOnly.join(", ") : "none"}`);

if (deadEnds.length) {
  console.log(`\nnext: ${deadEnds.length} dead-end presets. Either seed a syllabus for them or`);
  console.log(`add them to KNOWN_SUBJECTS in curriculum-data.jsx so they at least route to`);
  console.log(`AI-generate + confirm instead of a "not found" screen.`);
}
