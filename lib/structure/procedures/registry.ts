import type { MarketFamily } from "../../taxonomy/market";
import type { StructureDraft } from "../draft";
import type { CompletionField } from "./types";
import { productsProcedure } from "./products";
import { servicesProcedure } from "./services";
import { distributionProcedure } from "./distribution";
import type { FamilyProcedure } from "./types";

/**
 * One place that says which commercial procedure a record follows.
 *
 * Every downstream stage: the fact buckets, the completion queue, the question
 * controls, the review model, the blockers and the submit payload: reaches its
 * behaviour through here. That is the whole point of the registry: the rule
 * that a trade service is never asked for an Incoterm is stated once, in one
 * file, rather than as a condition repeated wherever an Incoterm is mentioned.
 *
 * A record with no canonical entrance is a Products record. That is not a
 * default chosen for tidiness: the legacy composer entrance produces exactly
 * the product-shaped record it always did, and reading it as anything else
 * would reclassify every record that predates the family entrances.
 */
export const PROCEDURES: Readonly<Record<MarketFamily, FamilyProcedure>> = {
  products: productsProcedure,
  services: servicesProcedure,
  distribution: distributionProcedure,
};

export function procedureForFamily(family: MarketFamily): FamilyProcedure {
  return PROCEDURES[family];
}

/** The family a draft belongs to, canonical when known and products otherwise. */
export function familyOf(draft: StructureDraft): MarketFamily {
  const family = draft.canonical?.family;
  if (family === "services" || family === "distribution" || family === "products") return family;
  return "products";
}

/** The procedure this draft follows. */
export function procedureFor(draft: StructureDraft): FamilyProcedure {
  return PROCEDURES[familyOf(draft)];
}

/**
 * The message key a field is asked with.
 *
 * Two of the distribution questions genuinely differ by intent: a member
 * SEEKING a partner is stating what the partner must bring, and a member
 * OFFERING representation is stating what they already have. Same field, same
 * stored keys, opposite direction.
 *
 * Resolved here rather than in the component for two reasons. It is family
 * behaviour, so it belongs with the rest of the family behaviour. And a test
 * can enumerate every key every procedure can emit and assert the catalogue
 * has it: a missing key renders as a raw dotted path on a live screen, which
 * is the failure mode a component-local helper hides until a member sees it.
 */
export function askKeyFor(field: CompletionField, draft: StructureDraft): string {
  const intent = draft.canonical?.intent;
  if (field === "distributionCapabilities") {
    return intent === "offer_distribution_or_representation"
      ? "ask.distributionCapabilitiesOffered"
      : "ask.distributionCapabilitiesSought";
  }
  if (field === "distributionChannels") {
    return intent === "offer_distribution_or_representation"
      ? "ask.distributionChannelsOffered"
      : "ask.distributionChannelsSought";
  }
  if (field === "serviceScope") {
    return intent === "seek_trade_service" ? "ask.serviceScopeNeeded" : "ask.serviceScope";
  }
  return `ask.${field}`;
}

export * from "./types";
export { asksFor } from "./products";
export { serviceSubject } from "./services";
export { distributionSubject } from "./distribution";
export { draftQuantity, has } from "./shared";
