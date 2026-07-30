import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { landingFontVars } from "@/components/home/landing/fonts";
import DeskShell from "@/components/desk/DeskShell";
import SignalBoard from "@/components/desk/SignalBoard";
import { railForScreen } from "@/lib/desk/journey";
import { rankAndPage, clampOffset, type SignalInventory } from "@/lib/board/inventory";
import { parseFindQuery, effectiveSort, PAGE_SIZE } from "@/lib/find/query";
import { noFamilyInventory, type FamilyAvailability } from "@/lib/board/availability";
import { parseSignalSearch, matchesSearch } from "@/lib/search/signal-search";
import type { MarketSignal } from "@/lib/market-signals/logic";
import { FIXTURE_SIGNALS } from "./fixtures";
import "@/components/desk/desk.css";
import "@/components/ponte/category/category.css";

/**
 * The Market Signals search, over a controlled inventory.
 *
 * Development only: it 404s in production, is not linked from anywhere, is not
 * in the sitemap and reads no database. Same gate and same purpose as
 * `/dev/product-intake`.
 *
 * ---------------------------------------------------------------------------
 * Why this route exists
 * ---------------------------------------------------------------------------
 * The Design Constitution requires desktop and 390 x 844 evidence of the states
 * a change touches. For this change the states that matter most are the ones
 * that need RECORDS: a ranked result list, a second page, a truthful count, and
 * a zero-result search that does not claim the board is empty. None of them can
 * be captured against an empty board.
 *
 * This repository has no non-production database (PL-002), so the only two ways
 * to photograph a result list are production records or fixtures, and the
 * requirement explicitly forbids the first: evidence that depends on live rows
 * stops being reproducible the moment a signal expires.
 *
 * ---------------------------------------------------------------------------
 * What is real here and what is not
 * ---------------------------------------------------------------------------
 * Everything except the rows. The URL is parsed by `parseFindQuery`, the search
 * by `parseSignalSearch`, the matching by `matchesSearch`, the ordering and
 * paging by `rankAndPage`, and the whole page is rendered by `SignalBoard`,
 * which is the same component the live route renders. A frame captured here is
 * a frame of the shipped markup and the shipped ordering.
 *
 * The one thing it cannot prove is that PostgREST applies `searchPredicate` the
 * way `matchesSearch` says it does. That is asserted separately, in
 * `lib/search/__tests__/signal-search.test.ts`, and is stated as a limitation
 * in the pull request rather than glossed over here.
 */

export const dynamic = "force-dynamic";

/** The states a capture may ask for, beyond an ordinary search. */
const FORCED = ["unavailable", "partial", "coverage_unknown", "unclassified", "empty"] as const;
type Forced = (typeof FORCED)[number];

function isForced(v: unknown): v is Forced {
  return typeof v === "string" && (FORCED as readonly string[]).includes(v);
}


/**
 * Which families the gallery should claim have live inventory.
 *
 * Driven by `?availability=` so every state of the family selector can be
 * photographed: `products` (the current production condition), `products,services`,
 * `all`, `none`, or `unknown` for a failed measurement. Defaults to products
 * alone, because that is what production actually holds.
 *
 * The gallery states the availability rather than deriving it, on purpose. In
 * production the number is a database count over stored `market_family` values,
 * and inferring a family from a fixture's category text here would model the one
 * thing the correction forbids. What is under test is the INTERFACE's response
 * to an availability, so the availability is an input.
 */
function fixtureAvailability(
  raw: string | string[] | undefined,
): FamilyAvailability | null {
  const value = (Array.isArray(raw) ? raw[0] : raw) ?? "products";
  if (value === "unknown") return null;
  if (value === "none") return noFamilyInventory();
  const named = value === "all" ? ["products", "services", "distribution"] : value.split(",");
  const counts = noFamilyInventory();
  for (const key of named) {
    if (key === "products" || key === "services" || key === "distribution") counts[key] = 12;
  }
  return counts;
}

/**
 * Whether the selected family's category axis has anything classified.
 *
 * `?axis=classified` draws the family's category list; anything else leaves it
 * out, which is production's condition today: no eligible signal carries a
 * canonical category on any axis.
 */
