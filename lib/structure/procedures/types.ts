import type { MarketFamily } from "../../taxonomy/market";
// Type-only, and deliberately so: this module is imported BY the draft, and a
// runtime import back into it would close a cycle. Every procedure reads the
// draft's shape and none of them calls back into it.
import type { StructureDraft } from "../draft";

/**
 * The contract every market family implements for the commercial procedure that
 * runs AFTER classification.
 *
 * Ponte has one composer shell and three commercial procedures. Before this
 * module there was one composer shell and one procedure, shaped around physical
 * products, which every family was pushed through: `COMPLETION_QUEUE` was a
 * fixed list of eight product fields, `bucketize` counted quantity, route and
 * Incoterm as universal facts, `blockers` demanded a quantity and an Incoterm
 * from every record, and the preview printed HS code, quantity, frequency,
 * route and Incoterm unconditionally. A freight forwarder was told an Incoterm
 * was blocking their publication.
 *
 * The shell stays shared. What a family owns is the MEANING: which facts it
 * has, which of them are decisive, how they read back and what a submission
 * must carry. A shared component renders a model; it does not decide commercial
 * meaning.
 *
 * The registry is central on purpose. Solving this with `family === "services"`
 * expressions scattered through a 1,200-line component is how the defect got
 * here: a rule that lives in twelve places is a rule that is wrong in at least
 * one of them.
 */

/* ------------------------------------------------------------------ */
/* Fields                                                              */
/* ------------------------------------------------------------------ */

/**
 * Every fact any family can ask for, as one union.
 *
 * One union rather than three, because the composer's edit-one-fact mechanism
 * (`editField`) carries a field key across screens and must stay typed. Which
 * of these a given draft is ever asked is decided by its procedure, never by
 * this list.
 */
export type CompletionField =
  // Products
  | "quantity"
  | "origin"
  | "destination"
  | "incoterm"
  | "payment"
  // Trade services
  | "serviceScope"
  | "serviceCoverage"
  | "serviceSpecialisation"
  | "serviceCapability"
  | "servicePricingBasis"
  | "serviceAvailability"
  // Distribution and representation
  | "distributionObjective"
  | "distributionProductScope"
  | "distributionChannels"
  | "distributionCapabilities"
  | "distributionExpectations"
  | "distributionTiming"
  // Shared by every family
  | "validity"
  | "role"
  | "note";

/**
 * Which families own which field.
 *
 * The single statement of the rule the requirement makes twice: quantity, unit,
 * Incoterm and HS code belong to Products; service scope, specialisation and
 * pricing basis belong to Trade services; partner type, relationship, channels
 * and capabilities belong to Distribution. Everything else is shared.
 *
 * This is not decoration. `fieldBelongsTo` is asserted in tests, and the
 * cross-family sanitiser in the draft reads the same map, so a field cannot be
 * owned by one family in the UI and by another in storage.
 */
export const FIELD_FAMILY: Readonly<Record<CompletionField, readonly MarketFamily[]>> = {
  quantity: ["products"],
  origin: ["products"],
  destination: ["products"],
  incoterm: ["products"],
  payment: ["products"],

  serviceScope: ["services"],
  serviceCoverage: ["services"],
  serviceSpecialisation: ["services"],
  serviceCapability: ["services"],
  servicePricingBasis: ["services"],
  serviceAvailability: ["services"],

  distributionObjective: ["distribution"],
  distributionProductScope: ["distribution"],
  distributionChannels: ["distribution"],
  distributionCapabilities: ["distribution"],
  distributionExpectations: ["distribution"],
  distributionTiming: ["distribution"],

  validity: ["products", "services", "distribution"],
  role: ["products", "services", "distribution"],
  note: ["products", "services", "distribution"],
};

export function fieldBelongsTo(field: CompletionField, family: MarketFamily): boolean {
  return FIELD_FAMILY[field].indexOf(family) >= 0;
}

/* ------------------------------------------------------------------ */
/* Family-specific commercial terms                                    */
/* ------------------------------------------------------------------ */

