import {
  serviceCategory,
  serviceSubcategory,
  serviceCategoryNeedsCustomLabel,
} from "../../taxonomy/services";
import {
  serviceSpecialisation,
  servicePricingBasis,
  serviceAvailability,
  serviceEngagementType,
  specialisationGroupsFor,
} from "../../taxonomy/service-terms";
import type { StructureDraft } from "../draft";
import { has, countryNames, labelsOf, trimmed } from "./shared";
import type {
  Blocker,
  CompletionField,
  FactBuckets,
  FamilyProcedure,
  ReviewModel,
  ReviewSection,
  ReviewRow,
  SubmissionReadiness,
} from "./types";

/**
 * The Trade Services procedure.
 *
 * A service has no shipped quantity, no unit, no packaging, no Incoterm and no
 * customs classification. It has a scope, a coverage, a specialisation, a
 * capability, an engagement basis and an availability. Those are different
 * facts, not the same facts under different names, and the difference is why
 * this file exists rather than a rename of the product queue.
 *
 * The requirement's negative assertions are structural here, not cosmetic:
 * `completionFields` never emits quantity, incoterm, origin or destination, so
 * they cannot be asked; `factBuckets` never lists them, so they cannot appear
 * as "Quantity · Add"; `blockers` never contains them, so an Incoterm can never
 * hold up a freight forwarder's publication; and `reviewModel` never builds a
 * row for them, so the review cannot print them as "Not stated".
 */

/**
 * The order the still-open facts are asked in.
 *
 * Scope first, because it is the fact a counterparty reads first and the one
 * everything else qualifies. Availability last before the shared three, because
 * it is the answer most likely to change.
 */
const QUEUE: readonly CompletionField[] = [
  "serviceScope",
  "serviceCoverage",
  "serviceSpecialisation",
  "serviceCapability",
  "servicePricingBasis",
  "serviceAvailability",
  "validity",
  "role",
  "note",
];

function fields(draft: StructureDraft): readonly CompletionField[] {
  // A category with no conditioned dimension is not asked about one. Asking
  // would present an empty control the member could not answer, and an
  // unanswerable question reads as a gap the member caused.
  const hasSpecialisation = specialisationGroupsFor(draft.serviceCategory).length > 0;
  return QUEUE.filter((f) => (f === "serviceSpecialisation" ? hasSpecialisation : true));
}

function isFilled(draft: StructureDraft, field: CompletionField): boolean {
  const terms = draft.serviceTerms;
  switch (field) {
    case "serviceScope": return has(terms.scope);
    // Coverage is stated by countries, by a corridor, or by both. A remote
    // advisory service genuinely covering no fixed territory answers with the
    // lanes field; requiring a country list would force an invented one.
    case "serviceCoverage": return terms.coverageCountries.length > 0 || has(terms.tradeLanes);
    case "serviceSpecialisation": return terms.specialisationKeys.length > 0;
    case "serviceCapability": return has(terms.capability);
    case "servicePricingBasis": return has(terms.pricingBasis);
    case "serviceAvailability": return has(terms.availability);
    case "validity": return has(draft.validity);
    case "role": return has(draft.role);
    case "note": return has(draft.note);
    default: return false;
  }
}

/** The service, named from the classification the member already chose. */
export function serviceSubject(draft: StructureDraft): string | null {
  const custom = trimmed(draft.customCategoryLabel);
  if (serviceCategoryNeedsCustomLabel(draft.serviceCategory)) return custom;
  const subs = labelsOf(draft.serviceSubcategories, serviceSubcategory);
  if (subs) {
    // A category's own "Other ..." subcategory names the gap, not the service,
    // so the member's wording is what a reader actually needs.
    return custom ? `${subs}: ${custom}` : subs;
  }
  return serviceCategory(draft.serviceCategory)?.label ?? custom;
}

function coverageValue(draft: StructureDraft): string | null {
  const countries = countryNames(draft.serviceTerms.coverageCountries);
  const lanes = trimmed(draft.serviceTerms.tradeLanes);
  if (countries && lanes) return `${countries} · ${lanes}`;
  return countries ?? lanes;
}

function validityValue(draft: StructureDraft): string | null {
  if (draft.validity === "standing") return "Open until withdrawn";
  if (typeof draft.validity === "number") return `${draft.validity} days`;
  return null;
}

/** Is the classification the member owes Ponte complete? */
function classificationOpen(draft: StructureDraft): boolean {
  if (serviceCategoryNeedsCustomLabel(draft.serviceCategory)) {
    return !has(draft.customCategoryLabel);
  }
  return !has(draft.serviceCategory) || draft.serviceSubcategories.length === 0;
}

