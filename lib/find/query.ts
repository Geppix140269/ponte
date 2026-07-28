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

import {
  serviceCategory as lookupServiceCategory,
  subcategoryBelongsTo,
} from "../taxonomy/services";
import { partnerType as lookupPartnerType } from "../taxonomy/distribution";
import { PRODUCT_SECTORS, type MarketFamily } from "../taxonomy/market";
import type { InventoryQuery } from "../board/inventory-query";

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
  /**
   * Which market family is being searched.
   *
   * Products was once the only answer, which is why `product` below was "the
   * one decisive fact". It is decisive for products and meaningless for the
   * other two: there is no product to name when a member is looking for a
   * customs broker or a distributor, and asking for one before showing them
   * anything was the reason Trade services and Distribution had no usable
   * search at all.
   */
  family: MarketFamily | null;
  /** Trade services: the canonical category key. */
  serviceCategory: string | null;
  /** Trade services: one canonical subcategory key inside that category. */
  serviceSubcategory: string | null;
  /** Distribution: the canonical partner or channel type key. */
  partnerType: string | null;
  /** Products, and distribution attached to a sector: the sector key. */
  sector: string | null;
  /** ISO-2 country code, matched against stored territory codes. */
  territory: string | null;
  /** The product to find. Decisive for the products family. */
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

/**
 * Has the member narrowed the search at all?
 *
 * The difference between "nothing is live" and "nothing matches what you
 * asked", which are different facts needing different words. The first is a
 * statement about the market and is the more damaging one to get wrong: a
 * member reads it as "this market is dead" when it means "not this corner".
 *
 * Every dimension counts, not only the canonical keys. A member who narrowed by
 * direction or by a product word and got nothing back has still narrowed, and
 * telling them the board is empty would be just as untrue.
 */
export function hasActiveFilters(q: FindQuery): boolean {
  return Boolean(
    q.family ||
      q.serviceCategory ||
      q.serviceSubcategory ||
      q.partnerType ||
      q.sector ||
      q.territory ||
      q.product ||
      q.intent ||
      q.market ||
      q.origin ||
      q.minQty,
  );
}

/**
 * Has the member said enough for Find to show results?
 *
 * Per family, because the decisive fact differs. Products still needs a
 * product. Trade services needs a category, which is a tap. Distribution needs
 * a partner type, which is also a tap. Neither of the last two needs a
 * sentence, and requiring one is what kept both of them unsearchable.
 */
export function findQueryIsAnswerable(q: FindQuery): boolean {
  if (q.family === "services") return q.serviceCategory !== null;
  if (q.family === "distribution") return q.partnerType !== null;
  return q.product !== null;
}

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

const clean = (v: string | string[] | undefined, max = 120): string | null => {
  const s = first(v);
  if (typeof s !== "string") return null;
  const t = s.replace(/\s+/g, " ").trim().slice(0, max);
  return t.length > 0 ? t : null;
};

const FAMILIES: readonly string[] = ["products", "services", "distribution"];

/**
 * A canonical key, or null.
 *
 * Validated against the taxonomy rather than pattern-matched, in the same
 * spirit as everything else here being tolerant of junk: a URL carrying
 * `?serviceCategory=banana` is a query for nothing, and reading it as a filter
 * would print a confident empty result for a category that does not exist.
 */
function canonicalKey(
  value: string | string[] | undefined,
  exists: (key: string) => boolean,
): string | null {
  const key = clean(value, 64);
  return key && exists(key) ? key : null;
}

/** Read a Find query out of a Next searchParams object. Tolerant of junk. */
export function parseFindQuery(
  sp: Record<string, string | string[] | undefined>,
): FindQuery {
  const rawIntent = first(sp.intent);
  const rawLane = first(sp.lane);
  const rawQty = first(sp.minQty);
  const rawFamily = clean(sp.family, 20);
  const qtyNum = rawQty != null ? Number(rawQty) : NaN;

  const family = rawFamily && FAMILIES.indexOf(rawFamily) >= 0 ? (rawFamily as MarketFamily) : null;
  const serviceCategory = canonicalKey(sp.serviceCategory, (k) => !!lookupServiceCategory(k));

  return {
    family,
    serviceCategory,
    // A subcategory only means anything inside its category, so it is read
    // against the chosen one rather than validated on its own. A subcategory
    // from a different category is not a narrower search, it is a contradiction.
    serviceSubcategory: canonicalKey(
      sp.serviceSubcategory,
      (k) => serviceCategory !== null && subcategoryBelongsTo(k, serviceCategory),
    ),
    partnerType: canonicalKey(sp.partnerType, (k) => !!lookupPartnerType(k)),
    sector: canonicalKey(sp.sector, (k) => PRODUCT_SECTORS.some((s) => s.key === k)),
    territory: territoryCode(sp.territory),
    product: clean(sp.product, 120),
    intent: isFindIntent(rawIntent) ? rawIntent : null,
    market: clean(sp.market, 120),
    origin: clean(sp.origin, 120),
    minQty: Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : null,
    lane: isFindLane(rawLane) ? rawLane : null,
  };
}

/** An ISO-2 code, upper-cased, or null. */
function territoryCode(value: string | string[] | undefined): string | null {
  const raw = clean(value, 4);
  if (!raw) return null;
  const code = raw.toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

/** Build the /find href (locale-relative) for a query. Omits empty params. */
export function buildFindHref(q: Partial<FindQuery>): string {
  const params = new URLSearchParams();
  if (q.family) params.set("family", q.family);
  if (q.serviceCategory) params.set("serviceCategory", q.serviceCategory);
  if (q.serviceSubcategory) params.set("serviceSubcategory", q.serviceSubcategory);
  if (q.partnerType) params.set("partnerType", q.partnerType);
  if (q.sector) params.set("sector", q.sector);
  if (q.territory) params.set("territory", q.territory);
  if (q.product) params.set("product", q.product);
  if (q.intent) params.set("intent", q.intent);
  if (q.market) params.set("market", q.market);
  if (q.origin) params.set("origin", q.origin);
  if (q.minQty && q.minQty > 0) params.set("minQty", String(q.minQty));
  if (q.lane) params.set("lane", q.lane);
  const qs = params.toString();
  return qs ? `/find?${qs}` : "/find";
}

/**
 * The inventory query this Find query means.
 *
 * One translation, in one place, so the two lanes and the Market Signals board
 * cannot each interpret the same URL differently. `intent` narrows the side:
 * a buyer requirement and a seller offer are the two sides a signal can have,
 * and a service filter has no side of its own.
 */
export function toInventoryQuery(q: FindQuery): InventoryQuery {
  return {
    family: q.family,
    serviceCategory: q.serviceCategory,
    serviceSubcategory: q.serviceSubcategory,
    partnerType: q.partnerType,
    sector: q.sector,
    territory: q.territory,
    product: q.product,
    side: q.intent === "offer" ? "offer" : q.intent === "requirement" ? "requirement" : null,
  };
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
