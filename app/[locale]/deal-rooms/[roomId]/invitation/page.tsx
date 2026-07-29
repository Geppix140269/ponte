import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  Action,
  Band,
  Banner,
  CommandError,
  CommandForm,
  Field,
  RoomHeader,
  Submit,
} from "@/components/deal-room/primitives";
import { listParticipants, loadRoom, listSubRooms } from "@/lib/deal-room/queries";
import { canInviteParticipant, mutationBlockedReason } from "@/lib/deal-room/permissions";
import { buildPreview, INVITATION_TTL_DAYS } from "@/lib/deal-room/invitation";
import { integrityPreflight, invitationIsPermitted, sanctionsPositionFrom } from "@/lib/deal-room/integrity";
import { sendInvitation } from "../../actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * DR-03: the invitation preview, with the Ponte Integrity pre-flight above it.
 *
 * The sender sees the exact external invitation before it is sent, including
 * what is deliberately not disclosed. That second list is the part that makes
 * this a *protected* invitation rather than a polite one: it is easy to
 * believe an invitation reveals nothing, and much harder to be sure without
 * seeing the withheld set written down.
 *
 * The pre-flight sits above it because it is a decision input, not a
 * formality. It reports what Ponte checked, what the member declared, what is
 * unproved and any inconsistency, then offers exactly one action. It never
 * scores anybody, never labels anybody, and never admits or rejects a party on
 * its own: the only thing that can stop an invitation is an unresolved
 * sanctions candidate, which is a compliance boundary rather than a judgement.
 */
