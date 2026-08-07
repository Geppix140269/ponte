/**
 * The Structure & Submit draft: the model a visitor builds by tapping, and the
 * pure rules over it. No database, no Next, no server imports, so the whole
 * thing is unit-tested standalone under tsx.
 *
 * Three rules from the brief live here:
 *   - Tap, not type. The commercial record is built from selectable values; the
 *     ONLY free text is the optional paste and the optional note. `details` (the
 *     one field the submit API requires as text) is SYNTHESISED from the facts,
 *     so no step ever requires typing to proceed. synthesiseDetails is the proof.
 *   - Nothing invented. A fact absent from the draft stays absent everywhere:
 *     the buckets show it as a gap, the preview renders it "not stated", and the
 *     synthesised details omit it. Nothing is guessed to fill a hole.
 *   - Value before authentication. This is plain client state; it becomes a
 *     submit payload only at the gate, and the gate resumes it once.
 */

import { type QuantityMode } from "../listings/quantity";

export type { QuantityMode };

import {
  serviceCategory,
  serviceSubcategory,
  subcategoryBelongsTo,
  serviceCategoryNeedsCustomLabel,
} from "../taxonomy/services";
import {
  partnerType,
  relationshipTerm,
  coverageScope,
  coverageScopeTakesCountries,
  partnerTypeNeedsCustomLabel,
} from "../taxonomy/distribution";
import { sanitiseSpecialisations } from "../taxonomy/service-terms";
import { journeyFor, type ClassificationStep } from "../taxonomy/journey";
import { PRODUCT_SECTORS, type MarketFamily } from "../taxonomy/market";
import {
  procedureFor,
  procedureForFamily,
  familyOf as familyOfDraft,
  serviceSubject,
  distributionSubject,
} from "./procedures/registry";
import {
  emptyServiceTerms,
  emptyDistributionTerms,
  serviceTermsStated,
  distributionTermsStated,
  type Blocker,
  type CompletionField,
  type DistributionTerms,
  type FactBuckets,
  type ServiceTerms,
} from "./procedures/types";
import { draftQuantity as computeDraftQuantity, has } from "./procedures/shared";

export type { Blocker, CompletionField, FactBuckets, ServiceTerms, DistributionTerms };
export { asksFor } from "./procedures/products";
export {
  procedureFor,
  procedureForFamily,
  askKeyFor,
  roleGroupsFor,
  statesOwnCapability,
} from "./procedures/registry";
export { FIELD_FAMILY, fieldBelongsTo } from "./procedures/types";
export type {
  FamilyProcedure,
  ReviewModel,
  ReviewRow,
  ReviewSection,
  SubmissionReadiness,
} from "./procedures/types";

export type Intent = "offer" | "requirement" | "service";

export const INTENTS: readonly Intent[] = ["offer", "requirement", "service"];

export function isIntent(v: unknown): v is Intent {
  return typeof v === "string" && (INTENTS as readonly string[]).includes(v);
}

/**
 * How long the offer or requirement stays open: a day count, or "standing" for
 * one with no end date. Both are real answers; null means undeclared.
 */
export type Validity = number | "standing";

export function isValidity(v: unknown): v is Validity {
  return v === "standing" || (typeof v === "number" && v > 0);
}

/**
 * The canonical market pair the member chose on the way in.
 *
 * `intent` below is the LEGACY vocabulary that `listings.type` accepts today
 * (`offer | requirement | service`, a check constraint). It cannot express
 * distribution at all, and it cannot tell a service request from a service
 * offer. So the canonical family and intent from `lib/taxonomy/market.ts` are
 * carried alongside it, unmodified, from the landing entrance through the
 * composer to the preview and into the submitted record.
 *
 * They are carried, not persisted to their own columns: `listings` has no
 * `market_family` or `market_intent` column, and adding one is a migration
 * that is out of scope here. `toSubmitPayload` therefore maps the canonical
 * intent onto a legal `type` AND writes the canonical pair into the record's
 * own text, so the member's actual choice survives on the record rather than
 * being silently reduced to one of three legacy values.
 */
export type CanonicalPair = {
  family: string;
  intent: string;
};

/**
 * The structured product Ponte resolved, carried onto the draft.
 *
 * Declared structurally rather than imported from `lib/products/model.ts` so
 * this module keeps its promise of importing nothing: it is unit-tested
 * standalone under tsx, and reaching into the product catalogue for a type
 * would drag the whole catalogue into that test for no gain. The shape is the
 * seven layers ADR requires preserved; `lib/products/model.ts` owns the
 * canonical definition and this is assignable from it.
 */
