import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isRtl, type Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { landingFontVars } from "@/components/home/landing/fonts";
import ExploreChrome from "@/components/explore/ExploreChrome";
import RecordList from "@/components/explore/RecordList";
import { HS_CATEGORIES, type HsCategory } from "@/components/hs/hsCategories";
import { getMarketActivity } from "@/lib/board/market-activity";
import { inChapterRange, type ActivityItem } from "@/lib/board/activity-logic";
import { toBandItems, type ActivityLabels } from "@/lib/board/activity-view";
import {
  familyCounts,
  isFamilyKey,
  itemsInFamily,
  sectorCounts,
  type FamilyKey,
} from "@/lib/explore/families";
import "@/components/find/find.css";
import "@/components/explore/explore.css";

/**
 * Explore the market (North Star entry architecture, section 7).
 *
 * The first Explore screen is the market universe: three families, and under
 * Products the approved HS sectors as containers carrying real counts. It is
 * emphatically not the old Qualified-Opportunities-first result, and it never
 * answers curiosity with an empty lane.
 *
 * This is the PR 1 shell. It supports the entry screen, one level of sector
 * activity, the two non-product families and a text search, all on stable
 * shareable URLs that Back navigates correctly because every view is a link:
 *
 *   /explore                  the universe
 *   /explore?sector=<id>      one HS sector's recent market activity
 *   /explore?family=services  trade services
 *   /explore?family=distribution   distribution and representation
 *   /explore?q=<text>         records matching the text, across everything
 *
 * The full chapter / subcategory / product drill-down, filters and progressive
 * loading are PR 2 and PR 3. Nothing here promises them.
 *
 * Data: one call to getMarketActivity, which is two bounded reads reusing the
 * existing public rule-filtered queries. There is no query per sector, and no
 * record read here that a visitor could not already see on a public surface.
 * No account is required for anything on this page.
 */

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

/** How many records a list shows before PR 2's pagination exists. */
const LIST_LIMIT = 40;

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "explore" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    alternates: alternatesFor("/explore", params.locale),
  };
}

function first(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  const trimmed = v?.trim();
  return trimmed ? trimmed : null;
}

/** Text match over the facts a record actually states. */
function matchesQuery(item: ActivityItem, query: string): boolean {
  const needle = query.toLowerCase();
  return [item.product, item.originText, item.destinationText]
    .filter(Boolean)
    .some((field) => (field as string).toLowerCase().includes(needle));
}

