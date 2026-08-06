"use client";

import { useState } from "react";
import BridgeShell, { BridgeAction } from "./BridgeShell";
import type { Signal } from "../Chrome";
import type { RecordLine } from "@/lib/publish/record";
import {
  CAPACITIES,
  CHAIN_DEPTHS,
  capacity,
  capacityComplete,
  capacityOutstanding,
  emptyCapacity,
  suggestionFrom,
  type CapacityAnswer,
  type CapacityKey,
} from "@/lib/publish/capacity";
import type { MarketFamily } from "@/lib/taxonomy/market";

/**
 * `B01b` Capacity declaration, on the bridge system.
 *
 * ## The two rules this surface exists to hold
 *
 * **A previous answer is a suggestion, never a pre-selection.** The suggestion
 * sits above the list and the list starts with nothing chosen. Both halves
 * matter: showing the previous answer AND pre-selecting it is a pre-selection
 * with extra steps, and a member who continues without reading is then
 * publishing a capacity they did not declare on this opportunity.
 *
 * **Intermediary status is public, and Ponte says so where it is declared.**
 * Not on a later screen and not in a help page. The statement is on every state,
 * and once "Broker or intermediary" is chosen it names it.
 *
 * ## What is asked, and only what is asked
 *
 * A representative names the company and asserts authority. A broker states how
 * far they sit from the principal, because `meetsApprovalMinimum` requires
 * `chain_depth` from them and a member should learn that here rather than after
 * a refused publication. A principal is asked neither.
 *
 * ## Where the selection is drawn
 *
 * The indent and the lit leading hairline, which is the system's whole
 * selection vocabulary. No box, no tick, no outline: `ADR-0002`, unchanged by
 * `ADR-0032`.
 */

export interface BridgeCapacityProps {
  answer: CapacityAnswer;
  onChange: (answer: CapacityAnswer) => void;
  onContinue: () => void;
  onBack: () => void;
  /** The `submitter_role` from this member's last listing, if any. */
  previousRole?: string | null;
  family: MarketFamily | null;
  signedIn: boolean;
  retention: string;
  ledger: readonly RecordLine[];
  signals: readonly Signal[];
  who?: string | null;
}

