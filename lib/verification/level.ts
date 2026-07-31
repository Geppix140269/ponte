// The member verification level: one vocabulary, one ranking, one floor.
//
// THE DEFECT THIS REPLACES
//
// `profiles.verification_level` is `text` in production. `20260721g` declared
// it `int not null default 0`, but the column already existed, so
// `add column if not exists` did nothing and the migration reported success
// while changing nothing.
//
// Three writers then disagreed into one column: the pipeline wrote `2`, the
// re-screen wrote `1`, the seed wrote `'company_verified'`. Twelve readers
// compared it with `Number(...)`. `Number("company_verified")` is `NaN`, and
// `NaN < 2` is `false`, so the guard did not fire and EVERY text value passed
// the floor, `unverified` included.
//
// An interim fix required a finite number, which closed the hole but made the
// real stored values fail. This module replaces both with one semantic model.
//
// WHY THE RANK OF AN UNKNOWN VALUE IS -1
//
// Not 0. `unverified` is a claim ("we checked nothing"); an unrecognised value
// is the absence of a claim, and the two must not compare equal. Ranking below
// the lowest real value means no comparison, coercion or default can turn a
// typo, a legacy integer or a null into a passing level.
//
// `indexOf` returns -1 for anything absent, so fail-closed is a property of the
// data structure rather than a branch somebody can forget to write.
//
// Pure and import-free, for the standalone test runner.

/**
 * The canonical levels, in ascending order of what has been established.
 *
 * Email and phone verification are deliberately NOT here. They are independent
 * account attributes, not points on a business-verification scale, and belong
 * in their own columns (`email_verified_at`, `phone_verified_at`). Putting them
 * on this scale would imply that confirming a phone number is progress towards
 * confirming a company, which it is not.
 */
export const VERIFICATION_LEVELS = [
  /** Nothing established about the business. The default. */
  "unverified",
  /** A person's identity was established. The business was not. */
  "identity_verified",
  /** The legal entity was established against a registry. */
  "company_verified",
] as const;

export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];

export function isVerificationLevel(v: unknown): v is VerificationLevel {
  return typeof v === "string" && (VERIFICATION_LEVELS as readonly string[]).includes(v);
}

/**
 * The rank of a stored level, or **-1** for anything not in the set.
 *
 * -1 covers null, undefined, the empty string, wrong case, retired values, the
 * legacy integers `0`/`1`/`2` and their string forms, and any non-string. All
 * of them sort below `unverified` and therefore below every threshold.
 */
export function levelRank(v: unknown): number {
  return typeof v === "string"
    ? (VERIFICATION_LEVELS as readonly string[]).indexOf(v)
    : -1;
}

/** The level a member business must reach before Ponte will publish for them. */
export const MEMBER_BUSINESS_MIN_LEVEL: VerificationLevel = "company_verified";

/**
 * Does this stored value meet the member-business floor?
 *
 * The only value that returns true is `company_verified`. Everything else,
 * including every value the old numeric model accepted, returns false.
 */
export function meetsMemberBusinessFloor(v: unknown): boolean {
  const rank = levelRank(v);
  return rank >= 0 && rank >= levelRank(MEMBER_BUSINESS_MIN_LEVEL);
}

/**
 * The level at which a member's IDENTITY counts as established for Deal Room
 * admission. ADR-0021 ruling 2.
 *
 * ## Why this is a separate constant from MEMBER_BUSINESS_MIN_LEVEL
 *
 * They are different thresholds for different acts and must never share a
 * value by accident. `MEMBER_BUSINESS_MIN_LEVEL` is the PUBLICATION floor: what
 * Ponte requires before it will publish a listing on a member's behalf, and it
 * is `company_verified` because publication is Ponte asserting something public
 * about a business.
 *
 * Deal Room admission is not publication. The owner ruled on 31 July 2026:
 *
 *   "A complete Passport and a registry-checked business are not required
 *    merely to enter."
 *
 * which restates `PT-PRODUCT-2026-07-27-01` section 6, "A complete Passport is
 * not required for entry." So `company_verified` is explicitly NOT the Deal
 * Room floor, and this constant is deliberately the rung below it.
 *
 * ## Why it is only one part of the Deal Room floor
 *
 * The real Deal Room threshold is the NINE criteria of section 6 evaluated as a
 * set, and it lives in `lib/deal-room/admissibility.ts`. This constant is the
 * stored evidence for exactly one of them - the authenticated individual whose
 * identity has been established. The business facts, the declared role and the
 * declared authority are equally part of the floor and are checked there, not
 * here, because no rung on this three-value scale expresses them.
 *
 * That gap is real and is recorded rather than hidden: section 6 asks for an
 * "identified business", which sits between `identity_verified` (a person, not
 * a business) and `company_verified` (a business matched to a registry). This
 * scale has no rung for "business identified but not registry-checked", so the
 * admissibility module checks the declared business facts directly instead of
 * pretending a rung means something it does not.
 *
 * ## Changing it
 *
 * One line. Moving it to `company_verified` would require registry-checking to
 * enter, which the owner has ruled out; moving it to `unverified` would remove
 * identity from the floor entirely. Both are single-token edits and both are
 * covered by `lib/deal-room/__tests__/admissibility.test.ts`.
 */
