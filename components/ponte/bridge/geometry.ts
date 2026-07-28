/**
 * The approved Bridge geometry, transcribed from the recovered engine.
 *
 * Source: `design/authority/bridge/v1/source/ponte-bridge.js`, verified against
 * `SOURCE-MANIFEST.md` at SHA-256 `3ff3210464d3208c058bcd9b7feb80801c77dc23db28927c8997df8aa62b5f4f`.
 *
 * Every number and formula here is copied from that file. Nothing is derived,
 * rounded, simplified or improved. This module exists so the arithmetic can be
 * unit-tested against the engine's own values rather than only being visible
 * inside a React effect.
 *
 * ## Why this replaces what was here before
 *
 * The first implementation of this slice was built without the engine, which
 * was missing from the repository, and drew the deck as a straight horizontal
 * line. The owner rejected that: a straight rule is not the Ponte bridge. The
 * approved deck is a **cubic Bezier arch**, its stations sit at **non-uniform
 * fractions of the path length**, and the gold signal travels **along that
 * curve** rather than across a straight overlay.
 */

/** Below this container width a bridge is drawn in elevation. Engine: `VBREAK`. */
export const VERTICAL_BELOW = 460;

/** The desktop stage height. Engine: `route`'s `o.deckH || 92`. */
export const DECK_HEIGHT = 92;

/** The deck's inset from each end. Engine: `stage`'s `deckPath(W, H, 1.5, rise)`. */
export const DECK_INSET = 1.5;

/** The pier length before the per-station correction. Engine: `o.pier || 34`. */
export const BASE_PIER = 34;

/** The widest a station block may be. Engine: `blockW(pts, 176)`. */
export const MAX_STATION_WIDTH = 176;

/** Elevation constants. Engine: `const GUT = 46, BOW = 11, X0 = 6`. */
export const GUTTER = 46;
export const BOW = 11;
export const X0 = 6;

/**
 * The deck: one arc, every component.
 *
 * Engine, verbatim:
 *
 * ```js
 * function deckPath(W, H, inset, rise) {
 *   const y0 = H - 1.5, r = rise || H - 3, yc = y0 - (4 * r) / 3;
 *   return `M${inset},${y0} C${(W*0.26).toFixed(1)},${yc.toFixed(1)} ${(W*0.74).toFixed(1)},${yc.toFixed(1)} ${W-inset},${y0}`;
 * }
 * ```
 *
 * The control points sit at 26% and 74% of the width and well above the stage,
 * which is what gives the arch its shallow, engineered rise rather than the
 * semicircle a naive arc would draw.
 */
export function deckPath(width: number, height = DECK_HEIGHT, inset = DECK_INSET, rise?: number): string {
  const y0 = height - 1.5;
  const r = rise ?? height - 3;
  const yc = y0 - (4 * r) / 3;
  return `M${inset},${y0} C${(width * 0.26).toFixed(1)},${yc.toFixed(1)} ${(width * 0.74).toFixed(1)},${yc.toFixed(1)} ${width - inset},${y0}`;
}

/** The deck's baseline y. Engine: `stage`'s `y0: H - 1.5`. */
export function deckBaseline(height = DECK_HEIGHT): number {
  return height - 1.5;
}

/**
 * Where the stations sit along the deck, as fractions of its path length.
 *
 * Engine, verbatim. These are **not** evenly spaced, and that is the point: the
 * outer stations are pulled inwards so their label blocks clear the abutments,
 * and the spacing reads as a designed crossing rather than a ruler.
 *
 * ```js
 * function tsFor(n) {
 *   if (n <= 1) return [0.5];
 *   if (n === 2) return [0.30, 0.70];
 *   if (n === 3) return [0.26, 0.50, 0.74];
 *   if (n === 4) return [0.16, 0.39, 0.62, 0.85];
 *   const m = 0.14, sp = (1 - m * 2) / (n - 1);
 *   return Array.from({length: n}, (_, i) => m + sp * i);
 * }
 * ```
 */
export function stationFractions(count: number): number[] {
  if (count <= 1) return [0.5];
  if (count === 2) return [0.3, 0.7];
  if (count === 3) return [0.26, 0.5, 0.74];
  if (count === 4) return [0.16, 0.39, 0.62, 0.85];
  const margin = 0.14;
  const spacing = (1 - margin * 2) / (count - 1);
  return Array.from({ length: count }, (_, i) => margin + spacing * i);
}

/**
 * A station block's width, from the **measured** spacing of the deck.
 *
 * Engine, verbatim. The comment above it in the engine is the rule:
 * "Station blocks are sized from the MEASURED spacing of the deck, never from a
 * fixed constant: a block may never be wider than the gap it sits in."
 */
export function blockWidth(points: readonly { x: number }[], max = MAX_STATION_WIDTH): number {
  let gap = Infinity;
  for (let i = 1; i < points.length; i++) gap = Math.min(gap, points[i].x - points[i - 1].x);
  return Math.max(88, Math.min(max, Number.isFinite(gap) ? gap - 12 : max));
}

/**
 * A sampled sub-path of the deck between two fractions.
 *
 * Engine: `seg(m, a, b)`, 60 samples per unit fraction, minimum 2. Used for the
 * live deck and for the runner's `offset-path`, so the gold signal follows the
 * same curve the deck is drawn on rather than a straight line between endpoints.
 */
export function subPath(at: (t: number) => { x: number; y: number }, from: number, to: number): string {
  const n = Math.max(2, Math.round((to - from) * 60));
  let d = "";
  for (let i = 0; i <= n; i++) {
    const point = at(from + ((to - from) * i) / n);
    d += (i ? "L" : "M") + point.x.toFixed(1) + "," + point.y.toFixed(1);
  }
  return d;
}

/**
 * The elevation curve's x at a given y. Engine: `xAt` inside `elevation`.
 *
 * `X0 + BOW * 4 * (y/H) * (1 - y/H)` is a parabola: zero bow at both ends and a
 * maximum of `BOW` at the middle. It is what makes the mobile bridge one
 * continuous bowed route instead of a straight rule with dots on it.
 */
export function elevationX(y: number, height: number): number {
  if (height <= 0) return X0;
  const t = y / height;
  return X0 + BOW * 4 * t * (1 - t);
}

/** A traced segment of the elevation curve. Engine: `trace(from, to)`, 48 samples. */
export function elevationPath(from: number, to: number, height: number): string {
  let d = "";
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const y = from + ((to - from) * i) / n;
    d += (i ? "L" : "M") + elevationX(y, height).toFixed(1) + "," + y.toFixed(1);
  }
  return d;
}
