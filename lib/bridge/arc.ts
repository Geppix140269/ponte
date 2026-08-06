/**
 * The arc: a true circular arc, derived from its chord and its rise.
 *
 * ## Why the maths is here and not in the component
 *
 * Because it is the one thing in the system that can be wrong in a way nobody
 * sees. A polyline through the same endpoints looks like an arc at a glance and
 * is not one; an ellipse looks like an arc until it sits beside a real one. The
 * geometry is pure, exported, and pinned by test, so "it is a circle" is a fact
 * about the code rather than a hope about the rendering.
 *
 * ## The derivation
 *
 * Given a chord of length `c` and a rise of `h` at its midpoint, the radius of
 * the circle through those three points is
 *
 *     R = (c^2 / 4 + h^2) / (2h)
 *
 * which falls straight out of the intersecting-chords theorem: the rise and its
 * opposite segment multiply to the half-chord squared, so h(2R - h) = (c/2)^2.
 *
 * That radius goes into ONE SVG `A` command. Never a polyline, never a cubic
 * approximation, never two arcs meeting in the middle.
 *
 * ## `ADR-0032-AMENDMENT-1` section 1
 *
 * The arc is never a target. Nothing here emits an event, a href or a handler,
 * and the component that renders it sets `pointer-events: none`. It reports
 * state and accepts no input.
 */

export interface ArcGeometry {
  /** The single `A` command path. One move, one arc, nothing else. */
  d: string;
  /** The derived radius. Equal in both axes: that is what makes it circular. */
  radius: number;
  /** The circle's centre, below the chord. */
  cx: number;
  cy: number;
}

/**
 * The arc springing from `(x0, baseline)` to `(x1, baseline)`, rising by `rise`.
 *
 * Throws on a rise of zero or less: a flat "arc" has an infinite radius and
 * would emit a path with `Infinity` in it, which renders as nothing at all and
 * is the kind of failure that reaches production because the screen simply
 * looks empty rather than broken.
 */
export function arc(x0: number, x1: number, baseline: number, rise: number): ArcGeometry {
  if (!(rise > 0)) throw new Error(`arc rise must be positive, received ${rise}`);
  if (!(x1 > x0)) throw new Error(`arc chord must be positive, received ${x1 - x0}`);

  const chord = x1 - x0;
  const radius = (chord * chord / 4 + rise * rise) / (2 * rise);
  return {
    // sweep-flag 1, large-arc-flag 0: the minor arc, curving upward.
    d: `M ${x0} ${baseline} A ${radius} ${radius} 0 0 1 ${x1} ${baseline}`,
    radius,
    cx: (x0 + x1) / 2,
    cy: baseline + (radius - rise),
  };
}

/**
 * The y of the arc at a fraction `t` along its chord.
 *
 * Used to place nodes and labels ON the curve rather than near it. The clamp
 * inside the square root matters: floating-point error at t = 0 and t = 1 can
 * make the term fractionally negative, and `Math.sqrt` of that is `NaN`, which
 * silently removes the first and last node of every arc in the product.
 */
export function arcY(geometry: ArcGeometry, x0: number, x1: number, t: number): number {
  const x = x0 + (x1 - x0) * t;
  const dx = x - geometry.cx;
  return geometry.cy - Math.sqrt(Math.max(geometry.radius * geometry.radius - dx * dx, 0));
}

/** A point on the arc, in the arc's own coordinate space. */
export function arcPoint(
  geometry: ArcGeometry,
  x0: number,
  x1: number,
  t: number,
): { x: number; y: number } {
  return { x: x0 + (x1 - x0) * t, y: arcY(geometry, x0, x1, t) };
}

/* ------------------------------------------------------------------ */
/* The three sizes                                                     */
/* ------------------------------------------------------------------ */

/**
 * The arc carries a different job at each scale, so the sizes are named rather
 * than passed as numbers: a caller asking for "the portfolio one" cannot get
 * the hero's proportions by mistyping a height.
 */
export type ArcSize = "hero" | "procedure" | "mini";

export interface ArcMetrics {
  /** Inset from each end, so the springing points are not flush to the edge. */
  inset: number;
  /** Distance from the baseline down to the waterline. */
  water: number;
  /** The shortest rise this scale will draw, however short the chord. */
  riseMin: number;
  /** The tallest rise this scale will draw, however long the chord. */
  riseMax: number;
  /** Clear space above the crown, for labels and for the arch to breathe. */
  headroom: number;
  /** Node radii: reached, current, not yet reached. */
  node: { done: number; current: number; todo: number };
  /** Whether this size carries step labels at all. */
  labels: boolean;
}

