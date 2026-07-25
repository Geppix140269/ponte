/* Ponte Flow — design tokens (v1.0.0, generated 2026-07-26)
   Colour authority: Ponte Brand Book v5. */
export const ponteFlowTokens = {
  "$schema": "https://design-tokens.org/draft",
  "system": "Ponte Flow",
  "version": "1.0.0",
  "generated": "2026-07-26",
  "note": "Colour authority is Ponte Brand Book v5. These are the values the approved Flow libraries were drawn against.",
  "grid": {
    "viewBox": "0 0 24 24",
    "canvas": 24,
    "liveArea": 20,
    "keylinePadding": 2,
    "arcRadii": {
      "route": 12,
      "turn": 6,
      "detail": 3
    },
    "rule": "Every arc is a segment of one of the three radii. No freehand control points."
  },
  "stroke": {
    "base": 1.75,
    "byRenderedSize": {
      "16": 1.5,
      "20": 1.6,
      "24": 1.75,
      "32": 2,
      "40": 2.2,
      "48": 2.5
    },
    "lineCap": "round",
    "lineJoin": "round",
    "fillRule": "nonzero",
    "note": "Filled shapes use fill=\"currentColor\" stroke=\"none\". No icon mixes a semantic fill with a semantic stroke."
  },
  "radii": {
    "sm": 5,
    "md": 9,
    "lg": 14,
    "pill": 999,
    "unit": "px",
    "note": "Container radii from the product system; icons themselves carry no corner radius token."
  },
  "iconSizes": {
    "standard": [
      24,
      32,
      40,
      48
    ],
    "reduced": [
      16,
      20
    ],
    "defaults": {
      "navigationFamily": 48,
      "hsSector": 24,
      "tradeService": 24,
      "distribution": 24,
      "composerField": 20,
      "listRow": 16,
      "profileRow": 20
    },
    "reducedThreshold": {
      "value": 21,
      "rule": "Use the authored reduced asset at any rendered size below 21px. Never scale the standard drawing below 21px where a reduced asset exists."
    }
  },
  "node": {
    "origin": {
      "r": 1.9,
      "fill": "currentColor"
    },
    "destinationReached": {
      "r": 1.9,
      "fill": "currentColor"
    },
    "destinationNotReached": {
      "r": 1.7,
      "fill": "none",
      "stroke": "currentColor"
    },
    "evidencePoint": {
      "r": 1.2,
      "stem": 2.4,
      "fill": "currentColor"
    },
    "movingPoint": {
      "rRatio": 0.72,
      "fill": "var(--pf-gold)"
    },
    "haltedPoint": {
      "rRatio": 0.72,
      "fill": "var(--pf-review)",
      "tail": false
    }
  },
  "line": {
    "established": {
      "dash": null
    },
    "unconfirmed": {
      "dash": "2 2.6"
    },
    "unavailable": {
      "dash": "1 3",
      "opacity": 0.45
    },
    "reserved": {
      "dash": "3 5",
      "stroke": "var(--pf-review)"
    },
    "rule": "Line treatment is a meaning, not a style. Solid = established, 2/2.6 = declared or unconfirmed, 1/3 @45% = unavailable, slate 3/5 = reserved for a human decision."
  },
  "route": {
    "defaultDirection": "left→right, low→high",
    "anchorInset": 10,
    "laneHeight": 20,
    "tailOffsets": [
      0.038,
      0.076
    ],
    "progressFloor": 20,
    "progressCeiling": 100
  },
  "duration": {
    "micro": 120,
    "enterExit": 220,
    "deliberate": 420,
    "crossing": 900,
    "unknownDurationLoop": 1900,
    "laneLoop": 1600,
    "signalCycle": 2600,
    "segmentFill": 520,
    "unit": "ms"
  },
  "easing": {
    "standard": "cubic-bezier(.2,.6,.2,1)",
    "entrance": "cubic-bezier(.16,1,.3,1)",
    "discreteSegments": "steps(5, end)"
  },
  "colour": {
    "mode": "currentColor",
    "ink": "#0F0F0E",
    "ink2": "#3A3733",
    "ink3": "#6E6A61",
    "mute": "#9A958A",
    "surface": "#FCFBF7",
    "raised": "#FFFFFF",
    "sunken": "#F2EFE6",
    "rule": "#E5DFD2",
    "ruleStrong": "#D5CEBC",
    "gold": "#C9973A",
    "goldInk": "#8A6520",
    "positive": "#0F6E3D",
    "review": "#4E6472",
    "danger": "#B4402A",
    "declared": "#6F695E",
    "focus": "#1E5FA8",
    "select": "#DCE8F4",
    "rules": [
      "Gold is the brand signal and the moving point only — never a status.",
      "Warning is slate (review). Danger is red. There is no amber.",
      "Sector, field and profile icons are ink by default and take colour only from interface state.",
      "Colour is never the only carrier: shape, line treatment, position and a text label carry every state."
    ]
  },
  "dark": {
    "selector": "[data-theme=\"dark\"], .inverse",
    "ink": "#F2EFE8",
    "ink2": "#CDC8BC",
    "ink3": "#A7A296",
    "surface": "#0E0F0C",
    "raised": "#161813",
    "sunken": "#0A0B09",
    "gold": "#D9AC55",
    "positive": "#4FB07A",
    "review": "#9DB4C0",
    "danger": "#E0674C",
    "focus": "#6FA8E0",
    "rule": "Stroke weight is unchanged on dark. No icon depends on a fill that disappears against ink, and none carries a light-only shadow."
  },
  "state": {
    "default": {
      "colour": "ink",
      "opacity": 1
    },
    "hover": {
      "colour": "goldInk",
      "background": "sunken"
    },
    "active": {
      "colour": "ink",
      "background": "sunken",
      "underline": "2px solid ink"
    },
    "selected": {
      "colour": "ink",
      "background": "select"
    },
    "muted": {
      "colour": "ink3"
    },
    "disabled": {
      "colour": "ink",
      "opacity": 0.42,
      "pointerEvents": "none"
    },
    "focus": {
      "ring": "0 0 0 2px var(--pf-surface), 0 0 0 4px var(--pf-focus)",
      "radius": 5,
      "rule": "Focus is applied to the interactive container, never to the SVG. It is never removed."
    }
  },
  "reducedMotion": {
    "trigger": [
      "prefers-reduced-motion: reduce",
      "[data-reduced-motion=\"1\"]"
    ],
    "contract": "Components are authored in their end state; reduced motion removes movement, never information.",
    "travellingPointRestPosition": 0.62,
    "crossingRestPosition": 1,
    "transitionDuration": 0,
    "rule": "No looping animation, no travelling point, no auto-moving decorative element."
  }
} as const;

export type PonteFlowTokens = typeof ponteFlowTokens;

/** Optical stroke width for a rendered icon size. */
export function strokeForSize(size: number): number {
  const t = ponteFlowTokens.stroke.byRenderedSize as Record<number, number>;
  if (size <= 16) return t[16];
  if (size <= 20) return t[20];
  if (size <= 24) return t[24];
  if (size <= 32) return t[32];
  if (size <= 40) return t[40];
  return t[48];
}

/** True when the authored reduced drawing must be used instead of the standard one. */
export function useReduced(size: number): boolean {
  return size < ponteFlowTokens.iconSizes.reducedThreshold.value;
}
