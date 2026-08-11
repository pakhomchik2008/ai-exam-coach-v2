// AI Exam Coach — qualifications catalog: DB-backed, snapshot-fallback.
//
// Plan 3.2: the exam metadata that used to be five hardcoded JS structures
// (EXAM_TYPES, SUBJECT_PRESETS, COUNTRY_TO_EXAM_TYPE, and the SECTION_BASED /
// EN_MEDIUM Sets in exam-wizard.jsx) now lives in ONE Supabase table
// (`qualifications`, see supabase/04_qualifications.sql). Adding a new exam
// (IELTS, TOEFL, Duolingo) becomes one row there + its subject rows in
// `curriculum` — no code change, no deploy.
//
// Same instant/offline contract as the curriculum catalog: the bundled
// onboarding-data.jsx copy (window.EXAM_TYPES + friends) is the SYNCHRONOUS
// baseline that renders the first screen with zero network wait; this file
// fetches the DB once on boot and merges it OVER that snapshot, rewriting the
// globals in place so existing consumers (which read window.EXAM_TYPES /
// window.examType / window.SUBJECT_PRESETS / window.COUNTRY_TO_EXAM_TYPE at
// call time) transparently pick up DB-only exams.
//
// Must load AFTER onboarding-data.jsx (needs the snapshot) and auth-store.jsx
// (needs window._supabase).

const QUALIFICATIONS_REMOTE_KEY = "qualifications_remote_v1";

// DB row (snake_case + jsonb) → the exact EXAM_TYPES object shape every consumer
// already expects, plus the extra flags that used to be separate Sets/maps.
function _rowToExamType(r) {
  const et = {
    id: r.id,
    label: r.label,
    emoji: r.emoji || "",
    blurb: r.blurb || {},
    board: r.board || null,
    educationSystemId: r.education_system_id || null,
    grade: r.grade_config || { kind: "scale", options: ["A", "B", "C", "D", "Pass"], current: "C", target: "A" },
    // Extra DB-driven metadata — these replace the hardcoded Sets/maps:
    subjectPresets: Array.isArray(r.subject_presets) ? r.subject_presets : [],
    sectionBased: !!r.section_based,   // was exam-wizard.jsx SECTION_BASED
    enMedium: !!r.en_medium,           // was exam-wizard.jsx EN_MEDIUM
    defaultForCountries: Array.isArray(r.default_for_countries) ? r.default_for_countries : [],
    sortOrder: typeof r.sort_order === "number" ? r.sort_order : 100,
  };
  // boardOptions is only present when the exam has a board choice — keep it
  // absent (not null) otherwise, matching the bundled EXAM_TYPES shape exactly.
  if (Array.isArray(r.board_options) && r.board_options.length) et.boardOptions = r.board_options;
  return et;
}

// Merge remote rows over the bundled snapshot: a remote row with the same id
// overrides the bundled one; a brand-new remote exam is inserted before the
// "custom" entry (Custom always stays last in the picker); order otherwise
// follows the snapshot, then remote sortOrder for the new ones.
function _mergeQuals(snapshot, remote) {
  const snap = (snapshot || []).slice();
  if (!remote || !remote.length) return snap;
  const remoteById = new Map(remote.map((r) => [r.id, r]));
  const merged = snap.map((e) => (remoteById.has(e.id) ? { ...e, ...remoteById.get(e.id) } : e));
  const existing = new Set(snap.map((e) => e.id));
  const newOnes = remote.filter((r) => !existing.has(r.id)).sort((a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100));
  if (!newOnes.length) return merged;
  const customIdx = merged.findIndex((e) => e.id === "custom");
  if (customIdx < 0) return merged.concat(newOnes);
  return merged.slice(0, customIdx).concat(newOnes, merged.slice(customIdx));
}

// Rewrite the globals in place from a merged qualification list, so every
// existing reader (window.EXAM_TYPES / examType / SUBJECT_PRESETS /
// COUNTRY_TO_EXAM_TYPE) transparently sees DB data with no per-consumer change.
function _applyToGlobals(merged) {
  window.EXAM_TYPES = merged;
  // Same resolution rule as the bundled catalog (onboarding-data.jsx): an
  // unknown id resolves to "custom", never to whatever happens to sit at index
  // 1. In this merged list that index is DB-ordered, so the old fallback was
  // not even predictably A-Level — it was "whichever qualification loaded
  // second", silently applying its grade scale to the student's exam.
  window.examType = (id) => window.resolveExamType(merged, id);

  const presets = { ...(window.SUBJECT_PRESETS || {}) };
  const countryToExam = { ...(window.COUNTRY_TO_EXAM_TYPE || {}) };
  merged.forEach((e) => {
    if (Array.isArray(e.subjectPresets) && e.subjectPresets.length) presets[e.id] = e.subjectPresets;
    (e.defaultForCountries || []).forEach((cid) => { if (cid) countryToExam[cid] = e.id; });
  });
  window.SUBJECT_PRESETS = presets;
  window.COUNTRY_TO_EXAM_TYPE = countryToExam;
}

let _remoteQualifications = (() => {
  try { const raw = JSON.parse(localStorage.getItem(QUALIFICATIONS_REMOTE_KEY) || "[]"); return Array.isArray(raw) ? raw : []; }
  catch { return []; }
})();

// Apply the last-known remote catalog immediately on boot (before any fetch),
// so a returning user gets DB exams synchronously too — fully offline-capable.
if (_remoteQualifications.length) {
  try { _applyToGlobals(_mergeQuals(window.EXAM_TYPES || [], _remoteQualifications.map(_rowToExamType))); } catch {}
}

function getQualifications() { return window.EXAM_TYPES || []; }

// Fetch the whole qualifications table once and merge it in. Best-effort: any
// failure (offline, table not created yet, RLS) silently leaves the bundled
// snapshot in charge — exactly like refreshRemoteCurriculum.
async function refreshRemoteQualifications() {
  const sb = window._supabase;
  if (!sb) return _remoteQualifications;
  try {
    const { data, error } = await sb.from("qualifications").select("*").order("sort_order");
    if (error || !Array.isArray(data)) return _remoteQualifications;
    _remoteQualifications = data;
    try { localStorage.setItem(QUALIFICATIONS_REMOTE_KEY, JSON.stringify(data)); } catch {}
    _applyToGlobals(_mergeQuals(window.EXAM_TYPES || [], data.map(_rowToExamType)));
    // Let any mounted onboarding/picker re-read the now-richer catalog.
    window.dispatchEvent(new CustomEvent("qualifications-updated"));
  } catch {}
  return _remoteQualifications;
}

Object.assign(window, {
  QUALIFICATIONS_REMOTE_KEY, getQualifications, refreshRemoteQualifications, _mergeQuals, _rowToExamType,
});

// Warm the remote catalog on boot (non-blocking). The bundled snapshot serves
// every synchronous read immediately; this quietly upgrades it once it lands.
refreshRemoteQualifications();

// Module marker: these files carry no import/export of their own (they still
// communicate via `window` globals), and without one the JSX transform treats
// the file as a CommonJS script and emits a bare `require()` call that throws
// in the browser. Removed once this module uses real imports.
export {};
