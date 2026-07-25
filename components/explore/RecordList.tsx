import { Link } from "@/i18n/navigation";
import type { ActivityBandItem } from "@/lib/board/activity-view";

/**
 * A list of market records: one coherent commercial-activity presentation that
 * preserves the status distinctions (North Star entry architecture, section 8).
 *
 * Every row prints its class as a word, then the product, then only the facts
 * the record actually states. A row with no public detail gets no action rather
 * than a dead button.
 */

export interface RecordListLabels {
  /** "View" on a record that has a public detail page. */
  view: string;
  /** The accessible name of the list. */
  listLabel: string;
}

export default function RecordList({
  items,
  labels,
}: {
  items: ActivityBandItem[];
  labels: RecordListLabels;
}) {
  if (items.length === 0) return null;

  return (
    <ul className="exrec" aria-label={labels.listLabel}>
      {items.map((item) => {
        const facts = [item.geography, item.scope, item.recency].filter(Boolean) as string[];
        return (
          <li key={item.key} className="exrec__i">
            <div className="exrec__m">
              <span className="exrec__k" data-kind={item.kind}>
                {item.kindLabel}
              </span>
              <span className="exrec__p">{item.product}</span>
              <span className="exrec__f">
                {facts.map((fact) => (
                  <span key={fact}>{fact}</span>
                ))}
              </span>
            </div>
            {item.href && (
              <Link className="exrec__a" href={item.href}>
                {labels.view}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
