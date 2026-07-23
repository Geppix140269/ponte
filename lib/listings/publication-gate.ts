// The publication gate (brief 3.5).
//
// An admin must not be able to approve a listing unless every one of the six
// conditions below holds. This is the single place that decides, and the admin
// server action calls it before it writes an approval. It is enforced here, in
// code, not in admin copy, so a hand-crafted form post cannot get past it
// either.
//
// It is pure and takes a snapshot: the stored listing facts plus a small
// projection of the submitter's verification. It returns every failure, not
// the first, so the desk sees the whole reason a listing cannot go out.
//
// The member-status rule is imported from the verification purpose module by a
// relative path so this stays runnable by the standalone test runner: only a
// member's own business verification can satisfy condition 1, exactly the gate
// Block B established.

import { grantsMemberStatus } from "../verification/purpose";
import { meetsApprovalMinimum, type ApprovalFacts } from "./approval-minimum";
import { isListingCurrent } from "./validity";

/** The desk-approved public text. Not raw model output (brief 5.3). */
export type DeskVersion = {
  qualification?: string | null;
  limitations?: string | null;
} | null;

export type GateListing = ApprovalFacts & {
  submitter_role?: string | null;
  desk_version?: DeskVersion;
};

/**
 * The verification statuses that represent a passing member-business check.
 * `auto_verified` is the pipeline's clean pass; `verified` is a human approval.
 * A `review` (including a re-screen suspension), `failed`, `rejected`,
 * `pending` or `needs_selection` case is NOT passing and must not publish.
 */
export const PASSING_VERIFICATION_STATUSES = new Set(["auto_verified", "verified"]);

/** A member business is granted at level 2; a re-screen suspension drops it. */
export const MEMBER_BUSINESS_MIN_LEVEL = 2;

/** What the gate needs to know about the submitter's own business check. */
export type GateSubmitter = {
  /** The profile's LIVE verification level. A suspension drops this below 2. */
  verificationLevel: number | null;
  /** The profile's bound member-business verification, or null if none. */
  business_verification_id: string | null;
  /** The bound verification row, projected. Null if it could not be read. */
  verification: {
    purpose: string | null;
    /** The live case status. Only a passing status may publish. */
    status: string | null;
    sanctions_hits: { clean?: boolean; strongCount?: number } | null;
  } | null;
};

export type GateFailure =
  | "no_verified_business"
  | "verification_not_member_business"
  | "verification_not_passing"
  | "verification_not_current"
  | "unresolved_sanctions"
  | "no_role"
  | "no_public_qualification"
  | "no_public_limitations"
  | "not_current"
  | `missing:${string}`;

export type GateResult = { ok: true } | { ok: false; failures: GateFailure[] };

const has = (v: unknown): boolean =>
  v !== null && v !== undefined && String(v).trim() !== "";

/**
 * The gate. Every failure that applies is reported.
 */
export function checkPublicationGate(
  listing: GateListing,
  submitter: GateSubmitter,
  now: number = Date.now(),
): GateResult {
  const failures: GateFailure[] = [];

  // 1. A CURRENT verified-member-business record. A bound id is not enough: a
  //    re-screen suspension leaves the binding in place while dropping the
  //    profile level and moving the case to review, so the gate checks the live
  //    state, not merely that a binding exists.
  //      - the profile must point at a verification (business_verification_id);
  //      - that verification must be the member's own business (member_business);
  //      - it must carry a passing status (not review/failed/rejected/pending);
  //      - the profile's live level must still be at or above the member floor.
  const boundVerification =
    has(submitter.business_verification_id) && submitter.verification;
  if (!has(submitter.business_verification_id)) {
    failures.push("no_verified_business");
  } else if (!submitter.verification || !grantsMemberStatus(submitter.verification.purpose)) {
    failures.push("verification_not_member_business");
  } else {
    if (!PASSING_VERIFICATION_STATUSES.has(submitter.verification.status ?? "")) {
      failures.push("verification_not_passing");
    }
    if (Number(submitter.verificationLevel ?? 0) < MEMBER_BUSINESS_MIN_LEVEL) {
      failures.push("verification_not_current");
    }
  }

  // 2. No unresolved high-risk sanctions candidate on that record. A member
  //    business only auto-binds when sanctions were clean, but the gate
  //    re-checks the stored screening rather than trusting the binding: clean,
  //    and no strong candidates.
  if (boundVerification) {
    const s = submitter.verification?.sanctions_hits;
    const clean = s?.clean === true && (s?.strongCount ?? 0) === 0;
    if (!clean) failures.push("unresolved_sanctions");
  }

  // 3. The submitter's role is recorded.
  if (!has(listing.submitter_role)) failures.push("no_role");

  // 4. The required opportunity facts are present (brief 5.2).
  const min = meetsApprovalMinimum(listing);
  if (!min.ok) {
    for (const key of min.missing) failures.push(`missing:${key}` as GateFailure);
  }

  // 5. The public qualification and limitations text is present. This is the
  //    desk-approved text, written by a human from the fact-only draft; the
  //    gate does not accept raw model output in its place.
  if (!has(listing.desk_version?.qualification)) failures.push("no_public_qualification");
  if (!has(listing.desk_version?.limitations)) failures.push("no_public_limitations");

  // 6. The opportunity is current: validity declared, and a dated one not past.
  if (!isListingCurrent(listing.validity_type, listing.valid_until, now)) {
    failures.push("not_current");
  }

  return failures.length ? { ok: false, failures } : { ok: true };
}

/** A short, human sentence for each failure, for the admin outcome banner. */
export function gateFailureLabel(failure: GateFailure): string {
  if (failure.startsWith("missing:")) {
    return `a required fact is missing (${failure.slice("missing:".length)})`;
  }
  switch (failure) {
    case "no_verified_business":
      return "the submitter has no verified member-business record";
    case "verification_not_member_business":
      return "the submitter's bound verification is not their own business";
    case "verification_not_passing":
      return "the submitter's business verification is not in a passing state (suspended, in review or failed)";
    case "verification_not_current":
      return "the submitter's member-business level is not current (below the member floor)";
    case "unresolved_sanctions":
      return "the submitter's business has an unresolved sanctions candidate";
    case "no_role":
      return "the submitter's role is not recorded";
    case "no_public_qualification":
      return "the public qualification summary has not been written";
    case "no_public_limitations":
      return "the public limitations statement has not been written";
    case "not_current":
      return "the opportunity has no current validity";
    default:
      return failure;
  }
}
