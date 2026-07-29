/**
 * Ponte Integrity pre-flight.
 *
 * Shown before a protected invitation is sent, to both sides of it. Issue #97
 * fixes exactly what it must say:
 *
 * - what Ponte has checked;
 * - what is member-declared;
 * - what is unproved;
 * - any material inconsistency requiring clarification;
 * - the precise action available.
 *
 * ## The four hard prohibitions
 *
 * AI may compare, explain and recommend. It may **not**:
 *
 * 1. publicly label a participant a scammer;
 * 2. produce an opaque Trust Score;
 * 3. admit or reject a party autonomously;
 * 4. make a binding commercial decision.
 *
 * This module is deliberately built so that none of those is expressible. It
 * returns facts in three buckets and a list of inconsistencies. There is no
 * score field, no verdict field, no numeric summary and no boolean that means
 * "safe". `__tests__/integrity.test.ts` asserts the shape has no such field and
 * that no wording in it accuses anybody of anything.
 *
 * ## Why it reads existing verification rather than inventing a new store
 *
 * The Gate A preflight established that the repository already holds the
 * verification model: `profiles.verification_level` is the canonical
 * three-value column since 28 July 2026, and `verifications` holds the evidence
 * rows. Issue #97 requires "verification becomes proportionate, evidence-
 * specific Deal Room readiness"; it does not authorise a second verification
 * system, and the Constitution's non-negotiable rules forbid a numbered tier or
 * a badge becoming the trust model.
 *
 * So this maps what exists onto evidence-specific statements, and says
 * "unproved" wherever it has nothing. Saying nothing is not the same as saying
 * everything is fine, and the third bucket is what stops the interface implying
 * the second.
 *
 * Pure module: no database access. The route reads the rows and passes them in.
 */

/** The canonical member verification vocabulary, as stored in production. */
export type VerificationLevel = "unverified" | "identity_verified" | "company_verified";

export interface IntegrityInput {
  /** Legal or trading name as the member states it. */
  organisationName: string | null;
  /** Declared professional capacity, when no organisation is named. */
  declaredCapacity: string | null;
  jurisdiction: string | null;
  verificationLevel: VerificationLevel;
  /** Evidence rows bound to this member, newest first. */
  verificationEvidence: readonly {
    kind: string;
    source: string;
    result: "passed" | "failed" | "in_review" | "expired";
    checkedAt: string;
  }[];
  /** The country the Deal itself names, for the consistency comparison. */
  dealOriginCountry: string | null;
  /** The role the participant says they hold. */
  declaredRole: string | null;
  /** Whether they have declared authority to participate in that role. */
  authorityDeclared: boolean;
  /** Sanctions screening outcome where one has run. */
  sanctionsScreened: boolean;
  sanctionsCandidateOpen: boolean;
}

export interface IntegrityFact {
  /** Short label, e.g. "Legal entity". */
  label: string;
  /** The fact itself, or the honest absence of one. */
  statement: string;
  /** Where it came from. Empty for the unproved bucket. */
  source?: string;
  /** When it was established. */
  checkedAt?: string;
}

export interface IntegrityInconsistency {
  label: string;
  /**
   * What does not line up. Phrased as an observation about two records, never
   * as an allegation about a person.
   */
  observation: string;
  /** What would settle it. Always a question someone can answer. */
  clarification: string;
}

export interface IntegrityPreflight {
  checked: IntegrityFact[];
  declared: IntegrityFact[];
  unproved: IntegrityFact[];
  inconsistencies: IntegrityInconsistency[];
  /**
   * The precise action available. Exactly one, and it is never "reject" or
   * "approve": a decision about a counterparty belongs to the member.
   */
  action: {
    label: string;
    /** Why this is the action, in one sentence. */
    because: string;
    /** True when a clarification should be resolved before inviting. */
    clarificationFirst: boolean;
  };
  /**
   * The standing limitation, printed every time. It is not a footnote that can
   * be styled away: it is the boundary of everything above it.
   */
  limitation: string;
}

const LIMITATION =
  "Ponte reports what it checked, what the member declared and what is unproved. It does not rate, score or vouch for a counterparty, and none of this is a judgement about their honesty or their ability to perform.";

function evidenceLabel(kind: string): string {
  switch (kind) {
    case "company_registry":
      return "Company registry record";
    case "vat":
      return "VAT registration";
    case "lei":
      return "Legal Entity Identifier";
    case "identity":
      return "Identity document";
    case "website":
      return "Website and domain";
    default:
      return kind.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
  }
}

/**
 * Build the pre-flight.
 *
 * Ordering is deliberate: checked first, then declared, then unproved. A reader
 * who stops after the first bucket has read the strongest claims; a reader who
 * stops after the second has still not been told anything is verified. The
 * unproved bucket is never empty in practice, and it is not hidden when it is
 * long.
 */
