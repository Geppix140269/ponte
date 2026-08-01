/**
 * The one boundary between a production record and the Desk fact authority.
 *
 *   MarketSignal  ->  toDeskRecord(signal)  ->  factsFor(deskRecord, context)
 *
 * Production field mappings live here and nowhere else. A React component that
 * reaches for `signal.incoterm` to decide what a register cell says has
 * reintroduced the per-screen fact logic `factsFor` exists to remove, so the
 * routes take a `DeskRecord` and never a `MarketSignal`.
 *
 * Two rules this file has to hold:
 *
 *   1. Nothing is invented. `desk_radar` carries no classification column, so
 *      `side` is adapted to the two classifications it genuinely proves, and no
 *      other. A tender, a licence or a duty change is not inferred from product
 *      text to make the design look richer.
 *   2. Nothing populated is reported absent. Every production column that has a
 *      Desk fact is mapped, so `factsFor` can only ever print "Not stated"
 *      against a field the record truly does not state. The unit test asserts
 *      exactly this, per field.
 *
 * Provenance never crosses this boundary. `source_platform`, `source_url` and
 * the raw prose are internal columns that the public reader does not even
 * select, so a Desk record carries a read DATE and never a source name. The
 * prototype's "Source, read 22 Jul" column is therefore implemented as the read
 * date alone: naming the portal would leak the provenance the signal contract
 * forbids.
 *
 * Pure. No database, no Next, no React, so it is unit-tested standalone.
 */

import type { MarketSignal } from "@/lib/market-signals/logic";
import type { DeskClassification, FactBag } from "./facts";

/**
 * The reference a member sees, with the source platform removed.
 *
 * Imported ids are minted as `EXT-<SOURCE>-<NUMBER>`, so a signal read from
 * Go4WorldBusiness reached the screen as `EXT-G4WB-000156`. That token is the
 * portal's name in an abbreviation, printed on every card, every register row
 * and every detail page.
 *
 * It contradicts the rule stated at the top of this file: provenance does not
 * cross this boundary, and a Desk record carries a read date and never a source
 * name. The read date was implemented correctly; the identifier was not, and it
 * leaked the same fact more durably, because a reference is quoted, bookmarked
 * and pasted into correspondence.
 *
 * The vendor token is matched by shape rather than by name, so the next import
 * source cannot reintroduce the leak by not being called G4WB.
 *
 * Only the DISPLAY is changed here. Stored ids and the URLs already published
 * against them are unchanged, because rewriting an identifier that members and
 * search engines already hold is a separate decision with its own migration.
 */
export function publicRef(id: string): string {
  return id.replace(/^EXT-[A-Z0-9]{2,8}-(?=\d)/i, "EXT-");
}

/** A record as every Desk surface sees it. Facts are read only by `factsFor`. */
export interface DeskRecord {
  /** The stable public reference shown beside the classification. */
  ref: string;
  cls: DeskClassification;
  /** The classification as a word. Never a colour, never an icon alone. */
  clsLabel: string;
  title: string;
  /** "A to B", one end, or null when the record states neither. */
  corridor: string | null;
  hs: string | null;
  /** ISO date the signal was read. Never a source name: that is internal. */
  readAt: string;
  /** The read date as a reader sees it, e.g. "24 Jul 2026". */
  readLabel: string;
  href: string;
  facts: FactBag;
}

/** `desk_radar.side` is the only classification production proves. */
export function classificationForSide(side: string): DeskClassification {
  return side === "offer" ? "offer" : "requirement";
}

const CLASSIFICATION_LABEL: Record<DeskClassification, string> = {
  tender: "Public tender",
  requirement: "Buyer requirement",
  offer: "Seller offer",
  licence: "Import licence",
  shipment: "Trade indication",
  distribution: "Distribution",
  service: "Trade service",
  opportunity: "Qualified Opportunity",
  regulatory: "Regulatory change",
  capacity: "Capacity change",
  announcement: "Company announcement",
  price: "Price movement",
};

export function classificationLabel(cls: DeskClassification): string {
  return CLASSIFICATION_LABEL[cls];
}

const clean = (v: string | null | undefined): string | undefined => {
  if (typeof v !== "string") return undefined;
  const s = v.replace(/\s+/g, " ").trim();
  return s === "" ? undefined : s;
};

/**
 * The two ends of the route, as the record states them.
 *
 * Only the ends actually present. A half-stated route is written as the half it
 * is; it is never padded with a placeholder a reader could mistake for a fact.
 */
export function corridorOf(signal: Pick<MarketSignal, "originText" | "destinationText">): string | null {
  const from = clean(signal.originText);
  const to = clean(signal.destinationText);
  if (from && to) return `${from} to ${to}`;
  return from ?? to ?? null;
}

/**
 * Quantity as one readable fact.
 *
 * Either part alone is a real answer: "12,000" with no unit is what the source
 * printed, and a unit with no number still tells a reader what is being
 * counted. Only the absence of both is an absence.
 */
export function quantityOf(
  signal: Pick<MarketSignal, "quantity" | "unit">,
): string | undefined {
  const qty = clean(signal.quantity);
  const unit = clean(signal.unit);
  if (qty && unit) return `${qty} ${unit}`;
  return qty ?? unit;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * A read date as a reader sees it: "24 Jul 2026".
 *
 * Deliberately not `toLocaleDateString`. Ponte is English-first with one
 * interface language, the month names are therefore fixed, and a formatter
 * that reads the runtime's locale would render one string on the server and
 * another in the browser on a machine set to anything else. A date that
 * changes on hydration is a date nobody can cite.
 *
 * A value that is not a date is returned untouched rather than turned into
 * "Invalid Date": the record said something, and this is not the place to
 * decide it said nothing.
 */
export function readLabelFor(value: string): string {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return value;
  const d = new Date(ms);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Map a public Market Signal onto the Desk record shape.
 *
 * The fact bag is keyed by the classification's own vocabulary, so a buyer
 * requirement contributes a `destination` and a seller offer contributes an
 * `origin`: that is the end of the route the record's own side actually
 * decides. Both ends are still carried when both are stated, because a record
 * that states more is not made to state less.
 */
export function toDeskRecord(signal: MarketSignal): DeskRecord {
  const cls = classificationForSide(signal.side);

  const facts: FactBag = {
    quantity: quantityOf(signal),
    origin: clean(signal.originText),
    destination: clean(signal.destinationText),
    delivery: clean(signal.incoterm),
    paymentInstrument: clean(signal.payment),
    corridor: corridorOf(signal) ?? undefined,
    signalDate: readLabelFor(signal.spottedAt),
    // Deliberately unmapped, because production states none of them: `timing`
    // (a shipment window), `priceBasis` and `value`. They are not guessed from
    // the description, and `factsFor` prints the ones whose absence is
    // commercially meaningful as "Not stated", which is the truth.
  };

  return {
    ref: publicRef(signal.canonicalId ?? signal.id),
    cls,
    clsLabel: classificationLabel(cls),
    title: clean(signal.summaryLine) ?? signal.product,
    corridor: corridorOf(signal),
    hs: clean(signal.hsCode) ?? null,
    readAt: signal.spottedAt,
    readLabel: readLabelFor(signal.spottedAt),
    href: `/market-signals/${signal.id}`,
    facts,
  };
}
