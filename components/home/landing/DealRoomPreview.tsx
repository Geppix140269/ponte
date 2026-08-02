import { Link } from "@/i18n/navigation";
import TaskCompletionBridge from "@/components/ponte/bridge/TaskCompletionBridge";
import { ACTIVE_PERIOD_DAYS, BASE_ROOM_PRICE_CENTS, CURRENCY } from "@/lib/deal-room/pricing";

/**
 * A Deal Room, on the entrance, as a room rather than as a word.
 *
 * ADR-0022 and ADR-0024. The landing is the discovery half of the journey and
 * the room is where the second half begins, so a visitor has to be able to SEE
 * the room before deciding to want one. Every previous attempt named it - a
 * band, a link, an abutment label in 8px mono - and naming a thing is not
 * showing it.
 *
 * This is the C2 Master Deal Room command view from the owner's design package
 * (`Ponte Deal Room - Design Review v3.html`, screen 4 of 39), reduced to what
 * answers the question "what do I get": who is in the room, what stage the deal
 * is at, how much of the agreed procedure is done, what happens next, and what
 * is in the way.
 *
 * ## It is an example, and says so
 *
 * The numbers here are not a member's and not a market's. Constitution section
 * 5 forbids manufactured activity, and a fabricated room presented as live would
 * be exactly that. So the room is labelled as an example in its own header,
 * before any figure is read, and it uses the design package's own illustrative
 * deal rather than inventing a second one.
 *
 * The price is the only live number, and it comes from `lib/deal-room/pricing.ts`
 * rather than being typed here, so the entrance cannot quote a figure the
 * product does not charge.
 */

function money(cents: number, currency: string): string {
  const symbol = currency.toLowerCase() === "usd" ? "$" : "";
  return `${symbol}${cents % 100 === 0 ? cents / 100 : (cents / 100).toFixed(2)}`;
}

/** The design package's illustrative room. Not a member's, and not a market's. */
const ROOM = {
  reference: "DR-2041",
  deal: "PD-8837",
  line: "Organic extra virgin olive oil, supply, 24 t per quarter",
  seller: { name: "Mediterranea Foods S.L.", place: "Jaén, Spain" },
  buyer: { name: "Nordwind Import GmbH", place: "Hamburg, Germany" },
  stage: { label: "Evidence and conditions in progress", detail: "Stage 4 of 6, named, not calculated" },
  momentum: { label: "Moving", detail: "Three material actions completed this week" },
  completion: 58,
  nextAction: {
    what: "Inspection provider to propose revised sampling point",
    owner: "Atlântico Inspection Ltd",
    due: "31 July 2026",
  },
  blocker: {
    reference: "BLK-04",
    what: "Sampling point not accepted by both principal parties",
    effect: "Inspection cannot be scheduled, so steps 9 and 10 remain unavailable.",
  },
  registers: [
    { count: "10", unit: "steps", name: "Procedure", detail: "6 complete, 1 blocked" },
    { count: "4", unit: "open", name: "Workspaces", detail: "3 branches active, 1 awaiting admission" },
    { count: "11", unit: "items", name: "Evidence", detail: "1 clarification required" },
    { count: "1", unit: "pending", name: "Decisions", detail: "DEC-07 awaiting approval" },
  ],
} as const;

