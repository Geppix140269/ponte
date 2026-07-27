import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";

/**
 * The ink knowledge boundary: "What Ponte has not established".
 *
 * This is the Atlas borrowing, and it is used on the Market Signal detail and
 * nowhere else in the product. Borrowing it a second time would turn a
 * statement into a decoration. The rule is enforceable by inspection: this
 * component is imported by exactly one route.
 *
 * It carries the same visual weight as the findings beside it, on purpose. A
 * Market Signal is an indication, not a transaction and not a reviewed record,
 * and the limit of Ponte's knowledge is the thing a reader is actually deciding
 * against. Putting the limits in a footnote while the findings get a panel
 * would be a design that argues the opposite of what the words say.
 *
 * Absence of a finding is never presented as a negative finding. Each item says
 * what has not been established and why, and neither implies the answer.
 *
 * The boundary icon appears once, on the heading, and not on every row. Five
 * identical glyphs beside five different sentences carry nothing a sighted
 * reader does not already have, and announce the same phrase five times to a
 * reader who cannot see them. The Flow key is a labelled one, so it is the
 * carrier of its own meaning exactly once, which is what the registry's
 * accessibility contract asks for.
 */

export interface BoundaryItem {
  /** What has not been established. */
  claim: string;
  /** Why it has not been, stated without implying what the answer would be. */
  because: string;
}

export default function KnowledgeBoundary({ items }: { items: BoundaryItem[] }) {
  return (
    <aside className="boundary dk-ink" aria-labelledby="dk-boundary-heading">
      <div className="boundary__h">
        <PonteIcon
          name="participation.boundary"
          size={24}
          label="The boundary of what Ponte has established"
        />
        <div>
          <h2 id="dk-boundary-heading" className="serif">
            What Ponte has
            <br />
            not established
          </h2>
          <p className="d">
            {items.length === 1 ? "One item." : `${items.length} items.`} Absence of a finding is
            not a negative finding.
          </p>
        </div>
      </div>

      <ul>
        {items.map((item) => (
          <li key={item.claim}>
            <b>{item.claim}</b>
            <span>{item.because}</span>
          </li>
        ))}
      </ul>

      <div className="boundary__f">
        <b>Why this column exists</b>
        <p>
          A Market Signal is an indication, not a transaction and not a reviewed record. Ponte
          states the limit of its knowledge in the same weight as its findings, because the limit
          is what you are actually deciding against.
        </p>
      </div>
    </aside>
  );
}