export type DraftResolution = {
  originalWording: string;
  normalised: string;
  productKey: string;
  synonyms: readonly string[];
  categoryPath: readonly string[];
  /** The ADR-0011 product sector key, derived rather than asked for. */
  sector: string;
  attributes: readonly { key: string; label: string; value: string }[];
  candidateHs: { code: string; description: string; confirmed: boolean } | null;
  searchText: string;
  searchTerms: readonly string[];
};

/**
 * The structured classification a record carries, kept in explicit fields.
 *
 * These exist because `product` was carrying four different things: a physical
 * product, a trade service, a distribution arrangement and, for anything that
 * was none of those, whatever prose the member typed into a blank box. A single
 * overloaded string cannot be filtered, matched, counted or searched, so a
 * member looking for ocean freight could not find a provider who had written
 * "sea shipping", and Ponte was asking members to do classification work that
 * Ponte should do.
 *
 * Every field here stores a STABLE KEY from `lib/taxonomy/`, never a label.
 * Labels are display and may be reworded; keys are the contract. Custom wording
 * lives in `customCategoryLabel` and never overwrites a key, so a record that
 * chose Other still carries `other` and remains countable alongside the rest.
 */
export type Classification = {
  /** Trade services: one primary category key. */
  serviceCategory: string | null;
  /** Trade services: one or more subcategory keys, all inside that category. */
  serviceSubcategories: string[];
  /** Distribution: one partner or channel type key. */
  distributionPartnerType: string | null;
  /** Distribution: how the arrangement is structured. Not a partner type. */
  distributionRelationshipTerms: string[];
  /** Distribution: where it applies, as a structured scope. */
  coverageScope: string | null;
  /** ISO-2 codes, stored as codes rather than only as prose. */
  territoryCodes: string[];
  /** Products, and distribution attached to what is being distributed. */
  productSector: string | null;
  /** The member's own wording, only when Other was chosen. Never a key. */
  customCategoryLabel: string | null;
  /** Optional context gathered after the structured selection. Never required. */
  additionalDetails: string | null;
};

export function emptyClassification(): Classification {
  return {
    serviceCategory: null,
    serviceSubcategories: [],
    distributionPartnerType: null,
    distributionRelationshipTerms: [],
    coverageScope: null,
    territoryCodes: [],
    productSector: null,
    customCategoryLabel: null,
    additionalDetails: null,
  };
}

/** The whole tapped record. Every commercial field is a selected value. */
export type StructureDraft = Classification & {
  /** The canonical family and intent, when the member entered through one. */
  canonical: CanonicalPair | null;
  intent: Intent | null;
  product: string | null;
  hsCode: string | null;
  /**
   * The member's commercial stance on quantity. Null until they choose one.
   *
   * This is the field whose absence caused the reported defect. The composer
   * rendered `draft.quantity ?? 10000` and the member read "10,000" as a value
   * they had been given; the draft still held null, so the submitted listing
   * carried no quantity at all. Only touching the stepper committed anything.
   *
   * A displayed default is now impossible: there is nothing to default TO until
   * a mode is picked, and picking a mode is an explicit act that writes state.
   */
  quantityMode: QuantityMode | null;
  /**
   * What Ponte understood about the product, when the member came through the
   * AI intake. Null for a record built by browsing the HS catalogue, which is
   * still a supported route and produces a product name and a code and nothing
   * more.
   *
   * Carried rather than persisted to its own column: `listings` has no field
   * for it, and adding one is a migration outside this change. It rides into
   * the submit payload and is written into the record's own text, exactly as
   * the canonical family and intent already are.
   */
  resolution: DraftResolution | null;
  /**
   * The other products from a multi-product document, when the member chose
   * separate drafts. Each becomes its own record; the terms are shared.
   */
  siblings: readonly DraftResolution[];
  /**
   * True when the member deliberately chose one combined multi-product supply
   * programme instead of separate records. A commercial decision, and theirs.
   */
  programme: boolean;
  /** The document the facts came from, by name. Never its bytes. */
  documentName: string | null;
  quantity: number | null;
  /** The two ends of a range. Only `range` reads them. */
  quantityMin: number | null;
  quantityMax: number | null;
  unit: string | null;
  frequency: string | null;
  origin: string | null;
  destination: string | null;
  incoterm: string | null;
  payment: string | null;
  /** A day count from a pill, or "standing"; a date is derived at submit. */
  validity: Validity | null;
  role: string | null;
  /** The one optional free-text note. */
  note: string | null;
  /**
   * The commercial terms a Trade Service actually has.
   *
   * Always present, always empty until stated, and NEVER read by another
   * family: `crossFamilyClassification` reports it as foreign on a products or
   * distribution draft and the sanitiser empties it at the storage boundary.
   * A service listing's throughput lives in `serviceTerms.capability`, never in
   * `quantity`, which is the distinction the whole family split turns on.
   */
  serviceTerms: ServiceTerms;
  /** The commercial terms a Distribution or representation opportunity has. */
  distributionTerms: DistributionTerms;
  /**
   * Whether the member has accepted the publication declaration.
   *
   * Ponte publishes automatically, so the member, not a reviewer, is the person
   * who states the record is accurate and that they are entitled to have it
   * published. `evaluateListing` has always blocked on this; until now nothing
   * in the composer asked for it or sent it, so every Start a Deal submission
   * was held for a reason the member never saw.
   */
  declarationAccepted: boolean;
};

