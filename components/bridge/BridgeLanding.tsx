"use client";

import Arc from "./Arc";
import Chrome, { type Signal } from "./Chrome";
import Footer from "./Footer";
import Grain from "./Grain";
import { MARKET_FAMILIES, type MarketFamily } from "@/lib/taxonomy/market";

/**
 * The public front door, on the bridge system.
 *
 * `ADR-0032`: *"Landing: one iconic crossing, drawn on load."* This is that
 * crossing, and it is the only surface in the product where the arch carries no
 * progress at all: nothing has started, so there is no position to report. It
 * springs from the near shore, crosses, and lands. The nodes are the five
 * stages a listing passes through, drawn as the journey a visitor has not begun
 * rather than as a state they are in.
 *
 * ## The 2,560 shell
 *
 * This surface is the reason the arch became a function of its chord. At the
 * span a 2,560 screen gives it, the old fixed 126px rise was a 6% rise: a
 * sagging wire under a headline sitting in the left third of the page with two
 * thirds of empty ink beside it. `lib/bridge/arc.ts` states the ratio, and the
 * band head, the strap and the two columns are what fill the width the
 * headline does not.
 *
 * ## Ponte Integrity, removed
 *
 * `ADR-0032` named a checked/not-checked ledger here as deliberate honesty.
 * On the live page it read the opposite way: a first-time visitor met a list
 * of what Ponte does NOT verify before they had any reason to trust it in the
 * first place. Owner call, 7 August 2026: cut, not softened. What Ponte does
 * check still runs on every submission; it is no longer recited on the door.
 *
 * ## What this page is not allowed to say
 *
 * **No manufactured activity.** The signals below are the real board, read on
 * the server and handed down. If there are none, the column says so rather than
 * inventing three.
 *
 * **No figure that could be read as a charge.** Publishing, searching and
 * preparing a room are free, and this page says so. The activation price and
 * its ceiling live on `/pricing`, which is the one surface that owns them, and
 * this one links there rather than restating them. A price restated in a second
 * place is a price that will eventually disagree with itself.
 */

export interface LandingSignal {
  /**
   * The row's real id, from `desk_radar`. Used only for routing to its own
   * Market Signal record, never shown: `reference` is what a reader sees.
   */
  id: string;
  /** The public reference. */
  reference: string;
  /** What is being traded, in the source's own words. */
  subject: string;
  /** Quantity, corridor, terms. One line. */
  detail: string;
  /**
   * Which way round the record runs. An offer is someone with supply, a
   * requirement is someone who needs it. Printed on the row, because a reader
   * scanning the board must not have to open a record to learn which it is.
   */
  side: "offer" | "requirement" | null;
}

export interface BridgeLandingProps {
  /** The tape's live market signals. */
  signals: readonly Signal[];
  /** The board's most recent public records. Never invented. */
  recent: readonly LandingSignal[];
  /**
   * The size of the Market Signal inventory, split by side.
   *
   * These are NOT opportunities and must never be described as such. They are
   * external indications read from public sources, unconfirmed by Ponte. The
   * copy that renders them says so, in the same breath as the number.
   *
   * Null where the count failed. Null renders nothing, because zero is the
   * claim that the market is empty and a failed read has established no such
   * thing.
   */
  counts?: { total: number; offers: number; requirements: number } | null;
  who?: string | null;
}

/*
  The arch carries no stage names, and the reason is a product rule rather than
  a layout one.

  It used to read INTENT, WORDS, THE FACTS, PREVIEW. Those are the four steps of
  the PUBLISH path, so the entrance was telling a member who arrived to BUY that
  they were already partway through a sell flow they had not chosen. Half the
  market was shown the other half's journey as though it were the product.

  R0 specification section 4: "The arc must not carry publish-path stage labels
  ... The arc keeps its shore labels and drops the stage names." The crossing on
  this page is identity, not progress: it says what Ponte is for, and a visitor
  who has done nothing yet has no position in anything.

  The shores below still name the two ends in prose, which is where the meaning
  belonged all along.
*/

