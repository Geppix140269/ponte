/**
 * Ponte design tokens. Single source of truth for the values that the
 * Tailwind config, globals.css and the icon components all have to agree on.
 *
 * Authority: design_handoff_ponte/README.md and Brand Book.dc.html
 * (Rebranding 21st July bundle, brand book v1, 2026-07-22).
 *
 * The rule the palette encodes: lime is "go", violet is trust and AI, cyan is
 * verified, gold is the institutional tier, and coral is alerts and nothing
 * else. A coral pixel anywhere that is not an error is a bug.
 */

export const COLOR = {
  /** App canvas. */
  obsidian: "#0A0C11",
  /** Deeper ground, brand surfaces only. */
  void: "#06070A",
  /** Raised panels. */
  surface: "#1B2029",
  /** Primary text. */
  ink: "#EEF1F5",
  /** Secondary text. */
  muted: "#8A93A2",

  /** Primary action, "go", live, principals. */
  lime: "#CBFB5E",
  /** Trust, AI, premium, intermediaries. */
  violet: "#8B6BFF",
  /** The lighter violet that closes the premium button gradient. */
  violetLift: "#A98BFF",
  /** Violet at text weight, for tinted surfaces. */
  violetInk: "#B6A2FF",
  /** Verified, service providers. */
  cyan: "#3FE0C5",
  /** Institutional tier (L4), institutions. */
  gold: "#F5C542",
  /** Alerts and errors ONLY. Never decoration. */
  coral: "#FF6B5C",
  /** L1 identity tier, and neutral chip text. */
  slate: "#C2CCD8",
} as const;

/** Cards over obsidian. */
export const GLASS_FILL = "rgba(255,255,255,.05)";
/** Borders and dividers. The bundle uses .08 to .12 depending on weight. */
export const HAIRLINE = {
  soft: "rgba(255,255,255,.08)",
  DEFAULT: "rgba(255,255,255,.10)",
  strong: "rgba(255,255,255,.12)",
} as const;

/**
 * Logo arc, trust dial and AI blocks. Left to right, always this order:
 * the lime pier leads, the cyan pier closes.
 */
export const BRIDGE_GRADIENT = `linear-gradient(90deg, ${COLOR.lime}, ${COLOR.violet}, ${COLOR.cyan})`;

/** Premium / verify CTA. */
export const VIOLET_GRADIENT = `linear-gradient(120deg, ${COLOR.violet}, ${COLOR.violetLift})`;

/**
 * Verification tier ramp. L1 through L4, each a foreground on a tinted
 * background. Rendered by the C2 tier badge; nothing else may invent a tier
 * colour.
 */
export const TIER = {
  1: { label: "Identity", fg: COLOR.slate, bg: "rgba(154,167,184,.16)" },
  2: { label: "Business", fg: COLOR.cyan, bg: "rgba(63,224,197,.15)" },
  3: { label: "Activity", fg: COLOR.violetInk, bg: "rgba(139,107,255,.2)" },
  4: { label: "Institutional", fg: COLOR.gold, bg: "rgba(245,197,66,.16)" },
} as const;

export type TierLevel = keyof typeof TIER;

/**
 * Profile-icon category colours, and the ~14% alpha tint the icon tile sits
 * on. Principals lime, intermediaries violet, services cyan, institutions
 * gold: the same four-way split the board uses to say what someone is.
 */
export const PROFILE_CATEGORY = {
  principals: { fg: COLOR.lime, tint: "rgba(203,251,94,.13)" },
  intermediaries: { fg: COLOR.violet, tint: "rgba(139,107,255,.16)" },
  services: { fg: COLOR.cyan, tint: "rgba(63,224,197,.14)" },
  institutions: { fg: COLOR.gold, tint: "rgba(245,197,66,.15)" },
} as const;

export type ProfileCategory = keyof typeof PROFILE_CATEGORY;

/** Which category each of the 17 trade profiles belongs to. */
export const PROFILE_CATEGORY_OF = {
  manufacturer: "principals",
  producer: "principals",
  trader: "principals",
  distributor: "principals",
  importer: "principals",
  exporter: "principals",
  broker: "intermediaries",
  agency: "intermediaries",
  service: "services",
  logistics: "services",
  inspection: "services",
  finance: "services",
  customs: "services",
  warehouse: "services",
  insurance: "services",
  chamber: "institutions",
  authority: "institutions",
} as const;

/**
 * Motion. Durations in ms, all of it behind prefers-reduced-motion.
 * Ambient glow is deliberately absent: it is static, because an infinite
 * blur loop costs more frame budget than it is worth.
 */
export const MOTION = {
  /** Staggered entrance rise, translateY 18 to 0 plus fade. */
  rise: 600,
  /** Delay step between staggered children. */
  riseStagger: 80,
  /** Bridge route draw, stroke-dashoffset. */
  routeDraw: 1500,
  /** Trust dial sweep, stroke-dashoffset 113 to target. */
  dialSweep: 1500,
  /** Live pulse dot, expanding ring. */
  pulse: 1800,
} as const;
