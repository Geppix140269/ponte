/**
 * Deal Room admissibility: the nine-criterion entry threshold, as a predicate.
 *
 * ADR-0021 ruling 2, accepted 31 July 2026:
 *
 *   "no member may open a Deal Room, and no member may be admitted to one,
 *    without having completed a minimum verification. A member who pays for a
 *    room must not have that payment wasted on a counterparty who was never
 *    admissible."
 *
 * The threshold is not invented here. It is `PT-PRODUCT-2026-07-27-01` section
 * 6, "Deal Room-ready Business Passport", which the owner restated on 31 July
 * 2026 as the whole of the floor:
 *
 *   "Apply the existing Deal Room-ready Business Passport minimum equally to
 *    every participant, whether opening the room or being invited: authenticated
 *    individual; confirmed contact method; identified business or declared
 *    professional capacity; legal or trading name; jurisdiction; relationship to
 *    the business; transaction role declared; authority to participate declared;
 *    and any room-specific prerequisite completed. A complete Passport and a
 *    registry-checked business are not required merely to enter."
 *
 * ## The five properties this module is built to make unbreakable
 *
 * **1. Nine criteria, evaluated independently.** The floor is the set, not a
 * rung on a scale. Each criterion is evaluated on its own and carries its own
 * state, so failing exactly one reports exactly one.
 *
 * **2. Fail closed. An unknown is a blocker.** Owner instruction, 31 July 2026:
 * "A criterion the system cannot evaluate must NEVER silently default to
 * satisfied." There is no `?? true` in this file, nothing is filtered out of the
 * result for being unknowable, and every criterion the caller cannot supply
 * lands in `pending`, which blocks. That is why `AdmissibilityFacts` has no
 * optional fields: a caller cannot omit one and have it pass by absence, and
 * `null` is the explicit way to say "this could not be read", which blocks.
 *
 * **3. Evidence-specific, never numerical.** Section 6: "The user-facing model
 * must remain evidence-specific rather than numerical." No score, no
 * percentage, no fraction, no field that could become one. The result names
 * criteria; it does not count them. The arrays exist so a member can be told
 * what to supply, not so a surface can take `.length` and draw a bar - doing
 * that would breach section 6 and the Design Constitution rule against a
 * numbered tier becoming the trust model.
 *
 * **4. Not a full-verification wall.** Section 6 opens "A complete Passport is
 * not required for entry", and the owner ruled that a registry-checked business
 * is not required either. `company_verified` is therefore NOT the floor and
 * `MEMBER_BUSINESS_MIN_LEVEL` - the PUBLICATION floor - is deliberately not
 * imported here. The only level this module reads is
 * `DEAL_ROOM_IDENTITY_MIN_LEVEL`, which is `identity_verified`, one rung below.
 * Six of the nine are satisfied by a member DECLARATION, because section 6 asks
 * for a declaration and nothing more; demanding evidence there would be a
 * stricter gate than the authority wrote.
 *
 * **5. Equal for everyone, and admission only.** Product contract section 5 says
 * "Every participant must", with no carve-out for whoever opened the room.
 * Branching model section 6: "Sponsored access removes payment friction. It does
 * not weaken admission, confidentiality or authority requirements." So one
 * predicate serves the initiator and the invitee, and there is no input for
 * payment, sponsorship or entitlement - the predicate cannot see who paid, which
 * is stronger than a parameter callers are asked not to use. Section 6 also
 * scopes this: the threshold "admits a member to a room. Later stages of a
 * transaction may require further evidence." This module is asked at the door
 * and nowhere else, and must not grow a notion of deal stage.
 *
 * ## Why this module and not `permissions.ts`
 *
 * `permissions.ts` answers "what may this participant DO inside a room", from a
 * `Viewer` that exists only once a `deal_room_participants` row does. Both gates
 * here are asked BEFORE that: `proposeRoom` runs when no room and no participant
 * row exist at all. The input is a profile and its verification, not a
 * participant class and a room state. Folding a profile-shaped question into a
 * room-shaped module would have meant giving `Viewer` fields that are null for
 * every one of its existing callers.
 *
 * The two keep the same discipline: pure, no database access, the caller reads
 * the rows. `lib/deal-room/queries.ts` holds the reads.
 *
 * ## What this module is NOT
 *
 * It is not a security boundary. Row Level Security is. The same check is
 * written into `deal_room_propose` and `deal_room_admit_participant` by
 * `supabase/migrations/20260731g_deal_room_admission_verification_gate.sql`,
 * which is WRITTEN AND NOT APPLIED. Until an owner applies it, this file is the
 * only thing enforcing ruling 2, and a caller invoking the RPC directly would
 * get past it. Stated here rather than left to be discovered.
 *
 * It is also NOT the section 4 lock. "Protected content and active transaction
 * functions remain locked until the required principal participants are
 * admitted" is a different mechanism, implemented by `permissions.ts` and the
 * room state machine, and it is about waiting for the other party rather than
 * about who is admissible. An inadmissible member is refused outright; an
 * admissible but not-yet-admitted member is merely still outside.
 *
 * Pure and import-light, for the standalone test runner: the verification floor
 * is imported by relative path from the module that owns the vocabulary, exactly
 * as `lib/listings/publication-gate.ts` does.
 */

