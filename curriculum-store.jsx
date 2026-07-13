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
  // Dedup by subject name, seed rows first (Array.prototype.find below keeps first hit)
  const seen = new Set();
  const out = [];
  for (const r of matches) {
    const key = r.subject.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ subject: r.subject, board: r.board, specVersion: r.specVersion, source: r.source });
  }
  return out;
}

// ── AI-backed fetch-and-cache — only called when getCurriculum() returned
//    null for a subject the user committed to. Reuses window.claude.complete
//    exactly like ai-enrichment.jsx's requestTopicNames — no new transport. ──
async function fetchAndCacheCurriculum(countryId, qualificationId, board, subject, specVersion) {
  if (!window.claude) return null;
  const system = "You are a curriculum expert. Output ONLY valid JSON, no markdown, no commentary: " +
    '{"topics":[{"name":"...","difficulty":1-10,"importance":1-10,"subtopics":["...","..."]}]}. ' +
    "List the real syllabus topics students are actually examined on, foundational topics first (this order IS the recommended study order). " +
    "8-14 topics is typical; use your judgment for the subject's real scope. Each topic gets 2-5 short subtopics.";
  const boardLabel = board ? ` (${board} exam board)` : "";
  const versionLabel = specVersion ? `, ${specVersion} specification` : "";
  const prompt = `List the syllabus topics for "${subject}" under the ${qualificationId}${boardLabel} qualification in ${countryId}${versionLabel}. Use your knowledge of this subject's real curriculum.`;

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
});