export function emptyDraft(): StructureDraft {
  return {
    ...emptyClassification(),
    canonical: null,
    intent: null, product: null, hsCode: null,
    quantityMode: null, quantity: null, quantityMin: null, quantityMax: null,
    unit: null, frequency: null, origin: null, destination: null, incoterm: null,
    payment: null, validity: null, role: null, note: null,
    resolution: null, siblings: [], programme: false, documentName: null,
    serviceTerms: emptyServiceTerms(),
    distributionTerms: emptyDistributionTerms(),
    declarationAccepted: false,
  };
}

/**
 * Is this stored value actually a draft of the shape THIS build reads?
 *
 * A guard for one boundary only: a payload that was written by a different
 * build, or by a different flow, and has been sitting on the member's device
 * ever since. Everywhere else the draft is constructed here and can be trusted.
 *
 * It has to exist because a wrong shape is not a wrong VALUE, it is a crash.
 * `/publish` once stored its own wrapper (`{ node, draft, capacity, ... }`)
 * under the composer's key. `structureDirty` reads `draft.serviceSubcategories
 * .length` straight off whatever comes back, so a wrapper read as a flat draft
 * threw on the first dereference and took the whole route down. Separating the
 * keys stopped new wrappers being written; it could not reach the one already
 * on the device, so every member who had used `/publish` before that fix kept
 * hitting the same crash on every visit, with no way out but clearing their
 * browser storage.
 *
 * The array fields are the ones checked because they are the ones dereferenced
 * without a guard. A payload that fails is dropped rather than repaired: a
 * half-understood record is worse than a fresh one, and the member is one step
 * from re-entering what it held.
 */
export function isStructureDraft(value: unknown): value is StructureDraft {
  if (!value || typeof value !== "object") return false;
  const d = value as Partial<StructureDraft>;
  return (
    Array.isArray(d.serviceSubcategories) &&
    Array.isArray(d.distributionRelationshipTerms) &&
    Array.isArray(d.territoryCodes) &&
    Array.isArray(d.siblings) &&
    !!d.serviceTerms &&
    typeof d.serviceTerms === "object" &&
    !!d.distributionTerms &&
    typeof d.distributionTerms === "object"
  );
}

/**
 * The quantity on a draft, in the shared model.
 *
 * Defined in `procedures/shared.ts` and re-exported here so the draft's public
 * API is unchanged while the dependency runs one way: the procedures never
 * import back into this module at runtime.
 */
export const draftQuantity = computeDraftQuantity;

/**
 * The legacy `listings.type` a canonical intent maps onto.
 *
 * `listings.type` is constrained to ('offer','requirement','service'), so the
 * seven canonical intents have to land on three values. The mapping is by
 * COMMERCIAL SIDE, which is the part the constraint can actually express:
 * a demand-side record is a requirement, a supply-side record is an offer, and
 * a trade service keeps its own value because the schema already has one.
 *
 * Distribution is the case that proves why the canonical pair is carried
 * separately: "seek a distribution partner" and "offer market coverage" are
 * mapped here to `requirement` and `offer` so the row is storable, and neither
 * legacy value says anything about distribution. Only the canonical intent
 * does, which is why it travels with the record instead of being discarded at
 * this boundary.
 */
const LEGACY_TYPE_FOR_INTENT: Record<string, Intent> = {
  source_product: "requirement",
  offer_product: "offer",
  seek_trade_service: "service",
  offer_trade_service: "service",
  seek_distribution_partner: "requirement",
  offer_distribution_or_representation: "offer",
  seek_brands_or_products_to_represent: "requirement",
};

export function legacyTypeForIntent(intent: string): Intent | null {
  return LEGACY_TYPE_FOR_INTENT[intent] ?? null;
}

/**
 * Does this draft need an HS classification?
 *
 * Only a product record does. A trade service and a distribution arrangement
 * have no HS code, and forcing either through a six-digit drill-down to reach
 * a composer is how a real record acquires a false classification. The
 * composer reads this instead of deciding for itself, and `openGaps` and
 * `blockers` below never ask for a code the family does not have.
 */
