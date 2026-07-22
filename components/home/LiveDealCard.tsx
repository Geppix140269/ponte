import { Icon } from "@/components/icons";
import { formatPosted } from "@/lib/listing-terms";
import type { LiveDeal } from "@/lib/board/live-deals";

/**
 * One deal, as a teaser.
 *
 * Teaser is the whole contract. This renders structured facts only: side,
 * product, quantity, terms, corridor and when it was posted. No identity, no
 * description, no contact, for anyone, signed in or not. Identity is not
 * shown before both sides sign an NCNDA, so the safest card is one that never
 * receives the data in the first place, which is why `getLiveDeals` does not
 * select it.
 *
 * A radar item is visibly a different animal: a "Desk-sourced opportunity"
 * chip, muted treatment, and never a tier badge, because nobody behind it is
 * a Ponte member and the card must not suggest otherwise.
 *
 * No hooks and no "use client": the labels arrive already translated, so the
 * marquee can server-render a hundred of these for nothing.
 */

export type DealLabels = {
  offer: string;
  requirement: string;
  service: string;
  deskSourced: string;
  notStated: string;
  /** Verification tier names, keyed by level. */
  tier: Record<number, string>;
};

function sideLabel(deal: LiveDeal, labels: DealLabels): string {
  const key = deal.type?.toLowerCase();
  if (key === "offer" || key === "sell") return labels.offer;
  if (key === "requirement" || key === "request" || key === "buy") {
    return labels.requirement;
  }
  if (key === "service") return labels.service;
  return deal.type ?? labels.notStated;
}

function isOffer(deal: LiveDeal): boolean {
  const key = deal.type?.toLowerCase();
  return key === "offer" || key === "sell";
}

export default function LiveDealCard({
  deal,
  labels,
  locale,
  className = "",
}: {
  deal: LiveDeal;
  labels: DealLabels;
  locale: string;
  className?: string;
}) {
  const radar = deal.source === "radar";
  // Codes only. `originText` and `destinationText` are whatever was typed or
  // scraped and belong in the tooltip, not in a two-letter chip.
  const originIso = deal.originCode;
  const destIso = deal.destinationCode;
  // A tier badge is a claim about a verified member. Radar items never carry
  // one, and an unread level is unknown rather than zero, so it shows nothing.
  const tier =
    !radar && deal.verificationLevel !== null && deal.verificationLevel > 0
      ? deal.verificationLevel
      : null;

  return (
    <article
      className={`flex h-full flex-col rounded-glass border p-4 ${
        radar
          ? "border-hairline-soft bg-white/[0.025]"
          : "border-hairline bg-glass"
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`fx ${isOffer(deal) ? "fx-fixed" : "fx-neg"}`}>
          <Icon name={isOffer(deal) ? "offer" : "request"} size={11} />
          {sideLabel(deal, labels).toUpperCase()}
        </span>
        {radar ? (
          <span className="fx fx-open">
            <Icon name="scan" size={11} />
            {labels.deskSourced}
          </span>
        ) : tier ? (
          <span className={`tier tier-${tier}`}>
            L{tier} {labels.tier[tier] ?? ""}
          </span>
        ) : null}
      </div>

      <h3 className="mt-3 line-clamp-2 text-[14px] font-semibold leading-snug text-ink">
        {deal.product}
      </h3>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
        {deal.quantity ? (
          <span className="display text-[20px] font-bold text-ink">
            {deal.quantity}
            {deal.unit ? (
              <span className="ml-1 text-[12px] font-semibold text-muted">
                {deal.unit}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-[12px] text-muted">{labels.notStated}</span>
        )}
        {deal.incoterm ? (
          <span className="text-[11.5px] text-muted">{deal.incoterm}</span>
        ) : null}
      </div>

      {/*
        The corridor, always left to right: codes are data, not prose.

        Only ISO codes go in a chip. A chip is 26px of space for two letters,
        and the desk collection is full of destinations like "Busan, South
        Korea (Republic Of Korea)" and "Asia, Other-Not Shown" that do not
        resolve to a country. Those get no chip rather than a chip the width of
        the card.

        Where only one end is known, and on a desk-sourced requirement that is
        most of them, one pier is drawn and no span. A bridge needs two ends,
        and inventing the far one to make the graphic work is inventing a fact.
      */}
      {originIso && destIso ? (
        <div dir="ltr" className="mt-3 flex items-center gap-2">
          <span className="flag-chip">{originIso}</span>
          <svg viewBox="0 0 120 16" className="h-3 flex-1" aria-hidden="true">
            <path
              d="M4 12 C 42 3, 78 3, 116 12"
              fill="none"
              stroke={radar ? "rgba(255,255,255,.22)" : "#8B6BFF"}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="4" cy="12" r="2.4" fill={radar ? "#8A93A2" : "#CBFB5E"} />
            <circle cx="116" cy="12" r="2.4" fill={radar ? "#8A93A2" : "#3FE0C5"} />
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
          {formatPosted(deal.postedAt, locale)}
        </span>
        {deal.hsCode ? (
          <span className="text-[10.5px] text-muted">HS {deal.hsCode}</span>
        ) : null}
      </div>
    </article>
  );
}
