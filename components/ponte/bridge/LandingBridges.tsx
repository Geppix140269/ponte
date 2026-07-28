"use client";

import { useState } from "react";
import BridgeRoute, { type BridgeStation } from "./BridgeRoute";

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
 * Every destination comes in as data from `marketEntrances()`, which derives
 * them from the canonical taxonomy. Nothing here builds a URL, so no route or
 * query behaviour can drift: this component cannot express a destination the
 * taxonomy does not already produce.
 *
 * ## Working without JavaScript
 *
 * The bridge is a selection, and a selection needs a client. But the grid it
 * replaces was nine plain server-rendered links, and losing eight of them when
 * a script fails would be a real loss of function dressed as a design change.
 *
 * So all three action bridges are rendered server-side and the unselected ones
 * are `hidden`. With JavaScript the member sees exactly one, revealed on
 * selection. Without it, the `<noscript>` rule below unhides all three and the
 * page falls back to what it does today: every family, every action, every
 * destination, as links. Nothing is duplicated to achieve that: it is the same
 * markup either way.
 *
 * The neutral opening state, with no family chosen and no actions shown, is the
 * approved one: the delivered package's own reference set includes
 * `desktop-1-family-neutral`.
 */

export interface LandingFamily {
  key: string;
  label: string;
  /** One line on what the family covers. Rendered under the station title. */
  scope: string;
  /** An approved Ponte Flow registry key from the taxonomy. */
  icon: BridgeStation["icon"];
  /** The family's actions, in the order the member should read them. */
  actions: { key: string; label: string; note: string; href: string }[];
}

export interface LandingBridgesProps {
  families: LandingFamily[];
}

export default function LandingBridges({ families }: LandingBridgesProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [visited, setVisited] = useState<string[]>([]);

  const stations: BridgeStation[] = families.map((family, index) => ({
    key: family.key,
    title: family.label,
    description: family.scope,
    index: String(index + 1).padStart(2, "0"),
    // Shown only while this family is the chosen one. It names what the gold
    // node means, so the state is carried by a word and not by colour alone.
    mark: "Selected",
    icon: family.icon,
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

      <BridgeRoute
        mode="select"
        ariaLabel="Choose a market family"
        stations={stations}
        selected={selected}
        visited={visited}
        onSelect={choose}
      />

      {families.map((family) => {
        const isOpen = family.key === selected;
        return (
          <section
            key={family.key}
            className={isOpen ? "brx brx--in" : "brx"}
            hidden={!isOpen}
            aria-label={`${family.label}: what you can do`}
          >
            <div className="brx__h">
              <b>{family.label}</b>
              <span>
                {family.actions.length} {family.actions.length === 1 ? "way in" : "ways in"}
              </span>
            </div>
            <p className="brx__q">Where would you like to start?</p>

            <BridgeRoute
              mode="navigate"
              ariaLabel={`${family.label} actions`}
              stations={family.actions.map((action, index) => ({
                key: action.key,
                title: action.label,
                description: action.note,
                index: String(index + 1).padStart(2, "0"),
                href: action.href,
              }))}
            />
          </section>
        );
      })}
    </div>
  );
}
