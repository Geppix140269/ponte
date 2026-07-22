import { Icon } from "@/components/icons";
import { formatPosted } from "@/lib/listing-terms";
import type { LiveDeal } from "@/lib/board/live-deals";

/**
 * The hero: one deal, one counterparty, and the span between them.
 *
 * This is "one bridge away" made literal. The origin card is the deal, the
 * far card is who is on the other side, and the arc is drawn between them on
 * load. It is the only place on the page where the mark's geometry becomes
 * the layout.
 *
 * ---------------------------------------------------------------------------
 * Mobile is not the desktop shrunk
 * ---------------------------------------------------------------------------
 * The design this is rebuilt from is desktop only: no media queries, just a
 * clamped heading, and at 390px 192 of its elements overflow the viewport.
 * So the two-column stage is rebuilt here as a vertical one on a phone: the
 * cards stack, and the arc rotates to run down the gap between them rather
 * than across it. Same three parts, same reading order, same animation, laid
 * out for the shape of the screen. Most of these links are opened from
 * WhatsApp on a phone, so that is the case that has to be right.
 */

function TrustDial({ score, size = 74 }: { score: number; size?: number }) {
  const offset = 113 - (113 * Math.max(0, Math.min(100, score))) / 100;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      role="img"
      aria-label={`Trust score ${score} of 100`}
    >
      <defs>
        <linearGradient id="stage-dial" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#CBFB5E" />
          <stop offset="0.5" stopColor="#8B6BFF" />
          <stop offset="1" stopColor="#3FE0C5" />
        </linearGradient>
      </defs>
      <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="3.4" />
      <circle
        cx="22"
        cy="22"
        r="18"
        fill="none"
        stroke="url(#stage-dial)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray="113"
        strokeDashoffset={offset}
        transform="rotate(-90 22 22)"
        className="dial-sweep"
      />
      <text
        x="22"
        y="24.5"
        textAnchor="middle"
        fill="#EEF1F5"
        style={{ font: "700 12px var(--font-space-grotesk)" }}
      >
        {score}
      </text>
    </svg>
  );
}

export type StageLabels = {
  offer: string;
  requirement: string;
  notStated: string;
  counterparty: string;
  trustLabel: string;
  clear: string;
  /** Shown when the counterparty carries no verification tier at all. */
  unverified: string;
  /** The anonymity rule, which is true of every counterparty. */
  anonymous: string;
  readOn: string;
  openRoom: string;
  sampleNote: string | null;
  tier: Record<number, string>;
};

