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

import {
  formatQuantity, normaliseFrequency, validateQuantity, quantityToColumns,
  type ListingQuantity, type QuantityMode,
} from "../listings/quantity";

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
import { journeyFor, type ClassificationStep } from "../taxonomy/journey";
import { PRODUCT_SECTORS, type MarketFamily } from "../taxonomy/market";

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
  };
}

/**
 * The quantity on a draft, in the shared model.
 *
 * One conversion, used by the gap check, the preview, the synthesised details
 * and the submit payload, so all four agree about whether a quantity has been
 * stated and what it says.
 */
export function draftQuantity(draft: StructureDraft): ListingQuantity | null {
  if (!draft.quantityMode) return null;
  return {
    mode: draft.quantityMode,
    value: draft.quantity,
    minValue: draft.quantityMin,
    maxValue: draft.quantityMax,
    unit: draft.unit,
    frequency: normaliseFrequency(draft.frequency),
  };
}

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

const has = (v: unknown): boolean => v !== null && v !== undefined && String(v).trim() !== "";

// ---------------------------------------------------------------------------
// Classification: what the record IS, chosen before anything is described
// ---------------------------------------------------------------------------

/** The family a draft belongs to, canonical when known and products otherwise. */
export function familyOf(draft: StructureDraft): MarketFamily {
  const family = draft.canonical?.family;
  if (family === "services" || family === "distribution" || family === "products") return family;
  return "products";
}

/**
 * A classification field that belongs to another family.
 *
 * The requirement is explicit that a Trade Service category must not be stored
 * under Distribution, and the reverse. This is enforced rather than trusted,
 * because the two journeys share one draft object and one submit route, and a
 * back-navigation between families would otherwise leave the previous family's
 * answer attached to the new record. A stale key is worse than no key: it is a
 * classification nobody chose, and it would be filtered on.
 */
export function crossFamilyClassification(draft: StructureDraft): string[] {
  const family = familyOf(draft);
  const wrong: string[] = [];
  if (family !== "services") {
    if (has(draft.serviceCategory)) wrong.push("serviceCategory");
    if (draft.serviceSubcategories.length > 0) wrong.push("serviceSubcategories");
  }
  if (family !== "distribution") {
    if (has(draft.distributionPartnerType)) wrong.push("distributionPartnerType");
    if (draft.distributionRelationshipTerms.length > 0) wrong.push("distributionRelationshipTerms");
    if (has(draft.coverageScope)) wrong.push("coverageScope");
  }
  if (family === "services" && has(draft.hsCode)) wrong.push("hsCode");
  return wrong;
}

