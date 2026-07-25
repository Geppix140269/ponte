// The K07 evidence receipt: a pure mapping from a completed verification case
// to a dated, source-named record of what was checked and what remains unknown.
//
// Two rules are load bearing and enforced here by construction:
//   1. Trust is dated evidence, never a score. This module emits no numeric
//      score and no generic "verified" badge. Each line states what was checked,
//      against which named source, on what date, and the plain result.
//   2. It never overclaims. The pipeline screens the company and its named
//      directors and officers against the sanctions lists; it does not establish
//      beneficial ownership. The receipt says exactly that, and the "what
//      remains unknown" section names it.
//
// Pure and dependency-free so it is unit tested in isolation.

import type { VerificationCase } from "@/lib/verification/decision-notes";

/** The plain result of one check. Deliberately not a score and not a badge. */
export type CheckResult =
  | "confirmed" // the record exists and matches
  | "no_match" // screened, nothing found (the good sanctions outcome)
  | "possible_match" // screened, a possible hit to review
  | "not_confirmed" // the source was reached but held no confirming record
  | "unavailable"; // the source could not be reached, so nothing was checked

export type ReceiptCheck = {
  key: string;
  /** What was checked, e.g. "Company on the register". */
  label: string;
  /** The named source, e.g. "Companies House", or null when none applies. */
  source: string | null;
  /** The date this was checked, "21 July 2026", or null when unknown. */
  checkedOn: string | null;
  result: CheckResult;
  /** A short plain-language detail, never a score. */
  detail?: string;
};

export type EvidenceReceipt = {
  subject: string;
  country: string | null;
  /** The date the checks ran, when any source reported one. */
  checkedOn: string | null;
  checks: ReceiptCheck[];
  /** The named sources actually consulted. */
  sources: string[];
  /** Explicit statements of what was not established. Always non-empty. */
  unknowns: string[];
};

const SOURCE_NAMES: Record<string, string> = {
  companies_house: "Companies House",
  opencorporates: "OpenCorporates",
  VIES: "the EU VIES service",
  GLEIF: "GLEIF",
};

/** Display names for the sanctions list identifiers. */
const SANCTIONS_NAMES: Record<string, string> = {
  OFAC_SDN: "OFAC SDN",
  OFAC_CONS: "OFAC Consolidated",
  EU_CFSL: "EU consolidated list",
  UN_SC: "UN Security Council",
  UK_OFSI: "UK OFSI",
  HMT: "UK HM Treasury",
};

function sourceName(source?: string): string {
  if (!source) return "the company register";
  return SOURCE_NAMES[source] ?? source.replace(/_/g, " ");
}

function sanctionsName(code: string): string {
  return SANCTIONS_NAMES[code] ?? code.replace(/_/g, " ");
}

/** "2026-07-21T14:57:46Z" becomes "21 July 2026". An unusable value is dropped. */
function day(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The most recent date any source reported, so the receipt can be dated. */
function receiptDate(c: VerificationCase): string | null {
  const iso = [c.registry?.checkedAt, c.vies?.checkedAt, c.gleif?.checkedAt]
    .filter((v): v is string => typeof v === "string" && !Number.isNaN(new Date(v).getTime()))
    .sort()
    .pop();
  return day(iso ?? null);
}

/**
 * Build the dated evidence receipt for a completed verification case. Only the
 * checks that actually ran appear; each carries its named source and date.
 */
export function buildReceipt(c: VerificationCase): EvidenceReceipt {
  const checks: ReceiptCheck[] = [];
  const sources = new Set<string>();
  const unknowns: string[] = [];

  // --- Company registry -----------------------------------------------------
  if (c.registry) {
    const src = sourceName(c.registry.source);
    if (c.registry.available === false) {
      checks.push({
        key: "registry",
        label: "Company on the register",
        source: src,
        checkedOn: day(c.registry.checkedAt),
        result: "unavailable",
        detail: c.registry.reason ?? "The register could not be reached.",
      });
      unknowns.push(
        "Incorporation and registered status were not confirmed: the company register could not be reached.",
      );
    } else {
      sources.add(src);
      const found = c.registry.status && c.registry.status !== "not_found";
      checks.push({
        key: "registry",
        label: "Company on the register",
        source: src,
        checkedOn: day(c.registry.checkedAt),
        result: found ? "confirmed" : "not_confirmed",
        detail: found
          ? [c.registry.companyName, c.registry.regNumber && `No. ${c.registry.regNumber}`]
              .filter(Boolean)
              .join(", ") || undefined
          : "No matching company was found on the register.",
      });
      if (!found) {
        unknowns.push(
          "No matching company was found on the register for the name and country given.",
        );
      }
    }
  }

  // --- VAT (VIES) -----------------------------------------------------------
  if (c.vies) {
    if (c.vies.available === false) {
      checks.push({
        key: "vat",
        label: "VAT number",
        source: "the EU VIES service",
        checkedOn: day(c.vies.checkedAt),
        result: "unavailable",
        detail: c.vies.reason ?? "VIES could not be reached.",
      });
      unknowns.push("The VAT number was not confirmed: VIES could not be reached.");
    } else {
      sources.add("the EU VIES service");
      checks.push({
        key: "vat",
        label: "VAT number",
        source: "the EU VIES service",
        checkedOn: day(c.vies.checkedAt),
        result: c.vies.valid ? "confirmed" : "not_confirmed",
        detail: c.vies.valid
          ? c.vies.vatNumber ?? undefined
          : "The VAT number was not valid on VIES.",
      });
    }
  }

  // --- Legal entity identifier (GLEIF) --------------------------------------
  if (c.gleif && c.gleif.available !== false) {
    sources.add("GLEIF");
    const hasLei = Boolean(c.gleif.lei);
    checks.push({
      key: "lei",
      label: "Legal Entity Identifier",
      source: "GLEIF",
      checkedOn: day(c.gleif.checkedAt),
      result: hasLei ? "confirmed" : "not_confirmed",
      detail: hasLei ? c.gleif.lei ?? undefined : "No LEI is registered for this entity.",
    });
  }

  // --- Sanctions: the company and its directors/officers --------------------
  // Named directors/officers are screened, NOT beneficial owners. The label and
  // the unknowns say exactly that; nothing here implies ownership was traced.
  if (c.sanctions_hits) {
    const screened = (c.sanctions_hits.screened ?? []).map(sanctionsName);
    for (const s of screened) sources.add(s);
    const strong = c.sanctions_hits.strongCount ?? 0;
    const clean = c.sanctions_hits.clean === true && strong === 0;
    checks.push({
      key: "sanctions",
      label: "Company and named directors/officers screened against sanctions lists",
      source: screened.length > 0 ? screened.join(", ") : null,
      checkedOn: receiptDate(c),
      result: clean ? "no_match" : "possible_match",
      detail: clean
        ? "No match on the lists screened."
        : `${strong} possible match${strong === 1 ? "" : "es"} to review.`,
    });
  }

  // Always stated: ownership is not established, and the receipt is not a guarantee.
  unknowns.push(
    "Beneficial ownership was not established; only the company and its named directors and officers were screened.",
  );
  unknowns.push(
    "This receipt records what was checked on the stated date. It is not a guarantee of the counterparty and does not remove the need for your own due diligence.",
  );

  return {
    subject: c.subject_name,
    country: c.subject_country ?? null,
    checkedOn: receiptDate(c),
    checks,
    sources: Array.from(sources),
    unknowns,
  };
}
