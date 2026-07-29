import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  Action,
  Band,
  Banner,
  CommandError,
  CommandForm,
  Empty,
  RoomHeader,
  StepStateChip,
  Submit,
} from "@/components/deal-room/primitives";
import { loadGoverningProcedure, loadRoom, listParticipants } from "@/lib/deal-room/queries";
import { canApproveProcedure, canProposeProcedure, mutationBlockedReason } from "@/lib/deal-room/permissions";
import { procedureDefects, templateFor } from "@/lib/deal-room/procedure";
import { procedureProgress } from "@/lib/deal-room/progress";
import { approveProcedure, proposeProcedure } from "../../actions";

export const dynamic = "force-dynamic";

/**
 * DR-09 and DR-10: the procedure, its structural validity, and its approval.
 *
 * Two rules are visible on this page rather than buried in a handler.
 *
 * **The procedure does not govern before approval.** Until every required
 * approver has approved, the page says so in words, shows who is outstanding,
 * and shows no percentage at all.
 *
 * **Approval is refused while the structure is invalid.** The defects are
 * listed, plural, because a proposer fixing four problems should see four
 * problems. The same rule is enforced again inside
 * `deal_room_approve_procedure()`, which is the one that counts.
 */
export default async function ProcedurePage({
  params,
  searchParams,
}: {
  params: { locale: string; roomId: string };
  searchParams?: { error?: string };
}) {
  setRequestLocale(params.locale);

  const access = await loadRoom(params.roomId);
  if (!access) notFound();

  const [procedure, participants] = await Promise.all([
    loadGoverningProcedure(params.roomId),
    listParticipants(params.roomId),
  ]);

  const base = `/${params.locale}/deal-rooms/${params.roomId}`;
  const blockedReason = mutationBlockedReason(access.viewer, access.context);

  if (!procedure) {
    return (
      <>
        <CommandError message={searchParams?.error} />
        <RoomHeader reference={access.room.ref} title="Agree how this Deal will move" />
        <Band title="No procedure yet">
          <Empty>
            Nothing is assigned and no evidence is expected until the parties agree a procedure. The procedure sets the
            steps, who is responsible for each, what evidence is required, who reviews it, and what counts as complete.
          </Empty>
          {canProposeProcedure(access.viewer, access.context) ? (
            <CommandForm
              action={proposeProcedure}
              hidden={{
                locale: params.locale,
                roomId: params.roomId,
                family: access.room.marketFamily,
                returnTo: `${base}/procedure`,
              }}
            >
              <Submit label={`Propose the ${access.room.marketFamily} procedure`} />
            </CommandForm>
          ) : (
            <div className="dr__actions">
              <Action
                label="Propose the procedure"
                reason={
                  blockedReason ??
                  "Only a principal participant or the room administrator can propose the procedure."
                }
              />
            </div>
          )}
          <p className="dr__why">
            The proposal is the family&rsquo;s own procedure: {templateFor(access.room.marketFamily).summary} It
            governs nothing until every required approver has approved it, and either side can amend it before then.
          </p>
        </Band>
      </>
    );
  }

  const defects = procedureDefects(procedure.steps);
  const progress = procedureProgress(procedure.state, procedure.steps);
  const governs = procedure.state === "approved" || procedure.state === "completed";

  const approversById = new Map(participants.map((participant) => [participant.id, participant]));
  const outstanding = procedure.approvals.filter((approval) => approval.response !== "approved");
  const objections = procedure.approvals.filter((approval) => approval.response === "objected");

  const totalWeight = procedure.steps.reduce((sum, step) => sum + step.weight, 0);

  return (
    <>
      <CommandError message={searchParams?.error} />
      <RoomHeader
        reference={`${access.room.ref} · Procedure version ${procedure.version}`}
        title={governs ? "The agreed procedure" : "Proposed procedure"}
        dealLine={procedure.summary}
      />

      {!governs ? (
        <Banner tone="review" title="This procedure does not govern yet">
          It becomes the agreed way of working only when every required approver has approved this version. No
          completion percentage is shown until then, and no responsibility on this page is binding.
        </Banner>
      ) : null}

      {defects.length > 0 ? (
        <Banner tone="danger" title="This version cannot be approved as it stands">
          {defects.map((defect) => defect.message).join(" ")}
        </Banner>
      ) : null}

      <Band title="Completion condition">
        <p className="dr__item-meta">{procedure.completionCondition}</p>
      </Band>

      <Band title={`Steps · total weight ${totalWeight}`}>
        <ul className="dr__list">
          {procedure.steps.map((step) => (
            <li className="dr__item" key={step.key}>
              <div>
                <p className="dr__item-title">
                  {step.seq}. {step.title}
                </p>
                <p className="dr__item-meta">
                  {step.stageLabel} · Responsible: {step.responsibleRole}
                  {step.requiresEvidence ? ` · Evidence reviewed by: ${step.requiredReviewerRole}` : ""}
                  {step.mandatory ? " · Mandatory" : " · Optional"}
                </p>
                <p className="dr__item-limit">{step.completionCondition}</p>
              </div>
              <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                <StepStateChip state={step.state} />
                <span className="dr__weight">Weight {step.weight}</span>
              </div>
            </li>
          ))}
        </ul>
        <p className="dr__why">
          Weights are approved with the procedure and are what make completion reproducible: the same approved version
          and the same step states always produce the same number.
          {governs && progress.value !== null ? ` This version currently stands at ${progress.value}%.` : ""}
        </p>
      </Band>

      <Band title="Approvals">
        {procedure.approvals.length === 0 ? (
          <Empty>No approver has been designated for this version yet.</Empty>
        ) : (
          <ul className="dr__list">
            {procedure.approvals.map((approval) => {
              const participant = approversById.get(approval.participantId);
              return (
                <li className="dr__item" key={approval.participantId}>
                  <div>
                    <p className="dr__item-title">
                      {participant?.name ?? "A required approver"}
                      {participant?.organisation ? ` · ${participant.organisation}` : ""}
                    </p>
                    {approval.reason ? <p className="dr__item-meta">{approval.reason}</p> : null}
                  </div>
                  <span
                    className={
                      approval.response === "approved"
                        ? "dr__chip dr__chip--done"
                        : approval.response === "objected"
                          ? "dr__chip dr__chip--danger"
                          : "dr__chip dr__chip--review"
                    }
                  >
                    {approval.response.replace(/_/g, " ")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {outstanding.length > 0 ? (
          <p className="dr__why">
            {outstanding.length === 1
              ? "One required approver has not yet responded."
              : `${outstanding.length} required approvers have not yet responded.`}{" "}
            {objections.length > 0 ? "An objection is recorded and must be resolved before this version can govern." : ""}
          </p>
        ) : null}

        {canApproveProcedure(access.viewer, access.context) && defects.length === 0 && !governs ? (
          <CommandForm
            action={approveProcedure}
            hidden={{
              locale: params.locale,
              roomId: params.roomId,
              procedureId: procedure.id,
              returnTo: `${base}/procedure`,
            }}
          >
            <Submit label="Approve this version" />
            <p className="dr__why">
              Your approval is recorded against you. The version governs only when every required approver has
              approved it, and the completion percentage appears at that moment and not before.
            </p>
          </CommandForm>
        ) : (
          <div className="dr__actions">
            <Action
              label="Approve this version"
              reason={
                canApproveProcedure(access.viewer, access.context)
                  ? defects.length > 0
                    ? "This version cannot be approved while its structure is invalid."
                    : "This version is already approved and governs the room."
                  : (blockedReason ?? "Only a designated required approver can approve the procedure.")
              }
            />
          </div>
        )}

        <div className="dr__actions">
          <Action label="Back to the room" href={base} secondary />
        </div>
      </Band>
    </>
  );
}
