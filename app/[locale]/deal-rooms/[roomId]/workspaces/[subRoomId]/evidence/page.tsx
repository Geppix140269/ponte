import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Action, Band, Empty, EvidenceStateChip, RoomHeader } from "@/components/deal-room/primitives";
import { listEvidence, loadGoverningProcedure, loadRoom, loadSubRoom } from "@/lib/deal-room/queries";
import { canUploadEvidence, mutationBlockedReason } from "@/lib/deal-room/permissions";
import { EVIDENCE_VISIBILITY_LABEL, EVIDENCE_STATES, EVIDENCE_STATE_LABEL } from "@/lib/deal-room/states";

export const dynamic = "force-dynamic";

/**
 * DR-12: the evidence register.
 *
 * Grouped by procedural purpose rather than by file type, because the question
 * a reader has is "what does the procedure still need", not "what PDFs are
 * here".
 *
 * The three empty cases the Experience Design distinguishes are distinguished:
 * no evidence expected, evidence expected and not supplied, and evidence that
 * exists but this reader cannot see - the last of which appears simply as
 * absence, because the row was filtered by the policy and the interface never
 * learns it existed.
 */
export default async function EvidenceRegisterPage({
  params,
}: {
  params: { locale: string; roomId: string; subRoomId: string };
}) {
  setRequestLocale(params.locale);

  const access = await loadRoom(params.roomId);
  if (!access) notFound();

  const subRoom = await loadSubRoom(params.roomId, params.subRoomId);
  if (!subRoom) notFound();

  const [evidence, procedure] = await Promise.all([
    listEvidence(params.subRoomId),
    loadGoverningProcedure(params.roomId),
  ]);

  const here = `/${params.locale}/deal-rooms/${params.roomId}/workspaces/${params.subRoomId}`;
  const blockedReason = mutationBlockedReason(access.viewer, access.context);
  const uploadReason = canUploadEvidence(access.viewer, access.context)
    ? null
    : (blockedReason ?? "Your participant class cannot supply evidence in this room.");

  const expecting = (procedure?.steps ?? []).filter((step) => step.requiresEvidence);
  const byStep = new Map<string, typeof evidence>();
  for (const item of evidence) {
    const key = item.stepId ?? "unlinked";
    byStep.set(key, [...(byStep.get(key) ?? []), item]);
  }

  const counts = EVIDENCE_STATES.map((state) => ({
    state,
    count: evidence.filter((item) => item.state === state).length,
  })).filter((entry) => entry.count > 0);

  return (
    <>
      <RoomHeader
        reference={`${access.room.ref} · ${subRoom.ref}`}
        title="Evidence"
        dealLine="Uploaded, accepted for the procedure and independently verified are three different states. Nothing on this page treats a document as checked because it arrived."
      />

      {counts.length > 0 ? (
        <Band title="By state">
          <div className="dr__actions">
            {counts.map((entry) => (
              <span className="dr__chip" key={entry.state}>
                {EVIDENCE_STATE_LABEL[entry.state]} · {entry.count}
              </span>
            ))}
          </div>
        </Band>
      ) : null}

      <Band title="Required by the procedure">
        {expecting.length === 0 ? (
          <Empty>
            {procedure
              ? "No step in the agreed procedure requires evidence."
              : "No procedure has been agreed yet, so nothing is required. Agree the procedure first, and the requirements will appear here with their owners and reviewers."}
          </Empty>
        ) : (
          <ul className="dr__list">
            {expecting.map((step) => {
              const supplied = evidence.filter((item) => item.stepId !== null && item.title.length > 0);
              const forStep = byStep.get(step.key) ?? supplied.filter(() => false);
              return (
                <li className="dr__item" key={step.key}>
                  <div>
                    <p className="dr__item-title">{step.title}</p>
                    <p className="dr__item-meta">
                      Owner: {step.responsibleRole} · Reviewer: {step.requiredReviewerRole}
                    </p>
                    {forStep.length === 0 ? (
                      <p className="dr__item-limit">
                        Nothing supplied yet. This is what the procedure expects, and who owns it.
                      </p>
                    ) : null}
                  </div>
                  <span className={forStep.length > 0 ? "dr__chip dr__chip--done" : "dr__chip dr__chip--declared"}>
                    {forStep.length > 0 ? "Supplied" : "Awaited"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Band>

      <Band title={evidence.length === 1 ? "1 item in this workspace" : `${evidence.length} items in this workspace`}>
        {evidence.length === 0 ? (
          <Empty>
            No evidence has been supplied in this workspace yet. When it is, each item shows who provided it, which
            requirement it answers, who can see it, and what state its review has reached.
          </Empty>
        ) : (
          <ul className="dr__list">
            {evidence.map((item) => (
              <li className="dr__item" key={item.id}>
                <div>
                  <p className="dr__item-title">
                    <a className="dr__link" href={`${here}/evidence/${item.id}`}>
                      {item.title}
                    </a>
                  </p>
                  <p className="dr__item-meta">
                    {item.providerLabel} · version {item.currentVersion} ·{" "}
                    {EVIDENCE_VISIBILITY_LABEL[item.visibility]}
                  </p>
                </div>
                <EvidenceStateChip state={item.state} />
              </li>
            ))}
          </ul>
        )}

        <div className="dr__actions">
          <Action label="Submit evidence" reason={uploadReason} />
          <Action label="Back to the workspace" href={here} secondary />
        </div>
      </Band>
    </>
  );
}
