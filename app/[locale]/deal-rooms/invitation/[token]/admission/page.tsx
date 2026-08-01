import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  Band,
  Banner,
  CommandError,
  CommandForm,
  Field,
  RoomHeader,
  Submit,
  TextField,
} from "@/components/deal-room/primitives";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dealRoomRoutesEnabled } from "@/lib/deal-room/flags";
import { resolveInvitation } from "@/lib/deal-room/invitation-server";
import { INVITATION_FAILURE_MESSAGE } from "@/lib/deal-room/invitation";
import { AGREEMENT_KIND_LABEL, REQUIRED_AGREEMENT_KINDS } from "@/lib/deal-room/states";
import { AGREEMENT_DOCUMENTS } from "@/lib/deal-room/agreements";
import { participantAdmissibility } from "@/lib/deal-room/queries";
import UnsavedFormGuard from "@/components/ponte/nav/UnsavedFormGuard";
import { acceptAgreement, completeAdmission, declareParticipation } from "../../../actions";

export const dynamic = "force-dynamic";

/**
 * DR-05: the admission checklist, and the gate acceptance criterion 4 is about.
 *
 * Everything here must be complete before the participant can do anything at
 * all inside the room, and the state is read from the database rather than
 * assumed: `deal_room_admit_participant()` re-checks every one of these and
 * refuses with the name of whatever is missing, so this page and the gate
 * cannot drift apart.
 *
 * Each item states three things, per the Experience Design: whether it is
 * complete, why it is required, and who can see it. The third is the one people
 * forget, and it is the reason a member supplies anything at all.
 *
 * The acceptance record is the one the owner confirmed on 29 July 2026: profile
 * identity, organisation or declared capacity, agreement kind, document version,
 * SHA-256 of the accepted text, UTC timestamp. No IP address, no user agent.
 * The version and hash come from `AGREEMENT_DOCUMENTS` on the server, never
 * from the form: a client that could choose which version it had accepted, or
 * the hash recorded against it, would make the record worthless.
 */
