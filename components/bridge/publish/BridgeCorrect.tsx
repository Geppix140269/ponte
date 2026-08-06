"use client";

import { useState } from "react";
import {
  INCOTERM_GROUPS,
  PAYMENT_GROUPS,
  UNITS,
  FREQUENCIES,
  optionsOf,
  type TapGroup,
} from "@/lib/structure/vocabulary";
import { VALIDITY_DAYS } from "@/lib/publish/validity";
import { FIELD_LABEL } from "@/lib/publish/facts";
import type { StructureDraft } from "@/lib/structure/draft";
import type { CompletionField } from "@/lib/structure/procedures/types";

/**
 * Correction in place, on the bridge: a sheet of rows over the list, never a
 * bare field.
 *
 * ## Why a sheet and not an input
 *
 * A bare text field asks the member to already know the vocabulary. "Incoterms"
 * with a cursor in it is answerable only by someone who can spell DPU; a list of
 * eleven rules with what each one means is answerable by everyone, and it is the
 * same eleven values either way. Typing stays available inside the sheet for the
 * cases a list cannot cover, and is never the only route.
 *
 * ## Why the quantity gets a stepper
 *
 * Because a number is the one value a list cannot enumerate. The figure sits
 * between two 72px controls, and the mode is chosen from rows beneath it. The
 * defect this replaces displayed `draft.quantity ?? 10000`, so a member read
 * 10,000 as a value they had been given and the draft still held null.
 *
 * ## Nothing is committed on open
 *
 * The sheet writes on choice, not on mount. Opening a fact to look at it and
 * closing it again leaves the record exactly as it was, which is what "back
 * never loses work" means from the other direction: it must also never invent
 * work the member did not do.
 *
 * ## Why it is cream
 *
 * A second plane needs to read as a second plane, and the system has no shadow
 * and no rounded corner to do that with. Reversing the ground is the device the
 * ledger already uses, so the sheet declares `data-ground="cream"` and every
 * semantic token inside it resolves to its on-cream pair.
 */

export interface BridgeCorrectProps {
  field: CompletionField;
  draft: StructureDraft;
  onDraft: (draft: StructureDraft) => void;
  onClose: () => void;
}

/** The rows offered for a field, or null where the field is a number. */
function groupsFor(field: CompletionField): readonly TapGroup[] | null {
  switch (field) {
    case "incoterm":
      return INCOTERM_GROUPS;
    case "payment":
      return PAYMENT_GROUPS;
    case "validity":
      return [
        {
          label: null,
          options: [...VALIDITY_DAYS.map((days) => `${days} days`), "Open until withdrawn"],
        },
      ];
    default:
      return null;
  }
}

/** Read the field's current value back, so the chosen row shows as chosen. */
function currentValue(draft: StructureDraft, field: CompletionField): string | null {
  switch (field) {
    case "incoterm":
      return draft.incoterm;
    case "payment":
      return draft.payment;
    case "validity":
      if (draft.validity === "standing") return "Open until withdrawn";
      return typeof draft.validity === "number" ? `${draft.validity} days` : null;
    case "origin":
      return draft.origin;
    case "destination":
      return draft.destination;
    default:
      return null;
  }
}

/** Apply one chosen option. The ONLY place a correction writes to the draft. */
function withChoice(
  draft: StructureDraft,
  field: CompletionField,
  choice: string,
): StructureDraft {
  switch (field) {
    case "incoterm":
      return { ...draft, incoterm: choice };
    case "payment":
      return { ...draft, payment: choice };
    case "validity": {
      if (choice === "Open until withdrawn") return { ...draft, validity: "standing" };
      const days = Number.parseInt(choice, 10);
      return Number.isFinite(days) ? { ...draft, validity: days } : draft;
    }
    case "origin":
      return { ...draft, origin: choice };
    case "destination":
      return { ...draft, destination: choice };
    case "note":
      return { ...draft, note: choice };
    case "serviceScope":
      return { ...draft, serviceTerms: { ...draft.serviceTerms, scope: choice } };
    case "serviceCapability":
      return { ...draft, serviceTerms: { ...draft.serviceTerms, capability: choice } };
    case "servicePricingBasis":
      return { ...draft, serviceTerms: { ...draft.serviceTerms, pricingBasis: choice } };
    case "serviceAvailability":
      return { ...draft, serviceTerms: { ...draft.serviceTerms, availability: choice } };
    case "serviceEngagement":
      return { ...draft, serviceTerms: { ...draft.serviceTerms, engagement: choice } };
    case "serviceCoverage":
      return { ...draft, serviceTerms: { ...draft.serviceTerms, tradeLanes: choice } };
    case "distributionObjective":
      return { ...draft, distributionTerms: { ...draft.distributionTerms, objective: choice } };
    case "distributionProductScope":
      return { ...draft, distributionTerms: { ...draft.distributionTerms, productScope: choice } };
    case "distributionExpectations":
      return {
        ...draft,
        distributionTerms: { ...draft.distributionTerms, commercialExpectations: choice },
      };
    case "distributionTiming":
      return { ...draft, distributionTerms: { ...draft.distributionTerms, timing: choice } };
    default:
      return draft;
  }
}