/**
 * The springing ratio: **rise = chord / 6.**
 *
 * ## Why this is a ratio and not a number
 *
 * A fixed rise is not an arch, it is a line that happens to bend. At 1,200px it
 * looked like a crossing; at a 1,960px span the same 126px rise is a 6% rise
 * and reads as a sagging wire. The brand is named after an arch, and at the
 * width the owner actually works at there was no arch on the screen.
 *
 * One rule, not three hand-tuned breakpoints: the rise is a function of the
 * chord, so every width between 390 and 2560 gets the same shape rather than
 * three widths getting a shape and the gaps between them getting whatever falls
 * out.
 *
 * ## Why one sixth
 *
 * It is the segmental arch: the shape of a masonry road bridge, which is what
 * Ponte is named for, and it is shallow enough to sit above a line of type
 * without becoming a semicircle. A half-round arch (ratio 0.5) is a Roman
 * aqueduct and would take a third of a laptop screen; anything under about an
 * eighth stops reading as a span at all.
 *
 * The floor and the ceiling are per scale, and both are real:
 *
 *   - Below the floor a phone's short chord would give a 55px rise, which is
 *     the sagging wire again at the other end of the range.
 *   - Above the ceiling a 4K span would want a 540px rise and the arch would
 *     push every word below the fold.
 */
export const ARCH_RATIO = 1 / 6;

/**
 * The rise for a chord, at a scale. Clamped at both ends, never interpolated.
 *
 * Pure, exported and pinned by test, for the same reason the geometry is: the
 * failure is invisible. A rise that is slightly wrong still draws a curve.
 */
export function riseFor(chord: number, metrics: ArcMetrics): number {
  return Math.min(metrics.riseMax, Math.max(metrics.riseMin, chord * ARCH_RATIO));
}

/** The band's height for a given rise. The arch decides, the box follows. */
export function heightFor(rise: number, metrics: ArcMetrics): number {
  return Math.round(rise + metrics.water + metrics.headroom);
}

export const ARC_METRICS: Readonly<Record<ArcSize, ArcMetrics>> = {
  // The hero band. One iconic crossing, drawn on load.
  hero: {
    inset: 8,
    water: 22,
    riseMin: 72,
    riseMax: 300,
    headroom: 46,
    node: { done: 3.4, current: 5.6, todo: 2.9 },
    labels: true,
  },
  // The procedure inside a room, with its stages named.
  procedure: {
    inset: 8,
    water: 20,
    riseMin: 64,
    riseMax: 240,
    headroom: 42,
    node: { done: 3.2, current: 5.2, todo: 2.7 },
    labels: true,
  },
  // The portfolio mini span. Too small for labels; the row around it names it.
  mini: {
    inset: 4,
    water: 6,
    riseMin: 12,
    riseMax: 26,
    headroom: 6,
    node: { done: 2.7, current: 2.9, todo: 2.3 },
    labels: false,
  },
};

/**
 * Where each node sits, and what state it is in.
 *
 * `current` is the node the member is ON. Everything before it is reached,
 * everything after is not. A `current` beyond the last node means the crossing
 * is complete and nothing is highlighted, which is what the portfolio needs and
 * what an off-by-one would otherwise render as a permanently unfinished span.
 */
export type NodeState = "done" | "current" | "todo";

export function nodeStates(total: number, current: number): NodeState[] {
  return Array.from({ length: total + 1 }, (_, index) =>
    index < current ? "done" : index === current ? "current" : "todo",
  );
}

/**
 * How much of the deck is drawn, 0 to 1.
 *
 * The deck is the only progress indicator in the system: it draws itself as the
 * member answers and there is no numeral in a progress role anywhere near it.
 * `ADR-0032`.
 *
 * `within` is progress THROUGH the current span, 0 to 1. It exists because the
 * publish path asks several questions inside one stage: without it the deck
 * would sit still through all three of B01 and then jump, which is a stage
 * indicator wearing a drawing. The nodes still light on whole stages; only the
 * deck moves continuously.
 */
export function deckFraction(total: number, current: number, within = 0): number {
  if (total <= 0) return 0;
  const clamped = Math.min(1, Math.max(0, within));
  return Math.min(1, Math.max(0, (current + clamped) / total));
}
