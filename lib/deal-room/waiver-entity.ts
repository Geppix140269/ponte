/**
 * Waiver entity resolution: who is "one organisation" for the first-activation
 * waiver.
 *
 * Authority: `ADR-0029` and
 * `docs/ponte/PONTE-WAIVER-ENTITY-RESOLUTION-SPEC.md`, accepted 2 August 2026.
 *
 * ## The rule, in one line
 *
 * The waiver is available **once per externally verified legal entity**, and an
 * entity is identified by a normalised LEI, or by a registry authority plus a
 * registration number. **No qualifying identifier means no waiver**: the
 * activation is simply $79. There is no fallback to self-declared company text,
 * ever.
 *
 * ## Why this module is pure
 *
 * Same reason as `pricing.ts`. Whether a company gets $79 of value must be
 * reproducible from its inputs in a test, without standing up a database. The
 * only impure part of resolution - looking an identifier up - is passed in as a
 * function, so every decision below can be exercised against a fixture.
 *
 * ## The correction this module exists to encode
 *
 * A naive "LEI first, else registry number" priority rule LEAKS:
 *
 *   an entity verifies with a registry number and claims its waiver;
 *   it later obtains an LEI, re-verifies, resolves to a DIFFERENT key,
 *   and claims a second waiver.
 *
 * Priority order alone cannot close that. So identity is a **resolved entity
 * carrying many identifiers**, never one identifier acting as the key. When the
 * entity above presents its new LEI, the LEI attaches to the entity that
 * already exists, and its waiver is already spent. `resolveEntity` returns
 * {@link EntityResolution} rather than a key, which is what makes that possible.
 *
 * ## What this module does NOT do
 *
 * It does not read or write anything, does not merge entities, and does not
 * decide eligibility from a room or a member. It answers two questions:
 * which identifiers does this verification establish, and which entity do they
 * point at.
 */

/* ------------------------------------------------------------------ *
 * 1. Eligibility of the verification itself
 * ------------------------------------------------------------------ */

/**
 * The verification statuses that can confer a waiver.
 *
 * Read from production's own CHECK constraint, which admits `pending`,
 * `auto_verified`, `review`, `verified`, `rejected`, `failed` and
 * `needs_selection`. Only the two that mean "this entity was externally
 * confirmed" appear here.
 */
export const WAIVER_ELIGIBLE_STATUSES = ["verified", "auto_verified"] as const;

/**
 * The only purpose that can confer a waiver.
 *
 * `counterparty_check` is a check a member buys on **somebody else's** company.
 * It establishes nothing about the member's own entity and must neither confer
 * nor consume a waiver. The column admits exactly these two values.
 */
export const WAIVER_ELIGIBLE_PURPOSE = "member_business" as const;

/** The fields of a `verifications` row this module reads. Nothing else. */
export interface VerificationFacts {
  purpose: string | null;
  status: string;
  subjectLei: string | null;
  subjectRegNumber: string | null;
  /**
   * The issuing jurisdiction or authority of `subjectRegNumber`.
   *
   * **Not `verifications.registry`**, despite the spec naming it. That column
   * is `jsonb` holding the provider's response - `{source, available, status,
   * companyName, regNumber, checkedAt}` - and its `source` is the DATA PROVIDER
   * (`opencorporates`, `companies_house`), not the register that issued the
   * number. OpenCorporates is a global aggregator, so using it as the authority
   * would collapse every jurisdiction into one namespace, which is the exact
   * collision correction 3 exists to prevent.
   *
   * So this is a separate field, and today nothing populates it. That is
   * deliberate: see `registryAuthorityIsCapturable` below.
   */
  registryAuthority: string | null;
}

/**
 * Can this verification confer or consume a waiver?
 *
 * Purpose and status only. Whether it yields a usable identifier is a separate
 * question, answered by {@link identifiersFrom}, because "verified but with no
 * qualifying identifier" is a real and different outcome from "not verified".
 */
export function isWaiverEligibleVerification(v: VerificationFacts): boolean {
  return (
    v.purpose === WAIVER_ELIGIBLE_PURPOSE &&
    (WAIVER_ELIGIBLE_STATUSES as readonly string[]).includes(v.status)
  );
}

/* ------------------------------------------------------------------ *
 * 2. Identifiers
 * ------------------------------------------------------------------ */

