import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Icon, type SystemIconName } from "@/components/icons";
import BridgeStage, { type StageLabels } from "@/components/home/BridgeStage";
import LiveDealsStrip from "@/components/home/LiveDealsStrip";
import LiveDealsGrid from "@/components/home/LiveDealsGrid";
import type { DealLabels } from "@/components/home/LiveDealCard";
import {
  COUNT_MIN,
  SHOWCASE_MIN,
  countriesIn,
  getLiveDeals,
  type LiveDeal,
} from "@/lib/board/live-deals";
import { alternatesFor } from "@/lib/seo";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { locale: any } }) {
  const t = await getTranslations({ locale: params.locale, namespace: "home" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor("/", params.locale),
  };
}

/**
 * The front door, rebuilt to Ponte_Landing_design.html.
 *
 * ---------------------------------------------------------------------------
 * What was adapted, and why
 * ---------------------------------------------------------------------------
 * The design is desktop only. It carries no media queries at all, just a
 * clamped heading, and at 390px 192 of its elements sit outside the viewport.
 * Every section here is therefore laid out mobile first and allowed to become
 * the design's desktop composition from `md` up, rather than being scaled
 * down into it. Traders open these links from WhatsApp, on a phone.
 *
 * ---------------------------------------------------------------------------
 * "Free", used accurately
 * ---------------------------------------------------------------------------
 * The design says "Free." on the hero and "Free platform. No commission." over
 * the price list. Both are too broad to be true. Free is the marketplace:
 * joining, browsing, posting an offer or a requirement, connecting with a
 * counterparty, and closing a deal yourself without commission. Not free:
 * verification and intelligence, which cost credits, and the desk, which is a
 * success fee or a retainer. The copy here says the first and never implies
 * the second.
 *
 * ---------------------------------------------------------------------------
 * Real deals, or labelled examples
 * ---------------------------------------------------------------------------
 * The design is drawn with a full board of sample cards. Ours has one approved
 * listing. Every deal surface below reads `getLiveDeals()` and falls back to a
 * labelled format example, never to a sample dressed as inventory. The strip
 * and grid appear once there is a market to show.
 */

/** The four things a verification reads, in the order the design lists them. */
const CHECKS: { key: string; icon: SystemIconName }[] = [
  { key: "registers", icon: "registry" },
  { key: "sanctions", icon: "scan" },
  { key: "identifiers", icon: "globe" },
  { key: "anonymous", icon: "lock" },
];

/** Credit-priced actions. Prices come from one place, never retyped. */
const PRICES = [
  { key: "verify", n: 2 },
  { key: "room", n: 1 },
  { key: "report", n: 60 },
] as const;

/**
 * The format example the hero falls back to before the board fills. Same
 * notation a real listing uses, and labelled as an example wherever it shows.
 */
const EXAMPLE_DEAL: LiveDeal = {
  id: "example",
  ref: null,
  source: "member",
  type: "offer",
  product: "Refined white sugar, ICUMSA 45",
  hsCode: "1701.99",
  chapter: "17",
  chapterTitle: null,
  quantity: "25,000",
  unit: "MT",
  incoterm: "CIF",
  originText: "Brazil",
  destinationText: "Netherlands",
  originCode: "BR",
  destinationCode: "NL",
  postedAt: "2026-07-22T09:00:00Z",
  verificationLevel: null,
  href: null,
};

export default async function HomePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations("landing");
  const th = await getTranslations("home");
  const tm = await getTranslations("marketplace");

  const deals = await getLiveDeals();
  const showcaseLive = deals.length >= SHOWCASE_MIN;
  const countries = countriesIn(deals);
  const showCount = deals.length >= COUNT_MIN && countries.length > 0;

  // The hero carries a real deal the moment there is one. Until then it
  // carries the example, and says so.
  const heroDeal = deals[0] ?? EXAMPLE_DEAL;
  const heroIsReal = deals.length > 0;

  const dealLabels: DealLabels = {
    offer: tm("type.offer"),
    requirement: tm("type.requirement"),
    service: tm("type.service"),
    notStated: tm("notStated"),
    deskSourced: th("showcase.deskSourced"),
    tier: {
      1: tm("trust.level1"),
      2: tm("trust.level2"),
      3: tm("trust.level3"),
      4: tm("trust.level4"),
    },
  };

  const stageLabels: StageLabels = {
    offer: tm("type.offer"),
    requirement: tm("type.requirement"),
    notStated: tm("notStated"),
    counterparty: t("stage.counterparty"),
    trustLabel: t("stage.trustLabel"),
    clear: t("stage.clear"),
    unverified: tm("trust.none"),
    anonymous: t("verify.anonymousDetail"),
    readOn: t("stage.readOn", { date: "{date}" }),
    openRoom: t("stage.openRoom"),
    sampleNote: heroIsReal ? null : t("stage.sampleNote"),
    tier: dealLabels.tier,
  };

  return (
    <>
      {/* ============ HERO ============ */}
      <header className="container-px relative overflow-hidden pb-10 pt-10 sm:pb-14 sm:pt-14">
        {/* Static glows. The design's two blooms, no infinite blur loop. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-64 h-[640px] w-[640px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(139,107,255,.20), transparent 70%)" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 top-40 h-[520px] w-[520px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(203,251,94,.08), transparent 70%)" }}
        />

        <div className="relative">
          <p className="pill rise" style={{ ["--i" as string]: 0 }}>
            {t("eyebrow")}
          </p>

          <h1
            className="display mt-4 text-ink rise"
            style={{
              ["--i" as string]: 1,
              // The design's 89.6px at 1265, down to something a 390 screen
              // can actually hold a line of.
              fontSize: "clamp(40px, 7.2vw, 90px)",
              lineHeight: 0.98,
              letterSpacing: "-0.034em",
            }}
          >
            {t("h1")}
          </h1>

          <p
            className="mt-4 max-w-xl text-[15px] font-medium leading-relaxed text-muted rise sm:text-[17px]"
            style={{ ["--i" as string]: 2 }}
          >
            {t("sub")}
          </p>

          {/* Full-width stacked buttons on a phone: a 44px target you can hit
              with a thumb beats two side by side that you cannot. */}
          <div
            className="mt-7 flex flex-col gap-2.5 rise sm:flex-row sm:flex-wrap sm:items-center"
            style={{ ["--i" as string]: 3 }}
          >
            <Link href="/marketplace" className="btn-primary w-full justify-center sm:w-auto">
              {t("ctaPrimary")}
              <Icon name="chevron" size={16} />
            </Link>
            <Link href="/verification" className="btn-ghost w-full justify-center sm:w-auto">
              {t("ctaSecondary")}
            </Link>
          </div>
        </div>
      </header>

      {/* ============ THE STAGE ============ */}
      <section className="container-px pb-12 sm:pb-16">
        <div className="rise" style={{ ["--i" as string]: 4 }}>
          <BridgeStage
            deal={heroDeal}
            labels={stageLabels}
            locale={params.locale}
            trustScore={null}
          />
        </div>
      </section>

      {/* ============ THE BOARD, MOVING ============
          Real approved inventory only, and only once there is a market. */}
      {showcaseLive && (
        <section className="border-y border-hairline-soft bg-white/[0.015] py-8">
          <div className="container-px mb-5 flex flex-wrap items-baseline justify-between gap-3">
            <p className="eyebrow">{th("showcase.eyebrow")}</p>
            {showCount && (
              <p className="text-[12.5px] text-muted">
                {th("showcase.count", {
                  deals: deals.length,
                  countries: countries.length,
                })}
              </p>
            )}
          </div>
          <LiveDealsStrip deals={deals} labels={dealLabels} locale={params.locale} />
        </section>
      )}

      {/* ============ VERIFICATION ============ */}
      <section className="container-px py-12 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-14">
          <div>
            <h2
              className="display text-ink"
              style={{ fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.05, letterSpacing: "-0.032em" }}
            >
              {t("verify.heading")}
            </h2>

            <ul className="mt-6 space-y-0">
              {CHECKS.map((c) => (
                <li
                  key={c.key}
                  className="flex items-start gap-3 border-b border-hairline-soft py-3.5 last:border-0"
                >
                  <span className="mt-0.5 shrink-0 text-cyan">
                    <Icon name={c.icon} size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-ink">
                      {t(`verify.${c.key}`)}
                    </span>
                    <span className="block text-[12.5px] leading-snug text-muted">
                      {t(`verify.${c.key}Detail`)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <Link
              href="/verification"
              className="eyebrow mt-5 inline-flex items-center gap-1.5 transition-opacity hover:opacity-80"
            >
              {t("verify.cta")} <Icon name="chevron" size={13} />
            </Link>
          </div>

          {/* The tier ramp. On a phone it sits under the list, not beside it. */}
          <div className="rounded-glass border border-hairline bg-glass p-5 sm:p-7">
            <p className="label">{t("verify.trustLabel")}</p>
            <div className="mt-4 space-y-2.5">
              {([1, 2, 3, 4] as const).map((lvl) => (
                <div key={lvl} className="flex items-center gap-3">
                  <span className={`tier tier-${lvl} shrink-0`}>L{lvl}</span>
                  <span className="text-[13px] text-slate">{dealLabels.tier[lvl]}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 border-t border-hairline-soft pt-4 text-[12px] leading-relaxed text-muted">
              {th("proof.caveat")}
            </p>
          </div>
        </div>
      </section>

      {/* ============ THE WRITE-UP ============ */}
      <section className="container-px border-t border-hairline-soft py-12 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-14">
          <div>
            <h2
              className="display text-ink"
              style={{ fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.05, letterSpacing: "-0.032em" }}
            >
              {t("ai.heading")}
            </h2>
            <p className="prov mt-4">
              <Icon name="ai" size={13} />
              {t("ai.provenance")}
            </p>
            <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-muted">
              {t("ai.body")}
            </p>
          </div>

          <div className="rounded-glass border border-hairline bg-white/[0.03] p-5 sm:p-6">
            <p className="label">{t("ai.descriptionLabel")}</p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink">{t("ai.sample")}</p>
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-hairline-soft pt-4">
              <span className="prov">
                <Icon name="ai" size={12} />
                {t("ai.provenance")}
              </span>
              <span className="btn-primary pointer-events-none !min-h-0 !px-4 !py-2 text-[12px]">
                {t("ai.publish")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ WHAT IS FREE, AND WHAT IS NOT ============ */}
      <section className="container-px border-t border-hairline-soft py-12 sm:py-16">
        <h2
          className="display max-w-3xl text-ink"
          style={{ fontSize: "clamp(26px, 3.4vw, 38px)", lineHeight: 1.08, letterSpacing: "-0.028em" }}
        >
          {t("pricing.heading")}
        </h2>
        <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-muted">
          {t("pricing.body")}
        </p>

        {/* The price list. Every credit action prints its own price, so a
            button can never guess one. */}
        <ul className="mt-7 grid gap-2.5 sm:grid-cols-3">
          {PRICES.map((p) => (
            <li
              key={p.key}
              className="flex items-center justify-between gap-3 rounded-field border border-hairline bg-glass px-4 py-3"
            >
              <span className="text-[13px] text-ink">{t(`pricing.${p.key}`)}</span>
              <span className="shrink-0 text-[12.5px] font-semibold text-violet-ink">
                {p.n === 1 ? t("pricing.credit", { n: p.n }) : t("pricing.credits", { n: p.n })}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-[12.5px] leading-relaxed text-muted">{t("pricing.desk")}</p>

        <div className="mt-7">
          <Link href="/marketplace/new" className="btn-primary w-full justify-center sm:w-auto">
            {t("pricing.cta")}
            <Icon name="chevron" size={16} />
          </Link>
        </div>
      </section>

      {/* ============ BROWSE ============ */}
      {showcaseLive && (
        <section className="container-px border-t border-hairline-soft py-12 sm:py-16">
          <h2 className="display text-[20px] text-ink">{th("showcase.gridHeading")}</h2>
          <LiveDealsGrid
            deals={deals}
            labels={dealLabels}
            locale={params.locale}
            allLabel={th("showcase.all")}
            seeAllLabel={th("showcase.seeAll")}
          />
        </section>
      )}
    </>
  );
}
