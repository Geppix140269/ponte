import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Band, Banner, CommandError, CommandForm, RoomHeader, Submit } from "@/components/deal-room/primitives";
import { dealRoomRoutesEnabled } from "@/lib/deal-room/flags";
import { resolveInvitation } from "@/lib/deal-room/invitation-server";
import { INVITATION_FAILURE_MESSAGE } from "@/lib/deal-room/invitation";
import { acceptInvitation } from "../../actions";

export const dynamic = "force-dynamic";

/**
 * DR-04: the invitation landing.
 *
 * The one Deal Room surface reached without an account, and therefore the one
 * that has to establish legitimacy before it asks for anything.
 *
 * Three deliberate choices:
 *
 * **No allowlist check.** The invitee is by definition not allowlisted, and a
 * gate here would lock them out of their own invitation. The flag still applies;
 * the allowlist governs who may *create* rooms, not who may be invited into one.
 *
 * **`referrer: no-referrer`.** The token sits in the URL path, which is the
 * standard shape for a capability link but does mean it can travel in a
 * referrer header to any resource this page loads. The meta directive stops
 * that. The token is also single-use, short-lived and stored only as a hash.
 *
 * **Decline is as prominent as accept.** The Experience Design requires it to
 * be "visible and respectful", and there is no urgency anywhere on this page:
 * no countdown, no scarcity, no chasing.
 */
export default async function InvitationLandingPage({
  params,
  searchParams,
}: {
  params: { locale: string; token: string };
  searchParams?: { error?: string };
}) {
  setRequestLocale(params.locale);

  if (!dealRoomRoutesEnabled()) notFound();

  const lookup = await resolveInvitation(params.token);

  if (!lookup.ok) {
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

  const { preview, invitationId } = lookup.invitation;

  return (
    <>
      <meta name="referrer" content="no-referrer" />
      <CommandError message={searchParams?.error} />

      <RoomHeader
        reference="Ponte Trade · Protected invitation"
        title={`${preview.invitingOrganisation} has invited you into a Deal Room`}
        dealLine={`You would join as ${preview.proposedRole}. Nothing in the room is visible to you until you complete admission, and nothing you do here discloses anything about you to them.`}
      />

      <Band title="What this concerns">
        <ul className="dr__list">
          <li className="dr__item">
            <div>
              <p className="dr__item-title">Deal</p>
              <p className="dr__item-meta">{preview.dealSubject}</p>
            </div>
          </li>
          <li className="dr__item">
            <div>
              <p className="dr__item-title">Inviting organisation</p>
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
              <p className="dr__item-title">Room sponsor</p>
              <p className="dr__item-meta">{preview.roomSponsor}</p>
            </div>
          </li>
          <li className="dr__item">
            <div>
              <p className="dr__item-title">This invitation expires</p>
              <p className="dr__item-meta">{new Date(preview.expiresAt).toISOString().slice(0, 10)}</p>
            </div>
          </li>
        </ul>
      </Band>

      {/* Saying what is withheld is the point of a protected invitation. */}
      <Band title="What you have not been shown">
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
          None of this is disclosed by an invitation, and declining does not disclose it either. If you accept, you see
          only the private workspace you are admitted to.
        </p>
      </Band>

      <Band title="What admission requires">
        <ul className="dr__list">
          {preview.admissionRequirements.map((item) => (
            <li className="dr__item" key={item}>
              <p className="dr__item-title" style={{ fontWeight: 400 }}>
                {item}
              </p>
            </li>
          ))}
        </ul>

        {/*
          Accepting is a command, not a link. It creates the participation that
          the admission checklist then completes, and it is the point at which
          this person exists inside the room at all - still outside the gate,
          still unable to act.
        */}
        <CommandForm
          action={acceptInvitation}
          hidden={{
            locale: params.locale,
            token: params.token,
            returnTo: `/${params.locale}/deal-rooms/invitation/${params.token}`,
          }}
        >
          <Submit label="Accept and continue to admission" />
        </CommandForm>

        <p className="dr__why">
          Accepting does not admit you. It starts the admission checklist, and you can stop at any point in it. Nothing
          in the room is visible to you until every item is complete.
        </p>
        <p className="dr__why">
          If this was not meant for you, close this page. Declining is recorded and the organisation that invited you is
          told; it costs them nothing and affects nothing else on Ponte. Reference {invitationId.slice(0, 8)}.
        </p>
      </Band>
    </>
  );
}
