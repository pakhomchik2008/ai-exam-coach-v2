// Examik — curriculum data layer, part 2: cache + lookup API.
//
// The ONLY file that touches localStorage for curriculum data or calls
// window.claude for a syllabus. Lookup order is official seed -> cache ->
// AI generation, exactly matching CURRICULUM_SEED's row shape (see
// curriculum-data.jsx) so every downstream consumer merges seed+cache with
// zero branch logic — a cache row is shape-identical to a seed row, just
// source:"ai" instead of "official", plus cachedAt/verifiedByUser.

const CURRICULUM_CACHE_KEY = "curriculum_cache_v1";

function _readCurriculumCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(CURRICULUM_CACHE_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}
function _writeCurriculumCache(list) {
  try { localStorage.setItem(CURRICULUM_CACHE_KEY, JSON.stringify(list)); } catch {}
}
function getCurriculumCache() { return _readCurriculumCache(); }

// ─── Remote catalog (Supabase) ────────────────────────────────────────────────
// The exam catalog can live in Supabase so new exams (IELTS, TOEFL, Duolingo…)
// are added by inserting a row — no code change, no redeploy. The bundled
// CURRICULUM_SEED stays as the synchronous baseline AND offline fallback: remote
// rows override or extend it once fetched. A localStorage mirror makes the last
// known remote catalog available instantly on the next boot (and fully offline).
const CURRICULUM_REMOTE_KEY = "curriculum_remote_v1";

// ── Trust tiers ──────────────────────────────────────────────────────────────
// Every "which row wins" decision in this file reduces to this one number, so
// catalog poisoning has exactly one place to be reasoned about.
//
// Before this existed the merge gave EVERY remote row priority over the bundled
// seed, while any signed-in account could insert remote rows — so one
// contributed row could replace an official syllabus for every user worldwide
// (S2 in ARCHITECTURE_AUDIT.md). Server-side half of the fix:
// supabase/08_curriculum_trust.sql.
const TRUST = {
  CURATED:  4, // DB row with source:'official', or a contribution an admin approved
  BUNDLED:  3, // CURRICULUM_SEED — ships with the app, reviewed by us
  OWN_OK:   2, // this browser's cache, confirmed by this user in the verify UI
  OWN_AI:   1, // this browser's cache, generated but not confirmed yet
  STRANGER: 0, // someone else's unmoderated contribution
};

// Hard caps mirrored from 08_curriculum_trust.sql's trigger. Enforced again
// here because rows contributed BEFORE that migration are not covered by it,
// and because this data is mirrored into localStorage — one oversized row would
// otherwise blow the storage quota for every visitor.
const MAX_REMOTE_ROWS = 2000;
const MAX_TOPICS_PER_ROW = 200;
const MAX_SUBTOPICS_PER_TOPIC = 20;
const MAX_ALIASES = 40;
const MAX_NAME_CHARS = 200;
const MAX_SUBJECT_CHARS = 120;
const MAX_MIRROR_CHARS = 3000000; // localStorage is ~5 MB in total

function _cleanStr(v, max) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function _cleanTopics(topics) {
  if (!Array.isArray(topics)) return [];
  const out = [];
  for (const t of topics.slice(0, MAX_TOPICS_PER_ROW)) {
    if (!t || typeof t !== "object") continue;
    const name = _cleanStr(t.name, MAX_NAME_CHARS);
    if (!name) continue;
    out.push({
      name,
      module: _cleanStr(t.module, MAX_NAME_CHARS),
      difficulty: clampInt(t.difficulty, 1, 10, 5),
      importance: clampInt(t.importance, 1, 10, 5),
      subtopics: (Array.isArray(t.subtopics) ? t.subtopics : [])
        .slice(0, MAX_SUBTOPICS_PER_TOPIC)
        .map((s) => _cleanStr(s, MAX_NAME_CHARS))
        .filter(Boolean),
    });
  }
  return out;
}

