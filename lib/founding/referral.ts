/**
 * Founding-invitation referral attribution (brief Block F). Pure logic: the
 * allowlist, the normaliser, the cookie parser and the new-signup eligibility
 * rule. No database, no Next, no cookies API, so the unit test runs standalone
 * under tsx.
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

/**
 * Slack allowed between the invitation-capture time (the visitor's browser
 * clock) and the account-creation time (the server clock) when deciding
 * eligibility. It absorbs ordinary clock skew so a genuine new signup is not
 * missed, while staying far below the age of any established account, which is
 * created hours, days or weeks before the invitation and is never attributed.
 */
export const ELIGIBILITY_SKEW_MS = 10 * 60 * 1000;

export function isAllowedReferral(code: string): boolean {
  return ALLOWED_REFERRAL_CODES.has(code);
}

/**
 * Normalise a raw value to an allowlisted code, or null. Trims, lower-cases,
 * and rejects anything not on the allowlist. This is the single authoritative
 * gate for the code itself: capture, cookie parsing and persistence all pass
 * through it, so a hand-crafted value yields null and is never stored.
 */
export function normalizeReferral(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toLowerCase();
  return isAllowedReferral(code) ? code : null;
}

export type ReferralCookie = { code: string; issuedAt: number };

/**
 * Parse the referral cookie, which carries `<code>.<issuedAtMs>`. The issued-at
 * timestamp is what lets attribution require a genuinely new signup: the
 * account must be created at or after the moment the invitation was captured.
 * Returns null for a missing timestamp, a non-allowlisted code, or a bad
 * number, so a legacy or tampered cookie simply attributes nothing.
 */
export function parseReferralCookie(raw: unknown): ReferralCookie | null {
  if (typeof raw !== "string") return null;
  const dot = raw.indexOf(".");
  if (dot < 0) return null;
  const code = normalizeReferral(raw.slice(0, dot));
  if (!code) return null;
  const issuedAt = Number(raw.slice(dot + 1));
  if (!Number.isFinite(issuedAt) || issuedAt <= 0) return null;
  return { code, issuedAt };
}

/**
 * Decide what to persist on the member profile, for a signed-in member whose
 * account was created at `createdAtMs`.
 *
 * Three guards, all of which must pass:
 *   - set-once: an existing attribution is never overwritten;
 *   - allowlist: only an allowlisted code from a well-formed cookie qualifies;
 *   - new-signup: the account must have been created at or after the invitation
 *     was captured (within a small skew). An established profile, created well
 *     before the invitation, is never retroactively attributed just because the
 *     member later visits /join and /account.
 *
 * Returns the code to write, or null to write nothing.
 */
export function referralToPersist(
  existing: string | null | undefined,
  cookieRaw: string | null | undefined,
  createdAtMs: number | null | undefined,
): string | null {
  if (existing) return null;
  const parsed = parseReferralCookie(cookieRaw);
  if (!parsed) return null;
  if (typeof createdAtMs !== "number" || !Number.isFinite(createdAtMs)) return null;
  if (createdAtMs >= parsed.issuedAt - ELIGIBILITY_SKEW_MS) return parsed.code;
  return null;
}
