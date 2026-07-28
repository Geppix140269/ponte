/**
 * The commercial terms a trade document states, and their provenance.
 *
 * Split out of `./extract-document.ts` deliberately. That module reaches the
 * model through `lib/ai.ts`, which reaches Supabase's admin client to meter the
 * call, and neither belongs in a browser bundle. The review screen and the
 * intake session both need the term keys and their labels, and both run on the
 * client, so the contract lives here where it costs nothing to import.
 *
 * The rule this file keeps: **no server import ever appears in it.** If one is
 * needed, it belongs in `extract-document.ts` instead.
 */

import { missing, type SourcedValue } from "./model";

/**
 * The commercial terms the decision record names, each with its provenance.
 *
 * Every field is a `SourcedValue`, never a bare string, so there is no way to
 * render one without answering "where did this come from?". That is Design
 * Constitution section 14 expressed as a type rather than as a convention a
 * component might forget.
 */
export interface CommercialTerms {
  quantity: SourcedValue;
  unit: SourcedValue;
  recurrence: SourcedValue;
  origin: SourcedValue;
  destination: SourcedValue;
  incoterm: SourcedValue;
  pricingBasis: SourcedValue;
  paymentStructure: SourcedValue;
  contractTerm: SourcedValue;
  availability: SourcedValue;
  validity: SourcedValue;
  counterparties: SourcedValue;
  signatories: SourcedValue;
}

export const TERM_KEYS: readonly (keyof CommercialTerms)[] = [
  "quantity",
  "unit",
  "recurrence",
  "origin",
  "destination",
  "incoterm",
  "pricingBasis",
  "paymentStructure",
  "contractTerm",
  "availability",
  "validity",
  "counterparties",
  "signatories",
];

/** Member-facing labels, kept beside the keys they belong to. */
export const TERM_LABELS: Record<keyof CommercialTerms, string> = {
  quantity: "Quantity",
  unit: "Unit",
  recurrence: "Recurrence or schedule",
  origin: "Origin",
  destination: "Destination",
  incoterm: "Incoterm",
  pricingBasis: "Pricing basis",
  paymentStructure: "Payment structure",
  contractTerm: "Contract term",
  availability: "Availability",
  validity: "Validity dates",
  counterparties: "Named counterparties",
  signatories: "Signatories",
};

export function emptyTerms(): CommercialTerms {
  return TERM_KEYS.reduce((acc, key) => {
    acc[key] = missing<string>();
    return acc;
  }, {} as CommercialTerms);
}

/** Every term still open, for the incomplete state. */
export function openTerms(terms: CommercialTerms): (keyof CommercialTerms)[] {
  return TERM_KEYS.filter((key) => terms[key].provenance === "missing");
}
