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
 * Where a value came from. Four states, never collapsed into one "verified"
 * treatment, because the Design Constitution section 14 says evidence,
 * declaration, review and verification are separate and the ADR names these
 * four exactly.
 *
 * `ponte_verified` is declared here and is never produced by this journey.
 * Ponte does not verify a product claim today, and the review screen renders
 * the row as unavailable rather than as an empty box that implies it could be
 * obtained. It exists in the type so the four states stay visibly distinct and
 * so the day verification arrives it has somewhere to land.
 */
export type Provenance = "extracted" | "member_confirmed" | "ponte_verified" | "missing";

/** The provenance values a member-facing surface may currently produce. */
export const PRODUCED_PROVENANCE: readonly Provenance[] = ["extracted", "member_confirmed", "missing"];

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
 * One product in the canonical Ponte vocabulary.
 *
 * This is the layer the HS catalogue cannot provide. HS 2022 is a customs
 * nomenclature: it will tell you that 2710.19 covers certain petroleum oils,
 * and it will never tell you that a trader who writes "gas oil", one who writes
 * "EN590" and one who writes "ULSD 10ppm" all mean the same thing. That
 * knowledge is commercial, and it lives here.
 */
export interface CatalogueProduct {
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
  provenance: Provenance = "member_confirmed",
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
    categoryPath: ["Products", sectorLabel, p.group, p.name],
    attributes: p.attributes,
    candidateHs: p.hs ? { code: p.hs.code, description: p.hs.description, confirmed: false } : null,
    searchText: [originalWording, p.name, ...p.synonyms, ...p.standards].join(" "),
    searchTerms,
    provenance,
  };
}