import { DEAL_ROOM_IDENTITY_MIN_LEVEL, meetsDealRoomIdentityFloor } from "../verification/level";

export { DEAL_ROOM_IDENTITY_MIN_LEVEL };

/**
 * The three outcomes a criterion may have. Owner instruction, 31 July 2026.
 *
 * - `confirmed` - established by evidence the system holds.
 * - `declared` - satisfied by a valid member declaration, which is sufficient
 *   for the criteria section 6 deliberately writes as declarations.
 * - `pending` - the information is missing, or the system cannot evaluate it.
 *   **Blocks admission.** There is no fourth state and no "unknown, allowed".
 */
export const CRITERION_STATES = ["confirmed", "declared", "pending"] as const;
export type CriterionState = (typeof CRITERION_STATES)[number];

/**
 * Section 6's own user-facing vocabulary, verbatim, carried alongside the three
 * machine states so a surface can print the authority's words rather than ours.
 *
 * `business_information_checked` and `authority_sighted` are in the set because
 * section 6 puts them there. Nothing in this release produces either, and this
 * gate never claims them: it would be the stronger claim, and the distance
 * between "declared" and "sighted" is the point of keeping both words.
 */
export const EVIDENCE_STATES = [
  "identity_confirmed",
  "business_information_supplied",
  "business_information_checked",
  "role_declared",
  "authority_declared",
  "authority_sighted",
  "under_review",
  "not_confirmed",
] as const;

export type EvidenceState = (typeof EVIDENCE_STATES)[number];

/**
 * The nine criteria of section 6, in section 6's own order and its own words.
 *
 * Adding a tenth is a product decision, not a refactor.
 */
export const ADMISSIBILITY_CRITERIA = [
  "authenticated_individual",
  "confirmed_contact_method",
  "identified_business_or_capacity",
  "legal_or_trading_name",
  "jurisdiction",
  "relationship_to_the_business",
  "transaction_role_declared",
  "authority_to_participate_declared",
  "room_specific_prerequisite",
] as const;

export type AdmissibilityCriterion = (typeof ADMISSIBILITY_CRITERIA)[number];

/**
 * Where each criterion's evidence actually comes from, and how well.
 *
 * This table is the honesty of the module. Under the fail-closed rule a
 * criterion nobody can evaluate blocks every member, so which criteria rest on
 * real stored columns is not a footnote - it decides whether the product works
 * at all. `coverage` is asserted by a test, so a claim here cannot drift from
 * what the predicate does.
 */
export const CRITERION_EVIDENCE: Record<
  AdmissibilityCriterion,
  {
    /** Human label, used in the refusal sentence. */
    label: string;
    /** The stored fact this rests on, named exactly. */
    source: string;
    /**
     * `stored` - a dedicated column exists and this criterion reads it.
     * `derived` - no dedicated column exists; the caller supplies the nearest
     *   stored fact, so the criterion is real but NOT independently evidenced.
     * `unmodelled` - nothing in the schema can currently record it either way.
     */
    coverage: "stored" | "derived" | "unmodelled";
  }