export default async function ExplorePage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: SP;
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations({ locale: params.locale, namespace: "explore" });
  const th = await getTranslations({ locale: params.locale, namespace: "home" });

  const query = first(searchParams.q);
  const familyParam = first(searchParams.family);
  const family: FamilyKey | null = isFamilyKey(familyParam) ? familyParam : null;
  const sectorId = Number(first(searchParams.sector));
  const sector: HsCategory | null =
    Number.isFinite(sectorId) && first(searchParams.sector) !== null
      ? (HS_CATEGORIES.find((c) => c.id === sectorId) ?? null)
      : null;

  const { items, capped } = await getMarketActivity();

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

  const listLabels = { view: t("record.view"), listLabel: t("record.listLabel") };
  const now = Date.now();

  // Which records this view is about, and what it is called.
  let shown: ActivityItem[] = items;
  let heading = t("universe.title");
  let lead = t("universe.lead");

  if (sector) {
    shown = inChapterRange(items, sector.min, sector.max);
    heading = sector.label;
    lead = t("sector.lead", { range: sector.range });
  } else if (family) {
    shown = itemsInFamily(items, family);
    heading = t(`families.${family}.title`);
    lead = t(`families.${family}.lead`);
  }
  if (query) {
    shown = shown.filter((item) => matchesQuery(item, query));
    heading = t("results.title", { query });
    lead = t("results.lead");
  }

  const isUniverse = !sector && !family && !query;
  const records = toBandItems(shown.slice(0, LIST_LIMIT), now, labels);
  const families = familyCounts(items);
  const sectors = sectorCounts(items, HS_CATEGORIES);
  const busiest = Math.max(...sectors.map((s) => s.counts.total), 0);

  return (
    <div className={`ponte-find ${landingFontVars}`} dir={isRtl(params.locale) ? "rtl" : "ltr"}>
      <ExploreChrome>
        <nav className="excrumb" aria-label={t("crumb.label")}>
          <Link href="/">{t("crumb.home")}</Link>
          <span aria-hidden="true">/</span>
          {isUniverse ? (
            <span>{t("crumb.explore")}</span>
          ) : (
            <>
              <Link href="/explore">{t("crumb.explore")}</Link>
              <span aria-hidden="true">/</span>
              <span>{heading}</span>
            </>
          )}
        </nav>

        <header className="exhead">
          <div className="exhead__eb">
            <span className="exhead__rule" aria-hidden="true" />
            <span className="eyebrow">{t("eyebrow")}</span>
          </div>
          <h1 className="exhead__h serif">{heading}</h1>
          <p className="exhead__d">{lead}</p>
          <p className="exhead__note">
            {t("countsNote")}
            {capped ? ` ${t("cappedNote")}` : ""}
          </p>
        </header>

        {/* A plain GET form: search works with no JavaScript, keeps a stable
            URL, and Back returns to where the visitor was. */}
        <section className="exsearch" aria-label={t("search.label")}>
          <form className="exsearch__f" action="/explore" method="get">
            {sector && <input type="hidden" name="sector" value={String(sector.id)} />}
            {family && <input type="hidden" name="family" value={family} />}
            <input
              className="exsearch__i"
              type="search"
              name="q"
              defaultValue={query ?? ""}
              placeholder={t("search.placeholder")}
              aria-label={t("search.label")}
            />
            <button className="exsearch__b" type="submit">
              {t("search.go")}
            </button>
          </form>
        </section>

        {isUniverse && (
          <>
            <section className="exsec" aria-label={t("universe.familiesTitle")}>
              <div className="exsec__h">
                <h2 className="exsec__t">{t("universe.familiesTitle")}</h2>
              </div>
              <div className="exfam">
                <span className="exfam__i">
                  <span className="exfam__t">{t("families.products.title")}</span>
                  <span className="exfam__n">
                    {t("records", { count: families.products.toLocaleString("en-US") })}
                  </span>
                  <span className="exfam__d">{t("families.products.lead")}</span>
                </span>
                <Link className="exfam__i" href="/explore?family=services">
                  <span className="exfam__t">{t("families.services.title")}</span>
                  <span className="exfam__n">
                    {t("records", { count: families.services.toLocaleString("en-US") })}
                  </span>
                  <span className="exfam__d">{t("families.services.lead")}</span>
                </Link>
                <Link className="exfam__i" href="/explore?family=distribution">
                  <span className="exfam__t">{t("families.distribution.title")}</span>
                  <span className="exfam__n">{t("noCount")}</span>
                  <span className="exfam__d">{t("families.distribution.lead")}</span>
                </Link>
              </div>
            </section>

            <section className="exsec" aria-label={t("universe.sectorsTitle")}>
              <div className="exsec__h">
                <h2 className="exsec__t">{t("universe.sectorsTitle")}</h2>
                <span className="exsec__n">{t("universe.sectorsNote")}</span>
              </div>
              <ul className="exuni">
                {sectors.map(({ sector: cat, counts }) => {
                  const busy = counts.total > 0 && counts.total >= busiest / 2;
                  const tone = counts.total === 0 ? " exsector--quiet" : busy ? " exsector--busy" : "";
                  const body = (
                    <>
                      <span className={`exsector__disc`} aria-hidden="true">
                        <svg viewBox="0 0 24 24">{cat.icon}</svg>
                      </span>
                      <span className="exsector__t">{cat.label}</span>
                      <span className="exsector__n">
                        {t("records", { count: counts.total.toLocaleString("en-US") })}
                      </span>
                      {counts.total > 0 && (
                        <span className="exsector__b">
                          {t("breakdown", {
                            demand: counts.demand,
                            supply: counts.supply,
                            signals: counts.signals,
                          })}
                        </span>
                      )}
                    </>
                  );
                  return (
                    <li key={cat.id}>
                      {counts.total > 0 ? (
                        <Link className={`exsector${tone}`} href={`/explore?sector=${cat.id}`}>
                          {body}
                        </Link>
                      ) : (
                        // No records yet: a container, not a link. A link into
                        // an empty sector would be a button that leads nowhere.
                        <span className={`exsector${tone}`}>{body}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}

        <section className="exsec" aria-label={t("activity.title")}>
          <div className="exsec__h">
            <h2 className="exsec__t">{t("activity.title")}</h2>
            <span className="exsec__n">
              {t("records", { count: shown.length.toLocaleString("en-US") })}
            </span>
          </div>
          <p className="exsec__d">{t("activity.lead")}</p>

          <RecordList items={records} labels={listLabels} />

          {records.length === 0 && (
            <div className="exempty">
              <p className="exempty__p">
                {family === "distribution" ? t("families.distribution.empty") : t("activity.empty")}
              </p>
            </div>
          )}
          {shown.length > records.length && (
            <p className="exsec__d">{t("activity.more", { shown: records.length })}</p>
          )}
        </section>

        <section className="exdeal" aria-label={t("deal.title")}>
          <div>
            <p className="exdeal__t">{t("deal.title")}</p>
            <p className="exdeal__d">{t("deal.lead")}</p>
          </div>
          <Link className="fbtn" href="/structure">
            {t("deal.cta")}
          </Link>
        </section>
      </ExploreChrome>
    </div>
  );
}
