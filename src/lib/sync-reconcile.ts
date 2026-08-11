/**
 * Pure decision logic for cross-device sync (audit #12).
 *
 * Deliberately has no DOM, no localStorage, no network — every input is a
 * plain value and every output is an instruction for the glue layer
 * (`data-sync.ts`) to carry out. That split exists so the actual decision
 * ("which side wins") is fully unit-testable, and the risky, hard-to-test part
 * (patching `localStorage`, holding a WebSocket open) is as thin as possible
 * around it.
 *
 * The core rule: compare two SERVER timestamps, never a client clock. A
 * laptop and a phone do not have the same clock, so "last write wins" is only
 * correct if "last" is measured by one shared clock — Postgres's `now()` on
 * every upsert (see `supabase/13_user_data_sync.sql`'s trigger, which
 * overwrites whatever `updated_at` the client sent).
 */

export interface RemoteRow {
  readonly key: string;
  readonly value: unknown;
  /** ISO timestamp, always server-assigned. */
  readonly updatedAt: string;
}

/**
 * What this device believes about a key as of its last successful sync: the
 * server timestamp it last confirmed. `null` means this device has never
 * synced this key before (a fresh install, or a key that only just gained
 * local data).
 */
export type Shadow = Readonly<Record<string, string | null>>;

export type LocalSnapshot = Readonly<Record<string, unknown>>;

export type ReconcileAction =
  | { readonly type: "push"; readonly key: string }
  | { readonly type: "pull"; readonly key: string; readonly value: unknown; readonly updatedAt: string }
  | { readonly type: "noop"; readonly key: string };

export interface ReconcilePlan {
  readonly actions: readonly ReconcileAction[];
  /** True the first time this device has ever synced — see `firstSync`. */
  readonly isFirstSync: boolean;
}

/**
 * A device has never synced only when its shadow is completely empty. A
 * partially-populated shadow (some keys synced, one brand new) is the normal
 * case — a new key with no shadow entry there is just a key with no local
 * data yet to push, not a first-time device.
 */
function isFirstSync(shadow: Shadow): boolean {
  return Object.keys(shadow).length === 0;
}

/**
 * Decides, for every tracked key, whether to push the local copy, pull the
 * remote copy, or do nothing.
 *
 * First sync ever on this device (empty shadow): every local key holding data
 * is pushed as-is, becoming this account's baseline on the server — the
 * one-time "migrate existing localStorage into Supabase" step, expressed as
 * the reconcile function's first run rather than a separate script.
 *
 * Every subsequent reconcile: for each key, compare the shadow (the server
 * timestamp this device last confirmed) against the row currently on the
 * server.
 *   - No remote row, but local has data → push (first time this exact key has
 *     existed at all, e.g. a new store key shipped in a later release).
 *   - Remote row newer than the shadow → another device wrote since we last
 *     synced → pull.
 *   - Remote row is at or behind the shadow → this device's copy is at least
 *     as current → push (harmless no-op upsert if the content is identical;
 *     simplicity over micro-optimizing away an idempotent write).
 *   - Neither local nor remote has anything → noop.
 */
export function reconcile(
  keys: readonly string[],
  local: LocalSnapshot,
  remote: readonly RemoteRow[],
  shadow: Shadow,
): ReconcilePlan {
  const remoteByKey = new Map(remote.map((r) => [r.key, r]));
  const firstSync = isFirstSync(shadow);
  const actions: ReconcileAction[] = [];

  for (const key of keys) {
    const hasLocal = Object.prototype.hasOwnProperty.call(local, key) && local[key] !== undefined;
    const remoteRow = remoteByKey.get(key);

    if (firstSync) {
      actions.push(hasLocal ? { type: "push", key } : { type: "noop", key });
      continue;
    }

    if (!remoteRow) {
      actions.push(hasLocal ? { type: "push", key } : { type: "noop", key });
      continue;
    }

    const shadowAt = shadow[key] ?? null;
    const remoteIsNewer = shadowAt === null || Date.parse(remoteRow.updatedAt) > Date.parse(shadowAt);

    if (remoteIsNewer) {
      actions.push({ type: "pull", key, value: remoteRow.value, updatedAt: remoteRow.updatedAt });
    } else if (hasLocal) {
      actions.push({ type: "push", key });
    } else {
      // Remote has data, this device doesn't, and the shadow says this device
      // is already caught up. None of the tracked stores ever call
      // `removeItem` on these keys outside `clearSession()` (verified by
      // grep), and a full logout ends this device's session entirely, so this
      // branch should not occur in normal operation. Defensive fallback:
      // adopt remote rather than leave this device silently blank forever.
      actions.push({ type: "pull", key, value: remoteRow.value, updatedAt: remoteRow.updatedAt });
    }
  }

  return { actions, isFirstSync: firstSync };
}

/**
 * Whether a single incoming realtime row should be adopted right now, outside
 * a full reconcile pass. Same rule as the reconcile loop's pull branch, kept
 * separate because a realtime event arrives one row at a time, not as a batch
 * against a known local snapshot.
 */
export function shouldAdoptRealtimeRow(shadow: Shadow, row: RemoteRow): boolean {
  const shadowAt = shadow[row.key] ?? null;
  return shadowAt === null || Date.parse(row.updatedAt) > Date.parse(shadowAt);
}
