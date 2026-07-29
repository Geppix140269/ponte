import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Action, Band, Empty, RoomHeader } from "@/components/deal-room/primitives";
import { listBlockers, listParticipants, loadRoom, loadSubRoom } from "@/lib/deal-room/queries";
import { canOpenBlocker, canResolveBlocker, mutationBlockedReason } from "@/lib/deal-room/permissions";
import { BLOCKER_CATEGORY_LABEL, blockerIsOpen } from "@/lib/deal-room/states";

export const dynamic = "force-dynamic";

/**
 * DR-15: the blocker centre.
 *
 * Ranked by commercial impact, not by date. The reader's question is "what is
 * stopping this", and a chronological list answers a different one.
 *
 * A resolved blocker stays on this page. It is not archived, hidden behind a
 * filter or deleted: acceptance criterion 10 requires it to be retained in
 * history, and the resolution is part of what the room evidences about itself.
 */
export default async function BlockerCentrePage({
  params,
}: {
  params: { locale: string; roomId: string; subRoomId: string };
}) {
  setRequestLocale(params.locale);

  const access = await loadRoom(params.roomId);
  if (!access) notFound();

  const subRoom = await loadSubRoom(params.roomId, params.subRoomId);
  if (!subRoom) notFound();

  const [blockers, participants] = await Promise.all([listBlockers(params.roomId), listParticipants(params.roomId)]);

  const here = `/${params.locale}/deal-rooms/${params.roomId}/workspaces/${params.subRoomId}`;
  const blockedReason = mutationBlockedReason(access.viewer, access.context);
  const openReason = canOpenBlocker(access.viewer, access.context)
    ? null
    : (blockedReason ?? "Your participant class cannot open a blocker in this room.");

  const mine = blockers.filter((blocker) => blocker.subRoomId === params.subRoomId);
  const rank = { critical: 0, material: 1, operational: 2 } as const;
  const open = mine.filter((blocker) => blockerIsOpen(blocker.state)).sort((a, b) => rank[a.category] - rank[b.category]);
  const closed = mine.filter((blocker) => !blockerIsOpen(blocker.state));

  const byId = new Map(participants.map((participant) => [participant.id, participant]));

  return (
    <>
      <RoomHeader
        reference={`${access.room.ref} · ${subRoom.ref}`}
        title="Blockers"
        dealLine="What is preventing progress, who owns it, and what would resolve it. An open blocker does not remove progress already earned."
      />

      <Band title={open.length === 0 ? "Nothing is blocked" : open.length === 1 ? "1 open blocker" : `${open.length} open blockers`}>
        {open.length === 0 ? (
          <p className="dr__item-meta">
            No blocker is open in this workspace. Progress is limited by the work outstanding, not by an impediment.
          </p>
        ) : (
          <ul className="dr__list">
            {open.map((blocker) => {
              const owner = blocker.ownerParticipantId ? byId.get(blocker.ownerParticipantId) : null;
              const resolveReason = canResolveBlocker(access.viewer, access.context, blocker.ownerParticipantId ?? "")
                ? null
                : (blockedReason ?? "A blocker is resolved by the participant who owns it, or by a room administrator.");
              return (
                <li className="dr__item" key={blocker.id}>
                  <div>
                    <p className="dr__item-title">{blocker.title}</p>
                    <p className="dr__item-meta">{blocker.description}</p>
                    <p className="dr__item-limit">
                      What would resolve it: {blocker.resolutionRequirement}
                      {owner ? ` · Owner: ${owner.name}${owner.organisation ? `, ${owner.organisation}` : ""}` : " · No owner assigned"}
                    </p>
                    <div className="dr__actions">
                      <Action label="Resolve" reason={resolveReason} secondary />
                    </div>
                  </div>
                  <span
                    className={
                      blocker.category === "critical"
                        ? "dr__chip dr__chip--danger"
                        : blocker.category === "material"
                          ? "dr__chip dr__chip--review"
                          : "dr__chip"
                    }
                  >
                    {BLOCKER_CATEGORY_LABEL[blocker.category]}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <div className="dr__actions">
          <Action label="Open a blocker" reason={openReason} />
          <Action label="Back to the workspace" href={here} secondary />
        </div>
      </Band>

      <Band title="Resolved, and retained">
        {closed.length === 0 ? (
          <Empty>No blocker has been resolved in this workspace yet.</Empty>
        ) : (
          <ul className="dr__list">
            {closed.map((blocker) => (
              <li className="dr__item" key={blocker.id}>
                <div>
                  <p className="dr__item-title">{blocker.title}</p>
                  <p className="dr__item-meta">{blocker.resolutionNote ?? "Resolved."}</p>
                  <p className="dr__item-limit">
                    {blocker.resolvedAt
                      ? `Resolved ${new Date(blocker.resolvedAt).toISOString().slice(0, 10)}. Kept in the room history.`
                      : "Kept in the room history."}
                  </p>
                </div>
                <span className="dr__chip dr__chip--done">{blocker.state}</span>
              </li>
            ))}
          </ul>
        )}
      </Band>
    </>
  );
}
