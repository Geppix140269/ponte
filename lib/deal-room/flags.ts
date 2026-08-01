/**
 * The feature flag and the organisation allowlist.
 *
 * ## These are not a security boundary, and the distinction matters
 *
 * `NEXT_PUBLIC_DEAL_ROOM` is a `NEXT_PUBLIC_*` variable, so its value is inlined
 * into the client bundle at build time and is readable by anyone who views
 * source. It controls **routing**: whether the Deal Room surfaces exist for a
 * visitor. It controls nothing about data.
 *
 * Row Level Security is the boundary. Turning the flag on for the wrong person
 * shows them an empty portfolio, because the policies return no rows to a
 * non-participant. That is the property that makes the flag safe to be public.
 *
 * `DEAL_ROOM_ALLOWLIST` is server-only, has no `NEXT_PUBLIC_` prefix and is
 * therefore never shipped to the browser. It is a staged-rollout control, not a
 * permission model: an allowlisted member still sees only their own rooms.
 *
 * It is checked on every Deal Room route, through `loadAccess`, and in every
 * server action **except the four that carry an invited counterparty through
 * admission** - accept, declare, accept agreement, complete admission. An
 * invitee is not necessarily allowlisted, and gating them would make invitations
 * unusable while the rollout is staged. `app/[locale]/deal-rooms/actions.ts`
 * says so where they are, and `__tests__/action-gate.test.ts` holds the list so
 * the exception cannot grow silently.
 *
 * This paragraph used to claim the check was in "every server route and command
 * handler". It was not: on 31 July 2026, eleven of fifteen actions did not call
 * it, seven of them for no reason at all. Documentation is not a mechanism, and
 * that is why there is now a test.
 *
 * ## Safe disable
 *
 * Acceptance criterion 16: turning the flag off removes access to the
 * unfinished slice without regressing existing journeys. That holds by
 * construction rather than by care - the Deal Room adds only new routes and new
 * tables, and alters no existing table, column, policy, route or journey. With
 * the flag off there is nothing left of it but rows nobody can reach.
 *
 * Both variables are read through member expressions rather than a computed
 * lookup, so the Next build can still inline the public one.
 */

/**
 * The route flag. Explicitly `off` means off; anything else means on.
 *
 * ## This default was inverted on 1 August 2026, on the owner's instruction
 *
 * It used to require exactly `on`, so an absent variable closed the feature.
 * That is the right default for an UNRELEASED slice, and it was right for as
 * long as the Deal Room was one. It stopped being right the moment the
 * entrance made "Open a Deal Room" the largest control on the site: the
 * product now sells the room on its front page, and a release switch that
 * defaults to closed makes the front page lie by default.
 *
 * The owner, having followed his own call to action:
 *
 * > I want to open a Deal Room, and I get this. And this is, like, you know,
 * > I'm just gonna leave and never come back.
 *
 * Closing it again is one variable, `NEXT_PUBLIC_DEAL_ROOM=off`. That is now
 * the deliberate act, rather than the accident.
 */
export function dealRoomRoutesEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEAL_ROOM !== "off";
}

/**
 * Parse the server-side restriction list.
 *
 * Comma-separated organisation ids or profile ids. Empty, absent or
 * whitespace-only now means **everybody**, not nobody.
 *
 * That inversion is the substantive half of the change. This began as a
 * staged-rollout control, written when nothing in the product linked to the
 * room, and "empty means nobody" was correct then. In production it was never
 * populated, so the site's primary call to action was unreachable for every
 * human being including the owner.
 *
 * It survives as an OPTIONAL narrowing: set it and only those ids get in;
 * leave it unset and any signed-in member does.
 */
export function allowlist(): Set<string> {
  const raw = process.env.DEAL_ROOM_ALLOWLIST ?? "";
  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

/**
 * Whether this member may reach the Deal Room at all.
 *
 * Checked server-side on every Deal Room route and command.
 *
 * ## Why opening this is safe
 *
 * The reason is the paragraph at the top of this file, written before anybody
 * needed it: **the flag is not a security boundary. Row Level Security is.**
 * Letting somebody through shows them an empty portfolio, because the policies
 * return no rows to a non-participant, and a room they are not in stays
 * invisible to them. Nothing here grants access to any data.
 *
 * A signed-in member is still required, and that requirement is unchanged. An
 * anonymous visitor has no profile for the policies to answer for, so the
 * routes send them to sign in rather than into a room.
 */
export function dealRoomAvailableTo(profileId: string | null, organisationId: string | null): boolean {
  if (!dealRoomRoutesEnabled()) return false;
  if (!profileId) return false;
  const allowed = allowlist();
  // Unrestricted. Any signed-in member; RLS decides what they can then see.
  if (allowed.size === 0) return true;
  return allowed.has(profileId) || (organisationId !== null && allowed.has(organisationId));
}