export type IdentifierScheme = "lei" | "registry";

/**
 * One identifier held by one entity.
 *
 * `authority` is **null for `lei`**, which is global by construction, and
 * **required for `registry`**. The uniqueness this feeds is
 * `(scheme, authority, valueNormalised)`.
 */
export interface EntityIdentifier {
  scheme: IdentifierScheme;
  authority: string | null;
  valueNormalised: string;
}

/**
 * Is an LEI well formed? ISO 17442, checked by ISO 7064 MOD 97-10.
 *
 * **Validated rather than trusted, and the reason is specific:** a mistyped LEI
 * that passes into the identifier table creates a phantom entity, and a phantom
 * entity has its own unspent waiver. A checksum is the difference between a
 * typo costing nothing and a typo costing $79 every time it is repeated.
 *
 * Twenty characters, alphanumeric. Letters take the values A=10 through Z=35,
 * the whole string is read as one integer, and it is valid when that integer is
 * congruent to 1 modulo 97. Reduced chunk by chunk so no value exceeds the safe
 * integer range - a 20-character LEI is a 38-digit number and `Number` cannot
 * hold it.
 */
export function isValidLei(candidate: string): boolean {
  const value = normaliseLei(candidate);
  if (!/^[0-9A-Z]{20}$/.test(value)) return false;

  let remainder = 0;
  for (const character of value) {
    const digitValue = /[0-9]/.test(character)
      ? character
      : String(character.charCodeAt(0) - 55); // 'A' is 65, and A is 10.
    for (const digit of digitValue) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  return remainder === 1;
}

/**
 * Normalise an LEI: strip whitespace, uppercase. **Nothing else.**
 *
 * An LEI has one canonical form and no formatting conventions, so there is
 * nothing further to do and anything further would be invention.
 */
export function normaliseLei(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

/**
 * Normalise a registration number, **conservatively**.
 *
 * Strips whitespace, uppercases, and removes the punctuation registers use as
 * formatting. It deliberately does **not strip leading zeros**, and that is the
 * one rule in this file most likely to be "improved" by somebody later:
 *
 *   A FALSE MERGE IS WORSE THAN A MISSED ONE.
 *
 * A missed merge grants one extra waiver, worth $79. A false merge silently
 * denies a waiver to a company that is entitled to it, and it does so in a way
 * that looks like correct behaviour from the inside. Where an authority is
 * known to treat leading zeros as insignificant, that belongs in a per-authority
 * rule, not in a global strip.
 */
export function normaliseRegistryValue(value: string): string {
  return value
    .replace(/\s+/g, "")
    .toUpperCase()
    .replace(/[.,;:()/\\-]/g, "");
}

/** Normalise an authority so NULL and "" can never both exist for a scheme. */
export function normaliseAuthority(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim().toUpperCase().replace(/\s+/g, "_");
  return trimmed === "" ? null : trimmed;
}

/**
 * The identifiers a verification establishes. Possibly none.
 *
 * VAT is deliberately absent. It may be stored as an attribute of an entity; it
 * does **not** resolve identity, because a VAT number is a tax registration
 * rather than a legal identity and is reassigned, shared across group members in
 * some regimes, and absent in others.
 *
 * An ineligible verification yields nothing, so a `counterparty_check` cannot
 * introduce an identifier by accident.
 */
export function identifiersFrom(v: VerificationFacts): EntityIdentifier[] {
  if (!isWaiverEligibleVerification(v)) return [];

  const identifiers: EntityIdentifier[] = [];

  if (v.subjectLei && isValidLei(v.subjectLei)) {
    identifiers.push({ scheme: "lei", authority: null, valueNormalised: normaliseLei(v.subjectLei) });
  }

  /*
    BOTH, or neither. A registration number without its issuing authority is
    not an identity: registries are frequently subnational or plural, and
    Delaware and California, or two German Amtsgerichte, issue independently.
    An unqualified number would collide across them.
  */
  const authority = normaliseAuthority(v.registryAuthority);
  if (v.subjectRegNumber && authority) {
    const value = normaliseRegistryValue(v.subjectRegNumber);
    if (value !== "") identifiers.push({ scheme: "registry", authority, valueNormalised: value });
  }

  return identifiers;
}

/**
 * Whether a registry authority can be captured from what verification records
 * today. **It cannot.**
 *
 * Stated as a function rather than a comment so the answer is greppable and so
 * a test can pin it. When verification begins recording the issuing register -
 * OpenCorporates returns a `jurisdiction_code`, which is the obvious source -
 * this becomes true and registry identity starts resolving.
 *
 * Until then the waiver is **LEI-only in practice**. That is a
 * verification-capture finding and not a reason to weaken the rule: the spec is
 * explicit that a missing identifier means no waiver and a $79 activation, and
 * never a fallback to typed-in company text.
 */
export const registryAuthorityIsCapturable = false;

/* ------------------------------------------------------------------ *
 * 3. Resolution
 * ------------------------------------------------------------------ */

/** What resolution concluded. */
export type EntityResolution =
  /** No qualifying identifier. No waiver; the activation is simply $79. */
  | { outcome: "no_identifier" }
  /** Nothing matched. Create an entity and attach every identifier. */
  | { outcome: "new_entity"; attach: EntityIdentifier[] }
  /** One entity matched. Attach anything it does not already carry. */
  | { outcome: "existing_entity"; entityId: string; attach: EntityIdentifier[] }
  /** Identifiers point at different entities. A human decides. */
  | { outcome: "merge_required"; entityIds: string[]; identifiers: EntityIdentifier[] };

/** Looks an identifier up. Returns the entity holding it, or null. */
export type IdentifierLookup = (identifier: EntityIdentifier) => string | null;

/**
 * Which entity do these identifiers point at?
 *
 * The four outcomes are the whole specification of step 4, and the third is the
 * one that closes the leak described at the top of this file: an entity that
 * claimed by registry number and later presents an LEI resolves to the SAME
 * entity, attaches the LEI, and finds its waiver already spent.
 *
 * `merge_required` is deliberately not resolved here. Two identifiers pointing
 * at two entities means either a data error or a real corporate event, and both
 * need a person. Merging automatically would silently destroy one of two waiver
 * claims; creating a third entity would mint a new one. **Refuse the waiver for
 * that activation, record it, and raise it.** It is rare, and it must be
 * visible rather than guessed.
 */
export function resolveEntity(
  identifiers: readonly EntityIdentifier[],
  lookup: IdentifierLookup,
): EntityResolution {
  if (identifiers.length === 0) return { outcome: "no_identifier" };

  const matched = new Map<string, EntityIdentifier[]>();
  const unmatched: EntityIdentifier[] = [];

  for (const identifier of identifiers) {
    const entityId = lookup(identifier);
    if (entityId === null) {
      unmatched.push(identifier);
      continue;
    }
    const held = matched.get(entityId) ?? [];
    held.push(identifier);
    matched.set(entityId, held);
  }

  if (matched.size === 0) return { outcome: "new_entity", attach: [...identifiers] };

  if (matched.size > 1) {
    // Sorted so the report is stable regardless of iteration order.
    // `Array.from` rather than spread: this project's tsc target predates
    // ES2015 iterator spreading and rejects `[...map.keys()]`.
    return {
      outcome: "merge_required",
      entityIds: Array.from(matched.keys()).sort(),
      identifiers: [...identifiers],
    };
  }

  const [entityId] = Array.from(matched.keys());
  // Only what the entity does not already carry. Re-attaching a held
  // identifier would violate the global uniqueness on (scheme, authority,
  // value).
  return { outcome: "existing_entity", entityId, attach: unmatched };
}

/**
 * Is the waiver available to the entity this resolution points at?
 *
 * `hasClaim` answers whether a `waiver_claim` already exists for that entity.
 * A claim is consumed **once and forever** - it survives expiry, closure and
 * reactivation - so this asks whether one exists, never whether it is current.
 *
 * `merge_required` returns false by design. Refusing a waiver during an
 * unresolved merge charges $79 that may be refundable later; granting one may
 * be a second waiver that can never be taken back.
 */
export function waiverAvailable(
  resolution: EntityResolution,
  hasClaim: (entityId: string) => boolean,
): boolean {
  switch (resolution.outcome) {
    case "no_identifier":
      return false;
    case "merge_required":
      return false;
    case "new_entity":
      // Nothing matched, so no entity exists, so nothing can have claimed.
      return true;
    case "existing_entity":
      return !hasClaim(resolution.entityId);
  }
}
