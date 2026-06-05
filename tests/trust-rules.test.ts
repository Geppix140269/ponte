import { describe, it, expect } from "vitest";
import {
  deltaForReason, clampScore, applyDelta, riskFromScore, recomputeTrust,
} from "@/lib/network/trust-rules";

describe("deltaForReason", () => {
  it("maps spec increases and decreases", () => {
    expect(deltaForReason("company_verified")).toBe(15);
    expect(deltaForReason("email_verified")).toBe(5);
    expect(deltaForReason("completed_deal")).toBe(10);
    expect(deltaForReason("user_report")).toBe(-10);
    expect(deltaForReason("suspension")).toBe(-50);
    expect(deltaForReason("blocked")).toBe(0);
  });
});

describe("clamp + applyDelta", () => {
  it("clamps to 0..100", () => {
    expect(clampScore(150)).toBe(100);
    expect(clampScore(-5)).toBe(0);
  });
  it("applies a delta within bounds", () => {
    expect(applyDelta(40, "company_verified")).toBe(55);
    expect(applyDelta(95, "company_verified")).toBe(100); // capped
    expect(applyDelta(30, "suspension")).toBe(0);         // floored
  });
  it("blocked forces zero", () => {
    expect(applyDelta(88, "blocked")).toBe(0);
  });
});

describe("riskFromScore thresholds", () => {
  it("blocked / high / medium / low", () => {
    expect(riskFromScore(0)).toBe("blocked");
    expect(riskFromScore(39)).toBe("high");
    expect(riskFromScore(40)).toBe("medium");
    expect(riskFromScore(69)).toBe("medium");
    expect(riskFromScore(70)).toBe("low");
    expect(riskFromScore(100)).toBe("low");
  });
  it("explicit blocked flag overrides score", () => {
    expect(riskFromScore(80, true)).toBe("blocked");
  });
});

describe("recomputeTrust", () => {
  it("baseline 40 with nothing", () => {
    expect(recomputeTrust({ approvedVerifications: [], completedDeals: 0, penalties: [] })).toBe(40);
  });
  it("fully verified trader with deals", () => {
    // 40 + email5 + phone5 + company15 + id15 + 2 deals*10 = 100 (capped)
    const s = recomputeTrust({
      approvedVerifications: ["email_verified", "phone_verified", "company_verified", "id_verified"],
      completedDeals: 2, penalties: [],
    });
    expect(s).toBe(100);
  });
  it("penalties pull the score down", () => {
    const s = recomputeTrust({
      approvedVerifications: ["email_verified"], completedDeals: 0, penalties: ["user_report", "admin_warning"],
    });
    expect(s).toBe(15); // 40 + 5 - 10 - 20
  });
  it("blocked is zero regardless", () => {
    expect(recomputeTrust({ approvedVerifications: ["company_verified"], completedDeals: 5, penalties: [], blocked: true })).toBe(0);
  });
});
