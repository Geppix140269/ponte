"use client";

import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";

/**
 * The one labelled Back control for every Ponte journey.
 *
 * The brief is explicit: a back affordance must carry a visible text label and
 * must never be an isolated arrow icon. Two composers shipped an icon-only
 * chevron with only an aria-label, which is exactly what this replaces. The
 * chevron survives as an optional, decorative CSS mark (`.pjb__mark`) that never
 * appears without the word beside it, so a sighted user reads the label and a
 * screen-reader user hears it too.
 *
 * There is deliberately no SVG here. The Ponte Flow icon registry has no
 * back/arrow key, and the Constitution treats a missing icon as a gap to
 * escalate rather than a licence to hand-draw one; the mark is a rotated CSS
 * border instead.
 *
 * The `label` is required and passed in, following the same t-as-prop contract
 * as the rest of the journey (ClassifyStep and every step component), so the
 * control is testable through the project renderer and the caller can name the
 * destination ("Back to Market Signals") rather than settling for a bare "Back".
 *
 * Two shapes, one label contract:
 *   - `onClick` for a logical previous STEP inside a composer (a button that
 *     never leaves the page and never touches browser history).
 *   - `href` for a previous PAGE (a real link, correct for middle-click and
 *     right-click, routed through the locale-aware Link).
 * Exactly one must be given.
 */

type CommonProps = {
  /** The visible text. Name the destination where you can. */
  label: string;
  className?: string;
  /** Hide the decorative chevron mark where the surface does not want it. */
  showMark?: boolean;
};

type ButtonBack = CommonProps & {
  onClick: () => void;
  href?: never;
};

type LinkBack = CommonProps & {
  href: ComponentProps<typeof Link>["href"];
  onClick?: never;
};

export type JourneyBackProps = ButtonBack | LinkBack;

export default function JourneyBack(props: JourneyBackProps) {
  const className = props.className ? `pjb ${props.className}` : "pjb";
  const mark = props.showMark === false ? null : <span className="pjb__mark" aria-hidden="true" />;

  if ("href" in props && props.href !== undefined) {
    return (
      <Link className={className} href={props.href}>
        {mark}
        {props.label}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={props.onClick}>
      {mark}
      {props.label}
    </button>
  );
}
