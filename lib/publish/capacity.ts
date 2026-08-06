/**
 * `B01b` Capacity declaration: what the member is, on this opportunity.
 *
 * A statement about the PERSON, not the goods, which is why it sits outside the
 * fact list and gets its own surface. Four capacities, one chosen per listing.
 *
 * ## Three rules the brief states and this module enforces
 *
 * 1. **A previous answer is a suggestion and must be actively confirmed, never
 *    pre-selected.** `suggestionFrom` returns something to CONFIRM; there is no
 *    function here that returns a pre-selected capacity, deliberately, because
 *    a helper that returned one would eventually be wired to initial state.
 * 2. **Intermediary status is public.** `isPublic` is `true` for every capacity
 *    and there is no route to a private one. `roleNeedsChain` in
 *    `lib/listings/approval-minimum.ts` already tests the STORED LABEL for the
 *    words "broker" and "intermediary", so the labels below are load-bearing:
 *    changing "Broker or intermediary" breaks the chain-depth requirement
 *    silently. `CHAIN_LABEL_MARKERS` and its test pin that.
 * 3. **Ponte does not let a member hide it.** `capacityIsPublic` has no
 *    parameter and no branch.
 *
 * ## What this module deliberately does NOT write
 *
 * `mandate_sighted`. The brief names it alongside `submitter_role` and
 * `chain_depth` as "the existing columns", but the production schema disagrees:
 *
 *   > COMMENT ON COLUMN public.listings.mandate_sighted IS 'Set by the desk
 *   > only. A sighted mandate is the desk''s statement, never the poster''s
 *   > claim.'
 *
 * A member declaring "I hold written authority" is making a claim. The desk
 * sighting the mandate is a different act by a different party. Writing the
 * member's claim into the desk's column would turn an unverified assertion into
 * Ponte's own statement, which is the manufactured fact the authorities forbid.
 * So the declaration is captured as the member's own words in the record text,
 * `mandate_sighted` is left for the desk, and the divergence is reported.
 */

export type CapacityKey =
  | "principal"
  | "authorised_representative"
  | "broker_or_intermediary"
  | "service_provider";

export interface Capacity {
  key: CapacityKey;
  /**
   * The label written to `listings.submitter_role`.
   *
   * Stored as the English label rather than the key, because that is what the
   * column already holds for every record that predates this surface and what
   * `roleNeedsChain` reads. Storing the key here would make the chain-depth
   * requirement stop firing for every new listing without any test failing.
   */
  label: string;
  detail: string;
  /** Naming the company acted for, and asserting authority over it. */
  requiresAuthority: boolean;
  /** How far the submitter sits from the principal. `chain_depth`. */
  requiresChainDepth: boolean;
}

export const CAPACITIES: readonly Capacity[] = [
  {
    key: "principal",
    label: "Principal for my own company",
    detail: "The goods or service are yours to sell",
    requiresAuthority: false,
    requiresChainDepth: false,
  },
  {
    key: "authorised_representative",
    label: "Authorised representative",
    detail: "You act for a named company with its authority",
    requiresAuthority: true,
    requiresChainDepth: false,
  },
  {
    key: "broker_or_intermediary",
    label: "Broker or intermediary",
    detail: "You connect the parties and are not the principal",
    requiresAuthority: false,
    requiresChainDepth: true,
  },
  {
    key: "service_provider",
    label: "Service provider",
    detail: "You perform the service yourself",
    requiresAuthority: false,
    requiresChainDepth: false,
  },
];

/**
 * The two words `roleNeedsChain` tests for in the stored label.
 *
 * Exported so a test can assert that every capacity whose `requiresChainDepth`
 * is true carries one of them, and that no capacity whose flag is false does.
 * Two modules agreeing by coincidence is not agreement.
 */
export const CHAIN_LABEL_MARKERS: readonly string[] = ["broker", "intermediary"];

export function capacity(key: string | null | undefined): Capacity | null {
  return CAPACITIES.find((c) => c.key === key) ?? null;
}

/** The capacity a stored `submitter_role` label came from, if any. */
export function capacityForLabel(label: string | null | undefined): Capacity | null {
  if (!label) return null;
  const wanted = label.trim().toLowerCase();
  return CAPACITIES.find((c) => c.label.toLowerCase() === wanted) ?? null;
}

/**
 * How far from the principal a broker or intermediary sits.
 *
 * Asked only where the capacity requires it. A member who is the principal is
 * never shown this: the distance from themselves is not a question.
 */
