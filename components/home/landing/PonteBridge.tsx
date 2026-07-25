"use client";

import { useState } from "react";
import type { BridgeRoute } from "@/lib/landing/bridge";

/**
 * The gateway bridge, now a two-point bridge (North Star entry architecture,
 * section 5.1).
 *
 * The arch and its geometry are the design's own (viewBox 0 0 400 330, from the
 * v1.1 handoff); what changed is the number of routes across it. The two routes
 * ARE the bridge's two points: each label sits at its own pier, carrying the
 * number, the name and the line that says what it opens.
 *
 * There is deliberately no second set of route cards beneath the arch. A bridge
 * whose endpoints are unlabelled, with the real controls in boxes below it, is
 * the same decision drawn twice: it says nothing extra and costs the fold.
 *
 * The labels are the accessible controls: real <button> elements, keyboard
 * operable, with a text label and supporting text, never colour alone. The SVG
 * is decorative (aria-hidden); its markers are a mouse convenience that mirror
 * the labels and light with them.
 *
 * A route is an entrance, not a filter: both the marker and the button call
 * `onOpen`, which leaves the landing page at once. The bridge knows nothing
 * about destinations or feature flags; the page it belongs to owns all of that.
 */

export interface BridgeCenter {
  eyebrow: string;
  title: string;
  titleEm: string;
  hint: string;
}

export interface BridgeRouteLabels {
  /** "Explore the market" / "Start a deal". */
  title: string;
  /** The one line that says what the route opens. */
  support: string;
}

const ORDER: { key: BridgeRoute; num: string; cx: number; cy: number }[] = [
  { key: "explore", num: "01", cx: 66, cy: 250 },
  { key: "deal", num: "02", cx: 334, cy: 250 },
];

export default function PonteBridge({
  center,
  labels,
  onOpen,
}: {
  center: BridgeCenter;
  labels: Record<BridgeRoute, BridgeRouteLabels>;
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
    <div className="gate">
      {label("explore", "01")}

      <div className="gate__stage">
        <svg className="gate__svg" viewBox="0 0 400 330" aria-hidden="true" focusable="false">
          <path className="g-portal" d="M46 300 L46 150 Q46 52 200 52 Q354 52 354 150 L354 300 Z" />
          <path className="g-open" d="M86 300 L86 158 Q86 96 200 96 Q314 96 314 158 L314 300 Z" />
          <path className="g-ring" d="M120 150 Q120 112 200 112 Q280 112 280 150" opacity="0.5" />
          {/* Base beam, then a foot centred under each pier (left pier 46-86,
              right pier 314-354), so the feet sit square beneath the legs. */}
          <rect className="g-portal" x="28" y="300" width="344" height="15" />
          <rect className="g-portal" x="45" y="315" width="42" height="13" />
          <rect className="g-portal" x="313" y="315" width="42" height="13" />
          {ORDER.map(({ key, num, cx, cy }) => (
            <g
              key={key}
              onClick={() => onOpen(key)}
              onMouseEnter={() => setHovered(key)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
            >
              <circle
                className={"g-dot" + (hovered === key ? " hot" : "")}
                cx={cx}
                cy={cy}
                r="16"
              />
              <text className="g-dotn" x={cx} y={cy}>
                {num}
              </text>
            </g>
          ))}
        </svg>

        <div className="gate__center">
          <div className="gate__ceb">{center.eyebrow}</div>
          <div className="gate__ct">
            {center.title}
            <em>{center.titleEm}</em>
          </div>
          <div className="gate__ch">{center.hint}</div>
        </div>
      </div>

      {label("deal", "02")}
    </div>
  );
}
