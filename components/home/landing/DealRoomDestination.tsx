import Link from "next/link";
import {
  ACTIVE_PERIOD_DAYS,
  BASE_ROOM_PRICE_CENTS,
  CURRENCY,
} from "@/lib/deal-room/pricing";

/**
 * Where every route across ends.
 *
 * ADR-0022. The landing page exists to funnel members into creating a Master
 * Deal Room, and this is the part of it that names the destination. It sits
 * directly under the family bridge because the bridge asks which family you are
 * in and this answers where that question leads; a reader who has just chosen a
 * route should not have to scroll past nothing to find out what it is for.
 *
 * The four stations are the journey stated as a progression rather than as
 * prose, per the approved composition (`Ponte Landing - Deal Room Integration
 * B.html` in the owner's design package). Only the first is `--on`: the visitor
 * is at the families and has not begun. Marking more would claim progress that
 * has not happened, which is the same rule the omitted journey rail follows.
 *
 * ## What this component may not do
 *
 * It may not carry a price as a literal. `BASE_ROOM_PRICE_CENTS` and
 * `ACTIVE_PERIOD_DAYS` come from `lib/deal-room/pricing.ts`, so the entrance
 * cannot drift from what the room actually charges. ADR-0020 remains the
 * pricing authority; this is a reader of it.
 *
 * It may not state the price without stating that the pre-activation journey is
 * free and that invited counterparties join free. A price alone misrepresents
 * the commercial model: under ADR-0020 everything up to activation is free for
 * everyone without limit, and under ADR-0005 an invited guest never pays to
 * participate. Both lines are therefore part of the same block, and the free
 * one comes first because it is the true offer.
 */

/** `7900` -> `$79`, `7950` -> `$79.50`. Whole dollars stay whole. */
function money(cents: number, currency: string): string {
  const symbol = currency.toLowerCase() === "usd" ? "$" : "";
  const whole = cents % 100 === 0;
  return `${symbol}${whole ? cents / 100 : (cents / 100).toFixed(2)}`;
}

const STATIONS = [
  "Three market families",
  "Explore or create an opportunity",
  "Credible commercial interest",
  "Private Deal Room",
] as const;

export default function DealRoomDestination() {
  return (
    <div className="prog" id="deal-room">
      <div className="prog__d">
        {STATIONS.map((label, i) => (
          <span
            key={label}
            className={`prog__s${i === 0 ? " prog__s--on" : ""}${
              i === STATIONS.length - 1 ? " prog__s--end" : ""
            }`}
          >
            <i aria-hidden="true" />
            <b>{label}</b>
          </span>
        ))}
      </div>

      <div className="prog__f">
        <p>
          Every route across ends in the same place: a private room where one agreed
          procedure is progressed, with evidence, decisions and blockers on the record.
        </p>
        <div>
          <Link href="/pricing">
            See how Deal Rooms work<span aria-hidden="true"> &rsaquo;</span>
          </Link>
          {/* The free part first. It is the larger half of the offer and the
              reason a member can reach a room at all without paying. */}
          <span className="prog__free">
            Free to explore, publish, prepare a room and invite a counterparty
          </span>
          <span>
            {money(BASE_ROOM_PRICE_CENTS, CURRENCY)} for {ACTIVE_PERIOD_DAYS} active days
            {" · "}invited counterparties join free
          </span>
        </div>
      </div>
    </div>
  );
}
