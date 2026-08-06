/**
 * `B03`-`B05` The listing so far: the record as one fact per line.
 *
 * ## The three tiers, and why the order is the work order
 *
 * Missing and uncertain rise above confirmed. Not for emphasis: a member
 * scanning down the screen is reading a queue, and the first thing they see
 * should be the thing that is stopping them. The live composer sorted by field
 * order, so a member with two gaps and seven answers read seven answers first.
 *
 *   1. `needed`   a decisive fact with no value. Loudest.
 *   2. `inferred` a value Ponte worked out rather than read. One tap to
 *                 confirm, one tap to change, and it says which it is.
 *   3. `read`     stated by the member, or read from what they gave. Quietest.
 *
 * ## Inferred is marked distinctly from read, and that is a data property
 *
 * Not a style. A quantity Ponte heard as "twenty four" could have been "twenty
 * four hundred", and a record that presents the two identically is asking the
 * member to proofread something they have no reason to think needs it. The
 * provenance travels on the fact, so a surface cannot render it as confirmed by
 * omission.
 *
 * ## Labels live here and not in the message catalogue
 *
 * `messages/en.json` is generated from `_fragments`, so a label added by hand
 * passes locally and fails CI. More to the point, these are field names on a
 * commercial record rather than marketing copy: a procedure returns a field
 * key, and exactly one table turns that key into the words a member reads.
 */

import type { StructureDraft } from "../structure/draft";
import { openGaps, isFilled, procedureFor, familyOf, draftQuantity } from "../structure/draft";
import type { CompletionField } from "../structure/procedures/types";

/**
 * The four states a fact can be in.
 *
 * `optional` exists because the first version had three and got this wrong:
 * anything with no value was marked `needed`, so the surface printed
 * "NOTES: NEEDED TO PUBLISH: Anything else a counterparty should know?" over
 * a field that is not needed to publish anything. A member reading that either
 * writes a note they did not want to write, or learns that Ponte's "needed"
 * label means nothing. Both are worse than the field not being there.
 *
 * A fact is `needed` if and only if the family's own procedure names it as an
 * open gap. Everything unstated and unrequired is `optional`, sits last, and
 * says so.
 */
export type FactTier = "needed" | "inferred" | "read" | "optional";

export interface Fact {
  field: CompletionField;
  /** The field's name, as a member reads it. */
  label: string;
  tier: FactTier;
  /** The stated value, or the question when nothing is stated. */
  value: string;
  /** Why this is being asked, on a needed fact. */
  ask?: string;
  /** Where an inferred value came from. Never omitted on an inferred fact. */
  provenance?: string;
}

/** Every field's name. One table; a surface that wrote its own would fork it. */
export const FIELD_LABEL: Readonly<Record<CompletionField, string>> = {
  quantity: "Quantity",
  origin: "Origin",
  destination: "Destination",
  incoterm: "Incoterms",
  payment: "Price basis",

  serviceScope: "Service",
  serviceEngagement: "Engagement",
  serviceCoverage: "Coverage",
  serviceSpecialisation: "Specialisation",
  serviceCapability: "Capacity held",
  servicePricingBasis: "Fee basis",
  serviceAvailability: "Turnaround",

  distributionObjective: "Objective",
  distributionProductScope: "Goods",
  distributionChannels: "Channels",
  distributionCapabilities: "Capabilities",
  distributionExpectations: "Commercial expectations",
  distributionTiming: "Term sought",

  validity: "Validity",
  role: "Capacity",
  note: "Notes",
};

/**
 * The question asked of a fact that has no value.
 *
 * A question, not a field name repeated. "Destination" tells a member nothing
 * they cannot see from the label; "Where can you deliver?" is answerable.
 */
export const FIELD_QUESTION: Readonly<Partial<Record<CompletionField, string>>> = {
  quantity: "How much, and how often?",
  origin: "Where does it ship from?",
  destination: "Where can you deliver?",
  incoterm: "On what terms?",
  payment: "How is the price quoted?",
  serviceScope: "What exactly do you do?",
  serviceEngagement: "How are you engaged?",
  serviceCoverage: "Where do you cover?",
  serviceSpecialisation: "What do you specialise in?",
  serviceCapability: "How much can you take on?",
  servicePricingBasis: "How is the fee quoted?",
  serviceAvailability: "How long from instruction?",
  distributionObjective: "What are you trying to arrange?",
  distributionProductScope: "What goods does this cover?",
  distributionChannels: "Through what channels?",
  distributionCapabilities: "What do you bring?",
  distributionExpectations: "What terms are you looking for?",
  distributionTiming: "Over what term?",
  validity: "How long should this stay open?",
  role: "What is your capacity on this?",
  note: "Anything else a counterparty should know?",
};

