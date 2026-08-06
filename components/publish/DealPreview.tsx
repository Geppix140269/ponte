"use client";

import { useState, useTransition } from "react";
import Frame, { Action, Retention, Secondary } from "./Frame";
import { VALIDITY_DAYS, expirySentence, type ValidityChoice } from "@/lib/publish/validity";
import { factsFor, FIELD_LABEL, type InferredSet } from "@/lib/publish/facts";
import { assetSummary, type ListingAsset } from "@/lib/publish/assets";
import { capacity, type CapacityAnswer } from "@/lib/publish/capacity";
import { subjectFor, familyOf, type StructureDraft } from "@/lib/structure/draft";

/**
 * `B07` / `S03` / `T03` Deal preview. The most important surface in Set 2.
 *
 * ## Three layers, and one of them cannot be reduced
 *
 * Public, on accepted interest, private. The public layer is the MINIMUM PUBLIC
 * DATASET: it is what makes a listing findable, so it is fixed and unmovable
 * and the surface says so with a lock and the word "Fixed". Its rows are `div`s
 * and not buttons, deliberately: there is nothing to change, so there is
 * nothing to tap, and a control that does nothing teaches a member that
 * controls on this screen do nothing.
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
 * `expirySentence` computes it from the day count and the current instant; the
 * surface never prints a date it worked out itself.
 *
 * DEVIATION: the reference draws these as bordered pills. Bordered pills are
 * boxes, which the same reference's header forbids, so they are choice rows.
 * They also gain 16px of tap target, which matters more on a 360px phone.
 *
 * ## No price numeral, anywhere
 *
 * `ADR-0030`. Publishing a listing is free and public; the paid action is
 * activating a Deal Room and it is not on this path. The primary action says
 * "Public and free. Anyone can find it." and there is no figure on the screen
 * to be misread as a charge for publishing.
 */

export interface DealPreviewProps {
  draft: StructureDraft;
  onDraft: (draft: StructureDraft) => void;
  inferred: InferredSet;
  capacityAnswer: CapacityAnswer;
  assets: readonly ListingAsset[];
  /** The company name, when signed in and known. Null shows the honest gap. */
  company: string | null;
  /** Injected so the expiry date is deterministic in tests and in evidence. */
  now: Date;
  retention: string;
  onBack: () => void;
  onPublish: () => void;
}

