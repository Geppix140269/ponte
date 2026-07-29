import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  Action,
  Band,
  Banner,
  CommandError,
  CommandForm,
  Empty,
  EvidenceStateChip,
  Field,
  RoomHeader,
  Submit,
  TextField,
} from "@/components/deal-room/primitives";
import { acceptEvidence, answerClarification, requestClarification } from "../../../../../actions";
import { loadEvidence, loadGoverningProcedure, loadRoom, loadSubRoom } from "@/lib/deal-room/queries";
import { canAcceptEvidence, canRequestClarification, mutationBlockedReason } from "@/lib/deal-room/permissions";
import {
  EVIDENCE_PROVENANCE_LABEL,
  EVIDENCE_VISIBILITY_LABEL,
  type EvidenceProvenance,
} from "@/lib/deal-room/states";

export const dynamic = "force-dynamic";

/**
 * DR-13: one evidence item.
 *
 * Metadata before preview, which is the Experience Design's ordering and the
 * reason this page is safe: a reader meets the provenance, the version, the
 * visibility and the review history before they meet the document, so the
 * document never arrives carrying an authority it does not have.
 *
 * Nothing here renders the file inline. Bytes are served only through a
 * short-lived signed URL from a server route that re-checks permission before
 * signing, on top of the storage policy that already refuses anyone else.
 *
 * The review actions are separate and named exactly: accept for procedure,
 * request clarification, reject for procedure, mark superseded, record
 * independent verification. "Accept" and "verify" are two different acts and
 * are two different controls.
 */
