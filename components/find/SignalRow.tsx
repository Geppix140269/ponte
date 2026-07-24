import { Link } from "@/i18n/navigation";
import type { MarketSignal } from "@/lib/market-signals/logic";

export type SignalRowLabels = {
  kind: string;
  disclaimer: string;
  notStated: string;
};

/**
 * One Market Signal as a dashed-band row (F01 signal lane). Deliberately
 * downgraded from a Qualified Opportunity: a --sunken dashed frame, a slate
 * "MARKET SIGNAL" kind (never the gold dot), a sans (not serif) title, and the
 * mandatory "external, not verified" note. Links to the existing signal detail.
 */
export default function SignalRow({
  signal,
  labels,
}: {
  signal: MarketSignal;
  labels: SignalRowLabels;
}) {
  const route =
    (signal.originCode ?? signal.originText) && (signal.destinationCode ?? signal.destinationText)
      ? `${signal.originCode ?? signal.originText} → ${signal.destinationCode ?? signal.destinationText}`
      : signal.destinationText ?? signal.originText ?? null;
  const qty = signal.quantity
    ? `${signal.quantity}${signal.unit ? ` ${signal.unit}` : ""}`
    : null;

  return (
    <Link className="msrow" href={`/market-signals/${signal.id}`}>
      <span className="msrow__kind">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" strokeLinecap="round" />
        </svg>
        {labels.kind}
      </span>
      <div className="msrow__title">{signal.summaryLine ?? signal.product}</div>
      <div className="msrow__facts">
        {qty && <span className="num">{qty}</span>}
        {route && <span dir="ltr">{route}</span>}
        {signal.incoterm && <span>{signal.incoterm}</span>}
      </div>
      <p className="msrow__note">{labels.disclaimer}</p>
    </Link>
  );
}
