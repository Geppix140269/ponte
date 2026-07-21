// OpenCorporates adapter, for every jurisdiction outside the UK.
//
// Env:
//   OPENCORPORATES_API_KEY  OPTIONAL.
//
// With no key configured this adapter returns available:false with a reason,
// every single time. It does not throw, and it absolutely does not return a
// clean looking empty result. A non-UK company that was never checked must
// reach a human, because "no key" and "nothing found against them" look
// identical to a pipeline that only reads the fields.
//
// Endpoints used:
//   GET /v0.4/companies/{jurisdiction_code}/{company_number}
//   GET /v0.4/companies/search
//
// Attribution: the open data tier is licensed share alike and requires
// visible credit. The string travels back inside the result so the
// certificate can print it, and the per record publisher is appended when
// OpenCorporates supplies one.

import type { RegistryResult, RegistrySearchResult, RegistryOfficer } from "./index";

const BASE = "https://api.opencorporates.com/v0.4";
const SOURCE = "opencorporates";
const TIMEOUT_MS = 10_000;
const SEARCH_PAGE_SIZE = 20;

const ATTRIBUTION =
  "Company data from OpenCorporates, https://opencorporates.com, used under CC-BY-SA 4.0.";

const NO_KEY_REASON = "registry not checked, no OpenCorporates key configured";

// OpenCorporates splits these countries into sub national registers, so a
// bare ISO country code cannot be turned into a direct lookup path. For them
// the number is resolved through search instead.
const FEDERAL_COUNTRIES = new Set(["US", "CA", "AU", "AE", "CN", "IN", "MY", "MX", "BR"]);

export function isConfigured(): boolean {
  return Boolean(process.env.OPENCORPORATES_API_KEY);
}

/**
 * Look a company up by registration number.
 *
 * `country` is an ISO 3166-1 alpha-2 code, or an OpenCorporates jurisdiction
 * code directly when the caller has one (for example "us_de" or "ca_on").
 */
export async function lookupCompany(
  regNumber: string,
  country?: string | null,
): Promise<RegistryResult> {
  const checkedAt = new Date().toISOString();
  const token = process.env.OPENCORPORATES_API_KEY;
  if (!token) {
    return {
      source: SOURCE,
      available: false,
      reason: NO_KEY_REASON,
      regNumber: regNumber?.trim() || undefined,
      attribution: ATTRIBUTION,
      checkedAt,
    };
  }

  const number = regNumber.trim();
  if (!number) {
    return {
      source: SOURCE,
      available: false,
      reason: "OpenCorporates not called, the registration number supplied was empty",
      attribution: ATTRIBUTION,
      checkedAt,
    };
  }

  const jurisdiction = jurisdictionCode(country);

  // No usable jurisdiction: resolve the number through search rather than
  // guessing a register.
  if (!jurisdiction) {
    return lookupByNumberSearch(number, country, token, checkedAt);
  }

  const params = new URLSearchParams({ api_token: token });
  const res = await getJson(
    `${BASE}/companies/${encodeURIComponent(jurisdiction)}/${encodeURIComponent(number)}?${params.toString()}`,
  );
  if (res.kind === "error") {
    return { source: SOURCE, available: false, reason: res.reason, regNumber: number, attribution: ATTRIBUTION, checkedAt };
  }
  if (res.kind === "not_found") {
    return {
      source: SOURCE,
      available: true,
      status: "not_found",
      reason: `no company with number ${number} exists in the OpenCorporates register for jurisdiction ${jurisdiction}`,
      regNumber: number,
      attribution: ATTRIBUTION,
      checkedAt,
    };
  }

  const company = asRecord(asRecord(asRecord(res.body)?.results)?.company);
  if (!company) {
    return {
      source: SOURCE,
      available: false,
      reason: "OpenCorporates responded without a company record",
      regNumber: number,
      attribution: ATTRIBUTION,
      checkedAt,
    };
  }

  return toResult(company, checkedAt, true);
}