/**
 * The commercial terms of a Trade Service.
 *
 * Capacity lives here as `capability`, in the member's own words, and NOT in
 * the product quantity field. "Up to 40 containers per month" is a statement
 * about a service's throughput; putting it in `quantity` would print it on the
 * board as 40 containers of goods for sale.
 */
export type ServiceTerms = {
  /** What the service includes, in the member's words. */
  scope: string | null;
  /** One-off, ongoing, or either. A key from SERVICE_ENGAGEMENT_TYPES. */
  engagement: string | null;
  /** ISO-2 codes. Where the service is provided or is needed. */
  coverageCountries: string[];
  /** Corridors, ports, border points or routes, in the member's words. */
  tradeLanes: string | null;
  /**
   * Modes, regimes, standards, instruments or delivery model, depending on the
   * category. Keys from SERVICE_SPECIALISATION_GROUPS, conditioned by category.
   */
  specialisationKeys: string[];
  /** Throughput, network, team, facilities or service levels. Never a quantity. */
  capability: string | null;
  /** A key from SERVICE_PRICING_BASES. Not a product payment term. */
  pricingBasis: string | null;
  /** A key from SERVICE_AVAILABILITY. */
  availability: string | null;
};

export function emptyServiceTerms(): ServiceTerms {
  return {
    scope: null,
    engagement: null,
    coverageCountries: [],
    tradeLanes: null,
    specialisationKeys: [],
    capability: null,
    pricingBasis: null,
    availability: null,
  };
}

export function serviceTermsStated(terms: ServiceTerms): boolean {
  return (
    !!terms.scope ||
    !!terms.engagement ||
    terms.coverageCountries.length > 0 ||
    !!terms.tradeLanes ||
    terms.specialisationKeys.length > 0 ||
    !!terms.capability ||
    !!terms.pricingBasis ||
    !!terms.availability
  );
}

/**
 * The commercial terms of a Distribution or representation opportunity.
 *
 * `commercialExpectations` is where an opening order, a sales target or a
 * marketing commitment is stated. It is a term of a relationship and is
 * labelled as one; it is never a shipped quantity.
 */
export type DistributionTerms = {
  /** What the member is seeking or offering, and why. */
  objective: string | null;
  /** The products, brands, portfolio or sector in scope, in words. */
  productScope: string | null;
  /** Keys from DISTRIBUTION_CHANNELS. */
  channelKeys: string[];
  /** Keys from DISTRIBUTION_CAPABILITIES: offered, or required of a partner. */
  capabilityKeys: string[];
  /** Exclusivity, targets, opening order, margin, investment, trial period. */
  commercialExpectations: string | null;
  /** A key from DISTRIBUTION_TIMING. */
  timing: string | null;
};

export function emptyDistributionTerms(): DistributionTerms {
  return {
    objective: null,
    productScope: null,
    channelKeys: [],
    capabilityKeys: [],
    commercialExpectations: null,
    timing: null,
  };
}

export function distributionTermsStated(terms: DistributionTerms): boolean {
  return (
    !!terms.objective ||
    !!terms.productScope ||
    terms.channelKeys.length > 0 ||
    terms.capabilityKeys.length > 0 ||
    !!terms.commercialExpectations ||
    !!terms.timing
  );
}

/* ------------------------------------------------------------------ */
/* What a procedure returns                                            */
/* ------------------------------------------------------------------ */

/**
 * The honest buckets for S02. Values are MESSAGE KEY SUFFIXES, not copy: the
 * component resolves them under its own namespace, so a procedure stays a pure
 * module that can be unit-tested without a message catalogue.
 */
export type FactBuckets = {
  /** Facts Ponte can already state. */
  commercial: string[];
  /** Decisive facts still open (the dashed "Add" chips). */
  missing: string[];
  /** Evidence or authority a reviewer will need. */
  evidence: string[];
  /** What is kept private, never public. */
  keptPrivate: string[];
};

