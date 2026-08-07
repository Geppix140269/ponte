"use client";

import Arc from "./Arc";
import Chrome, { primaryNav, type Signal } from "./Chrome";
import Grain from "./Grain";

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
  /** What is being traded, in the member's own words. */
  subject: string;
  /** Quantity, corridor, terms. One line. */
  detail: string;
}

export interface BridgeLandingProps {
  /** The tape's live market signals. */
  signals: readonly Signal[];
  /** The board's most recent public records. Never invented. */
  recent: readonly LandingSignal[];
  /** The three counts under the eyebrow. Null where the board is unreadable. */
  counts?: { total: number; live: number } | null;
  who?: string | null;
  onPublish: () => void;
  onFind: () => void;
  /**
   * A board row, chosen by its own id. Opens that one Market Signal, never a
   * Qualified Opportunity: the two are a different record type, on purpose,
   * and this is the board's own detail page, not `/find/o/[ref]`.
   */
  onOpenSignal: (id: string) => void;
}

/**
 * The five stages of a crossing, named on the arch.
 *
 * The two ends are deliberately blank. A label at a springing point lands on
 * top of the shore block beneath it, which is exactly what happened: "INTENT"
 * printed over "THIS SHORE" at 2560. The shores name the ends in prose, in
 * better words than a 9px mono label could, so the arch names only what it
 * crosses.
 */
const STAGE_LABELS = ["", "Intent", "Words", "The facts", "Preview", ""];

/**
 * The three markets, each its own entrance into `/find`. `family` is the
 * canonical key `lib/taxonomy/market.ts` and the Find route both use, so a
 * click here lands already scoped rather than on the generic board.
 */
const MARKETS = [
  {
    family: "products",
    index: "01",
    name: "Products",
    detail: "Goods crossing a border, by the shipment or the programme.",
  },
  {
    family: "services",
    index: "02",
    name: "Trade services",
    detail: "Freight, inspection, customs, finance, insurance.",
  },
  {
    family: "distribution",
    index: "03",
    name: "Distribution",
    detail: "Carrying a brand into a market, or finding someone to carry yours.",
  },
] as const;

export default function BridgeLanding({
  signals,
  recent,
  counts = null,
  who = null,
  onPublish,
  onFind,
  onOpenSignal,
}: BridgeLandingProps) {
  return (
    <div className="brg" data-screen="LANDING">
      <Grain />
      <Chrome signals={signals} who={who} nav={primaryNav(who)} />

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
            <p className="brg-lede">
              Ponte reads the market, publishes your opportunity, and gives you a controlled room
              to close it in. Everything up to that room is free.
            </p>
            {counts && (
              <div className="brg-scale">
                <span className="brg-scale__n">{counts.total.toLocaleString("en")}</span>
                <span className="brg-scale__l">
                  records on the board
                  <br />
                  {counts.live.toLocaleString("en")} live and visible today
                </span>
              </div>
            )}
          </div>
        </div>

        {/*
          The crossing. Nothing on it is clickable, and nothing on it is a
          progress claim: a first-time visitor is not somewhere in a process
          they have not begun. It is the journey, drawn.
        */}
        <Arc size="hero" total={5} current={0} labels={STAGE_LABELS} traffic identity />

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

        <div className="brg-column" style={{ marginBlockStart: 26 }}>
          <button className="brg-act" type="button" onClick={onPublish}>
            Publish an opportunity
            <small>Three questions to start. No account needed until you publish.</small>
          </button>
          <button className="brg-snd" type="button" onClick={onFind}>
            Or see what is on the board
          </button>
        </div>
      </div>

      <div className="brg-mx brg-cols brg-cols--2">
        <div className="brg-col">
          <div className="brg-sechead">
            <span>On the board</span>
            <span>{String(recent.length).padStart(2, "0")}</span>
          </div>
          {recent.length > 0 ? (
            recent.map((signal) => (
              <button
                className="brg-item"
                type="button"
                key={signal.reference}
                onClick={() => onOpenSignal(signal.id)}
              >
                <span className="brg-item__r">{signal.reference}</span>
                <span className="brg-item__n">{signal.subject}</span>
                <span className="brg-item__f">{signal.detail}</span>
              </button>
            ))
          ) : (
            /*
              No manufactured activity. An empty board says it is empty. Three
              invented rows here would be the one lie a front door can tell that
              a visitor cannot check.
            */
            <p className="brg-note">
              Nothing is on the board right now. The first record published will appear here.
            </p>
          )}
          <p className="brg-note" style={{ marginBlockStart: 16 }}>
            Nothing here has been confirmed with the party named in it.
          </p>
        </div>

        <div className="brg-col">
          <div className="brg-sechead">
            <span>Three markets</span>
            <span>03</span>
          </div>
          {MARKETS.map((market) => (
            <a
              className="brg-row brg-row--link"
              href={`/find?family=${market.family}`}
              key={market.family}
            >
              <span className="brg-row__label">
                <b className="brg-row__n">{market.name}</b>
                <small>{market.detail}</small>
              </span>
              <span className="brg-row__value">{market.index}</span>
            </a>
          ))}
        </div>
      </div>

      <footer className="brg-mx brg-footer">
        Ponte Trade is operated by 1402 Celsius Ltd. Checks shown are the checks performed, and are
        never a guarantee about a counterparty.
      </footer>
    </div>
  );
}
