/**
 * The completion binder: family-specific record completion, bound to the
 * existing progress engine. Pure — no React, no database, no Next.
 *
 * ADR-0016 (mobile action hierarchy and the universal Task Completion Bridge)
 * decides that Start a Deal shows how complete a record is, and that the value
 * is **derived, never stored**. This module is the derivation it names: it turns
 * `procedureFor(draft).completionFields` + `isFilled` into a `progressValue`
 * step table and a done set, and the engine in `lib/ponte/progress.ts` is not
 * modified.
 *
 * ## What counts, and what does not
 *
 * 100% means **every required *applicable* field is complete** (ADR-0016
 * decision 2, interpretation A). "Applicable" is already answered by the
 * procedure: `completionFields(draft)` omits the route end this member does not
 * decide, a service dimension a category has no question for, and the product
 * scope a represent-seeker has not chosen — so those are never counted and never
 * read as gaps.
 *
 * **Optional enrichment does not enter the denominator** (decision 3). `note`
 * is the enrichment field in every family's queue; it is surfaced separately as
 * a subordinate record-strength signal, never as a step whose absence holds the
 * bridge below 100. Reaching 100 must be achievable by a member who has only the
 * required facts, which is the whole point of interpretation A.
 *
 * ## Why weights are relative and normalised here
 *
 * The applicable set changes with intent, family and category, but
 * `assertWeights` requires a step table that sums to exactly 100. So each family
 * carries *relative* weights over every field it can require, and the binder
 * apportions the applicable subset to 100 by largest remainder. The relative
 * weights are irregular by hand (Constitution §9 forbids an equal ladder), and
 * apportionment preserves that: the result never comes back all-equal.
 */

import type { StructureDraft, CompletionField } from "./draft";
import { procedureFor } from "./draft";
import type { MarketFamily } from "@/lib/taxonomy/market";
import { progressValue, progressBand, type ProgressStep, type ProgressScale } from "@/lib/ponte/progress";

/**
 * The enrichment fields: present in a procedure's completion queue, but not part
 * of what "complete" means. They improve a record; they are not required to
 * finish it. Kept as a set so the exclusion is one obvious list, not a `filter`
 * predicate scattered across the file.
 */
export const ENRICHMENT_FIELDS: ReadonlySet<CompletionField> = new Set<CompletionField>(["note"]);

/**
 * Relative weights, per family, over every field the family can *require*.
 *
 * Irregular on purpose. These are not percentages: they are apportioned to 100
 * across whatever subset is applicable to a given draft. A field absent from its
 * family's map (or in `ENRICHMENT_FIELDS`) is never a completion step.
 *
 * `origin` and `destination` both appear for Products because the procedure asks
 * exactly one of them per intent; only the applicable one is ever apportioned.
 */
const FAMILY_WEIGHTS: Record<MarketFamily, Partial<Record<CompletionField, number>>> = {
  products: {
    quantity: 30,
    origin: 22,
    destination: 22,
    incoterm: 18,
    payment: 14,
    validity: 11,
    role: 8,
  },
  services: {
    serviceScope: 22,
    serviceEngagement: 16,
    serviceCoverage: 15,
    serviceCapability: 13,
    serviceSpecialisation: 12,
    servicePricingBasis: 10,
    serviceAvailability: 9,
    validity: 8,
    role: 6,
  },
  distribution: {
    distributionObjective: 22,
    distributionProductScope: 16,
    distributionChannels: 15,
    distributionCapabilities: 14,
    distributionExpectations: 13,
    distributionTiming: 10,
    validity: 8,
    role: 6,
  },
};

/**
 * The family of a draft, defaulting to products. `CanonicalPair.family` is typed
 * as a bare string, so this narrows it to a known family and never indexes the
 * weight map with an unrecognised key.
 */
function familyOf(draft: StructureDraft): MarketFamily {
  const family = draft.canonical?.family;
  return family === "services" || family === "distribution" ? family : "products";
}

