import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isRtl, type Locale } from "@/i18n/routing";
import { landingFontVars } from "@/components/home/landing/fonts";
import FindChrome from "@/components/find/FindChrome";
import QoRow from "@/components/find/QoRow";
import SignalRow from "@/components/find/SignalRow";
import HsProductPicker from "@/components/find/HsProductPicker";
import { getLiveDeals } from "@/lib/board/live-deals";
import { searchMarketSignals } from "@/lib/board/market-signals";
import { parseFindQuery, buildFindHref, matchesFindQuery, type FindQuery } from "@/lib/find/query";
import "@/components/find/find.css";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "find" });
  return { title: t("meta.title"), description: t("meta.description") };
}

export default async function FindPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: SP;
}) {
  setRequestLocale(params.locale);
  const q = parseFindQuery(searchParams);

  return (
    <div className={`ponte-find ${landingFontVars}`} dir={isRtl(params.locale) ? "rtl" : "ltr"}>
      <FindChrome current="opportunities">
        {!q.product ? <Entry /> : <Results q={q} />}
      </FindChrome>
    </div>
  );
}

/** The Find entry: no product yet, so choose one (tap, voice, or type). */
async function Entry() {
  const t = await getTranslations("find");
  return (
    <section className="fphead" aria-label={t("entry.title")} style={{ borderBottom: "none" }}>
      <div className="fphead__eb">
        <span className="fphead__rule" aria-hidden="true" />
        <span className="eyebrow">{t("entry.eyebrow")}</span>
      </div>
      <h1 className="fphead__h serif">{t("entry.title")}</h1>
      <p className="fphead__def">{t("entry.lead")}</p>
      <div style={{ marginTop: 24 }}>
        <HsProductPicker
          labels={{
            chaptersLabel: t("entry.chaptersLabel"),
            searchPlaceholder: t("entry.searchPlaceholder"),
            back: t("entry.back"),
            voice: t("entry.voice"),
            noMatch: t("entry.noMatch"),
            hint: t("entry.pickerHint"),
          }}
        />
      </div>
    </section>
  );
}

/** The intent segmented control, rendered as links so it works without JS. */
function IntentSeg({
  q,
  ariaLabel,
  items,
}: {
  q: FindQuery;
  ariaLabel: string;
  items: { key: FindQuery["intent"]; label: string }[];
}) {
  return (
    <div className="fseg" role="group" aria-label={ariaLabel}>
      {items.map((it) => (
        <Link
          key={it.label}
          className="fseg__b"
          aria-pressed={q.intent === it.key}
          href={buildFindHref({ ...q, intent: it.key ?? undefined })}
        >
          {it.label}
        </Link>
      ))}
    </div>
  );
}

async function Results({ q }: { q: FindQuery }) {
  const t = await getTranslations("find");
  const product = q.product as string;
  // The Market Signal lane has no "service" equivalent, so a service filter
  // simply yields no signals; buy/sell narrows the side.
  const side = q.intent === "offer" ? "offer" : q.intent === "requirement" ? "requirement" : null;

  const [board, signals] = await Promise.all([
    getLiveDeals(60),
    searchMarketSignals({ product, side, limit: 40 }),
  ]);
  const deals = board.filter((d) => matchesFindQuery(d, q));

  const qoBase = {
    kind: t("qualified.kind"),
    view: t("qualified.view"),
    buy: t("facts.buy"),
    sell: t("facts.sell"),
    service: t("facts.service"),
    notStated: t("facts.notStated"),
  };
  const sigLabels = {
    kind: t("signals.kind"),
    disclaimer: t("signals.disclaimer"),
    notStated: t("facts.notStated"),
  };

  return (
    <>
      <section className="fphead">
        <div className="fphead__eb">
          <span className="fphead__rule" aria-hidden="true" />
          <span className="eyebrow">{t("results.eyebrow")}</span>
        </div>
        <h1 className="fphead__h serif">{t("results.titleFor", { product })}</h1>
        <p className="fphead__def">{t("results.definition")}</p>
      </section>

      <div className="fctx">
        <div className="fctx__crumbs">
          <span>
            {t("results.crumbProduct")}: <b>{product}</b>
          </span>
          {q.market && (
            <span>
              · {t("results.crumbMarket")}: <b>{q.market}</b>
            </span>
          )}
        </div>
        <Link className="fctx__edit" href="/find">
          {t("results.editSearch")}
        </Link>
        <span className="fctx__spacer" />
        <IntentSeg
          q={q}
          ariaLabel={t("results.crumbIntent")}
          items={[
            { key: null, label: t("results.intentAll") },
            { key: "requirement", label: t("results.intentRequirement") },
            { key: "offer", label: t("results.intentOffer") },
            { key: "service", label: t("results.intentService") },
          ]}
        />
      </div>

      <div className="flanes">
        <section className="flane flane--qo" aria-label={t("qualified.laneTitle")}>
          <div className="flane__head">
            <h2 className="flane__t serif">
              <span className="g-dot" aria-hidden="true" />
              {t("qualified.laneTitle")}
            </h2>
            <span className="flane__n">{t("qualified.count", { count: deals.length })}</span>
          </div>
          {deals.length > 0 ? (
            deals.map((d) => (
              <QoRow
                key={d.id}
                deal={d}
                href={`/find/o/${d.ref}`}
                labels={{ ...qoBase, ref: t("qualified.ref", { ref: d.ref ?? "" }) }}
              />
            ))
          ) : (
            <div className="fstate">
              <span className="fstate__badge">{t("qualified.emptyBadge")}</span>
              <h3 className="fstate__h serif">{t("qualified.emptyTitle")}</h3>
              <p className="fstate__p">{t("qualified.emptyBody")}</p>
              <Link className="fbtn fbtn--secondary" href="/marketplace/new">
                {t("nav.submit")}
              </Link>
            </div>
          )}
        </section>

        <section className="flane flane--ms" aria-label={t("signals.laneTitle")}>
          <div className="flane__head">
            <h2 className="flane__t">{t("signals.laneTitle")}</h2>
            <span className="flane__n">{t("signals.count", { count: signals.length })}</span>
          </div>
          <p className="flane__note">{t("signals.note")}</p>
          {signals.length > 0 ? (
            signals.map((s) => <SignalRow key={s.id} signal={s} labels={sigLabels} />)
          ) : (
            <div className="fstate">
              <h3 className="fstate__h serif">{t("signals.emptyTitle")}</h3>
              <p className="fstate__p">{t("signals.emptyBody")}</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
