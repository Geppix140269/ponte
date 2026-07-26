"use client";

import { useState } from "react";
import type { BridgeRoute } from "@/lib/landing/bridge";

/**
 * The gateway flow (North Star entry architecture, section 5.1).
 *
 * This replaces the drawn arch. The arch was a large solid black image that
 * carried the fold, dominated a page whose voice is otherwise editorial and
 * light, and said nothing the two labels did not already say. What the entrance
 * has to communicate is movement between two points, so that is what is drawn:
 * a hairline rail between the two routes with a marker at each end, and a dot
 * travelling from "Explore the market" to "Start a deal".
 *
 * The two routes ARE the flow's two points: each label sits at its own end,
 * carrying the number, the name and the line that says what it opens.
 *
 * The labels are the accessible controls: real <button> elements, keyboard
 * operable, with a text label and supporting text, never colour alone. The SVG
 * is decorative (aria-hidden); its markers are a mouse convenience that mirror
 * the labels and light with them. The travelling dot is decoration only, and
 * stops entirely under prefers-reduced-motion.
 *
 * A route is an entrance, not a filter: both the marker and the button call
 * `onOpen`, which leaves the landing page at once. The flow knows nothing about
 * destinations or feature flags; the page it belongs to owns all of that.
 */

export interface FlowCaption {
  /** The small line above the rail. */
  eyebrow: string;
  /** The small line below it, saying what a click does. */
  hint: string;
}

export interface FlowRouteLabels {
  /** "Explore the market" / "Start a deal". */
  title: string;
  /** The one line that says what the route opens. */
  support: string;
}

/** Rail geometry, in the SVG's own user units (viewBox 0 0 320 44). */
const RAIL = { y: 22, from: 18, to: 302 } as const;

const ORDER: { key: BridgeRoute; num: string; cx: number }[] = [
  { key: "explore", num: "01", cx: RAIL.from },
  { key: "deal", num: "02", cx: RAIL.to },
];

export default function PonteFlow({
  caption,
  labels,
  onOpen,
}: {
  caption: FlowCaption;
  labels: Record<BridgeRoute, FlowRouteLabels>;
  /** Open the route: a deliberate click is the whole decision. */
  onOpen: (key: BridgeRoute) => void;
}) {
  const [hovered, setHovered] = useState<BridgeRoute | null>(null);

  const label = (key: BridgeRoute, num: string) => (
    <button
      type="button"
      className={`rlabel rlabel--${key}${hovered === key ? " hot" : ""}`}
      data-num={num}
      onClick={() => onOpen(key)}
      onMouseEnter={() => setHovered(key)}
      onMouseLeave={() => setHovered(null)}
      onFocus={() => setHovered(key)}
      onBlur={() => setHovered(null)}
    >
      <span className="rlabel__n" aria-hidden="true">
        {num}
      </span>
      <span className="rlabel__b">
        <span className="rlabel__t serif">{labels[key].title}</span>
        <span className="rlabel__d">{labels[key].support}</span>
      </span>
    </button>
  );

  return (
    <div className="flow">
      {label("explore", "01")}

      <div className="flow__stage">
        <p className="flow__eb">{caption.eyebrow}</p>

        <svg className="flow__svg" viewBox="0 0 320 44" aria-hidden="true" focusable="false">
          <line
            className="f-rail"
            x1={RAIL.from}
            y1={RAIL.y}
            x2={RAIL.to}
            y2={RAIL.y}
          />
          {/* The travelling dot. Decoration: it carries no state and is never
              the thing a visitor has to wait for. */}
          <circle className="f-run" cx={RAIL.from + 14} cy={RAIL.y} r="4" />
          {ORDER.map(({ key, num, cx }) => (
            <g
              key={key}
              onClick={() => onOpen(key)}
              onMouseEnter={() => setHovered(key)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
            >
              <circle
                className={"f-dot" + (hovered === key ? " hot" : "")}
                cx={cx}
                cy={RAIL.y}
                r="13"
              />
              <text className="f-dotn" x={cx} y={RAIL.y}>
                {num}
              </text>
            </g>
          ))}
        </svg>

        <p className="flow__hint">{caption.hint}</p>
      </div>

      {label("deal", "02")}
    </div>
  );
}
