import { describe, it, expect } from "vitest";
import { reconcile, shouldAdoptRealtimeRow, type Shadow, type RemoteRow } from "./sync-reconcile";

const KEYS = ["profile", "exams", "mistakes"];

function row(key: string, value: unknown, updatedAt: string): RemoteRow {
  return { key, value, updatedAt };
}

describe("reconcile — first sync ever on this device", () => {
  it("pushes every local key that has data when the shadow is empty", () => {
    const plan = reconcile(KEYS, { profile: { lang: "uk" }, exams: [{ id: 1 }] }, [], {});
    expect(plan.isFirstSync).toBe(true);
    expect(plan.actions).toEqual([
      { type: "push", key: "profile" },
      { type: "push", key: "exams" },
      { type: "noop", key: "mistakes" },
    ]);
  });

  it("still treats it as first sync even if the server already has rows", () => {
    // The empty shadow is what defines "first sync on THIS device" — a second
    // device signing in for the first time still starts with no shadow, even
    // though the account already has data on the server from device one.
    const remote = [row("profile", { lang: "en" }, "2026-01-01T00:00:00Z")];
    const plan = reconcile(KEYS, {}, remote, {});
    expect(plan.isFirstSync).toBe(true);
    // No local data on this brand-new device, so nothing to push — the pull
    // path is exercised by the ordinary (non-first-sync) reconcile below,
    // since a first-sync device is expected to push its own baseline and then
    // immediately re-reconcile now that it has a shadow.
    expect(plan.actions).toEqual([
      { type: "noop", key: "profile" },
      { type: "noop", key: "exams" },
      { type: "noop", key: "mistakes" },
    ]);
  });
});

describe("reconcile — steady state (non-empty shadow)", () => {
  const shadow: Shadow = {
    profile: "2026-01-01T00:00:00Z",
    exams: "2026-01-01T00:00:00Z",
    mistakes: null, // known key, never synced yet on this device
  };

  it("pulls when the remote row is newer than the shadow", () => {
    const remote = [row("profile", { lang: "fr" }, "2026-01-02T00:00:00Z")];
    const plan = reconcile(KEYS, { profile: { lang: "uk" } }, remote, shadow);
    expect(plan.actions[0]).toEqual({
      type: "pull",
      key: "profile",
      value: { lang: "fr" },
      updatedAt: "2026-01-02T00:00:00Z",
    });
  });

  it("pushes when the local shadow is already caught up and local has data", () => {
    const remote = [row("profile", { lang: "uk" }, "2026-01-01T00:00:00Z")];
    const plan = reconcile(KEYS, { profile: { lang: "uk" } }, remote, shadow);
    expect(plan.actions[0]).toEqual({ type: "push", key: "profile" });
  });

  it("pulls a key with a null shadow (never synced on this device) whenever remote has it", () => {
    const remote = [row("mistakes", [{ id: "m1" }], "2020-01-01T00:00:00Z")];
    const plan = reconcile(KEYS, {}, remote, shadow);
    const action = plan.actions.find((a) => a.key === "mistakes");
    expect(action?.type).toBe("pull");
  });

  it("pushes a key that has never existed on the server at all", () => {
    const plan = reconcile(KEYS, { exams: [{ id: 1 }] }, [], shadow);
    expect(plan.actions.find((a) => a.key === "exams")).toEqual({ type: "push", key: "exams" });
  });

  it("does nothing for a key with no local data and no remote row", () => {
    const plan = reconcile(KEYS, {}, [], shadow);
    expect(plan.actions.find((a) => a.key === "mistakes")).toEqual({ type: "noop", key: "mistakes" });
  });

  it("treats an equal timestamp as not-newer, so it pushes rather than pulls", () => {
    const remote = [row("profile", { lang: "uk" }, "2026-01-01T00:00:00Z")];
    const plan = reconcile(KEYS, { profile: { lang: "uk" } }, remote, shadow);
    expect(plan.actions[0]!.type).toBe("push");
  });

  it("is not confused by key order between local, remote, and shadow", () => {
    const remote = [row("exams", [1], "2026-01-01T00:00:00Z"), row("profile", { a: 1 }, "2026-01-01T00:00:00Z")];
    const plan = reconcile(KEYS, { profile: { a: 1 }, exams: [1] }, remote, shadow);
    expect(plan.actions.map((a) => a.key)).toEqual(KEYS);
  });
});

describe("shouldAdoptRealtimeRow", () => {
  it("adopts a row newer than the shadow", () => {
    const shadow: Shadow = { profile: "2026-01-01T00:00:00Z" };
    expect(shouldAdoptRealtimeRow(shadow, row("profile", {}, "2026-01-02T00:00:00Z"))).toBe(true);
  });

  it("rejects a row at or before the shadow", () => {
    const shadow: Shadow = { profile: "2026-01-02T00:00:00Z" };
    expect(shouldAdoptRealtimeRow(shadow, row("profile", {}, "2026-01-01T00:00:00Z"))).toBe(false);
    expect(shouldAdoptRealtimeRow(shadow, row("profile", {}, "2026-01-02T00:00:00Z"))).toBe(false);
  });

  it("always adopts a key this device has never seen before", () => {
    expect(shouldAdoptRealtimeRow({}, row("profile", {}, "2020-01-01T00:00:00Z"))).toBe(true);
  });
});
