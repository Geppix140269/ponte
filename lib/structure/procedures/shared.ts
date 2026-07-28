import {
  normaliseFrequency,
  type ListingQuantity,
} from "../../listings/quantity";
import { COUNTRIES } from "../../countries";
import type { StructureDraft } from "../draft";

/**
 * The primitives every procedure needs, in one module the draft does not import
 * back into.
 *
 * `draftQuantity` lives here rather than in `draft.ts` for exactly that reason:
 * the products procedure needs it, the draft re-exports it so its public API is
 * unchanged, and the dependency runs one way only. A cycle between the draft
 * and its own procedures would work today under esbuild and break the first
 * time somebody moved a constant.
 */

export const has = (v: unknown): boolean =>
  v !== null && v !== undefined && String(v).trim() !== "";

/**
 * The quantity on a draft, in the shared model.
 *
 * One conversion, used by the gap check, the review model, the synthesised
 * details and the submit payload, so all four agree about whether a quantity
 * has been stated and what it says.
 */
export function draftQuantity(draft: StructureDraft): ListingQuantity | null {
  // A bare number with no mode reads as `exact`, which is the same rule
  // `quantityFromRow` already applies to a stored listing that predates the
  // mode column. It matters on the AI intake route: extraction writes
  // `quantity`, `unit` and `frequency` from the document and never sets a
  // mode, so without this fallback a document-extracted draft has no quantity
  // here at all.
  if (!draft.quantityMode) {
    if (draft.quantity === null || draft.quantity === undefined) return null;
    return {
      mode: "exact",
      value: draft.quantity,
      unit: draft.unit,
      frequency: normaliseFrequency(draft.frequency),
    };
  }
  return {
    mode: draft.quantityMode,
    value: draft.quantity,
    minValue: draft.quantityMin,
    maxValue: draft.quantityMax,
    unit: draft.unit,
    frequency: normaliseFrequency(draft.frequency),
  };
}

/** ISO-2 codes as country names, for a value a person reads. */
export function countryNames(codes: readonly string[]): string | null {
  if (codes.length === 0) return null;
  return codes.map((c) => COUNTRIES.find((x) => x.code === c)?.name ?? c).join(", ");
}

/** A list of taxonomy keys as labels, or null when nothing was chosen. */
export function labelsOf<T extends { label: string }>(
  keys: readonly string[],
  lookup: (key: string) => T | null,
): string | null {
  const labels = keys.map((k) => lookup(k)?.label).filter((l): l is string => !!l);
  return labels.length > 0 ? labels.join(", ") : null;
}

/** Trim to null, so an empty string is never mistaken for a stated fact. */
export function trimmed(value: string | null | undefined): string | null {
  const text = (value ?? "").trim();
  return text.length > 0 ? text : null;
}

/**
 * How long the record stays open, as a value the copy layer writes.
 *
 * "Open until I withdraw it" and "{n} days" are the exact strings the validity
 * control offers, and a review that invented its own wording for the same
 * answer would show a member something they had not chosen.
 */
export function validityValue(
  draft: StructureDraft,
): { value: string | null; message?: { key: string; params?: Record<string, string | number> } } {
  if (draft.validity === "standing") {
    return { value: "Open until withdrawn", message: { key: "complete.standing" } };
  }
  if (typeof draft.validity === "number") {
    return {
      value: `${draft.validity} days`,
      message: { key: "complete.days", params: { n: draft.validity } },
    };
  }
  return { value: null };
}

/**
 * Does this draft describe capability the member HAS, rather than capability
 * they require of a counterparty?
 *
 * One predicate, read by the question copy above and by the synthesised detail
 * clauses, so the record's own text cannot say "expected of the partner" while
 * the screen that collected it said "What do you bring?".
 */
export function statesOwnCapability(draft: StructureDraft): boolean {
  const intent = draft.canonical?.intent;
  return (
    intent === "offer_distribution_or_representation" ||
    intent === "seek_brands_or_products_to_represent"
  );
}

/**
 * The blockers every family ends with, in the order a member meets them.
 *
 * Both mirror rules the CENTRAL eligibility validator applies, and they are
 * stated here so the composer's account of what is outstanding cannot drift
 * from the rule that actually decides publication.
 *
 * The declaration is the one that was missing. `evaluateListing` blocks on
 * `declaration_required` when a listing carries no `declaration_accepted_at`,
 * and nothing in the composer ever asked for it or sent it. So every record
 * submitted through Start a Deal was held server-side for a reason the member
 * was never shown and could not act on, while the submit screen told them the
 * only outstanding item was their business verification.
 */
export function closingBlockers(draft: StructureDraft): { key: string; resolve: "declare" | "verify" }[] {
  const out: { key: string; resolve: "declare" | "verify" }[] = [];
  if (!draft.declarationAccepted) out.push({ key: "declaration", resolve: "declare" });
  // Publication always needs a current member-business verification.
  out.push({ key: "businessVerification", resolve: "verify" });
  return out;
}
