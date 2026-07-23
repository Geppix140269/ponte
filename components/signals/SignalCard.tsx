import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/icons";
import { formatPosted } from "@/lib/listing-terms";
import type { MarketSignal } from "@/lib/board/market-signals";

/**
 * One Market Signal, as a card.
 *
 * Deliberately not a LiveDealCard. A Qualified Opportunity card can carry a
 * verification tier; a signal never can, because nobody behind it is a checked
 * member. So this card wears its own marker ("Signal"), a dimmer neutral
 * treatment rather than the board's glass, and it opens the signal detail, not
 * a member listing. It carries no trust colour on purpose: an unverified signal
 * has no trust to show. The two must be tellable apart from across the room,
 * which is the whole reason Block A splits them.
 *
 * Structured facts only. The public payload never contained a source, a person
 * or the original prose, so a card cannot show one.
 *
 * Chrome is passed in as `labels`, resolved once by the board page from the
 * "marketSignals" message namespace (Block E), so the card localises without
 * being a client component or awaiting translations per card.
 */

export type SignalCardLabels = {
  marker: string;
  view: string;
  notStated: string;
  sideBuyer: string;
  sideSeller: string;
};

export default function SignalCard({
  signal,
  locale,
  labels,
}: {
  signal: MarketSignal;
  locale: string;
  labels: SignalCardLabels;
}) {
  const sideLabel =
    signal.side === "requirement"
      ? labels.sideBuyer
      : signal.side === "offer"
        ? labels.sideSeller
        : signal.side;
  const originIso = signal.originCode;
  const destIso = signal.destinationCode;

  return (
    <Link
      href={`/market-signals/${signal.id}`}
      className="group flex h-full flex-col rounded-glass border border-hairline-soft bg-white/[0.02] p-4 transition-colors hover:border-hairline hover:bg-white/[0.04]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.4px] text-muted">
          <Icon name={signal.side === "offer" ? "offer" : "request"} size={11} />
          {sideLabel}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.5px] text-slate">
          <Icon name="scan" size={11} />
          {labels.marker}
        </span>
      </div>

      <h3 className="mt-3 line-clamp-2 text-[14px] font-semibold leading-snug text-ink">
        {signal.product}
      </h3>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
        {signal.quantity ? (
          <span className="display text-[20px] font-bold text-ink">
            {signal.quantity}
            {signal.unit ? (
              <span className="ml-1 text-[12px] font-semibold text-muted">
                {signal.unit}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-[12px] text-muted">{labels.notStated}</span>
        )}
        {signal.incoterm ? (
          <span className="text-[11.5px] text-muted">{signal.incoterm}</span>
        ) : null}
      </div>

      {/* Corridor, codes only, left to right. A signal usually knows one end. */}
      {originIso && destIso ? (
        <div dir="ltr" className="mt-3 flex items-center gap-2">
          <span className="flag-chip">{originIso}</span>
          <svg viewBox="0 0 120 16" className="h-3 flex-1" aria-hidden="true">
            <path
              d="M4 12 C 42 3, 78 3, 116 12"
              fill="none"
              stroke="rgba(255,255,255,.22)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="4" cy="12" r="2.4" fill="#8A93A2" />
            <circle cx="116" cy="12" r="2.4" fill="#8A93A2" />
          </svg>
          <span className="flag-chip">{destIso}</span>
        </div>
      ) : destIso ? (
        <div dir="ltr" className="mt-3 flex items-center gap-1.5">
          <Icon name="request" size={13} className="text-muted" />
          <span className="flag-chip">{destIso}</span>
        </div>
      ) : originIso ? (
        <div dir="ltr" className="mt-3 flex items-center gap-1.5">
          <Icon name="offer" size={13} className="text-muted" />
          <span className="flag-chip">{originIso}</span>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-hairline-soft pt-2.5">
        <span className="text-[10.5px] text-muted">
          {formatPosted(signal.spottedAt, locale)}
        </span>
        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate group-hover:text-ink">
          {labels.view}
          <Icon name="chevron" size={12} />
        </span>
      </div>
    </Link>
  );
}
