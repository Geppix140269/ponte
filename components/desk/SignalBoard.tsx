import { Link } from "@/i18n/navigation";
import CategoryLinks, { type CategoryLink } from "@/components/ponte/category/CategoryLinks";
import FactRegister from "@/components/desk/FactRegister";
import RecordCard from "@/components/desk/RecordCard";
import SignalFilters, { ActiveFilters } from "@/components/desk/SignalFilters";
import SignalSearch from "@/components/desk/SignalSearch";
import BoardPager from "@/components/desk/BoardPager";
import SortLinks from "@/components/desk/SortLinks";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import type { DeskRecord } from "@/lib/desk/adapter";
import { toDeskRecord } from "@/lib/desk/adapter";
import type { SignalInventory } from "@/lib/board/inventory";
import { presentBoard } from "@/lib/board/presentation";
import { familyHasInventory, type FamilyAvailability } from "@/lib/board/availability";
import type { MarketFamily } from "@/lib/taxonomy/market";
import { parseSignalSearch } from "@/lib/search/signal-search";
import {
  hasActiveFilters,
  hasStructuredFilters,
  buildBoardHref,
  clearedSearch,
  clearedAll,
  withFilters,
  PAGE_SIZE,
  type FindQuery,
} from "@/lib/find/query";

/**
 * The Market Signals board: the search, the filters, the states, the records
 * and the pager.
 *
 * Separated from the route so that exactly one thing differs between the live
 * board and the development evidence gallery: where the `SignalInventory` came
 * from. The route reads it from the database; the gallery builds it from
 * fixtures. Everything a member actually sees is rendered by this file in both
 * cases, so a captured frame is a frame of the shipped markup rather than of a
 * second implementation that resembles it.
 *
 * That mattered here more than it usually would. This repository has no
 * non-production database (PL-002), so a screenshot of a result list can only
 * come from production records or from fixtures, and production records are
 * exactly what the requirement says the evidence must not depend on.
 *
 * Two presentations of one record set, chosen by density and nothing else:
 * above six records the ruled fact register (the Ledger borrowing) is faster to
 * scan than six raised cards; at or below six the cards are more readable than
 * a register with almost nothing in it. Both read their facts from `factsFor`,
 * so the two forms can never disagree about which facts a record shows.
 */

/**
 * What a member reads when they ask to filter by a family Ponte cannot filter by.
 *
 * ---------------------------------------------------------------------------
 * Why this says "filtering is not available" and not "there are no signals"
 * ---------------------------------------------------------------------------
 * The count behind this state is a count of signals carrying a canonical
 * `market_family`. Zero means **no record is classified into that family**, and
 * that is not the same fact as the family being empty. A trade-service
 * requirement can be sitting on the board right now, findable by searching for
 * it, and still count zero here because nothing has classified it.
 *
 * So the first version of this copy - "No live trade-service signals are
 * currently available" - was a claim Ponte had not established. It reported an
 * unclassified inventory as an absent market, which is precisely the error the
 * board's other states are careful about, reintroduced by the wording of a
 * state built to remove a different one.
 *
 * What is true, and all that is true, is that the filter cannot be offered. The
 * search still reaches everything, which is why the first action is to search
 * rather than to give up.
 *
 * None of this explains taxonomy, classification, columns, migrations or
 * historical rows. Why the filter is unavailable is Ponte's problem; that it is
 * unavailable, and what to do instead, is the member's.
 */
const FAMILY_UNAVAILABLE: Record<
  MarketFamily,
  { heading: string; body: string; action: string }
> = {
  products: {
    heading: "Product filtering is not currently available.",
    body: "Search all Market Signals, or publish a product opportunity.",
    action: "Post a product opportunity",
  },
  services: {
    heading: "Trade services filtering is not currently available.",
    body: "Search all Market Signals, or publish a trade-service opportunity.",
    action: "Post a trade-service opportunity",
  },
  distribution: {
    heading: "Distribution and representation filtering is not currently available.",
    body: "Search all Market Signals, or publish a distribution opportunity.",
    action: "Post a distribution opportunity",
  },
};

/** Above this many records the register earns its rules. */
const REGISTER_THRESHOLD = 6;

function Intro() {
  return (
    <div className="sech">
      <div>
        <h2>
          <PonteIcon name="evidence.evreview" size={18} />
          Market Signals
        </h2>
        <p className="d">
          Read from named public sources. Nothing here has been confirmed with the party named in
          it, and nothing here is a Ponte member. Sorted by the date Ponte read the source.
        </p>
      </div>
    </div>
  );
}

/**
 * The two sides a signal can have, as top-level lanes.
 *
 * A Market Signal is either a buyer requirement (someone in the open market
 * indicating demand) or a seller offer (indicating availability), the same
 * split the landing presents. `intent` is the URL parameter behind `side`, so
 * choosing a lane narrows the board to that side while keeping any search or
 * filters already in force: it is a merge over the current query, not a
 * replacement, so it does not discard a category or a search a member has set.
 *
 * Rendered as navigation, not selection: each lane is a real, shareable URL
 * (`/market-signals?intent=requirement` and `?intent=offer`), and "All signals"
 * is the absence of the parameter.
 */
