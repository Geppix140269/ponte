"use client";

import type { ReactNode } from "react";
import Arc from "../Arc";
import Chrome, { primaryNav, type Signal } from "../Chrome";
import Footer from "../Footer";
import Grain from "../Grain";
import { STAGES, arcPosition, type PublishNode } from "@/lib/publish/steps";
import type { RecordLine } from "@/lib/publish/record";
import type { MarketFamily } from "@/lib/taxonomy/market";

/**
 * The shell every surface of the listing path renders inside, on the bridge.
 *
 * ## Why this is one component and not a pattern nine screens repeat
 *
 * The same reason `components/publish/Frame.tsx` existed before it: the arc, the
 * back control, the record and the retention promise are PROMISES, not
 * decoration. Stated once, a surface cannot opt out of one by forgetting it.
 *
 * What changed on the bridge is what a promise looks like. The segmented rule
 * with its "Step 3 of 5" is gone, because `ADR-0032` gives the arc that job and
 * puts no numeral in a progress role anywhere near it.
 *
 * ## Where the arc's position comes from
 *
 * `arcPosition` in `lib/publish/steps.ts`, which reads the path this member is
 * actually walking. Not from a number typed into each surface: `B06` is skipped
 * for a service and `B08` for a signed-in member, so a hard-coded fraction would
 * be wrong for most members most of the time.
 *
 * `ADR-0032-AMENDMENT-2` entry 2: the deck moves continuously through a stage,
 * the nodes still light on whole stages.
 *
 * ## Two shells, one content
 *
 * Above 900px the question and the standing note sit either side of the band.
 * Below it the same content stacks. Neither is the other stretched, and neither
 * is chosen by reading `window.innerWidth`: the CSS decides, and the arc decides
 * its own metrics from its own measured width.
 */

export interface BridgeShellProps {
  /** The design-reference identifier, on the DOM so evidence can name it. */
  screen: string;
  /** Extra state for evidence and for tests that read the rendered DOM. */
  phase?: string;
  /** Which surface this is. The arc's position is derived from it. */
  node: PublishNode;
  family: MarketFamily | null;
  signedIn: boolean;
  /** This surface's own progress, 0 to 1, scaled into its share of the stage. */
  progress?: number;

  /** The question, split: the lead, then the bronze italic accent. */
  question: string;
  /**
   * The accent, as a SEPARATE VALUE rather than markup inside the copy.
   *
   * `ADR-0032-AMENDMENT-2` entry 1. An `<em>` welded into an English sentence
   * cannot land correctly in a script with different word order, so the
   * component composes the emphasis and the translator translates language.
   */
  accent?: string | null;

  /** The standing note beside the question: what is true right now. */
  eyebrow?: string;
  note?: string;

  back?: { label: string; onBack: () => void } | null;
  children: ReactNode;

  /** The member's record, growing. Rendered as the reversed cream ledger. */
  ledger?: readonly RecordLine[];
  /** The retention promise, verbatim, under the ledger. */
  retention?: string | null;

  /** The one primary action, and any way out. Above the ledger. */
  actions?: ReactNode;

  signals: readonly Signal[];
  who?: string | null;
}

export default function BridgeShell({
  screen,
  phase,
  node,
  family,
  signedIn,
  progress = 0,
  question,
  accent = null,
  eyebrow,
  note,
  back = null,
  children,
  ledger = [],
  retention = null,
  actions,
  signals,
  who = null,
}: BridgeShellProps) {
  const { current, within } = arcPosition(node, { family, signedIn }, progress);

  return (
    <div className="brg" data-screen={screen} {...(phase ? { "data-phase": phase } : {})}>
      <Grain />
      <Chrome signals={signals} who={who} nav={primaryNav(who)} />

      <div className="brg-mx brg-band">
        <div className="brg-band__head">
          <h1 className="brg-question">
            {accent ? question.slice(0, question.length - accent.length) : question}
            {accent && <em>{accent}</em>}
          </h1>
          {(eyebrow || note) && (
            <div className="brg-band__now">
              {eyebrow && <div className="brg-eyebrow">{eyebrow}</div>}
              {note && (
                <p className="brg-note" style={{ marginBlockStart: 10 }}>
                  {note}
                </p>
              )}
            </div>
          )}
        </div>

        {/* The only progress indicator on the path. Nothing on it is clickable. */}
        <Arc size="hero" total={STAGES} current={current} within={within} />

        {back && (
          <button
            className="brg-back"
            type="button"
            onClick={back.onBack}
            style={{ marginBlockStart: 8 }}
          >
            <u aria-hidden="true">&#8249;</u>
            {back.label}
          </button>
        )}
      </div>

      <div className="brg-mx">
        <div className="brg-column" style={{ marginBlockStart: 8 }}>
          {children}
          {actions && <div className="brg-actions">{actions}</div>}
        </div>
      </div>

      {/*
        The record. Reversed cream, and it grows as they answer: this is the
        thing a member would be walking away from, which is why it is on screen
        from the first answer rather than at the end.
      */}
      {(ledger.length > 0 || retention) && (
        <div className="brg-ledger" data-ground="cream" style={{ marginBlockStart: 44 }}>
          <div className="brg-ledger__inner">
            {/* The same measure as the surface above it, so the record reads
                as one column with the questions rather than as a wide table. */}
            <div className="brg-column">
              {ledger.length > 0 && (
                <>
                  <div className="brg-eyebrow">Your listing so far</div>
                  <dl style={{ marginBlockStart: 14 }}>
                    {ledger.map((line) => (
                      <div className="brg-ledger__line" key={line.key}>
                        <dt>{line.label}</dt>
                        <dd>{line.value}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
              {retention && (
                <p className="brg-note" style={{ marginBlockStart: ledger.length > 0 ? 16 : 0 }}>
                  {retention}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

/** The one primary action per screen. */
export function BridgeAction({
  label,
  sub,
  disabled = false,
  onClick,
}: {
  label: string;
  /** WHY it is unavailable, when it is. Never omitted on a disabled action. */
  sub?: string | null;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className="brg-act"
      type="button"
      {...(disabled ? { "aria-disabled": "true" as const } : {})}
      onClick={disabled ? undefined : onClick}
    >
      {label}
      {sub ? <small>{sub}</small> : null}
    </button>
  );
}

/** The secondary way out. Never styled to compete with the primary action. */
export function BridgeSecondary({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button className="brg-snd" type="button" onClick={onClick}>
      {label}
    </button>
  );
}
