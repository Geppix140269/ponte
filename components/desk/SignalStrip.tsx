import { Link } from "@/i18n/navigation";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import type { DeskRecord } from "@/lib/desk/adapter";

/**
 * The live Market Signals strip.
 *
 * Real records only. Every item is a signal that is approved and inside its
 * public life right now, read through the same `readMarketSignals` the board
 * uses, and every item links to its own detail page. There is no count, no
 * fabricated activity and no placeholder row: when the read returns nothing,
 * the caller renders nothing, because an empty strip is better than an invented
 * one.
 *
 * The movement is a marquee, and marquees have three ways of being hostile.
 * All three are handled:
 *
 *   It must be escapable. The track pauses on hover AND on keyboard focus
 *   (`:focus-within`), so a member reading an item, or tabbing through the
 *   links, is not chased along by the animation.
 *
 *   It must be optional. Under `prefers-reduced-motion: reduce` the animation
 *   is removed entirely and the strip becomes a static horizontal list the
 *   member scrolls themselves. That is a different presentation, not the same
 *   one running slowly.
 *
 *   It must not break the page. The track is twice the content and would be
 *   far wider than any viewport, so the strip clips it (`overflow: hidden`)
 *   and the page itself never gains a horizontal scrollbar.
 *
 * The duplicate half of the track is what makes the loop seamless. It is
 * `aria-hidden` and its links are removed from the tab order, so a screen
 * reader and a keyboard user each meet every signal exactly once.
 */
export default function SignalStrip({ records }: { records: DeskRecord[] }) {
  if (records.length === 0) return null;

  const item = (record: DeskRecord, duplicate: boolean) => (
    <Link
      key={`${duplicate ? "dup" : "live"}-${record.ref}`}
      className="strip__i"
      href={record.href}
      tabIndex={duplicate ? -1 : undefined}
    >
      <span className="strip__c">{record.clsLabel}</span>
      <span className="strip__t">{record.title}</span>
      {record.corridor ? <span className="strip__r">{record.corridor}</span> : null}
    </Link>
  );

  return (
    <section className="strip" aria-label="Market Signals read most recently">
      <div className="strip__k">
        <PonteIcon name="evidence.evreview" size={16} />
        <span>Read most recently</span>
      </div>

      <div className="strip__w">
        <div className="strip__track">
          {records.map((r) => item(r, false))}
          {/* The seamless half. Announced to nobody and reachable by nobody. */}
          <div className="strip__half" aria-hidden="true">
            {records.map((r) => item(r, true))}
          </div>
        </div>
      </div>
    </section>
  );
}
