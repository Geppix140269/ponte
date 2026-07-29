import { Link } from "@/i18n/navigation";
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

export default function SignalBoard({
  q,
  board,
  everything,
}: {
  q: FindQuery;
  board: SignalInventory;
  /** Eligible signals on the whole board, filters aside. Null when unknown. */
  everything: number | null;
}) {
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

      <SignalSearch q={q} />

      <SignalFilters q={q} />

      {presentation.unclassified && board.state === "unclassified" ? (
        /*
         * Neither a result nor an emptiness.
         *
         * No published signal carries this classification, so filtering on
         * it cannot answer. Printing "no signal matches" would be Ponte
         * reporting a finding it never made, which is the same distinction
         * this board already draws between nothing found and nothing read.
         */
        <div className="empty">
          <PonteIcon name="participation.boundary" size={24} label="Boundary of what is known" />
          <div>
            <b>Ponte cannot filter signals by this category yet</b>
            <p>
              {board.reason === "columns_absent"
                ? "The category fields are not yet live on the database, so this filter cannot be applied at all."
                : "No signal on the board carries a category in this taxonomy, so this filter would return an empty list rather than an answer."}{" "}
              That is a gap in what Ponte has classified, not a statement about the market.
              Signals read from here on are classified as they are approved; the signals already
              here have not been.
            </p>
            {typeof board.eligible === "number" && (
              <p>
                {board.eligible.toLocaleString()} signals are live on the board, and none of them
                carries a category.
              </p>
            )}
            <div className="empty__a">
              <Link className="b" href={buildBoardHref(withFilters(q, {}))}>
                See every signal on the board
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
      ) : (
        <>
          <ActiveFilters q={q} />
          {/*
            The size of the blind spot, printed above the results rather
            than below them. A category filter reads only the records that
            carry a category; while most of the board does not, a result
            shown without this reads as a statement about the market when
            it is a statement about the classified part of it.
          */}
          {presentation.coverageNotice === "unknown" && (
            <div className="empty" style={{ marginBottom: 12 }}>
              <PonteIcon
                name="participation.boundary"
                size={20}
                label="Boundary of what is known"
              />
              <div>
                <b>Ponte cannot confirm how much of the board this filter searched</b>
                <p>
                  The signals below are real. How many matching signals carry no category, and
                  were therefore not searched, could not be counted, so this result cannot be
                  treated as complete.
                </p>
              </div>
            </div>
          )}
          {presentation.coverageNotice === "partial" && board.state === "partial" && (
            <div className="empty" style={{ marginBottom: 12 }}>
              <PonteIcon
                name="participation.boundary"
                size={20}
                label="Boundary of what is known"
              />
              <div>
                <b>
                  This filter can see {board.coverage.classified.toLocaleString()} of{" "}
                  {board.coverage.eligible.toLocaleString()} matching signals
                </b>
                <p>
                  {(board.coverage.eligible - board.coverage.classified).toLocaleString()}{" "}
                  signals matching the rest of this search carry no category, so they were not
                  searched.
                  {records.length === 0
                    ? " Nothing matched among the ones that do, which is not the same as nothing matching."
                    : " What is below is real; it is not everything."}
                </p>
              </div>
            </div>
          )}
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