export default function DealPreview({
  draft,
  onDraft,
  inferred,
  capacityAnswer,
  assets,
  company,
  now,
  retention,
  onBack,
  onPublish,
}: DealPreviewProps) {
  const [identityOpen, setIdentityOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const family = familyOf(draft);
  const subject = subjectFor(draft);
  const facts = factsFor(draft, inferred);
  const chosenCapacity = capacity(capacityAnswer.key);
  const validity: ValidityChoice =
    typeof draft.validity === "number" || draft.validity === "standing" ? draft.validity : 60;

  /*
    The public layer is every stated fact of this family's own procedure, plus
    the capacity. It is generated from the same fact model the listing screen
    used, so a member cannot see one set of facts on one screen and a different
    set on the next: that divergence is what made the old preview untrustworthy.
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
        printed "Validity: 60 days: FIXED" directly above a control that
        changes it, which is a contradiction the member can see: either it is
        fixed or the rows underneath do nothing.
      */
      fact.field !== "validity",
  );

  function chooseValidity(days: number) {
    startTransition(() => onDraft({ ...draft, validity: days }));
  }

  const identityPublic = draft.role === "identity_public";

  return (
    <Frame
      screen="B07"
      stage={4}
      back="The listing so far"
      onBack={onBack}
      pending={pending}
      phase={identityOpen ? "identity" : family}
      footer={
        identityOpen ? (
          <>
            <Action
              label="Keep it on accepted interest"
              onClick={() => {
                onDraft({ ...draft, role: draft.role === "identity_public" ? null : draft.role });
                setIdentityOpen(false);
              }}
            />
            <Secondary
              label="Show my company publicly"
              onClick={() => {
                onDraft({ ...draft, role: "identity_public" });
                setIdentityOpen(false);
              }}
            />
          </>
        ) : (
          <>
            <Action
              label="Publish"
              sub="Public and free. Anyone can find it."
              onClick={onPublish}
            />
            <Retention sentence={retention} />
          </>
        )
      }
    >
      {identityOpen ? (
        <>
          <div className="fl__hd">
            <span className="lab">Company identity</span>
            <h1 className="stmt stmt--2" style={{ marginTop: 11 }}>
              Who sees that this is {company ?? "your company"}?
            </h1>
          </div>
          <div className="rows">
            <button className="row" type="button" aria-pressed={!identityPublic}>
              <span className={`mk${!identityPublic ? " mk--done" : ""}`} />
              <span>
                <b>On accepted interest</b>
                <small>
                  The default. They see you when you see them: mutual, at the same moment.
                </small>
              </span>
              <span className="go">{identityPublic ? "›" : ""}</span>
            </button>
            <button className="row" type="button" aria-pressed={identityPublic}>
              <span className={`mk${identityPublic ? " mk--done" : ""}`} />
              <span>
                <b>Publicly, on the listing</b>
                <small>Anyone browsing sees your company name before contacting you.</small>
              </span>
              <span className="go">{identityPublic ? "" : "›"}</span>
            </button>
          </div>
          <div className="lay__h" style={{ borderBlockStart: "1px solid var(--rule)", paddingBlock: 18 }}>
            <span className="mk mk--acc" />
            <span>
              <b>Disclosure is mutual either way.</b>
              <span>
                If you stay on accepted interest, no counterparty ever sees your identity without
                giving theirs in the same moment. Choosing public gives yours first.
              </span>
            </span>
          </div>
          <div className="pb__pad" style={{ padding: "18px 20px 4px" }}>
            <p className="note">
              This can be changed after publishing. Anyone who already saw your identity has
              already seen it.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="fl__hd">
            <span className="lab">What the market sees</span>
            <h1 className="stmt stmt--2" style={{ marginTop: 11 }}>
              {subject ?? "This listing has no subject yet."}
            </h1>
            {/* The classification, with the thing it classifies. */}
            {draft.hsCode && (
              <p className="hs" style={{ marginTop: 8, display: "block" }}>
                HS {draft.hsCode}
              </p>
            )}
          </div>

          {/* Layer 1. Fixed, and the rows are not controls. */}
          <div className="lay--pub">
            <div className="lay__h">
              <span className="mk mk--pub" />
              <span>
                <b>Public &mdash; anyone browsing Ponte</b>
                <span>
                  The minimum public dataset. It is what makes a listing findable, so it cannot be
                  reduced.
                </span>
              </span>
              <span className="fixed">
                <span className="mk mk--lock" />
                Fixed
              </span>
            </div>
            <div className="lay__l">
              {publicFacts.map((fact) => (
                <div key={fact.field}>
                  <span>
                    <span className="k">{fact.label}</span>
                    {/*
                      The HS code is NOT rendered here. It was, hung off the
                      quantity row, and it read "On requestHS 271019": glued to
                      the value, and attached to the wrong fact. A customs
                      classification belongs to the product, so it sits with the
                      subject above, where it is the proof for the thing it
                      classifies.
                    */}
                    <span className="v">{fact.value}</span>
                  </span>
                  <span className="fx">Fixed</span>
                </div>
              ))}
              {/*
                No separate capacity row. `role` IS a completion field of every
                family's procedure and now carries the declared capacity, so a
                row here printed it a second time: the public layer listed
                "Capacity: Principal for my own company: FIXED" twice, one
                immediately under the other.
              */}
            </div>
          </div>

          {/* Layer 2. Identity lives here by default, and it is changeable. */}
          <div className="lay__h">
            <span className="mk mk--acc" />
            <span>
              <b>On accepted interest &mdash; both sides, at once</b>
              <span>
                Disclosure is mutual. Neither party sees the other&rsquo;s identity without giving
                their own.
              </span>
            </span>
          </div>
          <div className="lay__l">
            <button type="button" onClick={() => startTransition(() => setIdentityOpen(true))}>
              <span>
                <span className="k">Company</span>
                <span className="v">{company ?? "Named when you accept an interest"}</span>
              </span>
              <span className="ctl">{identityPublic ? "Shown publicly" : "Show publicly"}</span>
            </button>
            <div>
              <span>
                <span className="k">Contact</span>
                <span className="v">Named on acceptance</span>
              </span>
              <span className="fx">Fixed</span>
            </div>
            {assets.filter((a) => a.visibility === "on_accepted_interest").length > 0 && (
              <div>
                <span>
                  <span className="k">Assets</span>
                  <span className="v">
                    {assets.filter((a) => a.visibility === "on_accepted_interest").length} released
                    on acceptance
                  </span>
                </span>
                <span className="fx">Fixed</span>
              </div>
            )}
          </div>

          {/* Layer 3. Held, never shown, and never inferred from anything public. */}
          <div className="lay__h">
            <span className="mk mk--priv" />
            <span>
              <b>Private &mdash; only you</b>
              <span>
                Held against your account. Never shown, and never inferred from anything public.
              </span>
            </span>
          </div>
          <div className="lay__l">
            {draft.note ? (
              <div>
                <span>
                  <span className="k">Notes</span>
                  <span className="v">{draft.note}</span>
                </span>
                <span className="fx">Private</span>
              </div>
            ) : (
              <div>
                <span>
                  <span className="k">Notes</span>
                  <span className="v">Nothing held</span>
                </span>
                <span className="fx">Private</span>
              </div>
            )}
            {assets.filter((a) => a.visibility === "private").length > 0 && (
              <div>
                <span>
                  <span className="k">Documents</span>
                  <span className="v">
                    {assetSummary(assets.filter((a) => a.visibility === "private"))} · held, not
                    shown
                  </span>
                </span>
                <span className="fx">Private</span>
              </div>
            )}
          </div>

          {/* Validity. Rows rather than pills: see the note at the top. */}
          <div className="pb__pad" style={{ padding: "18px 20px 8px" }}>
            <span className="lab">Validity</span>
          </div>
          <div className="rows">
            {VALIDITY_DAYS.map((days) => (
              <button
                key={days}
                className="row"
                type="button"
                aria-pressed={validity === days}
                onClick={() => chooseValidity(days)}
              >
                <span className={`mk${validity === days ? " mk--done" : ""}`} />
                <span>
                  <b>{days} days</b>
                  {days === 60 && <small>The default</small>}
                </span>
                <span className="go">{validity === days ? "" : "›"}</span>
              </button>
            ))}
          </div>
          <div className="pb__pad" style={{ padding: "14px 20px 8px" }}>
            <p className="prose">
              {validity === "standing"
                ? "This listing stays open until you withdraw it."
                : expirySentence(validity, now)}
            </p>
          </div>
        </>
      )}
    </Frame>
  );
}
