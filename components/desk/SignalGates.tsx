import { Link } from "@/i18n/navigation";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import { buildBoardHref, type FindQuery } from "@/lib/find/query";
import type { SignalSideCounts } from "@/lib/board/inventory";

/**
 * The Market Signals entrance: the two sides of the market, as two doors.
 *
 * ---------------------------------------------------------------------------
 * Why an entrance at all
 * ---------------------------------------------------------------------------
 * `/market-signals` used to open straight onto the newest sixty records of a
 * mixed inventory. That page cannot be read, because the two record classes on
 * it answer opposite questions: a buyer requirement is somebody looking to buy
 * what you sell, a seller offer is somebody selling what you want to buy. A
 * member arrives with one of those two questions, never with both, and a single
 * blended list makes them do the sorting Ponte should have done.
 *
 * So the first thing the route asks is which question. Each door carries its own
 * live count, because a door with no number on it asks a member to guess whether
 * it is worth opening, and its own search field, because the search a member
 * wants is almost always inside one side rather than across both.
 *
 * The board is never hidden: "All signals" carries `view=board`, and any filter
 * or search reaches it directly. See `showsBoard`.
 *
 * ---------------------------------------------------------------------------
 * Two doors, one treatment
 * ---------------------------------------------------------------------------
 * The sides are distinguished by their icon, their words and their count, and
 * deliberately NOT by colour. The approved palette carries `--pos`, `--review`
 * and `--declared` as reserved semantic states, and `--gold` is a brand signal
 * that Constitution section 6 keeps off status entirely; colouring supply green
 * and demand amber would spend two reserved status colours on a distinction
 * that is not a status. Structure carries it instead, which is also what makes
 * the pair read as one control rather than as two unrelated banners.
 *
 * Each door is a GET form, for the same reasons `SignalSearch` is: Enter
 * submits, the state is the URL, and it works with no JavaScript at all. The
 * hidden `intent` is what makes the field search inside that side.
 */

function Door({
  intent,
  icon,
  kicker,
  title,
  blurb,
  placeholder,
  count,
}: {
  intent: "requirement" | "offer";
  /**
   * `deal.origin` and `deal.destination`, and not the family icons.
   *
   * The pairing is the record shape rather than a decoration: a seller offer
   * states where the goods come FROM and carries an origin, a buyer requirement
   * states where they are wanted and carries a destination. Reusing
   * `market.family.*` here would have put a taxonomy mark on a direction and
   * said nothing true about either side.
   */
  icon: "deal.origin" | "deal.destination";
  kicker: string;
  title: string;
  blurb: string;
  placeholder: string;
  count: number | null;
}) {
  const href = buildBoardHref({ intent, page: 1 });
  return (
    <div className="sgate">
      <Link className="sgate__open" href={href}>
        <span className="sgate__k">
          <PonteIcon name={icon} size={16} />
          {kicker}
        </span>
        <span className="sgate__n">
          {/* An unread count is stated as absent, not as a number. The slot is
              34px tabular figures, so the placeholder stays a single mark. */}
          {count === null ? "--" : count.toLocaleString()}
        </span>
        <span className="sgate__t">{title}</span>
        <span className="sgate__d">{blurb}</span>
      </Link>

      {/*
        Searching inside one side. `intent` travels as a hidden field because a
        GET form replaces the query string wholesale, so the side the member
        just chose would otherwise be dropped by the act of searching, and the
        exact defect the board's own search carries its filters to avoid.
      */}
      <form className="sgate__f" action="/market-signals" method="get" role="search">
        <input type="hidden" name="intent" value={intent} />
        {/*
          Labelled by `aria-label` rather than a visible <label>: the door's own
          heading is two lines above the field and a repeated visible label
          would be noise. The placeholder is not relied on for the accessible
          name, because a placeholder disappears the moment anybody types.
        */}
        <input
          className="sgate__i"
          type="search"
          name="q"
          aria-label={`Search ${title.toLowerCase()}`}
          placeholder={placeholder}
          autoComplete="off"
        />
        <button className="sgate__b" type="submit">
          Search
        </button>
      </form>
    </div>
  );
}

export default function SignalGates({ counts }: { counts: SignalSideCounts | null }) {
  const total = counts?.total ?? null;
  return (
    <section className="sec">
      <div className="sech">
        <div>
          <h2>
            <PonteIcon name="evidence.evreview" size={18} />
            Market Signals
          </h2>
          <p className="d">
            Indications read from named public sources. Nothing here has been confirmed with the
            party named in it, and nothing here is a Ponte member. Choose the side of the market
            you are working on.
          </p>
        </div>
      </div>

      <div className="sgates">
        <Door
          intent="requirement"
          icon="deal.destination"
          kicker="Demand"
          title="Buyer requirements"
          blurb="Someone in the open market is looking to buy. Search these to find who is asking for what you sell."
          placeholder="Search buyer requirements…"
          count={counts?.requirement ?? null}
        />
        <Door
          intent="offer"
          icon="deal.origin"
          kicker="Supply"
          title="Seller offers"
          blurb="Someone is offering goods for sale. Search these to find a source for what you need to buy."
          placeholder="Search seller offers…"
          count={counts?.offer ?? null}
        />
      </div>

      <div className="sgates__all">
        <PonteIcon
          name="participation.boundary"
          size={16}
          label="Boundary of what is known"
        />
        <p>
          {/*
            The count is stated only when it was actually read. A failed count
            is not zero and is not a market that has gone quiet, so the sentence
            simply drops the number rather than printing one Ponte cannot stand
            behind.
          */}
          {total === null
            ? "Or search across both sides of the market."
            : `Or search across both. ${total.toLocaleString()} signals live on the board.`}
        </p>
        <div className="sgates__a">
          <Link className="b b--2" href={buildBoardHref({ view: "board" })}>
            All signals
          </Link>
          <Link className="b b--2" href="/market-signals/categories">
            Browse categories
          </Link>
        </div>
      </div>
    </section>
  );
}
