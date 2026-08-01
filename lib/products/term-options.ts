import { COUNTRIES } from "@/lib/countries";
import { FREQUENCY_KEYS, TIMING_KEYS, UNIT_KEYS } from "@/lib/listing-terms";
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

export const TERM_OPTIONS: Partial<Record<keyof CommercialTerms, readonly string[]>> = {
  unit: Object.keys(UNIT_KEYS),
  recurrence: Object.keys(FREQUENCY_KEYS),
  availability: Object.keys(TIMING_KEYS),
  incoterm: INCOTERMS,
  origin: COUNTRY_NAMES,
  destination: COUNTRY_NAMES,
};

/** The terms that are genuinely open, and are meant to be typed. */
export const FREE_TEXT_TERMS: readonly (keyof CommercialTerms)[] = [
  // A number and a date range. Neither has a set of answers.
  "quantity",
  "validity",
  // No canonical vocabulary yet. Candidates for one, in this order.
  "pricingBasis",
  "paymentStructure",
  "contractTerm",
  "counterparties",
  "signatories",
];

export function optionsFor(key: keyof CommercialTerms): readonly string[] | null {
  return TERM_OPTIONS[key] ?? null;
}
