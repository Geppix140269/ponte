"use client";

import BridgeRoute, { type BridgeStation } from "@/components/ponte/bridge/BridgeRoute";
import { Link } from "@/i18n/navigation";

/**
 * What a first-time visitor sees when they press "Open a Deal Room".
 *
 * ## What this replaced
 *
 * A signed-out visitor with no records got the same screen a member with three
 * gets: the heading "Take this Deal forward", a definition of a Deal Room, a
 * band inviting them to start something new, and an empty state saying almost
 * exactly the same thing again. The owner walked it not signed in:
 *
 *   > This screen is really bad ... 99% of that screen is text. I don't want
 *   > to see text ... Invite me to try. Use the language that we've been
 *   > inviting with. CTA as we use in the other screens.
 *
 * Every criticism is accurate. It said "Take this Deal forward" to somebody
 * with no Deal. It defined the product instead of offering it. It stated the
 * same route twice, in two bands, in utility language. And it had no control
 * that looked like a control.
 *
 * ## What this is
 *
 * The crossing, and one thing to press.
 *
 * The Bridge is the product's own invitation primitive and it is used here for
 * the same reason it is used on the entrance: it draws the route rather than
 * describing it. Three stations, each a real link, so the whole path is visible
 * and every step of it is reachable without a script.
 *
 * The words are the ones the entrance already uses. "Bring a requirement or
 * offer to the desk" is what the Desk calls it everywhere else; "You have not
 * brought a requirement or an offer to the desk yet" was that sentence turned
 * into a deficiency.
 *
 * Nothing here is a box. Nothing here quotes a price: this is the free half of
 * the crescendo (ADR-0028), and the only figure a visitor meets is on the
 * activation screen, which is four steps away.
 */
export default function OpenYourFirstRoom({ locale }: { locale: string }) {
  const stations: BridgeStation[] = [
    {
      key: "describe",
      title: "Describe it",
      description: "What you sell, need, or can carry. In your own words.",
      index: "01 · Free",
      href: "/structure",
    },
    {
      key: "publish",
      title: "Publish it",
      description: "It goes live once it carries the facts a counterparty can act on.",
      index: "02 · Free",
      href: "/structure",
    },
    {
      key: "room",
      title: "Open the room",
      description: "A protected workspace, in five languages, for one deal.",
      index: "03 · When you decide",
      href: "/deal-rooms/inside",
    },
  ];

  return (
    <div className="ofr">
      <div className="ofr__h">
        <h1>Start with what you trade.</h1>
        <p>A Deal Room is built around one opportunity, so there is one thing to do first.</p>
      </div>

      {/*
        `navigate` mode: every station is a real link. A visitor whose script
        never arrives still reads the route and can still take it, which is the
        property the landing had to learn the hard way on 31 July 2026.
      */}
      <BridgeRoute
        mode="navigate"
        ariaLabel="How a Deal Room begins"
        stations={stations}
        left="You"
        right="Your Deal Room"
        rightDashed
      />

      <div className="ofr__cta">
        <Link className="b b--lg" href="/structure">
          Describe what you trade
        </Link>
        <Link className="b b--2 b--lg" href="/deal-rooms/inside">
          See inside a Deal Room
        </Link>
      </div>

      <p className="ofr__f">
        No account needed to start. Nothing is published, and nothing is charged, until you say so.
      </p>
    </div>
  );
}
