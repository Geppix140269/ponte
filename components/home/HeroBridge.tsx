import { Icon } from "@/components/icons";
import type { LiveDeal } from "@/lib/board/live-deals";

/**
 * The hero bridge, ported from the landing design source.
 *
 * This is the page. A deck line, three suspenders, the gradient span drawing
 * itself over 2.2s, a pier at each end, and a dot that crosses the span every
 * seven seconds. The geometry below is the design's own, not a reconstruction
 * of it: the earlier attempt measured the rendered page and rebuilt from the
 * measurements, which is how it ended up as two cards with an arc through the
 * middle of one of them.
 *
 * The travelling dot uses SVG `animateMotion` against the span's own path, so
 * it follows the curve exactly and costs no JavaScript.
 *
 * Responsive: the design is a fixed 1200x320 viewBox with the two cards
 * floated to the ends. The SVG scales with the container, and below `sm` the
 * cards stack under it rather than sitting on top of it, because at 390 there
 * is no room for a 300px card at each end of a bridge.
 */

const SPAN_PATH = "M100 258 C 420 40, 780 40, 1100 258";

export type HeroLabels = {
  offer: string;
  requirement: string;
  counterparty: string;
  clear: string;
  unverified: string;
  readOn: string;
  openRoom: string;
  sampleNote: string | null;
  tier: Record<number, string>;
};

