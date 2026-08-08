import { categoryForSourceSlug, intentForSide, sideForSourceType } from "./source-taxonomy";

/**
 * The pure decision layer of a Market Signal import: what a source row becomes,
 * and when it may be published.
 *
 * No database, no filesystem, no CSV. The script reads the file and calls this;
 * the tests call it directly. Every rule that decides whether a stranger's
 * commercial indication appears on Ponte's public board is therefore asserted
 * rather than trusted.
 *
 * ---------------------------------------------------------------------------
 * Three rules the first import got wrong, stated here so they cannot recur
 * ---------------------------------------------------------------------------
 *   1. NOTHING IS SKIPPED. Every row returns a decision. A row that cannot be
 *      mapped is HELD with a named reason and counted; it is never dropped by a
 *      `continue`. The reconciliation adds up to the number of rows received,
 *      and that arithmetic is the proof.
 *   2. THE SOURCE DATE IS NOT THE SCRAPE DATE. A row scraped on 6 August 2026
 *      whose indication was posted in 2002 is a historical record. Publishing it
 *      as a Market Signal would state that somebody wants this today. The two
 *      dates are carried separately and the freshness band is derived from the
 *      source date alone.
 *   3. QUALITY IS PER INTENT. "Quantity with a unit" is the right test for a
 *      seller's offer and the wrong one for a buyer's requirement: a buyer
 *      naming a product and a destination has said something actionable without
 *      naming a tonnage. One universal rule held back 3,635 rows last time,
 *      many of them for failing a test that did not apply to them.
 */

/** How old the INDICATION is, measured from the source's own posting date. */
export type Freshness = "current" | "aging" | "historical" | "undated";

/** Inside this many days of the reference date, an indication is current. */
export const CURRENT_DAYS = 90;
/** Beyond `CURRENT_DAYS` and within this, it is aging. Past it, historical. */
export const AGING_DAYS = 365;

const DAY_MS = 86_400_000;

/**
 * The freshness band for a source posting date.
 *
 * `undated` is its own band and not an optimistic `current`: a record whose
 * origin date could not be read has an unknown age, and unknown is not fresh.
 * A future date is treated as current rather than refused, because a source
 * timezone rolling a day forward is not a reason to hold a live indication.
 */
export function freshnessOf(sourceDateIso: string | null, nowMs: number): Freshness {
  if (!sourceDateIso) return "undated";
  const t = Date.parse(sourceDateIso);
  if (!Number.isFinite(t)) return "undated";
  const ageDays = (nowMs - t) / DAY_MS;
  if (ageDays <= CURRENT_DAYS) return "current";
  if (ageDays <= AGING_DAYS) return "aging";
  return "historical";
}

/** Every reason a row may be held. Closed, so the reconciliation can total. */
export type HoldReason =
  | "no_source_id"
  | "unmapped_side"
  | "unmapped_category"
  | "no_product"
  | "generic_product"
  | "duplicate_source_id"
  | "undated"
  | "aging"
  | "historical"
  | "offer_not_actionable"
  | "requirement_not_actionable";

export const HOLD_REASONS: readonly HoldReason[] = [
  "no_source_id",
  "unmapped_side",
  "unmapped_category",
  "no_product",
  "generic_product",
  "duplicate_source_id",
  "undated",
  "aging",
  "historical",
  "offer_not_actionable",
  "requirement_not_actionable",
];

/** Human wording for the reconciliation, so a report needs no legend. */
export const HOLD_REASON_TEXT: Readonly<Record<HoldReason, string>> = {
  no_source_id: "no source identifier, so the row cannot be made idempotent",
  unmapped_side: "the source's type value is not in the governed side map",
  unmapped_category: "the source's category slug is not in the governed category map",
  no_product: "no product named",
  generic_product: "the product is a bare commodity word, so the title would name a market, not a record",
  duplicate_source_id: "a second row carrying a source identifier already seen in this batch",
  undated: "the source states no readable posting date, so the age is unknown",
  aging: `the indication is between ${CURRENT_DAYS} and ${AGING_DAYS} days old`,
  historical: `the indication is more than ${AGING_DAYS} days old`,
  offer_not_actionable: "a seller offer stating neither a quantity with a unit nor a price basis",
  requirement_not_actionable: "a buyer requirement stating neither a quantity with a unit nor a destination",
};

/** A bare commodity word names a market, not a record. */
const GENERIC_PRODUCT =
  /^(wheat|rice|maize|corn|sugar|oil|oils|tea|coffee|spice|spices|pulses|nuts|nut|salt|flour|grain|grains|seed|seeds|beans?|dal|lentils?|scrap|metal|metals|textile|textiles|chemical|chemicals|machinery|electronics|packaging|ceramics|cement)$/i;

