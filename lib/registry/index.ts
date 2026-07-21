// Company registry adapters: shared types and dispatcher.
//
// Four sources, nothing else: UK Companies House, OpenCorporates, EU VIES,
// GLEIF. No customs data, no third party trade data, no AI. These files are
// pure data adapters: they fetch, normalize and report. They never decide a
// verdict, they never write to the database and they never throw for an
// upstream that is down.
//
// The pipeline stores the results in `verifications.registry`, `.vies` and
// `.gleif` (see supabase/migrations/20260721g_verification.sql).
//
// CONTRACT, read this before consuming a RegistryResult:
//
//   available === false
//     The source was NOT successfully checked. `reason` says why: no key
//     configured, timeout, rate limit, upstream fault, partial answer. The
//     pipeline must route the case to human review. Treating this as
//     "checked and clean" is the dangerous failure this module exists to
//     prevent.
//
//   available === true, status === "not_found"
//     The source WAS checked and holds no record for that input. That is a
//     finding, not a failure, and it is not a verdict either. The pipeline
//     decides what it means.
//
//   officers === undefined
//     The officer list was not obtained. Such a result is always returned
//     with available === false, because a company screened without its
//     officers has not really been screened.
//
//   officers === []
//     The officer list was obtained and the register lists nobody.

import * as companiesHouse from "./companies-house";
import * as openCorporates from "./opencorporates";

export type RegistryOfficer = {
  name: string;
  role?: string;
  appointedOn?: string;
};

/**
 * One name match, reduced to the fields a person needs to tell twenty
 * similarly named companies apart.
 *
 * Deliberately a flat, plain object: it is stored inside `verifications.registry`
 * as jsonb and read back by the member facing picker, so it must survive a JSON
 * round trip without losing meaning. No officers here: a search hit is not a
 * screened company.
 */
export type RegistryCandidate = {
  companyName?: string;
  regNumber?: string;
  status?: string;
  incorporationDate?: string;
  address?: string;
  /** OpenCorporates jurisdiction code, where the source supplies one. */
  jurisdiction?: string;
};

export type RegistryResult = {
  source: string;
  available: boolean;
  reason?: string;
  companyName?: string;
  regNumber?: string;
  status?: string;
  incorporationDate?: string;
  address?: string;
  officers?: RegistryOfficer[];
  /**
   * Set only when a name search matched more than one company. The subject is
   * not identified yet, so `available` is false and the pipeline asks the
   * member which one they meant instead of guessing.
   */
  candidates?: RegistryCandidate[];
  /**
   * How many the source said it holds, which can be larger than
   * `candidates.length` when the list was capped. Shown to the member so a cap
   * is stated rather than applied silently.
   */
  candidateTotal?: number;
  attribution?: string;
  checkedAt: string;
  raw?: unknown;
};

// Search returns many candidates, so it needs its own envelope. Same
// availability contract as RegistryResult.
export type RegistrySearchResult = {
  source: string;
  available: boolean;
  reason?: string;
  matches: RegistryResult[];
  /** What the source reported it holds in total, when it says. May exceed matches.length. */
  total?: number;
  attribution?: string;
  checkedAt: string;
};

/**
 * How many candidates travel back to the member.
 *
 * The sources are already asked for a page of twenty, so this is a ceiling and
 * not usually a cut. It exists so a source that one day returns hundreds
 * cannot push an unbounded list into a jsonb column and onto a page.
 */
export const MAX_REGISTRY_CANDIDATES = 25;

export type RegistryLookupInput = {
  country?: string | null;
  regNumber?: string | null;
  name?: string | null;
};

export { companiesHouse, openCorporates };
export { checkVat, VIES_COUNTRY_CODES } from "./vies";
export type { VatCheckResult } from "./vies";
export { lookupLei, searchLei } from "./gleif";
export type { GleifResult, GleifSearchResult } from "./gleif";

// Companies House covers Great Britain and Northern Ireland under one
// register, so both country spellings land in the same place.
const UK_COUNTRY_CODES = new Set(["GB", "UK", "GBR", "EN", "SC", "WA", "NI", "XI"]);

export function isUkCountry(country?: string | null): boolean {
  if (!country) return false;
  return UK_COUNTRY_CODES.has(country.trim().toUpperCase());
}

/**
 * Dispatch a registry lookup to the right source.
 *
 * Country GB or UK goes to Companies House, everything else goes to
 * OpenCorporates. A registration number is used when present. With a name
 * only, the source is searched: a single match is looked up in full so the
 * officers come back too, several matches return available:false with the
 * candidates attached, because picking between them is a judgement call and
 * this module does not make judgements. It hands the choice up instead.
 */
