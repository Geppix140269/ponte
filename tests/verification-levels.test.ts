import { describe, it, expect } from "vitest";
import {
  computeVerificationLevel, isVerifiedTrader, verificationTrustTotal,
} from "@/lib/network/verification-levels";
import type { VerificationKind } from "@/lib/types/network";

const vk = (...kinds: VerificationKind[]) => kinds;

describe("computeVerificationLevel ladder", () => {
  it("unverified with nothing approved", () => {
    expect(computeVerificationLevel([])).toBe("unverified");
  });
  it("email only", () => {
    expect(computeVerificationLevel(vk("email"))).toBe("email_verified");
  });
  it("phone climbs above email", () => {
    expect(computeVerificationLevel(vk("email", "phone"))).toBe("phone_verified");
  });
  it("company beats phone", () => {
    expect(computeVerificationLevel(vk("email", "phone", "company"))).toBe("company_verified");
  });
  it("fully requires email+phone+company+id", () => {
    expect(computeVerificationLevel(vk("email", "phone", "company", "id"))).toBe("fully_verified");
    expect(computeVerificationLevel(vk("company", "id"))).toBe("company_verified"); // missing email/phone
  });
});

describe("isVerifiedTrader", () => {
  it("any principal (buyer/seller/trader) at company_verified+ qualifies", () => {
    expect(isVerifiedTrader("company_verified", "trader")).toBe(true);
    expect(isVerifiedTrader("fully_verified", "seller")).toBe(true);
    expect(isVerifiedTrader("company_verified", "buyer")).toBe(true);
    expect(isVerifiedTrader("phone_verified", "trader")).toBe(false);
    expect(isVerifiedTrader("company_verified", "enterprise")).toBe(false);
  });
});

describe("verificationTrustTotal", () => {
  it("sums the spec deltas without double counting", () => {
    expect(verificationTrustTotal(vk("email", "phone"))).toBe(10);
    expect(verificationTrustTotal(vk("company", "id", "trade_reference"))).toBe(40);
    expect(verificationTrustTotal(vk("email", "email"))).toBe(5);
  });
});
