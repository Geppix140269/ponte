import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import ProcessFlow from "@/components/ProcessFlow";
import Reveal from "@/components/Reveal";
import { Icon, type SystemIconName } from "@/components/icons";
import TradeRouteMap from "@/components/home/TradeRouteMap";
import LiveDealsStrip from "@/components/home/LiveDealsStrip";
import LiveDealsGrid from "@/components/home/LiveDealsGrid";
import type { DealLabels } from "@/components/home/LiveDealCard";
import {
  COUNT_MIN,
  SHOWCASE_MIN,
  countriesIn,
  getLiveDeals,
  routesIn,
} from "@/lib/board/live-deals";
import { alternatesFor } from "@/lib/seo";

// The showcase reads the board, so the page cannot be fully static. A minute
// is close enough to live for a homepage and keeps it off the database on
// every request.
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
 * The front door for a commodity trader.
 *
 * Two rules govern this page and they are not stylistic:
 *   - No volume, member count or deal value is stated unless it is real. The
 *     live count appears only above COUNT_MIN, and never as an estimate.
 *   - The example cards are format examples, labelled as such in the copy and
 *     in the markup. They demonstrate the notation a listing is written in.
 *     They are never presented as live inventory.
 *
 * ---------------------------------------------------------------------------
 * The two states of this page
 * ---------------------------------------------------------------------------
 * The showcase (route map, live strip, preview grid) is driven entirely by
 * real approved deals. Below SHOWCASE_MIN there is no market to show, so:
 *
 *   Board thin  ->  hero shows the format-example card, the format-examples
 *                   section explains how a listing is written, no showcase.
 *   Board live  ->  hero shows the real trade-route map, the strip and grid
 *                   carry real deals, and the format-examples section stands
 *                   down because real deals demonstrate the format better
 *                   than invented ones.
 *
 * The page moves between those states on its own as deals are approved or
 * imported. Nothing here is ever seeded to make the board look busier than
 * it is: an empty showcase is correct output, not a bug to paper over.
 */

/** Registers and identifiers read by a verification. Names stay untranslated
 *  where they are proper nouns; the qualifier line is translated. */
const REGISTRIES = ["reg1", "reg2", "reg3"] as const;
const SANCTIONS = ["s1", "s2", "s3", "s4"] as const;

/** Codes are identical in every language: incoterms, ISO country codes and HS
 *  headings never get translated, so they live here rather than in messages. */
const EXAMPLES = [
  {
    key: "e1",
    type: "offer",
    hs: "1701.99",
    incoterm: "CIF",
    origin: "BR",
    destination: "NL",
  },
  {
    key: "e2",
    type: "requirement",
    hs: "3102.10",
    incoterm: "FOB",
    origin: "EG",
    destination: "BR",
  },
  {
    key: "e3",
    type: "offer",
    hs: "7601.10",
    incoterm: "FOB",
    origin: "AE",
    destination: "TR",
  },
] as const;

/** The three things a visitor gets, keyed to the hero benefit strings. */
const BENEFITS: { key: string; icon: SystemIconName }[] = [
  { key: "hero.b1", icon: "post" },
  { key: "hero.b2", icon: "credit" },
  { key: "hero.b3", icon: "lock" },
];

/**
 * The signature element: two piers and a span, drawn once on load. Origin
 * pier lime, destination pier cyan, exactly as the mark is built.
 */
function RouteArc({ from, to }: { from: string; to: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flag-chip">{from}</span>
      <svg viewBox="0 0 180 22" className="h-[18px] flex-1" aria-hidden="true">
        <path
          d="M6 16 C 64 3, 116 3, 174 16"
          fill="none"
          stroke="#8B6BFF"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="route-draw"
          style={{ ["--len" as string]: 172 }}
        />
        <circle cx="6" cy="16" r="3" fill="#CBFB5E" />
        <circle cx="174" cy="16" r="3" fill="#3FE0C5" />
      </svg>
      <span className="flag-chip">{to}</span>
    </div>
  );
}

