/**
 * Covers the two real bugs found while planning Phase 3 (see docs/phase-3-plan.md
 * §3a): `_patched` surviving a sign-out→sign-in-as-a-different-user (pushed the
 * new user's writes under the old user's id), and `removeItem` never
 * propagating a delete across devices.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { startDataSync, stopDataSync } from "./data-sync";

interface Upsert {
  userId: string;
  key: string;
  value: unknown;
}

function makeFakeSupabase(upserts: Upsert[]) {
  return {
    from: () => ({
      select: () => ({ eq: async () => ({ data: [], error: null }) }),
      upsert: (row: Record<string, unknown>) => {
        upserts.push({ userId: row.user_id as string, key: row.key as string, value: row.value });
        return {
          select: () => ({
            single: async () => ({ data: { updated_at: new Date().toISOString() }, error: null }),
          }),
        };
      },
    }),
    channel: () => ({
      on: () => ({ on: () => ({}), subscribe: () => {} }) as unknown as ReturnType<typeof makeFakeSupabase>["channel"],
      subscribe: () => {},
    }),
    removeChannel: () => {},
  } as unknown as Parameters<typeof startDataSync>[0];
}

const PERSONAL_KEY = "some_synced_key_v1";

// jsdom's real `localStorage` is Proxy-backed, so `localStorage.setItem = fn`
// (exactly what data-sync.ts does, and what genuinely works in a real
// browser — this app already relies on it live) doesn't actually replace the
// method under jsdom; the assignment is swallowed instead of shadowing the
// prototype. A plain in-memory stand-in sidesteps that jsdom quirk without
// changing the production patching strategy.
//
// Installed ONCE (not per-test) and reused: data-sync.ts's patch is a
// page-lifetime singleton (`_patched` never resets), so it must keep pointing
// at the same `localStorage` object across every test in this file — a fresh
// object per test would leave the patch bound to a stale, discarded instance.
const store = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  },
});

beforeEach(() => {
  vi.useFakeTimers();
  store.clear();
  (window as unknown as { PERSONAL_DATA_KEYS: string[] }).PERSONAL_DATA_KEYS = [PERSONAL_KEY];
});

afterEach(() => {
  stopDataSync(makeFakeSupabase([]));
  vi.useRealTimers();
});

describe("startDataSync — switching users", () => {
  it("pushes a write made after switching users under the NEW user's id, not the old one", async () => {
    const upsertsA: Upsert[] = [];
    const sbA = makeFakeSupabase(upsertsA);
    await startDataSync(sbA, "user-a");

    stopDataSync(sbA);

    const upsertsB: Upsert[] = [];
    const sbB = makeFakeSupabase(upsertsB);
    await startDataSync(sbB, "user-b");

    localStorage.setItem(PERSONAL_KEY, JSON.stringify({ hello: "world" }));
    await vi.runAllTimersAsync();

    expect(upsertsB.some((u) => u.userId === "user-b" && u.key === PERSONAL_KEY)).toBe(true);
    expect(upsertsA.some((u) => u.key === PERSONAL_KEY)).toBe(false);
  });

  it("is a no-op when called again for the same already-active user", async () => {
    const upserts: Upsert[] = [];
    const sb = makeFakeSupabase(upserts);
    await startDataSync(sb, "user-a");
    await startDataSync(sb, "user-a"); // second call, same user

    localStorage.setItem(PERSONAL_KEY, JSON.stringify({ n: 1 }));
    await vi.runAllTimersAsync();

    // Exactly one push for this key, not duplicated by a second subscription.
    expect(upserts.filter((u) => u.key === PERSONAL_KEY).length).toBe(1);
  });
});

describe("localStorage.removeItem — delete propagation", () => {
  it("pushes a tombstone sentinel (not SQL NULL — the value column is NOT NULL) when a tracked key is removed", async () => {
    const upserts: Upsert[] = [];
    const sb = makeFakeSupabase(upserts);
    await startDataSync(sb, "user-a");

    localStorage.setItem(PERSONAL_KEY, JSON.stringify({ n: 1 }));
    await vi.runAllTimersAsync();
    upserts.length = 0; // only care about the removal below

    localStorage.removeItem(PERSONAL_KEY);
    await vi.runAllTimersAsync();

    expect(upserts).toEqual([{ userId: "user-a", key: PERSONAL_KEY, value: { __deleted: true } }]);
  });

  it("pulling a remote tombstone removes the key locally instead of storing the sentinel", async () => {
    // A stale local value this device already synced once (has a shadow
    // entry), with the server now holding a newer tombstone row — the shape
    // a second device sees after the first device deleted the key.
    localStorage.setItem(
      "sync_shadow_v1",
      JSON.stringify({ [PERSONAL_KEY]: "2020-01-01T00:00:00Z" }),
    );
    localStorage.setItem(PERSONAL_KEY, JSON.stringify({ stale: true }));

    const sb = {
      from: () => ({
        select: () => ({
          eq: async () => ({
            data: [{ key: PERSONAL_KEY, value: { __deleted: true }, updated_at: "2026-01-01T00:00:00Z" }],
            error: null,
          }),
        }),
        upsert: () => ({ select: () => ({ single: async () => ({ data: { updated_at: "x" }, error: null }) }) }),
      }),
      channel: () => ({ on: () => ({ subscribe: () => {} }), subscribe: () => {} }),
      removeChannel: () => {},
    } as unknown as Parameters<typeof startDataSync>[0];

    await startDataSync(sb, "user-a");

    expect(localStorage.getItem(PERSONAL_KEY)).toBeNull();
  });
});
