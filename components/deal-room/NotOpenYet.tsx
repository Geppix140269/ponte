import { Link } from "@/i18n/navigation";
import { Band, Empty, RoomHeader } from "./primitives";

/**
 * What a member sees when the Deal Room is not open to them yet.
 *
 * ## Why this replaced `notFound()`
 *
 * Both Deal Room entry routes used to answer `notFound()` when the flag was off
 * or the member was not allowlisted, and the reason given was deliberate:
 *
 * > An unreleased slice should be indistinguishable from a route that does not
 * > exist, and turning the flag off must leave nothing behind that hints at it.
 *
 * That was sound while nothing linked to it. It stopped being sound the moment
 * the entrance made **"Open a Deal Room"** its primary call to action, set at
 * the scale of the product. Concealment only works if the thing is concealed;
 * once the landing page announces the room in 64px type, a 404 is not a
 * discreet absence, it is the site contradicting itself. The owner followed his
 * own CTA on 1 August 2026 and was told the page does not exist.
 *
 * So the slice is no longer hidden. It is named, and its state is stated.
 *
 * ## What this must never do
 *
 * It does not say when. Nothing in the repository fixes a date for the staged
 * rollout, and inventing "soon" here would be a commitment made by a component.
 * It says what is true: the room exists, it is being opened in stages, and this
 * member is not in the current stage.
 *
 * It also does not offer a way to self-serve past the gate. `DEAL_ROOM_ALLOWLIST`
 * is a rollout control the owner sets; a button here that claimed to request
 * access would be a form with nothing behind it.
 */
export default function NotOpenYet({ locale }: { locale: string }) {
  return (
    <>
      <RoomHeader
        reference="Deal Rooms"
        title="Deal Rooms are opening in stages"
        dealLine="A Deal Room is a protected workspace for one defined Deal: an agreed procedure, evidence, decisions and blockers, with the party you invite joining free."
      />

      <Band title="Not open to your account yet">
        <Empty>
          Deal Rooms are being switched on a group at a time while the first rooms run. Your account is not in the
          current group, so there is nothing for you to open here today. Nothing is wrong with your account and no
          action is outstanding on it.
        </Empty>
        <p className="dr__why">
          Everything that leads to a room stays open to you in the meantime. Publishing a Deal, being found, and
          receiving credible interest all happen before a room is opened, and a room is always built from a Deal that is
          already published, so the work you do now is the work a room begins from.
        </p>
        <p className="dr__item-meta">
          <Link className="dr__link" href="/structure">
            Bring a requirement or offer to the desk
          </Link>
          {" · "}
          <Link className="dr__link" href="/market-signals">
            Read what Ponte has detected
          </Link>
          {" · "}
          <Link className="dr__link" href={`/${locale}/pricing`}>
            What a Deal Room costs
          </Link>
        </p>
      </Band>
    </>
  );
}