export default function HeroBridge({
  deal,
  labels,
  postedLabel,
  trustScore,
}: {
  deal: LiveDeal;
  labels: HeroLabels;
  postedLabel: string;
  trustScore: number | null;
}) {
  const offer = deal.type?.toLowerCase() !== "requirement";
  const from = deal.originCode;
  const to = deal.destinationCode;
  const tier =
    deal.verificationLevel !== null && deal.verificationLevel > 0
      ? deal.verificationLevel
      : null;
  const terms = [deal.incoterm, deal.unit ? null : null].filter(Boolean).join(" · ");

  return (
    <div className="relative mx-auto w-full max-w-[1240px] px-[18px] pb-10 pt-2 sm:px-6 lg:px-10">
      <div className="relative flex min-h-[340px] flex-col gap-4 pb-7 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        {/* The bridge itself. Sits behind the cards on a wide screen and above
            them on a phone, where the cards stack below it. */}
        <svg
          viewBox="0 0 1200 320"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          className="pointer-events-none relative h-[150px] w-full sm:absolute sm:inset-0 sm:h-full"
        >
          <defs>
            <linearGradient id="hero-arc" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#CBFB5E" />
              <stop offset="0.5" stopColor="#8B6BFF" />
              <stop offset="1" stopColor="#3FE0C5" />
            </linearGradient>
          </defs>

          {/* Deck, then the suspenders hanging from the span down to it. */}
          <path
            d="M80 268 H1120"
            stroke="rgba(255,255,255,.12)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M320 118 V268 M600 84 V268 M880 118 V268"
            stroke="rgba(255,255,255,.1)"
            strokeWidth="1.6"
          />

          <path
            id="heroSpan"
            d={SPAN_PATH}
            fill="none"
            stroke="url(#hero-arc)"
            strokeWidth="4.5"
            strokeLinecap="round"
            className="arc-draw"
            style={{ ["--len" as string]: 1400 }}
          />

          <circle cx="100" cy="258" r="9" fill="#CBFB5E" />
          <circle cx="1100" cy="258" r="9" fill="#3FE0C5" />

          {/* The crossing. Begins after the span has drawn itself. */}
          <circle r="6" fill="#fff" opacity="0.95">
            <animateMotion dur="7s" begin="2.4s" repeatCount="indefinite" rotate="auto">
              <mpath href="#heroSpan" />
            </animateMotion>
          </circle>
        </svg>

        {/* ===== The deal, on the near pier ===== */}
        <article
          className="rise relative w-full rounded-[20px] border border-hairline bg-glass p-4 backdrop-blur-[10px] sm:w-[300px] sm:flex-none"
          style={{ ["--i" as string]: 5 }}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-tag px-2.5 py-[3px] text-[10px] font-bold tracking-[0.4px]"
              style={{
                background: offer ? "rgba(203,251,94,.14)" : "rgba(139,107,255,.18)",
                color: offer ? "#CBFB5E" : "#B6A2FF",
              }}
            >
              <Icon name={offer ? "offer" : "request"} size={12} />
              {(offer ? labels.offer : labels.requirement).toUpperCase()}
            </span>
            {tier ? (
              <span className={`tier tier-${tier}`}>
                L{tier} {labels.tier[tier] ?? ""}
              </span>
            ) : null}
          </div>

          <p className="mt-2.5 text-[15px] font-semibold text-ink">{deal.product}</p>

          <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
            {deal.quantity && (
              <span className="display text-[22px] font-bold text-ink">
                {deal.quantity}
                {deal.unit ? ` ${deal.unit}` : ""}
              </span>
            )}
            {terms && <span className="text-[11px] font-medium text-muted">{terms}</span>}
          </div>

          {deal.payment ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span
                className="rounded-tag px-2 py-[3px] text-[9.5px] font-bold"
                style={{
                  background: "rgba(203,251,94,.13)",
                  border: "1px solid rgba(203,251,94,.28)",
                  color: "#CBFB5E",
                }}
              >
                {deal.payment.toUpperCase()}
              </span>
            </div>
          ) : null}
        </article>

        {/* ===== Who is on the far pier ===== */}
        <article
          className="rise relative w-full rounded-[20px] p-4 backdrop-blur-[10px] sm:w-[280px] sm:flex-none"
          style={{
            ["--i" as string]: 6,
            background:
              "linear-gradient(135deg, rgba(139,107,255,.18), rgba(255,255,255,.03))",
            border: "1px solid rgba(139,107,255,.32)",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold"
              style={{ background: "rgba(139,107,255,.2)", color: "#B6A2FF" }}
            >
              <Icon name="ai" size={12} />
              {labels.counterparty}
            </span>
            {to && <span className="text-[10.5px] font-semibold text-muted">{to}</span>}
          </div>

          <div className="mt-3 flex items-center gap-2.5">
            {trustScore !== null ? (
              <svg width="46" height="46" viewBox="0 0 44 44" aria-hidden="true">
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  fill="none"
                  stroke="rgba(255,255,255,.1)"
                  strokeWidth="3.6"
                />
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  fill="none"
                  stroke="url(#hero-arc)"
                  strokeWidth="3.6"
                  strokeLinecap="round"
                  strokeDasharray="113"
                  strokeDashoffset={113 - (113 * trustScore) / 100}
                  transform="rotate(-90 22 22)"
                  className="dial-sweep"
                />
                <text
                  x="22"
                  y="26"
                  textAnchor="middle"
                  fill="#fff"
                  style={{ font: '700 12px "Space Grotesk"' }}
                >
                  {trustScore}
                </text>
              </svg>
            ) : null}
            <div className="min-w-0">
              {/* Only a real verification produces a clearance line. Without
                  one this says what is actually known, which is the tier or
                  the absence of it. */}
              <p className="text-[12.5px] font-semibold text-ink">
                {trustScore !== null ? labels.clear : labels.unverified}
              </p>
              <p className="text-[10.5px] font-medium text-muted">
                {labels.readOn.replace("{date}", postedLabel)}
              </p>
            </div>
          </div>

          <p className="mt-3 rounded-[11px] bg-lime py-2.5 text-center text-[12.5px] font-bold text-obsidian">
            {labels.openRoom}
          </p>
        </article>

        {/* The pier labels, pinned to the ends of the deck on a wide screen. */}
        {from && (
          <span className="flag-chip absolute bottom-0 left-[6%] hidden sm:inline-flex">
            {from}
          </span>
        )}
        {to && (
          <span className="flag-chip absolute bottom-0 right-[6%] hidden sm:inline-flex">
            {to}
          </span>
        )}
      </div>

      {labels.sampleNote && (
        <p className="text-[10.5px] leading-relaxed text-muted">{labels.sampleNote}</p>
      )}
    </div>
  );
}