> = {
  authenticated_individual: {
    label: "Identity confirmed",
    source: `profiles.verification_level at or above ${DEAL_ROOM_IDENTITY_MIN_LEVEL}`,
    coverage: "stored",
  },
  confirmed_contact_method: {
    label: "Confirmed contact method",
    source: "auth.users.email_confirmed_at",
    coverage: "stored",
  },
  identified_business_or_capacity: {
    label: "Business or professional capacity",
    source: "profiles.company, or the capacity declared for the room",
    coverage: "stored",
  },
  legal_or_trading_name: {
    label: "Legal or trading name",
    source: "profiles.company, or the organisation named for the room",
    coverage: "stored",
  },
  jurisdiction: {
    label: "Jurisdiction",
    source: "profiles.country, or the jurisdiction declared for the room",
    coverage: "stored",
  },
  relationship_to_the_business: {
    /*
     * No column anywhere records this on its own.
     *
     * Opening a room: `listings.submitter_role`, which the publication gate
     * already requires before a Deal can be approved and which `deal_room_propose`
     * requires to be an approved Deal. That is a real, separate, stored fact.
     *
     * Being admitted: nothing collects it. The admission form asks for an
     * organisation, a capacity, a role and an authority, and none of those is
     * "how do you stand to this business". The caller passes the declared
     * capacity, which is the member's own statement of the same thing, so the
     * criterion is genuinely declared by the member - but it is not independent
     * of `identified_business_or_capacity`, and that is recorded here rather
     * than smoothed over. Making it independent needs a field on
     * `deal_room_declare_participation`, which is a migration and therefore an
     * owner decision.
     */
    label: "Relationship to the business",
    source: "listings.submitter_role when opening; the declared capacity when being admitted",
    coverage: "derived",
  },
  transaction_role_declared: {
    label: "Transaction role",
    source: "deal_room_participants.transaction_role",
    coverage: "stored",
  },
  authority_to_participate_declared: {
    label: "Authority to participate",
    source: "deal_room_participants.participation_authority",
    coverage: "stored",
  },
  room_specific_prerequisite: {
    /*
     * There is no prerequisites table and no prerequisite column anywhere in
     * the Deal Room schema. `prerequisites_pending` is a participant STATE with
     * nothing behind it, so no room can impose a prerequisite today.
     *
     * Fail-closed still applies: the caller must SAY so, by passing an empty
     * list. Passing `null` means "I could not determine this room's
     * prerequisites" and blocks. The criterion cannot pass by omission, because
     * the field is not optional.
     */
    label: "Room prerequisites",
    source: "no prerequisite mechanism exists in the schema; the caller states the outstanding set",
    coverage: "unmodelled",
  },
};

/** One criterion's outcome. Named, stated, and remediable. Never scored. */
export interface AdmissibilityFinding {
  criterion: AdmissibilityCriterion;
  /** Short label, for the line the member reads. */
  label: string;
  /** confirmed | declared | pending. Only `pending` blocks. */
  state: CriterionState;
  /** Section 6's own word for the same outcome, for display. */
  evidenceState: EvidenceState;
  /**
   * What the member must do, in their own terms, and where.
   *
   * Null only when the criterion is satisfied. Never null and never empty when
   * `pending`: North Star section 3.5 and AGENTS.md require a truthful boundary
   * rather than a dead end, so every refusal carries the remedy for the thing
   * that caused it. A test asserts this.
   */
  remedy: { statement: string; href: string } | null;
}

/**
 * The result. Two named lists and a sentence.
 *
 * Deliberately absent: any count, ratio, percentage, score, tier, band or
 * "readiness" value. There is no field here a surface could render as a bar,
 * and a test asserts the shape stays that way.
 */
export interface AdmissibilityResult {
  admissible: boolean;
  /** Every criterion, in section 6's order. Nine, always. */
  findings: AdmissibilityFinding[];
  /** The satisfied ones, `confirmed` or `declared`. */
  satisfied: AdmissibilityFinding[];
  /** The blocking ones, `pending`. Empty exactly when admissible. */
  pending: AdmissibilityFinding[];
  /** One sentence naming what is missing. Empty string when admissible. */
  summary: string;
  /** The standing statement of what admission does and does not prove. */
  limitation: string;
}

/**
 * The facts the predicate needs. Every field is required, and `null` is the
 * explicit way to say "not supplied or not readable", which blocks.
 *
 * There is deliberately no field for payment, sponsorship, entitlement or
 * whether this member opened the room.
 */
export interface AdmissibilityFacts {
  /** `profiles.verification_level`, as stored. Unrecognised values fail closed. */
  verificationLevel: unknown;
  /** `auth.users.email_confirmed_at`. Null blocks. */
  emailConfirmedAt: string | null;
  /** `profiles.company`, or the organisation named for this room. */
  organisationName: string | null;
  /** A declared professional capacity, where no organisation is named. */
  declaredCapacity: string | null;
  /** `profiles.country`, or the jurisdiction declared for this room. */
  jurisdiction: string | null;
  /** See `CRITERION_EVIDENCE`: no dedicated column, nearest stored fact. */
  relationshipToBusiness: string | null;
  /** The transaction role declared for this room. */
  transactionRole: string | null;
  /** The authority declared for that role. */
  participationAuthority: string | null;
  /**
   * Room-specific prerequisites still outstanding, by name.
   *
   * `[]` means the caller has established that none are outstanding, which is
   * always the truthful answer today because nothing in the schema can record
   * one. `null` means the caller could not determine it, and blocks. Not
   * optional, so it cannot pass by being forgotten.
   */
  outstandingPrerequisites: readonly string[] | null;
}