export function integrityPreflight(input: IntegrityInput): IntegrityPreflight {
  const checked: IntegrityFact[] = [];
  const declared: IntegrityFact[] = [];
  const unproved: IntegrityFact[] = [];
  const inconsistencies: IntegrityInconsistency[] = [];

  for (const row of input.verificationEvidence) {
    if (row.result === "passed") {
      checked.push({
        label: evidenceLabel(row.kind),
        statement: "Checked against an external source and matched.",
        source: row.source,
        checkedAt: row.checkedAt,
      });
    } else if (row.result === "in_review") {
      unproved.push({
        label: evidenceLabel(row.kind),
        statement: "Submitted and still under review. No result yet.",
      });
    } else if (row.result === "expired") {
      unproved.push({
        label: evidenceLabel(row.kind),
        statement: "A check was made but has since expired, so it does not describe the position today.",
      });
    } else {
      unproved.push({
        label: evidenceLabel(row.kind),
        statement: "A check was attempted and did not match. Nothing is proved either way by that alone.",
      });
    }
  }

  if (input.organisationName) {
    const isChecked = input.verificationLevel === "company_verified";
    (isChecked ? checked : declared).push({
      label: "Legal entity",
      statement: isChecked
        ? `${input.organisationName} was matched to a registry record.`
        : `${input.organisationName}, as stated by the member. Not matched to a registry record.`,
      source: isChecked ? "Company registry" : undefined,
    });
  } else if (input.declaredCapacity) {
    declared.push({
      label: "Professional capacity",
      statement: `Acting as ${input.declaredCapacity}, as stated by the member. No organisation is named.`,
    });
  } else {
    unproved.push({
      label: "Legal entity",
      statement: "Neither an organisation nor a professional capacity has been given.",
    });
  }

  if (input.jurisdiction) {
    declared.push({ label: "Jurisdiction", statement: `${input.jurisdiction}, as stated by the member.` });
  } else {
    unproved.push({ label: "Jurisdiction", statement: "No jurisdiction has been stated." });
  }

  if (input.declaredRole) {
    declared.push({ label: "Role", statement: `${input.declaredRole}, as declared for this room.` });
  } else {
    unproved.push({ label: "Role", statement: "No transaction role has been declared." });
  }

  declared.push({
    label: "Authority to participate",
    statement: input.authorityDeclared
      ? "The member has declared they are authorised to act in this role. The declaration has not been sighted."
      : "No declaration of authority has been made yet.",
  });

  if (input.sanctionsScreened && !input.sanctionsCandidateOpen) {
    checked.push({
      label: "Sanctions screening",
      statement: "Screened against the lists Ponte holds, with no unresolved candidate.",
      source: "Ponte sanctions screening",
    });
  } else if (!input.sanctionsScreened) {
    unproved.push({ label: "Sanctions screening", statement: "No screening has been run for this participant." });
  }

  unproved.push({
    label: "Ability to perform",
    statement:
      "Nothing here shows whether this counterparty can supply, pay or deliver. Ponte does not check solvency, stock, ownership or capacity.",
  });

  unproved.push({
    label: "Document authenticity",
    statement: "No document supplied in this room has been authenticated by Ponte.",
  });

  /*
   * Inconsistencies. Two records disagreeing is a question, not an accusation,
   * and the wording carries that distinction on purpose. An open sanctions
   * candidate is the one item that should stop an invitation, and even there
   * the sentence describes a name similarity rather than a person.
   */
  if (input.sanctionsCandidateOpen) {
    inconsistencies.push({
      label: "Sanctions screening",
      observation: "A name on this participant's record is similar to an entry on a sanctions list, and the match has not been resolved.",
      clarification: "Resolve the screening candidate before inviting this participant.",
    });
  }

  if (input.jurisdiction && input.dealOriginCountry && input.jurisdiction !== input.dealOriginCountry) {
    inconsistencies.push({
      label: "Jurisdiction and Deal origin",
      observation: `The member states a jurisdiction of ${input.jurisdiction}, and the Deal names ${input.dealOriginCountry} as its origin.`,
      clarification:
        "Ask which entity will contract, and from where. A trading company in one country supplying from another is ordinary; it should be stated rather than assumed.",
    });
  }

  if (input.organisationName && input.verificationLevel === "unverified") {
    inconsistencies.push({
      label: "Named entity, no identity check",
      observation:
        "An organisation is named, and no identity or company check has been completed for the person acting for it.",
      clarification: "Ask the participant to complete identity verification before protected content is disclosed.",
    });
  }

  const blocking = inconsistencies.some((item) => item.label === "Sanctions screening");

  const action = blocking
    ? {
        label: "Resolve the screening candidate before inviting",
        because: "An unresolved sanctions candidate is the one finding Ponte will not let an invitation pass.",
        clarificationFirst: true,
      }
    : inconsistencies.length > 0
      ? {
          label: "Send the protected invitation, with the clarification attached",
          because:
            "The invitation reveals no protected content, so it is safe to send. The clarification travels with it and is asked before admission completes.",
          clarificationFirst: false,
        }
      : {
          label: "Send the protected invitation",
          because: "Nothing inconsistent was found in the records Ponte holds.",
          clarificationFirst: false,
        };

  return { checked, declared, unproved, inconsistencies, action, limitation: LIMITATION };
}

/**
 * The only gate this module imposes.
 *
 * One condition, and it is a compliance boundary rather than a judgement about
 * a counterparty. Everything else is reported and left to the member, which is
 * the difference between informing a decision and making one.
 */
export function invitationIsPermitted(preflight: IntegrityPreflight): boolean {
  return !preflight.action.clarificationFirst;
}
