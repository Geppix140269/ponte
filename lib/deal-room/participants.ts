/**
 * Participant ROWS are not people.
 *
 * `deal_room_propose` admits the initiator twice - once at master level and once
 * into the first workspace - so one person holds two rows in their own room from
 * the moment it exists. Every counterparty admitted into a second workspace adds
 * another row for themselves.
 *
 * `listParticipants()` returns rows, which is right: the blocker owner and the
 * workspace roster are both facts about rows. But anything that counts, lists or
 * draws *people* has to reduce first, and three surfaces did not:
 *
 * - `invitationSent: participants.length > 1` was true on a room containing only
 *   its creator, so the Bridge showed the invitation milestone reached before any
 *   invitation existed;
 * - the Bridge drew the initiator twice and its label read "2 participants";
 * - the invitation page said "2 participants in the parts of this room you can
 *   see" to someone sitting alone in a new room.
 *
 * This is the same mistake the database had in `deal_room_propose_procedure`,
 * where seeding one approval per participant row gave the initiator two
 * obligations for themselves and no procedure could ever be approved (LB-001,
 * `20260731c`). It is worth keeping the two fixes in mind together: a row is a
 * membership, a person is a party.
 *
 * Pure module: no database, no React, no server imports.
 */

/** The shape this needs. Wider rows pass through untouched. */
export interface PersonRow {
  profileId: string;
  subRoomId: string | null;
}

/**
 * One row per person, keeping the row that best represents them.
 *
 * The working row is the sub-room one - it carries the permissions the person
 * actually exercises, and it is the row a co-participant of that sub-room is
 * allowed to read. The master-level row is the fallback, because only a room
 * administrator can read someone else's.
 *
 * Deterministic regardless of the order the database returned: ties break on
 * `subRoomId`, then on whatever identity the caller carries, so two calls over
 * the same set choose the same rows.
 */
export function onePerPerson<T extends PersonRow>(rows: readonly T[]): T[] {
  const byPerson = new Map<string, T>();

  for (const row of rows) {
    const held = byPerson.get(row.profileId);
    if (!held || prefers(row, held)) byPerson.set(row.profileId, row);
  }

  return Array.from(byPerson.values());
}

/** How many distinct people these rows represent. */
export function countPeople(rows: readonly PersonRow[]): number {
  return new Set(rows.map((row) => row.profileId)).size;
}

function prefers<T extends PersonRow>(candidate: T, held: T): boolean {
  const candidateWorking = candidate.subRoomId !== null;
  const heldWorking = held.subRoomId !== null;
  if (candidateWorking !== heldWorking) return candidateWorking;

  // Both are sub-room rows, or both are master-level. Break the tie on a stable
  // value so the choice does not depend on the order rows arrived in.
  const a = `${candidate.subRoomId ?? ""}|${(candidate as { id?: string }).id ?? ""}`;
  const b = `${held.subRoomId ?? ""}|${(held as { id?: string }).id ?? ""}`;
  return a < b;
}
