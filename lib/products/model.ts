/**
 * What Ponte knows about a product once it has understood one.
 *
 * The whole point of the AI product intake decision is that the member's words
 * are the input and Ponte's structure is the output, so both have to survive on
 * the record. A model that kept only the normalised name would have thrown away
 * the half the member can recognise; one that kept only the wording would have
 * structured nothing.
 *
 * No database, no Next, no server imports, so the resolver, the scan and the
 * extraction are all unit-testable standalone under tsx, in the same way
 * `lib/structure/draft.ts` is.
 */

import type { MarketFamily } from "@/lib/taxonomy/market";

/**
 * Where a value came from. Never collapsed into one "verified" treatment,
 * because Design Constitution section 14 says evidence, declaration, review and
 * verification are separate states.
 *
 * The decision record names four; `ai_identified` is a fifth, added after the
 * first owner review, and the note below `PRODUCED_PROVENANCE` says why. It
 * sits *below* `member_confirmed`, not beside it: it is the weakest thing Ponte
 * will put on a screen, and it says so in words.
 *
 * `ponte_verified` is declared here and is never produced by this journey.
 * Ponte does not verify a product claim today, and the review screen renders
 * the row as unavailable rather than as an empty box that implies it could be
 * obtained. It exists in the type so the four states stay visibly distinct and
 * so the day verification arrives it has somewhere to land.
 */
export type Provenance =
  | "extracted"
  | "ai_identified"
  | "member_confirmed"
  | "ponte_verified"
  | "missing";

/**
 * `ai_identified` is the fifth state, and it was added because the fourth was
 * being asked to do a job it could not.
 *
 * The first build let the model return only keys that already existed in
 * Ponte's curated catalogue. The intent was "AI must not invent a product". The
 * effect was that the catalogue became the boundary of everything Ponte could
 * understand: a member typing `avocado`, a product traded by the million
 * tonne, was told Ponte found nothing close.
 *
 * The safety property is preserved by provenance rather than by a ceiling.
 * Ponte may now identify any product a member names, and what it identifies
 * arrives marked `ai_identified`: read as "Ponte worked this out, and you have
 * not agreed to it yet". It can never become `member_confirmed` without the
 * member saying so, it can never become `ponte_verified` on this journey at
 * all, and no draft is created from it until it is confirmed.
 *
 * That is the same rule the decision record states: AI may extract, structure,
 * compare, explain and recommend, and must not silently publish, verify or
 * commit. Identifying a product the member has just named is recommending, not
 * inventing. Inventing is asserting a commercial term the member never gave,
 * which is a different rule and is still enforced separately.
 */
export const PRODUCED_PROVENANCE: readonly Provenance[] = [
  "extracted",
  "ai_identified",
  "member_confirmed",
  "missing",
];

/**
 * One fact, with where it came from and the words it came from.
 *
 * `quote` is load bearing rather than decorative. The extraction parser drops
 * any term that arrives without one, which is how "AI must not invent missing
 * commercial terms" is enforced instead of merely requested: a value the model
 * produced but cannot point at in the document does not survive parsing.
 */
export interface SourcedValue<T = string> {
  value: T | null;
  provenance: Provenance;
  /** The verbatim words from the document, when the value was extracted. */
  quote: string | null;
}

export function missing<T>(): SourcedValue<T> {
  return { value: null, provenance: "missing", quote: null };
}

export function extracted<T>(value: T, quote: string): SourcedValue<T> {
  return { value, provenance: "extracted", quote };
}

export function confirmed<T>(value: T): SourcedValue<T> {
  return { value, provenance: "member_confirmed", quote: null };
}

/** A distinguishing technical attribute, e.g. sulphur content, freeze point. */
export interface ProductAttribute {
  /** Stable key, e.g. "sulphur". Never derived from the label. */
  key: string;
  label: string;
  value: string;
}

/**
 * A suggested customs classification.
 *
 * Suggested, and marked so. The ADR is explicit that the HS code is downstream
 * and confirmable and must not gate intake, so a candidate carries its own
 * confirmation state and the composer reads that rather than treating the
 * presence of a code as agreement.
 */
