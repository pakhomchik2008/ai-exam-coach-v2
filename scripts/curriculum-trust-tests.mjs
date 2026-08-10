#!/usr/bin/env node
// Regression suite for the curriculum trust model (audit finding S2).
//
//   node scripts/curriculum-trust-tests.mjs
//
// Loads the REAL curriculum-store.jsx into a stubbed browser and attacks it the
// way a hostile contributor would. The rules it pins down are subtle and easy to
// undo by accident — "remote wins over seed" reads like a sensible one-liner,
// and it was the whole vulnerability. Server-side half: supabase/08_curriculum_trust.sql.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// The Vite migration (Phase 1) appended `export {};` to every legacy module so
// bundlers treat it as ESM. This harness runs the source through `new
// Function()` in sloppy-script mode, not a module loader, so that trailing
// export throws a SyntaxError — strip it before eval.
const SRC = readFileSync(join(ROOT, "src/stores/curriculum-store.jsx"), "utf8").replace(
  /\nexport\s*\{\};\s*$/,
  "",
);

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? "  → " + JSON.stringify(extra) : ""}`); }
};

function makeStore({ seed = [], remoteRows = [], cache = [], session = { mode: "account" } } = {}) {
  const store = new Map();
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  if (cache.length) store.set("curriculum_cache_v1", JSON.stringify(cache));

  const inserted = [];
  const win = {
    CURRICULUM_SEED: seed,
    KNOWN_SUBJECTS: {},
    getSession: () => session,
    dispatchEvent: () => {},
    _supabase: {
      from: () => ({
        select: () => {
          const q = {
            order: () => q,
            limit: () => Promise.resolve({ data: remoteRows, error: null }),
            then: (r) => Promise.resolve({ data: remoteRows, error: null }).then(r),
          };
          return q;
        },
        insert: (row) => { inserted.push(row); return Promise.resolve({ error: null }); },
      }),
    },
  };
  const CustomEvent = class { constructor(t) { this.type = t; } };
  new Function("window", "localStorage", "CustomEvent", SRC)(win, localStorage, CustomEvent);
  return { win, localStorage, inserted, rawStore: store };
}

const seedRow = (over = {}) => ({
  countryId: "gb", educationSystemId: "k12", qualificationId: "gcse", board: null,
  specVersion: null, subject: "Mathematics", aliases: ["Maths"],
  topics: [{ name: "OFFICIAL Algebra", difficulty: 5, importance: 6, subtopics: [] }],
  source: "official", ...over,
});
const dbRow = (over = {}) => ({
  country_id: "gb", education_system_id: "k12", qualification_id: "gcse", board: null,
  spec_version: null, subject: "Mathematics", aliases: [],
  topics: [{ name: "DB topic", difficulty: 5, importance: 6, subtopics: [] }],
  source: "official", moderation_status: "approved", ...over,
});

const topicsOf = (row) => (row ? row.topics.map((t) => t.name) : null);

console.log("\n── 1. baseline + curated override (the feature must survive) ──");
{
  const { win } = makeStore({ seed: [seedRow()] });
  ok("seed row resolves", topicsOf(win.getCurriculum("gb", "gcse", null, "Mathematics"))[0] === "OFFICIAL Algebra");
}
await (async () => {
  const { win } = makeStore({ seed: [seedRow()], remoteRows: [dbRow({ topics: [{ name: "EDITED IN DB", difficulty: 5, importance: 6, subtopics: [] }] })] });
  await win.refreshRemoteCurriculum();
  const got = topicsOf(win.getCurriculum("gb", "gcse", null, "Mathematics"));
  ok("official DB row still overrides the bundled seed", got[0] === "EDITED IN DB", got);
})();

console.log("\n── 2. S2: contribution must NOT override curated content ──");
await (async () => {
  const poison = dbRow({ source: "community", moderation_status: "pending",
    topics: [{ name: "POISON", difficulty: 5, importance: 6, subtopics: [] }] });
  const { win } = makeStore({ seed: [seedRow()], remoteRows: [poison] });
  await win.refreshRemoteCurriculum();
  const got = topicsOf(win.getCurriculum("gb", "gcse", null, "Mathematics"));
  ok("same-combo community row does not displace the seed", got[0] === "OFFICIAL Algebra", got);
})();

await (async () => {
  // The sharp edge: the unique index keys on board, so board='AQA' is a free
  // slot next to the curated board=null row — and getCurriculum PREFERS a
  // board-specific match.
  const poison = dbRow({ board: "AQA", source: "community", moderation_status: "pending",
    topics: [{ name: "POISON VIA BOARD", difficulty: 5, importance: 6, subtopics: [] }] });
  const { win } = makeStore({ seed: [seedRow()], remoteRows: [poison] });
  await win.refreshRemoteCurriculum();
  const got = topicsOf(win.getCurriculum("gb", "gcse", "AQA", "Mathematics"));
  ok("board-specific community row does not beat curated wildcard", got[0] === "OFFICIAL Algebra", got);
})();

await (async () => {
  const poison = dbRow({ subject: "Zzz Filler", aliases: ["Mathematics", "Maths"],
    source: "community", moderation_status: "pending",
    topics: [{ name: "POISON VIA ALIAS", difficulty: 5, importance: 6, subtopics: [] }] });
  const { win } = makeStore({ seed: [seedRow()], remoteRows: [poison] });
  await win.refreshRemoteCurriculum();
  const got = topicsOf(win.getCurriculum("gb", "gcse", null, "Mathematics"));
  ok("alias hijack fails (aliases stripped from contributions)", got[0] === "OFFICIAL Algebra", got);
  const stored = win.getRemoteCurriculum()[0];
  ok("contribution stored with empty aliases", stored.aliases.length === 0, stored.aliases);
})();

console.log("\n── 3. moderation ──");
await (async () => {
  const rejected = dbRow({ subject: "Sociology", source: "community", moderation_status: "rejected" });
  const { win } = makeStore({ seed: [seedRow()], remoteRows: [rejected] });
  await win.refreshRemoteCurriculum();
  ok("rejected rows are dropped entirely", win.getCurriculum("gb", "gcse", null, "Sociology") === null);
})();
await (async () => {
  const approved = dbRow({ subject: "Sociology", source: "community", moderation_status: "approved",
    topics: [{ name: "Approved topic", difficulty: 5, importance: 6, subtopics: [] }] });
  const { win } = makeStore({ seed: [seedRow()], remoteRows: [approved] });
  await win.refreshRemoteCurriculum();
  const row = win.getCurriculum("gb", "gcse", null, "Sociology");
  ok("approved contribution is usable", !!row);
  ok("approved contribution counts as trusted", win.isCurriculumRowTrusted(row) === true);
})();
await (async () => {
  const pending = dbRow({ subject: "Sociology", source: "community", moderation_status: "pending" });
  const { win } = makeStore({ seed: [seedRow()], remoteRows: [pending] });
  await win.refreshRemoteCurriculum();
  const row = win.getCurriculum("gb", "gcse", null, "Sociology");
  ok("pending contribution still FILLS A GAP (feature intact)", !!row);
  ok("pending contribution is NOT trusted → needs confirmation", win.isCurriculumRowTrusted(row) === false);
})();

console.log("\n── 4. section-based union (no losing row on this path) ──");
await (async () => {
  const ielts = (subject, over = {}) => dbRow({ qualification_id: "ielts", subject, aliases: [],
    topics: [{ name: subject + " topic", difficulty: 5, importance: 6, subtopics: [] }], ...over });
  const rows = [
    ielts("Listening"), ielts("Reading"),
    ielts("Evil Section", { source: "community", moderation_status: "pending",
      topics: [{ name: "INJECTED", difficulty: 5, importance: 6, subtopics: [] }] }),
  ];
  const { win } = makeStore({ seed: [], remoteRows: rows });
  await win.refreshRemoteCurriculum();
  const union = win.curriculumRowsForQualification("ielts");
  const names = union.flatMap((r) => r.topics.map((t) => t.name));
  ok("official sections present", names.includes("Listening topic") && names.includes("Reading topic"), names);
  ok("untrusted section is NOT unioned in", !names.includes("INJECTED"), names);
})();
await (async () => {
  // Regression guard: the old merge removed a seed row shadowed by a remote one.
  // Ranking replaced removal, so the union path must dedupe or topics double up.
  const s = seedRow({ qualificationId: "sat", subject: "Math", aliases: [] });
  const r = dbRow({ qualification_id: "sat", subject: "Math",
    topics: [{ name: "DB Math", difficulty: 5, importance: 6, subtopics: [] }] });
  const { win } = makeStore({ seed: [s], remoteRows: [r] });
  await win.refreshRemoteCurriculum();
  const union = win.curriculumRowsForQualification("sat");
  ok("seed + curated DB row for one subject yields ONE union row", union.length === 1, union.map((u) => u.subject));
  ok("and it is the curated one", union[0].topics[0].name === "DB Math", union[0].topics[0].name);
})();

console.log("\n── 5. size / shape hardening ──");
await (async () => {
  const huge = dbRow({ subject: "Bloat", source: "community", moderation_status: "pending",
    aliases: Array.from({ length: 500 }, (_, i) => "a" + i),
    topics: Array.from({ length: 5000 }, (_, i) => ({
      name: "t".repeat(1000) + i, difficulty: 99, importance: -5,
      subtopics: Array.from({ length: 300 }, (_, j) => "s".repeat(500) + j),
    })) });
  const { win } = makeStore({ seed: [], remoteRows: [huge] });
  await win.refreshRemoteCurriculum();
  const row = win.getRemoteCurriculum()[0];
  ok("topic count clamped to 200", row.topics.length === 200, row.topics.length);
  ok("topic name clamped to 200 chars", row.topics[0].name.length === 200, row.topics[0].name.length);
  ok("subtopics clamped to 20", row.topics[0].subtopics.length === 20, row.topics[0].subtopics.length);
  ok("difficulty clamped into 1..10", row.topics[0].difficulty === 10, row.topics[0].difficulty);
  ok("importance clamped into 1..10", row.topics[0].importance === 1, row.topics[0].importance);
})();
await (async () => {
  const junk = [
    dbRow({ subject: "", }),
    dbRow({ subject: "No topics", topics: [] }),
    dbRow({ subject: "Bad topics", topics: "not-an-array" }),
    null,
  ];
  const { win } = makeStore({ seed: [], remoteRows: junk });
  await win.refreshRemoteCurriculum();
  ok("malformed rows are dropped, not crashed on", win.getRemoteCurriculum().length === 0, win.getRemoteCurriculum().length);
})();

console.log("\n── 6. autocomplete slot ──");
await (async () => {
  const poison = dbRow({ board: "AQA", source: "community", moderation_status: "pending",
    topics: [{ name: "POISON", difficulty: 5, importance: 6, subtopics: [] }] });
  const { win } = makeStore({ seed: [seedRow()], remoteRows: [poison] });
  await win.refreshRemoteCurriculum();
  const opts = win.searchCurriculumSubjects("gb", "gcse", "AQA", "Math");
  const maths = opts.find((o) => o.subject === "Mathematics");
  ok("one autocomplete entry for Mathematics", opts.filter((o) => o.subject === "Mathematics").length === 1);
  ok("and it is labelled trusted", maths && maths.trusted === true, maths);
})();

console.log("\n── 7. contributions are published only after a human confirms ──");
await (async () => {
  const { win, inserted } = makeStore({ seed: [], cache: [{
    countryId: "gb", qualificationId: "gcse", board: null, specVersion: null,
    subject: "Astronomy", topics: [{ name: "Stars", difficulty: 5, importance: 5, subtopics: [] }],
    source: "ai", verifiedByUser: false,
  }] });
  ok("nothing pushed on generation alone", inserted.length === 0);
  win.markCurriculumVerified("gb", "gcse", null, "Astronomy", null);
  await new Promise((r) => setTimeout(r, 5));
  ok("pushed once the user confirms", inserted.length === 1, inserted);
  ok("pushed with source community + no aliases",
    inserted[0] && inserted[0].source === "community" && inserted[0].aliases.length === 0, inserted[0]);
})();
await (async () => {
  const { win, inserted } = makeStore({ seed: [], session: { mode: "demo" }, cache: [{
    countryId: "gb", qualificationId: "gcse", board: null, specVersion: null,
    subject: "Astronomy", topics: [{ name: "Stars", difficulty: 5, importance: 5, subtopics: [] }],
    source: "ai", verifiedByUser: false,
  }] });
  win.markCurriculumVerified("gb", "gcse", null, "Astronomy", null);
  await new Promise((r) => setTimeout(r, 5));
  ok("demo (anonymous) session does not push", inserted.length === 0, inserted);
})();

console.log("\n── 8. poisoned localStorage mirror from an older build ──");
await (async () => {
  const store = new Map();
  // What the PREVIOUS version of this file would have written: raw rows, with
  // aliases, no trust field.
  store.set("curriculum_remote_v1", JSON.stringify([{
    countryId: "gb", educationSystemId: "k12", qualificationId: "gcse", board: "AQA",
    specVersion: null, subject: "Zzz", aliases: ["Mathematics"],
    topics: [{ name: "OLD POISON", difficulty: 5, importance: 5, subtopics: [] }],
    source: "community",
  }]));
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k),
  };
  const win = { CURRICULUM_SEED: [seedRow()], KNOWN_SUBJECTS: {}, getSession: () => ({ mode: "account" }), dispatchEvent: () => {} };
  new Function("window", "localStorage", "CustomEvent", SRC)(win, localStorage, class {});
  const got = topicsOf(win.getCurriculum("gb", "gcse", "AQA", "Mathematics"));
  ok("stale poisoned mirror is re-sanitised on boot", got[0] === "OFFICIAL Algebra", got);
})();

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
