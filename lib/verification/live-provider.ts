// Live ADAMftd provider.
//
// Implements the VerificationProvider contract against the real ADAMftd API
// (https://api.adamftd.org), auth via the X-API-KEY header.
//
// Endpoints (from Phat's API bundle):
//   Sanctions: GET /sanction-service/public/v1/search?q=<name>
//   Trade:     GET /trade-service/public/v1/company-transactions/analytics/monthly?keyword=<name>
//              GET /trade-service/public/v1/company-transactions/hs-code-analytics/list?keyword=<name>
//              GET /trade-service/public/v1/company-transactions/trading-countries/list?keyword=<name>
//
// Registry note: the Company Due Diligence endpoints are keyed by an internal
// company_id and the bundle has no company-NAME search, so company_registered
// is derived from official customs presence at medium confidence until a
// name-search endpoint is available. Swap lookupRegistry() then; nothing else
// changes.

import type {
  VerificationProvider, SanctionsResult, RegistryResult, TradeActivityResult,
  VerificationResult, CounterpartyQuery, ClaimedRole,
} from "./types";
import { composeVerification } from "./compose";
import { COUNTRIES } from "@/lib/countries";

const CODE_TO_NAME = new Map(COUNTRIES.map((c) => [c.code.toUpperCase(), c.name]));

function baseUrl(): string {
  return (process.env.ADAMFTD_API_URL || "https://api.adamftd.org").replace(/\/$/, "");
}
function apiKey(): string {
  const k = process.env.ADAMFTD_API_KEY;
  if (!k) throw new Error("ADAMFTD_API_KEY is not set");
  return k;
}