export default function DealRoomPreview() {
  return (
    <section className="sec drp" id="deal-room" aria-labelledby="drp-h">
      {/*
        The one place on the entrance that is allowed to be loud.

        Every route across ends here, and the section that says so was set at
        the same 17px as "Market Signals" above it - which read as a footnote to
        the page rather than as its destination. It is the product, so it is
        stated at the scale of the product.
      */}
      <div className="drp__head">
        <h2 id="drp-h">The Deal Room</h2>
        <p>Where every route across ends.</p>
        {/*
          The second control used to be "How Deal Rooms work" pointing at
          `/pricing`. It promised an explanation and delivered a price list,
          and the owner walked the loop it creates on 1 August 2026: room ->
          wall -> "how it works" -> a page of text with a figure in it -> back
          to the wall. A button that answers a question with a different
          question is worse than no button.

          It first became an anchor to the room directly below. That was
          honest but thin: the room shown here is one frame of a six-stage
          journey, and a visitor asking how it works is asking about the
          journey. It now opens the walkthrough, which steps from an offer
          through credible interest into the Master Deal Room, its branches,
          the agreed procedure and the ending, and states the price at every
          stage including the stages that are free.
        */}
        <div className="drp__cta">
          <Link className="b b--lg" href="/deal-rooms/propose">
            Open a Deal Room
          </Link>
          <Link className="b b--2 b--lg" href="/deal-rooms/inside">
            See inside one
          </Link>
        </div>
      </div>

      <div className="drp__room" id="drp-room">
        {/* The example marker comes before any figure in reading order. */}
        <div className="drp__ex">An example room. Not a live deal.</div>

        <header className="drp__id">
          <div>
            <p className="drp__ref">
              Master Deal Room · {ROOM.reference} · Deal {ROOM.deal}
            </p>
            <h3>{ROOM.line}</h3>
            <p className="drp__parties">
              {ROOM.seller.name}, {ROOM.seller.place}
              <span aria-hidden="true"> · </span>
              {ROOM.buyer.name}, {ROOM.buyer.place}
            </p>
          </div>
          <span className="drp__state">Active</span>
        </header>

        <div className="drp__band">
          <div className="drp__tile">
            <p className="drp__k">Commercial stage</p>
            <p className="drp__v">{ROOM.stage.label}</p>
            <p className="drp__d">{ROOM.stage.detail}</p>
          </div>
          <div className="drp__tile">
            <p className="drp__k">Momentum</p>
            <p className="drp__v">{ROOM.momentum.label}</p>
            <p className="drp__d">{ROOM.momentum.detail}</p>
          </div>
          <div className="drp__tile drp__tile--bridge">
            <p className="drp__k">Procedural completion</p>
            {/* The approved progress component, not a bar drawn here. */}
            <TaskCompletionBridge
              value={ROOM.completion}
              band="of the approved procedure"
              abutments={{ left: "Procedure agreed", right: "Ready" }}
              neutralLabel="Nothing completed yet"
              ariaLabel="Procedural completion, example room"
            />
          </div>
        </div>

        <div className="drp__now">
          <div className="drp__act">
            <p className="drp__k">Next action</p>
            <p className="drp__v">{ROOM.nextAction.what}</p>
            <p className="drp__d">
              {ROOM.nextAction.owner}
              <span aria-hidden="true"> · </span>due {ROOM.nextAction.due}
            </p>
          </div>
          <div className="drp__blk">
            <p className="drp__k">Blocker · {ROOM.blocker.reference}</p>
            <p className="drp__v">{ROOM.blocker.what}</p>
            <p className="drp__d">{ROOM.blocker.effect}</p>
          </div>
        </div>

        <ul className="drp__regs">
          {ROOM.registers.map((register) => (
            <li key={register.name}>
              <span className="drp__n">
                {register.count} <i>{register.unit}</i>
              </span>
              <span className="drp__rn">{register.name}</span>
              <span className="drp__d">{register.detail}</span>
            </li>
          ))}
        </ul>

        {/*
          THE THREE PUBLIC ACTIONS, in the words ADR-0028 fixes for them.

          This line said "$79 when you publish it, for 30 active days", and
          both halves were wrong in a way that costs money.

          "Publish" everywhere else on the internet means make publicly
          visible. A Deal Room is private and stays private, so the line could
          be read as "pay $79 to make my confidential deal public" - the exact
          opposite of the product, offered at the exact moment a member is
          deciding whether to pay. Publishing is what a LISTING does, and it is
          free. A room is created free and ACTIVATED for $79.

          "Active days" implied a clock that stops. It never has:
          `periodEndFrom` is `start + 30 x 24h` of wall time and does not pause
          for anything, so the interface was describing an accounting model the
          code does not implement. Calendar days is what it always was.

          Wording approved by the owner, 2 August 2026, verbatim. The order is
          the order of the journey, so the free steps are read before the
          charged one rather than after it.
        */}
        <footer className="drp__ent">
          <span>Opening a room and building it are free.</span>
          <span>Invited counterparties join free.</span>
          <span>
            {money(BASE_ROOM_PRICE_CENTS, CURRENCY)} to activate it, for {ACTIVE_PERIOD_DAYS} calendar days.
          </span>
        </footer>
      </div>
    </section>
  );
}
