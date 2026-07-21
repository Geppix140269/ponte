// GLEIF Legal Entity Identifier lookup.
//
// Free public API, no key, no account. Rate limited by IP.
//
// Endpoints used:
//   GET https://api.gleif.org/api/v1/lei-records/{lei}
//   GET https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]=...
//
// An LEI is worth having on a certificate because it is the one identifier
// that is the same in every country, and because a lapsed registration is a
// meaningful signal on its own. Reading that signal is the pipeline's job,
// not this file's.

const BASE = "https://api.gleif.org/api/v1";
const SOURCE = "GLEIF";
const TIMEOUT_MS = 10_000;
const SEARCH_PAGE_SIZE = 10;
const LEI_PATTERN = /^[0-9A-Z]{18}[0-9]{2}$/;

export type GleifResult = {
  source: "GLEIF";
  available: boolean;
  reason?: string;
  lei?: string;
  legalName?: string;
  /** Entity status as published: ACTIVE, INACTIVE or NULL. */
  status?: string;
  /** Registration status as published: ISSUED, LAPSED, RETIRED, ANNULLED. */
  registrationStatus?: string;
  jurisdiction?: string;
  address?: string;
  lastUpdate?: string;
  checkedAt: string;
  raw?: unknown;
};

export type GleifSearchResult = {
  source: "GLEIF";
  available: boolean;
  reason?: string;
  matches: GleifResult[];
  totalMatches?: number;
  checkedAt: string;
};

/** Look up one LEI. */
export async function lookupLei(lei: string): Promise<GleifResult> {
  const checkedAt = new Date().toISOString();
  const code = (lei ?? "").replace(/\s+/g, "").toUpperCase();

  if (!LEI_PATTERN.test(code)) {
    return {
      source: SOURCE,
      available: false,
      reason: "GLEIF not called, the value supplied is not a 20 character LEI",
      lei: code || undefined,
      checkedAt,
    };
  }

  const res = await getJson(`${BASE}/lei-records/${encodeURIComponent(code)}`);
  if (res.kind === "error") {
    return { source: SOURCE, available: false, reason: res.reason, lei: code, checkedAt };
  }
  if (res.kind === "not_found") {
    return {
      source: SOURCE,
      available: true,
      reason: `no LEI record exists for ${code}`,
      lei: code,
      status: "not_found",
      checkedAt,
    };
  }

  const record = asRecord(asRecord(res.body)?.data);
  if (!record) {
    return {
      source: SOURCE,
      available: false,
      reason: "GLEIF responded without an LEI record",
      lei: code,
      checkedAt,
    };
  }

  return toResult(record, checkedAt);
}

/** Search LEI records by legal name. */
export async function searchLei(name: string): Promise<GleifSearchResult> {
  const checkedAt = new Date().toISOString();
  const query = (name ?? "").trim();
  if (!query) {
    return {
      source: SOURCE,
      available: false,
      reason: "GLEIF not called, the company name supplied was empty",
      matches: [],
      checkedAt,
    };
  }

  const params = new URLSearchParams({
    "filter[entity.legalName]": query,
    "page[size]": String(SEARCH_PAGE_SIZE),
    "page[number]": "1",
  });

  const res = await getJson(`${BASE}/lei-records?${params.toString()}`);
  if (res.kind === "error") {
    return { source: SOURCE, available: false, reason: res.reason, matches: [], checkedAt };
  }
  if (res.kind === "not_found") {
    return { source: SOURCE, available: true, matches: [], checkedAt };
  }

  const body = asRecord(res.body);
  const matches = arr(body?.data)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => toResult(entry, checkedAt));

  const total = asRecord(asRecord(body?.meta)?.pagination)?.total;

  return {
    source: SOURCE,
    available: true,
    matches,
    totalMatches: typeof total === "number" ? total : undefined,
    checkedAt,
  };
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

function toResult(record: Record<string, unknown>, checkedAt: string): GleifResult {
  const attributes = asRecord(record.attributes) ?? {};
  const entity = asRecord(attributes.entity) ?? {};
  const registration = asRecord(attributes.registration) ?? {};
  const legalAddress = asRecord(entity.legalAddress);
  const hqAddress = asRecord(entity.headquartersAddress);

  return {
    source: SOURCE,
    available: true,
    lei: str(attributes.lei) ?? str(record.id),
    legalName: str(asRecord(entity.legalName)?.name),
    status: str(entity.status),
    registrationStatus: str(registration.status),
    jurisdiction: str(entity.jurisdiction),
    address: formatAddress(legalAddress) ?? formatAddress(hqAddress),
    lastUpdate: str(registration.lastUpdateDate),
    checkedAt,
    raw: {
      legalForm: str(asRecord(entity.legalForm)?.id) ?? str(asRecord(entity.legalForm)?.other),
      category: str(entity.category),
      registeredAs: str(entity.registeredAs),
      registrationAuthority: str(asRecord(entity.registeredAt)?.id),
      headquartersAddress: formatAddress(hqAddress),
      otherNames: arr(entity.otherNames)
        .map((entry) => str(asRecord(entry)?.name))
        .filter((v): v is string => Boolean(v)),
      initialRegistrationDate: str(registration.initialRegistrationDate),
      nextRenewalDate: str(registration.nextRenewalDate),
      managingLou: str(registration.managingLou),
      corroborationLevel: str(registration.corroborationLevel),
      bic: arr(attributes.bic).filter((v): v is string => typeof v === "string"),
    },
  };
}

function formatAddress(address?: Record<string, unknown>): string | undefined {
  if (!address) return undefined;
  const lines = arr(address.addressLines).filter((v): v is string => typeof v === "string");
  const parts = [
    ...lines,
    str(address.city),
    str(address.region),
    str(address.postalCode),
    str(address.country),
  ]
    .map((v) => v?.trim())
    .filter((v): v is string => Boolean(v));
  return parts.length ? parts.join(", ") : undefined;
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
      headers: { Accept: "application/vnd.api+json" },
      signal: controller.signal,
      cache: "no-store",
    });

    if (res.status === 404) return { kind: "not_found" };
    if (res.status === 429) {
      return { kind: "error", reason: "GLEIF rate limit reached (HTTP 429)" };
    }
    if (!res.ok) {
      return { kind: "error", reason: `GLEIF returned HTTP ${res.status} ${res.statusText}`.trim() };
    }

    // Body is parsed, never logged.
    const body = (await res.json()) as unknown;
    return { kind: "ok", body };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { kind: "error", reason: `GLEIF timed out after ${TIMEOUT_MS / 1000} seconds` };
    }
    const detail = err instanceof Error ? err.message : "unknown error";
    return { kind: "error", reason: `GLEIF request failed: ${detail}` };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
