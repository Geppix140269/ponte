// The listing lifecycle.
//
// One status vocabulary, one place that says which transitions are legal, and
// one place that says who is allowed to cause them. Before this module the
// lifecycle lived in a check constraint, an RLS policy, two server actions and
// the reader's memory, which is how `submitted` came to mean "waiting for
// Giuseppe" without anything ever deciding that it should.
//
// The vocabulary is DELIBERATELY the one already in the database plus the two
// states automated publication needs. Renaming `approved` to `published` would
// touch every public read path, the RLS policies, four indexes and the board,
// and would buy a word. So `approved` remains the stored value and `published`
// is what it is called to a member — a presentation decision, recorded here
// rather than rediscovered per surface.
//
// Pure and import-free, for the standalone test runner.

/**
 * The stored lifecycle states.
 *
 * `submitted`  — with Ponte, not yet resolved. Under automated publication this
 *                is a transient state measured in milliseconds, not days: the
 *                validator runs on submission and moves the record straight on.
 *                It survives because legacy rows sit in it and because a
 *                validator failure must land somewhere honest.
 * `approved`   — public. Presented as "published"/"live".
 * `flagged`    — an automated safety check raised an exception. Not public,
 *                and not an accusation: it is a hold pending a human look.
 * `needs_information` — structurally incomplete. The member can fix it.
 * `rejected`   — a human decided against it.
 * `suspended`  — was public, publication paused.
 * `withdrawn`  — the member took it down.
 * `expired`    — its declared validity lapsed.
 * `closed` / `closed_done` / `archived` — pre-existing bookkeeping states.
 */
export type ListingStatus =
  | "draft"
  | "submitted"
  | "validating"
  | "needs_information"
  | "approved"
  | "flagged"
  | "suspended"
  | "rejected"
  | "expired"
  | "withdrawn"
  | "closed"
  | "closed_done"
  | "archived";

export const LISTING_STATUSES: readonly ListingStatus[] = [
  "draft", "submitted", "validating", "needs_information", "approved",
  "flagged", "suspended", "rejected", "expired", "withdrawn",
  "closed", "closed_done", "archived",
];

export function isListingStatus(v: unknown): v is ListingStatus {
  return typeof v === "string" && (LISTING_STATUSES as readonly string[]).includes(v);
}

/** The stored value that means "public". One place, so nothing drifts. */
export const PUBLISHED_STATUS: ListingStatus = "approved";

/** Is this listing on the public board right now? */
export function isPublic(status: string | null | undefined): boolean {
  return status === PUBLISHED_STATUS;
}

/**
 * Statuses a member is allowed to write from their own client.
 *
 * Everything else is a privileged transition and must go through trusted
 * server-side logic. A member may put their own work down (`draft`), hand it in
 * (`submitted`) or take it off the board (`withdrawn`). A member may NOT make
 * themselves public, clear a safety flag, or lift their own suspension — those
 * are exactly the transitions a forged form post would want.
 */
export const MEMBER_WRITABLE_STATUSES: readonly ListingStatus[] = [
  "draft", "submitted", "withdrawn",
];

export function isMemberWritableStatus(v: unknown): v is ListingStatus {
  return typeof v === "string" && (MEMBER_WRITABLE_STATUSES as readonly string[]).includes(v);
}

/** Who caused a transition. Recorded on every status change. */
export type LifecycleActor = "member" | "system" | "admin";

/**
 * The legal transitions, by actor.
 *
 * Read as: from this status, this actor may move the listing to one of these.
 * A transition absent here is refused rather than merely discouraged.
 */
const TRANSITIONS: Record<ListingStatus, Record<LifecycleActor, ListingStatus[]>> = {
  draft: {
    member: ["submitted", "withdrawn"],
    system: ["validating"],
    admin: ["flagged", "rejected", "archived"],
  },
  submitted: {
    member: ["draft", "withdrawn"],
    system: ["validating", "approved", "needs_information", "flagged"],
    admin: ["approved", "rejected", "flagged", "needs_information", "closed"],
  },
  validating: {
    member: [],
    system: ["approved", "needs_information", "flagged", "submitted"],
    admin: ["approved", "rejected", "flagged", "needs_information"],
  },
  needs_information: {
    member: ["draft", "submitted", "withdrawn"],
    system: ["validating"],
    admin: ["flagged", "rejected", "archived"],
  },
  approved: {
    // A member takes their own listing down; they never move it sideways into
    // another public-adjacent state.
    member: ["withdrawn", "draft"],
    system: ["expired", "suspended", "validating"],
    admin: ["suspended", "rejected", "closed", "closed_done", "flagged"],
  },
  flagged: {
    member: ["withdrawn"],
    system: [],
    // Only a human clears a flag. That is the entire point of a flag.
    admin: ["approved", "rejected", "needs_information", "suspended", "archived"],
  },
  suspended: {
    member: ["withdrawn"],
    system: [],
    admin: ["approved", "rejected", "needs_information", "archived"],
  },
  rejected: {
    member: ["draft", "withdrawn"],
    system: [],
    admin: ["needs_information", "archived"],
  },
  expired: {
    member: ["draft", "submitted", "withdrawn"],
    system: ["validating"],
    admin: ["archived", "closed"],
  },
  withdrawn: {
    member: ["draft", "submitted"],
    system: [],
    admin: ["archived"],
  },
  closed: { member: [], system: [], admin: ["archived", "closed_done"] },
  closed_done: { member: [], system: [], admin: ["archived"] },
  archived: { member: [], system: [], admin: [] },
};

/** Whether `actor` may move a listing from `from` to `to`. */
export function canTransition(
  from: string | null | undefined,
  to: string | null | undefined,
  actor: LifecycleActor,
): boolean {
  if (!isListingStatus(from) || !isListingStatus(to)) return false;
  if (from === to) return true;
  return TRANSITIONS[from][actor].includes(to);
}

/** The statuses `actor` may move a listing to from `from`. */
export function allowedTransitions(
  from: string | null | undefined,
  actor: LifecycleActor,
): ListingStatus[] {
  if (!isListingStatus(from)) return [];
  return [...TRANSITIONS[from][actor]];
}

/**
 * Statuses the exception console exists for.
 *
 * `/admin/listings` is not the publication queue any more. It is where the
 * cases automated publication could not resolve arrive, and this is that list.
 */
export const EXCEPTION_STATUSES: readonly ListingStatus[] = [
  "flagged", "suspended", "needs_information", "submitted",
];

export function isExceptionStatus(v: unknown): v is ListingStatus {
  return typeof v === "string" && (EXCEPTION_STATUSES as readonly string[]).includes(v);
}

/**
 * What a member is told their listing is.
 *
 * Deliberately not the stored value: `approved` reads as though somebody
 * approved of it, which under automated publication nobody did. `needs_
 * information` reads as a task, which it is. Nothing here implies Ponte checked
 * the commercial claims.
 */
export function memberStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "approved": return "Published";
    case "draft": return "Draft";
    case "submitted": return "Being checked";
    case "validating": return "Being checked";
    case "needs_information": return "Needs information";
    case "flagged": return "Additional check";
    case "suspended": return "Publication paused";
    case "rejected": return "Not published";
    case "expired": return "Expired";
    case "withdrawn": return "Withdrawn";
    case "closed":
    case "closed_done": return "Closed";
    case "archived": return "Archived";
    default: return "Unknown";
  }
}
