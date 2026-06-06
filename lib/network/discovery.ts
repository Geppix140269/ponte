// Counterparty discovery from ADAMftd customs data. Lets a buyer find real
// suppliers (or a seller find buyers) by commodity + country, before anyone
// lists. Mock-first behind the same ADAMFTD_LIVE flag; the live adapter needs an
// ADAMftd trade-data "companies by HS + country" search (TODO, see Phat ask).

export type DiscoverRole = "suppliers" | "buyers";

export interface DiscoveryQuery {
  commodity?: string;   // free text or HS code
  hsCode?: string;
  country?: string;     // ISO-2 or name
  role: DiscoverRole;
  minShipments?: number;
  limit?: number;
}

export interface DiscoveredCompany {
  id: string;
  name: string;
  country: string;
  hsCodes: string[];
  shipments12mo: number;
  lastSeen: string;     // ISO date
  verified: boolean;    // already a verified ponte member
  trust?: number;       // if on ponte
}

export interface DiscoveryProvider {
  readonly source: "mock" | "live";
  discover(q: DiscoveryQuery): Promise<{ total: number; results: DiscoveredCompany[] }>;
}

function hash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

const SAMPLE_NAMES = [
  "Abidjan Cocoa Exporters SA","Santos Coffee Trading","Gulf Urea Industries","Rotterdam Commodity Partners BV",
  "Black Sea Grain Co","Mundra Edible Oils Ltd","Andes Sugar Mills","Veracruz Citrus Group","Delta Rice Exporters",
  "Pan-Asia Metals Pte","Atlantic Soy Traders","Maghreb Fertilizers SARL",
];

export class MockDiscoveryProvider implements DiscoveryProvider {
  readonly source = "mock" as const;
  async discover(q: DiscoveryQuery): Promise<{ total: number; results: DiscoveredCompany[] }> {
    const seed = hash(`${q.role}|${q.commodity ?? q.hsCode ?? ""}|${q.country ?? ""}`);
    const limit = q.limit ?? 8;
    const total = 200 + (seed % 14000);
    const results: DiscoveredCompany[] = Array.from({ length: limit }).map((_, i) => {
      const h = hash(`${seed}:${i}`);
      const shipments = 12 + (h % 480);
      if (q.minShipments && shipments < q.minShipments) return null as unknown as DiscoveredCompany;
      return {
        id: "co_" + h.toString(36),
        name: SAMPLE_NAMES[(seed + i) % SAMPLE_NAMES.length],
        country: q.country ?? ["BR","CI","IN","AE","UA","ID"][(h) % 6],
        hsCodes: [q.hsCode ?? ["1701","0901","1801","3102","1006"][h % 5]],
        shipments12mo: shipments,
        lastSeen: new Date(Date.now() - (h % 90) * 86400000).toISOString().slice(0, 10),
        verified: h % 5 === 0,
        trust: h % 5 === 0 ? 60 + (h % 35) : undefined,
      };
    }).filter(Boolean);
    // verified first, then by shipments
    results.sort((a, b) => Number(b.verified) - Number(a.verified) || b.shipments12mo - a.shipments12mo);
    return { total, results };
  }
}

export class LiveDiscoveryProvider implements DiscoveryProvider {
  readonly source = "live" as const;
  async discover(_q: DiscoveryQuery): Promise<{ total: number; results: DiscoveredCompany[] }> {
    // TODO(adamftd): trade-data "companies by HS code + country + role" search.
    // Not in the current bundle; falls back to empty until confirmed with Phat.
    return { total: 0, results: [] };
  }
}

let cached: DiscoveryProvider | null = null;
export function getDiscoveryProvider(): DiscoveryProvider {
  if (cached) return cached;
  cached = process.env.ADAMFTD_LIVE === "true" ? new LiveDiscoveryProvider() : new MockDiscoveryProvider();
  return cached;
}
export function __resetDiscoveryProvider() { cached = null; }
