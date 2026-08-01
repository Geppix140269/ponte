// The publication eligibility validator.
//
// ONE place decides whether a listing may go public. Not the composer, not the
// submit route, not the admin screen, not a copy string: here. The composer
// asks it what is still open, the submit route asks it whether to publish, the
// emails render its issues, and the admin console shows what it could not
// resolve. Anything that disagrees with this module is wrong by definition.
//
// It COMPOSES the existing publication gate rather than replacing it. The gate
// (publication-gate.ts) remains the authority on who the submitter is and
// whether the record carries its required facts and public text; this module
// adds the conditional-by-family field rules, the member declaration, the
// automated safety pass, the recommendations and the completeness score, and
// turns all of it into one answer.
//
// Two rules govern the wording of everything it returns:
//
//   - A blocking issue names the exact field and says what to do. "Failed
//     validation" tells a member nothing and is banned here.
//   - A recommendation is never dressed as a requirement, and a complete
//     listing is never described as a verified one. Completeness is a measure
//     of how much the member stated. It is not evidence that any of it is true.

import { normaliseMarketFamily } from "../taxonomy/market";
import { checkPublicationGate, type GateListing, type GateSubmitter } from "./publication-gate";
import { roleNeedsChain } from "./approval-minimum";
import { isListingCurrent } from "./validity";
import { runSafetyChecks, flagsBlockPublication, type SafetyFlag, type SafetyInput } from "./safety";
import {
  quantityFromRow, validateQuantity, type ListingQuantity,
} from "./quantity";

/** A single thing wrong, or a single thing that would help. */
export type ValidationIssue = {
  /** The field or rule. Stable, machine-readable, safe for analytics. */
  code: string;
  /** The form field this resolves at, when there is one. */
  field?: string;
  /** One sentence, addressed to the member, saying exactly what is needed. */
  message: string;
};

export type ListingValidationResult = {
  publishable: boolean;
  blockingIssues: ValidationIssue[];
  recommendations: ValidationIssue[];
  flags: SafetyFlag[];
  /** 0-100. How much of the useful record the member stated. Not a trust score. */
  completenessScore: number;
};

/**
 * The market family a listing belongs to, which decides which rules apply.
 *
 * This is the canonical taxonomy family carried on the record. A listing that
 * predates it is read from the legacy `type`: `service` is a trade service and
 * anything else is a product, which is what those rows have always meant.
 *
 * Getting this wrong is the failure the brief calls out by name: forcing an HS
 * classification or a shipped quantity onto a trade service or a distribution
 * agreement invents a fact the listing does not have and blocks a legitimate
 * member from publishing.
 */
export type ListingFamily = "products" | "trade_services" | "distribution";

export function familyOf(listing: {
  market_family?: string | null;
  type?: string | null;
}): ListingFamily {
  // One boundary reconciles the two spellings and rejects anything else. This
  // module keeps `trade_services` as its OWN vocabulary, because its rule names
  // and issue codes are written in it; what it no longer does is decide for
  // itself which stored strings are legitimate.
  const family = normaliseMarketFamily(listing.market_family);
  if (family === "products") return "products";
  if (family === "services") return "trade_services";
  if (family === "distribution") return "distribution";
  // No family stored at all: a row predating the family columns. Its legacy
  // `type` is the only signal, and `service` has always meant a trade service.
  return listing.type === "service" ? "trade_services" : "products";
}

/** The stored listing this validator reads. */
export type EligibilityListing = GateListing & {
  market_family?: string | null;
  details?: string | null;
  key_notes?: string | null;
  origin?: string | null;
  destination?: string | null;
  hs_code?: string | null;
  incoterm?: string | null;
  indicative_value_usd?: number | string | null;
  quantity_mode?: string | null;
  quantity_min?: number | string | null;
  quantity_max?: number | string | null;
  /** When the member accepted the responsibility declaration. */
  declaration_accepted_at?: string | null;
  /** The declaration version they accepted. */
  declaration_version?: string | null;
  /**
   * A quantity read out of an uploaded document must be CONFIRMED by the member
   * before it publishes. Extraction is not a statement by anybody until the
   * person responsible for the listing says it is.
   */
  quantity_extracted?: boolean | null;
  quantity_confirmed_at?: string | null;
  /** Structured coverage, for the families that have no shipment route. */
  territory_codes?: string[] | null;
  coverage_scope_key?: string | null;
  service_terms?: {
    coverage_countries?: string[] | null;
    trade_lanes?: string | null;
    capability?: string | null;
    pricing_basis?: string | null;
    availability?: string | null;
  } | null;
  distribution_terms?: {
    objective?: string | null;
    product_scope?: string | null;
    channel_keys?: string[] | null;
    capability_keys?: string[] | null;
    timing?: string | null;
  } | null;
};

