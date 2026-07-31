import { Link } from "@/i18n/navigation";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import SignalCrossing from "@/components/ponte/bridge/SignalCrossing";
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
 * So the first thing the route offers is that choice. Each door carries its own
 * live count, because a door with no number on it asks a member to guess whether
 * it is worth opening, and its own search field, because the search a member
 * wants is almost always inside one side rather than across both.
 *
 * This band sits ABOVE the board, never instead of it. Offering the choice is
 * worth a screenful; charging a click for the inventory somebody came for is
 * not, and a hub page carrying no records is a thin page to every crawler that
 * reads it. It is drawn only on a bare arrival: once anything is narrowed the
 * board's own compact lane selector carries the same choice. See
 * `showsEntrance`.
 *
 * ---------------------------------------------------------------------------
 * A crossing, not two boxes
 * ---------------------------------------------------------------------------
 * The two sides were two raised cards, each with a count, a sentence and a
 * search. On owner direction they are now `SignalCrossing`: the approved Bridge
 * primitive, demand at one abutment and supply at the other, with the counts on
 * the deck. Ponte is the bridge between a buyer and a seller, and this is the
 * one place the sentence is drawn rather than written.
 *
 * Only the search survives as its own control, because a station on a deck
 * cannot hold a text input and drawing a panel round the bridge to make room
 * would have put back the box the change exists to remove.
 *
 * Nothing here is distinguished by colour. The approved palette reserves its
 * status colours for verification, approval, warning and success, and
 * Constitution section 6 keeps gold off status entirely; supply and demand are
 * a direction, not a state.
 */

/**
 * The search for one side of the market.
 *
 * All that is left of the boxed door: the crossing above now carries the side,
 * its size and its sentence, so repeating them here would say everything twice.
 * No card, no border, no count. A label and a field.
 *
 * Still a plain GET form, for the reasons `SignalSearch` gives: Enter submits,
 * the state is the URL, and it works with no JavaScript. The hidden `intent` is
 * what keeps the search inside this side, because a GET form replaces the query
 * string wholesale and would otherwise drop it.
 */
function SideSearch({
  intent,
  title,
  placeholder,
}: {
  intent: "requirement" | "offer";
  title: string;
  placeholder: string;
}) {
  return (
    <form className="sgate__f" action="/market-signals" method="get" role="search">
      <input type="hidden" name="intent" value={intent} />
      {/*
        Labelled by `aria-label`: the crossing names this side two lines above,
        and the placeholder is not relied on for the accessible name because a
        placeholder disappears the moment anybody types.
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

      {/*
        The crossing carries the two sides and their sizes; the two search
        fields below carry the action. They were one boxed card each until the
        owner asked for the bridge, and splitting them this way is what let the
        box go: a station on a deck cannot hold a text input, and drawing a
        panel round the bridge to make room would have put back the box the
        change exists to remove.
      */}
      <SignalCrossing counts={counts} />

      <div className="sgates">
        <SideSearch
          intent="requirement"
          title="Buyer requirements"
          placeholder="Search buyer requirements…"
        />
        <SideSearch
          intent="offer"
          title="Seller offers"
          placeholder="Search seller offers…"
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
            No "All signals" link: the whole board is immediately below this
            band, so a control leading to what is already on screen would be a
            click that changes nothing.

            The count is stated only when it was actually read. A failed count
            is not zero and is not a market that has gone quiet, so the sentence
            drops the number rather than printing one Ponte cannot stand behind.
          */}
          {total === null
            ? "Every signal is listed below, both sides together."
            : `All ${total.toLocaleString()} signals are listed below, both sides together.`}
        </p>
        <div className="sgates__a">
          <Link className="b b--2" href="/market-signals/categories">
            Browse by market
          </Link>
        </div>
      </div>
    </section>
  );
}
