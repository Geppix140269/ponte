import {
  partnerType,
  relationshipTerm,
  coverageScope,
  coverageScopeTakesCountries,
  partnerTypeNeedsCustomLabel,
} from "../../taxonomy/distribution";
import {
  distributionChannel,
  distributionCapability,
  distributionTiming,
} from "../../taxonomy/distribution-terms";
import { PRODUCT_SECTORS } from "../../taxonomy/market";
import type { StructureDraft } from "../draft";
import { has, countryNames, labelsOf, trimmed, validityValue, statesOwnCapability, closingBlockers } from "./shared";
import type {
  Blocker,
  CompletionField,
  FactBuckets,
  FamilyProcedure,
  ReviewModel,
  ReviewSection,
  SubmissionReadiness,
} from "./types";

/**
 * The Distribution and representation procedure.
 *
 * A distribution opportunity refers to products; it is not a product sale.
 * Nobody is shipping anything yet, which is why there is no quantity, no unit,
 * no Incoterm, no packaging and no HS code in this file. What there is instead
 * is an objective, a product or sector scope, channels, capability, commercial
 * expectations and timing: the terms of a relationship.
 *
 * The three canonical intents share this procedure but not its emphasis. The
 * capability question is the clearest case: a member SEEKING a partner is
 * stating what the partner must bring, and a member OFFERING representation is
 * stating what they already have. Same field, same keys, opposite direction,
 * and the copy layer resolves which by intent rather than the record storing
 * two fields that can disagree.
 */

const QUEUE: readonly CompletionField[] = [
  "distributionObjective",
  "distributionProductScope",
  "distributionChannels",
  "distributionCapabilities",
  "distributionExpectations",
  "distributionTiming",
  "validity",
  "role",
  "note",
];

function fields(draft: StructureDraft): readonly CompletionField[] {
  // A member who is looking for products or brands to represent has not chosen
  // a product scope yet: finding one is the point of the record. The sector
  // they chose in the category step is the scope, so asking again would ask
  // them to name the thing they came here to find.
  const seeksBrands = draft.canonical?.intent === "seek_brands_or_products_to_represent";
  return QUEUE.filter((f) => (f === "distributionProductScope" ? !seeksBrands : true));
}

function isFilled(draft: StructureDraft, field: CompletionField): boolean {
  const terms = draft.distributionTerms;
  switch (field) {
    case "distributionObjective": return has(terms.objective);
    case "distributionProductScope": return has(terms.productScope) || has(draft.productSector);
    case "distributionChannels": return terms.channelKeys.length > 0;
    case "distributionCapabilities": return terms.capabilityKeys.length > 0;
    case "distributionExpectations": return has(terms.commercialExpectations);
    case "distributionTiming": return has(terms.timing);
    case "validity": return has(draft.validity);
    case "role": return has(draft.role);
    case "note": return has(draft.note);
    default: return false;
  }
}

/** The opportunity, named from the classification the member already chose. */
export function distributionSubject(draft: StructureDraft): string | null {
  const custom = trimmed(draft.customCategoryLabel);
  if (partnerTypeNeedsCustomLabel(draft.distributionPartnerType)) return custom;
  const type = partnerType(draft.distributionPartnerType)?.label ?? null;
  const sector = PRODUCT_SECTORS.find((s) => s.key === draft.productSector)?.label ?? null;
  if (type && sector) return `${type}, ${sector}`;
  return type ?? sector ?? custom;
}

function territoryValue(draft: StructureDraft): string | null {
  const scope = coverageScope(draft.coverageScope)?.label ?? null;
  const countries = countryNames(draft.territoryCodes);
  if (scope && countries) return `${scope} (${countries})`;
  return scope ?? countries;
}

/** What is in scope: the member's own wording, or the sector they chose. */
function productScopeValue(draft: StructureDraft): string | null {
  const stated = trimmed(draft.distributionTerms.productScope);
  const sector = PRODUCT_SECTORS.find((s) => s.key === draft.productSector)?.label ?? null;
  if (stated && sector) return `${stated} (${sector})`;
  return stated ?? sector;
}

/** Territory is stated when a scope was chosen, and named where it takes names. */
function territoryOpen(draft: StructureDraft): boolean {
  if (!has(draft.coverageScope)) return true;
  return coverageScopeTakesCountries(draft.coverageScope) && draft.territoryCodes.length === 0;
}

