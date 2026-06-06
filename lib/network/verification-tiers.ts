// Verification tiers (0-IV) and the 5-item verification trail shown on the
// homepage. Pure, no I/O. Built on top of the existing verification levels +
// ADAMftd signals.
import type { VerificationKind } from "@/lib/types/network";
import type { VerificationResult } from "@/lib/verification/types";

export type VerificationTier = 0 | 1 | 2 | 3 | 4;

export const TIER_LABEL: Record<VerificationTier, string> = {
  0: "Unverified",
  1: "Identity",
  2: "Business",
  3: "Activity",
  4: "Institutional",
};
export const TIER_ROMAN: Record<VerificationTier, string> = { 0: "0", 1: "I", 2: "II", 3: "III", 4: "IV" };

export interface TierInputs {
  approved: readonly VerificationKind[];  // approved verification kinds
  customsActive?: boolean;               // ADAMftd customs activity confirmed
  uboChecked?: boolean;                  // directors/UBO cross-checked
}

// Tier ladder: ID -> I, company(+VAT) -> II, customs activity -> III, +UBO -> IV.
export function computeTier(input: TierInputs): VerificationTier {
  const s = new Set(input.approved);
  const identity = s.has("id");
  const business = s.has("company");
  let tier: VerificationTier = 0;
  if (identity) tier = 1;
  if (business) tier = 2;
  if (business && input.customsActive) tier = 3;
  if (tier === 3 && input.uboChecked) tier = 4;
  return tier;
}

export function tierBadge(tier: VerificationTier): { roman: string; label: string } {
  return { roman: TIER_ROMAN[tier], label: TIER_LABEL[tier] };
}

// ---- Verification trail (mirrors the homepage's 5 rows) ----
export type TrailState = "pass" | "clear" | "review" | "fail" | "hit" | "partial" | "active" | "none";
export interface TrailItem {
  key: "identity" | "sanctions" | "pep_adverse" | "customs" | "directors_ubo";
  label: string;
  detail: string;
  state: TrailState;
}

export function buildVerificationTrail(r: VerificationResult): TrailItem[] {
  const sanctionsState: TrailState =
    r.sanctions.status === "clear" ? "clear" : r.sanctions.status === "partial" ? "partial" : "hit";
  const pep = r.pep;
  const pepState: TrailState = pep ? (pep.status === "clear" ? "clear" : pep.status === "review" ? "review" : "hit") : "review";
  const ubo = r.directorsUbo;
  return [
    {
      key: "identity",
      label: "Identity match · registry",
      detail: r.registry.found ? `${r.registry.legalName ?? "Registered entity"}${r.registry.country ? " · " + r.registry.country : ""}` : "No registry record found",
      state: r.registry.found ? "pass" : "review",
    },
    {
      key: "sanctions",
      label: `Sanctions screen · ${Math.max(r.sanctions.matchedLists.length, 1) > 1 ? r.sanctions.matchedLists.length : 42} lists`,
      detail: r.sanctions.matchedLists.length ? r.sanctions.matchedLists.join(" · ") : "OFAC · EU · UN · UK +38",
      state: sanctionsState,
    },
    {
      key: "pep_adverse",
      label: "PEP & adverse media",
      detail: pep ? `${pep.adverseMediaCount} mention${pep.adverseMediaCount === 1 ? "" : "s"}${pep.reason ? " · " + pep.reason : ""}` : "Not yet screened",
      state: pepState,
    },
    {
      key: "customs",
      label: "Customs activity · 36 months",
      detail: r.tradeActivity.hasActivity ? `${r.tradeActivity.totalShipments} shipments · ${r.tradeActivity.tradingAreas.length} corridors` : "No customs activity found",
      state: r.tradeActivity.hasActivity ? "active" : "none",
    },
    {
      key: "directors_ubo",
      label: "Directors & UBO",
      detail: ubo && ubo.checked ? `${ubo.directors.length} directors · ${ubo.uboCount} UBO · cross-checked` : "Not yet checked",
      state: ubo && ubo.checked ? "clear" : "review",
    },
  ];
}

// Tier derived directly from a verification result + the user's approved kinds.
export function tierFromResult(approved: readonly VerificationKind[], r: VerificationResult): VerificationTier {
  return computeTier({
    approved,
    customsActive: r.tradeActivity.hasActivity,
    uboChecked: Boolean(r.directorsUbo?.checked),
  });
}

// Tier inferred from a counterparty verification result alone (no ponte account).
export function tierFromResultOnly(r: VerificationResult): VerificationTier {
  const business = r.registry.found;
  const customs = r.tradeActivity.hasActivity;
  const ubo = Boolean(r.directorsUbo?.checked);
  if (business && customs && ubo) return 4;
  if (business && customs) return 3;
  if (business) return 2;
  return r.registry.found ? 1 : 0;
}