export function needsHsCode(draft: StructureDraft): boolean {
  if (!draft.canonical) return true; // legacy product-shaped entry
  return draft.canonical.family === "products";
}

/**
 * Is this draft a member LOOKING for a product, rather than offering one?
 *
 * The composer has two ways of learning that and it was only reading one.
 *
 *   - A family entrance sets `canonical.intent` to `source_product`.
 *   - The composer's own three rows set `intent` to `"requirement"`.
 *
 * The product intake asked `draft.canonical?.intent === "source_product"` and
 * nothing else, so a member who arrived with no entrance, pressed "Source a
 * product" and watched the row take its selected treatment was then asked
 * "Tell Ponte what you SUPPLY, in your own words." The screen contradicted the
 * choice it had just accepted, which reads as the choice not registering - and
 * that is precisely how it was reported on 2 August 2026.
 *
 * The canonical pair wins where it exists, because it is the richer statement
 * and the one a resumed record carries. The legacy field answers otherwise.
 */
export function sourcingProduct(draft: StructureDraft): boolean {
  if (draft.canonical) return draft.canonical.intent === "source_product";
  return draft.intent === "requirement";
}

// ---------------------------------------------------------------------------
// Classification: what the record IS, chosen before anything is described
// ---------------------------------------------------------------------------

/** The family a draft belongs to, canonical when known and products otherwise. */
export const familyOf = familyOfDraft;

/**
 * A field that belongs to another family.
 *
 * The requirement is explicit that a Trade Service category must not be stored
 * under Distribution, and the reverse. This is enforced rather than trusted,
 * because the journeys share one draft object and one submit route, and a
 * back-navigation between families would otherwise leave the previous family's
 * answer attached to the new record. A stale key is worse than no key: it is a
 * classification nobody chose, and it would be filtered on.
 *
 * This now covers the COMMERCIAL fields as well as the classification ones. It
 * has to: the defect being fixed is that every family was carrying the product
 * commercial fields, so a draft that started as a product and became a service
 * would otherwise arrive at the submit route still holding a quantity, a unit
 * and an Incoterm: the exact values the service journey exists to stop
 * appearing on a service record.
 */
export function crossFamilyClassification(draft: StructureDraft): string[] {
  const family = familyOf(draft);
  const wrong: string[] = [];

  if (family !== "services") {
    if (has(draft.serviceCategory)) wrong.push("serviceCategory");
    if (draft.serviceSubcategories.length > 0) wrong.push("serviceSubcategories");
    if (serviceTermsStated(draft.serviceTerms)) wrong.push("serviceTerms");
  }
  if (family !== "distribution") {
    if (has(draft.distributionPartnerType)) wrong.push("distributionPartnerType");
    if (draft.distributionRelationshipTerms.length > 0) wrong.push("distributionRelationshipTerms");
    if (has(draft.coverageScope)) wrong.push("coverageScope");
    if (draft.territoryCodes.length > 0) wrong.push("territoryCodes");
    if (distributionTermsStated(draft.distributionTerms)) wrong.push("distributionTerms");
  }
  if (family !== "products") {
    // The product-only commercial fields, named one by one so the sanitiser and
    // the API refusal agree about exactly which values may not travel.
    if (has(draft.hsCode)) wrong.push("hsCode");
    if (has(draft.quantityMode) || has(draft.quantity) || has(draft.quantityMin) || has(draft.quantityMax)) {
      wrong.push("quantity");
    }
    if (has(draft.unit)) wrong.push("unit");
    if (has(draft.frequency)) wrong.push("frequency");
    if (has(draft.origin)) wrong.push("origin");
    if (has(draft.destination)) wrong.push("destination");
    if (has(draft.incoterm)) wrong.push("incoterm");
    if (has(draft.payment)) wrong.push("payment");
  }

  return wrong;
}

/**
 * A service specialisation that its own category does not offer.
 *
 * A member who chose freight, ticked "Sea" and "Road", then changed the
 * category to customs is holding two transport modes that customs has no
 * question for. They are dropped rather than displayed: a mode nobody chose for
 * this category is the same kind of stale value as a foreign family's key.
 */
function staleSpecialisations(draft: StructureDraft): boolean {
  if (familyOf(draft) !== "services") return false;
  const kept = sanitiseSpecialisations(draft.serviceCategory, draft.serviceTerms.specialisationKeys);
  return kept.length !== draft.serviceTerms.specialisationKeys.length;
}