/** Drop every classification field that does not belong to this draft's family. */
export function clearForeignClassification(draft: StructureDraft): StructureDraft {
  const wrong = new Set(crossFamilyClassification(draft));
  if (wrong.size === 0) return draft;
  return {
    ...draft,
    serviceCategory: wrong.has("serviceCategory") ? null : draft.serviceCategory,
    serviceSubcategories: wrong.has("serviceSubcategories") ? [] : draft.serviceSubcategories,
    distributionPartnerType: wrong.has("distributionPartnerType")
      ? null
      : draft.distributionPartnerType,
    distributionRelationshipTerms: wrong.has("distributionRelationshipTerms")
      ? []
      : draft.distributionRelationshipTerms,
    coverageScope: wrong.has("coverageScope") ? null : draft.coverageScope,
    hsCode: wrong.has("hsCode") ? null : draft.hsCode,
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
  const custom = draft.customCategoryLabel?.trim() || null;

  if (family === "services") {
    if (serviceCategoryNeedsCustomLabel(draft.serviceCategory)) return custom;
    const subs = draft.serviceSubcategories
      .map((k) => serviceSubcategory(k)?.label)
      .filter((l): l is string => !!l);
    if (subs.length > 0) {
      const named = subs.join(", ");
      // A category's own "Other ..." subcategory names the gap, not the
      // service, so the member's wording is what a reader actually needs.
      return custom ? `${named}: ${custom}` : named;
    }
    return serviceCategory(draft.serviceCategory)?.label ?? custom;
  }

  if (family === "distribution") {
    if (partnerTypeNeedsCustomLabel(draft.distributionPartnerType)) return custom;
    const type = partnerType(draft.distributionPartnerType)?.label ?? null;
    const sector = PRODUCT_SECTORS.find((s) => s.key === draft.productSector)?.label ?? null;
    if (type && sector) return `${type}, ${sector}`;
    return type ?? sector ?? custom;
  }

  return draft.product?.trim() || null;
}

/**
 * The order Ponte asks for the still-open facts, one at a time (S03). Only the
 * unfilled ones are asked; each is skippable. `note` is always last and always
 * optional.
 */
export const COMPLETION_QUEUE = [
  "quantity", "origin", "destination", "incoterm", "payment", "validity", "role", "note",
] as const;
export type CompletionField = (typeof COMPLETION_QUEUE)[number];

/**
 * Which end of the route this member actually decides.
 *
 * A seller knows where the goods ship FROM; where they end up is the buyer's
 * decision, and asking a seller for a destination invites an invented answer or
 * an unnecessary constraint on their own listing. A buyer is the mirror image:
 * they know where it has to land, and the origin is whoever can supply it. A
 * trade service covers a corridor, so it declares both ends.
 *
 * The field that is not asked is not a gap, is not a blocker and is not printed
 * as "not stated": it was never this member's fact to give. It stays on the
 * draft so a member who does want to state it loses nothing.
 */
export function asksFor(intent: Intent | null, field: "origin" | "destination"): boolean {
  if (intent === "offer") return field === "origin";
  if (intent === "requirement") return field === "destination";
  return true; // service, or intent not yet chosen
}

/** The completion steps that apply to this draft's intent, in order. */
export function queueFor(intent: Intent | null): CompletionField[] {
  return COMPLETION_QUEUE.filter((f) =>
    f === "origin" || f === "destination" ? asksFor(intent, f) : true,
  );
}

function isFilled(draft: StructureDraft, field: CompletionField): boolean {
  switch (field) {
    // A quantity is stated when its MODE is chosen and coherent. "On request"
    // and "negotiable" are complete answers that carry no number, so testing
    // for a number here would keep asking a member who has already answered.
    case "quantity": {
      const q = draftQuantity(draft);
      return q !== null && validateQuantity(q).length === 0;
    }
    case "origin": return has(draft.origin);
    case "destination": return has(draft.destination);
    case "incoterm": return has(draft.incoterm);
    case "payment": return has(draft.payment);
    case "validity": return has(draft.validity);
    case "role": return has(draft.role);
    case "note": return has(draft.note);
  }
}

/** The still-open completion steps, in order. `note` appears only if unfilled. */
export function openGaps(draft: StructureDraft): CompletionField[] {
  return queueFor(draft.intent).filter((f) => !isFilled(draft, f));
}

/** The four honest buckets for S02. Values are field keys; the UI supplies copy. */
export type FactBuckets = {
  /** Facts Ponte can already state. */
  commercial: string[];
  /** Decisive facts still open (the dashed "Add" chips). */
  missing: string[];
  /** Evidence or authority a reviewer will need. */
  evidence: string[];
  /** What is kept private (never public). */
  keptPrivate: string[];
};

export function bucketize(draft: StructureDraft): FactBuckets {
  const commercial: string[] = [];
  if (has(draft.intent)) commercial.push("intent");
  // The subject is composed from the classification for a service or a
  // distribution record, so a member who tapped their way through without
  // typing still has a stated subject here rather than an apparent gap.
  if (has(subjectFor(draft))) commercial.push("product");
  if (has(draft.serviceCategory)) commercial.push("serviceCategory");
  if (draft.serviceSubcategories.length > 0) commercial.push("serviceSubcategory");
  if (has(draft.distributionPartnerType)) commercial.push("partnerType");
  if (draft.distributionRelationshipTerms.length > 0) commercial.push("relationship");
  if (has(draft.coverageScope)) commercial.push("coverage");
  if (has(draft.productSector)) commercial.push("sector");
  if (has(draft.hsCode)) commercial.push("hsCode");
  if (isFilled(draft, "quantity")) commercial.push("quantity");
  for (const f of ["frequency", "origin", "destination", "incoterm"] as const) {
    if (has(draft[f])) commercial.push(f);
  }

  // The decisive fields that, when open, are worth asking for. Not every open
  // field is a gap worth surfacing (a note never is, and the end of the route
  // this member does not decide never is); these are the ones a reviewer needs
  // to see resolved.
  const missing = (["quantity", "origin", "destination", "incoterm", "payment", "validity", "role"] as const)
    .filter((f) => (f === "origin" || f === "destination" ? asksFor(draft.intent, f) : true))
    .filter((f) => !isFilled(draft, f));

  // Evidence is authority to act, deferred to review (never uploaded pre-account).
  const evidence = draft.intent === "service" ? ["serviceAuthority"] : ["tradeAuthority"];

  // Always private: who you are, and your exact company, until an introduction.
  const keptPrivate = ["identity", "exactCompany"];

  return { commercial, missing, evidence, keptPrivate };
}

/** A thing that must resolve before Ponte can publish (S05). */
export type Blocker = {
  key: string;
  /** Where the member resolves it, when it is a member action. */
  resolve?: "complete" | "verify";
};

/**
 * What still stands between this draft and publication. Fact gaps the member
 * can close in the composer, plus business verification, which is resolved at
 * /verify and always applies until it is done. Submitting for review is always
 * allowed regardless: these inform, they do not block the submit button.
 */
export function blockers(draft: StructureDraft): Blocker[] {
  const out: Blocker[] = [];
  if (!isFilled(draft, "quantity")) out.push({ key: "quantity", resolve: "complete" });
  if (!has(draft.incoterm)) out.push({ key: "incoterm", resolve: "complete" });
  if (!has(draft.validity)) out.push({ key: "validity", resolve: "complete" });
  if (!has(draft.role)) out.push({ key: "role", resolve: "complete" });
  // Publication always needs a current member-business verification.
  out.push({ key: "businessVerification", resolve: "verify" });
  return out;
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
export function synthesiseDetails(draft: StructureDraft): string {
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
  const classification = classificationClauses(draft);
  parts.push(...classification);

  // The quantity is written with its MODE. "Approximately 2,500 MT" and
  // "2,500 MT" are different commercial claims, and dropping the qualifier
  // states a firmness the member did not offer. This supersedes the raw
  // quantity/unit/frequency concatenation: those three columns are now derived
  // from the structured quantity rather than being the source of it.
  const quantityText = formatQuantity(draftQuantity(draft));
  if (quantityText) parts.push(`Quantity: ${quantityText}.`);

  // One end of the route is often the only end this member decides, so a
  // half-stated route is written as the half it is rather than padded with an
  // "unspecified" the reader could mistake for a fact.
  if (has(draft.origin) && has(draft.destination)) {
    parts.push(`Route: ${draft.origin} to ${draft.destination}.`);
  } else if (has(draft.origin)) {
    parts.push(`Ships from: ${draft.origin}.`);
  } else if (has(draft.destination)) {
    parts.push(`Delivered to: ${draft.destination}.`);
  }
  if (has(draft.incoterm)) parts.push(`Incoterm: ${draft.incoterm}.`);
  if (has(draft.payment)) parts.push(`Payment terms: ${draft.payment}.`);
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
    hs_code: draft.hsCode,
    // The whole quantity, mode included. The route reads these keys directly,
    // so what the member tapped is what is stored — the defect was precisely
    // that the composer showed a figure the payload never carried.
    ...quantityToColumns(draftQuantity(draft)),
    frequency: draft.frequency,
    origin: draft.origin,
    destination: draft.destination,
    incoterm: draft.incoterm,
    payment_terms: draft.payment,
    submitter_role: draft.role,
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