export default function BridgeCorrect({ field, draft, onDraft, onClose }: BridgeCorrectProps) {
  const groups = groupsFor(field);
  const chosen = currentValue(draft, field);
  const [typed, setTyped] = useState("");
  const [amount, setAmount] = useState<number>(draft.quantity ?? 1);

  function choose(option: string) {
    onDraft(withChoice(draft, field, option));
    onClose();
  }

  return (
    <>
      {/*
        The scrim is a button rather than a div: dismissing a sheet by tapping
        outside it is a control, and a control a keyboard cannot reach is a trap
        for anyone who opened the sheet by pressing Enter on a fact.
      */}
      <button
        type="button"
        className="brg-scrim"
        aria-label={`Close ${FIELD_LABEL[field]}`}
        onClick={onClose}
      />
      <div className="brg-sheet" data-ground="cream" role="dialog" aria-label={FIELD_LABEL[field]}>
        <div className="brg-sheet__inner">
          <div className="brg-sheet__head">
            <b>{FIELD_LABEL[field]}</b>
            <button type="button" onClick={onClose}>
              Done
            </button>
          </div>

          {field === "quantity" && (
            <>
              <div className="brg-step">
                <button
                  type="button"
                  aria-label="Less"
                  onClick={() => setAmount((n) => Math.max(1, n - 1))}
                >
                  &minus;
                </button>
                <span>{amount}</span>
                <button type="button" aria-label="More" onClick={() => setAmount((n) => n + 1)}>
                  +
                </button>
              </div>
              {UNITS.flatMap((unit) =>
                FREQUENCIES.slice(0, 3).map((frequency) => (
                  <button
                    key={`${unit}-${frequency}`}
                    className="brg-item"
                    type="button"
                    onClick={() => {
                      onDraft({
                        ...draft,
                        quantityMode: "exact",
                        quantity: amount,
                        unit,
                        frequency,
                      });
                      onClose();
                    }}
                  >
                    <span className="brg-fact__v" style={{ marginBlockStart: 0 }}>
                      {unit} &middot; {frequency}
                    </span>
                  </button>
                )),
              )}
              {/*
                A quantity nobody has fixed is a commercial position, not an
                omission. Without this a member with no settled figure invents
                one to get past the screen, and the invented figure is what a
                counterparty then reads.
              */}
              <button
                className="brg-item"
                type="button"
                onClick={() => {
                  onDraft({ ...draft, quantityMode: "on_request", quantity: null, unit: null });
                  onClose();
                }}
              >
                <span className="brg-fact__v" style={{ marginBlockStart: 0 }}>
                  On request
                </span>
                <span className="brg-fact__note">
                  You have not fixed a figure. That is an answer.
                </span>
              </button>
            </>
          )}

          {groups && (
            <div className="brg-sheet__list">
              {groups.map((group, index) => (
                <div key={group.label ?? index}>
                  {group.label && <div className="brg-group">{group.label}</div>}
                  {group.options.map((option) => (
                    <button
                      key={option}
                      className="brg-item"
                      type="button"
                      aria-pressed={chosen === option}
                      data-chosen={chosen === option ? "true" : undefined}
                      onClick={() => choose(option)}
                    >
                      <span className="brg-fact__v" style={{ marginBlockStart: 0 }}>
                        {option}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/*
            Typing. Present for every field, LAST, and never the only route: a
            member whose answer is not on any list must still be able to give it,
            and a member whose answer IS on the list should never have to type it.
          */}
          {field !== "quantity" && (
            <label className="brg-field">
              <span>{groups ? "Or type a different answer" : "Type your answer"}</span>
              <input
                type="text"
                placeholder={groups ? "Or type a different answer" : "Type your answer"}
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && typed.trim() !== "") choose(typed.trim());
                }}
              />
            </label>
          )}
        </div>
      </div>
    </>
  );
}

/** Exported for the test that pins which fields a list can answer. */
export const LIST_ANSWERABLE: readonly CompletionField[] = (
  ["incoterm", "payment", "validity"] as const
).filter((field) => groupsFor(field) !== null);

export { optionsOf };
