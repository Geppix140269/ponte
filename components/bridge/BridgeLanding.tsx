"use client";

import Arc from "./Arc";
import Chrome, { type Signal } from "./Chrome";
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
 * band head, the strap and the three columns are what fill the width the
 * headline does not.
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

const MARKETS = [
  ["01", "Products", "Goods crossing a border, by the shipment or the programme."],
  ["02", "Trade services", "Freight, inspection, customs, finance, insurance."],
  ["03", "Distribution", "Carrying a brand into a market, or finding someone to carry yours."],
];

/**
 * What Ponte checks, and what it does not.
 *
 * `ADR-0032` names Ponte Integrity as the most distinctive thing the product
 * has, and says it had been left in a doctrine document. The second half of
 * each pair is the half that matters: a list of what was checked, with no list
 * of what was not, reads as a guarantee about the counterparty and is not one.
 */
const INTEGRITY: [string, string][] = [
  ["Sanctions and prohibited goods", "Checked on every submission"],
  ["Fields complete and internally consistent", "Checked on every submission"],
  ["Duplicate listings", "Checked on every submission"],
  ["Who the counterparty is", "Not checked"],
  ["Whether the goods exist", "Not checked"],
  ["Whether a document says what it claims", "Not checked"],
];

export default function BridgeLanding({
  signals,
  recent,
  counts = null,
  who = null,
  onPublish,
  onFind,
}: BridgeLandingProps) {
  return (
    <div className="brg" data-screen="LANDING">
      <Grain />
      <Chrome signals={signals} who={who} />

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
              <p className="brg-note" style={{ marginBlockStart: 12 }}>
                {counts.total.toLocaleString("en")} records on the board,{" "}
                {counts.live.toLocaleString("en")} of them live.
              </p>
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

      <div className="brg-mx brg-cols">
        <div className="brg-col">
          <div className="brg-sechead">
            <span>On the board</span>
            <span>{String(recent.length).padStart(2, "0")}</span>
          </div>
          {recent.length > 0 ? (
            recent.map((signal) => (
              <button className="brg-item" type="button" key={signal.reference} onClick={onFind}>
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
          {MARKETS.map(([index, name, detail]) => (
            <div className="brg-row" key={index}>
              <span className="brg-row__label">
                <b className="brg-row__n">{name}</b>
                <small>{detail}</small>
              </span>
              <span className="brg-row__value">{index}</span>
            </div>
          ))}
        </div>

        <div className="brg-col">
          <div className="brg-sechead">
            <span>Ponte Integrity</span>
            <span>06</span>
          </div>
          {INTEGRITY.map(([subject, verdict]) => (
            <div className="brg-row" key={subject}>
              <span className="brg-row__label">{subject}</span>
              <span
                className="brg-row__value"
                data-state={verdict === "Not checked" ? "unproved" : "checked"}
              >
                {verdict}
              </span>
            </div>
          ))}
          <p className="brg-note" style={{ marginBlockStart: 16 }}>
            Publishing is free. Searching is free. Preparing a Deal Room is free. Activating one is
            the only thing Ponte charges for, and the fee and its ceiling are stated in full on the
            fees page before anything is owed.
          </p>
        </div>
      </div>
    </div>
  );
}
