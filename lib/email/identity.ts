// Who an email is about, and what it is allowed to call them.
//
// This module exists because of a specific live defect. The listing
// notification was built by handing the desk-submission template whatever was
// nearest:
//
//     name:    memberEmail          -> "giuseppe@padelsitges.com"
//     company: `Marketplace listing ${ref}`  -> "Marketplace listing PT-0102"
//
// So the operator's alert showed an email address where a person's name belongs
// and a listing reference where a company belongs, and the listing reference —
// the one field that identifies the record — had nowhere of its own to live.
// Neither value was wrong by accident: each was the only string in scope at the
// point the object was built.
//
// The fix is a type. An identity has three named fields and a reference is not
// one of them, so the substitution that produced that email is no longer
// expressible.
//
// Pure and import-free.

export type MemberIdentity = {
  /** Display name or full name. NEVER the email address. */
  name: string | null;
  /** Verified or declared business name. Never fabricated, never a reference. */
  company: string | null;
  email: string;
};

const clean = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};

/**
 * Build an identity from the fields a profile actually carries.
 *
 * Every fallback here is deliberate and none of them invents anything:
 *
 *   - a display name beats a full name beats nothing;
 *   - the email address is NOT a fallback for the name. An address is not
 *     what somebody is called, and printing one as a name is what produced
 *     the defect this module exists to prevent;
 *   - a company is a company or it is absent. There is no derivation from the
 *     email domain, no "Unknown Ltd", and no listing reference.
 */
export function memberIdentity(profile: {
  display_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  company_name?: string | null;
  company?: string | null;
  business_name?: string | null;
  email?: string | null;
}): MemberIdentity {
  return {
    name:
      clean(profile.display_name) ??
      clean(profile.full_name) ??
      clean(profile.name),
    company:
      clean(profile.company_name) ??
      clean(profile.business_name) ??
      clean(profile.company),
    email: clean(profile.email) ?? "",
  };
}

/**
 * How the email opens.
 *
 * A neutral "Hello" when there is no name. Not "Hello giuseppe@..." and not
 * "Hello there" — the first is the defect, the second is a voice Ponte does not
 * have.
 */
export function salutation(identity: Pick<MemberIdentity, "name">): string {
  return identity.name ? `Hello ${identity.name},` : "Hello,";
}

/**
 * The company, for an INTERNAL operator view.
 *
 * "Not provided" is honest and actionable for an operator. It is never shown to
 * the member as a description of themselves.
 */
export function companyForOperator(identity: Pick<MemberIdentity, "company">): string {
  return identity.company ?? "Not provided";
}

/**
 * The name, for an INTERNAL operator view.
 *
 * An operator does need to identify the account when no name is recorded, and
 * the address is the only identifier that exists. It is labelled as the
 * fallback it is rather than presented as a name, and this is the ONLY place
 * where an address may stand in — a member-facing template must not call this.
 */
export function nameForOperator(identity: MemberIdentity): string {
  return identity.name ?? `Not provided (${identity.email || "no address"})`;
}
