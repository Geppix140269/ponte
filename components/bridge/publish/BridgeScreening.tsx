"use client";

import BridgeShell, { BridgeAction, BridgeSecondary } from "./BridgeShell";
import type { Signal } from "../Chrome";
import type { RecordLine } from "@/lib/publish/record";
import {
  CHECK_ORDER,
  CHECK_LABELS,
  VERDICT_LABEL,
  PERIMETER,
  PERIMETER_HEADING,
  checkedCount,
  mayPublish,
  screeningSettled,
  type ScreeningCheck,
} from "@/lib/publish/screening";
import type { MarketFamily } from "@/lib/taxonomy/market";

/**
 * `B09s` Screening, on the bridge system.
 *
 * ## Two things the language must never do
 *
 * **Never say a person is looking at this.** Publication is automated
 * (`ADR-0013`); no one is queued to read an ordinary submission, and `P1-1`
 * removed the universal-review promise from the rest of the site. "Automated.
 * Nobody is queued to look at this." is on the running state for that reason.
 * The one place a person IS involved is a refusal the member disputes, and that
 * state says so explicitly.
 *
 * **Never imply the checks are exhaustive.** `PERIMETER` is rendered on every
 * state of this surface, not on one of them. Three passing checks with nothing
 * beside them read as a clean bill of health on the counterparty; what they
 * actually mean is that this submission's own fields are complete and matched
 * nothing on two lists.
 *
 * The word is `Checked`. `VERDICT_LABEL` owns it and `FORBIDDEN_VERDICT_WORDS`
 * is held against this file by test, because the failure mode is a surface
 * writing its own status string on a Tuesday.
 */

export interface BridgeScreeningProps {
  checks: readonly ScreeningCheck[];
  family: MarketFamily | null;
  signedIn: boolean;
  ledger: readonly RecordLine[];
  signals: readonly Signal[];
  who?: string | null;
  onBack: () => void;
  onPublish: () => void;
  onRetry: () => void;
}

export default function BridgeScreening({
  checks,
  family,
  signedIn,
  ledger,
  signals,
  who = null,
  onBack,
  onPublish,
  onRetry,
}: BridgeScreeningProps) {
  const settled = screeningSettled(checks);
  const clear = mayPublish(checks);
  const refused = checks.some((check) => check.verdict === "refused");
  const attention = checks.some((check) => check.verdict === "attention");
  /*
    A FINDING outranks an unrun check, and this order is the fix for a real
    defect. When the submit route refused a listing for a stated reason, the
    other two checks were correctly marked `not_run`: and `failed` was tested
    first, so the surface printed "The checks did not finish. A service failure,
    not a finding" directly above the finding itself, in the same list.

    A member reading that is told to retry a request that will be refused again
    for a reason the screen is simultaneously showing them. `attention` has to
    win: the checks not running is a CONSEQUENCE of the finding, not a separate
    failure.
  */
  const failed = !attention && !refused && checks.some((check) => check.verdict === "not_run");

  const phase = refused
    ? "refused"
    : attention
      ? "attention"
      : failed
        ? "error"
        : clear
          ? "checked"
          : "running";

  const question = refused
    ? "Ponte cannot publish this listing."
    : attention
      ? "One thing needs you before this can publish."
      : failed
        ? "The checks did not finish."
        : clear
          ? "Checked."
          : "Checking your submission.";

  const note = failed
    ? "A service failure, not a finding. Ponte does not publish on an incomplete check, so your listing stayed where it was."
    : attention
      ? "The checks that had not started did not run, because there is no point running them against a submission that will be refused. Nothing was published, so nothing needs withdrawing."
      : settled
        ? "Nothing else is waiting on you."
        : "Automated. Nobody is queued to look at this.";

  return (
    <BridgeShell
      screen="B09s"
      phase={phase}
      node="screening"
      family={family}
      signedIn={signedIn}
      progress={settled ? 0.7 : 0.3}
      question={question}
      eyebrow={clear ? `${checkedCount(checks)} completed` : "Seconds, not days"}
      note={note}
      back={{ label: "Preview", onBack }}
      ledger={ledger}
      signals={signals}
      who={who}
      actions={
        clear ? (
          <BridgeAction
            label="Publish"
            sub="Public and free. Anyone can find it."
            onClick={onPublish}
          />
        ) : refused ? (
          <BridgeSecondary label="Keep it as a private draft" onClick={onBack} />
        ) : failed ? (
          <>
            <BridgeAction
              label="Run the checks again"
              sub="Starts from the ones that did not run"
              onClick={onRetry}
            />
            <BridgeSecondary label="Go back to the preview" onClick={onBack} />
          </>
        ) : attention ? (
          <>
            {/*
              "Choose one to continue" was here, and there was nothing to
              choose: the finding was a refusal with a stated reason and the
              only way on is to change the record. The unavailable action now
              carries the reason, which is the one thing the member needs.
            */}
            <BridgeAction
              label="Publish"
              sub={
                checks.find((c) => c.verdict === "attention")?.finding ??
                "One thing needs you first"
              }
              disabled
            />
            <BridgeSecondary label="Go back and change it" onClick={onBack} />
          </>
        ) : (
          <>
            <BridgeAction label="Checking" sub="Nothing is public yet" disabled />
            <BridgeSecondary label="Cancel and go back" onClick={onBack} />
          </>
        )
      }
    >
      {!settled && (
        <div className="brg-running" aria-hidden="true">
          <i />
        </div>
      )}

      {CHECK_ORDER.map((key) => {
        const check = checks.find((c) => c.key === key);
        const verdict = check?.verdict ?? "waiting";
        return (
          <div className="brg-row" key={key}>
            <span className="brg-row__label">
              {CHECK_LABELS[key]}
              {check?.finding && <small>{check.finding}</small>}
            </span>
            <span className="brg-row__value" data-state={stateOf(verdict)}>
              {VERDICT_LABEL[verdict]}
            </span>
          </div>
        );
      })}

      {/*
        The perimeter. On every state of this surface, without exception. The
        heading and the body must stay together: the heading alone is a boast,
        and the body alone reads as a disclaimer nobody attached to anything.
      */}
      <div className="brg-perimeter">
        <b>{PERIMETER_HEADING}</b> {PERIMETER}
      </div>
    </BridgeShell>
  );
}

/**
 * The tone a verdict is drawn in.
 *
 * The WORD carries the meaning; this only tints it. `ADR-0002` requires that
 * colour never carries meaning alone, and `VERDICT_LABEL` is what a member
 * reads.
 */
function stateOf(verdict: ScreeningCheck["verdict"]): string {
  if (verdict === "checked") return "checked";
  if (verdict === "refused" || verdict === "not_run") return "unproved";
  return "waiting";
}
