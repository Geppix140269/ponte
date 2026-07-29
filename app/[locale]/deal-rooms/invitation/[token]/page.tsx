import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Action, Band, Banner, RoomHeader } from "@/components/deal-room/primitives";
import { dealRoomRoutesEnabled } from "@/lib/deal-room/flags";
import { resolveInvitation } from "@/lib/deal-room/invitation-server";
import { INVITATION_FAILURE_MESSAGE } from "@/lib/deal-room/invitation";

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
}: {
  params: { locale: string; token: string };
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

        <div className="dr__actions">
          <Action label="Continue to admission" href={`/${params.locale}/deal-rooms/invitation/${params.token}/admission`} />
          <Action label="Decline this invitation" href={`/${params.locale}/deal-rooms/invitation/${params.token}?decline=1`} secondary />
        </div>
        <p className="dr__why">
          Declining is recorded and the organisation that invited you is told. It costs them nothing and it does not
          affect anything else on Ponte. Reference {invitationId.slice(0, 8)}.
        </p>
      </Band>
    </>
  );
}