/** Why the fact is worth asking for. Never a scold, and never "required". */
export const FIELD_ASK: Readonly<Partial<Record<CompletionField, string>>> = {
  destination: "Choose one or more markets. This is what buyers filter on.",
  payment: "A basis, not a figure. The figure stays private until you choose to give it.",
  quantity: "A monthly or per-shipment capacity. A basis is an answer; a guess is not.",
  incoterm: "FOB, CIF, EXW and the rest. Chosen, not typed.",
  origin: "Where the goods actually ship from, not where your company is registered.",
  servicePricingBasis: "A basis, not a figure. The figure stays private until you give it.",
  serviceCoverage: "The markets you actually work in. This is what buyers filter on.",
  distributionExpectations: "Margin, exclusivity, minimums. What you are asking for.",
};

const has = (value: unknown): boolean =>
  value !== null && value !== undefined && String(value).trim() !== "";

/**
 * The value a field currently reads back as.
 *
 * Returns null where nothing is stated, so the caller decides between a value
 * and a question rather than this function inventing an empty string that
 * renders as a blank line.
 */
export function statedValue(draft: StructureDraft, field: CompletionField): string | null {
  switch (field) {
    case "quantity": {
      const quantity = draftQuantity(draft);
      if (!quantity) return null;
      const unit = quantity.unit ? ` ${quantity.unit}` : "";
      const frequency = quantity.frequency ? ` ${String(quantity.frequency).toLowerCase()}` : "";
      if (quantity.mode === "range" && quantity.minValue != null && quantity.maxValue != null) {
        return `${quantity.minValue}-${quantity.maxValue}${unit}${frequency}`;
      }
      if (quantity.value != null) return `${quantity.value}${unit}${frequency}`;
      // "Negotiable" and "On request" are commercial positions, not absences.
      return quantity.mode === "negotiable" ? "Negotiable" : "On request";
    }
    case "origin":
      return draft.origin;
    case "destination":
      return draft.destination;
    case "incoterm":
      return draft.incoterm;
    case "payment":
      return draft.payment;
    case "validity":
      if (draft.validity === "standing") return "Open until withdrawn";
      return typeof draft.validity === "number" ? `${draft.validity} days` : null;
    case "role":
      return draft.role;
    case "note":
      return draft.note;
    case "serviceScope":
      return draft.serviceTerms.scope;
    case "serviceEngagement":
      return draft.serviceTerms.engagement;
    case "serviceCoverage": {
      // Countries and lanes are one fact to a member reading the record back:
      // "where do you cover?" is answered by either, and a surface that showed
      // them as two lines would ask the same question twice.
      const countries = draft.serviceTerms.coverageCountries;
      const lanes = draft.serviceTerms.tradeLanes;
      if (countries.length > 0 && lanes) return `${countries.join(", ")} · ${lanes}`;
      if (countries.length > 0) return countries.join(", ");
      return lanes;
    }
    case "serviceSpecialisation":
      return draft.serviceTerms.specialisationKeys.length > 0
        ? `${draft.serviceTerms.specialisationKeys.length} stated`
        : null;
    case "serviceCapability":
      return draft.serviceTerms.capability;
    case "servicePricingBasis":
      return draft.serviceTerms.pricingBasis;
    case "serviceAvailability":
      return draft.serviceTerms.availability;
    case "distributionObjective":
      return draft.distributionTerms.objective;
    case "distributionProductScope":
      return draft.distributionTerms.productScope;
    case "distributionChannels":
      return draft.distributionTerms.channelKeys.length > 0
        ? `${draft.distributionTerms.channelKeys.length} stated`
        : null;
    case "distributionCapabilities":
      return draft.distributionTerms.capabilityKeys.length > 0
        ? `${draft.distributionTerms.capabilityKeys.length} stated`
        : null;
    case "distributionExpectations":
      return draft.distributionTerms.commercialExpectations;
    case "distributionTiming":
      return draft.distributionTerms.timing;
  }
}

/**
 * Which fields Ponte INFERRED rather than had stated.
 *
 * Carried on the flow rather than on the draft, because the draft is the record
 * and the record does not have a column for "Ponte guessed this". A member who
 * confirms an inferred fact removes it from this set, at which point the fact
 * is theirs and reads as confirmed.
 */