// Supabase row (snake_case) → the exact shape every consumer already expects,
// sanitised and trust-stamped. Returns null for a row that is unusable or has
// been moderated away, so callers filter with .filter(Boolean).
function _remoteRowToSeed(row) {
  if (!row || typeof row !== "object") return null;
  if (row.moderation_status === "rejected") return null;
  const subject = _cleanStr(row.subject, MAX_SUBJECT_CHARS);
  if (!subject || !row.qualification_id) return null;
  const topics = _cleanTopics(row.topics);
  if (!topics.length) return null;

  // Fail closed: only an EXPLICIT 'official' counts as curated. Every seed file
  // sets source explicitly, so nothing legitimate depends on a default here —
  // whereas defaulting to 'official' (as this used to) would promote any row
  // whose source column was somehow empty.
  const source = typeof row.source === "string" ? row.source : "community";
  const trust = row.moderation_status === "approved" || source === "official"
    ? TRUST.CURATED
    : TRUST.STRANGER;

  return {
    countryId: row.country_id, educationSystemId: row.education_system_id,
    qualificationId: row.qualification_id, board: row.board, specVersion: row.spec_version,
    subject,
    // An alias answers lookups for a name the row is not called, which is the
    // cheapest way to hijack getCurriculum(). Only curated rows may claim one.
    aliases: trust === TRUST.CURATED
      ? (Array.isArray(row.aliases) ? row.aliases : [])
          .slice(0, MAX_ALIASES).map((a) => _cleanStr(a, MAX_NAME_CHARS)).filter(Boolean)
      : [],
    topics,
    source,
    moderationStatus: row.moderation_status,
    trust,
  };
}

// The localStorage mirror may have been written by an older build of this file,
// back when remote rows were stored raw — re-derive trust and re-sanitise
// instead of trusting a snapshot that predates the rules above.
function _rehydrateMirrorRow(row) {
  if (!row || typeof row !== "object") return null;
  return _remoteRowToSeed({
    country_id: row.countryId, education_system_id: row.educationSystemId,
    qualification_id: row.qualificationId, board: row.board, spec_version: row.specVersion,
    subject: row.subject, aliases: row.aliases, topics: row.topics,
    source: row.source, moderation_status: row.moderationStatus,
  });
}