export default function BridgeStage({
  deal,
  labels,
  locale,
  trustScore,
}: {
  deal: LiveDeal;
  labels: StageLabels;
  locale: string;
  /** Only rendered when a real score exists. Never invented. */
  trustScore: number | null;
}) {
  const offer = deal.type?.toLowerCase() !== "requirement";
  const from = deal.originCode ?? deal.originText;
  const to = deal.destinationCode ?? deal.destinationText;
  // A span needs two piers. Plenty of real listings name only one end, and
  // drawing an arc into a chip that says "not stated" is both ugly and a
  // bridge to nowhere, so the corridor simply is not drawn.
  const hasCorridor = Boolean(from && to);
  const tier =
    deal.verificationLevel !== null && deal.verificationLevel > 0
      ? deal.verificationLevel
      : null;

  return (
    <div className="relative">
      {/*
        The cards are deliberately narrow and the middle column is deliberately
        wide. In the design the two cards are 334 and 314 wide inside an 1185
        stage, and the span has the whole middle to cross. Built with the cards
        at half the width each, as this was first, there is no middle left and
        the arc draws straight through the card text.

        The arc therefore lives IN the middle grid cell rather than absolutely
        positioned across the stage. It cannot overlap a card because it has
        nowhere to overlap from.
      */}
      <div className="relative grid items-center gap-4 md:grid-cols-[minmax(0,340px)_minmax(80px,1fr)_minmax(0,340px)] md:gap-5">
        {/* ===== The deal ===== */}
        <article className="rounded-glass border border-hairline bg-glass p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <span className={`fx ${offer ? "fx-fixed" : "fx-neg"}`}>
              <Icon name={offer ? "offer" : "request"} size={11} />
              {(offer ? labels.offer : labels.requirement).toUpperCase()}
            </span>
            {tier && (
              <span className={`tier tier-${tier}`}>
                L{tier} {labels.tier[tier] ?? ""}
              </span>
            )}
          </div>

          <h2 className="mt-3 text-[15px] font-semibold leading-snug text-ink sm:text-[16px]">
            {deal.product}
          </h2>

          <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
            {deal.quantity && (
              <span className="display text-[22px] font-bold text-ink sm:text-[26px]">
                {deal.quantity}
                {deal.unit ? <span className="ml-1 text-[13px] text-muted">{deal.unit}</span> : null}
              </span>
            )}
            {deal.incoterm && (
              <span className="text-[12px] text-muted">{deal.incoterm}</span>
            )}
          </p>

          {hasCorridor ? (
            <div dir="ltr" className="mt-3 flex items-center gap-2">
              <span className="flag-chip">{from}</span>
              {/* On a phone the big arc is hidden, so the card carries its own
                  small span: the corridor still has to read. */}
              <svg viewBox="0 0 120 16" className="h-3 flex-1 md:hidden" aria-hidden="true">
                <path
                  d="M4 12 C 42 3, 78 3, 116 12"
                  fill="none"
                  stroke="#8B6BFF"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span className="flag-chip md:hidden">{to}</span>
            </div>
          ) : from ? (
            <div dir="ltr" className="mt-3">
              <span className="flag-chip">{from}</span>
            </div>
          ) : null}
        </article>

        {/* The span, in the gap that belongs to it. Horizontal from md up,
            vertical on a phone, same draw either way. */}
        <div className="flex items-center justify-center">
          <svg
            aria-hidden="true"
            viewBox="0 0 40 80"
            className="h-12 w-10 md:hidden"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="stage-arc-v" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#CBFB5E" />
                <stop offset="0.5" stopColor="#8B6BFF" />
                <stop offset="1" stopColor="#3FE0C5" />
              </linearGradient>
            </defs>
            <path
              d="M20 4 C 6 28, 34 52, 20 76"
              fill="none"
              stroke="url(#stage-arc-v)"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="arc-draw"
              style={{ ["--len" as string]: 90 }}
            />
          </svg>

          <svg
            aria-hidden="true"
            viewBox="0 0 240 80"
            preserveAspectRatio="none"
            className="hidden h-20 w-full md:block"
          >
            <defs>
              <linearGradient id="stage-arc" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#CBFB5E" />
                <stop offset="0.5" stopColor="#8B6BFF" />
                <stop offset="1" stopColor="#3FE0C5" />
              </linearGradient>
            </defs>
            <path
              d="M6 64 C 70 6, 170 6, 234 64"
              fill="none"
              stroke="url(#stage-arc)"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="arc-draw"
              style={{ ["--len" as string]: 260 }}
            />
            <circle cx="6" cy="64" r="4" fill="#CBFB5E" />
            <circle cx="234" cy="64" r="4" fill="#3FE0C5" />
          </svg>
        </div>

        {/* ===== Who is on the other side ===== */}
        <article className="rounded-glass border border-hairline bg-glass p-4 sm:p-5">
          <p className="label">{labels.counterparty}</p>
          <div className="mt-3 flex items-center gap-4">
            {trustScore !== null ? (
              <>
                <TrustDial score={trustScore} />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-label text-muted">
                    {labels.trustLabel}
                  </p>
                  {/* "Registry and sanctions clear" is a finding, not a
                      decoration. It only appears where a verification actually
                      produced one. */}
                  <p className="mt-1 text-[12.5px] leading-snug text-ink">{labels.clear}</p>
                </div>
              </>
            ) : (
              // No verification, so no dial and no clearance claim. The tier
              // is the only thing known about this counterparty, and where
              // there is not even a tier it says so rather than implying one.
              <div className="min-w-0">
                {tier ? (
                  <span className={`tier tier-${tier}`}>
                    L{tier} {labels.tier[tier] ?? ""}
                  </span>
                ) : (
                  <span className="tier tier-1">{labels.unverified}</span>
                )}
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                  {labels.anonymous}
                </p>
              </div>
            )}
          </div>
          <p className="mt-3 border-t border-hairline-soft pt-2.5 text-[10.5px] text-muted">
            {labels.readOn.replace("{date}", formatPosted(deal.postedAt, locale))}
          </p>
        </article>
      </div>

      {labels.sampleNote && (
        <p className="mt-3 text-[10.5px] leading-relaxed text-muted">{labels.sampleNote}</p>
      )}
    </div>
  );
}
