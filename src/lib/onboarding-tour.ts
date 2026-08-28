/**
 * One-time coach-mark tracking. Each step is shown at most once per device
 * — deliberately NOT synced to Supabase (see PERSONAL_DATA_KEYS in
 * auth-store.jsx): re-seeing a tip on a new device is harmless, syncing it
 * would just be extra plumbing for zero user-facing benefit.
 */
const KEY = "examik_tour_seen_v1";

function seenSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export function hasSeenTourStep(id: string): boolean {
  return seenSet().has(id);
}

export const TOUR_STEP_SEEN_EVENT = "examik:tour-step-seen";

export function markTourStepSeen(id: string): void {
  const seen = seenSet();
  if (seen.has(id)) return;
  seen.add(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...seen]));
  } catch {
    // storage unavailable — the tip just reshows next time, not fatal
  }
  // Same-tab signal so a sibling CoachMark waiting on this step (e.g. the
  // dashboard tip that shouldn't appear stacked on top of the nav intro)
  // can show itself the moment this one closes — localStorage's own
  // "storage" event only fires in OTHER tabs, not this one.
  window.dispatchEvent(new CustomEvent(TOUR_STEP_SEEN_EVENT, { detail: id }));
}
