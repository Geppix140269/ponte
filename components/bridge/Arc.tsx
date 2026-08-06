"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ARC_METRICS,
  HERO_PHONE,
  arc,
  arcPoint,
  deckFraction,
  nodeStates,
  type ArcSize,
} from "@/lib/bridge/arc";

/**
 * The bridge, at three scales.
 *
 * ## It is never a target
 *
 * `ADR-0032-AMENDMENT-1` section 1: *"The arc is never a target. A row that
 * happens to contain an arc may be."* The whole SVG carries
 * `pointer-events: none` and `aria-hidden`, so it cannot be clicked, cannot be
 * tabbed to, and cannot be the thing a screen reader announces instead of the
 * row's own text. The row around it stays clickable.
 *
 * That is what keeps item 3 of the thirteen satisfied while the arc becomes
 * load-bearing: item 3 banned the arc as a NAVIGATION CONTROL, and this
 * reports state and accepts no input.
 *
 * ## Genuinely circular, not merely arc-shaped
 *
 * The geometry comes from `lib/bridge/arc.ts`, which derives one radius from
 * the chord and the rise and emits a single `A` command. The prototype sets
 * `preserveAspectRatio="none"`, which stretches the path into an ellipse
 * whenever the viewBox and the box disagree; it currently gets away with it
 * because the viewBox is recomputed on resize, but any transient mismatch
 * distorts the one shape the brand is named after. This measures the element
 * and draws at its true size, so there is nothing to keep in sync.
 *
 * ## The deck is the progress indicator
 *
 * It draws itself with `stroke-dashoffset` as the member advances, and there is
 * no numeral in a progress role beside it. Under `prefers-reduced-motion` it
 * arrives already drawn rather than drawing slowly: the information is the
 * length, not the animation.
 */

export interface ArcProps {
  size: ArcSize;
  /** Number of spans. There are `total + 1` nodes, counting both shores. */
  total: number;
  /** The node the member is on. Past the last one means the crossing is done. */
  current: number;
  /** Stage names. Ignored at `mini`, which has no room and says so. */
  labels?: readonly string[];
  /** Progress THROUGH the current span, 0 to 1, so the deck moves as answers land. */
  within?: number;
  /** Vehicles crossing the deck. Off by default; never on under reduced motion. */
  traffic?: boolean;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const listen = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", listen);
    return () => query.removeEventListener("change", listen);
  }, []);
  return reduced;
}

/**
 * A width the arc can always be drawn at.
 *
 * Used only when the element measures zero, which happens whenever the arc is
 * laid out inside something that has no size yet: a hidden tab panel, a
 * `display: none` drawer, a container that has not been composited.
 *
 * It exists because the first version rendered NOTHING in that case, and the
 * arc is the only progress indicator in the system. A span that silently
 * vanishes when its container is momentarily unmeasurable is a worse defect
 * than a span that draws at a sensible width and corrects on the next frame:
 * the first looks like the feature is missing, the second looks like it loaded.
 */
const FALLBACK_WIDTH = 960;

