/**
 * The declaration a member accepts before Ponte will publish for them.
 *
 * Split out of `eligibility.ts` so the composer can render the exact terms the
 * validator requires without pulling the publication gate, the safety pass and
 * the quantity model into the browser bundle. One definition, two readers: the
 * screen that asks and the rule that checks.
 *
 * The version matters as much as the text. Knowing that somebody accepted terms
 * is worthless without knowing WHICH terms they accepted, so the accepted
 * version is stored with the timestamp and this constant is what a later audit
 * resolves it against. Changing the wording below means changing the version.
 */

export const DECLARATION_VERSION = "2026-07-28.1";

export const DECLARATION_TERMS: readonly string[] = [
  "The information in this listing is accurate to the best of my knowledge.",
  "I am authorised to submit this opportunity.",
  "I am permitted to use the materials I have uploaded.",
  "I understand Ponte may suspend a listing that is misleading, unlawful or abusive.",
  "I understand that publication is not verification or endorsement by Ponte.",
];