/** The required (non-enrichment) applicable fields for this draft, in queue order. */
export function requiredFields(draft: StructureDraft): CompletionField[] {
  return procedureFor(draft)
    .completionFields(draft)
    .filter((f) => !ENRICHMENT_FIELDS.has(f));
}

/**
 * Apportion relative weights to integers summing to exactly 100 (largest
 * remainder / Hamilton). Deterministic, and the remainder is broken by the
 * field's queue position so the same draft always yields the same table.
 */
function apportion(entries: { id: CompletionField; weight: number }[]): ProgressStep[] {
  const total = entries.reduce((sum, e) => sum + e.weight, 0);
  if (total <= 0 || entries.length === 0) return [];
  if (entries.length === 1) return [{ id: entries[0].id, weight: 100 }];

  const raw = entries.map((e, index) => {
    const exact = (e.weight / total) * 100;
    const floor = Math.floor(exact);
    return { id: e.id, floor, remainder: exact - floor, index };
  });

  let used = raw.reduce((sum, r) => sum + r.floor, 0);
  let remaining = 100 - used;
  // Hand out the remaining points to the largest fractional remainders first,
  // queue order breaking a tie. Never lifts a floor of 0 past its neighbours in
  // a way that flattens the table: the base weights are irregular, so the
  // result is too.
  const order = [...raw].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  const bump = new Set<number>();
  for (let i = 0; i < remaining; i += 1) bump.add(order[i].index);

  return raw.map((r) => ({ id: r.id, weight: r.floor + (bump.has(r.index) ? 1 : 0) }));
}

/**
 * The step table for a draft: the applicable required fields, apportioned to
 * 100. Empty when nothing is required yet (e.g. no family chosen and no product
 * fields applicable), which the engine reads as "no procedure to measure".
 */
export function completionSteps(draft: StructureDraft): ProgressStep[] {
  const family = familyOf(draft);
  const weights = FAMILY_WEIGHTS[family];
  const entries = requiredFields(draft)
    .map((id) => ({ id, weight: weights[id] ?? 0 }))
    .filter((e) => e.weight > 0);
  return apportion(entries);
}

/** The applicable required fields this draft has actually filled. */
export function completionDone(draft: StructureDraft): CompletionField[] {
  const procedure = procedureFor(draft);
  return requiredFields(draft).filter((f) => procedure.isFilled(draft, f));
}

/**
 * The completion value for a draft, or `null` before the first required field
 * is filled. This is the number the Task Completion Bridge advances along.
 *
 * Delegates entirely to `progressValue`: the 20-point neutral floor, the
 * never-round-an-incomplete-record-up-to-100 rule and the 100-only-when-every-
 * applicable-step-is-done rule are the engine's, not restated here.
 */
export function completionValue(draft: StructureDraft): number | null {
  const steps = completionSteps(draft);
  if (steps.length === 0) return null;
  return progressValue(
    steps,
    completionDone(draft).filter((id) => steps.some((s) => s.id === id)),
  );
}

/** The approved band label for a completion value, on the opportunity scale. */
export function completionBandLabel(value: number): string {
  return progressBand(value, "opportunity" as ProgressScale);
}

/**
 * Record strength: the subordinate enrichment signal, kept apart from
 * completion so optional detail never blocks 100. It reports how much
 * beyond-the-required detail a member has added, and it is advisory.
 */
export function recordStrength(draft: StructureDraft): { filled: number; total: number; label: string } {
  const enrichment = procedureFor(draft)
    .completionFields(draft)
    .filter((f) => ENRICHMENT_FIELDS.has(f));
  const procedure = procedureFor(draft);
  const filled = enrichment.filter((f) => procedure.isFilled(draft, f)).length;
  const total = enrichment.length;
  const label = total === 0 || filled === 0 ? "Required detail only" : "Extra detail added";
  return { filled, total, label };
}
