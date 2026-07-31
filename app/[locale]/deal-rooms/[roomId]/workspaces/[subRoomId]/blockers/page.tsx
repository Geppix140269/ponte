import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  Action,
  Band,
  CommandError,
  CommandForm,
  Empty,
  Field,
  RoomHeader,
  SelectField,
  Submit,
  TextField,
} from "@/components/deal-room/primitives";
import UnsavedFormGuard from "@/components/ponte/nav/UnsavedFormGuard";
import { openBlocker, resolveBlocker } from "../../../../actions";
import { listBlockers, listParticipants, loadRoom, loadSubRoom } from "@/lib/deal-room/queries";
import { canOpenBlocker, canResolveBlocker, mutationBlockedReason } from "@/lib/deal-room/permissions";
import { BLOCKER_CATEGORIES, BLOCKER_CATEGORY_LABEL, blockerIsOpen } from "@/lib/deal-room/states";

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
  searchParams,
}: {
  params: { locale: string; roomId: string; subRoomId: string };
  searchParams?: { error?: string };
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

  const hereBlockers = `${here}/blockers`;

  return (
    <UnsavedFormGuard>
      <CommandError message={searchParams?.error} />
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
                    {resolveReason ? (
                      <div className="dr__actions">
                        <Action label="Resolve" reason={resolveReason} secondary />
                      </div>
                    ) : (
                      <CommandForm
                        action={resolveBlocker}
                        hidden={{
                          locale: params.locale,
                          roomId: params.roomId,
                          subRoomId: params.subRoomId,
                          blockerId: blocker.id,
                          returnTo: hereBlockers,
                        }}
                      >
                        <TextField
                          label="How it was resolved"
                          name="note"
                          required
                          help="Required. A blocker closed without a note is not a record, and this stays in the history with the blocker itself."
                        />
                        <Submit label="Resolve this blocker" secondary />
                      </CommandForm>
                    )}
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

        {openReason ? (
          <div className="dr__actions">
            <Action label="Open a blocker" reason={openReason} />
          </div>
        ) : (
          <CommandForm
            action={openBlocker}
            hidden={{
              locale: params.locale,
              roomId: params.roomId,
              subRoomId: params.subRoomId,
              returnTo: hereBlockers,
            }}
          >
            <Field label="What is blocked" name="title" required />
            <TextField label="What is happening" name="description" required />
            <SelectField
              label="Commercial impact"
              name="category"
              defaultValue="material"
              options={BLOCKER_CATEGORIES.map((c) => ({ value: c, label: BLOCKER_CATEGORY_LABEL[c] }))}
              help="A critical blocker marks the room blocked. Progress already earned is unchanged either way."
            />
            <TextField
              label="What would resolve it"
              name="requirement"
              required
              help="Required. A blocker without a resolution requirement is a complaint."
            />
            <Submit label="Open the blocker" />
          </CommandForm>
        )}

        <div className="dr__actions">
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
    </UnsavedFormGuard>
  );
}
