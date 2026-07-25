import { Link } from "@/i18n/navigation";
import type { ActivityBandItem } from "@/lib/board/activity-view";

/**
 * The recent market activity band (North Star entry architecture, section 6).
 *
 * The evidence that Ponte is alive, above the fold and above the bridge. Every
 * row is a real public record: an approved member listing or an approved,
 * unexpired Market Signal, each printing its own true classification as text.
 * There is no demo mode and there must never be one.
 *
 * Motion is CSS only, the same technique the deal strip already uses: the track
 * is rendered twice and translated by exactly half its width, so the loop is
 * seamless, and the pause is `animation-play-state` on `:hover` and
 * `:focus-within` rather than a JavaScript listener. Under
 * `prefers-reduced-motion` the animation is dropped and the band becomes an
 * ordinary horizontal scroller, which is also the mobile behaviour, so the same
 * records stay reachable either way.
 *
 * The band hides itself when there is nothing to show. An empty band would be a
 * claim about the market, and the correct claim is silence.
 */

export interface ActivityBandLabels {
  /** Region label, e.g. "Recent market activity". */
  title: string;
  /** The truthful caveat: not every record is confirmed by Ponte. */
  note: string;
}

function Row({ item, decorative }: { item: ActivityBandItem; decorative?: boolean }) {
  const facts = [item.geography, item.scope].filter(Boolean) as string[];
  const body = (
    <>
      <span className="aband__kind" data-kind={item.kind}>
        {item.kindLabel}
      </span>
      <span className="aband__p">{item.product}</span>
      {facts.map((fact) => (
        <span key={fact} className="aband__f">
          {fact}
        </span>
      ))}
      <span className="aband__age">{item.recency}</span>
    </>
  );

  // The echo copy is never a link: an aria-hidden anchor is still focusable,
  // and a keyboard should meet each record once.
  if (decorative || !item.href) return <span className="aband__i">{body}</span>;
  return (
    <Link className="aband__i aband__i--link" href={item.href}>
      {body}
    </Link>
  );
}

export default function ActivityBand({
  items,
  labels,
}: {
  items: ActivityBandItem[];
  labels: ActivityBandLabels;
}) {
  if (items.length === 0) return null;

  // Slow enough to read a row in passing, and scaled by how many there are so
  // twenty records do not become a blur.
  const seconds = Math.max(30, items.length * 5);

  return (
    <section className="aband" aria-label={labels.title}>
      <div className="aband__head">
        <span className="aband__t">{labels.title}</span>
        <span className="aband__note">{labels.note}</span>
      </div>
      <div className="aband__vp" style={{ ["--aband-duration" as string]: `${seconds}s` }}>
        <div className="aband__track">
          {items.map((item) => (
            <Row key={item.key} item={item} />
          ))}
          {/* The second pass is the same records again, purely so the loop has
              somewhere to go. Hidden from assistive tech, and rendered without
              links, so a screen reader and a keyboard meet the band once. */}
          <span className="aband__echo" aria-hidden="true">
            {items.map((item) => (
              <Row key={`echo-${item.key}`} item={item} decorative />
            ))}
          </span>
        </div>
      </div>
    </section>
  );
}
