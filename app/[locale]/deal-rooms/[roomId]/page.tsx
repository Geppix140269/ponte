import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import DealRoomBridge from "@/components/ponte/bridge/DealRoomBridge";
import { Action, Band, Banner, Empty, NextAction, ProgressLine, RoomHeader, StepStateChip } from "@/components/deal-room/primitives";
import { loadOverview, loadRoom } from "@/lib/deal-room/queries";
import { ACTIVITY_EVENT_LABEL, MILESTONES } from "@/lib/deal-room/activity";
import { canSeeSubRoomPortfolio, mutationBlockedReason } from "@/lib/deal-room/permissions";
import { ROOM_STAGE_LABEL, BLOCKER_CATEGORY_LABEL } from "@/lib/deal-room/states";
import { daysRemaining, usageSummary } from "@/lib/deal-room/entitlement";

export const dynamic = "force-dynamic";

/**
 * DR-07, the master command view, and DR-21, the read-only room.
 *
 * They are one route deliberately. The Experience Design says a closed or
 * expired room "retains the same information architecture, but creation and
 * modification actions are removed", so implementing read-only as a separate
 * page would be the thing it forbids: a different, lesser view of the same
 * facts. Here the actions disappear and a banner explains why, and every fact
 * is exactly where it was.
 *
 * The command view shows no message feed. The procedure is the spine.
 */
