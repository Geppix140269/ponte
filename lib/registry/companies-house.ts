// UK Companies House adapter.
//
// Public REST API of the UK register. Free, keyed, rate limited to roughly
// 600 requests per five minutes per key.
//
// Env:
//   COMPANIES_HOUSE_API_KEY  required. HTTP Basic, the key is the username
//                            and the password is empty.
//
// Endpoints used:
//   GET /company/{number}
//   GET /company/{number}/officers
//   GET /search/companies
//
// This file never throws for an upstream problem and never decides a verdict.
// See ./index.ts for the availability contract.

import type { RegistryResult, RegistrySearchResult, RegistryOfficer } from "./index";

const BASE = "https://api.company-information.service.gov.uk";
const SOURCE = "companies_house";
const TIMEOUT_MS = 10_000;
const OFFICER_PAGE_SIZE = 100;
const MAX_OFFICER_PAGES = 5; // 500 officers, far beyond any real company
const SEARCH_PAGE_SIZE = 20;

export function isConfigured(): boolean {
  return Boolean(process.env.COMPANIES_HOUSE_API_KEY);
}

/**
 * Full company record: profile plus the officer list.
 *
 * The officers are part of the answer, not an extra. If the profile comes
 * back but the officer list does not, the result is marked unavailable with
 * the profile fields still populated, so a reviewer sees the company while
 * the pipeline knows the screen is incomplete.
 */
export async function lookupCompany(regNumber: string): Promise<RegistryResult> {
  const checkedAt = new Date().toISOString();
  const key = process.env.COMPANIES_HOUSE_API_KEY;
  if (!key) {
    return {
      source: SOURCE,
      available: false,
      reason: "registry not checked, no Companies House key configured",
      regNumber,
      checkedAt,
    };
  }

  const number = normalizeNumber(regNumber);
  if (!number) {
    return {
      source: SOURCE,
      available: false,
      reason: "Companies House not called, the registration number supplied was empty",
      checkedAt,
    };
  }

  const profile = await getJson(`${BASE}/company/${encodeURIComponent(number)}`, key);
  if (profile.kind === "error") {
    return { source: SOURCE, available: false, reason: profile.reason, regNumber: number, checkedAt };
  }
  if (profile.kind === "not_found") {
    return {
      source: SOURCE,
      available: true,
      status: "not_found",
      reason: `no company with number ${number} exists in Companies House`,
      regNumber: number,
      checkedAt,
    };
  }

  const body = asRecord(profile.body) ?? {};
  const address = formatAddress(asRecord(body.registered_office_address));
  const sicCodes = arr(body.sic_codes).filter((v): v is string => typeof v === "string");
  const previousNames = arr(body.previous_company_names)
    .map((entry) => str(asRecord(entry)?.name))
    .filter((v): v is string => Boolean(v));

  const base: RegistryResult = {
    source: SOURCE,
    available: true,
    // Companies House statuses are already lowercase slugs: active,
    // dissolved, liquidation, administration, receivership,
    // voluntary-arrangement, converted-closed, insolvency-proceedings.
    // Passed through as published, normalizing them would lose detail.
    companyName: str(body.company_name),
    regNumber: str(body.company_number) ?? number,
    status: str(body.company_status),
    incorporationDate: str(body.date_of_creation),
    address,
    checkedAt,
    raw: {
      companyType: str(body.type),
      jurisdiction: str(body.jurisdiction),
      sicCodes,
      previousNames,
      dateOfCessation: str(body.date_of_cessation),
      statusDetail: str(body.company_status_detail),
      registeredOfficeAddress: asRecord(body.registered_office_address),
      hasInsolvencyHistory: typeof body.has_insolvency_history === "boolean" ? body.has_insolvency_history : undefined,
      hasCharges: typeof body.has_charges === "boolean" ? body.has_charges : undefined,
      accountsNextDue: str(asRecord(body.accounts)?.next_due),
    },
  };

  const officers = await getOfficers(number, key);
  if (!officers.ok) {
    return {
      ...base,
      available: false,
      reason: `company profile retrieved but the Companies House officers list was not: ${officers.reason}. Officers were not screened.`,
    };
  }

  return { ...base, officers: officers.officers };
}

