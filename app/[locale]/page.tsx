import { getTranslations, setRequestLocale } from "next-intl/server";
import { isRtl, type Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import PonteLanding, { type PopularArea } from "@/components/home/landing/PonteLanding";
import { landingFontVars } from "@/components/home/landing/fonts";
import PonteFooter from "@/components/PonteFooter";
import { HS_CATEGORIES } from "@/components/hs/hsCategories";
import { getMarketActivity } from "@/lib/board/market-activity";
import { toBandItems, type ActivityLabels } from "@/lib/board/activity-view";
import { busiestSectors } from "@/lib/explore/families";
import "@/components/home/landing/landing.css";

/**
 * The public entrance to Ponte Trade: "Ponte Trade - What's your deal?", the
 * North Star entry architecture (docs/ponte-authority/00-NORTH-STAR-ENTRY-
 * ARCHITECTURE.md).
 *
 * A thin server shell. It sets the locale, produces metadata, performs the two
 * bounded public reads the entrance needs (recent market activity, and the
 * sectors that activity is actually in), and mounts the interactive composition
 * inside a single .ponte-landing wrapper that scopes the Brand v5
 * heritage-light tokens locally, so the cream/gold editorial page never
 * disturbs the rest of the (obsidian) application.
 *
 * Reading here rather than in the client component is deliberate: the landing
 * issues no query from the browser, and every string the visitor reads about a
 * record is rendered once, on the server, so nothing drifts on hydration.
 *
 * The shared dark site chrome is hidden on this route by ChromeGate in the
 * locale layout, so the page renders full-bleed with its own header and
 * trust-line footer, as the design intends.
 */

// The band and the counts must reflect an approval the moment it happens; both
// readers already opt out of the Data Cache, and the page must not re-pin them.
export const dynamic = "force-dynamic";

/** How many records the band carries. Enough to look alive, few enough to read. */
const BAND_LIMIT = 14;
/** How many sectors the popular-areas row offers. */
const POPULAR_LIMIT = 6;

export async function generateMetadata({ params }: { params: { locale: Locale } }) {
  const t = await getTranslations({ locale: params.locale, namespace: "home" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor("/", params.locale),
  };
}

export default async function HomePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations({ locale: params.locale, namespace: "home" });

  const { items } = await getMarketActivity();

  const labels: ActivityLabels = {
    kind: {
      market_signal: t("kinds.marketSignal"),
      member_requirement: t("kinds.memberRequirement"),
      member_offer: t("kinds.memberOffer"),
      service_requirement: t("kinds.serviceRequirement"),
    },
    route: (from, to) => t("activity.route", { from, to }),
    today: t("activity.today"),
    daysAgo: (days) => t("activity.daysAgo", { days }),
  };

  const activity = toBandItems(items.slice(0, BAND_LIMIT), Date.now(), labels);

  const popular: PopularArea[] = busiestSectors(items, HS_CATEGORIES, POPULAR_LIMIT).map(
    ({ sector, counts }) => ({
      id: sector.id,
      label: sector.label,
      href: `/explore?sector=${sector.id}`,
      count: counts.total.toLocaleString("en-US"),
    }),
  );

  return (
    <div className={`ponte-landing ${landingFontVars}`}>
      <PonteLanding rtl={isRtl(params.locale)} activity={activity} popular={popular} />
      <PonteFooter />
    </div>
  );
}
