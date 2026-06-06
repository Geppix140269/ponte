import { describe, it, expect } from "vitest";
import { formatPlanPrice, PLAN_FEATURES, PLAN_ORDER } from "@/lib/network/pricing-display";

describe("formatPlanPrice", () => {
  it("free reads Free", () => {
    expect(formatPlanPrice("free")).toBe("Free");
  });
  it("paid plans show the EUR monthly amount", () => {
    expect(formatPlanPrice("starter")).toContain("49");
    expect(formatPlanPrice("pro")).toContain("149");
    expect(formatPlanPrice("enterprise")).toContain("499");
    expect(formatPlanPrice("pro")).toContain("/mo");
  });
});

describe("plan features", () => {
  it("every plan has a feature list", () => {
    for (const p of PLAN_ORDER) expect(PLAN_FEATURES[p].length).toBeGreaterThan(0);
  });
  it("free is browse + read-only", () => {
    expect(PLAN_FEATURES.free.join(" ").toLowerCase()).toContain("read-only deal rooms");
  });
});
