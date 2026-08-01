import { Link } from "@/i18n/navigation";
import type { ResumeFailure } from "@/app/[locale]/structure/page";

/**
 * Shown when `?edit=<id>` was given and the record could not be resumed.
 *
 * ## Why it exists
 *
 * The composer used to open FRESH when a resume failed, on the reasoning that
 * starting again beats resuming half a record. The first half of that is right
 * and is unchanged. The second half was wrong, because the member was never
 * told.
 *
 * On 1 August 2026 the owner followed "Complete your listing" from an email
 * that named PT-0112 and its one missing detail, and arrived at a composer
 * saying "Nothing started yet". Nothing was lost, and the screen said the
 * opposite of that.
 *
 * ## What it must not do
 *
 * **It must not say the record does not exist.** A `not_found` here means the
 * row is absent OR belongs to somebody else, and those are deliberately the
 * same answer: confirming which would tell a stranger whether a guessed id is
 * real.
 *
 * **It must not blame the member.** Two of the three causes are ours.
 *
 * **It must not block.** The composer is still underneath it, still usable.
 * This is a notice, not a wall.
 */

const MESSAGE: Record<ResumeFailure, { title: string; body: string }> = {
  signed_out: {
    title: "Sign in to pick up where you left off",
    body:
      "Your record is safe. Ponte needs to know who you are before it can open it, because a record is only ever shown to the member who created it.",
  },
  not_found: {
    title: "That record could not be opened",
    body:
      "The link may be out of date, or the record may belong to a different account. Your own records are listed under your opportunities, and nothing has been deleted.",
  },
  unreadable: {
    title: "That record could not be read just now",
    body:
      "This is a fault on our side, not a problem with your listing. Nothing has been lost or changed. Trying the link again shortly will usually work, and your record is intact either way.",
  },
};

export default function ResumeNotice({
  failure,
  locale,
  reference,
}: {
  failure: ResumeFailure;
  locale: string;
  reference: string;
}) {
  const { title, body } = MESSAGE[failure];

  return (
    <div className="resnote" role="status">
      <div>
        <b>{title}</b>
        <p>{body}</p>
        <p className="resnote__a">
          {failure === "signed_out" ? (
            <Link className="dr__link" href={`/${locale}/login?next=/structure?edit=${encodeURIComponent(reference)}`}>
              Sign in and open it
            </Link>
          ) : (
            <Link className="dr__link" href="/opportunities">
              See all of your records
            </Link>
          )}
          {" · "}
          You can also start something new below.
        </p>
      </div>
    </div>
  );
}
