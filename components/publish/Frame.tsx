"use client";

import type { ReactNode } from "react";
import { STAGES } from "@/lib/publish/steps";

/**
 * The frame every surface on the listing path renders inside.
 *
 * ## Why it is one component and not a pattern each screen repeats
 *
 * Because the progress rule, the back control and the retention footer are
 * PROMISES, not decoration. "One segmented progress rule, no numeral", "back
 * never loses work", and a retention sentence that is verbatim, are three rules
 * that were previously restated on every screen and were therefore wrong on
 * some of them. Here they are stated once and a surface cannot opt out of them
 * by forgetting.
 *
 * ## The acknowledgement
 *
 * `pending` replaces the step counter with a word for as long as a transition
 * is running. Every tap acknowledged inside 100ms: `P0-1` measured the funnel
 * CTA at 2,638ms of silence, and silence is indistinguishable from a control
 * that did not register the tap. The acknowledgement is not gold, deliberately:
 * gold means arrival at a completed state, and this is departure.
 */

export interface FrameProps {
  /** The design-reference identifier, on the DOM so evidence can name it. */
  screen: string;
  /** 1..5. Several surfaces share one; a stage is whole or it is not. */
  stage: number;
  /** The DESTINATION of the back control, or null where there is no way back. */
  back: string | null;
  onBack?: () => void;
  pending?: boolean;
  /** Extra state for evidence and for tests that read the rendered DOM. */
  phase?: string;
  children: ReactNode;
  /** The action band and the retention note. Rendered below the scroll. */
  footer?: ReactNode;
}

export default function Frame({
  screen,
  stage,
  back,
  onBack,
  pending = false,
  phase,
  children,
  footer,
}: FrameProps) {
  return (
    <div className="pb" data-screen={screen} {...(phase ? { "data-phase": phase } : {})}>
      <div className="pb__prog" role="img" aria-label={`Step ${stage} of ${STAGES}`}>
        {Array.from({ length: STAGES }, (_, index) => (
          <i key={index} {...(index < stage ? { "data-on": "" } : {})} />
        ))}
      </div>

      <div className="pb__nav">
        {back && onBack ? (
          <button className="pb__back" type="button" onClick={onBack}>
            <u>&#8249;</u>
            {back}
          </button>
        ) : (
          <span className="lab">Ponte</span>
        )}
        <span className="step">
          {pending ? <span className="pending">Opening</span> : `Step ${stage} of ${STAGES}`}
        </span>
      </div>

      <div className="pb__c">{children}</div>

      {footer ? <div className="pb__f">{footer}</div> : null}
    </div>
  );
}

/**
 * The one primary action per screen.
 *
 * `sub` carries WHY it is unavailable when it is unavailable. A disabled
 * control with no explanation is the commonest way a member gets stuck: they
 * can see the way forward and cannot tell what is holding it.
 */
export function Action({
  label,
  sub,
  disabled = false,
  onClick,
}: {
  label: string;
  sub?: string | null;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className="act"
      type="button"
      {...(disabled ? { "aria-disabled": "true" } : {})}
      onClick={disabled ? undefined : onClick}
    >
      {label}
      {sub ? <small>{sub}</small> : null}
    </button>
  );
}

/** The secondary way out. Never styled to compete with the primary action. */
export function Secondary({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button className="snd" type="button" onClick={onClick}>
      {label}
    </button>
  );
}

/** The retention promise. Verbatim, and the only thing in the footer note. */
export function Retention({ sentence }: { sentence: string }) {
  return <p className="note">{sentence}</p>;
}
