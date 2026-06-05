// Pure verification-level ladder and trust contributions. No I/O.
// The level is derived from the set of APPROVED verification kinds.

import type { VerificationKind, VerificationLevel, AccountType } from "@/lib/types/network";

// Trust score deltas per approved verification (spec). Used by the Phase 4 engine.
export const VERIFICATION_TRUST_DELTA: Record<VerificationKind, number> = {
  email: 5,
  phone: 5,
  company: 15,
  id: 15,
  trade_reference: 10,
};

// Ladder: unverified -> email -> phone -> company -> fully.
// fully_verified requires email + phone + company + id all approved.
export function computeVerificationLevel(approved: Iterable<VerificationKind>): VerificationLevel {
  const s = new Set(approved);
  if (s.has("email") && s.has("phone") && s.has("company") && s.has("id")) return "fully_verified";
  if (s.has("company")) return "company_verified";
  if (s.has("phone")) return "phone_verified";
  if (s.has("email")) return "email_verified";
  return "unverified";
}

// Any principal account (buyer, seller, or trader) earns the Verified Trader
// badge at company_verified or above.
export function isVerifiedTrader(level: VerificationLevel, accountType: AccountType | null): boolean {
  const principal = accountType === "buyer" || accountType === "seller" || accountType === "trader";
  return principal && (level === "company_verified" || level === "fully_verified");
}

// Role-aware label for the Verified badge.
export function verifiedTraderLabel(accountType: AccountType | null): string {
  if (accountType === "seller") return "Verified Seller";
  if (accountType === "buyer") return "Verified Buyer";
  if (accountType === "trader") return "Verified Trader";
  return "Verified";
}

// Total trust contribution from a set of approved verifications.
export function verificationTrustTotal(approved: Iterable<VerificationKind>): number {
  const seen: Partial<Record<VerificationKind, true>> = {};
  let total = 0;
  for (const k of Array.from(approved)) {
    if (seen[k]) continue;
    seen[k] = true;
    total += VERIFICATION_TRUST_DELTA[k] ?? 0;
  }
  return total;
}
