// Deterministic mock verification provider.
// Used in development and tests so we never call the live ADAMftd API (no credit
// burn). Output is shaped exactly like the real provider will return, so the
// rest of the app is built against the final contract.
//
// Determinism: results are derived from a hash of the company name, so the same
// company always returns the same verdict. A few well-known demo names are
// pinned to specific outcomes for predictable demos and tests.

import type {
  PepResult,
  DirectorsUboResult,
  VerificationProvider,
  SanctionsResult,
  RegistryResult,
  TradeActivityResult,
  VerificationResult,
  CounterpartyQuery,
  RegistryConfidence,
} from "./types";
import { composeVerification } from "./compose";

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// Pinned demo outcomes for predictable scripted demos and tests.
const PINNED: Record<string, "match" | "partial" | "sanctioned" | "unknown"> = {
  "rotterdam commodity partners bv": "match",
  "abidjan cocoa exporters sa": "partial",
  "redlist trading llc": "sanctioned",
  "ghost shell ltd": "unknown",
};

export class MockVerificationProvider implements VerificationProvider {
  readonly source = "mock" as const;

  private pin(name: string) {
    return PINNED[name.trim().toLowerCase()];
  }

  async screenSanctions(name: string, _country?: string): Promise<SanctionsResult> {
    const pin = this.pin(name);
    if (pin === "sanctioned")
      return { status: "hit", confidence: 0.97, matchedLists: ["OFAC", "EU"], reason: "Exact name match on consolidated list." };
    const h = hash("sanc:" + name) % 100;
    if (!pin && h < 4)
      return { status: "partial", confidence: 0.55, matchedLists: ["EU"], reason: "Partial name match, requires review." };
    return { status: "clear", confidence: 0.99, matchedLists: [] };
  }

  async lookupRegistry(name: string, country?: string): Promise<RegistryResult> {
    const pin = this.pin(name);
    if (pin === "unknown")
      return { found: false, confidence: "none" };
    const confidences: RegistryConfidence[] = ["very_high", "high", "medium"];
    const conf = confidences[hash("reg:" + name) % confidences.length];
    return {
      found: true,
      legalName: name,
      registrationId: "REG-" + (hash(name) % 1_000_000).toString().padStart(6, "0"),
      status: "active",
      country,
      confidence: pin === "match" ? "very_high" : conf,
    };
  }

  async getTradeActivity(name: string, country?: string): Promise<TradeActivityResult> {
    const pin = this.pin(name);
    if (pin === "unknown")
      return { hasActivity: false, totalShipments: 0, topHsCodes: [], tradingAreas: [], billsOfLading: 0 };

    // Pinned demo companies get realistic, query-aligned activity.
    if (pin === "match")
      return { hasActivity: true, totalShipments: 412, topHsCodes: ["0901.11", "1801.00", "1701.99"], tradingAreas: ["Netherlands", "Brazil", "Côte d'Ivoire"], billsOfLading: 388 };
    if (pin === "partial")
      return { hasActivity: true, totalShipments: 47, topHsCodes: ["1801.00"], tradingAreas: ["Côte d'Ivoire"], billsOfLading: 41 };

    const h = hash("trade:" + name);
    const has = h % 100 >= 25; // ~75% have some activity
    return has
      ? { hasActivity: true, totalShipments: 10 + (h % 300), topHsCodes: ["0901.11"], tradingAreas: [country ?? "Unknown"], billsOfLading: 5 + (h % 200) }
      : { hasActivity: false, totalShipments: 0, topHsCodes: [], tradingAreas: [], billsOfLading: 0 };
  }

  async screenPep(name: string): Promise<PepResult> {
    const pin = this.pin(name);
    if (pin === "sanctioned") return { status: "hit", adverseMediaCount: 9, reason: "Adverse media + watchlist links." };
    const h = hash("pep:" + name) % 100;
    if (!pin && h < 12) return { status: "review", adverseMediaCount: 1 + (h % 3), reason: "Trade-press mentions, no material findings." };
    return { status: "clear", adverseMediaCount: 0 };
  }

  async getDirectorsUbo(name: string): Promise<DirectorsUboResult> {
    const pin = this.pin(name);
    if (pin === "unknown") return { directors: [], uboCount: 0, checked: false };
    const h = hash("ubo:" + name);
    const directors = ["Director A", "Director B", "Director C"].slice(0, 1 + (h % 3));
    return { directors, uboCount: 1 + (h % 2), checked: true };
  }

  async verifyCounterparty(query: CounterpartyQuery): Promise<VerificationResult> {
    const [sanctions, registry, tradeActivity, pep, directorsUbo] = await Promise.all([
      this.screenSanctions(query.companyName, query.country),
      this.lookupRegistry(query.companyName, query.country),
      this.getTradeActivity(query.companyName, query.country),
      this.screenPep(query.companyName),
      this.getDirectorsUbo(query.companyName),
    ]);
    return composeVerification(query, sanctions, registry, tradeActivity, this.source, pep, directorsUbo);
  }
}
