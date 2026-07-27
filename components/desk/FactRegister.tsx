import { Link } from "@/i18n/navigation";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import { factsFor, type DeskFact } from "@/lib/desk/facts";
import type { DeskRecord } from "@/lib/desk/adapter";

/**
 * The ruled fact register: the Ledger borrowing, for dense listings.
 *
 * One DOM at every width. The register renders the desktop count of facts and
 * the stylesheet drops the tail below each breakpoint, so a 390px row is
 * literally the first two cells of the desktop row rather than a second list
 * that can drift away from it. That is what makes "mobile facts are a strict
 * prefix of desktop facts" a property of the markup and not a promise.
 *
 * Every fact comes from `factsFor`. This component does not know that a Market
 * Signal has an `incoterm` column, and must not learn: the moment a register
 * cell reaches into a production field, the per-screen fact logic the authority
 * exists to remove is back.
 *
 * A record that runs out of documented facts renders an empty cell rather than
 * a substitute. The blank is honest; a borrowed fact would not be.
 */

const DESKTOP_FACTS = 3;

/** The corridor glyph. Two end ticks and a rule between them, from Flow. */
function Corridor({ corridor, hs }: { corridor: string | null; hs: string | null }) {
  if (!corridor && !hs) return null;
  return (
    <div className="cor">
      {corridor ? (
        <>
          <PonteIcon name="primitive.span" size={18} />
          <span>{corridor}</span>
        </>
      ) : null}
      {hs ? <span className="hs">{`HS ${hs}`}</span> : null}
    </div>
  );
}

function FactCell({ fact }: { fact: DeskFact | undefined }) {
  return (
    <dl className="reg__f">
      {fact ? (
        <>
          <dt>{fact.label}</dt>
          <dd className={fact.missing ? "na" : undefined}>{fact.value}</dd>
        </>
      ) : (
        <>
          <dt />
          <dd />
        </>
      )}
    </dl>
  );
}

export function RegisterRow({ record }: { record: DeskRecord }) {
  const facts = factsFor(record, { context: "desktop-register" });

  return (
    <div className="reg__row">
      <div className="reg__cls">
        <span className="cls">{record.clsLabel}</span>
        <u>{record.ref}</u>
      </div>

      <div className="reg__t">
        <h3>{record.title}</h3>
        <Corridor corridor={record.corridor} hs={record.hs} />
      </div>

      {Array.from({ length: DESKTOP_FACTS }, (_, i) => (
        <FactCell key={i} fact={facts[i]} />
      ))}

      {/* The read date, and never a source name. Which portal a signal came
          from is an internal column that the public reader does not select. */}
      <div className="reg__src">Read {record.readLabel}</div>

      <div className="reg__a">
        <Link href={record.href}>
          Open<span aria-hidden="true"> &rarr;</span>
          <span className="sr-only">{` ${record.title}`}</span>
        </Link>
      </div>
    </div>
  );
}

/**
 * The register head. Column names are generic on purpose: the facts differ by
 * classification, so "Primary fact" is the truth, and "Quantity" would be
 * wrong on every row that does not lead with quantity.
 *
 * It is aria-hidden, and that is deliberate rather than lazy. The head is a
 * sighted reader's column guide; every fact cell already carries its own <dt>
 * label, so announcing the head would read each fact's name twice. It also
 * disappears entirely below the register breakpoint, where there are no
 * columns to head, so table semantics would be a lie at that width.
 */
const HEADS = ["Classification", "Signal", "Primary fact", "Second fact", "Third fact", "Read", ""];

export default function FactRegister({
  records,
  label,
}: {
  records: DeskRecord[];
  label: string;
}) {
  return (
    <section className="reg" aria-label={label}>
      <div className="reg__head" aria-hidden="true">
        {HEADS.map((head, i) => (
          <span key={i}>{head}</span>
        ))}
      </div>
      {records.map((record) => (
        <RegisterRow key={record.ref} record={record} />
      ))}
    </section>
  );
}