/** Drop every field that does not belong to this draft's family. */
export function clearForeignClassification(draft: StructureDraft): StructureDraft {
  const wrong = new Set(crossFamilyClassification(draft));
  if (wrong.size === 0 && !staleSpecialisations(draft)) return draft;
  return {
    ...draft,
    serviceCategory: wrong.has("serviceCategory") ? null : draft.serviceCategory,
    serviceSubcategories: wrong.has("serviceSubcategories") ? [] : draft.serviceSubcategories,
    serviceTerms: wrong.has("serviceTerms")
      ? emptyServiceTerms()
      : {
          ...draft.serviceTerms,
          specialisationKeys: sanitiseSpecialisations(
            draft.serviceCategory,
            draft.serviceTerms.specialisationKeys,
          ),
        },
    distributionPartnerType: wrong.has("distributionPartnerType")
      ? null
      : draft.distributionPartnerType,
    distributionRelationshipTerms: wrong.has("distributionRelationshipTerms")
      ? []
      : draft.distributionRelationshipTerms,
    coverageScope: wrong.has("coverageScope") ? null : draft.coverageScope,
    territoryCodes: wrong.has("territoryCodes") ? [] : draft.territoryCodes,
    distributionTerms: wrong.has("distributionTerms")
      ? emptyDistributionTerms()
      : draft.distributionTerms,
    hsCode: wrong.has("hsCode") ? null : draft.hsCode,
    quantityMode: wrong.has("quantity") ? null : draft.quantityMode,
    quantity: wrong.has("quantity") ? null : draft.quantity,
    quantityMin: wrong.has("quantity") ? null : draft.quantityMin,
    quantityMax: wrong.has("quantity") ? null : draft.quantityMax,
    unit: wrong.has("unit") ? null : draft.unit,
    frequency: wrong.has("frequency") ? null : draft.frequency,
    origin: wrong.has("origin") ? null : draft.origin,
    destination: wrong.has("destination") ? null : draft.destination,
    incoterm: wrong.has("incoterm") ? null : draft.incoterm,
    payment: wrong.has("payment") ? null : draft.payment,
  };
}

/** Every stored key is a real key, and every subcategory sits in its category. */
export function classificationIsCoherent(draft: StructureDraft): boolean {
  if (crossFamilyClassification(draft).length > 0) return false;
  if (draft.serviceCategory && !serviceCategory(draft.serviceCategory)) return false;
  for (const sub of draft.serviceSubcategories) {
    if (!draft.serviceCategory || !subcategoryBelongsTo(sub, draft.serviceCategory)) return false;
  }
  if (draft.distributionPartnerType && !partnerType(draft.distributionPartnerType)) return false;
  for (const term of draft.distributionRelationshipTerms) {
    if (!relationshipTerm(term)) return false;
  }
  if (draft.coverageScope && !coverageScope(draft.coverageScope)) return false;
  if (draft.productSector && !PRODUCT_SECTORS.some((s) => s.key === draft.productSector)) {
    return false;
  }
  return true;
}

/**
 * Has this member said enough for Ponte to know what the record is?
 *
 * The bar is a structured selection, never prose. A recognised category and
 * subcategory are a complete classification on their own, and Continue must not
 * wait for a sentence on top of them. Only the Other route asks for wording,
 * and then it asks for exactly the missing piece and nothing more.
 */
export function classificationComplete(draft: StructureDraft): boolean {
  if (!classificationIsCoherent(draft)) return false;
  const journey = journeyFor(draft.canonical?.family as MarketFamily, draft.canonical?.intent);

  // No canonical entrance means the legacy product-shaped path, which is
  // satisfied by the HS pick exactly as it was before.
  if (!journey) return has(draft.product);

  for (const step of journey.required) {
    // The escape route has no subcategories to choose from, so requiring one
    // would make it impossible to complete. What it requires instead is the
    // member's own wording, which is checked below.
    if (step === "service_subcategory" && serviceCategoryNeedsCustomLabel(draft.serviceCategory)) {
      continue;
    }
    if (!stepAnswered(draft, step)) return false;
  }
  return !needsCustomLabel(draft) || has(draft.customCategoryLabel);
}

/** Has one classification step been answered? */
export function stepAnswered(draft: StructureDraft, step: ClassificationStep): boolean {
  switch (step) {
    case "product_sector":
      return has(draft.productSector);
    case "product_classification":
      return has(draft.product);
    case "service_category":
      return has(draft.serviceCategory);
    case "service_subcategory":
      return draft.serviceSubcategories.length > 0;
    case "distribution_partner_type":
      return has(draft.distributionPartnerType);
    case "distribution_relationship":
      return draft.distributionRelationshipTerms.length > 0;
    case "distribution_coverage":
      return (
        has(draft.coverageScope) &&
        (!coverageScopeTakesCountries(draft.coverageScope) || draft.territoryCodes.length > 0)
      );
    case "details":
      return has(draft.additionalDetails);
  }
}

