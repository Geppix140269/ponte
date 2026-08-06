"use client";

import { useState } from "react";
import BridgeShell, { BridgeAction } from "./BridgeShell";
import BridgeCorrect from "./BridgeCorrect";
import type { Signal } from "../Chrome";
import type { RecordLine } from "@/lib/publish/record";
import {
  factsFor,
  countFacts,
  outstandingSentence,
  type Fact,
  type FactCounts,
  type InferredSet,
} from "@/lib/publish/facts";
import { subjectFor, type StructureDraft } from "@/lib/structure/draft";
import type { CompletionField } from "@/lib/structure/procedures/types";
import type { MarketFamily } from "@/lib/taxonomy/market";

/**
 * `B03`-`B05` The listing so far, on the bridge system. The most reused surface
 * in the product.
 *
 * ## Four rules, all structural rather than visual
 *
 * **One fact per line.** No two-column grids and no grouped forms. A member
 * correcting a quantity should not have to find it among four other controls.
 *
 * **Missing and uncertain rise above confirmed.** `factsFor` sorts; this
 * component renders the order it is given and does not re-sort. The order is the
 * work order, and a surface that reordered for visual balance would put the
 * member's next task below the fold.
 *
 * **Inferred is marked distinctly from read.** A dashed bronze underline on the
 * value, a stated provenance, and a confirm control that reads "Yes, that is
 * right". An inferred fact is Ponte's until the member says otherwise, and it
 * must never look like something they stated.
 *
 * **Correction in place, never a bare text field.** Tapping a fact opens a sheet
 * of rows. A bare field asks the member to know the vocabulary; a sheet of rows
 * tells them what the answers are.
 *
 * ## The state is a word, not a coloured dot
 *
 * `ADR-0002` requires that colour never carries meaning alone. The retired
 * surface satisfied that with an 18px drawn mark beside every row; here the mono
 * status word carries it, which is one fewer drawn shape to fence and needs no
 * legend.
 *
 * ## The report on first arrival
 *
 * Shown once, when the member arrives from `B02` with a structured record. It is
 * a stage-completion report and not a reward, and it gives way to the facts as
 * soon as anything is corrected: a recognition surface that outlives the moment
 * it recognises becomes furniture.
 */

export interface BridgeListingProps {
  draft: StructureDraft;
  onDraft: (draft: StructureDraft) => void;
  inferred: InferredSet;
  /** Confirming an inferred fact makes it the member's. */
  onConfirm: (field: CompletionField) => void;
  /** True on first arrival from `B02`. The report shows once. */
  justStructured: boolean;
  family: MarketFamily | null;
  signedIn: boolean;
  retention: string;
  ledger: readonly RecordLine[];
  signals: readonly Signal[];
  who?: string | null;
  onBack: () => void;
  onContinue: () => void;
}

