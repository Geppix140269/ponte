import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/icons";
import { formatPosted } from "@/lib/listing-terms";
import { getMarketSignal, type MarketSignal } from "@/lib/board/market-signals";
import SignalDisclaimer from "@/components/signals/SignalDisclaimer";
import {
  SIGNALS_NAV_LABEL,
  SIGNAL_KNOWN_HEADING,
  SIGNAL_UNKNOWN_HEADING,
  SIGNAL_UNKNOWNS,
  SIGNAL_TOMBSTONE,
  ASK_PONTE_CTA,
  secondaryCtaFor,
} from "@/lib/market-signals/copy";

export const dynamic = "force-dynamic";

/**
 * A single Market Signal (brief 1.2, blueprint P06).
 *
 * The header says "Market Signal", never "Opportunity". The disclaimer sits
 * near the title, not only in the footer. The page separates what Ponte knows
 * (the extracted facts) from what it has not established (identity, authority,
 * current availability), so a reader is never left to assume the gap is filled.
 *
 * Three cases, answered honestly:
 *   - visible: a live approved signal, shown in full with the investigate CTA.
 *   - gone: the signal existed but is expired, withdrawn or unavailable. A safe
 *     tombstone, no facts, so a stale shared link cannot resurrect a signal.
 *   - missing: no such signal. A 404.
 */

export const metadata: Metadata = {
  title: `${SIGNALS_NAV_LABEL} · Ponte`,
  robots: { index: false },
};

function sideLabel(side: string): string {
  if (side === "requirement") return "Buyer demand";
  if (side === "offer") return "Seller availability";
  return side;
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline-soft py-3 last:border-0">
      <span className="text-[12px] uppercase tracking-[0.4px] text-muted">{label}</span>
      <span className={`text-right text-[14px] ${value ? "text-ink" : "text-muted"}`}>
        {value ?? "Not stated"}
      </span>
    </div>
  );
}

function Detail({ signal, locale }: { signal: MarketSignal; locale: string }) {
  const corridor =
    signal.originText || signal.destinationText
      ? [signal.originText ?? "?", signal.destinationText ?? "?"].join(" to ")
      : null;

  return (
    <div className="container-px py-14 md:py-20">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/market-signals"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.4px] text-muted hover:text-ink"
        >
          <Icon name="chevron" size={13} className="rotate-180" />
          {SIGNALS_NAV_LABEL}
        </Link>

        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.8px] text-slate">
          Market Signal
        </p>
        <h1
          className="display mt-2 text-ink"
          style={{ fontSize: "clamp(26px, 3.4vw, 40px)", lineHeight: 1.08, letterSpacing: "-0.8px" }}
        >
          {signal.product}
        </h1>

        <SignalDisclaimer full className="mt-5" />

        {signal.description && (
          <p className="mt-6 text-[15px] leading-relaxed text-slate">
            {signal.description}
          </p>
        )}

        {/* What Ponte currently knows: the extracted facts, nothing more. */}
        <section className="mt-8">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.4px] text-ink">
            {SIGNAL_KNOWN_HEADING}
          </h2>
          <div className="mt-3 rounded-glass border border-hairline bg-glass px-4">
            <Fact label="Side" value={sideLabel(signal.side)} />
            <Fact
              label="Quantity"
              value={
                signal.quantity
                  ? `${signal.quantity}${signal.unit ? ` ${signal.unit}` : ""}`
                  : null
              }
            />
            <Fact label="Corridor" value={corridor} />
            <Fact label="Incoterm" value={signal.incoterm} />
            <Fact label="Payment" value={signal.payment} />
            <Fact label="HS code" value={signal.hsCode} />
            <Fact label="Signal date" value={formatPosted(signal.spottedAt, locale)} />
          </div>
        </section>

        {/* What Ponte has NOT established. The limits, stated plainly. */}
        <section className="mt-7">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.4px] text-ink">
            {SIGNAL_UNKNOWN_HEADING}
          </h2>
          <ul className="mt-3 space-y-2">
            {SIGNAL_UNKNOWNS.map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-[13.5px] text-muted">
                <span className="mt-0.5 shrink-0 text-muted">
                  <Icon name="lock" size={14} />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </section>

        {/* Primary and contextual CTA. Block A routes the ask to the Desk; Block
            D replaces this with the structured investigation request behind the
            account gate. Neither reveals a third party. */}
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/contact?signal=${signal.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-[15px] bg-lime px-6 py-[15px] text-[15px] font-bold text-obsidian shadow-lime transition-transform hover:-translate-y-px"
          >
            {ASK_PONTE_CTA}
            <Icon name="chevron" size={16} />
          </Link>
          <Link
            href={`/contact?signal=${signal.id}&role=${signal.side === "requirement" ? "supplier" : "buyer"}`}
            className="inline-flex items-center justify-center rounded-[15px] border border-hairline-strong bg-white/[0.06] px-6 py-[15px] text-[15px] font-bold text-ink transition-colors hover:bg-white/10"
          >
            {secondaryCtaFor(signal.side)}
          </Link>
        </div>
      </div>
    </div>
  );
}

function Tombstone() {
  return (
    <div className="container-px py-20">
      <div className="mx-auto max-w-md rounded-glass border border-hairline bg-glass p-10 text-center">
        <p className="text-[15px] text-muted">{SIGNAL_TOMBSTONE}</p>
        <Link
          href="/market-signals"
          className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.4px] text-lime hover:opacity-80"
        >
          {SIGNALS_NAV_LABEL}
          <Icon name="chevron" size={13} />
        </Link>
      </div>
    </div>
  );
}

export default async function MarketSignalPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  setRequestLocale(params.locale);
  const result = await getMarketSignal(params.id);

  if (result.state === "missing") notFound();
  if (result.state === "gone") return <Tombstone />;
  return <Detail signal={result.signal} locale={params.locale} />;
}
