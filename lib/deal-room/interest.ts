/**
 * The typed credible-commercial-interest boundary.
 *
 * A Deal Room may be proposed only after credible commercial interest exists.
 * The product contract section 4 is explicit about the negative case: "A public
 * Market Signal, search result, expression of curiosity or incomplete draft
 * does not create an active room." So this module's job is to say no, with a
 * reason, far more often than it says yes.
 *
 * ## Family-aware, and that is the whole difficulty
 *
 * ADR-0014 established that the three families do not share one set of
 * commercial facts. The composer already refuses a quantity on a services
 * record and an Incoterm on a distribution record. If the eligibility rule here
 * asked every family for the same facts, it would reintroduce the product shape
 * one layer downstream: a freight forwarder would be told their Deal was not
 * ready for a room because it had no quantity.
 *
 * So the required facts are read per family, from the fields that family
 * actually populates.
 *
 * Pure module. `__tests__/interest.test.ts` walks all three families and
 * asserts the negative cases, including that no products-only field is ever
 * consulted for the other two.
 */

import type { MarketFamily } from "./procedure";

/** The route by which interest became credible. Product contract section 4. */
export const INTEREST_ROUTES = [
  "accepted_introduction",
  "member_opportunity_participation",
  "investigated_signal",
  "imported_transaction",
  "ponte_facilitated",
  "qualified_member_discussion",
] as const;

export type InterestRoute = (typeof INTEREST_ROUTES)[number];

export const INTEREST_ROUTE_LABEL: Record<InterestRoute, string> = {
  accepted_introduction: "An introduction both parties accepted",
  member_opportunity_participation: "Accepted participation in a Member Opportunity",
  investigated_signal: "A Market Signal Ponte investigated to a viable contact route",
  imported_transaction: "An existing transaction imported by its participants",
  ponte_facilitated: "A Ponte-facilitated transaction",
  qualified_member_discussion: "A qualified member-to-member discussion both principals wish to structure",
};

/**
 * The Deal as this module needs to see it.
 *
 * Field names mirror the live `listings` columns so the mapping from a row is
 * obvious and nothing is renamed on the way in.
 */
export interface DealFacts {
  id: string;
  status: string;
  marketFamily: MarketFamily | null;
  marketIntent: string | null;
  product: string | null;
  ownerProfileId: string;
  validUntil: string | null;
  withdrawnAt: string | null;

  // Products-only. Never read for services or distribution.
  quantity: number | null;
  unit: string | null;
  incoterm: string | null;
  originCountry: string | null;
  destinationCountry: string | null;

  // Services-only.
  serviceCategoryKey: string | null;
  coverageScopeKey: string | null;

  // Distribution-only.
  distributionPartnerTypeKey: string | null;
  territoryCodes: readonly string[] | null;
  productSectorKey: string | null;
}

export interface InterestFacts {
  route: InterestRoute;
  /** The organisation or capacity expressing interest. */
  interestedParty: string;
  /** Their role in the proposed transaction. */
  role: string;
  /** What they want, in their own words. Substance, not a greeting. */
  statedObjective: string;
  /** Both principals must be identifiable before a room may be proposed. */
  counterpartyProfileId: string | null;
}

export interface EligibilityBlocker {
  code: string;
  /** What is missing, said to the member, not to a developer. */
  message: string;
  /** Where they fix it, when a route exists. */
  remedy: string | null;
}

export interface EligibilityResult {
  eligible: boolean;
  blockers: EligibilityBlocker[];
  /** Present only when eligible; the facts the room will be built from. */
  scope: { family: MarketFamily; subject: string; route: InterestRoute } | null;
}

/** Which fields each family must carry before its Deal can support a room. */
const REQUIRED_BY_FAMILY: Record<
  MarketFamily,
  readonly { read: (deal: DealFacts) => unknown; code: string; message: string }[]
> = {
  products: [
    {
      read: (d) => d.product,
      code: "products_no_subject",
      message: "This Deal does not name the product it concerns.",
    },
    {
      read: (d) => d.quantity,
      code: "products_no_quantity",
      message: "This Deal does not state a quantity, so there is nothing for the parties to specify against.",
    },
    {
      read: (d) => d.originCountry ?? d.destinationCountry,
      code: "products_no_route",
      message: "This Deal states neither an origin nor a destination country.",
    },
  ],
  services: [
    {
      read: (d) => d.serviceCategoryKey,
      code: "services_no_category",
      message: "This Deal does not state which service category it concerns.",
    },
    {
      read: (d) => d.coverageScopeKey,
      code: "services_no_coverage",
      message: "This Deal does not state the coverage the service applies to.",
    },
  ],
  distribution: [
    {
      read: (d) => d.distributionPartnerTypeKey,
      code: "distribution_no_partner_type",
      message: "This Deal does not state the kind of partner or channel it concerns.",
    },
    {
      read: (d) => d.productSectorKey,
      code: "distribution_no_sector",
      message: "This Deal does not state the product or sector to be represented.",
    },
    {
      read: (d) => (d.territoryCodes && d.territoryCodes.length > 0 ? d.territoryCodes : null),
      code: "distribution_no_territory",
      message: "This Deal does not state a territory.",
    },
  ],
};