/** Where the free evidence is supplied. ADR-0018 made this verification free. */
export const VERIFY_BUSINESS_HREF = "/verify?for=business";
/** Where a member confirms the address on their account. */
export const ACCOUNT_HREF = "/account";

const LIMITATION =
  "Meeting this minimum admits you to the room. It does not prove solvency, product ownership, document authenticity, commercial reliability or authority to execute a final contract, and further evidence may be asked for later as the deal progresses.";

/**
 * Present, in the only sense that counts: a non-empty string after trimming.
 *
 * `null`, `undefined` and whitespace are all "the system cannot evaluate this",
 * and all of them lead to `pending`. There is no branch that turns an absence
 * into a pass.
 */
const declared = (v: unknown): boolean => v !== null && v !== undefined && String(v).trim() !== "";

function finding(
  criterion: AdmissibilityCriterion,
  state: CriterionState,
  evidenceState: EvidenceState,
  remedy: { statement: string; href: string },
): AdmissibilityFinding {
  return {
    criterion,
    label: CRITERION_EVIDENCE[criterion].label,
    state,
    evidenceState,
    remedy: state === "pending" ? remedy : null,
  };
}

/**
 * The gate. Every criterion is evaluated; every blocker is reported.
 *
 * It returns the whole picture rather than the first refusal, for the same
 * reason `checkPublicationGate` does: a member sent back three times for three
 * separate items has been failed three times by the interface, not once by the
 * rule.
 */