/**
 * The three markets, and the way into each.
 *
 * ## Why the family is the first question, and not "buy or sell"
 *
 * Because "buy" and "sell" describe a shipment of goods and nothing else. A
 * freight forwarder does not sell, an agent looking for a brand to carry is
 * neither buying nor selling, and both of them are whole markets of their own.
 * A door worded for products silently tells two thirds of the market that this
 * platform is not for them.
 *
 * The family is also what the data model turns on: `lib/taxonomy/market.ts`
 * makes family, intent and side one coherent decision, and every downstream
 * journey is chosen by it. Asking for it first is not just clearer to read, it
 * is the question the system actually needs answered.
 *
 * ## Why the two doors go to different places
 *
 * One rule, applied without exception: offering something opens the publish
 * path, looking for something opens the board. Nobody should have to publish a
 * record before they are allowed to see whether the thing they want is already
 * there, and nobody offering should be dropped onto a search page.
 *
 * Every `intent` below is a key from the pinned intent table. The publish route
 * resolves it against that same table, so a renamed intent breaks the build
 * rather than silently opening the wrong journey.
 */
/**
 * The family's name, from the canonical taxonomy and from nowhere else.
 *
 * This surface used to spell the third family "Distribution and agency" in a
 * literal of its own, while `lib/taxonomy/market.ts` called it "Distribution and
 * representation" and every downstream screen followed the taxonomy. The
 * entrance therefore named a family that the rest of the product does not have.
 *
 * The taxonomy's own docstring already required this (finding F3: surfaces must
 * IMPORT it, and a list written independently is a defect even when its contents
 * happen to match). Reading it here means a renamed family cannot survive on the
 * front door.
 */
function familyName(family: MarketFamily): string {
  const found = MARKET_FAMILIES.find((f) => f.key === family);
  if (!found) throw new Error(`No canonical family named ${family}`);
  return found.label;
}

const MARKETS = [
  {
    family: "products",
    index: "01",
    detail: "Goods crossing a border, by the shipment or the programme.",
    doors: [
      { key: "offer", label: "I have a product to offer", href: "/publish?intent=offer_product" },
      {
        key: "seek",
        label: "I am looking for a product",
        href: "/find?intent=source_product",
      },
    ],
  },
  {
    family: "services",
    index: "02",
    detail: "Freight, inspection, customs, finance, insurance.",
    doors: [
      {
        key: "offer",
        label: "I provide a trade service",
        href: "/publish?intent=offer_trade_service",
      },
      { key: "seek", label: "I need a trade service", href: "/find?intent=seek_trade_service" },
    ],
  },
  {
    family: "distribution",
    index: "03",
    detail: "Carrying a brand into a market, or finding someone to carry yours.",
    doors: [
      {
        key: "offer",
        label: "I can distribute or represent",
        href: "/publish?intent=offer_distribution_or_representation",
      },
      {
        key: "seek",
        label: "I am looking for a distributor",
        href: "/find?intent=seek_distribution_partner",
      },
    ],
  },
] as const;

/**
 * ## Why nothing on this surface is a callback any more
 *
 * Every destination is an `<a href>` resolving to a real route. A trader
 * middle-clicks to open three records side by side, and a landing whose rows
 * are buttons cannot be opened in a new tab, cannot be copied, and shows
 * nothing at all if a script fails. The entrance to a marketplace is the last
 * place that should depend on JavaScript having loaded.
 */
