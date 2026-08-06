"use client";

import BridgeShell, { BridgeAction, BridgeSecondary } from "./BridgeShell";
import type { Signal } from "../Chrome";
import type { RecordLine } from "@/lib/publish/record";
import { CONFIRMATION_PERIMETER, NO_RESPONSE_PROMISE } from "@/lib/publish/screening";
import { expiryLongDate } from "@/lib/publish/validity";
import { capacity, type CapacityAnswer } from "@/lib/publish/capacity";
import type { MarketFamily } from "@/lib/taxonomy/market";

/**
 * `B09` Submission confirmation, on the bridge system.
 *
 * ## A recognition surface, not a receipt
 *
 * A stage-completion recognition: five elements, none omitted.
 *
 *   1. Action        the milestone, named. "Deal published".
 *   2. Recognition   what completed, in a serif statement.
 *   3. Value created why it matters, in the member's terms.
 *   4. Progress      what is preserved, and what stays private.
 *   5. Next action   one, with an owner.
 *
 * A receipt would carry the first and the fifth and call it done. The reason the
 * other three exist is that a member who has just spent ten minutes building a
 * record deserves to be told what they now have, and "Submitted" does not tell
 * them.
 *
 * **No coins, points, streaks or confetti.** The recognition is a report. The
 * distinction is not decorative: a reward implies Ponte is pleased, which
 * implies a judgement, which is the thing Ponte does not make.
 *
 * ## The arc, whole
 *
 * This is the one surface where the deck is complete and every node is filled.
 * `arcPosition` returns a position past the last node for exactly that reason:
 * a published listing drawn as an unfinished span would be the product
 * contradicting itself at the moment it most needs to be believed.
 *
 * ## The honest next step
 *
 * `NO_RESPONSE_PROMISE`: "Ponte can make you findable, not wanted." This is the
 * surface where the temptation to imply that publishing will attract responses
 * is highest, and where believing it costs the most.
 */

export interface BridgePublishedProps {
  /** The listing's public reference. */
  reference: string;
  /** The subject, in the member's own words. Never case-folded. */
  subject: string | null;
  /** Days chosen, or "standing". */
  validity: number | "standing";
  now: Date;
  capacityAnswer: CapacityAnswer;
  identityPublic: boolean;
  family: MarketFamily | null;
  signedIn: boolean;
  ledger: readonly RecordLine[];
  signals: readonly Signal[];
  who?: string | null;
  onMyListings: () => void;
  onPublishAnother: () => void;
}

export default function BridgePublished({
  reference,
  subject,
  validity,
  now,
  capacityAnswer,
  identityPublic,
  family,
  signedIn,
  ledger,
  signals,
  who = null,
  onMyListings,
  onPublishAnother,
}: BridgePublishedProps) {
  const chosenCapacity = capacity(capacityAnswer.key);

  return (
    <BridgeShell
      screen="B09"
      phase="published"
      node="published"
      family={family}
      signedIn={signedIn}
      /*
        2. Recognition. The subject is NOT lower-cased. It was, to make it read
        inside "Your ... listing", and it turned the member's own product name
        into "gasoil 10 ppm (ulsd, en 590)": mangling two standards in the one
        sentence that tells them their record is live. The member's language
        outranks the sentence's grammar, so the sentence gives way instead.
      */
      question={
        subject ? `${subject} is live, and anyone can find it.` : "Your listing is live."
      }
      eyebrow="Deal published"
      // Not the reference, which is on the record below. Saying it twice on one
      // screen makes the second one look like a different number at a glance.
      note="It is on the board from now. Nothing else is needed from you."
      // Terminal. There is no way back: the listing is public, and a control
      // implying it could be un-published by going backwards would be a lie.
      back={null}
      ledger={ledger}
      signals={signals}
      who={who}
      actions={
        <>
          <BridgeAction label="Back to my listings" onClick={onMyListings} />
          <BridgeSecondary label="Publish another" onClick={onPublishAnother} />
        </>
      }
    >
      <div className="brg-report">
        {/* 3. Value created, and the honest limit on it. */}
        <p>
          It appears in results from now until it expires, with your public facts and without your
          price or your identity. {NO_RESPONSE_PROMISE}
        </p>

        {/* 4. Progress preserved. */}
        <div className="brg-report__held">
          Your price, your documents and your notes stay private, and your company name is
          disclosed{" "}
          {identityPublic
            ? "publicly on the listing, as you chose."
            : "only when you accept an interest and the other side gives theirs."}
        </div>

        {/* 5. Next action, with an owner. */}
        <div className="brg-report__next">
          <span className="brg-eyebrow">Next action</span>
          <b>Watch for interest, or add another listing</b>
        </div>
        <div className="brg-report__meta">Owner: You</div>
      </div>

      <div className="brg-row">
        <span className="brg-row__label">Listing reference</span>
        <span className="brg-row__value">{reference}</span>
      </div>
      <div className="brg-row">
        <span className="brg-row__label">
          Expires
          <small>
            {validity === "standing" ? "Not until you withdraw it" : expiryLongDate(validity, now)}
          </small>
        </span>
        <span className="brg-row__value">
          {validity === "standing" ? "Standing" : `${validity} days`}
        </span>
      </div>
      {chosenCapacity && (
        <div className="brg-row">
          <span className="brg-row__label">
            Visible as
            <small>{chosenCapacity.label}</small>
          </span>
          <span className="brg-row__value">Public</span>
        </div>
      )}

      <div className="brg-perimeter">{CONFIRMATION_PERIMETER}</div>
    </BridgeShell>
  );
}
