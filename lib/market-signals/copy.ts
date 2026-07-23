/**
 * The two load-bearing Market Signal constants, verbatim from the Definitive
 * 1 August brief (section 1.2). These are the exact strings a public signal
 * must show, the tests assert on them, and they must read identically on every
 * locale, so they are not paraphrased and not translated.
 *
 * ---------------------------------------------------------------------------
 * Why these two live in lib/ and not in a message file
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
 *      translation, the same way Terms and the verification disclaimer do.
 *
 * Block E moved the surrounding chrome (board headings, nav, card and detail
 * labels, the investigate form) into the "marketSignals" message namespace and
 * the "signals" nav key, and localised it across all ten locales. These two
 * strings stayed here on purpose.
 */

/** The badge every Market Signal card and detail header must carry. */
export const SIGNAL_BADGE = "External market signal — not yet verified by Ponte";

/** The full disclaimer, shown near the title on the detail page (brief 1.2). */
export const SIGNAL_DISCLAIMER =
  "This information was identified through external market research. Ponte has not yet verified the participant, the continuing availability of the requirement or offer, or their authority to transact.";
