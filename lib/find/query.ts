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
import { MAX_QUERY_LENGTH } from "../search/signal-search";

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

/**
 * How a result list is ordered.
 *
 * Only orderings that are actually implemented appear here. `relevance` has no
 * meaning without a query to be relevant to, so it is not offered when there is
 * none and is read as `newest` if a URL asks for it anyway — see
 * `effectiveSort`.
 */
export type BoardSort = "relevance" | "newest" | "oldest";

export const BOARD_SORTS: readonly BoardSort[] = ["relevance", "newest", "oldest"];

export function isBoardSort(v: unknown): v is BoardSort {
  return typeof v === "string" && (BOARD_SORTS as readonly string[]).includes(v);
}

/** Records per page. ADR-0011 permits ~60 and forbids treating it as a total. */
export const PAGE_SIZE = 60;

/**
 * The highest page a URL may address.
 *
 * A bound rather than a belief about the inventory: `?page=999999999` would
 * otherwise become an offset the database has to seek past for nothing.
 */
export const MAX_PAGE = 10_000;

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
  /** The source category label, exactly as stored (e.g. "Rice & Grains"). */
  category: string | null;
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
  /**
   * The member's own words, searched across the complete public inventory.
   *
   * Distinct from `product`, which is a structured product filter carried by
   * existing links and existing shared URLs. `q` is free text over every public
   * field. Keeping them apart is what lets `?product=sugar` keep meaning
   * exactly what it meant before this parameter existed.
   */
  q: string | null;
  /** An explicit ordering, or null to take the default for this query. */
  sort: BoardSort | null;
  /**
   * Ask for the full result list rather than the entrance.
   *
   * `/market-signals` with nothing set is a CHOICE — buyer requirements or
   * seller offers — because the two are different questions and the counts are
   * the useful thing to see first. `?view=board` is how a member says "show me
   * everything anyway", and it is what the entrance's own "All signals" link
   * carries. Any search or filter implies the board on its own, so this is only
   * ever needed for the unfiltered case.
   */
  view: "board" | null;
  /** 1-based page. Always a number; 1 when the URL says nothing. */
  page: number;
};

/**
 * The ordering this query actually runs under.
 *
 * Relevance is the default while searching and is unavailable otherwise: there
 * is nothing for a record to be relevant TO without a query, so offering it
 * would be a control that either does nothing or invents a meaning. A URL
 * carrying `sort=relevance` with no `q` is read as `newest` rather than
 * refused, because it is a stale link, not an error.
 */
export function effectiveSort(q: Pick<FindQuery, "q" | "sort">): BoardSort {
  if (!q.q) return q.sort === "oldest" ? "oldest" : "newest";
  return q.sort ?? "relevance";
}

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
 *
 * `q` counts for exactly the same reason, and it is the dimension where getting
 * this wrong would be most visible: a member who searched for something absurd
 * and was told "no signal is currently live on the public board" would have
 * been handed a false statement about the market by their own typo.
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
      q.category ||
      q.intent ||
      q.market ||
      q.origin ||
      q.minQty ||
      q.q,
  );
}

/** Has the member narrowed by anything OTHER than their free text? */
export function hasStructuredFilters(q: FindQuery): boolean {
  return hasActiveFilters({ ...q, q: null });
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
  const rawSort = first(sp.sort);
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
    category: clean(sp.category, 80),
    intent: isFindIntent(rawIntent) ? rawIntent : null,
    market: clean(sp.market, 120),
    origin: clean(sp.origin, 120),
    minQty: Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : null,
    lane: isFindLane(rawLane) ? rawLane : null,
    q: clean(sp.q, MAX_QUERY_LENGTH),
    sort: isBoardSort(rawSort) ? rawSort : null,
    view: first(sp.view) === "board" ? "board" : null,
    page: pageNumber(sp.page),
  };
}

/**
 * Does this URL ask for the result list, rather than for the entrance?
 *
 * True as soon as the member has said anything at all — a side, a category, a
 * search, a sort, or a page past the first — because every one of those is a
 * question the list answers and the entrance does not. `view=board` is the
 * explicit form, for the one case where nothing else has been said.
 *
 * Kept here rather than in the route so the entrance and the board cannot come
 * to disagree about which one a given URL means.
 */
export function showsBoard(q: FindQuery): boolean {
  return q.view === "board" || hasActiveFilters(q) || q.sort !== null || q.page > 1;
}

/**
 * A 1-based page number, tolerant of junk.
 *
 * `0`, `-2`, `banana` and `1e9` are all page one. An out-of-range page is not
 * an error a member can act on, and refusing the URL would break a shared link
 * over a parameter they never typed.
 */
function pageNumber(value: string | string[] | undefined): number {
  const raw = first(value);
  const n = raw != null ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return 1;
  const page = Math.floor(n);
  if (page < 1) return 1;
  return Math.min(page, MAX_PAGE);
}

