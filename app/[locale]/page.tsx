import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Icon, type SystemIconName } from "@/components/icons";
import HeroBridge, { type HeroLabels } from "@/components/home/HeroBridge";
import LiveDealsStrip from "@/components/home/LiveDealsStrip";
import type { DealLabels } from "@/components/home/LiveDealCard";
import { formatPosted } from "@/lib/listing-terms";
import { getLiveDeals, type LiveDeal } from "@/lib/board/live-deals";
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
 * The landing page, ported from the design source.
 *
 * ---------------------------------------------------------------------------
 * Ported, not reconstructed
 * ---------------------------------------------------------------------------
 * The first attempt at this measured the rendered design through the DOM and
 * rebuilt from the measurements. That produced a page with the right sections
 * in the right order and almost none of the design in it: left aligned instead
 * of centred, a bordered pill where the design has a bare pulsing dot, no
 * coloured full stops, and no bridge.
 *
 * This is taken from the unpacked source instead. The bundle is inline styled
 * throughout, so the design IS its markup, and the geometry, timings and
 * colours below are the design's own values.
 *
 * Three things carry the identity and all three were missing before:
 *   - the hero is a literal suspension bridge, drawn over 2.2s, with a dot
 *     crossing it every seven seconds
 *   - every section heading ends in a coloured full stop: lime, cyan, violet
 *   - the write-up panel types itself, on a five second loop
 *
 * ---------------------------------------------------------------------------
 * Where it departs from the design, and why
 * ---------------------------------------------------------------------------
 * Copy: the design says "Free." and "Free platform. No commission." Free is
 * the marketplace only, so the wording states what is free and then says
 * plainly that verification costs credits and the desk costs a fee.
 *
 * Data: the design is drawn with sample deals. Every deal surface here reads
 * the real board. Claims the data cannot support are dropped rather than
 * mocked: no match percentage, and no trust dial without a real score.
 */

const CHECKS: { key: string; icon: SystemIconName }[] = [
  { key: "registers", icon: "registry" },
  { key: "sanctions", icon: "scan" },
  { key: "identifiers", icon: "globe" },
  { key: "anonymous", icon: "lock" },
];

const PRICES: { key: string; n: number; icon: SystemIconName }[] = [
  { key: "verify", n: 2, icon: "verify" },
  { key: "room", n: 1, icon: "room" },
  { key: "report", n: 60, icon: "doc" },
];

/** Shown until the board carries a deal of its own. Labelled wherever it renders. */
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
  payment: "LC at sight",
  originText: "Brazil",
  destinationText: "Netherlands",
  originCode: "BR",
  destinationCode: "NL",
  postedAt: "2026-07-22T09:00:00Z",
  verificationLevel: null,
  href: null,
};

/** A heading with the design's coloured full stop. */
function Heading({
  text,
  dot,
  size = "clamp(30px, 3.4vw, 44px)",
  tracking = "-1.4px",
}: {
  text: string;
  dot: string;
  size?: string;
  tracking?: string;
}) {
  // The design ends every heading with a coloured stop. Where a translation
  // already ends in a full stop, that character becomes the coloured one
  // rather than gaining a second.
  const stripped = text.replace(/[.。।]\s*$/, "");
  return (
    <h2
      className="display text-ink"
      style={{ fontSize: size, lineHeight: 1.08, letterSpacing: tracking }}
    >
      {stripped}
      <span style={{ color: dot }}>.</span>
    </h2>
  );
}

