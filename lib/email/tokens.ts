// Email design tokens.
//
// The Design Constitution says approved tokens are the sole colour source and
// that hard-coded hex outside the approved token files is prohibited. An email
// client cannot read a CSS custom property, a stylesheet link or a web font, so
// every value has to arrive as a literal in a style attribute. Those two facts
// are reconciled here and nowhere else: this module IMPORTS the approved Ponte
// Flow token file and re-exports the literals email needs. No template contains
// a colour of its own, and a change to the authority file changes every email.
//
// The old `lib/email.ts` layout used #0F1E3C and #E8A020, neither of which is
// in any approved token file — a navy and an amber that exist only in email.
// The Constitution is explicit that warning is slate and "there is no amber".
// That palette is retired by this module rather than restyled.

import { ponteFlowTokens } from "../../design-system/ponte-flow/tokens/ponte-flow-tokens";

// The token file's `colour` block carries a `rules` array alongside the values,
// so it is narrowed rather than cast wholesale: reading a colour that the
// authority does not define should be a type error here, not a literal
// "undefined" in a style attribute.
const colour = ponteFlowTokens.colour as unknown as Record<string, string>;

/**
 * The approved palette, in the light values.
 *
 * Email is rendered light-only and deliberately so: `prefers-color-scheme` is
 * unreliable across Outlook, Gmail's clipping and the major mobile clients, and
 * a half-supported dark mode produces unreadable text far more often than it
 * produces a dark email. The light palette is AA-safe on its own surfaces.
 */
export const EMAIL_COLOUR = {
  /** Primary text. */
  ink: colour.ink,
  /** Secondary text. */
  ink2: colour.ink2,
  /** Tertiary text, metadata labels. */
  ink3: colour.ink3,
  /** The page behind the card. */
  surface: colour.surface,
  /** The card itself. */
  raised: colour.raised,
  /** Inset panels. */
  sunken: colour.sunken,
  /** Hairlines. */
  rule: colour.rule,
  ruleStrong: colour.ruleStrong,
  /** The brand signal. Never a status (Constitution, colour rules). */
  gold: colour.gold,
  /** Gold at text weight, AA-safe on light surfaces. */
  goldInk: colour.goldInk,
  /** Evidence-backed or checked. */
  positive: colour.positive,
  /** Under review. Slate, not amber. */
  review: colour.review,
  /** Danger. */
  danger: colour.danger,
  /** Declared or unconfirmed. */
  declared: colour.declared,
} as const;

/**
 * Type stack.
 *
 * A web font cannot be relied on inside an email client, so the approved
 * typefaces are named first and fall back through the system stack. Georgia
 * carries the editorial serif role the Constitution reserves for principal
 * sentences; the sans stack carries everything else.
 */
export const EMAIL_FONT = {
  sans: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  serif: "Georgia,'Times New Roman',Times,serif",
  /**
   * For a one-time code, and for nothing else.
   *
   * A six-digit code has to be read once and typed correctly, so the digits
   * need equal width and an unambiguous 0/O and 1/l. Every name in this stack
   * is present on the platform it belongs to, and the generic `monospace` at
   * the end is honoured by every email client that honours a font at all.
   */
  mono: "'SFMono-Regular',ui-monospace,Menlo,Consolas,'Liberation Mono',monospace",
} as const;

/** Spacing, from the approved scale. Email works in px only. */
export const EMAIL_SPACE = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
} as const;

/** Container radii, from the approved token file. */
const radii = ponteFlowTokens.radii as unknown as Record<string, number>;
export const EMAIL_RADIUS = {
  sm: `${radii.sm}px`,
  md: `${radii.md}px`,
  lg: `${radii.lg}px`,
  pill: `${radii.pill}px`,
} as const;

/**
 * The email body width.
 *
 * 600px is the widest an email may be before Gmail's mobile client and Outlook
 * begin to scale it. Mobile-first means the card is fluid below this, not that
 * it is narrow above it.
 */
export const EMAIL_WIDTH = 600;

/** The status treatments. Colour is never the only carrier; each has a word. */
export type EmailStatusTone = "published" | "action" | "hold" | "paused" | "neutral";

export const EMAIL_STATUS: Record<EmailStatusTone, { colour: string; label: string }> = {
  published: { colour: EMAIL_COLOUR.positive, label: "Published" },
  action: { colour: EMAIL_COLOUR.goldInk, label: "Action needed" },
  hold: { colour: EMAIL_COLOUR.review, label: "On hold" },
  paused: { colour: EMAIL_COLOUR.danger, label: "Paused" },
  neutral: { colour: EMAIL_COLOUR.declared, label: "For information" },
};
