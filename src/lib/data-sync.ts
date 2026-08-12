/**
 * Cross-device sync glue (audit #12). The decision logic lives in
 * `sync-reconcile.ts` and is fully unit tested; this file is the thin,
 * hard-to-unit-test layer around it — patching `localStorage`, holding a
 * realtime subscription open, debouncing writes.
 *
 * Deliberately reuses `window._supabase`, the one client instance auth-store
 * already constructed (same project, same persisted session), rather than
 * creating a second client — two clients would mean two separate realtime
 * connections and two places a session could drift out of sync with itself.
 *
 * Started once a real or demo session exists (see the bottom of this file);
 * a no-op with no session, so a signed-out visitor never opens a realtime
 * connection or touches Supabase at all.
 */
import { reconcile, shouldAdoptRealtimeRow, type RemoteRow, type Shadow } from "./sync-reconcile";

const TABLE = "user_data";
const SHADOW_KEY = "sync_shadow_v1";
const PUSH_DEBOUNCE_MS = 800;

// `public.user_data.value` is `jsonb not null` (see supabase/13_user_data_sync.sql)
// — an upsert with a plain JS `null` serializes to SQL NULL over PostgREST and
// is rejected by that constraint (confirmed live: error 23502). A sentinel
// object is a tombstone that fits the existing NOT NULL column without a
// second migration.
const TOMBSTONE = { __deleted: true } as const;
function isTombstone(value: unknown): boolean {
  return typeof value === "object" && value !== null && (value as Record<string, unknown>).__deleted === true;
}

interface SupabaseLike {
  from: (table: string) => {
    select: (cols: string) => { eq: (col: string, val: string) => Promise<{ data: unknown; error: unknown }> };
    upsert: (
      row: Record<string, unknown>,
    ) => { select: (cols: string) => { single: () => Promise<{ data: unknown; error: unknown }> } };
  };
  channel: (name: string) => RealtimeChannelLike;
  removeChannel: (channel: RealtimeChannelLike) => void;
}

interface RealtimeChannelLike {
  on: (
    event: string,
    filter: Record<string, unknown>,
    callback: (payload: { new: Record<string, unknown> }) => void,
  ) => RealtimeChannelLike;
  subscribe: () => void;
}

let _patched = false;
let _writingFromSync = false;
let _channel: RealtimeChannelLike | null = null;
const _pending = new Map<string, ReturnType<typeof setTimeout>>();

// Mutable holder the patched localStorage.setItem/removeItem read from at
// CALL time rather than at patch time. The patch itself only ever happens
// once (below) — but sign-out then sign-in-as-a-different-user must not
// keep pushing that second user's writes under the first user's id, which
// is exactly what happened when the closure captured `sb`/`userId`/`keys`
// directly: `_patched` stayed true across stopDataSync/startDataSync, so
// patchLocalStorage's early-return skipped re-patching, and the OLD
// closure — over the OLD user — kept running.
let _active: { sb: SupabaseLike; userId: string; keys: readonly string[] } | null = null;

function readShadow(): Shadow {
  try {
    const raw = localStorage.getItem(SHADOW_KEY);
    return raw ? (JSON.parse(raw) as Shadow) : {};
  } catch {
    return {};
  }
}

function writeShadowEntry(key: string, updatedAt: string): void {
  const current = readShadow();
  const next = { ...current, [key]: updatedAt };
  _writingFromSync = true;
  try {
    localStorage.setItem(SHADOW_KEY, JSON.stringify(next));
  } finally {
    _writingFromSync = false;
  }
}