function SignalLanes({ q }: { q: FindQuery }) {
  const lanes: CategoryLink[] = [
    {
      key: "__all",
      label: "All signals",
      current: q.intent !== "offer" && q.intent !== "requirement",
      href: buildBoardHref({ ...q, intent: null, page: 1 }),
    },
    {
      key: "requirement",
      label: "Buyer requirements",
      current: q.intent === "requirement",
      href: buildBoardHref({ ...q, intent: "requirement", page: 1 }),
    },
    {
      key: "offer",
      label: "Seller offers",
      current: q.intent === "offer",
      href: buildBoardHref({ ...q, intent: "offer", page: 1 }),
    },
  ];
  return (
    <CategoryLinks
      dense
      items={lanes}
      legend="Buyer requirements or seller offers"
      currentLabel="Viewing"
    />
  );
}

export default function SignalBoard({
  q,
  board,
  everything,
  availability,
  axisClassified,
}: {
  q: FindQuery;
  board: SignalInventory;
  /** Eligible signals on the whole board, filters aside. Null when unknown. */
  everything: number | null;
  /** Live classified signals per family. Null when the count could not be read. */
  availability: FamilyAvailability | null;
  /** Live signals in the selected family carrying a value on its category axis. */
  axisClassified: number | null;
}) {
  /**
   * A family the member asked for that Ponte knows has nothing live.
   *
   * Null when no family is selected, when the family does have inventory, and
   * when the count could not be read. That last case matters: a failed
   * measurement must not become a claim that a market is empty, so it falls
   * through to the ordinary result states, which are already careful.
   */
  const unavailableFamily =
    q.family !== null && !familyHasInventory(availability, q.family) ? q.family : null;
  const search = parseSignalSearch(q.q);
  // Three states carry records. Only `ok` may present an empty result as a
  // finding about the market.
  const answered =
    board.state === "ok" || board.state === "partial" || board.state === "coverage_unknown";
  const records: DeskRecord[] = answered ? board.signals.map(toDeskRecord) : [];
  /** Eligible records matching the active search and filters, across the table. */
  const matched = answered ? board.total : records.length;
  /** The offset the read actually used, which may have been pulled back. */
  const offset = answered ? board.offset : 0;
  /**
   * What this page renders, decided by one table rather than by the nesting of
   * a ternary chain. Only `ok` may present an emptiness as a finding.
   *
   * `searched` is passed separately from `filtered` because a member whose
   * words found nothing needs different words and different actions from one
   * whose category found nothing, and because neither may ever be told that the
   * board is empty.
   */
  const presentation = presentBoard(board.state, records.length, {
    filtered: hasActiveFilters(q),
    searched: search !== null,
  });

  return (
    <section className="sec">
      <Intro />

      <SignalLanes q={q} />

      <SignalSearch q={q} />

      <SignalFilters q={q} availability={availability} axisClassified={axisClassified} />

      {unavailableFamily ? (
        /*
         * A family a member asked to filter by that Ponte cannot filter by.
         *
         * This replaced a box that explained canonical category columns,
         * historical rows and database coverage to a customer. All of that was
         * true and none of it was theirs.
         *
         * It says the FILTER is unavailable, not that the family is empty: the
         * count behind it counts classified records, so zero means nothing is
         * classified, which is not evidence that nothing is there. See
         * FAMILY_UNAVAILABLE. The filter itself is no longer offered, so this
         * state is only reachable through a kept or shared URL.
         */
        <div className="empty">
          <PonteIcon name="participation.boundary" size={24} label="Boundary of what is known" />
          <div>
            <b>{FAMILY_UNAVAILABLE[unavailableFamily].heading}</b>
            <p>{FAMILY_UNAVAILABLE[unavailableFamily].body}</p>
            <div className="empty__a">
              <Link className="b" href={buildBoardHref(withFilters(q, {}))}>
                Search all signals
              </Link>
              <Link className="b b--2" href={`/structure?family=${unavailableFamily}`}>
                {FAMILY_UNAVAILABLE[unavailableFamily].action}
              </Link>
            </div>
          </div>
        </div>
      ) : presentation.unavailable ? (
        <div className="err">
          <PonteIcon name="participation.boundary" size={20} label="Boundary of what is known" />
          <div>
            <b>The sources could not be read</b>
            <p>
              This is a technical failure, not a finding. It does not mean nothing was
              published, and it does not mean the market is quiet. Ponte cannot show you what
              is live until the read succeeds.
            </p>
            <div className="empty__a">
              <Link className="b" href="/market-signals">
                Try the read again
              </Link>
            </div>
          </div>
        </div>
      ) : presentation.unclassified ? (
        /*
         * A filter Ponte cannot answer, on an axis with no family to name.
         *
         * Reachable through a kept URL carrying a territory or sector nothing
         * is classified on. Says the filter is unavailable rather than that the
         * slice is empty, for the same reason as the family state above: an
         * unclassified axis is not an absent market. The internal state is real
         * and is preserved in `SignalInventory` for tests, logs and governance,
         * but it is not a customer's problem to read.
         */
        <div className="empty">
          <PonteIcon name="participation.boundary" size={24} label="Boundary of what is known" />
          <div>
            <b>This filter is not currently available.</b>
            <p>
              Search all Market Signals instead. Everything on the public board is reachable that
              way.
            </p>
            <div className="empty__a">
              <Link className="b" href={buildBoardHref(withFilters(q, {}))}>
                View all signals
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          <ActiveFilters q={q} />
          {/*
            The genuine emptiness, and the only state allowed to claim it.
            It sits AFTER the coverage notices and is gated on the table,
            because it used to sit before them: an empty partial result
            rendered a whole-board claim and the notice explaining the
            filter's blind spot was unreachable exactly when it mattered.
          */}
          {/*
            The board is empty. A statement about the market, and only
            printed when nothing was asked of it.
          */}
          {presentation.genuineEmpty === "board" && (
            <div className="empty">
              <PonteIcon
                name="participation.boundary"
                size={24}
                label="Boundary of what is known"
              />
              <div>
                <b>No signal is currently live on the public board</b>
                <p>
                  Ponte publishes a signal only while it is approved and inside its public life.
                  Nothing found is not the same as nothing happening: sources publish late, a
                  signal leaves the board ninety days after it was read, and some buying is
                  never published at all.
                </p>
                <div className="empty__a">
                  <Link className="b" href="/structure">
                    Bring a requirement or offer to the desk
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/*
            The ANSWER is empty. A statement about the question, and a
            different fact: the board may be full. Saying "no signal is
            currently live" here would tell a member the market is dead
            when they had simply asked about one corner of it.
          */}
          {presentation.genuineEmpty === "filters" && (
            <div className="empty">
              <PonteIcon
                name="participation.boundary"
                size={24}
                label="Boundary of what is known"
              />
              <div>
                <b>No signal matches these filters</b>
                <p>
                  The board is not empty; this corner of it is. Widen the category, choose
                  every market, or clear the filters to see what is live.
                </p>
                <div className="empty__a">
                  <Link className="b" href={buildBoardHref(withFilters(q, {}))}>
                    Clear the filters
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/*
            The words found nothing. A statement about the query and about
            Ponte's vocabulary, and never about the market: the board may be
            completely full, and every action offered here is one the member
            can actually take from where they are standing.
          */}
          {presentation.genuineEmpty === "search" && search && (
            <div className="empty">
              <PonteIcon
                name="participation.boundary"
                size={24}
                label="Boundary of what is known"
              />
              <div>
                <b>No signal matches this search</b>
                <p>
                  Nothing on the public board matches <b>{search.raw}</b>
                  {hasStructuredFilters(q) ? " within the filters you have set" : ""}. The board
                  itself is not empty. A signal is published only while it is approved and
                  inside its ninety-day public life, and Ponte reads a source in its own words:
                  a different spelling, a broader term or the trade name may find it.
                </p>
                <div className="empty__a">
                  <Link className="b" href={buildBoardHref(clearedSearch(q))}>
                    Clear the search
                  </Link>
                  {hasStructuredFilters(q) && (
                    <Link className="b b--2" href={buildBoardHref(clearedAll(q))}>
                      Clear the search and filters
                    </Link>
                  )}
                  <Link className="b b--2" href="/structure">
                    Bring this requirement to the desk
                  </Link>
                </div>
              </div>
            </div>
          )}

          {presentation.records && (
            <>
          {/*
            The count is the whole matching eligible inventory, and the
            range is what a member is looking at. Both are printed, because
            a page length presented as a market size is a false claim about
            how much is out there.

            The sentence that used to sit under this one, saying the rest
            were counted but unreachable, is gone because it is no longer
            true. The pager below reaches them.
          */}
          <div className="boardbar">
            <p className="mono boardbar__c">
              {matched === 1 ? "1 signal" : `${matched.toLocaleString()} signals`}
              {search ? " match this search" : hasStructuredFilters(q) ? " match these filters" : ""}
              {everything !== null && matched < everything
                ? `, of ${everything.toLocaleString()} live on the board`
                : ""}
              {matched > records.length
                ? `. Showing ${(offset + 1).toLocaleString()}-${(offset + records.length).toLocaleString()}`
                : ""}
            </p>
            <SortLinks q={q} />
          </div>

          {/*
            Relevance was asked for and could not be given.

            A search matching more records than can be ranked in one read is
            ordered by date instead, over the complete set, correctly paged.
            Saying so is the difference between an honest fallback and a
            control that quietly does something else.
          */}
          {answered && !board.rankedFully && (
            <p className="boardbar__note">
              This search matches too many signals to rank by relevance, so they are ordered
              newest first. Every match is still reachable; adding a word will narrow it enough
              to rank.
            </p>
          )}

          {records.length > REGISTER_THRESHOLD ? (
            <FactRegister records={records} label="Market Signals" />
          ) : (
            <div>
              {records.map((record) => (
                <RecordCard key={record.ref} record={record} />
              ))}
            </div>
          )}

          <BoardPager q={q} total={matched} offset={offset} pageSize={PAGE_SIZE} />
            </>
          )}
        </>
      )}
    </section>
  );
}
