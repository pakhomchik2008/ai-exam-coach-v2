import { describe, it, expect } from "vitest";
import { remountKeyFor, isTrackedKey, TRANSIENT_TABS } from "./data-version";

describe("remountKeyFor", () => {
  it("gives a read-only tab a key that changes with dataVersion, so it remounts", () => {
    expect(remountKeyFor("dashboard", 0)).not.toBe(remountKeyFor("dashboard", 1));
  });

  it("gives a transient tab a key that never changes, so it survives", () => {
    // The regression this guards: a student typing a chat message on their
    // laptop while their phone syncs a mastery update must not lose the draft.
    for (const tab of TRANSIENT_TABS) {
      expect(remountKeyFor(tab, 0)).toBe(remountKeyFor(tab, 99));
    }
  });

  it("never collides between tabs at the same version", () => {
    const tabs = ["dashboard", "progress", "journal", "calendar", "exams", "settings", "chat", "study", "studyhub"];
    const keys = tabs.map((tab) => remountKeyFor(tab, 3));
    expect(new Set(keys).size).toBe(tabs.length);
  });

  it("treats an unknown tab id as remountable", () => {
    // Safer default: a screen nobody has classified is far more likely to be a
    // plain view than a draft, and a stale view is the bug being fixed.
    expect(remountKeyFor("brand-new-tab", 0)).not.toBe(remountKeyFor("brand-new-tab", 1));
  });
});

describe("isTrackedKey", () => {
  const keys = ["exams_list_v2", "brain_mastery_v1"];

  it("accepts a tracked key", () => {
    expect(isTrackedKey("brain_mastery_v1", keys)).toBe(true);
  });

  it("rejects an unrelated key", () => {
    // Other apps on the same origin, and this app's own non-personal caches
    // (curriculum, calendar view preference) must not trigger a remount.
    expect(isTrackedKey("some_other_app_setting", keys)).toBe(false);
  });

  it("accepts a null key, which means the whole store was cleared", () => {
    expect(isTrackedKey(null, keys)).toBe(true);
  });

  it("rejects everything when the tracked list is empty", () => {
    // PERSONAL_DATA_KEYS missing off `window` means the auth store has not
    // loaded; bumping on every key would be worse than bumping on none.
    expect(isTrackedKey("exams_list_v2", [])).toBe(false);
  });
});
