"use client";

import { useState } from "react";
import BridgeShell from "./BridgeShell";
import type { Signal } from "../Chrome";
import { recordLines } from "@/lib/publish/record";
import {
  PRESENTED_CHOICES,
  POSITION_OPTIONS,
  resolveIntent,
  type Direction,
  type Position,
} from "@/lib/structure/intent-choice";
import { SAVED_ANONYMOUS, SAVED_SIGNED_IN } from "@/lib/publish/retention";
import type { MarketFamily, MarketIntent } from "@/lib/taxonomy/market";

/**
 * `B01` Choose Deal Intent, on the bridge system.
 *
 * ## Which file governs what
 *
 * `ADR-0032-AMENDMENT-1` section 7, and it is the rule that matters most here:
 *
 *   **The prototype is the authority for how it looks. It is never the
 *   authority for what it stores, what it validates, or what it routes.**
 *
 * So `ponte-platform.html` governs the ink ground, the type, the arc, the tape,
 * the zone behaviour and the cream ledger. `lib/structure/intent-choice.ts`
 * governs the six presented choices and the seven stored `market_intent`
 * values, and this surface owns neither. The prototype's own publish view holds
 * two identical placeholder questions and jumps to the home screen after four
 * answers; building to it literally would drop
 * `seek_brands_or_products_to_represent` for the third time. That section of the
 * prototype now carries a comment saying so: `ADR-0032-AMENDMENT-2` entry 3.
 *
 * ## The correction to Set 2, still standing
 *
 * Set 2's position state offers four options that encode direction and position
 * together and resolve to only two stored values. Distributor and agent are
 * partner TYPES and belong later, in `distribution_partner_type_key`. `B01`
 * asks direction, family and position, and nothing else.
 *
 * ## The arc
 *
 * The deck draws as the member answers, and it is the only progress indicator:
 * no numeral in a progress role anywhere on the screen. Nothing on it is
 * clickable. `ADR-0032-AMENDMENT-1` section 1.
 */

const FAMILY_LABEL: Record<MarketFamily, string> = {
  products: "A product",
  services: "A trade service",
  distribution: "Distribution or representation",
};

/** One line of consequence per family, per direction. Never a restatement. */
const FAMILY_DETAIL: Record<MarketFamily, Record<Direction, string>> = {
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

type Phase = "direction" | "family" | "position";

interface Zone {
  key: string;
  title: string;
  detail: string;
}

export interface BridgeIntentProps {
  onResolved: (resolved: { intent: MarketIntent; family: MarketFamily }) => void;
  signedIn?: boolean;
  signals: readonly Signal[];
  who?: string | null;
}

export default function BridgeIntent({
  onResolved,
  signedIn = false,
  signals,
  who = null,
}: BridgeIntentProps) {
  const [phase, setPhase] = useState<Phase>("direction");
  const [direction, setDirection] = useState<Direction | null>(null);
  const [family, setFamily] = useState<MarketFamily | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);

  const answered = phase === "direction" ? 0 : phase === "family" ? 1 : 2;

  function zones(): Zone[] {
    if (phase === "direction") {
      return [
        {
          key: "need",
          title: "I need something",
          detail: "You are buying, sourcing or looking for a partner",
        },
        {
          key: "offer",
          title: "I am offering something",
          detail: "You supply, provide a service, or represent others",
        },
      ];
    }
    if (phase === "family" && direction) {
      // From the pinned list, filtered by the direction just answered. The
      // surface never assembles a set of families of its own.
      return PRESENTED_CHOICES.filter((choice) => choice.direction === direction).map((choice) => ({
        key: choice.family,
        title: FAMILY_LABEL[choice.family],
        detail: FAMILY_DETAIL[choice.family][direction],
      }));
    }
    return POSITION_OPTIONS.map((option) => ({
      key: option.key,
      title: option.label,
      detail: option.detail,
    }));
  }

  /*
    A press indents the chosen row, slides the alternatives out, and lets the
    next question rise into the space. One movement, then the state changes:
    that overlap is what makes it a passage rather than a page swap.
  */
  function choose(key: string) {
    if (chosen !== null) return;
    setChosen(key);
    window.setTimeout(() => commit(key), 420);
  }

  function commit(key: string) {
    setChosen(null);

    if (phase === "direction") {
      setDirection(key as Direction);
      setFamily(null);
      setPhase("family");
      return;
    }

    if (phase === "family") {
      if (!direction) return;
      const picked = key as MarketFamily;
      const resolution = resolveIntent(picked, direction, null);
      setFamily(picked);
      // The RESOLVER decides whether position is still open. A
      // `family === "distribution"` test here would ask on the offer side too,
      // where the answer is already known, and collect a value nothing reads.
      if (resolution.outcome === "needs_position") {
        setPhase("position");
        return;
      }
      onResolved({ intent: resolution.intent, family: resolution.family });
      return;
    }

    if (!direction || !family) return;
    const resolution = resolveIntent(family, direction, key as Position);
    if (resolution.outcome === "resolved") {
      onResolved({ intent: resolution.intent, family: resolution.family });
    }
  }

  /** Back never loses work: it drops exactly the answer it returns to. */
  function back() {
    if (phase === "position") {
      setPhase("family");
      setFamily(null);
      return;
    }
    if (phase === "family") {
      setPhase("direction");
      setDirection(null);
      setFamily(null);
    }
  }

  const question =
    phase === "direction"
      ? "What's your deal?"
      : phase === "family"
        ? direction === "offer"
          ? "What are you offering?"
          : "What are you looking for?"
        : "Which side are you on?";

  /*
    The italic accent, per ADR-0032 and now ADR-0032-AMENDMENT-2 entry 1. A
    separate value rather than an <em> interpolated into a translated string:
    markup inside copy cannot place an accent correctly in a script with
    different word order.
  */
  const accent =
    phase === "direction"
      ? "your deal?"
      : phase === "family"
        ? direction === "offer"
          ? "offering?"
          : "looking for?"
        : "are you on?";

  return (
    <BridgeShell
      screen="B01"
      phase={phase}
      node="intent"
      family={family}
      signedIn={signedIn}
      progress={answered / 3}
      question={question}
      accent={accent}
      eyebrow="Your opportunity"
      note={
        phase === "position"
          ? "This one is required. Without it, two listings that are each other's counterparty look identical to two that are peers."
          : "Publishing is free, and nothing is public until you say so."
      }
      back={phase === "direction" ? null : { label: "Back", onBack: back }}
      ledger={recordLines({ direction, family, intent: null })}
      retention={signedIn ? SAVED_SIGNED_IN : SAVED_ANONYMOUS}
      signals={signals}
      who={who}
    >
      {zones().map((zone, index) => (
        <button
          className="brg-zone"
          type="button"
          key={`${phase}-${zone.key}`}
          data-chosen={chosen === zone.key ? "true" : undefined}
          data-leaving={chosen !== null && chosen !== zone.key ? "true" : undefined}
          onClick={() => choose(zone.key)}
        >
          <span className="brg-zone__index">{String(index + 1).padStart(2, "0")}</span>
          <span className="brg-zone__title">{zone.title}</span>
          <span className="brg-zone__detail">{zone.detail}</span>
        </button>
      ))}
    </BridgeShell>
  );
}