export default function BridgeLanding({
  signals,
  recent,
  counts = null,
  who = null,
}: BridgeLandingProps) {
  return (
    <div className="brg" data-screen="LANDING">
      <Grain />
      <Chrome signals={signals} />

      <div className="brg-mx brg-band">
        <div className="brg-band__head">
          {/*
            The accent is a separate value, never an <em> inside a translated
            string: ADR-0032-AMENDMENT-2 entry 1.
          */}
          <h1 className="brg-headline">
            What&rsquo;s <em>your deal?</em>
          </h1>
          <div className="brg-band__now">
            <div className="brg-eyebrow">Two sides. One crossing.</div>
            {/*
              The positioning sentence, from North Star section 1's core product
              statement rather than from the funnel.

              It read: "Ponte reads the market, publishes your opportunity, and
              gives you a controlled room to close it in. Everything up to that
              room is free." Two thirds of that sentence described the paid
              product, and it named the room as where a deal is closed, which
              tells a first-time visitor that Ponte's real answer is a purchase.
              ADR-0037 section 3 says the opposite in terms: two parties who are
              introduced, talk, and never open a room have completed the journey
              correctly.
            */}
            <p className="brg-lede">
              Ponte helps professionals explore what is happening in global physical-goods trade,
              or start a deal of their own. Exploring the market and publishing an opportunity are
              free.
            </p>
            {counts && (
              <div className="brg-scale">
                <div className="brg-scale__top">
                  <span className="brg-scale__n">{counts.total.toLocaleString("en")}</span>
                  <span className="brg-scale__l">
                    market signals, read from public sources
                    <br />
                    {counts.offers.toLocaleString("en")} offering ·{" "}
                    {counts.requirements.toLocaleString("en")} seeking
                  </span>
                </div>
                {/*
                  The caveat is the pitch, not a disclaimer bolted onto it. The
                  distance between an unconfirmed signal and a closed deal is
                  precisely what Ponte sells, so the honest sentence and the
                  commercial sentence are the same sentence.
                */}
                {/*
                  The caveat is the pitch, and it now names the right work.

                  It used to end "Establishing that is what a Deal Room is for",
                  which is not what a room is for and not where that work
                  happens: confirming an unconfirmed signal is investigation,
                  JR-05, and ADR-0037 section 3 reserves the room for parties who
                  want structured transaction progression. The sentence sent a
                  reader towards the paid product to answer a question the desk
                  answers before any room exists.
                */}
                <p className="brg-scale__c">
                  Ponte has not confirmed any of these with the party named in them. Establishing
                  that is what Ponte investigates.
                </p>
              </div>
            )}
          </div>
        </div>

        {/*
          The crossing. Nothing on it is clickable, and nothing on it is a
          progress claim: a first-time visitor is not somewhere in a process
          they have not begun. It is the journey, drawn.
        */}
        <Arc size="hero" total={5} current={0} traffic identity />

        <div className="brg-shores">
          <div className="brg-shore">
            <div className="brg-eyebrow">This shore</div>
            <p className="brg-shore__n">What you have</p>
            <p className="brg-note">Goods, a service, or a market you can reach.</p>
          </div>
          <div className="brg-shore" data-side="far">
            <div className="brg-eyebrow">The far shore</div>
            <p className="brg-shore__n">Who needs it</p>
            <p className="brg-note">Named, screened, and disclosed only when both sides agree.</p>
          </div>
        </div>

      </div>

      {/*
        The entrance. Three markets, six doors, and every door is a complete
        sentence a member can recognise themselves in without translating.
      */}
      <div className="brg-mx brg-entrance">
        <div className="brg-sechead">
          <span>Three markets. Start where you are.</span>
          <span>03</span>
        </div>
        <div className="brg-fams">
          {MARKETS.map((market) => (
            <div className="brg-fam" key={market.family}>
              <div className="brg-fam__i">{market.index}</div>
              <h2 className="brg-fam__n">{familyName(market.family)}</h2>
              <p className="brg-fam__d">{market.detail}</p>
              <div className="brg-fam__doors">
                {market.doors.map((door) => (
                  <a className="brg-fam__door" href={door.href} key={door.key}>
                    {door.label}
                    <u aria-hidden="true">&#8250;</u>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        {/*
          What the doors can lead to, and the word "can" is the whole point.

          This band read "Six doors. One destination." over a paragraph saying
          that however you come in, you need the same thing. That is a funnel
          claim, and ADR-0037 section 1 rules it out in terms: every journey that
          establishes credible bilateral commercial interest CAN converge on a
          Deal Room, and "can" is the operative word. Convergence is available,
          never automatic and never obligatory.

          The same ADR names the endings a journey may legitimately reach
          instead, and requires that none of them read as a failure: watch,
          no-match, decline, do-not-proceed, investigation not confirmed, expiry,
          source unavailable, continued monitoring. A page that admits one
          destination has already called all eight of those a defeat.

          So the band states the trigger rather than an inevitability. ADR-0037
          section 3: a room becomes the next action when the parties want
          structured transaction progression, and wanting that is the trigger,
          nothing else. It stays a link and never a primary route (ADR-0036,
          explanation and not participation).
        */}
        <div className="brg-funnel">
          <p className="brg-funnel__t">Six doors. Where they can lead.</p>
          <p className="brg-funnel__d">
            Most of what happens here needs no room at all: you find a counterparty, Ponte makes
            the introduction, and you talk. When two parties want the deal run properly instead,
            with terms agreed in one place, evidence exchanged and held, each stage settled before
            the next opens and a record of all of it, that is what a Deal Room is for. Choosing one
            is always yours to make. Everything up to it is free.
          </p>
          <a className="brg-funnel__a" href="/deal-rooms">
            What a Deal Room is
            <u aria-hidden="true">&#8250;</u>
          </a>
        </div>
      </div>

      <div className="brg-mx brg-cols brg-cols--2">
        <div className="brg-col">
          {/*
            Headed "Market Signals", not "On the board". Every row beneath this
            heading is an unconfirmed external record, and a heading that does
            not say so leaves a reader to assume these are members Ponte has
            checked. They are not.
          */}
          <div className="brg-sechead">
            <span>Market Signals, read recently</span>
            <span>{String(recent.length).padStart(2, "0")}</span>
          </div>
          {recent.length > 0 ? (
            recent.map((signal) => (
              <a
                className="brg-item"
                href={`/market-signals/${signal.id}`}
                key={signal.reference}
              >
                <span className="brg-item__r">
                  {signal.reference}
                  {signal.side && (
                    <b className="brg-item__s">
                      {signal.side === "offer" ? "Offering" : "Seeking"}
                    </b>
                  )}
                </span>
                <span className="brg-item__n">{signal.subject}</span>
                <span className="brg-item__f">{signal.detail}</span>
              </a>
            ))
          ) : (
            /*
              No manufactured activity. An empty board says it is empty. Three
              invented rows here would be the one lie a front door can tell that
              a visitor cannot check.
            */
            <p className="brg-note">
              Nothing has been read recently. The next signal approved will appear here.
            </p>
          )}
          <p className="brg-note" style={{ marginBlockStart: 16 }}>
            Read from a named public source and dated. Not confirmed with the party named, and not
            a member of Ponte.
          </p>
        </div>

        {/*
          What a signal is, beside the signals themselves.

          The markets used to sit here, which meant the entrance was stated
          twice on one page and the reader had to work out whether the two
          lists were the same thing. This column answers the question the rows
          beside it actually raise, and it ends where the product begins.
        */}
        <div className="brg-col">
          <div className="brg-sechead">
            <span>What a Market Signal is</span>
            <span>&mdash;</span>
          </div>
          {/*
            What a signal is, without claiming to be a reprint of it.

            This column asserted that Ponte "republishes what they say, in the
            source's own words", and the register beneath it answered "Yes" to
            "Republished exactly as printed". Neither is true of the record: a
            signal is read from a source, dated and recorded in Ponte's own
            words, and the detail page says so in the same breath. A verbatim
            claim on the entrance also puts Ponte behind the source's wording as
            though it had adopted it, which is precisely the confirmation the
            next two rows deny.

            A Market Signal is a sourced, dated, unconfirmed indication. That is
            what the register now states, and each row is still answerable.
          */}
          <p className="brg-lede" style={{ fontSize: 15, marginBlockStart: 14 }}>
            An indication that someone, somewhere, wants to buy or sell something. Ponte reads them
            from named public sources and records what was indicated, with the source and the date
            it was read.
          </p>
          <div className="brg-row" style={{ marginBlockStart: 20 }}>
            <span className="brg-row__label">Read from a named public source</span>
            <span className="brg-row__value" data-state="checked">Yes</span>
          </div>
          <div className="brg-row">
            <span className="brg-row__label">Dated, and shown only while current</span>
            <span className="brg-row__value" data-state="checked">Yes</span>
          </div>
          <div className="brg-row">
            <span className="brg-row__label">Confirmed with the party named</span>
            <span className="brg-row__value" data-state="unproved">No</span>
          </div>
          <div className="brg-row">
            <span className="brg-row__label">A member of Ponte</span>
            <span className="brg-row__value" data-state="unproved">No</span>
          </div>
          {/*
            This note used to end "That is the work a Deal Room does, and it is
            the only thing Ponte charges for", which put the paid product where
            the desk's work belongs. Establishing who is behind a signal and
            whether they can perform is INVESTIGATION, and the Market Signal
            boundary in the Canonical Journey Register is binding: a signal
            cannot enter the introduction journey at all until it is confirmed.
            Naming the room here also offered it as the answer to a question
            that arises before any room could exist.
          */}
          <p className="brg-note" style={{ marginBlockStart: 18 }}>
            Turning one of these into a deal means establishing who is behind it and whether they can
            perform. Ask Ponte to investigate, and it is worked by the desk before anything is
            offered as an opportunity.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