export function dealRoomAdmissibility(facts: AdmissibilityFacts): AdmissibilityResult {
  const findings: AdmissibilityFinding[] = [];

  /*
   * 1. Authenticated individual. CONFIRMED, not declared.
   *
   * Read as section 6's own state for it, `identity confirmed`, rather than as
   * "is signed in". Both gates are reachable only by an authenticated member, so
   * the weaker reading would make this criterion vacuous and it could not be
   * part of a floor. The owner's ruling is explicit that a level rung is the
   * evidence for identity, and ADR-0018 made that check free.
   *
   * The rung is `identity_verified`. A member who never ran a registry check is
   * NOT blocked by this: `company_verified` is not required and is not read.
   */
  const identity = meetsDealRoomIdentityFloor(facts.verificationLevel);
  findings.push(
    finding(
      "authenticated_individual",
      identity ? "confirmed" : "pending",
      identity ? "identity_confirmed" : "not_confirmed",
      {
        statement:
          "Confirm your identity. Verifying the business you represent is free and takes one form. A registry check is not required to enter a Deal Room.",
        href: VERIFY_BUSINESS_HREF,
      },
    ),
  );

  // 2. Confirmed contact method. CONFIRMED: the system holds the timestamp.
  //    An unconfirmed address is an unattributable participant, and the room
  //    record and the invitation both go to it.
  const contact = declared(facts.emailConfirmedAt);
  findings.push(
    finding(
      "confirmed_contact_method",
      contact ? "confirmed" : "pending",
      contact ? "identity_confirmed" : "not_confirmed",
      {
        statement:
          "Confirm your email address. Ponte sent a confirmation link when you signed up, and it can be sent again.",
        href: ACCOUNT_HREF,
      },
    ),
  );

  /*
   * 3. Identified business OR declared professional capacity. DECLARED.
   *
   * The "or" is section 6's, and it is what keeps an independent broker,
   * forwarder or adviser admissible without a company. The state is
   * `business_information_supplied`: supplied, not checked. Nothing here reaches
   * `business_information_checked`, because that would mean a registry match,
   * which this gate expressly does not require.
   */
  const business = declared(facts.organisationName) || declared(facts.declaredCapacity);
  findings.push(
    finding(
      "identified_business_or_capacity",
      business ? "declared" : "pending",
      business ? "business_information_supplied" : "not_confirmed",
      {
        statement:
          "Name the business you act for, or the professional capacity you act in. Either one satisfies this, and both are not required.",
        href: VERIFY_BUSINESS_HREF,
      },
    ),
  );

  /*
   * 4. Legal or trading name. DECLARED.
   *
   * Listed by section 6 separately from 3, and evaluated separately, but it
   * rests on the same two facts: the organisation's name, or - for a member
   * with no company - the capacity they trade under, which is the name they
   * act in. Demanding a registered company name here would readmit the
   * full-Passport wall through the side door.
   */
  const name = declared(facts.organisationName) || declared(facts.declaredCapacity);
  findings.push(
    finding(
      "legal_or_trading_name",
      name ? "declared" : "pending",
      name ? "business_information_supplied" : "not_confirmed",
      {
        statement: "Give the legal or trading name you act under.",
        href: VERIFY_BUSINESS_HREF,
      },
    ),
  );

  // 5. Jurisdiction. DECLARED. Where that business or capacity is established.
  const jurisdiction = declared(facts.jurisdiction);
  findings.push(
    finding(
      "jurisdiction",
      jurisdiction ? "declared" : "pending",
      jurisdiction ? "business_information_supplied" : "not_confirmed",
      { statement: "State the jurisdiction you are established in.", href: VERIFY_BUSINESS_HREF },
    ),
  );

  // 6. Relationship to the business. DECLARED, and see CRITERION_EVIDENCE: the
  //    caller supplies it because no column holds it on its own.
  const relationship = declared(facts.relationshipToBusiness);
  findings.push(
    finding(
      "relationship_to_the_business",
      relationship ? "declared" : "pending",
      relationship ? "role_declared" : "not_confirmed",
      {
        statement: "State how you stand to that business: an office you hold, a mandate, or an engagement.",
        href: VERIFY_BUSINESS_HREF,
      },
    ),
  );

  // 7. Transaction role declared. DECLARED.
  const role = declared(facts.transactionRole);
  findings.push(
    finding(
      "transaction_role_declared",
      role ? "declared" : "pending",
      role ? "role_declared" : "not_confirmed",
      {
        statement: "Declare your role in this transaction. Responsibilities in the procedure are assigned by role.",
        href: VERIFY_BUSINESS_HREF,
      },
    ),
  );

  /*
   * 8. Authority to participate declared. DECLARED, and only ever declared.
   *
   * `authority_declared`, never `authority_sighted`. Ponte records the
   * declaration and does not check it, and section 6 keeps the two states apart
   * precisely so the interface cannot imply the stronger one.
   */
  const authority = declared(facts.participationAuthority);
  findings.push(
    finding(
      "authority_to_participate_declared",
      authority ? "declared" : "pending",
      authority ? "authority_declared" : "not_confirmed",
      {
        statement:
          "Declare what authorises you to act in that role. Ponte records the declaration and does not check it.",
        href: VERIFY_BUSINESS_HREF,
      },
    ),
  );

  /*
   * 9. Room-specific prerequisites. CONFIRMED when the caller has established
   *    that none are outstanding; PENDING when any are, and PENDING when the
   *    caller passes `null` to say it could not tell. Absence is never a pass.
   */
  const outstanding = facts.outstandingPrerequisites;
  const prerequisiteState: CriterionState =
    outstanding === null ? "pending" : outstanding.length === 0 ? "confirmed" : "pending";
  findings.push(
    finding(
      "room_specific_prerequisite",
      prerequisiteState,
      prerequisiteState === "confirmed" ? "identity_confirmed" : "under_review",
      {
        statement:
          outstanding === null || outstanding.length === 0
            ? "This room's prerequisites could not be read, so entry is held until they can be."
            : `Complete what this room requires before entry: ${outstanding.join(", ")}.`,
        href: ACCOUNT_HREF,
      },
    ),
  );

  const pending = findings.filter((f) => f.state === "pending");
  const satisfied = findings.filter((f) => f.state !== "pending");

  return {
    admissible: pending.length === 0,
    findings,
    satisfied,
    pending,
    summary: pending.length === 0 ? "" : admissibilitySummary(pending),
    limitation: LIMITATION,
  };
}

/**
 * The refusal sentence, naming the evidence rather than counting it.
 *
 * It never says how many items there are, never says "some" or "most", and
 * never mentions a price: ADR-0018 made `member_business` verification free, so
 * any wording implying a cost would be untrue.
 */
export function admissibilitySummary(pending: readonly AdmissibilityFinding[]): string {
  if (pending.length === 0) return "";
  const names = pending.map((f) => f.label.toLowerCase());
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return (
    `A Deal Room needs this from every participant before entry, whoever opens it and whoever sponsors it: ${list}. ` +
    "Supplying it is free, and a complete Business Passport is not required."
  );
}

/**
 * The single sentence a refused command returns to the member.
 *
 * Both server actions print this. It names the missing evidence and where to
 * supply it, so a refusal is a next step rather than a dead end.
 */
export function admissibilityRefusal(result: AdmissibilityResult): string {
  if (result.admissible) return "";
  const where = result.pending.some((f) => f.remedy?.href === VERIFY_BUSINESS_HREF)
    ? VERIFY_BUSINESS_HREF
    : ACCOUNT_HREF;
  return `${result.summary} Supply it at ${where}.`;
}
