// What a verification is FOR, and the single rule that decides whether it may
// touch the requester's own account (Definitive 1 August brief, Block B / §3.2).
//
// Two purposes, and only two:
//   - member_business: the member is verifying the business THEY represent.
//     Only this may raise their verification level, add trust components, set
//     verified_at, and create the public member badge.
//   - counterparty_check: the member is checking somebody else's company. It
//     produces a case result for them and NEVER changes their own level, trust
//     score or badge.
//
// The purpose is stored on the verification row and is never inferred from page
// copy. This module is pure, so the rule is unit-tested rather than trusted, and
// it is imported by the pipeline, the admin queue and the re-screen so all three
// gate the same way.

export type VerificationPurpose = "member_business" | "counterparty_check";

export const VERIFICATION_PURPOSES: readonly VerificationPurpose[] = [
  "member_business",
  "counterparty_check",
];

/**
 * Normalise any input to a valid purpose. Anything that is not EXACTLY
 * "member_business" becomes "counterparty_check". This is the safe default: the
 * only way to earn a badge is to say, explicitly, that this is your own
 * business, so a missing, misspelled or hostile value can never grant one.
 */
export function normalizePurpose(input: unknown): VerificationPurpose {
  return input === "member_business" ? "member_business" : "counterparty_check";
}

/**
 * The one gate. May a verification of this purpose grant the requester the
 * member badge, a higher level, trust components or verified_at? Only a
 * member-business verification may. A legacy row with a null/unknown purpose is
 * treated as a counterparty check, which grants nothing.
 */
export function grantsMemberStatus(purpose: unknown): boolean {
  return normalizePurpose(purpose) === "member_business";
}
