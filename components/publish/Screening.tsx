"use client";

import Frame, { Action, Secondary } from "./Frame";
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

/**
 * `B09s` Screening.
 *
 * Specification: `docs/ponte/design-reference/ponte-set2-screens.js`, surface 6,
 * five states.
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
 * state of this surface, not on one of them. Three green marks with nothing
 * beside them read as a clean bill of health on the counterparty; what they
 * actually mean is that this submission's own fields are complete and matched
 * nothing on two lists.
 *
 * The word is `Checked`. `VERDICT_LABEL` owns it and
 * `FORBIDDEN_VERDICT_WORDS` is held against this file by test, because the
 * failure mode is a surface writing its own status string on a Tuesday.
 */

export interface ScreeningProps {
  checks: readonly ScreeningCheck[];
  onBack: () => void;
  onPublish: () => void;
  onRetry: () => void;
}

export default function Screening({ checks, onBack, onPublish, onRetry }: ScreeningProps) {
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

  return (
    <Frame
      screen="B09s"
      stage={5}
      back="Preview"
      onBack={onBack}
      pending={!settled}
      phase={phase}
      footer={
        clear ? (
          <Action label="Publish" sub="Public and free. Anyone can find it." onClick={onPublish} />
        ) : refused ? (
          <Secondary label="Keep it as a private draft" onClick={onBack} />
        ) : failed ? (
          <>
            <Action
              label="Run the checks again"
              sub="Starts from the ones that did not run"
              onClick={onRetry}
            />
            <Secondary label="Go back to the preview" onClick={onBack} />
          </>
        ) : attention ? (
          <>
            {/*
              "Choose one to continue" was here, and there was nothing to
              choose: the finding was a refusal with a stated reason and the
              only way on is to change the record. The disabled action now
              carries the reason, which is the one thing the member needs.
            */}
            <Action
              label="Publish"
              sub={checks.find((c) => c.verdict === "attention")?.finding ?? "One thing needs you first"}
              disabled
            />
            <Secondary label="Go back and change it" onClick={onBack} />
          </>
        ) : (
          <>
            <Action label="Checking…" sub="Nothing is public yet" disabled />
            <Secondary label="Cancel and go back" onClick={onBack} />
          </>
        )
      }
    >
      <div className="pb__pad" style={{ paddingBottom: 12 }}>
        <span className="lab">
          {clear ? `${checkedCount(checks)} · completed` : "Seconds, not days"}
        </span>
        <h1 className="stmt stmt--2" style={{ marginTop: 12 }}>
          {refused
            ? "Ponte cannot publish this listing."
            : attention
              ? "One thing needs you before this can publish."
              : failed
                ? "The checks did not finish."
                : clear
                  ? "Checked."
                  : "Checking your submission."}
        </h1>
      </div>

      {!settled && (
        <>
          <div className="pb__pad" style={{ padding: "0 20px 14px" }}>
            <p className="prose">Automated. Nobody is queued to look at this.</p>
          </div>
          <div className="ind" aria-hidden="true">
            <i />
          </div>
        </>
      )}

      {failed && (
        <div className="pb__pad" style={{ padding: "0 20px 14px" }}>
          <p className="prose">
            A service failure, not a finding. Ponte does not publish on an incomplete check, so
            your listing stayed where it was.
          </p>
        </div>
      )}

      {attention && (
        <div className="pb__pad" style={{ padding: "0 20px 14px" }}>
          <p className="prose">
            The checks that had not started did not run, because there is no point running them
            against a submission that will be refused. Nothing was published, so nothing needs
            withdrawing.
          </p>
        </div>
      )}

      <div className="scr">
        {CHECK_ORDER.map((key) => {
          const check = checks.find((c) => c.key === key);
          const verdict = check?.verdict ?? "waiting";
          return (
            <div className="scr__i" key={key}>
              <span className={`mk mk--${markFor(verdict)}`} />
              <span>
                <b>{CHECK_LABELS[key]}</b>
                {check?.finding && <small>{check.finding}</small>}
              </span>
              <span className={`st ${statusClass(verdict)}`}>{VERDICT_LABEL[verdict]}</span>
            </div>
          );
        })}
      </div>

      {/*
        The perimeter. On every state of this surface, without exception. The
        heading and the body must stay together: the heading alone is a boast,
        and the body alone reads as a disclaimer nobody attached to anything.
      */}
      <div className="perim">
        <p>
          <b>{PERIMETER_HEADING}</b> {PERIMETER}
        </p>
      </div>
    </Frame>
  );
}

function markFor(verdict: ScreeningCheck["verdict"]): string {
  if (verdict === "checked") return "done";
  if (verdict === "refused" || verdict === "not_run") return "blocked";
  if (verdict === "attention") return "need";
  return "inferred";
}

function statusClass(verdict: ScreeningCheck["verdict"]): string {
  if (verdict === "checked") return "ok";
  if (verdict === "refused" || verdict === "not_run") return "no";
  return "run";
}
