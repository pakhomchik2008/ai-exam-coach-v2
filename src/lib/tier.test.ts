import { describe, expect, it, vi, afterEach } from "vitest";
import { modelForTier, resolveUserTier } from "../../api/_tier.js";

describe("modelForTier", () => {
  it("routes ultra to Sonnet 5", () => {
    expect(modelForTier("ultra")).toBe("claude-sonnet-5");
  });

  it("routes everything else to Haiku, unconditionally (Decision #113)", () => {
    for (const tier of ["free", "sprint", "pro", undefined, null, "bogus"]) {
      expect(modelForTier(tier)).toBe("claude-haiku-4-5-20251001");
    }
  });
});

describe("resolveUserTier", () => {
  const headers = { apikey: "k", Authorization: "Bearer k" };
  const user = { id: "11111111-1111-1111-1111-111111111111" };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the row's tier when Supabase answers with one", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ tier: "ultra" }],
    }));
    expect(await resolveUserTier(user, headers)).toBe("ultra");
  });

  it("degrades to free when the table is missing (non-ok response)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect(await resolveUserTier(user, headers)).toBe("free");
  });

  it("degrades to free when there is no subscription row", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    expect(await resolveUserTier(user, headers)).toBe("free");
  });

  it("degrades to free on a network error, never throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    await expect(resolveUserTier(user, headers)).resolves.toBe("free");
  });

  it("degrades to free without service headers (no service role key)", async () => {
    expect(await resolveUserTier(user, null)).toBe("free");
  });

  it("rejects an unknown tier value from a corrupt row", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ tier: "legacy_max" }],
    }));
    expect(await resolveUserTier(user, headers)).toBe("free");
  });
});
