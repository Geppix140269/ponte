"use client";

import { useLayoutEffect, useRef, useState } from "react";
import BridgeRoute, { type BridgeStation } from "./BridgeRoute";
import { FAMILY_BRIDGE_ABUTMENTS, STRUCTURED_JOURNEY } from "@/lib/landing/families";

/**
 * The landing's Family Bridge and the Action Bridge it reveals.
 *
 * This replaces the temporary three-column family/action card grid, which is
 * exactly and only what the Bridge implementation notes section 5 authorises:
 *
 * > Replace the boxed three-column family/action section with the approved
 * > Family Bridge and revealed Action Bridge. Preserve every existing action
 * > destination.
 *
 * The composition follows the approved reference renders now in
 * `design/authority/bridge/v1/reference/`: a heading, the family bridge crossing
 * from **Intent** to **The market**, and on selection an Action Bridge crossing
 * from the chosen family to the **Private Deal Room**.
 *
 * ## Working without a client
 *
 * The bridge is a selection, and a selection needs a client. But the grid it
 * replaces was nine plain server-rendered links, and losing eight of them when a
 * script fails would be a real loss of function dressed as a design change.
 *
 * So all three action bridges are rendered server-side and every destination is
 * a real link in the document. Which of them a member SEES is decided by
 * `data-live`, set on this block by the layout effect below: until the client
 * announces itself, `bridge-integration.css` shows all three, and afterwards
 * `hidden` is honoured and exactly one is revealed on selection. It is the same
 * markup either way.
 *
 * This replaces a `<noscript>` rule that did the same thing, and it replaces it
 * because that rule answered the wrong question. `<noscript>` fires when
 * scripting is DISABLED. On 31 July 2026 the landing was served with scripting
 * enabled and its client chunks missing: the rule stayed inert, React never
 * hydrated, and all eight destinations sat in the document unreachable behind
 * `hidden`. Nobody could have clicked them and nothing said so.
 *
 * `data-live` covers both, because it asks the question that actually matters -
 * has the client taken over? - rather than a proxy for it. Scripting disabled
 * is one way for the answer to be no; a bundle that never arrived is another,
 * and it is the more common one.
 *
 * The neutral opening state, with no family chosen and no actions shown, is the
 * approved one: `reference/desktop-1-family-neutral.png`.
 */

export interface LandingFamily {
  key: string;
  label: string;
  /** What the family covers. Approved reference copy. */
  scope: string;
  /** The abutment the family's Action Bridge starts from. */
  abutment: string;
  /** Why this family has the number of actions it has, where that needs saying. */
  countNote: string | null;
  actions: { key: string; label: string; note: string; href: string }[];
}

export interface LandingBridgesProps {
  families: LandingFamily[];
}

/** How many actions a family has, in the reference's own words. */
const COUNT_WORD = ["no", "one", "two", "three", "four", "five"] as const;

export default function LandingBridges({ families }: LandingBridgesProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [visited, setVisited] = useState<string[]>([]);
  const blockRef = useRef<HTMLDivElement | null>(null);

  /*
    The client announcing that it is here and in charge of the reveal.

    Until this runs, `bridge-integration.css` shows every action bridge, so all
    eight destinations are on the page as links. Once it runs, `hidden` is
    honoured again and the member sees exactly one, revealed by selection.

    `useLayoutEffect`, so the collapse happens before the browser paints: with
    `useEffect` a working client would flash all three action bridges and then
    drop two of them, which is a worse first frame than the one this fixes.

    Written to the DOM rather than held in state for the same reason DS-10's
    `data-measured` is: it has to land inside this layout effect, not in a
    render that React may schedule after the paint.
  */
  useLayoutEffect(() => {
    const block = blockRef.current;
    if (!block) return;
    block.setAttribute("data-live", "");
    return () => block.removeAttribute("data-live");
  }, []);

  const chosen = families.find((f) => f.key === selected) ?? null;

  const stations: BridgeStation[] = families.map((family, index) => ({
    key: family.key,
    title: family.label,
    description: family.scope,
    index: `${String(index + 1).padStart(2, "0")} · Market family`,
    // Named in a word, so the chosen route is not carried by gold alone.
    mark: "Selected route",
  }));

  function choose(key: string) {
    setSelected(key);
    setVisited((seen) => (seen.includes(key) ? seen : [...seen, key]));
  }

  return (
    <div className="pbridge" ref={blockRef}>
      <div className="bhead">
        <h2>Three routes across.</h2>
        <span>{chosen ? `${chosen.label} selected` : "No route selected"}</span>
      </div>

      <BridgeRoute
        mode="select"
        ariaLabel="Choose a market family"
        stations={stations}
        selected={selected}
        visited={visited}
        onSelect={choose}
        left={FAMILY_BRIDGE_ABUTMENTS.left}
        right={FAMILY_BRIDGE_ABUTMENTS.right}
      />

      {families.map((family) => {
        const isOpen = family.key === selected;
        const count = COUNT_WORD[family.actions.length] ?? String(family.actions.length);
        return (
          <section
            key={family.key}
            className={isOpen ? "brx brx--in" : "brx"}
            hidden={!isOpen}
            aria-label={`${family.label}: what you can do`}
          >
            <div className="brx__h">
              <b>Your commercial intention</b>
              <span>{count} actions in this family</span>
            </div>
            <p className="brx__q">What do you want to do in {family.label.toLowerCase()}?</p>

            {/* The count note is passed into the bridge, not placed after it:
                the approved stylesheet right-aligns `.br > .brx__empty` below
                the stage, and station blocks vary in height, so it can never be
                positioned at a guessed offset. */}
            <BridgeRoute
              mode="navigate"
              ariaLabel="Choose a commercial action"
              left={family.abutment}
              right={STRUCTURED_JOURNEY}
              rightDashed
              countNote={family.countNote}
              stations={family.actions.map((action, index) => ({
                key: action.key,
                title: action.label,
                description: action.note,
                index: `${String(index + 1).padStart(2, "0")} · Action`,
                mark: "Selected action",
                href: action.href,
              }))}
            />
          </section>
        );
      })}
    </div>
  );
}
