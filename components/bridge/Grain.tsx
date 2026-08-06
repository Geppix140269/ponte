/**
 * The paper grain.
 *
 * ## Tiled, not a full-viewport filter
 *
 * The prototype filters a fixed layer the size of the viewport with
 * `feTurbulence baseFrequency=".9" numOctaves="4"`. That is rasterised at
 * device resolution, so on a 3x phone it is a multi-megapixel fractal noise
 * evaluated on the main thread, and it is re-evaluated whenever the layer is
 * invalidated. It is the single most expensive thing on the page and it is
 * decoration.
 *
 * A 160px tile repeated is visually identical at 14% opacity, because the eye
 * cannot find the repeat in noise this fine, and it costs one small raster
 * once. The tile is an inline data URI so it needs no network request and
 * cannot be blocked by a content policy.
 *
 * ## It composites over the text, not only the ground
 *
 * `mix-blend-mode: overlay` at 14% sits above everything, so it moves the text
 * colour and the background colour by different amounts. That is why
 * `--pf-done-on-ink` and `--pf-blocked-on-ink` are measured THROUGH this layer
 * rather than against the flat token: a pair can pass on its token values and
 * fail on the pixels a member actually looks at.
 * `scripts/derive-ink-pair.mjs` does that measurement.
 *
 * `pointer-events: none`, so a layer covering the whole viewport at z-index 80
 * can never eat a tap.
 */

/** Deterministic: a fixed seed, so the grain is the same on every render and machine. */
const TILE = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">
<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="7"/></filter>
<rect width="160" height="160" filter="url(#n)"/></svg>`;

const TILE_URI = `url("data:image/svg+xml;utf8,${encodeURIComponent(TILE)}")`;

export default function Grain() {
  return <div className="brg-grain" style={{ backgroundImage: TILE_URI }} aria-hidden="true" />;
}
