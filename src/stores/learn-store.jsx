// AI Exam Coach — Learn progress store (Phase 3.7a).
//
// Per-node mastery per exam. Same get/save/subscribe/migrate shape as
// every other store (see profile-store.jsx's header) — mostly so a new
// contributor doesn't have to guess a new pattern for a new store.
//
// Persistence: localStorage key `learn_progress_v1`, auto-synced across
// devices through the existing data-sync.ts pipeline (auth-store.jsx's
// PERSONAL_DATA_KEYS list). No separate Supabase table for MVP — the
// user_data blob is the sync mechanism, and there is nothing yet that
// needs to query one user's learn progress from another user's session
// (leaderboards / cohort analytics would justify a dedicated table).
//
// Shape:
//   {
//     [examTaxonomy]: {
//       [nodeId]: {
//         mastery: "locked" | "unlocked" | "bronze" | "silver" | "gold" | "legendary",
//         attempts: number,
//         lastReviewedAt: number | null,
//       }
//     }
//   }
// A missing entry is implicitly "unlocked" (MVP treats every node as
// available — Phase 3.7e will start enforcing prerequisites and the
// "locked" state).

const LEARN_KEY = "learn_progress_v1";
const LEARN_SCHEMA_VERSION = 1;
const MASTERY_LEVELS = ["locked", "unlocked", "bronze", "silver", "gold", "legendary"];
// Ordinal used to decide "is this attempt an upgrade?" — we never DOWNGRADE
// on save, only raise. Losing progress on a re-Prove that scored worse
// would punish practice, exactly the anti-pattern the spec calls out.
const MASTERY_RANK = Object.fromEntries(MASTERY_LEVELS.map((k, i) => [k, i]));

function _validNode(n) {
  if (!n || typeof n !== "object") return null;
  const mastery = MASTERY_LEVELS.includes(n.mastery) ? n.mastery : "unlocked";
  const attempts = typeof n.attempts === "number" && n.attempts >= 0 ? Math.floor(n.attempts) : 0;
  const lastReviewedAt = typeof n.lastReviewedAt === "number" ? n.lastReviewedAt : null;
  return { mastery, attempts, lastReviewedAt };
}

function migrateLearn(raw) {
  const p = raw && typeof raw === "object" ? raw : {};
  const out = {};
  for (const [tax, nodes] of Object.entries(p)) {
    if (!nodes || typeof nodes !== "object" || tax === "_v") continue;
    const cleaned = {};
    for (const [nodeId, node] of Object.entries(nodes)) {
      const v = _validNode(node);
      if (v) cleaned[nodeId] = v;
    }
    out[tax] = cleaned;
  }
  out._v = LEARN_SCHEMA_VERSION;
  return out;
}

let _learnRaw = null;
let _learnCache = null;
const _learnListeners = new Set();

function subscribeLearn(fn) { _learnListeners.add(fn); return () => _learnListeners.delete(fn); }
function _notifyLearn() { _learnListeners.forEach((fn) => fn()); }

function getLearn() {
  let raw;
  try { raw = localStorage.getItem(LEARN_KEY); } catch { raw = null; }
  if (raw === _learnRaw && _learnCache) return _learnCache;
  _learnRaw = raw;
  try { _learnCache = migrateLearn(raw ? JSON.parse(raw) : null); }
  catch { _learnCache = migrateLearn(null); }
  return _learnCache;
}

function _persist(next) {
  try { localStorage.setItem(LEARN_KEY, JSON.stringify(next)); } catch {}
  _learnRaw = JSON.stringify(next);
  _learnCache = next;
  _notifyLearn();
}

// Read a single node's progress. Unknown node = default "unlocked" with
// zero attempts — MVP treats every node as available (see file header).
function getNodeProgress(examTaxonomy, nodeId) {
  const state = getLearn();
  const forExam = state[examTaxonomy] || {};
  return forExam[nodeId] || { mastery: "unlocked", attempts: 0, lastReviewedAt: null };
}

// Central mutator. Raises mastery only (never downgrades — see MASTERY_RANK
// comment). Always increments attempts and stamps lastReviewedAt so a
// re-Prove that DIDN'T advance mastery still counts as "you did this today"
// for the future spaced-repetition step (Phase 3.7d).
function recordNodeAttempt(examTaxonomy, nodeId, achievedMastery) {
  if (!examTaxonomy || !nodeId) return getNodeProgress(examTaxonomy, nodeId);
  const state = { ...getLearn() };
  const forExam = { ...(state[examTaxonomy] || {}) };
  const prev = forExam[nodeId] || { mastery: "unlocked", attempts: 0, lastReviewedAt: null };
  const nextRank = MASTERY_RANK[achievedMastery] ?? MASTERY_RANK.unlocked;
  const prevRank = MASTERY_RANK[prev.mastery] ?? MASTERY_RANK.unlocked;
  const mastery = nextRank > prevRank ? achievedMastery : prev.mastery;
  const nextNode = { mastery, attempts: prev.attempts + 1, lastReviewedAt: Date.now() };
  forExam[nodeId] = nextNode;
  state[examTaxonomy] = forExam;
  _persist(state);
  return nextNode;
}

// Count nodes at bronze+ for an exam — the LearnMain header uses this.
function masteredCount(examTaxonomy) {
  const state = getLearn();
  const forExam = state[examTaxonomy] || {};
  return Object.values(forExam).filter((n) => MASTERY_RANK[n.mastery] >= MASTERY_RANK.bronze).length;
}

Object.assign(window, {
  LEARN_KEY, MASTERY_LEVELS,
  getLearn, subscribeLearn, getNodeProgress, recordNodeAttempt, masteredCount,
  migrateLearn,
});

// See profile-store.jsx's header on why this bare `export {}` exists.
export {};
