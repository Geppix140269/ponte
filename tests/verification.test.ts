import { describe, it, expect, beforeEach } from "vitest";
import { MockVerificationProvider } from "@/lib/verification/mock-provider";
import { composeVerification, cacheKey } from "@/lib/verification/compose";
import { getVerificationProvider, __resetVerificationProvider } from "@/lib/verification";
import type {
  SanctionsResult, RegistryResult, TradeActivityResult, CounterpartyQuery,
} from "@/lib/verification/types";

const mock = new MockVerificationProvider();

describe("MockVerificationProvider — pinned outcomes", () => {
  it("returns a full MATCH for the pinned 'match' company", async () => {
    const r = await mock.verifyCounterparty({
      companyName: "Rotterdam Commodity Partners BV",
      country: "Netherlands", hsCode: "0901.11", claimedRole: "broker",
    });
    expect(r.status).toBe("match");
    expect(r.signals.sanctions_clear).toBe(true);
    expect(r.signals.company_registered).toBe(true);
    expect(r.signals.trade_activity_exists).toBe(true);
    expect(r.confidenceScore).toBeGreaterThan(0.7);
  });

  it("blocks a sanctioned company regardless of other signals", async () => {
    const r = await mock.verifyCounterparty({ companyName: "Redlist Trading LLC", country: "Iran" });
    expect(r.status).toBe("no_match");
    expect(r.signals.sanctions_clear).toBe(false);
    expect(r.sanctions.matchedLists.length).toBeGreaterThan(0);
  });

  it("returns NO MATCH for an unknown ghost company", async () => {
    const r = await mock.verifyCounterparty({ companyName: "Ghost Shell Ltd" });
    expect(r.status).toBe("no_match");
    expect(r.signals.company_registered).toBe(false);
    expect(r.signals.trade_activity_exists).toBe(false);
  });

  it("is deterministic — same input, same verdict", async () => {
    const q: CounterpartyQuery = { companyName: "Acme Traders GmbH", country: "Germany" };
    const a = await mock.verifyCounterparty(q);
    const b = await mock.verifyCounterparty(q);
    expect(a).toEqual(b);
  });
});

describe("composeVerification — decision rules", () => {
  const clear: SanctionsResult = { status: "clear", confidence: 0.99, matchedLists: [] };
  const reg = (found: boolean): RegistryResult =>
    found ? { found: true, legalName: "X", confidence: "high", status: "active" } : { found: false, confidence: "none" };
  const trade = (has: boolean, hs: string[] = [], areas: string[] = []): TradeActivityResult =>
    ({ hasActivity: has, totalShipments: has ? 50 : 0, topHsCodes: hs, tradingAreas: areas, billsOfLading: has ? 40 : 0 });

  it("MATCH when registered, sanctions clear, commodity and country align", () => {
    const q: CounterpartyQuery = { companyName: "X", country: "Brazil", hsCode: "0901.11" };
    const r = composeVerification(q, clear, reg(true), trade(true, ["0901.11"], ["Brazil"]), "mock");
    expect(r.status).toBe("match");
  });

  it("PARTIAL when registered and sanctions clear but no trade match", () => {
    const q: CounterpartyQuery = { companyName: "X", country: "Brazil", hsCode: "7208.10" };
    const r = composeVerification(q, clear, reg(true), trade(true, ["0901.11"], ["Vietnam"]), "mock");
    expect(["partial_match", "manual_review"]).toContain(r.status);
  });

  it("MANUAL REVIEW on a partial sanctions match", () => {
    const partial: SanctionsResult = { status: "partial", confidence: 0.5, matchedLists: ["EU"] };
    const q: CounterpartyQuery = { companyName: "X" };
    const r = composeVerification(q, partial, reg(true), trade(true), "mock");
    expect(r.status).toBe("manual_review");
  });

  it("HS code matches at the 6-digit level ignoring formatting", () => {
    const q: CounterpartyQuery = { companyName: "X", country: "Brazil", hsCode: "090111" };
    const r = composeVerification(q, clear, reg(true), trade(true, ["0901.11.00"], ["Brazil"]), "mock");
    expect(r.signals.commodity_matches).toBe(true);
  });

  it("confidence stays within 0..1", () => {
    const q: CounterpartyQuery = { companyName: "X" };
    const r = composeVerification(q, clear, reg(true), trade(true), "mock");
    expect(r.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(r.confidenceScore).toBeLessThanOrEqual(1);
  });
});

describe("cacheKey", () => {
  it("normalizes case and whitespace so a counterparty is verified once", () => {
    expect(cacheKey("  Acme GmbH ", "Germany")).toBe(cacheKey("acme gmbh", "germany"));
  });
});

describe("getVerificationProvider — flag gating", () => {
  beforeEach(() => __resetVerificationProvider());

  it("defaults to the mock provider when ADAMFTD_LIVE is unset", () => {
    delete process.env.ADAMFTD_LIVE;
    expect(getVerificationProvider().source).toBe("mock");
  });

  it("selects the live provider only when ADAMFTD_LIVE === 'true'", () => {
    process.env.ADAMFTD_LIVE = "true";
    expect(getVerificationProvider().source).toBe("live");
    process.env.ADAMFTD_LIVE = "false";
    __resetVerificationProvider();
    expect(getVerificationProvider().source).toBe("mock");
  });
});
