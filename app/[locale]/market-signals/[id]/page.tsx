import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/icons";
import { formatPosted } from "@/lib/listing-terms";
import { getMarketSignal, type MarketSignal } from "@/lib/board/market-signals";
import SignalDisclaimer from "@/components/signals/SignalDisclaimer";
import InvestigateButton from "@/components/signals/InvestigateButton";

export const dynamic = "force-dynamic";

/**
 * A single Market Signal (brief 1.2, blueprint P06).
 *
 * The header says "Market Signal", never "Opportunity". The disclaimer sits
 * near the title, not only in the footer. The page separates what Ponte knows
 * (the extracted facts) from what it has not established (identity, authority,
 * current availability), so a reader is never left to assume the gap is filled.
 *
 * Chrome, the mandatory badge and the mandatory disclaimer all read from the
 * "marketSignals" message namespace and are localised across the ten locales.
 *
 * Three cases, answered honestly:
 *   - visible: a live approved signal, shown in full with the investigate CTA.
 *   - gone: the signal existed but is expired, withdrawn or unavailable. A safe
 *     tombstone, no facts, so a stale shared link cannot resurrect a signal.
 *   - missing: no such signal. A 404.
 */

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "marketSignals" });
  // The root layout template already appends " | Ponte Trade"; no brand suffix
  // here, so the title never carries the brand twice.
  return {
    title: t("label"),
    robots: { index: false },
  };
}

function Fact({
  label,
  value,
  notStated,
}: {
  label: string;
  value: string | null;
  notStated: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline-soft py-3 last:border-0">
      <span className="text-[12px] uppercase tracking-[0.4px] text-muted">{label}</span>
      <span className={`text-right text-[14px] ${value ? "text-ink" : "text-muted"}`}>
        {value ?? notStated}
      </span>
    </div>
  );
}

async function Detail({ signal, locale }: { signal: MarketSignal; locale: string }) {
  const t = await getTranslations("marketSignals");
  const corridor =
    signal.originText || signal.destinationText
      ? [signal.originText ?? "?", signal.destinationText ?? "?"].join(" to ")
      : null;

  const sideLabel =
    signal.side === "requirement"
      ? t("card.sideBuyer")
      : signal.side === "offer"
        ? t("card.sideSeller")
        : signal.side;
  const notStated = t("card.notStated");

  return (
    <div className="container-px py-14 md:py-20">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/market-signals"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.4px] text-muted hover:text-ink"
        >
          <Icon name="chevron" size={13} className="rotate-180" />
          {t("label")}
        </Link>

        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.8px] text-slate">
          {t("detail.eyebrow")}
        </p>
        <h1
          className="display mt-2 text-ink"
          style={{ fontSize: "clamp(26px, 3.4vw, 40px)", lineHeight: 1.08, letterSpacing: "-0.8px" }}
        >
          {signal.product}
        </h1>

        <SignalDisclaimer full className="mt-5" badge={t("badge")} disclaimer={t("disclaimer")} />

        {signal.description && (
          <p className="mt-6 text-[15px] leading-relaxed text-slate">
            {signal.description}
          </p>
        )}

        {/* What Ponte currently knows: the extracted facts, nothing more. */}
        <section className="mt-8">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.4px] text-ink">
            {t("detail.knownHeading")}
          </h2>
          <div className="mt-3 rounded-glass border border-hairline bg-glass px-4">
            <Fact label={t("detail.fact.side")} value={sideLabel} notStated={notStated} />
            <Fact
              label={t("detail.fact.quantity")}
              value={
                signal.quantity
                  ? `${signal.quantity}${signal.unit ? ` ${signal.unit}` : ""}`
                  : null
              }
              notStated={notStated}
            />
            <Fact label={t("detail.fact.corridor")} value={corridor} notStated={notStated} />
            <Fact label={t("detail.fact.incoterm")} value={signal.incoterm} notStated={notStated} />
            <Fact label={t("detail.fact.payment")} value={signal.payment} notStated={notStated} />
            <Fact label={t("detail.fact.hsCode")} value={signal.hsCode} notStated={notStated} />
            <Fact
              label={t("detail.fact.signalDate")}
              value={formatPosted(signal.spottedAt, locale)}
              notStated={notStated}
            />
          </div>
        </section>

        {/* What Ponte has NOT established. The limits, stated plainly. */}
        <section className="mt-7">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.4px] text-ink">
            {t("detail.unknownHeading")}
          </h2>
          <ul className="mt-3 space-y-2">
            {(["u1", "u2", "u3", "u4"] as const).map((k) => (
              <li key={k} className="flex items-start gap-2.5 text-[13.5px] text-muted">
                <span className="mt-0.5 shrink-0 text-muted">
                  <Icon name="lock" size={14} />
                </span>
                {t(`detail.unknowns.${k}`)}
              </li>
            ))}
          </ul>
        </section>

        {/* Primary and contextual CTA. Both open the structured investigation
            request behind the account gate (brief Block D). Neither reveals or
            contacts the third party behind the signal. The secondary is the
            same request, role-primed for the side that would respond. */}
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <InvestigateButton signalId={signal.id} label={t("cta.askPonte")} />
          <InvestigateButton
            signalId={signal.id}
            label={signal.side === "requirement" ? t("cta.secondarySupply") : t("cta.secondaryBuy")}
            variant="secondary"
            initialType={signal.side === "requirement" ? "supplier" : "buyer"}
          />
        </div>
      </div>
    </div>
  );
}

async function Tombstone() {
  const t = await getTranslations("marketSignals");
  return (
    <div className="container-px py-20">
      <div className="mx-auto max-w-md rounded-glass border border-hairline bg-glass p-10 text-center">
        <p className="text-[15px] text-muted">{t("detail.tombstone")}</p>
        <Link
          href="/market-signals"
          className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.4px] text-lime hover:opacity-80"
        >
          {t("label")}
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