export type InferredSet = ReadonlySet<CompletionField>;

/**
 * The whole listing, in tier order.
 *
 * Needed first, then inferred, then read. Within a tier the family procedure's
 * own order is preserved, because that order is the procedure's statement about
 * which of its facts is most decisive.
 */
export function factsFor(
  draft: StructureDraft,
  inferred: InferredSet,
  provenance: Readonly<Partial<Record<CompletionField, string>>> = {},
): Fact[] {
  const procedure = procedureFor(draft);
  const fields = procedure.completionFields(draft);
  /*
    `openGaps` is every completion field with no value. `factBuckets().missing`
    is the family procedure's own statement of which of those are worth ASKING
    for, and all three procedures already exclude `note` from it. The products
    procedure says why, in its own words:

      > Not every open field is a gap worth surfacing: a note never is, and the
      > end of the route this member does not decide never is.

    Reading `openGaps` alone printed "NOTES: NEEDED TO PUBLISH" over a field
    that is needed to publish nothing, and it also asked a seller for the
    destination the buyer decides. The rule already existed; this reads it
    instead of inventing a second one that would disagree.
  */
  const gaps = new Set<string>(procedure.factBuckets(draft).missing);
  const unstated = new Set<CompletionField>(openGaps(draft));

  const needed: Fact[] = [];
  const uncertain: Fact[] = [];
  const read: Fact[] = [];
  const optional: Fact[] = [];

  for (const field of fields) {
    const label = FIELD_LABEL[field];
    const value = statedValue(draft, field);

    if (!has(value) || unstated.has(field)) {
      // Required is what the PROCEDURE says is required. Not "has no value".
      const tier: FactTier = gaps.has(field) ? "needed" : "optional";
      const fact: Fact = {
        field,
        label,
        tier,
        value: FIELD_QUESTION[field] ?? `State the ${label.toLowerCase()}`,
        ask: tier === "needed" ? FIELD_ASK[field] : undefined,
      };
      (tier === "needed" ? needed : optional).push(fact);
      continue;
    }

    if (inferred.has(field)) {
      uncertain.push({
        field,
        label,
        tier: "inferred",
        value: value as string,
        // Never omitted. An inferred fact with no provenance is a fact
        // presented as uncertain with no way for the member to judge it.
        provenance: provenance[field] ?? "Worked out by Ponte, not read from anything you gave it.",
      });
      continue;
    }

    read.push({ field, label, tier: "read", value: value as string });
  }

  return [...needed, ...uncertain, ...read, ...optional];
}

export interface FactCounts {
  needed: number;
  inferred: number;
  confirmed: number;
}

export function countFacts(facts: readonly Fact[]): FactCounts {
  return {
    needed: facts.filter((f) => f.tier === "needed").length,
    inferred: facts.filter((f) => f.tier === "inferred").length,
    confirmed: facts.filter((f) => f.tier === "read").length,
  };
}

/**
 * The statement at the top of the surface, in this family's own words.
 *
 * "The listing so far" for every family, because it is the same surface doing
 * the same job; what changes underneath is which facts it holds. A family-
 * specific heading here would suggest three screens where there is one.
 */
export const LISTING_SO_FAR = "The listing so far";

/**
 * The sub-line under the primary action, naming what still blocks publication.
 *
 * Blockers come from the family procedure, so a trade service is never told an
 * Incoterm is holding it and a distribution opportunity is never told it is
 * short of a shipped quantity. That was the defect the family split fixed and
 * this is where it would come back if the count were computed here instead.
 */
export function outstandingSentence(draft: StructureDraft): string | null {
  const count = decisiveGaps(draft).length;
  if (count === 0) return null;
  return `${count} fact${count === 1 ? "" : "s"} still needed before it can publish`;
}

/**
 * The gaps that actually hold this record, by the family procedure's own count.
 *
 * Not `openGaps`, which includes the optional note. A member told "8 facts
 * still needed" who then finds that one of them is a note they do not want to
 * write has been given a number they cannot reach.
 */
export function decisiveGaps(draft: StructureDraft): readonly string[] {
  return procedureFor(draft).factBuckets(draft).missing;
}

/** Is every decisive fact of this family's procedure stated? */
export function everyFactStated(draft: StructureDraft): boolean {
  return decisiveGaps(draft).length === 0;
}

/** Re-exported so a surface reads one module rather than three. */
export { isFilled, familyOf };
