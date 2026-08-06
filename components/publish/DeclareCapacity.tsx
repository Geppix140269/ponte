"use client";

import { useState, useTransition } from "react";
import Frame, { Action, Retention } from "./Frame";
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

/**
 * `B01b` Capacity declaration.
 *
 * Specification: `docs/ponte/design-reference/ponte-set2-screens.js`, surface 2,
 * six states. Copy verbatim; delivery rewritten for the app.
 *
 * ## The two rules this surface exists to hold
 *
 * **A previous answer is a suggestion, never a pre-selection.** The suggestion
 * band renders above the list and the list starts with nothing chosen. Both
 * halves matter: showing the previous answer AND pre-selecting it would be a
 * pre-selection with extra steps, and a member who continues without reading is
 * then publishing a capacity they did not declare on this opportunity.
 *
 * **Intermediary status is public, and Ponte says so where it is declared.**
 * Not on a later screen, not in a help page. The note sits under the list on
 * every state, and when "Broker or intermediary" is chosen the note names it.
 *
 * ## What is asked, and only what is asked
 *
 * A representative names the company and asserts authority. A broker states how
 * far they sit from the principal, because `meetsApprovalMinimum` requires
 * `chain_depth` from them and a member should learn that here rather than after
 * a refused publication. A principal is asked neither: the distance from
 * themselves is not a question, and there is no third party to name.
 */

export interface DeclareCapacityProps {
  answer: CapacityAnswer;
  onChange: (answer: CapacityAnswer) => void;
  onContinue: () => void;
  onBack: () => void;
  /** The `submitter_role` from this member's last listing, if any. */
  previousRole?: string | null;
  retention: string;
}

export default function DeclareCapacity({
  answer,
  onChange,
  onContinue,
  onBack,
  previousRole = null,
  retention,
}: DeclareCapacityProps) {
  const [pending, startTransition] = useTransition();
  /*
    The suggestion is dismissed by answering it either way. It is component
    state rather than draft state because declining a suggestion is not a fact
    about the listing: a member who says "not this time" has recorded nothing,
    and a persisted "dismissed" flag would be a value nobody chose.
  */
  const [suggestionOpen, setSuggestionOpen] = useState(true);
  const suggestion = suggestionFrom(previousRole);
  const chosen = capacity(answer.key);
  const complete = capacityComplete(answer);
  const outstanding = capacityOutstanding(answer);

  function choose(key: CapacityKey) {
    startTransition(() => {
      // Changing capacity clears what the previous one required. An authority
      // declaration left behind by a capacity the member abandoned is a claim
      // about a company they are no longer saying they act for.
      onChange({ ...emptyCapacity(), key });
    });
  }

  return (
    <Frame
      screen="B01b"
      stage={1}
      back="Deal intent"
      onBack={onBack}
      pending={pending}
      phase={chosen ? chosen.key : "empty"}
      footer={
        <>
          <Action
            label="Continue"
            sub={outstanding}
            disabled={!complete}
            onClick={onContinue}
          />
          <Retention sentence={retention} />
        </>
      }
    >
      {suggestion && suggestionOpen && (
        <div className="sug">
          <span className="lab">On your last listing</span>
          <b>{suggestion.capacity.label}</b>
          <p>{suggestion.disclaimer}</p>
          <div className="acts">
            <button
              type="button"
              onClick={() => {
                setSuggestionOpen(false);
                choose(suggestion.capacity.key);
              }}
            >
              Yes, again
            </button>
            <button type="button" onClick={() => setSuggestionOpen(false)}>
              Not this time
            </button>
          </div>
        </div>
      )}

      <div className="pb__pad" style={{ paddingBottom: 12 }}>
        <h1 className="stmt stmt--2">For this opportunity, I am acting as&hellip;</h1>
      </div>

      <div className="rows">
        {CAPACITIES.map((option) => (
          <button
            key={option.key}
            className="row"
            type="button"
            aria-pressed={answer.key === option.key}
            onClick={() => choose(option.key)}
          >
            <span className={`mk${answer.key === option.key ? " mk--done" : ""}`} />
            <span>
              <b>{option.label}</b>
              <small>{option.detail}</small>
            </span>
            <span className="go">{answer.key === option.key ? "" : "›"}</span>
          </button>
        ))}
      </div>

      {chosen?.requiresAuthority && (
        <div className="auth">
          <span className="lab">
            <span className="mk mk--need" style={{ verticalAlign: -3, marginInlineEnd: 7 }} />
            Authority declaration
          </span>
          <p>
            Name the company you act for, and confirm you hold its authority to offer on its
            behalf.
          </p>
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
          <label className={answer.authority.held ? "on" : undefined}>
            <i className="mk--tick" aria-hidden="true" />
            <input
              type="checkbox"
              checked={answer.authority.held}
              onChange={(event) =>
                onChange({
                  ...answer,
                  authority: { ...answer.authority, held: event.target.checked },
                })
              }
            />
            <span>
              I hold written authority from this company to offer on its behalf, and I will
              provide it if asked.
            </span>
          </label>
        </div>
      )}

      {chosen?.requiresChainDepth && (
        <>
          <div className="grp">How far from the principal</div>
          <div className="rows">
            {CHAIN_DEPTHS.map((depth) => (
              <button
                key={depth.key}
                className="row"
                type="button"
                aria-pressed={answer.chainDepthKey === depth.key}
                onClick={() => onChange({ ...answer, chainDepthKey: depth.key })}
              >
                <span className={`mk${answer.chainDepthKey === depth.key ? " mk--done" : ""}`} />
                <span>
                  <b>{depth.label}</b>
                  <small>{depth.detail}</small>
                </span>
                <span className="go">{answer.chainDepthKey === depth.key ? "" : "›"}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/*
        The public note. Present in every state, and specific once a capacity is
        chosen: a general statement that "capacity is public" is easy to read
        past, and the member who most needs to have read it is the broker.
      */}
      <div className="lay__h" style={{ borderBlockStart: "1px solid var(--rule)", paddingBlock: 18 }}>
        <span className="mk mk--pub" />
        {chosen ? (
          <span>
            <b>&ldquo;{chosen.label}&rdquo; will appear on this listing.</b>
            <span>
              Publicly, before anyone contacts you. Ponte does not hide intermediary status and
              does not let you either.
            </span>
          </span>
        ) : (
          <span>
            <b>Your capacity is public.</b>
            <span>
              It appears on the listing in all three families, before anyone contacts you. Buyers
              filter on it.
            </span>
          </span>
        )}
      </div>
    </Frame>
  );
}