export default function BridgeListing({
  draft,
  onDraft,
  inferred,
  onConfirm,
  justStructured,
  family,
  signedIn,
  retention,
  ledger,
  signals,
  who = null,
  onBack,
  onContinue,
}: BridgeListingProps) {
  const [correcting, setCorrecting] = useState<CompletionField | null>(null);
  const [reportOpen, setReportOpen] = useState(justStructured);

  const facts = factsFor(draft, inferred);
  const counts = countFacts(facts);
  const outstanding = outstandingSentence(draft);
  const subject = subjectFor(draft);

  function open(field: CompletionField) {
    setReportOpen(false);
    setCorrecting(field);
  }

  /*
    How far through this stage the record is. Settled facts over all of them,
    which is the honest measure: the deck reports what the member has done, and
    closing a gap is what they are doing here.
  */
  const total = facts.length || 1;
  const settled = facts.filter((fact) => fact.tier === "read").length;

  return (
    <BridgeShell
      screen="B03-B05"
      phase={counts.needed > 0 ? "gaps" : counts.inferred > 0 ? "inferred" : "all"}
      node="listing"
      family={family}
      signedIn={signedIn}
      progress={settled / total}
      question={subject ?? "The listing so far"}
      /*
        Not "The listing so far", which is what the cream ledger at the foot of
        every surface is already headed. Two headings four words apart from each
        other, on one screen, naming different things.
      */
      eyebrow="Facts on the record"
      note={countSentence(counts, draft.hsCode)}
      back={{ label: "Tell Ponte", onBack }}
      ledger={ledger}
      retention={retention}
      signals={signals}
      who={who}
      actions={<BridgeAction label="Continue to publication" sub={outstanding} onClick={onContinue} />}
    >
      {reportOpen && (
        <div className="brg-report">
          <div className="brg-eyebrow">Objective captured</div>
          <h2>Ponte has carried your objective forward without forcing a classification.</h2>
          <p>
            What you said is now a structured listing that a buyer can find. Nothing about it is
            published, and nothing has been shown to anyone.
          </p>
          <div className="brg-report__held">{heldSentence(counts)}</div>
          <div className="brg-report__next">
            <span className="brg-eyebrow">Next action</span>
            <b>Review the structured interpretation</b>
          </div>
          <div className="brg-report__meta">Owner: You</div>
        </div>
      )}

      <FactList facts={facts.filter((f) => f.tier === "needed")} onOpen={open} onConfirm={onConfirm} />

      {counts.inferred > 0 && (
        <>
          <div className="brg-group">Inferred, confirm or change</div>
          <FactList
            facts={facts.filter((f) => f.tier === "inferred")}
            onOpen={open}
            onConfirm={onConfirm}
          />
        </>
      )}

      {counts.confirmed > 0 && (
        <>
          <div className="brg-group">Read from what you gave Ponte</div>
          <FactList facts={facts.filter((f) => f.tier === "read")} onOpen={open} onConfirm={onConfirm} />
        </>
      )}

      {facts.some((f) => f.tier === "optional") && (
        <>
          <div className="brg-group">Optional, not stated</div>
          <FactList
            facts={facts.filter((f) => f.tier === "optional")}
            onOpen={open}
            onConfirm={onConfirm}
          />
        </>
      )}

      {correcting && (
        <BridgeCorrect
          field={correcting}
          draft={draft}
          onDraft={onDraft}
          onClose={() => setCorrecting(null)}
        />
      )}
    </BridgeShell>
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
    <>
      {facts.map((fact) => (
        <div key={fact.field}>
          <button
            className="brg-fact"
            type="button"
            data-tier={fact.tier}
            onClick={() => onOpen(fact.field)}
          >
            <span className="brg-fact__k">
              <b>{fact.label}</b>
              <span>{TIER_WORD[fact.tier]}</span>
            </span>
            <span className="brg-fact__v">{fact.value}</span>
            {fact.ask && <span className="brg-fact__note">{fact.ask}</span>}
            {fact.provenance && <span className="brg-fact__note">{fact.provenance}</span>}
          </button>
          {/*
            The confirm control is a SIBLING of the tap target, not a child of
            it. Nesting one button inside another is invalid and, in practice,
            means "Yes, that is right" also opens the correction sheet: the
            member confirms and lands on a screen asking them to change it.
          */}
          {fact.tier === "inferred" && (
            <div className="brg-confirm">
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
    </>
  );
}

/**
 * The state word for each tier.
 *
 * Read from one table so no surface writes its own. "Needed to publish" was
 * once printed over optional fields because the screen read the wrong set, and a
 * word that appears in two places will eventually disagree with itself.
 */
const TIER_WORD: Readonly<Record<Fact["tier"], string>> = {
  needed: "Needed to publish",
  inferred: "Inferred, not read",
  read: "Stated",
  optional: "Optional",
};

/** What is on the record, in one line beside the question. */
function countSentence(counts: FactCounts, hsCode: string | null | undefined): string {
  const parts: string[] = [];
  if (counts.needed > 0) parts.push(`${counts.needed} needed`);
  if (counts.inferred > 0) parts.push(`${counts.inferred} inferred`);
  parts.push(`${counts.confirmed} stated`);
  // The classification travels with the thing it classifies, never glued to a
  // value: it once printed as "On requestHS 271019", attached to the quantity.
  return hsCode ? `${parts.join(", ")}. HS ${hsCode}.` : `${parts.join(", ")}.`;
}

/**
 * What is preserved, as the report's fourth element.
 *
 * Written as a function because the zero cases have to read like English. The
 * first version interpolated both counts unconditionally and produced "7 facts
 * are still needed, and 0 Ponte inferred rather than read", which is the sort of
 * sentence that tells a member the screen was assembled rather than written.
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
