import { describe, it, expect } from "vitest";
import { computeTier, buildVerificationTrail, tierFromResult, TIER_ROMAN } from "@/lib/network/verification-tiers";
import type { VerificationResult } from "@/lib/verification/types";

describe("computeTier ladder", () => {
  it("0 when nothing", () => { expect(computeTier({ approved: [] })).toBe(0); });
  it("I with ID", () => { expect(computeTier({ approved: ["id"] })).toBe(1); });
  it("II with company", () => { expect(computeTier({ approved: ["company", "id"] })).toBe(2); });
  it("III with company + customs", () => {
    expect(computeTier({ approved: ["company"], customsActive: true })).toBe(3);
  });
  it("IV with company + customs + UBO", () => {
    expect(computeTier({ approved: ["company"], customsActive: true, uboChecked: true })).toBe(4);
  });
  it("UBO without customs does not reach IV", () => {
    expect(computeTier({ approved: ["company"], uboChecked: true })).toBe(2);
  });
});

function res(over: Partial<VerificationResult> = {}): VerificationResult {
  return {
    status: "match", confidenceScore: 0.9, resultSummary: "", source: "mock",
    signals: { sanctions_clear: true, company_registered: true, trade_activity_exists: true, commodity_matches: true, country_matches: true, counterparty_plausible: true },
    sanctions: { status: "clear", confidence: 0.99, matchedLists: [] },
    registry: { found: true, legalName: "Acme", country: "NL", confidence: "high" },
    tradeActivity: { hasActivity: true, totalShipments: 412, topHsCodes: ["1701"], tradingAreas: ["NL","BR"], billsOfLading: 388 },
    pep: { status: "clear", adverseMediaCount: 0 },
    directorsUbo: { directors: ["A","B"], uboCount: 1, checked: true },
    ...over,
  };
}

describe("buildVerificationTrail", () => {
  it("returns 5 rows with sensible states for a clean match", () => {
    const t = buildVerificationTrail(res());
    expect(t.map((x) => x.key)).toEqual(["identity","sanctions","pep_adverse","customs","directors_ubo"]);
    expect(t.find((x) => x.key === "sanctions")!.state).toBe("clear");
    expect(t.find((x) => x.key === "customs")!.state).toBe("active");
    expect(t.find((x) => x.key === "directors_ubo")!.state).toBe("clear");
  });
  it("reflects a sanctions hit", () => {
    const t = buildVerificationTrail(res({ sanctions: { status: "hit", confidence: 0.97, matchedLists: ["OFAC","EU"] } }));
    expect(t.find((x) => x.key === "sanctions")!.state).toBe("hit");
  });
  it("tierFromResult uses customs + UBO", () => {
    expect(tierFromResult(["company","id"], res())).toBe(4);
    expect(TIER_ROMAN[4]).toBe("IV");
  });
});
