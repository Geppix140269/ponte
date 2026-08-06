"use client";

import { useState, useTransition } from "react";
import Frame, { Action, Retention } from "./Frame";
import CorrectInPlace from "./CorrectInPlace";
import {
  factsFor,
  countFacts,
  outstandingSentence,
  LISTING_SO_FAR,
  type Fact,
  type FactCounts,
  type InferredSet,
} from "@/lib/publish/facts";
import { subjectFor, type StructureDraft } from "@/lib/structure/draft";
import type { CompletionField } from "@/lib/structure/procedures/types";

/**
 * `B03`-`B05` / `S02` / `T02` The listing so far.
 *
 * Specification: `docs/ponte/design-reference/ponte-set1-screens.js`, pattern 2,
 * nine states. The most reused surface in the product.
 *
 * ## Four rules, all of them structural rather than visual
 *
 * **One fact per line.** No two-column grids and no grouped forms. A member
 * correcting a quantity should not have to find it among four other controls.
 *
 * **Missing and uncertain rise above confirmed.** `factsFor` sorts; this
 * component renders the order it is given and does not re-sort. The order is
 * the work order, and a surface that reordered for visual balance would put the
 * member's next task below the fold.
 *
 * **Inferred is marked distinctly from read.** Different tier class, a dashed
 * underline on the value, a stated provenance, and a confirm control that reads
 * "Yes, that is right". A member cannot mistake one for the other, which is the
 * whole point: an inferred fact is Ponte's until they say otherwise.
 *
 * **Correction in place, never a bare text field.** Tapping a fact opens a
 * sheet of choices over the list. A bare field asks the member to know the
 * vocabulary; a sheet of rows tells them what the answers are. Typing stays
 * available inside the sheet and is never the only way through it.
 *
 * ## The R2 on first arrival
 *
 * Shown once, when the member arrives from `B02` with a structured record. It
 * is a stage-completion report, not a reward: milestone, what completed, why it
 * matters, what is preserved, one next action with an owner. It gives way to
 * the facts as soon as anything is corrected.
 */

export interface ListingSoFarProps {
  draft: StructureDraft;
  onDraft: (draft: StructureDraft) => void;
  inferred: InferredSet;
  /** Confirming an inferred fact makes it the member's. */
  onConfirm: (field: CompletionField) => void;
  /** True on first arrival from `B02`. The R2 shows once. */
  justStructured: boolean;
  retention: string;
  onBack: () => void;
  onContinue: () => void;
}

export default function ListingSoFar({
  draft,
  onDraft,
  inferred,
  onConfirm,
  justStructured,
  retention,
  onBack,
  onContinue,
}: ListingSoFarProps) {
  const [correcting, setCorrecting] = useState<CompletionField | null>(null);
  const [r2Open, setR2Open] = useState(justStructured);
  const [pending, startTransition] = useTransition();

  const facts = factsFor(draft, inferred);
  const counts = countFacts(facts);
  const outstanding = outstandingSentence(draft);
  const subject = subjectFor(draft);

  function open(field: CompletionField) {
    // Correcting dismisses the R2. The reference says it "gives way to your
    // facts as soon as you scroll or correct anything", and a recognition
    // surface that outlives the moment it recognises becomes furniture.
    setR2Open(false);
    startTransition(() => setCorrecting(field));
  }

  return (
    <Frame
      screen="B03-B05"
      stage={3}
      back="Tell Ponte"
      onBack={onBack}
      pending={pending}
      phase={counts.needed > 0 ? "gaps" : counts.inferred > 0 ? "inferred" : "all"}
      footer={
        <>
          <Action label="Continue to publication" sub={outstanding} onClick={onContinue} />
          <Retention sentence={retention} />
        </>
      }
    >
      {r2Open && (
        <div className="r2">
          <div className="r2__m">
            <span className="mk mk--done" />
            <span className="lab">Objective captured</span>
          </div>
          <h2>Ponte has carried your objective forward without forcing a classification.</h2>
          <p>
            What you said is now a structured listing that a buyer can find. Nothing about it is
            published, and nothing has been shown to anyone.
          </p>
          <div className="held">
            <i aria-hidden="true" />
            <span>{heldSentence(counts)}</span>
          </div>
          <div className="r2__next">
            <span className="lab">Next action</span>
            <b>Review the structured interpretation</b>
          </div>
          <div className="r2__meta">
            <span>Owner: You</span>
          </div>
        </div>
      )}

      <div className="fl__hd">
        <h1 className="stmt stmt--2">{LISTING_SO_FAR}</h1>
        {/*
          What the record IS, above the facts about it.

          It was missing: the surface listed seven gaps and one confirmed fact
          and never said the listing was for gasoil. A member reading "The
          listing so far" and finding no subject cannot tell whether the product
          they chose registered at all: which is the same class of defect as
          `P0-5`, a heading that contradicts the choice just made.
        */}
        {subject && (
          <p className="prose" style={{ marginTop: 8, color: "var(--pf-ink)" }}>
            {subject}
            {draft.hsCode ? <span className="hs"> HS {draft.hsCode}</span> : null}
          </p>
        )}
        <div className="cnt">
          {counts.needed > 0 && (
            <span>
              <span className="mk mk--need" />
              {counts.needed} needed
            </span>
          )}
          {counts.inferred > 0 && (
            <span>
              <span className="mk mk--inferred" />
              {counts.inferred} inferred
            </span>
          )}
          <span>
            <span className="mk mk--done" />
            {counts.confirmed} confirmed
          </span>
        </div>
      </div>

      <FactList facts={facts.filter((f) => f.tier === "needed")} onOpen={open} onConfirm={onConfirm} />

      {counts.inferred > 0 && (
        <>
          <div className="grp">Inferred, confirm or change</div>
          <FactList
            facts={facts.filter((f) => f.tier === "inferred")}
            onOpen={open}
            onConfirm={onConfirm}
          />
        </>
      )}

      {counts.confirmed > 0 && (
        <>
          <div className="grp">Read from what you gave Ponte</div>
          <FactList
            facts={facts.filter((f) => f.tier === "read")}
            onOpen={open}
            onConfirm={onConfirm}
          />
        </>
      )}

      {facts.some((f) => f.tier === "optional") && (
        <>
          <div className="grp">Optional, not stated</div>
          <FactList
            facts={facts.filter((f) => f.tier === "optional")}
            onOpen={open}
            onConfirm={onConfirm}
          />
        </>
      )}

      {correcting && (
        <CorrectInPlace
          field={correcting}
          draft={draft}
          onDraft={onDraft}
          onClose={() => setCorrecting(null)}
        />
      )}
    </Frame>
  );
}

