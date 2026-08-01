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
      <div className="sech">
        <div>
          <h2 id="drp-h">A private Deal Room</h2>
          <p className="d">
            Where every route across ends. One agreed procedure, evidence with provenance,
            decisions and blockers on the record.
          </p>
        </div>
        <Link href="/pricing">
          How Deal Rooms work<span aria-hidden="true"> &rarr;</span>
        </Link>
      </div>

      <div className="drp__room">
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

        <footer className="drp__ent">
          <span>
            {money(BASE_ROOM_PRICE_CENTS, CURRENCY)} for {ACTIVE_PERIOD_DAYS} active days
          </span>
          <span>Invited counterparties join free</span>
          <span>Exploring, publishing and preparing a room stay free</span>
        </footer>
      </div>
    </section>
  );
}