/**
 * Does this draft still owe Ponte a written label?
 *
 * Only where the member chose the top-level Other, which is the one case where
 * no structured option describes the thing at all. Choosing a category's own
 * "Other ..." subcategory does NOT require wording: the parent category is
 * still a real classification, and the record stays inside it.
 */
export function needsCustomLabel(draft: StructureDraft): boolean {
  const family = familyOf(draft);
  if (family === "services") return serviceCategoryNeedsCustomLabel(draft.serviceCategory);
  if (family === "distribution") return partnerTypeNeedsCustomLabel(draft.distributionPartnerType);
  return false;
}

/**
 * The record's subject, in words, derived from what was chosen.
 *
 * `product` is the column every existing surface reads (the board, the emails,
 * the admin queue, the preview), and it is required by the submit route. Rather
 * than asking the member to type a subject so those surfaces have something to
 * print, the subject is composed from the selection they already made. Nothing
 * is invented: every word here came from a tile the member tapped, or from the
 * wording they gave when they chose Other.
 */
export function subjectFor(draft: StructureDraft): string | null {
  const family = familyOf(draft);
  if (family === "services") return serviceSubject(draft);
  if (family === "distribution") return distributionSubject(draft);
  return draft.product?.trim() || null;
}

/**
 * The completion steps a LEGACY product-shaped entrance asks for.
 *
 * Kept for the composer entrance that carries no canonical family, and for the
 * surfaces and tests that reason about the product queue by intent alone. Every
 * canonical record goes through its own family procedure instead; this is the
 * shadow the legacy `listings.type` vocabulary casts, not the contract.
 */
export function queueFor(intent: Intent | null): CompletionField[] {
  return [...procedureForFamily("products").completionFields({ ...emptyDraft(), intent })];
}

/**
 * The still-open facts for this draft, in its own family's order.
 *
 * This used to be one fixed list of eight product fields for every family. It
 * is now the family's list, which is the whole correction: a trade service is
 * never asked for a quantity, because a quantity is not one of the facts its
 * procedure emits.
 */
export function openGaps(draft: StructureDraft): CompletionField[] {
  return procedureFor(draft).openGaps(draft);
}

/** Has this fact been stated, by this draft's own family's definition? */
export function isFilled(draft: StructureDraft, field: CompletionField): boolean {
  return procedureFor(draft).isFilled(draft, field);
}

/** The four honest buckets for S02, in this draft's family's vocabulary. */
export function bucketize(draft: StructureDraft): FactBuckets {
  return procedureFor(draft).factBuckets(draft);
}

/**
 * What still stands between this draft and publication.
 *
 * Family-specific, which is the point: a trade service can no longer be told an
 * Incoterm is blocking it, and a distribution opportunity can no longer be told
 * it is short of a shipped quantity. Submitting for review is always allowed
 * regardless: these inform, they do not block the submit button.
 */
export function blockers(draft: StructureDraft): Blocker[] {
  return procedureFor(draft).blockers(draft);
}

/**
 * The canonical intent, written into the record in words.
 *
 * This is how the member's actual choice survives a schema that cannot store
 * it. "Distribution and representation, offering coverage" is unambiguous on
 * the record even though `listings.type` will read `offer`.
 */
const CANONICAL_CLAUSE: Record<string, (subject: string) => string> = {
  source_product: (s) => `Product requirement: ${s}.`,
  offer_product: (s) => `Product offer: ${s}.`,
  seek_trade_service: (s) => `Trade service requested: ${s}.`,
  offer_trade_service: (s) => `Trade service offered: ${s}.`,
  seek_distribution_partner: (s) => `Seeking a distribution partner for: ${s}.`,
  offer_distribution_or_representation: (s) => `Offering distribution or representation: ${s}.`,
  seek_brands_or_products_to_represent: (s) => `Seeking products or brands to represent: ${s}.`,
};

function canonicalClause(pair: CanonicalPair, subject: string): string {
  const write = CANONICAL_CLAUSE[pair.intent];
  return write ? write(subject) : `${pair.family}: ${subject}.`;
}

/** A stable label for an intent used in the synthesised details. */
function intentClause(intent: Intent | null, product: string): string {
  if (intent === "offer") return `Supplier offer for ${product}.`;
  if (intent === "service") return `Trade service offered relating to ${product}.`;
  return `Buyer requirement for ${product}.`; // requirement or unknown
}

/**
 * Compose the human-readable `details` the submit API requires FROM the tapped
 * facts, so a member never has to type to submit. Only present facts appear;
 * nothing is invented. Always non-empty as long as a product is set (which S01
 * guarantees before this is ever called). The optional note is appended as the
 * member's own words when given.
 */