export const servicesProcedure: FamilyProcedure = {
  family: "services",

  completionFields: fields,

  openGaps(draft) {
    return fields(draft).filter((f) => !isFilled(draft, f));
  },

  isFilled,

  factBuckets(draft): FactBuckets {
    const terms = draft.serviceTerms;
    const commercial: string[] = [];
    if (has(draft.canonical?.intent)) commercial.push("intent");
    if (has(serviceSubject(draft))) commercial.push("service");
    if (has(draft.serviceCategory)) commercial.push("serviceCategory");
    if (draft.serviceSubcategories.length > 0) commercial.push("serviceSubcategory");
    if (has(terms.scope)) commercial.push("serviceScope");
    if (isFilled(draft, "serviceCoverage")) commercial.push("serviceCoverage");
    if (terms.specialisationKeys.length > 0) commercial.push("serviceSpecialisation");
    if (has(terms.capability)) commercial.push("serviceCapability");
    if (has(terms.pricingBasis)) commercial.push("servicePricingBasis");
    if (has(terms.availability)) commercial.push("serviceAvailability");
    if (has(terms.engagement)) commercial.push("serviceEngagement");
    if (has(draft.validity)) commercial.push("validity");

    // Only facts a trade service HAS. Quantity and Incoterm are not open
    // questions here; they are not questions at all.
    const missing = fields(draft).filter(
      (f) => f !== "note" && !isFilled(draft, f),
    );

    return {
      commercial,
      missing,
      evidence: ["serviceAuthority"],
      keptPrivate: ["identity", "exactCompany"],
    };
  },

  blockers(draft): Blocker[] {
    const out: Blocker[] = [];
    // The classification is resolved upstream, in the category step, so it has
    // no completion field to open. It is still reported: a member must be told
    // what is holding their record, not only the parts of it this screen can fix.
    if (classificationOpen(draft)) out.push({ key: "serviceClassification" });
    if (!isFilled(draft, "serviceScope")) {
      out.push({ key: "serviceScope", resolve: "complete", field: "serviceScope" });
    }
    if (!isFilled(draft, "serviceCoverage")) {
      out.push({ key: "serviceCoverage", resolve: "complete", field: "serviceCoverage" });
    }
    if (!has(draft.validity)) out.push({ key: "validity", resolve: "complete", field: "validity" });
    // The publication gate requires a declared role from every family, so the
    // composer reports it for every family. Telling a member they are ready and
    // then refusing to publish would be worse than asking.
    if (!has(draft.role)) out.push({ key: "role", resolve: "complete", field: "role" });
    out.push({ key: "businessVerification", resolve: "verify" });
    return out;
  },

  reviewModel(draft): ReviewModel {
    const terms = draft.serviceTerms;
    const rows: ReviewRow[] = [
      { key: "service", labelKey: "service", value: serviceSubject(draft) },
      { key: "serviceScope", labelKey: "serviceScope", value: trimmed(terms.scope), editField: "serviceScope" },
      { key: "serviceCoverage", labelKey: "serviceCoverage", value: coverageValue(draft), editField: "serviceCoverage" },
    ];

    // Conditioned rows exist only where the category has the dimension at all.
    if (specialisationGroupsFor(draft.serviceCategory).length > 0) {
      rows.push({
        key: "serviceSpecialisation",
        labelKey: "serviceSpecialisation",
        value: labelsOf(terms.specialisationKeys, serviceSpecialisation),
        editField: "serviceSpecialisation",
      });
    }

    rows.push(
      { key: "serviceCapability", labelKey: "serviceCapability", value: trimmed(terms.capability), editField: "serviceCapability" },
      { key: "servicePricingBasis", labelKey: "servicePricingBasis", value: servicePricingBasis(terms.pricingBasis)?.label ?? null, editField: "servicePricingBasis" },
      { key: "serviceAvailability", labelKey: "serviceAvailability", value: serviceAvailability(terms.availability)?.label ?? null, editField: "serviceAvailability" },
      { key: "validity", labelKey: "validity", value: validityValue(draft), editField: "validity" },
    );

    if (terms.engagement) {
      rows.splice(3, 0, {
        key: "serviceEngagement",
        labelKey: "serviceEngagement",
        value: serviceEngagementType(terms.engagement)?.label ?? null,
      });
    }

    return {
      family: "services",
      titleKey: "titleServices",
      publicSections: [{ key: "service", headingKey: "service", rows }],
      privateSections: [
        {
          key: "private",
          headingKey: null,
          rows: [
            { key: "role", labelKey: "role", value: trimmed(draft.role), editField: "role" },
            { key: "note", labelKey: "note", value: trimmed(draft.note), editField: "note" },
          ],
        },
      ],
    };
  },

  submissionReadiness(draft): SubmissionReadiness {
    const blockers = servicesProcedure.blockers(draft);
    return {
      ready: !blockers.some((b) => b.resolve === "complete") && !classificationOpen(draft),
      blockers,
    };
  },

  submitTerms(draft) {
    const terms = draft.serviceTerms;
    return {
      service_terms: {
        scope: terms.scope,
        engagement: terms.engagement,
        coverage_countries: terms.coverageCountries,
        trade_lanes: terms.tradeLanes,
        specialisation_keys: terms.specialisationKeys,
        capability: terms.capability,
        pricing_basis: terms.pricingBasis,
        availability: terms.availability,
      },
    };
  },

  detailClauses(draft) {
    const terms = draft.serviceTerms;
    const out: string[] = [];
    if (has(terms.scope)) out.push(`Service scope: ${terms.scope!.trim()}.`);
    const engagement = serviceEngagementType(terms.engagement)?.label;
    if (engagement) out.push(`Engagement: ${engagement}.`);
    const countries = countryNames(terms.coverageCountries);
    if (countries) out.push(`Coverage: ${countries}.`);
    if (has(terms.tradeLanes)) out.push(`Trade lanes: ${terms.tradeLanes!.trim()}.`);
    const specialisations = labelsOf(terms.specialisationKeys, serviceSpecialisation);
    if (specialisations) out.push(`Specialisation: ${specialisations}.`);
    // Written as a capability, never as a quantity. A record that said
    // "Quantity: 40 containers" about a forwarder's monthly throughput would be
    // read on the board as 40 containers of goods for sale.
    if (has(terms.capability)) out.push(`Service capability: ${terms.capability!.trim()}.`);
    const pricing = servicePricingBasis(terms.pricingBasis)?.label;
    if (pricing) out.push(`Engagement basis: ${pricing}.`);
    const availability = serviceAvailability(terms.availability)?.label;
    if (availability) out.push(`Availability: ${availability}.`);
    return out;
  },
};