export async function lookupRegistry(
  input: RegistryLookupInput,
): Promise<RegistryResult> {
  const country = input.country?.trim() || "";
  const regNumber = input.regNumber?.trim() || "";
  const name = input.name?.trim() || "";
  const uk = isUkCountry(country);
  const source = uk ? "companies_house" : "opencorporates";

  if (!regNumber && !name) {
    return {
      source,
      available: false,
      reason: "registry not checked, neither a registration number nor a company name was supplied",
      checkedAt: new Date().toISOString(),
    };
  }

  if (regNumber) {
    return uk
      ? companiesHouse.lookupCompany(regNumber)
      : openCorporates.lookupCompany(regNumber, country);
  }

  const search = uk
    ? await companiesHouse.searchCompany(name)
    : await openCorporates.searchCompany(name, country);

  if (!search.available) {
    return {
      source: search.source,
      available: false,
      reason: search.reason,
      companyName: name,
      attribution: search.attribution,
      checkedAt: search.checkedAt,
    };
  }

  if (search.matches.length === 0) {
    return {
      source: search.source,
      available: true,
      status: "not_found",
      reason: `no company matching that name was found in ${sourceLabel(search.source)}`,
      companyName: name,
      attribution: search.attribution,
      checkedAt: search.checkedAt,
    };
  }

  if (search.matches.length > 1) {
    const candidates = search.matches
      .slice(0, MAX_REGISTRY_CANDIDATES)
      .map(candidateSummary);
    const total = Math.max(search.total ?? 0, search.matches.length);
    return {
      source: search.source,
      available: false,
      reason: `${total} companies match that name in ${sourceLabel(search.source)}, so the subject is not identified yet`,
      companyName: name,
      candidates,
      candidateTotal: total,
      attribution: search.attribution,
      checkedAt: search.checkedAt,
      raw: { candidates },
    };
  }

  const only = search.matches[0];
  const matchNote = "matched by company name, not by registration number";

  // Pull the full record so the officers come with it. A search hit alone
  // carries no officer list and would look like a company with no officers.
  if (only.regNumber) {
    const full = uk
      ? await companiesHouse.lookupCompany(only.regNumber)
      : await openCorporates.lookupCompany(only.regNumber, country);
    return { ...full, reason: full.reason ? `${full.reason}. ${matchNote}` : matchNote };
  }

  return {
    ...only,
    available: false,
    reason: `${matchNote}, and the search result carried no registration number, so the full record and its officers could not be retrieved`,
  };
}

/**
 * Names the sanctions screen has to run over.
 *
 * Deliberately returns the COMPANY NAME FIRST and then every officer name:
 * screening the company but not its directors, or the directors but not the
 * company, is the gap this helper closes. Names are trimmed, blanks dropped
 * and duplicates removed, case insensitively.
 *
 * If `officers` is undefined the officer list was never obtained, so this
 * returns the company name alone. Such results always carry
 * available === false, and the caller must not read the short list as
 * "this company has no officers".
 */
export function officerNames(result: RegistryResult | null | undefined): string[] {
  if (!result) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (value?: string) => {
    const name = value?.trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(name);
  };
  push(result.companyName);
  for (const officer of result.officers ?? []) push(officer.name);
  return out;
}

function sourceLabel(source: string): string {
  if (source === "companies_house") return "Companies House";
  if (source === "opencorporates") return "OpenCorporates";
  return source;
}

function candidateSummary(match: RegistryResult): RegistryCandidate {
  const raw = match.raw as { jurisdictionCode?: unknown } | undefined;
  const jurisdiction =
    typeof raw?.jurisdictionCode === "string" ? raw.jurisdictionCode : undefined;
  return {
    companyName: match.companyName,
    regNumber: match.regNumber,
    status: match.status,
    incorporationDate: match.incorporationDate,
    address: match.address,
    jurisdiction,
  };
}

/**
 * Read a candidate list back out of a stored `verifications.registry` blob.
 *
 * The column is jsonb, so what comes back is untyped. Everything is checked
 * rather than cast: a stored blob is data, and a picker that trusts it would
 * be trusting whatever a past run happened to write.
 */
export function readCandidates(registry: unknown): RegistryCandidate[] {
  const list = (registry as { candidates?: unknown } | null)?.candidates;
  if (!Array.isArray(list)) return [];
  const out: RegistryCandidate[] = [];
  for (const entry of list.slice(0, MAX_REGISTRY_CANDIDATES)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const row = entry as Record<string, unknown>;
    const text = (value: unknown) =>
      typeof value === "string" && value.trim() ? value.trim() : undefined;
    out.push({
      companyName: text(row.companyName),
      regNumber: text(row.regNumber),
      status: text(row.status),
      incorporationDate: text(row.incorporationDate),
      address: text(row.address),
      jurisdiction: text(row.jurisdiction),
    });
  }
  return out;
}

/**
 * Compare two registration numbers the way a register would: ignoring case,
 * spaces, punctuation and leading zeros, which members and sources both write
 * inconsistently. Used to confirm a chosen number really is one that was
 * offered, so this has to be forgiving about format and nothing else.
 */
export function sameRegNumber(a?: string | null, b?: string | null): boolean {
  const norm = (v?: string | null) =>
    (v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^0+/, "");
  const left = norm(a);
  return Boolean(left) && left === norm(b);
}
