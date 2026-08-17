import { describe, expect, it, afterEach } from "vitest";
import { tierFromPriceId } from "../../api/stripe-webhook.js";

describe("tierFromPriceId", () => {
  const OLD_ENV = process.env.STRIPE_PRICE_ID_ULTRA;

  afterEach(() => {
    process.env.STRIPE_PRICE_ID_ULTRA = OLD_ENV;
  });

  it("is free when the status isn't a Pro status, regardless of price", () => {
    expect(tierFromPriceId("price_anything", "canceled")).toBe("free");
    expect(tierFromPriceId(null, "incomplete")).toBe("free");
  });

  it("is pro for an active/trialing/past_due status when no Ultra price is configured", () => {
    delete process.env.STRIPE_PRICE_ID_ULTRA;
    expect(tierFromPriceId("price_whatever", "active")).toBe("pro");
    expect(tierFromPriceId(null, "trialing")).toBe("pro");
  });

  it("is ultra only when the price id matches STRIPE_PRICE_ID_ULTRA", () => {
    process.env.STRIPE_PRICE_ID_ULTRA = "price_ultra_123";
    expect(tierFromPriceId("price_ultra_123", "active")).toBe("ultra");
    expect(tierFromPriceId("price_pro_456", "active")).toBe("pro");
    expect(tierFromPriceId(null, "past_due")).toBe("pro");
  });
});
