import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PLANS, priceIdFor, planFromPriceId, isSubscribablePlan, SUBSCRIBABLE_PLANS } from "@/lib/plans";

const ENV = { ...process.env };
afterEach(() => { process.env = { ...ENV }; });
beforeEach(() => {
  process.env.STRIPE_PRICE_STARTER_MONTH = "price_starter_m";
  process.env.STRIPE_PRICE_PRO_MONTH = "price_pro_m";
  process.env.STRIPE_PRICE_PRO_YEAR = "price_pro_y";
});

describe("plan catalogue", () => {
  it("prices match the spec (EUR 49 / 149 / 499)", () => {
    expect(PLANS.starter.monthlyPriceCents).toBe(4900);
    expect(PLANS.pro.monthlyPriceCents).toBe(14900);
    expect(PLANS.enterprise.monthlyPriceCents).toBe(49900);
  });
  it("free is not subscribable; enterprise is sales-assisted", () => {
    expect(PLANS.free.subscribable).toBe(false);
    expect(PLANS.enterprise.contactSales).toBe(true);
  });
  it("only paid plans are subscribable", () => {
    expect(SUBSCRIBABLE_PLANS).toEqual(["starter", "pro", "enterprise"]);
    expect(isSubscribablePlan("free")).toBe(false);
    expect(isSubscribablePlan("pro")).toBe(true);
  });
});

describe("Stripe price mapping", () => {
  it("resolves a configured price id", () => {
    expect(priceIdFor("pro", "month")).toBe("price_pro_m");
    expect(priceIdFor("pro", "year")).toBe("price_pro_y");
  });
  it("throws when a price env is missing", () => {
    expect(() => priceIdFor("enterprise", "month")).toThrow();
  });
  it("reverse-maps a price id back to plan + interval", () => {
    expect(planFromPriceId("price_pro_y")).toEqual({ plan: "pro", interval: "year" });
    expect(planFromPriceId("price_unknown")).toBeNull();
  });
});