export function synthesiseDetails(original: StructureDraft): string {
  // Sanitised first, so a value belonging to another family cannot reach the
  // record's own text even though the columns for it would have been dropped.
  // The details are the one place every fact travels regardless of schema, and
  // an Incoterm written into a service record's prose is exactly as wrong as an
  // Incoterm stored in its column.
  const draft = clearForeignClassification(original);
  const product = (subjectFor(draft) ?? "").trim();
  const parts: string[] = [
    draft.canonical
      ? canonicalClause(draft.canonical, product || "the stated subject")
      : intentClause(draft.intent, product || "the stated product"),
  ];

  // The structured classification, written into the record in words as well as
  // stored as keys. The keys are what filters; this is what a reader sees, and
  // it is what keeps the member's actual choice legible on a record even where
  // the columns for it have not yet been applied to the database.
  parts.push(...classificationClauses(draft));

  // The family's own commercial terms. A products draft writes quantity, route,
  // Incoterm and payment; a services draft writes scope, coverage, capability
  // and engagement basis; a distribution draft writes objective, channels and
  // expectations. None of them writes another family's.
  parts.push(...procedureFor(draft).detailClauses(draft));

  if (draft.validity === "standing") parts.push("Open until withdrawn.");
  else if (has(draft.validity)) parts.push(`Valid for ${draft.validity} days.`);
  if (has(draft.role)) parts.push(`Stated role: ${draft.role}.`);

  // What Ponte understood, written onto the record in words.
  //
  // The same reason the canonical pair is written here: `listings` has no
  // column for a resolved product, and a member who typed "gas oil" and
  // confirmed EN 590 has made a distinction the record must not lose. The
  // member's own wording leads, because North Star 3.4 puts the user's language
  // above the database's.
  if (draft.resolution) {
    const r = draft.resolution;
    if (r.originalWording && r.originalWording.toLowerCase() !== r.normalised.toLowerCase()) {
      parts.push(`Stated as: "${r.originalWording}". Ponte product: ${r.normalised}.`);
    }
    if (r.categoryPath.length > 0) parts.push(`Category: ${r.categoryPath.join(" / ")}.`);
    for (const attribute of r.attributes) parts.push(`${attribute.label}: ${attribute.value}.`);
    if (r.candidateHs && !r.candidateHs.confirmed) {
      // Suggested, and said so on the record. An unconfirmed classification
      // presented as settled is the manufactured fact the authorities forbid.
      parts.push(`Suggested customs classification HS ${r.candidateHs.code}, not yet confirmed.`);
    }
  }

  if (draft.programme && draft.siblings.length > 0) {
    parts.push(
      `Multi-product supply programme, chosen deliberately by the member, also covering: ${draft.siblings
        .map((s) => s.normalised)
        .join("; ")}.`,
    );
  }

  if (draft.documentName) {
    // Provenance, stated. The document itself is not attached: there is no
    // storage bucket for member trade documents, and the surface says so.
    parts.push(`Facts stated in a document the member supplied (${draft.documentName}) and confirmed. Not verified by Ponte.`);
  }

  if (has(draft.additionalDetails)) parts.push(draft.additionalDetails!.trim());
  if (has(draft.note)) parts.push(draft.note!.trim());

  return parts.join(" ");
}

/** The chosen classification, in sentences, for the readable record. */
function classificationClauses(draft: StructureDraft): string[] {
  const family = familyOf(draft);
  const out: string[] = [];

  if (family === "services") {
    const category = serviceCategory(draft.serviceCategory);
    if (category) out.push(`Service category: ${category.label}.`);
    const subs = draft.serviceSubcategories
      .map((k) => serviceSubcategory(k)?.label)
      .filter((l): l is string => !!l);
    if (subs.length > 0) out.push(`Service detail: ${subs.join(", ")}.`);
  }

  if (family === "distribution") {
    const type = partnerType(draft.distributionPartnerType);
    if (type) out.push(`Partner type: ${type.label}.`);
    const terms = draft.distributionRelationshipTerms
      .map((k) => relationshipTerm(k)?.label)
      .filter((l): l is string => !!l);
    if (terms.length > 0) out.push(`Relationship: ${terms.join(", ")}.`);
    const scope = coverageScope(draft.coverageScope);
    if (scope) {
      const codes = draft.territoryCodes.length > 0 ? ` (${draft.territoryCodes.join(", ")})` : "";
      out.push(`Coverage: ${scope.label}${codes}.`);
    }
  }

  const sector = PRODUCT_SECTORS.find((s) => s.key === draft.productSector);
  if (sector && family !== "products") out.push(`Sector: ${sector.label}.`);

  return out;
}

const DAY_MS = 86_400_000;

/**
 * The request body for POST /api/marketplace/submit. Maps the tapped draft onto
 * the columns the route already reads, converts the validity pill to a
 * dated horizon, and carries the synthesised details. `nowIso` is injected so
 * the derived date is deterministic in tests.
 */
