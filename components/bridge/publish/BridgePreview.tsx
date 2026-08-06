"use client";

import { useState } from "react";
import BridgeShell, { BridgeAction, BridgeSecondary } from "./BridgeShell";
import type { Signal } from "../Chrome";
import type { RecordLine } from "@/lib/publish/record";
import { VALIDITY_DAYS, expirySentence, type ValidityChoice } from "@/lib/publish/validity";
import { factsFor, type InferredSet } from "@/lib/publish/facts";
import { assetSummary, type ListingAsset } from "@/lib/publish/assets";
import { type CapacityAnswer } from "@/lib/publish/capacity";
import { subjectFor, familyOf, type StructureDraft } from "@/lib/structure/draft";

/**
 * `B07` Deal preview, on the bridge system. The most important surface on the
 * path.
 *
 * ## Three layers, and one of them cannot be reduced
 *
 * Public, on accepted interest, private. The public layer is the MINIMUM PUBLIC
 * DATASET: it is what makes a listing findable, so it is fixed and unmovable and
 * the surface says so. Its rows are not controls, deliberately: there is nothing
 * to change, so there is nothing to tap, and a control that does nothing teaches
 * a member that controls on this screen do nothing.
 *
 * ## Identity is revealed on accepted interest, by default
 *
 * And the disclosure is MUTUAL either way: no counterparty sees the member's
 * identity without giving their own in the same moment. Choosing public gives
 * theirs first. That sentence is on the surface rather than in a policy page,
 * because it is the thing a member is actually deciding.
 *
 * ## Validity
 *
 * 30, 60 or 90 days with 60 the default, and the EXACT EXPIRY DATE shown.
 * `expirySentence` computes it from the day count and the injected instant; the
 * surface never prints a date it worked out itself.
 *
 * ## No price numeral, anywhere
 *
 * `ADR-0030`. Publishing a listing is free and public; the paid action is
 * activating a Deal Room and it is not on this path. The primary action says
 * "Public and free. Anyone can find it." and there is no figure on the screen to
 * be misread as a charge for publishing.
 */

export interface BridgePreviewProps {
  draft: StructureDraft;
  onDraft: (draft: StructureDraft) => void;
  inferred: InferredSet;
  capacityAnswer: CapacityAnswer;
  assets: readonly ListingAsset[];
  /** The company name, when signed in and known. Null shows the honest gap. */
  company: string | null;
  /** Injected so the expiry date is deterministic in tests and in evidence. */
  now: Date;
  signedIn: boolean;
  retention: string;
  ledger: readonly RecordLine[];
  signals: readonly Signal[];
  who?: string | null;
  onBack: () => void;
  onPublish: () => void;
}