export default async function EvidenceDetailPage({
  params,
  searchParams,
}: {
  params: { locale: string; roomId: string; subRoomId: string; evidenceId: string };
  searchParams?: { error?: string };
}) {
  setRequestLocale(params.locale);

  const access = await loadRoom(params.roomId);
  if (!access) notFound();

  const subRoom = await loadSubRoom(params.roomId, params.subRoomId);
  if (!subRoom) notFound();

  const loaded = await loadEvidence(params.evidenceId);
  if (!loaded || loaded.evidence.subRoomId !== params.subRoomId) notFound();

  const { evidence, versions, clarifications } = loaded;
  const procedure = await loadGoverningProcedure(params.roomId);
  const step = procedure?.steps.find(() => evidence.stepId !== null);

  const here = `/${params.locale}/deal-rooms/${params.roomId}/workspaces/${params.subRoomId}`;
  const blockedReason = mutationBlockedReason(access.viewer, access.context);

  const isProvider = access.viewer?.profileId === evidence.createdBy;
  const viewerIsReviewer = Boolean(
    step?.requiredReviewerRole && access.viewer && access.viewer.participantClass === step.requiredReviewerRole,
  );
  const viewerForStep = access.viewer ? { ...access.viewer, isReviewer: viewerIsReviewer } : null;

  // The provider cannot accept their own evidence. Stated here, and refused in
  // `deal_room_accept_evidence_for_procedure()` regardless of what this page does.
  const acceptReason = isProvider
    ? "Evidence cannot be accepted for the procedure by the participant who supplied it."
    : canAcceptEvidence(viewerForStep, access.context)
      ? null
      : (blockedReason ??
        (step?.requiredReviewerRole
          ? `The procedure names ${step.requiredReviewerRole} as the reviewer for this requirement.`
          : "You are not the named reviewer for this requirement."));

  const clarifyReason = canRequestClarification(viewerForStep, access.context)
    ? null
    : (blockedReason ?? "Only the named reviewer or a principal can request a clarification.");

  const openClarification = clarifications.find((item) => item.state === "open");

  const here_evidence = `${here}/evidence/${params.evidenceId}`;

  return (
    <>
      <CommandError message={searchParams?.error} />
      {openClarification ? (
        <Banner tone="review" title="A clarification is open on this item">
          {openClarification.question}
        </Banner>
      ) : null}

      <RoomHeader
        reference={`${access.room.ref} · ${subRoom.ref}`}
        title={evidence.title}
        dealLine={step ? `Supplied for: ${step.title}` : "Not yet linked to a procedure requirement."}
      />

      <div className="dr__layout">
        <div>
          {/* Metadata first, deliberately. */}
          <Band title="What this is, and what it is not">
            <EvidenceStateChip state={evidence.state} withLimitation />
            <ul className="dr__list" style={{ marginTop: 18 }}>
              <li className="dr__item">
                <div>
                  <p className="dr__item-title">Provider</p>
                  <p className="dr__item-meta">{evidence.providerLabel}</p>
                </div>
              </li>
              <li className="dr__item">
                <div>
                  <p className="dr__item-title">Provenance</p>
                  <p className="dr__item-meta">
                    {EVIDENCE_PROVENANCE_LABEL[evidence.provenance as EvidenceProvenance] ?? evidence.provenance}
                  </p>
                </div>
              </li>
              <li className="dr__item">
                <div>
                  <p className="dr__item-title">Visibility</p>
                  <p className="dr__item-meta">{EVIDENCE_VISIBILITY_LABEL[evidence.visibility]}</p>
                </div>
              </li>
              <li className="dr__item">
                <div>
                  <p className="dr__item-title">Current version</p>
                  <p className="dr__item-meta">
                    {evidence.currentVersion} · supplied {new Date(evidence.createdAt).toISOString().slice(0, 10)}
                  </p>
                </div>
              </li>
            </ul>
          </Band>

          <Band title="Versions">
            {versions.length === 0 ? (
              <Empty>No file has been attached to this item yet.</Empty>
            ) : (
              <ul className="dr__list">
                {versions.map((version) => (
                  <li className="dr__item" key={version.version}>
                    <div>
                      <p className="dr__item-title">
                        Version {version.version} · {version.fileName}
                      </p>
                      <p className="dr__item-meta">
                        {version.mimeType} · {Math.round(version.sizeBytes / 1024)} KB · uploaded{" "}
                        {new Date(version.uploadedAt).toISOString().slice(0, 10)}
                      </p>
                    </div>
                    <a className="dr__link dr__weight" href={`/api/deal-room/evidence/${evidence.id}/${version.version}`}>
                      Open
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <p className="dr__why">
              A version is never edited. A correction is a new version, and the one a reviewer accepted stays exactly as
              it was when they accepted it.
            </p>
          </Band>

          {openClarification && isProvider ? (
            <Band title="Answer the clarification">
              <p className="dr__item-meta">{openClarification.question}</p>
              <CommandForm
                action={answerClarification}
                encType="multipart/form-data"
                hidden={{
                  locale: params.locale,
                  roomId: params.roomId,
                  subRoomId: params.subRoomId,
                  evidenceId: params.evidenceId,
                  clarificationId: openClarification.id,
                  returnTo: here_evidence,
                }}
              >
                <TextField label="Your answer" name="answer" required />
                <Field
                  label="Corrected document, if the answer needs one"
                  name="file"
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  help="Optional. A corrected file becomes a new version; the version the reviewer questioned is retained and stays readable."
                />
                <Submit label="Answer, and supply any correction" />
              </CommandForm>
            </Band>
          ) : null}

          <Band title="Clarifications">
            {clarifications.length === 0 ? (
              <Empty>No clarification has been requested on this item.</Empty>
            ) : (
              <ol className="dr__list">
                {clarifications.map((item) => (
                  <li className="dr__item" key={item.id}>
                    <div>
                      <p className="dr__item-title">{item.question}</p>
                      {item.answer ? <p className="dr__item-meta">Answered: {item.answer}</p> : null}
                      <p className="dr__item-limit">
                        Raised {new Date(item.raisedAt).toISOString().slice(0, 10)}
                        {item.answeredAt ? ` · answered ${new Date(item.answeredAt).toISOString().slice(0, 10)}` : ""}
                      </p>
                    </div>
                    <span className={item.state === "open" ? "dr__chip dr__chip--review" : "dr__chip dr__chip--done"}>
                      {item.state}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Band>
        </div>

        <aside className="dr__rail">
          <Band title="Review">
            {acceptReason ? (
              <div className="dr__actions">
                <Action label="Accept for procedure" reason={acceptReason} />
              </div>
            ) : (
              <CommandForm
                action={acceptEvidence}
                hidden={{
                  locale: params.locale,
                  roomId: params.roomId,
                  subRoomId: params.subRoomId,
                  evidenceId: params.evidenceId,
                  returnTo: here_evidence,
                }}
              >
                <Submit label="Accept for procedure" />
              </CommandForm>
            )}

            {clarifyReason ? (
              <div className="dr__actions">
                <Action label="Request clarification" reason={clarifyReason} secondary />
              </div>
            ) : (
              <CommandForm
                action={requestClarification}
                hidden={{
                  locale: params.locale,
                  roomId: params.roomId,
                  subRoomId: params.subRoomId,
                  evidenceId: params.evidenceId,
                  returnTo: here_evidence,
                }}
              >
                <TextField label="What do you need clarified?" name="question" required />
                <Submit label="Request clarification" secondary />
              </CommandForm>
            )}

            <div className="dr__actions">
              <Action
                label="Reject for procedure"
                reason="Rejection is a later release. Request a clarification instead, or leave the item under review."
                secondary
              />
              <Action
                label="Record independent verification"
                reason="Recording an independent check is a later release. It is a separate act from accepting for the procedure, with its own date and limitation."
                secondary
              />
            </div>
            <p className="dr__why">
              Accepting for the procedure means the parties agreed this satisfies a requirement. It is not a finding
              that the document is genuine. Recording an independent verification is a separate act with its own date
              and its own limitation.
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