export function toSubmitPayload(
  original: StructureDraft,
  opts: { draft: boolean; nowIso: string },
): Record<string, unknown> {
  // The boundary is where the cross-family rule is guaranteed, once, for every
  // caller. A classification field belonging to another family is dropped here
  // rather than sent and refused: it was never an answer this member gave.
  const draft = clearForeignClassification(original);

  // "standing" is a declared horizon with no end date, which is exactly what
  // the listings table means by validity_type 'standing' (and it requires
  // valid_until to be null). A day count derives a date; nothing declares
  // neither.
  const standing = draft.validity === "standing";
  const days = typeof draft.validity === "number" ? draft.validity : 0;
  const validUntil =
    days > 0 ? new Date(Date.parse(opts.nowIso) + days * DAY_MS).toISOString().slice(0, 10) : null;

  // The canonical intent decides the stored type when the member entered
  // through a family entrance. The legacy picker still decides it otherwise.
  const type = draft.canonical
    ? legacyTypeForIntent(draft.canonical.intent) ?? draft.intent
    : draft.intent;

  return {
    type,
    // Carried, and readable on the record. `listings` cannot store these in
    // their own columns yet, so they are sent as well as written into the
    // details: an API that later gains the columns will already receive them,
    // and until then the record still states what the member actually chose.
    market_family: draft.canonical?.family ?? null,
    market_intent: draft.canonical?.intent ?? null,
    // The structured classification, as stable keys. These are what a filter,
    // a match and a count read. Labels are never sent: a reworded label must
    // not be able to orphan a stored record.
    service_category_key: draft.serviceCategory,
    service_subcategory_keys: draft.serviceSubcategories,
    distribution_partner_type_key: draft.distributionPartnerType,
    distribution_relationship_terms: draft.distributionRelationshipTerms,
    coverage_scope_key: draft.coverageScope,
    territory_codes: draft.territoryCodes,
    product_sector_key: draft.productSector,
    custom_category_label: draft.customCategoryLabel,
    additional_details: draft.additionalDetails,
    // Derived from the tiles the member tapped, never typed for the sake of
    // filling a required column.
    product: subjectFor(draft),
    /**
     * The family's OWN commercial terms, and only those.
     *
     * A products payload carries hs_code, the whole quantity (mode included),
     * frequency, route, Incoterm and payment terms. A services payload carries
     * service_terms. A distribution payload carries distribution_terms. None of
     * them carries another family's, so the API's refusal of cross-family data
     * is a check on a real boundary rather than a hope about the client.
     *
     * The quantity keys are spread from here rather than written inline because
     * that was the defect the quantity fix closed: the composer showed a figure
     * the payload never carried, and only a payload built from the same model
     * the control writes to can stay honest about it.
     */
    ...procedureFor(draft).submitTerms(draft),
    submitter_role: draft.role,
    // The member's own statement, sent so the validator can see it. The route
    // stamps the timestamp and the accepted VERSION; a boolean alone would
    // record that somebody agreed to something without recording to what.
    declaration_accepted: draft.declarationAccepted,
    validity_type: standing ? "standing" : validUntil ? "dated" : null,
    valid_until: standing ? null : validUntil,
    key_notes: draft.note,
    // Sent as well as written into the details, on the same principle as the
    // canonical pair above: an API that later gains the column already receives
    // the value, and until then the record still states what Ponte understood.
    product_resolution: draft.resolution,
    source_document: draft.documentName,
    details: synthesiseDetails(draft),
    draft: opts.draft,
  };
}

/**
 * Every record this draft becomes.
 *
 * One payload, except when a member uploaded a multi-product document and chose
 * separate drafts, in which case each product becomes its own record carrying
 * the shared commercial terms. That branch is the reason the decision record
 * refuses to collapse a multi-product document into one generic listing: three
 * products have three buyer pools, three specifications and three
 * classifications, and one row cannot express any of that.
 *
 * A member who chose the combined programme gets one payload, with the other
 * products named in its details. That is also correct, and it is theirs to
 * choose; Ponte recommends separate records and does not impose them.
 */
export function submitPayloads(
  draft: StructureDraft,
  opts: { draft: boolean; nowIso: string },
): Record<string, unknown>[] {
  if (draft.programme || draft.siblings.length === 0) return [toSubmitPayload(draft, opts)];

  return [draft.resolution, ...draft.siblings]
    .filter((r): r is DraftResolution => r !== null)
    .map((resolution) =>
      toSubmitPayload(
        {
          ...draft,
          product: resolution.normalised,
          hsCode: resolution.candidateHs?.code ?? null,
          resolution,
          siblings: [],
        },
        opts,
      ),
    );
}
