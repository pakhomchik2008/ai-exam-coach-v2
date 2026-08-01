// Syllabus pipeline — step 4/5: normalize + build hierarchy (deliverables #6/#7).
//
//   node scripts/syllabus/normalize.mjs syllabus-data/<exam>.raw.json
//
// Takes a RAW extraction (what the research agent pulled from official sources)
// and produces a clean, deduped, hierarchical <exam>.normalized.json ready for
// human review and seeding. It never adds content — it only slugifies, dedupes,
// orders, and validates what is already there.
//
// Raw/normalized shape (same shape; normalize fills slugs + sort_order + checks):
//   { exam, sources:[{key,name,type,url,retrieved_at,notes}],
//     skills:[{slug?,name,description?}],
//     sections:[{ slug?, name, description?, source?, tags?, est_study_minutes?,
//       topics:[{ slug?, name, description?, difficulty?, source?, tags?,
//         est_study_minutes?, skills?:[skillSlug], prerequisites?:[topicSlug],
//         subtopics?:[{slug?,name,difficulty?}], aliases?:[string] }] }] }

import { readFileSync, writeFileSync } from "node:fs";
import { slugify } from "./lib.mjs";

const inPath = process.argv[2];
if (!inPath) { console.error("usage: node normalize.mjs <exam>.raw.json"); process.exit(1); }
const data = JSON.parse(readFileSync(inPath, "utf8"));
const warn = (m) => console.warn("  ⚠ " + m);
if (!data.exam) { console.error("missing top-level exam id"); process.exit(1); }

// skills (global) — slug from name if absent, dedupe by slug
const skillSlugs = new Set();
data.skills = (data.skills || []).map((s) => {
  const slug = s.slug || slugify(s.name);
  if (skillSlugs.has(slug)) warn(`duplicate skill slug '${slug}' — merged`);
  skillSlugs.add(slug);
  return { slug, name: s.name, description: s.description || null };
});

const topicSlugsSeen = new Map(); // slug -> "section/topic" for prereq + collision checks
(data.sections || []).forEach((sec, si) => {
  sec.slug = sec.slug || slugify(sec.name);
  sec.sort_order = si;
  sec.tags = sec.tags || [];
  const seenTopic = new Set();
  (sec.topics || []).forEach((t, ti) => {
    t.slug = t.slug || slugify(t.name);
    if (seenTopic.has(t.slug)) warn(`duplicate topic '${t.slug}' in section '${sec.slug}' — dedupe before seeding`);
    seenTopic.add(t.slug);
    if (topicSlugsSeen.has(t.slug)) warn(`topic slug '${t.slug}' repeats across sections — prerequisites reference slugs, keep them unique per exam`);
    topicSlugsSeen.set(t.slug, `${sec.slug}/${t.slug}`);
    t.sort_order = ti;
    t.tags = t.tags || [];
    t.skills = [...new Set((t.skills || []).map((x) => slugify(x)))];
    t.prerequisites = [...new Set((t.prerequisites || []).map((x) => slugify(x)))];
    t.aliases = [...new Set((t.aliases || []).map((a) => a.trim()).filter(Boolean))];
    (t.subtopics || []).forEach((st, sti) => {
      st.slug = st.slug || slugify(st.name);
      st.sort_order = sti;
    });
    if (t.difficulty != null && (t.difficulty < 1 || t.difficulty > 10)) warn(`topic '${t.slug}' difficulty ${t.difficulty} out of 1..10`);
  });
});

// validate: every skill referenced by a topic exists; every prereq slug exists
const allSkills = new Set(data.skills.map((s) => s.slug));
data.sections.forEach((sec) => (sec.topics || []).forEach((t) => {
  t.skills.forEach((sk) => { if (!allSkills.has(sk)) warn(`topic '${t.slug}' references unknown skill '${sk}' — add it to skills[]`); });
  t.prerequisites.forEach((p) => { if (!topicSlugsSeen.has(p)) warn(`topic '${t.slug}' prerequisite '${p}' is not a known topic slug`); });
}));

const outPath = inPath.replace(/\.raw\.json$/, ".normalized.json").replace(/(?<!normalized)\.json$/, ".normalized.json");
writeFileSync(outPath, JSON.stringify(data, null, 2) + "\n");
const nTopics = data.sections.reduce((n, s) => n + (s.topics || []).length, 0);
console.log(`✓ normalized ${data.exam}: ${data.sections.length} sections, ${nTopics} topics, ${data.skills.length} skills → ${outPath}`);