/** An ISO-2 code, upper-cased, or null. */
function territoryCode(value: string | string[] | undefined): string | null {
  const raw = clean(value, 4);
  if (!raw) return null;
  const code = raw.toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

/**
 * One serialisation of a query, used by every route that reads one.
 *
 * `/find` and `/market-signals` differ in their path and in nothing else. They
 * used to differ in more: the board had its own builder listing five parameters,
 * so every filter link silently dropped the direction, the market, the quantity
 * and — once this parameter existed — the member's search. A second builder is
 * how two surfaces come to disagree about what one URL means, so there is one.
 *
 * Only set values are written. A URL is a statement of what was asked for, and
 * `?sort=&page=1&q=` states nothing while making a shared link unreadable.
 */
function boardParams(q: Partial<FindQuery>): URLSearchParams {
  const params = new URLSearchParams();
  if (q.q) params.set("q", q.q);
  if (q.family) params.set("family", q.family);
  if (q.serviceCategory) params.set("serviceCategory", q.serviceCategory);
  if (q.serviceSubcategory) params.set("serviceSubcategory", q.serviceSubcategory);
  if (q.partnerType) params.set("partnerType", q.partnerType);
  if (q.sector) params.set("sector", q.sector);
  if (q.territory) params.set("territory", q.territory);
  if (q.product) params.set("product", q.product);
  if (q.category) params.set("category", q.category);
  if (q.intent) params.set("intent", q.intent);
  if (q.market) params.set("market", q.market);
  if (q.origin) params.set("origin", q.origin);
  if (q.minQty && q.minQty > 0) params.set("minQty", String(q.minQty));
  if (q.lane) params.set("lane", q.lane);
  if (q.sort) params.set("sort", q.sort);
  // Only meaningful while nothing else is set: any filter already implies the
  // board, and carrying a redundant `view=board` would make two URLs for one
  // view and neither shareable link the canonical one. `params` is the set
  // already written, so this asks exactly that without re-deriving it.
  if (q.view === "board" && params.toString() === "") params.set("view", "board");
  // Page one is the absence of a page, so the first page of a search shares as
  // the same URL whether it was arrived at by searching or by paging back.
  if (q.page && q.page > 1) params.set("page", String(q.page));
  return params;
}

/** Build the /find href (locale-relative) for a query. Omits empty params. */
export function buildFindHref(q: Partial<FindQuery>): string {
  const qs = boardParams(q).toString();
  return qs ? `/find?${qs}` : "/find";
}

/** Build the Market Signals board href for a query. Omits empty params. */
export function buildBoardHref(q: Partial<FindQuery>): string {
  const qs = boardParams(q).toString();
  return qs ? `/market-signals?${qs}` : "/market-signals";
}

// ---------------------------------------------------------------------------
// The state transitions, as functions rather than as call-site conventions
// ---------------------------------------------------------------------------
/**
 * Six ways a member changes the board, and what each one keeps.
 *
 * These exist because the rules are easy to state and easy to get wrong one
 * link at a time. Changing a filter must keep the search; changing the sort
 * must keep both; paging must keep everything; and everything except paging
 * must return to page one, because a member on page 4 of one result set has no
 * business landing on page 4 of a different one.
 *
 * Written as pure transforms over the query rather than as string surgery on a
 * URL, so the reset rules are asserted once in a test instead of being re-read
 * out of every href in the tree.
 */

/** The structured dimensions. Everything a filter control may set. */
const FILTER_KEYS = [
  "family",
  "serviceCategory",
  "serviceSubcategory",
  "partnerType",
  "sector",
  "territory",
  "product",
  "category",
  "intent",
  "market",
  "origin",
  "minQty",
] as const;

/**
 * Replace the structured filters, keeping the search and the sort.
 *
 * REPLACE, not merge: a filter control passes the complete set it means, so
 * choosing Distribution clears a freight category rather than leaving a filter
 * behind that nobody set and that no control now shows.
 */
export function withFilters(q: FindQuery, filters: Partial<FindQuery>): FindQuery {
  const next: FindQuery = { ...q, page: 1 };
  for (const key of FILTER_KEYS) {
    (next as Record<string, unknown>)[key] = filters[key] ?? null;
  }
  return next;
}

/** Set the member's words. A new search always starts at page one. */
export function withSearch(q: FindQuery, text: string | null): FindQuery {
  const cleaned = clean(text ?? undefined, MAX_QUERY_LENGTH);
  return { ...q, q: cleaned, page: 1 };
}

/** Change the ordering, keeping the search and every filter. */
export function withSort(q: FindQuery, sort: BoardSort | null): FindQuery {
  return { ...q, sort, page: 1 };
}

/** Move to a page, keeping everything else exactly as it is. */
export function withPage(q: FindQuery, page: number): FindQuery {
  return { ...q, page: Math.min(Math.max(1, Math.floor(page)), MAX_PAGE) };
}

/**
 * Drop the search term only.
 *
 * The filters stay. A member clearing their words has not asked to leave the
 * corner of the market they navigated into. The sort is dropped with it when it
 * was relevance, which has no meaning once there is nothing to be relevant to.
 */
export function clearedSearch(q: FindQuery): FindQuery {
  return { ...q, q: null, sort: q.sort === "relevance" ? null : q.sort, page: 1 };
}

/** Everything off: no search, no filters, no sort override, no page. */
export function clearedAll(q: FindQuery): FindQuery {
  return { ...withFilters({ ...q, q: null, sort: null }, {}), lane: q.lane };
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
    category: q.category,
    side: q.intent === "offer" ? "offer" : q.intent === "requirement" ? "requirement" : null,
    text: q.q,
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
