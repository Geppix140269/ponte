"use client";

import { useState } from "react";
import type { RouteKey } from "@/lib/landing/intent";

/**
 * The gateway bridge: an editable, responsive inline SVG (viewBox 0 0 400 330,
 * geometry from the handoff) with four route markers, the archway centre, and
 * four route-label buttons.
 *
 * The accessible controls are the <button class="rlabel"> elements: real
 * buttons, keyboard operable, carrying the number and route name, with
 * aria-pressed reflecting selection. The SVG itself is decorative
 * (aria-hidden); its dot groups are a mouse convenience that mirror the
 * buttons. Hovering a marker or its label lights both (the number and the
 * route name share one hover state). On mobile the buttons fall into a
 * borderless 01-04 legend and the SVG's own numbers hide.
 */

export interface BridgeCenter {
  eyebrow: string;
  title: string;
  titleEm: string;
  hint: string;
}

const ORDER: { key: RouteKey; num: string; variant: string }[] = [
  { key: "find", num: "01", variant: "rlabel--find" },
  { key: "structure", num: "02", variant: "rlabel--structure" },
  { key: "check", num: "03", variant: "rlabel--check" },
  { key: "investigate", num: "04", variant: "rlabel--investigate" },
];

// Marker centres in viewBox units, matching the handoff bridge geometry.
const DOTS: Record<RouteKey, { cx: number; cy: number; num: string }> = {
  find: { cx: 66, cy: 250, num: "01" },
  structure: { cx: 120, cy: 96, num: "02" },
  check: { cx: 280, cy: 96, num: "03" },
  investigate: { cx: 334, cy: 250, num: "04" },
};

export default function PonteBridge({
  active,
  center,
  labels,
  onSelect,
}: {
  active: RouteKey | null;
  center: BridgeCenter;
  labels: Record<RouteKey, string>;
  onSelect: (key: RouteKey) => void;
}) {
  const [hovered, setHovered] = useState<RouteKey | null>(null);

  return (
    <div className="gate">
      <div className="gate__stage">
        <svg className="gate__svg" viewBox="0 0 400 330" aria-hidden="true" focusable="false">
          <path className="g-portal" d="M46 300 L46 150 Q46 52 200 52 Q354 52 354 150 L354 300 Z" />
          <path className="g-open" d="M86 300 L86 158 Q86 96 200 96 Q314 96 314 158 L314 300 Z" />
          <path
            className="g-ring"
            d="M120 150 Q120 112 200 112 Q280 112 280 150"
            opacity="0.5"
          />
          {/* Base beam, then a foot centred under each pier (left pier 46-86,
              right pier 314-354), so the feet sit square beneath the legs. */}
          <rect className="g-portal" x="28" y="300" width="344" height="15" />
          <rect className="g-portal" x="45" y="315" width="42" height="13" />
          <rect className="g-portal" x="313" y="315" width="42" height="13" />
          {ORDER.map(({ key }) => {
            const d = DOTS[key];
            const cls =
              "g-dot" +
              (active === key ? " active" : "") +
              (hovered === key ? " hot" : "");
            return (
              <g
                key={key}
                onClick={() => onSelect(key)}
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer" }}
              >
                <circle className={cls} cx={d.cx} cy={d.cy} r="16" />
                <text className="g-dotn" x={d.cx} y={d.cy}>
                  {d.num}
                </text>
              </g>
            );
          })}
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

      {ORDER.map(({ key, num, variant }) => (
        <button
          key={key}
          type="button"
          className={
            `rlabel ${variant}` +
            (active === key ? " active" : "") +
            (hovered === key ? " hot" : "")
          }
          data-num={num}
          aria-pressed={active === key}
          onClick={() => onSelect(key)}
          onMouseEnter={() => setHovered(key)}
          onMouseLeave={() => setHovered(null)}
        >
          <span className="rlabel__t">{labels[key]}</span>
        </button>
      ))}
    </div>
  );
}
