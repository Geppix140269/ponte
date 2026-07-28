import type { MarketFamily } from "../../taxonomy/market";
import type { StructureDraft } from "../draft";
import type { CompletionField } from "./types";
import { statesOwnCapability } from "./shared";
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

  // ---- Trade services: providing versus requesting ------------------------
  //
  // Every downstream service question has two sides. A provider states the
  // coverage they HAVE, the capacity they can commit, how they charge and when
  // they are free. A requester states the coverage they NEED, the capacity the
  // work requires, how they expect to be quoted and when they need it by.
  //
  // Asking a requester "How is the service charged for?" asks them to price
  // somebody else's service, and asking "When is it available?" asks them about
  // capacity they do not own. Both invite an answer that is not theirs to give.
  if (intent === "seek_trade_service") {
    switch (field) {
      case "serviceScope": return "ask.serviceScopeNeeded";
      case "serviceCoverage": return "ask.serviceCoverageNeeded";
      case "serviceSpecialisation": return "ask.serviceSpecialisationNeeded";
      case "serviceCapability": return "ask.serviceCapabilityNeeded";
      case "servicePricingBasis": return "ask.servicePricingBasisNeeded";
      case "serviceAvailability": return "ask.serviceAvailabilityNeeded";
      default: break;
    }
  }

  // ---- Distribution: which side of the arrangement the member is on -------
  //
  // Two of the three intents describe what the MEMBER brings. A member offering
  // representation, and a member seeking brands to represent, are both
  // presenting their own channels and their own capability: the first to a
  // brand that might appoint them, the second to a brand they want to carry.
  // Only a member seeking a partner is stating requirements OF somebody else.
  //
  // Getting this wrong is not a wording nicety. "What must the partner bring?"
  // asked of somebody offering to be the partner produces a record describing
  // capabilities they expect to receive, which is the opposite of the fact.
  const offersOwnCapability = statesOwnCapability(draft);

  if (field === "distributionCapabilities") {
    return offersOwnCapability
      ? "ask.distributionCapabilitiesOffered"
      : "ask.distributionCapabilitiesSought";
  }
  if (field === "distributionChannels") {
    return offersOwnCapability
      ? "ask.distributionChannelsOffered"
      : "ask.distributionChannelsSought";
  }
  if (field === "distributionObjective" && intent === "seek_brands_or_products_to_represent") {
    return "ask.distributionObjectiveRepresent";
  }
  if (field === "distributionExpectations" && offersOwnCapability) {
    return "ask.distributionExpectationsOffered";
  }

  if (field === "serviceScope") return "ask.serviceScope";
  return `ask.${field}`;
}

export * from "./types";
export { asksFor } from "./products";
export { serviceSubject } from "./services";
export { distributionSubject } from "./distribution";
export { draftQuantity, has, statesOwnCapability } from "./shared";
