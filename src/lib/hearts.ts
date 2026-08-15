// Learn hearts — 5 lives, one lost on a Drill/Prove miss, one back
// every 30 minutes. Regen is applied on read so a closed tab still
// recovers. No worker, no freeze token (Decision Log #60).

export const HEARTS_KEY = "learn_hearts_v1";
export const HEARTS_MAX = 5;
export const HEARTS_REGEN_MS = 30 * 60 * 1000;

export type HeartsState = {
  hearts: number;
  nextRegenAt: number | null;
};

const listeners = new Set<() => void>();

export function subscribeHearts(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function notifyHearts() {
  listeners.forEach((fn) => fn());
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null;
}

export function migrateHearts(raw: unknown): HeartsState {
  const row = asRecord(raw);
  if (!row) return { hearts: HEARTS_MAX, nextRegenAt: null };
  const n = typeof row.hearts === "number" ? row.hearts : Number(row.hearts);
  const hearts = Number.isFinite(n) ? Math.max(0, Math.min(HEARTS_MAX, Math.floor(n))) : HEARTS_MAX;
  const stamp = typeof row.nextRegenAt === "number" ? row.nextRegenAt : Number(row.nextRegenAt);
  const nextRegenAt = Number.isFinite(stamp) && stamp > 0 ? stamp : null;
  return { hearts, nextRegenAt: hearts >= HEARTS_MAX ? null : nextRegenAt };
}

export function applyRegen(state: HeartsState, now: number): HeartsState {
  if (state.hearts >= HEARTS_MAX) return { hearts: HEARTS_MAX, nextRegenAt: null };
  if (state.nextRegenAt == null) return state;
  let hearts = state.hearts;
  let next = state.nextRegenAt;
  while (hearts < HEARTS_MAX && now >= next) {
    hearts += 1;
    next += HEARTS_REGEN_MS;
  }
  if (hearts >= HEARTS_MAX) return { hearts: HEARTS_MAX, nextRegenAt: null };
  return { hearts, nextRegenAt: next };
}

export function loseHeart(state: HeartsState, now: number): HeartsState {
  const current = applyRegen(state, now);
  if (current.hearts <= 0) return current;
  const hearts = current.hearts - 1;
  const nextRegenAt = current.nextRegenAt ?? (now + HEARTS_REGEN_MS);
  return { hearts, nextRegenAt };
}

export function formatRegenWait(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function readRaw(): unknown {
  try {
    const raw = localStorage.getItem(HEARTS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persist(state: HeartsState) {
  try { localStorage.setItem(HEARTS_KEY, JSON.stringify(state)); } catch { /* quota */ }
  notifyHearts();
}

export function getHearts(now = Date.now()): HeartsState {
  const next = applyRegen(migrateHearts(readRaw()), now);
  const prev = migrateHearts(readRaw());
  if (next.hearts !== prev.hearts || next.nextRegenAt !== prev.nextRegenAt) persist(next);
  return next;
}

export function spendHeart(now = Date.now()): boolean {
  const current = getHearts(now);
  if (current.hearts <= 0) return false;
  persist(loseHeart(current, now));
  return true;
}
