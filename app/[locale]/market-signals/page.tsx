import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getMarketSignals } from "@/lib/board/market-signals";
import { alternatesFor } from "@/lib/seo";
import SignalDisclaimer from "@/components/signals/SignalDisclaimer";
import SignalCard from "@/components/signals/SignalCard";
import {
  SIGNALS_BOARD_HEADING,
  SIGNALS_BOARD_INTRO,
  SIGNALS_BOARD_EMPTY,
  SIGNALS_NAV_LABEL,
} from "@/lib/market-signals/copy";

export const dynamic = "force-dynamic";

/**
 * The public Market Signals board (Definitive 1 August brief, Block A).
 *
 * A separate surface from Qualified Opportunities, on purpose: its own route,
 * its own record type, its own cards, and the mandatory "not verified" notice
 * above the first card. It shows only approved, unexpired signals, because
 * getMarketSignals will not return anything else.
 *
 * The chrome reads in English for now. Block E moves these strings into the
 * message fragments and rebuilds the locales; the mandatory disclaimer stays a
 * constant, the same way the verification disclaimer does.
 */

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  return {
    title: `${SIGNALS_NAV_LABEL} · Ponte`,
    description: SIGNALS_BOARD_INTRO,
    alternates: alternatesFor("/market-signals", params.locale),
  };
}

export default async function MarketSignalsPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const signals = await getMarketSignals();

  return (
    <div className="container-px py-14 md:py-20">
      <header className="max-w-3xl">
        <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.8px] text-slate">
          {SIGNALS_NAV_LABEL}
        </p>
        <h1
          className="display mt-3 text-ink"
          style={{ fontSize: "clamp(30px, 4vw, 46px)", lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          {SIGNALS_BOARD_HEADING}
          <span className="text-slate">.</span>
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">
          {SIGNALS_BOARD_INTRO}
        </p>
      </header>

      <SignalDisclaimer full className="mt-7 max-w-3xl" />

      {signals.length === 0 ? (
        <div className="mt-8 rounded-glass border border-hairline bg-glass p-8 text-[14px] leading-relaxed text-muted">
          {SIGNALS_BOARD_EMPTY}
        </div>
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {signals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} locale={params.locale} />
          ))}
        </div>
      )}
    </div>
  );
}