export function isGenericProduct(product: string): boolean {
  const t = product.trim();
  return t.split(/\s+/).length <= 1 && GENERIC_PRODUCT.test(t);
}

/** The unit vocabulary a stated quantity must carry to count as stated. */
const UNIT_PATTERNS: readonly (readonly [string, string])[] = [
  ["metric\\s*tonnes?|metric\\s*tons?|\\bmt\\b|\\btonnes?\\b|\\btons?\\b", "MT"],
  ["kilograms?|\\bkgs?\\b", "kg"],
  ["quintals?|\\bqtls?\\b", "quintal"],
  ["litres?|liters?|\\bltrs?\\b", "litres"],
  [
    "twenty[- ]foot\\s*containers?|forty[- ]foot\\s*containers?|containers?|\\bfcl\\b|20\\s*ft|40\\s*ft",
    "containers",
  ],
  ["cartons?", "cartons"],
  ["drums?", "drums"],
  ["pallets?", "pallets"],
  ["bags?", "bags"],
  ["bottles?", "bottles"],
  ["boxes?", "boxes"],
  ["pieces?|\\bpcs?\\b", "pieces"],
  ["units?", "units"],
  ["pairs?", "pairs"],
  ["rolls?", "rolls"],
  ["sets?", "sets"],
  ["sheets?", "sheets"],
  ["\\bsqm\\b|square\\s*met(?:re|er)s?", "sqm"],
  ["\\bcbm\\b|cubic\\s*met(?:re|er)s?", "cbm"],
  ["barrels?|\\bbbl\\b", "barrels"],
  ["gallons?", "gallons"],
];

const QUANTITY_RE = new RegExp(
  "(\\d[\\d.,]*)\\s*(" + UNIT_PATTERNS.map((u) => u[0]).join("|") + ")",
  "i",
);

export interface StatedQuantity {
  qty: number;
  unit: string;
}

/**
 * A quantity ONLY when it carries a recognised unit.
 *
 * A bare number is not a quantity. The first import stored the leading digits of
 * the source's free text, so a palm-oil offer reached the public board reading
 * "Quantity 1" with no unit, which says nothing and looks like a fault. Both the
 * dedicated field and the source prose are searched, because the unit is often
 * only in the prose.
 */
export function statedQuantity(...sources: (string | null | undefined)[]): StatedQuantity | null {
  for (const source of sources) {
    if (!source) continue;
    const m = source.match(QUANTITY_RE);
    if (!m) continue;
    const qty = Number(m[1].replace(/,/g, ""));
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const raw = m[2].toLowerCase();
    const canon = UNIT_PATTERNS.find(([pattern]) => new RegExp(pattern, "i").test(raw));
    return { qty, unit: canon ? canon[1] : m[2] };
  }
  return null;
}

const INCOTERMS = ["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"];

/** An Incoterm from the dedicated column or from the prose, or null. */
export function statedIncoterm(explicit: string | null, prose: string | null): string | null {
  const direct = (explicit ?? "").trim().toUpperCase();
  if (INCOTERMS.includes(direct)) return direct;
  const m = (prose ?? "").match(
    /\b(EXW|FCA|FAS|FOB|CFR|CIF|CPT|CIP|DAP|DPU|DDP)\b/i,
  );
  return m ? m[1].toUpperCase() : null;
}

/** The facts a quality rule reads. Deliberately small and already normalised. */
export interface Commercial {
  product: string;
  quantity: StatedQuantity | null;
  incoterm: string | null;
  destination: string | null;
}

/**
 * Is this record commercially actionable for its own intent?
 *
 * The rules differ because the two intents make different promises.
 *
 * A SELLER OFFER is a claim to be able to supply. A reader's first question is
 * "how much, and on what terms" — so an offer must carry a quantity with a unit
 * OR a price basis. With neither it is an advertisement for a product category.
 *
 * A BUYER REQUIREMENT is a statement of demand. The reader is a supplier asking
 * "can I serve this" — so it must carry a quantity with a unit OR a destination.
 * Requiring a tonnage of every buyer would hold back a perfectly actionable
 * "cotton yarn wanted, delivered Oman", which is exactly the signal a supplier
 * in that corridor wants to see.
 *
 * Both require a product specific enough to name the record rather than its
 * market. That test is shared because it is about the title, not the trade.
 */