export default async function HomePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations("home");
  // Side, tier and "not stated" already exist in ten languages under the
  // marketplace namespace, because the board says the same words. Reusing
  // them means the showcase added one new string to translate, not nine.
  const tm = await getTranslations("marketplace");
  const hero = EXAMPLES[0];

  const deals = await getLiveDeals();
  const showcaseLive = deals.length >= SHOWCASE_MIN;
  const routes = routesIn(deals);
  const countries = countriesIn(deals);
  // A count is a claim about size. Printed only when it is real and worth
  // printing, and it needs both numbers to be a sentence.
  const showCount = deals.length >= COUNT_MIN && countries.length > 0;

  const dealLabels: DealLabels = {
    offer: tm("type.offer"),
    requirement: tm("type.requirement"),
    service: tm("type.service"),
    notStated: tm("notStated"),
    deskSourced: t("showcase.deskSourced"),
    tier: {
      1: tm("trust.level1"),
      2: tm("trust.level2"),
      3: tm("trust.level3"),
      4: tm("trust.level4"),
    },
  };

  return (
    <>
      {/* ============ 1. WHAT THIS IS ============ */}
      <header className="container-px pb-12 pt-12 md:pt-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] lg:items-center lg:gap-14">
          <div className="max-w-2xl">
            <p className="pill rise" style={{ ["--i" as string]: 0 }}>
              {t("hero.eyebrow")}
            </p>

            <h1
              className="display mt-5 text-ink rise"
              style={{
                ["--i" as string]: 1,
                fontSize: "clamp(34px, 5vw, 58px)",
                lineHeight: 1.02,
                letterSpacing: "-0.045em",
              }}
            >
              {t("hero.title")}
            </h1>

            <p
              className="mt-5 max-w-xl text-[16px] leading-relaxed text-muted rise"
              style={{ ["--i" as string]: 2 }}
            >
              {t("hero.lead")}
            </p>

            {/*
              The board first, posting second. A visitor who has not seen a
              listing has no reason to write one, and the bundle's hero puts
              the lime on "explore" for exactly that reason.
            */}
            <div
              className="mt-8 flex flex-wrap items-center gap-3 rise"
              style={{ ["--i" as string]: 3 }}
            >
              <Link href="/marketplace" className="btn-primary">
                {t("hero.ctaPrimary")}
                <Icon name="chevron" size={16} />
              </Link>
              <Link href="/marketplace/new" className="btn-ghost">
                {t("hero.ctaSecondary")}
              </Link>
            </div>

            {/*
              Three across even at 390, so the deal card clears the fold on a
              phone the way it does in the bundle. The strings here run much
              longer than the bundle's own ("Anonymous until you both agree"
              against "NCNDA first") and have to survive another +30% for
              i18n, so the tiles wrap and grow rather than truncate.
            */}
            <ul
              className="mt-8 grid grid-cols-3 gap-2 rise"
              style={{ ["--i" as string]: 5 }}
            >
              {BENEFITS.map((b) => (
                <li key={b.key} className="glass-tight px-3 py-3">
                  <Icon name={b.icon} size={16} className="text-lime" />
                  <p className="mt-2 text-[11.5px] font-semibold leading-snug text-ink sm:text-[12.5px]">
                    {t(b.key)}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/*
            The hero visual, in its two states.

            Live board: the real corridors, drawn. It is the strongest thing
            this page can say, because every arc is a deal somebody actually
            posted.

            Thin board: the shape of a listing as one card, same data as the
            format examples below and carrying the same label. Not a
            placeholder for the map, a different and honest answer to "what is
            this", for when there is no market to draw yet.
          */}
          {showcaseLive && routes.length > 0 ? (
            <div className="rise" style={{ ["--i" as string]: 4 }}>
              <TradeRouteMap routes={routes} className="w-full" />
              <p className="mt-2 text-center text-[11px] text-muted">
                {t("showcase.mapCaption")}
              </p>
            </div>
          ) : (
          <div className="rise" style={{ ["--i" as string]: 4 }}>
            <article
              className="rounded-glass border border-violet/40 bg-glass p-5"
              aria-label={t("shape.sampleLabel")}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="fx fx-fixed">
                  <Icon name="offer" size={12} />
                  {t(`shape.type.${hero.type}`).toUpperCase()}
                </span>
                <span className="text-[11px] text-muted">
                  {t("shape.fields.hs")} {hero.hs}
                </span>
              </div>

              <h2 className="mt-3 text-[15px] font-semibold text-ink">
                {t(`shape.${hero.key}.product`)}
              </h2>

              <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
                <span className="display text-[26px] font-bold text-ink">
                  {t(`shape.${hero.key}.quantity`)}
                </span>
                <span className="text-[12px] text-muted">
                  {hero.incoterm} · {t(`shape.${hero.key}.payment`)}
                </span>
              </div>

              <div className="mt-4">
                <RouteArc from={hero.origin} to={hero.destination} />
              </div>

              <p className="mt-4 border-t border-hairline-soft pt-3 text-[10.5px] leading-relaxed text-muted">
                {t("shape.sampleLabel")}
              </p>
            </article>
          </div>
          )}
        </div>
      </header>

      {/* ============ 1b. THE BOARD, MOVING ============
          Everything in this block is real approved inventory. It renders only
          when there is a market to show, and disappears again if the board
          empties. Nothing in it is ever seeded. */}
      {showcaseLive && (
        <section className="border-t border-hairline-soft py-12">
          <div className="container-px">
            <p className="eyebrow">{t("showcase.eyebrow")}</p>
            <h2
              className="display mt-3 text-ink"
              style={{ fontSize: "clamp(23px, 2.3vw, 31px)", lineHeight: 1.12 }}
            >
              {t("showcase.heading")}
            </h2>
            {showCount && (
              <p className="mt-3 text-[14px] text-muted">
                {t("showcase.count", {
                  deals: deals.length,
                  countries: countries.length,
                })}
              </p>
            )}
          </div>

          {/* Full bleed: the strip should run off both edges, because a board
              that ends tidily inside a container does not read as moving. */}
          <div className="mt-7">
            <LiveDealsStrip
              deals={deals}
              labels={dealLabels}
              locale={params.locale}
            />
          </div>

          <div className="container-px mt-12">
            <h3 className="display text-[20px] text-ink">
              {t("showcase.gridHeading")}
            </h3>
            <LiveDealsGrid
              deals={deals}
              labels={dealLabels}
              locale={params.locale}
              allLabel={t("showcase.all")}
              seeAllLabel={t("showcase.seeAll")}
            />
          </div>
        </section>
      )}

      {/* ============ 2. WHO IS ON THE OTHER SIDE ============ */}
      <section className="container-px border-t border-hairline-soft py-12">
        <div className="grid gap-9 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12">
          <div>
            <p className="eyebrow">{t("proof.eyebrow")}</p>
            <h2
              className="display mt-3 text-ink"
              style={{ fontSize: "clamp(23px, 2.3vw, 31px)", lineHeight: 1.12 }}
            >
              {t("proof.heading")}
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-muted">{t("proof.lead")}</p>
            <p className="mt-4 text-[13.5px] leading-relaxed text-ink">{t("proof.refresh")}</p>
            <Link
              href="/verification"
              className="eyebrow mt-6 inline-flex items-center gap-1.5 transition-opacity hover:opacity-80"
            >
              {t("proof.link")} <Icon name="chevron" size={13} />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: "registry" as const, label: "proof.registriesLabel", keys: REGISTRIES },
              { icon: "scan" as const, label: "proof.sanctionsLabel", keys: SANCTIONS },
            ].map((col) => (
              <div key={col.label} className="glass-tight p-5">
                <div className="flex items-center gap-2.5">
                  <Icon name={col.icon} size={16} className="text-cyan" />
                  <p className="label">{t(col.label)}</p>
                </div>
                <ul className="mt-4 space-y-3.5">
                  {col.keys.map((k) => (
                    <li key={k}>
                      <span className="block text-[13.5px] leading-snug text-ink">
                        {t(`proof.${k}.name`)}
                      </span>
                      <span className="block text-[11.5px] leading-snug text-muted">
                        {t(`proof.${k}.note`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-7 max-w-4xl text-[12px] leading-relaxed text-muted">
          {t("proof.caveat")}
        </p>
      </section>

      {/* ============ 3. THE SHAPE OF A DEAL ============
          Stands down once the showcase is live. Three invented cards under a
          grid of real ones is not teaching, it is noise, and the real deals
          demonstrate the notation better than the examples ever did. */}
      {!showcaseLive && (
      <section className="container-px border-t border-hairline-soft py-12">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-3xl">
            <p className="eyebrow">{t("shape.eyebrow")}</p>
            <h2
              className="display mt-3 text-ink"
              style={{ fontSize: "clamp(23px, 2.3vw, 31px)", lineHeight: 1.12 }}
            >
              {t("shape.heading")}
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-muted">{t("shape.lead")}</p>
          </div>
          <Link href="/marketplace" className="btn-ghost">
            {t("shape.cta")} <Icon name="chevron" size={16} />
          </Link>
        </div>

        {/* Said in the copy and said in the markup: these are not listings. */}
        <p className="mt-8 flex items-start gap-2 text-[11px] leading-relaxed text-muted">
          <Icon name="doc" size={14} className="mt-[1px] shrink-0 text-muted" />
          <span>{t("shape.sampleLabel")}</span>
        </p>

        <Reveal>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {EXAMPLES.map((ex) => (
              <article
                key={ex.key}
                className="glass-tight p-5"
                aria-label={t("shape.sampleLabel")}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={`fx ${ex.type === "offer" ? "fx-fixed" : "fx-neg"}`}>
                    <Icon name={ex.type === "offer" ? "offer" : "request"} size={12} />
                    {t(`shape.type.${ex.type}`).toUpperCase()}
                  </span>
                  <span className="text-[11px] text-muted">
                    {t("shape.fields.hs")} {ex.hs}
                  </span>
                </div>

                <h3 className="mt-3.5 text-[15px] font-semibold leading-snug text-ink">
                  {t(`shape.${ex.key}.product`)}
                </h3>

                <div className="mt-2 flex flex-wrap items-baseline gap-2">
                  <span className="display text-[24px] font-bold text-ink">
                    {t(`shape.${ex.key}.quantity`)}
                  </span>
                  <span className="text-[11.5px] text-muted">
                    {t(`shape.${ex.key}.frequency`)}
                  </span>
                </div>

                <div className="mt-4">
                  <RouteArc from={ex.origin} to={ex.destination} />
                </div>

                <dl className="mt-4 border-t border-hairline-soft text-[12.5px]">
                  <div className="flex justify-between gap-4 border-b border-hairline-soft py-2.5">
                    <dt className="shrink-0 text-muted">{t("shape.fields.incoterm")}</dt>
                    <dd className="text-right text-ink">{ex.incoterm}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-hairline-soft py-2.5">
                    <dt className="shrink-0 text-muted">{t("shape.fields.payment")}</dt>
                    <dd className="text-right text-ink">{t(`shape.${ex.key}.payment`)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="shrink-0 text-muted">{t("shape.fields.role")}</dt>
                    <dd className="text-right text-ink">{t(`shape.${ex.key}.role`)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </Reveal>
      </section>
      )}

      {/* ============ 4. HOW A DEAL MOVES ============ */}
      <section className="container-px border-t border-hairline-soft py-12">
        <Reveal>
          <p className="eyebrow">{t("flow.eyebrow")}</p>
          <h2
            className="display mt-3 text-ink"
            style={{ fontSize: "clamp(23px, 2.3vw, 31px)", lineHeight: 1.12 }}
          >
            {t("flow.heading")}
          </h2>
        </Reveal>
        <div className="mt-9">
          <ProcessFlow />
        </div>
      </section>

      {/* ============ 5. THE DESK ============ */}
      <section className="container-px border-t border-hairline-soft py-12 pb-20">
        <p className="eyebrow">{t("desk.eyebrow")}</p>
        <h2
          className="display mt-3 max-w-3xl text-ink"
          style={{ fontSize: "clamp(23px, 2.3vw, 31px)", lineHeight: 1.12 }}
        >
          {t("desk.heading")}
        </h2>

        <div className="mt-7 grid gap-4 md:grid-cols-2">
          <div className="glass flex flex-col p-6">
            <h3 className="display text-[20px] text-ink">{t("desk.free.title")}</h3>
            <p className="eyebrow mt-2">{t("desk.free.terms")}</p>
            <p className="mt-4 flex-1 text-[13.5px] leading-relaxed text-muted">
              {t("desk.free.body")}
            </p>
            <div className="mt-6">
              <Link href="/marketplace/new" className="btn-primary">
                {t("desk.free.cta")} <Icon name="chevron" size={16} />
              </Link>
            </div>
          </div>

          <div className="glass flex flex-col p-6">
            <h3 className="display text-[20px] text-ink">{t("desk.mandate.title")}</h3>
            <p className="label mt-2 normal-case tracking-normal">
              {t("desk.mandate.terms")}
            </p>
            <p className="mt-4 flex-1 text-[13.5px] leading-relaxed text-muted">
              {t("desk.mandate.body")}
            </p>
            <div className="mt-6">
              <Link href="/pricing" className="btn-ghost">
                {t("desk.mandate.cta")} <Icon name="chevron" size={16} />
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-5 text-[12px] text-muted">{t("desk.currency")}</p>
      </section>
    </>
  );
}
