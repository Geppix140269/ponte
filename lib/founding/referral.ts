/**
 * Founding-invitation referral attribution (brief Block F). Pure logic: the
 * allowlist, the normaliser and the set-once persistence rule. No database, no
 * Next, no cookies API, so the unit test runs standalone under tsx.
 *
 * A hard rule this module encodes: a referral code is ATTRIBUTION ONLY. It is
 * never read for authorisation, verification currency, badge eligibility or
 * payment. It records how a member arrived, nothing more. The functions below
 * return only an allowlisted code or null, so an arbitrary or tampered value
 * can never be persisted, and nothing downstream can grant an entitlement from
 * one.
 */

/** The general Founding Network link's own code, used when no `ref` is given. */
export const FOUNDING_CODE = "founding";

/**
 * The short allowlist. Grow it by adding a code here; no schema change is
 * needed because profiles.referral_code carries no database check constraint.
 * Codes are lower case, letters/digits/hyphen, kept deliberately human.
 */
export const ALLOWED_REFERRAL_CODES: ReadonlySet<string> = new Set([FOUNDING_CODE]);

/** The first-party cookie that carries the captured code from entry to signup. */
export const REFERRAL_COOKIE = "ponte_ref";

/** How long the captured code survives between first entry and signup. */
export const REFERRAL_MAX_AGE_DAYS = 30;

export function isAllowedReferral(code: string): boolean {
  return ALLOWED_REFERRAL_CODES.has(code);
}

/**
 * Normalise a raw value (URL param or cookie) to an allowlisted code, or null.
 * Trims, lower-cases, and rejects anything not on the allowlist. This is the
 * single authoritative gate: capture and persistence both pass through it, so a
 * hand-crafted cookie or a bogus `?ref` yields null and is never stored.
 */
export function normalizeReferral(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toLowerCase();
  return isAllowedReferral(code) ? code : null;
}

/**
 * Decide what to persist on the member profile. Set-once: an existing
 * attribution is never overwritten, so a member's origin is recorded exactly
 * once and a later visit with a different code cannot change it. Returns the
 * code to write, or null to write nothing.
 */
export function referralToPersist(
  existing: string | null | undefined,
  cookieRaw: string | null | undefined,
): string | null {
  if (existing) return null;
  return normalizeReferral(cookieRaw);
}