export const distributionProcedure: FamilyProcedure = {
  family: "distribution",

  completionFields: fields,

  openGaps(draft) {
    return fields(draft).filter((f) => !isFilled(draft, f));
  },

  isFilled,

  factBuckets(draft): FactBuckets {
    const terms = draft.distributionTerms;
    const commercial: string[] = [];
    if (has(draft.canonical?.intent)) commercial.push("intent");
    if (has(terms.objective)) commercial.push("distributionObjective");
    if (has(draft.distributionPartnerType)) commercial.push("partnerType");
    if (isFilled(draft, "distributionProductScope")) commercial.push("distributionProductScope");
    if (!territoryOpen(draft)) commercial.push("distributionTerritory");
    if (draft.distributionRelationshipTerms.length > 0) commercial.push("relationship");
    if (terms.channelKeys.length > 0) commercial.push("distributionChannels");
    if (terms.capabilityKeys.length > 0) commercial.push("distributionCapabilities");
    if (has(terms.commercialExpectations)) commercial.push("distributionExpectations");
    if (has(terms.timing)) commercial.push("distributionTiming");
    if (has(draft.validity)) commercial.push("validity");

    const missing: string[] = fields(draft).filter((f) => f !== "note" && !isFilled(draft, f));
    // Territory is chosen in the category step and has no completion field, so
    // it would otherwise never appear as a gap even when it is the one thing
    // holding the record.
    if (territoryOpen(draft)) missing.unshift("distributionTerritory");

    return {
      commercial,
      missing,
      evidence: ["distributionAuthority"],
      keptPrivate: ["identity", "exactCompany"],
    };
  },

  blockers(draft): Blocker[] {
    const out: Blocker[] = [];
    // Resolved upstream in the category step, so reported without a field: the
    // member is told what is outstanding even where this screen cannot fix it.
    if (!has(draft.distributionPartnerType)) out.push({ key: "distributionPartner" });
    if (!isFilled(draft, "distributionObjective")) {
      out.push({ key: "distributionObjective", resolve: "complete", field: "distributionObjective" });
    }
    if (!isFilled(draft, "distributionProductScope")) {
      out.push({ key: "distributionProductScope", resolve: "complete", field: "distributionProductScope" });
    }
    if (territoryOpen(draft)) out.push({ key: "distributionTerritory" });
    if (!has(draft.validity)) out.push({ key: "validity", resolve: "complete", field: "validity" });
    if (!has(draft.role)) out.push({ key: "role", resolve: "complete", field: "role" });
    out.push(...closingBlockers(draft));
    return out;
  },

  reviewModel(draft): ReviewModel {
    const terms = draft.distributionTerms;

    const opportunity: ReviewSection = {
      key: "opportunity",
      headingKey: "opportunity",
      rows: [
        { key: "distributionObjective", labelKey: "distributionObjective", value: trimmed(terms.objective), editField: "distributionObjective" },
        { key: "distributionProductScope", labelKey: "distributionProductScope", value: productScopeValue(draft), editField: "distributionProductScope" },
        { key: "distributionTerritory", labelKey: "distributionTerritory", value: territoryValue(draft) },
        { key: "partnerType", labelKey: "partnerType", value: partnerType(draft.distributionPartnerType)?.label ?? null },
        { key: "relationship", labelKey: "relationship", value: labelsOf(draft.distributionRelationshipTerms, relationshipTerm) },
      ],
    };

    const arrangement: ReviewSection = {
      key: "arrangement",
      headingKey: "arrangement",
      rows: [
        {
          key: "distributionChannels",
          // The review reads back in the same direction the question asked in.
          labelKey: statesOwnCapability(draft) ? "distributionChannelsOffered" : "distributionChannels",
          value: labelsOf(terms.channelKeys, distributionChannel),
          editField: "distributionChannels",
        },
        {
          key: "distributionCapabilities",
          labelKey: statesOwnCapability(draft)
            ? "distributionCapabilitiesOffered"
            : "distributionCapabilities",
          value: labelsOf(terms.capabilityKeys, distributionCapability),
          editField: "distributionCapabilities",
        },
        { key: "distributionExpectations", labelKey: "distributionExpectations", value: trimmed(terms.commercialExpectations), editField: "distributionExpectations" },
        { key: "distributionTiming", labelKey: "distributionTiming", value: distributionTiming(terms.timing)?.label ?? null, editField: "distributionTiming" },
        { key: "validity", labelKey: "validity", ...validityValue(draft), editField: "validity" },
      ],
    };

    return {
      family: "distribution",
      titleKey: "titleDistribution",
      publicSections: [opportunity, arrangement],
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
    const blockers = distributionProcedure.blockers(draft);
    return {
      ready: !blockers.some((b) => b.resolve === "complete") && !territoryOpen(draft),
      blockers,
    };
  },

  submitTerms(draft) {
    const terms = draft.distributionTerms;
    return {
      distribution_terms: {
        objective: terms.objective,
        product_scope: terms.productScope,
        channel_keys: terms.channelKeys,
        capability_keys: terms.capabilityKeys,
        commercial_expectations: terms.commercialExpectations,
        timing: terms.timing,
      },
    };
  },

  detailClauses(draft) {
    const terms = draft.distributionTerms;
    const out: string[] = [];
    if (has(terms.objective)) out.push(`Objective: ${terms.objective!.trim()}.`);
    if (has(terms.productScope)) out.push(`Products or brands in scope: ${terms.productScope!.trim()}.`);
    const channels = labelsOf(terms.channelKeys, distributionChannel);
    if (channels) {
      out.push(
        statesOwnCapability(draft)
          ? `Channels reached: ${channels}.`
          : `Channels the partner should reach: ${channels}.`,
      );
    }
    const capabilities = labelsOf(terms.capabilityKeys, distributionCapability);
    if (capabilities) {
      // Whose capability it is depends on which side the member is on, and the
      // record says which rather than leaving a reader to assume.
      //
      // A member seeking brands to represent is presenting THEIR OWN capability
      // to a brand that might appoint them. Reading their intent as "seeking",
      // which the first version did because the intent key begins with `seek_`,
      // wrote the exact opposite of the fact onto the record: a distributor
      // offering a national sales team was recorded as requiring one.
      out.push(
        statesOwnCapability(draft)
          ? `Capabilities offered: ${capabilities}.`
          : `Capabilities expected of the partner: ${capabilities}.`,
      );
    }
    // Named as an expectation of a relationship. An opening order stated here is
    // a term of the arrangement, and it is never a shipped quantity.
    if (has(terms.commercialExpectations)) {
      out.push(`Commercial expectations: ${terms.commercialExpectations!.trim()}.`);
    }
    const timing = distributionTiming(terms.timing)?.label;
    if (timing) out.push(`Timing: ${timing}.`);
    return out;
  },
};
