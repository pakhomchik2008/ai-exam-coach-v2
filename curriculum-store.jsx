// AI Exam Coach — curriculum data layer, part 2: cache + lookup API.
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

function _sameCombo(a, b) {
  return a.countryId === b.countryId
    && a.qualificationId === b.qualificationId
    && (a.board || null) === (b.board || null)
    && (a.specVersion || null) === (b.specVersion || null)
    && String(a.subject || "").toLowerCase() === String(b.subject || "").toLowerCase();
}

function _allCurriculumRows() {
  const seed = (window.CURRICULUM_SEED || []);
  const cache = _readCurriculumCache();
  return seed.concat(cache);
}

// ── Deterministic single-syllabus lookup — pure, synchronous, no AI call ───
function getCurriculum(countryId, qualificationId, board, subject) {
  if (!subject) return null;
  const norm = (s) => String(s || "").toLowerCase().trim();
  const rows = _allCurriculumRows();
  return rows.find((r) =>
    r.countryId === countryId &&
    r.qualificationId === qualificationId &&
    (r.board || null) === (board || null) &&
    (norm(r.subject) === norm(subject) || (r.aliases || []).some((a) => norm(a) === norm(subject)))
  ) || null;
}

// ── Subject autocomplete surface — sync, fuzzy prefix/substring, no network ─
function searchCurriculumSubjects(countryId, qualificationId, board, query) {
  const q = String(query || "").toLowerCase().trim();
  const rows = _allCurriculumRows().filter((r) =>
    r.countryId === countryId && r.qualificationId === qualificationId && (r.board || null) === (board || null)
  );
  const matches = rows.filter((r) => {
    if (!q) return true;
    const hay = [r.subject, ...(r.aliases || [])].map((s) => s.toLowerCase());
    return hay.some((s) => s.includes(q) || q.includes(s));
  });
  // Dedup by subject name, seed/cache rows first (kept ahead of KNOWN_SUBJECTS below)
  const seen = new Set();
  const out = [];
  for (const r of matches) {
    const key = r.subject.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ subject: r.subject, board: r.board, specVersion: r.specVersion, source: r.source });
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
//    null for a subject the user committed to. Reuses window.claude.complete
//    exactly like ai-enrichment.jsx's requestTopicNames — no new transport. ──
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
    '{"topics":[{"name":"...","difficulty":1-10,"importance":1-10,"subtopics":["...","..."]}]}. ' +
    "Base the list on the official programme for this learner's country, qualification and school year — NOT a generic global outline. " +
    "List the COMPLETE set of examinable syllabus topics, foundational topics first (this order IS the recommended study order). " +
    "Do not truncate: if the official programme has 30+ topics, list them all. Each topic gets 2-6 short subtopics." +
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
    const raw = await window.claude.complete({ system, messages: [{ role: "user", content: prompt }] });
    data = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
  } catch {
    return null;
  }
  const rawTopics = Array.isArray(data && data.topics) ? data.topics : [];
  const topics = rawTopics
    .filter((t) => t && typeof t.name === "string" && t.name.trim())
    .map((t) => ({
      name: t.name.trim(),
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
    const resp = await fetch("/api/fetch-url", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }),
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
    const raw = await window.claude.complete({ system, messages: [{ role: "user", content: prompt }] });
    data = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
  } catch {
    return null;
  }
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
  let changed = false;
  const next = cache.map((r) => {
    if (_sameCombo(r, { countryId, qualificationId, board, subject, specVersion }) && !r.verifiedByUser) {
      changed = true;
      return { ...r, verifiedByUser: true };
    }
    return r;
  });
  if (changed) _writeCurriculumCache(next);
}

Object.assign(window, {
  CURRICULUM_CACHE_KEY,
  getCurriculumCache, getCurriculum, searchCurriculumSubjects, fetchAndCacheCurriculum, markCurriculumVerified,
  fetchUrlText, extractTopicsFromText,
});