function fixtureAxis(raw: string | string[] | undefined): number | null {
  const value = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  return value === "classified" ? 9 : 0;
}

/**
 * Build the inventory result the live read would have produced.
 *
 * The filters are applied first, then the search, then the ordering and the
 * page, in that order and over the whole fixture set, because that is the order
 * the database applies them in. Filtering the page instead is the defect this
 * whole change exists to remove, and a gallery that did it would be evidence of
 * the wrong thing.
 */
function fixtureInventory(
  sp: Record<string, string | string[] | undefined>,
): { board: SignalInventory; everything: number } {
  const q = parseFindQuery(sp);
  const forced = isForced(sp.state) ? sp.state : null;
  const search = parseSignalSearch(q.q);
  const sort = effectiveSort(q);
  const offset = (q.page - 1) * PAGE_SIZE;

  if (forced === "unavailable") return { board: { state: "unavailable" }, everything: FIXTURE_SIGNALS.length };
  if (forced === "unclassified") {
    return {
      board: { state: "unclassified", reason: "nothing_classified", eligible: FIXTURE_SIGNALS.length },
      everything: FIXTURE_SIGNALS.length,
    };
  }

  let matched: MarketSignal[] = forced === "empty" ? [] : FIXTURE_SIGNALS.slice();
  // The fixture stands in for the canonical classification columns, which no
  // production signal carries yet: the category text is the only family signal
  // these records have.
  if (q.family === "services") matched = matched.filter((s) => s.category === "Freight and logistics");
  if (q.family === "distribution") {
    matched = matched.filter((s) => s.category === "Distribution and representation");
  }
  if (q.territory) {
    matched = matched.filter((s) => s.destinationCode === q.territory || matchesTerritory(s, q.territory!));
  }
  if (search) matched = matched.filter((s) => matchesSearch(s, search));

  const total = matched.length;
  let signals: MarketSignal[];
  let at: number;
  if (search && sort === "relevance") {
    const page = rankAndPage(matched, search, offset, PAGE_SIZE);
    signals = page.signals;
    at = page.offset;
  } else {
    const ordered = matched
      .slice()
      .sort((a, b) =>
        sort === "oldest"
          ? a.spottedAt.localeCompare(b.spottedAt) || a.id.localeCompare(b.id)
          : b.spottedAt.localeCompare(a.spottedAt) || b.id.localeCompare(a.id),
      );
    at = clampOffset(offset, total, PAGE_SIZE);
    signals = ordered.slice(at, at + PAGE_SIZE);
  }

  const ordering = { ordering: sort, rankedFully: true } as const;
  if (forced === "partial") {
    return {
      board: {
        state: "partial", signals, total, offset: at,
        coverage: { classified: Math.min(12, total), eligible: FIXTURE_SIGNALS.length },
        ...ordering,
      },
      everything: FIXTURE_SIGNALS.length,
    };
  }
  if (forced === "coverage_unknown") {
    return {
      board: { state: "coverage_unknown", signals, total, offset: at, ...ordering },
      everything: FIXTURE_SIGNALS.length,
    };
  }
  return {
    board: { state: "ok", signals, total, offset: at, ...ordering },
    everything: FIXTURE_SIGNALS.length,
  };
}

/** ISO-2 against the fixture's country names. Enough for two capture cases. */
const TERRITORIES: Record<string, string> = { DE: "Germany", ES: "Spain", IT: "Italy", FR: "France" };
function matchesTerritory(s: MarketSignal, code: string): boolean {
  const name = TERRITORIES[code];
  return Boolean(name && (s.destinationText === name || s.originText === name));
}

export default function DevMarketSignalsSearch({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  setRequestLocale(params.locale);

  const sp = searchParams ?? {};
  const q = parseFindQuery(sp);
  const { board, everything } = fixtureInventory(sp);

  return (
    <div className={`ponte-desk ${landingFontVars}`}>
      <DeskShell rail={railForScreen("listing", { objectiveStated: false })} current="market">
        <SignalBoard
          q={q}
          board={board}
          everything={everything}
          availability={fixtureAvailability(sp.availability)}
          axisClassified={q.family ? fixtureAxis(sp.axis) : null}
        />
      </DeskShell>
    </div>
  );
}
