"use client";

import { useState, useTransition } from "react";
import {
  PRESENTED_CHOICES,
  POSITION_OPTIONS,
  resolveIntent,
  type Direction,
  type Position,
} from "@/lib/structure/intent-choice";
import type { MarketFamily, MarketIntent } from "@/lib/taxonomy/market";

/**
 * `B01` Choose Deal Intent.
 *
 * Specification: `docs/ponte/design-reference/ponte-set2-screens.js`, surface 1,
 * six states. Structure, tokens, state coverage and copy taken from there; the
 * delivery is rewritten for the app.
 *
 * ## What this replaces
 *
 * The live `/structure` intent screen offers **three** options, because family
 * and direction were collapsed into one list and position was lost entirely.
 * `DECISION-17` requires six. The mapping to the database's seven stored values
 * lives in `lib/structure/intent-choice.ts` and is pinned by test.
 *
 * ## One correction to the design reference, confirmed by the owner
 *
 * Set 2's `position` state offers four options - seeking a distributor,
 * offering to distribute, seeking an agent, offering to represent. Those encode
 * direction and position together and resolve to only **two** stored values, so
 * `seek_brands_or_products_to_represent` is unreachable from that screen.
 *
 * **"Distributor" and "agent" are partner TYPES, not directions.** They belong
 * later in the path, in `distribution_partner_type_key`. `B01` asks direction
 * and position, and nothing else. Set 2's revision is logged for Design.
 *
 * ## Why the position question is asked here and not later
 *
 * Because it decides what is STORED, and every later screen reads it. A
 * principal seeking a distributor and a distributor seeking brands are each
 * other's counterparty; if the two are stored identically the board matches
 * principals against principals.
 */

type Phase = "direction" | "family" | "position";

/** The six choice rows, split by direction once the member has said which. */
function choicesFor(direction: Direction) {
  return PRESENTED_CHOICES.filter((choice) => choice.direction === direction);
}

/** Family rows carry a description; the reference's copy, verbatim. */
const FAMILY_DETAIL: Record<MarketFamily, { offer: string; need: string }> = {
  products: {
    offer: "Goods you supply, in any quantity",
    need: "Goods you are buying or sourcing",
  },
  services: {
    offer: "Inspection, finance, logistics, certification, legal",
    need: "Inspection, finance, logistics, certification, legal",
  },
  distribution: {
    offer: "Acting for someone else in your market",
    need: "Someone to act for you, or goods to act for",
  },
};

const FAMILY_LABEL: Record<MarketFamily, string> = {
  products: "A product",
  services: "A trade service",
  distribution: "Distribution or representation",
};

export interface ChooseDealIntentProps {
  /** Called once family, direction and any position resolve to a stored value. */
  onResolved: (resolved: { intent: MarketIntent; family: MarketFamily }) => void;
  /**
   * The member's previous choice, if they have published before.
   *
   * Shown as a SUGGESTION to confirm, never pre-selected. `ADR-0023`: members
   * choose, they do not have a choice made for them and then have to undo it.
   */
  lastTime?: { label: string; family: MarketFamily; direction: Direction } | null;
  /** Signed in? Only the retention sentence differs. */
  signedIn?: boolean;
}

/**
 * Retention copy, verbatim from the brief. Not paraphrased, not shortened:
 * it is a promise about where a member's work lives and for how long.
 */
const SAVED_ANONYMOUS =
  "Saved only in this browser for up to 7 days. Sign in to keep it longer and continue on another device.";
const SAVED_SIGNED_IN = "Saved to your account. Kept for 90 days from your last edit.";