/**
 * The subject line a room is titled with, per family.
 *
 * Products name the product. Services name the category. Distribution names the
 * sector and territory. Nothing borrows another family's noun.
 */
function subjectFor(deal: DealFacts, family: MarketFamily): string {
  switch (family) {
    case "products":
      return deal.product ?? "Product";
    case "services":
      return deal.serviceCategoryKey ?? "Trade service";
    case "distribution": {
      const territory = deal.territoryCodes?.length ? ` in ${deal.territoryCodes.join(", ")}` : "";
      return `${deal.productSectorKey ?? "Distribution"}${territory}`;
    }
  }
}

/**
 * Decide whether a Deal plus an interest event may become a proposed room.
 *
 * Every blocker is returned, not just the first, because the entry screen has
 * to list what is missing without silent defaults - which is DR-02's stated
 * rule and DR-01's requirement to "show exact reason when unavailable".
 */
export function assessCredibleInterest(deal: DealFacts, interest: InterestFacts): EligibilityResult {
  const blockers: EligibilityBlocker[] = [];

  if (deal.withdrawnAt) {
    blockers.push({
      code: "deal_withdrawn",
      message: "This Deal has been withdrawn.",
      remedy: null,
    });
  }

  if (deal.validUntil && Date.parse(deal.validUntil) < Date.now()) {
    blockers.push({
      code: "deal_expired",
      message: "This Deal has passed its validity date.",
      remedy: "Reconfirm the Deal before taking it forward.",
    });
  }

  // Publication state is the proxy for "structurally complete and eligible".
  // A draft is exactly the incomplete draft the product contract names.
  if (deal.status !== "approved") {
    blockers.push({
      code: "deal_not_published",
      message: "Only a published Deal can be taken into a Deal Room. This one has not been published.",
      remedy: "Complete and publish the Deal first.",
    });
  }

  if (!deal.marketFamily) {
    blockers.push({
      code: "no_family",
      message: "This Deal does not carry a market family, so Ponte cannot tell which procedure applies.",
      remedy: null,
    });
  }

  if (!deal.marketIntent) {
    blockers.push({
      code: "no_intent",
      message: "This Deal does not carry an intent.",
      remedy: null,
    });
  }

  if (deal.marketFamily) {
    for (const requirement of REQUIRED_BY_FAMILY[deal.marketFamily]) {
      const value = requirement.read(deal);
      if (value === null || value === undefined || value === "") {
        blockers.push({ code: requirement.code, message: requirement.message, remedy: "Complete the Deal." });
      }
    }
  }

  // The interest side. A room needs a second identifiable principal: one party
  // may prepare a room, but it is proposed to somebody.
  if (!interest.counterpartyProfileId) {
    blockers.push({
      code: "no_counterparty",
      message: "No counterparty has been identified, so there is nobody to invite.",
      remedy: null,
    });
  }

  if (interest.counterpartyProfileId && interest.counterpartyProfileId === deal.ownerProfileId) {
    blockers.push({
      code: "self_counterparty",
      message: "The Deal owner and the counterparty are the same member.",
      remedy: null,
    });
  }

  if (!interest.statedObjective.trim()) {
    blockers.push({
      code: "no_objective",
      message: "The interest recorded has no stated objective, which is the curiosity case a room is not for.",
      remedy: null,
    });
  }

  if (!interest.role.trim()) {
    blockers.push({
      code: "no_role",
      message: "No role has been stated for the interested party.",
      remedy: null,
    });
  }

  const eligible = blockers.length === 0;
  return {
    eligible,
    blockers,
    scope: eligible && deal.marketFamily
      ? { family: deal.marketFamily, subject: subjectFor(deal, deal.marketFamily), route: interest.route }
      : null,
  };
}

/**
 * The immutable Deal snapshot a room is built from.
 *
 * A room references a Deal *version*, not the live row, so an edit to the
 * published Deal cannot silently rewrite what the parties agreed to work on.
 * Only the fields the family actually uses are copied: a services snapshot has
 * no quantity key at all, rather than a null one, so no downstream reader can
 * print "Quantity: not stated" on a freight forwarding room.
 */
export function dealSnapshot(deal: DealFacts, family: MarketFamily): Record<string, unknown> {
  const base = {
    deal_id: deal.id,
    market_family: family,
    market_intent: deal.marketIntent,
    subject: subjectFor(deal, family),
  };

  switch (family) {
    case "products":
      return {
        ...base,
        product: deal.product,
        quantity: deal.quantity,
        unit: deal.unit,
        incoterm: deal.incoterm,
        origin_country: deal.originCountry,
        destination_country: deal.destinationCountry,
      };
    case "services":
      return {
        ...base,
        service_category_key: deal.serviceCategoryKey,
        coverage_scope_key: deal.coverageScopeKey,
        territory_codes: deal.territoryCodes ?? null,
      };
    case "distribution":
      return {
        ...base,
        distribution_partner_type_key: deal.distributionPartnerTypeKey,
        product_sector_key: deal.productSectorKey,
        territory_codes: deal.territoryCodes ?? null,
      };
  }
}
