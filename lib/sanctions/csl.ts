// US International Trade Administration Consolidated Screening List.
//
// The downloadable JSON feed is public and keyless. It consolidates active
// export-restriction lists from the US Departments of Commerce, State and
// Treasury. It is an additional authoritative screening source; a match is a
// review trigger, never an automatic legal conclusion.

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeName } from "./normalize";

export const US_CSL_SOURCE = "US_CSL" as const;
export const US_CSL_URL =
  "https://data.trade.gov/downloadable_consolidated_screening_list/v1/consolidated.json";
export const US_CSL_ATTRIBUTION =
  "This product uses the International Trade Administration's Data API but is not endorsed or certified by the International Trade Administration.";

const TIMEOUT_MS = 180_000;
const MIN_EXPECTED_ENTRIES = 1_000;
const UPSERT_CHUNK = 500;
const USER_AGENT = "ponte.trade sanctions screening (compliance)";

export type UsCslSummary = {
  source: typeof US_CSL_SOURCE;
  status: "ok" | "failed";
  entryCount: number;
  durationMs: number;
  error: string | null;
};

type JsonRecord = Record<string, unknown>;

type ParsedCslEntry = {
  entry_id: string;
  primary_name: string;
  aliases: string[];
  entity_type: string | null;
  country: string | null;
  programs: string[];
  listed_date: string | null;
  raw: JsonRecord;
};

type StagedRow = {
  source_list: typeof US_CSL_SOURCE;
  entry_id: string;
  primary_name: string;
  normalized_name: string;
  aliases: string[];
  normalized_aliases: string[];
  entity_type: string | null;
  country: string | null;
  programs: string[];
  listed_date: string | null;
  raw: JsonRecord;
  imported_at: string;
};

export function parseUsCsl(body: string): ParsedCslEntry[] {
  const parsed = JSON.parse(body) as unknown;
  const records = findRecordArray(parsed);
  const out: ParsedCslEntry[] = [];

  for (let index = 0; index < records.length; index++) {
    const row = records[index];
    const primary = firstText(row, ["name", "primary_name", "entity_name", "full_name"]);
    if (!primary) continue;

    const source = firstText(row, ["source", "source_list", "list", "agency"]);
    const aliases = uniqueStrings([
      ...readStringList(row.alt_names),
      ...readStringList(row.aliases),
      ...readStringList(row.alternative_names),
      ...readStringList(row.aka),
    ]).filter((alias) => alias.toLowerCase() !== primary.toLowerCase());

    const addresses = readRecords(row.addresses);
    const country =
      firstText(row, ["country", "country_name", "nationality", "vessel_flag"]) ??
      firstText(addresses[0] ?? {}, ["country", "country_name"]);

    const programs = uniqueStrings([
      ...readStringList(row.programs),
      ...readStringList(row.program),
      ...readStringList(row.sanctions_program),
      ...(source ? [source] : []),
    ]);

    const explicitId = firstText(row, ["id", "uid", "entity_number", "entry_id"]);
    const entryId =
      explicitId ??
      createHash("sha256")
        .update([source ?? "US_CSL", primary, country ?? "", String(index)].join("|"))
        .digest("hex");

    out.push({
      entry_id: entryId,
      primary_name: primary,
      aliases,
      entity_type: mapEntityType(firstText(row, ["type", "entity_type", "record_type"])),
      country: country ?? null,
      programs,
      listed_date: toIsoDate(
        firstText(row, ["start_date", "listed_date", "effective_date", "publication_date"]),
      ),
      raw: {
        attribution: US_CSL_ATTRIBUTION,
        source: source ?? null,
        addresses,
        remarks: firstText(row, ["remarks", "description", "notes"]) ?? null,
        sourceInformationUrl:
          firstText(row, ["source_information_url", "source_info_url"]) ?? null,
        sourceListUrl: firstText(row, ["source_list_url", "source_url"]) ?? null,
        sourceDownloadUrl: firstText(row, ["source_download_url", "download_url"]) ?? null,
        licenseRequirement: firstText(row, ["license_requirement"]) ?? null,
        licensePolicy: firstText(row, ["license_policy"]) ?? null,
        federalRegisterNotice: firstText(row, ["federal_register_notice"]) ?? null,
        endDate: firstText(row, ["end_date"]) ?? null,
      },
    });
  }

  return dedupeEntries(out);
}

