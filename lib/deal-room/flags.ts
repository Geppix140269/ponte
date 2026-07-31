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

/** The route flag. Anything other than exactly `on` means off. */
export function dealRoomRoutesEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEAL_ROOM === "on";
}

/**
 * Parse the server-side allowlist.
 *
 * Comma-separated organisation ids or profile ids. Empty, absent or
 * whitespace-only means **nobody**, which is the correct default for an
 * unreleased slice: a missing environment variable must not open a feature.
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
 * Checked server-side on every Deal Room route and command. Both the flag and
 * the allowlist must pass: the flag is the build-wide switch, the allowlist is
 * who it is switched on for.
 */
export function dealRoomAvailableTo(profileId: string | null, organisationId: string | null): boolean {
  if (!dealRoomRoutesEnabled()) return false;
  if (!profileId) return false;
  const allowed = allowlist();
  if (allowed.size === 0) return false;
  return allowed.has(profileId) || (organisationId !== null && allowed.has(organisationId));
}