export interface CandidateClassification {
  /** Six-digit HS 2022 code, as the catalogue stores it (no dot). */
  code: string;
  /** How the code is described, for a member who has never seen one. */
  description: string;
  confirmed: boolean;
}

/**
 * What every product Ponte can rank has in common, however Ponte came to know
 * it: a curated catalogue entry, or one identified from the member's own words.
 *
 * The shared shape is what lets the ranking, the candidate rows, the review
 * screen and the draft treat both alike. What differs is provenance, and that
 * is carried on the candidate rather than smuggled into the identity.
 */
export interface ProductIdentity {
  /** Stable key. Never derived from the name. */
  key: string;
  /** The normalised Ponte product name, as a trader would recognise it. */
  name: string;
  /** The sector key from `PRODUCT_SECTORS` in lib/taxonomy/market.ts. */
  sector: string;
  /** A readable group inside the sector, e.g. "Refined petroleum products". */
  group: string;
  /**
   * Everything that reaches this product: trade names, spellings, standards,
   * abbreviations, grades. Lower case; the resolver normalises before matching.
   *
   * A synonym belongs to exactly one product. `catalogue.test.ts` enforces
   * that, because a synonym on two products is a resolver that cannot be
   * reasoned about.
   */
  synonyms: readonly string[];
  /**
   * Formal standard designations, e.g. "EN 590", "ASTM D1655". Scored higher
   * than a plain synonym: a member who names a standard has told you more than
   * one who names a category.
   */
  standards: readonly string[];
  /** The distinguishing technical attributes, for the candidate rows. */
  attributes: readonly ProductAttribute[];
  /** The suggested customs classification, where one is known. */
  hs: { code: string; description: string } | null;
  /**
   * One line on what tells this product apart from its neighbours. Shown on a
   * candidate row, and the reason an ambiguity screen is answerable.
   */
  distinguisher: string;
}

/**
 * One product in the curated Ponte vocabulary.
 *
 * This is the layer the HS catalogue cannot provide. HS 2022 is a customs
 * nomenclature: it will tell you that 2710.19 covers certain petroleum oils,
 * and it will never tell you that a trader who writes "gas oil", one who writes
 * "EN590" and one who writes "ULSD 10ppm" all mean the same thing. That
 * knowledge is commercial, and it lives here.
 *
 * It is depth, not breadth. `IdentifiedProduct` is the breadth.
 */
export type CatalogueProduct = ProductIdentity;

/**
 * A product Ponte worked out from what the member wrote, rather than one it
 * already held.
 *
 * The whole point of the resolver after the first owner review: the curated
 * catalogue is where Ponte knows a market deeply, and it must not be the limit
 * of what Ponte can understand. An identified product is a real answer, is
 * ranked beside curated ones, and is honest about being weaker: it says it was
 * identified rather than confirmed, it carries its own confidence, and it
 * cannot reach a draft without the member agreeing to it.
 */
export interface IdentifiedProduct extends ProductIdentity {
  /** Always true. The discriminator against a curated entry. */
  identified: true;
  /**
   * The spelling correction applied, when one was. `avogado` -> `avocado`.
   * Surfaced as "Did you mean...?" rather than silently swapped, because a
   * correction the member cannot see is a correction they cannot refuse.
   */
  correction: string | null;
  /**
   * The generic commercial product, when the member named a variety or a
   * grade of one: "Avocado" for "Hass avocado". Null when the name is already
   * generic.
   */
  generic: string | null;
  /**
   * Further candidate customs headings, downstream and confirmable. Every one
   * has been checked against the real HS catalogue; an invented code does not
   * survive that check.
   */
  hsCandidates: readonly { code: string; description: string }[];
  /** How Ponte came to this. Shown so the member can judge it. */
  basis: "model" | "customs_catalogue";
}

export function isIdentified(product: ProductIdentity): product is IdentifiedProduct {
  return (product as IdentifiedProduct).identified === true;
}

/** Why a candidate matched, in the resolver's own terms. */
export type MatchKind =
  | "standard"
  | "exact_synonym"
  | "exact_name"
  | "all_tokens"
  | "partial_tokens"
  | "semantic";

export interface MatchEvidence {
  kind: MatchKind;
  /** The catalogue term that matched, or the model's stated reason. */
  term: string;
}