/** Search the register by name. Candidates only, no officer lists. */
export async function searchCompany(name: string): Promise<RegistrySearchResult> {
  const checkedAt = new Date().toISOString();
  const key = process.env.COMPANIES_HOUSE_API_KEY;
  if (!key) {
    return {
      source: SOURCE,
      available: false,
      reason: "registry not checked, no Companies House key configured",
      matches: [],
      checkedAt,
    };
  }

  const query = name.trim();
  if (!query) {
    return {
      source: SOURCE,
      available: false,
      reason: "Companies House not called, the company name supplied was empty",
      matches: [],
      checkedAt,
    };
  }

  const params = new URLSearchParams({ q: query, items_per_page: String(SEARCH_PAGE_SIZE) });
  const res = await getJson(`${BASE}/search/companies?${params.toString()}`, key);
  if (res.kind === "error") {
    return { source: SOURCE, available: false, reason: res.reason, matches: [], checkedAt };
  }
  if (res.kind === "not_found") {
    return { source: SOURCE, available: true, matches: [], checkedAt };
  }

  const items = arr(asRecord(res.body)?.items);
  const matches: RegistryResult[] = items.map((item) => {
    const row = asRecord(item) ?? {};
    return {
      source: SOURCE,
      available: true,
      companyName: str(row.title),
      regNumber: str(row.company_number),
      status: str(row.company_status),
      incorporationDate: str(row.date_of_creation),
      address: formatAddress(asRecord(row.address)) ?? str(row.address_snippet),
      checkedAt,
      // Officers deliberately absent: a search hit is not a screened company.
      raw: { companyType: str(row.company_type), kind: str(row.kind) },
    };
  });

  return { source: SOURCE, available: true, matches, checkedAt };
}

// ---------------------------------------------------------------------------
// Officers
// ---------------------------------------------------------------------------

type OfficersOutcome =
  | { ok: true; officers: RegistryOfficer[] }
  | { ok: false; reason: string };

async function getOfficers(number: string, key: string): Promise<OfficersOutcome> {
  const officers: RegistryOfficer[] = [];
  let startIndex = 0;
  let total = 0;

  for (let page = 0; page < MAX_OFFICER_PAGES; page++) {
    const params = new URLSearchParams({
      items_per_page: String(OFFICER_PAGE_SIZE),
      start_index: String(startIndex),
    });
    const res = await getJson(
      `${BASE}/company/${encodeURIComponent(number)}/officers?${params.toString()}`,
      key,
    );
    if (res.kind === "error") return { ok: false, reason: res.reason };
    // A 404 on the officers endpoint means the register holds no appointments
    // for this company, which is a real answer.
    if (res.kind === "not_found") return { ok: true, officers };

    const body = asRecord(res.body) ?? {};
    const items = arr(body.items);
    total = typeof body.total_results === "number" ? body.total_results : items.length;

    for (const item of items) {
      const row = asRecord(item) ?? {};
      const officerName = str(row.name);
      if (!officerName) continue;
      const role = str(row.officer_role);
      const resignedOn = str(row.resigned_on);
      officers.push({
        name: officerName,
        // Resigned officers are kept: screening a former director is
        // over-inclusive, dropping one would be a silent gap.
        role: role ? (resignedOn ? `${role} (resigned ${resignedOn})` : role) : undefined,
        appointedOn: str(row.appointed_on),
      });
    }

    startIndex += items.length;
    if (items.length === 0 || officers.length >= total) return { ok: true, officers };
  }

  return {
    ok: false,
    reason: `the officer list exceeded ${MAX_OFFICER_PAGES * OFFICER_PAGE_SIZE} entries and was truncated`,
  };
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

type JsonOutcome =
  | { kind: "ok"; body: unknown }
  | { kind: "not_found" }
  | { kind: "error"; reason: string };

async function getJson(url: string, key: string): Promise<JsonOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      // Basic auth, key as username and an empty password. Never logged.
      headers: {
        Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (res.status === 404) return { kind: "not_found" };
    if (res.status === 401 || res.status === 403) {
      return { kind: "error", reason: "Companies House rejected the API key (HTTP " + res.status + ")" };
    }
    if (res.status === 429) {
      return { kind: "error", reason: "Companies House rate limit reached (HTTP 429)" };
    }
    if (!res.ok) {
      return { kind: "error", reason: `Companies House returned HTTP ${res.status} ${res.statusText}`.trim() };
    }

    // Body is parsed, never logged.
    const body = (await res.json()) as unknown;
    return { kind: "ok", body };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { kind: "error", reason: `Companies House timed out after ${TIMEOUT_MS / 1000} seconds` };
    }
    const detail = err instanceof Error ? err.message : "unknown error";
    return { kind: "error", reason: `Companies House request failed: ${detail}` };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// UK company numbers are eight characters. Purely numeric ones are commonly
// written without their leading zeros, which the API does not accept.
function normalizeNumber(input: string): string {
  const cleaned = input.replace(/\s+/g, "").toUpperCase();
  if (/^\d+$/.test(cleaned) && cleaned.length < 8) return cleaned.padStart(8, "0");
  return cleaned;
}

function formatAddress(address?: Record<string, unknown>): string | undefined {
  if (!address) return undefined;
  const parts = [
    str(address.care_of),
    str(address.po_box),
    str(address.premises),
    str(address.address_line_1),
    str(address.address_line_2),
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