/** Search by name across a country, or across every jurisdiction. */
export async function searchCompany(
  name: string,
  country?: string | null,
): Promise<RegistrySearchResult> {
  const checkedAt = new Date().toISOString();
  const token = process.env.OPENCORPORATES_API_KEY;
  if (!token) {
    return {
      source: SOURCE,
      available: false,
      reason: NO_KEY_REASON,
      matches: [],
      attribution: ATTRIBUTION,
      checkedAt,
    };
  }

  const query = name.trim();
  if (!query) {
    return {
      source: SOURCE,
      available: false,
      reason: "OpenCorporates not called, the company name supplied was empty",
      matches: [],
      attribution: ATTRIBUTION,
      checkedAt,
    };
  }

  const params = new URLSearchParams({
    q: query,
    per_page: String(SEARCH_PAGE_SIZE),
    api_token: token,
  });
  applyScope(params, country);

  const res = await getJson(`${BASE}/companies/search?${params.toString()}`);
  if (res.kind === "error") {
    return { source: SOURCE, available: false, reason: res.reason, matches: [], attribution: ATTRIBUTION, checkedAt };
  }
  if (res.kind === "not_found") {
    return { source: SOURCE, available: true, matches: [], attribution: ATTRIBUTION, checkedAt };
  }

  // OpenCorporates reports the full size of the result set alongside the page
  // it returned. Carried up so a truncated list can be described honestly.
  const totalCount = asRecord(asRecord(res.body)?.results)?.total_count;

  return {
    source: SOURCE,
    available: true,
    matches: readSearchMatches(res.body, checkedAt),
    total: typeof totalCount === "number" ? totalCount : undefined,
    attribution: ATTRIBUTION,
    checkedAt,
  };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

// Federal countries have no single register path, so the number is looked up
// through search restricted to the company_number field.
async function lookupByNumberSearch(
  number: string,
  country: string | null | undefined,
  token: string,
  checkedAt: string,
): Promise<RegistryResult> {
  const params = new URLSearchParams({
    q: number,
    fields: "company_number",
    per_page: String(SEARCH_PAGE_SIZE),
    api_token: token,
  });
  applyScope(params, country);

  const res = await getJson(`${BASE}/companies/search?${params.toString()}`);
  if (res.kind === "error") {
    return { source: SOURCE, available: false, reason: res.reason, regNumber: number, attribution: ATTRIBUTION, checkedAt };
  }
  if (res.kind === "not_found") {
    return {
      source: SOURCE,
      available: true,
      status: "not_found",
      reason: `no company with number ${number} was found in OpenCorporates`,
      regNumber: number,
      attribution: ATTRIBUTION,
      checkedAt,
    };
  }

  const matches = readSearchMatches(res.body, checkedAt);
  if (matches.length === 0) {
    return {
      source: SOURCE,
      available: true,
      status: "not_found",
      reason: `no company with number ${number} was found in OpenCorporates`,
      regNumber: number,
      attribution: ATTRIBUTION,
      checkedAt,
    };
  }
  if (matches.length > 1) {
    return {
      source: SOURCE,
      available: false,
      reason: `${matches.length} companies share number ${number} across OpenCorporates jurisdictions, an explicit jurisdiction code is needed`,
      regNumber: number,
      attribution: ATTRIBUTION,
      checkedAt,
      raw: {
        candidates: matches.map((m) => ({
          companyName: m.companyName,
          regNumber: m.regNumber,
          jurisdiction: asRecord(m.raw)?.jurisdictionCode,
        })),
      },
    };
  }
  return matches[0];
}

function readSearchMatches(body: unknown, checkedAt: string): RegistryResult[] {
  const companies = arr(asRecord(asRecord(body)?.results)?.companies);
  return companies
    .map((entry) => asRecord(asRecord(entry)?.company))
    .filter((company): company is Record<string, unknown> => Boolean(company))
    .map((company) => toResult(company, checkedAt, false));
}

// `expectOfficers` is true for a direct record fetch. Search hits never carry
// officers and are not expected to.
function toResult(
  company: Record<string, unknown>,
  checkedAt: string,
  expectOfficers: boolean,
): RegistryResult {
  const officers = readOfficers(company);
  const source = asRecord(company.source);
  const publisher = str(source?.publisher);
  const sourceUrl = str(source?.url);
  const attribution = publisher
    ? `${ATTRIBUTION} Register data published by ${publisher}${sourceUrl ? ` (${sourceUrl})` : ""}.`
    : ATTRIBUTION;

  const inactive = typeof company.inactive === "boolean" ? company.inactive : undefined;
  // `current_status` is free text and differs by register, so it is passed
  // through as published. `inactive` is the only cross jurisdiction signal.
  const status = str(company.current_status) ?? (inactive === undefined ? undefined : inactive ? "inactive" : "active");

  const result: RegistryResult = {
    source: SOURCE,
    available: true,
    companyName: str(company.name),
    regNumber: str(company.company_number),
    status,
    incorporationDate: str(company.incorporation_date),
    address: str(company.registered_address_in_full) ?? formatAddress(asRecord(company.registered_address)),
    officers,
    attribution,
    checkedAt,
    raw: {
      jurisdictionCode: str(company.jurisdiction_code),
      companyType: str(company.company_type),
      inactive,
      dissolutionDate: str(company.dissolution_date),
      branch: str(company.branch),
      registryUrl: str(company.registry_url),
      opencorporatesUrl: str(company.opencorporates_url),
      previousNames: arr(company.previous_names)
        .map((entry) => str(asRecord(entry)?.company_name) ?? str(entry))
        .filter((v): v is string => Boolean(v)),
      updatedAt: str(company.updated_at),
      sourcePublisher: publisher,
      sourceUrl,
      sourceRetrievedAt: str(source?.retrieved_at),
    },
  };

  if (expectOfficers && !officers) {
    // The plan or the register did not return officers. Saying nothing here
    // would present an unscreened board as a clean one.
    return {
      ...result,
      available: false,
      reason:
        "company record retrieved but the OpenCorporates response carried no officer list. Officers were not screened.",
    };
  }

  return result;
}

function readOfficers(company: Record<string, unknown>): RegistryOfficer[] | undefined {
  if (!Array.isArray(company.officers)) return undefined;
  const officers: RegistryOfficer[] = [];
  for (const entry of company.officers) {
    const row = asRecord(asRecord(entry)?.officer) ?? asRecord(entry);
    const name = str(row?.name);
    if (!name) continue;
    const position = str(row?.position);
    const endDate = str(row?.end_date);
    officers.push({
      name,
      role: position ? (endDate ? `${position} (ended ${endDate})` : position) : undefined,
      appointedOn: str(row?.start_date),
    });
  }
  return officers;
}

// Country codes go on the search as a country filter, full jurisdiction codes
// go on as a jurisdiction filter.
function applyScope(params: URLSearchParams, country?: string | null): void {
  const code = country?.trim().toLowerCase();
  if (!code) return;
  if (code.includes("_")) {
    params.set("jurisdiction_code", code);
    return;
  }
  if (code.length === 2) params.set("country_code", code.toUpperCase());
}

// An OpenCorporates jurisdiction code is the lowercased ISO country code for
// unitary states, and country_subdivision for federal ones. Returns undefined
// when a direct path cannot be built safely.
function jurisdictionCode(country?: string | null): string | undefined {
  const code = country?.trim().toLowerCase();
  if (!code) return undefined;
  if (code.includes("_")) return code;
  if (code.length !== 2) return undefined;
  if (FEDERAL_COUNTRIES.has(code.toUpperCase())) return undefined;
  return code;
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

type JsonOutcome =
  | { kind: "ok"; body: unknown }
  | { kind: "not_found" }
  | { kind: "error"; reason: string };

async function getJson(url: string): Promise<JsonOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });

    if (res.status === 404) return { kind: "not_found" };
    if (res.status === 401 || res.status === 403) {
      return {
        kind: "error",
        reason: `OpenCorporates rejected the API key or the plan does not cover this call (HTTP ${res.status})`,
      };
    }
    if (res.status === 429) {
      return { kind: "error", reason: "OpenCorporates rate limit reached (HTTP 429)" };
    }
    if (!res.ok) {
      return { kind: "error", reason: `OpenCorporates returned HTTP ${res.status} ${res.statusText}`.trim() };
    }

    // Body is parsed, never logged. The URL carries the api_token, so it is
    // never logged either.
    const body = (await res.json()) as unknown;
    return { kind: "ok", body };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { kind: "error", reason: `OpenCorporates timed out after ${TIMEOUT_MS / 1000} seconds` };
    }
    const detail = err instanceof Error ? err.message : "unknown error";
    return { kind: "error", reason: `OpenCorporates request failed: ${detail}` };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAddress(address?: Record<string, unknown>): string | undefined {
  if (!address) return undefined;
  const parts = [
    str(address.street_address),
    str(address.locality),
    str(address.region),
    str(address.postal_code),
    str(address.country),
  ].filter((v): v is string => Boolean(v));
  return parts.length ? parts.join(", ") : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function str(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
