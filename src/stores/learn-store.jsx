// Examik — Learn progress store (Phase 3.7a).
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
//         interval: number,   // SM-2 review interval, in days
//         ease: number,       // SM-2 ease factor, starts 2.5, floor 1.3
//         dueAt: number | null, // epoch ms — next Prove that both passes
//                                // AND lands on/after this advances one
//                                // mastery rank (Ultra only, see below)
//       }
//     }
//   }
// A missing entry is implicitly "unlocked" in storage. Whether the student
// can *open* the node is derived in tree/locks.ts from prerequisites
// (Phase 3.7e) — we never persist "locked", so a syllabus edit that adds
// a parent re-locks without a migration.
//
// Silver/Gold/Legendary (Ultra feature, Phase 5): Bronze is free — pass
// Prove once. Beyond bronze runs on real SM-2 spaced repetition: passing
// Prove sets a dueAt; re-Prove-ing before dueAt still counts as practice
// (interval/ease update) but does not advance mastery — you have to come
// back when the algorithm says the memory is fading, same as Anki/Duolingo.
// `canAdvance` (passed in by the caller, computed from isUltraUser() in
// premium.ts) gates the rank advancement only — Free/Pro users still get
// the SM-2 tracking for free, so upgrading to Ultra later doesn't lose
// their review history, they just couldn't cash it in for a medal yet.

const LEARN_KEY = "learn_progress_v1";
const LEARN_SCHEMA_VERSION = 1;
const MASTERY_LEVELS = ["locked", "unlocked", "bronze", "silver", "gold", "legendary"];
// Ordinal used to decide "is this attempt an upgrade?" — we never DOWNGRADE
// on save, only raise. Losing progress on a re-Prove that scored worse
// would punish practice, exactly the anti-pattern the spec calls out.
const MASTERY_RANK = Object.fromEntries(MASTERY_LEVELS.map((k, i) => [k, i]));
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_EASE = 2.5;

function _validNode(n) {
  if (!n || typeof n !== "object") return null;
  const mastery = MASTERY_LEVELS.includes(n.mastery) ? n.mastery : "unlocked";
  const attempts = typeof n.attempts === "number" && n.attempts >= 0 ? Math.floor(n.attempts) : 0;
  const lastReviewedAt = typeof n.lastReviewedAt === "number" ? n.lastReviewedAt : null;
  const interval = typeof n.interval === "number" && n.interval >= 0 ? n.interval : 0;
  const ease = typeof n.ease === "number" && n.ease >= 1.3 ? n.ease : DEFAULT_EASE;
  const dueAt = typeof n.dueAt === "number" ? n.dueAt : null;
  return { mastery, attempts, lastReviewedAt, interval, ease, dueAt };
}

// Standard SM-2 (SuperMemo). quality is 0-5: <3 is a fail (reset to a
// 1-day interval, ease drops), >=3 is a pass (ease rises with how easy
// it felt, interval multiplies by the new ease — 1 day → 6 days → ...).
function _sm2(prevInterval, prevEase, quality) {
  if (quality < 3) return { interval: 1, ease: Math.max(1.3, prevEase - 0.2) };
  const ease = Math.max(1.3, prevEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  const interval = prevInterval <= 0 ? 1 : prevInterval === 1 ? 6 : Math.round(prevInterval * ease);
  return { interval, ease };
}

// correct/total → SM-2 quality. Perfect run = 5 (biggest ease bump),
// passing-but-imperfect = 4, below the Prove passMark = 2 (a fail).
function _qualityFor(correct, total) {
  if (!total || total <= 0) return 0;
  const ratio = correct / total;
  if (ratio >= 0.999) return 5;
  if (ratio >= 2 / 3) return 4;
  return 2;
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

const DEFAULT_NODE = { mastery: "unlocked", attempts: 0, lastReviewedAt: null, interval: 0, ease: DEFAULT_EASE, dueAt: null };

// Read a single node's progress. Unknown node = default "unlocked" with
// zero attempts — MVP treats every node as available (see file header).
function getNodeProgress(examTaxonomy, nodeId) {
  const state = getLearn();
  const forExam = state[examTaxonomy] || {};
  return forExam[nodeId] || DEFAULT_NODE;
}

// Central mutator. `result` is { correct, total, canAdvance } — canAdvance
// is the caller's isUltraUser() check (learn-store is a window-global file
// with no imports, so it can't reach premium.ts itself; see file header).
// Mastery only ever raises (never downgrades — see MASTERY_RANK comment):
// first pass sets bronze; every pass after that runs SM-2 and only bumps
// the rank one step when the review was both a pass AND on/after dueAt AND
// canAdvance. A re-Prove that doesn't advance still updates interval/ease
// so the review schedule stays accurate regardless of who's allowed to
// cash it in for a medal.
function recordNodeAttempt(examTaxonomy, nodeId, result) {
  if (!examTaxonomy || !nodeId) return getNodeProgress(examTaxonomy, nodeId);
  const { correct = 0, total = 0, canAdvance = false } = result || {};
  const state = { ...getLearn() };
  const forExam = { ...(state[examTaxonomy] || {}) };
  const prev = forExam[nodeId] || DEFAULT_NODE;
  const now = Date.now();
  const quality = _qualityFor(correct, total);
  const passed = quality >= 3;
  const isFirstPass = MASTERY_RANK[prev.mastery] < MASTERY_RANK.bronze;
  const isReviewDue = prev.dueAt != null && now >= prev.dueAt;

  const { interval, ease } = _sm2(prev.interval || 0, prev.ease || DEFAULT_EASE, quality);
  const dueAt = now + interval * DAY_MS;

  let achievedMastery = prev.mastery;
  if (passed) {
    if (isFirstPass) {
      achievedMastery = "bronze";
    } else if (canAdvance && isReviewDue) {
      const nextIdx = Math.min(MASTERY_RANK[prev.mastery] + 1, MASTERY_RANK.legendary);
      achievedMastery = MASTERY_LEVELS[nextIdx];
    }
    // passed early, or passed but not Ultra: practice counts (SM-2 above
    // already updated), rank just doesn't move this time.
  }

  const nextRank = MASTERY_RANK[achievedMastery] ?? MASTERY_RANK.unlocked;
  const prevRank = MASTERY_RANK[prev.mastery] ?? MASTERY_RANK.unlocked;
  const mastery = nextRank > prevRank ? achievedMastery : prev.mastery;

  const nextNode = { mastery, attempts: prev.attempts + 1, lastReviewedAt: now, interval, ease, dueAt };
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
