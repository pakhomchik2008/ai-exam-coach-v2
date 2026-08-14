import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteAccount } from "./delete-account";

describe("deleteAccount", () => {
  const apiHeaders = vi.fn();
  const getSession = vi.fn();

  beforeEach(() => {
    Object.assign(window, { apiHeaders, getSession });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("refuses when there is no session token", async () => {
    apiHeaders.mockResolvedValue({ "Content-Type": "application/json" });
    getSession.mockReturnValue({ mode: "account" });
    expect(await deleteAccount()).toEqual({ error: "Sign in to delete your account." });
  });

  it("lets a demo session wipe locally without hitting the API", async () => {
    apiHeaders.mockResolvedValue({ "Content-Type": "application/json" });
    getSession.mockReturnValue({ mode: "demo" });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await deleteAccount()).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not report success when the server fails", async () => {
    apiHeaders.mockResolvedValue({
      "Content-Type": "application/json",
      Authorization: "Bearer tok",
    });
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: "Could not delete the account. Email support." }),
    })));
    expect(await deleteAccount()).toEqual({
      error: "Could not delete the account. Email support.",
    });
  });

  it("returns ok only after a 200", async () => {
    apiHeaders.mockResolvedValue({
      "Content-Type": "application/json",
      Authorization: "Bearer tok",
    });
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe("/api/delete-account");
      expect(init?.method).toBe("POST");
      return { ok: true, json: async () => ({ ok: true }) };
    }));
    expect(await deleteAccount()).toEqual({ ok: true });
  });
});
