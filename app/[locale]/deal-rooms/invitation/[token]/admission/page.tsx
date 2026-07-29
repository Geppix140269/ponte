import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Action, Band, Banner, RoomHeader } from "@/components/deal-room/primitives";
import { getUser } from "@/lib/auth";
import { dealRoomRoutesEnabled } from "@/lib/deal-room/flags";
import { resolveInvitation } from "@/lib/deal-room/invitation-server";
import { INVITATION_FAILURE_MESSAGE } from "@/lib/deal-room/invitation";
import { AGREEMENT_KIND_LABEL, REQUIRED_AGREEMENT_KINDS } from "@/lib/deal-room/states";

export const dynamic = "force-dynamic";

/**
 * DR-05: the admission checklist.
 *
 * This is the gate acceptance criterion 4 is about. Everything on it must be
 * complete before the participant can do anything at all inside the room, and
 * the last three items are the ones that make it a gate rather than a form: the
 * Participation Agreement, the confidentiality obligations and the room rules,
 * each accepted against a named version.
 *
 * Each item states three things, per the Experience Design: whether it is
 * complete, why it is required, and who can see it. The third is the one people
 * forget, and it is the reason a member will supply a document at all.
 *
 * The acceptance record is what the owner confirmed on 29 July 2026: profile
 * identity, organisation or declared capacity, agreement kind, document version,
 * SHA-256 of the accepted content, and a UTC timestamp. No IP address and no
 * user agent are stored. It is rigorous click-to-accept evidence and is not
 * described anywhere as an electronic signature.
 */
export default async function AdmissionPage({
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

  const user = await getUser();
  const { preview } = lookup.invitation;

  const checks = [
    {
      key: "account",
      title: "Sign in to Ponte, or create an account",
      why: "Every action inside a Deal Room is attributed to a named person. Nothing can be recorded anonymously.",
      who: "Your name and email are visible to the participants of the workspace you join.",
      complete: Boolean(user),
    },
    {
      key: "organisation",
      title: "Identify the organisation you act for, or the capacity you act in",
      why: "The other side is entitled to know which legal entity, or which professional capacity, is on the other end of the transaction. A complete Business Passport is not required to enter.",
      who: "Visible to the participants of this workspace and to the room's sponsor.",
      complete: false,
    },
    {
      key: "role",
      title: `Declare your role: ${preview.proposedRole}`,
      why: "Responsibilities in the procedure are assigned by role, so the role has to be stated before anything can be assigned to you.",
      who: "Visible to the participants of this workspace.",
      complete: false,
    },
    {
      key: "authority",
      title: "Declare that you are authorised to participate in that role",
      why: "Participating and having authority to commit are different things, and the room records them separately. Declaring authority is not the same as it having been sighted.",
      who: "Visible to the participants of this workspace. Ponte does not verify it.",
      complete: false,
    },
  ];

  return (
    <>
      <meta name="referrer" content="no-referrer" />

      <RoomHeader
        reference="Ponte Trade · Admission"
        title="Before you enter the private workspace"
        dealLine="Nothing in the room is visible to you until every item below is complete, and nothing you do inside it is possible before then."
      />

      <Band title="Your details">
        {checks.map((check) => (
          <div className="dr__check" key={check.key}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
              <p className="dr__item-title">{check.title}</p>
              <span className={check.complete ? "dr__chip dr__chip--done" : "dr__chip dr__chip--declared"}>
                {check.complete ? "Complete" : "Not yet"}
              </span>
            </div>
            <p className="dr__check-why">{check.why}</p>
            <p className="dr__check-who">Who can see it: {check.who}</p>
          </div>
        ))}
      </Band>

      <Band title="Agreements">
        {REQUIRED_AGREEMENT_KINDS.map((kind) => (
          <div className="dr__check" key={kind}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
              <p className="dr__item-title">{AGREEMENT_KIND_LABEL[kind]}</p>
              <span className="dr__chip dr__chip--declared">Not yet</span>
            </div>
            <p className="dr__check-why">
              You must accept this version before you can act in the room. Your acceptance is recorded with the exact
              version, a checksum of the text you accepted, your identity and the time.
            </p>
            <p className="dr__check-who">Who can see it: the room administrator, and you.</p>
          </div>
        ))}

        <p className="dr__why">
          These are click-to-accept records. They are rigorous and attributable, and they are not a qualified or
          advanced electronic signature. Ponte does not describe them as one. The version you accept stays retrievable,
          so the checksum can be checked later.
        </p>
      </Band>

      <div className="dr__actions">
        <Action
          label="Enter private Deal Room"
          reason={
            user
              ? "Complete every item above before entering. Accepting the agreements is the last step."
              : "Sign in first. Your place in this admission is kept, and you return to exactly this page."
          }
        />
        <Action label="Decline this invitation" href={`/${params.locale}/deal-rooms/invitation/${params.token}?decline=1`} secondary />
      </div>
    </>
  );
}
