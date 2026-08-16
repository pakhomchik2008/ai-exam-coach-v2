/**
 * Public page: one price, one sentence. Max and yearly stay off the page.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MarketingPage pricing", () => {
  it("does not render Max, yearly toggle, or a second Checkout", () => {
    const src = readFileSync("src/features/landing/MarketingPage.jsx", "utf8");
    expect(src).not.toMatch(/yearly|MAX_WAITLIST|land_price_max|land_price_bill/);
    expect(src).toMatch(/land_price_pro_month/);
    expect(src).toMatch(/land_price_sub/);
  });
});
