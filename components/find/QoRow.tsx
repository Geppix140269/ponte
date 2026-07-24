import { Link } from "@/i18n/navigation";
import type { LiveDeal } from "@/lib/board/live-deals";

export type QoRowLabels = {
  kind: string;
  view: string;
  ref: string; // "Ref. {ref}" already interpolated by the caller per row
  buy: string;
  sell: string;
  service: string;
  notStated: string;
};

function intentLabel(type: string, l: QoRowLabels): string {
  if (type === "offer") return l.sell;
  if (type === "requirement") return l.buy;
  if (type === "service") return l.service;
  return type;
}

/**
 * One Qualified Opportunity as a rule-separated row (F01 lane). No card chrome:
 * a hairline top rule, the gold record dot, a serif title and mono facts. The
 * whole row is the link into the detail (F02). Facts render only when present;
 * quantity falls back to "Not stated" so an absent number reads as unknown.
 */
export default function QoRow({
  deal,
  href,
  labels,
}: {
  deal: LiveDeal;
  href: string;
  labels: QoRowLabels;
}) {
  const route =
    (deal.originCode ?? deal.originText) && (deal.destinationCode ?? deal.destinationText)
      ? `${deal.originCode ?? deal.originText} → ${deal.destinationCode ?? deal.destinationText}`
      : null;
  const qty = deal.quantity
    ? `${deal.quantity}${deal.unit ? ` ${deal.unit}` : ""}`
    : labels.notStated;

  return (
    <Link className="qorow" href={href}>
      <div className="qorow__top">
        <span className="qorow__kind">
          <span className="g-dot" aria-hidden="true" />
          {labels.kind}
        </span>
        <span className="qorow__intent mono">{intentLabel(deal.type, labels)}</span>
      </div>
      <div className="qorow__title serif">{deal.product}</div>
      <div className="qorow__facts">
        <span className={deal.quantity ? "num" : "ns"}>{qty}</span>
        {route && <span dir="ltr">{route}</span>}
        {deal.incoterm && <span>{deal.incoterm}</span>}
        {deal.hsCode && <span>HS {deal.hsCode}</span>}
      </div>
      <div className="qorow__foot">
        <span className="qorow__ref">{labels.ref}</span>
        <span className="qorow__go">{labels.view} →</span>
      </div>
    </Link>
  );
}
