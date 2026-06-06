import { describe, it, expect } from "vitest";
import {
  isAdmin, effectivePlan, canCreateListing, canCreateListingType, canOpenDeal,
  canUploadDocuments, canExchangeContact, canRunAdamftdCheck, isUpgradeTarget,
  type Principal,
} from "@/lib/rbac";

const make = (over: Partial<Principal> = {}): Principal => ({
  id: "u1", role: "customer", account_type: "trader", plan: "free", plan_status: "inactive", ...over,
});

describe("effectivePlan", () => {
  it("keeps free as free", () => {
    expect(effectivePlan(make({ plan: "free" }))).toBe("free");
  });
  it("honors a paid plan only when the subscription is live", () => {
    expect(effectivePlan(make({ plan: "pro", plan_status: "active" }))).toBe("pro");
    expect(effectivePlan(make({ plan: "pro", plan_status: "past_due" }))).toBe("free");
    expect(effectivePlan(make({ plan: "pro", plan_status: "canceled" }))).toBe("free");
  });
});

describe("listing limits", () => {
  it("free cannot post (browse + read-only)", () => {
    const p = make({ plan: "free" });
    expect(canCreateListing(p, 0).allowed).toBe(false);
    expect(canCreateListing(p, 0).remaining).toBe(0);
  });
  it("starter allows 10", () => {
    const p = make({ plan: "starter", plan_status: "active" });
    expect(canCreateListing(p, 9).allowed).toBe(true);
    expect(canCreateListing(p, 10).allowed).toBe(false);
  });
  it("pro is unlimited", () => {
    const p = make({ plan: "pro", plan_status: "active" });
    const d = canCreateListing(p, 9999);
    expect(d.allowed).toBe(true);
    expect(d.limit).toBe("unlimited");
  });
  it("admin bypasses all limits", () => {
    expect(canCreateListing(make({ role: "admin" }), 9999).allowed).toBe(true);
  });
  it("a lapsed pro is throttled back to free limits", () => {
    const p = make({ plan: "pro", plan_status: "canceled" });
    expect(canCreateListing(p, 2).allowed).toBe(false);
  });
});

describe("listing type by account", () => {
  it("buyers post requests, not offers", () => {
    const p = make({ account_type: "buyer" });
    expect(canCreateListingType(p, "request")).toBe(true);
    expect(canCreateListingType(p, "offer")).toBe(false);
  });
  it("sellers post offers, not requests", () => {
    const p = make({ account_type: "seller" });
    expect(canCreateListingType(p, "offer")).toBe(true);
    expect(canCreateListingType(p, "request")).toBe(false);
  });
  it("traders post both", () => {
    const p = make({ account_type: "trader" });
    expect(canCreateListingType(p, "offer")).toBe(true);
    expect(canCreateListingType(p, "request")).toBe(true);
  });
});

describe("deals, documents, contact", () => {
  it("free cannot initiate deals (read-only rooms)", () => {
    expect(canOpenDeal(make({ plan: "free" }), 0).allowed).toBe(false);
  });
  it("document uploads gated to paid plans", () => {
    expect(canUploadDocuments(make({ plan: "free" }))).toBe(false);
    expect(canUploadDocuments(make({ plan: "starter", plan_status: "active" }))).toBe(true);
  });
  it("free users can never exchange contact details", () => {
    expect(canExchangeContact(make({ plan: "free" }))).toBe(false);
    expect(canExchangeContact(make({ plan: "starter", plan_status: "active" }))).toBe(true);
  });
});

describe("ADAMftd monthly limits", () => {
  it("free gets 3 per month", () => {
    const p = make({ plan: "free" });
    expect(canRunAdamftdCheck(p, 2).allowed).toBe(true);
    expect(canRunAdamftdCheck(p, 3).allowed).toBe(false);
  });
  it("starter gets 50 per month", () => {
    const p = make({ plan: "starter", plan_status: "active" });
    expect(canRunAdamftdCheck(p, 49).allowed).toBe(true);
    expect(canRunAdamftdCheck(p, 50).allowed).toBe(false);
  });
  it("pro is unlimited", () => {
    const p = make({ plan: "pro", plan_status: "active" });
    expect(canRunAdamftdCheck(p, 99999).allowed).toBe(true);
  });
  it("enterprise is uncapped (custom)", () => {
    const p = make({ plan: "enterprise", plan_status: "active" });
    expect(canRunAdamftdCheck(p, 99999).allowed).toBe(true);
  });
});

describe("upgrade ordering", () => {
  it("ranks plans free < starter < pro < enterprise", () => {
    expect(isUpgradeTarget("free", "pro")).toBe(true);
    expect(isUpgradeTarget("pro", "starter")).toBe(false);
    expect(isAdmin(make({ role: "admin" }))).toBe(true);
  });
});
