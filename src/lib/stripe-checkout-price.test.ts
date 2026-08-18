import { describe, expect, it } from "vitest";
import { priceEnvVar } from "../../api/stripe-checkout.js";

describe("priceEnvVar", () => {
  it("maps pro/monthly to the existing STRIPE_PRICE_ID", () => {
    expect(priceEnvVar("pro", "monthly")).toBe("STRIPE_PRICE_ID");
  });

  it("maps pro/yearly to STRIPE_PRICE_ID_YEARLY", () => {
    expect(priceEnvVar("pro", "yearly")).toBe("STRIPE_PRICE_ID_YEARLY");
  });

  it("maps ultra/monthly to STRIPE_PRICE_ID_ULTRA", () => {
    expect(priceEnvVar("ultra", "monthly")).toBe("STRIPE_PRICE_ID_ULTRA");
  });

  it("maps ultra/yearly to STRIPE_PRICE_ID_ULTRA_YEARLY", () => {
    expect(priceEnvVar("ultra", "yearly")).toBe("STRIPE_PRICE_ID_ULTRA_YEARLY");
  });

  it("defaults an unrecognized tier to pro", () => {
    expect(priceEnvVar("bogus", "monthly")).toBe("STRIPE_PRICE_ID");
  });
});
