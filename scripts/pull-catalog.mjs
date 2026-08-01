// AI Exam Coach — pull the catalog snapshot FROM Supabase (plan 3.1).
//
// Reverses the old flow. It used to be: edit curriculum-data.jsx → hand-generate
// 02_curriculum_seed.sql → run it. That made the repo the source of truth, so
// "add a subject" always meant a code edit + deploy.
//
// Now the LIVE DB is the source of truth. You edit the `curriculum` /
// `qualifications` tables in Supabase (Table Editor), then run this script:
//
//     node scripts/pull-catalog.mjs
//
// It reads both tables (public anon read — no service key needed) and rewrites
// the committed SQL seed snapshots so the repo mirrors the DB, not the other way
// round. The bundled JS (CURRICULUM_SEED / EXAM_TYPES) stays as the instant/
// offline cache the client renders first; these SQL files are the reviewable,
// version-controlled snapshot of what the DB actually holds.
//
// Best-effort per table: if `qualifications` doesn't exist yet (04 not run),
// that half is skipped with a notice instead of failing the whole export.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = process.env.SUPABASE_URL || "https://cyftpdiabopydwytyudt.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_wL5HRZEHk9zAMUNWJa0BMA_IA4cC9Wo";

async function fetchTable(name) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${name}?select=*`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${name}: HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json();
}

const sql = (v) => (v == null ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const jsonb = (v) => `'${JSON.stringify(v ?? []).replace(/'/g, "''")}'::jsonb`;

async function exportCurriculum() {
  const rows = await fetchTable("curriculum");
  // Deterministic order so the generated file diffs cleanly between runs.
  rows.sort((a, b) =>
    (a.qualification_id + a.subject).localeCompare(b.qualification_id + b.subject)
  );
  const lines = rows.map((r) =>
    `insert into curriculum (country_id, education_system_id, qualification_id, board, spec_version, subject, aliases, topics, source) values (` +
    `${sql(r.country_id)}, ${sql(r.education_system_id)}, ${sql(r.qualification_id)}, ${sql(r.board)}, ${sql(r.spec_version)}, ` +
    `${sql(r.subject)}, ${jsonb(r.aliases)}, ${jsonb(r.topics)}, ${sql(r.source || "official")});`
  );
  const out = `-- Auto-generated FROM the live Supabase DB by scripts/pull-catalog.mjs — ${rows.length} rows.\n` +
    `-- Do not hand-edit: edit the curriculum table in Supabase, then re-run the script.\n` +
    `begin;\ntruncate table curriculum;\n${lines.join("\n")}\ncommit;\n`;
  writeFileSync(join(HERE, "..", "supabase", "02_curriculum_seed.sql"), out);
  return rows.length;
}

async function exportQualifications() {
  const rows = await fetchTable("qualifications");
  rows.sort((a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100));
  const lines = rows.map((r) =>
    `insert into public.qualifications (id, label, emoji, blurb, board, board_options, education_system_id, grade_config, subject_presets, section_based, en_medium, default_for_countries, sort_order) values (` +
    `${sql(r.id)}, ${sql(r.label)}, ${sql(r.emoji)}, ${jsonb(r.blurb)}, ${sql(r.board)}, ${r.board_options ? jsonb(r.board_options) : "null"}, ${sql(r.education_system_id)}, ` +
    `${jsonb(r.grade_config)}, ${jsonb(r.subject_presets)}, ${!!r.section_based}, ${!!r.en_medium}, ${jsonb(r.default_for_countries)}, ${r.sort_order ?? 100});`
  );
  // Only the seed block is regenerated; the DDL/policy above the marker is kept.
  const out = `-- ─── seed (auto-generated FROM the live DB by scripts/pull-catalog.mjs) ───\n` +
    `begin;\ntruncate table public.qualifications;\n${lines.join("\n")}\ncommit;\n`;
  writeFileSync(join(HERE, "..", "supabase", "_qualifications_seed.generated.sql"), out);
  return rows.length;
}

const n1 = await exportCurriculum();
console.log(`✓ curriculum: ${n1} rows → supabase/02_curriculum_seed.sql`);
try {
  const n2 = await exportQualifications();
  console.log(`✓ qualifications: ${n2} rows → supabase/_qualifications_seed.generated.sql`);
} catch (e) {
  console.log(`• qualifications skipped (${String(e.message).split("\n")[0]}) — run 04_qualifications.sql first`);
}
