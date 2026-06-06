import { describe, it, expect } from "vitest";
import { PLAN_LIMITS } from "@/lib/types/network";
import { PLAN_FEATURES } from "@/lib/network/pricing-display";
import { PLANS } from "@/lib/plans";

// Locks the backend limits to the public pricing promise on the homepage so they
// cannot silently drift apart again.
describe("pricing: advertised == enforced", () => {
  it("verification allowances match the homepage", () => {
    expect(PLAN_LIMITS.free.adamftdChecksPerMonth).toBe(3);
    expect(PLAN_LIMITS.starter.adamftdChecksPerMonth).toBe(50);
    expect(PLAN_LIMITS.pro.adamftdChecksPerMonth).toBe("custom"); // unlimited
    expect(PLAN_LIMITS.enterprise.adamftdChecksPerMonth).toBe("custom");
  });
  it("free is browse + read-only (no posting, no initiating deals)", () => {
    expect(PLAN_LIMITS.free.activeListings).toBe(0);
    expect(PLAN_LIMITS.free.activeDeals).toBe(0);
  });
  it("prices match the advertised tiers", () => {
    expect(PLANS.free.monthlyPriceCents).toBe(0);
    expect(PLANS.starter.monthlyPriceCents).toBe(4900);
    expect(PLANS.pro.monthlyPriceCents).toBe(14900);
    expect(PLANS.enterprise.monthlyPriceCents).toBe(49900);
  });
  it("feature copy mentions the advertised verification counts", () => {
    expect(PLAN_FEATURES.free.join(" ")).toContain("3 verifications");
    expect(PLAN_FEATURES.starter.join(" ")).toContain("50 verifications");
    expect(PLAN_FEATURES.pro.join(" ")).toContain("Unlimited verifications");
  });
});
