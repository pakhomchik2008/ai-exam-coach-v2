/**
 * Auth-user wipe. Stripe cancel is best-effort; a failed Stripe call must
 * not keep the student's PII around.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./_guard.js", () => ({
  authenticate: vi.fn(),
}));

import { authenticate } from "./_guard.js";
import handler from "./delete-account.js";

function resCapture() {
  const out: { statusCode?: number; body?: unknown } = {};
  return {
    out,
    res: {
      status(code: number) {
        out.statusCode = code;
        return this;
      },
      json(body: unknown) {
        out.body = body;
        return this;
      },
    },
  };
}

describe("api/delete-account", () => {
  const user = { id: "11111111-1111-1111-1111-111111111111" };

  beforeEach(() => {
    vi.mocked(authenticate).mockResolvedValue({ user });
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    delete process.env.STRIPE_SECRET_KEY;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("503s when the service role is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { res, out } = resCapture();
    await handler({ method: "POST" }, res);
    expect(out.statusCode).toBe(503);
  });

  it("deletes the auth user even if Stripe lookup fails", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/rest/v1/subscriptions")) {
        throw new Error("network");
      }
      if (String(url).includes("/auth/v1/admin/users/")) {
        expect(init?.method).toBe("DELETE");
        expect(String(url)).toContain("shouldSoftDelete=false");
        return { ok: true, json: async () => ({}) };
      }
      throw new Error(`unexpected ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { res, out } = resCapture();
    await handler({ method: "POST" }, res);
    expect(out).toEqual({ statusCode: 200, body: { ok: true } });
  });

  it("cancels Stripe then hard-deletes auth", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/rest/v1/subscriptions")) {
        return {
          ok: true,
          json: async () => [{ stripe_subscription_id: "sub_abc" }],
        };
      }
      if (String(url).includes("api.stripe.com/v1/subscriptions/sub_abc")) {
        return { ok: true, json: async () => ({}) };
      }
      if (String(url).includes("/auth/v1/admin/users/")) {
        return { ok: true, json: async () => ({}) };
      }
      throw new Error(`unexpected ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { res, out } = resCapture();
    await handler({ method: "POST" }, res);
    expect(out.statusCode).toBe(200);
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes("api.stripe.com"))).toBe(true);
    expect(urls.some((u) => u.includes("/auth/v1/admin/users/"))).toBe(true);
  });

  it("does not pretend success when GoTrue rejects the delete", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    const { res, out } = resCapture();
    await handler({ method: "POST" }, res);
    expect(out.statusCode).toBe(500);
    expect(out.body).toEqual({ error: "Could not delete the account. Email support." });
  });
});
