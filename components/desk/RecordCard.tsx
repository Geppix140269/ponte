import { Link } from "@/i18n/navigation";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import { factsFor } from "@/lib/desk/facts";
import type { DeskRecord } from "@/lib/desk/adapter";

/**
 * A raised working record on the sunken page ground, for the landing and for
 * any listing short enough that a ruled register would be heavier than the
 * content it rules. The register is the dense form; this is the readable one.
 *
 * The dashed left rule and the slate classification are what say "Market
 * Signal, not confirmed" without a badge, and they are never applied to a
 * reviewed record. `--opp` flips the same card to a solid ink rule for a record
 * Ponte has actually reviewed, so the two record classes can sit on one page
 * without either borrowing the other's authority.
 *
 * Facts come from `factsFor` at the landing count. Nothing here reads a
 * production column.
 */
export default function RecordCard({
  record,
  reviewed,
}: {
  record: DeskRecord;
  /** A record Ponte reviewed before publication, rather than a signal. */
  reviewed?: boolean;
}) {
  const facts = factsFor(record, { context: "landing-card" });

  return (
    <article className={`rec${reviewed ? " rec--opp" : ""}`}>
      <div className="rec__m">
        <div className="rec__top">
          <span className={`cls${reviewed ? " cls--opp" : ""}`}>{record.clsLabel}</span>
          <span className="r">{record.ref}</span>
          <span className="a">Read {record.readLabel}</span>
        </div>

        <h3>
          <Link href={record.href}>{record.title}</Link>
        </h3>

        {record.corridor || record.hs ? (
          <div className="rec__cor">
            {record.corridor ? (
              <>
                <PonteIcon name="primitive.span" size={18} />
                <span>{record.corridor}</span>
              </>
            ) : null}
            {record.hs ? <span style={{ color: "var(--mute)" }}>{`HS ${record.hs}`}</span> : null}
          </div>
        ) : null}
      </div>

      <dl className="rec__f">
        {facts.map((fact) => (
          <div key={fact.key}>
            <dt>{fact.label}</dt>
            <dd className={fact.missing ? "na" : undefined}>{fact.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
