import BridgeRoute from "./BridgeRoute";
import type { SignalSideCounts } from "@/lib/board/inventory";

/**
 * The two sides of the market, as a crossing.
 *
 * Ponte is the bridge between a buyer and a seller, and this is the one place
 * on the site where that sentence is drawn rather than written: demand stands
 * at one abutment, supply at the other, and the deck between them is the
 * inventory. It replaces a boxed list of four signal cards on the entrance,
 * which showed four records out of several thousand and implied the board was
 * four records long.
 *
 * ---------------------------------------------------------------------------
 * Built from the approved primitive, not from a second bridge
 * ---------------------------------------------------------------------------
 * `design/authority/bridge/v1/implementation/00_README.md` is explicit: "If
 * something is not in this folder, it is not authorised by this package." So
 * nothing here draws a curve, invents an abutment or restyles a station. It
 * composes `BridgeRoute` in `navigate` mode, which is the approved primitive
 * and the approved engine geometry.
 *
 * The two-station deck is the engine's own case, not a shape bent to fit this:
 * `stationFractions(2)` returns `[0.3, 0.7]`, so a pair sits wide on the arch
 * with one near each abutment. That is exactly the composition asked for, and
 * it needed no change to the geometry to get it.
 *
 * ---------------------------------------------------------------------------
 * Where the count goes, and why it is in the title
 * ---------------------------------------------------------------------------
 * The boxed version carried the count at 34px. There is no 34px slot on an
 * approved station and adding one would be restyling the authority, so the
 * count moves into the station title, which is the largest slot the station
 * has. `index` keeps the box's own kicker (DEMAND / SUPPLY) and `description`
 * keeps its sentence, so the same three facts survive the change of form.
 *
 * An unread count is not written as zero. When the read fails the station says
 * what it is without claiming a size, because a zero here would state that a
 * side of the market is empty.
 */

export default function SignalCrossing({
  counts,
  ariaLabel = "Market Signals: buyer requirements and seller offers",
}: {
  /** Live counts per side. Null when the read failed; never rendered as zero. */
  counts: SignalSideCounts | null;
  ariaLabel?: string;
}) {
  const demand = counts?.requirement ?? null;
  const supply = counts?.offer ?? null;

  return (
    <BridgeRoute
      mode="navigate"
      ariaLabel={ariaLabel}
      // The two ends of the crossing, in the box's own words.
      left="Demand"
      right="Supply"
      stations={[
        {
          key: "requirement",
          index: "Demand",
          title: demand === null ? "Buyer requirements" : `${demand.toLocaleString()} buyer requirements`,
          description: "Someone in the open market is looking to buy. Find who is asking for what you sell.",
          href: "/market-signals?intent=requirement",
        },
        {
          key: "offer",
          index: "Supply",
          title: supply === null ? "Seller offers" : `${supply.toLocaleString()} seller offers`,
          description: "Someone is offering goods for sale. Find a source for what you need to buy.",
          href: "/market-signals?intent=offer",
        },
      ]}
    />
  );
}