export async function refreshUsCsl(
  timeoutMs = TIMEOUT_MS,
): Promise<UsCslSummary> {
  const started = Date.now();
  const stamp = new Date().toISOString();

  try {
    const body = await fetchFeed(timeoutMs);
    const entries = parseUsCsl(body);
    if (entries.length < MIN_EXPECTED_ENTRIES) {
      throw new Error(
        `US CSL parsed only ${entries.length} entries, expected at least ${MIN_EXPECTED_ENTRIES}. The feed shape may have changed; the previous list was left in place.`,
      );
    }

    const rows = toRows(entries, stamp);
    await loadRows(rows, stamp);

    const summary: UsCslSummary = {
      source: US_CSL_SOURCE,
      status: "ok",
      entryCount: rows.length,
      durationMs: Date.now() - started,
      error: null,
    };
    await writeLog(summary);
    return summary;
  } catch (err) {
    const summary: UsCslSummary = {
      source: US_CSL_SOURCE,
      status: "failed",
      entryCount: 0,
      durationMs: Date.now() - started,
      error: (err as Error).message.slice(0, 500),
    };
    await writeLog(summary);
    return summary;
  }
}

async function fetchFeed(timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(US_CSL_URL, {
      signal: controller.signal,
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`US CSL returned HTTP ${res.status} ${res.statusText}`.trim());
    }
    const body = await res.text();
    if (body.length < 100_000) {
      throw new Error(
        `US CSL response was only ${body.length} bytes, treating it as broken rather than empty`,
      );
    }
    return body;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`US CSL download timed out after ${timeoutMs} ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function toRows(entries: ParsedCslEntry[], stamp: string): StagedRow[] {
  return entries
    .map((entry) => {
      const normalized = normalizeName(entry.primary_name);
      if (!normalized) return null;
      return {
        source_list: US_CSL_SOURCE,
        entry_id: entry.entry_id,
        primary_name: entry.primary_name,
        normalized_name: normalized,
        aliases: entry.aliases,
        normalized_aliases: uniqueStrings(
          entry.aliases.map(normalizeName).filter((v): v is string => Boolean(v)),
        ),
        entity_type: entry.entity_type,
        country: entry.country,
        programs: entry.programs,
        listed_date: entry.listed_date,
        raw: entry.raw,
        imported_at: stamp,
      } satisfies StagedRow;
    })
    .filter((row): row is StagedRow => Boolean(row));
}

async function loadRows(rows: StagedRow[], stamp: string): Promise<void> {
  const sb = createAdminClient();
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const { error } = await sb
      .from("sanctions_entries")
      .upsert(rows.slice(i, i + UPSERT_CHUNK), { onConflict: "source_list,entry_id" });
    if (error) {
      throw new Error(`US CSL upsert failed at row ${i} of ${rows.length}: ${error.message}`);
    }
  }

  const { error: sweepError } = await sb
    .from("sanctions_entries")
    .delete()
    .eq("source_list", US_CSL_SOURCE)
    .lt("imported_at", stamp);
  if (sweepError) throw new Error(`US CSL delisted-entry sweep failed: ${sweepError.message}`);
}

async function writeLog(summary: UsCslSummary): Promise<void> {
  try {
    const sb = createAdminClient();
    await sb.from("sanctions_refresh_log").insert({
      source_list: summary.source,
      entry_count: summary.entryCount,
      status: summary.status,
      error: summary.error,
      duration_ms: summary.durationMs,
    });
  } catch (err) {
    console.error("[ponte] US CSL refresh log insert failed:", (err as Error).message);
  }
}

function findRecordArray(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) return value.map(asRecord).filter(isRecord);
  const root = asRecord(value);
  if (!root) return [];
  for (const key of ["results", "data", "items", "records", "entries"]) {
    const candidate = root[key];
    if (Array.isArray(candidate)) return candidate.map(asRecord).filter(isRecord);
  }
  return [];
}

function dedupeEntries(entries: ParsedCslEntry[]): ParsedCslEntry[] {
  const byId = new Map<string, ParsedCslEntry>();
  for (const entry of entries) byId.set(entry.entry_id, entry);
  return [...byId.values()];
}

function readRecords(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) return [];
  return value.map(asRecord).filter(isRecord);
}

function readStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === "string") return splitList(item);
        const row = asRecord(item);
        const name = row ? firstText(row, ["name", "full_name", "alias", "value"]) : undefined;
        return name ? [name] : [];
      })
      .filter(Boolean);
  }
  return typeof value === "string" ? splitList(value) : [];
}

function splitList(value: string): string[] {
  return value
    .split(/\s*(?:;|\||\n)\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function firstText(row: JsonRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function uniqueStrings(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const value = raw.trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function mapEntityType(value?: string): string | null {
  const type = (value ?? "").toLowerCase();
  if (/person|individual/.test(type)) return "individual";
  if (/vessel|ship/.test(type)) return "vessel";
  if (/aircraft/.test(type)) return "aircraft";
  if (/entity|company|organisation|organization/.test(type)) return "entity";
  return null;
}

function toIsoDate(value?: string): string | null {
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  return null;
}

function asRecord(value: unknown): JsonRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : undefined;
}

function isRecord(value: JsonRecord | undefined): value is JsonRecord {
  return Boolean(value);
}
