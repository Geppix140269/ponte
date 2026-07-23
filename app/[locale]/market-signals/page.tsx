import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getMarketSignals } from "@/lib/board/market-signals";
import { alternatesFor } from "@/lib/seo";
import SignalDisclaimer from "@/components/signals/SignalDisclaimer";
import SignalCard, { type SignalCardLabels } from "@/components/signals/SignalCard";

export const dynamic = "force-dynamic";

/**
 * The public Market Signals board (Definitive 1 August brief, Block A).
 *
 * A separate surface from Qualified Opportunities, on purpose: its own route,
 * its own record type, its own cards, and the mandatory "not verified" notice
 * above the first card. It shows only approved, unexpired signals, because
 * getMarketSignals will not return anything else.
 *
 * The chrome, the mandatory badge and the mandatory disclaimer all read from
 * the "marketSignals" message namespace and are localised across the ten
 * locales. The brief (1.2) requires the badge and disclaimer to be shown and
 * preserves their meaning; it does not require them to stay in English, so they
 * are translated like the rest of the surface.
 */

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "marketSignals" });
  // The root layout template already appends " | Ponte Trade"; no brand suffix
  // here, so the title never carries the brand twice.
  return {
    title: t("label"),
    description: t("board.intro"),
    alternates: alternatesFor("/market-signals", params.locale),
  };
}

export default async function MarketSignalsPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("marketSignals");
  const signals = await getMarketSignals();

  const cardLabels: SignalCardLabels = {
    marker: t("card.marker"),
    view: t("card.view"),
    notStated: t("card.notStated"),
    sideBuyer: t("card.sideBuyer"),
    sideSeller: t("card.sideSeller"),
  };

  return (
    <div className="container-px py-14 md:py-20">
      <header className="max-w-3xl">
        <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.8px] text-slate">
          {t("label")}
        </p>
        <h1
          className="display mt-3 text-ink"
          style={{ fontSize: "clamp(30px, 4vw, 46px)", lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          {t("board.heading")}
          <span className="text-slate">.</span>
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">
          {t("board.intro")}
        </p>
      </header>

      <SignalDisclaimer full className="mt-7 max-w-3xl" badge={t("badge")} disclaimer={t("disclaimer")} />

      {signals.length === 0 ? (
        <div className="mt-8 rounded-glass border border-hairline bg-glass p-8 text-[14px] leading-relaxed text-muted">
          {t("board.empty")}
        </div>
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {signals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} locale={params.locale} labels={cardLabels} />
          ))}
        </div>
      )}
    </div>
  );
}