export function isActionable(
  intent: "offer_product" | "source_product",
  facts: Commercial,
): { ok: true } | { ok: false; reason: HoldReason } {
  const product = facts.product.trim();
  if (product.length < 3) return { ok: false, reason: "no_product" };
  if (isGenericProduct(product)) return { ok: false, reason: "generic_product" };

  if (intent === "offer_product") {
    if (facts.quantity || facts.incoterm) return { ok: true };
    return { ok: false, reason: "offer_not_actionable" };
  }
  if (facts.quantity || facts.destination) return { ok: true };
  return { ok: false, reason: "requirement_not_actionable" };
}

/** What one source row became. Every row produces exactly one of these. */
export interface IngestDecision {
  sourceId: string | null;
  decision: "publish" | "hold";
  reason: HoldReason | null;
  side: "offer" | "requirement" | null;
  intent: "offer_product" | "source_product" | null;
  categoryLabel: string | null;
  sector: string | null;
  hs: string | null;
  freshness: Freshness;
  /** The source's own posting date, ISO, or null when unreadable. */
  sourceDate: string | null;
  facts: Commercial | null;
}

export interface RawRow {
  deal_id?: string;
  type?: string;
  product?: string;
  category?: string;
  quantity?: string;
  incoterms?: string;
  destination_country?: string;
  raw_description?: string;
  posted_date?: string;
  [key: string]: unknown;
}

/**
 * Decide one row. Never throws, never returns undefined, never skips.
 *
 * Order matters and is deliberate: identity, then mapping, then age, then
 * commercial substance. A row is reported against the FIRST thing wrong with
 * it, so "unmapped category" is not hidden behind "too old" and the operator
 * fixing the map can see how many rows it would recover.
 */
export function decideRow(
  raw: RawRow,
  opts: { nowMs: number; seenSourceIds: Set<string> },
): IngestDecision {
  const text = (v: unknown): string | null => {
    const s = String(v ?? "").replace(/\s+/g, " ").trim();
    return s.length > 0 ? s : null;
  };

  const sourceId = text(raw.deal_id);
  const sourceDate = parseSourceDate(raw.posted_date);
  const freshness = freshnessOf(sourceDate, opts.nowMs);

  const base = {
    sourceId,
    side: null,
    intent: null,
    categoryLabel: null,
    sector: null,
    hs: null,
    freshness,
    sourceDate,
    facts: null,
  } satisfies Omit<IngestDecision, "decision" | "reason">;

  if (!sourceId) return { ...base, decision: "hold", reason: "no_source_id" };
  if (opts.seenSourceIds.has(sourceId)) {
    return { ...base, decision: "hold", reason: "duplicate_source_id" };
  }

  const side = sideForSourceType(raw.type);
  if (!side) return { ...base, decision: "hold", reason: "unmapped_side" };
  const intent = intentForSide(side);

  const category = categoryForSourceSlug(raw.category);
  if (!category) {
    return { ...base, side, intent, decision: "hold", reason: "unmapped_category" };
  }

  const facts: Commercial = {
    product: text(raw.product) ?? "",
    quantity: statedQuantity(text(raw.quantity), text(raw.raw_description)),
    incoterm: statedIncoterm(text(raw.incoterms), text(raw.raw_description)),
    destination: text(raw.destination_country),
  };

  const mapped = {
    ...base,
    side,
    intent,
    categoryLabel: category.label,
    sector: category.sector,
    hs: category.hs,
    facts,
  };

  // Substance before age, so a stale row that is also unusable reports the
  // reason an operator can act on rather than the one that will pass with time.
  const actionable = isActionable(intent, facts);
  if (!actionable.ok) return { ...mapped, decision: "hold", reason: actionable.reason };

  if (freshness !== "current") {
    return { ...mapped, decision: "hold", reason: freshness === "undated" ? "undated" : freshness };
  }

  return { ...mapped, decision: "publish", reason: null };
}

/**
 * The source's posting date as an ISO date, or null.
 *
 * The exports use `May-08-26`, which `new Date()` reads as 1926 in some engines
 * and rejects in others, so the two-digit year is expanded explicitly. Anything
 * that does not parse returns null and the row is held as `undated` rather than
 * being given today's date, which would turn an unknown age into a fresh one.
 */
export function parseSourceDate(value: unknown): string | null {
  const s = String(value ?? "").trim();
  if (!s) return null;

  const mon = s.match(/^([A-Za-z]{3})-(\d{1,2})-(\d{2,4})$/);
  if (mon) {
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const mi = months.indexOf(mon[1].toLowerCase());
    if (mi >= 0) {
      const day = Number(mon[2]);
      let year = Number(mon[3]);
      if (year < 100) year += year < 70 ? 2000 : 1900;
      const d = new Date(Date.UTC(year, mi, day));
      return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    }
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  const parsed = Date.parse(s);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : null;
}