/** The rendered width, measured rather than assumed, so the arc is never stretched. */
function useMeasuredWidth(): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  /*
    Measured BEFORE paint, so the common case has no correction to make and no
    visible jump. The observer below only handles later changes.
  */
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(Math.round(element.getBoundingClientRect().width));
    const observer = new ResizeObserver((entries) => {
      // Rounded, so a sub-pixel scroll does not redraw the whole span.
      setWidth(Math.round(entries[0]?.contentRect.width ?? 0));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

export default function Arc({ size, total, current, labels, within = 0, traffic = false }: ArcProps) {
  const [ref, width] = useMeasuredWidth();
  const reduced = usePrefersReducedMotion();
  const deck = useRef<SVGPathElement>(null);
  /*
    The shell is decided by the arc's OWN measured width, not by the window.
    Reading window.innerWidth gave a different answer on the server and the
    client, so the wrapper took its height from the CSS media query while the
    viewBox took its height from the desktop metrics: the arc was scaled to fit
    a box 68px shorter than it thought it was, letterboxed, and stopped spanning
    the shore to shore. It also collided with whatever sat under it.
  */
  const metrics = size === "hero" && width > 0 && width < 620 ? HERO_PHONE : ARC_METRICS[size];

  useEffect(() => {
    const path = deck.current;
    if (!path || width === 0) return;
    const length = path.getTotalLength();
    const drawn = length * deckFraction(total, current, within);
    path.style.strokeDasharray = `${length}`;
    if (reduced) {
      // Already crossed. The length carries the information; the drawing was
      // only ever the pleasure of watching it.
      path.style.transition = "none";
      path.style.strokeDashoffset = `${length - drawn}`;
      return;
    }
    path.style.transition = "none";
    path.style.strokeDashoffset = `${length}`;
    // Two frames: one to commit the undrawn state, one to start from it.
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        path.style.transition = `stroke-dashoffset var(--brg-draw) var(--brg-ease)`;
        path.style.strokeDashoffset = `${length - drawn}`;
      }),
    );
    return () => cancelAnimationFrame(frame);
  }, [width, total, current, within, reduced]);

  const height = metrics.height;
  const x0 = metrics.inset;
  const baseline = height - metrics.water;
  const waterline = height - 2;

  /*
    There is ALWAYS a span. A container that cannot be measured yet draws at the
    fallback and corrects on the next frame, rather than rendering nothing.

    The first version returned null until measured, which is right on a normal
    mount and wrong everywhere else: inside a hidden panel, a collapsed drawer,
    or a pane that is not compositing, the element measures zero forever and the
    arc never appears. The arc is the only progress indicator in the system, so
    a missing one does not read as "loading", it reads as "this product has no
    progress indicator".
  */
  const measured = width > metrics.inset * 2 + 8;
  const drawWidth = measured ? width : FALLBACK_WIDTH;
  const x1 = drawWidth - metrics.inset;
  const geometry = arc(x0, x1, baseline, metrics.rise);
  const states = nodeStates(total, current);

  return (
    <div className="brg-arc" ref={ref} data-size={size} style={{ blockSize: metrics.height }}>
      {(
        <svg
          viewBox={`0 0 ${drawWidth} ${height}`}
          width={drawWidth}
          height={height}
          /*
            Not `preserveAspectRatio="none"`. The viewBox is the measured box,
            so the default `xMidYMid meet` is exact, and if the two ever drift
            the arc stays circular and is letterboxed rather than becoming an
            ellipse. The shape the brand is named after does not get stretched.
          */
          aria-hidden="true"
          focusable="false"
        >
          <line className="brg-arc__water" x1={0} y1={waterline} x2={drawWidth} y2={waterline} />

          {/* The piers, at each shore. */}
          <line className="brg-arc__pier" x1={x0} y1={waterline} x2={x0} y2={baseline} />
          <line className="brg-arc__pier" x1={x1} y1={waterline} x2={x1} y2={baseline} />

          {/* The undrawn span, so the crossing is legible before it is made. */}
          <path className="brg-arc__ghost" d={geometry.d} />
          <path className="brg-arc__deck" ref={deck} d={geometry.d} />

          {states.map((state, index) => {
            const point = arcPoint(geometry, x0, x1, index / total);
            const label = metrics.labels ? labels?.[index] : undefined;
            const anchor = index === 0 ? "start" : index === total ? "end" : "middle";
            return (
              <g key={index}>
                <circle
                  className={`brg-arc__node brg-arc__node--${state}`}
                  cx={point.x}
                  cy={point.y}
                  r={metrics.node[state]}
                />
                {label && (
                  <text
                    className={`brg-arc__label${state === "current" ? " is-live" : ""}`}
                    x={point.x}
                    y={point.y - 15}
                    textAnchor={anchor}
                  >
                    {label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Traffic never runs under reduced motion: it is the one purely
              decorative movement in the system, so it is the first to go. */}
          {traffic && !reduced && (
            <g className="brg-arc__traffic">
              <circle className="brg-arc__vehicle" r={2.5}>
                <animateMotion dur="18s" repeatCount="indefinite" path={geometry.d} />
              </circle>
            </g>
          )}
        </svg>
      )}
    </div>
  );
}
