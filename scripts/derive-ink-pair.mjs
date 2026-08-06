#!/usr/bin/env node
/**
 * Derive the on-ink pair for `--done` and `--blocked`, measured THROUGH the
 * grain rather than against the flat token.
 *
 * ## Why the flat measurement is not the measurement
 *
 * `ADR-0032` puts a fine paper grain over everything: a fixed layer at 14%
 * opacity in `mix-blend-mode: overlay`. It composites over the text AND the
 * background, and it moves them by different amounts, because `overlay` is a
 * function of the backdrop. A pair can pass `check-contrast.mjs` on its token
 * values and fail on the actual pixels a member looks at.
 *
 * So this measures the WORST CASE. `feTurbulence type="fractalNoise"` produces
 * a source channel anywhere in [0,1], so for each channel the composite spans a
 * range; the worst case for contrast is the text at its darkest against the
 * background at its lightest. If a colour passes there, it passes everywhere on
 * the surface.
 *
 * ## What "lightest that stays in the hue family" means here
 *
 * Hue and saturation are held at the parent's exactly, and lightness is raised
 * by the smallest step that clears the threshold. That is the value CLOSEST to
 * the parent that works: a lighter one would pass too, and would look less like
 * the colour it is derived from. Holding H and S fixed is what keeps it the
 * same green rather than a new one.
 *
 * Run: node scripts/derive-ink-pair.mjs
 */

const INK = "#0E0F0C";
/** `mix-blend-mode: overlay` at this opacity, from ADR-0032 and the prototype. */
const GRAIN_ALPHA = 0.14;
/** WCAG AA for body text. The gate's own threshold; not negotiable here. */
const THRESHOLD = 4.5;

const hex = (value) => {
  const n = value.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
};
const toHex = (rgb) =>
  `#${rgb.map((c) => Math.round(c * 255).toString(16).padStart(2, "0").toUpperCase()).join("")}`;

/** The CSS `overlay` blend, per channel. */
const overlay = (backdrop, source) =>
  backdrop <= 0.5 ? 2 * backdrop * source : 1 - 2 * (1 - backdrop) * (1 - source);

/**
 * The range a channel can occupy once the grain has composited over it.
 *
 * The noise source spans [0,1], so the blended result spans the blend evaluated
 * at both ends, and the final value is the backdrop mixed toward it by alpha.
 */
function composited(backdrop) {
  const low = backdrop + GRAIN_ALPHA * (overlay(backdrop, 0) - backdrop);
  const high = backdrop + GRAIN_ALPHA * (overlay(backdrop, 1) - backdrop);
  return [Math.min(low, high), Math.max(low, high)];
}

const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (rgb) =>
  0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);

const ratio = (a, b) => {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};

/** Contrast at the worst point of the grain: text darkest, ground lightest. */
function worstCase(fg, bg) {
  const fgDark = fg.map((c) => composited(c)[0]);
  const bgLight = bg.map((c) => composited(c)[1]);
  return ratio(luminance(fgDark), luminance(bgLight));
}

/** Contrast on the flat tokens, for comparison only. */
function flat(fg, bg) {
  return ratio(luminance(fg), luminance(bg));
}

/* ------------------------------------------------------------------ */
/* HSL, so hue and saturation can be held while lightness moves        */
/* ------------------------------------------------------------------ */

function toHsl([r, g, b]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function toRgb([h, s, l]) {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t) => {
    let v = t;
    if (v < 0) v += 1;
    if (v > 1) v -= 1;
    if (v < 1 / 6) return p + (q - p) * 6 * v;
    if (v < 1 / 2) return q;
    if (v < 2 / 3) return p + (q - p) * (2 / 3 - v) * 6;
    return p;
  };
  return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)];
}

const HUE_DEGREES = ([h]) => Math.round(h * 360);

function derive(name, parentHex) {
  const parent = hex(parentHex);
  const [h, s, l0] = toHsl(parent);
  const ink = hex(INK);

  let chosen = null;
  // One 8-bit step at a time, so the answer is the closest passing value rather
  // than a round number that happens to work.
  for (let l = l0; l <= 1; l += 1 / 255) {
    const candidate = toRgb([h, s, l]);
    if (worstCase(candidate, ink) >= THRESHOLD) {
      chosen = candidate;
      break;
    }
  }

  if (!chosen) {
    console.log(`${name}: no value in this hue family reaches ${THRESHOLD}:1. STOP.`);
    return null;
  }

  const [ch, cs, cl] = toHsl(chosen);
  return {
    name,
    parent: parentHex,
    parentHue: HUE_DEGREES([h]),
    parentLightness: (l0 * 100).toFixed(1),
    value: toHex(chosen),
    hue: HUE_DEGREES([ch]),
    saturation: (cs * 100).toFixed(1),
    lightness: (cl * 100).toFixed(1),
    throughGrain: worstCase(chosen, ink).toFixed(2),
    flatOnInk: flat(chosen, ink).toFixed(2),
    parentThroughGrain: worstCase(parent, ink).toFixed(2),
    parentFlatOnInk: flat(parent, ink).toFixed(2),
  };
}

const results = [
  derive("--pf-done-on-ink", "#0F6E3D"),
  derive("--pf-blocked-on-ink", "#B4402A"),
];

console.log(`Ground: ink ${INK}. Grain: overlay at ${GRAIN_ALPHA * 100}%.`);
console.log(`Threshold: ${THRESHOLD}:1, measured at the worst point of the grain.\n`);

for (const r of results) {
  if (!r) continue;
  console.log(`${r.name}  ${r.value}`);
  console.log(`  derived from   ${r.parent}  (hue ${r.parentHue}, lightness ${r.parentLightness}%)`);
  console.log(`  result         hue ${r.hue}, saturation ${r.saturation}%, lightness ${r.lightness}%`);
  console.log(`  hue drift      ${Math.abs(r.hue - r.parentHue)} degrees`);
  console.log(`  through grain  ${r.throughGrain}:1   (flat on ink ${r.flatOnInk}:1)`);
  console.log(`  the parent     ${r.parentThroughGrain}:1 through grain, ${r.parentFlatOnInk}:1 flat  <- why a pair is needed`);
  console.log("");
}