/** Everything outside the listing row the validator needs. */
export type EligibilityContext = {
  submitter: GateSubmitter;
  /** Counts the caller reads from adjacent tables. */
  mediaCount?: number;
  documentCount?: number;
  certificationCount?: number;
  duplicateOfRef?: string | null;
  abuseReportCount?: number;
  attachmentNames?: readonly string[];
  now?: number;
};

const has = (v: unknown): boolean =>
  v !== null && v !== undefined && String(v).trim() !== "";

// The declaration lives in its own module so the composer can render the exact
// terms this validator requires without importing the whole validator.
export { DECLARATION_VERSION, DECLARATION_TERMS } from "./declaration";

/* ------------------------------------------------------------------ */
/* Blocking rules, conditional by family                               */
/* ------------------------------------------------------------------ */

/**
 * The gate's own failures, translated into member-readable issues.
 *
 * The verification failures deliberately keep their force: the owner decision
 * of 28 July 2026 is that automated publication does not lower the member-
 * business bar, so an unverified member gets a blocking issue that routes them
 * to /verify rather than a listing that publishes unverified.
 */
function gateIssue(failure: string): ValidationIssue {
  if (failure.startsWith("missing:")) {
    const key = failure.slice("missing:".length);
    return { code: `missing_${key}`, field: key, message: `Add the ${key.replace(/_/g, " ")}.` };
  }
  switch (failure) {
    case "no_verified_business":
    case "verification_not_member_business":
      return {
        code: "business_verification_required",
        field: "verification",
        message: "Complete your business verification. Ponte publishes member opportunities from verified businesses only.",
      };
    case "verification_not_passing":
    case "verification_not_current":
      return {
        code: "business_verification_not_current",
        field: "verification",
        message: "Your business verification is not currently active. Open verification to see what is outstanding.",
      };
    case "unresolved_sanctions":
      return {
        code: "sanctions_unresolved",
        field: "verification",
        message: "There is an unresolved sanctions screening result on your business. Ponte cannot publish until it is cleared.",
      };
    case "no_role":
      return { code: "missing_submitter_role", field: "submitter_role", message: "State your role in this trade." };
    case "no_public_qualification":
      return {
        code: "public_summary_unconfirmed",
        field: "desk_version",
        message: "Review and confirm the public summary of your listing.",
      };
    case "no_public_limitations":
      return {
        code: "public_limitations_unconfirmed",
        field: "desk_version",
        message: "Review and confirm what your listing does not claim.",
      };
    case "not_current":
      return { code: "missing_validity", field: "validity", message: "State how long this listing stays open." };
    default:
      return { code: failure, message: failure };
  }
}