export default async function AdmissionPage({
  params,
  searchParams,
}: {
  params: { locale: string; token: string };
  searchParams?: { participant?: string; error?: string };
}) {
  setRequestLocale(params.locale);

  if (!dealRoomRoutesEnabled()) notFound();

  const lookup = await resolveInvitation(params.token);
  const user = await getUser();

  // An accepted invitation is the normal state here: acceptance is what created
  // the participation this page completes. So `already_accepted` is not an
  // error on this route, and the participant id carries the context instead.
  if (!lookup.ok && lookup.reason !== "already_accepted") {
    return (
      <>
        <meta name="referrer" content="no-referrer" />
        <RoomHeader reference="Ponte Trade" title="This invitation cannot be opened" />
        <Banner tone="quiet" title="Nothing further is needed from you">
          {INVITATION_FAILURE_MESSAGE[lookup.reason]}
        </Banner>
      </>
    );
  }

  const supabase = createClient();

  // The participation, read through the caller's own session. A participant who
  // is not this person gets no row, and the page shows the signed-out state
  // rather than someone else's admission.
  const participantId = searchParams?.participant ?? "";
  const { data: participant } = participantId
    ? await supabase
        .from("deal_room_participants")
        .select(
          "id, room_id, sub_room_id, org_id, declared_capacity, represented_legal_name, business_relationship, transaction_role, participation_authority, state, profile_id",
        )
        .eq("id", participantId)
        .maybeSingle()
    : { data: null };

  const { data: accepted } = participantId
    ? await supabase
        .from("deal_room_agreement_acceptances")
        .select("agreement_kind, document_version, accepted_at")
        .eq("participant_id", participantId)
    : { data: null };

  const acceptedKinds = new Set(((accepted ?? []) as { agreement_kind: string }[]).map((row) => row.agreement_kind));

  const hasIdentity = Boolean(participant?.org_id) || Boolean(participant?.declared_capacity);
  // The name and the relationship are counted separately from the capacity, on
  // purpose: the chip must not read "Complete" while two of the nine criteria
  // are still pending underneath it.
  const hasNameAndRelationship =
    (Boolean(participant?.org_id) || Boolean(participant?.represented_legal_name)) &&
    Boolean(participant?.business_relationship);
  const hasRoleAndAuthority =
    Boolean(participant?.transaction_role) && Boolean(participant?.participation_authority);
  const allAgreementsAccepted = REQUIRED_AGREEMENT_KINDS.every((kind) => acceptedKinds.has(kind));
  const admitted = participant?.state === "admitted" || participant?.state === "active";

  const returnTo = `/${params.locale}/deal-rooms/invitation/${params.token}/admission?participant=${participantId}`;

  /*
   * ADR-0021 ruling 2. The Deal Room-ready minimum, unchanged by the fact that
   * this participant pays nothing.
   *
   * Branching model section 6: "Sponsored access removes payment friction. It
   * does not weaken admission, confidentiality or authority requirements." An
   * invited counterparty meets exactly what the member who opened the room met.
   *
   * It is read after the declaration above, because that declaration is what
   * supplies most of the minimum. So this is stated as a live checklist item and
   * not as a refusal at the door: the member can see what is left and complete
   * it on this same page.
   */
  // `returnTo` is this page. Six of the nine criteria are collected on the form
  // below, so their remedies anchor to it rather than sending the member to the
  // business verification form, which cannot record any of them.
  const admissibility = participantId
    ? await participantAdmissibility(participantId, params.locale, returnTo)
    : null;
  const admissible = admissibility?.admissible ?? false;

  return (
    <UnsavedFormGuard>
      <meta name="referrer" content="no-referrer" />
      <CommandError message={searchParams?.error} />

      <RoomHeader
        reference="Ponte Trade · Admission"
        title="Before you enter the private workspace"
        dealLine="Nothing in the room is visible to you until every item below is complete, and nothing inside it is possible before then."
      />

      {!user ? (
        <Banner tone="review" title="Sign in to continue">
          Every action inside a Deal Room is attributed to a named person, so nothing can be recorded anonymously. Your
          place in this admission is kept: sign in and you return to exactly this page.
        </Banner>
      ) : null}

      {admitted ? (
        <Banner tone="quiet" title="You are admitted">
          Your admission is complete and recorded.{" "}
          <a className="dr__link" href={`/${params.locale}/deal-rooms/${participant!.room_id}`}>
            Open the private workspace
          </a>
          .
        </Banner>
      ) : null}

      {user && participant && !admitted ? (
        <>
          <Band title="1. Who you act for, and in what role">
            <div className="dr__check">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
                <p className="dr__item-title">Who you act for, under what name, in what relationship, role and authority</p>
                <span
                  className={
                    hasIdentity && hasNameAndRelationship && hasRoleAndAuthority
                      ? "dr__chip dr__chip--done"
                      : "dr__chip dr__chip--declared"
                  }
                >
                  {hasIdentity && hasNameAndRelationship && hasRoleAndAuthority ? "Complete" : "Not yet"}
                </span>
              </div>
              <p className="dr__check-why">
                The other side is entitled to know which legal entity, or which professional capacity, is on the other
                end of the transaction. Responsibilities in the procedure are assigned by role. Participating and having
                authority to commit are different things, and the room records them separately: declaring authority is
                not the same as it having been sighted.
              </p>
              <p className="dr__check-who">
                Who can see it: the participants of the workspace you join, and the room administrator. Ponte does not
                verify any of it.
              </p>
            </div>

            {/* The anchor every room-specific remedy above points at. */}
            <CommandForm
              id="declaration"
              action={declareParticipation}
              hidden={{ locale: params.locale, participantId, returnTo }}
            >
              <Field
                label="Organisation you act for"
                name="organisationName"
                defaultValue={undefined}
                help="Its legal or trading name. Leave this blank if you act in a personal professional capacity."
              />
              <Field label="Jurisdiction" name="organisationCountry" help="Where that organisation is established." />
              <Field
                label="Or, the professional capacity you act in"
                name="declaredCapacity"
                help="For example: independent broker, freight forwarder, legal adviser. One of this or an organisation is required."
              />
              {/*
                Two fields the capacity above must not answer for.

                Section 6 lists the legal or trading name and the relationship
                to the business as their own criteria, and the controller ruled
                on 31 July 2026 that neither may be derived from the capacity or
                the authority. So they are asked here, in their own words, and
                the command refuses the declaration if either is blank.
              */}
              <Field
                label="Legal or trading name you act under"
                name="legalName"
                help="The name itself, not the capacity. Leave blank only if you named an organisation above, whose name is used."
              />
              <TextField
                label="How you stand to that business"
                name="businessRelationship"
                required
                help="An office you hold, a mandate you were given, or an engagement you were retained under. This is not your role in the transaction and not your authority to commit."
              />
              <Field
                label="Your role in this transaction"
                name="role"
                required
                defaultValue={lookup.ok ? lookup.invitation.proposedRole : (participant.transaction_role as string)}
              />
              <TextField
                label="Your authority to act in that role"
                name="authority"
                required
                help="State what authorises you: an office you hold, a mandate, an engagement. Ponte records this declaration and does not check it."
              />
              <Submit label="Record this declaration" />
            </CommandForm>
          </Band>

          <Band title="2. Agreements">
            {REQUIRED_AGREEMENT_KINDS.map((kind) => {
              const document = AGREEMENT_DOCUMENTS[kind];
              const isAccepted = acceptedKinds.has(kind);
              return (
                <div className="dr__check" key={kind}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
                    <p className="dr__item-title">{AGREEMENT_KIND_LABEL[kind]}</p>
                    <span className={isAccepted ? "dr__chip dr__chip--done" : "dr__chip dr__chip--declared"}>
                      {isAccepted ? "Accepted" : "Not yet"}
                    </span>
                  </div>

                  <details>
                    <summary className="dr__check-why">
                      Read {document.title}, version {document.version}
                    </summary>
                    <pre className="dr__document">{document.body}</pre>
                  </details>

                  <p className="dr__check-who">
                    Your acceptance is recorded with this version, a checksum of the text above, your identity and the
                    time. Who can see it: the room administrator, and you.
                  </p>

                  {isAccepted ? null : (
                    <CommandForm
                      action={acceptAgreement}
                      hidden={{ locale: params.locale, participantId, kind, returnTo }}
                    >
                      <Submit label={`Accept ${document.title.toLowerCase()}`} secondary />
                    </CommandForm>
                  )}
                </div>
              );
            })}

            <p className="dr__why">
              These are click-to-accept records. They are rigorous and attributable, and they are not a qualified or
              advanced electronic signature. Ponte does not describe them as one. The version you accept stays
              retrievable in the repository, so the checksum can be verified later.
            </p>
          </Band>

          <Band title="3. Enter">
            {admissibility && !admissible ? (
              <>
                {/*
                  One line per missing criterion, each pointing at the place that
                  fact is actually supplied. Six of the nine are collected in the
                  form higher up this same page, so those six anchor to it; the
                  single link that used to sit here sent all nine to the business
                  verification form, which cannot record a transaction role, an
                  authority, a relationship or a room-specific trading name.
                */}
                <Banner tone="review" title="Still needed before you can enter">
                  {admissibility.summary} You are not being asked to buy anything: the party who opened this room
                  covers it, and confirming your own business costs nothing. {admissibility.limitation}
                </Banner>
                <ul className="dr__list">
                  {admissibility.pending.map((item) => (
                    <li key={item.criterion} className="dr__check">
                      <p className="dr__item-title">{item.label}</p>
                      <p className="dr__check-why">{item.remedy!.statement}</p>
                      <a className="dr__link" href={item.remedy!.href}>
                        Supply this
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <CommandForm
                action={completeAdmission}
                hidden={{
                  locale: params.locale,
                  participantId,
                  roomId: participant.room_id as string,
                  returnTo,
                }}
              >
                <Submit label="Enter private Deal Room" />
              </CommandForm>
            )}
            <p className="dr__why">
              {hasIdentity && hasRoleAndAuthority && allAgreementsAccepted
                ? "Everything above is complete. Admission is checked again when you press this, and the room records it."
                : "Admission is checked when you press this and will name whatever is still missing. Nothing is recorded until it passes."}
            </p>
          </Band>
        </>
      ) : null}

      {user && !participant ? (
        <Banner tone="review" title="This admission is not yours to complete">
          Open the invitation link you were sent and accept it first.
        </Banner>
      ) : null}
    </UnsavedFormGuard>
  );
}