export default async function CommandViewPage({
  params,
}: {
  params: { locale: string; roomId: string };
}) {
  setRequestLocale(params.locale);

  const access = await loadRoom(params.roomId);
  // Zero rows from the policy and "no such room" are answered identically. A
  // distinguishable access-denied page would confirm the room exists.
  if (!access) notFound();

  const overview = await loadOverview(access);
  const base = `/${params.locale}/deal-rooms/${access.room.id}`;
  const blockedReason = mutationBlockedReason(access.viewer, access.context);

  const criticalBlockers = overview.openBlockers.filter((blocker) => blocker.category === "critical");
  const nextStep = overview.procedure?.steps.find(
    (step) => step.state === "ready" || step.state === "in_progress" || step.state === "clarification_required",
  );
  const earned = overview.milestones;

  const days = access.entitlement ? daysRemaining(access.entitlement) : null;

  return (
    <>
      {access.readOnly ? (
        <Banner tone="quiet" title="This room is read-only">
          {access.room.state === "paused"
            ? "The room is paused, so nothing can change until it resumes."
            : "The entitlement or the room lifecycle has ended. Every document, decision, clarification and event stays readable exactly as it is. Nothing has been deleted, and restoring the room resumes it with no re-upload and no re-admission."}
        </Banner>
      ) : null}

      {criticalBlockers.length > 0 ? (
        <Banner tone="danger" title={`Blocked: ${criticalBlockers[0].title}`}>
          {criticalBlockers[0].resolutionRequirement} Progress already earned is unchanged.
        </Banner>
      ) : null}

      <RoomHeader
        reference={access.room.ref}
        title={access.room.title}
        dealLine={access.room.purpose ?? String(access.room.dealSnapshot.subject ?? "")}
      />

      {/* The commissioned Multi-party Deal Room Bridge. */}
      <div style={{ marginTop: 32 }}>
        <DealRoomBridge model={overview.bridge} caption={access.room.ref} />
      </div>

      <div className="dr__layout">
        <div>
          <Band title="Stage and completion">
            <ProgressLine
              stage={ROOM_STAGE_LABEL[access.room.state]}
              progress={overview.progress}
              openCriticalBlockers={criticalBlockers.length}
            />
            {overview.progress.value !== null ? (
              <p className="dr__why">
                Completion measures the agreed procedure and nothing else. It is not a measure of trust, value, risk or
                how likely this transaction is to complete.
              </p>
            ) : null}
          </Band>

          <Band title="Procedure">
            {!overview.procedure ? (
              <>
                <Empty>
                  No procedure has been proposed. Agree how this Deal will move before any work is assigned or any
                  evidence is requested.
                </Empty>
                <div className="dr__actions">
                  <Action label="Propose procedure" href={`${base}/procedure`} reason={blockedReason} />
                </div>
              </>
            ) : (
              <>
                <p className="dr__item-meta">
                  Version {overview.procedure.version} · {overview.procedure.summary}
                </p>
                <ul className="dr__list">
                  {overview.procedure.steps.slice(0, 8).map((step) => (
                    <li className="dr__item" key={step.key}>
                      <div>
                        <p className="dr__item-title">{step.title}</p>
                        <p className="dr__item-meta">
                          {step.stageLabel} · {step.responsibleRole}
                        </p>
                      </div>
                      <StepStateChip state={step.state} />
                    </li>
                  ))}
                </ul>
                <div className="dr__actions">
                  <Action label="Open the procedure" href={`${base}/procedure`} secondary />
                </div>
              </>
            )}
          </Band>

          {/*
            The private sub-room portfolio, and the single most important
            conditional in the slice. `canSeeSubRoomPortfolio` is true only for
            the sponsor team; every other participant does not see this band at
            all, and `overview.subRooms` was already filtered by the policy, so
            even a bug here shows an empty list rather than another
            counterparty's negotiation.
          */}
          {canSeeSubRoomPortfolio(access.viewer) ? (
            <Band title="Private workspaces">
              {overview.subRooms.length === 0 ? (
                <Empty>No private workspace has been created yet.</Empty>
              ) : (
                <ul className="dr__list">
                  {overview.subRooms.map((sub) => (
                    <li className="dr__item" key={sub.id}>
                      <div>
                        <p className="dr__item-title">
                          <a className="dr__link" href={`${base}/workspaces/${sub.id}`}>
                            {sub.purpose}
                          </a>
                        </p>
                        <p className="dr__item-meta">{sub.ref}</p>
                      </div>
                      <span className="dr__weight">{sub.state.replace(/_/g, " ")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Band>
          ) : access.viewer?.subRoomId ? (
            <Band title="Your workspace">
              <ul className="dr__list">
                {overview.subRooms
                  .filter((sub) => sub.id === access.viewer!.subRoomId)
                  .map((sub) => (
                    <li className="dr__item" key={sub.id}>
                      <div>
                        <p className="dr__item-title">
                          <a className="dr__link" href={`${base}/workspaces/${sub.id}`}>
                            {sub.purpose}
                          </a>
                        </p>
                        <p className="dr__item-meta">{sub.ref}</p>
                      </div>
                    </li>
                  ))}
              </ul>
            </Band>
          ) : null}

          <Band title="Recent material activity">
            {overview.activity.length === 0 ? (
              <Empty>Nothing material has happened in this room yet.</Empty>
            ) : (
              <ul className="dr__list">
                {overview.activity.slice(0, 6).map((event) => (
                  <li className="dr__item" key={event.id}>
                    <div>
                      <p className="dr__item-title">{ACTIVITY_EVENT_LABEL[event.eventType] ?? event.eventType}</p>
                      <p className="dr__item-meta">
                        {event.summary} · {event.actorLabel}
                        {event.actorOrganisationLabel ? `, ${event.actorOrganisationLabel}` : ""}
                      </p>
                    </div>
                    <span className="dr__weight">{new Date(event.createdAt).toISOString().slice(0, 10)}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="dr__actions">
              <Action label="Full history" href={`${base}/activity`} secondary />
            </div>
          </Band>
        </div>

        <aside className="dr__rail">
          {nextStep ? (
            <NextAction label={nextStep.title} owner={nextStep.responsibleRole} />
          ) : (
            <div className="dr__next">
              <p className="dr__next-label">Next action</p>
              <p className="dr__next-title">
                {overview.procedure ? "Waiting on a participant" : "Propose the procedure"}
              </p>
              <p className="dr__next-owner">
                Owner: {overview.procedure ? "The other participants" : "The room administrator"}
              </p>
            </div>
          )}

          <Band title="Milestones">
            <ul className="dr__list">
              {MILESTONES.map((milestone) => (
                <li className="dr__item" key={milestone.key}>
                  <p className="dr__item-title" style={{ fontWeight: earned.has(milestone.key) ? 600 : 400 }}>
                    {milestone.label}
                  </p>
                  <span className={earned.has(milestone.key) ? "dr__chip dr__chip--done" : "dr__chip dr__chip--declared"}>
                    {earned.has(milestone.key) ? "Reached" : "Not yet"}
                  </span>
                </li>
              ))}
            </ul>
          </Band>

          <Band title="Blockers">
            {overview.openBlockers.length === 0 ? (
              <p className="dr__item-meta">No open blocker.</p>
            ) : (
              <ul className="dr__list">
                {overview.openBlockers.map((blocker) => (
                  <li className="dr__item" key={blocker.id}>
                    <div>
                      <p className="dr__item-title">{blocker.title}</p>
                      <p className="dr__item-meta">{BLOCKER_CATEGORY_LABEL[blocker.category]}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Band>

          {access.entitlement ? (
            <Band title="Room access">
              {usageSummary(access.entitlement, {
                subRoomsUsed: overview.subRooms.length,
                externalOrganisationsAdmitted: new Set(
                  overview.participants.filter((p) => p.organisation).map((p) => p.organisation),
                ).size,
                internalUsers: 1,
              }).map((line) => (
                <p className="dr__item-meta" key={line}>
                  {line}
                </p>
              ))}
              {days === 0 ? (
                <p className="dr__why">
                  The term has ended. Nothing has been deleted and everything here stays readable.
                </p>
              ) : null}
            </Band>
          ) : null}
        </aside>
      </div>
    </>
  );
}