export default function BridgePreview({
  draft,
  onDraft,
  inferred,
  capacityAnswer,
  assets,
  company,
  now,
  signedIn,
  retention,
  ledger,
  signals,
  who = null,
  onBack,
  onPublish,
}: BridgePreviewProps) {
  const [identityOpen, setIdentityOpen] = useState(false);

  const family = familyOf(draft);
  const subject = subjectFor(draft);
  const facts = factsFor(draft, inferred);
  const validity: ValidityChoice =
    typeof draft.validity === "number" || draft.validity === "standing" ? draft.validity : 60;

  /*
    The public layer is every stated fact of this family's own procedure. It is
    generated from the same fact model the listing screen used, so a member
    cannot see one set of facts on one screen and a different set on the next:
    that divergence is what made the old preview untrustworthy.
  */
  const publicFacts = facts.filter(
    (fact) =>
      fact.tier !== "needed" &&
      fact.tier !== "optional" &&
      // The note is private by definition; it is shown in the third layer.
      fact.field !== "note" &&
      /*
        Validity is excluded because it has its own section BELOW, with the
        three horizons and the exact expiry date. Rendering it here as well
        printed "Validity: 60 days: Fixed" directly above a control that
        changes it, which is a contradiction the member can see: either it is
        fixed or the rows underneath do nothing.
      */
      fact.field !== "validity",
  );

  const identityPublic = draft.role === "identity_public";
  const onAcceptance = assets.filter((a) => a.visibility === "on_accepted_interest");
  const privateAssets = assets.filter((a) => a.visibility === "private");

  if (identityOpen) {
    return (
      <BridgeShell
        screen="B07"
        phase="identity"
        node="preview"
        family={family}
        signedIn={signedIn}
        progress={1}
        question={`Who sees that this is ${company ?? "your company"}?`}
        eyebrow="Company identity"
        note="This can be changed after publishing. Anyone who already saw your identity has already seen it."
        back={{ label: "Preview", onBack: () => setIdentityOpen(false) }}
        ledger={ledger}
        retention={retention}
        signals={signals}
        who={who}
        actions={
          <>
            <BridgeAction
              label="Keep it on accepted interest"
              onClick={() => {
                onDraft({ ...draft, role: identityPublic ? null : draft.role });
                setIdentityOpen(false);
              }}
            />
            <BridgeSecondary
              label="Show my company publicly"
              onClick={() => {
                onDraft({ ...draft, role: "identity_public" });
                setIdentityOpen(false);
              }}
            />
          </>
        }
      >
        <button
          className="brg-zone"
          type="button"
          aria-pressed={!identityPublic}
          data-chosen={!identityPublic ? "true" : undefined}
        >
          <span className="brg-zone__index">01</span>
          <span className="brg-zone__title">On accepted interest</span>
          <span className="brg-zone__detail">
            The default. They see you when you see them: mutual, at the same moment.
          </span>
        </button>
        <button
          className="brg-zone"
          type="button"
          aria-pressed={identityPublic}
          data-chosen={identityPublic ? "true" : undefined}
        >
          <span className="brg-zone__index">02</span>
          <span className="brg-zone__title">Publicly, on the listing</span>
          <span className="brg-zone__detail">
            Anyone browsing sees your company name before contacting you.
          </span>
        </button>

        <div className="brg-report__held" style={{ marginBlockStart: 30 }}>
          <b>Disclosure is mutual either way.</b> If you stay on accepted interest, no
          counterparty ever sees your identity without giving theirs in the same moment. Choosing
          public gives yours first.
        </div>
      </BridgeShell>
    );
  }

  return (
    <BridgeShell
      screen="B07"
      phase={family ?? "products"}
      node="preview"
      family={family}
      signedIn={signedIn}
      progress={0.5}
      question={subject ?? "This listing has no subject yet."}
      eyebrow="What the market sees"
      note={
        draft.hsCode
          ? `HS ${draft.hsCode}. Nothing here is public until you publish it.`
          : "Nothing here is public until you publish it."
      }
      back={{ label: "The listing so far", onBack }}
      ledger={ledger}
      retention={retention}
      signals={signals}
      who={who}
      actions={
        <BridgeAction
          label="Publish"
          sub="Public and free. Anyone can find it."
          onClick={onPublish}
        />
      }
    >
      {/* Layer 1. Fixed, and its rows are not controls. */}
      <div className="brg-layer">
        <div className="brg-layer__head">
          <div className="brg-eyebrow">Public, anyone browsing Ponte</div>
          <span className="brg-layer__fixed">Fixed</span>
        </div>
        <p className="brg-note">
          The minimum public dataset. It is what makes a listing findable, so it cannot be reduced.
        </p>
      </div>
      {publicFacts.map((fact) => (
        <div className="brg-row" key={fact.field}>
          <span className="brg-row__label">
            {fact.label}
            {/*
              The HS code is NOT rendered here. It was, hung off the quantity
              row, and it read "On requestHS 271019": glued to the value, and
              attached to the wrong fact. A customs classification belongs to
              the product, so it sits with the subject above.
            */}
            <small>{fact.value}</small>
          </span>
          <span className="brg-row__value">Fixed</span>
        </div>
      ))}

      {/* Layer 2. Identity lives here by default, and it is changeable. */}
      <div className="brg-layer">
        <div className="brg-eyebrow">On accepted interest, both sides at once</div>
        <p className="brg-note">
          Disclosure is mutual. Neither party sees the other&rsquo;s identity without giving their
          own.
        </p>
      </div>
      <button className="brg-fact" type="button" onClick={() => setIdentityOpen(true)}>
        <span className="brg-fact__k">
          <b>Company</b>
          <span>{identityPublic ? "Shown publicly" : "Show publicly"}</span>
        </span>
        <span className="brg-fact__v">{company ?? "Named when you accept an interest"}</span>
      </button>
      <div className="brg-row">
        <span className="brg-row__label">Contact</span>
        <span className="brg-row__value">Named on acceptance</span>
      </div>
      {onAcceptance.length > 0 && (
        <div className="brg-row">
          <span className="brg-row__label">
            Assets
            <small>{onAcceptance.length} released on acceptance</small>
          </span>
          <span className="brg-row__value">Fixed</span>
        </div>
      )}

      {/* Layer 3. Held, never shown, never inferred from anything public. */}
      <div className="brg-layer">
        <div className="brg-eyebrow">Private, only you</div>
        <p className="brg-note">
          Held against your account. Never shown, and never inferred from anything public.
        </p>
      </div>
      <div className="brg-row">
        <span className="brg-row__label">
          Notes
          <small>{draft.note ? draft.note : "Nothing held"}</small>
        </span>
        <span className="brg-row__value">Private</span>
      </div>
      {privateAssets.length > 0 && (
        <div className="brg-row">
          <span className="brg-row__label">
            Documents
            <small>{assetSummary(privateAssets)}, held, not shown</small>
          </span>
          <span className="brg-row__value">Private</span>
        </div>
      )}

      {/*
        Validity. Rows rather than pills: the reference draws bordered pills, and
        a bordered pill is a box, which the same reference's own header forbids.
        They also gain tap target, which matters more on a 360px phone.
      */}
      <div className="brg-group">Validity</div>
      {VALIDITY_DAYS.map((days, index) => (
        <button
          key={days}
          className="brg-zone"
          type="button"
          aria-pressed={validity === days}
          data-chosen={validity === days ? "true" : undefined}
          onClick={() => onDraft({ ...draft, validity: days })}
        >
          <span className="brg-zone__index">{String(index + 1).padStart(2, "0")}</span>
          <span className="brg-zone__title">{days} days</span>
          {days === 60 && <span className="brg-zone__detail">The default</span>}
        </button>
      ))}
      <p className="brg-note" style={{ marginBlockStart: 18 }}>
        {validity === "standing"
          ? "This listing stays open until you withdraw it."
          : expirySentence(validity, now)}
      </p>
    </BridgeShell>
  );
}
