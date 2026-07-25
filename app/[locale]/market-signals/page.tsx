import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getMarketSignals } from "@/lib/board/market-signals";
import { fromSignal } from "@/lib/board/activity-logic";
import { toBandItems, type ActivityLabels } from "@/lib/board/activity-view";
import { alternatesFor } from "@/lib/seo";
import PonteShell from "@/components/shell/PonteShell";
import RecordList from "@/components/explore/RecordList";
import "@/components/explore/explore.css";
import "@/components/signals/signal.css";

export const dynamic = "force-dynamic";

/**
 * The public Market Signals board, in the shared Ponte Trade shell.
 *
 * It shows only approved, unexpired signals, because getMarketSignals will not
 * return anything else, and it says once and clearly at the top what the whole
 * board is: indications seen in the open market that Ponte has not confirmed.
 * Each row then carries the same "Market Signal" classification the activity
 * band and the Explore lists use, so the language never changes between
 * surfaces.
 *
 * Previously this rendered inside the legacy obsidian application, which framed
 * an unverified signal with vetted-marketplace chrome. That contradiction is
 * the reason PonteShell exists.
 */

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "marketSignals" });
  return {
    title: t("label"),
    description: t("board.intro"),
    alternates: alternatesFor("/market-signals", params.locale),
  };
}

export default async function MarketSignalsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations("marketSignals");
  const th = await getTranslations("home");
  const te = await getTranslations("explore");

  const signals = await getMarketSignals();

  const labels: ActivityLabels = {
    kind: {
      market_signal: th("kinds.marketSignal"),
      member_requirement: th("kinds.memberRequirement"),
      member_offer: th("kinds.memberOffer"),
      service_requirement: th("kinds.serviceRequirement"),
    },
    route: (from, to) => th("activity.route", { from, to }),
    today: th("activity.today"),
    daysAgo: (days) => th("activity.daysAgo", { days }),
  };
  const records = toBandItems(signals.map(fromSignal), Date.now(), labels);

  return (
    <PonteShell locale={params.locale} current="explore">
      <nav className="excrumb" aria-label={te("crumb.label")}>
        <Link href="/">{te("crumb.home")}</Link>
        <span aria-hidden="true">/</span>
        <Link href="/explore">{te("crumb.explore")}</Link>
        <span aria-hidden="true">/</span>
        <span>{t("label")}</span>
      </nav>

      <header className="exhead">
        <div className="exhead__eb">
          <span className="exhead__rule" aria-hidden="true" />
          <span className="sigkind">{t("label")}</span>
        </div>
        <h1 className="exhead__h serif">{t("board.heading")}</h1>
        <p className="sigunv">
          <b>{t("badge")}</b> {t("disclaimer")}
        </p>
        <p className="exhead__d">{t("board.intro")}</p>
      </header>

      <section className="exsec" aria-label={te("activity.title")}>
        <div className="exsec__h">
          <h2 className="exsec__t">{te("activity.title")}</h2>
          <span className="exsec__n">
            {te("records", { count: records.length.toLocaleString("en-US") })}
          </span>
        </div>

        <RecordList
          items={records}
          labels={{ view: te("record.view"), listLabel: te("record.listLabel") }}
        />

        {records.length === 0 && (
          <div className="exempty">
            <p className="exempty__p">{t("board.empty")}</p>
          </div>
        )}
      </section>

      <section className="exdeal" aria-label={te("deal.title")}>
        <div>
          <p className="exdeal__t">{te("deal.title")}</p>
          <p className="exdeal__d">{te("deal.lead")}</p>
        </div>
        <Link className="fbtn" href="/structure">
          {te("deal.cta")}
        </Link>
      </section>
    </PonteShell>
  );
}