export default function BridgeCapacity({
  answer,
  onChange,
  onContinue,
  onBack,
  previousRole = null,
  family,
  signedIn,
  retention,
  ledger,
  signals,
  who = null,
}: BridgeCapacityProps) {
  /*
    The suggestion is dismissed by answering it either way. Component state
    rather than draft state, because declining a suggestion is not a fact about
    the listing: a member who says "not this time" has recorded nothing, and a
    persisted "dismissed" flag would be a value nobody chose.
  */
  const [suggestionOpen, setSuggestionOpen] = useState(true);
  const suggestion = suggestionFrom(previousRole);
  const chosen = capacity(answer.key);
  const complete = capacityComplete(answer);
  const outstanding = capacityOutstanding(answer);

  function choose(key: CapacityKey) {
    // Changing capacity clears what the previous one required. An authority
    // declaration left behind by a capacity the member abandoned is a claim
    // about a company they are no longer saying they act for.
    onChange({ ...emptyCapacity(), key });
  }

  return (
    <BridgeShell
      screen="B01b"
      phase={chosen ? chosen.key : "empty"}
      node="capacity"
      family={family}
      signedIn={signedIn}
      progress={complete ? 1 : 0}
      question="For this opportunity, I am acting as"
      accent="acting as"
      eyebrow="Who you are on this deal"
      /*
        NOT the public statement, which is at the foot of the list.

        It was here as well, and the screen said the same thing twice, once at
        the top and once at the bottom, in slightly different words. The
        statement at the foot is the load-bearing one because it names the
        capacity once one is chosen, so this note carries the OTHER thing a
        member needs to know: that this is a question about them.
      */
      note="A statement about you, not about the goods. It is asked once for each listing, and it does not carry over from the last one."
      back={{ label: "Deal intent", onBack }}
      ledger={ledger}
      retention={retention}
      signals={signals}
      who={who}
      actions={
        <BridgeAction
          label="Continue"
          sub={outstanding}
          disabled={!complete}
          onClick={onContinue}
        />
      }
    >
      {suggestion && suggestionOpen && (
        <div className="brg-report__held" style={{ marginBlockEnd: 26 }}>
          <div className="brg-eyebrow">On your last listing</div>
          <p style={{ marginBlockStart: 8, fontFamily: "var(--brg-serif)", fontSize: 20 }}>
            {suggestion.capacity.label}
          </p>
          <p className="brg-note">{suggestion.disclaimer}</p>
          <div style={{ display: "flex", gap: 26 }}>
            <button
              className="brg-snd"
              type="button"
              onClick={() => {
                setSuggestionOpen(false);
                choose(suggestion.capacity.key);
              }}
            >
              Yes, again
            </button>
            <button className="brg-snd" type="button" onClick={() => setSuggestionOpen(false)}>
              Not this time
            </button>
          </div>
        </div>
      )}

      {CAPACITIES.map((option, index) => (
        <button
          key={option.key}
          className="brg-zone"
          type="button"
          aria-pressed={answer.key === option.key}
          data-chosen={answer.key === option.key ? "true" : undefined}
          onClick={() => choose(option.key)}
        >
          <span className="brg-zone__index">{String(index + 1).padStart(2, "0")}</span>
          <span className="brg-zone__title">{option.label}</span>
          <span className="brg-zone__detail">{option.detail}</span>
        </button>
      ))}

      {chosen?.requiresAuthority && (
        <>
          <div className="brg-group">Authority declaration</div>
          <p className="brg-note">
            Name the company you act for, and confirm you hold its authority to offer on its
            behalf.
          </p>
          <label className="brg-field">
            <span>Company you represent</span>
            <input
              type="text"
              placeholder="Company you represent"
              value={answer.authority.company}
              onChange={(event) =>
                onChange({
                  ...answer,
                  authority: { ...answer.authority, company: event.target.value },
                })
              }
            />
          </label>
          {/*
            A button rather than a checkbox input with a styled sibling: the
            declaration is the sentence, and the mark reports it. `aria-pressed`
            is what a screen reader reads, so the state is never carried by the
            fill alone.
          */}
          <button
            className="brg-check"
            type="button"
            aria-pressed={answer.authority.held}
            onClick={() =>
              onChange({
                ...answer,
                authority: { ...answer.authority, held: !answer.authority.held },
              })
            }
          >
            <i aria-hidden="true" />
            <span>
              I hold written authority from this company to offer on its behalf, and I will
              provide it if asked.
            </span>
          </button>
        </>
      )}

      {chosen?.requiresChainDepth && (
        <>
          <div className="brg-group">How far from the principal</div>
          {CHAIN_DEPTHS.map((depth, index) => (
            <button
              key={depth.key}
              className="brg-zone"
              type="button"
              aria-pressed={answer.chainDepthKey === depth.key}
              data-chosen={answer.chainDepthKey === depth.key ? "true" : undefined}
              onClick={() => onChange({ ...answer, chainDepthKey: depth.key })}
            >
              <span className="brg-zone__index">{String(index + 1).padStart(2, "0")}</span>
              <span className="brg-zone__title">{depth.label}</span>
              <span className="brg-zone__detail">{depth.detail}</span>
            </button>
          ))}
        </>
      )}

      {/*
        The public statement. Present in every state, and specific once a
        capacity is chosen: a general "capacity is public" is easy to read past,
        and the member who most needs to have read it is the broker.
      */}
      <div className="brg-report__held" style={{ marginBlockStart: 34 }}>
        {chosen ? (
          <>
            <b>&ldquo;{chosen.label}&rdquo; will appear on this listing.</b> Publicly, before
            anyone contacts you. Ponte does not hide intermediary status and does not let you
            either.
          </>
        ) : (
          <>
            <b>Your capacity is public.</b> It appears on the listing in all three families,
            before anyone contacts you. Buyers filter on it.
          </>
        )}
      </div>
    </BridgeShell>
  );
}
