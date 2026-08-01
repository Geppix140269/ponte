import { publicRef } from "@/lib/desk/adapter";
import type { MarketSignal } from "./logic";

/**
 * How a Market Signal is described to a search engine and to an AI crawler.
 *
 * Pure: no database, no Next. The detail route and the sitemap both read it, and
 * the unit test reads it directly, so the indexing RULE is asserted rather than
 * trusted, which matters more here than usual, because the rule decides what
 * Ponte says about a market in a search result it does not control.
 *
 * ---------------------------------------------------------------------------
 * Why a signal was `noindex`, and what had to change before it could not be
 * ---------------------------------------------------------------------------
 * The detail page returned `robots: { index: false }` for every signal, with a
 * stated reason: "a signal is a dated indication, and a stale search result is a
 * claim about a market that has moved." That reason is sound and is not waved
 * away here. It is answered:
 *
 *   1. Only a signal that is APPROVED, INSIDE its public window and flagged
 *      `indexable` is offered to a crawler. The same three predicates the board
 *      reads with, so a page that is not public cannot be indexed.
 *   2. Every indexable page carries the date Ponte read the source, in the
 *      visible copy, in the metadata and in the structured data. A dated claim
 *      presented as dated is not a stale claim.
 *   3. A signal with no product is never offered, because the title would be
 *      the record class rather than the record.
 *
 * What remains true, and is a real limit rather than a hedge: a signal carrying
 * no `public_expires_at` never leaves the index by expiry. Publishing a
 * permanent URL for a dated indication is a decision for the desk, not for this
 * module; the module refuses to pretend otherwise, and `indexRisk` names it so a
 * caller can act on it.
 */

/** The three predicates that decide whether a crawler may have this page. */
export function isIndexableSignal(
  signal: Pick<MarketSignal, "status" | "publicExpiresAt" | "product">,
  opts: { indexable?: boolean | null; nowMs?: number } = {},
): boolean {
  if (signal.status !== "approved_signal") return false;
  if (opts.indexable === false) return false;
  const product = signal.product?.trim();
  if (!product || product.length < 3) return false;
  if (signal.publicExpiresAt) {
    const expires = Date.parse(signal.publicExpiresAt);
    if (Number.isFinite(expires) && expires <= (opts.nowMs ?? Date.now())) return false;
  }
  return true;
}

/**
 * Why an otherwise-indexable signal should still be treated with care.
 *
 * Returns null when there is nothing to say. `no_expiry` is the one that
 * matters: the URL will stay in an index until something removes it, so the
 * desk is publishing a permanent address for a dated observation.
 */
export function indexRisk(
  signal: Pick<MarketSignal, "publicExpiresAt">,
): "no_expiry" | null {
  return signal.publicExpiresAt ? null : "no_expiry";
}

const SIDE_NOUN: Record<string, string> = {
  offer: "Seller offer",
  requirement: "Buyer requirement",
};

/** "Basmati Rice: seller offer from Maharashtra, India". */
export function signalTitle(signal: MarketSignal): string {
  const side = SIDE_NOUN[signal.side] ?? "Market signal";
  const where =
    signal.side === "offer"
      ? signal.originText
      : signal.destinationText ?? signal.originText;
  const place = where ? ` from ${where}` : "";
  return `${signal.product}: ${side.toLowerCase()}${place}`;
}

/**
 * The meta description, assembled from stated facts only.
 *
 * Never padded to a target length: an absent quantity is absent, not "quantity
 * available on request". A description that invents a fact to fill a character
 * count is the same defect as a card that prints a placeholder, and a crawler
 * quotes it verbatim.
 */
export function signalDescription(signal: MarketSignal): string {
  const parts: string[] = [];
  parts.push(
    signal.side === "offer"
      ? `Seller offer for ${signal.product}`
      : `Buyer requirement for ${signal.product}`,
  );
  if (signal.quantity) parts.push(`Quantity ${signal.quantity}${signal.unit ? ` ${signal.unit}` : ""}`);
  if (signal.originText) parts.push(`Origin ${signal.originText}`);
  if (signal.destinationText) parts.push(`Destination ${signal.destinationText}`);
  if (signal.incoterm) parts.push(`Delivery ${signal.incoterm}`);
  if (signal.category) parts.push(signal.category);
  parts.push(`Read from a public source on ${readableDate(signal.spottedAt)}`);
  parts.push("Ponte has not confirmed it with any party named in it.");
  return parts.join(". ").replace(/\.\./g, ".");
}

function readableDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "an unrecorded date";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * schema.org for one signal, as the JSON-LD an AI crawler actually parses.
 *
 * A seller offer is an `Offer`; a buyer requirement is a `Demand`. Those are the
 * two schema.org types that mean exactly this, and using `Product` alone for
 * both, the easy shortcut, would tell a crawler that Ponte sells 4,768 things,
 * which is false in two separate ways: Ponte sells none of them, and half of
 * them are people wanting to buy.
 *
 * `seller` / `buyer` are deliberately ABSENT. Ponte holds the counterparty in
 * internal columns and never publishes it, so naming an organisation here would
 * leak exactly what `INTERNAL_SIGNAL_COLUMNS` exists to keep out of a payload,
 * into the one place designed to be machine-harvested.
 *
 * `availabilityStarts` is the date the source was read. `validThrough` is only
 * emitted when there IS an expiry, because an invented one would be a claim
 * about how long an indication holds that nobody has made.
 */
export function signalJsonLd(signal: MarketSignal, url: string): Record<string, unknown> {
  const isOffer = signal.side === "offer";

  const product: Record<string, unknown> = {
    "@type": "Product",
    name: signal.product,
  };
  if (signal.category) product.category = signal.category;
  if (signal.hsCode) {
    product.additionalProperty = [
      { "@type": "PropertyValue", name: "HS chapter", value: signal.hsCode },
    ];
  }

  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": isOffer ? "Offer" : "Demand",
    "@id": url,
    url,
    name: signalTitle(signal),
    description: signalDescription(signal),
    itemOffered: product,
    availabilityStarts: signal.spottedAt,
    // The identifier a member and a crawler both see on the page, with the
    // source platform removed: an imported id is minted EXT-<SOURCE>-<NUMBER>,
    // and emitting it raw published the portal's name into structured data
    // where it outlives the page. Same masking as the Desk adapter.
    ...(signal.canonicalId ? { identifier: publicRef(signal.canonicalId) } : {}),
  };

  if (signal.publicExpiresAt) node.validThrough = signal.publicExpiresAt;

  if (signal.quantity) {
    node.eligibleQuantity = {
      "@type": "QuantitativeValue",
      value: signal.quantity,
      ...(signal.unit ? { unitText: signal.unit } : {}),
    };
  }

  const region = isOffer ? signal.originText : signal.destinationText;
  if (region) {
    node.areaServed = { "@type": "Place", name: region };
  }
  // Stated once, machine-readable, in the same words the page uses. A crawler
  // that reproduces this snippet reproduces the caveat with it.
  node.disambiguatingDescription =
    "An indication observed in a public source. Ponte has not confirmed it with any party named in it, and no party named in it is a Ponte member.";

  return node;
}
