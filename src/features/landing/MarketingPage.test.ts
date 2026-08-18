/**
 * Public page: Free / Pro / Ultra, monthly/yearly toggle (Decision #118,
 * reverses #112 at Hlib's request — see docs/phase-5-billing-tiers-plan.md).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MarketingPage pricing", () => {
  const src = readFileSync("src/features/landing/MarketingPage.jsx", "utf8");

  it("renders Free, Pro, and Ultra plans with a monthly/yearly toggle", () => {
    expect(src).toMatch(/land_price_free_name/);
    expect(src).toMatch(/land_price_pro_name/);
    expect(src).toMatch(/land_price_ultra_name/);
    expect(src).toMatch(/land_price_bill_month/);
    expect(src).toMatch(/land_price_bill_year/);
    expect(src).toMatch(/setYearly/);
  });

  it("every CTA routes through onSignup — no direct unauthenticated Checkout call", () => {
    const ctaBlock = src.slice(src.indexOf('id="pricing"'), src.indexOf("</section>", src.indexOf('id="pricing"')));
    expect(ctaBlock).not.toMatch(/startCheckout|stripe-checkout/);
    const ctaCount = (ctaBlock.match(/onClick=\{tap\(onSignup\)\}/g) || []).length;
    expect(ctaCount).toBe(3);
  });

  it("does not leave a dead waitlist marker from the pre-Ultra design", () => {
    expect(src).not.toMatch(/MAX_WAITLIST|land_price_max_/);
  });
});