/** A thing that must resolve before Ponte can publish (S05). */
export type Blocker = {
  key: string;
  /**
   * Where the member resolves it, when it is a member action.
   *
   * `declare` is resolved in place, on the submit screen itself: the member
   * reads the terms and accepts them there. It carries no field because there
   * is no question to reopen.
   */
  resolve?: "complete" | "verify" | "declare";
  /** The exact fact to open when `resolve` is "complete". */
  field?: CompletionField;
};

/**
 * A value that only the copy layer can write.
 *
 * A one-ended product route is the reason this exists. "Argentina" under a
 * heading of "Route" is not the fact the member gave: they said the goods ship
 * FROM Argentina, and the other end is the counterparty's decision. The
 * previous preview said so, through `preview.shipsFrom`, and a procedure that
 * returned a bare place name silently dropped that meaning.
 *
 * A procedure is a pure module with no message catalogue, so it names the
 * message and its parameters and the component resolves them.
 */
export type ReviewValueMessage = {
  /** A message key, relative to the composer's own namespace. */
  key: string;
  params?: Record<string, string | number>;
};

/** One line of the reviewed record. */
export type ReviewRow = {
  key: string;
  /** A message key suffix under the composer's `field.` namespace. */
  labelKey: string;
  /**
   * The stated value, or null. A null row is only rendered where it is askable.
   *
   * When `message` is set this is the plain-text equivalent, so a non-rendering
   * caller (a test, a presenter) still reads a truthful value.
   */
  value: string | null;
  /** Set where the value's meaning depends on copy rather than on data. */
  message?: ReviewValueMessage;
  /** The fact this row opens, when the member may still change it. */
  editField?: CompletionField;
};

export type ReviewSection = {
  key: string;
  /** A message key suffix under the composer's `review.` namespace, or null. */
  headingKey: string | null;
  rows: ReviewRow[];
};

/**
 * The record as it reads back, by family.
 *
 * Sections are generated, not filtered. A Trade Service review does not contain
 * an Incoterm row set to "Not stated"; it does not contain an Incoterm row. The
 * requirement is explicit that this must hold at model-generation level rather
 * than being hidden by CSS, and this type is where that is guaranteed: there is
 * no product section for a procedure that never emits one.
 */
export type ReviewModel = {
  family: MarketFamily;
  /** A message key suffix under `review.` for the screen's own title. */
  titleKey: string;
  /** What a counterparty sees before an introduction. */
  publicSections: ReviewSection[];
  /** Held by Ponte, never shown publicly. */
  privateSections: ReviewSection[];
};

/** Whether a submission carries what its family requires. */
export type SubmissionReadiness = {
  /** Nothing the member can still close stands in the way of publication. */
  ready: boolean;
  /** Everything outstanding, member-resolvable or not. */
  blockers: Blocker[];
};

/* ------------------------------------------------------------------ */
/* The contract                                                        */
/* ------------------------------------------------------------------ */

export interface FamilyProcedure {
  family: MarketFamily;
  /** Every fact this family asks for, in order. Never a foreign family's. */
  completionFields(draft: StructureDraft): readonly CompletionField[];
  /** The still-open ones, in the same order. */
  openGaps(draft: StructureDraft): CompletionField[];
  /** Has this fact been stated on this draft? */
  isFilled(draft: StructureDraft, field: CompletionField): boolean;
  /** The S02 buckets, in this family's vocabulary. */
  factBuckets(draft: StructureDraft): FactBuckets;
  /** What stands between this draft and publication. */
  blockers(draft: StructureDraft): Blocker[];
  /** How the record reads back at S04. */
  reviewModel(draft: StructureDraft): ReviewModel;
  /** The S05 verdict. */
  submissionReadiness(draft: StructureDraft): SubmissionReadiness;
  /**
   * The family's own commercial terms, as submit-payload columns.
   *
   * A family emits ITS OWN terms and nothing else, which is what makes the
   * payload validation at the API boundary a check rather than a hope.
   */
  submitTerms(draft: StructureDraft): Record<string, unknown>;
  /** The family's terms written into the record's own text, in sentences. */
  detailClauses(draft: StructureDraft): string[];
}