export const DEAL_ROOM_IDENTITY_MIN_LEVEL: VerificationLevel = "identity_verified";

/**
 * Does this stored value establish identity to the Deal Room standard?
 *
 * `company_verified` passes as well, because it is strictly more than the floor
 * asks for. `unverified`, and every unrecognised value, does not.
 */
export function meetsDealRoomIdentityFloor(v: unknown): boolean {
  const rank = levelRank(v);
  return rank >= 0 && rank >= levelRank(DEAL_ROOM_IDENTITY_MIN_LEVEL);
}

/**
 * The level to store when a member-business verification passes.
 *
 * Named rather than inlined so the pipeline cannot drift from the floor: if the
 * floor ever moves, this moves with it.
 */
export const LEVEL_ON_COMPANY_VERIFIED: VerificationLevel = "company_verified";

/**
 * The level to store when a previously passing verification is suspended.
 *
 * The intent of a re-screen suspension is "drop below the floor", not "reach a
 * particular level". `identity_verified` is the honest landing place: a person
 * was checked, the business standing has lapsed.
 */
export const LEVEL_ON_SUSPENSION: VerificationLevel = "identity_verified";

/**
 * The next level up, for the admin promotion control. Clamped at the top.
 *
 * Replaces `Number(current) + 1`, which could count past the end of the set and
 * produce a level that does not exist.
 */
export function nextLevel(v: unknown): VerificationLevel {
  const rank = levelRank(v);
  const next = Math.min(Math.max(rank, -1) + 1, VERIFICATION_LEVELS.length - 1);
  return VERIFICATION_LEVELS[next];
}

/** The higher of two levels. An unrecognised value never wins. */
export function higherLevel(a: unknown, b: unknown): VerificationLevel {
  const ra = levelRank(a);
  const rb = levelRank(b);
  const best = Math.max(ra, rb);
  return best < 0 ? "unverified" : VERIFICATION_LEVELS[best];
}

/**
 * The level an admin approval grants, from `verifications.level_requested`.
 *
 * `level_requested` is an integer 1 to 3 on the verifications table, describing
 * how deep a check was asked for. It is NOT the profile level and never was;
 * the old code wrote it straight into the profile column, which is one of the
 * ways three vocabularies ended up in one field.
 *
 * Tier 1 establishes a person. Tier 2 and 3 establish the company, and the
 * three-value model has nothing above `company_verified`, so both land there.
 */
export function levelForRequestedTier(tier: unknown): VerificationLevel {
  const n = typeof tier === "number" ? tier : Number(tier);
  if (!Number.isFinite(n) || n < 1) return "unverified";
  return n >= 2 ? "company_verified" : "identity_verified";
}

/**
 * Has anything at all been established about this member?
 *
 * The tier badge asks this. It exists so no surface has to write
 * `level > 0`, which is the same numeric comparison this model removes, just
 * one step further from the column.
 */
export function hasEstablishedLevel(v: unknown): boolean {
  return levelRank(v) > levelRank("unverified");
}

/** What a member is told. Never the stored token. */
export function levelLabel(v: unknown): string {
  switch (v) {
    case "company_verified": return "Business checked";
    case "identity_verified": return "Identity checked";
    case "unverified": return "Not checked";
    default: return "Not checked";
  }
}
