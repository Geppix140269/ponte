// Optional OpenSanctions trial adapter.
//
// This client is deliberately NOT wired into Ponte's automatic verdict. It is
// a read-only trial surface for comparing broader sanctions, PEP, RCA and
// debarment coverage against the authoritative lists Ponte already hosts. A
// commercial licence and false-positive calibration are required before it can
// become a production decision input.

const BASE = "https://api.opensanctions.org";
const TIMEOUT_MS = 20_000;
const DEFAULT_THRESHOLD = 0.8;
const DEFAULT_LIMIT = 10;

export type OpenSanctionsCompanyInput = {
  name: string;
  country?: string | null;
  regNumber?: string | null;
  vat?: string | null;
  lei?: string | null;
  address?: string | null;
};

export type OpenSanctionsMatch = {
  id?: string;
  caption?: string;
  schema?: string;
  score?: number;
  datasets?: string[];
  topics?: string[];
  properties?: Record<string, unknown>;
  raw: unknown;
};

export type OpenSanctionsResult = {
  source: "OpenSanctions";
  available: boolean;
  reason?: string;
  matches: OpenSanctionsMatch[];
  checkedAt: string;
};

export function isOpenSanctionsConfigured(): boolean {
  return Boolean(process.env.OPENSANCTIONS_API_KEY);
}

export function isOpenSanctionsEnabled(): boolean {
  return process.env.DATA_OPENSANCTIONS_ENABLED === "true";
}

export async function screenOpenSanctionsCompany(
  input: OpenSanctionsCompanyInput,
): Promise<OpenSanctionsResult> {
  const checkedAt = new Date().toISOString();
  if (!isOpenSanctionsEnabled()) {
    return {
      source: "OpenSanctions",
      available: false,
      reason: "OpenSanctions trial is disabled; set DATA_OPENSANCTIONS_ENABLED=true only after licence approval",
      matches: [],
      checkedAt,
    };
  }

  const key = process.env.OPENSANCTIONS_API_KEY;
  if (!key) {
    return {
      source: "OpenSanctions",
      available: false,
      reason: "OpenSanctions not checked, no API key configured",
      matches: [],
      checkedAt,
    };
  }

  const name = input.name.trim();
  if (!name) {
    return {
      source: "OpenSanctions",
      available: false,
      reason: "OpenSanctions not called, the company name was empty",
      matches: [],
      checkedAt,
    };
  }

  const properties: Record<string, string[]> = { name: [name] };
  addProperty(properties, "country", input.country);
  addProperty(properties, "registrationNumber", input.regNumber);
  addProperty(properties, "vatCode", input.vat);
  addProperty(properties, "leiCode", input.lei);
  addProperty(properties, "address", input.address);

  const url = new URL(`${BASE}/match/default`);
  url.searchParams.set("algorithm", "best");
  url.searchParams.set("threshold", String(readThreshold()));
  url.searchParams.set("limit", String(DEFAULT_LIMIT));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `ApiKey ${key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        queries: {
          subject: {
            schema: "Company",
            properties,
          },
        },
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      return {
        source: "OpenSanctions",
        available: false,
        reason: `OpenSanctions rejected the API key or licence (HTTP ${res.status})`,
        matches: [],
        checkedAt,
      };
    }
    if (res.status === 429) {
      return {
        source: "OpenSanctions",
        available: false,
        reason: "OpenSanctions rate limit reached (HTTP 429)",
        matches: [],
        checkedAt,
      };
    }
    if (!res.ok) {
      return {
        source: "OpenSanctions",
        available: false,
        reason: `OpenSanctions returned HTTP ${res.status} ${res.statusText}`.trim(),
        matches: [],
        checkedAt,
      };
    }

    const json = (await res.json()) as unknown;
    return {
      source: "OpenSanctions",
      available: true,
      matches: readMatches(json),
      checkedAt,
    };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "AbortError";
    return {
      source: "OpenSanctions",
      available: false,
      reason: timedOut
        ? `OpenSanctions timed out after ${TIMEOUT_MS / 1000} seconds`
        : `OpenSanctions request failed: ${err instanceof Error ? err.message : "unknown error"}`,
      matches: [],
      checkedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}

function addProperty(
  properties: Record<string, string[]>,
  key: string,
  value?: string | null,
): void {
  const clean = value?.trim();
  if (clean) properties[key] = [clean];
}

function readThreshold(): number {
  const raw = Number(process.env.OPENSANCTIONS_MATCH_THRESHOLD);
  if (!Number.isFinite(raw)) return DEFAULT_THRESHOLD;
  return Math.min(1, Math.max(0.5, raw));
}

function readMatches(value: unknown): OpenSanctionsMatch[] {
  const root = asRecord(value);
  const responses = asRecord(root?.responses);
  const subject = asRecord(responses?.subject);
  const candidates = Array.isArray(subject?.results)
    ? subject.results
    : Array.isArray(root?.results)
      ? root.results
      : [];

  const matches: OpenSanctionsMatch[] = [];
  for (const candidate of candidates) {
    const row = asRecord(candidate);
    if (!row) continue;
    const entity = asRecord(row.entity) ?? row;
    matches.push({
      id: text(entity.id) ?? text(row.id),
      caption: text(entity.caption) ?? text(row.caption),
      schema: text(entity.schema) ?? text(row.schema),
      score: number(row.score),
      datasets: strings(entity.datasets ?? row.datasets),
      topics: strings(entity.topics ?? row.topics),
      properties: asRecord(entity.properties ?? row.properties),
      raw: candidate,
    });
  }
  return matches;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function number(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function strings(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.filter((item): item is string => typeof item === "string");
  return out.length ? out : undefined;
}