/** Blocking rules this family adds beyond the gate. */
function familyBlockingIssues(
  listing: EligibilityListing,
  family: ListingFamily,
  quantity: ListingQuantity | null,
): ValidationIssue[] {
  const out: ValidationIssue[] = [];

  if (family === "products") {
    // A product listing needs a quantity BASIS. That is not the same as a
    // number: "on request" is a complete, publishable answer, and demanding a
    // figure from a member who has not fixed one produces an invented quantity.
    if (!quantity) {
      out.push({
        code: "missing_quantity_basis",
        field: "quantity",
        message: "State the quantity, or that it is negotiable or available on request.",
      });
    } else {
      for (const issue of validateQuantity(quantity)) {
        switch (issue) {
          case "unit_required":
            out.push({ code: "missing_unit", field: "unit", message: "Add the unit for the quantity you stated." });
            break;
          case "range_min_not_below_max":
            out.push({ code: "quantity_range_invalid", field: "quantity", message: "The lower quantity must be below the upper quantity." });
            break;
          case "range_bounds_required":
            out.push({ code: "quantity_range_incomplete", field: "quantity", message: "A quantity range needs both a lower and an upper figure." });
            break;
          case "value_not_positive":
            out.push({ code: "quantity_not_positive", field: "quantity", message: "The quantity must be greater than zero." });
            break;
          case "value_required":
            out.push({ code: "missing_quantity_value", field: "quantity", message: "Add the quantity figure." });
            break;
          default:
            out.push({ code: "quantity_invalid", field: "quantity", message: "Check the quantity you entered." });
        }
      }
    }

    // Where the goods come from. A product that ships from nowhere cannot be
    // assessed for duty, corridor or feasibility by anybody reading it.
    if (!has(listing.origin) && !has(listing.destination)) {
      out.push({
        code: "missing_corridor",
        field: "origin",
        message: "State at least one end of the route: where the goods ship from, or where they are needed.",
      });
    }
  }

  // A trade service and a distribution arrangement have NO shipped quantity and
  // NO HS classification. Neither is asked for, and neither is missing.
  if (family === "trade_services" || family === "distribution") {
    if (!has(listing.details)) {
      out.push({
        code: "missing_scope",
        field: "details",
        message: family === "trade_services"
          ? "Describe the service you offer or need."
          : "Describe the distribution or representation arrangement.",
      });
    }
    if (!hasCoverage(listing)) {
      out.push({
        code: "missing_coverage",
        field: family === "trade_services" ? "service_coverage" : "territory",
        message: "State the market or territory this covers.",
      });
    }
  }

  return out;
}

/**
 * Where a non-product record applies.
 *
 * Coverage used to be readable only from `origin`/`destination`, which are the
 * two ends of a shipment. A trade service has no shipment, so the only way it
 * could satisfy this rule was by borrowing the product route fields: which is
 * precisely the borrowing the family procedures removed. Now that coverage has
 * its own structured fields, they are read first, and the route columns remain
 * accepted so no record created before this change becomes unpublishable.
 */
