/**
 * The mandatory Market Signal copy, verbatim from the Definitive 1 August brief
 * (sections 1.2 and 5). These are the exact strings a public signal must show,
 * and the tests assert on them, so they are not paraphrased and not translated.
 *
 * ---------------------------------------------------------------------------
 * Why this lives in lib/ and not in a message file
 * ---------------------------------------------------------------------------
 * Two reasons, both deliberate:
 *
 *   1. The badge contains an em dash, which check-encoding.mjs bans in app/ and
 *      components/. Precedent is VERIFICATION_DISCLAIMER in
 *      lib/verification/pipeline.ts: a liability-shaped constant that renders in
 *      English on every locale. lib/ is checked for BOM and mojibake but not for
 *      em dashes, so the exact character is allowed to live here.
 *   2. The disclaimer is the load-bearing honesty of the whole Market Signal
 *      surface. It must read identically everywhere and must not drift through a
 *      translation. Block E moves the surrounding chrome (board headings, nav)
 *      into the message fragments; this specific text stays a constant on
 *      purpose, the same way Terms and the verification disclaimer do.
 */

/** The badge every Market Signal card and detail header must carry. */
export const SIGNAL_BADGE = "External market signal — not yet verified by Ponte";

/** The full disclaimer, shown near the title on the detail page (brief 1.2). */
export const SIGNAL_DISCLAIMER =
  "This information was identified through external market research. Ponte has not yet verified the participant, the continuing availability of the requirement or offer, or their authority to transact.";

/** Primary CTA on every signal (brief 1.2). */
export const ASK_PONTE_CTA = "Ask Ponte to investigate";

/**
 * Contextual secondary CTA (blueprint P06). A buy signal invites a supplier; a
 * sell signal invites a buyer. `side` matches desk_radar.side.
 */
export function secondaryCtaFor(side: string | null | undefined): string {
  return side === "requirement"
    ? "I may be able to supply this"
    : "I may be interested in buying this";
}

/**
 * What Ponte has NOT yet established for any unconfirmed signal (blueprint P06,
 * step 5). Rendered as a list so the reader sees the limits, not just the facts.
 */
export const SIGNAL_UNKNOWNS: readonly string[] = [
  "Who is behind the requirement or offer",
  "The company and its authority to transact",
  "Whether the requirement or offer is still current",
  "Whether the participant is willing to be introduced",
];

/**
 * Interim English chrome for the Block A Market Signal surface. Block E moves
 * these into messages/_fragments and rebuilds the locales; until then they read
 * in English, consistent with the admin area and the legal pages.
 */
export const SIGNALS_NAV_LABEL = "Market Signals";
export const SIGNALS_BOARD_HEADING = "Recent demand worth investigating";
export const SIGNALS_BOARD_INTRO =
  "Ponte identifies recent indications of buyer demand and seller availability through external market research. These are not verified opportunities. Ask Ponte to establish who is behind a signal, whether it is still current, and whether a qualified introduction can be arranged.";
export const SIGNALS_BOARD_EMPTY =
  "Selected signals are being reviewed. Nothing is shown here until an administrator has approved it for display.";
export const SIGNAL_KNOWN_HEADING = "What Ponte currently knows";
export const SIGNAL_UNKNOWN_HEADING = "What Ponte has not yet established";
export const SIGNAL_TOMBSTONE = "This market signal is no longer active.";
