// Types for the ADAMftd verification layer.
// Shaped to the three ADAMftd capabilities ponte relies on:
//   1. Sanctions Screening  (clear / partial / hit + confidence)
//   2. Company Lookup        (registry existence + confidence)
//   3. Trade Companies        (real customs activity profile)
//
// These shapes are our internal contract. When the real ADAMftd API docs
// arrive, only the live adapter changes; everything downstream stays the same.

export type ClaimedRole = "buyer" | "seller" | "trader";

// ---- Sanctions ----
export type SanctionsStatus = "clear" | "partial" | "hit";

export interface SanctionsResult {
  status: SanctionsStatus;
  confidence: number;          // 0..1
  matchedLists: string[];      // e.g. ["OFAC"], empty when clear
  reason?: string;
}

// ---- Registry ----
export type RegistryConfidence = "very_high" | "high" | "medium" | "none";

export interface RegistryResult {
  found: boolean;
  legalName?: string;
  registrationId?: string;
  status?: string;             // e.g. "active"
  country?: string;
  confidence: RegistryConfidence;
}

// ---- Trade activity ----
export interface TradeActivityResult {
  hasActivity: boolean;
  totalShipments: number;
  topHsCodes: string[];
  tradingAreas: string[];      // countries seen in customs records
  billsOfLading: number;
}

// ---- PEP & adverse media ----
export type PepStatus = "clear" | "review" | "hit";
export interface PepResult {
  status: PepStatus;
  adverseMediaCount: number;
  reason?: string;
}

// ---- Directors & UBO ----
export interface DirectorsUboResult {
  directors: string[];
  uboCount: number;
  checked: boolean;
}

// ---- Composed result (mirrors adamftd_verification_checks.status/signals) ----
export type VerificationStatus = "match" | "partial_match" | "no_match" | "manual_review";

export interface VerificationSignals {
  sanctions_clear: boolean;
  company_registered: boolean;
  trade_activity_exists: boolean;
  commodity_matches: boolean;
  country_matches: boolean;
  counterparty_plausible: boolean;
}

export interface CounterpartyQuery {
  companyName: string;
  country?: string;
  commodity?: string;
  hsCode?: string;
  claimedRole?: ClaimedRole;
}

export interface VerificationResult {
  status: VerificationStatus;
  confidenceScore: number;     // 0..1
  resultSummary: string;
  signals: VerificationSignals;
  source: "mock" | "live";
  // raw sub-results, useful for the admin detail view
  sanctions: SanctionsResult;
  registry: RegistryResult;
  tradeActivity: TradeActivityResult;
  pep?: PepResult;
  directorsUbo?: DirectorsUboResult;
}

// The provider contract. Real and mock both implement this.
export interface VerificationProvider {
  readonly source: "mock" | "live";
  screenSanctions(name: string, country?: string): Promise<SanctionsResult>;
  lookupRegistry(name: string, country?: string): Promise<RegistryResult>;
  getTradeActivity(name: string, country?: string): Promise<TradeActivityResult>;
  // PEP / adverse media + directors / UBO (mock until ADAMftd endpoints confirmed)
  screenPep?(name: string, country?: string): Promise<PepResult>;
  getDirectorsUbo?(name: string, country?: string): Promise<DirectorsUboResult>;
  // convenience: runs the right calls and composes them
  verifyCounterparty(query: CounterpartyQuery): Promise<VerificationResult>;
}
