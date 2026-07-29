// What a change to the classification would throw away.
//
// Several answers in the composer are conditioned by an earlier one. A service
// specialisation belongs to a service category; a subcategory belongs to a
// category; a territory list belongs to a coverage scope that takes countries;
// a whole family's commercial terms belong to that family. So changing the
// earlier answer invalidates the later ones, and the composer already drops
// them: `ClassifyStep` clears the subcategories when the category changes,
// `clearForeignClassification` empties a foreign family's terms, and
// `sanitiseSpecialisations` removes modes the new category has no question for.
//
// Dropping them is correct. Dropping them SILENTLY is not.
//
// A member who chose Freight forwarding, then answered Sea, Road, temperature
// controlled and perishable, then went back to change the category to Customs
// brokerage, lost four deliberate answers and was never told. The trail on the
// screen showed the new category and nothing else; the specialisations simply
// were not there any more. That is work destroyed without consent, and the
// member's only clue is an absence.
//
// This module answers one question - "what would this change discard?" - as a
// pure function over the draft, so the composer can ask BEFORE it writes and
// name exactly what is at stake. It decides nothing about the UI: it returns
// the facts that would be lost, and returns an empty list when a change is
// free, which is the common case and must never interrupt anybody.

import {
  serviceSubcategory,
  serviceCategoryNeedsCustomLabel,
} from "../taxonomy/services";
import {
  relationshipTerm,
  coverageScope,
  coverageScopeTakesCountries,
  partnerTypeNeedsCustomLabel,
} from "../taxonomy/distribution";
import { serviceSpecialisation, sanitiseSpecialisations } from "../taxonomy/service-terms";
import {
  distributionChannel,
  distributionCapability,
  distributionTiming,
} from "../taxonomy/distribution-terms";
import {
  serviceEngagementType,
  servicePricingBasis,
  serviceAvailability,
} from "../taxonomy/service-terms";
import { COUNTRIES } from "../countries";
import type { MarketFamily } from "../taxonomy/market";
import type { StructureDraft } from "./draft";
import { familyOf } from "./procedures/registry";

/**
 * One answer that a change would discard.
 *
 * `labelKey` is a suffix under `structure.field.` so the composer names the
 * fact the same way it named it when it asked. `value` is what the member
 * actually said, in words, because "you will lose your specialisation" is a
 * weaker warning than "you will lose Sea, Road, Temperature controlled".
 */
export type DiscardItem = {
  key: string;
  labelKey: string;
  value: string;
};

const trimmed = (v: string | null | undefined): string | null => {
  const t = (v ?? "").trim();
  return t.length > 0 ? t : null;
};

function labelsOf<T extends { label: string }>(
  keys: readonly string[],
  lookup: (key: string) => T | null,
): string | null {
  const labels = keys.map((k) => lookup(k)?.label).filter((l): l is string => !!l);
  return labels.length > 0 ? labels.join(", ") : null;
}

function countryNames(codes: readonly string[]): string | null {
  if (codes.length === 0) return null;
  return codes.map((c) => COUNTRIES.find((x) => x.code === c)?.name ?? c).join(", ");
}

const item = (key: string, labelKey: string, value: string | null): DiscardItem[] =>
  value ? [{ key, labelKey, value }] : [];

/* ------------------------------------------------------------------ */
/* Changing the service category                                       */
/* ------------------------------------------------------------------ */

/**
 * What changing the trade-service category would discard.
 *
 * The subcategories go because they belong to the old category. The
 * specialisations go only where the NEW category has no question for them:
 * changing from Freight to Customs loses Sea and Road, but changing between two
 * categories that share a dimension keeps the shared answers, and warning about
 * an answer that survives would be a false alarm.
 *
 * The written label goes only when the old category was the Other escape route
 * and the new one is not, because that is when the member's own wording stops
 * being the record's classification.
 */
