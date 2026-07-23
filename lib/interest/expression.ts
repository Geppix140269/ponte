/**
 * The structured expression of interest a member sends on a listing (brief
 * Block D). Pure logic only: the field set, the closed role vocabulary, the
 * normaliser the API trusts, and the completeness rule. No database, no Next,
 * no server imports, so the unit test runs standalone under tsx.
 *
 * Why a module and not inline validation in the route: the "meaningful,
 * structured request" the brief requires is defined HERE, once, and the same
 * definition is what the test pins. The route cannot quietly accept a bare
 * connect again without this rule failing.
 */

/** The interested party's role, a closed set (brief Block D). */
export type InterestRole = "buyer" | "seller" | "distributor" | "intermediary";

export const INTEREST_ROLES: readonly InterestRole[] = [
  "buyer",
  "seller",
  "distributor",
  "intermediary",
];

/** English labels for the new chrome. Block E migrates these to messages. */
export const INTEREST_ROLE_LABELS: Record<InterestRole, string> = {
  buyer: "Buyer",
  seller: "Seller",
  distributor: "Distributor",
  intermediary: "Intermediary",
};

export function isInterestRole(v: unknown): v is InterestRole {
  return typeof v === "string" && (INTEREST_ROLES as readonly string[]).includes(v);
}

/** The persisted, cleaned shape. Role is validated; everything else is text. */
export type ExpressionOfInterest = {
  interested_business: string;
  interest_role: InterestRole | null;
  interest_target: string;
  interest_geography: string;
  interest_reason: string;
};

/** Field caps. Long enough for a real answer, short enough to bound a row. */
const CAP = {
  interested_business: 160,
  interest_target: 300,
  interest_geography: 160,
  interest_reason: 600,
} as const;

/** Trim, collapse whitespace and clamp. A non-string becomes "". */
function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

const EMAIL_RE = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;
const BARE_DOMAIN_RE =
  /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|co|eu|us|uk|de|it|fr|es|pt|ru|cn|in|info|biz|app|dev|me|trade)\b/gi;
// A run that could be a phone number: digits with the usual separators.
const PHONE_RUN_RE = /\+?\d[\d\s().-]{5,}\d/g;

/**
 * Redact obvious direct-contact details from a free-text field (brief Block D
 * follow-up). These fields are shown to the listing owner BEFORE acceptance, so
 * an email, phone number or URL smuggled into them would bypass the disclosure
 * gate that withholds contact until the owner accepts. Emails, URLs and bare
 * domains go first; then digit runs long enough to be a phone number (>= 7
 * digits, so a quantity like "12000 MT" or "2 x 20ft" is left alone).
 *
 * Redaction, not rejection: a legitimate request is never blocked, and the
 * owner still sees the substance with the contact hole plugged.
 */
export function stripContact(input: string): string {
  const out = input
    .replace(EMAIL_RE, "[removed]")
    .replace(URL_RE, "[removed]")
    .replace(BARE_DOMAIN_RE, "[removed]")
    .replace(PHONE_RUN_RE, (m) => (m.replace(/\D/g, "").length >= 7 ? "[removed]" : m));
  return out.replace(/\s+/g, " ").trim();
}

/**
 * Normalise a raw request body into the stored shape. Unknown roles become
 * null (the completeness check then rejects the request), never a silent
 * default: a request that claims no valid role is not a valid role.
 */
export function cleanInterest(input: unknown): ExpressionOfInterest {
  const o = (input ?? {}) as Record<string, unknown>;
  const role = o.interest_role ?? o.role;
  return {
    // Business identity is disclosed only AFTER acceptance, so it is not
    // scrubbed here; the other three are shown to the owner pre-acceptance and
    // must not carry a back-channel contact.
    interested_business: clean(o.interested_business ?? o.business, CAP.interested_business),
    interest_role: isInterestRole(role) ? role : null,
    interest_target: stripContact(clean(o.interest_target ?? o.target, CAP.interest_target)),
    interest_geography: stripContact(clean(o.interest_geography ?? o.geography, CAP.interest_geography)),
    interest_reason: stripContact(clean(o.interest_reason ?? o.reason, CAP.interest_reason)),
  };
}

/**
 * The minimum the brief requires before an expression of interest may be sent:
 * the interested business, the role, the target quantity/timing or supply
 * capability, the geography and a short reason for fit. Every one is mandatory,
 * because an owner deciding on substance needs all five present; a missing one
 * is exactly the bare connect Block D removes.
 */
export function missingInterestFields(e: ExpressionOfInterest): string[] {
  const missing: string[] = [];
  if (!e.interested_business) missing.push("interested_business");
  if (!e.interest_role) missing.push("interest_role");
  if (!e.interest_target) missing.push("interest_target");
  if (!e.interest_geography) missing.push("interest_geography");
  if (!e.interest_reason) missing.push("interest_reason");
  return missing;
}

export function interestIsComplete(e: ExpressionOfInterest): boolean {
  return missingInterestFields(e).length === 0;
}
