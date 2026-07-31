"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The universal Task Completion Bridge (Bridge System v1, component #3:
 * `PB.progress`), applied to Start a Deal per ADR-0016.
 *
 * A gold signal travels a shallow deck as the record fills in, gold in its
 * lawful §6a meaning: movement across a Bridge and arrival at the completed
 * state. It is never turned blue; blue stays on the Add/Edit controls. The
 * percentage is bound to `lib/structure/completion.ts` (which is bound to
 * `lib/ponte/progress.ts`); this component renders a value it is given and
 * derives nothing itself.
 *
 * ## The neutral null state
 *
 * Constitution §9 and ADR-0016 decision on progress: before the first
 * meaningful act there is no percentage, no bar and no zero. `value === null`
 * renders one honest line and no arch. The absence is the design.
 *
 * ## How the travel is drawn
 *
 * The deck is one authored path. The travelled portion is the same path in
 * gold, revealed with `stroke-dasharray` against a `pathLength` of 100, so the
 * reveal is exactly `value`% with no geometry maths in the render. The signal
 * node is placed at the travelled end with `getPointAtLength` in a layout
 * effect (the same measured-geometry approach `BridgeRoute` uses), and stays
 * hidden until it has been measured, so it never flashes at the origin.
 *
 * `prefers-reduced-motion` removes the travel transition (handled in the
 * stylesheet); the settled position is identical.
 */

export interface TaskCompletionBridgeProps {
  /** The completion value, or null for the neutral pre-start state. */
  value: number | null;
  /** The approved band label for the value (e.g. "Good commercial detail"). */
  band: string;
  /** The two ends of the crossing. */
  abutments: { left: string; right: string };
  /** The one line shown in the neutral state. */
  neutralLabel: string;
  /** Accessible name for the progress region. */
  ariaLabel?: string;
}

/** The authored deck: a shallow arch in a 320 x 96 field. */
const DECK_D = "M 12 78 C 92 30 228 30 308 78";

export default function TaskCompletionBridge({
  value,
  band,
  abutments,
  neutralLabel,
  ariaLabel = "Record completion",
}: TaskCompletionBridgeProps) {
  const travRef = useRef<SVGPathElement | null>(null);
  const [node, setNode] = useState<{ x: number; y: number } | null>(null);

  // Place the signal node at the travelled end. Measured, not computed in the
  // render, and cleared to null whenever there is nothing to show.
  useEffect(() => {
    const path = travRef.current;
    if (path === null || value === null) {
      setNode(null);
      return;
    }
    const length = path.getTotalLength();
    const point = path.getPointAtLength((length * value) / 100);
    setNode({ x: point.x, y: point.y });
  }, [value]);

  if (value === null) {
    return (
      <div className="tcb tcb--neutral" role="status" aria-label={ariaLabel}>
        <span className="tcb__dot" aria-hidden="true" />
        <span className="tcb__neutral">{neutralLabel}</span>
      </div>
    );
  }

  return (
    <div
      className="tcb"
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={`${value} percent, ${band}`}
    >
      <div className="tcb__top">
        <span className="tcb__pct">
          {value}
          <span className="tcb__pctn" aria-hidden="true">%</span>
        </span>
        <span className="tcb__band">{band}</span>
      </div>

      <div className="tcb__arc">
        <svg viewBox="0 0 320 96" width="100%" height="72" aria-hidden="true" focusable="false">
          <path className="tcb__deck" d={DECK_D} fill="none" pathLength={100} />
          <path
            ref={travRef}
            className="tcb__trav"
            d={DECK_D}
            fill="none"
            pathLength={100}
            style={{ strokeDasharray: `${value} 100` }}
          />
          {node ? <circle className="tcb__node" cx={node.x} cy={node.y} r={6} /> : null}
        </svg>
      </div>

      <div className="tcb__abut" aria-hidden="true">
        <span>{abutments.left}</span>
        <span>{abutments.right}</span>
      </div>
    </div>
  );
}