export function discardedByServiceCategoryChange(
  draft: StructureDraft,
  nextCategory: string | null,
): DiscardItem[] {
  if (draft.serviceCategory === nextCategory) return [];

  const out: DiscardItem[] = [
    ...item(
      "serviceSubcategory",
      "serviceSubcategory",
      labelsOf(draft.serviceSubcategories, serviceSubcategory),
    ),
  ];

  const kept = sanitiseSpecialisations(nextCategory, draft.serviceTerms.specialisationKeys);
  const lost = draft.serviceTerms.specialisationKeys.filter((k) => kept.indexOf(k) < 0);
  out.push(
    ...item("serviceSpecialisation", "serviceSpecialisation", labelsOf(lost, serviceSpecialisation)),
  );

  // The member's own wording survives a change between two Other-style
  // categories; it is only lost when the new category names the thing itself.
  if (
    serviceCategoryNeedsCustomLabel(draft.serviceCategory) &&
    !serviceCategoryNeedsCustomLabel(nextCategory)
  ) {
    out.push(...item("customLabel", "serviceCategory", trimmed(draft.customCategoryLabel)));
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* Changing the distribution partner type and coverage                 */
/* ------------------------------------------------------------------ */

/** What changing the partner type would discard. */
export function discardedByPartnerTypeChange(
  draft: StructureDraft,
  nextType: string | null,
): DiscardItem[] {
  if (draft.distributionPartnerType === nextType) return [];
  if (
    partnerTypeNeedsCustomLabel(draft.distributionPartnerType) &&
    !partnerTypeNeedsCustomLabel(nextType)
  ) {
    return item("customLabel", "partnerType", trimmed(draft.customCategoryLabel));
  }
  return [];
}

/**
 * What changing the coverage scope would discard.
 *
 * Only a move to a scope that takes no countries loses the territory list.
 * Moving between One country and Several countries keeps it, which is the
 * common correction and must stay frictionless.
 */
export function discardedByCoverageScopeChange(
  draft: StructureDraft,
  nextScope: string | null,
): DiscardItem[] {
  if (draft.coverageScope === nextScope) return [];
  if (coverageScopeTakesCountries(nextScope)) return [];
  return item("territoryCodes", "coverage", countryNames(draft.territoryCodes));
}

/* ------------------------------------------------------------------ */
/* Changing the family                                                 */
/* ------------------------------------------------------------------ */

/**
 * What moving this draft to another market family would discard.
 *
 * Every answer that belongs to the family being left. This is the largest
 * discard the composer can perform and the one the member is least likely to
 * expect: a completed trade-service record moved to Distribution keeps its
 * validity, role and note, and loses its category, its subcategories and all
 * eight of its service terms, because none of them is a fact a distribution
 * record has.
 *
 * `clearForeignClassification` performs the drop at the submit boundary. This
 * names it first, in the same order the member answered it, so the warning
 * reads as an account of their own work rather than a list of field names.
 */
export function discardedByFamilyChange(
  draft: StructureDraft,
  nextFamily: MarketFamily,
): DiscardItem[] {
  const current = familyOf(draft);
  if (current === nextFamily) return [];

  const out: DiscardItem[] = [];

  if (current === "services") {
    const t = draft.serviceTerms;
    out.push(
      ...item("serviceSubcategory", "serviceSubcategory", labelsOf(draft.serviceSubcategories, serviceSubcategory)),
      ...item("serviceScope", "serviceScope", trimmed(t.scope)),
      ...item("serviceCoverage", "serviceCoverage", countryNames(t.coverageCountries) ?? trimmed(t.tradeLanes)),
      ...item("serviceSpecialisation", "serviceSpecialisation", labelsOf(t.specialisationKeys, serviceSpecialisation)),
      ...item("serviceEngagement", "serviceEngagement", serviceEngagementType(t.engagement)?.label ?? null),
      ...item("serviceCapability", "serviceCapability", trimmed(t.capability)),
      ...item("servicePricingBasis", "servicePricingBasis", servicePricingBasis(t.pricingBasis)?.label ?? null),
      ...item("serviceAvailability", "serviceAvailability", serviceAvailability(t.availability)?.label ?? null),
    );
  }

  if (current === "distribution") {
    const t = draft.distributionTerms;
    out.push(
      ...item("relationship", "relationship", labelsOf(draft.distributionRelationshipTerms, relationshipTerm)),
      ...item("coverage", "coverage", coverageScope(draft.coverageScope)?.label ?? countryNames(draft.territoryCodes)),
      ...item("distributionObjective", "distributionObjective", trimmed(t.objective)),
      ...item("distributionProductScope", "distributionProductScope", trimmed(t.productScope)),
      ...item("distributionChannels", "distributionChannels", labelsOf(t.channelKeys, distributionChannel)),
      ...item("distributionCapabilities", "distributionCapabilities", labelsOf(t.capabilityKeys, distributionCapability)),
      ...item("distributionExpectations", "distributionExpectations", trimmed(t.commercialExpectations)),
      ...item("distributionTiming", "distributionTiming", distributionTiming(t.timing)?.label ?? null),
    );
  }

  if (current === "products") {
    out.push(
      ...item("product", "product", trimmed(draft.product)),
      ...item("hsCode", "hsCode", trimmed(draft.hsCode) ? `HS ${draft.hsCode}` : null),
      ...item("quantity", "quantity", draft.quantity !== null ? String(draft.quantity) : null),
      ...item("origin", "origin", trimmed(draft.origin)),
      ...item("destination", "destination", trimmed(draft.destination)),
      ...item("incoterm", "incoterm", trimmed(draft.incoterm)),
    );
  }

  return out;
}

/**
 * Is this change worth stopping the member for?
 *
 * One predicate, so the composer cannot decide differently in two places. An
 * empty list is a free change and must pass straight through: interrupting a
 * member who has answered nothing yet teaches them to dismiss the warning
 * without reading it, which is worse than not having one.
 */
export function isMeaningfulDiscard(items: readonly DiscardItem[]): boolean {
  return items.length > 0;
}
