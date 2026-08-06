import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { bridgeFontVars } from "@/components/bridge/fonts";
import LandingEntrance from "@/components/bridge/LandingEntrance";
import type { LandingSignal } from "@/components/bridge/BridgeLanding";
import type { Signal } from "@/components/bridge/Chrome";
import { readMarketSignals } from "@/lib/board/market-signals";
import { signalSideCounts } from "@/lib/board/inventory";
import "@/design-system/bridge/tokens.css";
import "@/design-system/bridge/bridge.css";

/**
 * The entrance, on the bridge.
 *
 * `ADR-0032` phase 3: the landing is the first surface rebuilt after the
 * listing path, and it is the one the whole language is named for. One iconic
 * crossing, drawn on load, with the arch springing from the near shore.
 *
 * A route adopts the masthead and the tape at the moment it is rebuilt, one at
 * a time (`ADR-0032-AMENDMENT-1` section 3). This one does so now, and it
 * therefore no longer renders `DeskShell`: two headers on one page is the
 * double-header defect a whole pull request was spent removing.
 *
 * ## Three rules govern what this page may say, and all three cost it something
 *
 * **No manufactured activity.** Every figure and every row comes from a real
 * read. When the board is empty the column says the board is empty.
 *
 * **No figure that could be read as a charge.** The activation fee and its
 * ceiling are owned by `/pricing`. Restating them here would put the same price
 * in two places, and two places eventually disagree.
 *
 * **Signals are never called opportunities.** The two record classes stay
 * separate in language and in treatment, which is why the column is headed "On
 * the board" and carries the unconfirmed caveat under it.
 */

export const dynamic = "force-dynamic";

/** How many the tape carries. Enough to move; all of them real. */
const TAPE_SIGNALS = 14;

/** How many the board column shows. Three, as the reference has it. */
const BOARD_ROWS = 3;

export async function generateMetadata({ params }: { params: { locale: Locale } }) {
  return {
    title: "Ponte Trade",
    description:
      "Ponte reads named public trade sources and publishes what they say. Separately, members submit requirements and offers that Ponte reviews before publication. The two are never mixed.",
    alternates: alternatesFor("/", params.locale),
  };
}

export default async function HomePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);

  // The tape needs records; the counts need the size of the whole table. Issued
  // together so the entrance costs one round trip, not two.
  const [board, sideCounts] = await Promise.all([
    readMarketSignals(TAPE_SIGNALS),
    signalSideCounts(),
  ]);
  const rows = board.state === "ok" ? board.signals : [];

  /*
    The tape's lines, from the real board.

    An empty board gives an empty tape, which renders as a bar with nothing
    running through it rather than as five invented corridors. That is the
    honest state and it is the one a first visit to an empty market should see.
  */
  const signals: Signal[] = rows.map((signal) => ({
    subject: signal.product,
    volume: [signal.quantity, signal.unit].filter(Boolean).join(" ") || "Quantity on request",
    corridor:
      [signal.originText, signal.destinationText].filter(Boolean).join(" to ") ||
      signal.incoterm ||
      "Corridor not stated",
  }));

  const recent: LandingSignal[] = rows.slice(0, BOARD_ROWS).map((signal) => ({
    reference: signal.canonicalId ?? signal.id.slice(0, 8).toUpperCase(),
    subject: signal.product,
    detail:
      [
        [signal.quantity, signal.unit].filter(Boolean).join(" "),
        signal.originText,
        signal.incoterm,
      ]
        .filter(Boolean)
        .join(" · ") || "Terms on request",
  }));

  return (
    <div className={bridgeFontVars}>
      <LandingEntrance
        signals={signals}
        recent={recent}
        counts={sideCounts ? { total: sideCounts.total, live: rows.length } : null}
      />
    </div>
  );
}
