import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  Action,
  Band,
  Empty,
  EvidenceStateChip,
  RoomHeader,
  StepStateChip,
} from "@/components/deal-room/primitives";
import {
  listBlockers,
  listEvidence,
  loadGoverningProcedure,
  loadRoom,
  loadSubRoom,
} from "@/lib/deal-room/queries";
import { canAcceptEvidence, canUploadEvidence, mutationBlockedReason } from "@/lib/deal-room/permissions";
import { procedureGoverns } from "@/lib/deal-room/states";

export const dynamic = "force-dynamic";

/**
 * DR-11: one unit of work, in focus.
 *
 * The rule the Experience Design sets for this screen is that it "explains why
 * an action is unavailable rather than merely disabling it", and that is most
 * of what the code below is doing. Three different reasons can make the same
 * button unavailable - the procedure does not govern yet, the reader is not the
 * named reviewer, the room is read-only - and the member is owed the right one.
 */
export default async function StepPage({
  params,
}: {
  params: { locale: string; roomId: string; subRoomId: string; stepKey: string };
}) {
  setRequestLocale(params.locale);

  const access = await loadRoom(params.roomId);
  if (!access) notFound();

  const subRoom = await loadSubRoom(params.roomId, params.subRoomId);
  if (!subRoom) notFound();

  const procedure = await loadGoverningProcedure(params.roomId);
  const step = procedure?.steps.find((candidate) => candidate.key === params.stepKey);
  if (!procedure || !step) notFound();

  const [evidence, blockers] = await Promise.all([listEvidence(params.subRoomId), listBlockers(params.roomId)]);

  const here = `/${params.locale}/deal-rooms/${params.roomId}/workspaces/${params.subRoomId}`;
  const governs = procedureGoverns(procedure.state);
  const blockedReason = mutationBlockedReason(access.viewer, access.context);

  // The reviewer test for THIS step, which the generic viewer cannot know.
  const viewerIsReviewer = Boolean(
    step.requiredReviewerRole && access.viewer && access.viewer.participantClass === step.requiredReviewerRole,
  );
  const viewerForStep = access.viewer ? { ...access.viewer, isReviewer: viewerIsReviewer } : null;

  const relatedEvidence = evidence.filter((item) => item.stepId !== null);
  const relatedBlockers = blockers.filter(
    (blocker) => blocker.state !== "resolved" && blocker.state !== "waived" && blocker.subRoomId === params.subRoomId,
  );

  const uploadReason = canUploadEvidence(viewerForStep, access.context)
    ? governs
      ? null
      : "The procedure has not been approved by every required approver, so nothing is required yet."
    : (blockedReason ?? "Your participant class cannot supply evidence in this room.");

  const acceptReason = canAcceptEvidence(viewerForStep, access.context)
    ? governs
      ? null
      : "The procedure has not been approved yet, so nothing can be accepted for it."
    : (blockedReason ??
      (step.requiredReviewerRole
        ? `The procedure names ${step.requiredReviewerRole} as the reviewer for this requirement.`
        : "This step does not require a review decision."));

  return (
    <>
      <RoomHeader
        reference={`${access.room.ref} · ${subRoom.ref} · Step ${step.seq}`}
        title={step.title}
        dealLine={step.completionCondition}
      />

      <div className="dr__layout">
        <div>
          <Band title="Requirement">
            <ul className="dr__list">
              <li className="dr__item">
                <div>
                  <p className="dr__item-title">Responsible</p>
                  <p className="dr__item-meta">{step.responsibleRole}</p>
                </div>
                <StepStateChip state={step.state} />
              </li>
              <li className="dr__item">
                <div>
                  <p className="dr__item-title">Evidence</p>
                  <p className="dr__item-meta">
                    {step.requiresEvidence
                      ? `Required. Reviewed by ${step.requiredReviewerRole}.`
                      : "Not required for this step."}
                  </p>
                </div>
                <span className="dr__weight">Weight {step.weight}</span>
              </li>
              <li className="dr__item">
                <div>
                  <p className="dr__item-title">Stage</p>
                  <p className="dr__item-meta">
                    {step.stageLabel} · {step.mandatory ? "Mandatory" : "Optional"}
                  </p>
                </div>
              </li>
            </ul>
          </Band>

          <Band title="Evidence for this requirement">
            {relatedEvidence.length === 0 ? (
              <Empty>
                {step.requiresEvidence
                  ? `Nothing has been supplied yet. ${step.responsibleRole} owns this, and ${step.requiredReviewerRole} decides whether what arrives satisfies the requirement.`
                  : "This step needs no evidence. It completes when its condition is met and recorded."}
              </Empty>
            ) : (
              <ul className="dr__list">
                {relatedEvidence.map((item) => (
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
              <Action label="Submit evidence" reason={uploadReason} href={uploadReason ? undefined : `${here}/evidence`} />
              <Action label="Accept for procedure" reason={acceptReason} />
            </div>
          </Band>

          {relatedBlockers.length > 0 ? (
            <Band title="What is holding this up">
              <ul className="dr__list">
                {relatedBlockers.map((blocker) => (
                  <li className="dr__item" key={blocker.id}>
                    <div>
                      <p className="dr__item-title">{blocker.title}</p>
                      <p className="dr__item-meta">{blocker.resolutionRequirement}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Band>
          ) : null}
        </div>

        <aside className="dr__rail">
          <Band title="Completion condition">
            <p className="dr__item-meta">{step.completionCondition}</p>
            <p className="dr__why">
              This is what the parties approved. It is the only test for whether this step is done, and it cannot be
              changed without a new procedure version and fresh approval.
            </p>
          </Band>
          <div className="dr__actions">
            <Action label="Back to the workspace" href={here} secondary />
          </div>
        </aside>
      </div>
    </>
  );
}
