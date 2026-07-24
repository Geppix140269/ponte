/**
 * The Find query: the small, structured state behind /find. Pure logic only —
 * the shape, the URL round-trip, and the in-memory matchers the board lane uses.
 * No database, no Next, so it is unit-tested standalone under tsx.
 *
 * Two rules from the brief live here:
 *   - Product is the one decisive fact. Without it there is nothing to find, and
 *     the results surface says so (F05-adjacent) rather than listing everything.
 *   - Qualified Opportunities and Market Signals never blend. `lane` only ever
 *     changes which lane is FOCUSED; both are always computed and shown. The URL
 *     preserves the selected class so a shared link reopens the same view.
 */

/** Buy/sell/service, in the listings vocabulary. Null means "any direction". */
export type FindIntent = "offer" | "requirement" | "service";

export const FIND_INTENTS: readonly FindIntent[] = ["offer", "requirement", "service"];

export function isFindIntent(v: unknown): v is FindIntent {
  return typeof v === "string" && (FIND_INTENTS as readonly string[]).includes(v);
}

/** Which lane the URL is focused on. Both lanes always render regardless. */
export type FindLane = "qualified" | "signals";

export function isFindLane(v: unknown): v is FindLane {
  return v === "qualified" || v === "signals";
}

export type FindQuery = {
  /** The product to find. The decisive fact; everything else refines it. */
  product: string | null;
  /** Direction filter, or null for any. */
  intent: FindIntent | null;
  /** Destination market, free text (a country name or region). */
  market: string | null;
  /** Origin, free text. */
  origin: string | null;
  /** Minimum quantity, a positive number or null. */
  minQty: number | null;
  /** Focused lane, or null (defaults to Qualified first in the UI). */
  lane: FindLane | null;
};

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

const clean = (v: string | string[] | undefined, max = 120): string | null => {
  const s = first(v);
  if (typeof s !== "string") return null;
  const t = s.replace(/\s+/g, " ").trim().slice(0, max);
  return t.length > 0 ? t : null;
};

/** Read a Find query out of a Next searchParams object. Tolerant of junk. */
export function parseFindQuery(
  sp: Record<string, string | string[] | undefined>,
): FindQuery {
  const rawIntent = first(sp.intent);
  const rawLane = first(sp.lane);
  const rawQty = first(sp.minQty);
  const qtyNum = rawQty != null ? Number(rawQty) : NaN;
  return {
    product: clean(sp.product, 120),
    intent: isFindIntent(rawIntent) ? rawIntent : null,
    market: clean(sp.market, 120),
    origin: clean(sp.origin, 120),
    minQty: Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : null,
    lane: isFindLane(rawLane) ? rawLane : null,
  };
}

/** Build the /find href (locale-relative) for a query. Omits empty params. */
export function buildFindHref(q: Partial<FindQuery>): string {
  const params = new URLSearchParams();
  if (q.product) params.set("product", q.product);
  if (q.intent) params.set("intent", q.intent);
  if (q.market) params.set("market", q.market);
  if (q.origin) params.set("origin", q.origin);
  if (q.minQty && q.minQty > 0) params.set("minQty", String(q.minQty));
  if (q.lane) params.set("lane", q.lane);
  const qs = params.toString();
  return qs ? `/find?${qs}` : "/find";
}

/** Case- and space-insensitive substring test used by the board matcher. */
function contains(haystack: string | null | undefined, needle: string): boolean {
  if (!haystack) return false;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Does a board row (a LiveDeal-shaped object) match this query? Used to filter
 * the Qualified lane in memory: the board is small, so a DB round-trip per
 * keystroke would be wasteful, and the same matcher is trivially testable.
 *
 * Product matches product text OR HS code. Intent, when set, must equal the
 * row's type. Market/origin match the row's corridor text when set. A row with
 * no quantity is not excluded by a minQty filter — an absent fact is unknown,
 * not zero, and hiding it would be the wrong failure.
 */
export function matchesFindQuery(
  row: {
    type: string;
    product: string;
    hsCode: string | null;
    quantity: string | null;
    originText: string | null;
    destinationText: string | null;
    originCode: string | null;
    destinationCode: string | null;
  },
  q: FindQuery,
): boolean {
  if (q.product && !(contains(row.product, q.product) || contains(row.hsCode, q.product))) {
    return false;
  }
  if (q.intent && row.type !== q.intent) return false;
  if (q.market && !(contains(row.destinationText, q.market) || contains(row.destinationCode, q.market))) {
    return false;
  }
  if (q.origin && !(contains(row.originText, q.origin) || contains(row.originCode, q.origin))) {
    return false;
  }
  if (q.minQty != null) {
    const n = row.quantity != null ? Number(String(row.quantity).replace(/[^\d.]/g, "")) : NaN;
    if (Number.isFinite(n) && n < q.minQty) return false;
  }
  return true;
}