export default async function InvitationPreviewPage({
  params,
  searchParams,
}: {
  params: { locale: string; roomId: string };
  searchParams?: { error?: string; sent?: string };
}) {
  setRequestLocale(params.locale);

  const access = await loadRoom(params.roomId);
  if (!access) notFound();

  const [participants, subRooms] = await Promise.all([listParticipants(params.roomId), listSubRooms(params.roomId)]);
  const base = `/${params.locale}/deal-rooms/${params.roomId}`;
  const firstSubRoom = subRooms[0] ?? null;
  const sentToken = searchParams?.sent;
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const blockedReason = mutationBlockedReason(access.viewer, access.context);
  const inviteReason = canInviteParticipant(access.viewer, access.context)
    ? null
    : (blockedReason ?? "Only a room administrator can send an invitation.");

  const supabase = createClient();
  const { data: me } = await supabase
    .from("profiles")
    .select("full_name, country, verification_level, organization_id, organizations(name, country)")
    .eq("id", access.viewer?.profileId ?? "")
    .maybeSingle();

  // `user_id`, which is what the column is actually called. The first draft
  // filtered on a `profile_id` that does not exist on this table, so it read
  // nothing and the pre-flight was built from an empty evidence list.
  const { data: evidenceRows } = await supabase
    .from("verifications")
    .select("type, status, created_at, sanctions_hits, rescreened_at")
    .eq("user_id", access.viewer?.profileId ?? "")
    .order("created_at", { ascending: false })
    .limit(10);

  const rows = (evidenceRows ?? []) as Record<string, unknown>[];
  const organisationName = ((me?.organizations as { name?: string } | null)?.name as string) ?? null;

  const preflight = integrityPreflight({
    organisationName,
    declaredCapacity: organisationName ? null : ((me?.full_name as string | null) ?? null),
    jurisdiction:
      ((me?.organizations as { country?: string } | null)?.country as string) ?? ((me?.country as string | null) ?? null),
    verificationLevel: ((me?.verification_level as string) ?? "unverified") as
      | "unverified"
      | "identity_verified"
      | "company_verified",
    verificationEvidence: rows.map((row) => ({
      kind: (row.type as string) ?? "check",
      source: "Ponte verification",
      result:
        row.status === "verified"
          ? ("passed" as const)
          : row.status === "rejected"
            ? ("failed" as const)
            : ("in_review" as const),
      checkedAt: String(row.created_at ?? "").slice(0, 10),
    })),
    dealOriginCountry: (access.room.dealSnapshot.origin_country as string | null) ?? null,
    declaredRole: access.viewer?.participantClass ?? null,
    authorityDeclared: Boolean(access.viewer),
    // Derived from real screening rows. When none exists this reports
    // `{ screened: false }` and the pre-flight prints it under Unproved. The
    // first draft passed `true`/`false` here unconditionally and displayed a
    // sanctions clearance over nothing, which the owner review caught.
    sanctions: sanctionsPositionFrom(
      rows.map((row) => ({
        sanctionsHits: row.sanctions_hits,
        rescreenedAt: (row.rescreened_at as string | null) ?? null,
        createdAt: String(row.created_at ?? ""),
      })),
    ),
  });

  const preview = buildPreview({
    invitingOrganisation: organisationName ?? ((me?.full_name as string | null) ?? "Your organisation"),
    dealSubject: String(access.room.dealSnapshot.subject ?? access.room.title),
    marketFamily: access.room.marketFamily,
    proposedRole: "Principal counterparty",
    proposedParticipantClass: "principal",
    roomSponsor: organisationName ?? ((me?.full_name as string | null) ?? "Your organisation"),
    expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000),
  });

  const permitted = invitationIsPermitted(preflight);

  return (
    <>
      <CommandError message={searchParams?.error} />
      <RoomHeader
        reference={`${access.room.ref} · Invitation`}
        title="Ponte Integrity pre-flight"
        dealLine="What Ponte checked, what is declared, what is unproved, and what to do next. Read this before you invite anyone."
      />

      {preflight.inconsistencies.length > 0 ? (
        <Banner tone={permitted ? "review" : "danger"} title="Something does not line up">
          {preflight.inconsistencies.map((item) => `${item.observation} ${item.clarification}`).join(" ")}
        </Banner>
      ) : null}

      <div className="dr__layout">
        <div>
          <Band title="What Ponte has checked">
            {preflight.checked.length === 0 ? (
              <p className="dr__item-meta">Nothing has been checked against an external source.</p>
            ) : (
              <ul className="dr__list">
                {preflight.checked.map((fact) => (
                  <li className="dr__item" key={fact.label}>
                    <div>
                      <p className="dr__item-title">{fact.label}</p>
                      <p className="dr__item-meta">{fact.statement}</p>
                      {fact.source ? (
                        <p className="dr__item-limit">
                          {fact.source}
                          {fact.checkedAt ? ` · ${fact.checkedAt}` : ""}
                        </p>
                      ) : null}
                    </div>
                    <span className="dr__chip dr__chip--done">Checked</span>
                  </li>
                ))}
              </ul>
            )}
          </Band>

          <Band title="What is member-declared">
            <ul className="dr__list">
              {preflight.declared.map((fact) => (
                <li className="dr__item" key={fact.label}>
                  <div>
                    <p className="dr__item-title">{fact.label}</p>
                    <p className="dr__item-meta">{fact.statement}</p>
                  </div>
                  <span className="dr__chip dr__chip--declared">Declared</span>
                </li>
              ))}
            </ul>
          </Band>

          <Band title="What is unproved">
            <ul className="dr__list">
              {preflight.unproved.map((fact) => (
                <li className="dr__item" key={fact.label}>
                  <div>
                    <p className="dr__item-title">{fact.label}</p>
                    <p className="dr__item-meta">{fact.statement}</p>
                  </div>
                  <span className="dr__chip dr__chip--review">Unproved</span>
                </li>
              ))}
            </ul>
            <p className="dr__why">{preflight.limitation}</p>
          </Band>

          <Band title="The invitation, exactly as it will be received">
            <ul className="dr__list">
              <li className="dr__item">
                <div>
                  <p className="dr__item-title">Deal</p>
                  <p className="dr__item-meta">{preview.dealSubject}</p>
                </div>
              </li>
              <li className="dr__item">
                <div>
                  <p className="dr__item-title">From</p>
                  <p className="dr__item-meta">{preview.invitingOrganisation}</p>
                </div>
              </li>
              <li className="dr__item">
                <div>
                  <p className="dr__item-title">Proposed role</p>
                  <p className="dr__item-meta">{preview.proposedRole}</p>
                </div>
              </li>
              <li className="dr__item">
                <div>
                  <p className="dr__item-title">Expires</p>
                  <p className="dr__item-meta">
                    {INVITATION_TTL_DAYS} days from sending, on {preview.expiresAt.slice(0, 10)}
                  </p>
                </div>
              </li>
            </ul>
          </Band>

          <Band title="What the invitation does not disclose">
            <ul className="dr__list">
              {preview.notYetDisclosed.map((item) => (
                <li className="dr__item" key={item}>
                  <p className="dr__item-title" style={{ fontWeight: 400 }}>
                    {item}
                  </p>
                </li>
              ))}
            </ul>
            <p className="dr__why">
              {subRooms.length > 0
                ? "The existence of any other private workspace connected to this Deal is not disclosed, and cannot be inferred from anything the invitee receives."
                : "No protected content leaves the room with an invitation."}
            </p>
          </Band>
        </div>

        <aside className="dr__rail">
          <div className="dr__next">
            <p className="dr__next-label">Available action</p>
            <p className="dr__next-title">{preflight.action.label}</p>
            <p className="dr__next-owner">{preflight.action.because}</p>
          </div>

          {permitted && !inviteReason && firstSubRoom ? (
            <CommandForm
              action={sendInvitation}
              hidden={{
                locale: params.locale,
                roomId: params.roomId,
                subRoomId: firstSubRoom.id,
                returnTo: `${base}/invitation`,
              }}
            >
              <Field
                label="Counterparty email"
                name="email"
                type="email"
                required
                help="Where the protected invitation link goes. The link is single use, expires, and is stored only as a hash."
              />
              <Field label="Proposed role" name="role" required defaultValue="Principal counterparty" />
              <Submit label="Send protected invitation" />
            </CommandForm>
          ) : (
            <div className="dr__actions">
              <Action
                label="Send protected invitation"
                reason={
                  !permitted
                    ? "An unresolved sanctions screening candidate must be settled before an invitation can be sent."
                    : !firstSubRoom
                      ? "This room has no private workspace to invite anyone into."
                      : inviteReason
                }
              />
            </div>
          )}

          {sentToken ? (
            <Banner tone="quiet" title="The invitation is ready to pass on">
              This link is shown once and is not stored: Ponte keeps only a hash of it. Send it to the counterparty by
              your own means. {`${appOrigin}/${params.locale}/deal-rooms/invitation/${sentToken}`}
            </Banner>
          ) : null}

          <div className="dr__actions">
            <Action label="Back to the room" href={base} secondary />
          </div>

          <Band title="Who is already here">
            <p className="dr__item-meta">
              {participants.length === 1 ? "1 participant" : `${participants.length} participants`} in the parts of this
              room you can see.
            </p>
          </Band>
        </aside>
      </div>
    </>
  );
}
