import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  Action,
  Band,
  Banner,
  Empty,
  EvidenceStateChip,
  RoomHeader,
  StepStateChip,
} from "@/components/deal-room/primitives";
import {
  listBlockers,
  listEvidence,
  listParticipants,
  loadGoverningProcedure,
  loadRoom,
  loadSubRoom,
} from "@/lib/deal-room/queries";
import { mutationBlockedReason } from "@/lib/deal-room/permissions";
import { BLOCKER_CATEGORY_LABEL, PARTICIPANT_CLASS_LABEL } from "@/lib/deal-room/states";

export const dynamic = "force-dynamic";

/**
 * DR-08: the private sub-room workspace.
 *
 * A visibly enclosed boundary, and a real one. `loadSubRoom` returns null for
 * anybody the policy does not admit, and this page answers `notFound()` - the
 * same response as a workspace that does not exist. The Experience Design's
 * access-denied wording, "You do not have access to this workspace", is
 * deliberately not used for a workspace the reader has no business knowing
 * about: saying it would confirm one exists.
 *
 * Content is organised by procedure item. Conversation attaches to a task,
 * an evidence item or a blocker; there is no message feed, and no navigation
 * destination called "Discussion".
 */
export default async function SubRoomPage({
  params,
}: {
  params: { locale: string; roomId: string; subRoomId: string };
}) {
  setRequestLocale(params.locale);

  const access = await loadRoom(params.roomId);
  if (!access) notFound();

  const subRoom = await loadSubRoom(params.roomId, params.subRoomId);
  if (!subRoom) notFound();

  const [procedure, evidence, blockers, participants] = await Promise.all([
    loadGoverningProcedure(params.roomId),
    listEvidence(params.subRoomId),
    listBlockers(params.roomId),
    listParticipants(params.roomId),
  ]);

  const base = `/${params.locale}/deal-rooms/${params.roomId}`;
  const here = `${base}/workspaces/${params.subRoomId}`;
  const blockedReason = mutationBlockedReason(access.viewer, access.context);

  const here_blockers = blockers.filter((blocker) => blocker.subRoomId === params.subRoomId);
  const openHere = here_blockers.filter((blocker) => blocker.state !== "resolved" && blocker.state !== "waived");
  const inThisRoom = participants.filter((participant) => participant.subRoomId === params.subRoomId);
  const governs = procedure?.state === "approved" || procedure?.state === "completed";

  return (
    <>
      {access.readOnly ? (
        <Banner tone="quiet" title="This workspace is read-only">
          Everything here stays readable. Nothing has been deleted.
        </Banner>
      ) : null}

      <RoomHeader
        reference={`${access.room.ref} · ${subRoom.ref}`}
        title={subRoom.purpose}
        dealLine="A private workspace. What is written here is visible only to the participants admitted to it, and to the room's sponsor team."
      />

      <div className="dr__layout">
        <div>
          <Band title="Procedure items">
            {!procedure ? (
              <Empty>
                No procedure has been agreed yet, so nothing is assigned in this workspace. Agree the procedure first.
              </Empty>
            ) : (
              <ul className="dr__list">
                {procedure.steps.map((step) => (
                  <li className="dr__item" key={step.key}>
                    <div>
                      <p className="dr__item-title">
                        <a className="dr__link" href={`${here}/steps/${step.key}`}>
                          {step.title}
                        </a>
                      </p>
                      <p className="dr__item-meta">
                        {step.stageLabel} · {step.responsibleRole}
                        {step.requiresEvidence ? " · Evidence required" : ""}
                      </p>
                    </div>
                    <StepStateChip state={step.state} />
                  </li>
                ))}
              </ul>
            )}
            {!governs && procedure ? (
              <p className="dr__why">
                This procedure has not been approved by every required approver, so nothing in it is binding yet.
              </p>
            ) : null}
          </Band>

          <Band title="Evidence">
            {evidence.length === 0 ? (
              <Empty>
                No evidence has been supplied in this workspace. The procedure lists what is expected and who owns each
                item; uploading a document is not a check, and nothing counts until a reviewer accepts it for the
                procedure.
              </Empty>
            ) : (
              <ul className="dr__list">
                {evidence.slice(0, 6).map((item) => (
                  <li className="dr__item" key={item.id}>
                    <div>
                      <p className="dr__item-title">
                        <a className="dr__link" href={`${here}/evidence/${item.id}`}>
                          {item.title}
                        </a>
                      </p>
                      <p className="dr__item-meta">
                        {item.providerLabel} · version {item.currentVersion}
                      </p>
                    </div>
                    <EvidenceStateChip state={item.state} />
                  </li>
                ))}
              </ul>
            )}
            <div className="dr__actions">
              <Action label="Evidence register" href={`${here}/evidence`} secondary />
            </div>
          </Band>

          <Band title="Blockers">
            {openHere.length === 0 ? (
              <p className="dr__item-meta">
                No open blocker in this workspace.
                {here_blockers.length > 0 ? ` ${here_blockers.length} resolved and retained in the history.` : ""}
              </p>
            ) : (
              <ul className="dr__list">
                {openHere.map((blocker) => (
                  <li className="dr__item" key={blocker.id}>
                    <div>
                      <p className="dr__item-title">{blocker.title}</p>
                      <p className="dr__item-meta">{blocker.resolutionRequirement}</p>
                    </div>
                    <span
                      className={
                        blocker.category === "critical" ? "dr__chip dr__chip--danger" : "dr__chip dr__chip--review"
                      }
                    >
                      {BLOCKER_CATEGORY_LABEL[blocker.category]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="dr__actions">
              <Action label="Blocker centre" href={`${here}/blockers`} secondary />
            </div>
          </Band>
        </div>

        <aside className="dr__rail">
          <Band title="Who is in this workspace">
            <ul className="dr__list">
              {inThisRoom.map((participant) => (
                <li className="dr__item" key={participant.id}>
                  <div>
                    <p className="dr__item-title">{participant.name}</p>
                    <p className="dr__item-meta">
                      {participant.organisation ?? participant.declaredCapacity ?? "Capacity not stated"}
                    </p>
                    <p className="dr__item-limit">
                      {PARTICIPANT_CLASS_LABEL[participant.participantClass]} · {participant.transactionRole}
                      {participant.participationAuthority ? ` · ${participant.participationAuthority}` : ""}
                    </p>
                  </div>
                  <span
                    className={
                      participant.state === "admitted" || participant.state === "active"
                        ? "dr__chip dr__chip--done"
                        : "dr__chip dr__chip--review"
                    }
                  >
                    {participant.state.replace(/_/g, " ")}
                  </span>
                </li>
              ))}
            </ul>
            <p className="dr__why">
              You see the participants of this workspace and nobody else. Other workspaces connected to this Deal, if
              any exist, are not visible from here.
            </p>
          </Band>

          <Band title="Visibility">
            <p className="dr__item-meta">
              Anything you add here defaults to this workspace only. You can narrow it further when you add it, and the
              setting is shown at the point of creation rather than hidden in a menu.
            </p>
          </Band>

          {blockedReason ? (
            <Band title="Why actions are unavailable">
              <p className="dr__item-meta">{blockedReason}</p>
            </Band>
          ) : null}
        </aside>
      </div>
    </>
  );
}
