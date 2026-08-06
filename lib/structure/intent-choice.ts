/**
 * `B01` Choose Deal Intent: six choices on screen, seven stored values.
 *
 * Authority: `PONTE-BUILD-1-LISTING-PATH-v2.md`, mapping table confirmed by the
 * owner 6 August 2026. `DECISION-17` requires six opportunity types; the
 * database admits seven values of `market_intent`. Both are right, and this is
 * the reconciliation.
 *
 * ## Why seven values behind six choices
 *
 * "Find distribution or representation" is **ambiguous without position**. A
 * principal looking for someone to sell its goods, and a distributor looking
 * for goods to sell, both say "find distribution" - and they are each other's
 * counterparty, not the same listing. Two records that are counterparties must
 * never look identical to two that are peers, or the board matches the wrong
 * pairs.
 *
 * So one presented choice resolves to two stored values, decided by a question
 * asked **only in the distribution branch**:
 *
 *   family + direction        -> one value, for products and services
 *   family + direction + position -> one of three, for distribution
 *
 * ## The axis that must not collapse
 *
 * `DECISION-17`'s six types are a PRESENTATION. `market_intent`'s seven values
 * are STORAGE. The live `/structure` screen offers three options, which is the
 * error this replaces: it collapsed family and direction into one list and lost
 * position entirely.
 *
 * ## `market_family` is a closed set, enforced by the database
 *
 *   listings_market_family_check
 *     CHECK (market_family IS NULL
 *            OR market_family IN ('products','services','distribution'))
 *
 * `goods`, `trade_services` and `product` are outside it on both `listings` and
 * `deal_rooms`, and they are what crashed the signed-in path on 2 August. This
 * module cannot produce them: every family it returns comes from a literal
 * union that the compiler checks and a test pins against the CHECK.
 */

import type { MarketFamily, MarketIntent, MarketSide } from "@/lib/taxonomy/market";

/* ------------------------------------------------------------------ *
 * The three axes
 * ------------------------------------------------------------------ */

/**
 * What the member is here to do.
 *
 * Named for what the member is asked - "I need something" / "I am offering
 * something" - rather than for how it is stored. `MarketSide` is the storage
 * vocabulary (`demand` / `supply`) and `sideFor` is the one place they meet, so
 * a rename on either side has exactly one place to break.
 */
export type Direction = "need" | "offer";

/**
 * Which side of a distribution arrangement the member is on.
 *
 * Asked **only** when the family is `distribution`. For products and services
 * it is not merely unused, it is meaningless: a product listing has no position
 * because there is no arrangement to have a side of.
 */
export type Position = "principal" | "distributor_or_representative";

/** `demand`/`supply` is how the taxonomy stores what the member is asked. */
export function sideFor(direction: Direction): MarketSide {
  return direction === "need" ? "demand" : "supply";
}

/* ------------------------------------------------------------------ *
 * The six presented choices
 * ------------------------------------------------------------------ */

export interface PresentedChoice {
  /** Stable key for analytics and tests. Never shown. */
  key: string;
  /** The words on the row. */
  label: string;
  family: MarketFamily;
  direction: Direction;
}

/**
 * Six rows, in the order `DECISION-17` names them.
 *
 * Distribution appears **twice as one row each way**, not four times. The
 * position question splits the "find" row afterwards; it is not a fourth and
 * fifth choice in this list, because a member who has not yet said they are in
 * distribution should not be reading about principals and representatives.
 */
export const PRESENTED_CHOICES: readonly PresentedChoice[] = [
  { key: "source_product", label: "Source a product", family: "products", direction: "need" },
  { key: "supply_product", label: "Supply a product", family: "products", direction: "offer" },
  { key: "find_service", label: "Find a trade service", family: "services", direction: "need" },
  { key: "offer_service", label: "Offer a trade service", family: "services", direction: "offer" },
  {
    key: "find_distribution",
    label: "Find distribution or representation",
    family: "distribution",
    direction: "need",
  },
  {
    key: "offer_distribution",
    label: "Offer distribution or representation",
    family: "distribution",
    direction: "offer",
  },
];

