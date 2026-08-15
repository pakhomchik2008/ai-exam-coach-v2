/**
 * Regression test for audit finding #29: logging out used to leave every
 * personal localStorage key in place. On a shared device (school computer,
 * family laptop) the next person to open the app saw the previous student's
 * exams, mistake journal, and AI chat context.
 *
 * Two distinct bugs, both covered here:
 *  1. `clearSession()` itself only removed the auth session key, nothing else.
 *  2. The header "Log out" button (AppNav, wired in src/app/App.tsx) called
 *     `setRoute("landing")` directly and never called `clearSession()` at all —
 *     a worse version of the same bug, on the more commonly used button.
 *     Covered by inspecting the wiring below rather than mounting App, since
 *     App pulls in the full legacy tree; the click-through behavior was
 *     additionally verified manually against the dev server.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import "../bootstrap";

type Api = {
  clearSession: () => void;
};

const api = window as unknown as Api;

const PERSONAL_KEYS = [
  "exams_list_v2",
  "courses_v1",
  "study_schedule_v1",
  "user_profile_v1",
  "mistakes_v1",
  "mistake_review_log_v1",
  "active_session_v1",
  "brain_mastery_v1",
  "brain_kb_v1",
  "brain_memory_v1",
  "brain_xp_v1",
  "brain_difficulty_v1",
  "brain_lessoncache_v1",
  "study_result_v1",
  "aicoach_chat_msgs_v2",
  "aicoach_chat_hist_v2",
];

// Shared, non-personal caches that must survive a logout — they are identical
// for every visitor and expensive to refetch.
const SHARED_KEYS = ["curriculum_cache_v1", "curriculum_remote_v1", "qualifications_remote_v1"];

function seedAllKeys(): void {
  for (const key of [...PERSONAL_KEYS, ...SHARED_KEYS, "auth_session_v1"]) {
    localStorage.setItem(key, JSON.stringify({ seeded: true }));
  }
}

describe("clearSession — audit #29", () => {
  beforeEach(() => {
    seedAllKeys();
  });

  it("removes every personal data key", () => {
    api.clearSession();
    for (const key of PERSONAL_KEYS) {
      expect(localStorage.getItem(key), key).toBeNull();
    }
  });

  it("removes the auth session key", () => {
    api.clearSession();
    expect(localStorage.getItem("auth_session_v1")).toBeNull();
  });

  it("keeps the shared, non-personal catalog caches", () => {
    api.clearSession();
    for (const key of SHARED_KEYS) {
      expect(localStorage.getItem(key), key).not.toBeNull();
    }
  });
});

describe("AppNav header logout is wired to clearSession (audit #29, worse variant)", () => {
  // The header button used to call ONLY setRoute("landing"), bypassing
  // clearSession() entirely — the more commonly used logout path left MORE
  // data behind than the (already broken) Settings screen button. Since
  // mounting <App> pulls in the entire legacy tree, this pins the fix at the
  // source level: App.tsx must reference clearSession in its AppNav onLogout
  // handler, not just call setRoute.
  it("App.tsx's AppNav onLogout calls clearSession before changing route", () => {
    const src = readFileSync("src/app/App.tsx", "utf8");
    const appNavStart = src.indexOf("<AppNav");
    const appNavBlock = src.slice(appNavStart, src.indexOf("/>", appNavStart));
    expect(appNavBlock).toMatch(/onLogout=\{[^]*?clearSession\(\)[^]*?setRoute\("landing"\)/);
  });
});

describe("updateAccount", () => {
  const api = window as unknown as {
    updateAccount: (patch: { name?: string; email?: string; password?: string }) => Promise<{ emailPending: boolean; localOnly: boolean }>;
    setSession: (s: unknown) => unknown;
    clearSession: () => void;
    _supabase: { auth: { updateUser: (patch: unknown) => Promise<{ data: { user: unknown }; error: unknown }> } };
  };

  afterEach(() => {
    api.clearSession();
  });

  it("rejects a short password without calling Supabase", async () => {
    api.setSession({ id: "u1", email: "a@b.c", name: "Hlib", mode: "account" });
    const orig = api._supabase.auth.updateUser;
    let called = false;
    api._supabase.auth.updateUser = async () => {
      called = true;
      return { data: { user: null }, error: null };
    };
    try {
      await expect(api.updateAccount({ password: "short" })).rejects.toMatchObject({ code: "PASSWORD_SHORT" });
      expect(called).toBe(false);
    } finally {
      api._supabase.auth.updateUser = orig;
    }
  });

  it("sends password to updateUser for a real account", async () => {
    api.setSession({ id: "u1", email: "a@b.c", name: "Hlib", mode: "account" });
    const origUpdate = api._supabase.auth.updateUser;
    api._supabase.auth.updateUser = async (patch) => {
      expect(patch).toEqual({ password: "newpass12" });
      return {
        data: { user: { id: "u1", email: "a@b.c", is_anonymous: false, user_metadata: { full_name: "Hlib" } } },
        error: null,
      };
    };
    try {
      const result = await api.updateAccount({ password: "newpass12" });
      expect(result.localOnly).toBe(false);
      expect(result.emailPending).toBe(false);
    } finally {
      api._supabase.auth.updateUser = origUpdate;
    }
  });

  it("does not send a password for demo", async () => {
    api.setSession({ id: "anon", email: null, name: "Demo", mode: "demo" });
    const origUpdate = api._supabase.auth.updateUser;
    let called = false;
    api._supabase.auth.updateUser = async () => {
      called = true;
      return { data: { user: null }, error: null };
    };
    try {
      await expect(api.updateAccount({ password: "newpass12" })).rejects.toMatchObject({ code: "DEMO" });
      expect(called).toBe(false);
    } finally {
      api._supabase.auth.updateUser = origUpdate;
    }
  });
});