export default function ChooseDealIntent({ onResolved, lastTime, signedIn = false }: ChooseDealIntentProps) {
  const [phase, setPhase] = useState<Phase>("direction");
  const [direction, setDirection] = useState<Direction | null>(null);
  const [family, setFamily] = useState<MarketFamily | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  /*
    The pending flag exists for one reason: every tap must be acknowledged
    inside 100ms. P0-1 measured the old funnel CTA at 2,638ms of silence before
    anything moved. A transition gives the acknowledgement somewhere to live
    even when the next surface is not instant.
  */
  const [pending, startTransition] = useTransition();

  const steps = 5;
  const step = phase === "direction" ? 1 : phase === "family" ? 1 : 1;

  function chooseDirection(next: Direction) {
    startTransition(() => {
      setDirection(next);
      setFamily(null);
      setPosition(null);
      setPhase("family");
    });
  }

  function chooseFamily(next: MarketFamily) {
    if (!direction) return;
    const resolution = resolveIntent(next, direction, null);
    startTransition(() => {
      setFamily(next);
      if (resolution.outcome === "needs_position") {
        setPhase("position");
        return;
      }
      onResolved({ intent: resolution.intent, family: resolution.family });
    });
  }

  function choosePosition(next: Position) {
    if (!direction || !family) return;
    const resolution = resolveIntent(family, direction, next);
    startTransition(() => {
      setPosition(next);
      if (resolution.outcome === "resolved") {
        onResolved({ intent: resolution.intent, family: resolution.family });
      }
    });
  }

  function back() {
    startTransition(() => {
      if (phase === "position") {
        setPosition(null);
        setPhase("family");
        return;
      }
      if (phase === "family") {
        setFamily(null);
        setPhase("direction");
      }
    });
  }

  const retention = signedIn ? SAVED_SIGNED_IN : SAVED_ANONYMOUS;

  return (
    <div className="pb" data-screen="B01" data-phase={phase}>
      <div className="pb__prog" role="img" aria-label={`Step ${step} of ${steps}`}>
        {Array.from({ length: steps }, (_, i) => (
          <i key={i} {...(i < step ? { "data-on": "" } : {})} />
        ))}
      </div>

      <div className="pb__nav">
        {phase === "direction" ? (
          <span className="lab">Ponte</span>
        ) : (
          <button className="pb__back" type="button" onClick={back}>
            <u>&#8249;</u>
            {phase === "position" ? "Family" : "Direction"}
          </button>
        )}
        <span className="step">
          {pending ? <span className="pending">Opening</span> : `Step ${step} of ${steps}`}
        </span>
      </div>

      <div className="pb__c">
        {phase === "direction" && (
          <>
            {lastTime && (
              <div className="sug">
                <span className="lab">Last time</span>
                <b>{lastTime.label}</b>
                <p>Ponte remembers, but it will not choose for you. Confirm it or pick something else.</p>
              </div>
            )}
            <div className="pb__pad" style={{ paddingBottom: 18 }}>
              <h1 className="stmt stmt--2">What are you here to do?</h1>
            </div>
            <div className="dir">
              <button type="button" onClick={() => chooseDirection("need")}>
                <span>
                  <b>I need something</b>
                  <small>You are buying, sourcing or looking for a partner</small>
                </span>
                <span className="mk" />
              </button>
              <button type="button" onClick={() => chooseDirection("offer")}>
                <span>
                  <b>I am offering something</b>
                  <small>You supply, provide a service, or represent others</small>
                </span>
                <span className="mk" />
              </button>
            </div>
          </>
        )}

        {phase === "family" && direction && (
          <>
            <div className="pb__pad" style={{ paddingBottom: 14 }}>
              <span className="lab">
                {direction === "offer" ? "You are offering something" : "You need something"}
              </span>
              <h1 className="stmt stmt--2" style={{ marginTop: 12 }}>
                {direction === "offer" ? "What are you offering?" : "What are you looking for?"}
              </h1>
            </div>
            <div className="rows">
              {choicesFor(direction).map((choice) => (
                <button
                  key={choice.key}
                  className="row"
                  type="button"
                  aria-pressed={family === choice.family}
                  onClick={() => chooseFamily(choice.family)}
                >
                  <span className={`mk${family === choice.family ? " mk--done" : ""}`} />
                  <span>
                    <b>{FAMILY_LABEL[choice.family]}</b>
                    <small>{FAMILY_DETAIL[choice.family][direction]}</small>
                  </span>
                  <span className="go">{family === choice.family ? "" : "›"}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {phase === "position" && (
          <>
            <div className="pb__pad" style={{ paddingBottom: 12 }}>
              <span className="lab">Distribution and representation</span>
              <h1 className="stmt stmt--2" style={{ marginTop: 12 }}>
                Which side of the arrangement are you on?
              </h1>
            </div>
            <div className="pb__pad" style={{ padding: "0 20px 14px" }}>
              <p className="prose">
                This one is required. Without it, two listings that are each other&rsquo;s counterparty look
                identical to two that are peers.
              </p>
            </div>
            <div className="rows">
              {POSITION_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  className="row"
                  type="button"
                  aria-pressed={position === option.key}
                  onClick={() => choosePosition(option.key)}
                >
                  <span className={`mk${position === option.key ? " mk--done" : ""}`} />
                  <span>
                    <b>{option.label}</b>
                    <small>{option.detail}</small>
                  </span>
                  <span className="go">{position === option.key ? "" : "›"}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="pb__f">
        <p className="note">{retention}</p>
      </div>
    </div>
  );
}