/* ------------------------------------------------------------------ *
 * Resolution
 * ------------------------------------------------------------------ */

/**
 * What the member's answers resolve to.
 *
 * `needs_position` is a **state, not an error**. It is the one case where the
 * interface must ask another question before anything can be stored, and
 * returning it as a value rather than throwing is what lets `B01` render the
 * position surface without the caller having to know when to.
 */
export type IntentResolution =
  | { outcome: "resolved"; intent: MarketIntent; family: MarketFamily }
  | { outcome: "needs_position"; family: "distribution"; direction: "need" };

/**
 * The confirmed table, as code.
 *
 * | Presented | Family | Direction | Position | Stored |
 * | --- | --- | --- | --- | --- |
 * | Source a product | products | need | n/a | `source_product` |
 * | Supply a product | products | offer | n/a | `offer_product` |
 * | Find a trade service | services | need | n/a | `seek_trade_service` |
 * | Offer a trade service | services | offer | n/a | `offer_trade_service` |
 * | Find distribution or representation | distribution | need | principal | `seek_distribution_partner` |
 * | Find distribution or representation | distribution | need | distributor or representative | `seek_brands_or_products_to_represent` |
 * | Offer distribution or representation | distribution | offer | distributor or representative | `offer_distribution_or_representation` |
 *
 * **`distribution` + `offer` + `principal` is deliberately absent.** A
 * principal with goods to sell is offering a PRODUCT, not offering
 * distribution. Position is therefore not asked on the offer side: it is
 * already known, and asking would invite an answer that has no meaning.
 */
export function resolveIntent(
  family: MarketFamily,
  direction: Direction,
  position?: Position | null,
): IntentResolution {
  if (family === "products") {
    return {
      outcome: "resolved",
      family,
      intent: direction === "need" ? "source_product" : "offer_product",
    };
  }

  if (family === "services") {
    return {
      outcome: "resolved",
      family,
      intent: direction === "need" ? "seek_trade_service" : "offer_trade_service",
    };
  }

  // Distribution. The only family with a third axis.
  if (direction === "offer") {
    // Position is known rather than asked: only a distributor or
    // representative can offer distribution.
    return { outcome: "resolved", family, intent: "offer_distribution_or_representation" };
  }

  if (!position) return { outcome: "needs_position", family: "distribution", direction: "need" };

  return {
    outcome: "resolved",
    family,
    intent:
      position === "principal"
        ? "seek_distribution_partner"
        : "seek_brands_or_products_to_represent",
  };
}

/**
 * Is the position question due?
 *
 * For the interface, so the surface and the resolver cannot disagree about when
 * it appears. `B01` asks this rather than testing `family === "distribution"`
 * itself, because the offer side does not need it and a screen that asked
 * anyway would be collecting an answer nothing reads.
 */
export function needsPosition(family: MarketFamily, direction: Direction): boolean {
  return resolveIntent(family, direction, null).outcome === "needs_position";
}

/**
 * The two position options, with the words the member reads.
 *
 * Phrased as what the member HAS, not as a role title. "I have goods and want
 * someone to sell them" is answerable; "are you a principal?" is a question
 * about vocabulary, and `ADR-0023` is explicit that members choose rather than
 * type - which extends to not making them decode a word first.
 */
export const POSITION_OPTIONS: readonly {
  key: Position;
  label: string;
  detail: string;
}[] = [
  {
    key: "principal",
    label: "I am seeking a distributor or agent",
    detail: "You have the goods and want someone to sell or represent them in a market",
  },
  {
    key: "distributor_or_representative",
    label: "I am seeking brands or products to represent",
    detail: "You have the market and want goods to sell or represent in it",
  },
];
