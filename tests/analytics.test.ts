import { describe, it, expect } from "vitest";
import {
  bucketTrustScores, verificationRate, planDistribution, planMrrCents, growthByMonth, riskTally,
} from "@/lib/network/analytics";

describe("bucketTrustScores", () => {
  it("buckets by risk band", () => {
    expect(bucketTrustScores([0, 20, 40, 69, 70, 100])).toEqual({ blocked: 1, high: 1, medium: 2, low: 2 });
  });
});

describe("verificationRate", () => {
  it("share at company_verified or above", () => {
    expect(verificationRate(["unverified", "email_verified", "company_verified", "fully_verified"])).toBe(0.5);
    expect(verificationRate([])).toBe(0);
  });
});

describe("planDistribution", () => {
  it("counts per plan", () => {
    expect(planDistribution(["free", "free", "pro", "starter"])).toEqual({ free: 2, starter: 1, pro: 1, enterprise: 0 });
  });
});

describe("planMrrCents", () => {
  it("sums active paid subs at plan prices (EUR 49/149/499)", () => {
    // 2 starter (4900) + 1 pro (14900) + 1 enterprise (49900) = 9800 + 14900 + 49900
    expect(planMrrCents({ starter: 2, pro: 1, enterprise: 1 })).toBe(9800 + 14900 + 49900);
    expect(planMrrCents({})).toBe(0);
  });
});

describe("growthByMonth", () => {
  it("groups and sorts by month", () => {
    const out = growthByMonth(["2026-01-05T00:00:00Z", "2026-01-20T00:00:00Z", "2026-03-01T00:00:00Z"]);
    expect(out).toEqual([{ month: "2026-01", count: 2 }, { month: "2026-03", count: 1 }]);
  });
});

describe("riskTally", () => {
  it("tallies categories", () => {
    expect(riskTally(["low", "low", "high", "blocked"])).toEqual({ low: 2, medium: 0, high: 1, blocked: 1 });
  });
});