function hasCoverage(listing: EligibilityListing): boolean {
  if (has(listing.origin) || has(listing.destination)) return true;
  if ((listing.territory_codes ?? []).length > 0) return true;
  if (has(listing.coverage_scope_key)) return true;
  const service = listing.service_terms;
  if (service) {
    if ((service.coverage_countries ?? []).length > 0) return true;
    if (has(service.trade_lanes)) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Recommendations                                                     */
/* ------------------------------------------------------------------ */

/**
 * What would make this listing land better. None of it blocks publication, and
 * the copy never implies otherwise.
 */
function recommendationsFor(
  listing: EligibilityListing,
  family: ListingFamily,
  ctx: EligibilityContext,
): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const rec = (code: string, field: string, message: string) => out.push({ code, field, message });

  if (family === "products") {
    if (!has(listing.hs_code)) rec("hs_code", "hs_code", "Add the HS classification so buyers filtering by code can find this.");
    // The Incoterm is not here: ADR-0026 made it part of the minimum, and a
    // required field offered as advice reads as optional.
    if (!(ctx.mediaCount ?? 0)) rec("images", "media", "Add product images.");
    if (!has(listing.destination) || !has(listing.origin)) {
      rec("full_corridor", "destination", "State both ends of the route where you know them.");
    }
    // Demoted from the minimum by ADR-0026, so it earns percentage instead.
    if (!has(listing.frequency)) {
      rec("frequency", "frequency", "State how often this repeats, if it repeats.");
    }
  }

  if (!has(listing.payment_terms)) rec("payment_terms", "payment_terms", "State your payment terms, or that they are to be agreed.");
  if (!has(listing.key_notes)) rec("specifications", "key_notes", "Add technical specifications or key notes.");
  if (!(ctx.documentCount ?? 0)) rec("documents", "documents", "Attach supporting documents.");
  if (!(ctx.certificationCount ?? 0)) rec("certifications", "certifications", "List any certifications that apply.");
  if (!has(listing.indicative_value_usd)) rec("indicative_value", "indicative_value_usd", "Add an indicative value.");

  return out;
}

/* ------------------------------------------------------------------ */
/* Completeness                                                        */
/* ------------------------------------------------------------------ */

/**
 * How much of the useful record the member stated, 0-100.
 *
 * It is a COUNT, weighted, and nothing more. It moves ranking and search
 * visibility and it drives the prompts to improve a listing. It must never be
 * rendered as a trust, quality or verification signal, and the band labels
 * below are chosen so that no reading of them suggests Ponte checked anything.
 */
export function completenessScore(
  listing: EligibilityListing,
  family: ListingFamily,
  ctx: EligibilityContext = { submitter: {} as GateSubmitter },
): number {
  const quantity = quantityFromRow(listing);
  // Weight, and whether it is present. The required core carries most of the
  // score so that a publishable listing always reads as at least "Complete".
  const items: [number, boolean][] = [
    [12, has(listing.product)],
    [10, has(listing.details)],
    [8, has(listing.submitter_role)],
    [8, has(listing.payment_terms)],
    [8, has(listing.validity_type)],
    [8, has(listing.origin) || has(listing.destination)],
    [6, has(listing.key_notes)],
    [6, (ctx.documentCount ?? 0) > 0],
    [5, has(listing.indicative_value_usd)],
    [5, (ctx.certificationCount ?? 0) > 0],
  ];

  if (family === "products") {
    items.push(
      [10, quantity !== null && validateQuantity(quantity).length === 0],
      [7, has(listing.hs_code)],
      [7, has(listing.incoterm)],
      [6, (ctx.mediaCount ?? 0) > 0],
      [4, has(listing.origin) && has(listing.destination)],
    );
  } else if (family === "trade_services") {
    // A service listing is not penalised for the product-only fields it has no
    // business carrying. Its own depth is scored instead: what it covers, what
    // it can commit to, how it is charged for and when it is available.
    const service = listing.service_terms;
    items.push(
      [12, hasCoverage(listing)],
      [8, has(service?.capability)],
      [6, has(service?.pricing_basis)],
      [4, has(service?.availability)],
      [8, (ctx.mediaCount ?? 0) > 0],
      [6, String(listing.details ?? "").trim().length > 400],
    );
  } else {
    const distribution = listing.distribution_terms;
    items.push(
      [12, hasCoverage(listing)],
      [8, has(distribution?.objective)],
      [6, (distribution?.channel_keys ?? []).length > 0],
      [6, (distribution?.capability_keys ?? []).length > 0],
      [4, has(distribution?.timing)],
      [8, (ctx.mediaCount ?? 0) > 0],
    );
  }

  const total = items.reduce((s, [w]) => s + w, 0);
  const got = items.reduce((s, [w, ok]) => s + (ok ? w : 0), 0);
  return Math.round((got / total) * 100);
}

/**
 * Why the percentage matters, in the owner's own terms (ADR-0026).
 *
 * > remind the user that an incomplete entry has less chances to be invited to
 * > a deal room
 *
 * Exported so the composer, the workspace and the published-record email all
 * say the same thing. It is a statement about how counterparties choose, which
 * is true; it is not a threat, and it is never a fee. Nothing in it implies
 * Ponte withholds anything from an incomplete record, because it does not.
 */
export const COMPLETENESS_INCENTIVE =
  "A record that states more gets invited into more Deal Rooms. Counterparties open the ones they can act on.";

/** The band a completeness score falls in. Presentation only. */
export type CompletenessBand = "basic" | "complete" | "highly_detailed";

/**
 * The bands must be read against the PUBLISHABLE FLOOR, not against zero.
 *
 * `complete` began at 60. ADR-0026 promoted the Incoterm and one end of the
 * route into the minimum, which raised a bare-minimum product record from 58
 * to 65 - and pushed the floor itself into the "Complete" band. A member who
 * had stated the least the product will accept would have been told their
 * record was complete.
 *
 * That is not a labelling detail. The whole mechanism the owner asked for is
 * that the percentage gives a member a reason to state more, because "an
 * incomplete entry has less chances to be invited to a deal room". A floor
 * labelled Complete removes the reason.
 *
 * So the threshold sits above the floor by construction, and the test in
 * `__tests__/eligibility.test.ts` asserts the PROPERTY - a minimum-only record
 * is never banded above `basic` - rather than this number, so a future change
 * to the minimum fails there rather than quietly re-crossing the line.
 */
export function completenessBand(score: number): CompletenessBand {
  if (score >= 85) return "highly_detailed";
  if (score >= 70) return "complete";
  return "basic";
}

export function completenessBandLabel(band: CompletenessBand): string {
  switch (band) {
    case "highly_detailed": return "Highly detailed";
    case "complete": return "Complete";
    case "basic": return "Basic";
  }
}

/* ------------------------------------------------------------------ */
/* The validator                                                       */
/* ------------------------------------------------------------------ */

/**
 * Decide whether this listing may publish, and say exactly why not when it may
 * not.
 *
 * `publishable` is true only when there is nothing blocking AND no safety flag
 * holds. The two are reported separately because they mean different things to
 * the member: a blocking issue is theirs to fix, a flag is Ponte's to look at.
 */
export function evaluateListing(
  listing: EligibilityListing,
  ctx: EligibilityContext,
): ListingValidationResult {
  const now = ctx.now ?? Date.now();
  const family = familyOf(listing);
  const quantity = quantityFromRow(listing);

  const blockingIssues: ValidationIssue[] = [];
  const seen = new Set<string>();
  const push = (issue: ValidationIssue) => {
    if (seen.has(issue.code)) return;
    seen.add(issue.code);
    blockingIssues.push(issue);
  };

  // 1. The gate: submitter identity, verification, required facts, public text,
  //    validity. Its `missing:quantity/unit/frequency` failures are suppressed
  //    for the non-product families, which do not have those facts to give.
  const gate = checkPublicationGate(listing, ctx.submitter, now);
  if (!gate.ok) {
    // Business verification stops withholding a record. ADR-0027 and ADR-0028.
    //
    // The owner said it three times on 1 August 2026, the last time looking at
    // the composer screen that refused his own record:
    //
    //   > I do not verify free offer. People are free to publish. The only
    //   > threshold is that they have to put a minimum of information.
    //   > Otherwise they cannot be published.
    //
    // The 28 July rule this replaces was that automated publication does not
    // lower the member-business bar. That rule was made when publication was
    // the product's trust claim. It is not: publication is free and says
    // nothing about the business, and the trust claim is now carried by the
    // labels, which still emit "Business checked" ONLY where a verification
    // genuinely passed. So an unverified member publishes, and their record
    // does not wear a mark it has not earned.
    //
    // Sanctions are NOT in this set and never will be. An unresolved sanctions
    // screening is an unlawfulness question, not a completeness one.
    // The gate reports a quantity gap as one flat `missing:quantity`. This
    // module says which part of the quantity is wrong and in what way, so the
    // gate's verdict on those two keys is deferred to `familyBlockingIssues`
    // rather than reported twice in two different vocabularies.
    const ownedHere = new Set(["missing:quantity", "missing:unit"]);
    // Product facts. A trade service and a distribution arrangement have no
    // shipped quantity, no shipment route and no delivery basis, so they are
    // never short of one and must never be asked.
    //
    // `missing:route` and `missing:incoterm` joined this set the moment
    // ADR-0026 promoted them into the minimum. Without them a distribution
    // listing was refused for having no Incoterm, which is the exact failure
    // the family rules exist to prevent - inventing a fact the record does not
    // have and blocking a legitimate member with it.
    const productOnly = new Set([
      "missing:quantity",
      "missing:unit",
      "missing:frequency",
      "missing:route",
      "missing:incoterm",
    ]);
    const NO_LONGER_WITHHELD = new Set([
      "no_verified_business",
      "verification_not_member_business",
      "verification_not_passing",
      "verification_not_current",
    ]);
    for (const failure of gate.failures) {
      if (ownedHere.has(failure)) continue;
      if (family !== "products" && productOnly.has(failure)) continue;
      if (NO_LONGER_WITHHELD.has(failure)) continue;
      push(gateIssue(failure));
    }
  }

  // 2. The family's own rules.
  for (const issue of familyBlockingIssues(listing, family, quantity)) push(issue);

  // 3. The member's responsibility declaration. Ponte does not publish on
  //    somebody's behalf without them saying they are entitled to have it
  //    published.
  if (!has(listing.declaration_accepted_at)) {
    push({
      code: "declaration_required",
      field: "declaration",
      message: "Accept the listing declaration confirming the information is accurate and that you are authorised to submit it.",
    });
  }

  // 4. An extracted quantity is not a stated quantity until the member says so.
  if (listing.quantity_extracted === true && !has(listing.quantity_confirmed_at)) {
    push({
      code: "extracted_quantity_unconfirmed",
      field: "quantity",
      message: "Confirm the quantity read from your uploaded document before it is published.",
    });
  }

  // 5. The validity, re-checked here so an expired listing is never publishable
  //    even if the gate was satisfied at an earlier moment.
  if (!isListingCurrent(listing.validity_type, listing.valid_until, now)) {
    push({ code: "missing_validity", field: "validity", message: "State how long this listing stays open." });
  }

  const safetyInput: SafetyInput = {
    product: listing.product,
    details: listing.details,
    key_notes: listing.key_notes,
    origin: listing.origin,
    destination: listing.destination,
    attachmentNames: ctx.attachmentNames,
    duplicateOfRef: ctx.duplicateOfRef ?? null,
    abuseReportCount: ctx.abuseReportCount ?? 0,
  };
  const flags = runSafetyChecks(safetyInput);

  return {
    publishable: blockingIssues.length === 0 && !flagsBlockPublication(flags),
    blockingIssues,
    recommendations: recommendationsFor(listing, family, ctx),
    flags,
    completenessScore: completenessScore(listing, family, ctx),
  };
}

/**
 * The issue codes that are resolved at /verify, not on the listing form.
 *
 * This distinction is load-bearing. Verification is the ONE blocking issue a
 * member cannot fix by editing their listing, and before this existed the
 * needs-information screen and email both said "Complete your listing" and sent
 * them to the composer. A member whose only gap was verification was therefore
 * routed to a form containing nothing that could resolve it, with no mention of
 * verification anywhere on the path. That is a dead end, and it is the most
 * likely single blocker in practice: the 26 July probe recorded zero members
 * with a passing bound member-business verification.
 */
export const VERIFICATION_ISSUE_CODES: readonly string[] = [
  "business_verification_required",
  "business_verification_not_current",
  "sanctions_unresolved",
];

export function isVerificationIssue(issue: ValidationIssue): boolean {
  return VERIFICATION_ISSUE_CODES.includes(issue.code);
}

/**
 * Where a member with these blocking issues should be sent.
 *
 *   verification — every blocker is resolved at /verify. The listing itself is
 *                  complete, and saying otherwise would be false.
 *   listing      — no verification blocker; the composer resolves all of them.
 *   both         — a mix. The listing route leads, because the member can act
 *                  on it immediately, and the verification step is named
 *                  explicitly so it does not arrive as a surprise later.
 */
export type ResolutionRoute = "verification" | "listing" | "both";

export function resolutionRoute(issues: readonly ValidationIssue[]): ResolutionRoute {
  if (issues.length === 0) return "listing";
  const verification = issues.filter(isVerificationIssue).length;
  if (verification === issues.length) return "verification";
  if (verification === 0) return "listing";
  return "both";
}

/**
 * The status an evaluated listing lands in.
 *
 * The whole automated lifecycle in one expression, so no caller can invent a
 * fourth outcome. A safety flag outranks an incomplete record: a listing that
 * is both flagged and short of a field is a case for a person, not a form.
 */
export function outcomeStatus(
  result: ListingValidationResult,
): "approved" | "flagged" | "needs_information" {
  if (flagsBlockPublication(result.flags)) return "flagged";
  if (result.blockingIssues.length) return "needs_information";
  return "approved";
}