export default async function HomePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations("landing");
  const th = await getTranslations("home");
  const tm = await getTranslations("marketplace");

  const deals = await getLiveDeals();
  const heroDeal = deals[0] ?? EXAMPLE_DEAL;
  const heroIsReal = deals.length > 0;

  const tier = {
    1: tm("trust.level1"),
    2: tm("trust.level2"),
    3: tm("trust.level3"),
    4: tm("trust.level4"),
  };

  const dealLabels: DealLabels = {
    offer: tm("type.offer"),
    requirement: tm("type.requirement"),
    service: tm("type.service"),
    notStated: tm("notStated"),
    deskSourced: th("showcase.deskSourced"),
    tier,
  };

  const heroLabels: HeroLabels = {
    offer: tm("type.offer"),
    requirement: tm("type.requirement"),
    counterparty: t("stage.counterparty"),
    clear: t("stage.clear"),
    unverified: tm("trust.none"),
    readOn: t("stage.readOn", { date: "{date}" }),
    openRoom: t("stage.openRoom"),
    sampleNote: heroIsReal ? null : t("stage.sampleNote"),
    tier,
  };

  return (
    <div className="relative overflow-hidden">
      {/* The design's two blooms. Static: no infinite blur loop. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-[140px] -top-[220px] h-[640px] w-[640px] rounded-full"
        style={{
          filter: "blur(70px)",
          background: "radial-gradient(circle, rgba(139,107,255,.34), transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[200px] top-[340px] h-[520px] w-[520px] rounded-full"
        style={{
          filter: "blur(70px)",
          background: "radial-gradient(circle, rgba(203,251,94,.14), transparent 70%)",
        }}
      />

      {/* ============ HERO ============ */}
      <header className="relative mx-auto max-w-[1240px] px-[18px] pb-7 pt-14 text-center sm:px-6 lg:px-10">
        <p
          className="rise inline-flex items-center gap-[7px] text-[11px] font-bold uppercase tracking-[0.8px] text-lime"
          style={{ ["--i" as string]: 0 }}
        >
          <span className="pulse-dot h-2 w-2 rounded-full bg-lime" />
          {t("eyebrow")}
        </p>

        <h1
          className="display rise mt-4 text-ink"
          style={{
            ["--i" as string]: 1,
            fontSize: "clamp(40px, 7.5vw, 92px)",
            lineHeight: 1.02,
            letterSpacing: "-0.033em",
          }}
        >
          {t("h1").replace(/[.。।]\s*$/, "")}
          <span className="text-lime">.</span>
        </h1>

        <p
          className="rise mx-auto mt-4 max-w-2xl text-[15px] font-medium text-muted sm:text-[17px]"
          style={{ ["--i" as string]: 2 }}
        >
          {t("sub")}
        </p>

        <div
          className="rise mt-7 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap"
          style={{ ["--i" as string]: 3 }}
        >
          <Link
            href="/marketplace"
            className="inline-flex items-center justify-center gap-2 rounded-[15px] bg-lime px-6 py-[15px] text-[15px] font-bold text-obsidian shadow-lime transition-transform hover:-translate-y-px"
          >
            {t("ctaPrimary")}
            <Icon name="chevron" size={16} />
          </Link>
          <Link
            href="/verification"
            className="inline-flex items-center justify-center rounded-[15px] border border-hairline-strong bg-white/[0.06] px-6 py-[15px] text-[15px] font-bold text-ink transition-colors hover:bg-white/10"
          >
            {t("ctaSecondary")}
          </Link>
        </div>
      </header>

      {/* ============ THE BRIDGE ============ */}
      <HeroBridge
        deal={heroDeal}
        labels={heroLabels}
        postedLabel={formatPosted(heroDeal.postedAt, params.locale)}
        trustScore={null}
      />

      {/* ============ THE BOARD, MOVING ============ */}
      {deals.length > 0 && (
        <section
          id="board"
          className="relative border-y border-hairline-soft bg-white/[0.016] py-[22px]"
        >
          <LiveDealsStrip deals={deals} labels={dealLabels} locale={params.locale} />
        </section>
      )}

      {/* ============ VERIFICATION ============ */}
      <section
        id="verify"
        className="relative mx-auto grid max-w-[1240px] items-center gap-12 px-[18px] py-[70px] sm:px-6 lg:grid-cols-2 lg:gap-x-[60px] lg:px-10 lg:py-[90px]"
      >
        <div className="order-2 rounded-[20px] border border-hairline bg-glass p-6 lg:order-1">
          <p className="label">{t("verify.trustLabel")}</p>
          <div className="mt-4 space-y-2.5">
            {([1, 2, 3, 4] as const).map((lvl) => (
              <div key={lvl} className="flex items-center gap-3">
                <span className={`tier tier-${lvl} shrink-0`}>L{lvl}</span>
                <span className="text-[13px] text-slate">{tier[lvl]}</span>
              </div>
            ))}
          </div>
          <p className="mt-5 border-t border-hairline-soft pt-4 text-[12px] leading-relaxed text-muted">
            {th("proof.caveat")}
          </p>
        </div>

        <div className="order-1 lg:order-2">
          <Heading text={t("verify.heading")} dot="#3FE0C5" />
          <ul className="mt-6">
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
      </section>

      {/* ============ THE WRITE-UP ============ */}
      <section className="relative mx-auto grid max-w-[1240px] items-center gap-12 px-[18px] py-[70px] sm:px-6 lg:grid-cols-2 lg:gap-x-[60px] lg:px-10 lg:py-[90px]">
        <div>
          <Heading text={t("ai.heading")} dot="#8B6BFF" />
          <p className="prov mt-4">
            <Icon name="ai" size={13} />
            {t("ai.provenance")}
          </p>
          <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-muted">
            {t("ai.body")}
          </p>
        </div>

        {/* The panel writes itself: three bars filling on a stagger, then the
            finished card fading in. Purely decorative, so it is hidden from
            assistive tech and stops under prefers-reduced-motion. */}
        <div
          aria-hidden="true"
          className="rounded-[20px] border border-hairline bg-white/[0.03] p-4"
        >
          <p className="label">{t("ai.descriptionLabel")}</p>
          <div className="mt-3 space-y-2">
            {[
              { w: "60%", d: "0s", lime: false },
              { w: "45%", d: "0.4s", lime: true },
              { w: "52%", d: "0.8s", lime: false },
            ].map((bar, i) => (
              <div key={i} className="relative h-6 rounded-md bg-white/[0.04]">
                <span
                  className="type-in absolute bottom-2 left-3 top-2 rounded-[5px]"
                  style={{
                    ["--type-w" as string]: bar.w,
                    width: bar.w,
                    animationDelay: bar.d,
                    background: bar.lime
                      ? "rgba(203,251,94,.3)"
                      : "rgba(255,255,255,.14)",
                  }}
                />
              </div>
            ))}
          </div>

          <div
            className="fade-cycle mt-3 rounded-[14px] p-3.5"
            style={{
              background:
                "linear-gradient(135deg, rgba(139,107,255,.16), rgba(255,255,255,.02))",
              border: "1px solid rgba(139,107,255,.3)",
            }}
          >
            <p className="text-[12.5px] leading-relaxed text-ink">{t("ai.sample")}</p>
            <p className="mt-3 flex h-8 items-center justify-center rounded-[9px] bg-lime text-[11.5px] font-bold text-obsidian">
              {t("ai.publish")}
            </p>
          </div>
        </div>
      </section>

      {/* ============ WHAT IS FREE, AND WHAT IS NOT ============ */}
      <section
        id="fees"
        className="relative border-t border-hairline-soft px-[18px] py-[70px] text-center sm:px-6 lg:px-10"
      >
        <div className="mx-auto max-w-[900px]">
          <Heading
            text={t("pricing.heading")}
            dot="#CBFB5E"
            size="clamp(26px, 3vw, 38px)"
            tracking="-1px"
          />
          <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-relaxed text-muted">
            {t("pricing.body")}
          </p>

          <ul className="mt-7 flex flex-wrap justify-center gap-2.5">
            {PRICES.map((p) => (
              <li
                key={p.key}
                className="inline-flex items-center gap-2 rounded-field border border-hairline bg-glass px-4 py-3 text-[13px] text-slate"
              >
                <Icon name={p.icon} size={15} className="text-violet-ink" />
                {t(`pricing.${p.key}`)} ·{" "}
                <b className="display text-ink">
                  {p.n === 1
                    ? t("pricing.credit", { n: p.n })
                    : t("pricing.credits", { n: p.n })}
                </b>
              </li>
            ))}
          </ul>

          <p className="mx-auto mt-4 max-w-2xl text-[12.5px] leading-relaxed text-muted">
            {t("pricing.desk")}
          </p>

          <div className="mt-7">
            <Link
              href="/marketplace/new"
              className="inline-flex w-full items-center justify-center gap-2 rounded-[15px] bg-lime px-7 py-[15px] text-[15px] font-bold text-obsidian shadow-lime transition-transform hover:-translate-y-px sm:w-auto"
            >
              {t("pricing.cta")}
              <Icon name="chevron" size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
