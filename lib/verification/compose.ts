// Pure composition logic: turn the three ADAMftd sub-results into a single
// verification verdict. No I/O, no side effects — fully unit-testable.

import type {
  SanctionsResult,
  RegistryResult,
  TradeActivityResult,
  VerificationResult,
  VerificationSignals,
  VerificationStatus,
  CounterpartyQuery,
} from "./types";

function commodityMatches(query: CounterpartyQuery, trade: TradeActivityResult): boolean {
  if (!query.hsCode && !query.commodity) return trade.hasActivity;
  if (query.hsCode) {
    const want = query.hsCode.replace(/\D/g, "").slice(0, 6);
    return trade.topHsCodes.some((c) => c.replace(/\D/g, "").slice(0, 6) === want);
  }
  return trade.hasActivity;
}

function countryMatches(query: CounterpartyQuery, trade: TradeActivityResult): boolean {
  if (!query.country) return true;
  const want = query.country.trim().toLowerCase();
  return trade.tradingAreas.some((c) => c.trim().toLowerCase() === want);
}

export function composeVerification(
  query: CounterpartyQuery,
  sanctions: SanctionsResult,
  registry: RegistryResult,
  tradeActivity: TradeActivityResult,
  source: "mock" | "live",
): VerificationResult {
  const signals: VerificationSignals = {
    sanctions_clear: sanctions.status === "clear",
    company_registered: registry.found,
    trade_activity_exists: tradeActivity.hasActivity,
    commodity_matches: commodityMatches(query, tradeActivity),
    country_matches: countryMatches(query, tradeActivity),
    counterparty_plausible: false,
  };
  signals.counterparty_plausible =
    signals.company_registered && signals.trade_activity_exists && signals.sanctions_clear;

  let status: VerificationStatus;
  let summary: string;

  if (sanctions.status === "hit") {
    status = "no_match";
    summary = `Sanctions hit on ${sanctions.matchedLists.join(", ") || "a watchlist"}. Do not proceed without compliance review.`;
  } else if (sanctions.status === "partial") {
    status = "manual_review";
    summary = "Possible sanctions match requires manual compliance review before proceeding.";
  } else if (!signals.company_registered && !signals.trade_activity_exists) {
    status = "no_match";
    summary = "No registry record and no matching trade activity found for this counterparty.";
  } else {
    const positives = [
      signals.company_registered,
      signals.trade_activity_exists,
      signals.commodity_matches,
      signals.country_matches,
    ].filter(Boolean).length;

    if (positives >= 4) {
      status = "match";
      summary = "Company is registered, sanctions-clear, and customs records confirm matching trade activity.";
    } else if (positives >= 2) {
      status = "partial_match";
      summary = "Some signals confirmed; others could not be matched. Review before relying on this counterparty.";
    } else {
      status = "manual_review";
      summary = "Mixed signals. A reviewer should confirm before this counterparty is trusted.";
    }
  }

  const registryWeight =
    registry.confidence === "very_high" ? 1 :
    registry.confidence === "high" ? 0.8 :
    registry.confidence === "medium" ? 0.55 : 0.2;
  const signalCount = Object.values(signals).filter(Boolean).length;
  const confidenceScore = Number(
    Math.max(0, Math.min(1,
      0.4 * registryWeight + 0.3 * sanctions.confidence + 0.3 * (signalCount / 6),
    )).toFixed(2),
  );

  return {
    status,
    confidenceScore,
    resultSummary: summary,
    signals,
    source,
    sanctions,
    registry,
    tradeActivity,
  };
}

// Cache key shared across all users so a counterparty is verified once.
export function cacheKey(companyName: string, country?: string): string {
  const c = (country ?? "").trim().toLowerCase();
  return companyName.trim().toLowerCase() + "|" + c;
}
