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
 * it is worth opening. Each also carried its own search field, on the reasoning
 * that the search a member wants is almost always inside one side; that half is
 * still true and the field was still the wrong way to serve it. See below.
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
 * The search survived that change as its own control, because a station on a
 * deck cannot hold a text input and drawing a panel round the bridge to make
 * room would have put back the box the change exists to remove. It has since
 * gone too, for a different reason, given below.
 *
 * Nothing here is distinguished by colour. The approved palette reserves its
 * status colours for verification, approval, warning and success, and
 * Constitution section 6 keeps gold off status entirely; supply and demand are
 * a direction, not a state.
 */

/*
 * ---------------------------------------------------------------------------
 * The two side searches were removed on 2 August 2026, and this is where
 * ---------------------------------------------------------------------------
 * There were THREE search inputs on `/market-signals`: "Search buyer
 * requirements" and "Search seller offers" here, and "Search Market Signals"
 * on the board immediately below. The design director found all three on one
 * screen and the finding is right. Three fields is three answers to "where do
 * I type", and two of them were worse answers.
 *
 * `SignalSearch` is the real one. It runs the trade vocabulary, so `gas oil`
 * also finds `EN590`; it says when a query was widened and by what; it says
 * when a query was too short to run; it carries every structured filter across
 * the submission; and it offers Clear search and Clear all. The two removed
 * here did none of that. They were a bare `q` and a hidden `intent`, so
 * searching from one of them silently discarded whatever the member had already
 * narrowed by.
 *
 * The side is not lost, and it was never really the search's job. The crossing
 * above is a real Bridge whose two stations link to `?intent=requirement` and
 * `?intent=offer`, and the board carries the same choice in its lane selector.
 * `SignalSearch` carries `intent` across in its hidden fields, so choosing a
 * side and then searching stays inside that side, which is what the two forms
 * were approximating, badly.
 */

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
        The crossing carries the two sides, their sizes and the route into each.
        It was two boxed cards until the owner asked for the bridge; the two
        search fields that survived that change have now gone too, because the
        board's own search does everything they did and five things they did
        not. Choosing a side here and searching below stays inside the side.
      */}
      <SignalCrossing counts={counts} />

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