function readLocal(key: string): unknown {
  const raw = localStorage.getItem(key);
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function writeLocal(key: string, value: unknown): void {
  _writingFromSync = true;
  try {
    // A tombstone (see TOMBSTONE/pushKey) pulls as a removal — a remote
    // delete must actually delete locally too, not store the sentinel as if
    // it were real data.
    if (isTombstone(value)) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    // Reuses App.tsx's existing storage listener (same event it already
    // reacts to for cross-tab sync) so a pulled value re-renders whatever
    // screen reads this key, instead of requiring a second reactivity path.
    window.dispatchEvent(new StorageEvent("storage", { key }));
  } finally {
    _writingFromSync = false;
  }
}

async function pushKey(sb: SupabaseLike, userId: string, key: string): Promise<void> {
  const value = readLocal(key);
  const { data, error } = await sb
    .from(TABLE)
    // A tombstone push (value === undefined, i.e. the key was removed
    // locally) upserts the TOMBSTONE sentinel rather than deleting the row —
    // deleting would lose the server-assigned `updated_at` that
    // last-write-wins depends on, and the sentinel flows through reconcile()/
    // shouldAdoptRealtimeRow() as "pull → remove locally" (see writeLocal)
    // exactly like any other newer remote value.
    .upsert({ user_id: userId, key, value: value === undefined ? TOMBSTONE : value })
    .select("updated_at")
    .single();
  if (error) {
    console.warn(`[data-sync] push failed for ${key}:`, error);
    return;
  }
  const updatedAt = (data as { updated_at?: string } | null)?.updated_at;
  if (updatedAt) writeShadowEntry(key, updatedAt);
}

function schedulePush(sb: SupabaseLike, userId: string, key: string): void {
  const existing = _pending.get(key);
  if (existing) clearTimeout(existing);
  _pending.set(
    key,
    setTimeout(() => {
      _pending.delete(key);
      void pushKey(sb, userId, key);
    }, PUSH_DEBOUNCE_MS),
  );
}

/**
 * Patches `localStorage.setItem`/`removeItem` exactly once for the lifetime
 * of the page — the patched functions themselves read `_active` at CALL
 * time, so a later `startDataSync()` call (a different user, after
 * sign-out→sign-in) just updates `_active` rather than needing to re-patch.
 *
 * The `_writingFromSync` guard is what stops a pulled value from being
 * mistaken for a fresh local edit and pushed straight back up.
 */
function patchLocalStorage(): void {
  if (_patched) return;
  _patched = true;

  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (key: string, value: string) => {
    originalSetItem(key, value);
    if (_writingFromSync || !_active) return;
    if (_active.keys.includes(key)) schedulePush(_active.sb, _active.userId, key);
  };

  const originalRemoveItem = localStorage.removeItem.bind(localStorage);
  localStorage.removeItem = (key: string) => {
    originalRemoveItem(key);
    if (_writingFromSync || !_active) return;
    // Pushes a tombstone (see pushKey) so the removal reaches other devices
    // instead of silently only happening locally.
    if (_active.keys.includes(key)) schedulePush(_active.sb, _active.userId, key);
  };
}

async function fetchRemoteRows(sb: SupabaseLike, userId: string): Promise<RemoteRow[]> {
  const { data, error } = await sb.from(TABLE).select("key,value,updated_at").eq("user_id", userId);
  if (error) {
    console.warn("[data-sync] initial fetch failed:", error);
    return [];
  }
  return ((data as { key: string; value: unknown; updated_at: string }[] | null) ?? []).map((r) => ({
    key: r.key,
    value: r.value,
    updatedAt: r.updated_at,
  }));
}

async function runReconcile(sb: SupabaseLike, userId: string, keys: readonly string[]): Promise<void> {
  const local: Record<string, unknown> = {};
  for (const key of keys) {
    const value = readLocal(key);
    if (value !== undefined) local[key] = value;
  }

  const remote = await fetchRemoteRows(sb, userId);
  const shadow = readShadow();
  const plan = reconcile(keys, local, remote, shadow);

  for (const action of plan.actions) {
    if (action.type === "push") {
      await pushKey(sb, userId, action.key);
    } else if (action.type === "pull") {
      writeLocal(action.key, action.value);
      writeShadowEntry(action.key, action.updatedAt);
    }
  }
}

function subscribeRealtime(sb: SupabaseLike, userId: string): RealtimeChannelLike {
  return sb
    .channel(`user_data:${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE, filter: `user_id=eq.${userId}` },
      (payload) => {
        const row = payload.new as { key?: string; value?: unknown; updated_at?: string };
        if (!row.key || row.updated_at === undefined) return;
        const remoteRow: RemoteRow = { key: row.key, value: row.value, updatedAt: row.updated_at };
        const shadow = readShadow();
        if (shouldAdoptRealtimeRow(shadow, remoteRow)) {
          writeLocal(remoteRow.key, remoteRow.value);
          writeShadowEntry(remoteRow.key, remoteRow.updatedAt);
        }
      },
    );
}

function getPersonalDataKeys(): string[] {
  const keys = (window as unknown as { PERSONAL_DATA_KEYS?: string[] }).PERSONAL_DATA_KEYS;
  // ACCOUNTS_KEY is in PERSONAL_DATA_KEYS for the logout-clear sweep but holds
  // no real data (audit-store's own "kept for compat" stub) — excluded here so
  // it isn't synced as if it were a content key.
  return (keys ?? []).filter((k) => k !== "auth_accounts_v1");
}

/**
 * Starts syncing for the given user. Safe to call more than once — a call
 * for a user that's already active is a no-op; a call for a NEW user (after
 * `stopDataSync()`) tears down the old realtime channel first via the same
 * path `stopDataSync` uses, so nothing from the previous user keeps running.
 */
export async function startDataSync(sb: SupabaseLike, userId: string): Promise<void> {
  if (_active?.userId === userId) return;
  if (_active) stopDataSync(_active.sb);

  const keys = getPersonalDataKeys();
  _active = { sb, userId, keys };
  patchLocalStorage();
  await runReconcile(sb, userId, keys);

  _channel = subscribeRealtime(sb, userId);
  _channel.subscribe();

  const onVisible = () => {
    if (document.visibilityState === "visible" && _active?.userId === userId) {
      void runReconcile(sb, userId, keys);
    }
  };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onVisible);
}

/** Tears the subscription down — called on sign-out. */
export function stopDataSync(sb: SupabaseLike): void {
  if (_channel) {
    sb.removeChannel(_channel);
    _channel = null;
  }
  for (const timeout of _pending.values()) clearTimeout(timeout);
  _pending.clear();
  _active = null;
}