let _remoteCurriculum = (() => {
  try {
    const raw = JSON.parse(localStorage.getItem(CURRICULUM_REMOTE_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, MAX_REMOTE_ROWS).map(_rehydrateMirrorRow).filter(Boolean);
  } catch { return []; }
})();
function getRemoteCurriculum() { return _remoteCurriculum; }
// The inverse of _remoteRowToSeed: a locally-generated row → the Supabase
// snake_case shape. country_id/education_system_id are NOT NULL in the schema,
// so an AI row that never knew them is stored as '' (the unique de-dup key
// intentionally excludes country anyway — see 03_curriculum_community_writes.sql).
function _seedRowToRemote(row) {
  return {
    country_id: row.countryId || "",
    education_system_id: row.educationSystemId || "",
    qualification_id: row.qualificationId,
    board: row.board || null,
    spec_version: row.specVersion || null,
    subject: row.subject,
    // A contribution never claims another subject's name. The server forces
    // this too (08_curriculum_trust.sql); stating it here documents the rule
    // at the only place that builds the payload.
    aliases: [],
    topics: row.topics || [],
    source: "community", // user-generated, unverified — never 'official'
  };
}

// Plan 2.2 auto-population: a subject nobody seeded is generated once and then
// shared, so every later student loads it instantly instead of each paying the
// generation cost. Fully best-effort:
//   * demo/anonymous sessions are rejected by RLS — skipped below
//   * a subject that already has a CURATED row is rejected by the server guard
//     (a contribution may fill a gap, never override official content)
//   * a subject someone already contributed hits the unique index and is ignored
//   * offline / table-missing / any error → we just keep the local cache
// None of these are surfaced; the user's own flow already has the row cached.
async function _pushCurriculumToRemote(row) {
  const sb = window._supabase;
  if (!sb || !row) return;
  // The demo account is a Supabase ANONYMOUS user (auth-store.jsx startDemo): it
  // may read the catalog and use AI, but writing to shared reference data needs
  // a real account. Skip the round trip instead of logging a guaranteed failure.
  const session = window.getSession && window.getSession();
  if (!session || session.mode !== "account") return;
  try { await sb.from("curriculum").insert(_seedRowToRemote(row)); } catch {}
}

// Fetches the whole catalog once and merges it in. Best-effort: any failure
// (offline, table missing, RLS) silently leaves the bundled seed in charge.
async function refreshRemoteCurriculum() {
  const sb = window._supabase;
  if (!sb) return _remoteCurriculum;
  try {
    // Explicit column list, not select("*"): created_by is a contributor's user
    // id and 10_audit_fixes.sql revokes it from the public roles, so "*" would
    // now fail outright. Nothing here needs it.
    // Ordering by source descending puts 'official' first, so if the catalog
    // ever outgrows the cap it is curated content that survives truncation.
    const COLUMNS = "country_id,education_system_id,qualification_id,board," +
                    "spec_version,subject,aliases,topics,source,moderation_status";
    let { data, error } = await sb.from("curriculum").select(COLUMNS)
      .order("source", { ascending: false })
      .limit(MAX_REMOTE_ROWS);
    // A database that has not run 08 yet has no moderation_status column, which
    // PostgREST rejects outright. Retry without it rather than losing the whole
    // remote catalog and silently falling back to the bundled seed.
    if (error) {
      ({ data, error } = await sb.from("curriculum")
        .select(COLUMNS.replace(",moderation_status", ""))
        .order("source", { ascending: false })
        .limit(MAX_REMOTE_ROWS));
    }
    if (error || !Array.isArray(data)) return _remoteCurriculum;
    _remoteCurriculum = data.map(_remoteRowToSeed).filter(Boolean);
    _mirrorRemoteCurriculum();
    // Let any mounted picker/wizard re-read the now-richer catalog.
    window.dispatchEvent(new CustomEvent("curriculum-updated"));
  } catch {}
  return _remoteCurriculum;
}

function _mirrorRemoteCurriculum() {
  try {
    const json = JSON.stringify(_remoteCurriculum);
    // Skip an oversized mirror rather than let setItem throw on every boot and
    // leave a stale snapshot silently in place. The in-memory catalog is
    // already correct for this session either way.
    if (json.length > MAX_MIRROR_CHARS) return;
    localStorage.setItem(CURRICULUM_REMOTE_KEY, json);
  } catch {}
}

function _sameCombo(a, b) {
  return a.countryId === b.countryId
    && a.qualificationId === b.qualificationId
    && (a.board || null) === (b.board || null)
    && (a.specVersion || null) === (b.specVersion || null)
    && String(a.subject || "").toLowerCase() === String(b.subject || "").toLowerCase();
}

// Every row from all three sources, most-trusted first. It no longer removes
// anything: the old version dropped a bundled seed row whenever ANY remote row
// matched its combo, which is what let a contributed row take an official
// syllabus's place. Ranking replaces removal — a curated DB row still overrides
// the seed (the "edit the DB, see it in the app" feature), while a contribution
// can only ever fill a gap.
//
// Array#sort is stable, so within a tier the original seed → remote → cache
// order is preserved.
function _allCurriculumRows() {
  const rows = [
    ...(window.CURRICULUM_SEED || []).map((r) => ({ ...r, trust: TRUST.BUNDLED })),
    ...(_remoteCurriculum || []), // trust stamped by _remoteRowToSeed
    ..._readCurriculumCache().map((r) => ({
      ...r, trust: r.verifiedByUser ? TRUST.OWN_OK : TRUST.OWN_AI,
    })),
  ];
  return rows.sort((a, b) => b.trust - a.trust);
}

// All curriculum rows for one qualification, board-matched, one per subject.
// Section-based exams (SAT/ACT/IELTS…) build one course from the UNION of
// these — and a DB-ONLY exam (IELTS added as a pure DB row) has its sections
// only in the remote catalog, so this MUST read the merged rows, not just
// window.CURRICULUM_SEED.
//
// Untrusted rows are excluded outright. A union has no losing row: every row's
// topics are concatenated, and exam-wizard's buildSectionCourse then labels the
// result source:"official"/verifiedByUser:true with no confirmation step. So an
// unmoderated contribution here would be injected into every student's course
// silently — ranking is not enough on this path, only exclusion is.
function curriculumRowsForQualification(qualificationId, board) {
  const rows = _allCurriculumRows().filter((r) =>
    r.qualificationId === qualificationId &&
    _boardMatches(r.board, board) &&
    r.trust >= TRUST.BUNDLED
  );
  // Rows are trust-sorted, so the first row per subject is the best one. This
  // dedupe is what used to be handled by dropping shadowed seed rows.
  const seen = new Set();
  return rows.filter((r) => {
    const key = String(r.subject || "").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Deterministic single-syllabus lookup — pure, synchronous, no AI call ───
// qualificationId is the strong discriminator — it already pins the country
// AND education system (nmt=UA, ib=international, alevel/gcse=GB, sat/act/ap=US,
// matura=PL, abitur=DE, bac=FR). So country is intentionally NOT part of the match:
// a lookup resolves the official syllabus no matter what (or nothing) the
// profile has for country. Board is matched leniently too — a row with a null
// board is a wildcard that fits any selected exam board (topic lists are
// board-agnostic at this grain), while a board-specific row still matches its
// own board exactly. This is what lets every seeded exam's subjects be found
// regardless of onboarding state. Scales to any new exam for free.
function _boardMatches(rowBoard, queryBoard) {
  return !rowBoard || (rowBoard || null) === (queryBoard || null);
}
function getCurriculum(countryId, qualificationId, board, subject) {
  if (!subject) return null;
  const norm = (s) => String(s || "").toLowerCase().trim();
  const matches = _allCurriculumRows().filter((r) =>
    r.qualificationId === qualificationId &&
    _boardMatches(r.board, board) &&
    (norm(r.subject) === norm(subject) || (r.aliases || []).some((a) => norm(a) === norm(subject)))
  );
  if (!matches.length) return null;
  // A board-specific row OVERRIDES the shared wildcard one (plan 2.3): most
  // subjects use one shared syllabus, but when a board-tuned row exists for the
  // selected board it must win over the null-board general row.
  //
  // That preference is applied WITHIN the most trusted tier only. Applied
  // across tiers — as it was — it became the sharpest edge of S2: the unique
  // index keys on (qualification, board, spec, subject), so a contributed row
  // with board='AQA' does not collide with the curated board=null row, and this
  // line would then hand it every AQA student.
  const best = matches[0].trust;   // _allCurriculumRows sorted; filter kept order
  const top = matches.filter((r) => r.trust === best);
  return (board && top.find((r) => (r.board || null) === (board || null))) || top[0];
}

// ── Subject autocomplete surface — sync, fuzzy prefix/substring, no network ─
function searchCurriculumSubjects(countryId, qualificationId, board, query) {
  const q = String(query || "").toLowerCase().trim();
  const rows = _allCurriculumRows().filter((r) =>
    (!countryId || r.countryId === countryId) && r.qualificationId === qualificationId && _boardMatches(r.board, board)
  );
  const matches = rows.filter((r) => {
    if (!q) return true;
    const hay = [r.subject, ...(r.aliases || [])].map((s) => s.toLowerCase());
    return hay.some((s) => s.includes(q) || q.includes(s));
  });
  // Dedup by subject name. Rows arrive trust-sorted, so the entry that survives
  // is the most trusted one for that name — an unmoderated contribution can no
  // longer take the autocomplete slot of a curated syllabus.
  // `trusted` and `verifiedByUser` drive CurriculumStep's provenance label.
  const seen = new Set();
  const out = [];
  for (const r of matches) {
    const key = r.subject.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      subject: r.subject, board: r.board, specVersion: r.specVersion, source: r.source,
      trusted: r.trust >= TRUST.BUNDLED, verifiedByUser: !!r.verifiedByUser,
    });
  }
  // Real, publicly-known subject NAMES with no topics of their own yet (see
  // curriculum-data.jsx's KNOWN_SUBJECTS) — this is what keeps autocomplete
  // populated for completely ordinary subjects instead of dead-ending in
  // "not found." Selecting one skips straight to AI-generate (CurriculumStep
  // routes source:"known" through the same fetch+confirm path as the
  // not-found panel's "Generate it for me").
  const known = (window.KNOWN_SUBJECTS && window.KNOWN_SUBJECTS[qualificationId]) || [];
  for (const name of known) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    if (q && !(key.includes(q) || q.includes(key))) continue;
    seen.add(key);
    out.push({ subject: name, board: null, specVersion: null, source: "known" });
  }
  return out;
}

// ── AI-backed fetch-and-cache — only called when getCurriculum() returned
//    null for a subject the user committed to. Goes through
//    brainCompleteJSON with includeContext:false so learner mastery cannot
//    bias an official syllabus. ──
// context is freeform, user-supplied (e.g. "University of Warwick, Computer
// Systems Engineering, Year 1") — NOT a lookup against any institution
// database (we don't have one, and won't fabricate one). It only sharpens
// the AI prompt for university-level modules, where the qualification id
// alone ("uni") carries none of the useful context a GCSE/A-Level board id
// does. The row is still cached/labelled source:"ai" and still requires
// confirm-before-save, same as every other AI-generated row.
async function fetchAndCacheCurriculum(countryId, qualificationId, board, subject, specVersion, context) {
  if (!window.claude) return null;
  // Learner context: the OFFICIAL curriculum depends on far more than the
  // subject name — country, education system, school year and qualification
  // all change what "Mathematics" means. Everything known about the learner
  // goes into the prompt so a 6th-grader in Ukraine gets the НУШ programme,
  // not a generic global outline. Adding a new signal here = one line.
  const profile = (window.getProfile && window.getProfile()) || {};
  const learnerFacts = [
    countryId ? `country: ${countryId}` : null,
    profile.educationLevel ? `education level: ${profile.educationLevel}` : null,
    profile.currentYear ? `school year/grade: ${profile.currentYear}` : null,
    profile.lang ? `interface language: ${profile.lang}` : null,
  ].filter(Boolean).join("; ");
  const system = "You are a curriculum expert with deep knowledge of OFFICIAL national education programmes (state curricula, exam-board specifications, ministry syllabi). Output ONLY valid JSON, no markdown, no commentary: " +
    '{"topics":[{"name":"...","module":"...","difficulty":1-10,"importance":1-10,"subtopics":["...","..."]}]}. ' +
    "Base the list on the official programme for this learner's country, qualification and school year — NOT a generic global outline. " +
    "List the COMPLETE set of examinable syllabus topics, foundational topics first (this order IS the recommended study order). " +
    // "module" is the named branch/paper/strand the topic belongs to (e.g.
    // A-Level Maths → \"Pure Mathematics\"/\"Statistics\"/\"Mechanics\"; a
    // science → \"Biology\"/\"Chemistry\"/\"Physics\"). Set it only when the
    // official spec really is divided into named sections; use \"\" when it
    // isn't, and keep the SAME module string across all topics in one section.
    'Give each topic a "module" — the official named section/paper/strand it sits under (repeat the same string for every topic in that section). If the syllabus has no such divisions, use "" for every topic. ' +
    // Keep the FULL topic list (that's the point) but cap subtopics at 3 — the
    // topic names are what the picker and scheduler need; fewer subtopics per
    // topic roughly halves the output tokens, so generation returns noticeably
    // faster for subjects that aren't in the official seed.
    "Do not truncate the TOPIC list: if the official programme has 30+ topics, list them all. Give each topic just 2-3 short subtopics (keep it terse for speed)." +
    (learnerFacts ? ` Learner: ${learnerFacts}.` : "") +
    (window.aiLangDirective ? ` ${window.aiLangDirective()}` : "");
  const isUni = qualificationId === "uni";
  const contextLabel = context && context.trim() ? ` (${context.trim()})` : "";
  const countryLabel = countryId ? ` in ${countryId}` : "";
  const prompt = isUni
    ? `List the syllabus topics for the university module/course "${subject}"${contextLabel}${countryLabel}. Use your knowledge of typical curricula for this kind of module at this level — if you recognise the specific institution/programme, use its real structure; otherwise use the general real-world structure for a module with this name and level.`
    : `List the complete official syllabus topics for "${subject}" under the ${qualificationId}${board ? ` (${board} exam board)` : ""} qualification${countryLabel}${specVersion ? `, ${specVersion} specification` : ""}${profile.currentYear ? `, for a student in ${profile.currentYear}` : ""}. Follow the official curriculum for that country and qualification.`;

  let data;
  try {
    data = await window.brainCompleteJSON({ system, messages: [{ role: "user", content: prompt }], includeContext: false }, null);
  } catch {
    return null;
  }
  if (!data) return null;
  const rawTopics = Array.isArray(data && data.topics) ? data.topics : [];
  const topics = rawTopics
    .filter((t) => t && typeof t.name === "string" && t.name.trim())
    .map((t) => ({
      name: t.name.trim(),
      module: typeof t.module === "string" ? t.module.trim() : "",
      difficulty: clampInt(t.difficulty, 1, 10, 5),
      importance: clampInt(t.importance, 1, 10, 5),
      subtopics: Array.isArray(t.subtopics) ? t.subtopics.filter((s) => typeof s === "string" && s.trim()).slice(0, 6) : [],
    }));
  if (!topics.length) return null;

  const row = {
    countryId, educationSystemId: null, qualificationId, board: board || null, specVersion: specVersion || null,
    subject, aliases: [], topics, source: "ai", cachedAt: Date.now(), verifiedByUser: false,
  };
  const cache = _readCurriculumCache().filter((r) => !_sameCombo(r, row));
  cache.push(row);
  _writeCurriculumCache(cache);
  // NOT shared with the catalog yet. It used to be pushed here, the moment the
  // model answered — so the shared catalog filled with syllabi no human had
  // ever read, and the confirm-before-save UI protected only this user's own
  // course. The push now happens in markCurriculumVerified().
  return row;
}

function clampInt(v, min, max, fallback) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

// ── URL import (Phase 6) — client-side fetch() of an arbitrary third-party
//    URL is blocked by CORS almost universally, so this goes through the
//    api/fetch-url.js serverless proxy (SSRF-guarded, no API key needed —
//    it's a plain HTTP fetch, unrelated to api/complete.js's Anthropic key).
async function fetchUrlText(url) {
  try {
    const headers = window.apiHeaders
      ? await window.apiHeaders()          // Supabase access token — required by api/_guard.js
      : { "Content-Type": "application/json" };
    const resp = await fetch(window.apiUrl ? window.apiUrl("/api/fetch-url") : "/api/fetch-url", {
      method: "POST", headers, body: JSON.stringify({ url }),
    });
    const data = await resp.json();
    if (!resp.ok) return null;
    return typeof data.text === "string" ? data.text : null;
  } catch {
    return null;
  }
}

// Same output contract as fetchAndCacheCurriculum's topics array (name/
// difficulty/importance/subtopics) so a URL-imported page flows into
// CurriculumStep's existing awaiting-confirmation verify UI unmodified —
// pasted spec text is never written into a Course without a human check.
async function extractTopicsFromText(subject, text) {
  if (!window.claude || !text || !text.trim()) return null;
  const system = "You are a curriculum expert reading a syllabus/specification page. Output ONLY valid JSON, no markdown: " +
    '{"topics":[{"name":"...","difficulty":1-10,"importance":1-10}]}. ' +
    "List the real topics students are examined on, foundational first. If this page does not contain a real syllabus/topic list, return {\"topics\":[]}." +
    (window.aiLangDirective ? ` ${window.aiLangDirective()}` : "");
  const prompt = `Subject: ${subject || "(unspecified)"}\n\nPage content:\n${text.slice(0, 12000)}`;
  let data;
  try {
    data = await window.brainCompleteJSON({ system, messages: [{ role: "user", content: prompt }], includeContext: false }, null);
  } catch {
    return null;
  }
  if (!data) return null;
  const topics = (Array.isArray(data && data.topics) ? data.topics : [])
    .filter((t) => t && typeof t.name === "string" && t.name.trim())
    .map((t) => ({
      name: t.name.trim(),
      difficulty: clampInt(t.difficulty, 1, 10, 5),
      importance: clampInt(t.importance, 1, 10, 5),
      subtopics: [],
    }));
  return topics.length ? topics : null;
}

// ── Mark a cached row as human-verified (called once a user confirms an
//    AI-sourced Course built from it — see CurriculumStep.jsx). Subsequent
//    users of the exact same combo skip the confirm-before-save step. ──────
function markCurriculumVerified(countryId, qualificationId, board, subject, specVersion) {
  const cache = _readCurriculumCache();
  let verified = null;
  const next = cache.map((r) => {
    if (_sameCombo(r, { countryId, qualificationId, board, subject, specVersion }) && !r.verifiedByUser) {
      verified = { ...r, verifiedByUser: true };
      return verified;
    }
    return r;
  });
  if (!verified) return;
  _writeCurriculumCache(next);
  // Only NOW is it offered to everyone else — a human has read this topic list
  // and accepted it. Fire-and-forget: this user's own cache above serves them
  // regardless of whether the push lands.
  _pushCurriculumToRemote(verified);
}

// A row the app may build a Course from WITHOUT the confirm-before-save step:
// curated content (bundled seed, official DB row, admin-approved contribution)
// or something this user confirmed themselves. Exported so CurriculumStep does
// not re-derive trust from string comparisons — which is how an approved
// contribution ended up being treated as a stranger's, and how a future source
// value would have silently defaulted to trusted.
function isCurriculumRowTrusted(row) {
  if (!row) return false;
  if (row.verifiedByUser) return true;
  const trust = typeof row.trust === "number"
    ? row.trust
    : (row.source === "official" ? TRUST.BUNDLED : TRUST.STRANGER);
  return trust >= TRUST.BUNDLED;
}

Object.assign(window, {
  CURRICULUM_CACHE_KEY,
  getCurriculumCache, getCurriculum, curriculumRowsForQualification, searchCurriculumSubjects, fetchAndCacheCurriculum, markCurriculumVerified,
  isCurriculumRowTrusted,
  fetchUrlText, extractTopicsFromText,
  getRemoteCurriculum, refreshRemoteCurriculum,
});

// Warm the remote catalog on boot (non-blocking). The bundled seed serves every
// synchronous read immediately; this quietly upgrades it once the fetch lands.
refreshRemoteCurriculum();

// Module marker: these files carry no import/export of their own (they still
// communicate via `window` globals), and without one the JSX transform treats
// the file as a CommonJS script and emits a bare `require()` call that throws
// in the browser. Removed once this module uses real imports.
export {};