function FactList({
  facts,
  onOpen,
  onConfirm,
}: {
  facts: readonly Fact[];
  onOpen: (field: CompletionField) => void;
  onConfirm: (field: CompletionField) => void;
}) {
  if (facts.length === 0) return null;
  return (
    <div className="fl">
      {facts.map((fact) => (
        <div key={fact.field} className={`fl__i fl__i--${tierClass(fact.tier)}`}>
          <button
            type="button"
            onClick={() => onOpen(fact.field)}
            style={{ all: "unset", display: "block", width: "100%", cursor: "pointer" }}
          >
            <span className="fl__k">
              {fact.tier === "needed" && <span className="mk mk--need" />}
              {fact.tier === "inferred" && <span className="mk mk--inferred" />}
              <span className="lab">{fact.label}</span>
              <span className="r">
                {fact.tier === "needed"
                  ? "Needed to publish"
                  : fact.tier === "inferred"
                    ? "Inferred, not read"
                    : fact.tier === "optional"
                      ? "Optional"
                      : ""}
              </span>
              {fact.tier === "read" && <span className="mk mk--done" />}
            </span>
            <span className="fl__v">
              <b>{fact.value}</b>
            </span>
            {fact.ask && <span className="ask">{fact.ask}</span>}
            {fact.provenance && <span className="prov">{fact.provenance}</span>}
          </button>
          {/*
            The confirm control is a sibling of the tap target, not a child of
            it. Nesting one button inside another is invalid and, in practice,
            means "Yes, that is right" also opens the correction sheet: the
            member confirms and lands on a screen asking them to change it.
          */}
          {fact.tier === "inferred" && (
            <div className="conf">
              <button type="button" onClick={() => onConfirm(fact.field)}>
                Yes, that is right
              </button>
              <button type="button" onClick={() => onOpen(fact.field)}>
                Change it
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * What is preserved, as the R2's fourth element.
 *
 * Written as a function because the zero cases have to read like English. The
 * first version interpolated both counts unconditionally and produced "7 facts
 * are still needed, and 0 Ponte inferred rather than read", which is the sort
 * of sentence that tells a member the screen was assembled rather than written.
 */
function heldSentence(counts: FactCounts): string {
  if (counts.needed === 0 && counts.inferred === 0) {
    return "Every fact is stated. Nothing is inferred and nothing is guessed.";
  }
  const parts: string[] = [];
  if (counts.needed > 0) {
    parts.push(`${counts.needed} fact${counts.needed === 1 ? " is" : "s are"} still needed`);
  }
  if (counts.inferred > 0) {
    parts.push(
      `${counts.inferred} ${counts.inferred === 1 ? "was" : "were"} inferred rather than read`,
    );
  }
  return `${parts.join(", and ")}. They are marked below, and none of them stops you leaving this screen.`;
}

function tierClass(tier: Fact["tier"]): string {
  if (tier === "needed") return "need";
  if (tier === "inferred") return "inf";
  // Optional shares the quietest treatment with confirmed. It is not louder
  // than a stated fact: nothing is waiting on it.
  return "ok";
}
