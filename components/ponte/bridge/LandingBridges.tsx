"use client";

import { useState } from "react";
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
 * from the chosen family to the **Structured journey**.
 *
 * ## Working without JavaScript
 *
 * The bridge is a selection, and a selection needs a client. But the grid it
 * replaces was nine plain server-rendered links, and losing eight of them when a
 * script fails would be a real loss of function dressed as a design change.
 *
 * So all three action bridges are rendered server-side and the unselected ones
 * are `hidden`. With JavaScript the member sees exactly one, revealed on
 * selection. Without it, the `<noscript>` rule below unhides all three and the
 * page falls back to what it does today: every family, every action, every
 * destination, as links. It is the same markup either way.
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
    <div className="pbridge">
      {/* The rule that makes the no-JS fallback work. Scoped to this block, and
          inert whenever scripting is on. */}
      <noscript>
        <style>{`.pbridge .brx[hidden]{display:block!important}`}</style>
      </noscript>

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
