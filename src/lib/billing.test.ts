import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import {
  encodeStripeForm,
  isProStatus,
  trialEmailDue,
  unixToIso,
  utcDateKey,
  verifyStripeSignature,
} from "../../api/_stripe.js";
import { consumeBillingQuery, isProStatus as clientIsProStatus, refreshProStatus } from "./billing";

describe("isProStatus", () => {
  it("treats trial, active, and past_due as Pro", () => {
    expect(isProStatus("trialing")).toBe(true);
    expect(isProStatus("active")).toBe(true);
    expect(isProStatus("past_due")).toBe(true);
  });

  it("rejects canceled and incomplete", () => {
    expect(isProStatus("canceled")).toBe(false);
    expect(isProStatus("incomplete")).toBe(false);
    expect(isProStatus("unpaid")).toBe(false);
    expect(isProStatus(undefined)).toBe(false);
  });

  it("matches the browser copy in billing.ts", () => {
    for (const status of ["trialing", "active", "past_due", "canceled", "unpaid", undefined]) {
      expect(clientIsProStatus(status)).toBe(isProStatus(status));
    }
  });
});

describe("trialEmailDue", () => {
  it("is true on the UTC day before trial_end", () => {
    const now = new Date("2026-08-16T16:00:00.000Z");
    expect(trialEmailDue("2026-08-17T15:00:00.000Z", now)).toBe(true);
  });

  it("is false on the day of trial_end and two days before", () => {
    const now = new Date("2026-08-17T16:00:00.000Z");
    expect(trialEmailDue("2026-08-17T15:00:00.000Z", now)).toBe(false);
    expect(trialEmailDue("2026-08-19T15:00:00.000Z", now)).toBe(false);
  });
});

describe("unixToIso / utcDateKey", () => {
  it("converts a Stripe unix timestamp", () => {
    expect(unixToIso(0)).toBe("1970-01-01T00:00:00.000Z");
    expect(unixToIso(null)).toBe(null);
    expect(utcDateKey(new Date("2026-08-14T16:00:00.000Z"))).toBe("2026-08-14");
  });
});

describe("encodeStripeForm", () => {
  it("encodes nested Stripe field names", () => {
    expect(encodeStripeForm({
      mode: "subscription",
      "line_items[0][price]": "price_1",
      empty: "",
      skip: null,
    })).toBe("mode=subscription&line_items%5B0%5D%5Bprice%5D=price_1");
  });
});

describe("verifyStripeSignature", () => {
  const secret = "whsec_test";
  const payload = '{"id":"evt_1"}';

  it("accepts a fresh matching v1 signature", () => {
    const t = 1_700_000_000;
    const sig = crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
    expect(verifyStripeSignature(payload, `t=${t},v1=${sig}`, secret, t)).toBe(true);
  });

  it("rejects a wrong signature and a stale timestamp", () => {
    const t = 1_700_000_000;
    const sig = crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
    expect(verifyStripeSignature(payload, `t=${t},v1=deadbeef`, secret, t)).toBe(false);
    expect(verifyStripeSignature(payload, `t=${t - 400},v1=${sig}`, secret, t)).toBe(false);
  });
});

describe("refreshProStatus", () => {
  const w = window as unknown as {
    getSession?: () => { id: string };
    getProfile?: () => { pro?: boolean; tier?: string };
    saveProfile?: (patch: { pro?: boolean; tier?: string }) => void;
    _supabase?: unknown;
  };

  afterEach(() => {
    delete w.getSession;
    delete w.getProfile;
    delete w.saveProfile;
    delete w._supabase;
  });

  it("caches tier alongside pro when the row has both (Phase 5 slice D)", async () => {
    w.getSession = () => ({ id: "u1" });
    w.getProfile = () => ({ pro: false, tier: "free" });
    const saved: unknown[] = [];
    w.saveProfile = (patch) => saved.push(patch);
    w._supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { status: "active", tier: "ultra" }, error: null }),
          }),
        }),
      }),
    };
    const pro = await refreshProStatus();
    expect(pro).toBe(true);
    expect(saved).toEqual([{ pro: true, tier: "ultra" }]);
  });

  it("falls back to free for an unrecognized tier value, never crashes", async () => {
    w.getSession = () => ({ id: "u1" });
    w.getProfile = () => ({ pro: false, tier: "free" });
    const saved: unknown[] = [];
    w.saveProfile = (patch) => saved.push(patch);
    w._supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { status: "active", tier: "legacy_max" }, error: null }),
          }),
        }),
      }),
    };
    await refreshProStatus();
    expect(saved).toEqual([{ pro: true, tier: "free" }]);
  });

  it("does not write when nothing changed", async () => {
    w.getSession = () => ({ id: "u1" });
    w.getProfile = () => ({ pro: true, tier: "ultra" });
    const saved: unknown[] = [];
    w.saveProfile = (patch) => saved.push(patch);
    w._supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { status: "active", tier: "ultra" }, error: null }),
          }),
        }),
      }),
    };
    await refreshProStatus();
    expect(saved).toEqual([]);
  });
});

describe("consumeBillingQuery", () => {
  const original = window.location.href;

  beforeEach(() => {
    window.history.replaceState({}, "", "/?billing=success&tab=learn");
  });
  afterEach(() => {
    window.history.replaceState({}, "", original);
  });

  it("strips billing and returns the flag", () => {
    const spy = vi.spyOn(window.history, "replaceState");
    expect(consumeBillingQuery()).toBe("success");
    expect(spy).toHaveBeenCalled();
    const next = String(spy.mock.calls[0]?.[2] ?? "");
    expect(next).toContain("tab=learn");
    expect(next).not.toContain("billing=");
    spy.mockRestore();
  });
});
