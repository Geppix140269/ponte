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
import { meetsMemberBusinessFloor, MEMBER_BUSINESS_MIN_LEVEL } from "../verification/level";
import { meetsApprovalMinimum, type ApprovalFacts } from "./approval-minimum";
import { isListingCurrent } from "./validity";

export { MEMBER_BUSINESS_MIN_LEVEL };

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

// The member-business floor lives in lib/verification/level.ts, which owns the
// vocabulary, the ranking and the threshold. This gate asks it and does no
// coercion of its own.
//
// Both previous models were wrong, in opposite directions, and the history is
// worth keeping. The original comparison was `Number(level ?? 0) < 2`, which
// FAILED OPEN on every value production actually stores:
// `Number("company_verified")` is `NaN`, and `NaN < 2` is `false`, so the check
// never fired. The interim repair required a finite number, which closed that
// hole but then rejected the real stored values, so a genuinely verified member
// could not publish.
//
// Both were symptoms of comparing a semantic value numerically. The vocabulary
// is semantic end to end now, and an unrecognised value ranks -1, below
// `unverified`, so the failure mode is refusing to publish.

/** What the gate needs to know about the submitter's own business check. */
export type GateSubmitter = {
  /** The profile's LIVE stored verification level. A suspension lowers it. */
  verificationLevel: string | null;
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
    if (!meetsMemberBusinessFloor(submitter.verificationLevel)) {
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

  // 5. The desk-approved public text.
  //
  //    NO LONGER A FAILURE, by ADR-0026. This required a human at Ponte to
  //    write a qualification and a limitations statement for every record
  //    before it could go out, which is precisely the manual review the owner
  //    says he cannot do and will not pretend to do:
  //
  //      > I will never be able to review personally every entry.
  //
  //    It is the reason PT-0108, PT-0109 and PT-0110 sat at "IN REVIEW" with
  //    nothing wrong with them. A record now publishes without it.
  //
  //    The purpose it served survives elsewhere and is not weakened: a
  //    published record shows the member's statements AS the member's, and
  //    `truthfulLabels` still emits "Opportunity reviewed" only where desk text
  //    genuinely exists. So a reviewed record still reads as reviewed, and an
  //    unreviewed one no longer waits forever to become one.

  // 6. The opportunity is current: validity declared, and a dated one not past.
  if (!isListingCurrent(listing.validity_type, listing.valid_until, now)) {
    failures.push("not_current");
  }

  return failures.length ? { ok: false, failures } : { ok: true };
}

/**
 * Whether a submitter's member-business verification is CURRENTLY eligible to
 * keep their approved listings public.
 *
 * This is the verification half of the gate, reused as a continuing-currency
 * check on every public read. It deliberately mirrors gate condition 1: a bound
 * record, its purpose still member-business, a passing status, and a live
 * profile level at or above the member floor. A suspended, failed, rejected,
 * mismatched or level-dropped verification is not eligible, so its owner's
 * listings drop off the public surfaces even though the listing row itself is
 * still `approved`.
 */
export function isPubliclyEligibleVerification(s: {
  verificationLevel: string | null;
  business_verification_id: string | null;
  verification: { purpose: string | null; status: string | null } | null;
}): boolean {
  if (!has(s.business_verification_id)) return false;
  if (!s.verification) return false;
  if (!grantsMemberStatus(s.verification.purpose)) return false;
  if (!PASSING_VERIFICATION_STATUSES.has(s.verification.status ?? "")) return false;
  if (!meetsMemberBusinessFloor(s.verificationLevel)) return false;
  return true;
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