async function getJson(path: string): Promise<any> {
  const res = await fetch(`${baseUrl()}${path}`, {
    headers: { "X-API-KEY": apiKey(), accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`ADAMftd ${path} -> ${res.status}`);
  return res.json();
}

function norm(s: string): string {
  return (s || "").toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()'"]/g, " ").replace(/\s+/g, " ").trim();
}
function sancTokens(s: string): string[] {
  return norm(s).split(" ").filter((t) => t.length >= 2);
}
function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const B = new Set(b);
  const seen = new Set<string>();
  let inter = 0;
  for (const x of a) { if (B.has(x) && !seen.has(x)) inter++; seen.add(x); }
  const uni = new Set(a.concat(b)).size;
  return uni ? inter / uni : 0;
}
function containsAll(q: string[], c: string[]): boolean {
  const C = new Set(c);
  return q.length > 0 && q.every((t) => C.has(t));
}

// Pure sanctions-match classifier. The sanctions search is fuzzy and returns
// candidates even for clean names, so a returned candidate is NOT a match by
// itself. Only a strong name match flags; moderate overlap goes to manual
// review; tangential results resolve to clear. Exported for unit testing.
export function sanctionMatchStatus(
  query: string,
  candidateNames: string[],
): { status: "clear" | "partial" | "hit"; confidence: number } {
  if (candidateNames.length === 0) return { status: "clear", confidence: 0.99 };
  const qTok = sancTokens(query);
  let bestScore = 0;
  let strong = false;
  for (const nm of candidateNames) {
    const cTok = sancTokens(nm);
    const j = jaccard(qTok, cTok);
    if (j > bestScore) bestScore = j;
    if (j >= 0.7 || (qTok.length >= 2 && containsAll(qTok, cTok))) strong = true;
  }
  if (strong) return { status: "hit", confidence: 0.95 };
  if (bestScore >= 0.45) return { status: "partial", confidence: 0.6 };
  return { status: "clear", confidence: 0.95 };
}

function dateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setUTCFullYear(end.getUTCFullYear() - 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}
function isBuyerFor(role?: ClaimedRole): boolean {
  return role === "buyer"; // sellers/brokers default to the supplier perspective
}

export class LiveVerificationProvider implements VerificationProvider {
  readonly source = "live" as const;

  // ---- Sanctions ----
  async screenSanctions(name: string): Promise<SanctionsResult> {
    const q = encodeURIComponent(name);
    const json = await getJson(`/sanction-service/public/v1/search?q=${q}&limit=10&offset=0`);
    const results: any[] = json?.data?.results ?? [];
    if (results.length === 0) return { status: "clear", confidence: 0.99, matchedLists: [] };

    const candidateNames: string[] = [];
    for (const r of results) {
      for (const nm of [r.caption, ...(r.properties?.alias ?? [])]) if (nm) candidateNames.push(String(nm));
    }
    const verdict = sanctionMatchStatus(name, candidateNames);
    if (verdict.status === "clear") return { status: "clear", confidence: verdict.confidence, matchedLists: [] };

    const p = results[0]?.properties ?? {};
    const raw = p.program ?? p.programId ?? p.datasets ?? p.topics ?? [];
    const matchedLists = (Array.isArray(raw) ? raw : [raw]).map(String);
    const reason = verdict.status === "hit"
      ? "Strong name match on a sanctions list."
      : "Partial name match requires manual review.";
    return { status: verdict.status, confidence: verdict.confidence, matchedLists, reason };
  }

  // ---- Trade activity ----
  async getTradeActivity(name: string, _country?: string, role?: ClaimedRole): Promise<TradeActivityResult> {
    const { start, end } = dateRange();
    const kw = encodeURIComponent(name);
    const ib = isBuyerFor(role);
    const common = `keyword=${kw}&start_date=${start}&end_date=${end}&is_buyer=${ib}`;

    const [monthly, hs, countries] = await Promise.all([
      getJson(`/trade-service/public/v1/company-transactions/analytics/monthly?${common}&limit=12&offset=0&sort_by=month&order=asc`).catch(() => null),
      getJson(`/trade-service/public/v1/company-transactions/hs-code-analytics/list?${common}&tab=HSCode&limit=10&offset=0&sort_by=value_usd&order=desc`).catch(() => null),
      getJson(`/trade-service/public/v1/company-transactions/trading-countries/list?${common}&tab=TradingArea&limit=25&offset=0&sort_by=value_usd&order=desc`).catch(() => null),
    ]);

    const months: any[] = monthly?.data ?? [];
    const totalBol = months.reduce((s, m) => s + (Number(m.bol) || 0), 0);
    const hasActivity = (monthly?.total_records ?? months.length) > 0;
    const topHsCodes: string[] = (hs?.data ?? []).map((d: any) => String(d.hscode)).filter(Boolean);

    const tradingAreas: string[] = [];
    for (const c of countries?.data ?? []) {
      const code = String(c.country_code || "").toUpperCase();
      if (code) {
        tradingAreas.push(code);
        const nm = CODE_TO_NAME.get(code);
        if (nm) tradingAreas.push(nm);
      }
    }

    return { hasActivity, totalShipments: totalBol, topHsCodes, tradingAreas, billsOfLading: totalBol };
  }

  // ---- Registry (derived; see file header) ----
  async lookupRegistry(name: string, country?: string): Promise<RegistryResult> {
    const trade = await this.getTradeActivity(name, country);
    return this.registryFromTrade(name, country, trade);
  }

  private registryFromTrade(name: string, country: string | undefined, trade: TradeActivityResult): RegistryResult {
    if (!trade.hasActivity) return { found: false, confidence: "none" };
    const inferredCountry = country ?? trade.tradingAreas.find((a) => a.length > 2);
    return { found: true, legalName: name, status: "active", country: inferredCountry, confidence: "medium" };
  }

  // ---- Compose (sanctions + a single trade fetch) ----
  async verifyCounterparty(query: CounterpartyQuery): Promise<VerificationResult> {
    const [sanctions, tradeActivity] = await Promise.all([
      this.screenSanctions(query.companyName),
      this.getTradeActivity(query.companyName, query.country, query.claimedRole),
    ]);
    const registry = this.registryFromTrade(query.companyName, query.country, tradeActivity);
    return composeVerification(query, sanctions, registry, tradeActivity, this.source);
  }
}
