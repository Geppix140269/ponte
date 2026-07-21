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
  attribution?: string;
  checkedAt: string;
};

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
 * officers come back too, several matches return available:false because
 * picking between them is a judgement call and this module does not make
 * judgements.
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
    return {
      source: search.source,
      available: false,
      reason: `${search.matches.length} companies match that name in ${sourceLabel(search.source)}, a registration number is needed to identify the subject`,
      companyName: name,
      attribution: search.attribution,
      checkedAt: search.checkedAt,
      raw: { candidates: search.matches.map(candidateSummary) },
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

function candidateSummary(match: RegistryResult) {
  return {
    companyName: match.companyName,
    regNumber: match.regNumber,
    status: match.status,
    incorporationDate: match.incorporationDate,
    address: match.address,
  };
}
