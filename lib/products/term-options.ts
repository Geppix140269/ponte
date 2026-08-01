import { COUNTRIES } from "@/lib/countries";
import { FREQUENCY_KEYS, TIMING_KEYS, UNIT_KEYS } from "@/lib/listing-terms";
import { QUANTITY_MODES } from "@/lib/listings/quantity";
import { SERVICE_PRICING_BASES } from "@/lib/taxonomy/service-terms";
import type { CommercialTerms } from "@/lib/products/terms";

/**
 * The values a commercial term may take, where the term has a known set.
 *
 * ## The rule this exists to hold
 *
 * A member never types a value the product already knows. If a field has an
 * answer set, the field offers it. Typing is for the case the set does not
 * cover, and for prose a member chooses to add.
 *
 * Every review row used to be a blank text box: Incoterm, Unit, Origin,
 * Destination too, all of which have fixed vocabularies sitting in this
 * repository already. That asked a trader to spell FOB, and it let two members
 * write "MT" and "metric tonnes" for the same thing, which is a data problem as
 * well as a manners problem.
 *
 * ## Where these come from
 *
 * Nothing here is invented. Units and recurrence come from
 * `lib/listing-terms.ts`, availability from its timing keys, countries from
 * `lib/countries.ts`, and the Incoterms are the set already named in
 * `lib/deal-room/glossary.ts` as codes that must survive translation unchanged.
 *
 * A term absent from this map has no canonical vocabulary yet, so it stays free
 * text. That is the honest state: inventing a list of "pricing bases" here
 * would be worse than a text box, because the product would then teach a
 * vocabulary it does not actually hold. Those are the terms to give a
 * vocabulary next, not the ones to guess at now.
 */

/** Offered last on every list, and the only thing that reveals a text box. */
export const SOMETHING_ELSE = "__other__";

/** Incoterms 2020, the set the glossary protects from translation. */
const INCOTERMS = [
  "EXW",
  "FCA",
  "FAS",
  "FOB",
  "CFR",
  "CIF",
  "CPT",
  "CIP",
  "DAP",
  "DPU",
  "DDP",
] as const;

const COUNTRY_NAMES = COUNTRIES.map((c) => c.name);

/**
 * How a price is arrived at.
 *
 * `SERVICE_PRICING_BASES` — the product's own vocabulary, with its own labels.
 * It was here the whole time, in `lib/taxonomy/service-terms.ts`, being used by
 * `classification.ts` to validate listings, while this screen showed a blank
 * box. A briefly-written replacement list was deleted in favour of it: a second
 * vocabulary for the same fact is worse than no vocabulary, because now two
 * screens disagree about what a pricing basis is.
 */
const PRICING_BASES = SERVICE_PRICING_BASES.map((option) => option.label);

/**
 * How much, stated the way the product already models it.
 *
 * Quantity is a MODE, not a bare number: exact, approximate, minimum, maximum,
 * range, negotiable, or on request. `lib/listings/quantity.ts` has held that
 * since the beginning, and four of the seven modes need a figure while three do
 * not — which is why a lone number box was the wrong control as well as the
 * wrong manners.
 */
const QUANTITY_MODE_LABELS: Record<string, string> = {
  exact: "Exact",
  approximate: "Approximate",
  minimum: "Minimum",
  maximum: "Maximum",
  range: "A range",
  negotiable: "Negotiable",
  on_request: "On request",
};

/** How and when money moves. The instruments actually used. */
const PAYMENT_STRUCTURES = [
  "Letter of credit, at sight",
  "Letter of credit, deferred",
  "Telegraphic transfer, in advance",
  "Telegraphic transfer, against documents",
  "Documentary collection",
  "Open account",
  "Escrow",
  "Staged against milestones",
  "To be agreed",
] as const;

/** How long the arrangement runs. */
const CONTRACT_TERMS = [
  "One shipment",
  "Three months",
  "Six months",
  "Twelve months",
  "Ongoing, until terminated",
  "To be agreed",
] as const;

export const TERM_OPTIONS: Partial<Record<keyof CommercialTerms, readonly string[]>> = {
  unit: Object.keys(UNIT_KEYS),
  recurrence: Object.keys(FREQUENCY_KEYS),
  availability: Object.keys(TIMING_KEYS),
  incoterm: INCOTERMS,
  origin: COUNTRY_NAMES,
  destination: COUNTRY_NAMES,
  pricingBasis: PRICING_BASES,
  quantity: QUANTITY_MODES.map((m) => QUANTITY_MODE_LABELS[m]),
  paymentStructure: PAYMENT_STRUCTURES,
  contractTerm: CONTRACT_TERMS,
};

/**
 * What a term takes when it is not a choice.
 *
 * A quantity is a number and gets a number field, not a box that accepts "about
 * twenty tonnes". A validity is a date. Between them and the lists above, the
 * only prose left is the names of people and companies, which no list can hold.
 */
export const TERM_INPUT_TYPE: Partial<Record<keyof CommercialTerms, "number" | "date">> = {
  // Quantity is a mode first. The figure that some modes need is typed after
  // the mode is chosen, through "Something else", rather than instead of it.
  validity: "date",
};

/** The only terms still typed as prose: names. */
export const FREE_TEXT_TERMS: readonly (keyof CommercialTerms)[] = [
  "counterparties",
  "signatories",
];

export function inputTypeFor(key: keyof CommercialTerms): "number" | "date" | "text" {
  return TERM_INPUT_TYPE[key] ?? "text";
}

export function optionsFor(key: keyof CommercialTerms): readonly string[] | null {
  return TERM_OPTIONS[key] ?? null;
}