export const CHAIN_DEPTHS: readonly { key: string; label: string; detail: string }[] = [
  {
    key: "direct",
    label: "Direct to the principal",
    detail: "You deal with the party who owns the goods or performs the service",
  },
  {
    key: "one_removed",
    label: "One party between us",
    detail: "There is one other intermediary between you and the principal",
  },
  {
    key: "more_than_one",
    label: "More than one party between us",
    detail: "A longer chain. Say so rather than leave a counterparty to discover it",
  },
  {
    key: "undisclosed",
    label: "I cannot say",
    detail: "The chain is not disclosed to you. That is an answer, and it is public",
  },
];

export function chainDepth(key: string | null | undefined): { key: string; label: string } | null {
  return CHAIN_DEPTHS.find((d) => d.key === key) ?? null;
}

/**
 * Capacity is public on every listing, in all three families, before anyone
 * makes contact. No parameter, no branch: there is nothing to decide.
 */
export function capacityIsPublic(): true {
  return true;
}

/** What the member declared about the company they act for. Their words, not Ponte's. */
export interface AuthorityDeclaration {
  /** The company named. Free text, because a company name is a name. */
  company: string;
  /** The member's own assertion. Never `mandate_sighted`, which is the desk's. */
  held: boolean;
}

export function emptyAuthority(): AuthorityDeclaration {
  return { company: "", held: false };
}

export interface CapacityAnswer {
  key: CapacityKey | null;
  authority: AuthorityDeclaration;
  chainDepthKey: string | null;
}

export function emptyCapacity(): CapacityAnswer {
  return { key: null, authority: emptyAuthority(), chainDepthKey: null };
}

/**
 * Is this capacity answer complete enough to continue?
 *
 * Nothing is chosen -> no. A representative who has not named the company or
 * has not asserted authority -> no, and the surface says which. A broker with
 * no chain depth -> no, because `meetsApprovalMinimum` would refuse the record
 * later and the member should learn that here rather than after publishing.
 */
export function capacityComplete(answer: CapacityAnswer): boolean {
  const chosen = capacity(answer.key);
  if (!chosen) return false;
  if (chosen.requiresAuthority) {
    if (answer.authority.company.trim() === "") return false;
    if (!answer.authority.held) return false;
  }
  if (chosen.requiresChainDepth && !chainDepth(answer.chainDepthKey)) return false;
  return true;
}

/**
 * What is still owed, in words, for the disabled action's sub-line.
 *
 * One sentence, naming the missing thing. "Choose one to continue" is a
 * different failure from "Both are needed before this listing can be
 * published", and a member who has done half the work should not read the copy
 * for having done none.
 */
export function capacityOutstanding(answer: CapacityAnswer): string | null {
  const chosen = capacity(answer.key);
  if (!chosen) return "Choose one to continue";
  if (chosen.requiresAuthority) {
    const named = answer.authority.company.trim() !== "";
    if (!named && !answer.authority.held) {
      return "Both are needed before this listing can be published";
    }
    if (!named) return "Name the company you act for";
    if (!answer.authority.held) return "Confirm you hold its authority";
  }
  if (chosen.requiresChainDepth && !chainDepth(answer.chainDepthKey)) {
    return "Say how far you sit from the principal";
  }
  return null;
}

/**
 * The previous answer, offered for confirmation.
 *
 * Returns the capacity and a sentence saying Ponte has NOT applied it. The
 * sentence is part of the return value rather than the component's copy so that
 * a caller cannot render the suggestion without the disclaimer.
 */
export interface CapacitySuggestion {
  capacity: Capacity;
  /** Verbatim from the reference. Ponte has not applied this. */
  disclaimer: string;
}

export function suggestionFrom(previousLabel: string | null | undefined): CapacitySuggestion | null {
  const previous = capacityForLabel(previousLabel);
  if (!previous) return null;
  return {
    capacity: previous,
    disclaimer:
      "Ponte has not applied this. Capacity can differ from one opportunity to the next, so it asks every time.",
  };
}

/**
 * The columns this answer writes.
 *
 * `mandate_sighted` is absent by design; see the note at the top of the file.
 * The authority declaration travels as the member's own statement so it is
 * legible on the record without being promoted to Ponte's.
 */
export function capacityColumns(answer: CapacityAnswer): {
  submitter_role: string | null;
  chain_depth: string | null;
  authority_statement: string | null;
} {
  const chosen = capacity(answer.key);
  if (!chosen) return { submitter_role: null, chain_depth: null, authority_statement: null };

  const depth = chosen.requiresChainDepth ? chainDepth(answer.chainDepthKey) : null;
  const company = answer.authority.company.trim();
  const statement =
    chosen.requiresAuthority && company !== "" && answer.authority.held
      ? `Acting for ${company}. The member states they hold written authority to offer on its behalf and will provide it if asked. Not sighted by Ponte.`
      : null;

  return {
    submitter_role: chosen.label,
    chain_depth: depth ? depth.label : null,
    authority_statement: statement,
  };
}
