/**
 * Decides how App reacts when this student's data changes underneath it —
 * either from another tab (the `storage` event localStorage fires natively) or
 * from another *device* (the sync layer's own dispatched StorageEvent, see
 * `src/lib/data-sync.ts`).
 *
 * Audit finding #28: the original code carried a comment claiming a
 * `key={dataVersion}` remount existed, but no such key was ever applied to any
 * element. Cross-tab writes re-rendered App and nothing else, so a child screen
 * kept serving whatever it read on its own first mount — the legacy screens read
 * localStorage in a `useState` initializer, which by definition runs once.
 *
 * Kept as a separate, dependency-free module so the two decisions that actually
 * matter — which keys count, and which screens are safe to throw away — are unit
 * testable without mounting the whole app.
 */

/**
 * Tabs holding user input that has not been persisted anywhere yet. Remounting
 * these would silently destroy real work: a half-typed chat message with three
 * attachments, or a Study upload batch mid-extraction.
 *
 * This is the whole reason the fix is not simply `key={dataVersion}` on the
 * content wrapper. A remount is the correct answer for a screen that is a pure
 * view over stored data and the wrong answer for a screen that *is* the draft.
 * Both these screens re-read their stored inputs on the actions the student
 * takes anyway (sending a message, generating a set), so they lose nothing
 * meaningful by not remounting.
 */
export const TRANSIENT_TABS: ReadonlySet<string> = new Set(["chat", "study"]);

/**
 * The `key` to give the tab content. Changing a `key` is what makes React throw
 * the old subtree away and mount a fresh one, which re-runs every `useState`
 * initializer inside it — the only way to make a legacy screen re-read
 * localStorage without rewriting it to subscribe.
 *
 * A transient tab gets a key that never changes, so it is never remounted.
 */
export function remountKeyFor(tab: string, dataVersion: number): string {
  if (TRANSIENT_TABS.has(tab)) return `${tab}:pinned`;
  return `${tab}:${dataVersion}`;
}

/**
 * Whether a `storage` event should bump `dataVersion` at all.
 *
 * A `null` key means the whole store was cleared (`localStorage.clear()`), which
 * the spec defines as affecting everything — always relevant.
 *
 * Deliberately driven by `PERSONAL_DATA_KEYS`, the same list the sync layer and
 * the logout sweep use, rather than the hand-maintained list of seven this file
 * used to carry. That old list predated the brain/mastery stores and never
 * gained them, so a mastery or XP change from another tab was dropped on the
 * floor — and after Phase 2c, so was one arriving from another device.
 */
export function isTrackedKey(key: string | null, trackedKeys: readonly string[]): boolean {
  if (key === null) return true;
  return trackedKeys.includes(key);
}
