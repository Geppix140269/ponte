"use client";

import Frame, { Action, Secondary } from "./Frame";
import { CONFIRMATION_PERIMETER, NO_RESPONSE_PROMISE } from "@/lib/publish/screening";
import { expiryLongDate } from "@/lib/publish/validity";
import { capacity, type CapacityAnswer } from "@/lib/publish/capacity";

/**
 * `B09` Submission confirmation.
 *
 * ## An R2 recognition surface, not a receipt
 *
 * The Momentum catalogue maps `deal_published` to R2, which is a
 * STAGE-COMPLETION recognition: five elements, none omitted.
 *
 *   1. Action        the milestone, named. "Deal published".
 *   2. Recognition   what completed, in a serif statement.
 *   3. Value created why it matters, in the member's terms.
 *   4. Progress      what is preserved, and what stays private.
 *   5. Next action   one, with an owner.
 *
 * A receipt would carry the first and the fifth and call it done. The reason
 * the other three exist is that a member who has just spent ten minutes
 * building a record deserves to be told what they now have, and "Submitted"
 * does not tell them.
 *
 * **No coins, points, streaks or confetti.** The recognition is a report. The
 * distinction is not decorative: a reward implies Ponte is pleased, which
 * implies a judgement, which is the thing Ponte does not make.
 *
 * ## The honest next step
 *
 * `NO_RESPONSE_PROMISE`: "Ponte can make you findable, not wanted." This is the
 * surface where the temptation to imply that publishing will attract responses
 * is highest, and where believing it costs the most.
 */

export interface PublishedProps {
  /** The listing's public reference. */
  reference: string;
  /** The subject, in the member's own words. */
  subject: string | null;
  /** Days chosen, or "standing". */
  validity: number | "standing";
  now: Date;
  capacityAnswer: CapacityAnswer;
  identityPublic: boolean;
  onMyListings: () => void;
  onPublishAnother: () => void;
}

export default function Published({
  reference,
  subject,
  validity,
  now,
  capacityAnswer,
  identityPublic,
  onMyListings,
  onPublishAnother,
}: PublishedProps) {
  const chosenCapacity = capacity(capacityAnswer.key);

  return (
    <Frame
      screen="B09"
      stage={5}
      back={null}
      phase="published"
      footer={
        <>
          <Action label="Back to my listings" onClick={onMyListings} />
          <Secondary label="Publish another" onClick={onPublishAnother} />
        </>
      }
    >
      <div className="r2">
        {/* 1. Action. */}
        <div className="r2__m">
          <span className="mk mk--done" />
          <span className="lab">Deal published</span>
        </div>

        {/*
          2. Recognition.

          The subject is NOT lower-cased. It was, to make it read inside "Your
          … listing", and it turned the member's own product name into
          "gasoil 10 ppm (ulsd, en 590)": mangling two standards, ULSD and
          EN 590, in the one sentence that tells them their record is live.
          North Star 3.4 puts the member's language above the sentence's
          grammar, so the sentence gives way instead.
        */}
        <h2>
          {subject ? `${subject} is live, and anyone can find it.` : "Your listing is live, and anyone can find it."}
        </h2>

        {/* 3. Value created, and the honest limit on it. */}
        <p>
          It appears in results from now until it expires, with your public facts and without your
          price or your identity. {NO_RESPONSE_PROMISE}
        </p>

        {/* 4. Progress preserved. */}
        <div className="held">
          <i aria-hidden="true" />
          <span>
            Your price, your documents and your notes stay private, and your company name is
            disclosed{" "}
            {identityPublic
              ? "publicly on the listing, as you chose."
              : "only when you accept an interest and the other side gives theirs."}
          </span>
        </div>

        {/* 5. Next action, with an owner. */}
        <div className="r2__next">
          <span className="lab">Next action</span>
          <b>Watch for interest, or add another listing</b>
        </div>
        <div className="r2__meta">
          <span>Owner: You</span>
        </div>
      </div>

      <div className="lay__l">
        <div>
          <span>
            <span className="k">Listing reference</span>
            <span className="v mono">{reference}</span>
          </span>
          <span className="fx">Public</span>
        </div>
        <div>
          <span>
            <span className="k">Expires</span>
            <span className="v">
              {validity === "standing" ? "Not until you withdraw it" : expiryLongDate(validity, now)}
            </span>
          </span>
          <span className="fx">{validity === "standing" ? "Standing" : `${validity} days`}</span>
        </div>
        {chosenCapacity && (
          <div>
            <span>
              <span className="k">Visible as</span>
              <span className="v">{chosenCapacity.label}</span>
            </span>
            <span className="fx">Public</span>
          </div>
        )}
      </div>

      <div className="perim">
        <p>{CONFIRMATION_PERIMETER}</p>
      </div>
    </Frame>
  );
}
