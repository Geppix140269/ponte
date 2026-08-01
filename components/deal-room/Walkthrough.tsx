"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import BridgeRoute, { type BridgeStation } from "@/components/ponte/bridge/BridgeRoute";
import { WALKTHROUGH } from "@/lib/deal-room/walkthrough";
import DraftRoom from "./DraftRoom";

/**
 * The Deal Room, stepped through from nothing to a signature somewhere else.
 *
 * ## Why the crossing is the carousel
 *
 * The owner asked for a carousel. This is one, and it is built on `PB.route`
 * rather than on a new control, for three reasons that are not aesthetic:
 *
 *   The Bridge already IS a progression. Six stages on a deck with a runner
 *   travelling between them is exactly what a carousel of a journey wants to
 *   be, and the approved package draws it.
 *
 *   It works without a client. Every stage is rendered; the selection decides
 *   which is shown. A visitor whose script never arrives reads all six in
 *   order rather than one frame and two arrows that do nothing. The landing
 *   learned this the hard way on 31 July 2026.
 *
 *   It is keyboard-operable for free. Arrow keys traverse, one tab stop,
 *   roving tabindex, because `BridgeRoute` implements the radiogroup the
 *   Bridge notes require. A hand-rolled carousel would have had to earn that
 *   again and would probably not have.
 *
 * ## No screenshots
 *
 * A picture of the product goes stale the first time the product changes, and
 * a walkthrough that shows a room the product no longer builds is worse than
 * no walkthrough. Every stage is drawn from the same tokens and the same
 * components as the room itself, so it cannot drift.
 */
export default function Walkthrough({ ctaHref }: { ctaHref: string }) {
  const [active, setActive] = useState<string>(WALKTHROUGH[0].key);
  const [visited, setVisited] = useState<string[]>([WALKTHROUGH[0].key]);

  const stations: BridgeStation[] = WALKTHROUGH.map((stage, index) => ({
    key: stage.key,
    title: stage.title,
    description: stage.summary,
    index: `${String(index + 1).padStart(2, "0")} · Stage`,
    mark: "You are here",
  }));

  function choose(key: string) {
    setActive(key);
    setVisited((seen) => (seen.includes(key) ? seen : [...seen, key]));
  }

  const position = WALKTHROUGH.findIndex((stage) => stage.key === active);

  return (
    <div className="dwt">
      <BridgeRoute
        mode="select"
        ariaLabel="Choose a stage of the deal"
        stations={stations}
        selected={active}
        visited={visited}
        onSelect={choose}
        left="A deal you want"
        right="Signed, elsewhere"
        rightDashed
        // Six stations crowd their labels long before the viewport gets narrow:
        // at this count the desktop deck runs adjacent titles together. The
        // elevation is the same approved drawing, chosen by the station count.
        alwaysVertical
      />

      {/*
        Every stage is in the document. `hidden` is honoured once the client is
        in charge, and until then all six read in order as a plain article,
        which is the readable state rather than a broken one.
      */}
      {WALKTHROUGH.map((stage, index) => (
        <section
          key={stage.key}
          className={stage.key === active ? "dwt__st dwt__st--in" : "dwt__st"}
          hidden={stage.key !== active}
          aria-label={`Stage ${index + 1}: ${stage.title}`}
        >
          <div className="dwt__h">
            <span className="dwt__n">
              {String(index + 1).padStart(2, "0")} of {String(WALKTHROUGH.length).padStart(2, "0")}
            </span>
            <h3>{stage.title}</h3>
          </div>

          <p className="dwt__b">{stage.body}</p>

          <ul className="dwt__f">
            {stage.facts.map((fact) => (
              <li key={fact.label}>
                <span className="dwt__k">{fact.label}</span>
                <span className="dwt__v">{fact.value}</span>
              </li>
            ))}
          </ul>

          {/*
            Price at every stage, because the question a reader carries all the
            way through this is "when does this start costing me". Four of the
            seven stages answer "it does not", which is the point: the owner's
            model is a crescendo, and a reader who cannot see where the free
            part ends will assume it ends sooner than it does.

            The one paid stage is marked, so it is findable at a glance rather
            than only by reading all seven.
          */}
          <p className={stage.paid ? "dwt__p dwt__p--paid" : "dwt__p"}>{stage.price}</p>

          {/*
            The stage that SHOWS rather than describes.

            The owner reached this page and said: "There's nothing in some deal
            room, is it? Just the process. This is what you do." He was right.
            A walkthrough of a room that never shows the room is a table of
            contents.

            Screen 1 of `Ponte Deal Room - Four New Screens v1.html` is drawn
            here, at the stage it belongs to. The example marker comes before
            it in reading order, because Constitution section 5 forbids
            manufactured activity and a room presented as somebody's real one
            would be exactly that.

            The other three screens - activation, the counterparty preview and
            the request-to-join inbox - land at their own stages as they are
            built.
          */}
          {stage.key === "build" ? (
            <figure className="dwt__shot">
              <figcaption>An example room, in preparation. Not a live deal, and not anybody's data.</figcaption>
              <DraftRoom idPrefix="wt-draft" />
            </figure>
          ) : null}
        </section>
      ))}

      <div className="dwt__nav">
        <button
          type="button"
          className="b b--2"
          onClick={() => choose(WALKTHROUGH[Math.max(0, position - 1)].key)}
          disabled={position === 0}
        >
          Previous stage
        </button>
        {position < WALKTHROUGH.length - 1 ? (
          <button
            type="button"
            className="b"
            onClick={() => choose(WALKTHROUGH[position + 1].key)}
          >
            Next stage
          </button>
        ) : (
          <Link className="b" href={ctaHref}>
            Open a Deal Room
          </Link>
        )}
      </div>
    </div>
  );
}
