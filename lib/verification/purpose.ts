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

/**
 * The attestation a member makes before a badge-granting check runs. Stored by
 * version, not by copy: the row records which version was accepted and when, and
 * this constant maps the version to the exact words shown. Bump the version if
 * the wording changes, so an old acceptance is never silently reinterpreted.
 */
export const MEMBER_BUSINESS_ATTESTATION = {
  version: "represent-own-business/v1",
  text: "This is the business I represent on Ponte.",
} as const;

/** A member-business verification requires an explicit attestation; a counterparty check never does. */
export function requiresAttestation(purpose: unknown): boolean {
  return normalizePurpose(purpose) === "member_business";
}

/**
 * Only a strict boolean `true` is an accepted attestation. A missing value,
 * `false`, the string "true", 1, or any other shape is not an attestation, so a
 * badge-eligible check cannot be opened by a request that merely looks like it
 * attested.
 */
export function attestationAccepted(input: unknown): boolean {
  return input === true;
}

export type AttestationCheck = { ok: true } | { ok: false; error: string };

/**
 * The server-side gate. A member-business verification may only proceed with an
 * explicit affirmative attestation; a counterparty check proceeds without one.
 * Used by the API route before any row is created, so a direct request cannot
 * bypass the checkbox.
 */
export function checkAttestation(
  purpose: unknown,
  attestation: unknown,
): AttestationCheck {
  if (requiresAttestation(purpose) && !attestationAccepted(attestation)) {
    return {
      ok: false,
      error: "To verify your own business, confirm you represent it.",
    };
  }
  return { ok: true };
}