/**
 * The three named confidence bands.
 *
 * Named rather than numeric on the surface. Constitution section 9 reserves a
 * percentage for a position along a defined procedure and forbids reading one
 * as credibility; a resolver score is neither. The number exists for ordering
 * and for tests; the member sees the band and the matched terms.
 */
export type ConfidenceBand = "close" | "likely" | "possible";

export function bandFor(score: number): ConfidenceBand {
  if (score >= 0.75) return "close";
  if (score >= 0.45) return "likely";
  return "possible";
}

/** One ranked answer to "what is this product?". */
export interface ProductCandidate {
  product: CatalogueProduct;
  /** [0,1], computed from the match weights. Never asserted by a model. */
  score: number;
  band: ConfidenceBand;
  /** What it matched on. The rationale IS this list, not prose about it. */
  matchedOn: readonly MatchEvidence[];
}

/**
 * A product Ponte has understood, in the seven layers the ADR requires
 * preserved. Section D of the decision record, expressed as a type.
 */
export interface ResolvedProduct {
  /** The member's own words, verbatim, in whatever language they used. */
  originalWording: string;
  /** The normalised Ponte product name. */
  normalised: string;
  /** The catalogue key, so the record can be re-read without string matching. */
  productKey: string;
  /** Trade terminology and standards that reach this product. */
  synonyms: readonly string[];
  /** Ponte category hierarchy: family, sector, group, product. */
  categoryPath: readonly string[];
  /** Technical attributes. */
  attributes: readonly ProductAttribute[];
  /** Candidate customs classification, downstream and confirmable. */
  candidateHs: CandidateClassification | null;
  /** The lexical search representation. */
  searchText: string;
  /** The token set used for semantic retrieval. */
  searchTerms: readonly string[];
  /** How this product came to be on the record. */
  provenance: Provenance;
}

export const PRODUCT_FAMILY: MarketFamily = "products";

/**
 * The outcome of asking Ponte what a product is.
 *
 * `ambiguous` is a first-class outcome rather than an error, and `none` carries
 * the words that failed so the surface can say what it looked for. Neither may
 * ever be rendered as an empty screen: acceptance criterion 1 is that "gas oil"
 * never produces a silent no-op, and the shape of this type is what makes that
 * a compile-time property rather than a hope.
 */
export type ResolutionOutcome =
  | { kind: "resolved"; candidates: readonly ProductCandidate[]; wording: string }
  | { kind: "candidates"; candidates: readonly ProductCandidate[]; wording: string }
  | { kind: "ambiguous"; candidates: readonly ProductCandidate[]; wording: string; question: string }
  | { kind: "none"; wording: string; tried: readonly string[] };

/** Build the resolved product a member confirmed, from the candidate they chose. */
export function resolveFrom(
  candidate: ProductCandidate,
  originalWording: string,
  sectorLabel: string,
  /**
   * Defaults to how Ponte came by the product rather than to a confirmation.
   *
   * A curated product the member picked from a list they read is theirs; a
   * product Ponte identified from their words is Ponte's until they say
   * otherwise, and the review screen has to be able to say which. The
   * confirmation itself happens in the reducer, on the Confirm action.
   */
  provenance: Provenance = isIdentified(candidate.product) ? "ai_identified" : "member_confirmed",
): ResolvedProduct {
  const p = candidate.product;
  const searchTerms = Array.from(
    new Set([
      ...p.name.toLowerCase().split(/\s+/),
      ...p.synonyms,
      ...p.standards.map((s) => s.toLowerCase()),
      ...p.attributes.map((a) => a.value.toLowerCase()),
    ]),
  ).filter(Boolean);

  return {
    originalWording,
    normalised: p.name,
    productKey: p.key,
    synonyms: [...p.synonyms, ...p.standards],
    categoryPath: ["Products", sectorLabel, p.group, p.name].filter(Boolean),
    attributes: p.attributes,
    candidateHs: p.hs ? { code: p.hs.code, description: p.hs.description, confirmed: false } : null,
    searchText: [originalWording, p.name, ...p.synonyms, ...p.standards].join(" "),
    searchTerms,
    provenance,
  };
}
